# SDD Summary — Genesys Cloud Summary Prompt Testing Pipeline

A tooling bundle for developing, testing, and iteratively improving **Genesys Cloud Agent Copilot / AI Studio summary prompts**. It works in **Kiro** and in **Cursor**.

It ships an MCP server plus the pipeline guidance the agent needs to orchestrate the whole workflow — fetching transcripts, authoring requirements and test cases, running evaluations, generating dashboards, and iterating on prompts — through natural language.

---

## Install

Everything ships **pre-built and self-contained**. There is no `npm install` and no build step — you need only Node.js 18+ and either Kiro or Cursor.

The deploy script asks which editor you use and writes only that editor's configuration.

Choose a scope first, because it determines which projects the tooling is active in.

| | Project scope *(recommended)* | User scope |
|---|---|---|
| Active in | One project only | Every workspace you open |
| Mechanism | `.kiro/` or `.cursor/` files in the target project | Global config / Cursor plugin |
| Use when | Normal use — this is a specialised tool | You genuinely want Genesys tooling everywhere |

**Project scope is the default recommendation.** This server exposes 44 Genesys tools and always-applied pipeline guidance. At user scope those load into unrelated work, putting irrelevant tools in scope and injecting ~490 lines of guidance into every request.

### Option A — Project scope (recommended)

Everything happens inside your editor, starting from an empty project folder.

**1. Create and open your project folder**

Open the editor, then **File → Open Folder**. In the dialog, click **New Folder**, name it — say `my-summary-project` — then create and open it.

The editor now has that folder as your workspace root, which is exactly where the tooling needs to land.

**2. Open the built-in terminal**

From the menu bar: **View → Terminal**. It opens in the workspace root, so there is no need to change directory.

**3. Clone and deploy — one command**

```bash
git clone https://github.com/Jay-teeyo/sdd-summary-mcp.git sdd-summary-mcp && node sdd-summary-mcp/deploy.js
```

On **Windows PowerShell**, `&&` is a syntax error — it only exists in PowerShell 7, and Windows
ships 5.1. Run the two commands on separate lines instead:

```powershell
git clone https://github.com/Jay-teeyo/sdd-summary-mcp.git sdd-summary-mcp
node sdd-summary-mcp/deploy.js
```

Run it from the project root. `deploy.js` deploys into the current directory by default, which is exactly where you want it.

It will ask which editor you use:

```
  Which editor will you use this in?

    1) Kiro
    2) Cursor

  Enter 1 or 2:
```

To skip the question — useful in a script — pass the host directly:

```bash
node sdd-summary-mcp/deploy.js --kiro
node sdd-summary-mcp/deploy.js --cursor
```

**4. Finish setup — this differs by editor**

<table>
<tr><th>Kiro</th><th>Cursor</th></tr>
<tr valign="top"><td>

Nothing to do. Kiro starts the server on demand and hot-reloads config changes, so there is no toggle and no window reload.

To confirm, run `/mcp` in a chat or `kiro-cli mcp list` — you should see **`sdd-summary`** with **44 tools**.

</td><td>

Two manual steps:

1. **View → Command Palette → "Developer: Reload Window"**
2. Open **Customize** in the sidebar → **MCPs** → toggle **`sdd-summary`** on. It should then report **44 tools**.

**Writing the config does not enable the server** and Cursor has no setting to pre-enable it, so this toggle is required. If the entry is missing entirely the config wasn't found — check step 1 opened the project folder itself.

</td></tr>
</table>

**5. Start**

Open a new chat and say **"begin"**. The agent checks whether you already have a Genesys OAuth client and walks you through creating one only if you don't.

On **Kiro**, run that chat as `kiro-cli chat` **from the project directory**. The pipeline agent is set as the project's default agent, so no `--agent` flag is needed — but that default is a *workspace* setting, so it only applies when the CLI starts inside the project. To be explicit: `kiro-cli chat --agent sdd-summary`.

> A chat that is not this project's Kiro CLI agent will not have the tools. The `sdd-summary` MCP server is declared in `.kiro/agents/sdd-summary.json`, so it loads for that agent only — a different agent, or a session started outside the project, sees no `@sdd-summary/*` tools at all. That is the pre-approval mechanism working as intended, not a broken install: `allowedTools` exists only in an agent config, so the tools and their approvals travel together.

You end up with one of these:

```
my-summary-project/                    ← Kiro
├── .kiro/
│   ├── agents/
│   │   ├── sdd-summary.json           ← server + 32 pre-approved tools + steering
│   │   └── sdd-summary-scorer.json    ← eval scoring subagent
│   ├── settings/cli.json              ← makes sdd-summary this project's default agent
│   ├── steering/
│   │   └── sdd-summary-pipeline.md    ← pipeline guidance
│   └── sdd-summary/
│       └── sdd-summary-mcp.mjs        ← the vendored server bundle
├── .gitignore                         ← written/extended for you
└── sdd-summary-mcp/                   ← this repo, gitignored
```

```
my-summary-project/                    ← Cursor
├── .cursor/
│   ├── mcp.json                       ← server definition
│   ├── permissions.json               ← pre-approved tools, so eval runs don't stall
│   ├── rules/                         ← pipeline guidance
│   ├── skills/                        ← pipeline skills (when present)
│   └── sdd-summary/
│       └── sdd-summary-mcp.mjs        ← the vendored server bundle
├── .gitignore                         ← written/extended for you
└── sdd-summary-mcp/                   ← this repo, gitignored
```

