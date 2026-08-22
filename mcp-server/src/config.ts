import fs from "fs";
import path from "path";
import type { AppConfig, GenesysConfig } from "./types.js";

/**
 * Resolve the .sdd-summary storage directory (global config + legacy data).
 * Priority: SDDSUM_STORAGE_PATH env var → CWD/.sdd-summary
 */
export function getStorageDir(): string {
  return process.env.SDDSUM_STORAGE_PATH ?? path.join(process.cwd(), ".sdd-summary");
}

/**
 * Resolve the .summaryconfig-lifecycle root directory.
 * Each summary configuration gets its own subdirectory here.
 * Priority: SDDSUM_LIFECYCLE_PATH env var → CWD/.summaryconfig-lifecycle
 */
export function getLifecycleDir(): string {
  return process.env.SDDSUM_LIFECYCLE_PATH ?? path.join(process.cwd(), ".summaryconfig-lifecycle");
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
