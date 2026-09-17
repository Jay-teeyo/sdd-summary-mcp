'use strict';
/**
 * Helpers shared by the Cursor and Kiro deploy targets.
 *
 * Anything host-specific belongs in cursor.js or kiro.js. This module holds only
 * what is genuinely identical between them: console formatting, locating and
 * building the server bundle, reading the canonical tool allowlist, recursive
 * copying, and the .gitignore protection that keeps tokens and customer
 * transcripts out of the user's history.
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_BUNDLE = path.join(ROOT, 'mcp-server', 'bundle', 'sdd-summary-mcp.mjs');
const SOURCE_MCP_JSON = path.join(ROOT, 'mcp.json');
const SOURCE_RULES = path.join(ROOT, 'rules');
const SOURCE_SKILLS = path.join(ROOT, 'skills');
const SOURCE_KIRO = path.join(ROOT, 'kiro');

const BUNDLE_NAME = 'sdd-summary-mcp.mjs';
const SERVER_KEY = 'sdd-summary';

// ─── Console formatting ───────────────────────────────────────────────────────

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

// ─── Bundle ───────────────────────────────────────────────────────────────────

/**
 * The committed bundle is what the editor actually runs. It should always be
 * present in a fresh clone; building here is a recovery path for a working copy
 * where it has been deleted or gitignored away.
 */
function ensureBundle() {
  if (fs.existsSync(SOURCE_BUNDLE)) return;
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

/** Copy the bundle into `destDir`, returning its size in KB for the log line. */
function vendorBundle(destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(SOURCE_BUNDLE, path.join(destDir, BUNDLE_NAME));
  return (fs.statSync(SOURCE_BUNDLE).size / 1024).toFixed(0);
}

// ─── Canonical server definition ──────────────────────────────────────────────

/**
 * Read the repo-root mcp.json, which is the SINGLE SOURCE OF TRUTH for the
 * pre-approved tool list.
 *
 * `alwaysAllow` is not part of any host's schema — it is our own key. Each target
 * translates it into whatever that host actually reads (Cursor:
 * permissions.json -> mcpAllowlist; Kiro: allowedTools in the agent config) and
 * must delete it before writing, so no deployed file claims something the host
 * will silently ignore.
 *
 * Returns a deep copy so a caller mutating it cannot affect another target.
 */
function readServerDefinition() {
  const cfg = JSON.parse(fs.readFileSync(SOURCE_MCP_JSON, 'utf8'));
  const def = cfg.mcpServers && cfg.mcpServers[SERVER_KEY];
  if (!def) {
    err(`mcp.json has no "${SERVER_KEY}" server definition.`);
    process.exit(1);
  }
  const clone = JSON.parse(JSON.stringify(def));
  const allowTools = Array.isArray(clone.alwaysAllow) ? clone.alwaysAllow : [];
  delete clone.alwaysAllow;
  return { serverDef: clone, allowTools };
}

// ─── Filesystem ───────────────────────────────────────────────────────────────

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

/** Read JSON, exiting with a clear message rather than a stack trace if malformed. */
function readJsonOrExit(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    err(`Existing ${label} is not valid JSON: ${e.message}`);
    console.log('    Fix or remove it, then re-run.\n');
    process.exit(1);
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

// ─── Target validation ────────────────────────────────────────────────────────

function resolveTarget(argv) {
  const target = path.resolve(argv || process.cwd());
  if (!fs.existsSync(target)) {
    err(`Target does not exist: ${target}`);
    console.log('    Create the folder first, or pass an existing path.\n');
    process.exit(1);
  }
  if (!fs.statSync(target).isDirectory()) {
    err(`Target is not a directory: ${target}`);
    process.exit(1);
  }
  return target;
}

// ─── .gitignore protection ────────────────────────────────────────────────────

const realpath = (p) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
};

/**
 * Ensure generated data cannot be committed.
 *
 * Done automatically rather than merely advised: these directories hold OAuth
 * tokens and real customer transcripts, so a missed manual step means leaking
 * credentials and PII into a repo. Appends only what is absent, and never
 * rewrites or reorders existing entries.
 */
function protectGitignore(target) {
  const gitignorePath = path.join(target, '.gitignore');
  const NEEDED = ['.sdd-summary/', '.summaryconfig-lifecycle/'];

  // When this repo has been cloned INSIDE the target project — a common and
  // convenient layout — it must be ignored too, or git treats it as an embedded
  // repository and the user commits the whole server source into their project.
  // Compared via real paths so a symlink above either location cannot hide it.
  const relSource = path.relative(realpath(target), realpath(ROOT));
  const sourceIsNested =
    relSource !== '' && !relSource.startsWith('..') && !path.isAbsolute(relSource);
  if (sourceIsNested) {
    NEEDED.push(relSource.split(path.sep).join('/') + '/');
  }

  const existing = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf8')
    : null;

  const missing = NEEDED.filter((n) => {
    if (existing === null) return true;
    // Match as its own line, with or without a leading slash or trailing slash,
    // so an existing "/.sdd-summary" is recognised.
    const bare = n.replace(/\/$/, '');
    return !existing.split(/\r?\n/).some((line) => {
      const t = line.trim().replace(/^\//, '').replace(/\/$/, '');
      return t === bare;
    });
  });

  if (!missing.length) {
    ok('.gitignore already covers generated data.');
    return { sourceIsNested };
  }

  const comment = sourceIsNested
    ? '# SDD Summary — OAuth tokens, customer transcripts (PII), and the nested\n' +
      '# server clone. None of these belong in your project history.\n'
    : '# SDD Summary — OAuth tokens and customer transcripts (PII). Never commit.\n';

  const block =
    (existing === null ? '' : existing.endsWith('\n') ? '\n' : '\n\n') +
    comment +
    missing.join('\n') +
    '\n';

  fs.appendFileSync(gitignorePath, block);
  ok(
    `${existing === null ? 'Created' : 'Updated'} .gitignore (added ${missing.join(', ')})`,
  );
  return { sourceIsNested };
}

module.exports = {
  ROOT,
  SOURCE_BUNDLE,
  SOURCE_MCP_JSON,
  SOURCE_RULES,
  SOURCE_SKILLS,
  SOURCE_KIRO,
  BUNDLE_NAME,
  SERVER_KEY,
  bold,
  green,
  yellow,
  red,
  dim,
  ok,
  warn,
  err,
  hr,
  ensureBundle,
  vendorBundle,
  readServerDefinition,
  copyTree,
  readJsonOrExit,
  writeJson,
  resolveTarget,
  protectGitignore,
};
