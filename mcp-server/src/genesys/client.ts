import { getGenesysConfig, loadConfig, saveConfig } from "../config.js";
import { getAccessToken, getBaseUrl, TokenExpiredError } from "./auth.js";

export class GenesysApiError extends Error {
  constructor(
    public status: number,
    public path: string,
    message: string,
  ) {
    super(`Genesys API error ${status} on ${path}: ${message}`);
    this.name = "GenesysApiError";
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Parse the Retry-After header (seconds integer) and add up to 30% random jitter
 * to prevent thundering-herd retries across concurrent bulk workers.
 * Returns milliseconds to wait.
 */
function retryDelayMs(headers: Headers, fallbackSecs = 30): number {
  const raw = headers.get("retry-after");
  const secs = raw ? parseInt(raw, 10) : fallbackSecs;
  const base = isNaN(secs) ? fallbackSecs : secs;
  const jitter = Math.random() * base * 0.3;
  // Cap at 65s to avoid indefinitely suspending bulk operations
  return Math.min((base + jitter) * 1000, 65_000);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const config = getGenesysConfig();
  if (!config) {
    throw new Error(
      "Genesys credentials not configured. Call configure_credentials first, or set GENESYS_CLIENT_ID, GENESYS_CLIENT_SECRET, GENESYS_REGION environment variables.",
    );
  }

  const MAX_RETRIES_429 = 4;
  const MAX_RETRIES_5XX = 2;

  for (let attempt = 0; ; attempt++) {
    const token = await getAccessToken(config);
    const url = `${getBaseUrl(config.region)}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const resp = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    // ── Rate limited ────────────────────────────────────────────────────────
    if (resp.status === 429) {
      if (attempt >= MAX_RETRIES_429) {
        throw new GenesysApiError(429, path, `Rate limited after ${MAX_RETRIES_429} retries.`);
      }
      const waitMs = retryDelayMs(resp.headers);
      console.error(
        `[rate-limit] 429 on ${method} ${path} — waiting ${(waitMs / 1000).toFixed(1)}s ` +
        `(retry ${attempt + 1}/${MAX_RETRIES_429})`,
      );
      await sleep(waitMs);
      continue;
    }

    // ── Server error with Retry-After ────────────────────────────────────────
    if (resp.status >= 500 && resp.headers.has("retry-after")) {
      if (attempt >= MAX_RETRIES_5XX) {
        throw new GenesysApiError(resp.status, path, `Server error after ${MAX_RETRIES_5XX} retries.`);
      }
      const waitMs = retryDelayMs(resp.headers);
      console.error(
        `[rate-limit] ${resp.status} on ${method} ${path} — waiting ${(waitMs / 1000).toFixed(1)}s ` +
        `(retry ${attempt + 1}/${MAX_RETRIES_5XX})`,
      );
      await sleep(waitMs);
      continue;
    }

    // ── Token expired ────────────────────────────────────────────────────────
    if (resp.status === 401) {
      const appConfig = loadConfig();
      if (appConfig.userToken) {
        appConfig.userToken = undefined;
        saveConfig(appConfig);
      }
      throw new TokenExpiredError();
    }

    // ── Other errors ─────────────────────────────────────────────────────────
    if (!resp.ok) {
      const text = await resp.text();
      let message = text;
      try {
        const json = JSON.parse(text) as {
          message?: string;
          code?: string;
          correlationId?: string;
        };
        message = json.message ?? text;
        // Keep the correlation id and code. Genesys support needs the
        // correlation id to trace a request, and dropping it is what left an
        // earlier 500 on /api/v2/assistants undiagnosable.
        const detail = [json.code, json.correlationId && `correlationId ${json.correlationId}`]
          .filter(Boolean)
          .join(", ");
        if (detail) message = `${message} (${detail})`;
      } catch { /* use raw text */ }
      throw new GenesysApiError(resp.status, path, message);
    }

    if (resp.status === 204) return undefined as unknown as T;
    return resp.json() as Promise<T>;
  }
}

export const genesys = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

/**
 * A rate-limit-aware wrapper around fetch() for direct API calls that bypass the
 * genesys client (e.g. preview API WebSocket flow in summaries.ts).
 *
 * Applies the same retry policy as request():
 *   - 429: honour Retry-After + jitter, retry up to 4 times
 *   - 5xx with Retry-After: honour header + jitter, retry up to 2 times
 *   - Other responses: returned as-is (caller handles errors)
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const MAX_RETRIES_429 = 4;
  const MAX_RETRIES_5XX = 2;
  const method = (init.method ?? "GET").toUpperCase();

  for (let attempt = 0; ; attempt++) {
    const resp = await fetch(url, init);

    if (resp.status === 429) {
      if (attempt >= MAX_RETRIES_429) return resp;
      const waitMs = retryDelayMs(resp.headers);
      console.error(
        `[rate-limit] 429 on ${method} ${url} — waiting ${(waitMs / 1000).toFixed(1)}s ` +
        `(retry ${attempt + 1}/${MAX_RETRIES_429})`,
      );
      await sleep(waitMs);
      continue;
    }

    if (resp.status >= 500 && resp.headers.has("retry-after")) {
      if (attempt >= MAX_RETRIES_5XX) return resp;
      const waitMs = retryDelayMs(resp.headers);
      console.error(
        `[rate-limit] ${resp.status} on ${method} ${url} — waiting ${(waitMs / 1000).toFixed(1)}s ` +
        `(retry ${attempt + 1}/${MAX_RETRIES_5XX})`,
      );
      await sleep(waitMs);
      continue;
    }

    return resp;
  }
}
