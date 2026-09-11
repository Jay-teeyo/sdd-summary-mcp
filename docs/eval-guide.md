# Evaluation Guide

This guide covers how to run evaluation runs against a test set. Two modes are supported. Both use the same three-tool flow and produce identical output structures.

For test case and test set authoring, see `docs/test-case-guide.md`.

---

## 1. Two Evaluation Modes

### Mode 1 — Evaluate Existing Summaries (`mode: "existing"`)

**Purpose:** Measure how well the current production configuration performs against the requirements.

- Reads `existingSummary` from each transcript already stored in `transcripts/static/`
- No Genesys API calls required — purely local
- Fast and cheap to run
- Use this to establish a baseline or measure production quality

**Prerequisites:**
- `fetch_transcripts_bulk` has been run
- `fetch_existing_summaries_bulk` has been run (so `existingSummary` is populated)
- Test cases and a test set exist

### Mode 2 — Test a Candidate Prompt (`mode: "prompt_test"`)

**Purpose:** Measure how a new or modified prompt performs before publishing it to Genesys.

- Takes a candidate prompt as input
- Generates new summaries via the Genesys preview API using the existing transcripts from `transcripts/static/` — **no new conversations are fetched**
- Stores the generated summaries in the eval run for comparison and record-keeping
- Evaluates generated summaries against the rubric
- Requires a valid user token (login required)

**Prerequisites:**
- `fetch_transcripts_bulk` has been run (transcripts must exist locally)
- Test cases and a test set exist
- User is logged in (`login` + `complete_login`)

**For large test sets (> ~10 transcripts): use `prepare_prompt_test` first.**

Generating many Genesys preview summaries in a single `start_eval_run` call will exceed the MCP client timeout. Instead, use the batched cache pattern described in Section 2a below. `start_eval_run` reads from the cache automatically — no extra arguments needed.

---

## 2. Three-Tool Flow

```
[prepare_prompt_test × N calls]  →  start_eval_run  →  [subagents: submit_eval_scores × N]  →  finalize_eval_run
       (prompt_test only)
```

## 2a. Pre-generating Previews — `prepare_prompt_test` (prompt_test mode only)

The Genesys preview API generates one summary per transcript via a short-lived notification channel. Each call:
1. Creates a notification channel (`POST /api/v2/notifications/channels`)
2. Calls the preview summary endpoint and subscribes to the channel for the response
3. Downloads and caches the generated summary to disk

**Rate limit reality:** Genesys applies a per-token limit of **300 requests/minute** across all API calls, and the notification channel creation endpoint has its own burst sensitivity. In practice, firing more than **8–10 concurrent preview requests** reliably triggers a `429` on channel creation — even if the per-minute budget is not exhausted. The MCP server's built-in retry logic will recover automatically, but it adds unnecessary latency.

**Recommended pattern for any prompt_test run:**

```
# Step 1: generate previews in safe batches until all transcripts are cached
prepare_prompt_test(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  version_number=1,
  batch_size=8           # empirically safe — do not exceed 10
)
# → repeat until response shows: complete: YES ✓
# Each call processes batch_size transcripts in parallel and appends to the cache.

# Step 2: once complete=true, start the run — reads from cache, no API calls
start_eval_run(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  mode="prompt_test",
  version_number=1
)
```

**Progress reporting:** each `prepare_prompt_test` call returns:
- `cached` / `remaining` / `complete` — shows progress toward full coverage
- `Generated: N this call` — confirms how many were processed
- Estimated number of remaining calls

**Resumability:** the cache file (`eval-runs/{testSetName}/.preview-cache-v{N}.json`) is written after each batch. If the agent is interrupted, simply re-call `prepare_prompt_test` — already-cached transcripts are skipped.

