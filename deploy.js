#!/usr/bin/env node
/**
 * SDD Summary — deploy into a single project (project-scoped install).
 *
 *   node deploy.js [/path/to/target/project]
 *
 * Defaults to the current working directory.
 *
 * WHY THIS EXISTS
 * ---------------
 * Installing as a Cursor plugin puts the server at USER scope, which makes all
 * 47 tools and the always-applied pipeline rule active in every workspace you
 * open. For a tool this specialised that is unwanted: unrelated projects get
 * Genesys tooling in scope and ~488 lines of guidance injected per request.
 *
 * Cursor's documented project-scoped mechanisms are `.cursor/mcp.json`,
 * `.cursor/rules/` and `.cursor/skills/`, so this script writes those into one
 * target project and vendors the server bundle alongside them.
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

// ─── 3. Copy rules ────────────────────────────────────────────────────────────
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

// ─── 4. Copy skills (once authored) ───────────────────────────────────────────
if (fs.existsSync(SOURCE_SKILLS)) {
  const dest = path.join(target, '.cursor', 'skills');
  fs.mkdirSync(dest, { recursive: true });
  ok(`Skills copied (${copyTree(SOURCE_SKILLS, dest)} file(s)) → .cursor/skills/`);
}

// ─── 5. Protect generated data from being committed ───────────────────────────
// Done automatically rather than merely advised: these directories hold OAuth
// tokens and real customer transcripts, so a missed manual step means leaking
// credentials and PII into a repo. Appends only what is absent, and never
// rewrites or reorders existing entries.
const gitignorePath = path.join(target, '.gitignore');
const NEEDED = ['.sdd-summary/', '.summaryconfig-lifecycle/'];

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
  const block =
    (existingGitignore === null
      ? ''
      : existingGitignore.endsWith('\n')
        ? '\n'
        : '\n\n') +
    '# SDD Summary — OAuth tokens and customer transcripts (PII). Never commit.\n' +
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
    1. Open ${bold(path.basename(target))} as your Cursor workspace.
    2. Cmd+Shift+P → "Developer: Reload Window".
    3. In a new chat, log in:
         login(authorization_url="<Authorization URL from Genesys Admin →
                                   IT and Integrations → OAuth → your client>")
    4. After the browser confirms: complete_login()
    5. Verify all 8 scopes: smoke_test_auth()

  Re-run this script after any server change to refresh the vendored copy.
`);
