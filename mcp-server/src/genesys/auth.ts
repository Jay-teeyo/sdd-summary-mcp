import http from "http";
import crypto from "crypto";
import { exec } from "child_process";
import type { GenesysConfig, OAuthToken, UserToken } from "../types.js";
import { loadConfig, saveConfig } from "../config.js";
import { hostDisplayName } from "../host.js";

export function getBaseUrl(region: string): string {
  return `https://api.${region}`;
}

/**
 * Thrown when a Genesys API call returns 401 and the user token has been cleared.
 * Handlers should catch this, auto-restart the login flow if possible, and tell
 * the user to log in again then retry their request.
 */
export class TokenExpiredError extends Error {
  constructor() {
    super("Your Genesys session has expired.");
    this.name = "TokenExpiredError";
  }
}

export function getLoginUrl(region: string): string {
  return `https://login.${region}`;
}

// ─── Client credentials (machine-to-machine) ─────────────────────────────────

let cachedClientToken: OAuthToken | null = null;

async function getClientCredentialsToken(config: GenesysConfig): Promise<string> {
  const now = Date.now();
  if (cachedClientToken && cachedClientToken.expiresAt > now + 60_000) {
    return cachedClientToken.access_token;
  }

  if (!config.clientSecret) {
    throw new Error(
      "client_secret is required for client credentials auth. Use the login tool to authenticate as a user instead.",
    );
  }

  const loginUrl = config.loginUrl ?? getLoginUrl(config.region);
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const resp = await fetch(`${loginUrl}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`OAuth2 client credentials failed (${resp.status}): ${body}`);
  }

  const data = (await resp.json()) as OAuthToken;
  cachedClientToken = { ...data, expiresAt: now + data.expires_in * 1000 };
  return cachedClientToken.access_token;
}

export function clearTokenCache(): void {
  cachedClientToken = null;
}

// ─── User token (Authorization Code + PKCE) ──────────────────────────────────

/**
 * Returns the stored user token if it's still valid, refreshes it if expired,
 * or throws if no user token is stored.
 */
export async function getUserToken(config: GenesysConfig): Promise<string | null> {
  const appConfig = loadConfig();
  const stored = appConfig.userToken;
  if (!stored) return null;

  const now = Date.now();

  // Still valid
  if (stored.expiresAt > now + 60_000) {
    return stored.access_token;
  }

  // Try refresh
  if (stored.refresh_token) {
    try {
      const refreshed = await refreshUserToken(config, stored.refresh_token);
      return refreshed;
    } catch {
      // Refresh failed — fall through to null (need re-login)
      appConfig.userToken = undefined;
      saveConfig(appConfig);
      return null;
    }
  }

  return null;
}

async function refreshUserToken(config: GenesysConfig, refreshToken: string): Promise<string> {
  const loginUrl = config.loginUrl ?? getLoginUrl(config.region);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
  });

  const resp = await fetch(`${loginUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    throw new Error(`Token refresh failed (${resp.status})`);
  }

  const data = (await resp.json()) as UserToken;
  const now = Date.now();
  const newToken: UserToken = {
    ...data,
    expiresAt: now + data.expires_in * 1000,
    // Genesys may or may not return a new refresh token — keep the old one if not
    refresh_token: data.refresh_token ?? refreshToken,
  };

  const appConfig = loadConfig();
  appConfig.userToken = newToken;
  saveConfig(appConfig);

  return newToken.access_token;
}

// ─── Primary token resolver ───────────────────────────────────────────────────

/**
 * Returns an access token, preferring a stored user token over client credentials.
 */
export async function getAccessToken(config: GenesysConfig): Promise<string> {
  const userToken = await getUserToken(config);
  if (userToken) return userToken;
  return getClientCredentialsToken(config);
}

// ─── Authorization Code + PKCE flow ──────────────────────────────────────────

const REDIRECT_PORT = 8787;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

function generatePkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.error("Could not open browser automatically:", err.message);
  });
}

// ─── Two-step Authorization Code + PKCE flow ─────────────────────────────────
//
// Step 1: preparePkceLogin  — starts the local callback server, opens the browser,
//                             returns the auth URL immediately (non-blocking).
// Step 2: completePkceLogin — waits for the browser callback, exchanges the code
//                             for tokens, and stores them in config.
//
// Splitting into two steps lets the login tool return user-facing instructions
// (including the auth URL to open manually) before blocking on the browser.

