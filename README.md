# SDD Summary — Genesys Cloud Summary Prompt Testing Pipeline

A **Cursor plugin** for developing, testing, and iteratively improving **Genesys Cloud Agent Copilot / AI Studio summary prompts**.

It bundles an MCP server with the pipeline guidance Cursor needs to orchestrate the whole workflow — fetching transcripts, authoring requirements and test cases, running evaluations, generating dashboards, and iterating on prompts — through natural language.

---

## Install

The plugin ships a **pre-built, self-contained server bundle**. There is no `npm install` and no build step — you need only Node.js 18+ and Cursor.

### Option A — Install from the repository URL

In Cursor, open **Customize → Plugins**, paste this repository's URL into the plugin search, and install it.

### Option B — Local install (works offline)

Use this when you have the repo as a folder or zip and want no network or git dependency at all.

```bash
# Copy (or symlink) the repo into Cursor's local plugin directory
ln -s /path/to/SDD-Summary ~/.cursor/plugins/local/sdd-summary
```

Then run **Developer: Reload Window** in Cursor, or restart it.

> On Enterprise plans, local plugin imports are disabled by default. An admin must enable **Allow Local Plugin Imports** under Dashboard → Settings → Security & Identity.

### What installing gives you

| Component | Effect |
|---|---|
| MCP server | Registered automatically — no `.cursor/mcp.json` to write, no absolute paths to fix |
| Skills / rules | Pipeline guidance loaded into Cursor agent sessions |
| Approval suppression | Safe tools are pre-approved so eval runs don't stop for hundreds of prompts |

Working data is written to **your workspace**, not the plugin directory:

- `.summaryconfig-lifecycle/` — transcripts, test cases, eval runs, version history
- `.sdd-summary/` — credentials and tokens

Because these are workspace-relative, updating or reinstalling the plugin never touches your data.

---

## Genesys Cloud OAuth Client Setup

You need a Genesys OAuth client before first use.

### 1. Create the OAuth client

In Genesys Admin → **Integrations → OAuth → Add Client**:

| Field | Value |
|---|---|
| **App Name** | `SDD Summary MCP` (or any name) |
| **Grant Types** | ✅ **Code Authorization** |
| **Redirect URI** | `http://localhost:8787/callback` |

The client secret is not needed — this uses the Authorization Code + PKCE user login flow.

### 2. Add all 8 required scopes

Under the **Scope** tab, add every scope below. Add them all now — a missing scope blocks specific tools later, sometimes in non-obvious ways.

| Scope | Why it's needed |
|---|---|
| `ai-studio` | Summary config CRUD and preview summary generation |
| `analytics` | Conversation search and communication ID resolution |
| `conversations` | Messaging transcript fallback when STA retrieval fails |
| `notifications` | Preview API delivers results via WebSocket notification channel |
| `speechandtextanalytics` | Transcript URL fetch and existing summary retrieval |
| `users` | Resolves current user ID for WebSocket topic construction |
| `assistants` | Agent Copilot config — lists assistants and queue associations |
| `routing` | Resolves queue display names from IDs |

> `conversations` is easy to miss because its absence is not obvious: voice transcripts keep working and only **messaging** transcripts fail with 403. `smoke_test_auth()` checks it explicitly.

### 3. Find your Authorization URL

In Genesys Admin → **IT and Integrations → OAuth** → open your client → scroll to the bottom. Copy the full **Authorization URL** field:

```
https://login.{your-region}/oauth/authorize?client_id=abc123-...&response_type=...
```

This URL is the only thing you need — client ID and region are extracted from it automatically. Do not set `GENESYS_CLIENT_ID` as an environment variable; it shadows the stored config and causes logins against the wrong org.

> Full OAuth reference including troubleshooting: [`docs/oauth-setup.md`](docs/oauth-setup.md)

---

## First Run

Open your working project in Cursor and ask the agent to log in:

```
login(authorization_url="https://login.{your-region}/oauth/authorize?client_id=...")
```

A browser opens. After it confirms login:

```
complete_login()
```

Then verify every scope is active — expect **8/8**:

```
smoke_test_auth()
```

On later sessions, `login()` needs no argument; the Authorization URL is stored.

---

## Pipeline Overview

```
1. login() → complete_login()
2. build_interaction_filter(copilot_name="YourCopilotName")
3. fetch_transcripts_bulk(...)     ← always run together
4. fetch_existing_summaries_bulk(...)
5. [author requirements + test cases]
6. [run eval → improve prompt → repeat]
7. [deploy approved candidate]
```

Full reference: ask the agent to call `get_pipeline_guide()`, or see [`docs/workflow.md`](docs/workflow.md).

---

## Repository Structure

```
SDD-Summary/
├── .cursor-plugin/plugin.json     ← plugin manifest
├── mcp.json                       ← MCP server definition (plugin-relative)
├── rules/                         ← pipeline guidance shipped to users
├── docs/                          ← methodology guides
│   ├── setup.md
│   ├── oauth-setup.md
│   ├── workflow.md
│   ├── eval-guide.md
│   ├── requirements-guide.md
│   └── test-case-guide.md
└── mcp-server/
    ├── src/                       ← TypeScript source
    ├── build.mjs                  ← esbuild bundler
    ├── bundle/
    │   └── sdd-summary-mcp.mjs    ← COMMITTED single-file server
    └── dist/                      ← local tsc output (gitignored)
```

Per-config working data lives in the **consuming workspace**, not here:

```
.summaryconfig-lifecycle/{SummaryConfigName}/
├── interaction-filter.json
├── requirements/
├── transcripts/static/
├── test-cases/
├── test-sets/
├── version-history/
└── eval-runs/
```

---

## Developing the Server

The committed bundle is what Cursor actually runs, so **any source change requires a rebundle and a commit**.

```bash
cd mcp-server
npm install          # first time only
npm run typecheck    # verify types
npm run bundle       # regenerate bundle/sdd-summary-mcp.mjs
```

Then reload Cursor to pick up the new bundle.

To develop against a live copy, symlink the repo as a local plugin (Option B above) — edits become active on the next rebundle plus window reload.

---

## Security

- **Never commit credentials.** `.sdd-summary/` and `.cursor/mcp.json` are gitignored.
- **Never commit customer data.** `.summaryconfig-lifecycle/` contains transcripts with PII and is gitignored in full.
- Tokens are user-scoped and expire in roughly 30 minutes; any API call reopens the browser on expiry.
- `update_summary_setting` and `update_copilot_config` write to live Genesys and are deliberately **not** pre-approved — they always require explicit confirmation.
- See `.env.example` for the full list of environment variables.
