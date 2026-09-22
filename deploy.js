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
const {
  registerWithKiroCrew,
  verifyKiroCrew,
  isInstalled: kiroCrewInstalled,
} = require('./deploy/kirocrew');

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
let verifyOnly = false;

for (const arg of process.argv.slice(2)) {
  const m = /^--host[=:](.+)$/.exec(arg);
  if (m) {
    host = m[1].toLowerCase();
  } else if (arg === '--cursor' || arg === '--kiro') {
    host = arg.slice(2);
  } else if (arg === '--kirocrew') {
    kirocrew = true;
  } else if (arg === '--verify') {
    verifyOnly = true;
  } else if (arg === '-h' || arg === '--help') {
    console.log(`
  SDD Summary — project-scoped deploy

    node deploy.js [target]           ask which editor, then deploy
    node deploy.js --kiro [target]    deploy for Kiro
    node deploy.js --cursor [target]  deploy for Cursor

  Kiro only:
    --kirocrew                        also register the server with KiroCrew, so
                                      a dashboard session can host the pipeline
    --verify                          check an existing KiroCrew registration
                                      and exit, writing nothing

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

// Refused rather than ignored. KiroCrew hosts Kiro agents, so the flag is
// meaningless for Cursor — and a user who passed it and got nothing would have no
// way to tell it had been dropped.
if (kirocrew && host === 'cursor') {
  S.err('--kirocrew applies to the Kiro install only.');
  console.log('    KiroCrew runs Kiro agents; there is no Cursor equivalent to register.\n');
  process.exit(1);
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

/**
 * Offer the dashboard registration, once the host is known to be Kiro.
 *
 * WHY THIS IS A SECOND QUESTION, NOT A THIRD HOST
 * -----------------------------------------------
 * KiroCrew is not a host. It is an additional place the Kiro install can reach, and
 * the difference between the two answers is one file outside the project. Listing
 * "Kiro" and "Kiro + KiroCrew" side by side in the host menu would present them as
 * competing installs and put a choice about someone else's product in front of
 * every user, including the ones who do not have it.
 *
 * So it is asked only when KiroCrew is actually installed. Without that check this
 * would be a question most users cannot act on, which is how a prompt trains people
 * to hit Enter without reading it.
 *
 * Defaults to NO. This is the only step that writes outside the target project, so
 * a hurried Enter must leave the machine as a plain --kiro run would.
 */
function askKiroCrew() {
  return new Promise((resolve) => {
    console.log(`
  ${S.bold('KiroCrew is installed. Register the pipeline with its dashboard too?')}

  ${S.dim('Without this the pipeline runs from kiro-cli chat only: a dashboard')}
  ${S.dim("session runs KiroCrew's own agent and would see none of its tools.")}
  ${S.dim('Adding it writes one file outside this project (~/.kiro/crew/mcp.json),')}
  ${S.dim('then needs one click in the dashboard to switch the server on.')}
`);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('  Register with KiroCrew? [y/N]: ', (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

// ─── Run ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n');
  S.hr();
  console.log(S.bold('  SDD Summary — project-scoped deploy'));
  S.hr();
  console.log('');

  // A read-only check of an install that already exists, so it deliberately runs
  // before the host prompt and writes nothing.
  if (verifyOnly) {
    const healthy = await verifyKiroCrew(target);
    console.log('');
    process.exit(healthy ? 0 : 1);
  }

  if (!host) host = await askHost();
  const chosen = HOSTS[host];

  console.log(`
  Editor: ${S.bold(chosen.label)}
  Source: ${S.dim(S.ROOT)}
  Target: ${S.bold(target)}
`);

  // Asked here, after the target is on screen, so the answer is given with the
  // project it applies to in view. Skipped when --kirocrew already said yes, when
  // stdin cannot answer, and when there is no KiroCrew to register with.
  if (!kirocrew && host === 'kiro' && process.stdin.isTTY && kiroCrewInstalled()) {
    kirocrew = await askKiroCrew();
  }

  S.ensureBundle();

  const { sourceIsNested } = chosen.deploy(target);

  // Opt-in, and the only step that writes outside the target project — so it is
  // reported separately and the closing output only mentions the dashboard when
  // the registration actually happened.
  let crew = null;
  if (kirocrew) {
    console.log('');
    console.log(`  ${S.bold('KiroCrew registration')} ${S.dim('(writes outside this project)')}`);
    crew = registerWithKiroCrew(target);
  }

  console.log('\n');
  S.hr();
  console.log(S.bold(`  Deployed for ${chosen.label}`));
  S.hr();

  chosen.next(target, sourceIsNested, crew);

  // Verified immediately, because the failure this catches — a server that cannot
  // start from KiroCrew's working directory — otherwise surfaces only as an error
  // badge on a dashboard page, long after the deploy claimed success.
  if (crew) {
    S.hr();
    const healthy = await verifyKiroCrew(target);
    if (!healthy) {
      console.log('');
      S.err('The KiroCrew registration needs attention — see above.');
      console.log(`    Re-check at any time:  ${S.bold('node deploy.js --verify ' + target)}\n`);
      process.exitCode = 1;
    } else {
      console.log('');
      S.ok('KiroCrew registration verified.');
      console.log('');
    }
  }
}

main().catch((e) => {
  S.err(e && e.stack ? e.stack : String(e));
  process.exit(1);
});
