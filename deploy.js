#!/usr/bin/env node
/**
 * SDD Summary — deploy into a single project (project-scoped install).
 *
 *   node deploy.js [/path/to/target/project]
 *
 * Defaults to the current working directory.
 *
 * The documented layout clones this repo inside the target project, so the
 * usual invocation is `node deploy.js ..` from within the clone. That case is
 * detected explicitly — see the .gitignore step below.
 *
 * WHY THIS EXISTS
 * ---------------
 * Installing as a Cursor plugin puts the server at USER scope, which makes all
 * 47 tools and the always-applied pipeline rule active in every workspace you
 * open. For a tool this specialised that is unwanted: unrelated projects get
 * Genesys tooling in scope and ~488 lines of guidance injected per request.
 *
 * Cursor's documented project-scoped mechanisms are `.cursor/mcp.json`,
 * `.cursor/permissions.json`, `.cursor/rules/` and `.cursor/skills/`, so this
 * script writes those into one target project and vendors the server bundle
 * alongside them.
 *
 * Note it cannot ENABLE the server. Cursor exposes no documented setting for
 * that, so the user must toggle it on once under Customize -> MCPs. The closing
 * output says so prominently, because a configured-but-disabled server looks
 * identical to a failed install.
 *
 * WHY VENDOR THE BUNDLE
 * ---------------------
 * Copying the bundle into the project means `.cursor/mcp.json` can reference
 * ${workspaceFolder} and contain NO absolute paths. The project therefore keeps
 * working if it is moved, renamed, or handed to someone else, and it does not
 * depend on this repo staying where it is.
 *
 * The vendored copy lives under `.cursor/` rather than at the project root so
 * that it reads unambiguously as Cursor tooling. Note `.sdd-summary/`
 * (credentials) and `.summaryconfig-lifecycle/` (working data) are different
 * things that deliberately live at the project root.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname);
const SOURCE_BUNDLE = path.join(ROOT, 'mcp-server', 'bundle', 'sdd-summary-mcp.mjs');
const SOURCE_MCP_JSON = path.join(ROOT, 'mcp.json');
const SOURCE_RULES = path.join(ROOT, 'rules');
const SOURCE_SKILLS = path.join(ROOT, 'skills');

// Path inside the target project, relative to its root.
const VENDOR_REL = path.join('.cursor', 'sdd-summary');
const BUNDLE_NAME = 'sdd-summary-mcp.mjs';
const SERVER_KEY = 'sdd-summary';

const reset = '\x1b[0m';
const bold = (s) => `\x1b[1m${s}${reset}`;
const green = (s) => `\x1b[32m${s}${reset}`;
const yellow = (s) => `\x1b[33m${s}${reset}`;
const red = (s) => `\x1b[31m${s}${reset}`;
const dim = (s) => `\x1b[2m${s}${reset}`;

const ok = (m) => console.log(`  ${green('✓')} ${m}`);
const warn = (m) => console.log(`  ${yellow('⚠')} ${m}`);
const err = (m) => console.log(`  ${red('✗')} ${m}`);
const hr = () => console.log('─'.repeat(68));

if (parseInt(process.versions.node.split('.')[0], 10) < 18) {
  err(`Node.js 18+ required. You have ${process.version}.`);
  process.exit(1);
}

// ─── Resolve target ───────────────────────────────────────────────────────────
const target = path.resolve(process.argv[2] || process.cwd());

console.log('\n');
hr();
console.log(bold('  SDD Summary — project-scoped deploy'));
hr();
console.log(`
  Source: ${dim(ROOT)}
  Target: ${bold(target)}
`);

if (!fs.existsSync(target)) {
  err(`Target does not exist: ${target}`);
  console.log('    Create the folder first, or pass an existing path.\n');
  process.exit(1);
}
if (!fs.statSync(target).isDirectory()) {
  err(`Target is not a directory: ${target}`);
  process.exit(1);
}

// ─── Ensure the bundle exists ─────────────────────────────────────────────────
if (!fs.existsSync(SOURCE_BUNDLE)) {
  warn('Server bundle missing — building it now.');
  try {
    execSync('npm install && npm run bundle', {
      cwd: path.join(ROOT, 'mcp-server'),
      stdio: 'inherit',
    });
  } catch {
    err('Bundle build failed. Fix the errors above and re-run.');
    process.exit(1);
  }
}

// ─── 1. Vendor the bundle ─────────────────────────────────────────────────────
const vendorDir = path.join(target, VENDOR_REL);
fs.mkdirSync(vendorDir, { recursive: true });
fs.copyFileSync(SOURCE_BUNDLE, path.join(vendorDir, BUNDLE_NAME));
const kb = (fs.statSync(SOURCE_BUNDLE).size / 1024).toFixed(0);
ok(`Server bundle vendored (${kb} KB) → ${path.join(VENDOR_REL, BUNDLE_NAME)}`);

// ─── 2. Merge .cursor/mcp.json ────────────────────────────────────────────────
// Read the plugin's own definition so the pre-approved tool list has a single
// source of truth, then repoint it at the vendored copy.
const pluginCfg = JSON.parse(fs.readFileSync(SOURCE_MCP_JSON, 'utf8'));
const serverDef = pluginCfg.mcpServers[SERVER_KEY];
if (!serverDef) {
  err(`mcp.json has no "${SERVER_KEY}" server definition.`);
  process.exit(1);
}
// Cursor expands ${workspaceFolder}, so no absolute path is written.
serverDef.args = ['${workspaceFolder}/' + path.posix.join('.cursor', 'sdd-summary', BUNDLE_NAME)];

// mcp.json carries the pre-approved tool list under `alwaysAllow` as a single
// source of truth, but that key is not part of Cursor's schema. Lift it out here
// and write it to permissions.json in step 3 instead. It must be removed before
// the config is written, so the deployed file claims nothing Cursor won't honour.
const allowTools = Array.isArray(serverDef.alwaysAllow) ? serverDef.alwaysAllow : [];
delete serverDef.alwaysAllow;

const targetMcpPath = path.join(target, '.cursor', 'mcp.json');
let targetCfg = { mcpServers: {} };
let merged = false;

if (fs.existsSync(targetMcpPath)) {
  try {
    targetCfg = JSON.parse(fs.readFileSync(targetMcpPath, 'utf8'));
    if (!targetCfg.mcpServers) targetCfg.mcpServers = {};
    merged = true;
  } catch (e) {
    err(`Existing .cursor/mcp.json is not valid JSON: ${e.message}`);
    console.log('    Fix or remove it, then re-run.\n');
    process.exit(1);
  }
}

// Preserve any other servers the user already has configured.
const preserved = Object.keys(targetCfg.mcpServers).filter((k) => k !== SERVER_KEY);
const replacing = Object.prototype.hasOwnProperty.call(targetCfg.mcpServers, SERVER_KEY);
targetCfg.mcpServers[SERVER_KEY] = serverDef;

fs.mkdirSync(path.dirname(targetMcpPath), { recursive: true });
fs.writeFileSync(targetMcpPath, JSON.stringify(targetCfg, null, 2) + '\n');

if (merged) {
  ok(`.cursor/mcp.json updated (${replacing ? 'replaced' : 'added'} "${SERVER_KEY}")`);
  if (preserved.length) {
    ok(`Preserved existing MCP servers: ${preserved.join(', ')}`);
  }
} else {
  ok('.cursor/mcp.json written');
}

// ─── 3. Pre-approve tools via .cursor/permissions.json ────────────────────────
// `alwaysAllow` inside mcp.json is NOT part of Cursor's documented schema and is
// ignored. `permissions.json` -> `mcpAllowlist` is the documented mechanism, so
// the tool list in mcp.json is treated as our source of truth and translated to
// the `server:tool` form Cursor actually reads.
//
// This matters for eval runs: a full suite issues hundreds of
// submit_eval_scores calls, and without pre-approval each one prompts.
const wantedEntries = allowTools.map((t) => `${SERVER_KEY}:${t}`);

if (wantedEntries.length) {
  const permPath = path.join(target, '.cursor', 'permissions.json');
  let perms = {};
  let existingEntries = [];

  if (fs.existsSync(permPath)) {
    try {
      perms = JSON.parse(fs.readFileSync(permPath, 'utf8'));
    } catch (e) {
      err(`Existing .cursor/permissions.json is not valid JSON: ${e.message}`);
      console.log('    Fix or remove it, then re-run.\n');
      process.exit(1);
    }
    existingEntries = Array.isArray(perms.mcpAllowlist) ? perms.mcpAllowlist : [];
  }

  // Preserve unrelated entries and any other keys (terminalAllowlist, autoRun).
  const foreign = existingEntries.filter(
    (e) => typeof e !== 'string' || !e.toLowerCase().startsWith(`${SERVER_KEY}:`),
  );
  perms.mcpAllowlist = [...foreign, ...wantedEntries];

  fs.mkdirSync(path.dirname(permPath), { recursive: true });
  fs.writeFileSync(permPath, JSON.stringify(perms, null, 2) + '\n');
  ok(`.cursor/permissions.json written (${wantedEntries.length} tools pre-approved)`);
  if (foreign.length) {
    ok(`Preserved ${foreign.length} unrelated allowlist entr(ies)`);
  }
}

// ─── 4. Copy rules ────────────────────────────────────────────────────────────
function copyTree(src, dest) {
  let count = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      count += copyTree(s, d);
    } else {
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(s, d);
      count += 1;
    }
  }
  return count;
}

if (fs.existsSync(SOURCE_RULES)) {
  const dest = path.join(target, '.cursor', 'rules');
  fs.mkdirSync(dest, { recursive: true });
  ok(`Rules copied (${copyTree(SOURCE_RULES, dest)} file(s)) → .cursor/rules/`);
}

// ─── 5. Copy skills (once authored) ───────────────────────────────────────────
if (fs.existsSync(SOURCE_SKILLS)) {
  const dest = path.join(target, '.cursor', 'skills');
  fs.mkdirSync(dest, { recursive: true });
  ok(`Skills copied (${copyTree(SOURCE_SKILLS, dest)} file(s)) → .cursor/skills/`);
}

// ─── 6. Protect generated data from being committed ───────────────────────────
// Done automatically rather than merely advised: these directories hold OAuth
// tokens and real customer transcripts, so a missed manual step means leaking
// credentials and PII into a repo. Appends only what is absent, and never
// rewrites or reorders existing entries.
const gitignorePath = path.join(target, '.gitignore');
const NEEDED = ['.sdd-summary/', '.summaryconfig-lifecycle/'];

// When this repo has been cloned *inside* the target project — a common and
// convenient layout — it must be ignored too. Otherwise git treats it as an
// embedded repository and the user ends up committing the whole server source
// plus the bundle into their own project.
// Compared via real paths so that a symlink anywhere above either location
// (macOS /tmp, a symlinked home directory) cannot hide the nesting.
const realpath = (p) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
};
const relSource = path.relative(realpath(target), realpath(ROOT));
const sourceIsNested =
  relSource !== '' && !relSource.startsWith('..') && !path.isAbsolute(relSource);
if (sourceIsNested) {
  NEEDED.push(relSource.split(path.sep).join('/') + '/');
}

const existingGitignore = fs.existsSync(gitignorePath)
  ? fs.readFileSync(gitignorePath, 'utf8')
  : null;

const missing = NEEDED.filter((n) => {
  if (existingGitignore === null) return true;
  // Match the entry as its own line, with or without a leading slash, so that
  // an existing "/.sdd-summary/" or ".sdd-summary" is recognised.
  const bare = n.replace(/\/$/, '');
  return !existingGitignore
    .split(/\r?\n/)
    .some((line) => {
      const t = line.trim().replace(/^\//, '').replace(/\/$/, '');
      return t === bare;
    });
});

if (missing.length) {
  const comment = sourceIsNested
    ? '# SDD Summary — OAuth tokens, customer transcripts (PII), and the nested\n' +
      '# server clone. None of these belong in your project history.\n'
    : '# SDD Summary — OAuth tokens and customer transcripts (PII). Never commit.\n';
  const block =
    (existingGitignore === null
      ? ''
      : existingGitignore.endsWith('\n')
        ? '\n'
        : '\n\n') +
    comment +
    missing.join('\n') +
    '\n';
  fs.appendFileSync(gitignorePath, block);
  ok(
    `${existingGitignore === null ? 'Created' : 'Updated'} .gitignore ` +
    `(added ${missing.join(', ')})`,
  );
} else {
  ok('.gitignore already covers generated data.');
}

console.log('\n');
hr();
console.log(bold('  Deployed'));
hr();

console.log(`
  Scope: this project only. Tools, rules and skills are inactive in every
  other workspace, because they live under ${target}/.cursor/.

  Next steps:
    1. Open ${bold(path.basename(target))} as your Cursor workspace.${
      sourceIsNested
        ? `\n       ${yellow('Not')} ${path.basename(ROOT)}/ — Cursor only reads .cursor/mcp.json\n       from the workspace root.`
        : ''
    }
    2. Reload Cursor:  View menu → Command Palette → "Developer: Reload Window"

    3. ${bold('Turn the server on — this is a manual step.')}
       ${yellow('Writing the config does not enable the server.')} Cursor has no
       setting to pre-enable it, so it must be switched on by hand once:

         Open ${bold('Customize')} in the sidebar → ${bold('MCPs')} → toggle
         "${SERVER_KEY}" ${bold('on')}

       It should then report ${bold('47 tools')}. If the toggle is missing entirely,
       the config was not found — check step 1 opened the right folder.

    4. Start a new chat and just say ${bold('"begin"')}. The agent will check
       whether your Genesys OAuth client exists and walk you through it if not.

  Re-run this script after any server change to refresh the vendored copy.
`);
