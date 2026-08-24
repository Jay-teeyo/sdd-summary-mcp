#!/usr/bin/env node
/**
 * SDD Summary MCP Server — Setup Script
 *
 * Generates MCP config files for your AI coding environments with the correct
 * absolute paths already filled in. Run from the project root:
 *
 *   node setup.js
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

// ─── Paths ────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname);
const SERVER_DIST = path.join(ROOT, 'mcp-server', 'dist', 'index.js');
const STORAGE_PATH = path.join(ROOT, '.sdd-summary');

// ─── Terminal helpers ─────────────────────────────────────────────────────────
const reset = '\x1b[0m';
const bold  = (s) => `\x1b[1m${s}${reset}`;
const green = (s) => `\x1b[32m${s}${reset}`;
const yellow = (s) => `\x1b[33m${s}${reset}`;
const red    = (s) => `\x1b[31m${s}${reset}`;

function ok(msg)   { console.log(`  ${green('✓')} ${msg}`); }
function warn(msg) { console.log(`  ${yellow('⚠')} ${msg}`); }
function err(msg)  { console.log(`  ${red('✗')} ${msg}`); }
function hr()      { console.log('─'.repeat(62)); }

// ─── Node version check ───────────────────────────────────────────────────────
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 18) {
  err(`Node.js 18+ required. You have ${process.version}.`);
  process.exit(1);
}

// ─── Interactive prompt helpers ───────────────────────────────────────────────
function prompt(rl, question, defaultVal) {
  return new Promise((resolve) => {
    const hint = defaultVal ? ` [${defaultVal}]` : '';
    rl.question(`    ${question}${hint}: `, (ans) => {
      resolve(ans.trim() || defaultVal || '');
    });
  });
}

function promptYesNo(rl, question, defaultYes = false) {
  return new Promise((resolve) => {
    const hint = defaultYes ? '[Y/n]' : '[y/N]';
    rl.question(`    ${question} ${hint}: `, (ans) => {
      const normalized = ans.trim().toLowerCase();
      if (!normalized) resolve(defaultYes);
      else resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

// ─── Config builders ──────────────────────────────────────────────────────────
const ALWAYS_ALLOW = [
  // Auth
  'login', 'complete_login', 'logout', 'smoke_test_auth', 'get_pipeline_guide',
  // Pipeline setup
  'build_interaction_filter',
  // Bulk fetch
  'fetch_transcripts_bulk', 'fetch_existing_summaries_bulk',
  // Individual transcript tools
  'fetch_transcript', 'store_transcript', 'list_transcripts',
  // Summary config
  'list_summary_settings', 'get_summary_setting', 'get_existing_summaries',
  // Search
  'search_conversations',
  // Copilot
  'list_assistants', 'get_copilot_config',
  // Test authoring
  'generate_test_case', 'save_test_case', 'list_test_cases',
  'save_test_set', 'list_test_sets',
  // Evaluation
  'prepare_prompt_test', 'start_eval_run', 'submit_eval_scores', 'finalize_eval_run',
  'save_eval_run', 'list_eval_runs',
  // Preview
  'generate_preview_summary',
  // Version management
  'save_version', 'list_versions',
  // Post-eval
  'save_improvement_recommendations',
  // Dashboards
  'generate_eval_run_dashboard', 'generate_improvements_dashboard', 'generate_dashboard',
];

function buildEnv() {
  return {
    SDDSUM_STORAGE_PATH: STORAGE_PATH,
  };
}

function buildConfig(withAlwaysAllow = false) {
  const server = {
    command: 'node',
    args: [SERVER_DIST],
    env: buildEnv(),
  };
  if (withAlwaysAllow) server.alwaysAllow = ALWAYS_ALLOW;
  return { mcpServers: { 'sdd-summary': server } };
}

function writeConfig(filePath, config, label) {
  if (fs.existsSync(filePath)) {
    warn(`${label} already exists — skipped. Delete it and re-run to regenerate.`);
    return false;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n');
  ok(`Written: ${path.relative(ROOT, filePath)}`);
  return true;
}

// ─── Workspace root detection ─────────────────────────────────────────────────
// Cursor reads .cursor/mcp.json from the workspace root only.
// Warn if this repo appears to be nested inside another workspace
// (i.e. a .cursor/ folder exists in a parent directory).
function detectParentWorkspace() {
  let dir = path.dirname(ROOT);
  const fsRoot = path.parse(dir).root;
  while (dir !== fsRoot) {
    if (fs.existsSync(path.join(dir, '.cursor'))) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n');
  hr();
  console.log(bold('  SDD Summary MCP Server — Setup'));
  hr();
  console.log('\n  This script will:');
  console.log('    1. Build the MCP server (if not already built)');
  console.log('    2. Generate config files for your chosen AI coding environments');
  console.log('    3. Show you what to do next\n');

  // ── Workspace root check (Cursor only) ──
  const parentWorkspace = detectParentWorkspace();
  if (parentWorkspace) {
    console.log(yellow('  ⚠  Heads up — Cursor workspace root mismatch detected'));
    console.log(`     This repo is inside: ${parentWorkspace}`);
    console.log(`     Cursor reads .cursor/mcp.json from the workspace root, not subfolders.`);
    console.log(`     To use this MCP server in Cursor, open this folder as your workspace:`);
    console.log(`       File → Open Folder → ${ROOT}\n`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // ── Step 1: Environments ──
  console.log(bold('\n  Which environments do you want to configure?\n'));
  const setupCursor     = await promptYesNo(rl, 'Cursor                        ', true);
  const setupClaudeCode = await promptYesNo(rl, 'Claude Code / VS Code (.mcp.json)', false);
  const setupKiro       = await promptYesNo(rl, 'Kiro                          ', false);

  rl.close();

  // ── Step 3: Build ──
  console.log(bold('\n  Building MCP server...\n'));
  if (fs.existsSync(SERVER_DIST)) {
    ok('dist/index.js already exists. Skipping build. Run "cd mcp-server && npm run build" to rebuild.');
  } else {
    try {
      execSync('npm install && npm run build', {
        cwd: path.join(ROOT, 'mcp-server'),
        stdio: 'inherit',
      });
      ok('Build complete.');
    } catch {
      err('Build failed. Fix the errors above and re-run setup.js.');
      process.exit(1);
    }
  }

  // ── Step 4: Create .sdd-summary/ ──
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
  ok('.sdd-summary/ directory ready.');

  // ── Step 5: Write configs ──
  console.log(bold('\n  Writing config files...\n'));

  const written = [];

  if (setupCursor) {
    const p = path.join(ROOT, '.cursor', 'mcp.json');
    if (writeConfig(p, buildConfig(true), '.cursor/mcp.json')) {
      written.push('.cursor/mcp.json');
    }
  }

  if (setupClaudeCode) {
    const p = path.join(ROOT, '.mcp.json');
    if (writeConfig(p, buildConfig(false), '.mcp.json')) {
      written.push('.mcp.json');
    }
  }

  if (setupKiro) {
    const p = path.join(ROOT, '.kiro', 'settings', 'mcp.json');
    if (writeConfig(p, buildConfig(false), '.kiro/settings/mcp.json')) {
      written.push('.kiro/settings/mcp.json');
    }
  }

  // ── Step 6: Summary ──
  console.log('\n');
  hr();
  console.log(bold('  Setup complete!'));
  hr();

  if (written.length > 0) {
    console.log(green('\n  Config files written:'));
    written.forEach((f) => console.log(`     → ${f}`));
  }

  console.log('\n  Next steps:');
  console.log('    1. Open THIS folder as your Cursor workspace (File → Open Folder)');
  console.log('       Cursor reads .cursor/mcp.json from the workspace root — not subfolders.');
  console.log('    2. Reload MCP servers (Cmd+Shift+P → "MCP: Reload Servers")');
  console.log('    3. Start a new chat and run:');
  console.log('         login(authorization_url="<paste Authorization URL from Genesys Admin → IT and Integrations → OAuth → your client>")');
  console.log('    4. After browser login: complete_login()');
  console.log('    5. Verify all 7 scopes: smoke_test_auth()\n');
  console.log('  Detailed setup guide: docs/setup.md');
  console.log('  Pipeline reference:   ask the agent to call get_pipeline_guide()\n');
}

main().catch((e) => {
  console.error(red('\nSetup failed: ' + e.message));
  process.exit(1);
});
