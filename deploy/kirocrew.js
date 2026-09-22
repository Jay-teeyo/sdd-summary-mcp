'use strict';
/**
 * SDD Summary — optional KiroCrew dashboard registration (`--kirocrew`).
 *
 * The project-scoped Kiro install (deploy/kiro.js) only reaches `kiro-cli chat`.
 * A KiroCrew dashboard session runs KiroCrew's OWN agent, `~/.kiro/agents/
 * kirocrew.json`, so nothing written inside the project can give that session the
 * pipeline tools. This module is the bridge.
 *
 * WHY NOT JUST INSTALL THE AGENT GLOBALLY
 * ---------------------------------------
 * That was tried and reverted. Copying sdd-summary.json into ~/.kiro/agents/ does
 * make it selectable under Agent Capabilities, but a dashboard tab still came up
 * with zero @sdd-summary/* tools. The reason is in KiroCrew's own source:
 * `includeMcpJson` is pinned false on every agent it owns (kiro_crew/agent.py
 * describes it as framework-owned containment), so kiro-cli never reads any
 * settings/mcp.json for those sessions. Verified false on kirocrew,
 * kirocrew-conductor, kirocrew-pipeline-conductor and kirocrew-research.
 *
 * WHAT ACTUALLY WORKS
 * -------------------
 * KiroCrew keeps its own MCP registry and syncs it into the agent config itself.
 * kiro_crew/mcp_discovery.py scans two files, highest priority first:
 *
 *     ~/.kiro/crew/mcp.json        scope "kirocrew"
 *     ~/.kiro/settings/mcp.json    scope "kiroGlobal"
 *
 * and when the user enables a server on the dashboard's MCP Servers page,
 * kiro_crew/dashboard/handlers/mcp.py copies that spec into kirocrew.json's
 * `mcpServers`, mounts `@sdd-summary` in `tools`, and adds it to `allowedTools`
 * when no governance ceiling applies. So: write the registry entry here, and let
 * the user's one click do the mounting.
 *
 * WHY THE ENABLE CLICK IS LEFT TO THE USER
 * ----------------------------------------
 * That toggle IS KiroCrew's consent step — its own comments call it "the consent
 * step the install flow points at". Writing the `tools`/`allowedTools` grant from
 * a script would silently hand 45 auto-approved tools to every dashboard session
 * on the machine. A deploy script should not forge consent, so this stops one
 * click short and prints the route instead.
 *
 * WHY ABSOLUTE PATHS, UNLIKE EVERY OTHER PATH WE WRITE
 * ----------------------------------------------------
 * The project install uses a relative bundle path because Kiro launches an stdio
 * server with the workspace root as its CWD. KiroCrew does NOT: it probes with
 * `/` as the working directory. Verified from its quarantine log, which recorded
 * `Cannot find module '/.kiro/sdd-summary/sdd-summary-mcp.mjs'` — the project's
 * relative path resolved against the filesystem root.
 *
 * That same `/` CWD is why the storage env vars are set here and omitted by
 * deploy/kiro.js. The server derives both directories from its CWD when they are
 * unset, so a dashboard-launched server would otherwise resolve them under `/`
 * rather than the project. (config.ts now refuses that outright, so the failure
 * would be loud — but it should never get the chance.)
 *
 * The cost of absolute paths is that one registration serves ONE project, so a
 * re-run pointed elsewhere repoints it and says so.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const S = require('./shared');

const CREW_HOME = path.join(os.homedir(), '.kiro', 'crew');
const REGISTRY = path.join(CREW_HOME, 'mcp.json');
const AGENT_CONFIG = path.join(os.homedir(), '.kiro', 'agents', 'kirocrew.json');
const QUARANTINE = path.join(CREW_HOME, 'mcp-quarantine.json');

const shownRegistry = path.join('~', '.kiro', 'crew', 'mcp.json');
const shownAgent = path.join('~', '.kiro', 'agents', 'kirocrew.json');

/**
 * KiroCrew's data home is created on its first run, so its absence means the app
 * has never started — registering into a directory it may never read would be a
 * silent no-op dressed up as success.
 */
function isInstalled() {
  return fs.existsSync(CREW_HOME);
}

/** The server spec a KiroCrew-hosted session needs. See the header on absolutes. */
function buildSpec(target) {
  return {
    command: 'node',
    args: [path.join(target, '.kiro', 'sdd-summary', S.BUNDLE_NAME)],
    env: {
      SDDSUM_HOST: 'kiro',
      SDDSUM_STORAGE_PATH: path.join(target, '.sdd-summary'),
      // The visible spelling. A project deployed before the rename still has the
      // dotted tree, and getLifecycleDir() falls back to it when this path does
      // not exist, so naming the new one cannot orphan old runs.
      SDDSUM_LIFECYCLE_PATH: path.join(target, 'summaryconfig-lifecycle'),
    },
    timeout: 120000,
  };
}

