import fs from "fs";
import os from "os";
import path from "path";
import type { AppConfig, GenesysConfig } from "./types.js";

/**
 * Directory markers that identify a project root, in priority order.
 *
 * Used only by the fallback path below. `.kiro` and `.cursor` come first because
 * an installed deploy always creates one of them, making them the most precise
 * signal. `.git` is the backstop for a project that has been checked out but not
 * yet deployed into.
 */
const PROJECT_MARKERS = [".kiro", ".cursor", ".git"];

/**
 * Walk up from `start` looking for a project marker and return that directory.
 *
 * WHY THIS EXISTS
 * ---------------
 * Kiro does not expand ${workspaceFolder} (verified: the placeholder arrives at
 * the server verbatim), so the Kiro deploy deliberately sets NO storage env vars
 * and relies on the CWD fallback instead. Kiro launches an stdio MCP server with
 * the workspace root as its working directory, so that fallback is correct — but
 * only for as long as the user launches from the workspace root. Start the CLI
 * from a subdirectory and an unanchored fallback would silently create a second
 * `summaryconfig-lifecycle/` down there, splitting transcripts and eval runs
 * across two trees with no error.
 *
 * Anchoring on a marker makes the fallback correct from anywhere inside the
 * project. If nothing is found we return `start` unchanged, which reproduces the
 * previous behaviour exactly rather than guessing.
 */
function findProjectRoot(start: string): string {
  let dir = path.resolve(start);
  const { root } = path.parse(dir);

  while (true) {
    for (const marker of PROJECT_MARKERS) {
      if (fs.existsSync(path.join(dir, marker))) return dir;
    }
    if (dir === root) return path.resolve(start);
    const parent = path.dirname(dir);
    if (parent === dir) return path.resolve(start);
    dir = parent;
  }
}

/**
 * Turn a configured directory into an absolute path.
 *
 * Cursor can expand ${workspaceFolder} to a tilde-prefixed path such as
 * `~/Documents/project`. Node never expands `~`, and treats the value as
 * relative, so writing to it silently produces a literal `~` directory nested
 * under the CWD — taking the tokens and all lifecycle data with it. Expand the
 * tilde ourselves and resolve, so the path lands where the user expects.
 *
 * If a `${...}` placeholder survived unexpanded there is no sane path to derive,
 * so fall back to the project root rather than creating a directory named after
 * the placeholder. Kiro leaves both placeholders unexpanded by design, and the
 * Kiro deploy omits these variables entirely, so the fallback is the NORMAL path
 * there rather than an error case.
 */
function resolveConfiguredDir(value: string | undefined, fallbackName: string): string {
  const fallback = path.join(findProjectRoot(process.cwd()), fallbackName);
  if (!value) return fallback;

  if (value.includes("${")) {
    process.stderr.write(
      `[sdd-summary] Ignoring unexpanded path "${value}" — falling back to ${fallback}\n`,
    );
    return fallback;
  }

  let expanded = value;
  if (expanded === "~") {
    expanded = os.homedir();
  } else if (expanded.startsWith("~/") || expanded.startsWith("~\\")) {
    expanded = path.join(os.homedir(), expanded.slice(2));
  }

  return path.resolve(expanded);
}

/**
 * Resolve the .sdd-summary storage directory (global config + legacy data).
 * Priority: SDDSUM_STORAGE_PATH env var → <project root>/.sdd-summary
 */
export function getStorageDir(): string {
  return resolveConfiguredDir(process.env.SDDSUM_STORAGE_PATH, ".sdd-summary");
}

/** Current lifecycle directory name. Deliberately visible — see getLifecycleDir(). */
const LIFECYCLE_DIR = "summaryconfig-lifecycle";

/**
 * Resolve the summaryconfig-lifecycle root directory.
 * Each summary configuration gets its own subdirectory here.
 * Priority: SDDSUM_LIFECYCLE_PATH env var → <project root>/summaryconfig-lifecycle
 *
 * WHY THIS IS NOT A DOTFILE
 * -------------------------
 * This tree is the user's working output — transcripts, test cases, eval runs and
 * the generated HTML reports — so it is meant to be browsed. A leading dot hid it
 * from Kiro's file viewer entirely. Secrets live in `.sdd-summary/` instead, which
 * stays hidden. Both are gitignored by the deploy regardless of visibility, since
 * transcripts carry customer PII.
 *
 * An existing project keeps using the dotted directory it was deployed with: the
 * rename must not orphan a tree that already holds real runs, and silently
 * starting a second empty one beside it would look like data loss.
 */
export function getLifecycleDir(): string {
  const resolved = resolveConfiguredDir(process.env.SDDSUM_LIFECYCLE_PATH, LIFECYCLE_DIR);
  if (fs.existsSync(resolved)) return resolved;

  // Checked against the RESOLVED path rather than only the default, because the
  // Cursor deploy always sets SDDSUM_LIFECYCLE_PATH — testing the env var first
  // would skip this for exactly the installs that need it.
  const base = path.basename(resolved);
  if (!base.startsWith(".")) {
    const legacy = path.join(path.dirname(resolved), `.${base}`);
    if (fs.existsSync(legacy)) return legacy;
  }
  return resolved;
}

const CONFIG_FILE = "config.json";

export function getConfigPath(): string {
  return path.join(getStorageDir(), CONFIG_FILE);
}

export function loadConfig(): AppConfig {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(raw) as AppConfig;
    } catch {
      return {};
    }
  }
  return {};
}

export function saveConfig(config: AppConfig): void {
  const dir = getStorageDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), "utf-8");
}

/**
 * The model Genesys Cloud AI Studio uses to generate summaries.
 * Prompts are authored for, and improvement recommendations are tailored to, this model.
 */
export const SUMMARY_MODEL_NAME = "Claude Haiku 4.5";

/**
 * Returns Genesys credentials, preferring environment variables over stored config.
 * clientSecret is optional — not required for user login (PKCE) flow.
 */
export function getGenesysConfig(): GenesysConfig | null {
  const envClientId = process.env.GENESYS_CLIENT_ID;
  const envRegion = process.env.GENESYS_REGION;

  if (envClientId && envRegion) {
    return {
      clientId: envClientId,
      clientSecret: process.env.GENESYS_CLIENT_SECRET,
      region: envRegion,
    };
  }

  const config = loadConfig();
  return config.genesys ?? null;
}

export function saveGenesysConfig(genesys: GenesysConfig): void {
  const config = loadConfig();
  config.genesys = genesys;
  saveConfig(config);
}
