# SDD Summary Optimiser — MCP Server

An MCP (Model Context Protocol) server for developing, testing, and iteratively improving **Genesys Cloud Agent Copilot / AI Studio summary prompts**.

Distributed as a Cursor plugin. The agent orchestrates the full workflow through natural language.

---

## Installation

This server is not configured by hand. Two options, both driven from the repository root — see [`../docs/setup.md`](../docs/setup.md):

| Option | Scope | Mechanism |
|---|---|---|
| `node deploy.js <project>` | One project *(recommended)* | Writes `.cursor/` files into the target project and vendors the bundle there |
| Cursor plugin install | Every workspace | Repo-root `mcp.json` resolved via `${CURSOR_PLUGIN_ROOT}` |

Both run the committed single-file bundle at `bundle/sdd-summary-mcp.mjs`. There is no dependency install or build step on the consuming machine.

Project scope is recommended because this server exposes 47 Genesys-specific tools plus an always-applied rule; at user scope those load into unrelated projects, and Cursor documents no way to disable a user-scoped plugin per project.

### Prerequisites

- Node.js 18+
- A Genesys Cloud OAuth2 client with all 8 required scopes — see [`../docs/oauth-setup.md`](../docs/oauth-setup.md)

Required scopes: `users`, `ai-studio`, `analytics`, `conversations`, `speechandtextanalytics`, `assistants`, `notifications`, `routing`

---

## Developing This Server

```bash
cd mcp-server
npm install          # first time only
npm run typecheck    # verify types without emitting
npm run bundle       # regenerate bundle/sdd-summary-mcp.mjs
```

`bundle/sdd-summary-mcp.mjs` is a **committed artefact**, because Cursor installs a plugin by cloning its repository and never runs a build. Any change under `src/` therefore requires `npm run bundle` plus a commit, or the change will not reach users.

`npm run build` (plain `tsc` into `dist/`) remains available for local type-checking and debugging, but `dist/` is gitignored and is not what Cursor runs.

To verify a bundle in isolation:

```bash
node bundle/sdd-summary-mcp.mjs
# should print: SDD Summary MCP server running (stdio)
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

Spawn one subagent per batch in parallel using `composer-2.5-fast`.

---

## Environment Variables

Credentials normally come from `login()`, which parses the Authorization URL and stores the result under `.sdd-summary/`. The plugin sets only the two path variables.

| Variable | Description |
|---|---|
| `SDDSUM_STORAGE_PATH` | Path for `.sdd-summary/` (OAuth config + tokens). Plugin sets this to `${workspaceFolder}/.sdd-summary`. |
| `SDDSUM_LIFECYCLE_PATH` | Path for `.summaryconfig-lifecycle/`. Plugin sets this to `${workspaceFolder}/.summaryconfig-lifecycle`. |
| `GENESYS_CLIENT_ID` | **Avoid setting.** Shadows the stored config and causes logins against the wrong org. Let `login()` manage it. |
| `GENESYS_REGION` | **Avoid setting.** Extracted from the Authorization URL automatically. |
| `GENESYS_CLIENT_SECRET` | Not required. Only for the vestigial machine-to-machine fallback — omit for standard user login. |

Pinning storage to `${workspaceFolder}` keeps user data in the consuming project rather than the plugin directory, so reinstalling or updating the plugin cannot destroy work.

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
| | `smoke_test_auth` | Verify all 8 required scopes |
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
