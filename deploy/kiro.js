'use strict';
/**
 * SDD Summary — Kiro deploy target (project-scoped).
 *
 * WHAT KIRO NEEDS THAT CURSOR DOES NOT
 * ------------------------------------
 * Four differences drive everything in this file. All four were verified against
 * kiro-cli 2.21.4 rather than taken from documentation.
 *
 * 1. NO PLACEHOLDER EXPANSION. Kiro expands only real environment variables
 *    (${VAR} / ${env:VAR}). ${workspaceFolder} and ${CURSOR_PLUGIN_ROOT} arrive
 *    at the server verbatim. Verified. So neither can be used.
 *
 *    Instead: Kiro launches an stdio MCP server with the WORKSPACE ROOT as its
 *    working directory (verified), so a RELATIVE args path resolves correctly
 *    and the storage env vars can be omitted entirely — the server's own
 *    defaults then place data at the project root. That keeps the deployed
 *    config free of absolute paths, exactly like the Cursor route, without
 *    needing a placeholder at all.
 *
 * 2. NO permissions.json. Kiro's auto-approval is `allowedTools` and it exists
 *    ONLY in an agent config — `.kiro/settings/mcp.json` has no such key. So
 *    pre-approving the tool list REQUIRES shipping an agent, not just an MCP
 *    config. Without it every submit_eval_scores call in a full suite prompts.
 *
 * 3. A SCORER AGENT IS MANDATORY. A Kiro subagent loads MCP servers from its own
 *    agent config, so scoring stages have no submit_eval_scores tool unless a
 *    dedicated agent declares this server. Missing it does not error — the
 *    parallel eval mode just quietly stops recording scores.
 *
 * 4. STEERING IS NOT INHERITED BY CUSTOM AGENTS. Only Kiro's built-in default
 *    agent auto-loads `.kiro/steering/`. Since (2) forces a custom agent, that
 *    agent must declare the steering glob in `resources` or the pipeline
 *    guidance silently vanishes and the agent improvises the pipeline.
 *
 * The server is deliberately defined in the AGENT configs only, and NOT also in
 * `.kiro/settings/mcp.json`. Declaring it in both risks two server processes
 * writing the same tree. `chat.defaultAgent` is what makes the agent the
 * flag-free entry point instead.
 */

const path = require('path');
const fs = require('fs');
const S = require('./shared');

const VENDOR_REL = path.join('.kiro', 'sdd-summary');
const MAIN_AGENT = 'sdd-summary';
const SCORER_AGENT = 'sdd-summary-scorer';

const MARKER_OPEN = '<!-- HOST-SPECIFIC:EVAL-ORCHESTRATION -->';
const MARKER_CLOSE = '<!-- /HOST-SPECIFIC:EVAL-ORCHESTRATION -->';

/**
 * Convert the Cursor `.mdc` rule into a Kiro steering `.md` file.
 *
 * Two transformations, both mandatory:
 *
 *   - Frontmatter: Cursor's `alwaysApply: true` means nothing to Kiro, which uses
 *     `inclusion: always`. A malformed or unknown key fails OPEN (the file loads
 *     anyway), so leaving Cursor's frontmatter would appear to work while
 *     shipping a stray `alwaysApply` line into the agent's context.
 *
 *   - The HOST-SPECIFIC region: swapped for the Kiro orchestration text. This is
 *     the part that names the parallel-agent mechanism, and naming Cursor's
 *     inside a Kiro install is the single most damaging mistake available here —
 *     the agent would look for a Task tool it does not have.
 *
 * Fails LOUDLY if the markers are absent, rather than silently shipping Cursor's
 * instructions to a Kiro user.
 */
function buildSteering(rulePath, kiroBlockPath) {
  let text = fs.readFileSync(rulePath, 'utf8');

  const block = fs.readFileSync(kiroBlockPath, 'utf8').trimEnd();

  const openAt = text.indexOf(MARKER_OPEN);
  const closeAt = text.indexOf(MARKER_CLOSE);
  if (openAt === -1 || closeAt === -1 || closeAt < openAt) {
    S.err(`Host-specific markers not found in ${path.basename(rulePath)}.`);
    console.log(
      `    Expected ${MARKER_OPEN} ... ${MARKER_CLOSE} around the subagent spawn\n` +
      '    instruction. Without them the Kiro steering file would carry Cursor\'s\n' +
      '    orchestration text, which names a tool Kiro does not have.\n',
    );
    process.exit(1);
  }

  text =
    text.slice(0, openAt) +
    block +
    '\n' +
    text.slice(closeAt + MARKER_CLOSE.length).replace(/^\n/, '');

  // Replace the leading frontmatter block wholesale.
  const fm = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
  const kiroFrontmatter =
    '---\n' +
    'inclusion: always\n' +
    '---\n';

  if (fm.test(text)) {
    text = text.replace(fm, kiroFrontmatter);
  } else {
    text = kiroFrontmatter + '\n' + text;
  }

  return text;
}

