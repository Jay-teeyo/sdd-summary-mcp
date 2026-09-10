import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const TOOL_DEFINITIONS: Tool[] = [
  // ─── Pipeline guide ─────────────────────────────────────────────────────────
  {
    name: "get_pipeline_guide",
    description:
      "Returns the complete SDD Summary pipeline reference guide as markdown. " +
      "Call this at the start of a session to get the full workflow documentation: " +
      "pipeline step order, authentication, transcript fetching, evaluation modes, " +
      "version management rules, deployment gate, dashboard rules, rate limiting notes, " +
      "folder structure, and Genesys API facts. " +
      "The server also surfaces a concise summary automatically via the MCP handshake — " +
      "call this tool when you need the full details for any step.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },

  // ─── Auth ───────────────────────────────────────────────────────────────────
  {
    name: "connect",
    description:
      "Guided setup for connecting to a Genesys Cloud org — use this when starting fresh or switching environments. " +
      "Call with no arguments to be prompted for what you need. " +
      "Call with authorization_url (from Genesys Admin → Integrations → OAuth → your client) to parse credentials, " +
      "start the browser login, and receive step-by-step instructions. " +
      "After logging in via the browser, call complete_login() to finish — it exchanges the token and runs a scope check automatically.",
    inputSchema: {
      type: "object",
      properties: {
        authorization_url: {
          type: "string",
          description:
            "URL from your Genesys OAuth client page. Two formats accepted:\n" +
            "  • https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/{client_id}\n" +
            "  • https://login.{your-region}/oauth/authorize?client_id={client_id}",
        },
      },
      required: [],
    },
  },
  {
    name: "configure_credentials",
    description:
      "Store Genesys Cloud OAuth2 credentials. client_secret is only required for machine-to-machine (client credentials) auth. " +
      "For user login (recommended), set client_id and region, then call the login tool. " +
      "If login fails with an incorrect URL, also provide login_url — copy it from your OAuth client's Authorization URL in Genesys Admin (Admin → Integrations → OAuth → your client).",
    inputSchema: {
      type: "object",
      properties: {
        client_id: { type: "string", description: "OAuth2 client ID from Genesys Admin" },
        client_secret: {
          type: "string",
          description: "OAuth2 client secret — only needed for client credentials (machine) auth. Omit when using user login.",
        },
        region: {
          type: "string",
          description: 'Genesys Cloud region domain, e.g. "mypurecloud.com.au", "mypurecloud.com", "mypurecloud.ie"',
        },
        login_url: {
          type: "string",
          description:
            "Override the login base URL (default: https://login.{region}). " +
            "Provide this if login fails due to a wrong login domain. " +
            "Copy from Genesys Admin → Integrations → OAuth → your client — the Authorization URL shown there (use only the base, e.g. 'https://login.{your-region}', without /oauth/authorize).",
        },
      },
      required: ["client_id", "region"],
    },
  },
  {
    name: "login",
    description:
      "PIPELINE STEP 1 of 4. Start the Genesys Cloud login flow (OAuth2 Authorization Code + PKCE). " +
      "FIRST LOGIN: provide authorization_url — the full URL from the 'Authorization URL' field at the bottom of " +
      "Genesys Admin → IT and Integrations → OAuth → your client. The client_id, region, and login domain are " +
      "all extracted from it automatically. It is stored for future sessions. " +
      "SUBSEQUENT LOGINS: call login() with no arguments — the stored URL is reused automatically. " +
      "AFTER BROWSER LOGIN: call complete_login() to exchange the code for a token. " +
      "Two URL formats accepted: the apps.* admin deep-link or the login.* OAuth authorize URL.",
    inputSchema: {
      type: "object",
      properties: {
        authorization_url: {
          type: "string",
          description:
            "URL from your Genesys OAuth client page. Two formats accepted:\n" +
            "  • https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/{client_id}\n" +
            "  • https://login.{your-region}/oauth/authorize?client_id={client_id}\n" +
            "Find it at Genesys Admin → Integrations → OAuth → your client.",
        },
      },
      required: [],
    },
  },
  {
    name: "complete_login",
    description:
      "PIPELINE STEP 1 of 4 (continued). Complete the Genesys Cloud login flow. " +
      "Call this AFTER login() has opened the browser and the user has seen 'Logged in to Genesys Cloud ✓'. " +
      "Exchanges the authorization code for a user token, stores it, and runs the 7-scope verification automatically. " +
      "NEXT STEP: if 8/8 scopes pass, call build_interaction_filter(copilot_name=...) to set up the working directory.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "logout",
    description:
      "Clear the stored Genesys user token. The server will fall back to client credentials on the next request.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "smoke_test_auth",
    description:
      "Verify all 8 required Genesys Cloud OAuth scopes are active: " +
      "ai-studio, analytics, assistants, conversations, notifications, routing:readonly, " +
      "speech-and-text-analytics:readonly, users:readonly. " +
      "Call this after login/complete_login if you see unexpected 403 errors, or after adding scopes to your OAuth client. " +
      "complete_login() runs this automatically — only call manually if troubleshooting. " +
      "See docs/oauth-setup.md for the full OAuth client setup guide.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // ─── Conversations ──────────────────────────────────────────────────────────
  {
    name: "search_conversations",
    description:
      "Search for Genesys Cloud conversations matching the given filters. Returns conversation IDs and their communication IDs (needed for fetch_transcript). Use this to find suitable test transcripts.",
    inputSchema: {
      type: "object",
      properties: {
        date_from: { type: "string", description: "Start of date range (ISO 8601, e.g. 2026-08-01T00:00:00Z)" },
        date_to: { type: "string", description: "End of date range (ISO 8601)" },
        queue_ids: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of queue IDs to filter by",
        },
        wrap_up_codes: {
          type: "array",
          items: { type: "string" },
          description: "Optional wrap-up code names or IDs to filter by",
        },
        max_results: {
          type: "number",
          description: "Maximum number of results (default 25, max 100)",
        },
      },
      required: ["date_from", "date_to"],
    },
  },

  // ─── Transcripts (lifecycle-scoped) ─────────────────────────────────────────
  {
    name: "fetch_transcript",
    description:
      "Fetch a transcript from Genesys and store it under a summary configuration's transcript folder. " +
      "transcript_type 'static' is for control-group transcripts used consistently across test runs. " +
      "'dynamic' is for transcripts that will accumulate generated summaries and edited summaries over time.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration this transcript belongs to (e.g. 'Acme_Sandbox')",
        },
        conversation_id: { type: "string", description: "Genesys conversation ID" },
        transcript_type: {
          type: "string",
          enum: ["static", "dynamic"],
          description: "Where to store the transcript: 'static' for control group (default), 'dynamic' for working transcripts",
        },
        communication_id: {
          type: "string",
          description: "Optional communication ID. If omitted, auto-detected from conversation details.",
        },
        label: { type: "string", description: "Optional human-readable label for this transcript" },
      },
      required: ["summary_config_name", "conversation_id"],
    },
  },
  {
    name: "store_transcript",
    description:
      "Save a manually provided transcript under a summary configuration's transcript folder. " +
      "Use transcript_type 'static' for a permanent control-group transcript or 'dynamic' for one that will be worked on.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration this transcript belongs to",
        },
        transcript: {
          type: "string",
          description: "Transcript text in 'Speaker: utterance' format, one turn per line",
        },
        transcript_type: {
          type: "string",
          enum: ["static", "dynamic"],
          description: "Storage bucket: 'static' for control group (default), 'dynamic' for working transcripts",
        },
        label: { type: "string", description: "Human-readable label for this transcript" },
        conversation_id: {
          type: "string",
          description: "Optional Genesys conversation ID for reference",
        },
      },
      required: ["summary_config_name", "transcript"],
    },
  },
  {
    name: "list_transcripts",
    description: "List transcripts stored under a summary configuration. Optionally filter by type (static or dynamic).",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration",
        },
        transcript_type: {
          type: "string",
          enum: ["static", "dynamic"],
          description: "Optional: filter to only 'static' or 'dynamic' transcripts",
        },
      },
      required: ["summary_config_name"],
    },
  },

  // ─── Summary config ─────────────────────────────────────────────────────────
  {
    name: "list_summary_settings",
    description: "List all summary configurations defined in the Genesys org.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_summary_setting",
    description: "Fetch a specific summary configuration by ID, including its current prompt and all settings.",
    inputSchema: {
      type: "object",
      properties: {
        summary_setting_id: { type: "string", description: "The summary setting ID" },
      },
      required: ["summary_setting_id"],
    },
  },
  {
    name: "create_summary_setting",
    description: "Create a new summary configuration in Genesys.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name for this summary setting" },
        prompt: { type: "string", description: "The custom prompt text" },
        language: { type: "string", description: 'Language code, e.g. "en-au"', default: "en-au" },
        summary_type: {
          type: "string",
          enum: ["Concise", "Detailed", "Structured"],
          description: "Summary type (default: Concise)",
        },
        format: {
          type: "string",
          enum: ["TextBlock", "BulletPoints"],
          description: "Output format (default: TextBlock)",
        },
        predefined_insights: {
          type: "array",
          items: { type: "string", enum: ["ReasonForContact", "Resolution", "ActionItems"] },
          description: "Which predefined insights to include",
        },
        mask_pii: {
          type: "boolean",
          description: "Whether to mask all PII in the summary (default: false)",
        },
        timeout_duration: {
          type: "number",
          description: "Timeout in seconds (default: 20)",
        },
      },
      required: ["name", "prompt"],
    },
  },
  {
    name: "update_summary_setting",
    description:
      "⚠️  LIVE DEPLOYMENT — pushes a prompt change directly to Genesys. This goes live immediately and affects all real conversations.\n\n" +
      "NEVER call this tool unless the user has explicitly approved the change for deployment. " +
      "Do not call proactively, do not infer approval from context — wait for an explicit instruction.\n\n" +
      "REQUIRED STEPS BEFORE CALLING:\n" +
      "  1. Confirm the candidate version has been evaluated (start_eval_run → finalize_eval_run) and results reviewed.\n" +
      "  2. Call save_version first to snapshot the currently live prompt — this creates a rollback point.\n" +
      "  3. Only then call update_summary_setting with the approved prompt.\n" +
      "  4. After deploying, update the candidate version file in version-history/ from status='candidate' to status='deployed'.",
    inputSchema: {
      type: "object",
      properties: {
        summary_setting_id: { type: "string", description: "The summary setting ID to update" },
        prompt: { type: "string", description: "The new prompt text" },
        name: { type: "string", description: "Optional new name" },
      },
      required: ["summary_setting_id", "prompt"],
    },
  },

  // ─── Summary generation ──────────────────────────────────────────────────────
  {
    name: "generate_preview_summary",
    description:
      "Generate a preview summary using the Genesys preview API. Requires a transcript (by ID or inline text) and a summarySetting definition. No production configuration is changed. Returns the generated summary text. If using a stored transcript_id, also provide summary_config_name so the transcript can be found.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration (required when using transcript_id to locate the stored transcript)",
        },
        transcript_id: {
          type: "string",
          description: "ID of a locally stored transcript (from fetch_transcript or store_transcript)",
        },
        transcript_text: {
          type: "string",
          description: "Inline transcript text (use this OR transcript_id)",
        },
        summary_setting_id: {
          type: "string",
          description: "Use a saved Genesys summary setting as the config (use this OR inline fields)",
        },
        prompt: { type: "string", description: "Custom prompt to test (required if not using summary_setting_id)" },
        language: { type: "string", description: "Language code (default: en-au)" },
        summary_type: { type: "string", description: "Summary type (default: Concise)" },
        format: { type: "string", description: "Output format (default: TextBlock)" },
        predefined_insights: {
          type: "array",
          items: { type: "string" },
          description: "Predefined insights to include",
        },
      },
    },
  },
  {
    name: "get_existing_summaries",
    description:
      "Retrieve summaries already generated by Genesys for a completed conversation (via Speech & Text Analytics API).",
    inputSchema: {
      type: "object",
      properties: {
        conversation_id: { type: "string", description: "Genesys conversation ID" },
      },
      required: ["conversation_id"],
    },
  },

  // ─── Test cases ──────────────────────────────────────────────────────────────
  {
    name: "generate_test_case",
    description:
      "Generate an evaluation test case (rubric) for a specific summary configuration, based on example transcripts and their ideal summaries. " +
      "Returns step-by-step authoring instructions and reference examples. " +
      "IMPORTANT: the returned instructions require the agent to reason about applicability_condition for every dimension before calling save_test_case. " +
      "If the agent is uncertain whether a dimension applies 'always' or only conditionally, it MUST stop and ask the user to clarify — never default to 'always' without being sure. " +
      "Only call save_test_case once all applicability_conditions are confirmed.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration this test case belongs to",
        },
        test_case_name: {
          type: "string",
          description: "Name for this test case (e.g. 'Order Not Resolved', 'Early Resolution')",
        },
        sample_transcript_ids: {
          type: "array",
          items: { type: "string" },
          description: "IDs of stored transcripts to base the test case on",
        },
        sample_summaries: {
          type: "array",
          items: { type: "string" },
          description: "Corresponding ideal summary texts (same order as sample_transcript_ids)",
        },
        focus_areas: {
          type: "array",
          items: { type: "string" },
          description: "Optional areas to emphasise, e.g. [\"accuracy\", \"brevity\", \"tone\"]",
        },
      },
      required: ["summary_config_name", "test_case_name", "sample_transcript_ids", "sample_summaries"],
    },
  },
  {
    name: "save_test_case",
    description:
      "Save an evaluation test case (rubric) to a summary configuration's test-cases folder. " +
      "Each test case is identified by its name and contains evaluation dimensions with pass/fail criteria. " +
      "REQUIRED: every dimension must have applicability_condition set. " +
      "Use 'always' for dimensions that apply to every transcript unconditionally. " +
      "Use a plain-English condition string for dimensions that only apply when a specific condition is true in the transcript or summary (e.g. 'Summary contains bullets.', 'Only applies when a third party participated.'). " +
      "Never call this tool with applicability_condition still set to 'always' for a dimension you are uncertain about — ask the user first.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration this test case belongs to",
        },
        name: { type: "string", description: "Test case name (used as the filename, e.g. 'Order Not Resolved')" },
        description: { type: "string", description: "What scenario this test case covers" },
        dimensions: {
          type: "array",
          description: "List of evaluation dimensions",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              weight: { type: "number", description: "Importance 1–5" },
              applicability_condition: {
                type: "string",
                description:
                  "When this dimension should be evaluated. Use \"always\" for dimensions that apply to every transcript. " +
                  "Use a plain-English condition for dimensions that only apply conditionally (e.g. \"Only applies when the call involves a third party\"). " +
                  "REQUIRED on every dimension — must always be set, never omitted. Evaluators will check this condition first: " +
                  "if the condition is not met for a transcript, they submit score: null (N/A) which is excluded from pass-rate calculations.",
              },
              pass_criteria: { type: "string" },
              fail_criteria: { type: "string" },
              pass_threshold: { type: "number", description: "Minimum score (0–1) to pass this dimension. Default 0.8." },
              requirement_ids: { type: "array", items: { type: "string" }, description: "Business requirement IDs this dimension validates, e.g. [\"BR-Acme_CallSummary-001\"]" },
            },
            required: ["name", "description", "weight", "applicability_condition", "pass_criteria", "fail_criteria"],
          },
        },
      },
      required: ["summary_config_name", "name", "dimensions"],
    },
  },
  {
    name: "list_test_cases",
    description: "List all test cases (evaluation rubrics) defined for a summary configuration.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration",
        },
      },
      required: ["summary_config_name"],
    },
  },

  // ─── Test sets ───────────────────────────────────────────────────────────────
  {
    name: "save_test_set",
    description:
      "Save a test set — a named collection of test cases and transcripts to run them against. " +
      "A test set acts as a playlist: it defines which test cases and transcripts are included in an evaluation run.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration this test set belongs to",
        },
        name: { type: "string", description: "Test set name (e.g. 'Core Scenarios', 'Edge Cases')" },
        description: { type: "string", description: "Optional description of this test set" },
        test_case_names: {
          type: "array",
          items: { type: "string" },
          description: "Names of test cases (from test-cases/) to include in this set",
        },
        transcript_ids: {
          type: "array",
          items: { type: "string" },
          description: "IDs of transcripts (from static/ or dynamic/) to evaluate against",
        },
      },
      required: ["summary_config_name", "name", "test_case_names", "transcript_ids"],
    },
  },
  {
    name: "list_test_sets",
    description: "List all test sets defined for a summary configuration.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration",
        },
      },
      required: ["summary_config_name"],
    },
  },

  // ─── Evaluate summary ────────────────────────────────────────────────────────
  {
    name: "evaluate_summary",
    description:
      "Prepare an evaluation request for a single summary against a named test case. Returns the transcript, summary, and test case dimensions formatted for the calling agent to score. After scoring, call save_eval_run to persist results.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration",
        },
        test_case_name: {
          type: "string",
          description: "Name of the test case to evaluate against",
        },
        summary_text: { type: "string", description: "The generated summary to evaluate" },
        transcript_text: {
          type: "string",
          description: "The transcript that produced the summary",
        },
      },
      required: ["summary_config_name", "test_case_name", "summary_text", "transcript_text"],
    },
  },

  // ─── Eval runs ───────────────────────────────────────────────────────────────
  {
    name: "run_test_suite",
    description:
      "Run a prompt against all transcripts and test cases defined in a test set, using the Genesys preview API. " +
      "Generates summaries for each transcript, then returns them for the calling agent to evaluate against each test case. " +
      "After evaluation, call save_eval_run to persist results to the eval-runs folder.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration to test",
        },
        test_set_name: {
          type: "string",
          description: "Name of the test set to run (defines which test cases and transcripts to use)",
        },
        prompt: { type: "string", description: "The prompt to test" },
        summary_setting_id: {
          type: "string",
          description: "Optional: base config on an existing Genesys summary setting (prompt field overrides its prompt)",
        },
        language: { type: "string", description: "Language code (default: en-au)" },
      },
      required: ["summary_config_name", "test_set_name", "prompt"],
    },
  },
  {
    name: "save_eval_run",
    description:
      "Persist a completed evaluation run with scores to the eval-runs folder. " +
      "Call this after evaluating the results returned by run_test_suite. " +
      "Results are stored as individual {test-case-name}.json files inside an incrementing run directory.",
    inputSchema: {
      type: "object",
      properties: {
        run_key: { type: "string", description: "The run_key returned by run_test_suite" },
        results: {
          type: "array",
          description: "Evaluation results — one entry per (transcript × test case) combination",
          items: {
            type: "object",
            properties: {
              transcript_id: { type: "string" },
              test_case_name: { type: "string" },
              dimension_scores: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    dimension: { type: "string" },
                    passed: { type: "boolean" },
                    score: { type: "number", description: "0.0 to 1.0" },
                    reasoning: { type: "string" },
                  },
                  required: ["dimension", "passed", "score", "reasoning"],
                },
              },
            },
            required: ["transcript_id", "test_case_name", "dimension_scores"],
          },
        },
        suggested_improvements: {
          type: "string",
          description: "Optional: the agent's suggested prompt improvements based on failing dimensions",
        },
      },
      required: ["run_key", "results"],
    },
  },
  // ─── Parallel / stateless eval run (subagent-compatible) ───────────────────
  {
    name: "prepare_prompt_test",
      description:
      "Pre-generates preview summaries for a prompt_test eval run and caches them to disk in small batches.\n\n" +
      "Because the Genesys preview API is called per-transcript, generating all summaries for a large test set " +
      "in a single start_eval_run call would exceed the MCP client timeout. " +
      "This tool solves that by generating a configurable number of summaries per call and writing them to a " +
      "local cache file. Call it repeatedly until complete=true, then call start_eval_run.\n\n" +
      "USAGE PATTERN:\n" +
      "  1. Call prepare_prompt_test(summary_config_name, test_set_name, version_number, batch_size=8) repeatedly\n" +
      "     until the response shows 'complete: YES'.\n" +
      "  2. Call start_eval_run(summary_config_name, test_set_name, mode='prompt_test', version_number) —\n" +
      "     it will read from the cache automatically, skipping re-generation.\n\n" +
      "RATE LIMIT — SAFE BATCH SIZE:\n" +
      "Each preview request creates a Genesys notification channel. Channel creation is burst-sensitive: " +
      "firing >= 15 concurrent requests reliably triggers 429 on channel creation. " +
      "Use batch_size=8 (default). Do not exceed 10 without expecting 429 recovery overhead.\n\n" +
      "The cache is stored at eval-runs/{testSetName}/.preview-cache-v{N}.json and is safe to interrupt and resume.\n" +
      "Pass clear_cache=true to discard any existing cache and start fresh.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string", description: "Summary configuration name" },
        test_set_name: { type: "string", description: "Test set to prepare previews for" },
        version_number: {
          type: "number",
          description: "Version number from version-history/ to use for preview generation.",
        },
        batch_size: {
          type: "number",
          description:
            "Number of summaries to generate per call (default 8, max 10 recommended). " +
            "Do not exceed 10 — the Genesys notification channel creation endpoint is burst-sensitive " +
            "and reliably returns 429 when >= 15 concurrent preview requests are fired. " +
            "batch_size=8 provides full parallel throughput within the safe burst threshold.",
        },
        language: {
          type: "string",
          description: "Language code for preview generation (default: en-au).",
        },
        clear_cache: {
          type: "boolean",
          description: "If true, discard any existing cache for this version and start fresh.",
        },
      },
      required: ["summary_config_name", "test_set_name", "version_number"],
    },
  },
  {
    name: "start_eval_run",
    description:
      "Prepare a parallel evaluation run against a test set.\n\n" +
      "TWO MODES:\n" +
      "  • mode='existing' (default) — evaluates existing production summaries already stored on each transcript. " +
      "No Genesys API calls. Fast and cheap. Use to measure current production quality.\n" +
      "  • mode='prompt_test' — generates new summaries via the Genesys preview API using a candidate prompt " +
      "and the transcripts already in transcripts/static/. Use to test a prompt change before deploying it.\n\n" +
      "VERSION TRACEABILITY — REQUIRED:\n" +
      "Always pass version_number when testing a versioned prompt. " +
      "This records which version file (e.g. summary-configuration-1.json) and its status (candidate/deployed) " +
      "against the run in _pending.json, and shows a version badge + the full prompt in the dashboard. " +
      "Do NOT copy-paste the prompt as an inline 'prompt' argument — use version_number instead. " +
      "For mode='existing', passing version_number records the deployed prompt for traceability even though no new summaries are generated.\n\n" +
      "CANDIDATE VERSIONS — MANDATORY:\n" +
      "A version with status='candidate' (local draft, not yet deployed to Genesys) MUST use mode='prompt_test'. " +
      "Never run mode='existing' for a candidate — existing mode measures summaries the live prompt generated, not the candidate.\n\n" +
      "AFTER THIS CALL:\n" +
      "Spawn one subagent per batch using model composer-2.5-fast. " +
      "Each subagent scores every dimension of every test case for its transcripts and calls submit_eval_scores once per transcript × test case. " +
      "After all subagents finish, call finalize_eval_run.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string", description: "Summary configuration name" },
        test_set_name: { type: "string", description: "Test set to evaluate" },
        mode: {
          type: "string",
          enum: ["existing", "prompt_test"],
          description: "'existing': evaluate stored production summaries. 'prompt_test': generate new summaries from a candidate prompt.",
        },
        version_number: {
          type: "number",
          description:
            "Recommended. The version number from version-history/ to test (e.g. 1 for summary-configuration-1.json). " +
            "Loads the prompt automatically and records the version number and status (candidate/deployed) against the run. " +
            "For mode='prompt_test': use this instead of the prompt argument whenever testing a versioned candidate. " +
            "For mode='existing': resolves the prompt that was live at the time — records it for traceability. " +
            "Cannot be used together with prompt.",
        },
        prompt: {
          type: "string",
          description:
            "Inline candidate prompt for mode='prompt_test'. " +
            "Use version_number instead whenever the prompt comes from a version-history file — that records full traceability. " +
            "Required when mode='prompt_test' and version_number is not provided.",
        },
        batch_size: {
          type: "number",
          description: "Transcripts per batch (default 5, max 20). Each batch is handled by one subagent.",
        },
        language: {
          type: "string",
          description: "Language code for preview generation when mode='prompt_test' (default: en-au).",
        },
      },
      required: ["summary_config_name", "test_set_name"],
    },
  },
  {
    name: "submit_eval_scores",
    description:
      "Save evaluation scores for one transcript × one test case. " +
      "Called by each subagent after scoring. Stateless — only needs run_number, no in-memory state. " +
      "Pass/fail per dimension is determined automatically by comparing the score against each dimension's passThreshold.\n\n" +
      "BEFORE SCORING — check applicabilityCondition on every dimension (included in the test_cases payload from start_eval_run):\n" +
      "  • If the condition IS met for this transcript → score normally (0.0–1.0)\n" +
      "  • If the condition is NOT met → submit score: null (N/A)\n\n" +
      "Null scores are excluded from all aggregation: overallScore, overallPassed, pass rates, and failure analysis. " +
      "A null score is not a pass and not a fail — it is simply not counted. " +
      "Pass rate = passes / evaluated (not passes / total). " +
      "NEVER auto-pass a dimension by submitting score: 1.0 when the condition is not met — submit null.\n\n" +
      "Call once per (transcript_id × test_case_name) combination.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string" },
        test_set_name: { type: "string" },
        run_number: { type: "number", description: "run_number returned by start_eval_run" },
        transcript_id: { type: "string" },
        test_case_name: { type: "string" },
        transcript_label: { type: "string", description: "Optional human-readable label for the transcript" },
        summary_text: { type: "string", description: "The summary that was evaluated (for record-keeping)" },
        dimension_scores: {
          type: "array",
          description: "One entry per dimension in the test case",
          items: {
            type: "object",
            properties: {
              dimension: { type: "string", description: "Exact dimension name from the test case" },
              score: {
                description:
                  "Decimal 0.0–1.0 when the dimension applies: 0=total failure, 0.5=half pass, 1=perfect pass. " +
                  "null when the dimension's applicabilityCondition is not met for this transcript (N/A). " +
                  "Null scores are excluded from pass rates and averages — never substitute 1.0 for null.",
              },
              reasoning: { type: "string", description: "Brief explanation of the score (or why the dimension is N/A)" },
            },
            required: ["dimension", "score", "reasoning"],
          },
        },
      },
      required: ["summary_config_name", "test_set_name", "run_number", "transcript_id", "test_case_name", "dimension_scores"],
    },
  },
  {
    name: "finalize_eval_run",
    description:
      "Aggregate all submitted scores for a run and write the final output files. " +
      "Call this after ALL subagents have finished calling submit_eval_scores — do not call early.\n\n" +
      "WHAT IT DOES:\n" +
      "Merges intermediate per-transcript files into one {TestCaseName}.json per test case, deletes intermediates, " +
      "computes overall and per-test-case pass rates and average scores, updates _pending.json, " +
      "auto-generates dashboard.html (run-level) and improvements.html (test-set-level).\n\n" +
      "WHAT IT RETURNS:\n" +
      "A human-readable breakdown including: version tested (e.g. 'Version 1 (candidate)'), " +
      "the full prompt under test, per-dimension failure analysis with sample evaluator reasoning, " +
      "and explicit instructions for the improvement recommendations step.\n\n" +
      "MANDATORY NEXT STEP — save_improvement_recommendations:\n" +
      "After finalize_eval_run returns, you MUST read its output carefully and write improvements.md " +
      "using the failure analysis and prompt provided. Then call save_improvement_recommendations to persist it. " +
      "Do not skip this step.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string" },
        test_set_name: { type: "string" },
        run_number: { type: "number", description: "run_number returned by start_eval_run" },
      },
      required: ["summary_config_name", "test_set_name", "run_number"],
    },
  },

  {
    name: "list_eval_runs",
    description: "List historical evaluation runs for a summary configuration, showing pass rates and prompts used.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration",
        },
        test_set_name: {
          type: "string",
          description: "Optional: filter to runs for a specific test set",
        },
      },
      required: ["summary_config_name"],
    },
  },

  // ─── Version history ──────────────────────────────────────────────────────────
  {
    name: "save_version",
    description:
      "Snapshot the CURRENTLY LIVE Genesys summary configuration to version-history/summary-configuration-N.json. " +
      "Call this immediately BEFORE calling update_summary_setting to preserve the current live state.\n\n" +
      "IMPORTANT — this tool only captures what is live in Genesys right now. " +
      "It does NOT create local candidate (draft) versions. " +
      "To author a new candidate version for testing, write the JSON file directly to version-history/ " +
      "with status='candidate' and a changes[] array — do NOT use this tool for that.\n\n" +
      "The snapshot written by this tool should be treated as status='deployed'. " +
      "After writing, the version number increments automatically.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration (used as the folder name)",
        },
        summary_setting_id: {
          type: "string",
          description: "Genesys summary setting ID to fetch and snapshot. Use this OR prompt.",
        },
        prompt: {
          type: "string",
          description: "Prompt text to snapshot directly (when summary_setting_id is not provided)",
        },
        language: { type: "string", description: "Language code (used when snapshotting a raw prompt)" },
        notes: {
          type: "string",
          description: "Optional notes describing this version (e.g. 'Before adding edge-case handling')",
        },
      },
      required: ["summary_config_name"],
    },
  },
  {
    name: "list_versions",
    description:
      "List all version snapshots in version-history/ for a summary configuration. " +
      "Each entry shows: version number, status (candidate = local draft / deployed = was live in Genesys), " +
      "snapshot date, and notes. " +
      "Use this to find the version_number to pass to start_eval_run, or to review what has been tested and deployed.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration",
        },
      },
      required: ["summary_config_name"],
    },
  },

  // ─── Post-eval improvement recommendations ───────────────────────────────────
  {
    name: "save_improvement_recommendations",
    description:
      "Save improvement recommendations as improvements.md inside an eval run directory. " +
      "Call this IMMEDIATELY after finalize_eval_run — finalize_eval_run will instruct you exactly what to write. " +
      "The content should be a markdown document covering: (1) run summary with overall pass rate and model name, " +
      "(2) test case results table, (3) failing dimension analysis with root causes, " +
      "(4) specific prompt improvement suggestions tailored to the model (Claude Haiku 4.5), " +
      "and (5) a proposed improved prompt as a fenced code block. " +
      "The model generating summaries is Claude Haiku 4.5 — prompt improvements should account for this model's " +
      "tendencies: highly instruction-literal, terse by default, omits contextual detail unless explicitly told to include it, " +
      "responds well to explicit output templates and numbered instruction lists. " +
      "Written to: eval-runs/{testSetName}/{NNNN}/improvements.md",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string", description: "Summary configuration name" },
        test_set_name: { type: "string", description: "Test set name" },
        run_number: { type: "number", description: "Eval run number (from finalize_eval_run)" },
        content: {
          type: "string",
          description:
            "Full markdown content for improvements.md. Must include all five sections: " +
            "run summary, test case results table, failing dimension analysis, " +
            "prompt improvement suggestions, and proposed improved prompt.",
        },
      },
      required: ["summary_config_name", "test_set_name", "run_number", "content"],
    },
  },

  // ─── Reporting ───────────────────────────────────────────────────────────────
  {
    name: "generate_improvements_dashboard",
    description:
      "Generate a self-contained HTML improvements dashboard for a test set, saved as improvements.html " +
      "in eval-runs/{testSetName}/. Shows all finalized runs side by side: overall pass rate trend (sparkline), " +
      "per-test-case pass rates as a colour-coded table (green ≥80%, amber 50–79%, red <50%), " +
      "delta indicators (↑↓→) between consecutive runs, and links to each run's individual dashboard. " +
      "Called automatically by finalize_eval_run — use this tool to regenerate without re-running.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string", description: "Summary configuration name" },
        test_set_name: { type: "string", description: "Test set name" },
      },
      required: ["summary_config_name", "test_set_name"],
    },
  },
  {
    name: "generate_eval_run_dashboard",
    description:
      "Generate a self-contained HTML dashboard for a finalized eval run. " +
      "Writes dashboard.html into the eval run directory. " +
      "The dashboard shows: overall pass rate, per-test-case pass rates and scores (clickable rows), " +
      "transcript-level results with dimension-by-dimension scoring and reasoning, " +
      "failure themes derived from the scoring data, and prompt improvement recommendations. " +
      "Called automatically by finalize_eval_run — use this tool to regenerate the dashboard without re-running.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: { type: "string", description: "Summary configuration name" },
        test_set_name: { type: "string", description: "Test set name" },
        run_number: { type: "number", description: "Eval run number" },
      },
      required: ["summary_config_name", "test_set_name", "run_number"],
    },
  },
  {
    name: "generate_dashboard",
    description:
      "Generate a self-contained HTML dashboard showing eval run history for a summary configuration. " +
      "Includes per-test-case scores, summaries, prompt diffs, and improvement suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "Name of the summary configuration to generate the dashboard for",
        },
        test_set_name: {
          type: "string",
          description: "Optional: filter to runs for a specific test set",
        },
        title: { type: "string", description: "Dashboard title" },
      },
      required: ["summary_config_name"],
    },
  },

  // ─── Copilot config ──────────────────────────────────────────────────────────
  {
    name: "list_assistants",
    description: "List all Agent Copilot assistants in the Genesys org.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_copilot_config",
    description: "Get the copilot configuration for a specific assistant.",
    inputSchema: {
      type: "object",
      properties: {
        assistant_id: { type: "string", description: "The assistant ID" },
      },
      required: ["assistant_id"],
    },
  },
  {
    name: "update_copilot_config",
    description: "Update the copilot configuration for an assistant (e.g. to link a new summary setting).",
    inputSchema: {
      type: "object",
      properties: {
        assistant_id: { type: "string", description: "The assistant ID" },
        config: { type: "object", description: "The full copilot configuration object" },
      },
      required: ["assistant_id", "config"],
    },
  },

  {
    name: "fetch_existing_summaries_bulk",
    description:
      "PIPELINE STEP 4 of 4. Enrich saved transcripts with production Genesys summaries. " +
      "PREREQUISITE: fetch_transcripts_bulk must have been run first. " +
      "For each transcript, calls GET /api/v2/speechandtextanalytics/conversations/{id}/summaries. " +
      "Prefers summaryType 'Agent' (the configured prompt output), falling back to 'Conversation', then first available. " +
      "Before/after tracking: when an agent has edited a summary, stores " +
      "existingSummary (agent-edited final) and aiGeneratedSummary (original AI output). " +
      "When no agent edits exist, stores only existingSummary (the AI output). " +
      "Also strips any legacy rawJson from transcript files. " +
      "Safe to re-run — already-enriched transcripts are skipped unless overwrite=true. " +
      "NEXT STEP: call generate_test_case(summary_config_name=..., conversation_id=...) to create test cases.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "The working directory name (e.g. 'Acme_CallSummary').",
        },
        concurrency: {
          type: "number",
          description: "Number of conversations to fetch in parallel (default 5, max 10).",
        },
        overwrite: {
          type: "boolean",
          description: "If true, re-fetch summaries even for transcripts that already have one (default false).",
        },
      },
      required: ["summary_config_name"],
    },
  },

  {
    name: "fetch_transcripts_bulk",
    description:
      "PIPELINE STEP 3 of 4. Bulk-fetch transcripts for all relevant conversations in a date range. " +
      "PREREQUISITE: build_interaction_filter must have been run first (reads queue IDs from interaction-filter.json). " +
      "Filters to voice, message, callback only — email, chat, cobrowse, screenshare, video are excluded. " +
      "Transcript strategy: tries STA/S3 first (works for both voice and messaging when transcription is enabled); " +
      "falls back to Conversations Messages bulk API for messaging if STA fails. " +
      "Stores only plainText (Speaker: utterance format, ready for preview API) — rawJson is NOT stored. " +
      "Safe to re-run — already-saved conversations are skipped. " +
      "NEXT STEP: immediately call fetch_existing_summaries_bulk(summary_config_name=...) to enrich with production summaries.",
    inputSchema: {
      type: "object",
      properties: {
        summary_config_name: {
          type: "string",
          description: "The working directory name (e.g. 'Acme_CallSummary'). Must have an interaction-filter.json.",
        },
        date_from: {
          type: "string",
          description: "Start of date range (ISO 8601, e.g. '2026-01-01T00:00:00Z')",
        },
        date_to: {
          type: "string",
          description: "End of date range (ISO 8601, e.g. '2026-01-31T23:59:59Z')",
        },
        max_conversations: {
          type: "number",
          description: "Maximum number of conversations to process (default 50, max 200).",
        },
        concurrency: {
          type: "number",
          description: "Number of conversations to fetch in parallel (default 5, max 10).",
        },
      },
      required: ["summary_config_name", "date_from", "date_to"],
    },
  },

  {
    name: "build_interaction_filter",
    description:
      "PIPELINE STEP 2 of 4. Set up the working directory for a summary configuration. " +
      "Provide the Agent Copilot name (from Genesys Admin → Agent Copilot) — NOT the summary config name. " +
      "The tool: (1) fetches the copilot's linked summary setting, (2) uses the summary setting's name as the " +
      "working directory name, (3) calls GET /api/v2/assistants/{assistantId}/queues (the direct association " +
      "endpoint — do not use routing queues API for this) to get queues, (4) resolves queue display names, " +
      "(5) saves interaction-filter.json, (6) creates the FULL workspace in one shot: " +
      "transcripts/static, transcripts/dynamic, test-cases, test-sets, eval-runs, version-history, " +
      "requirements/artefacts, requirements/final, " +
      "(7) snapshots the current summary config as version-history/summary-configuration-0.json (v0 baseline — only written once). " +
      "The requirements/ folder is for capturing quality improvement inputs: drop raw artefacts (emails, screenshots, " +
      "documents showing summary issues) into requirements/artefacts/, then distil them into requirements/final/requirements.md. " +
      "If the copilot has multiple summary settings (multi-language), it asks which one — re-call with summary_setting_id. " +
      "NEXT STEP: call fetch_transcripts_bulk(summary_config_name=..., date_from=..., date_to=...).",
    inputSchema: {
      type: "object",
      properties: {
        copilot_name: {
          type: "string",
          description: "The name of the Agent Copilot in Genesys (e.g. 'Acme_Copilot'). Provide this or copilot_id.",
        },
        copilot_id: {
          type: "string",
          description: "The Genesys Agent Copilot ID (from list_assistants). Provide this or copilot_name.",
        },
        summary_setting_id: {
          type: "string",
          description: "Only needed when the copilot has multiple summary settings (multi-language). Provide the ID of the one to work with.",
        },
      },
      required: [],
    },
  },

  // ─── Legacy (deprecated) ─────────────────────────────────────────────────────
  {
    name: "generate_rubric",
    description:
      "DEPRECATED — use generate_test_case instead. " +
      "Returns a migration notice pointing to the new lifecycle-scoped tools.",
    inputSchema: {
      type: "object",
      properties: {
        sample_transcript_ids: { type: "array", items: { type: "string" } },
        sample_summaries: { type: "array", items: { type: "string" } },
        rubric_name: { type: "string" },
        focus_areas: { type: "array", items: { type: "string" } },
      },
      required: ["sample_transcript_ids", "sample_summaries", "rubric_name"],
    },
  },
  {
    name: "save_rubric",
    description:
      "DEPRECATED — use save_test_case with a summary_config_name instead. " +
      "Saves to legacy flat storage for backward compatibility.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        dimensions: { type: "array", items: { type: "object" } },
      },
      required: ["name", "dimensions"],
    },
  },
  {
    name: "list_rubrics",
    description:
      "DEPRECATED — use list_test_cases with a summary_config_name instead. Lists legacy rubrics from flat storage.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "save_test_run",
    description:
      "DEPRECATED — use save_eval_run instead. Saves legacy test runs to flat storage.",
    inputSchema: {
      type: "object",
      properties: {
        test_run_id: { type: "string" },
        results: { type: "array", items: { type: "object" } },
        suggested_improvements: { type: "string" },
      },
      required: ["test_run_id", "results"],
    },
  },
  {
    name: "list_test_runs",
    description:
      "DEPRECATED — use list_eval_runs with a summary_config_name instead. Lists legacy test runs from flat storage.",
    inputSchema: {
      type: "object",
      properties: {
        summary_setting_id: { type: "string" },
      },
    },
  },
];