/** Read a JSON file that is allowed to be absent, but not allowed to be corrupt. */
function readJsonIfPresent(filePath, label) {
  if (!fs.existsSync(filePath)) return null;
  return S.readJsonOrExit(filePath, label);
}

/**
 * Write the spec into KiroCrew's registry, merging so any other server the user
 * has registered there survives.
 */
function writeRegistry(target) {
  const cfg = readJsonIfPresent(REGISTRY, shownRegistry) || {};
  if (!cfg.mcpServers || typeof cfg.mcpServers !== 'object') cfg.mcpServers = {};

  const previous = cfg.mcpServers[S.SERVER_KEY];
  const previousTarget = previousTargetOf(previous);
  cfg.mcpServers[S.SERVER_KEY] = buildSpec(target);
  S.writeJson(REGISTRY, cfg);

  return { previousTarget };
}

/**
 * The project a previous registration pointed at, or null.
 *
 * Derived from the bundle arg rather than stored separately, so it stays right
 * even for an entry a user edited by hand on the dashboard's JSON editor.
 */
function previousTargetOf(spec) {
  const arg = spec && Array.isArray(spec.args) ? spec.args[0] : null;
  if (!arg || !path.isAbsolute(arg)) return null;
  // The arg is <target>/.kiro/sdd-summary/<bundle>, so the directory holding the
  // bundle is two levels below the target.
  return path.resolve(path.dirname(arg), '..', '..');
}

/**
 * Bring an ALREADY-SYNCED agent entry in line with the registry.
 *
 * Without this, correcting the registry appears to do nothing. list_servers() in
 * mcp_discovery.py reads the agent config FIRST and lets those entries win over
 * every mcp.json scope, so a stale agent-side spec silently shadows a fixed
 * registry — the dashboard keeps probing the old command and keeps failing with
 * no hint that a newer spec exists. This cost two "I refreshed and nothing
 * changed" cycles to find by hand.
 *
 * Only ever UPDATES an entry the user's own enable click created. It never adds
 * one, and never touches `tools` or `allowedTools` — creating the entry here
 * would be exactly the forged consent described in the header.
 */
function syncAgentEntry(target) {
  const cfg = readJsonIfPresent(AGENT_CONFIG, shownAgent);
  if (!cfg) return { present: false, mounted: false, updated: false };

  const servers = cfg.mcpServers;
  const entry = servers && typeof servers === 'object' ? servers[S.SERVER_KEY] : null;
  const mounted = (cfg.tools || []).some(
    (t) => t === `@${S.SERVER_KEY}` || t.startsWith(`@${S.SERVER_KEY}/`),
  );
  if (!entry || typeof entry !== 'object') {
    return { present: false, mounted, updated: false };
  }

  const spec = buildSpec(target);
  // KiroCrew resolves a bare `node` to an absolute interpreter when it syncs
  // (observed: /opt/homebrew/bin/node). That resolution is its business and may
  // differ from whatever `node` means in this shell, so keep it.
  if (typeof entry.command === 'string' && path.isAbsolute(entry.command)) {
    spec.command = entry.command;
  }
  // `disabled` is the dashboard's own off switch. Preserving it means a re-deploy
  // corrects the paths of a server the user has deliberately switched off without
  // switching it back on behind their back.
  if (entry.disabled === true) spec.disabled = true;

  const changed = JSON.stringify(entry) !== JSON.stringify(spec);
  if (changed) {
    servers[S.SERVER_KEY] = spec;
    S.writeJson(AGENT_CONFIG, cfg);
  }
  return { present: true, mounted, updated: changed };
}

/**
 * Forget any recorded probe failures for this server.
 *
 * KiroCrew quarantines an MCP server after 3 consecutive failed probes
 * (mcp_quarantine.py, threshold 3). A user who gets the path wrong twice before
 * running a corrected deploy would otherwise stay suppressed, and the reason
 * lives in a file no one thinks to look at. Clearing on re-registration means a
 * fixed spec always gets a clean first probe.
 */
function clearQuarantine() {
  const store = readJsonIfPresent(QUARANTINE, path.join('~', '.kiro', 'crew', 'mcp-quarantine.json'));
  if (!store) return { cleared: false };

  // The store is {version, servers:{name:{...}}} in current builds; tolerate a
  // flat shape too rather than assuming a schema we do not own.
  const bag = store.servers && typeof store.servers === 'object' ? store.servers : store;
  if (!Object.prototype.hasOwnProperty.call(bag, S.SERVER_KEY)) return { cleared: false };

  delete bag[S.SERVER_KEY];
  S.writeJson(QUARANTINE, store);
  return { cleared: true };
}