Neither config contains an **absolute path**, so the project keeps working if it's moved, renamed, or handed to a colleague. Cursor gets there via `${workspaceFolder}`; Kiro doesn't expand that placeholder, so it uses a workspace-relative path instead — Kiro launches the server with the workspace root as its working directory, which makes a relative path resolve correctly. If the project already has config files of its own, the script merges into them and preserves anything else you had configured.

To update later, from the project root:

```bash
cd sdd-summary-mcp && git pull && cd .. && node sdd-summary-mcp/deploy.js
```

In Windows PowerShell:

```powershell
cd sdd-summary-mcp; git pull; cd ..; node sdd-summary-mcp/deploy.js
```

The vendored bundle is a snapshot, so re-running `deploy.js` is what actually applies a server change. On Cursor, reload the window afterwards; on Kiro the change is hot-reloaded.

### Option B — User scope

Installs once and applies to every workspace. Not recommended — see the scope table above.

**Kiro:** copy the two agent files to `~/.kiro/agents/`, the steering file to `~/.kiro/steering/`, and the bundle somewhere stable, then edit the agents' `args` to that absolute path. Note global steering loads in **every** workspace, which is the cost.

**Cursor:**

```bash
# Local install — works offline, no git or network needed
ln -s /path/to/SDD-Summary ~/.cursor/plugins/local/sdd-summary
```

Or in Cursor, open **Customize → Plugins** and paste this repository's URL into the plugin search. Marketplace installs additionally offer a project-scope choice at install time. Then run **Developer: Reload Window**.

> On Enterprise plans, local plugin imports are disabled by default. An admin must enable **Allow Local Plugin Imports** under Dashboard → Settings → Security & Identity.

### Where data goes

Under every option, working data is written to **the workspace you have open**, never to the install location:

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
| `assistants` | Agent Copilot config — lists assistants and queue associations |
| `conversations` | Messaging transcript fallback when STA retrieval fails |
| `notifications` | Preview API delivers results via WebSocket notification channel |
| `routing:readonly` | Resolves queue display names from IDs |
| `speech-and-text-analytics:readonly` | Transcript URL fetch and existing summary retrieval |
| `users:readonly` | Resolves current user ID for WebSocket topic construction |

Names are exactly as they appear in the Genesys scope picker — search for them there rather than typing them. Three are `:readonly` because the server only reads from the Routing, STA, and Users APIs.

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
├── deploy.js                      ← project-scoped deploy (asks Kiro or Cursor)
├── deploy/
│   ├── shared.js                  ← common deploy helpers
│   ├── cursor.js                  ← Cursor target (.cursor/…)
│   └── kiro.js                    ← Kiro target (.kiro/…)
├── kiro/
│   ├── agents/                    ← Kiro agent configs (pipeline + eval scorer)
│   └── eval-orchestration.md      ← Kiro's parallel-scoring instructions
├── .cursor-plugin/plugin.json     ← Cursor plugin manifest (Option B)
├── mcp.json                       ← MCP server definition + canonical tool allowlist
├── rules/                         ← pipeline guidance (source of truth for both hosts)
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

### How one source serves two hosts

The server bundle is byte-identical for both editors; only the wiring differs.

- **`mcp.json`** holds the canonical pre-approved tool list under `alwaysAllow`. That key is not in either host's schema — each deploy target translates it into what the host actually reads (Cursor: `permissions.json` → `mcpAllowlist`; Kiro: `allowedTools` in the agent config). Add a tool there once and both hosts pick it up.
- **`rules/sdd-summary-pipeline.mdc`** is the single guidance source. Cursor consumes it verbatim. The Kiro target rewrites the frontmatter (`alwaysApply: true` → `inclusion: always`) and swaps the region between the `<!-- HOST-SPECIFIC:EVAL-ORCHESTRATION -->` markers for `kiro/eval-orchestration.md`. If those markers are missing the deploy **fails loudly**, rather than shipping Cursor's instructions to a Kiro user.
- **`SDDSUM_HOST`** is set by each target, so the server's own `get_pipeline_guide()` output names the right parallel-agent mechanism. See `mcp-server/src/host.ts`.

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

The committed bundle is what the editor actually runs, so **any source change requires a rebundle and a commit**.

```bash
cd mcp-server
npm install          # first time only
npm run typecheck    # verify types
npm run bundle       # regenerate bundle/sdd-summary-mcp.mjs
```

Then re-run `deploy.js` against your test project to refresh its vendored copy. On Cursor, reload the window afterwards; on Kiro the change is hot-reloaded.

To develop against a live copy on Cursor, symlink the repo as a local plugin (Option B above) — edits become active on the next rebundle plus window reload.

`SDDSUM_HOST` selects the host-specific guidance the server emits (`cursor`, `kiro`, or unset for neutral wording). To check what a host will actually see, set it when running the server by hand.

---

## Security

- **Never commit credentials.** `.sdd-summary/` is gitignored, as is `.cursor/mcp.json`.
- **Never commit customer data.** `.summaryconfig-lifecycle/` contains transcripts with PII and is gitignored in full.
- Tokens are user-scoped and expire in roughly 30 minutes; any API call reopens the browser on expiry.
- `update_summary_setting` and `update_copilot_config` write to live Genesys and are deliberately **not** pre-approved on either host — they always require explicit confirmation. On Kiro the eval scoring subagent has them removed outright via `disabledTools`, so a scoring stage cannot reach live Genesys even by mistake.
- See `.env.example` for the full list of environment variables.
