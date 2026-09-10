/**
 * SERVER_INSTRUCTIONS — surfaced to every MCP client via the protocol handshake.
 * Kept concise (~400 tokens) so it stays within normal context budgets.
 *
 * FULL_PIPELINE_GUIDE — returned on demand by the get_pipeline_guide tool.
 * Complete reference mirroring the workspace cursor rule.
 */

export const SERVER_INSTRUCTIONS = `
SDD Summary MCP Server — Genesys Cloud AI Studio / Agent Copilot summary configuration testing pipeline.

## Pipeline (always run steps in order)
1. login() → complete_login()
2. build_interaction_filter(copilot_name="<CopilotName>")
3. fetch_transcripts_bulk(summary_config_name=..., date_from=..., date_to=..., max_conversations=...) — runs TOGETHER with step 4
4. fetch_existing_summaries_bulk(summary_config_name=...) — ALWAYS run immediately after step 3

## Evaluation Workflow
Two modes — use the same three-tool flow for both:
  start_eval_run → [subagents: submit_eval_scores × N] → finalize_eval_run

- mode: "existing"      → scores production summaries already stored (no API calls)
- mode: "prompt_test"   → generates new summaries from a candidate prompt via Genesys preview API

Spawn one subagent per batch in parallel using the Task tool with model composer-2.5-fast.
ALWAYS call save_improvement_recommendations after finalize_eval_run — do not skip this.

## Version Management — CRITICAL RULES
- save_version() creates a LOCAL candidate snapshot; it does NOT push anything to Genesys.
- NEVER call update_summary_setting (deploy) without prior prompt_test eval evidence showing improvement.
- To test a candidate: start_eval_run(mode="prompt_test", version_number=N, ...)
- To deploy after approval: update_summary_setting → then save_version with status="deployed" to record it.

## Dashboard Rules
- NEVER write dashboard HTML manually or via file tools.
- finalize_eval_run auto-generates both dashboards (run dashboard + improvements dashboard).
- To force regenerate: call generate_eval_run_dashboard or generate_improvements_dashboard.

## Test Case Authoring — applicabilityCondition (REQUIRED on every dimension)
Every dimension must have applicabilityCondition set:
- "always"           → dimension applies to every transcript unconditionally
- Plain-English string → dimension only applies when the condition is true (e.g. "Summary contains bullets.", "Only applies when a third party participated.")
When a condition is not met for a transcript, evaluators submit score: null (N/A) — excluded from all pass-rate calculations.
RULE: when authoring and uncertain whether a dimension is "always" or conditional — ask the user. Never silently default to "always".

## Eval Scoring — N/A dimensions
submit_eval_scores accepts score: null for any dimension whose applicabilityCondition is not met.
Null scores are excluded from overallScore, overallPassed, pass rates, and failure analysis.
start_eval_run includes applicability_condition on every dimension in the test_cases payload — check it first before scoring.

## Need Help?
Call get_pipeline_guide() for the complete workflow reference including API facts, schema details, and examples.
`.trim();

