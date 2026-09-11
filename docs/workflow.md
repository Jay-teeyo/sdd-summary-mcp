# Summary Configuration Testing Workflow

This document describes the end-to-end process for testing and iterating on a Genesys Cloud summary configuration using this MCP server.

---

## Overview

```
1. Authenticate
2. Identify your Agent Copilot
3. Build the interaction filter
4. Bulk fetch transcripts and summaries
5. Generate test cases (rubric + pass/fail criteria)
6. Assemble a test set and run evaluations
7. Iterate on the prompt
8. Publish changes
```

---

## Step 1 — Authenticate

### First login

Paste the **Authorization URL** from your Genesys OAuth client page:

**Genesys Admin → IT and Integrations → OAuth → your client → Authorization URL field**

```
login(authorization_url="<the Authorization URL field, pasted verbatim>")
```

Two formats are accepted — paste whichever one Genesys Admin shows you, unchanged:

| Format | Example | Seen where |
|--------|---------|------------|
| Admin deep-link | `https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/{client_id}` | Usually what the field contains |
| OAuth authorize endpoint | `https://login.{your-region}/oauth/authorize?client_id={client_id}` | Some orgs / older UI |

The deep-link form does not look like an OAuth URL, but it is correct — don't try to convert it.

The `client_id`, region, and login domain are all extracted from the URL automatically — there is nothing else to configure.

### Subsequent logins

After the first login, calling `login()` with no arguments automatically uses the stored Authorization URL:

```
login()
```

### Complete the login

After your browser opens and you see **"Logged in to Genesys Cloud ✓"**, call:

```
complete_login()
```

This exchanges the auth code for a token and verifies all required OAuth scopes. An 8/8 result confirms everything is configured correctly. See [`docs/oauth-setup.md`](./oauth-setup.md) for initial OAuth client setup.

> **Token expiry:** Tokens last approximately 24 hours. When a token expires, any API call will automatically re-open the browser login using the stored Authorization URL. Log in again and retry.

---

## Step 2 — Identify Your Agent Copilot

Tell the assistant which **Agent Copilot** you want to work with — this is the name shown in **Genesys Admin → Agent Copilot**.

> "I want to work with Acme_Copilot"

If you are not sure of the name, list all Agent Copilots in your org:

```
list_assistants()
```

### Multi-language copilots

If your Agent Copilot has more than one summary configuration linked (typical for multi-language deployments), the assistant will list them and ask which one to use:

```
"Acme_Copilot" has 2 summary configurations:
  1. aaaaaaaa-... (en-au)
  2. eeeeeeee-... (th-th)

Re-call build_interaction_filter with summary_setting_id set to your chosen ID.
```

---

## Step 3 — Build the Interaction Filter

`build_interaction_filter` sets up the working directory and records all dependencies. Starting from the Agent Copilot name or ID, it:

1. Fetches the copilot's configuration to find its linked summary setting
2. Looks up the summary setting's name (used as the working directory name)
3. Queries `GET /api/v2/assistants/{assistantId}/queues` — the **direct** queue association endpoint — to find queues the copilot is deployed on
4. Resolves queue names via the routing API
5. Saves everything to `.summaryconfig-lifecycle/{summary_config_name}/interaction-filter.json`

```
build_interaction_filter(copilot_name="Acme_Copilot")
```

The saved file looks like:

```json
{
  "summaryConfigName": "Acme_CallSummary",
  "summarySettingId": "aaaaaaaa-...",
  "builtAt": "2026-01-31T...",
  "copilots": [
    {
      "assistantId": "bbbbbbbb-...",
      "assistantName": "Acme_Copilot",
      "queues": [
        { "id": "cccccccc-...", "name": "Acme_Support_Voice" },
        { "id": "dddddddd-...", "name": "Acme_Support_Chat" }
      ]
    }
  ],
  "queueIds": ["cccccccc-...", "dddddddd-..."]
}
```

The `queueIds` are used by `fetch_transcripts_bulk` and `search_conversations` to scope results to interactions that actually used this summary configuration.

