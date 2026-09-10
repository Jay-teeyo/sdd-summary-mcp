import { genesys } from "./client.js";

export interface Assistant {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface AssistantsResponse {
  entities?: Assistant[];
  total?: number;
  [key: string]: unknown;
}

export interface AssistantQueue {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface AssistantQueuesResponse {
  entities?: AssistantQueue[];
  nextUri?: string;
  [key: string]: unknown;
}

export interface SummarySettingRef {
  id: string;
  selfUri?: string;
}

export interface CopilotConfig {
  enabled?: boolean;
  summaryGenerationConfig?: {
    enabled?: boolean;
    /** Single summary setting (most common) */
    summarySetting?: SummarySettingRef;
    /** Multi-language: array of settings, each with a language code */
    summarySettings?: Array<SummarySettingRef & { language?: string }>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * GET /api/v2/assistants returns 500 once a response carries more than roughly
 * 97 entities, despite the documented `pageSize` maximum of 200. Observed in an
 * org with a large assistant inventory: `pageSize` above 97 unfiltered failed,
 * while the same request filtered to the Copilot tier succeeded.
 *
 * Both settings below are needed, for different reasons.
 *
 * `tier` is what this server actually wants — every assistant it deals with is
 * an Agent Copilot — and it also keeps the result set small in mixed-tier orgs.
 *
 * The page size is the part that makes it durable. `tier` alone only avoids the
 * fault while an org has fewer than ~97 copilots; at 98 the 500 would return,
 * with the org having done nothing wrong. Requesting well under the threshold
 * removes the dependency on org size, at the cost of one extra round trip per
 * 50 assistants.
 */
export const ASSISTANT_TIER = "Copilot";
const ASSISTANTS_PAGE_SIZE = 50;

export async function listAssistants(): Promise<Assistant[]> {
  const all: Assistant[] = [];
  let pageNumber = 1;

  while (true) {
    const params = new URLSearchParams({
      pageSize: String(ASSISTANTS_PAGE_SIZE),
      pageNumber: String(pageNumber),
      tier: ASSISTANT_TIER,
    });

    const resp = await genesys.get<AssistantsResponse>(`/api/v2/assistants?${params}`);
    const entities = resp.entities ?? [];
    all.push(...entities);

    const total = (resp as { total?: number }).total ?? 0;
    if (all.length >= total || entities.length === 0) break;
    pageNumber++;
  }

  return all;
}

export async function getCopilotConfig(assistantId: string): Promise<CopilotConfig> {
  return genesys.get<CopilotConfig>(`/api/v2/assistants/${assistantId}/copilot`);
}

export async function updateCopilotConfig(
  assistantId: string,
  config: unknown,
): Promise<unknown> {
  return genesys.put(`/api/v2/assistants/${assistantId}/copilot`, config);
}

/**
 * Returns the queues directly associated with this assistant via the
 * dedicated assistants queues endpoint: GET /api/v2/assistants/{assistantId}/queues.
 * Uses cursor-based pagination (after/nextUri).
 */
export async function getAssistantQueues(assistantId: string): Promise<AssistantQueue[]> {
  const allIds: string[] = [];
  let after: string | undefined;
  const pageSize = 200;

  // Step 1: Collect all queue IDs from the direct association endpoint
  while (true) {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (after) params.set("after", after);

    const resp = await genesys.get<AssistantQueuesResponse>(
      `/api/v2/assistants/${assistantId}/queues?${params}`,
    );
    const entities = resp.entities ?? [];
    for (const e of entities) {
      if (e.id) allIds.push(e.id);
    }

    if (!resp.nextUri || entities.length === 0) break;

    const afterMatch = resp.nextUri.match(/[?&]after=([^&]+)/);
    if (!afterMatch) break;
    after = decodeURIComponent(afterMatch[1]);
  }

  if (allIds.length === 0) return [];

  // Step 2: Resolve queue names via the routing queues API (filter by ID)
  // The routing API accepts up to 100 IDs per request
  const named: AssistantQueue[] = [];
  const chunkSize = 100;

  for (let i = 0; i < allIds.length; i += chunkSize) {
    const chunk = allIds.slice(i, i + chunkSize);
    const params = new URLSearchParams({ pageSize: String(chunk.length) });
    chunk.forEach((id) => params.append("id", id));

    const resp = await genesys.get<{ entities?: AssistantQueue[] }>(
      `/api/v2/routing/queues?${params}`,
    );
    named.push(...(resp.entities ?? []));
  }

  // Return in the original order, falling back to id-only entries for any unresolved queues
  const nameMap = new Map(named.map((q) => [q.id, q.name]));
  return allIds.map((id) => ({ id, name: nameMap.get(id) ?? id }));
}
