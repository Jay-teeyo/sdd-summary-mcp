import { v4 as uuidv4 } from "uuid";
import { saveGenesysConfig, getGenesysConfig, loadConfig, SUMMARY_MODEL_NAME } from "../config.js";
import { FULL_PIPELINE_GUIDE } from "../pipelineGuide.js";
import type { GenesysConfig } from "../types.js";
import { clearTokenCache, clearUserToken, startLoginFlow, preparePkceLogin, completePkceLogin, getUserToken, TokenExpiredError } from "../genesys/auth.js";
import * as storage from "../storage.js";
import { searchConversations } from "../genesys/analytics.js";
import {
  fetchAndTransformTranscript,
  fetchMessagingTranscript,
  normaliseManualTranscript,
  resolveCustomerCommunicationId,
} from "../genesys/transcripts.js";
import {
  listSummarySettings,
  getSummarySetting,
  createSummarySetting,
  updateSummarySetting,
  generatePreviewSummary,
  extractSummaryText,
  getExistingSummaries,
} from "../genesys/summaries.js";
import { listAssistants, getCopilotConfig, updateCopilotConfig, getAssistantQueues, ASSISTANT_TIER } from "../genesys/copilot.js";
import { generateDashboard } from "../dashboard.js";
import { generateEvalRunDashboardHtml, generateImprovementsDashboardHtml } from "../dashboardHtml.js";
import type {
  SummarySetting,
  StoredTranscript,
  Rubric,
  TestRun,
  TranscriptResult,
  TestCase,
  TestSet,
  EvalRunMeta,
  EvalRunResult,
} from "../types.js";

type Args = Record<string, unknown>;

function str(args: Args, key: string): string {
  const v = args[key];
  if (typeof v !== "string") throw new Error(`Missing required string argument: ${key}`);
  return v;
}

function optStr(args: Args, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" ? v : undefined;
}

function strArr(args: Args, key: string): string[] {
  const v = args[key];
  if (!Array.isArray(v)) throw new Error(`Missing required array argument: ${key}`);
  return v.map((x) => String(x));
}

function ok(content: string) {
  return { content: [{ type: "text" as const, text: content }] };
}

function json(data: unknown) {
  return ok(JSON.stringify(data, null, 2));
}

/**
 * Wraps a handler body. If the call throws TokenExpiredError the wrapper:
 *   1. Checks for a stored lastAuthorizationUrl and auto-starts the browser login.
 *   2. Returns a clear message asking the user to log in and retry.
 */
