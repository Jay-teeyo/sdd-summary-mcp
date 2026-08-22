import { genesys } from "./client.js";
import type { S3Transcript, S3TranscriptPhrase } from "../types.js";

// ─── Step 1: resolve customer communication ID from conversation details ──────

interface AnalyticsConversationDetails {
  participants?: Array<{
    participantId: string;
    purpose?: string;
    sessions?: Array<{ sessionId: string; mediaType?: string }>;
  }>;
  [key: string]: unknown;
}

/**
 * Fetch single-conversation analytics details and return the customer session ID
 * (communicationId). This is needed before fetching the transcript URL.
 *
 * Endpoint: GET /api/v2/analytics/conversations/{conversationId}/details
 */
export async function resolveCustomerCommunicationId(conversationId: string): Promise<string> {
  const resp = await genesys.get<AnalyticsConversationDetails>(
    `/api/v2/analytics/conversations/${conversationId}/details`,
  );

  // Prefer the customer/external participant's session; fall back to the first session found
  for (const participant of resp.participants ?? []) {
    if (participant.purpose === "customer" || participant.purpose === "external") {
      const sessionId = participant.sessions?.[0]?.sessionId;
      if (sessionId) return sessionId;
    }
  }

  // Fallback: first available session from any participant
  for (const participant of resp.participants ?? []) {
    const sessionId = participant.sessions?.[0]?.sessionId;
    if (sessionId) return sessionId;
  }

  throw new Error(
    `Could not find a communication ID for conversation ${conversationId}. Check that the conversation exists and has a transcript.`,
  );
}

// ─── Step 2: get pre-signed S3 URL ───────────────────────────────────────────

interface TranscriptUrlsResponse {
  urls?: Array<{
    url: string;
    recording?: { id: string; selfUri: string };
  }>;
  conversation?: { id: string };
  communicationId?: string;
  [key: string]: unknown;
}

/**
 * Fetch the list of pre-signed S3 transcript URLs for a communication.
 * Returns the first (primary) URL.
 *
 * Endpoint: GET /api/v2/speechandtextanalytics/conversations/{id}/communications/{commId}/transcriptUrls
 */
export async function getTranscriptUrl(
  conversationId: string,
  communicationId: string,
): Promise<string> {
  const resp = await genesys.get<TranscriptUrlsResponse>(
    `/api/v2/speechandtextanalytics/conversations/${conversationId}/communications/${communicationId}/transcriptUrls`,
  );

  const url = resp.urls?.[0]?.url;
  if (!url) {
    throw new Error(
      `No transcript URL returned for conversation ${conversationId} communication ${communicationId}. ` +
      `The conversation may not have a transcript (no voice recording, or transcription not enabled).`,
    );
  }
  return url;
}

// ─── Step 3: download JSON transcript from S3 ────────────────────────────────

/**
 * Download the JSON transcript from the pre-signed S3 URL.
 * No authentication required — the URL is pre-signed.
 */
