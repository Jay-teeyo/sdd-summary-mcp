# Test Case and Test Set Authoring Guide

This guide defines how test cases and test sets are created for a summary configuration workspace. Test cases are the mechanism by which generated summaries are evaluated — each test case validates a logical group of business requirements. Every test case dimension must trace back to one or more `BR-` identifiers from `requirements/final/requirements.md`.

For the requirements methodology that precedes this step, see `docs/requirements-guide.md`.

---

## 1. Prerequisites

Before authoring test cases:

1. `build_interaction_filter` has been run and the workspace exists
2. `fetch_transcripts_bulk` + `fetch_existing_summaries_bulk` have been run and transcripts are in `transcripts/static/`
3. `requirements/final/requirements.md` exists and contains a complete, numbered set of `BR-` requirements

Test cases are derived exclusively from the requirements file — not directly from the prompt or config.

---

## 2. What Is a Test Case?

A test case is a named evaluation rubric stored as a JSON file in `test-cases/`. It contains one or more **dimensions**, where each dimension:

- Tests one logical concern (e.g. "are fallback texts used correctly?")
- References the specific `BR-` requirement IDs it validates
- Defines pass and fail criteria that describe the full and empty ends of a 0–1 scoring spectrum
- Has a `passThreshold` — the minimum decimal score required to pass that dimension
- Has a `weight` (1–5) reflecting its relative importance

One test case per requirement **category** is the standard approach — this keeps test cases focused and results interpretable by category.

---

## 3. File Naming Convention

```
{Category}-{DescriptiveName}.json
```

- `{Category}` — the exact category name from the requirements table, with spaces replaced by hyphens (e.g. `Key-Information-Obtained`)
- `{DescriptiveName}` — a short name describing what aspect is being tested (e.g. `Material-Information`)
- The filename (without `.json`) becomes the test case's `name` field and is used as its identifier throughout the system

**Examples:**
```
Global-Rules-Tone.json
Structure-Required-Sections.json
Identity-Verification-Completeness.json
Format-And-Layout.json
```

---

## 4. Test Case JSON Structure

Each test case file must follow this exact structure:

```json
{
  "name": "Category-DescriptiveName",
  "description": "One sentence describing what this test case validates. Note that scores are decimal 0–1.",
  "dimensions": [
    {
      "name": "Short dimension name",
      "description": "One sentence describing what this dimension checks.",
      "weight": 3,
      "applicabilityCondition": "always",
      "passCriteria": "Score 1.0: [describe perfect pass]. Score proportionally lower as [describe partial failure conditions — give example decimal scores]. Score 0: [describe complete failure].",
      "failCriteria": "Score 0: [describe the complete failure condition that warrants a zero].",
      "passThreshold": 0.8,
      "requirementIds": ["BR-{ConfigName}-NNN"]
    }
  ],
  "createdAt": "YYYY-MM-DDTHH:MM:SS.000Z"
}
```

### 4.1 Field Rules

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Must match the filename (without `.json`) exactly |
| `description` | string | One sentence; mention that scores are decimal 0–1 |
| `dimensions` | array | At least 1; one dimension per discrete concern within the category |
| `dimensions[].name` | string | Short, human-readable label for the dimension |
| `dimensions[].description` | string | One sentence stating what is being checked |
| `dimensions[].weight` | number | Integer 1–5; reflects importance relative to other dimensions in the same test case |
| `dimensions[].applicabilityCondition` | string | **Required on every dimension.** Use `"always"` for dimensions that apply to every transcript. Use a plain-English condition string for conditional dimensions — e.g. `"Only applies when a third party participated in the interaction."` Evaluators check this first: if the condition is not met they submit `score: null`, which is excluded from all pass-rate calculations. Transcripts with no summary at all are skipped before scoring regardless of this field — see §5a. |
| `dimensions[].passCriteria` | string | Describes the scoring gradient from 1.0 (perfect) downward — include intermediate examples |
| `dimensions[].failCriteria` | string | Describes the complete failure condition (score 0) |
| `dimensions[].passThreshold` | number | Decimal 0–1; minimum score to pass this dimension. Default: `0.8` |
| `dimensions[].requirementIds` | array | One or more `BR-` IDs from `requirements.md` that this dimension validates |
| `createdAt` | string | ISO 8601 timestamp at time of authoring |

---

## 5. Scoring Model

Scores are decimal numbers in the range **0.0 to 1.0**:

