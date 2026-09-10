#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { TOOL_DEFINITIONS } from "./tools/definitions.js";
import * as handlers from "./tools/handlers.js";
import { SERVER_INSTRUCTIONS } from "./pipelineGuide.js";

const server = new Server(
  { name: "sdd-summary-mcp", version: "2.0.0" },
  { capabilities: { tools: {} }, instructions: SERVER_INSTRUCTIONS },
);

// ─── List tools ───────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOL_DEFINITIONS,
}));

// ─── Dispatch tool calls ──────────────────────────────────────────────────────

type HandlerFn = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: "text"; text: string }>;
}>;

const toolHandlers: Record<string, HandlerFn> = {
  // Auth
  connect: handlers.connect,
  configure_credentials: handlers.configure_credentials,
  login: handlers.login,
  complete_login: handlers.complete_login,
  logout: handlers.logout,
  smoke_test_auth: handlers.smoke_test_auth,

  // Conversations
  search_conversations: handlers.search_conversations,

  // Transcripts (lifecycle-scoped)
  fetch_transcript: handlers.fetch_transcript,
  fetch_transcripts_bulk: handlers.fetch_transcripts_bulk,
  fetch_existing_summaries_bulk: handlers.fetch_existing_summaries_bulk,
  store_transcript: handlers.store_transcript,
  list_transcripts: handlers.list_transcripts,

  // Summary config
  list_summary_settings: handlers.list_summary_settings,
  get_summary_setting: handlers.get_summary_setting,
  create_summary_setting: handlers.create_summary_setting,
  update_summary_setting: handlers.update_summary_setting,

  // Summary generation
  generate_preview_summary: handlers.generate_preview_summary,
  get_existing_summaries: handlers.get_existing_summaries,

  // Test cases
  generate_test_case: handlers.generate_test_case,
  save_test_case: handlers.save_test_case,
  list_test_cases: handlers.list_test_cases,

  // Test sets
  save_test_set: handlers.save_test_set,
  list_test_sets: handlers.list_test_sets,

  // Evaluate
  evaluate_summary: handlers.evaluate_summary,

  // Eval runs (legacy — single-agent, generates new previews)
  run_test_suite: handlers.run_test_suite,
  save_eval_run: handlers.save_eval_run,
  list_eval_runs: handlers.list_eval_runs,

  // Eval runs (parallel / stateless — subagent-compatible)
  prepare_prompt_test: handlers.prepare_prompt_test,
  start_eval_run: handlers.start_eval_run,
  submit_eval_scores: handlers.submit_eval_scores,
  finalize_eval_run: handlers.finalize_eval_run,

  // Version history
  save_version: handlers.save_version,
  list_versions: handlers.list_versions,

  // Post-eval improvement recommendations
  save_improvement_recommendations: handlers.save_improvement_recommendations,

  // Reporting
  generate_improvements_dashboard: handlers.generate_improvements_dashboard,
  generate_eval_run_dashboard: handlers.generate_eval_run_dashboard,
  generate_dashboard: handlers.generate_dashboard,

  // Copilot
  list_assistants: handlers.list_assistants,
  get_copilot_config: handlers.get_copilot_config,
  update_copilot_config: handlers.update_copilot_config,
  build_interaction_filter: handlers.build_interaction_filter,

  // Pipeline guide
  get_pipeline_guide: handlers.get_pipeline_guide,
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  const handler = toolHandlers[name];
  if (!handler) {
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }
  try {
    return await handler(args as Record<string, unknown>);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SDD Summary MCP server running (stdio)");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
