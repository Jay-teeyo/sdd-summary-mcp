/**
 * SERVER_INSTRUCTIONS — surfaced to every MCP client via the protocol handshake.
 * Kept concise (~400 tokens) so it stays within normal context budgets.
 *
 * FULL_PIPELINE_GUIDE — returned on demand by the get_pipeline_guide tool.
 * Complete reference mirroring the workspace pipeline rule / steering doc.
 *
 * Both interpolate the host-specific subagent spawn instruction from host.ts,
 * because that is the one part of this guidance that differs between Cursor and
 * Kiro. See host.ts for why naming the wrong mechanism fails silently.
 */

import { spawnInstructionBrief, spawnInstructionFull } from "./host.js";

export const SERVER_INSTRUCTIONS = `
SDD Summary MCP Server — Genesys Cloud AI Studio / Agent Copilot summary configuration testing pipeline.

## Pipeline (always run steps in order)
1. login() → complete_login()
2. build_interaction_filter(copilot_name="<CopilotName>")
3. fetch_transcripts_bulk(summary_config_name=..., date_from=..., date_to=..., max_conversations=...) — runs TOGETHER with step 4
4. fetch_existing_summaries_bulk(summary_config_name=...) — ALWAYS run immediately after step 3
5. Requirements — ASK the user to add artefacts to requirements/artefacts/ first, ASK whether to also
   derive from the existing prompt (optional), then have them REVIEW requirements.md before any test
   cases are written. Never derive requirements silently. See the Requirements section of the full guide.

## Decision Gates — ASK, THEN STOP
Whenever you ask the user a question (gate, approval, clarification): end your turn there.
Never continue past an unanswered question, and never leave more than one question open.
An unanswered question card stays live indefinitely; if you work on regardless, its answer
can arrive hours later, describing a state that no longer exists.

## Before Acting on Any Version or Run Instruction
Instructions carry no timestamp. A late gate answer, a resumed session or a queued question
can hand you wording composed much earlier ("create candidate v1", "build v3") that reads as
valid at any point in the cycle. Call get_pipeline_state(summary_config_name=...) — local
files only, no API calls — and if the instruction names a version or run that already exists,
it describes finished work: say so and ask, do not redo it.

## Evaluation Workflow
Two modes — use the same three-tool flow for both:
  start_eval_run → [subagents: submit_eval_scores × N] → finalize_eval_run

- mode: "existing"      → scores production summaries already stored (no API calls)
- mode: "prompt_test"   → generates new summaries from a candidate prompt via Genesys preview API

${spawnInstructionBrief()}
ALWAYS call save_improvement_recommendations after finalize_eval_run — do not skip this.

## Version Management — CRITICAL RULES
- save_version() only ever writes to version-history/ locally; it NEVER pushes anything to Genesys.
- NEVER call update_summary_setting (deploy) without prior prompt_test eval evidence showing improvement.
- To test a candidate: start_eval_run(mode="prompt_test", version_number=N, ...)
- To deploy after approval: update_summary_setting → then save_version with status="deployed" to record it.

## Report Rules
- NEVER write report HTML manually or via file tools. The templates ship inside this server.
- finalize_eval_run auto-generates both reports (run report + improvements report).
- To re-render one: generate_eval_run_dashboard or generate_improvements_dashboard.
- After deploying a newer server version, or after editing requirements.md: regenerate_reports.
- Once the user accepts a version and it is live: generate_rollup_report — the closing account of
  the cycle, with the narrative (executive summary, themes, next steps) you supply. Never hand-write it.

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

## The prompt is the only input — settingType "Prompt"
This pipeline only works with summary configurations whose settingType is "Prompt". Under that type the model reads the prompt and nothing else; language selects the output language.
summaryType, format, maskPII, predefinedInsights and participantLabels are platform metadata. Genesys does not apply them, so never cite them when deriving requirements, authoring test cases, explaining a score or recommending a change.
This has a consequence worth stating plainly: a formatting, structure or speaker-naming failure is ALWAYS a defect in the prompt. It can never be excused as a config setting or a preview artefact. If the output must use bullet points or call the customer "member", the prompt has to say so — setting format: BulletPoints does nothing.
If a tool returns a warning that settingType is not "Prompt", stop and tell the user the results describe the wrong input.

## Summary Setting Updates and Previews — every field is preserved, two are read
update_summary_setting reads the live setting and PUTs it back whole, changing only the prompt — Genesys rejects a partial body, and omitting a field would wipe it from the customer's config.
Preview generation and version snapshots inherit the same full object for the same reason. Only prompt and language affect what comes back.
preview_structure reports the language and settingType a run used. "fallback defaults" means the live setting could not be read and language defaulted to en-au — mention it if the config is not English, but do not treat it as a caveat on formatting results.

## Eval Scoring — interactions with no summary
A transcript whose summary is "The interaction is too short to create a summary." is skipped entirely, not scored.
This overrides applicabilityCondition, including "always" — no prompt can change that output.
start_eval_run drops them before batching (see skipped_transcripts) and submit_eval_scores refuses them.
Unlike an N/A dimension, the transcript is absent from the results — report the skipped count with the pass rate.

## Need Help?
Call get_pipeline_guide() for the complete workflow reference including API facts, schema details, and examples.
`.trim();