> **Re-run this step** whenever the copilot is assigned to new queues or the summary setting changes.

---

## Step 4 — Bulk Fetch Transcripts and Summaries

Use `fetch_transcripts_bulk` to fetch transcripts and existing production summaries for all relevant conversations in a date range. It reads the interaction filter automatically — no need to provide queue IDs manually.

```
fetch_transcripts_bulk(
  summary_config_name="Acme_CallSummary",
  date_from="2026-01-01T00:00:00Z",
  date_to="2026-01-31T23:59:59Z",
  max_conversations=100,
  concurrency=5
)
```

### What it does

1. Searches conversations scoped to the copilot's queues, filtering to `voice`, `message`, and `callback` only (email, chat, cobrowse, screenshare, and video are excluded)
2. For each conversation, fetches the transcript using the appropriate method:
   - **All conversations:** Try STA/S3 transcript first (`GET /speechandtextanalytics/.../transcriptUrls` → S3 download) — works for both voice and messaging when Genesys transcription is enabled
   - **Messaging fallback:** If STA fails, use the Conversations Messages bulk API (`GET /conversations/messages/{id}` → `POST .../messages/bulk`) — for orgs without STA on messaging queues
3. Fetches the existing production summary for each conversation (best-effort)
4. Saves both to `.summaryconfig-lifecycle/{config}/transcripts/static/`
5. Skips conversations already saved — safe to re-run incrementally

### Output

```
─── Bulk Fetch Complete ───

Working dir:       Acme_CallSummary
Date range:        2026-01-01T00:00:00Z → 2026-01-31T23:59:59Z
Conversations:     50 found

✓ Saved:           47 transcripts + summaries
↷ Skipped:         0 (already saved)
✗ No transcript:   3 (not transcribed)
```

### Fetching a single transcript

For individual conversations (e.g. when investigating a specific interaction):

```
fetch_transcript(
  summary_config_name="Acme_CallSummary",
  conversation_id="<id>",
  transcript_type="static"
)
```

### Manual transcript storage

For controlled test cases with hand-crafted transcripts:

```
store_transcript(
  summary_config_name="Acme_CallSummary",
  transcript="Agent: Hello...\nCustomer: ...",
  label="Orders - New Order - Edge Case",
  transcript_type="static"
)
```

### Listing cached transcripts

```
list_transcripts(summary_config_name="Acme_CallSummary")
```

Use `transcript_type="static"` for control-group transcripts. Use `"dynamic"` for transcripts where you want to track generated summaries across multiple prompt versions.

---

## Step 5 — Generate and Save Test Cases

A test case defines the evaluation rubric for a type of interaction — what a good summary should and should not contain. Provide sample transcripts and expected summaries to guide generation.

```
generate_test_case(
  summary_config_name="Acme_CallSummary",
  test_case_name="New Order - Identity Verified",
  sample_transcript_ids=["<id1>", "<id2>"],
  sample_summaries=["<expected summary 1>", "<expected summary 2>"],
  focus_areas=["identity verification captured", "order status present", "no inference"]
)
```

Save the generated rubric:

```
save_test_case(summary_config_name="Acme_CallSummary", test_case_name="New Order - Identity Verified", ...)
```

List saved test cases:

```
list_test_cases(summary_config_name="Acme_CallSummary")
```

---

## Step 6 — Assemble a Test Set and Run Evaluations

Group test cases and transcripts into a named test set:

```
save_test_set(
  summary_config_name="Acme_CallSummary",
  test_set_name="Sprint 1",
  test_case_names=["New Order - Identity Verified", "Existing Order - Payment Query"],
  transcript_ids=["<id1>", "<id2>", "<id3>"]
)
```

An evaluation run always follows the same four-stage flow:

```
[prepare_prompt_test × N]  →  start_eval_run  →  [subagents: submit_eval_scores × N]  →  finalize_eval_run
     (prompt_test mode only)
```

