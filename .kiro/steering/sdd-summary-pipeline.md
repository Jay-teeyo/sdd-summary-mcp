# SDD Summary Testing Pipeline

This project is an MCP server for testing and iterating on Genesys Cloud summary configurations (Agent Copilot / AI Studio summaries). The full tool reference is in `docs/workflow.md`. The complete tool catalog is in `mcp-server/src/tools/definitions.ts`.

> **Kiro note:** Evaluation runs are processed **sequentially** within a single session. See the [Running Evaluations](#running-evaluations) section for the sequential eval pattern.

## Pipeline Order

```
1. login()                          → complete_login()
2. build_interaction_filter(copilot_name=...)
3. fetch_transcripts_bulk(...)
4. fetch_existing_summaries_bulk(...)
5. [test / iterate / evaluate]
```

Always run steps 3 and 4 together — 3 fetches transcripts, 4 enriches them with production summaries.

---

## Step 1 — Authentication

**First login** (paste the full Authorization URL from Genesys Admin → IT and Integrations → OAuth → your client):
```
login(authorization_url="https://login.{your-region}/oauth/authorize?client_id=...")
```

**All subsequent logins** — the URL is stored, no argument needed:
```
login()
```

After the browser confirms login, call `complete_login()`. Expect **7/7 scopes**. If fewer, the OAuth client is missing scopes — see `docs/oauth-setup.md`.

### Auth gotchas
- Tokens last ~30 min. On expiry, any API call auto-reopens the browser — log in and retry.
- If `login()` uses the wrong org, re-run `login()` with no args to use the stored `lastAuthorizationUrl`.
- The browser is opened by the MCP server process. If it doesn't open, the `login()` response includes the full URL.

---

## Step 2 — Interaction Filter

```
build_interaction_filter(copilot_name="YourCopilotName")
```

- Takes the **Agent Copilot name** (from Genesys Admin → Agent Copilot), not the summary config name.
- Names the working directory after the **summary config name**, not the copilot name.
- Saves to `.summaryconfig-lifecycle/{summaryConfigName}/interaction-filter.json`.
- If the copilot has multiple summary settings, it will ask which one to use — re-call with `summary_setting_id=...`.

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

- Reads queue IDs from `interaction-filter.json` automatically.
- Included media types: `voice`, `message`, `callback`. Email/chat/video excluded.
- The Genesys analytics API does **not** support `notMatches` — exclusions handled as allowlist.
- Safe to re-run — already-saved conversations are skipped.

---

## Step 4 — Enrich with Existing Summaries

```
fetch_existing_summaries_bulk(
  summary_config_name="Acme_CallSummary",
  concurrency=5
)
```

- Fetches production summaries and stores them on each transcript.
- Safe to re-run — already-enriched transcripts are skipped unless `overwrite=true`.

---

## Requirements and Test Case Authoring

Full methodology: `docs/requirements-guide.md` and `docs/test-case-guide.md`.

### Requirements
- Live in `requirements/final/requirements.md` using IDs: `BR-{SummaryConfigName}-{NNN}`
- Raw artefacts (emails, QA feedback) go in `requirements/artefacts/`
- **The `prompt` field is the sole source of instructions.** All other config fields are platform metadata.

### Test Cases
- Scores are decimal **0–1** (0 = total failure, 1 = perfect pass, 0.5 = half pass)
- `passThreshold` sets the minimum score to pass a dimension

**`applicabilityCondition` — required on every dimension:**
- Set to `"always"` for unconditional dimensions
- Set to a plain-English condition for conditional dimensions (e.g. `"Summary contains bullets."`)
- When a condition is not met for a transcript, submit `score: null` — excluded from all pass-rate calculations
- **NEVER omit this field. When uncertain whether a dimension is `"always"` or conditional — ask the user.**

---

## Running Evaluations

Full guide: `docs/eval-guide.md`. Two modes — both use the same tool flow.

### Mode 1 — Evaluate existing summaries (`mode: "existing"`)
- No API calls — reads stored production summaries

### Mode 2 — Test a candidate prompt (`mode: "prompt_test"`)
- Generates new summaries via Genesys preview API
- **For test sets > ~10 transcripts, use `prepare_prompt_test` first** to build the cache in safe batches:

```
# Step 1: build preview cache (repeat until complete: YES)
prepare_prompt_test(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  version_number=1,
  batch_size=8          ← do not exceed 10 (rate limit on notification channel creation)
)

# Step 2: start eval run — reads from cache
start_eval_run(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  mode="prompt_test",
  version_number=1
)
```

### Sequential evaluation in Kiro

After `start_eval_run` returns batches and test cases, process each batch sequentially:

```
For each batch (one at a time):
  For each transcript in the batch:
    For each test case:
      1. Check each dimension's applicabilityCondition — if not met → score: null
      2. Score applicable dimensions 0.0–1.0 using passCriteria/failCriteria
      submit_eval_scores(
        run_number=...,
        transcript_id=...,
        test_case_name=...,
        dimension_scores=[{dimension_name, score, reasoning}]
      )

After all batches:
  finalize_eval_run(run_number=...)
```

Scores are persisted to disk after each `submit_eval_scores` call — safe to interrupt and resume.

### After evaluation
- `finalize_eval_run` auto-generates both dashboards — **never write dashboard HTML manually**
- **ALWAYS call `save_improvement_recommendations` after `finalize_eval_run`**

---

## Dashboard Rules — MANDATORY

`finalize_eval_run` auto-generates both dashboards automatically.

- **NEVER write dashboard HTML manually** — always use `generate_eval_run_dashboard` or `generate_improvements_dashboard`
- Both run automatically on every `finalize_eval_run` — only call them explicitly to force regeneration

---

## Version Management

- `save_version()` snapshots the **currently live Genesys config** locally — does NOT push to Genesys.
- **NEVER call `update_summary_setting` without prior `prompt_test` eval evidence and explicit user approval.**
- A version with `"status": "candidate"` MUST be tested with `mode: "prompt_test"` before deploying.
- Always pass `version_number` to `start_eval_run` rather than inlining the prompt directly.

### Deploy flow (only with explicit user approval)
```
1. save_version()                      ← snapshot current live state
2. update_summary_setting(id, prompt)  ← push to Genesys (goes live immediately)
3. Update candidate file status: "candidate" → "deployed"
```

---

## Rate Limiting

All Genesys API calls retry automatically on 429 with ±30% jitter — no action required.

### Preview API limits
- **`token.rate.per.minute`: 300** across all API calls
- **Safe `batch_size` for `prepare_prompt_test`: 8.** Firing ≥ 15 concurrent preview requests triggers 429 on notification channel creation.
- Long pauses during bulk operations are normal — do not cancel or restart.

---

## Key API Facts (do not guess)

| Concern | Correct API |
|---|---|
| Queues for an assistant | `GET /api/v2/assistants/{assistantId}/queues` |
| Voice transcript URL | `GET /api/v2/speechandtextanalytics/conversations/{id}/communications/{commId}/transcriptUrls` |
| Messaging messages | `GET /api/v2/conversations/messages/{id}` + `POST .../messages/bulk?useNormalizedMessage=true` |
| Existing summaries | `GET /api/v2/speechandtextanalytics/conversations/{id}/summaries` |
| Analytics operators | Only `matches`, `exists`, `notExists` — `notMatches` NOT supported |
| Analytics date range | 7 days max per query window |

---

## Required OAuth Scopes (all 7)

`users`, `ai-studio`, `analytics`, `speechandtextanalytics`, `assistants`, `notifications`, `routing`

Run `smoke_test_auth()` after login to verify.
