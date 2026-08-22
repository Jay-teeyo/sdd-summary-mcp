# SDD Summary Optimiser — MCP Server

An MCP (Model Context Protocol) server for developing, testing, and iteratively improving **Genesys Cloud Agent Copilot / AI Studio summary prompts**.

Connect it to Cursor, Claude Code, Kiro, or any MCP-compatible agent. The agent orchestrates the full workflow through natural language.

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- A Genesys Cloud OAuth2 client with all 7 required scopes — see `../docs/oauth-setup.md`

Required scopes: `users`, `ai-studio`, `analytics`, `speechandtextanalytics`, `assistants`, `notifications`, `routing`

### 2. Install & build

```bash
cd mcp-server
npm install
npm run build
```

The compiled server is at `dist/index.js`. Note the **absolute path** — you need it in your MCP config.

---

## Connect to Your Environment

### Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "sdd-summary": {
      "command": "node",
      "args": ["/absolute/path/to/SDD-Summary/mcp-server/dist/index.js"],
      "env": {
        "GENESYS_CLIENT_ID": "your-client-id",
        "GENESYS_REGION": "YOUR_REGION_HERE",
        "SDDSUM_STORAGE_PATH": "/absolute/path/to/SDD-Summary/.sdd-summary"
      },
      "alwaysAllow": [
        "login", "complete_login", "smoke_test_auth", "get_pipeline_guide",
        "build_interaction_filter", "fetch_transcripts_bulk", "fetch_existing_summaries_bulk",
        "list_transcripts", "list_test_cases", "list_test_sets", "list_eval_runs", "list_versions",
        "start_eval_run", "submit_eval_scores", "finalize_eval_run",
        "prepare_prompt_test", "save_improvement_recommendations",
        "generate_eval_run_dashboard", "generate_improvements_dashboard",
        "save_test_case", "save_test_set", "save_version", "generate_test_case"
      ]
    }
  }
}
```

`alwaysAllow` suppresses per-call approval prompts — required for the parallel eval subagent pattern.

### Claude Code (CLI or VS Code extension)

Create `.mcp.json` at the project root:

```json
{
  "mcpServers": {
    "sdd-summary": {
      "command": "node",
      "args": ["/absolute/path/to/SDD-Summary/mcp-server/dist/index.js"],
      "env": {
        "GENESYS_CLIENT_ID": "your-client-id",
        "GENESYS_REGION": "YOUR_REGION_HERE",
        "SDDSUM_STORAGE_PATH": "/absolute/path/to/SDD-Summary/.sdd-summary"
      }
    }
  }
}
```

Run `claude` from the project root — it detects `.mcp.json` automatically.
For eval runs: `claude --dangerously-skip-permissions` to avoid per-call approval prompts.

### Kiro

Copy the template and fill in your credentials:
```bash
cp ../.kiro/settings/mcp.json.template ../.kiro/settings/mcp.json
```
Use the same JSON structure as the Claude Code config above.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sdd-summary": {
      "command": "node",
      "args": ["/absolute/path/to/SDD-Summary/mcp-server/dist/index.js"],
      "env": {
        "GENESYS_CLIENT_ID": "your-client-id",
        "GENESYS_REGION": "YOUR_REGION_HERE"
      }
    }
  }
}
```

---

## Workflow Overview

Full reference: ask the agent to call `get_pipeline_guide()`.

### Pipeline order

```
1. login() → complete_login()
2. build_interaction_filter(copilot_name="YourCopilotName")
3. fetch_transcripts_bulk(...)    ← always run together
4. fetch_existing_summaries_bulk(...)
5. [author requirements + test cases]
6. [eval → improve prompt → repeat]
7. [deploy approved candidate]
```

### Evaluation flow

```
# For prompt_test: pre-generate summaries first
prepare_prompt_test(summary_config_name=..., test_set_name=..., version_number=N, batch_size=8)
# repeat until complete: YES

# Then run the eval
start_eval_run → [score batches] → finalize_eval_run
```

**Cursor:** spawn one subagent per batch in parallel using `composer-2.5-fast`  
**Claude Code / Kiro:** process batches sequentially within one session

---

## Environment Variables

| Variable | Description |
|---|---|
| `GENESYS_CLIENT_ID` | OAuth2 client ID |
| `GENESYS_CLIENT_SECRET` | Not required. Only for the machine-to-machine client credentials fallback — omit for standard user login. |
| `GENESYS_REGION` | Region domain (e.g. `mypurecloud.com.au`) |
| `SDDSUM_STORAGE_PATH` | Override the `.sdd-summary` directory (auth tokens + config) |
| `SDDSUM_LIFECYCLE_PATH` | Override the `.summaryconfig-lifecycle` directory |