There are two modes. Use `mode="existing"` to score the summaries already stored on each transcript, which measures current production quality and makes no API calls. Use `mode="prompt_test"` to generate fresh summaries from a candidate prompt — this is the only mode that counts as evidence for deploying a prompt change.

For `prompt_test`, build the preview cache first. Generating every preview inside `start_eval_run` exceeds the MCP client timeout on test sets larger than about 10 transcripts:

```
prepare_prompt_test(
  summary_config_name="Acme_CallSummary",
  test_set_name="Sprint 1",
  version_number=1,
  batch_size=8          ← do not exceed 10
)
```

Repeat that call until it reports complete. Then start the run, which reads from the cache and makes no further API calls:

```
start_eval_run(
  summary_config_name="Acme_CallSummary",
  test_set_name="Sprint 1",
  mode="prompt_test",
  version_number=1
)
```

`start_eval_run` returns a `run_number` plus `batches` and `test_cases`. Scoring is then delegated to one subagent per batch, each calling `submit_eval_scores(run_number, transcript_id, test_case_name, dimension_scores)` once per transcript × test case. Scores are decimals from 0 to 1; a dimension whose `applicabilityCondition` is not met for a given transcript is submitted as `score: null` and excluded from aggregation.

Transcripts whose summary reads "The interaction is too short to create a summary." are removed before batching — no prompt can change that output, so they are never scored, never reach a subagent, and never appear in a pass-rate denominator. This overrides `applicabilityCondition`, `"always"` included. The count is reported by `start_eval_run` and `finalize_eval_run` and shown on the run report.

Once every batch has reported, close the run:

```
finalize_eval_run(
  summary_config_name="Acme_CallSummary",
  test_set_name="Sprint 1",
  run_number=1
)
```

Results are saved to `eval-runs/Sprint 1/0001/`, and both reports are written automatically — the run report at `eval-runs/Sprint 1/0001/dashboard.html` and the rolling improvements report at `eval-runs/Sprint 1/improvements.html`. Each is a single self-contained file: open it in a browser, or send it to someone who has neither the project nor Genesys access.

Read the run report before writing `improvements.md`. Its findings already rank the failing dimensions by weighted impact and quote the evaluator's reasoning, and the requirements pivot shows which business requirements are failing or untested. Call `generate_eval_run_dashboard` or `generate_improvements_dashboard` only to re-render; never write report HTML by hand. After pulling a newer version of the plugin, `regenerate_reports` brings historical runs into the current templates without re-scoring anything.

Always follow `finalize_eval_run` with `save_improvement_recommendations(...)`. Its response carries the prompt under test and a per-dimension failure analysis, which is the raw material for the recommendations write-up.

View historical runs:

```
list_eval_runs(summary_config_name="Acme_CallSummary")
```

---

## Step 7 — Iterate on the Prompt

A revised prompt is tested locally as a candidate before it ever reaches Genesys.

1. Save the revision as a candidate version. Passing `prompt` instead of `summary_setting_id` snapshots the text locally without touching Genesys, and `status` defaults to `candidate`. The call returns the `version` number you will test against:
   ```
   save_version(
     summary_config_name="Acme_CallSummary",
     prompt="<revised prompt>",
     status="candidate",
     notes="Adds fallback rules for unverified identity"
   )
   ```

   A candidate that needs a `changes` evidence trail — linking each edit to the eval run that justified it — has to be written to `version-history/` directly, since `save_version` doesn't author that array.

2. Evaluate it with `mode="prompt_test"` and that `version_number`, following the flow in step 6. The prompt is loaded from the version file, so there is no need to paste it again.

3. Compare the resulting run against previous eval runs before deciding anything.

---

## Step 8 — Publish

Nothing has been pushed to Genesys yet — steps 6 and 7 are entirely local. Publishing is a deliberate, separate act, and it requires that the candidate showed measurable improvement under `prompt_test` and that a human explicitly approved it.