interface PendingLogin {
  verifier: string;
  loginBase: string;
  clientId: string;
  authUrl: string;
  /** Set by the callback server when the auth code arrives */
  code: string | null;
  /** Set by the callback server on error */
  error: string | null;
  server: http.Server;
}

let pendingLogin: PendingLogin | null = null;

/**
 * Step 1 — Start the PKCE flow.
 * Spins up the local callback server, opens (or prints) the auth URL,
 * and returns immediately so the caller can show instructions to the user.
 */
export function preparePkceLogin(config: GenesysConfig): { authUrl: string } {
  // Clean up any stale pending login
  if (pendingLogin) {
    try { pendingLogin.server.close(); } catch { /* ignore */ }
    pendingLogin = null;
  }

  const { verifier, challenge } = generatePkce();
  const loginBase = config.loginUrl ?? getLoginUrl(config.region);

  const authUrl =
    `${loginBase}/oauth/authorize` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(config.clientId)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&code_challenge=${challenge}` +
    `&code_challenge_method=S256`;

  const state: PendingLogin = {
    verifier,
    loginBase,
    clientId: config.clientId,
    authUrl,
    code: null,
    error: null,
    server: null as unknown as http.Server,
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${REDIRECT_PORT}`);
    if (url.pathname !== "/callback") { res.writeHead(404); res.end(); return; }

    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      state.error = `OAuth2 error: ${error} — ${url.searchParams.get("error_description") ?? ""}`;
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`<html><body style="font-family:sans-serif;padding:2em"><h2 style="color:#c62828">Login failed: ${error}</h2><p>You can close this tab and return to ${hostDisplayName()}.</p></body></html>`);
      server.close();
      return;
    }

    if (!code) {
      state.error = "No authorization code received in callback";
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(`<html><body style="font-family:sans-serif;padding:2em"><h2>No code received.</h2><p>You can close this tab.</p></body></html>`);
      server.close();
      return;
    }

    state.code = code;
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      `<html><body style="font-family:sans-serif;padding:2em">` +
      `<h2 style="color:#2e7d32">&#10003; Logged in to Genesys Cloud</h2>` +
      `<p>You can close this tab and return to ${hostDisplayName()}.</p>` +
      `</body></html>`,
    );
    server.close();
  });

  state.server = server;
  pendingLogin = state;

  server.listen(REDIRECT_PORT, "127.0.0.1", () => {
    openBrowser(authUrl);
  });

  // Auto-expire after 3 minutes
  setTimeout(() => {
    if (pendingLogin === state && !state.code && !state.error) {
      state.error = "Login timed out — no browser callback received after 3 minutes";
      try { server.close(); } catch { /* ignore */ }
    }
  }, 180_000);

  return { authUrl };
}

/**
 * Step 2 — Wait for the browser callback, exchange the code for tokens.
 * Polls until the code arrives (up to 3 minutes), then exchanges and stores.
 */
export async function completePkceLogin(config: GenesysConfig): Promise<{ token: string; authUrl: string }> {
  if (!pendingLogin) {
    throw new Error("No login in progress. Call login(authorization_url=...) first.");
  }

  const state = pendingLogin;

  // Poll until the callback server receives the code or an error
  await new Promise<void>((resolve, reject) => {
    const deadline = Date.now() + 180_000;
    const check = () => {
      if (state.code || state.error) { resolve(); return; }
      if (Date.now() > deadline) { reject(new Error("Timed out waiting for browser callback")); return; }
      setTimeout(check, 500);
    };
    check();
  });

  pendingLogin = null;

  if (state.error) throw new Error(state.error);
  if (!state.code) throw new Error("No authorization code received");

  // Exchange the code for tokens
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: state.code,
    redirect_uri: REDIRECT_URI,
    code_verifier: state.verifier,
    client_id: state.clientId,
  });

  const resp = await fetch(`${state.loginBase}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as UserToken;
  const now = Date.now();
  const userToken: UserToken = {
    ...data,
    expiresAt: now + data.expires_in * 1000,
  };

  const appConfig = loadConfig();
  appConfig.userToken = userToken;
  saveConfig(appConfig);

  return { token: userToken.access_token, authUrl: state.authUrl };
}

/** @deprecated Use preparePkceLogin + completePkceLogin instead */
export async function startLoginFlow(config: GenesysConfig): Promise<{ token: string; authUrl: string }> {
  preparePkceLogin(config);
  return completePkceLogin(config);
}

/**
 * Clear the stored user token (logout).
 */
export function clearUserToken(): void {
  const appConfig = loadConfig();
  appConfig.userToken = undefined;
  saveConfig(appConfig);
}