export const FULL_PIPELINE_GUIDE = `
# SDD Summary Pipeline — Full Reference Guide

This MCP server manages the full lifecycle of Genesys Cloud AI Studio / Agent Copilot summary configuration testing: from fetching transcripts through iterating on prompts to evaluating and deploying improvements.

---

## Required OAuth Scopes (all 8)
\`users\`, \`ai-studio\`, \`analytics\`, \`conversations\`, \`speechandtextanalytics\`, \`assistants\`, \`notifications\`, \`routing\`

Run \`smoke_test_auth()\` after login to verify.

---

## Step 1 — Authentication

### First run: ask before explaining

If nothing is stored yet, ask one question and wait — do not recite setup steps at
a user who already has a client:

> "Do you already have a Genesys Cloud OAuth client set up for this?"

**Yes** → ask for the Authorization URL (Genesys Admin → IT and Integrations →
OAuth → open the client → bottom of the page), then pass it through verbatim:
\`\`\`
login(authorization_url="<whatever they pasted>")
\`\`\`

**Do not reject or rewrite what they paste.** Both of these are valid:
- \`https://apps.{region}/directory/#/admin/access-management/authorized-apps/{id}\`
  — what the Genesys UI field usually contains
- \`https://login.{region}/oauth/authorize?client_id={id}\`

The first looks nothing like an authorize URL but is correct. Let \`login()\` decide.

**No** → walk them through it one step at a time, confirming as you go:

1. Genesys Admin → Integrations → OAuth → Add Client. Grant Type
   **Code Authorization**, Redirect URI \`http://localhost:8787/callback\`
   (exact match required). No client secret needed — PKCE.
2. Scope tab: add all 8 — \`users\`, \`ai-studio\`, \`analytics\`, \`conversations\`,
   \`speechandtextanalytics\`, \`assistants\`, \`notifications\`, \`routing\`.
3. Save, reopen, copy the **Authorization URL** from the bottom, then call
   \`login(authorization_url="...")\`.

**All subsequent logins** — the URL is stored, no argument needed:
\`\`\`
login()
\`\`\`

After the browser confirms login, call:
\`\`\`
complete_login()
\`\`\`

### Auth gotchas
- Tokens last ~30 min. On expiry, any API call auto-reopens the browser — log in and retry.
- If \`login()\` uses the wrong org (wrong \`client_id\`), an env var (\`GENESYS_CLIENT_ID\`) may be shadowing the stored config. Re-run \`login()\` with no args to use the stored \`lastAuthorizationUrl\`.

---

## Step 2 — Interaction Filter

\`\`\`
build_interaction_filter(copilot_name="Acme_Copilot")
\`\`\`

- Takes the **Agent Copilot name** (from Genesys Admin → Agent Copilot), not the summary config name.
- Names the working directory after the **summary config name** (fetched from \`getSummarySetting\`).
- Saves to \`.summaryconfig-lifecycle/{summaryConfigName}/interaction-filter.json\`.
- If the copilot has multiple summary settings (multi-language), re-call with \`summary_setting_id=...\`.

---

## Step 3 — Bulk Fetch Transcripts

\`\`\`
fetch_transcripts_bulk(
  summary_config_name="Acme_CallSummary",
  date_from="2026-01-01T00:00:00Z",
  date_to="2026-01-31T23:59:59Z",
  max_conversations=100,
  concurrency=5
)
\`\`\`

- Reads queue IDs from \`interaction-filter.json\` automatically — do **not** pass queue IDs manually.
- Included media types: \`voice\`, \`message\`, \`callback\`. Excluded: \`email\`, \`chat\`, \`cobrowse\`, \`screenshare\`, \`video\`.
- Safe to re-run — already-saved conversations are skipped.
- **Always run Step 3 and Step 4 together.**

---

## Step 4 — Enrich with Existing Summaries

\`\`\`
fetch_existing_summaries_bulk(
  summary_config_name="Acme_CallSummary",
  concurrency=5
)
\`\`\`

- Fetches existing summaries from Genesys STA for every stored transcript.
- Summary selection: prefers \`summaryType: "Agent"\` (configured prompt output), falls back to \`"Conversation"\`, then first available.
- Before/after detection: when both \`generated: false\` (agent-edited) and \`generated: true\` (AI output) exist, stores:
  - \`existingSummary\` = agent-edited version (the "after")
  - \`aiGeneratedSummary\` = original AI output (the "before")
- Safe to re-run — already-enriched transcripts are skipped unless \`overwrite=true\`.

---

## Stored Transcript Schema

After steps 3 + 4, each file in \`transcripts/static/\` looks like:

\`\`\`json
{
  "id": "<conversationId>",
  "conversationId": "<conversationId>",
  "communicationId": "<commId>",
  "plainText": "Agent: ...\\nCustomer: ...",
  "existingSummary": "...",
  "aiGeneratedSummary": "...",
  "createdAt": "..."
}
\`\`\`

---

## Requirements

- Live in \`requirements/final/requirements.md\` using IDs: \`BR-{SummaryConfigName}-{NNN}\`
- Raw artefacts (emails, QA feedback, complaint logs) go in \`requirements/artefacts/\`
- **\`settingType: "Prompt"\` — the \`prompt\` field is the sole source of instructions.** All other config fields are platform metadata — ignore them when deriving requirements or authoring test cases.

---

## Test Cases

- One test case per requirement category; file name: \`{Category}-{DescriptiveName}.json\` in \`test-cases/\`
- Each dimension references \`requirementIds: ["BR-..."]\` for traceability
- Scores are decimal **0–1** (0 = total failure, 1 = perfect pass)
- \`passThreshold\` sets the minimum score — use \`1.0\` for binary must/must-not rules, \`0.8\` for coverage and style rules
- \`passCriteria\` must describe the scoring gradient with anchor points
- Every \`BR-\` ID in requirements must be covered by at least one dimension

### applicabilityCondition — required on every dimension

Every dimension **must** have an \`applicabilityCondition\` field. It controls when the dimension is evaluated:

- **\`"always"\`** — evaluate unconditionally against every transcript (the default for most dimensions)
- **Any other string** — a plain-English condition describing when the dimension applies; if the condition is not met for a particular transcript, the evaluator must submit \`score: null\` (N/A)

**N/A scoring rules:**
- Evaluators check \`applicabilityCondition\` first; if the condition is not met they submit \`score: null\`, NOT \`score: 1.0\`
- Null scores are excluded from pass-rate and average-score calculations entirely
- A dimension that is N/A for a transcript does **not** count as a pass or a fail — it is simply not counted
- This means pass-rate = passes / evaluated (not passes / total), keeping conditional dimension stats honest

**Example — conditional dimension (third party present):**
\`\`\`json
{
  "name": "Third-party role stated",
  "applicabilityCondition": "Only applies when a third party (non-customer, non-agent) participated in the interaction.",
  "passCriteria": "Score 1.0: third-party relationship clearly stated. Score 0 if third party is present but unacknowledged.",
  "passThreshold": 0.8
}
\`\`\`

**Example — conditional dimension (structural prerequisite):**
\`\`\`json
{
  "name": "Section spacing correct",
  "applicabilityCondition": "Summary contains at least 2 sections.",
  "passCriteria": "Score 1.0: every pair of adjacent sections is separated by a blank line.",
  "passThreshold": 0.8
}
\`\`\`

### Authoring rule — when to ask the user

When creating test cases via \`generate_test_case\`:
- If it is **obvious** that a dimension applies universally → set \`"always"\`
- If a structural or content prerequisite is required → write the condition explicitly
- If **uncertain** → **stop and ask the user** before calling \`save_test_case\`. Never silently default to \`"always"\`.

This keeps conditions intentional and prevents silent N/A mis-scoring in future eval runs.

---

## Test Sets

- File: \`test-sets/{SummaryConfigName}-{DescriptiveName}.json\`
- \`testCaseNames\` = list of test case filenames (no \`.json\`); \`transcriptIds\` = IDs from \`transcripts/static/\`
- Standard full suite: all test cases × all static transcripts, named \`{ConfigName}-Full-Test-Suite\`

---

## Running Evaluations

Two modes — same flow (with a required pre-step for prompt_test):

\`\`\`
[prepare_prompt_test × N calls]  →  start_eval_run  →  [subagents: submit_eval_scores × N]  →  finalize_eval_run
      (prompt_test only)
\`\`\`

### Mode 1 — Evaluate existing summaries (mode: "existing")
- Reads \`existingSummary\` already stored on each transcript — no API calls
- Use to measure current production quality

### Mode 2 — Test a candidate prompt (mode: "prompt_test")
- Provide \`version_number=N\` to load a saved candidate version (preferred) or \`prompt="..."\` for an inline prompt
- Generates new summaries via Genesys preview API
- **MUST use this mode when testing candidate versions — never deploy without prompt_test evidence**

**IMPORTANT — use \`prepare_prompt_test\` before \`start_eval_run\` for any test set larger than ~10 transcripts.**
Generating all previews in a single \`start_eval_run\` call exceeds the MCP client timeout.
The safe pattern:
\`\`\`
# 1. Build the preview cache — repeat until complete: YES
prepare_prompt_test(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  version_number=1,
  batch_size=8        ← do not exceed 10; see Rate Limiting section
)
# 2. Start the eval — reads from cache, makes no API calls
start_eval_run(summary_config_name=..., test_set_name=..., mode="prompt_test", version_number=1)
\`\`\`

### Subagent setup
- \`start_eval_run\` returns \`run_number\`, \`total_batches\`, \`batches\`, and \`test_cases\`
- Spawn **one subagent per batch** using model \`composer-2.5-fast\`
- Each subagent calls \`submit_eval_scores(run_number, transcript_id, test_case_name, dimension_scores)\` once per transcript × test case
- Scores: decimal 0–1 (0 = total failure, 0.5 = half pass, 1 = perfect); submit \`score: null\` when a dimension's \`applicabilityCondition\` is not met for the transcript — null scores are excluded from all aggregation
- After all subagents complete, call \`finalize_eval_run(run_number)\`

### Post-eval
- **ALWAYS call \`save_improvement_recommendations\` after \`finalize_eval_run\`** — do not skip.
- Read \`finalize_eval_run\`'s full response — it includes the prompt under test, per-dimension failure analysis, and explicit instructions for what to write.
- Analyse failures by dimension, identify root causes, write \`improvements.md\` using the structure below.
- Call \`save_improvement_recommendations(summary_config_name, test_set_name, run_number, content)\` to persist it.

---

## improvements.md — Required Structure

Every \`improvements.md\` must include all five sections:

\`\`\`markdown
# Prompt Improvement Recommendations — Run {NNNN}

**Summary config:** {configName}
**Test set:** {testSetName}
**Model:** Claude Haiku 4.5
**Run date:** {date}
**Mode:** {existing summaries | prompt test}
**Overall pass rate:** {X}%

---

## Test Case Results

| Test Case | Pass Rate | Avg Score | Status |
|---|---|---|---|
| ... | ...% | 0.XX | ✅ / ❌ |

---

## Failing Dimension Analysis

### {TestCaseName} — {DimensionName} ({passRate}% pass)

**What it tests:** {from passCriteria}
**Failure pattern:** {synthesized from the evaluator reasoning samples}
**Root cause in prompt:** {what the prompt is missing or stating ambiguously}

[repeat for each failing dimension]

---

## Prompt Improvement Suggestions

### 1. {Descriptive title for change}

**Why:** {link to the failure pattern above}
**Change:** Add / modify / remove the following in the prompt:

> {specific text, as it should appear in the prompt}

**Claude Haiku 4.5 note:** {any model-specific consideration}

[repeat for each suggestion]

---

## Proposed Improved Prompt

\\\`\\\`\\\`
{complete revised prompt text}
\\\`\\\`\\\`
\`\`\`

---

## Claude Haiku 4.5 — Model Characteristics

The Genesys Cloud AI Studio model is **Claude Haiku 4.5** (constant \`SUMMARY_MODEL_NAME\` in \`config.ts\`).
All prompt improvement work must be tailored to this model's characteristics:

| Characteristic | Implication for prompts |
|---|---|
| **Highly instruction-literal** | If the prompt doesn't say to include something, it won't appear. Add explicit "You MUST include..." clauses for required elements. |
| **Terse by default** | State length and detail requirements explicitly (e.g. "Write 3–5 sentences", "Include at least one example"). |
| **Omits contextual detail** | Must be explicitly told to include reasons, context, or elaboration — it will not infer them. |
| **Responds well to explicit output templates** | Provide a concrete structure with labelled sections rather than describing the structure in prose. |
| **Responds well to numbered instruction lists** | Sequential "You MUST..." clauses are more reliably followed than open-ended guidance. |
| **Avoids inference** | State expected behaviour explicitly — it will not infer what the agent "should" do from context. |

---

## Version Management

### Creating a candidate version

**Do NOT call \`save_version()\` to create a candidate.** \`save_version\` only snapshots the currently live Genesys config.

To author a local draft, write the JSON file directly to \`version-history/summary-configuration-N.json\`:

\`\`\`json
{
  "version": 1,
  "status": "candidate",
  "setting": {
    "prompt": "<full revised prompt text>"
  },
  "notes": "Candidate version — NOT yet deployed.",
  "snapshotAt": "<ISO timestamp>",
  "changes": [
    {
      "change": "Description of what changed",
      "affectedDimension": "TestCaseName / DimensionName",
      "runEvidence": "X/Y transcripts failed in run NNNN. Description of failure pattern.",
      "reason": "Why this specific change addresses the failure for Claude Haiku 4.5."
    }
  ]
}
\`\`\`

- \`status: "candidate"\` marks it as a local draft — it will never be pushed to Genesys automatically
- The \`changes\` array records the evidence trail: which eval run exposed the issue and why the change addresses it
- Version numbering must not skip: if \`summary-configuration-0.json\` exists, the next candidate is \`summary-configuration-1.json\`

### Testing a candidate
\`\`\`
# Step 1 — build preview cache (repeat until complete: YES, use batch_size=8)
prepare_prompt_test(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  version_number=2,
  batch_size=8
)
# Step 2 — start eval run (reads cache, no API calls)
start_eval_run(
  summary_config_name="Acme_CallSummary",
  test_set_name="Acme_CallSummary-Full-Test-Suite",
  mode="prompt_test",
  version_number=2
)
\`\`\`
- Loads the prompt from the version file automatically — do not re-paste it
- For test sets ≤ 10 transcripts, a single \`prepare_prompt_test\` call is sufficient before \`start_eval_run\`

### Deploying (only after approval)
1. Review eval results — candidate must show measurable improvement
2. Get explicit user approval before deploying
3. \`update_summary_setting(summary_config_name=..., prompt=...)\` — pushes to Genesys
4. \`save_version(..., status="deployed")\` — records the deployed state

**NEVER call \`update_summary_setting\` without prior prompt_test eval evidence and user approval.**

---

## Dashboard Rules (MANDATORY)

| Dashboard | Tool | Location |
|---|---|---|
| Run dashboard | auto via \`finalize_eval_run\` | \`eval-runs/{testSet}/{NNNN}/dashboard.html\` |
| Improvements dashboard | auto via \`finalize_eval_run\` | \`eval-runs/{testSet}/improvements.html\` |

- **NEVER generate dashboard HTML manually** — always use \`generate_eval_run_dashboard\` or \`generate_improvements_dashboard\`
- Both are called automatically by \`finalize_eval_run\` — only call them explicitly to force regeneration

---

## Rate Limiting

All Genesys API calls go through automatic retry with jitter. You do not need to do anything special.

| Response | Action |
|---|---|
| \`429 Too Many Requests\` | Reads \`Retry-After\` header, adds ±30% random jitter, sleeps, retries — up to **4 times** |
| \`5xx\` **with** \`Retry-After\` | Same wait + retry — up to **2 times** |
| \`5xx\` **without** \`Retry-After\` | Throws immediately (Genesys docs say do not auto-retry these) |
| Retries exhausted | Throws \`GenesysApiError\` with a clear message |

Every retry logs to stderr: \`[rate-limit] 429 on GET /api/v2/... — waiting 12.3s (retry 1/4)\`

### Preview API — confirmed limits

- **\`token.rate.per.minute\`: 300** across all API calls for the authenticated token
- **Notification channel burst sensitivity:** each preview request creates a short-lived notification channel. Firing ≥ 15 concurrent preview requests reliably triggers \`429 Failed to create notification channel\`, independent of the per-minute token budget.
- **Safe \`batch_size\` for \`prepare_prompt_test\`: 8.** Do not exceed 10. The retry logic will recover from a channel 429, but staying at 8 avoids the overhead entirely.
- Long pauses during bulk operations are normal — the server is honouring Genesys \`Retry-After\` headers. Do not cancel or restart.
- \`Retry-After\` values from Genesys are in seconds. Typical value is 10–30 s; the cap in code is 65 s (including jitter).

---

## Lifecycle Folder Structure

\`\`\`
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
    ├── test-sets/
    ├── version-history/
    │   └── summary-configuration-{N}.json
    └── eval-runs/
        └── {test-set-name}/
            ├── improvements.html
            └── {NNNN}/
                ├── _pending.json
                ├── {TestCaseName}.json
                ├── dashboard.html
                └── improvements.md
\`\`\`

---

## Key API Facts

| Concern | Correct API |
|---|---|
| List assistants | \`GET /api/v2/assistants?tier=Copilot&pageSize=50\` — returns 500 above ~97 entities per response despite a documented \`pageSize\` max of 200, so keep pages small |
| Queues for an assistant | \`GET /api/v2/assistants/{assistantId}/queues\` (cursor pagination with \`after\`/\`nextUri\`) |
| Queue display names | \`GET /api/v2/routing/queues?id=id1&id=id2...\` |
| Voice transcript URL | \`GET /api/v2/speechandtextanalytics/conversations/{id}/communications/{commId}/transcriptUrls\` |
| Messaging messages | \`GET /api/v2/conversations/messages/{id}\` + \`POST .../messages/bulk?useNormalizedMessage=true\` |
| Existing summaries | \`GET /api/v2/speechandtextanalytics/conversations/{id}/summaries\` |
| Summary settings | \`GET /api/v2/conversations/summaries/settings\` |
| Analytics filter operators | Only \`matches\`, \`exists\`, \`notExists\` — \`notMatches\` is NOT supported |
| Analytics date range limit | 7 days max per query window |
`.trim();