/**
 * Write an agent config, injecting the canonical tool allowlist from mcp.json so
 * the pre-approved set has ONE source of truth shared with the Cursor target.
 *
 * The checked-in agent files under kiro/agents/ carry the prompt, tool list and
 * crew settings; the allowlist is overwritten here from mcp.json so that adding a
 * tool there updates both hosts at once.
 *
 * WHY THE DRIFT CHECK BELOW EXISTS
 * --------------------------------
 * The template's own `@sdd-summary/*` entries are DISCARDED and regenerated from
 * mcp.json — but the template is also the artefact copied by hand for a
 * user-scope install (see docs/setup.md Option B), where no deploy ever runs and
 * its list IS the effective one. So the two must agree, and nothing structural
 * forced them to.
 *
 * That gap shipped once: `get_pipeline_state` was in the template but not in
 * mcp.json, so every deployed project silently lost it — on BOTH hosts, since
 * mcp.json feeds Cursor's permissions.json too. The agent's own prompt mandates
 * calling that tool before acting on any version or run number, so the single
 * most frequent call prompted for approval every time, which is exactly the
 * friction that gets a reconciliation step skipped.
 *
 * Re-running the deploy could not fix it, because the deploy is what overwrites
 * the list. Only mcp.json could. Hence: compare, and refuse to deploy a
 * mismatch rather than quietly resolving it in mcp.json's favour.
 */
function writeAgent(target, agentName, allowTools) {
  const srcPath = path.join(S.SOURCE_KIRO, 'agents', `${agentName}.json`);
  if (!fs.existsSync(srcPath)) {
    S.err(`Missing agent template: kiro/agents/${agentName}.json`);
    process.exit(1);
  }
  const agent = S.readJsonOrExit(srcPath, `kiro/agents/${agentName}.json`);

  // Point the server at the vendored bundle, relative to the workspace root.
  // Verified: Kiro launches the server with the workspace root as its CWD, so a
  // relative path resolves and the config stays free of absolute paths.
  const relArg = path.posix.join('.kiro', 'sdd-summary', S.BUNDLE_NAME);
  if (agent.mcpServers && agent.mcpServers[S.SERVER_KEY]) {
    agent.mcpServers[S.SERVER_KEY].args = [relArg];
  }

  // The main agent's allowlist is generated; the scorer's is deliberately
  // hand-scoped to fetching its own batch and submitting scores, and must NOT be
  // widened to the full pipeline list.
  if (agentName === MAIN_AGENT && allowTools.length) {
    const mcpEntries = allowTools.map((t) => `@${S.SERVER_KEY}/${t}`);

    // Fail loudly on template/mcp.json drift — see the comment above.
    const templateMcp = (agent.allowedTools || []).filter((t) =>
      t.startsWith(`@${S.SERVER_KEY}/`),
    );
    const onlyInTemplate = templateMcp.filter((t) => !mcpEntries.includes(t));
    const onlyInMcpJson = mcpEntries.filter((t) => !templateMcp.includes(t));

    if (onlyInTemplate.length || onlyInMcpJson.length) {
      S.err(`Tool allowlist drift between mcp.json and kiro/agents/${agentName}.json.`);
      if (onlyInTemplate.length) {
        console.log(
          `    In the template but NOT in mcp.json alwaysAllow — these would be\n` +
          `    SILENTLY DROPPED from every deployed project, on Cursor as well as Kiro:\n` +
          onlyInTemplate.map((t) => `      ${t}`).join('\n') + '\n',
        );
      }
      if (onlyInMcpJson.length) {
        console.log(
          `    In mcp.json alwaysAllow but NOT in the template — a hand-copied\n` +
          `    user-scope install (docs/setup.md Option B) would lack these:\n` +
          onlyInMcpJson.map((t) => `      ${t}`).join('\n') + '\n',
        );
      }
      console.log('    Make the two lists agree, then re-run.\n');
      process.exit(1);
    }

    const builtins = (agent.allowedTools || []).filter((t) => !t.startsWith('@'));
    agent.allowedTools = [...builtins, ...mcpEntries];
  }

  const destPath = path.join(target, '.kiro', 'agents', `${agentName}.json`);
  S.writeJson(destPath, agent);
  return agent;
}

