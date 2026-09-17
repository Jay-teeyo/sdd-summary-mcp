'use strict';
/**
 * SDD Summary — Cursor deploy target (project-scoped).
 *
 * Behaviour is unchanged from the original single-file deploy.js. Cursor's
 * documented project-scoped mechanisms are `.cursor/mcp.json`,
 * `.cursor/permissions.json`, `.cursor/rules/` and `.cursor/skills/`, so this
 * writes those into one target project and vendors the server bundle alongside.
 *
 * WHY VENDOR THE BUNDLE
 * ---------------------
 * Copying the bundle into the project means `.cursor/mcp.json` can reference
 * ${workspaceFolder} and contain NO absolute paths, so the project keeps working
 * if it is moved, renamed, or handed to someone else.
 *
 * WHAT THIS CANNOT DO
 * -------------------
 * It cannot ENABLE the server. Cursor exposes no documented setting for that, so
 * the user must toggle it on once under Customize -> MCPs. The closing output
 * says so prominently, because a configured-but-disabled server looks identical
 * to a failed install.
 */

const path = require('path');
const fs = require('fs');
const S = require('./shared');

const VENDOR_REL = path.join('.cursor', 'sdd-summary');

function deployCursor(target) {
  const { serverDef, allowTools } = S.readServerDefinition();

  // ─── 1. Vendor the bundle ───────────────────────────────────────────────────
  const kb = S.vendorBundle(path.join(target, VENDOR_REL));
  S.ok(`Server bundle vendored (${kb} KB) → ${path.join(VENDOR_REL, S.BUNDLE_NAME)}`);

  // ─── 2. Merge .cursor/mcp.json ──────────────────────────────────────────────
  // Cursor expands ${workspaceFolder}, so no absolute path is written.
  serverDef.args = [
    '${workspaceFolder}/' + path.posix.join('.cursor', 'sdd-summary', S.BUNDLE_NAME),
  ];
  // Tell the server which host it is running under, so its guidance names
  // Cursor's parallel-agent mechanism rather than Kiro's. See mcp-server/src/host.ts.
  serverDef.env = Object.assign({}, serverDef.env, { SDDSUM_HOST: 'cursor' });

  const targetMcpPath = path.join(target, '.cursor', 'mcp.json');
  let targetCfg = { mcpServers: {} };
  let merged = false;

  if (fs.existsSync(targetMcpPath)) {
    targetCfg = S.readJsonOrExit(targetMcpPath, '.cursor/mcp.json');
    if (!targetCfg.mcpServers) targetCfg.mcpServers = {};
    merged = true;
  }

  // Preserve any other servers the user already has configured.
  const preserved = Object.keys(targetCfg.mcpServers).filter((k) => k !== S.SERVER_KEY);
  const replacing = Object.prototype.hasOwnProperty.call(targetCfg.mcpServers, S.SERVER_KEY);
  targetCfg.mcpServers[S.SERVER_KEY] = serverDef;
  S.writeJson(targetMcpPath, targetCfg);

  if (merged) {
    S.ok(`.cursor/mcp.json updated (${replacing ? 'replaced' : 'added'} "${S.SERVER_KEY}")`);
    if (preserved.length) S.ok(`Preserved existing MCP servers: ${preserved.join(', ')}`);
  } else {
    S.ok('.cursor/mcp.json written');
  }

  // ─── 3. Pre-approve tools via .cursor/permissions.json ──────────────────────
  // `alwaysAllow` inside mcp.json is NOT part of Cursor's schema and is ignored.
  // `permissions.json` -> `mcpAllowlist` is the documented mechanism, so the tool
  // list is translated to the `server:tool` form Cursor actually reads.
  //
  // This matters for eval runs: a full suite issues hundreds of
  // submit_eval_scores calls, and without pre-approval each one prompts.
  const wantedEntries = allowTools.map((t) => `${S.SERVER_KEY}:${t}`);

  if (wantedEntries.length) {
    const permPath = path.join(target, '.cursor', 'permissions.json');
    let perms = {};
    let existingEntries = [];

    if (fs.existsSync(permPath)) {
      perms = S.readJsonOrExit(permPath, '.cursor/permissions.json');
      existingEntries = Array.isArray(perms.mcpAllowlist) ? perms.mcpAllowlist : [];
    }

    // Preserve unrelated entries and any other keys (terminalAllowlist, autoRun).
    const foreign = existingEntries.filter(
      (e) => typeof e !== 'string' || !e.toLowerCase().startsWith(`${S.SERVER_KEY}:`),
    );
    perms.mcpAllowlist = [...foreign, ...wantedEntries];
    S.writeJson(permPath, perms);

    S.ok(`.cursor/permissions.json written (${wantedEntries.length} tools pre-approved)`);
    if (foreign.length) S.ok(`Preserved ${foreign.length} unrelated allowlist entr(ies)`);
  }

  // ─── 4. Copy rules ──────────────────────────────────────────────────────────
  // Copied verbatim: the .mdc frontmatter and the HOST-SPECIFIC markers are both
  // already correct for Cursor, so no transformation is needed here.
  if (fs.existsSync(S.SOURCE_RULES)) {
    const dest = path.join(target, '.cursor', 'rules');
    fs.mkdirSync(dest, { recursive: true });
    S.ok(`Rules copied (${S.copyTree(S.SOURCE_RULES, dest)} file(s)) → .cursor/rules/`);
  }

  // ─── 5. Copy skills (once authored) ─────────────────────────────────────────
  if (fs.existsSync(S.SOURCE_SKILLS)) {
    const dest = path.join(target, '.cursor', 'skills');
    fs.mkdirSync(dest, { recursive: true });
    S.ok(`Skills copied (${S.copyTree(S.SOURCE_SKILLS, dest)} file(s)) → .cursor/skills/`);
  }

  // ─── 6. Protect generated data ──────────────────────────────────────────────
  const { sourceIsNested } = S.protectGitignore(target);

  return { sourceIsNested };
}

function printCursorNextSteps(target, sourceIsNested) {
  console.log(`
  Scope: this project only. Tools, rules and skills are inactive in every
  other workspace, because they live under ${target}/.cursor/.

  Next steps:
    1. Open ${S.bold(path.basename(target))} as your Cursor workspace.${
      sourceIsNested
        ? `\n       ${S.yellow('Not')} ${path.basename(S.ROOT)}/ — Cursor only reads .cursor/mcp.json\n       from the workspace root.`
        : ''
    }
    2. Reload Cursor:  View menu → Command Palette → "Developer: Reload Window"

    3. ${S.bold('Turn the server on — this is a manual step.')}
       ${S.yellow('Writing the config does not enable the server.')} Cursor has no
       setting to pre-enable it, so it must be switched on by hand once:

         Open ${S.bold('Customize')} in the sidebar → ${S.bold('MCPs')} → toggle
         "${S.SERVER_KEY}" ${S.bold('on')}

       It should then report ${S.bold('42 tools')}. If the toggle is missing entirely,
       the config was not found — check step 1 opened the right folder.

    4. Start a new chat and just say ${S.bold('"begin"')}. The agent will check
       whether your Genesys OAuth client exists and walk you through it if not.

  Re-run this script after any server change to refresh the vendored copy.
`);
}

module.exports = { deployCursor, printCursorNextSteps };