| Score | Meaning |
|-------|---------|
| `1.0` | Perfect — requirement fully met with no issues |
| `0.8` | Mostly met — minor deviation that does not materially affect quality |
| `0.5` | Partially met — approximately half the requirement is satisfied |
| `0.2` | Mostly failed — some trace of the requirement is present but largely unmet |
| `0.0` | Complete failure — requirement is entirely unmet or actively violated |

The evaluating model assigns a decimal score based on how well the summary meets the dimension's criteria. The `passThreshold` on each dimension defines the minimum acceptable score — if the score is at or above the threshold the dimension passes; below it fails.

### Choosing passThreshold

| Requirement type | Recommended threshold | Rationale |
|------------------|-----------------------|-----------|
| Binary rules (must / must not) | `1.0` | No partial compliance is acceptable (e.g. prohibited words, PII, inference) |
| Coverage rules (capture X content) | `0.8` | Minor omissions are tolerable; substantial coverage is required |
| Style / tone rules | `0.8` | Some subjectivity; near-compliance is acceptable |

### Writing Gradient-Aware Criteria

Both `passCriteria` and `failCriteria` should describe the scoring spectrum, not just binary outcomes. Structure `passCriteria` as:

> "Score 1.0: [perfect condition]. Score [X] if [partial condition — give concrete example]. Score 0 if [total failure]."

This gives the evaluating model anchor points to reason from when assigning partial scores.

---

## 5a. Conditional Dimensions and N/A Scoring

Some dimensions only make sense for certain types of transcripts. Use `applicabilityCondition` to express this explicitly rather than encoding the condition inside `passCriteria`.

### When to use a condition (not "always")

- The dimension tests a feature that is only present in some interactions (e.g. third-party caller, complaint raised, identity check failed)
- Running the test against a transcript where the feature is absent would produce a meaningless result
- You want accurate per-dimension stats without N/A cases inflating the pass rate

### How evaluators use it

1. Evaluator reads `applicabilityCondition` before scoring
2. If the condition is met → score normally (0.0–1.0)
3. If the condition is **not** met → submit `score: null` with a brief reasoning note explaining why
4. Null scores are excluded from pass-rate and average-score calculations

**Pass rate = passes / evaluated (not passes / total)**

This keeps the statistic honest. A dimension that rarely applies (e.g. third-party identification) will show the true rate among the transcripts where it was relevant, not a misleadingly high rate driven by N/A auto-passes.

### Example

```json
{
  "name": "Third-party role stated",
  "description": "When a third party participates, their relationship to the customer is identified in the summary.",
  "weight": 3,
  "applicabilityCondition": "Only applies when a third party (non-customer, non-agent) participated in the interaction.",
  "passCriteria": "Score 1.0: third-party relationship clearly stated. Score 0.5 if mentioned but relationship is absent. Score 0 if third party present but entirely unacknowledged.",
  "failCriteria": "Score 0: third party clearly participated and is entirely absent from the summary.",
  "passThreshold": 0.8,
  "requirementIds": ["BR-Acme_CallSummary-024"]
}
```

### Rule: never omit the field

`applicabilityCondition` must be present on **every dimension** — set it to `"always"` for unconditional dimensions. This ensures consistent schema and makes it easy to override when needed without having to add the field from scratch.

### The one condition you never have to write

When an interaction has too little content to work with, Genesys returns this in place of a summary:

> The interaction is too short to create a summary.

These transcripts are **skipped entirely** — they are not scored against any test case, and this overrides every `applicabilityCondition`, `"always"` included. There is no summary for a dimension to assess, and no prompt change can produce one, so a score would measure the interaction's length rather than the prompt's quality: it would either penalise the prompt for something unfixable or record a hollow pass.

`start_eval_run` detects them and removes them before batching, so no evaluator ever sees one; `submit_eval_scores` rejects a score for one if it arrives anyway. The count appears in the `start_eval_run` response, in `skippedTranscripts` in the run metadata, and on the run dashboard.

Two consequences for authoring:

- **Never encode this case into an `applicabilityCondition`.** It is handled centrally for every test case at once, so a condition such as `"Only applies when a summary was generated."` is redundant — and worse, it dilutes a genuine condition into something an evaluator has to interpret.
- **A skipped transcript is not an N/A dimension.** N/A means `score: null` recorded against a transcript that was evaluated; a skipped transcript is absent from the results altogether. Both are excluded from pass rates, but only one leaves a row behind.

When reporting results, quote the skipped count alongside the pass rate. A test set that is mostly skipped needs longer interactions, not a different prompt.