**Clearing the cache:** pass `clear_cache=true` to discard the cache and regenerate all previews (e.g. after editing the version's prompt).

**Scale guidance:**

| Test set size | batch_size | Approx. calls to complete |
|---|---|---|
| ≤ 10 transcripts | 8 | 1–2 |
| ~50 transcripts | 8 | ~7 |
| ~100 transcripts | 8 | ~13 |

---

### Step 1 — `start_eval_run`

```
start_eval_run(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  mode="existing",         # or "prompt_test"
  prompt="...",            # required for prompt_test only
  batch_size=5             # transcripts per subagent batch (default 5, max 20)
)
```

Returns:
- `run_number` — disk-backed identifier for this run; survives across agent sessions
- `total_batches` — how many subagents to spawn
- `batches` — array of transcript + summary data, one per batch
- `test_cases` — all test case dimensions, included once for all batches

The run directory is created on disk immediately at `eval-runs/{test_set_name}/{run_number}/`. If the agent crashes mid-run, the run can be resumed — scores already submitted are preserved.

### Step 2 — Subagents: `submit_eval_scores`

Spawn **one subagent per batch** using a fast model (`composer-2.5-fast`). Each subagent:

1. Reads its batch of transcripts (each with `plain_text` and `summary`)
2. For each transcript, scores every dimension of every test case:
   - Reads the transcript to verify factual accuracy
   - Reads the summary
   - Assigns a decimal score **0.0–1.0** per dimension (0 = total failure, 1 = perfect pass, 0.5 = half pass)
   - Writes a brief `reasoning` string
3. Calls `submit_eval_scores` once per (transcript × test case):

```
submit_eval_scores(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  run_number=1,
  transcript_id="abc-123",
  test_case_name="Global-Rules-Tone",
  summary_text="<the summary that was evaluated>",
  dimension_scores=[
    { "dimension": "Customer terminology", "score": 1.0, "reasoning": "Only 'customer' used throughout." },
    { "dimension": "No prohibited wording", "score": 0.75, "reasoning": "Word 'advised' appears once in Actions Completed." },
    ...
  ]
)
```

Pass/fail per dimension is computed automatically by comparing `score` against the dimension's `passThreshold`.

### Step 3 — `finalize_eval_run`

After all subagents complete:

```
finalize_eval_run(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  run_number=1
)
```

- Merges all intermediate per-transcript files → one `{TestCaseName}.json` per test case (all transcripts inside)
- Deletes the intermediate files
- Computes overall and per-test-case pass rates and average scores
- Writes final stats to `_pending.json`
- Returns a human-readable breakdown by test case

---

## 3. Subagent Configuration

Each subagent handling one batch should be spawned with:

| Setting | Value |
|---------|-------|
| Model | `composer-2.5-fast` |
| Task | Score each transcript × test case in its batch and call `submit_eval_scores` for each |

The subagent prompt should include:
- The batch contents (`transcript_id`, `plain_text`, `summary`, `transcript_label`)
- The full `test_cases` array (dimensions, pass/fail criteria, pass thresholds)
- The `run_number`, `summary_config_name`, `test_set_name` to pass to `submit_eval_scores`
- Scoring instructions: decimal 0–1, anchor points from the `passCriteria` text, call `submit_eval_scores` once per transcript × test case

### Subagent prompt template

```
You are evaluating AI-generated customer support call summaries against a set of quality rubrics.

Configuration:
- summary_config_name: {summary_config_name}
- test_set_name: {test_set_name}
- run_number: {run_number}

Test cases and dimensions:
{test_cases JSON}

Your batch of transcripts to evaluate:
{batch JSON}

For each transcript:
1. Read the plain_text (what was said) and summary (what the AI produced)
2. For each test case, score every dimension on a decimal scale 0.0–1.0:
   - 1.0 = perfectly meets the criterion
   - 0.5 = partially meets the criterion
   - 0.0 = completely fails the criterion
   Use the passCriteria text as guidance for intermediate scores.
3. Call submit_eval_scores once per (transcript × test case) with your scores and reasoning.
```

---

## 4. Output Structure

**During the run** — each `submit_eval_scores` call writes one intermediate file (safe for concurrent subagents — no contention):

```
eval-runs/{test_set_name}/{NNNN}/{transcript_id}__{test_case_name}.json
```

**After `finalize_eval_run`** — intermediate files are merged and deleted, leaving one file per test case:

```
eval-runs/{test_set_name}/{NNNN}/
  _pending.json                            ← run metadata + aggregate pass rates
  Global-Rules-Tone.json      ← all transcripts' results for this test case
  Structure-Required-Sections.json
  Format-And-Layout.json
  ...
```

Each `{TestCaseName}.json` contains:

```json
{
  "testCaseName": "Global-Rules-Tone",
  "totalTranscripts": 97,
  "passRate": 0.75,
  "averageScore": 0.88,
  "results": [
    {
      "transcriptId": "abc-123",
      "transcriptLabel": "...",
      "summary": "...",
      "dimensionScores": [...],
      "overallPassed": true,
      "overallScore": 0.95
    },
    ...
  ]
}
```

---

## 5. Scale and Cost Guidance

For `Acme_CallSummary-Full-Test-Suite` (for a suite of ~50 transcripts × 8 test cases = ~400 individual scorings):

| Setting | Recommendation |
|---------|----------------|
| `batch_size` (subagents) | 5 (default) → ~20 subagents |
| Subagent model | `composer-2.5-fast` |
| Mode 1 wall time | ~3–6 minutes (no API calls, pure LLM evaluation) |
| Mode 2 — preview generation | ~10–15 calls to `prepare_prompt_test` at `batch_size=8`; ~15–25 minutes total |
| Mode 2 — scoring (after cache) | Same as Mode 1 once `start_eval_run` reads from cache |

**Mode 2 preview API limits (Genesys-confirmed):**
- `token.rate.per.minute`: 300 requests/token across all API calls
- `token.rate.per.day`: varies by org tier
- Notification channel creation is burst-sensitive — **do not exceed `batch_size=8`** in `prepare_prompt_test`
- The MCP server will retry `429` responses automatically with ±30% jitter, but staying within the safe batch size avoids the retry overhead entirely

For smaller smoke tests, use a reduced test set of 5–10 transcripts and a single test case. Run `prepare_prompt_test` once (batch_size=8 covers ≤8 transcripts in one call), then `start_eval_run`.

---

## 6. Reports

`finalize_eval_run` writes both reports automatically. Open either in any browser — no server, no network, nothing to install. Each file embeds its own data, so it can be copied, attached to an email, or committed for review and it still works.

Both are rendered from templates that ship inside the plugin, so every report from every project looks and behaves the same, and pulling a newer version of the plugin gives you newer reports.

### Run report — `{NNNN}/dashboard.html`

The run, then the evidence behind it:

- **Headline** — the share of interactions that passed *every* test case, the weighted score, and the unweighted mean beside it. Weighting uses each dimension's weight (1–5), so a compliance rule does not count the same as a style preference. A toggle switches every table between weighted and unweighted.
- **Findings** — derived from this run's own scores, ranked by weighted impact, each quoting the evaluator's reasoning so you can disagree with it. Includes regressions against the previous run, requirements with no coverage, and dimensions pointing at requirement IDs that do not exist.
- **Drill-down** — test case → rubric dimension → how that dimension scored against every interaction → an interaction's summary beside its source transcript. A dimension × interaction heat grid shows at a glance whether a row (the rubric) or a column (one summary) is the problem.
- **Requirements pivot** — the same results indexed by business requirement: covered, passing, failing, or untested.

Runs excluded before scoring (interactions Genesys refused to summarise) and the preview structure used are both shown, so a run measured against the wrong setting structure is visible rather than silently wrong.

To re-render without re-running:
```
generate_eval_run_dashboard(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  run_number=1
)
```

### Improvements report — `improvements.html`

Saved at `eval-runs/{test_set_name}/improvements.html`, one level above the numbered run folders, and refreshed on every `finalize_eval_run`. This is the run-over-run view:

- Pass rate and weighted score trend across every finalized run, labelled by prompt version
- **Changelog** — what changed between runs: the prompt diff, the version's notes, and which test cases and requirements moved
- Heat matrices per test case and per requirement across all runs
- **Watchlist** — what is still unresolved in the latest run
- Runs whose test set composition changed are marked, because a delta across that boundary compares different populations rather than measuring progress

To re-render without re-running:
```
generate_improvements_dashboard(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite"
)
```

### Rollup report — `rollup.html`

Written once you accept a version and it goes live, by `generate_rollup_report`. Saved beside `improvements.html`, it is the closing account of the cycle rather than another view of a run:

- Baseline, implemented result, and the movement between them — plus how many test cases improved, held and regressed
- **The pass-rate matrix with the implemented version's column outlined.** The version you ship is often not the one with the highest headline, so the matrix marks which column is production instead of letting the biggest number imply it. Where a higher-scoring run was not the one deployed, the report says so and leaves the reasoning to you
- **What shipped** — the live version, when it was pushed, the run that measured it, and the snapshot holding the prompt it replaced, so the rollback point is written down rather than remembered
- **Commentary** — the authored part: an executive summary, one card per problem class with the issue, the approach and the benefit, notes on the measurement itself, and recommended next steps
- What is still open in the implemented run, taken from that run's findings

Which version is live is established by matching the deployed prompt text against the candidate snapshots, not by snapshot order — so the report names the candidate that actually shipped.

The narrative is the one thing that cannot be derived from the data, so it is supplied as arguments and stored as `rollup.json` next to the runs. That keeps the rollup a derived artefact like the rest: `regenerate_reports` re-renders it from the saved narrative when the templates change.

```
generate_rollup_report(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  executive_summary="...",
  themes=[{ "title": "...", "issue": "...", "approach": "...", "benefit": "...", "metric": "40% → 85%" }],
  methodology_notes=["..."],
  next_steps=["..."]
)
```

### Rebuilding reports

Reports are derived artefacts — the JSON files in `eval-runs/` are the record. Nothing is lost by deleting a report, and none of this re-scores anything or calls Genesys:

```
regenerate_reports(summary_config_name="Acme_CallSummary")
```

Run it after pulling a newer version of the plugin (historical runs then render in the current templates), after editing `requirements.md` (requirement coverage and the untested-requirement warnings refresh), or if report generation failed during finalization.

> **Never write report HTML manually.** The templates live in `mcp-server/src/reports/templates/` and the model that feeds them in `mcp-server/src/reports/`. Change the design there — `npm run preview:reports` renders the templates against fixture data for review, and `npm run verify:reports` checks the whole pipeline against a synthetic workspace. Hand-patched HTML is overwritten on the next run.

---

## 8. Comparing Runs

After running both a Mode 1 (baseline) and Mode 2 (candidate prompt) eval, compare the results by calling `list_eval_runs` and reviewing the per-test-case pass rates. A candidate prompt should improve pass rates on the test cases that motivated the change without degrading others.
