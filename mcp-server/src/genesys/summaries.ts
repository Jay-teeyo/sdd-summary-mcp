import { v4 as uuidv4 } from "uuid";
import { genesys } from "./client.js";
import { getGenesysConfig } from "../config.js";
import { getUserToken, getBaseUrl } from "./auth.js";
import type { SummarySetting, PreviewSummaryResponse } from "../types.js";

// ─── Preview ──────────────────────────────────────────────────────────────────

/**
 * Build the summarySetting body fragment (fields only, no session/transcript).
 */
function buildSettingBody(setting: SummarySetting) {
  return {
    name: setting.name,
    language: setting.language,
    summaryType: setting.summaryType,
    format: setting.format,
    maskPII: setting.maskPII,
    predefinedInsights: setting.predefinedInsights,
    settingType: setting.settingType,
    prompt: setting.prompt,
    serviceType: setting.serviceType,
    timeoutDuration: setting.timeoutDuration,
  };
}

/**
 * Generate a summary preview via the Genesys preview API.
 *
 * When a user token is available (from the login flow) the result arrives via
 * a WebSocket notification channel — this is the only supported delivery mechanism
 * for the preview API.
 *
 * When running under client credentials only, the POST succeeds (204) but the
 * WebSocket notification channel cannot be used (no user-scoped topics), so
 * the function will return null and the caller should fall back to production
 * summaries via getExistingSummaries.
 */
export async function generatePreviewSummary(
  transcript: string,
  setting: SummarySetting,
  sessionId?: string,
): Promise<PreviewSummaryResponse | null> {
  const config = getGenesysConfig();
  if (!config) throw new Error("Genesys credentials not configured");

  const userToken = await getUserToken(config);
  if (!userToken) {
    // Fire the POST (returns 204) but we can't receive the result without a user token
    await genesys.post("/api/v2/conversations/summaries/preview", {
      summarySetting: buildSettingBody(setting),
      summaryPreviewSessionId: sessionId ?? uuidv4(),
      transcript,
    });
    return null;
  }

  return generatePreviewWithWebSocket(userToken, config.region, transcript, setting, sessionId);
}

/**
 * Full preview flow using user token + WebSocket notification:
 * 1. Create a notification channel
 * 2. Subscribe to the session topic via REST
 * 3. Connect WebSocket
 * 4. POST the preview request
 * 5. Receive the result notification
 */
async function generatePreviewWithWebSocket(
  userToken: string,
  region: string,
  transcript: string,
  setting: SummarySetting,
  sessionId?: string,
): Promise<PreviewSummaryResponse> {
  const base = getBaseUrl(region);
  const sid = sessionId ?? uuidv4();
  const h = {
    Authorization: `Bearer ${userToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // 0. Resolve user ID
  const meResp = await fetch(`${base}/api/v2/users/me`, { headers: h });
  if (!meResp.ok) throw new Error(`Failed to resolve user ID: ${meResp.status}`);
  const me = (await meResp.json()) as { id: string };

  // 1. Create notification channel
  const chanResp = await fetch(`${base}/api/v2/notifications/channels`, {
    method: "POST",
    headers: h,
    body: "{}",
  });
  if (!chanResp.ok) throw new Error(`Failed to create notification channel: ${chanResp.status}`);
  const chan = (await chanResp.json()) as { id: string; connectUri: string };

  // 2. Subscribe via REST — correct topic from /api/v2/notifications/availabletopics
  const topic = `v2.users.${me.id}.conversations.summaries.settings.preview`;
  const subResp = await fetch(
    `${base}/api/v2/notifications/channels/${chan.id}/subscriptions`,
    { method: "POST", headers: h, body: JSON.stringify([{ id: topic }]) },
  );
  if (!subResp.ok) {
    const body = await subResp.text();
    throw new Error(`Failed to subscribe to preview topic: ${subResp.status} — ${body}`);
  }

  // 3. Connect WebSocket, POST the preview request, wait for notification
  return new Promise<PreviewSummaryResponse>((resolve, reject) => {
    const ws = new WebSocket(chan.connectUri);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Preview timed out after ${setting.timeoutDuration + 10}s`));
    }, (setting.timeoutDuration + 10) * 1000);

    ws.onopen = async () => {
      // 4. POST preview request
      const post = await fetch(`${base}/api/v2/conversations/summaries/preview`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({
          summarySetting: buildSettingBody(setting),
          summaryPreviewSessionId: sid,
          transcript,
        }),
      });
      if (!post.ok) {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(`Preview POST failed: ${post.status}`));
      }
    };

    ws.onmessage = (event: MessageEvent) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data as string) as Record<string, unknown>;
      } catch {
        return;
      }

      // 5. Capture the summary notification — match our session ID
      if (
        typeof msg.topicName === "string" &&
        msg.topicName.includes("summaries")
      ) {
        const eventBody = (msg.eventBody ?? {}) as Record<string, unknown>;
        // Filter to our session if the body contains a session ID field
        const bodySessionId =
          eventBody.summaryPreviewSessionId ??
          eventBody.sessionId ??
          eventBody.id;
        if (bodySessionId && bodySessionId !== sid) return; // not ours

        clearTimeout(timeout);
        ws.close();
        resolve(eventBody as PreviewSummaryResponse);
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket error while waiting for preview result"));
    };
  });
}

/**
 * Extract the generated summary text from the preview API response.
 */
export function extractSummaryText(response: PreviewSummaryResponse): string {
  // Confirmed response shape: { summary: { text: "...", score: 0.6 } }
  const summaryObj = response.summary as Record<string, unknown> | string | undefined;
  if (summaryObj && typeof summaryObj === "object" && typeof summaryObj.text === "string") {
    return summaryObj.text;
  }
  if (typeof summaryObj === "string" && summaryObj) return summaryObj;
  if (typeof response.summaryText === "string" && response.summaryText) return response.summaryText;
  if (Array.isArray(response.insights)) {
    return response.insights.map((i) => `${i.type}: ${i.content}`).join("\n\n");
  }
  return JSON.stringify(response, null, 2);
}

// ─── Summary settings ─────────────────────────────────────────────────────────

interface SummarySettingsListResponse {
  entities?: (SummarySetting & { id: string })[];
  total?: number;
  [key: string]: unknown;
}

export async function listSummarySettings(): Promise<(SummarySetting & { id: string })[]> {
  const resp = await genesys.get<SummarySettingsListResponse>(
    "/api/v2/conversations/summaries/settings",
  );
  return resp.entities ?? [];
}

export async function getSummarySetting(id: string): Promise<SummarySetting & { id: string }> {
  return genesys.get<SummarySetting & { id: string }>(
    `/api/v2/conversations/summaries/settings/${id}`,
  );
}

export async function createSummarySetting(
  setting: Omit<SummarySetting, "id">,
): Promise<SummarySetting & { id: string }> {
  return genesys.post<SummarySetting & { id: string }>(
    "/api/v2/conversations/summaries/settings",
    setting,
  );
}

export async function updateSummarySetting(
  id: string,
  setting: Partial<SummarySetting>,
): Promise<SummarySetting & { id: string }> {
  return genesys.put<SummarySetting & { id: string }>(
    `/api/v2/conversations/summaries/settings/${id}`,
    setting,
  );
}

// ─── Existing summaries from Speech & Text Analytics ─────────────────────────

export async function getExistingSummaries(
  conversationId: string,
): Promise<unknown> {
  return genesys.get(`/api/v2/speechandtextanalytics/conversations/${conversationId}/summaries`);
}
