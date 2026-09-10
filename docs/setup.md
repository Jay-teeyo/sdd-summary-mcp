# Setup Guide

How to install the SDD Summary plugin in Cursor and verify it works.

The plugin targets **Cursor only**. It ships a pre-built, self-contained server bundle, so there is no dependency install and no build step — Node.js 18+ and Cursor are the only prerequisites.

---

## Prerequisites

```bash
node --version   # must be 18 or higher
```

You also need a Genesys Cloud OAuth2 client with all **8** required scopes:

`users`, `ai-studio`, `analytics`, `conversations`, `speechandtextanalytics`, `assistants`, `notifications`, `routing`

See [`oauth-setup.md`](./oauth-setup.md) for step-by-step client creation.

---

## Option A — Install from the repository URL

In Cursor, open **Customize → Plugins**, paste the repository URL into the plugin search, and install.

Cursor clones the repo and registers everything in it — the MCP server, the pipeline guidance, and the pre-approved tool list.

> Installing from a private repository relies on your local git credentials being able to clone it. If the install fails, confirm you can `git clone` the repo from a terminal first.

## Option B — Local install (offline)

Use this when you have the repo as a folder or zip, or when you want no network or git dependency at all. This is the most reliable path for workshops and shared machines.

```bash
# Symlink (edits stay live) …
ln -s /path/to/SDD-Summary ~/.cursor/plugins/local/sdd-summary

# … or copy (fully self-contained)
cp -R /path/to/SDD-Summary ~/.cursor/plugins/local/sdd-summary
```

Then **Cmd+Shift+P → Developer: Reload Window**.

> On **Enterprise** plans, local plugin imports are disabled by default. An admin must enable **Allow Local Plugin Imports** under Dashboard → Settings → Security & Identity.

## Option C — Team marketplace (Teams / Enterprise)

For distributing to a whole org from a private repo:

1. Push the repo to your GitHub organisation.
2. In the Cursor admin dashboard, go to **Plugins → Team Marketplaces → Add Marketplace → Import from Repo** and paste the repo URL.
3. Set the installation mode:
   - **Default Off** — developers opt in
   - **Default On** — auto-installed, can be removed
   - **Required** — forced for everyone
4. Optionally enable **Auto Refresh** so pushes to the tracked branch re-index automatically (requires the Cursor GitHub App on the repo; re-indexes at most once per 10 minutes).

---

## What the plugin registers

| Component | Source in repo | Effect |
|---|---|---|
| MCP server | `mcp.json` → `mcp-server/bundle/sdd-summary-mcp.mjs` | Registered automatically; no `.cursor/mcp.json` to write and no absolute paths to fix |
| Pipeline guidance | `rules/sdd-summary-pipeline.mdc` | Injected into agent sessions |
| Pre-approved tools | `alwaysAllow` in `mcp.json` | Suppresses approval prompts so eval runs are not interrupted |

The server path uses `${CURSOR_PLUGIN_ROOT}`, so it resolves wherever Cursor placed the plugin.

### Approval suppression

`alwaysAllow` matters more than it sounds. A full test suite issues hundreds of `submit_eval_scores` calls; without pre-approval, Cursor prompts on each one and the run stalls.

Two tools are deliberately **excluded** because they write to live Genesys and must always be confirmed explicitly:

- `update_summary_setting`
- `update_copilot_config`

---

## Where data is written

Storage is pinned to the **workspace you have open**, using `${workspaceFolder}`, not the plugin directory:

| Path | Contents |
|---|---|
| `{workspace}/.summaryconfig-lifecycle/` | Transcripts, requirements, test cases, eval runs, version history |
| `{workspace}/.sdd-summary/` | OAuth config and tokens |

This keeps user data outside the plugin install, so updating or reinstalling the plugin never destroys work. It also means each project you open gets its own independent lifecycle data.

---

## Verify

1. Reload the Cursor window (**Cmd+Shift+P → Developer: Reload Window**).
2. Open a new chat in the project you want to work in.
3. Ask the agent to log in:

   ```
   login(authorization_url="https://login.{your-region}/oauth/authorize?client_id=...")
   ```

   A browser opens; after it confirms, call `complete_login()`.

4. Confirm all scopes are active — expect **8/8**:

   ```
   smoke_test_auth()
   ```

On later sessions `login()` takes no argument, since the Authorization URL is stored.

### If the server does not appear

- Confirm the plugin is listed and enabled under **Customize → Plugins**.
- Confirm `node --version` is 18+ and that `node` is on the PATH Cursor sees.
- Run the bundle directly to check it is intact:

  ```bash
  node ~/.cursor/plugins/local/sdd-summary/mcp-server/bundle/sdd-summary-mcp.mjs
  ```

  It should print `SDD Summary MCP server running (stdio)` and wait. Ctrl+C to exit.

---

## Eval runs

Cursor supports parallel subagent spawning via the Task tool. Spawn one subagent per batch using the `composer-2.5-fast` model. See [`eval-guide.md`](./eval-guide.md).

---

## Environment Variable Reference

Credentials normally come from `login()`, which stores them under `.sdd-summary/`. The variables below are available for overrides.

| Variable | Required | Description |
|---|---|---|
| `SDDSUM_STORAGE_PATH` | Set by the plugin | Path for `.sdd-summary/` (OAuth config and tokens). Defaults to `.sdd-summary/` relative to the server's working directory. |
| `SDDSUM_LIFECYCLE_PATH` | Set by the plugin | Path for `.summaryconfig-lifecycle/`. Defaults to the server's working directory. |
| `GENESYS_CLIENT_ID` | **Avoid** | Shadows the stored config and causes logins against the wrong org. Let `login()` manage this instead. |
| `GENESYS_REGION` | **Avoid** | Extracted from the Authorization URL automatically. |
| `GENESYS_CLIENT_SECRET` | No | Only for the vestigial machine-to-machine fallback. Not used by the standard PKCE user login. |

---

## Security Checklist

Before committing or sharing this repo:

- [ ] `.sdd-summary/` is gitignored (contains OAuth tokens)
- [ ] `.summaryconfig-lifecycle/` is gitignored (contains customer transcripts with PII)
- [ ] `.cursor/mcp.json` is gitignored
- [ ] `.env` is gitignored
- [ ] No credentials hardcoded in any committed file

All of the above are already covered by the root `.gitignore`. Note that `mcp-server/bundle/` **is** committed by design — it contains only compiled server code, no credentials.
