#!/usr/bin/env node
/**
 * SDD Summary — deploy into a single project (project-scoped install).
 *
 *   node deploy.js [/path/to/target/project]
 *   node deploy.js --kiro
 *   node deploy.js --cursor /path/to/project
 *
 * Defaults to the current working directory. Asks which editor you use unless
 * told, then writes that host's configuration and nothing else.
 *
 * The documented layout clones this repo inside the target project, so the usual
 * invocation is `node deploy.js ..` from within the clone.
 *
 * WHY PROJECT SCOPE
 * -----------------
 * Installing at USER scope makes all 42 tools and the always-applied pipeline
 * guidance active in every workspace you open. For a tool this specialised that
 * is unwanted: unrelated projects get Genesys tooling in scope and ~490 lines of
 * guidance injected per request.
 *
 * WHY TWO TARGETS
 * ---------------
 * Cursor and Kiro disagree on every packaging detail that matters — config
 * location, placeholder expansion, how tools are pre-approved, how guidance
 * files are declared, and how parallel scoring subagents are spawned. The
 * server bundle itself is identical for both; only the wiring differs. See
 * deploy/cursor.js and deploy/kiro.js for each host's specifics.
 */

'use strict';

const path = require('path');
const readline = require('readline');

const S = require('./deploy/shared');
const { deployCursor, printCursorNextSteps } = require('./deploy/cursor');
const { deployKiro, printKiroNextSteps } = require('./deploy/kiro');

if (parseInt(process.versions.node.split('.')[0], 10) < 18) {
  S.err(`Node.js 18+ required. You have ${process.version}.`);
  process.exit(1);
}

// ─── Parse arguments ──────────────────────────────────────────────────────────
// Host may be given as a flag so the script is usable from CI or a setup
// wrapper. Anything not a recognised flag is treated as the target path.

const HOSTS = {
  cursor: { label: 'Cursor', deploy: deployCursor, next: printCursorNextSteps },
  kiro: { label: 'Kiro', deploy: deployKiro, next: printKiroNextSteps },
};

let host = null;
let targetArg = null;
let kirocrew = false;

for (const arg of process.argv.slice(2)) {
  const m = /^--host[=:](.+)$/.exec(arg);
  if (m) {
    host = m[1].toLowerCase();
  } else if (arg === '--cursor' || arg === '--kiro') {
    host = arg.slice(2);
  } else if (arg === '--kirocrew') {
    kirocrew = true;
  } else if (arg === '-h' || arg === '--help') {
    console.log(`
  SDD Summary — project-scoped deploy

    node deploy.js [target]           ask which editor, then deploy
    node deploy.js --kiro [target]    deploy for Kiro
    node deploy.js --cursor [target]  deploy for Cursor

    --kirocrew                        Kiro only. ALSO install the two agent
                                      configs into ~/.kiro/agents/, so they
                                      appear in KiroCrew's dashboard under
                                      Agent Capabilities → Agent Templates.
                                      This is the only thing written OUTSIDE
                                      the target project.

  target defaults to the current directory.
`);
    process.exit(0);
  } else if (!arg.startsWith('-')) {
    targetArg = arg;
  } else {
    S.err(`Unrecognised option: ${arg}`);
    console.log('    Run with --help to see usage.\n');
    process.exit(1);
  }
}

if (host && !HOSTS[host]) {
  S.err(`Unknown host "${host}". Expected "cursor" or "kiro".`);
  process.exit(1);
}

// --kirocrew installs Kiro agent configs, so it only means anything for Kiro.
// Refuse rather than silently ignore it: a user who passed it and got nothing
// would have no way to tell the flag had no effect.
if (kirocrew && host === 'cursor') {
  S.err('--kirocrew applies to the Kiro target only.');
  console.log(
    '    It installs Kiro agent configs so KiroCrew\'s dashboard can see them.\n' +
    '    Cursor has no equivalent. Drop the flag, or deploy with --kiro.\n',
  );
  process.exit(1);
}

// Passing it with no host at all is unambiguous: only Kiro can use it.
if (kirocrew && !host) {
  host = 'kiro';
  S.warn('--kirocrew implies the Kiro target; deploying for Kiro.');
}

const target = S.resolveTarget(targetArg);

// ─── Ask which editor ─────────────────────────────────────────────────────────

/**
 * Prompt for the host when it was not passed as a flag.
 *
 * Refuses to guess when stdin is not a TTY: a wrong guess writes a whole config
 * tree for the wrong editor, which then looks like a broken install rather than
 * a wrong choice. A non-interactive caller must pass the flag.
 */
function askHost() {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      S.err('Cannot ask which editor to deploy for — stdin is not interactive.');
      console.log('    Pass the host explicitly:  node deploy.js --kiro\n' +
                  '                               node deploy.js --cursor\n');
      process.exit(1);
    }

    console.log(`  Which editor will you use this in?

    ${S.bold('1)')} Kiro
    ${S.bold('2)')} Cursor
`);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = () => {
      rl.question('  Enter 1 or 2: ', (answer) => {
        const a = answer.trim().toLowerCase();
        if (a === '1' || a === 'kiro') {
          rl.close();
          resolve('kiro');
        } else if (a === '2' || a === 'cursor') {
          rl.close();
          resolve('cursor');
        } else {
          console.log(`  ${S.yellow('?')} Please enter 1 (Kiro) or 2 (Cursor).`);
          ask();
        }
      });
    };
    ask();
  });
}

// ─── Run ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n');
  S.hr();
  console.log(S.bold('  SDD Summary — project-scoped deploy'));
  S.hr();
  console.log('');

  if (!host) host = await askHost();
  const chosen = HOSTS[host];

  console.log(`
  Editor: ${S.bold(chosen.label)}
  Source: ${S.dim(S.ROOT)}
  Target: ${S.bold(target)}${
    kirocrew ? `\n  Extra:  ${S.bold('--kirocrew')} — also installing agents to ~/.kiro/agents/` : ''
  }
`);

  S.ensureBundle();

  const { sourceIsNested, globalInstalled } = chosen.deploy(target, { kirocrew });

  console.log('\n');
  S.hr();
  console.log(S.bold(`  Deployed for ${chosen.label}`));
  S.hr();

  chosen.next(target, sourceIsNested, globalInstalled);
}

main().catch((e) => {
  S.err(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
