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

Requirements found in artefacts but judged out of scope are recorded separately in `ignored.md` (see §7.2) under their own prefix:

```
IG-{SummaryConfigName}-{NNN}
```

The separate prefix and sequence mean an ignored entry can be referred to directly in conversation without ever being mistaken for an active requirement. An entry promoted out of `ignored.md` is assigned the next available `BR-` ID; its `IG-` ID is not carried over and is not reissued.

---

## 3. File Location

```
summaryconfig-lifecycle/{SummaryConfigName}/requirements/final/requirements.md
```

Raw source material (emails, feedback, QA reports, etc.) that informed the requirements lives in:

```
summaryconfig-lifecycle/{SummaryConfigName}/requirements/artefacts/
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

| ID | Category | Requirement | Source |
|----|----------|-------------|--------|
| BR-{ConfigName}-001 | {Category} | {Requirement text.} | {source} |
| BR-{ConfigName}-002 | {Category} | {Requirement text.} | {source} |
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
- Describe: what type of interactions (e.g. order support calls), who handles them (e.g. Customer Service Consultants), and what the summary output is used for (e.g. case notes on the customer record)
- Do not list configuration values here

**Requirements table**
- Four columns: `ID`, `Category`, `Requirement`, `Source`
- `Source` names where the requirement came from — `summary prompt` or the artefact filename. It exists so a reviewer can tell which requirements merely restate current behaviour and which came from the business, and challenge them accordingly. Omit the column only when every requirement shares one source, which the header line already states.
- Mark any requirement the current prompt does not satisfy with ` [GAP]` after the source. Its test case is expected to fail until the prompt is changed.
- All requirements in a single flat table — no sub-tables, no section headings within the table
- Rows ordered by ID number ascending
- Each requirement cell ends with a full stop
- Use backticks for literal output strings (e.g. `` `Order status not confirmed.` ``)
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

Deriving from the configuration is **optional, and only with the user's agreement** — ask before doing it (see §7.1). It captures what the prompt currently asks for, which is a useful baseline but is not the same as what the business wants. Requirements derived this way can confirm current behaviour; they cannot reveal that the behaviour is wrong.

When the user opts in, fetch the configuration with `get_summary_setting(summary_setting_id=...)`, then follow the rules for its `settingType`.

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

Artefacts are raw source materials in `requirements/artefacts/` — emails from the customer, example transcripts, agent notes, existing business requirement documents, quality review emails, complaint logs, team feedback, or QA audit results.

### 7.1 Ask for artefacts before deriving anything

Artefacts are the better source, because they describe what the business actually wants, whereas the prompt only describes what it currently asks for. A requirement set derived from the prompt alone can only ever confirm existing behaviour — it cannot reveal that the behaviour is wrong.

So the gathering sequence is a conversation, not an inference. Work through it in order, waiting for a reply at each step:

1. Point the user at `summaryconfig-lifecycle/{SummaryConfigName}/requirements/artefacts/`, explain what belongs there, and ask them to add what they have before you derive anything.
2. Read everything they added and treat it as a primary source. If the folder is still empty, say so plainly rather than quietly falling back to the prompt.
3. Ask whether they also want requirements derived from the existing summary prompt. This is optional — valuable as a baseline of current behaviour, but unnecessary when artefacts already define the intended standard.
4. Present the resulting `requirements.md` for review, and say explicitly that they can add, change or remove requirements before any test cases are written. Wait for approval: reworking test cases afterwards costs far more than editing a requirement now.

Where a requirement comes from an artefact that the current prompt does not satisfy, keep it and flag it. That is a known gap, and the test case built from it is *expected* to fail on the current prompt — which is precisely the signal worth having.

### 7.2 Filtering out the noise

Artefacts are rarely written for this purpose. A business requirements document may cover an entire programme of work, an email thread wanders across topics, and agent notes mix observations with complaints about unrelated systems. **Assume most of the content is irrelevant.**

Only extract requirements that constrain the **interaction summary or agent notes** — what the summary must contain, what it must exclude, how it must be structured, worded or formatted, and how accurate it must be.

The following are out of scope no matter how prominently or firmly they appear:

| Out of scope | Why |
|---|---|
| Routing, queueing, IVR, telephony | Governs how the interaction reaches an agent, not what the summary says |
| CRM / order-system field mappings | Concerns downstream data entry, not summary text |
| Workforce management, scheduling, adherence | Operational, unrelated to summary content |
| Agent conduct during the call | Concerns behaviour, not its record — see the exception below |
| Reporting, dashboards, analytics | Consumes summaries; does not constrain them |
| SLAs, handle times, productivity targets | Not observable in a summary |
| Security, access control, retention | Platform policy, not summary content |

**The relevance test:** could this requirement ever be evaluated by reading a generated summary? If it cannot, no test case can validate it, so it does not belong in `requirements.md`. That single question resolves most judgement calls.

**The conduct exception.** Rules about what an agent must *do* often imply something the summary must *record*. "The agent must verify the customer's identity before discussing the account" is a conduct rule and out of scope as written — but the summary requirement it implies, "the summary must record whether identity verification occurred", is in scope and testable. Capture the recording obligation, never the conduct itself.

**Record your exclusions in `ignored.md`.** Silent over-filtering is as damaging as silent over-inclusion, and it is harder to notice: an excluded requirement leaves no trace anywhere in the output. Rather than listing exclusions in chat, where they add noise and are lost as soon as the conversation moves on, write them to `requirements/final/ignored.md` alongside `requirements.md`.

The file is a staging area, not an audit log. Its purpose is to let a reviewer pull a requirement back if it was set aside in error, so it mirrors the structure of `requirements.md` — same columns, in the same order, with one extra column for the reason. Each entry carries its own identifier so it can be named directly in conversation.

```markdown
# Ignored Requirements — {SummaryConfigName}

