# Setup Guide — All Environments

This guide covers how to install and connect the SDD Summary MCP server in each supported AI coding environment.

---

## Option A — Quickest: `node setup.js`

Run this from the project root after cloning:

```bash
node setup.js
```

The script:
1. Builds the MCP server (`npm install && npm run build`) if not already built
2. Asks which environments to configure (Cursor / Claude Code / Kiro)
3. Asks for your Genesys region and optional credentials
4. Writes the correct config files with absolute paths pre-filled
5. Shows you exactly what to fill in

Skip to the [Verify](#verify) step for each environment below after running the script.

---

## Option B — Published npm Package (no clone required)

If the server has been published to npm or GitHub Packages, you don't need to clone the repo at all. The MCP config points to `npx` instead of a local file:

```json
{
  "mcpServers": {
    "sdd-summary": {
      "command": "npx",
      "args": ["-y", "sdd-summary-mcp"],
      "env": {
        "GENESYS_CLIENT_ID": "your-client-id",
        "GENESYS_REGION": "YOUR_REGION_HERE",
        "SDDSUM_STORAGE_PATH": "/path/to/your/.sdd-summary",
        "SDDSUM_LIFECYCLE_PATH": "/path/to/your/project"
      }
    }
  }
}
```

`npx` downloads and caches the package automatically on first use. To publish:

```bash
cd mcp-server
npm publish                                          # public npm
# or for GitHub Packages (private):
npm publish --registry https://npm.pkg.github.com/
```

> `SDDSUM_LIFECYCLE_PATH` is required when running via npx — it tells the server where to write your `.summaryconfig-lifecycle/` data. Set it to the directory where you want your project data to live.

---

## Option C — Manual Setup

### Prerequisites

Node.js 18+:

```bash
node --version   # must be 18 or higher
```

Genesys Cloud OAuth2 client:

You need a Genesys Cloud OAuth2 client configured with all 7 required scopes. See `docs/oauth-setup.md` for step-by-step setup.

Required scopes: `users`, `ai-studio`, `analytics`, `speechandtextanalytics`, `assistants`, `notifications`, `routing`

### Build the server

Run this once (and again after any `mcp-server/src/` change):

```bash
cd mcp-server
npm install
npm run build
```

The compiled server is at `mcp-server/dist/index.js`. Note the **absolute path** — you'll need it in your MCP config.

---

## Cursor

### MCP config

Create `.cursor/mcp.json` in this project directory (or `~/.cursor/mcp.json` for global install):

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
        "login", "complete_login", "smoke_test_auth", "get_pipeline_guide",
        "build_interaction_filter", "fetch_transcripts_bulk", "fetch_existing_summaries_bulk",
        "list_transcripts", "list_test_cases", "list_test_sets", "list_eval_runs", "list_versions",
        "start_eval_run", "submit_eval_scores", "finalize_eval_run",
        "prepare_prompt_test", "save_improvement_recommendations",
        "generate_eval_run_dashboard", "generate_improvements_dashboard",
        "save_test_case", "save_test_set", "save_version",
        "generate_test_case", "generate_rubric"
      ]
    }
  }
}
```

**`alwaysAllow`** is a Cursor-specific feature that suppresses approval prompts. It is required for the parallel eval subagent workflow — without it, Cursor prompts for approval on every `submit_eval_scores` call, which would block hundreds of calls during a full test suite run.

### Agent guidance

The `.cursor/rules/sdd-summary-pipeline.mdc` rule is already present and set to `alwaysApply: true`. It is automatically injected into every Cursor agent session — no further action required.

### Verify

1. Reload the Cursor window (Cmd+Shift+P → "Reload Window")
2. Open a new chat
3. Ask the agent: `"Call smoke_test_auth to verify the MCP server is connected"`

### Eval runs in Cursor

Cursor supports parallel subagent spawning via the Task tool. The recommended eval pattern is to spawn one subagent per batch (5 transcripts each) using the `composer-2.5-fast` model. See `docs/eval-guide.md` for details.

---

## Claude Code (CLI)

### MCP config

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

Claude Code auto-detects `.mcp.json` in the working directory when you launch it from the project root.

> **Do not commit `.mcp.json`** — it is in `.gitignore`. If you want to store credentials separately, use the `configure_credentials` MCP tool instead (stores to `.sdd-summary/config.json`, also gitignored).

### Agent guidance

`CLAUDE.md` at the project root is automatically included in every Claude Code session. It contains the full pipeline guide adapted for Claude Code's sequential evaluation pattern.

### Tool approval

Claude Code may prompt for approval on MCP tool calls. For eval runs that require hundreds of `submit_eval_scores` calls, launch with:

```bash
claude --dangerously-skip-permissions
```

Use this only in trusted, local environments.

### Verify

```bash
cd /path/to/SDD-Summary
claude
# In the session:
# > Call smoke_test_auth to verify the MCP server is connected
```

### Eval runs in Claude Code

Claude Code does not have a parallel subagent mechanism. Process all batches **sequentially** within one session:

1. Call `prepare_prompt_test` (batch_size=8) repeatedly until complete for `prompt_test` runs
2. Call `start_eval_run` — receive batches and test cases
3. Work through each batch in order, calling `submit_eval_scores` for each transcript × test case
4. Call `finalize_eval_run` when done

Scores are persisted after each call — the session can be interrupted and resumed. For very large test sets, consider splitting across sessions (e.g. run batches 0–9 in one session, 10–19 in another), then call `finalize_eval_run` once all scores are written.

---

## Claude Code within VS Code

Claude Code's VS Code extension uses the same configuration as standalone Claude Code.

### MCP config

`.mcp.json` at the workspace root is detected automatically when Claude Code is used in the VS Code terminal or via the extension. Use the same format as the Claude Code CLI section above.

### Agent guidance

`CLAUDE.md` at the workspace root is picked up automatically by the Claude Code extension.

### VS Code MCP config (alternative)

If you are using VS Code's native MCP support (not the Claude Code extension), add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "sdd-summary": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/SDD-Summary/mcp-server/dist/index.js"],
      "env": {
        "GENESYS_CLIENT_ID": "your-client-id",
        "GENESYS_REGION": "YOUR_REGION_HERE"
      }
    }
  }
}
```