Alternatively, run `configure_credentials` from the agent to store credentials interactively.

---

## Transcript Retrieval Pipeline

`fetch_transcript` (and the bulk variant) resolves a conversation ID to a plain-text transcript using this strategy:

**Voice / STA-enabled queues:**
1. `GET /api/v2/analytics/conversations/{id}/details` → find customer session ID
2. `GET /api/v2/speechandtextanalytics/conversations/{id}/communications/{commId}/transcriptUrls`
3. Download from pre-signed S3 URL (no auth header — URL is pre-signed)
4. Transform JSON `phrases` array → `Speaker: utterance` format

**Messaging (STA fallback):**
1. `GET /api/v2/conversations/messages/{id}` → collect message IDs + participant purpose
2. `POST /api/v2/conversations/messages/{id}/messages/bulk?useNormalizedMessage=true`
3. Sort by timestamp → `Speaker: text` format

---

## Tools Reference

| Group | Tool | Description |
|---|---|---|
| **Auth** | `login` | Open browser OAuth login |
| | `complete_login` | Exchange auth code for token |
| | `logout` | Clear stored token |
| | `smoke_test_auth` | Verify all 7 required scopes |
| | `configure_credentials` | Store client ID, secret, region |
| **Pipeline** | `build_interaction_filter` | Resolve copilot → queues → save filter |
| | `fetch_transcripts_bulk` | Bulk-fetch transcripts for a date range |
| | `fetch_existing_summaries_bulk` | Enrich transcripts with production summaries |
| **Transcripts** | `list_transcripts` | List cached transcripts |
| | `fetch_transcript` | Fetch single transcript |
| | `store_transcript` | Save a manually provided transcript |
| **Summary Config** | `list_summary_settings` | List all Genesys summary configurations |
| | `get_summary_setting` | Fetch one configuration by ID |
| | `update_summary_setting` | Push updated prompt to Genesys (live immediately) |
| **Versions** | `save_version` | Snapshot current live config to version-history |
| | `list_versions` | List version snapshots |
| **Requirements** | `generate_test_case` | Generate a test case from requirements |
| | `save_test_case` | Save a test case |
| | `list_test_cases` | List test cases |
| **Test Sets** | `save_test_set` | Create a named group of test cases + transcripts |
| | `list_test_sets` | List test sets |
| **Eval** | `prepare_prompt_test` | Pre-generate preview summaries in batches (prompt_test mode) |
| | `start_eval_run` | Begin an eval run — returns batches for scoring |
| | `submit_eval_scores` | Submit scores for one transcript × test case |
| | `finalize_eval_run` | Merge scores, compute stats, generate dashboards |
| | `list_eval_runs` | List historical eval runs |
| | `save_improvement_recommendations` | Persist improvements.md for a run |
| **Dashboards** | `generate_eval_run_dashboard` | Regenerate run dashboard HTML |
| | `generate_improvements_dashboard` | Regenerate improvements dashboard HTML |
| **Preview** | `generate_preview_summary` | Test a single transcript + prompt via Genesys preview API |
| | `get_existing_summaries` | Get production summaries for a conversation |
| **Copilot** | `list_assistants` | List Agent Copilot assistants |
| | `get_copilot_config` | Get assistant copilot configuration |
| | `update_copilot_config` | Update copilot configuration |
| **Reference** | `get_pipeline_guide` | Return the full pipeline reference guide |

---

## Local Storage Layout

```
.sdd-summary/
├── config.json             ← credentials + OAuth tokens (gitignored)
└── transcripts/            ← legacy single-transcript storage

.summaryconfig-lifecycle/
└── {SummaryConfigName}/
    ├── interaction-filter.json
    ├── requirements/
    │   ├── artefacts/      ← raw inputs (emails, QA feedback)
    │   └── final/
    │       └── requirements.md
    ├── transcripts/
    │   └── static/         ← bulk-fetched + enriched transcripts
    ├── test-cases/         ← eval rubrics
    ├── test-sets/          ← named test playlists
    ├── version-history/    ← prompt snapshots
    └── eval-runs/
        └── {test-set-name}/
            ├── improvements.html
            └── {NNNN}/
                ├── _pending.json
                ├── {TestCaseName}.json
                ├── dashboard.html
                └── improvements.md
```

**Security:** Add `.sdd-summary/` and all MCP config files to your `.gitignore` to avoid committing credentials. The root `.gitignore` already covers this.
