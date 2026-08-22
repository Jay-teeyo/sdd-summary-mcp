# Requirements Definition Guide

This guide defines how business requirements are captured, structured, and maintained for a summary configuration workspace. Requirements are the foundation for test case authoring — every test case dimension must trace back to one or more requirement IDs.

---

## 1. What Is a Business Requirement?

A business requirement is a single, discrete, testable statement of expected behaviour for the summary output. Each requirement must be:

- **Atomic** — one concern per requirement; do not combine multiple rules into one row
- **Testable** — it must be possible to inspect a summary output and determine pass or fail
- **Traceable** — each requirement must have a unique ID that test cases reference
- **Declarative** — written as a "must" or "must not" statement describing the output, not the intent behind it

---

## 2. Identifier Format

```
BR-{SummaryConfigName}-{NNN}
```

- `BR` — fixed prefix, always uppercase
- `{SummaryConfigName}` — exact name of the summary configuration as it appears in Genesys, preserving underscores and capitalisation (e.g. `Acme_CallSummary`)
- `{NNN}` — zero-padded three-digit integer, starting at `001`, incrementing by 1 for each new requirement

**Examples:** `BR-Acme_CallSummary-001`, `BR-Acme_CallSummary-012`, `BR-Acme_CallSummary-039`

Rules:
- IDs are assigned in the order requirements are first identified and **never reused**
- Retired requirements keep their ID — append `[DEPRECATED]` to the requirement text instead of deleting the row
- When adding requirements from a new source (e.g. an artefact), continue from the highest existing ID

---

## 3. File Location

```
.summaryconfig-lifecycle/{SummaryConfigName}/requirements/final/requirements.md
```

Raw source material (emails, feedback, QA reports, etc.) that informed the requirements lives in:

```
.summaryconfig-lifecycle/{SummaryConfigName}/requirements/artefacts/
```

---

## 4. File Structure and Format

The requirements file must follow this exact structure. Do not add extra sections, tables, or commentary outside the structure below.

### 4.1 Template

```markdown
# {SummaryConfigName} — Business Requirements

*Source: {source description} · Setting ID: `{settingId}` · Last modified: {YYYY-MM-DD} · settingType: `{settingType}`*
*For the requirements methodology and authoring process, see `docs/requirements-guide.md`.*

---

## Context

{One or two sentences describing the business context: what type of interactions these summaries cover, who generates them, and what the output is used for.}

---

## Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| BR-{ConfigName}-001 | {Category} | {Requirement text.} |
| BR-{ConfigName}-002 | {Category} | {Requirement text.} |
```

### 4.2 Rules for Each Element

**Title line (`# {SummaryConfigName} — Business Requirements`)**
- Use the exact summary configuration name followed by ` — Business Requirements`

**Italic source line**
- Line 1: `*Source: {source} · Setting ID: \`{id}\` · Last modified: {date} · settingType: \`{type}\`*`
  - `source` is `summary prompt` when derived from the prompt field, or the artefact filename(s) when derived from artefacts
  - `Last modified` is the `dateModified` value from the Genesys summary setting
- Line 2: always `*For the requirements methodology and authoring process, see \`docs/requirements-guide.md\`.*`

**Context section**
- One or two sentences only
- Describe: what type of interactions (e.g. order support calls), who handles them (e.g. Customer Service Consultants), and what the summary output is used for (e.g. claim documentation)
- Do not list configuration values here

**Requirements table**
- Three columns only: `ID`, `Category`, `Requirement`
- All requirements in a single flat table — no sub-tables, no section headings within the table
- Rows ordered by ID number ascending
- Each requirement cell ends with a full stop
- Use backticks for literal output strings (e.g. `` `Status not confirmed.` ``)
- Use *italics* for prohibited words

---

## 5. Categories

Categories group requirements by concern. The category names used must reflect the actual sections and rules of the specific summary configuration — they will differ between configs. The examples below are from an order support context and are illustrative, not mandatory.

| Example Category | What it covers |
|------------------|----------------|
| Global Rules | Rules that apply to every section of every summary |
| Section Structure | Which sections must appear and in what order |
| {Section Name} | Requirements specific to a named output section (one category per section) |
| Formatting | Output formatting and presentation rules |

Guidelines:
- Use the exact section name from the summary configuration as the category name for section-specific requirements (e.g. if the prompt defines a section called "Next Steps", use `Next Steps` as the category)
- Keep category names short and consistent — the same category name must be used for all requirements in that group
- Add categories as needed; do not force requirements into an ill-fitting category

---

## 6. Deriving Requirements from a Summary Configuration

When a summary configuration exists in Genesys, fetch it with `get_summary_setting(summary_setting_id=...)`, then follow the rules for its `settingType`.

### settingType: "Prompt"

> **The `prompt` field is the sole source of instructions for the AI model.**

All other fields in the configuration object — `summaryType`, `format`, `participantLabels`, `predefinedInsights`, `maskPII`, etc. — are platform metadata used by the Genesys UI. They do not influence model output. **Ignore them entirely when deriving requirements.**

Process:
1. Read the `prompt` field in full
2. Read through the prompt and identify every discrete rule or instruction
3. For each rule, write one atomic "must" or "must not" statement — do not combine two rules into one row
4. Determine the appropriate category for each requirement
5. Assign IDs sequentially starting from `BR-{ConfigName}-001`
6. Populate the requirements table in ID order
7. Set the source line to `summary prompt` and copy `dateModified` from the setting

### Other settingTypes

For non-Prompt setting types, consult the Genesys documentation for that type to determine which fields drive model behaviour, then apply the same atomic/testable/traceable principles.

---

## 7. Deriving Requirements from Artefacts

Artefacts are raw source materials in `requirements/artefacts/` — e.g. quality review emails, complaint logs, team feedback, or QA audit results.

Process:
1. Read each artefact and identify every implicit or explicit statement about what the summary should or should not do
2. Translate each finding into one atomic "must"/"must not" requirement statement
3. Assign the next available ID (continuing from the current highest)
4. Append the new rows to the requirements table
5. Update the source line in the file header to include the artefact filename(s) alongside any prior sources

---

## 8. Updating Requirements

When the summary configuration prompt changes or new artefacts are processed:

1. Use `save_version` to snapshot the current config before making changes
2. Identify which existing requirements are affected
3. **New** requirements: append new rows with the next available IDs
4. **Changed** requirements: update the requirement text in place; do not change the ID
5. **Retired** requirements: append ` [DEPRECATED]` to the requirement text; do not delete the row or reuse the ID
6. Update `Last modified` in the header to match the new `dateModified` from the Genesys setting