async function withTokenRefresh<T>(
  fn: () => Promise<T>,
): Promise<T | ReturnType<typeof ok>> {
  try {
    return await fn();
  } catch (err) {
    if (!(err instanceof TokenExpiredError)) throw err;

    const storedConfig = loadConfig().genesys;
    const authUrl = storedConfig?.lastAuthorizationUrl;

    if (authUrl && storedConfig) {
      // Auto-restart the login flow using the stored Authorization URL
      try {
        const { authUrl: loginUrl } = preparePkceLogin(storedConfig);
        return ok(
          `─── Session Expired ───\n\n` +
          `Your Genesys session has expired. Your browser has been opened to log in again.\n` +
          `If it didn't open, use this URL:\n\n` +
          `  ${loginUrl}\n\n` +
          `Once you see the "Logged in to Genesys Cloud ✓" page, tell me and I'll complete the login.\n` +
          `Then retry your original request.`,
        ) as T;
      } catch {
        // Browser open failed — still tell user what to do
      }
    }

    return ok(
      `─── Session Expired ───\n\n` +
      `Your Genesys session has expired. Paste your Authorization URL to log in again:\n\n` +
      `  login(authorization_url="<your Authorization URL from Genesys Admin>")\n\n` +
      `Then retry your original request.`,
    ) as T;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Guided onboarding / org-switching flow.
 * - No args        → asks the user for their Authorization URL
 * - authorization_url provided → parses it, updates config, starts browser login,
 *                                returns step-by-step instructions
 */
export async function connect(args: Args) {
  const rawAuthUrl = optStr(args, "authorization_url");

  if (!rawAuthUrl) {
    return ok(
      `─── Connect to Genesys Cloud ───\n\n` +
      `To get started, I need your OAuth client's Authorization URL.\n\n` +
      `Where to find it:\n` +
      `  1. Open Genesys Admin → Integrations → OAuth\n` +
      `  2. Open the OAuth client you want to use\n` +
      `  3. Copy the URL from the browser address bar — it looks like:\n` +
      `       https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/abc123-...\n\n` +
      `Then call:\n` +
      `  connect(authorization_url="<paste the URL here>")`,
    );
  }

  // Parse the URL — same logic as login()
  let parsed: URL;
  try {
    parsed = new URL(rawAuthUrl);
  } catch {
    return ok(
      `Could not parse that URL: "${rawAuthUrl}"\n\n` +
      `Expected format (paste from your browser address bar on the OAuth client page):\n` +
      `  https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/abc123-...`,
    );
  }

  let extractedClientId: string | null = null;
  let extractedRegion: string;

  if (parsed.host.startsWith("login.")) {
    // Format: https://login.{region}/oauth/authorize?client_id=...
    extractedClientId = parsed.searchParams.get("client_id");
    extractedRegion = parsed.host.replace(/^login\./, "");
  } else if (parsed.host.startsWith("apps.")) {
    // Two sub-formats from Genesys Admin:
    //   Authorization URL field: .../authorized-apps/{client_id}
    //   Browser address bar:     .../oauth-clients/{client_id}/view
    const hash = parsed.hash; // everything after #
    const authorizedAppsMatch = hash.match(/\/authorized-apps\/([a-f0-9-]{36})/i);
    const oauthClientsMatch = hash.match(/\/oauth-clients\/([a-f0-9-]{36})/i);
    extractedClientId = (authorizedAppsMatch ?? oauthClientsMatch)?.[1] ?? null;
    extractedRegion = parsed.host.replace(/^apps\./, "");
  } else {
    return ok(
      `Unrecognised URL format.\n\n` +
      `Paste the Authorization URL from the field at the bottom of the OAuth client page in Genesys Admin.\n` +
      `It looks like: https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/{client_id}`,
    );
  }

  if (!extractedClientId || extractedClientId.length < 10) {
    return ok(
      `Could not extract a client ID from: "${rawAuthUrl}"\n\n` +
      `Copy the Authorization URL from the field labelled "Authorization URL" at the bottom of your\n` +
      `OAuth client page in Genesys Admin → IT and Integrations → OAuth → your client.`,
    );
  }

  const loginBase = `https://login.${extractedRegion}`;

  // Build config directly from extracted values — do NOT call getGenesysConfig() because
  // env vars (GENESYS_CLIENT_ID etc.) would shadow the freshly extracted values.
  const existingFileBased = loadConfig().genesys ?? {};
  const config: GenesysConfig = {
    ...existingFileBased,
    clientId: extractedClientId,
    region: extractedRegion,
    loginUrl: loginBase,
    lastAuthorizationUrl: rawAuthUrl,
  };
  saveGenesysConfig(config);

  // Start the browser flow
  let authUrl: string;
  try {
    ({ authUrl } = preparePkceLogin(config));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return ok(
      `Credentials saved, but failed to start login flow: ${msg}\n\n` +
      `  • Port 8787 in use? Kill it: lsof -ti:8787 | xargs kill -9, then call connect() again`,
    );
  }

  return ok(
    `─── Genesys Cloud — Connect ───\n\n` +
    `Extracted from URL:\n` +
    `  Client ID: ${extractedClientId.slice(0, 8)}...\n` +
    `  Region:    ${extractedRegion}\n` +
    `  Login URL: ${loginBase}\n\n` +
    `─── Step 1: Log in via browser ───\n\n` +
    `Your browser should open automatically.\n` +
    `If it doesn't, open this URL manually:\n\n` +
    `  ${authUrl}\n\n` +
    `─── Step 2: Confirm ───\n\n` +
    `Once you see the green "✓ Logged in to Genesys Cloud" page in your browser,\n` +
    `come back here and call:\n\n` +
    `  complete_login()\n`,
  );
}

export async function configure_credentials(args: Args) {
  const clientId = str(args, "client_id");
  const clientSecret = optStr(args, "client_secret");
  const region = str(args, "region");
  const loginUrl = optStr(args, "login_url");
  clearTokenCache();
  clearUserToken();
  saveGenesysConfig({ clientId, clientSecret, region, loginUrl });
  const loginBase = loginUrl ?? `https://login.${region}`;
  const authHint = clientSecret
    ? "Client credentials auth ready. You can also call login to authenticate as a user."
    : "No client_secret provided — call login to authenticate as a user via browser.";
  return ok(
    `Credentials saved.\n` +
    `  Region:    ${region}\n` +
    `  Client ID: ${clientId.slice(0, 8)}...\n` +
    `  Login URL: ${loginBase}\n` +
    `\n${authHint}\n` +
    `\nCall login to start the OAuth2 browser flow, then smoke_test_auth to verify scopes.`,
  );
}

export async function login(args: Args) {
  const rawAuthUrl = optStr(args, "authorization_url");

  // Prefer file-based config over env-var config to avoid stale/wrong-org env vars shadowing the
  // saved client. If no authorization_url is provided and the file has a lastAuthorizationUrl,
  // we re-use it so the user never has to paste it again after the first login.
  const fileBasedGenesys = loadConfig().genesys;
  const effectiveAuthUrl = rawAuthUrl ?? fileBasedGenesys?.lastAuthorizationUrl ?? null;
  let config = effectiveAuthUrl ? null : getGenesysConfig();

  // If an authorization_url was provided (or recovered from file), parse the client_id, region,
  // and login base from it.
  // Supports two URL formats that Genesys Admin may show:
  //
  //   Format A — OAuth authorize endpoint (login. domain, client_id in query string):
  //     https://login.{your-region}/oauth/authorize?client_id=abc123-...
  //
  //   Format B — Admin app deep-link (apps. domain, client_id as last path segment):
  //     https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/abc123-...
  if (effectiveAuthUrl) {
    let parsed: URL;
    try {
      // The hash fragment (#/...) is not sent to the server but URL can still be parsed
      parsed = new URL(effectiveAuthUrl);
    } catch {
      return ok(`Invalid authorization_url — could not parse as a URL: "${effectiveAuthUrl}"`);
    }

    let extractedClientId: string | null = null;
    let extractedRegion: string;

    if (parsed.host.startsWith("login.")) {
      extractedClientId = parsed.searchParams.get("client_id");
      extractedRegion = parsed.host.replace(/^login\./, "");
    } else if (parsed.host.startsWith("apps.")) {
      const hash = parsed.hash;
      const authorizedAppsMatch = hash.match(/\/authorized-apps\/([a-f0-9-]{36})/i);
      const oauthClientsMatch = hash.match(/\/oauth-clients\/([a-f0-9-]{36})/i);
      extractedClientId = (authorizedAppsMatch ?? oauthClientsMatch)?.[1] ?? null;
      extractedRegion = parsed.host.replace(/^apps\./, "");
    } else {
      return ok(
        `Unrecognised URL format.\n\n` +
        `Paste the Authorization URL from the field labelled "Authorization URL" at the bottom of your\n` +
        `OAuth client page in Genesys Admin → IT and Integrations → OAuth → your client.`,
      );
    }

    if (!extractedClientId || extractedClientId.length < 10) {
      return ok(
        `Could not extract a client ID from: "${rawAuthUrl}"\n\n` +
        `Copy the Authorization URL from the field labelled "Authorization URL" at the bottom of\n` +
        `your OAuth client page in Genesys Admin → IT and Integrations → OAuth → your client.`,
      );
    }

    const loginBase = `https://login.${extractedRegion}`;

    // Build the new config from extracted values, merging with any existing file-based config
    // but always overriding clientId, region, and loginUrl from the Authorization URL.
    // We do NOT call getGenesysConfig() here because env vars (GENESYS_CLIENT_ID etc.) would
    // shadow the freshly extracted values — use the constructed object directly instead.
    const existingFileBased = loadConfig().genesys ?? {};
    const newConfig: GenesysConfig = {
      ...existingFileBased,
      clientId: extractedClientId,
      region: extractedRegion,
      loginUrl: loginBase,
      lastAuthorizationUrl: effectiveAuthUrl,
    };
    saveGenesysConfig(newConfig);
    config = newConfig;
  }

  if (!config) {
    return ok(
      "No Genesys credentials configured.\n\n" +
      "Call login with the Authorization URL from your OAuth client — everything needed is in that URL:\n\n" +
      "  login(authorization_url=\"https://login.{your-region}/oauth/authorize?client_id=abc123...\")\n\n" +
      "Find it at: Genesys Admin → Integrations → OAuth → your client → Authorization URL",
    );
  }

  const loginBase = config.loginUrl ?? `https://login.${config.region}`;

  try {
    const { authUrl } = preparePkceLogin(config);
    return ok(
      `─── Genesys Cloud Login ───\n\n` +
      `Starting login for:\n` +
      `  Client ID:  ${config.clientId.slice(0, 8)}...\n` +
      `  Region:     ${config.region}\n` +
      `  Login base: ${loginBase}\n\n` +
      `Your browser should open automatically. If it doesn't, open this URL manually:\n\n` +
      `  ${authUrl}\n\n` +
      `─── Steps ───\n` +
      `1. Log in with your Genesys Cloud credentials in the browser\n` +
      `2. You will see a "Logged in to Genesys Cloud ✓" confirmation page\n` +
      `3. Return here and call: complete_login()\n`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return ok(
      `Failed to start login: ${message}\n\n` +
      `  Client ID: ${config.clientId.slice(0, 8)}...\n` +
      `  Login base: ${loginBase}\n\n` +
      `  • Port 8787 in use → kill it: lsof -ti:8787 | xargs kill -9, then retry`,
    );
  }
}

export async function complete_login(_args: Args) {
  // Prefer the file-based config over env vars so the displayed Client ID reflects
  // what was parsed from the Authorization URL, not an old env var value.
  const fileConfig = loadConfig().genesys;
  const config = fileConfig ?? getGenesysConfig();
  if (!config) {
    return ok("No credentials configured. Call connect(authorization_url=...) first.");
  }

  try {
    const { token } = await completePkceLogin(config);

    // Auto-run scope smoke test now that we have a user token
    const smokeResult = await smoke_test_auth(_args);
    const smokeText = smokeResult.content[0]?.text ?? "";

    return ok(
      `─── Login complete ───\n\n` +
      `Logged in successfully. User token stored (expires in ~30 min).\n` +
      `  Client ID: ${config.clientId.slice(0, 8)}...\n` +
      `  Region:    ${config.region}\n` +
      `  Token:     ${token.slice(0, 12)}...\n\n` +
      `─── Scope verification ───\n\n` +
      smokeText,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return ok(
      `Login failed: ${message}\n\n` +
      `─── Common causes ───\n` +
      `  • "OAuth client ID or redirect URI is invalid"\n` +
      `    → confirm http://localhost:8787/callback is listed under Redirect URIs on your OAuth client\n` +
      `    → confirm the client_id in the URL matches the OAuth client\n` +
      `  • No login in progress → call connect(authorization_url=...) to start again\n` +
      `  • Timed out (3 min limit) → call connect(authorization_url=...) to restart`,
    );
  }
}

export async function logout(_args: Args) {
  clearUserToken();
  return ok("User token cleared. The server will use client credentials on the next request.");
}

// ─── Auth smoke test ──────────────────────────────────────────────────────────

interface ScopeCheckResult {
  scope: string;
  description: string;
  status: "ok" | "missing_scope" | "no_user_token" | "error";
  detail: string;
  requiresUserToken: boolean;
}

async function runScopeCheck(
  name: string,
  scope: string,
  requiresUserToken: boolean,
  hasUserToken: boolean,
  testFn: () => Promise<void>,
): Promise<ScopeCheckResult> {
  const base: Omit<ScopeCheckResult, "status" | "detail"> = {
    scope,
    description: name,
    requiresUserToken,
  };

  if (requiresUserToken && !hasUserToken) {
    return {
      ...base,
      status: "no_user_token",
      detail: "Requires user login — run the login tool and retry.",
    };
  }

  try {
    await testFn();
    return { ...base, status: "ok", detail: "API call succeeded." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Distinguish scope/auth failures from other errors
    const isScopeFail =
      msg.includes("403") ||
      msg.toLowerCase().includes("forbidden") ||
      msg.toLowerCase().includes("insufficient") ||
      msg.toLowerCase().includes("scope");
    const isAuthFail =
      msg.includes("401") || msg.toLowerCase().includes("unauthorized");

    if (isScopeFail) {
      return {
        ...base,
        status: "missing_scope",
        detail: `Scope '${scope}' appears to be missing from the OAuth client. Add it in Genesys Admin → Integrations → OAuth. Error: ${msg}`,
      };
    }
    if (isAuthFail) {
      return {
        ...base,
        status: "missing_scope",
        detail: `Authentication failed — token may be expired. Run login and retry. Error: ${msg}`,
      };
    }
    // Any other error (404 for missing resource, 400 for bad query) still means scope is present
    return { ...base, status: "ok", detail: `API responded (non-auth error, scope present): ${msg}` };
  }
}

export async function smoke_test_auth(_args: Args) {
  const config = getGenesysConfig();
  if (!config) {
    return ok(
      "No Genesys credentials configured.\n" +
      "Run configure_credentials first, then login, then retry smoke_test_auth.",
    );
  }

  const userToken = await getUserToken(config);
  const hasUserToken = !!userToken;
  const authMode = hasUserToken ? "user token (Authorization Code + PKCE)" : "client credentials only";

  // Import genesys client inline — used for scope tests
  const { genesys } = await import("../genesys/client.js");

  const checks: ScopeCheckResult[] = await Promise.all([
    // 1. users scope — resolve current user (user token only)
    runScopeCheck(
      "Identity: resolve current user",
      "users",
      true,
      hasUserToken,
      async () => {
        const base = `https://api.${config.region}`;
        const resp = await fetch(`${base}/api/v2/users/me`, {
          headers: {
            Authorization: `Bearer ${userToken}`,
            Accept: "application/json",
          },
        });
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      },
    ),

    // 2. ai-studio scope — list summary settings (Conversations Summaries API requires ai-studio)
    runScopeCheck(
      "AI Studio: list summary settings",
      "ai-studio",
      false,
      hasUserToken,
      async () => {
        await genesys.get("/api/v2/conversations/summaries/settings");
      },
    ),

    // 3. analytics scope — run a minimal conversation query
    runScopeCheck(
      "Analytics: query conversations",
      "analytics",
      false,
      hasUserToken,
      async () => {
        await genesys.post("/api/v2/analytics/conversations/details/query", {
          interval: "2020-01-01T00:00:00Z/2020-01-01T00:01:00Z",
          paging: { pageSize: 1, pageNumber: 1 },
        });
      },
    ),

    // 4. speechandtextanalytics scope — list STA programs
    runScopeCheck(
      "Speech & Text Analytics: read STA programs",
      "speechandtextanalytics",
      false,
      hasUserToken,
      async () => {
        await genesys.get("/api/v2/speechandtextanalytics/programs?pageSize=1");
      },
    ),

    // 5. assistants scope — list assistants
    runScopeCheck(
      "Assistants: list Agent Copilot assistants",
      "assistants",
      false,
      hasUserToken,
      async () => {
        // pageSize=1 means this probe cannot hit the >97-entity 500 described
        // in copilot.ts, which is why it passed while listAssistants() failed.
        // Keep it that way — this checks the scope, not the pagination fault —
        // but send the same tier filter so the two calls stay comparable.
        await genesys.get(`/api/v2/assistants?pageSize=1&tier=${ASSISTANT_TIER}`);
      },
    ),

    // 6. notifications scope — create a notification channel (user token only; required for preview summaries)
    runScopeCheck(
      "Notifications: create a notification channel",
      "notifications",
      true,
      hasUserToken,
      async () => {
        const base = `https://api.${config.region}`;
        const resp = await fetch(`${base}/api/v2/notifications/channels`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${userToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: "{}",
        });
        if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      },
    ),

    // 7. routing scope — list queues (required for build_interaction_filter)
    runScopeCheck(
      "Routing: list queues",
      "routing",
      false,
      hasUserToken,
      async () => {
        await genesys.get("/api/v2/routing/queues?pageSize=1");
      },
    ),

    // 8. conversations scope — read a messaging conversation.
    //    Required by the messaging transcript fallback in fetch_transcripts_bulk
    //    (GET /conversations/messages/{id} + POST .../messages/bulk), which runs
    //    whenever STA transcript retrieval fails on a messaging interaction.
    //    NOTE: this scope is NOT what authorises the summary settings endpoints —
    //    those authorise under ai-studio despite living beneath /conversations/.
    //    A well-formed but non-existent conversation ID gives us clean
    //    discrimination: 403 when the scope is absent, 404 when it is present
    //    (runScopeCheck treats non-auth errors as proof the scope exists).
    runScopeCheck(
      "Conversations: read messaging conversation",
      "conversations",
      false,
      hasUserToken,
      async () => {
        await genesys.get(
          "/api/v2/conversations/messages/00000000-0000-0000-0000-000000000000",
        );
      },
    ),
  ]);

  const passed = checks.filter((c) => c.status === "ok").length;
  const missingScope = checks.filter((c) => c.status === "missing_scope");
  const needsLogin = checks.filter((c) => c.status === "no_user_token");
  const total = checks.length;

  const statusIcon = (s: ScopeCheckResult["status"]) => {
    switch (s) {
      case "ok": return "✓";
      case "missing_scope": return "✗";
      case "no_user_token": return "⚠";
      case "error": return "?";
    }
  };

  const lines = [
    `Auth mode: ${authMode}`,
    `Result: ${passed}/${total} checks passed`,
    "",
    ...checks.map((c) =>
      `${statusIcon(c.status)} [${c.scope}] ${c.description}\n  → ${c.detail}`,
    ),
  ];

  if (missingScope.length > 0) {
    lines.push(
      "",
      "─── Action required ───",
      "The following scopes are missing from your OAuth client.",
      "Fix: Genesys Admin → Integrations → OAuth → your client → Scope tab → add each missing scope.",
      "",
      ...missingScope.map((c) => `  • ${c.scope}`),
    );
  }

  if (needsLogin.length > 0) {
    lines.push(
      "",
      "─── User login required ───",
      "Some checks require a user token and were skipped. Run the login tool, then retry smoke_test_auth.",
    );
  }

  if (missingScope.length === 0 && needsLogin.length === 0) {
    lines.push("", "All checks passed — credentials and scopes are correctly configured.");
  }

  return ok(lines.join("\n"));
}

// ─── Conversations ────────────────────────────────────────────────────────────

export async function search_conversations(args: Args) {
  return withTokenRefresh(async () => {
    const results = await searchConversations({
      dateFrom: str(args, "date_from"),
      dateTo: str(args, "date_to"),
      queueIds: Array.isArray(args.queue_ids) ? args.queue_ids.map(String) : undefined,
      wrapUpCodes: Array.isArray(args.wrap_up_codes) ? args.wrap_up_codes.map(String) : undefined,
      maxResults: typeof args.max_results === "number" ? args.max_results : 25,
    });
    return json({
      total: results.length,
      conversations: results,
      tip: "Use fetch_transcript with summary_config_name, conversation_id, and transcript_type to cache a transcript for testing.",
    });
  });
}

// ─── Transcripts (lifecycle-scoped) ──────────────────────────────────────────

export async function fetch_transcript(args: Args) {
  return withTokenRefresh(async () => {
    const configName = str(args, "summary_config_name");
    const conversationId = str(args, "conversation_id");
    const transcriptType = (optStr(args, "transcript_type") ?? "static") as "static" | "dynamic";

    const communicationId =
      optStr(args, "communication_id") ??
      (await resolveCustomerCommunicationId(conversationId));

    const label = optStr(args, "label") ?? `${conversationId.slice(0, 8)}/${communicationId.slice(0, 8)}`;

    const { plainText, rawJson } = await fetchAndTransformTranscript(conversationId, communicationId);

    const transcript: StoredTranscript = {
      id: uuidv4(),
      label,
      conversationId,
      communicationId,
      plainText,
      rawJson,
      createdAt: new Date().toISOString(),
      transcriptType,
    };
    storage.saveLifecycleTranscript(configName, transcript);

    return json({
      id: transcript.id,
      label,
      transcriptType,
      summaryConfigName: configName,
      conversationId,
      communicationId,
      lineCount: plainText.split("\n").length,
      preview: plainText.slice(0, 300) + (plainText.length > 300 ? "..." : ""),
    });
  });
}

// ─── Summary extraction helpers ──────────────────────────────────────────────

interface SummaryEntity {
  summaryType?: string;
  summary?: string;
  generated?: boolean;
  [key: string]: unknown;
}

interface ExistingSummaryResult {
  /** The best/final summary — agent-edited if one exists, otherwise AI-generated Agent type */
  existingSummary: string;
  /**
   * The original AI-generated summary, populated only when an agent-edited version also exists.
   * Together with existingSummary, these form the before/after pair.
   */
  aiGeneratedSummary?: string;
}

/**
 * Fetch existing production summaries for a conversation.
 *
 * Returns the best summary plus the before/after pair when an agent edited it:
 * - "Agent" summaryType, generated=false → agent-edited (the "after")
 * - "Agent" summaryType, generated=true  → AI-generated (the "before")
 * - If only AI-generated exists: returns it as existingSummary with no aiGeneratedSummary
 * - Fallback to "Conversation" type if no "Agent" entries exist
 */
async function fetchBestExistingSummary(conversationId: string): Promise<ExistingSummaryResult | undefined> {
  try {
    const resp = await getExistingSummaries(conversationId) as { entities?: SummaryEntity[] };
    const entities = resp?.entities ?? [];
    if (entities.length === 0) return undefined;

    const agentEntities = entities.filter((e) => e.summaryType === "Agent" && e.summary);

    if (agentEntities.length > 0) {
      const edited = agentEntities.find((e) => e.generated === false);
      const aiGenerated = agentEntities.find((e) => e.generated === true);

      if (edited?.summary && aiGenerated?.summary) {
        // Agent edited the AI-generated summary — we have both before and after
        return {
          existingSummary: edited.summary,
          aiGeneratedSummary: aiGenerated.summary,
        };
      }

      // Only one Agent entry (AI-generated or edited without a pair)
      const best = edited ?? aiGenerated;
      if (best?.summary) return { existingSummary: best.summary };
    }

    // Fallback to Conversation type, then first available
    const preferred = ["Conversation"];
    for (const type of preferred) {
      const match = entities.find((e) => e.summaryType === type && e.summary);
      if (match?.summary) return { existingSummary: match.summary };
    }
    const first = entities[0]?.summary;
    return first ? { existingSummary: first } : undefined;
  } catch {
    return undefined;
  }
}

export async function fetch_transcripts_bulk(args: Args) {
  return withTokenRefresh(async () => {
    const configName = str(args, "summary_config_name");
    const dateFrom = str(args, "date_from");
    const dateTo = str(args, "date_to");
    const maxConversations = Math.min(typeof args.max_conversations === "number" ? args.max_conversations : 50, 200);
    const concurrency = Math.min(typeof args.concurrency === "number" ? args.concurrency : 5, 10);

    // Load interaction filter to get queue IDs
    const filter = storage.loadInteractionFilter(configName);
    if (!filter) {
      return ok(
        `No interaction-filter.json found for "${configName}".\n\n` +
        `Run build_interaction_filter first to set up the working directory.`,
      );
    }

    // Search for conversations scoped to the copilot's queues.
    // Only voice, message, and callback are relevant for summary testing.
    const conversations = await searchConversations({
      dateFrom,
      dateTo,
      queueIds: filter.queueIds,
      maxResults: maxConversations,
      includeMediaTypes: ["voice", "message", "callback"],
    });

    if (conversations.length === 0) {
      return ok(
        `No conversations found for "${configName}" between ${dateFrom} and ${dateTo}.\n\n` +
        `The queues may have had no activity in this period.`,
      );
    }

    // Process in parallel batches using a concurrency pool
    const results = {
      saved: 0,
      skipped: 0,
      noTranscript: 0,
      errors: 0,
      errorDetails: [] as string[],
    };

    // Pool: process `concurrency` conversations at a time
    const queue = [...conversations];
    const inFlight: Promise<void>[] = [];

    async function processOne(conv: {
      conversationId: string;
      startTime?: string;
      communications?: Array<{ type?: string }>;
    }) {
      try {
        // Check if already saved (skip duplicates)
        const existing = storage.getLifecycleTranscript(configName, conv.conversationId);
        if (existing) {
          results.skipped++;
          return;
        }

        // Client-side guard: only process conversations with at least one allowed media type
        const ALLOWED_TYPES = new Set(["voice", "message", "callback"]);
        const types = (conv.communications ?? []).map((c) => c.type ?? "");
        const hasAllowed = types.some((t) => ALLOWED_TYPES.has(t));
        if (!hasAllowed) {
          results.skipped++;
          return;
        }

        // Transcript fetch strategy:
        //   1. Always try STA/S3 first — works for both voice and messaging when
        //      Genesys transcription is enabled on the queue.
        //   2. If STA fails and the conversation is messaging, fall back to the
        //      Conversations Messages bulk API (for orgs without STA on messaging).
        //   3. If both fail, mark as noTranscript.
        let plainText: string | undefined;
        let rawJson: unknown;
        let communicationId: string | undefined;

        // Attempt 1: STA transcript
        try {
          communicationId = await resolveCustomerCommunicationId(conv.conversationId);
          const fetched = await fetchAndTransformTranscript(conv.conversationId, communicationId);
          plainText = fetched.plainText;
          rawJson = fetched.rawJson;
        } catch {
          // STA failed — try messages API for messaging conversations
        }

        if (!plainText) {
          const isMessaging = (conv.communications ?? []).some((c) => c.type === "message");
          if (isMessaging) {
            try {
              plainText = await fetchMessagingTranscript(conv.conversationId);
              communicationId = undefined;
              rawJson = undefined;
            } catch {
              // Messages API also failed
            }
          }
        }

        if (!plainText) {
          results.noTranscript++;
          return;
        }

        // Fetch existing production summary (best-effort).
        // Returns before/after pair when agent edited the AI-generated summary.
        const summaryResult = await fetchBestExistingSummary(conv.conversationId);

        const transcript: StoredTranscript = {
          id: conv.conversationId,
          label: `${conv.startTime ? new Date(conv.startTime).toLocaleDateString("en-AU") : "?"} / ${conv.conversationId.slice(0, 8)}`,
          conversationId: conv.conversationId,
          ...(communicationId ? { communicationId } : {}),
          plainText,
          // rawJson intentionally omitted — plainText is the only downstream-usable form
          ...(summaryResult ? {
            existingSummary: summaryResult.existingSummary,
            ...(summaryResult.aiGeneratedSummary ? { aiGeneratedSummary: summaryResult.aiGeneratedSummary } : {}),
          } : {}),
          createdAt: new Date().toISOString(),
          transcriptType: "static",
        };
        storage.saveLifecycleTranscript(configName, transcript);
        results.saved++;
      } catch (err) {
        results.errors++;
        results.errorDetails.push(`${conv.conversationId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Run with concurrency limit
    let idx = 0;
    while (idx < queue.length || inFlight.length > 0) {
      while (inFlight.length < concurrency && idx < queue.length) {
        const conv = queue[idx++];
        const p = processOne(conv).then(() => {
          inFlight.splice(inFlight.indexOf(p), 1);
        });
        inFlight.push(p);
      }
      if (inFlight.length > 0) await Promise.race(inFlight);
    }

    const lines = [
      `─── Bulk Fetch Complete ───`,
      ``,
      `Working dir:       ${configName}`,
      `Date range:        ${dateFrom} → ${dateTo}`,
      `Conversations:     ${conversations.length} found`,
      ``,
      `✓ Saved:           ${results.saved} transcripts + summaries`,
      `↷ Skipped:         ${results.skipped} (already saved)`,
      `✗ No transcript:   ${results.noTranscript} (not transcribed)`,
      ...(results.errors > 0 ? [`⚠ Errors:          ${results.errors}`] : []),
    ];

    if (results.errorDetails.length > 0) {
      lines.push(``, `Errors:`, ...results.errorDetails.slice(0, 5).map((e) => `  • ${e}`));
    }

    lines.push(
      ``,
      `Saved to: .summaryconfig-lifecycle/${configName}/transcripts/static/`,
      ``,
      `Next: use list_transcripts(summary_config_name="${configName}") to review, ` +
      `or generate_test_case to build a test case from one of the transcripts.`,
    );

    return ok(lines.join("\n"));
  });
}

export async function fetch_existing_summaries_bulk(args: Args) {
  return withTokenRefresh(async () => {
    const configName = str(args, "summary_config_name");
    const concurrency = Math.min(typeof args.concurrency === "number" ? args.concurrency : 5, 10);
    const overwrite = args.overwrite === true;

    const transcripts = storage.listLifecycleTranscripts(configName);

    if (transcripts.length === 0) {
      return ok(`No transcripts found in "${configName}". Run fetch_transcripts_bulk first.`);
    }

    const toProcess = overwrite
      ? transcripts
      : transcripts.filter((t) => !t.existingSummary);

    if (toProcess.length === 0) {
      return ok(
        `All ${transcripts.length} transcripts in "${configName}" already have summaries.\n` +
        `Pass overwrite=true to re-fetch.`,
      );
    }

    const results = { enriched: 0, noSummary: 0, errors: 0, skipped: transcripts.length - toProcess.length };

    const queue = [...toProcess];
    const inFlight: Promise<void>[] = [];

    async function processOne(t: StoredTranscript) {
      if (!t.conversationId) {
        results.noSummary++;
        return;
      }
      try {
        const summaryResult = await fetchBestExistingSummary(t.conversationId);
        if (!summaryResult) {
          results.noSummary++;
          return;
        }
        const updated: StoredTranscript = {
          ...t,
          rawJson: undefined, // strip rawJson — plainText is all that's needed downstream
          existingSummary: summaryResult.existingSummary,
          ...(summaryResult.aiGeneratedSummary ? { aiGeneratedSummary: summaryResult.aiGeneratedSummary } : {}),
        };
        if (t.transcriptType === "dynamic") {
          storage.updateDynamicTranscript(configName, updated);
        } else {
          storage.saveLifecycleTranscript(configName, updated);
        }
        results.enriched++;
      } catch {
        results.errors++;
      }
    }

    let idx = 0;
    while (idx < queue.length || inFlight.length > 0) {
      while (inFlight.length < concurrency && idx < queue.length) {
        const t = queue[idx++];
        const p = processOne(t).then(() => { inFlight.splice(inFlight.indexOf(p), 1); });
        inFlight.push(p);
      }
      if (inFlight.length > 0) await Promise.race(inFlight);
    }

    return ok(
      `─── Summary Enrichment Complete ───\n\n` +
      `Working dir:  ${configName}\n` +
      `Total:        ${transcripts.length} transcripts\n\n` +
      `✓ Enriched:   ${results.enriched} (summaries added)\n` +
      `↷ Skipped:    ${results.skipped} (already had summary)\n` +
      `✗ No summary: ${results.noSummary} (conversation has no production summary)\n` +
      (results.errors > 0 ? `⚠ Errors:      ${results.errors}\n` : ``) +
      `\nSummaries saved to each transcript's existingSummary field.`,
    );
  });
}

export async function store_transcript(args: Args) {
  const configName = str(args, "summary_config_name");
  const raw = str(args, "transcript");
  const transcriptType = (optStr(args, "transcript_type") ?? "static") as "static" | "dynamic";
  const plainText = normaliseManualTranscript(raw);
  const transcript: StoredTranscript = {
    id: uuidv4(),
    label: optStr(args, "label") ?? "Manual transcript",
    conversationId: optStr(args, "conversation_id"),
    plainText,
    createdAt: new Date().toISOString(),
    transcriptType,
  };
  storage.saveLifecycleTranscript(configName, transcript);
  return json({
    id: transcript.id,
    label: transcript.label,
    transcriptType,
    summaryConfigName: configName,
    lineCount: plainText.split("\n").length,
  });
}

export async function list_transcripts(args: Args) {
  const configName = str(args, "summary_config_name");
  const transcriptType = optStr(args, "transcript_type") as "static" | "dynamic" | undefined;
  const transcripts = storage.listLifecycleTranscripts(configName, transcriptType);
  return json(
    transcripts.map((t) => ({
      id: t.id,
      label: t.label,
      transcriptType: t.transcriptType,
      conversationId: t.conversationId,
      lineCount: t.plainText.split("\n").length,
      generatedSummaryCount: t.generatedSummaries?.length ?? 0,
      hasEditedSummary: !!t.editedSummary,
      createdAt: t.createdAt,
    })),
  );
}

// ─── Summary config ───────────────────────────────────────────────────────────

export async function list_summary_settings(_args: Args) {
  return withTokenRefresh(async () => {
    const settings = await listSummarySettings();
    return json(settings.map((s) => ({ id: s.id, name: s.name, language: s.language, prompt: s.prompt?.slice(0, 100) })));
  });
}

export async function get_summary_setting(args: Args) {
  return withTokenRefresh(async () => {
    const setting = await getSummarySetting(str(args, "summary_setting_id"));
    return json(setting);
  });
}

export async function create_summary_setting(args: Args) {
  return withTokenRefresh(async () => {
    const setting: Omit<SummarySetting, "id"> = {
      name: str(args, "name"),
      prompt: str(args, "prompt"),
      language: optStr(args, "language") ?? "en-au",
      summaryType: (optStr(args, "summary_type") as SummarySetting["summaryType"]) ?? "Concise",
      format: (optStr(args, "format") as SummarySetting["format"]) ?? "TextBlock",
      maskPII: { all: args.mask_pii === true },
      predefinedInsights: Array.isArray(args.predefined_insights)
        ? (args.predefined_insights as SummarySetting["predefinedInsights"])
        : [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: typeof args.timeout_duration === "number" ? args.timeout_duration : 20,
    };
    const created = await createSummarySetting(setting);
    return json({ success: true, id: created.id, name: created.name });
  });
}

export async function update_summary_setting(args: Args) {
  return withTokenRefresh(async () => {
    const id = str(args, "summary_setting_id");
    const patch: Partial<SummarySetting> = { prompt: str(args, "prompt") };
    if (args.name) patch.name = str(args, "name");
    const updated = await updateSummarySetting(id, patch);
    return json({ success: true, id: updated.id, name: updated.name });
  });
}

// ─── Summary generation ───────────────────────────────────────────────────────

export async function generate_preview_summary(args: Args) {
  const configName = optStr(args, "summary_config_name");

  // Resolve transcript
  let transcript: string;
  if (args.transcript_id) {
    const tId = str(args, "transcript_id");
    let stored: StoredTranscript | null = null;
    if (configName) {
      stored = storage.getLifecycleTranscript(configName, tId);
    }
    if (!stored) throw new Error(`Transcript not found: ${tId}. Provide summary_config_name if the transcript is stored in the lifecycle structure.`);
    transcript = stored.plainText;
  } else if (args.transcript_text) {
    transcript = str(args, "transcript_text");
  } else {
    throw new Error("Either transcript_id or transcript_text is required");
  }

  // Resolve summarySetting
  let setting: SummarySetting;
  if (args.summary_setting_id) {
    setting = await getSummarySetting(str(args, "summary_setting_id"));
    if (args.prompt) setting.prompt = str(args, "prompt");
  } else {
    if (!args.prompt) throw new Error("Either summary_setting_id or prompt is required");
    setting = {
      name: "preview-test",
      prompt: str(args, "prompt"),
      language: optStr(args, "language") ?? "en-au",
      summaryType: (optStr(args, "summary_type") as SummarySetting["summaryType"]) ?? "Concise",
      format: (optStr(args, "format") as SummarySetting["format"]) ?? "TextBlock",
      maskPII: { all: false },
      predefinedInsights: Array.isArray(args.predefined_insights)
        ? (args.predefined_insights as SummarySetting["predefinedInsights"])
        : [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: 20,
    };
  }

  return withTokenRefresh(async () => {
    const response = await generatePreviewSummary(transcript, setting);

    if (response === null) {
      return ok(
        "Preview request sent (204 accepted), but no user token is available to receive the result.\n\n" +
        "The preview API delivers results via a user-scoped WebSocket notification. " +
        "Call the login tool to authenticate as a Genesys Cloud user, then retry.",
      );
    }

    const summaryText = extractSummaryText(response);

    // If a dynamic transcript ID was provided, record the generated summary on it
    if (args.transcript_id && configName) {
      const tId = str(args, "transcript_id");
      const stored = storage.getLifecycleTranscript(configName, tId);
      if (stored && stored.transcriptType === "dynamic") {
        stored.generatedSummaries = stored.generatedSummaries ?? [];
        stored.generatedSummaries.push({
          prompt: setting.prompt,
          summary: summaryText,
          generatedAt: new Date().toISOString(),
        });
        storage.updateDynamicTranscript(configName, stored);
      }
    }

    return json({
      summary: summaryText,
      raw_response: response,
      transcript_lines: transcript.split("\n").length,
    });
  });
}

export async function get_existing_summaries(args: Args) {
  return withTokenRefresh(async () => {
    const result = await getExistingSummaries(str(args, "conversation_id"));
    return json(result);
  });
}

// ─── Test cases (lifecycle-scoped rubrics) ────────────────────────────────────

export async function generate_test_case(args: Args) {
  const configName = str(args, "summary_config_name");
  const transcriptIds = strArr(args, "sample_transcript_ids");
  const sampleSummaries = strArr(args, "sample_summaries");
  const testCaseName = str(args, "test_case_name");
  const focusAreas = Array.isArray(args.focus_areas) ? args.focus_areas.map(String) : [];

  if (transcriptIds.length !== sampleSummaries.length) {
    throw new Error("sample_transcript_ids and sample_summaries must have the same length");
  }

  const samples = transcriptIds.map((id, i) => {
    const t = storage.getLifecycleTranscript(configName, id);
    return {
      transcriptId: id,
      transcript: t?.plainText ?? "(transcript not found)",
      idealSummary: sampleSummaries[i],
    };
  });

  return json({
    instruction: [
      "Using the sample transcripts and ideal summaries below, author a test case JSON and call save_test_case to persist it.",
      "",
      "STEP 1 — IDENTIFY DIMENSIONS (3–6)",
      "Each dimension tests one discrete, observable concern in the summary output.",
      "Derive dimensions from what the ideal summaries demonstrate — not from generic principles.",
      "Each dimension must reference the BR- requirement IDs it validates (from requirements/final/requirements.md).",
      "",
      "STEP 2 — DETERMINE applicability_condition FOR EVERY DIMENSION (MANDATORY)",
      "For each dimension, ask: 'Is this check meaningful for every transcript, or only when a specific condition is present?'",
      "",
      "Set applicability_condition to:",
      "  - \"always\"  →  the dimension applies unconditionally to every transcript",
      "  - A plain-English condition string  →  the dimension only applies when the condition is true",
      "",
      "Common condition patterns to consider:",
      "  - 'Summary contains bullets.'  (for bullet-character or bullet-format rules)",
      "  - 'Summary contains at least 2 sections.'  (for section-separator rules)",
      "  - 'Only applies when a third party participated in the interaction.'",
      "  - 'Only applies when a complaint or dissatisfaction was raised.'",
      "  - 'Only applies when order status was explicitly discussed.'",
      "  - 'Only applies when the customer's intent was unclear in the transcript.'",
      "",
      "STEP 3 — PAUSE AND ASK WHEN UNCERTAIN",
      "If you are unsure whether a dimension is 'always' or conditional:",
      "  DO NOT default to 'always' and proceed.",
      "  Instead, stop, describe the uncertain dimension(s), and ask the user to clarify the condition before calling save_test_case.",
      "  Example: 'I'm not sure whether \"Fallback text used\" should be always or only applies when intent is unclear — which do you prefer?'",
      "",
      "STEP 4 — WRITE CRITERIA",
      "pass_criteria: describe the scoring gradient from 1.0 (perfect) downward with explicit decimal anchor points.",
      "  Format: 'Score 1.0: [perfect]. Score [X] if [partial condition]. Score 0 if [total failure].'",
      "fail_criteria: describe the complete failure condition (score 0 only).",
      "pass_threshold: 1.0 for binary must/must-not rules; 0.8 for coverage and style rules.",
      "",
      "STEP 5 — CALL save_test_case",
      "Only call save_test_case once all dimensions have confirmed applicability_conditions.",
      "Never call save_test_case with any dimension still set to 'always' if you are not certain that is correct.",
    ].join("\n"),
    test_case_name: testCaseName,
    summary_config_name: configName,
    focus_areas: focusAreas,
    samples,
    applicability_condition_examples: {
      note: "These are real examples showing how applicability_condition is used in practice. Use them as reference when authoring new dimensions.",
      always: [
        { dimension: "Customer terminology", condition: "always", rationale: "Every summary references the external participant — the terminology rule applies universally." },
        { dimension: "Nothing inferred", condition: "always", rationale: "Inference is prohibited in all summaries, regardless of transcript content." },
        { dimension: "Numbered lists absent", condition: "always", rationale: "Numbered lists are prohibited everywhere — applies regardless of summary content." },
      ],
      conditional: [
        { dimension: "Section spacing correct", condition: "Summary contains at least 2 sections.", rationale: "A single-section summary has no adjacent sections to separate — the rule is structurally inapplicable." },
        { dimension: "Bullet character correct", condition: "Summary contains bullets.", rationale: "A summary with no bullets cannot violate the bullet character rule." },
        { dimension: "Third-party role stated", condition: "Only applies when a third party participated in the interaction.", rationale: "If no third party was present, there is nothing to identify — scoring would be meaningless." },
        { dimension: "Each intent captured separately", condition: "Only applies when the customer expressed more than one distinct intent.", rationale: "A single-intent call cannot be tested for multi-intent capture." },
        { dimension: "Fallback when status absent", condition: "Only applies when the order status was NOT discussed in the transcript.", rationale: "If the stage was discussed, the dimension being tested (fallback text) is not applicable." },
      ],
    },
  });
}

export async function save_test_case(args: Args) {
  const configName = str(args, "summary_config_name");
  const name = str(args, "name");
  const rawDimensions = Array.isArray(args.dimensions) ? args.dimensions : [];

  const testCase: TestCase = {
    name,
    description: optStr(args, "description") ?? "",
    dimensions: rawDimensions.map((d: unknown) => {
      const dim = d as Record<string, unknown>;
      return {
        name: String(dim.name ?? ""),
        description: String(dim.description ?? ""),
        weight: Number(dim.weight ?? 3),
        applicabilityCondition: String(dim.applicability_condition ?? "always"),
        passCriteria: String(dim.pass_criteria ?? ""),
        failCriteria: String(dim.fail_criteria ?? ""),
        passThreshold: dim.pass_threshold != null ? Number(dim.pass_threshold) : 0.8,
        requirementIds: Array.isArray(dim.requirement_ids) ? dim.requirement_ids.map(String) : undefined,
      };
    }),
    createdAt: new Date().toISOString(),
  };

  storage.saveTestCase(configName, testCase);
  return json({
    name: testCase.name,
    summaryConfigName: configName,
    dimensions: testCase.dimensions.length,
  });
}

export async function list_test_cases(args: Args) {
  const configName = str(args, "summary_config_name");
  return json(
    storage.listTestCases(configName).map((tc) => ({
      name: tc.name,
      description: tc.description,
      dimensions: tc.dimensions.map((d) => d.name),
      createdAt: tc.createdAt,
    })),
  );
}

// ─── Test sets ────────────────────────────────────────────────────────────────

export async function save_test_set(args: Args) {
  const configName = str(args, "summary_config_name");
  const name = str(args, "name");

  const testSet: TestSet = {
    name,
    description: optStr(args, "description"),
    testCaseNames: strArr(args, "test_case_names"),
    transcriptIds: strArr(args, "transcript_ids"),
    createdAt: new Date().toISOString(),
  };

  storage.saveTestSet(configName, testSet);
  return json({
    name: testSet.name,
    summaryConfigName: configName,
    testCases: testSet.testCaseNames.length,
    transcripts: testSet.transcriptIds.length,
  });
}

export async function list_test_sets(args: Args) {
  const configName = str(args, "summary_config_name");
  return json(
    storage.listTestSets(configName).map((ts) => ({
      name: ts.name,
      description: ts.description,
      testCaseNames: ts.testCaseNames,
      transcriptCount: ts.transcriptIds.length,
      createdAt: ts.createdAt,
    })),
  );
}

// ─── Evaluate summary ─────────────────────────────────────────────────────────

export async function evaluate_summary(args: Args) {
  const configName = str(args, "summary_config_name");
  const testCaseName = str(args, "test_case_name");
  const testCase = storage.getTestCase(configName, testCaseName);
  if (!testCase) throw new Error(`Test case not found: ${testCaseName} (in config: ${configName})`);

  return json({
    instruction:
      "Evaluate the summary below against each test case dimension. For each dimension, determine whether it PASSED or FAILED based on the criteria, provide a score (0.0–1.0), and give brief reasoning. Then call save_eval_run with the results.",
    test_case: {
      name: testCase.name,
      description: testCase.description,
      dimensions: testCase.dimensions.map((d) => ({
        name: d.name,
        description: d.description,
        weight: d.weight,
        pass_criteria: d.passCriteria,
        fail_criteria: d.failCriteria,
      })),
    },
    transcript: str(args, "transcript_text"),
    summary: str(args, "summary_text"),
    score_template: testCase.dimensions.map((d) => ({
      dimension: d.name,
      passed: null,
      score: null,
      reasoning: "",
    })),
  });
}

// ─── Eval runs ────────────────────────────────────────────────────────────────

const pendingEvalRuns = new Map<
  string,
  {
    configName: string;
    testSetName: string;
    prompt: string;
    setting: SummarySetting;
    generated: Array<{
      transcriptId: string;
      transcriptLabel: string;
      transcript: string;
      summary: string;
    }>;
    testCaseNames: string[];
    transcriptIds: string[];
  }
>();

export async function run_test_suite(args: Args) {
  const configName = str(args, "summary_config_name");
  const testSetName = str(args, "test_set_name");
  const prompt = str(args, "prompt");

  // Load test set
  const testSet = storage.getTestSet(configName, testSetName);
  if (!testSet) throw new Error(`Test set not found: ${testSetName} (in config: ${configName})`);

  // Build summarySetting
  let setting: SummarySetting;
  if (args.summary_setting_id) {
    setting = await getSummarySetting(str(args, "summary_setting_id"));
    setting.prompt = prompt;
  } else {
    setting = {
      name: testSetName,
      prompt,
      language: optStr(args, "language") ?? "en-au",
      summaryType: "Concise",
      format: "TextBlock",
      maskPII: { all: false },
      predefinedInsights: [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: 20,
    };
  }

  // Load test cases from the test set
  const testCases = testSet.testCaseNames.map((name) => {
    const tc = storage.getTestCase(configName, name);
    if (!tc) throw new Error(`Test case not found: ${name} (in config: ${configName})`);
    return tc;
  });

  // Generate previews for all transcripts in the test set
  const generated: Array<{
    transcriptId: string;
    transcriptLabel: string;
    transcript: string;
    summary: string;
  }> = [];

  for (const tId of testSet.transcriptIds) {
    const stored = storage.getLifecycleTranscript(configName, tId);
    if (!stored) throw new Error(`Transcript not found: ${tId} (in config: ${configName})`);
    const response = await generatePreviewSummary(stored.plainText, setting);
    if (response === null) {
      throw new Error(
        "No user token available for preview generation. Call the login tool to authenticate as a Genesys Cloud user first.",
      );
    }
    const summaryText = extractSummaryText(response);
    generated.push({
      transcriptId: tId,
      transcriptLabel: stored.label,
      transcript: stored.plainText,
      summary: summaryText,
    });
  }

  const runKey = uuidv4();
  pendingEvalRuns.set(runKey, {
    configName,
    testSetName,
    prompt,
    setting,
    generated,
    testCaseNames: testSet.testCaseNames,
    transcriptIds: testSet.transcriptIds,
  });

  return json({
    run_key: runKey,
    summary_config_name: configName,
    test_set_name: testSetName,
    prompt_used: prompt,
    instruction:
      "Below are the generated summaries for each transcript. Evaluate each against every test case dimension, then call save_eval_run with your scores to persist the results.",
    test_cases: testCases.map((tc) => ({
      name: tc.name,
      description: tc.description,
      dimensions: tc.dimensions.map((d) => ({
        name: d.name,
        weight: d.weight,
        pass_criteria: d.passCriteria,
        fail_criteria: d.failCriteria,
      })),
    })),
    generated_summaries: generated,
  });
}

export async function save_eval_run(args: Args) {
  const runKey = str(args, "run_key");
  const rawResults = Array.isArray(args.results) ? args.results : [];
  const suggestedImprovements = optStr(args, "suggested_improvements");

  const pending = pendingEvalRuns.get(runKey);
  if (!pending) {
    throw new Error(
      `No pending eval run found with run_key ${runKey}. Make sure to call run_test_suite first.`,
    );
  }

  const { configName, testSetName, prompt, setting, generated, testCaseNames, transcriptIds } = pending;

  // Build EvalRunResult for each (transcript × test case) result provided
  const evalResults: EvalRunResult[] = rawResults.map((r: unknown) => {
    const row = r as Record<string, unknown>;
    const tId = String(row.transcript_id ?? "");
    const testCaseName = String(row.test_case_name ?? "");
    const stored = storage.getLifecycleTranscript(configName, tId);
    const generatedEntry = generated.find((g) => g.transcriptId === tId);

    const rawScores = Array.isArray(row.dimension_scores) ? row.dimension_scores : [];
    const dimensionScores = rawScores.map((s: unknown) => {
      const sc = s as Record<string, unknown>;
      const dimName = String(sc.dimension ?? "");
      if (sc.score === null) {
        return { dimension: dimName, score: null as null, na: true, passed: true, reasoning: String(sc.reasoning ?? "") };
      }
      return {
        dimension: dimName,
        passed: Boolean(sc.passed),
        score: Number(sc.score ?? 0),
        na: false,
        reasoning: String(sc.reasoning ?? ""),
      };
    });
    const scoredDims = dimensionScores.filter((d) => !d.na);
    const overallScore =
      scoredDims.length > 0
        ? scoredDims.reduce((sum, d) => sum + (d.score as number), 0) / scoredDims.length
        : 0;
    const overallPassed = scoredDims.length === 0 || scoredDims.every((d) => d.passed);

    return {
      testCaseName,
      transcriptId: tId,
      transcriptLabel: stored?.label ?? tId,
      summary: generatedEntry?.summary ?? "",
      dimensionScores,
      overallPassed,
      overallScore,
    };
  });

  const aggregatePassRate =
    evalResults.length > 0
      ? evalResults.filter((r) => r.overallPassed).length / evalResults.length
      : 0;

  const runNumber = storage.getNextRunNumber(configName, testSetName);

  const meta: EvalRunMeta = {
    runNumber,
    testSetName,
    summaryConfigName: configName,
    prompt,
    summarySetting: setting,
    transcriptIds,
    testCaseNames,
    aggregatePassRate,
    suggestedImprovements,
    createdAt: new Date().toISOString(),
  };

  storage.saveEvalRun(configName, testSetName, runNumber, meta, evalResults);
  pendingEvalRuns.delete(runKey);

  return json({
    success: true,
    summary_config_name: configName,
    test_set_name: testSetName,
    run_number: runNumber,
    aggregate_pass_rate: `${(aggregatePassRate * 100).toFixed(1)}%`,
    transcripts_evaluated: evalResults.length,
    suggested_improvements: suggestedImprovements,
  });
}

export async function list_eval_runs(args: Args) {
  const configName = str(args, "summary_config_name");
  const testSetName = optStr(args, "test_set_name");
  const runs = storage.listEvalRuns(configName, testSetName);
  return json(
    runs.map((r) => ({
      runNumber: r.runNumber,
      testSetName: r.testSetName,
      prompt: r.prompt.slice(0, 100) + (r.prompt.length > 100 ? "..." : ""),
      testCases: r.testCaseNames,
      transcriptCount: r.transcriptIds.length,
      passRate: `${(r.aggregatePassRate * 100).toFixed(1)}%`,
      createdAt: r.createdAt,
    })),
  );
}

// ─── Version history ──────────────────────────────────────────────────────────

export async function save_version(args: Args) {
  const configName = str(args, "summary_config_name");
  const notes = optStr(args, "notes");

  let setting: SummarySetting;
  if (args.summary_setting_id) {
    setting = await getSummarySetting(str(args, "summary_setting_id"));
  } else if (args.prompt) {
    setting = {
      name: configName,
      prompt: str(args, "prompt"),
      language: optStr(args, "language") ?? "en-au",
      summaryType: "Concise",
      format: "TextBlock",
      maskPII: { all: false },
      predefinedInsights: [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: 20,
    };
  } else {
    throw new Error("Either summary_setting_id or prompt is required");
  }

  const snapshot = storage.saveVersionSnapshot(configName, setting, notes);
  return json({
    success: true,
    version: snapshot.version,
    summaryConfigName: configName,
    snapshotAt: snapshot.snapshotAt,
    notes: snapshot.notes,
  });
}

export async function list_versions(args: Args) {
  const configName = str(args, "summary_config_name");
  return json(
    storage.listVersionSnapshots(configName).map((v) => ({
      version: v.version,
      snapshotAt: v.snapshotAt,
      notes: v.notes,
      promptPreview: v.setting.prompt.slice(0, 100) + (v.setting.prompt.length > 100 ? "..." : ""),
    })),
  );
}

// ─── Reporting ────────────────────────────────────────────────────────────────

export async function generate_dashboard(args: Args) {
  const configName = str(args, "summary_config_name");
  const testSetName = optStr(args, "test_set_name");
  const title = optStr(args, "title") ?? `SDD Summary Dashboard — ${configName}`;

  const evalRunMetas = storage.listEvalRuns(configName, testSetName);
  if (evalRunMetas.length === 0) {
    throw new Error(
      `No eval runs found for config "${configName}"${testSetName ? ` / test set "${testSetName}"` : ""}. Run a test suite first.`,
    );
  }

  // Reconstruct TestRun-compatible objects for the dashboard renderer
  const runs: TestRun[] = evalRunMetas.map((meta) => {
    const results = storage.getEvalRunResults(configName, meta.testSetName, meta.runNumber);
    const transcriptResults: TranscriptResult[] = results.map((r) => ({
      transcriptId: r.transcriptId,
      transcriptLabel: r.transcriptLabel,
      summary: r.summary,
      dimensionScores: r.dimensionScores,
      overallPassed: r.overallPassed,
      overallScore: r.overallScore,
    }));
    return {
      id: `${meta.testSetName}-${String(meta.runNumber).padStart(4, "0")}`,
      label: `${meta.testSetName} / Run ${meta.runNumber}`,
      summarySettingId: undefined,
      summarySetting: meta.summarySetting,
      rubricId: meta.testCaseNames.join(","),
      transcriptIds: meta.transcriptIds,
      results: transcriptResults,
      aggregatePassRate: meta.aggregatePassRate,
      promptVersion: meta.runNumber,
      suggestedImprovements: meta.suggestedImprovements,
      createdAt: meta.createdAt,
    };
  });

  const outputPath = await generateDashboard(runs, title);
  return json({ success: true, path: outputPath, runs_included: runs.length });
}

// ─── Copilot config ───────────────────────────────────────────────────────────

export async function list_assistants(_args: Args) {
  return withTokenRefresh(async () => {
    const assistants = await listAssistants();
    return json(assistants);
  });
}

export async function get_copilot_config(args: Args) {
  return withTokenRefresh(async () => {
    const config = await getCopilotConfig(str(args, "assistant_id"));
    return json(config);
  });
}

export async function update_copilot_config(args: Args) {
  return withTokenRefresh(async () => {
    const assistantId = str(args, "assistant_id");
    const config = args.config;
    if (!config || typeof config !== "object") throw new Error("config must be an object");
    const updated = await updateCopilotConfig(assistantId, config);
    return json({ success: true, result: updated });
  });
}

export async function build_interaction_filter(args: Args) {
  return withTokenRefresh(async () => {
    const copilotId = optStr(args, "copilot_id");
    const copilotName = optStr(args, "copilot_name");
    const chosenSummarySettingId = optStr(args, "summary_setting_id");

    if (!copilotId && !copilotName) {
      return ok(
        "What is the name of your Agent Copilot in Genesys?\n\n" +
        "Provide it as copilot_name (e.g. \"Acme_Copilot\") or copilot_id.\n" +
        "Not sure? Call list_assistants to see all Agent Copilots in your org.",
      );
    }

    // Resolve the copilot by name if ID not provided
    let resolvedId = copilotId ?? "";
    let resolvedName = copilotName ?? "";

    const all = await listAssistants();

    if (!copilotId && copilotName) {
      const match = all.find(
        (a) => a.name.toLowerCase() === copilotName.toLowerCase(),
      );
      if (!match) {
        const names = all.map((a) => `  • ${a.name}`).join("\n");
        return ok(
          `No Agent Copilot found with name "${copilotName}".\n\n` +
          `Available Agent Copilots:\n${names}`,
        );
      }
      resolvedId = match.id;
      resolvedName = match.name;
    } else if (copilotId && !copilotName) {
      resolvedName = all.find((a) => a.id === copilotId)?.name ?? copilotId;
    }

    // Step 1: Get copilot config and extract summary settings
    const copilot = await getCopilotConfig(resolvedId);
    const sgc = copilot.summaryGenerationConfig;

    if (!sgc?.enabled) {
      return ok(
        `"${resolvedName}" does not have summary generation enabled.\n\n` +
        `Enable it in Genesys Admin → Agent Copilot → ${resolvedName} → Summary, ` +
        `then re-run build_interaction_filter.`,
      );
    }

    // Collect all summary settings — single or multi-language
    const allSettings: Array<{ id: string; language?: string }> = [];
    if (sgc.summarySettings && Array.isArray(sgc.summarySettings)) {
      for (const s of sgc.summarySettings) {
        if (s.id) allSettings.push({ id: s.id, language: s.language });
      }
    }
    if (sgc.summarySetting?.id) {
      if (!allSettings.some((s) => s.id === sgc.summarySetting!.id)) {
        allSettings.push({ id: sgc.summarySetting.id });
      }
    }

    if (allSettings.length === 0) {
      return ok(
        `"${resolvedName}" has summary generation enabled but no summary setting is linked.\n\n` +
        `Link a summary configuration in Genesys Admin → Agent Copilot → ${resolvedName} → Summary, ` +
        `then re-run build_interaction_filter.`,
      );
    }

    // Step 2: If multiple summary settings and none chosen, ask the user to pick
    let chosenSetting: { id: string; language?: string };

    if (allSettings.length > 1 && !chosenSummarySettingId) {
      const options = allSettings
        .map((s, i) => `  ${i + 1}. ${s.id}${s.language ? ` (${s.language})` : ""}`)
        .join("\n");
      return ok(
        `"${resolvedName}" has ${allSettings.length} summary configurations (likely multi-language).\n\n` +
        `Which summary setting would you like to work with?\n\n${options}\n\n` +
        `Re-call build_interaction_filter with summary_setting_id set to your chosen ID.`,
      );
    }

    if (chosenSummarySettingId) {
      const found = allSettings.find((s) => s.id === chosenSummarySettingId);
      if (!found) {
        return ok(
          `summary_setting_id "${chosenSummarySettingId}" is not linked to "${resolvedName}".\n\n` +
          `Linked settings:\n${allSettings.map((s) => `  • ${s.id}${s.language ? ` (${s.language})` : ""}`).join("\n")}`,
        );
      }
      chosenSetting = found;
    } else {
      chosenSetting = allSettings[0];
    }

    // Step 3: Resolve the summary setting name to use as the working directory name
    const settingDetail = await getSummarySetting(chosenSetting.id);
    const configName = (settingDetail.name ?? chosenSetting.id).replace(/[^a-zA-Z0-9_\-]/g, "_");

    // Step 4: Find the queues directly associated with this copilot
    const queues = await getAssistantQueues(resolvedId);
    const queueIds = queues.map((q) => q.id);

    // Step 5: Save interaction filter and create the full workspace in one shot
    const filter: storage.InteractionFilter = {
      summaryConfigName: configName,
      summarySettingId: chosenSetting.id,
      ...(chosenSetting.language ? { summaryLanguage: chosenSetting.language } : {}),
      builtAt: new Date().toISOString(),
      copilots: [
        {
          assistantId: resolvedId,
          assistantName: resolvedName,
          queues: queues.map((q) => ({ id: q.id, name: q.name })),
        },
      ],
      queueIds,
    };

    storage.saveInteractionFilter(configName, filter);
    storage.ensureAllLifecycleDirs(configName);

    // Step 6: Snapshot the current summary config as v0 (baseline — only written once)
    const v0 = storage.saveInitialVersionSnapshot(configName, settingDetail);
    const v0Line = v0
      ? `  ├── version-history/\n  │   └── summary-configuration-0.json  ← initial snapshot\n`
      : `  ├── version-history/  (v0 already exists)\n`;

    const queueText = queues.length
      ? queues.map((q) => `  • ${q.name} (${q.id})`).join("\n")
      : "  (none found — the copilot may not be deployed to any queues yet)";

    const langLine = chosenSetting.language ? `\nLanguage:        ${chosenSetting.language}` : "";

    return ok(
      `─── Workspace Created ───\n\n` +
      `Agent Copilot:   ${resolvedName}\n` +
      `Summary config:  ${settingDetail.name ?? chosenSetting.id}${langLine}\n` +
      `Summary setting: ${chosenSetting.id}\n` +
      `Working dir:     ${configName}\n\n` +
      `Queues (${queues.length}):\n${queueText}\n\n` +
      `Directory structure:\n` +
      `  .summaryconfig-lifecycle/${configName}/\n` +
      `  ├── interaction-filter.json\n` +
      `  ├── requirements/\n` +
      `  │   ├── artefacts/   ← drop raw inputs here (emails, docs, screenshots)\n` +
      `  │   └── final/       ← distilled requirements go here (e.g. requirements.md)\n` +
      v0Line +
      `  ├── transcripts/\n` +
      `  │   ├── static/\n` +
      `  │   └── dynamic/\n` +
      `  ├── test-cases/\n` +
      `  ├── test-sets/\n` +
      `  └── eval-runs/\n\n` +
      (queueIds.length
        ? `Next: call fetch_transcripts_bulk(summary_config_name="${configName}", date_from=..., date_to=...) to fetch transcripts.`
        : `No queues found. Once the copilot is deployed on queues, re-run build_interaction_filter to update the filter.`),
    );
  });
}

// ─── Batched preview cache builder ───────────────────────────────────────────

export async function prepare_prompt_test(args: Args) {
  return withTokenRefresh(async () => {
    const configName = str(args, "summary_config_name");
    const testSetName = str(args, "test_set_name");
    const versionNumber = Number(args.version_number);
    const batchSize = Math.min(Number(args.batch_size ?? 5), 15);
    const clearCache = args.clear_cache === true;

    const snapshots = storage.listVersionSnapshots(configName);
    const snapshot = snapshots.find((s) => s.version === versionNumber);
    if (!snapshot) {
      const available = snapshots.map((s) => s.version).join(", ") || "none";
      throw new Error(`Version ${versionNumber} not found for "${configName}". Available: ${available}`);
    }

    const testSet = storage.getTestSet(configName, testSetName);
    if (!testSet) throw new Error(`Test set not found: ${testSetName}`);

    if (clearCache) storage.clearPreviewCache(configName, testSetName, versionNumber);

    const cache = storage.loadPreviewCache(configName, testSetName, versionNumber);
    const allIds = testSet.transcriptIds.filter((id) => storage.getLifecycleTranscript(configName, id) != null);
    const pending = allIds.filter((id) => !(id in cache));

    if (pending.length === 0) {
      return ok(
        `✓ Preview cache complete — ${allIds.length}/${allIds.length} summaries ready.\n` +
        `Call start_eval_run(summary_config_name="${configName}", test_set_name="${testSetName}", mode="prompt_test", version_number=${versionNumber}) to start the eval run.`,
      );
    }

    const setting: SummarySetting = {
      name: testSetName,
      prompt: snapshot.setting.prompt,
      language: optStr(args, "language") ?? "en-au",
      summaryType: "Concise",
      format: "TextBlock",
      maskPII: { all: false },
      predefinedInsights: [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: 50,
    };

    const toProcess = pending.slice(0, batchSize);
    let generated = 0;
    let authFailed = false;

    // Fire all previews in this batch in parallel
    await Promise.all(
      toProcess.map(async (tId) => {
        const stored = storage.getLifecycleTranscript(configName, tId)!;
        const response = await generatePreviewSummary(stored.plainText, setting);
        if (response === null) {
          authFailed = true;
          return;
        }
        cache[tId] = extractSummaryText(response);
        generated++;
      }),
    );
    // Persist after the whole batch completes
    storage.savePreviewCache(configName, testSetName, versionNumber, cache);

    if (authFailed) {
      return ok("No user token available for preview generation. Call login first, then retry.");
    }

    const done = Object.keys(cache).length;
    const total = allIds.length;
    const remaining = total - done;
    const complete = remaining === 0;

    const lines = [
      `─── Preview Cache Progress ───`,
      ``,
      `Config:      ${configName}`,
      `Test set:    ${testSetName}`,
      `Version:     ${versionNumber} (${snapshot.status ?? "candidate"})`,
      ``,
      `Generated:   ${generated} this call`,
      `Cached:      ${done}/${total}`,
      `Remaining:   ${remaining}`,
      `Complete:    ${complete ? "YES ✓" : `NO — call prepare_prompt_test again (${Math.ceil(remaining / batchSize)} more call(s))`}`,
    ];

    if (complete) {
      lines.push(
        ``,
        `All summaries ready. Next step:`,
        `  start_eval_run(summary_config_name="${configName}", test_set_name="${testSetName}", mode="prompt_test", version_number=${versionNumber})`,
      );
    }

    return ok(lines.join("\n"));
  });
}

// ─── Stateless parallel eval run ─────────────────────────────────────────────

export async function start_eval_run(args: Args) {
  return withTokenRefresh(async () => {
    const configName = str(args, "summary_config_name");
    const testSetName = str(args, "test_set_name");
    const mode = (optStr(args, "mode") ?? "existing") as "existing" | "prompt_test";
    const inlinePrompt = optStr(args, "prompt");
    const versionNumber = args.version_number != null ? Number(args.version_number) : undefined;
    const batchSize = Math.min(Number(args.batch_size ?? 5), 20);

    if (inlinePrompt && versionNumber !== undefined) {
      return ok("Provide either version_number or prompt, not both. Use version_number when testing a versioned candidate — it records full traceability.");
    }

    // Resolve the prompt text and version metadata
    let prompt: string | undefined = inlinePrompt;
    let promptVersionNumber: number | undefined;
    let promptVersionStatus: "candidate" | "deployed" | undefined;

    if (versionNumber !== undefined) {
      const snapshots = storage.listVersionSnapshots(configName);
      const snapshot = snapshots.find((s) => s.version === versionNumber);
      if (!snapshot) {
        const available = snapshots.map((s) => s.version).join(", ") || "none";
        throw new Error(`Version ${versionNumber} not found in version-history for "${configName}". Available: ${available}`);
      }
      prompt = snapshot.setting.prompt;
      promptVersionNumber = snapshot.version;
      promptVersionStatus = snapshot.status ?? "deployed";
    } else {
      // No version_number specified — try to resolve from latest snapshot for traceability
      const snapshots = storage.listVersionSnapshots(configName);
      if (snapshots.length > 0) {
        const latest = snapshots[snapshots.length - 1];
        if (!prompt) prompt = latest.setting.prompt; // for existing mode
        promptVersionNumber = latest.version;
        promptVersionStatus = latest.status ?? "deployed";
      }
    }

    if (mode === "prompt_test" && !prompt) {
      return ok('mode "prompt_test" requires either a version_number (recommended) or a prompt argument.');
    }

    const testSet = storage.getTestSet(configName, testSetName);
    if (!testSet) throw new Error(`Test set not found: ${testSetName}`);

    const testCases = testSet.testCaseNames.map((name) => {
      const tc = storage.getTestCase(configName, name);
      if (!tc) throw new Error(`Test case not found: ${name}`);
      return tc;
    });

    // Build per-transcript payload (parallel for prompt_test, sequential for existing)
    const transcriptPayloads: Array<{
      transcriptId: string;
      transcriptLabel: string;
      plainText: string;
      summary: string;
    }> = [];

    const previewConcurrency = Math.min(Number(args.concurrency ?? 5), 10);
    const previewSetting: SummarySetting = {
      name: testSetName,
      prompt: prompt!,
      language: optStr(args, "language") ?? "en-au",
      summaryType: "Concise",
      format: "TextBlock",
      maskPII: { all: false },
      predefinedInsights: [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: 50,
    };

    if (mode === "existing") {
      for (const tId of testSet.transcriptIds) {
        const stored = storage.getLifecycleTranscript(configName, tId);
        if (!stored || !stored.existingSummary) continue;
        transcriptPayloads.push({
          transcriptId: tId,
          transcriptLabel: stored.label,
          plainText: stored.plainText,
          summary: stored.existingSummary,
        });
      }
    } else {
      // mode: prompt_test — use disk cache if available, otherwise generate in parallel
      const previewCache = promptVersionNumber !== undefined
        ? storage.loadPreviewCache(configName, testSetName, promptVersionNumber)
        : {};

      const queue = testSet.transcriptIds
        .map((tId) => ({ tId, stored: storage.getLifecycleTranscript(configName, tId) }))
        .filter((x): x is { tId: string; stored: NonNullable<typeof x.stored> } => x.stored != null);

      const uncached = queue.filter(({ tId }) => !(tId in previewCache));

      if (uncached.length > 0 && promptVersionNumber !== undefined) {
        // Summaries not yet cached — prompt user to run prepare_prompt_test first
        const total = queue.length;
        const cached = total - uncached.length;
        return ok(
          `${cached}/${total} preview summaries are cached for version ${promptVersionNumber}.\n` +
          `${uncached.length} remain. Call prepare_prompt_test first to build the full cache, then retry start_eval_run.\n\n` +
          `prepare_prompt_test(summary_config_name="${configName}", test_set_name="${testSetName}", version_number=${promptVersionNumber})`,
        );
      }

      const inFlight: Promise<void>[] = [];
      let authFailed = false;
      let idx = 0;

      while ((idx < uncached.length || inFlight.length > 0) && !authFailed) {
        while (inFlight.length < previewConcurrency && idx < uncached.length && !authFailed) {
          const { tId, stored } = uncached[idx++];
          const p: Promise<void> = (async () => {
            const response = await generatePreviewSummary(stored.plainText, previewSetting);
            if (response === null) {
              authFailed = true;
              return;
            }
            transcriptPayloads.push({
              transcriptId: tId,
              transcriptLabel: stored.label,
              plainText: stored.plainText,
              summary: extractSummaryText(response),
            });
          })().then(() => {
            inFlight.splice(inFlight.indexOf(p), 1);
          });
          inFlight.push(p);
        }
        if (inFlight.length > 0) await Promise.race(inFlight);
      }
      await Promise.all(inFlight);

      if (authFailed) {
        return ok("No user token available for preview generation. Call login first, then retry.");
      }

      // Add cached entries for transcripts that were pre-generated
      for (const { tId, stored } of queue) {
        if (tId in previewCache && !transcriptPayloads.find((p) => p.transcriptId === tId)) {
          transcriptPayloads.push({
            transcriptId: tId,
            transcriptLabel: stored.label,
            plainText: stored.plainText,
            summary: previewCache[tId],
          });
        }
      }

      // Clear the cache after a successful run is created
      if (promptVersionNumber !== undefined) {
        storage.clearPreviewCache(configName, testSetName, promptVersionNumber);
      }
    }

    if (transcriptPayloads.length === 0) {
      return ok(
        mode === "existing"
          ? `No transcripts in "${testSetName}" have an existingSummary. Run fetch_existing_summaries_bulk first.`
          : `No transcripts found in "${testSetName}".`,
      );
    }

    // Create the disk-backed run (claims the run number atomically)
    const pendingMeta = storage.createPendingEvalRun(configName, testSetName, {
      summaryConfigName: configName,
      testSetName,
      useExistingSummaries: mode === "existing",
      transcriptIds: transcriptPayloads.map((t) => t.transcriptId),
      testCaseNames: testSet.testCaseNames,
      startedAt: new Date().toISOString(),
      promptText: prompt,
      promptVersionNumber,
      promptVersionStatus,
    });

    // Split into batches
    const batches: Array<{
      batchIndex: number;
      transcripts: typeof transcriptPayloads;
    }> = [];
    for (let i = 0; i < transcriptPayloads.length; i += batchSize) {
      batches.push({
        batchIndex: Math.floor(i / batchSize),
        transcripts: transcriptPayloads.slice(i, i + batchSize),
      });
    }

    const testCaseSummary = testCases.map((tc) => ({
      name: tc.name,
      description: tc.description,
      dimensions: tc.dimensions.map((d) => ({
        name: d.name,
        description: d.description,
        weight: d.weight,
        applicability_condition: d.applicabilityCondition ?? "always",
        pass_criteria: d.passCriteria,
        fail_criteria: d.failCriteria,
        pass_threshold: d.passThreshold ?? 0.8,
        requirement_ids: d.requirementIds ?? [],
      })),
    }));

    const versionLabel = promptVersionNumber !== undefined
      ? `v${promptVersionNumber}${promptVersionStatus ? ` (${promptVersionStatus})` : ""}`
      : "unversioned";

    return json({
      run_number: pendingMeta.runNumber,
      summary_config_name: configName,
      test_set_name: testSetName,
      mode,
      prompt_version: versionLabel,
      prompt_version_number: promptVersionNumber ?? null,
      prompt_version_status: promptVersionStatus ?? null,
      prompt_text: prompt ?? null,
      total_transcripts: transcriptPayloads.length,
      total_test_cases: testCases.length,
      total_batches: batches.length,
      batch_size: batchSize,
      test_cases: testCaseSummary,
      batches,
      instruction:
        "Spawn one subagent per batch using a fast model (composer-2.5-fast). " +
        "Each subagent receives its batch of transcripts and the test_cases array above. " +
        "For each transcript in its batch, the subagent scores every dimension of every test case " +
        "and calls submit_eval_scores for each (transcript × test_case) pair. " +
        "APPLICABILITY CHECK — for each dimension, check its applicability_condition field first: " +
        "(1) If applicability_condition is \"always\": score normally (0.0–1.0). " +
        "(2) If applicability_condition is anything else: first determine whether this condition applies to the transcript. " +
        "If YES it applies → score normally. " +
        "If NO it does not apply → submit score: null with reasoning explaining why it is not applicable. " +
        "Null scores are excluded from pass-rate calculations — only submit null when the condition genuinely does not apply. " +
        "After all subagents complete, call finalize_eval_run(summary_config_name, test_set_name, run_number) " +
        "to compute aggregate pass rates and mark the run complete.",
    });
  });
}

export async function submit_eval_scores(args: Args) {
  const configName = str(args, "summary_config_name");
  const testSetName = str(args, "test_set_name");
  const runNumber = Number(args.run_number);
  const transcriptId = str(args, "transcript_id");
  const testCaseName = str(args, "test_case_name");
  const transcriptLabel = optStr(args, "transcript_label") ?? transcriptId;
  const summaryText = optStr(args, "summary_text") ?? "";
  const rawScores = Array.isArray(args.dimension_scores) ? args.dimension_scores : [];

  // Verify run exists
  const pending = storage.getPendingEvalRun(configName, testSetName, runNumber);
  if (!pending) {
    throw new Error(
      `Eval run ${runNumber} not found for "${testSetName}". ` +
      `Call start_eval_run first to create the run.`,
    );
  }

  // Load test case to get passThreshold per dimension
  const testCase = storage.getTestCase(configName, testCaseName);
  if (!testCase) throw new Error(`Test case not found: ${testCaseName}`);

  const thresholdMap = Object.fromEntries(
    testCase.dimensions.map((d) => [d.name, d.passThreshold ?? 0.8]),
  );

  const dimensionScores = rawScores.map((s: unknown) => {
    const sc = s as Record<string, unknown>;
    const dimName = String(sc.dimension ?? "");
    // null score = evaluator determined this dimension is not applicable to this transcript
    if (sc.score === null || sc.score === undefined && String(sc.na ?? "") === "true") {
      return {
        dimension: dimName,
        score: null as null,
        na: true,
        passed: true, // N/A is not a failure
        reasoning: String(sc.reasoning ?? ""),
      };
    }
    const score = Math.max(0, Math.min(1, Number(sc.score ?? 0)));
    const threshold = thresholdMap[dimName] ?? 0.8;
    return {
      dimension: dimName,
      score,
      na: false,
      passed: score >= threshold,
      reasoning: String(sc.reasoning ?? ""),
    };
  });

  // Exclude N/A dimensions from aggregate calculations
  const scoredDims = dimensionScores.filter((d) => !d.na);
  const overallScore =
    scoredDims.length > 0
      ? scoredDims.reduce((sum, d) => sum + (d.score as number), 0) / scoredDims.length
      : 0;
  // All-N/A transcript counts as passing (nothing was evaluated negatively)
  const overallPassed = scoredDims.length === 0 || scoredDims.every((d) => d.passed);

  storage.saveEvalScore(configName, testSetName, runNumber, {
    testCaseName,
    transcriptId,
    transcriptLabel,
    summary: summaryText,
    dimensionScores,
    overallPassed,
    overallScore,
  });

  return json({
    saved: true,
    transcript_id: transcriptId,
    test_case_name: testCaseName,
    overall_score: overallScore.toFixed(3),
    overall_passed: overallPassed,
    dimensions_scored: dimensionScores.length,
  });
}

export async function finalize_eval_run(args: Args) {
  const configName = str(args, "summary_config_name");
  const testSetName = str(args, "test_set_name");
  const runNumber = Number(args.run_number);

  const pending = storage.getPendingEvalRun(configName, testSetName, runNumber);
  if (!pending) {
    throw new Error(`Eval run ${runNumber} not found for "${testSetName}".`);
  }

  const scores = storage.getEvalScores(configName, testSetName, runNumber);

  if (scores.length === 0) {
    return ok(`No scores submitted for run ${runNumber} yet. Ensure all subagents have completed before finalizing.`);
  }

  // Merge intermediate per-transcript files → one {testCaseName}.json per test case
  const merged = storage.mergeEvalScoresToTestCaseFiles(configName, testSetName, runNumber, pending.testCaseNames);

  // Aggregate overall pass rate
  const overallPassRate = scores.filter((s) => s.overallPassed).length / scores.length;

  // Per-test-case stats (from merged output)
  const testCasePassRates: Record<string, number> = {};
  for (const file of merged) {
    testCasePassRates[file.testCaseName] = file.passRate;
  }

  const finalizedMeta = storage.getPendingEvalRun(configName, testSetName, runNumber)!;
  storage.finalizePendingEvalRun(configName, testSetName, runNumber, overallPassRate, testCasePassRates);

  // Auto-generate the run dashboard
  const finalMeta = storage.getPendingEvalRun(configName, testSetName, runNumber)!;
  const html = generateEvalRunDashboardHtml(finalMeta, merged);
  const dashboardPath = storage.saveEvalRunDashboard(configName, testSetName, runNumber, html);

  // Auto-regenerate the test-set-level improvements dashboard
  const allMetas = storage.readAllFinalizedRunMetas(configName, testSetName);
  const improvementsHtml = generateImprovementsDashboardHtml(testSetName, configName, allMetas);
  storage.saveImprovementsDashboard(configName, testSetName, improvementsHtml);

  const breakdown = merged
    .map((f) => `  • ${f.testCaseName}: avg ${f.averageScore.toFixed(2)} · ${(f.passRate * 100).toFixed(0)}% pass`)
    .join("\n");

  // ── Build per-dimension failure analysis for improvement recommendations ──
  const dimFailureLines: string[] = [];
  for (const file of merged) {
    const dimNames = [...new Set(file.results.flatMap((r) => r.dimensionScores.map((d) => d.dimension)))];
    for (const dimName of dimNames) {
      // Exclude N/A dimensions from failure analysis — only count evaluated (scored) dimensions
      const dimScores = file.results
        .map((r) => r.dimensionScores.find((d) => d.dimension === dimName))
        .filter((d) => d != null && !d.na);
      if (dimScores.length === 0) continue;
      const failing = dimScores.filter((d) => !d!.passed);
      if (failing.length === 0) continue;
      const dimPassPct = (((dimScores.length - failing.length) / dimScores.length) * 100).toFixed(0);
      const sampleReasonings = failing
        .slice(0, 3)
        .map((d) => `    • "${d!.reasoning.length > 200 ? d!.reasoning.slice(0, 200) + "…" : d!.reasoning}"`)
        .join("\n");
      dimFailureLines.push(
        `  [${file.testCaseName}] "${dimName}" — ${dimPassPct}% pass (${failing.length}/${dimScores.length} evaluated)\n` +
        `  Sample failure reasoning:\n${sampleReasonings}`,
      );
    }
  }
  const failureAnalysis = dimFailureLines.length > 0
    ? dimFailureLines.join("\n\n")
    : "  (no failing dimensions — all dimensions passed)";

  const versionLabel = pending.promptVersionNumber !== undefined
    ? `Version ${pending.promptVersionNumber}${pending.promptVersionStatus ? ` (${pending.promptVersionStatus})` : ""}`
    : "unversioned (no version_number was supplied)";

  const promptSection = pending.promptText
    ? `\n\nPROMPT UNDER TEST [${versionLabel}]:\n${"─".repeat(60)}\n${pending.promptText}\n${"─".repeat(60)}`
    : `\n\nPROMPT UNDER TEST [${versionLabel}]:\n(Prompt text not recorded — re-run with version_number to capture it.)`;

  return ok(
    `─── Eval Run ${runNumber} Finalized ───\n\n` +
    `Test set:        ${testSetName}\n` +
    `Config:          ${configName}\n` +
    `Mode:            ${pending.useExistingSummaries ? "existing summaries" : "prompt test"}\n` +
    `Version:         ${versionLabel}\n` +
    `Transcripts:     ${pending.transcriptIds.length}\n` +
    `Results saved:   ${scores.length}\n` +
    `Overall pass:    ${(overallPassRate * 100).toFixed(1)}%\n\n` +
    `By test case:\n${breakdown}\n\n` +
    `Output: eval-runs/${testSetName}/${String(runNumber).padStart(4, "0")}/\n` +
    merged.map((f) => `  ${f.testCaseName}.json  (${f.totalTranscripts} transcripts)`).join("\n") + "\n\n" +
    `Dashboard: ${dashboardPath}` +
    promptSection +
    `\n\nFAILING DIMENSION ANALYSIS:\n${failureAnalysis}` +
    `\n\n${"═".repeat(60)}\n` +
    `NEXT STEP — IMPROVEMENT RECOMMENDATIONS\n` +
    `${"═".repeat(60)}\n` +
    `Summaries for this run were generated by: ${SUMMARY_MODEL_NAME}\n\n` +
    `Using the prompt and failing dimension analysis above, write improvements.md for this run.\n\n` +
    `improvements.md must follow this structure:\n` +
    `  1. Run Summary — overall pass rate, test set, date, model, mode\n` +
    `  2. Test Case Results — table of test case / pass rate / avg score\n` +
    `  3. Failing Dimension Analysis — for each failing dimension:\n` +
    `       - What the dimension tests (from passCriteria)\n` +
    `       - Pattern in the failures (synthesized from the reasoning samples above)\n` +
    `       - Root cause: what is the prompt missing or doing wrong for ${SUMMARY_MODEL_NAME}?\n` +
    `  4. Prompt Improvement Suggestions — specific, actionable edits to the prompt:\n` +
    `       - Use concrete phrasing (e.g. "Add the sentence: You MUST always...")\n` +
    `       - Prefer explicit instructions over implicit expectations\n` +
    `       - Note any ${SUMMARY_MODEL_NAME}-specific considerations (e.g. tendency to be terse,\n` +
    `         follow instructions literally, omit context if not told to include it)\n` +
    `  5. Proposed Improved Prompt — the full revised prompt text as a fenced code block\n\n` +
    `When your improvements.md is ready, call:\n` +
    `  save_improvement_recommendations(\n` +
    `    summary_config_name="${configName}",\n` +
    `    test_set_name="${testSetName}",\n` +
    `    run_number=${runNumber},\n` +
    `    content="<your improvements.md content>"\n` +
    `  )`,
  );
}

export async function save_improvement_recommendations(args: Args) {
  const configName = str(args, "summary_config_name");
  const testSetName = str(args, "test_set_name");
  const runNumber = Number(args.run_number);
  const content = str(args, "content");

  if (!content.trim()) {
    throw new Error("content must not be empty.");
  }

  const runDir = `eval-runs/${testSetName}/${String(runNumber).padStart(4, "0")}`;
  const pending = storage.getPendingEvalRun(configName, testSetName, runNumber);
  if (!pending) {
    throw new Error(`Eval run ${runNumber} not found for "${testSetName}". Run finalize_eval_run first.`);
  }
  if (!pending.finalizedAt) {
    throw new Error(`Eval run ${runNumber} has not been finalized yet. Call finalize_eval_run first.`);
  }

  const filePath = storage.saveImprovementRecommendations(configName, testSetName, runNumber, content);
  return ok(
    `Improvement recommendations saved to ${filePath}\n` +
    `Run: ${runDir}\n` +
    `Open improvements.md in that folder to review the analysis.`,
  );
}

export async function generate_eval_run_dashboard(args: Args) {
  const configName = str(args, "summary_config_name");
  const testSetName = str(args, "test_set_name");
  const runNumber = Number(args.run_number);

  const result = storage.readFinalizedEvalRun(configName, testSetName, runNumber);
  if (!result) {
    throw new Error(
      `Eval run ${runNumber} for "${testSetName}" not found or not yet finalized. ` +
      `Run finalize_eval_run first.`,
    );
  }

  const html = generateEvalRunDashboardHtml(result.meta, result.testCaseFiles);
  const dashboardPath = storage.saveEvalRunDashboard(configName, testSetName, runNumber, html);

  return ok(`Dashboard generated: ${dashboardPath}`);
}

export async function generate_improvements_dashboard(args: Args) {
  const configName = str(args, "summary_config_name");
  const testSetName = str(args, "test_set_name");

  const allMetas = storage.readAllFinalizedRunMetas(configName, testSetName);
  if (allMetas.length === 0) {
    throw new Error(`No finalized runs found for test set "${testSetName}". Finalize at least one run first.`);
  }

  const html = generateImprovementsDashboardHtml(testSetName, configName, allMetas);
  const filePath = storage.saveImprovementsDashboard(configName, testSetName, html);

  return ok(
    `Improvements dashboard generated: ${filePath}\n` +
    `Covers ${allMetas.length} run${allMetas.length !== 1 ? "s" : ""}: ` +
    allMetas.map((m) => `Run ${String(m.runNumber).padStart(4, "0")} (${Math.round((m.aggregatePassRate ?? 0) * 100)}%)`).join(" → "),
  );
}

// ─── Legacy: Rubric tools (kept for backward compatibility) ───────────────────

export async function generate_rubric(args: Args) {
  const transcriptIds = strArr(args, "sample_transcript_ids");
  const sampleSummaries = strArr(args, "sample_summaries");
  const rubricName = str(args, "rubric_name");
  const focusAreas = Array.isArray(args.focus_areas) ? args.focus_areas.map(String) : [];

  if (transcriptIds.length !== sampleSummaries.length) {
    throw new Error("sample_transcript_ids and sample_summaries must have the same length");
  }

  return json({
    instruction:
      "NOTE: generate_rubric is deprecated — use generate_test_case instead, which scopes rubrics to a summary configuration. " +
      "Based on the provided samples, generate a rubric JSON and call save_test_case with a summary_config_name.",
    rubric_name: rubricName,
    focus_areas: focusAreas,
    sample_count: transcriptIds.length,
  });
}

export async function save_rubric(args: Args) {
  const name = str(args, "name");
  const rawDimensions = Array.isArray(args.dimensions) ? args.dimensions : [];

  const rubric: Rubric = {
    id: uuidv4(),
    name,
    description: optStr(args, "description") ?? "",
    dimensions: rawDimensions.map((d: unknown) => {
      const dim = d as Record<string, unknown>;
      return {
        name: String(dim.name ?? ""),
        description: String(dim.description ?? ""),
        weight: Number(dim.weight ?? 3),
        passCriteria: String(dim.pass_criteria ?? ""),
        failCriteria: String(dim.fail_criteria ?? ""),
      };
    }),
    createdAt: new Date().toISOString(),
  };

  storage.saveRubric(rubric);
  return json({
    id: rubric.id,
    name: rubric.name,
    dimensions: rubric.dimensions.length,
    note: "Saved to legacy storage. Use save_test_case with a summary_config_name for new work.",
  });
}

export async function list_rubrics(_args: Args) {
  return json(
    storage.listRubrics().map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      dimensions: r.dimensions.map((d) => d.name),
      createdAt: r.createdAt,
    })),
  );
}

export async function evaluate_summary_legacy(args: Args) {
  const rubricId = str(args, "rubric_id");
  const rubric = storage.getRubric(rubricId);
  if (!rubric) throw new Error(`Rubric not found: ${rubricId}`);

  return json({
    instruction:
      "Evaluate the summary below against each rubric dimension. For each dimension, determine whether it PASSED or FAILED based on the criteria, provide a score (0.0–1.0), and give brief reasoning. Then call save_test_run with the results.",
    rubric: {
      id: rubric.id,
      name: rubric.name,
      dimensions: rubric.dimensions.map((d) => ({
        name: d.name,
        description: d.description,
        weight: d.weight,
        pass_criteria: d.passCriteria,
        fail_criteria: d.failCriteria,
      })),
    },
    transcript: str(args, "transcript_text"),
    summary: str(args, "summary_text"),
    score_template: rubric.dimensions.map((d) => ({
      dimension: d.name,
      passed: null,
      score: null,
      reasoning: "",
    })),
  });
}

// ─── Legacy: Test runs (kept for backward compatibility) ──────────────────────

const pendingRuns = new Map<string, Omit<TestRun, "results" | "aggregatePassRate">>();

export async function run_test_suite_legacy(args: Args) {
  const prompt = str(args, "prompt");
  const transcriptIds = strArr(args, "transcript_ids");
  const rubricId = str(args, "rubric_id");
  const label = optStr(args, "label") ?? `Run ${new Date().toISOString()}`;
  const language = optStr(args, "language") ?? "en-au";

  const rubric = storage.getRubric(rubricId);
  if (!rubric) throw new Error(`Rubric not found: ${rubricId}`);

  let setting: SummarySetting;
  if (args.summary_setting_id) {
    setting = await getSummarySetting(str(args, "summary_setting_id"));
    setting.prompt = prompt;
  } else {
    setting = {
      name: label,
      prompt,
      language,
      summaryType: "Concise",
      format: "TextBlock",
      maskPII: { all: false },
      predefinedInsights: [],
      settingType: "Prompt",
      serviceType: "Native",
      timeoutDuration: 20,
    };
  }

  return json({
    instruction:
      "NOTE: run_test_suite_legacy uses the old flat storage. Use run_test_suite with a summary_config_name and test_set_name for new work.",
    rubric_id: rubricId,
    transcript_ids: transcriptIds,
    prompt_used: prompt,
  });
}

export async function save_test_run(args: Args) {
  const runId = str(args, "test_run_id");
  const rawResults = Array.isArray(args.results) ? args.results : [];
  const suggestedImprovements = optStr(args, "suggested_improvements");

  const pending = pendingRuns.get(runId);
  if (!pending) {
    throw new Error(
      `No pending test run found with id ${runId}. Use run_test_suite (new) or run_test_suite_legacy.`,
    );
  }

  const results: TranscriptResult[] = rawResults.map((r: unknown) => {
    const row = r as Record<string, unknown>;
    const tId = String(row.transcript_id ?? "");
    const stored = storage.getRubric(tId);
    const rawScores = Array.isArray(row.dimension_scores) ? row.dimension_scores : [];
    const dimensionScores = rawScores.map((s: unknown) => {
      const sc = s as Record<string, unknown>;
      const dimName = String(sc.dimension ?? "");
      if (sc.score === null) {
        return { dimension: dimName, score: null as null, na: true, passed: true, reasoning: String(sc.reasoning ?? "") };
      }
      return {
        dimension: dimName,
        passed: Boolean(sc.passed),
        score: Number(sc.score ?? 0),
        na: false,
        reasoning: String(sc.reasoning ?? ""),
      };
    });
    const scoredDims = dimensionScores.filter((d) => !d.na);
    const overallScore =
      scoredDims.length > 0
        ? scoredDims.reduce((sum, d) => sum + (d.score as number), 0) / scoredDims.length
        : 0;
    const overallPassed = scoredDims.length === 0 || scoredDims.every((d) => d.passed);
    return {
      transcriptId: tId,
      transcriptLabel: stored?.name ?? tId,
      summary: "",
      dimensionScores,
      overallPassed,
      overallScore,
    };
  });

  const aggregatePassRate =
    results.length > 0
      ? results.filter((r) => r.overallPassed).length / results.length
      : 0;

  const run: TestRun = {
    ...pending,
    results,
    aggregatePassRate,
    suggestedImprovements,
  };

  storage.saveTestRun(run);
  pendingRuns.delete(runId);

  return json({
    success: true,
    test_run_id: runId,
    aggregate_pass_rate: `${(aggregatePassRate * 100).toFixed(1)}%`,
  });
}

export async function list_test_runs(args: Args) {
  const runs = storage.listTestRuns(optStr(args, "summary_setting_id"));
  return json(
    runs.map((r) => ({
      id: r.id,
      label: r.label,
      prompt: r.summarySetting.prompt.slice(0, 100) + (r.summarySetting.prompt.length > 100 ? "..." : ""),
      rubricId: r.rubricId,
      transcriptCount: r.transcriptIds.length,
      passRate: `${(r.aggregatePassRate * 100).toFixed(1)}%`,
      promptVersion: r.promptVersion,
      createdAt: r.createdAt,
      note: "Legacy test run. Use list_eval_runs for new-style results.",
    })),
  );
}

// ─── Pipeline guide ────────────────────────────────────────────────────────────

export async function get_pipeline_guide(_args: Args) {
  return { content: [{ type: "text" as const, text: FULL_PIPELINE_GUIDE }] };
}
