# SDD Summary — Genesys Cloud Summary Prompt Testing Pipeline

An MCP (Model Context Protocol) server for developing, testing, and iteratively improving **Genesys Cloud Agent Copilot / AI Studio summary prompts**.

Connect it to your AI coding environment. The agent orchestrates the full workflow — fetching transcripts, running evaluations, generating dashboards, and iterating on prompts — through natural language.

---

## Quickest Setup — `node setup.js`

Clone the repo, then run:

```bash
node setup.js
```

This builds the server and generates config files for whichever environments you choose. Then reload your AI environment and run `login()`.

---

## Prerequisites

- **Node.js 18+**
- **A Genesys Cloud OAuth2 client** configured as below
- One of the supported AI coding environments below

---

## Genesys Cloud OAuth Client Setup

### 1. Create the OAuth client

In Genesys Admin → **Integrations → OAuth → Add Client**:

| Field | Value |
|---|---|
| **App Name** | `SDD Summary MCP` (or any name) |
| **Grant Types** | ✅ **Code Authorization** (required) · ✅ **Client Credentials** (optional fallback) |
| **Redirect URI** | `http://localhost:8787/callback` |

Copy the **Client ID** shown after saving (secret is not needed for the user login flow).

### 2. Add all 7 required scopes

Under the **Scope** tab, add every scope below. Add them all now — missing any will block specific tools later.

| Scope | Why it's needed |
|---|---|
| `ai-studio` | Summary config CRUD and preview summary generation |
| `analytics` | Conversation search and communication ID resolution |
| `conversations` | Summary settings endpoints (`/api/v2/conversations/summaries/...`) |
| `notifications` | Preview API delivers results via WebSocket notification channel |
| `speechandtextanalytics` | Transcript URL fetch and existing summary retrieval |
| `users` | Resolves current user ID for WebSocket topic construction |
| `assistants` | Agent Copilot config — lists assistants and queue associations |
| `routing` | Resolves queue display names from IDs |

### 3. Find your Authorization URL

In Genesys Admin → **IT and Integrations → OAuth** → open your client → scroll to the bottom. Copy the full **Authorization URL** field:

```
https://login.{your-region}/oauth/authorize?client_id=abc123-...&response_type=...
```

This URL is the only thing you need — client ID and region are extracted from it automatically.

> Full OAuth setup reference including troubleshooting: [`docs/oauth-setup.md`](docs/oauth-setup.md)

---

## Quick Start

### 1. Build the MCP server

```bash
cd mcp-server
npm install
npm run build
```

### 2. Connect your AI coding environment

| Environment | Config file | Guidance file | Setup guide |
|---|---|---|---|
| **Cursor** | `.cursor/mcp.json` | `.cursor/rules/sdd-summary-pipeline.mdc` *(auto-applied)* | [Setup → Cursor](#cursor) |
| **Claude Code** (CLI or VS Code) | `.mcp.json` at project root | `CLAUDE.md` *(auto-applied)* | [Setup → Claude Code](#claude-code--vs-code) |
| **Kiro** | `.kiro/settings/mcp.json` | `.kiro/steering/sdd-summary-pipeline.md` *(auto-applied)* | [Setup → Kiro](#kiro) |

Detailed setup steps: [`docs/setup.md`](docs/setup.md)

### 3. Log in

```
login(authorization_url="https://login.{your-region}/oauth/authorize?client_id=...")
```

After the browser confirms login: `complete_login()`

Confirm all 7 scopes are present: `smoke_test_auth()`

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

## Environment Setup

### Cursor

Create `.cursor/mcp.json` in this project (or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "sdd-summary": {
      "command": "node",
      "args": ["/absolute/path/to/SDD-Summary/mcp-server/dist/index.js"],
      "env": {
        "GENESYS_CLIENT_ID": "your-client-id",
        "GENESYS_REGION": "YOUR_REGION_HERE",
        "SDDSUM_STORAGE_PATH": "/absolute/path/to/SDD-Summary/.sdd-summary"
      },
      "alwaysAllow": [
        "login", "complete_login", "smoke_test_auth",
        "build_interaction_filter", "fetch_transcripts_bulk", "fetch_existing_summaries_bulk",
        "list_transcripts", "list_test_cases", "list_test_sets", "list_eval_runs", "list_versions",
        "start_eval_run", "submit_eval_scores", "finalize_eval_run",
        "prepare_prompt_test", "save_improvement_recommendations",
        "generate_eval_run_dashboard", "generate_improvements_dashboard", "get_pipeline_guide",
        "save_test_case", "save_test_set", "save_version",
        "generate_test_case", "generate_rubric"
      ]
    }
  }
}
```

> **`alwaysAllow`** suppresses approval prompts during parallel eval subagent runs — required for the full test suite to run without interruption.

The `.cursor/rules/sdd-summary-pipeline.mdc` workspace rule is already present and auto-applied to every Cursor agent session.

### Claude Code / VS Code

Create `.mcp.json` at the project root:

```json
{
  "mcpServers": {
    "sdd-summary": {
      "command": "node",
      "args": ["/absolute/path/to/SDD-Summary/mcp-server/dist/index.js"],
      "env": {
        "GENESYS_CLIENT_ID": "your-client-id",
        "GENESYS_REGION": "YOUR_REGION_HERE",
        "SDDSUM_STORAGE_PATH": "/absolute/path/to/SDD-Summary/.sdd-summary"
      }
    }
  }
}
```

Run `claude` from the project root — it detects `.mcp.json` automatically. The `CLAUDE.md` at the project root is auto-included in every Claude Code session.

For eval runs with many tool calls, launch with `--dangerously-skip-permissions` to avoid manual approval on each `submit_eval_scores` call:

```bash
claude --dangerously-skip-permissions
```

> **Eval approach in Claude Code:** Process batches sequentially within one session rather than spawning parallel subagents. See [CLAUDE.md](CLAUDE.md) for details.

### Kiro

1. Copy the template and fill in your credentials:
   ```bash
   cp .kiro/settings/mcp.json.template .kiro/settings/mcp.json
   # Edit .kiro/settings/mcp.json with your credentials
   ```

2. The `.kiro/steering/sdd-summary-pipeline.md` is auto-applied to every Kiro agent session.

3. **Do not commit `.kiro/settings/mcp.json`** — it contains credentials.

---

## Directory Structure

```
SDD-Summary/
├── CLAUDE.md                         ← Claude Code agent guidance (auto-applied)
├── .cursor/rules/                    ← Cursor agent guidance (auto-applied)
├── .kiro/steering/                   ← Kiro agent guidance (auto-applied)
├── docs/                             ← Methodology guides
│   ├── setup.md                      ← Per-environment setup
│   ├── eval-guide.md
│   ├── oauth-setup.md
│   ├── requirements-guide.md
│   ├── test-case-guide.md
│   └── workflow.md
├── mcp-server/                       ← MCP server source
│   ├── src/
│   └── dist/                         ← compiled (run npm run build)
└── .summaryconfig-lifecycle/         ← per-config working data
    └── {SummaryConfigName}/
        ├── interaction-filter.json
        ├── requirements/
        ├── transcripts/static/
        ├── test-cases/
        ├── test-sets/
        ├── version-history/
        └── eval-runs/
```

---

## Security

- **Never commit credentials.** `.cursor/mcp.json`, `.kiro/settings/mcp.json`, `.mcp.json`, and `.sdd-summary/config.json` are all in `.gitignore`.
- Credentials can also be stored via the `configure_credentials` tool, which writes to `.sdd-summary/config.json` (also gitignored).
- See `.env.example` for the full list of environment variables.