1. Snapshot the still-live prompt first, so you have a rollback point. Passing `summary_setting_id` reads the current setting back from Genesys and records it as `deployed`:
   ```
   save_version(summary_config_name="Acme_CallSummary", summary_setting_id="aaaaaaaa-...")
   ```

2. Push the approved prompt. Either identify the setting directly with `summary_setting_id`, or pass the config name and let it resolve the ID from that config's interaction filter:
   ```
   update_summary_setting(summary_config_name="Acme_CallSummary", prompt="<approved prompt>")
   ```

3. Record the newly live state:
   ```
   save_version(
     summary_config_name="Acme_CallSummary",
     prompt="<approved prompt>",
     status="deployed",
     notes="Deployed to production"
   )
   ```

Never call `update_summary_setting` without prompt_test evidence and explicit approval. Note that it is deliberately not pre-approved, so it will always ask before writing to Genesys.

---

## Folder Structure Reference

```
.summaryconfig-lifecycle/
└── Acme_CallSummary/                        ← named after the summary config, not the copilot
    ├── interaction-filter.json            ← copilot dependency map + queue IDs
    ├── version-history/
    │   └── summary-configuration-1.json   ← prompt snapshots before changes
    ├── transcripts/
    │   ├── static/                        ← control group transcripts (fetched or manual)
    │   └── dynamic/                       ← transcripts with tracked generated summaries
    ├── test-cases/
    │   └── {name}.json
    ├── test-sets/
    │   └── {name}.json
    └── eval-runs/
        └── {test-set}/
            └── {run-number}/              ← 4-digit incrementing (0001, 0002 …)
                ├── _meta.json
                └── {test-case-name}.json
```

---

## Tool Quick Reference

| Tool | Purpose |
|------|---------|
| `login([authorization_url])` | Start browser login. Omit URL after first login — stored URL is reused automatically. |
| `complete_login()` | Exchange auth code for token + verify scopes |
| `smoke_test_auth()` | Verify all 8 required OAuth scopes |
| `list_assistants()` | List all Agent Copilots in the org |
| `build_interaction_filter(copilot_name)` | Set up working directory, resolve queues |
| `fetch_transcripts_bulk(...)` | Bulk fetch transcripts + summaries for a date range |
| `fetch_transcript(...)` | Fetch a single transcript |
| `store_transcript(...)` | Manually paste a transcript |
| `list_transcripts(...)` | List cached transcripts |
| `search_conversations(...)` | Search conversations without fetching transcripts |
| `generate_test_case(...)` | Generate an evaluation rubric from samples |
| `save_test_case(...)` | Save a test case |
| `list_test_cases(...)` | List saved test cases |
| `save_test_set(...)` | Assemble a named playlist of test cases + transcripts |
| `prepare_prompt_test(...)` | Build the preview cache before a prompt_test run (batch_size 8) |
| `start_eval_run(...)` | Begin an eval run; returns run_number, batches, test cases |
| `submit_eval_scores(...)` | Submit scores for one transcript × test case (called per batch) |
| `finalize_eval_run(...)` | Close the run, aggregate results, write both reports |
| `save_improvement_recommendations(...)` | Persist the post-run improvements write-up |
| `list_eval_runs(...)` | View historical evaluation run results |
| `generate_eval_run_dashboard(...)` | Re-render a single run's report |
| `generate_improvements_dashboard(...)` | Re-render the rolling improvements report |
| `regenerate_reports(...)` | Rebuild every report for a config from the results on disk |
| `get_pipeline_state(...)` | Where the config actually is: latest version, deployed version, every run, current stage |
| `generate_rollup_report(...)` | The closing report once a version is accepted and live, with the implemented version outlined |
| `save_version(...)` | Snapshot a prompt to version history, as `candidate` or `deployed` |
| `list_versions(...)` | View prompt version history |
| `update_summary_setting(...)` | Update the prompt in Genesys |
| `get_copilot_config(...)` | Fetch Agent Copilot configuration |
| `update_copilot_config(...)` | Update Agent Copilot configuration |