*Identified in artefacts but judged out of scope for interaction summary testing. Nothing here appears in `requirements.md` or is covered by any test case.*

*To reinstate one: copy its Category, Requirement and Source into the `requirements.md` table, assign the next available `BR-{ConfigName}-NNN`, and delete the row here.*

| ID | Category | Requirement | Source | Excluded because |
|----|----------|-------------|--------|------------------|
| IG-{ConfigName}-001 | Routing | Calls about disputed charges must route to the billing specialist queue. | BR-Support-2026.docx | Routing rule — not observable in a summary |
| IG-{ConfigName}-002 | Agent Conduct | Identity must be verified before account details are discussed. | qa-feedback.eml | Conduct rule — the recording obligation is captured as BR-{ConfigName}-014 |
```

Rules for the file:

- Write it whenever anything was excluded. If nothing was, do not create it.
- **Identifiers use the `IG-` prefix:** `IG-{SummaryConfigName}-{NNN}`, numbered from 001 in its own sequence. The distinct prefix keeps ignored entries from ever being mistaken for requirements, while still giving each one a reference — so a reviewer can say "reinstate IG-Acme_CallSummary-003" instead of quoting the text back.
- `IG-` numbers are never reused, and are not renumbered when a row is promoted or removed. A gap in the sequence is normal and means an entry was reinstated.
- On promotion the entry gets a fresh `BR-` ID; the `IG-` ID is not carried across. Keeping the sequences separate means `requirements.md` numbering stays contiguous and no ID ever refers to two different things.
- One row per discarded requirement, phrased as the requirement itself — not as a description of what you rejected. A row reading "various routing rules" cannot be reinstated.
- `Category` uses the theme that caused the exclusion (Routing, Agent Conduct, Reporting, and so on), not the requirement categories from §5, which apply only to in-scope requirements.
- `Excluded because` must be specific enough to argue with. Name the reason rather than restating "out of scope".
- Where a conduct rule was excluded but its recording obligation *was* captured, cross-reference that `BR-` ID, as in the second example. This is the case most likely to look like a mistake when it isn't.
- In chat, report only that the file was written and how many entries it holds, then refer to individual entries by `IG-` ID as needed. The detail lives in the file.

### 7.3 Process

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