/**
 * Register the pipeline server with KiroCrew so a dashboard session can host it.
 * Returns a summary for the next-steps printer, or null when KiroCrew is absent.
 */
function registerWithKiroCrew(target) {
  if (!isInstalled()) {
    S.warn(`KiroCrew not found (no ${path.join('~', '.kiro', 'crew')}) — skipping --kirocrew.`);
    console.log(
      '    Start KiroCrew once so it creates its data home, then re-run with\n' +
      '    --kirocrew. Nothing else about this deploy is affected.\n',
    );
    return null;
  }

  const { previousTarget } = writeRegistry(target);
  if (previousTarget && path.resolve(previousTarget) !== path.resolve(target)) {
    S.ok(`${shownRegistry} updated — repointed from ${previousTarget}`);
    S.warn('One registration serves one project. The dashboard now drives THIS one.');
  } else {
    S.ok(`${shownRegistry} written (server registered with KiroCrew)`);
  }

  const agent = syncAgentEntry(target);
  if (agent.updated) {
    S.ok(`${shownAgent} corrected (its copy of the spec was stale)`);
  } else if (agent.present) {
    S.ok(`${shownAgent} already matches.`);
  }

  if (clearQuarantine().cleared) {
    S.ok('Cleared this server\'s recorded probe failures.');
  }

  return { mounted: agent.mounted, leftProject: true };
}

// ─── Verification ─────────────────────────────────────────────────────────────

/**
 * Start the vendored bundle the way KiroCrew will and ask it what it can do.
 *
 * Deliberately spawned from `/`, because that is the CWD KiroCrew uses and the
 * exact condition that broke the first registration. A check run from the project
 * directory would have passed while the dashboard kept failing.
 *
 * Talks raw JSON-RPC over stdio rather than pulling in an MCP client: the point
 * is to exercise the same transport the host uses, with no library between us and
 * the answer.
 */
function probeBundle(spec) {
  return new Promise((resolve) => {
    const child = spawn(spec.command, spec.args, {
      cwd: path.parse(process.cwd()).root,
      env: { ...process.env, ...spec.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let out = '';
    let errText = '';
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      resolve(result);
    };

    const timer = setTimeout(
      () => finish({ ok: false, error: 'timed out after 20s with no tools/list reply' }),
      20000,
    );

    child.on('error', (e) => finish({ ok: false, error: e.message }));
    child.stderr.on('data', (d) => {
      errText += d.toString();
    });

    child.stdout.on('data', (d) => {
      out += d.toString();
      // One JSON-RPC message per line.
      for (const line of out.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        let msg;
        try {
          msg = JSON.parse(trimmed);
        } catch {
          continue; // A partial line; the next chunk completes it.
        }
        if (msg.id === 2 && msg.result && Array.isArray(msg.result.tools)) {
          finish({ ok: true, tools: msg.result.tools.map((t) => t.name) });
        }
      }
    });

    child.on('exit', (code) => {
      finish({
        ok: false,
        error: `server exited (code ${code}) before listing tools.` +
          (errText.trim() ? `\n    ${errText.trim().split('\n').slice(0, 6).join('\n    ')}` : ''),
      });
    });

    const send = (obj) => child.stdin.write(JSON.stringify(obj) + '\n');
    send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'sdd-summary-deploy-verify', version: '1.0' },
      },
    });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
  });
}

/**
 * Check that a KiroCrew registration will actually work, and report drift.
 *
 * Three failures this catches, all of which have really happened:
 *
 *   - a bundle path that does not resolve from KiroCrew's `/` working directory;
 *   - an agent-config spec that has drifted from the registry and, because it
 *     wins, quietly overrides it;
 *   - a vendored bundle older than mcp.json, missing a tool the deploy has
 *     nonetheless pre-approved. `get_pipeline_state` shipped broken that way
 *     once, and re-running the deploy could not reveal it.
 *
 * Resolves true when everything checks out.
 */