### Rule: ask when uncertain

When authoring test cases (whether via `generate_test_case` or manually):
- If it is obvious the dimension applies universally → set `"always"`
- If a structural or content prerequisite is required → write the condition explicitly
- **If uncertain** → stop and ask the user before saving. Never silently default to `"always"` for a dimension you are not sure about.

**Common condition patterns:**

| Pattern | Example condition string |
|---------|--------------------------|
| Structural prerequisite | `"Summary contains at least 2 sections."` |
| Content prerequisite | `"Summary contains bullets."` |
| Transcript feature | `"Only applies when a third party participated in the interaction."` |
| Transcript feature | `"Only applies when the customer expressed more than one distinct intent."` |
| Negative state | `"Only applies when the order status was NOT discussed in the transcript."` |
| Event-based | `"Only applies when a complaint or escalation was raised."` |

---

## 6. Deriving Dimensions from Requirements

For each category in `requirements.md`:

1. Read all requirements in that category
2. Group requirements that test the same observable property into one dimension (e.g. all fallback-text requirements for a section can be one dimension)
3. Keep atomically different concerns as separate dimensions — do not combine "must capture X" with "must not include Y" into one dimension
4. For each dimension:
   - Set `requirementIds` to every `BR-` ID the dimension validates
   - Set `passThreshold` based on the requirement type (see above)
   - Set `weight` proportional to business impact (5 = critical, 1 = minor)
   - Write `passCriteria` with explicit decimal anchor points
   - Write `failCriteria` describing the zero-score condition

---

## 7. Process: Authoring All Test Cases

1. Read `requirements/final/requirements.md` in full
2. List the unique categories present in the requirements table
3. For each category, create one test case file following sections 3–6 above
4. Write the file to `test-cases/{Category}-{DescriptiveName}.json`
5. Verify that every `BR-` ID in the requirements table is referenced by at least one dimension across all test cases — no requirement should be untested

---

## 8. Test Sets

A test set is a named collection of test cases and transcripts. It defines what gets evaluated when an eval run is started.

### 8.1 File Location

```
test-sets/{TestSetName}.json
```

### 8.2 Test Set JSON Structure

```json
{
  "name": "TestSetName",
  "description": "What this test set covers and its purpose.",
  "testCaseNames": [
    "Category-TestCaseName",
    "..."
  ],
  "transcriptIds": [
    "uuid",
    "..."
  ],
  "createdAt": "YYYY-MM-DDTHH:MM:SS.000Z"
}
```

- `testCaseNames` — exact filenames of test cases (without `.json`) to include
- `transcriptIds` — IDs of transcripts from `transcripts/static/` or `transcripts/dynamic/` to evaluate against
- To get all available transcript IDs: read the filenames from `transcripts/static/` (strip `.json` extension)

### 8.3 Standard Test Sets

| Name pattern | Purpose |
|--------------|---------|
| `{ConfigName}-Full-Test-Suite` | All test cases × all static transcripts — comprehensive baseline evaluation |
| `{ConfigName}-Smoke-Test` | Subset of critical test cases × a small representative transcript sample — fast sanity check |
| `{ConfigName}-{Category}-Focus` | One category's test case × all transcripts — deep dive on a specific concern |

### 8.4 Naming Convention

```
{SummaryConfigName}-{DescriptiveName}.json
```

---

## 9. Worked Example — Acme_CallSummary

The Acme_CallSummary configuration produced 6 test cases from 6 requirement categories (24 requirements total) and one full test set.

| Test case file | Category | Dimensions | BR IDs covered |
|----------------|----------|------------|----------------|
| `Global-Rules-Tone.json` | Global Rules | 7 | BR-001–007 |
| `Structure-Required-Sections.json` | Section Structure | 3 | BR-008 |
| `Reason-for-Contact-Intent.json` | Reason for Call | 4 | BR-009–012 |
| `Identity-Verification-Completeness.json` | Identity Verification | 4 | BR-013–016 |
| `Order-Status-Accuracy.json` | Order Status | 4 | BR-017–020 |
| `Key-Information-Material-Facts.json` | Key Information Obtained | 6 | BR-021–026 |
| `Actions-Completed-Only.json` | Actions Completed | 4 | BR-027–030 |
| `Resolution-Outcome.json` | Resolution | 3 | BR-031–033 |
| `Format-And-Layout.json` | Formatting | 6 | BR-034–039 |

Test set: `Acme_CallSummary-Full-Test-Suite.json` — all test cases against every transcript.