> Note: `.vscode/mcp.json` uses a different schema (`"servers"` / `"type": "stdio"`) compared to other MCP config files. Do not commit this file if it contains credentials.

### Eval runs

Same as standalone Claude Code — sequential batch processing within one session.

---

## Kiro

### MCP config

Copy the template and fill in your credentials:

```bash
cp .kiro/settings/mcp.json.template .kiro/settings/mcp.json
```

Edit `.kiro/settings/mcp.json`:

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

> **Do not commit `.kiro/settings/mcp.json`** — it is in `.gitignore`. The `.kiro/settings/mcp.json.template` file (with placeholder values) is safe to commit and is already tracked.

### Agent guidance

`.kiro/steering/sdd-summary-pipeline.md` is automatically included in every Kiro agent session as a steering document.

### Verify

Open a Kiro session in this project directory and ask:
> "Call smoke_test_auth to verify the MCP server is connected"

### Eval runs in Kiro

Same as Claude Code — sequential batch processing. Work through batches one at a time, calling `submit_eval_scores` for each transcript × test case, then call `finalize_eval_run`.

---

## Environment Variable Reference

All credentials can be set via environment variables in the MCP config's `env` block, or stored via the `configure_credentials` MCP tool.

| Variable | Required | Description |
|---|---|---|
| `GENESYS_CLIENT_ID` | Yes (or via tool) | OAuth2 client ID |
| `GENESYS_CLIENT_SECRET` | No | Only needed for the machine-to-machine client credentials fallback. Not required for the standard user login (Authorization Code + PKCE) flow. |
| `GENESYS_REGION` | Yes (or via tool) | Region domain (e.g. `mypurecloud.com.au`) |
| `SDDSUM_STORAGE_PATH` | Optional | Absolute path for `.sdd-summary/` directory (auth tokens, config). Defaults to `.sdd-summary/` relative to the server's working directory. |
| `SDDSUM_LIFECYCLE_PATH` | Optional | Absolute path for `.summaryconfig-lifecycle/` directory. Defaults to the server's working directory. |

---

## Differences Between Environments

| Feature | Cursor | Claude Code | Claude Code (VS Code) | Kiro |
|---|---|---|---|---|
| MCP config file | `.cursor/mcp.json` | `.mcp.json` | `.mcp.json` or `.vscode/mcp.json` | `.kiro/settings/mcp.json` |
| Agent guidance | `.cursor/rules/*.mdc` (auto) | `CLAUDE.md` (auto) | `CLAUDE.md` (auto) | `.kiro/steering/*.md` (auto) |
| `alwaysAllow` (suppress prompts) | ✅ Supported | Partial — use `--dangerously-skip-permissions` | Same as Claude Code | Not applicable |
| Parallel subagent eval | ✅ Task tool, `composer-2.5-fast` | ❌ Sequential batches | ❌ Sequential batches | ❌ Sequential batches |
| Eval performance (full suite ~96 transcripts) | ~5–10 min (parallel) | ~30–60 min (sequential) | ~30–60 min | ~30–60 min |

---

## Security Checklist

Before committing this project to any version control system:

- [ ] `.cursor/mcp.json` is in `.gitignore` (contains live credentials)
- [ ] `.kiro/settings/mcp.json` is in `.gitignore`
- [ ] `.mcp.json` is in `.gitignore`
- [ ] `.sdd-summary/config.json` is in `.gitignore` (contains OAuth tokens)
- [ ] `.env` is in `.gitignore`
- [ ] No credentials are hardcoded in any committed file

All of the above are already covered by the root `.gitignore`.
