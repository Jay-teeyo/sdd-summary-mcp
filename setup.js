#!/usr/bin/env node
/**
 * SDD Summary — FALLBACK setup script.
 *
 * The supported install path is the Cursor plugin (see docs/setup.md). Installing
 * the plugin registers the MCP server automatically, so no config file needs to
 * be generated and no absolute paths need to be resolved.
 *
 * This script exists only as an escape hatch for when the plugin route is
 * unavailable — for example if plugin support or the ${CURSOR_PLUGIN_ROOT}
 * placeholder does not work on your Cursor version, or local plugin imports are
 * disabled by an Enterprise policy.
 *
 * It reads the plugin's own mcp.json and resolves the placeholders to real
 * absolute paths, so the pre-approved tool list is never duplicated here.
 *
 *   node setup.js
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname);
const PLUGIN_MCP_JSON = path.join(ROOT, 'mcp.json');
const BUNDLE = path.join(ROOT, 'mcp-server', 'bundle', 'sdd-summary-mcp.mjs');
const TARGET = path.join(ROOT, '.cursor', 'mcp.json');

const reset = '\x1b[0m';
const bold = (s) => `\x1b[1m${s}${reset}`;
const green = (s) => `\x1b[32m${s}${reset}`;
const yellow = (s) => `\x1b[33m${s}${reset}`;
const red = (s) => `\x1b[31m${s}${reset}`;

const ok = (m) => console.log(`  ${green('✓')} ${m}`);
const warn = (m) => console.log(`  ${yellow('⚠')} ${m}`);
const err = (m) => console.log(`  ${red('✗')} ${m}`);
const hr = () => console.log('─'.repeat(66));

if (parseInt(process.versions.node.split('.')[0], 10) < 18) {
  err(`Node.js 18+ required. You have ${process.version}.`);
  process.exit(1);
}

/**
 * Cursor reads .cursor/mcp.json from the workspace root only. If this repo sits
 * inside another folder that Cursor treats as the workspace, the generated file
 * is silently ignored — the single most common setup failure, and the reason the
 * plugin route is preferred.
 */
function detectParentWorkspace() {
  let dir = path.dirname(ROOT);
  const fsRoot = path.parse(dir).root;
  while (dir !== fsRoot) {
    if (fs.existsSync(path.join(dir, '.cursor'))) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

console.log('\n');
hr();
console.log(bold('  SDD Summary — fallback setup'));
hr();
console.log(`
  The recommended install is the Cursor plugin, which needs none of this:

    ln -s ${ROOT} ~/.cursor/plugins/local/sdd-summary

  then Cmd+Shift+P -> Developer: Reload Window.

  Continuing will instead write a plain .cursor/mcp.json for this folder.
`);

// ─── Ensure the bundle exists ─────────────────────────────────────────────────
if (fs.existsSync(BUNDLE)) {
  ok('Server bundle present.');
} else {
  warn('Server bundle missing — building it now.');
  try {
    execSync('npm install && npm run bundle', {
      cwd: path.join(ROOT, 'mcp-server'),
      stdio: 'inherit',
    });
    ok('Bundle built.');
  } catch {
    err('Bundle build failed. Fix the errors above and re-run.');
    process.exit(1);
  }
}

// ─── Resolve the plugin config's placeholders ────────────────────────────────
let config;
try {
  const raw = fs.readFileSync(PLUGIN_MCP_JSON, 'utf8');
  config = JSON.parse(
    raw
      .replace(/\$\{CURSOR_PLUGIN_ROOT\}/g, ROOT)
      .replace(/\$\{workspaceFolder\}/g, ROOT),
  );
} catch (e) {
  err(`Could not read or parse ${path.relative(ROOT, PLUGIN_MCP_JSON)}: ${e.message}`);
  process.exit(1);
}

// ─── Write .cursor/mcp.json ──────────────────────────────────────────────────
if (fs.existsSync(TARGET)) {
  warn('.cursor/mcp.json already exists — leaving it alone.');
  warn('Delete it and re-run if you want it regenerated.');
} else {
  fs.mkdirSync(path.dirname(TARGET), { recursive: true });
  fs.writeFileSync(TARGET, JSON.stringify(config, null, 2) + '\n');
  ok('Written: .cursor/mcp.json');
}

fs.mkdirSync(path.join(ROOT, '.sdd-summary'), { recursive: true });
ok('.sdd-summary/ ready.');

// ─── Next steps ──────────────────────────────────────────────────────────────
console.log('\n');
hr();
console.log(bold('  Done'));
hr();

const parentWorkspace = detectParentWorkspace();
if (parentWorkspace) {
  console.log(yellow('\n  ⚠  Workspace root mismatch detected'));
  console.log(`     This repo sits inside: ${parentWorkspace}`);
  console.log('     Cursor reads .cursor/mcp.json from the workspace root, not subfolders,');
  console.log('     so the file just written will be ignored unless you open this folder');
  console.log('     directly:');
  console.log(`       File -> Open Folder -> ${ROOT}`);
  console.log('     The plugin install has no such constraint.');
}

console.log(`
  Next steps:
    1. Open THIS folder as your Cursor workspace (File -> Open Folder).
    2. Cmd+Shift+P -> "MCP: Reload Servers".
    3. In a new chat, log in:
         login(authorization_url="<Authorization URL from Genesys Admin ->
                                   IT and Integrations -> OAuth -> your client>")
    4. After the browser confirms: complete_login()
    5. Verify all 8 scopes: smoke_test_auth()

  Setup guide:        docs/setup.md
  Pipeline reference: ask the agent to call get_pipeline_guide()
`);