function deployKiro(target) {
  const { allowTools } = S.readServerDefinition();

  // ─── 1. Vendor the bundle ───────────────────────────────────────────────────
  const kb = S.vendorBundle(path.join(target, VENDOR_REL));
  S.ok(`Server bundle vendored (${kb} KB) → ${path.join(VENDOR_REL, S.BUNDLE_NAME)}`);

  // ─── 2. Agent configs (server + pre-approval + steering + crew) ─────────────
  const main = writeAgent(target, MAIN_AGENT, allowTools);
  const mcpApproved = (main.allowedTools || []).filter((t) => t.startsWith('@')).length;
  S.ok(`.kiro/agents/${MAIN_AGENT}.json written (${mcpApproved} tools pre-approved)`);

  writeAgent(target, SCORER_AGENT, allowTools);
  S.ok(`.kiro/agents/${SCORER_AGENT}.json written (eval scoring subagent)`);

  // ─── 3. Steering (transformed from the Cursor rule) ─────────────────────────
  const rule = path.join(S.SOURCE_RULES, 'sdd-summary-pipeline.mdc');
  const kiroBlock = path.join(S.SOURCE_KIRO, 'eval-orchestration.md');
  if (fs.existsSync(rule) && fs.existsSync(kiroBlock)) {
    const steering = buildSteering(rule, kiroBlock);
    const destPath = path.join(target, '.kiro', 'steering', 'sdd-summary-pipeline.md');
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, steering);
    S.ok('.kiro/steering/sdd-summary-pipeline.md written (Kiro orchestration substituted)');
  } else {
    S.warn('Pipeline rule or Kiro orchestration block missing — steering not written.');
  }

  // ─── 4. Skills (once authored) ──────────────────────────────────────────────
  if (fs.existsSync(S.SOURCE_SKILLS)) {
    const dest = path.join(target, '.kiro', 'skills');
    fs.mkdirSync(dest, { recursive: true });
    S.ok(`Skills copied (${S.copyTree(S.SOURCE_SKILLS, dest)} file(s)) → .kiro/skills/`);
  }

  // ─── 5. Make the agent the flag-free entry point ────────────────────────────
  // Workspace-scoped, so plain `kiro-cli chat` in THIS project uses the pipeline
  // agent while every other project is untouched. Verified on 2.21.4.
  const cliPath = path.join(target, '.kiro', 'settings', 'cli.json');
  let cli = {};
  if (fs.existsSync(cliPath)) {
    cli = S.readJsonOrExit(cliPath, '.kiro/settings/cli.json');
  }
  const previousDefault = cli['chat.defaultAgent'];
  cli['chat.defaultAgent'] = MAIN_AGENT;
  S.writeJson(cliPath, cli);
  if (previousDefault && previousDefault !== MAIN_AGENT) {
    S.ok(`.kiro/settings/cli.json updated (default agent was "${previousDefault}")`);
  } else {
    S.ok(`.kiro/settings/cli.json written (default agent → "${MAIN_AGENT}")`);
  }

  // ─── 6. Protect generated data ──────────────────────────────────────────────
  const { sourceIsNested } = S.protectGitignore(target);

  return { sourceIsNested };
}

function printKiroNextSteps(target, sourceIsNested) {
  console.log(`
  Scope: this project only. The agents, steering and pre-approved tools live
  under ${target}/.kiro/, so they are inactive in every other workspace.

  Next steps:
    1. Open ${S.bold(path.basename(target))} as your Kiro workspace.${
      sourceIsNested
        ? `\n       ${S.yellow('Not')} ${path.basename(S.ROOT)}/ — Kiro reads .kiro/ from the workspace\n       root, and local agents are only discovered there.`
        : ''
    }

    2. ${S.bold('No enable step and no reload.')} Unlike Cursor there is no MCP
       toggle to switch on — Kiro starts the server on demand and hot-reloads
       config changes, so a re-run of this script is picked up without a restart.

    3. ${S.bold('Start the pipeline from a terminal in this directory:')}

         ${S.bold(`cd ${target}`)}
         ${S.bold('kiro-cli chat')}

       Then say ${S.bold('"begin"')}. The agent checks whether your Genesys OAuth
       client exists and walks you through it if not.

       ${S.yellow('It must be kiro-cli chat, started in this directory.')} The server is
       declared in .kiro/agents/${MAIN_AGENT}.json, so ONLY that agent has the
       tools. A chat on any other agent — including a KiroCrew dashboard
       session — sees no @${S.SERVER_KEY}/* tools at all. That is the
       pre-approval design, not a broken install.

       ${S.dim(`This project's default agent is already ${MAIN_AGENT}, so no --agent`)}
       ${S.dim(`flag is needed. To be explicit: kiro-cli chat --agent ${MAIN_AGENT}`)}

    To verify the install: ${S.bold('/mcp')} in chat, or ${S.bold('kiro-cli mcp list')}.
    It should report the ${S.bold('sdd-summary')} server with ${S.bold('45 tools')}.

  Re-run this script after any server change to refresh the vendored copy.
`);
}

module.exports = { deployKiro, printKiroNextSteps };
