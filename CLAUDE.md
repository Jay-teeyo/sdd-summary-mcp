# SDD Summary Testing Pipeline

This project is an MCP server for testing and iterating on Genesys Cloud summary configurations (Agent Copilot / AI Studio summaries). The full tool reference is in `docs/workflow.md`. The complete tool catalog is in `mcp-server/src/tools/definitions.ts`.

> **Claude Code note:** Evaluation runs are processed **sequentially** within a single session (no parallel subagent spawning). See the [Running Evaluations](#running-evaluations) section for the Claude Code eval pattern.

## Pipeline Order

```
1. login()                          → complete_login()
2. build_interaction_filter(copilot_name=...)
3. fetch_transcripts_bulk(...)
4. fetch_existing_summaries_bulk(...)
5. [test / iterate / evaluate]
```

Always run steps 3 and 4 together — 3 fetches transcripts, 4 enriches them with production summaries and strips rawJson.

---

## Step 1 — Authentication

**First login** (paste the full Authorization URL from Genesys Admin → IT and Integrations → OAuth → your client → "Authorization URL" field at the bottom):
```
login(authorization_url="https://login.{your-region}/oauth/authorize?client_id=...")
```

**All subsequent logins** — the URL is stored, no argument needed:
```
login()
```

After the browser confirms login, call:
```
complete_login()
```

Expect **7/7 scopes**. If fewer, the OAuth client is missing scopes — see `docs/oauth-setup.md`.

### Auth gotchas
- If `login()` uses the wrong `client_id` (wrong org), it's because an env var (`GENESYS_CLIENT_ID`) is shadowing the stored config. The code bypasses env vars after parsing the Authorization URL — re-run `login()` with no args (it will use the stored `lastAuthorizationUrl` from file config).
- Tokens last ~30 min as user tokens. On expiry, any API call auto-reopens the browser. Log in and retry the last call.
- The browser is opened by the MCP server process. If it doesn't open, the `login()` response includes the full URL — share it as a clickable link.

---

## Step 2 — Interaction Filter

```
build_interaction_filter(copilot_name="Acme_Copilot")
```

- Takes the **Agent Copilot name** (from Genesys Admin → Agent Copilot), not the summary config name.
- Fetches queues via `GET /api/v2/assistants/{assistantId}/queues` (direct association endpoint — do NOT use routing queues API with `assistantId` filter, that returns all org queues).
- Resolves queue display names via routing API (requires `routing` scope).
- Names the working directory after the **summary config name** (fetched from `getSummarySetting`), NOT the copilot name.
- Saves to `.summaryconfig-lifecycle/{summaryConfigName}/interaction-filter.json`.
- If the copilot has multiple summary settings (multi-language), it will ask which one to use — re-call with `summary_setting_id=...`.

---

## Step 3 — Bulk Fetch Transcripts

```
fetch_transcripts_bulk(
  summary_config_name="Acme_CallSummary",
  date_from="2026-01-01T00:00:00Z",
  date_to="2026-01-31T23:59:59Z",
  max_conversations=100,
  concurrency=5
)
```

- Reads queue IDs from `interaction-filter.json` automatically — do not pass queue IDs manually.
- Included media types: `voice`, `message`, `callback`. Excluded: `email`, `chat`, `cobrowse`, `screenshare`, `video`.
- The Genesys analytics API does **not** support `notMatches` operator — exclusions are handled as an allowlist (`includeMediaTypes` OR filter).
- Transcript strategy (STA-first, messaging fallback):
  1. Try `GET /speechandtextanalytics/conversations/{id}/communications/{commId}/transcriptUrls` → S3 download — works for both voice and messaging when STA transcription is enabled on the queue.
  2. If STA fails and conversation is messaging: try `GET /conversations/messages/{id}` → `POST .../messages/bulk?useNormalizedMessage=true`.
- `rawJson` is **not stored** — only `plainText` (the `Speaker: utterance` format ready for the preview API).
- Safe to re-run — already-saved conversations are skipped.

---

## Step 4 — Enrich with Existing Summaries

```
fetch_existing_summaries_bulk(
  summary_config_name="Acme_CallSummary",
  concurrency=5
)
```

- Calls `GET /api/v2/speechandtextanalytics/conversations/{id}/summaries` for each transcript.
- Summary selection: prefers `summaryType: "Agent"` (the configured summary prompt output), falls back to `"Conversation"`, then first available.
- Before/after detection: if `generated: false` (agent-edited) and `generated: true` (AI output) both exist for `summaryType: "Agent"`, stores:
  - `existingSummary` = agent-edited version (the "after")
  - `aiGeneratedSummary` = original AI output (the "before")
- Also strips any `rawJson` from existing transcripts (in case they were saved before this was enforced).
- Safe to re-run — already-enriched transcripts are skipped unless `overwrite=true`.

---

## Stored Transcript Schema

After steps 3 + 4, each file in `transcripts/static/` looks like:

```json
{
  "id": "<conversationId>",
  "conversationId": "<conversationId>",
  "communicationId": "<commId>",
  "plainText": "Agent: ...\nCustomer: ...",
  "existingSummary": "...",
  "aiGeneratedSummary": "...",
  "createdAt": "..."
}
```

---

## Requirements and Test Case Authoring

Full methodology: `docs/requirements-guide.md` (requirements) and `docs/test-case-guide.md` (test cases + test sets).

### Requirements
- Live in `requirements/final/requirements.md` using IDs: `BR-{SummaryConfigName}-{NNN}`
- Raw artefacts (emails, QA feedback, complaint logs) go in `requirements/artefacts/`
- **`settingType: "Prompt"` — the `prompt` field is the sole source of instructions.** All other config fields are platform metadata — ignore them when deriving requirements or authoring test cases.

### Test Cases
- One test case per requirement category; file name: `{Category}-{DescriptiveName}.json` in `test-cases/`
- Each dimension references `requirementIds: ["BR-..."]` for traceability
- Scores are decimal **0–1** (0 = total failure, 1 = perfect pass, 0.5 = half pass)
- `passThreshold` sets the minimum score to pass a dimension
- `passCriteria` must describe the scoring gradient with anchor points

**`applicabilityCondition` — required on every dimension, always present:**
- Set to `"always"` for dimensions that apply unconditionally to every transcript
- Set to a plain-English condition string for conditional dimensions (e.g. `"Summary contains bullets."`)
- When a condition is not met for a transcript, evaluators must submit `score: null` — this marks the dimension as N/A
- N/A dimensions are excluded from pass-rate and average-score calculations entirely
- **NEVER omit this field** — every dimension must have it
- **When authoring test cases and uncertain whether a dimension is `"always"` or conditional — ask the user. Never silently default to `"always"`.**

### Test Sets
- File: `test-sets/{SummaryConfigName}-{DescriptiveName}.json`
- `testCaseNames` = list of test case filenames (no `.json`); `transcriptIds` = IDs from `transcripts/static/`
- Standard full suite: all test cases × all static transcripts, named `{ConfigName}-Full-Test-Suite`

---

## Running Evaluations

Full guide: `docs/eval-guide.md`. Two modes — both use the same tool flow.

### Mode 1 — Evaluate existing summaries (`mode: "existing"`)
- Reads `existingSummary` already stored on each transcript — no API calls
- Use to measure current production quality (requires `fetch_existing_summaries_bulk` to have run)

### Mode 2 — Test a candidate prompt (`mode: "prompt_test"`)
- Generates new summaries via the Genesys preview API using transcripts already in `transcripts/static/`
- Requires user login

**For test sets larger than ~10 transcripts, always use `prepare_prompt_test` first** to build the preview cache in batches before calling `start_eval_run`:

```
# Step 1: generate preview cache (repeat until complete: YES)
prepare_prompt_test(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  version_number=1,
  batch_size=8          ← do not exceed 10 (see Rate Limiting section)
)

# Step 2: start the eval run — reads from cache automatically
start_eval_run(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  mode="prompt_test",
  version_number=1
)
```

### Evaluation approach in Claude Code

Claude Code processes evaluation batches **sequentially** within a single session. After `start_eval_run` returns batches and test cases, work through each batch one at a time:

```
start_eval_run → returns: run_number, batches[], test_cases[]

For each batch (one at a time):
  For each transcript in the batch:
    For each test case:
      1. Read transcript plainText and the summary for this run
      2. Check each dimension's applicabilityCondition — if not met → score: null
      3. Score applicable dimensions 0.0–1.0
      submit_eval_scores(
        run_number=...,
        transcript_id=...,
        test_case_name=...,
        dimension_scores=[{dimension_name, score, reasoning}]
      )

After all batches complete:
  finalize_eval_run(run_number=...)
```

Scores are persisted to disk after each `submit_eval_scores` call. If the session is interrupted, you can resume by continuing to submit scores for remaining transcripts — `finalize_eval_run` will merge whatever is on disk.

For very large test sets (>60 transcripts), consider using Cursor for parallel subagent evaluation, which is significantly faster.

### Tool call approval in Claude Code

Eval runs require many `submit_eval_scores` calls. To avoid approving each one manually, launch Claude Code with:

```bash
claude --dangerously-skip-permissions
```

Or configure auto-approval in `.mcp.json` for trusted tools.

### Subagent setup (`submit_eval_scores` scoring rules)

- Scores: decimal 0–1 (0 = total failure, 0.5 = half pass, 1 = perfect)
- Submit `score: null` when a dimension's `applicabilityCondition` is not met
- `start_eval_run` includes `applicability_condition` on every dimension in the `test_cases` payload — check it first before scoring
- Null scores are excluded from all aggregation (pass rate, average score, failure analysis)

### After evaluation
- `finalize_eval_run` auto-generates both dashboards — **never write dashboard HTML manually**
- **ALWAYS call `save_improvement_recommendations` after `finalize_eval_run`** — do not skip
- Analyse failures by dimension and write `improvements.md` per the structure in `docs/eval-guide.md`

---

## Dashboard Output — MANDATORY RULES

`finalize_eval_run` **automatically generates both dashboards**. Never write dashboard HTML manually.

| Dashboard | Tool | Location |
|---|---|---|
| Run dashboard | `generate_eval_run_dashboard` | `eval-runs/{testSet}/{NNNN}/dashboard.html` |
| Improvements dashboard | `generate_improvements_dashboard` | `eval-runs/{testSet}/improvements.html` |

- NEVER generate dashboard HTML manually or via any other method
- ALWAYS use the MCP tools to regenerate dashboards
- Both are called automatically by `finalize_eval_run`

---

## Version Management — Local Candidates and Deployment

### Versioning tools

| Tool | Purpose |
|---|---|
| `save_version` | Snapshots the **currently live Genesys config** to `version-history/summary-configuration-N.json`. Call before deploying a change. |
| `list_versions` | Lists all snapshots in version-history for a config. |
| `update_summary_setting` | Pushes a prompt update **directly to the live Genesys config**. Goes live immediately — only call when explicitly approved. |

### Local candidate versions (do not auto-deploy)

Version snapshots with `"status": "candidate"` are **local-only drafts**. Never pushed to Genesys automatically.

To create a local candidate version, write the JSON file directly — do NOT call `save_version` (which only snapshots live state):

```json
{
  "version": 1,
  "status": "candidate",
  "setting": { "prompt": "..." },
  "notes": "Candidate version — NOT yet deployed.",
  "snapshotAt": "...",
  "changes": [
    {
      "change": "Description of what changed",
      "affectedDimension": "TestCaseName / DimensionName",
      "runEvidence": "X/Y transcripts failed in run NNNN.",
      "reason": "Why this change addresses the failure."
    }
  ]
}
```

### Deploying a candidate version

**Only deploy when the user explicitly approves.**

```
1. save_version()                          ← snapshot current live state FIRST
2. update_summary_setting(id, prompt)      ← push approved candidate prompt to Genesys
3. Update "status" in the candidate file from "candidate" → "deployed"
```

Never call `update_summary_setting` proactively. Always wait for explicit user approval.

### Testing a candidate prompt (without deploying)

**MANDATORY: A version with `"status": "candidate"` MUST be tested using `mode: "prompt_test"`.** Never use `mode: "existing"` for a candidate.

**Always pass `version_number` rather than inlining the prompt directly.** This records which version was tested.

```
# Step 1 — build preview cache (repeat until complete: YES, use batch_size=8)
prepare_prompt_test(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  version_number=1,
  batch_size=8
)
# Step 2 — start eval run (reads cache, makes no API calls)
start_eval_run(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  mode="prompt_test",
  version_number=1
)
```

---

## Rate Limiting — What Happens Automatically

All Genesys Platform API calls go through automatic retry with jitter. You do not need to do anything special.

| Response | Action |
|---|---|
| `429 Too Many Requests` | Reads `Retry-After` header, adds ±30% jitter, sleeps, retries — up to **4 times** |
| `5xx` with `Retry-After` | Same wait + retry — up to **2 times** |
| `5xx` without `Retry-After` | Throws immediately |

### Preview API — confirmed limits

- **`token.rate.per.minute`: 300** across all API calls for the authenticated token
- **Notification channel burst sensitivity:** each preview request creates a notification channel. Firing ≥ 15 concurrent requests reliably triggers `429`. **Safe `batch_size` for `prepare_prompt_test`: 8.** Do not exceed 10.
- Long pauses during bulk operations are normal — the server is honouring `Retry-After` headers. Do not cancel or restart.

---

## Key API Facts (do not guess)

| Concern | Correct API |
|---|---|
| Queues for an assistant | `GET /api/v2/assistants/{assistantId}/queues` (cursor pagination with `after`/`nextUri`) |
| Queue display names | `GET /api/v2/routing/queues?id=id1&id=id2...` |
| Voice transcript URL | `GET /api/v2/speechandtextanalytics/conversations/{id}/communications/{commId}/transcriptUrls` |
| Messaging messages | `GET /api/v2/conversations/messages/{id}` + `POST .../messages/bulk?useNormalizedMessage=true` |
| Existing summaries | `GET /api/v2/speechandtextanalytics/conversations/{id}/summaries` |
| Summary settings | `GET /api/v2/conversations/summaries/settings` |
| Analytics filter operators | Only `matches`, `exists`, `notExists` — `notMatches` is NOT supported |
| Analytics date range limit | 7 days max per query window |

---

## Required OAuth Scopes (all 7)

`users`, `ai-studio`, `analytics`, `speechandtextanalytics`, `assistants`, `notifications`, `routing`

Run `smoke_test_auth()` after login to verify.

---

## Lifecycle Folder Structure

```
.summaryconfig-lifecycle/
└── {summaryConfigName}/
    ├── interaction-filter.json
    ├── requirements/
    │   ├── artefacts/
    │   └── final/
    │       └── requirements.md
    ├── transcripts/
    │   └── static/
    ├── test-cases/
    │   └── {Category}-{Name}.json
    ├── test-sets/
    │   └── {ConfigName}-{Name}.json
    ├── version-history/
    │   └── summary-configuration-N.json
    └── eval-runs/
        └── {test-set-name}/
            ├── improvements.html
            └── {NNNN}/
                ├── _pending.json
                ├── {TestCaseName}.json
                └── dashboard.html
```
