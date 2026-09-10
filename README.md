# SDD Summary — Genesys Cloud Summary Prompt Testing Pipeline

A **Cursor plugin** for developing, testing, and iteratively improving **Genesys Cloud Agent Copilot / AI Studio summary prompts**.

It bundles an MCP server with the pipeline guidance Cursor needs to orchestrate the whole workflow — fetching transcripts, authoring requirements and test cases, running evaluations, generating dashboards, and iterating on prompts — through natural language.

---

## Install

Everything ships **pre-built and self-contained**. There is no `npm install` and no build step — you need only Node.js 18+ and Cursor.

Choose a scope first, because it determines which projects the tooling is active in.

| | Project scope *(recommended)* | User scope |
|---|---|---|
| Active in | One project only | Every workspace you open |
| Mechanism | `.cursor/` files in the target project | Cursor plugin |
| Use when | Normal use — this is a specialised tool | You genuinely want Genesys tooling everywhere |

**Project scope is the default recommendation.** This server exposes 47 Genesys tools and an always-applied pipeline rule. At user scope those load into unrelated work, putting irrelevant tools in scope and injecting ~488 lines of guidance into every request. Cursor has no documented way to disable a user-scoped plugin per project, so scope is chosen at install time.

### Option A — Project scope (recommended)

Everything happens inside Cursor, starting from an empty project folder.

**1. Create and open your project folder**

In Cursor, go to **File → Open Folder**. In the dialog, click **New Folder**, name it — say `my-summary-project` — then create and open it.

Cursor now has that folder as your workspace root, which is exactly where the tooling needs to land.

**2. Open the built-in terminal**

From the menu bar: **View → Terminal**.

It opens in the workspace root, so there is no need to change directory.

**3. Clone and deploy — one command**

```bash
git clone https://github.com/Jay-teeyo/sdd-summary-mcp.git sdd-summary-mcp && node sdd-summary-mcp/deploy.js
```

Run it from the project root. `deploy.js` deploys into the current directory by default, which is exactly where you want it.

**4. Reload Cursor**

**View → Command Palette**, then run **Developer: Reload Window**.

**5. Turn the server on**

This step is manual and easy to miss — **writing the config does not enable the server**, and Cursor has no setting that can pre-enable it.

Open **Customize** in the sidebar → **MCPs** → toggle **`sdd-summary`** on. It should then report **47 tools**.

If the entry isn't there at all, the config wasn't found — check that step 1 opened the project folder itself and not something above or below it.

**6. Start**

Open a new chat and say **"begin"**. The agent checks whether you already have a Genesys OAuth client and walks you through creating one only if you don't.

You end up with:

```
my-summary-project/            ← your workspace root
├── .cursor/
│   ├── mcp.json               ← server definition
│   ├── permissions.json       ← pre-approved tools, so eval runs don't stall
│   ├── rules/                 ← pipeline guidance
│   ├── skills/                ← pipeline skills (when present)
│   └── sdd-summary/
│       └── sdd-summary-mcp.mjs  ← the vendored server bundle
├── .gitignore                 ← written/extended for you
└── sdd-summary-mcp/           ← this repo, gitignored
```

The config uses `${workspaceFolder}` and contains **no absolute paths**, so the project keeps working if it's moved, renamed, or handed to a colleague. If the project already has a `.cursor/mcp.json` or `.cursor/permissions.json`, the script merges into them and preserves anything else you had configured.

To update later, from the project root:

```bash
cd sdd-summary-mcp && git pull && cd .. && node sdd-summary-mcp/deploy.js
```

The vendored bundle is a snapshot, so re-running `deploy.js` is what actually applies a server change. Reload the window afterwards.

### Option B — User scope (Cursor plugin)

Installs once and applies to every workspace.

```bash
# Local install — works offline, no git or network needed
ln -s /path/to/SDD-Summary ~/.cursor/plugins/local/sdd-summary
```

Or in Cursor, open **Customize → Plugins** and paste this repository's URL into the plugin search. Marketplace installs additionally offer a project-scope choice at install time.

Then run **Developer: Reload Window**.

> On Enterprise plans, local plugin imports are disabled by default. An admin must enable **Allow Local Plugin Imports** under Dashboard → Settings → Security & Identity.

### Where data goes

Under both options, working data is written to **the workspace you have open**, never to the install location:

- `.summaryconfig-lifecycle/` — transcripts, test cases, eval runs, version history
- `.sdd-summary/` — credentials and tokens

Both are workspace-relative, so re-deploying or reinstalling never touches your data. They hold OAuth tokens and customer transcripts, so they must never be committed — `deploy.js` adds them to the project's `.gitignore` for you, along with the nested `sdd-summary-mcp/` clone.

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

In Genesys Admin → **IT and Integrations → OAuth** → open your client → scroll to the bottom. Copy the full **Authorization URL** field.

It usually looks like this — an admin deep-link, *not* an OAuth endpoint:

```
https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/abc123-...
```

That is the correct value. Paste it exactly as shown; don't try to reshape it into an `/oauth/authorize` URL. The `/oauth/authorize?client_id=...` form is also accepted if your org shows that instead.

This URL is the only thing you need — client ID and region are extracted from it automatically. Do not set `GENESYS_CLIENT_ID` as an environment variable; it shadows the stored config and causes logins against the wrong org.

> Full OAuth reference including troubleshooting: [`docs/oauth-setup.md`](docs/oauth-setup.md)

---

## First Run

Open a new chat in your project and say **"begin"**.

You do not need to know the tool names. The agent asks whether you already have a Genesys OAuth client, and:

- **If you do** — it asks for your Authorization URL and logs you in.
- **If you don't** — it walks you through creating one in the chat, step by step, then logs you in.

It then calls `complete_login()` once your browser confirms, and `smoke_test_auth()` to check all **8/8** scopes before moving on.

If you would rather drive it yourself:

```
login(authorization_url="<the Authorization URL field, pasted verbatim>")
complete_login()
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
├── deploy.js                      ← project-scoped deploy (Option A)
├── .cursor-plugin/plugin.json     ← plugin manifest (Option B)
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
