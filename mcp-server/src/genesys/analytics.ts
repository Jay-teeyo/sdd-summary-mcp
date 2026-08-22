import { genesys } from "./client.js";
import type { ConversationSummary } from "../types.js";

interface AnalyticsConversation {
  conversationId: string;
  conversationStart?: string;
  conversationEnd?: string;
  participants?: Array<{
    participantId: string;
    purpose?: string;
    sessions?: Array<{
      sessionId: string;
      mediaType?: string;
      direction?: string;
      segments?: Array<{ segmentType?: string; wrapUpCode?: string }>;
    }>;
  }>;
  originatingDirection?: string;
  divisionIds?: string[];
  [key: string]: unknown;
}

interface AnalyticsQueryResponse {
  conversations?: AnalyticsConversation[];
  totalHits?: number;
  pageCount?: number;
  cursor?: string;
}

export interface ConversationSearchParams {
  dateFrom: string;  // ISO 8601
  dateTo: string;    // ISO 8601
  queueIds?: string[];
  wrapUpCodes?: string[];
  minDurationSec?: number;
  maxDurationSec?: number;
  maxResults?: number;
  /** Media types to exclude (e.g. ["email"]). Applied client-side after results are returned. */
  excludeMediaTypes?: string[];
  /** Media types to include — if set, only conversations with these types are returned (OR filter). */
  includeMediaTypes?: string[];
}

export async function searchConversations(
  params: ConversationSearchParams,
): Promise<ConversationSummary[]> {
  const filters: unknown[] = [];

  if (params.queueIds?.length) {
    filters.push({
      type: "or",
      predicates: params.queueIds.map((id) => ({
        type: "dimension",
        dimension: "queueId",
        operator: "matches",
        value: id,
      })),
    });
  }

  if (params.wrapUpCodes?.length) {
    filters.push({
      type: "or",
      predicates: params.wrapUpCodes.map((code) => ({
        type: "dimension",
        dimension: "wrapUpCode",
        operator: "matches",
        value: code,
      })),
    });
  }

  // Include only specified media types — OR filter across allowed types
  if (params.includeMediaTypes?.length) {
    filters.push({
      type: "or",
      predicates: params.includeMediaTypes.map((t) => ({
        type: "dimension",
        dimension: "mediaType",
        operator: "matches",
        value: t,
      })),
    });
  }

  const body = {
    interval: `${params.dateFrom}/${params.dateTo}`,
    order: "desc",
    orderBy: "conversationStart",
    paging: { pageSize: Math.min(params.maxResults ?? 25, 100), pageNumber: 1 },
    segmentFilters: filters.length ? filters : undefined,
  };

  const resp = await genesys.post<AnalyticsQueryResponse>(
    "/api/v2/analytics/conversations/details/query",
    body,
  );

  return (resp.conversations ?? []).map((c) => {
    const communications: ConversationSummary["communications"] = [];
    for (const p of c.participants ?? []) {
      for (const s of p.sessions ?? []) {
        communications.push({
          communicationId: s.sessionId,
          type: s.mediaType ?? "unknown",
          direction: s.direction,
        });
      }
    }

    return {
      conversationId: c.conversationId,
      startTime: c.conversationStart ?? "",
      endTime: c.conversationEnd,
      communications,
    };
  });
}