async function verifyKiroCrew(target) {
  console.log(`
  Verifying the KiroCrew registration for:
    ${S.bold(target)}
`);

  if (!isInstalled()) {
    S.err(`KiroCrew not found (no ${path.join('~', '.kiro', 'crew')}).`);
    return false;
  }

  const registry = readJsonIfPresent(REGISTRY, shownRegistry);
  const registered = registry && registry.mcpServers && registry.mcpServers[S.SERVER_KEY];
  if (!registered) {
    S.err(`${shownRegistry} has no "${S.SERVER_KEY}" entry.`);
    console.log('    Run:  node deploy.js --kiro --kirocrew ' + target + '\n');
    return false;
  }
  S.ok(`${shownRegistry} registers ${S.SERVER_KEY}.`);

  let healthy = true;

  // ── The bundle the registry names must exist ────────────────────────────────
  const bundleArg = Array.isArray(registered.args) ? registered.args[0] : null;
  if (!bundleArg || !path.isAbsolute(bundleArg)) {
    S.err(`Bundle path is not absolute: ${bundleArg}`);
    console.log(
      '    KiroCrew probes MCP servers with / as the working directory, so a\n' +
      '    relative path resolves against the filesystem root and cannot load.\n',
    );
    healthy = false;
  } else if (!fs.existsSync(bundleArg)) {
    S.err(`Bundle missing: ${bundleArg}`);
    console.log('    Re-run the deploy for that project.\n');
    healthy = false;
  }

  // ── The registered project must be the one asked about ─────────────────────
  const registeredTarget = previousTargetOf(registered);
  if (registeredTarget && path.resolve(registeredTarget) !== path.resolve(target)) {
    S.warn(`Registered project is ${registeredTarget}, not ${target}.`);
    console.log('    One registration serves one project; re-run --kirocrew here to move it.\n');
  }

  // ── Storage must not be left to KiroCrew's / working directory ──────────────
  const env = registered.env || {};
  for (const key of ['SDDSUM_STORAGE_PATH', 'SDDSUM_LIFECYCLE_PATH']) {
    if (!env[key] || !path.isAbsolute(env[key])) {
      S.err(`${key} is not set to an absolute path.`);
      console.log(
        '    Unset, the server derives it from its working directory — which is /\n' +
        '    for a KiroCrew session, not the project.\n',
      );
      healthy = false;
    }
  }

  // ── The agent config wins, so it must not have drifted ──────────────────────
  const agentCfg = readJsonIfPresent(AGENT_CONFIG, shownAgent);
  const agentEntry =
    agentCfg && agentCfg.mcpServers ? agentCfg.mcpServers[S.SERVER_KEY] : null;
  if (!agentEntry) {
    S.warn(`Not enabled on the dashboard yet — no entry in ${shownAgent}.`);
    console.log('    Enable it: Capabilities → MCP Servers → Chat Tools.\n');
  } else {
    const sameArgs =
      JSON.stringify(agentEntry.args || []) === JSON.stringify(registered.args || []);
    const sameEnv =
      JSON.stringify(agentEntry.env || {}) === JSON.stringify(registered.env || {});
    if (sameArgs && sameEnv) {
      S.ok(`${shownAgent} matches the registry.`);
    } else {
      S.err(`${shownAgent} has drifted from the registry.`);
      console.log(
        '    Its copy WINS over the registry (mcp_discovery reads agent config\n' +
        '    first), so the dashboard is using this stale spec. Re-run --kirocrew.\n',
      );
      healthy = false;
    }

    const mounted = (agentCfg.tools || []).some(
      (t) => t === `@${S.SERVER_KEY}` || t.startsWith(`@${S.SERVER_KEY}/`),
    );
    if (mounted) {
      S.ok('Enabled on the dashboard (tools are mounted on KiroCrew\'s agent).');
    } else {
      S.warn('Registered but not enabled — the tools are not mounted yet.');
      console.log('    Enable it: Capabilities → MCP Servers → Chat Tools.\n');
    }
  }

  // ── Quarantine would suppress it regardless of the above ───────────────────
  const quarantine = readJsonIfPresent(QUARANTINE, 'mcp-quarantine.json');
  if (quarantine) {
    const bag =
      quarantine.servers && typeof quarantine.servers === 'object'
        ? quarantine.servers
        : quarantine;
    const record = bag[S.SERVER_KEY];
    if (record && record.fails) {
      S.warn(`KiroCrew has ${record.fails} recorded probe failure(s) for this server.`);
      console.log('    It is quarantined at 3. Re-run --kirocrew to clear the count.\n');
    }
  }

  // ── Finally: does it actually start, from KiroCrew's CWD? ───────────────────
  if (!healthy) {
    console.log('');
    S.err('Registration is not usable yet — fix the above and re-verify.');
    return false;
  }

  const result = await probeBundle(registered);
  if (!result.ok) {
    S.err(`Server did not start: ${result.error}`);
    return false;
  }
  S.ok(`Server starts from / and reports ${S.bold(String(result.tools.length))} tools.`);

  // Every pre-approved tool must exist, or the deploy has approved names the
  // vendored bundle does not implement — a stale vendored copy.
  const { allowTools } = S.readServerDefinition();
  const missing = allowTools.filter((t) => !result.tools.includes(t));
  if (missing.length) {
    S.err(`The vendored bundle is missing ${missing.length} pre-approved tool(s):`);
    console.log(missing.map((t) => `      ${t}`).join('\n'));
    console.log('\n    The vendored bundle is older than mcp.json. Re-run the deploy.\n');
    return false;
  }
  S.ok(`All ${allowTools.length} pre-approved tools are present in the bundle.`);

  return true;
}

module.exports = { registerWithKiroCrew, verifyKiroCrew, isInstalled };