export const FULL_PIPELINE_GUIDE = `
# SDD Summary Pipeline — Full Reference Guide

This MCP server manages the full lifecycle of Genesys Cloud AI Studio / Agent Copilot summary configuration testing: from fetching transcripts through iterating on prompts to evaluating and deploying improvements.

---

## Required OAuth Scopes (all 8)
\`ai-studio\`, \`analytics\`, \`assistants\`, \`conversations\`, \`notifications\`,
\`routing:readonly\`, \`speech-and-text-analytics:readonly\`, \`users:readonly\`

Names are exactly as they appear in the Genesys scope picker. Three are
\`:readonly\` because this server only reads from those APIs.

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
2. Scope tab: add all 8 — \`ai-studio\`, \`analytics\`, \`assistants\`,
   \`conversations\`, \`notifications\`, \`routing:readonly\`,
   \`speech-and-text-analytics:readonly\`, \`users:readonly\`.
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
- Saves to \`summaryconfig-lifecycle/{summaryConfigName}/interaction-filter.json\`.
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

### Gathering requirements — ASK, do not assume

Requirements are the foundation of every test case, so they are gathered WITH the user, not inferred
silently. Work through these four steps in order and wait for a reply at each one. Never skip ahead to
test cases because the user has not answered yet.

**1. Invite artefacts first.** Before deriving anything, tell the user the artefacts folder exists and
what it is for, giving the real path:

\`\`\`
summaryconfig-lifecycle/{SummaryConfigName}/requirements/artefacts/
\`\`\`

Explain that anything describing what a good summary looks like belongs there — emails from the
customer, example transcripts, agent notes, existing business requirement documents, QA feedback,
complaint logs, screenshots of bad summaries. Then ask them to add whatever they have and tell you
when they are done. Wait.

**2. Read whatever landed there, and filter hard.** If the folder has contents, read every file and treat
it as a primary source of requirements. Artefacts outrank the prompt: they describe what the business
actually wants, whereas the prompt only describes what it currently asks for. If the folder is still
empty, say so plainly rather than pretending otherwise.

Expect most of an artefact to be noise. A business requirements document may cover an entire programme
of work, and an email thread wanders. **Only extract requirements that constrain the interaction summary
or agent notes** — what the summary must contain, exclude, how it must be structured, worded, formatted,
or how accurate it must be. Everything else is out of scope no matter how firmly it is stated: routing
and queueing rules, IVR behaviour, telephony, CRM or order-system fields, workforce management, agent
behaviour on the call itself, reporting and dashboards, SLAs, security and access control.

Judge relevance by whether the requirement could ever be evaluated against a generated summary. If it
cannot be checked by reading a summary, it does not belong in \`requirements.md\`, because no test case
could ever validate it. Some rules about agent conduct do translate — "the agent must confirm the
customer's identity" becomes a summary requirement only insofar as the summary must record whether
identity was confirmed. Capture the recording obligation, not the conduct.

Write everything you excluded to \`requirements/final/ignored.md\` rather than listing it in chat. Use the
same table as \`requirements.md\` — \`ID | Category | Requirement | Source\` — plus a trailing
\`Excluded because\` column, so a row can be copied straight across. Identify entries as
\`IG-{SummaryConfigName}-{NNN}\`, numbered from 001 in their own sequence: the \`IG-\` prefix keeps them
from ever being confused with requirements, while still letting either of you say "reinstate
IG-Acme_CallSummary-003" instead of quoting text. On promotion the row gets a fresh \`BR-\` ID and the
\`IG-\` ID is dropped.

Phrase each row as the requirement itself, not as a description of what you rejected — "various routing
rules" cannot be reinstated. In chat, say only that the file was written and how many entries it holds.
Over-filtering is the more dangerous failure here, because a wrongly excluded requirement otherwise
leaves no trace anywhere; the file makes it reviewable and reversible.

**3. Offer the prompt as an additional source — optional.** Ask whether they also want requirements
derived from the existing summary prompt. This is genuinely optional: useful for capturing current
behaviour as a baseline, but skippable when artefacts already define the intended standard. Respect the
answer either way. If there were no artefacts and they decline this too, there is nothing to derive
from — stop and say so.

**4. Have the user review before any test cases exist.** Write \`requirements/final/requirements.md\`
from the chosen sources, then present it for review. State explicitly that they can add, change or
remove requirements now, and that test cases will be written from whatever they approve. Point them at
\`ignored.md\` too, so anything you filtered out can be pulled back in. Wait for approval before
authoring a single test case — reworking test cases after the fact is far more expensive than editing a
requirement.

Record where each requirement came from, so a reviewer can tell an artefact-derived requirement from a
prompt-derived one and challenge it. Note in the document when a requirement came from an artefact that
the current prompt does not satisfy — that is a known gap and a likely test failure, not an error.

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

### Interactions with no summary override every applicabilityCondition

When Genesys has too little to work with it returns \`"The interaction is too short to create a summary."\`
in place of a summary. Such a transcript is **not evaluated at all** — no prompt can change that output,
so scoring it measures the interaction's length rather than the prompt's quality, and either drags the
pass rate down over something unfixable or props it up with hollow passes.

\`start_eval_run\` detects these and drops them before batching, so scoring subagents never see them. They
are recorded under \`skippedTranscripts\` in the run metadata, counted in the \`skipped_transcripts\` field
of the response, and shown on the run dashboard. If a subagent submits a score for one anyway,
\`submit_eval_scores\` refuses it.

Two things to be clear on:
- **This overrides \`applicabilityCondition\`, including \`"always"\`.** A dimension marked \`"always"\` still
  does not apply here; there is no summary for it to apply to. Do not write the too-short case into
  individual applicability conditions — it is handled centrally for every test case at once.
- **It is not the same as an N/A score.** An N/A dimension is recorded with \`score: null\` against a
  transcript that *was* evaluated. A skipped transcript is absent from the results entirely.

Always report the skipped count alongside a run's pass rate, so a shrunken denominator is never mistaken
for a full run. If most of a test set is being skipped, the test set needs longer interactions rather
than a prompt change.

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
${spawnInstructionFull()}

**Scores may ONLY be submitted by calling the \`submit_eval_scores\` tool.** Never start a second copy
of this server (\`node\`/\`npx\`/\`tsx\`/\`python\`, the MCP client SDK, or any script), and never write score
or result files directly. A separately spawned server does not receive the configured storage paths, so
its writes land somewhere else and are invisible to \`finalize_eval_run\` — silently splitting the run.
If a tool response shows a storage path that looks wrong, STOP and report it rather than working around
it: a wrong path is a server configuration bug, not something for a subagent to route around.
- **Give each subagent identifiers, not data.** A stage prompt needs only \`summary_config_name\`,
  \`test_set_name\`, \`run_number\` and that stage's \`transcript_ids\`. The subagent calls
  \`get_eval_batch\` to fetch the summary for each transcript plus the full rubric of every test case.
  Inlining the summaries and dimensions makes the prompt large enough to time the stage out part-way
  through its batch, which is how a full suite ends up half-scored.
- Each subagent calls \`submit_eval_scores(run_number, transcript_id, test_case_name, dimension_scores)\` once per transcript × test case. \`summary_text\` is not needed: the run freezes the exact text being scored when it starts, and that frozen text is what gets recorded
- Scores: decimal 0–1 (0 = total failure, 0.5 = half pass, 1 = perfect); submit \`score: null\` when a dimension's \`applicabilityCondition\` is not met for the transcript — null scores are excluded from all aggregation
- **Never score a batch yourself, and never hand-patch a gap.** Re-spawn a stage that failed or was
  cut off. This session uses a different model from the scorer, so a partly hand-scored run mixes two
  judges; and a summary reconstructed from memory records a description of the summary rather than the
  summary, which is exactly what the report quotes as its evidence.
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

\`save_version(summary_config_name=..., prompt=...)\` records a local draft (status defaults to \`candidate\`), but it cannot
write the \`changes[]\` evidence trail. Since every candidate should carry that trail, author the file directly instead —
write the JSON to \`version-history/summary-configuration-N.json\`:

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
3. \`save_version(summary_config_name=..., summary_setting_id=...)\` — snapshots the still-live prompt as the rollback point
4. \`update_summary_setting(summary_config_name=..., prompt=...)\` — pushes to Genesys (resolves the setting ID from the interaction filter)
5. \`save_version(summary_config_name=..., prompt=..., status="deployed")\` — records the newly live state
6. \`generate_rollup_report(summary_config_name=..., test_set_name=..., executive_summary=..., themes=[...], next_steps=[...])\` — the closing report

**NEVER call \`update_summary_setting\` without prior prompt_test eval evidence and user approval.**

### The rollup — the last step of a cycle (MANDATORY)

Acceptance is not the end of the work: the effort still needs an account of itself. Once a version is
live, call \`generate_rollup_report\`. It rebuilds every measurement from the runs and outlines the
implemented version's column in the pass-rate matrix, so a reader can see which version is production
rather than assuming it was the highest-scoring one.

What you must supply is the part no tool can derive:

| Argument | What goes in it |
|---|---|
| \`executive_summary\` | Where the config started and its material failures, what was done, where it ended up |
| \`themes\` | One per problem class fixed: \`issue\` (what was going wrong), \`approach\` (what changed in the prompt), \`benefit\` (what it bought, and the honest limit if it did not close), optional \`metric\` |
| \`methodology_notes\` | Findings about the evaluation rather than the prompt — a test case that contradicted a requirement, a transcript that should not have been in the set, a platform limit |
| \`next_steps\` | What the user should do now, including anything a prompt change cannot fix |

Write it from the runs' own \`improvements.md\` files and reports. Do not pad it with general
prompt-engineering advice: a rollup that could have been written before the work started is worthless.
Be honest about what did not close — a theme whose benefit is "partly fixed, and here is the ceiling"
is more useful than one that claims success.

---

## Decision Gates and Stale Instructions (MANDATORY)

### Asking blocks — always

When you ask the user anything — a gate, an approval, a clarification — **end your turn on the
question.** Do not keep working while it is outstanding, and never have two questions open at once.

This is not politeness, it is correctness. A question card stays live until answered, and an answer
carries no timestamp and no reference to the question it answers. If you ask "test v2, deploy v1, or
stop?" and then press on without waiting, that card is still sitting there. Answered later — after
another six runs and a deployment — it arrives as a plain instruction to build v2, and nothing in it
says it is nine hours old. Every gate you walk past is a future instruction to redo finished work.

The gates that must block:

| Gate | When |
|---|---|
| Artefacts | Before deriving any requirement |
| \`requirements.md\` review | Before writing any test case |
| \`applicabilityCondition\` uncertainty | Before \`save_test_case\` |
| Post-eval decision: test the next candidate / deploy / stop | After each \`save_improvement_recommendations\` |
| Deployment approval | Before \`update_summary_setting\` |

### Reconcile before acting

**Call \`get_pipeline_state(summary_config_name=...)\` before acting on any instruction that names a
version or a run number.** It reads local files only — no Genesys calls — and returns the current
stage, the latest version and its status, the newest deployed version, candidates never tested,
candidates tested but not deployed, every run including any left unfinalized, and pass-rate history.

Then compare:

- Instruction names a version **at or below** \`versions.latest.version\` → that version already exists
- Instruction names a run **at or below** \`highest_run_number\` for that test set → that run already happened
- Instruction says "deploy" but \`stage\` is already \`deployed-cycle-complete\` → the cycle is closed

In any of those cases **do not execute it.** State the mismatch plainly — "this asks for candidate v1;
v7 is deployed and the latest run is #9" — and ask the user what they actually want. Executing a stale
instruction is expensive: it burns preview API calls, writes run directories, and can push a live
prompt backwards.

Also call it when **resuming a session** (never infer state from your own memory of the conversation),
**before deploying**, and **before starting an eval run**.

---

## Report Rules (MANDATORY)

| Report | Tool | Location |
|---|---|---|
| Run report | auto via \`finalize_eval_run\` | \`eval-runs/{testSet}/{NNNN}/dashboard.html\` |
| Improvements report | auto via \`finalize_eval_run\` | \`eval-runs/{testSet}/improvements.html\` |
| Both, rebuilt for every run | \`regenerate_reports\` | as above |

- **NEVER generate report HTML manually.** The templates live inside this server, so hand-written
  or hand-patched HTML is overwritten on the next run and is inconsistent with every other report.
- Both reports are written automatically by \`finalize_eval_run\` — call the generate tools only to
  re-render without re-scoring.
- Reports are **derived artefacts**: they are rebuilt from the JSON in \`eval-runs/\`, so nothing is
  lost by deleting them. \`regenerate_reports\` rebuilds every report for a config, which is what to
  run after deploying a newer server version (to pick up template changes) or after editing
  \`requirements.md\` (to refresh requirement coverage).

### What the run report contains

Overview with findings derived from that run's own scores, then drill-down: test case → rubric
dimension → how it scored against every interaction with the evaluator's reasoning → the interaction's
summary beside its source transcript. Plus a requirements pivot: which business requirements are
covered, passing, failing or untested.

Scoring is **weighted by dimension weight (1–5)** by default, with the unweighted mean alongside.
A weight-5 compliance rule and a weight-1 style preference must not count the same.

### What the improvements report contains

Pass rate and weighted score across every finalized run, a changelog of what changed between runs
(prompt diff, plus which test cases and requirements moved), heat matrices per test case and per
requirement, and a watchlist of what is still unresolved in the latest run. Runs whose test set
composition changed are flagged, because a delta across that boundary compares different populations.

**Reading the reports is how you write improvements.md.** The findings and the changelog already name
the failing dimensions and quote the evidence — do not re-derive that analysis by hand.

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
summaryconfig-lifecycle/
└── {summaryConfigName}/
    ├── interaction-filter.json
    ├── requirements/
    │   ├── artefacts/
    │   └── final/
    │       ├── requirements.md
    │       └── ignored.md
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
| List assistants | \`GET /api/v2/assistants?tier=Copilot&pageSize=200\` — the \`tier\` filter is required; querying unfiltered returned 500 in a large org. 200 is the documented \`pageSize\` max |
| Queues for an assistant | \`GET /api/v2/assistants/{assistantId}/queues\` (cursor pagination with \`after\`/\`nextUri\`) |
| Queue display names | \`GET /api/v2/routing/queues?id=id1&id=id2...\` |
| Voice transcript URL | \`GET /api/v2/speechandtextanalytics/conversations/{id}/communications/{commId}/transcriptUrls\` |
| Messaging messages | \`GET /api/v2/conversations/messages/{id}\` + \`POST .../messages/bulk?useNormalizedMessage=true\` |
| Existing summaries | \`GET /api/v2/speechandtextanalytics/conversations/{id}/summaries\` |
| Summary settings | \`GET /api/v2/conversations/summaries/settings\` |
| Analytics filter operators | Only \`matches\`, \`exists\`, \`notExists\` — \`notMatches\` is NOT supported |
| Analytics date range limit | 7 days max per query window |
`.trim();