export async function downloadTranscriptFromS3(url: string): Promise<S3Transcript> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to download transcript from S3: ${resp.status} ${resp.statusText}`);
  }
  return resp.json() as Promise<S3Transcript>;
}

// ─── Step 4: transform to plain text ─────────────────────────────────────────

/**
 * Map a Genesys participantPurpose to a readable speaker label.
 * The S3 transcript uses "internal" (agent) and "external" (customer).
 */
function purposeToLabel(purpose: string | undefined): string {
  switch ((purpose ?? "").toLowerCase()) {
    case "internal":
    case "agent":
    case "user":
      return "Agent";
    case "external":
    case "customer":
      return "Customer";
    case "bot":
    case "ivr":
    case "acd":
      return "Bot";
    case "api":
    case "system":
      return "Action";
    default:
      return purpose ? purpose.charAt(0).toUpperCase() + purpose.slice(1) : "Unknown";
  }
}

/**
 * Transform a Genesys S3 transcript JSON into the plain-text "Speaker: utterance"
 * format expected by the preview API.
 *
 * S3 transcript structure (confirmed from browser trace):
 *   { transcripts: [{ phrases: [{ participantPurpose, decoratedText, text }] }] }
 *
 * - Uses decoratedText (punctuated) where available, falls back to text.
 * - participantPurpose is "internal" (agent) or "external" (customer).
 */
export function transformTranscript(raw: S3Transcript): string {
  const lines: string[] = [];

  // Primary format: transcripts[].phrases[] (confirmed structure from API trace)
  if (Array.isArray(raw.transcripts) && raw.transcripts.length > 0) {
    for (const transcriptBlock of raw.transcripts) {
      const phrases = (transcriptBlock as Record<string, unknown>).phrases as S3TranscriptPhrase[] | undefined;
      if (!phrases) continue;
      for (const phrase of phrases) {
        const label = purposeToLabel(phrase.participantPurpose);
        // Prefer decoratedText (has punctuation); fall back to plain text
        const rawText = (phrase as unknown as Record<string, string>).decoratedText ?? phrase.text;
        const text = rawText?.trim();
        if (text) lines.push(`${label}: ${text}`);
      }
    }
    if (lines.length > 0) return lines.join("\n");
  }

  // Fallback: top-level phrases array
  if (Array.isArray(raw.phrases) && raw.phrases.length > 0) {
    for (const phrase of raw.phrases) {
      const label = purposeToLabel(phrase.participantPurpose);
      const rawText = (phrase as unknown as Record<string, string>).decoratedText ?? phrase.text;
      const text = rawText?.trim();
      if (text) lines.push(`${label}: ${text}`);
    }
    return lines.join("\n");
  }

  throw new Error(
    "Unrecognised transcript format: expected transcripts[].phrases[] structure from Genesys S3.",
  );
}

/**
 * Full pipeline: fetch URL → download → transform.
 */
export async function fetchAndTransformTranscript(
  conversationId: string,
  communicationId: string,
): Promise<{ plainText: string; rawJson: S3Transcript }> {
  const url = await getTranscriptUrl(conversationId, communicationId);
  const rawJson = await downloadTranscriptFromS3(url);
  const plainText = transformTranscript(rawJson);
  return { plainText, rawJson };
}

// ─── Messaging transcript (digital / web-chat / SMS / WhatsApp) ──────────────

interface ConversationMessagesResponse {
  participants?: Array<{
    purpose?: string;
    messages?: Array<{
      messages?: Array<{
        messageId?: string;
        messageTime?: string;
      }>;
    }>;
  }>;
  [key: string]: unknown;
}

interface NormalizedMessage {
  id?: string;
  messageTime?: string;
  normalizedMessage?: {
    text?: string;
    content?: unknown[];
    [key: string]: unknown;
  };
  textBody?: string;
  [key: string]: unknown;
}

interface MessageBulkResponse {
  entities?: NormalizedMessage[];
  [key: string]: unknown;
}

/**
 * Fetch a messaging conversation's transcript using the Conversations Messages API.
 *
 * Flow:
 *   1. GET /api/v2/conversations/messages/{id} → collect (messageId, purpose) pairs
 *   2. POST /api/v2/conversations/messages/{id}/messages/bulk → get full text
 *   3. Sort by messageTime and format as "Speaker: text"
 */
export async function fetchMessagingTranscript(conversationId: string): Promise<string> {
  // Step 1: get conversation structure to collect message IDs + sender purpose
  const conv = await genesys.get<ConversationMessagesResponse>(
    `/api/v2/conversations/messages/${conversationId}`,
  );

  // Build a map of messageId → purpose (customer/agent/etc.)
  const purposeByMessageId = new Map<string, string>();
  const orderedMessages: Array<{ messageId: string; messageTime?: string; purpose?: string }> = [];

  for (const participant of conv.participants ?? []) {
    const purpose = participant.purpose ?? "unknown";
    for (const comm of participant.messages ?? []) {
      for (const msg of comm.messages ?? []) {
        if (msg.messageId) {
          purposeByMessageId.set(msg.messageId, purpose);
          orderedMessages.push({
            messageId: msg.messageId,
            messageTime: msg.messageTime,
            purpose,
          });
        }
      }
    }
  }

  if (orderedMessages.length === 0) {
    throw new Error(`No messages found in conversation ${conversationId}`);
  }

  // Step 2: bulk-fetch full message content (up to 100 at a time)
  const allMessages: NormalizedMessage[] = [];
  const chunkSize = 100;
  const ids = orderedMessages.map((m) => m.messageId);

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const resp = await genesys.post<MessageBulkResponse>(
      `/api/v2/conversations/messages/${conversationId}/messages/bulk?useNormalizedMessage=true`,
      chunk,
    );
    allMessages.push(...(resp.entities ?? []));
  }

  // Step 3: build a lookup by message ID then sort by time
  const contentById = new Map<string, NormalizedMessage>();
  for (const msg of allMessages) {
    if (msg.id) contentById.set(msg.id, msg);
  }

  // Sort original ordered list by messageTime
  const sorted = [...orderedMessages].sort((a, b) => {
    if (!a.messageTime) return 1;
    if (!b.messageTime) return -1;
    return a.messageTime.localeCompare(b.messageTime);
  });

  // Step 4: format as "Speaker: text"
  const lines: string[] = [];
  for (const entry of sorted) {
    const full = contentById.get(entry.messageId);
    const text =
      full?.normalizedMessage?.text ??
      full?.textBody ??
      "";
    if (!text?.trim()) continue;

    const label = purposeToLabel(entry.purpose);
    lines.push(`${label}: ${text.trim()}`);
  }

  if (lines.length === 0) {
    throw new Error(`No text content found in messaging conversation ${conversationId}`);
  }

  return lines.join("\n");
}

/**
 * Validate that a string is already in "Speaker: utterance" format.
 * Returns the normalised string (trims whitespace, normalises line endings).
 */
export function normaliseManualTranscript(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");
}
