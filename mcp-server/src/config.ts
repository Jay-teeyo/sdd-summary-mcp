import fs from "fs";
import os from "os";
import path from "path";
import type { AppConfig, GenesysConfig } from "./types.js";

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
 * so fall back to the CWD (which is the project root for a Cursor-launched
 * server) rather than creating a directory named after the placeholder.
 */
function resolveConfiguredDir(value: string | undefined, fallbackName: string): string {
  const fallback = path.join(process.cwd(), fallbackName);
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
 * Priority: SDDSUM_STORAGE_PATH env var → CWD/.sdd-summary
 */
export function getStorageDir(): string {
  return resolveConfiguredDir(process.env.SDDSUM_STORAGE_PATH, ".sdd-summary");
}

/**
 * Resolve the .summaryconfig-lifecycle root directory.
 * Each summary configuration gets its own subdirectory here.
 * Priority: SDDSUM_LIFECYCLE_PATH env var → CWD/.summaryconfig-lifecycle
 */
export function getLifecycleDir(): string {
  return resolveConfiguredDir(process.env.SDDSUM_LIFECYCLE_PATH, ".summaryconfig-lifecycle");
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
