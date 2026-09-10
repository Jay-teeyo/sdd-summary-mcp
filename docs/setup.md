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

## Choosing a scope

This decision comes first, because it determines which projects the tooling is active in.

| | Project scope *(recommended)* | User scope |
|---|---|---|
| Active in | One project only | Every workspace you open |
| Mechanism | `.cursor/` files in the target project | Cursor plugin |

The server exposes 47 Genesys tools and an always-applied pipeline rule. At user scope, those load into every project you open — unrelated work gets Genesys tooling in scope and roughly 488 lines of guidance injected into every request.

Cursor documents **no way to disable a user-scoped plugin for individual projects**, so this is decided at install time rather than adjusted later. Note also that the plugin scope picker ("Install and choose a project or user scope") is documented only for **marketplace** installs — the local-directory install path is inherently user-global.

---

## Option A — Project scope (recommended)

Create your project, clone this repo inside it, and deploy from the clone.

### 1. Create the project folder

```bash
mkdir my-summary-project
cd my-summary-project
```

This folder is what you will open as your Cursor workspace. Name it whatever suits the work.

### 2. Clone the repo inside it

```bash
git clone https://github.com/Jay-teeyo/sdd-summary-mcp.git sdd-summary-mcp
```

The explicit `sdd-summary-mcp` target is the default folder name anyway, but naming it keeps the layout below accurate if the repo is ever renamed.

Cloning *inside* the project keeps everything in one place: the deployed tooling and the server it came from travel together, and re-deploying later is a two-word command rather than a hunt for wherever the repo was put.

### 3. Deploy into the project

```bash
cd sdd-summary-mcp
node deploy.js ..
```

The `..` argument is the target — the project folder created in step 1. The script takes the target path as its only argument and defaults to the current directory, so passing `..` is what points it at the parent rather than at the clone itself.

### 4. Open the project in Cursor

Open `my-summary-project` — **not** `sdd-summary-mcp` — then **Cmd+Shift+P → Developer: Reload Window**.

This matters: Cursor reads `.cursor/mcp.json` from the workspace root only. Open the clone by mistake and the server simply will not appear.

### Resulting layout

```
my-summary-project/            ← Cursor workspace root
├── .cursor/
│   ├── mcp.json               ← server definition + pre-approved tool list
│   ├── rules/                 ← pipeline guidance
│   ├── skills/                ← pipeline skills (when present in the repo)
│   └── sdd-summary/
│       └── sdd-summary-mcp.mjs  ← vendored server bundle (~727 KB)
├── .gitignore                 ← created or extended by deploy.js
├── .sdd-summary/              ← created at first login (tokens)
├── .summaryconfig-lifecycle/  ← created on first fetch (transcripts, evals)
└── sdd-summary-mcp/           ← this repo, gitignored
```

### The nested clone is gitignored deliberately

If your project is itself a git repo, a clone inside it would otherwise be committed as an *embedded repository* — dragging the full server source and the 727 KB bundle into your history, and confusing git along the way. `deploy.js` detects that it is running from inside the target and adds the clone's folder name to the project's `.gitignore`.

The comparison is made on resolved real paths, so a symlink above either location cannot hide the nesting.

Only `.cursor/` and `.gitignore` are left for you to commit.

### Why the bundle is vendored into the project

Copying the server in means `.cursor/mcp.json` can reference `${workspaceFolder}` and contain **no absolute paths at all**. The project therefore survives being moved, renamed, or handed to a colleague, and does not depend on this repo staying where it is.

This also avoids the failure that made the old `setup.js` approach fragile. That broke when the *server repo* sat inside a *different* Cursor workspace, so its `.cursor/mcp.json` was silently ignored. Here the config lands at the root of the target project, which **is** the workspace root — correct by construction.

### Merging with existing configuration

If the target already has a `.cursor/mcp.json`, the script merges into it: it adds or replaces only the `sdd-summary` entry and preserves every other MCP server. It refuses to proceed if the existing file is not valid JSON rather than overwriting it.

### Updating

```bash
cd sdd-summary-mcp
git pull
node deploy.js ..
```

The vendored copy is a snapshot, so `git pull` alone changes nothing that Cursor loads — the `deploy.js` re-run is what applies the update. Reload the window afterwards.

---

## Option B — User scope (Cursor plugin)

Installs once and is active in every workspace. Use only if you want that.

### From the repository URL

In Cursor, open **Customize → Plugins**, paste the repository URL into the plugin search, and install. Marketplace installs offer a project-or-user scope choice at this point.

> Installing from a private repository relies on your local git credentials being able to clone it. If it fails, confirm you can `git clone` the repo from a terminal first.

### Local install (offline)

```bash
# Symlink (edits stay live) …
ln -s /path/to/SDD-Summary ~/.cursor/plugins/local/sdd-summary

# … or copy (fully self-contained)
cp -R /path/to/SDD-Summary ~/.cursor/plugins/local/sdd-summary
```

Then **Cmd+Shift+P → Developer: Reload Window**.

This path is **user-global** — there is no project-scoped equivalent of `~/.cursor/plugins/local/`.

> On **Enterprise** plans, local plugin imports are disabled by default. An admin must enable **Allow Local Plugin Imports** under Dashboard → Settings → Security & Identity.

### Team marketplace (Teams / Enterprise)

For distributing to a whole org from a private repo:

1. Push the repo to your GitHub organisation.
2. In the Cursor admin dashboard, go to **Plugins → Team Marketplaces → Add Marketplace → Import from Repo** and paste the repo URL.
3. Set the installation mode — **Default Off** (opt in), **Default On** (auto-installed, removable), or **Required** (forced).
4. Optionally enable **Auto Refresh** so pushes to the tracked branch re-index automatically (requires the Cursor GitHub App; re-indexes at most once per 10 minutes).

Developers installing from Customize can choose project scope, which is the way to combine org-wide distribution with per-project activation.

---

## What gets registered

Both options register the same three components from the same sources — only the location and scope differ.

| Component | Source in repo | Effect |
|---|---|---|
| MCP server | `mcp.json` → the bundled server | Registered on reload |
| Pipeline guidance | `rules/sdd-summary-pipeline.mdc` | Injected into agent sessions |
| Pre-approved tools | `alwaysAllow` in `mcp.json` | Suppresses approval prompts so eval runs are not interrupted |

| | Project scope | User scope |
|---|---|---|
| Server path | `${workspaceFolder}/.cursor/sdd-summary/…` | `${CURSOR_PLUGIN_ROOT}/mcp-server/bundle/…` |
| Config location | `.cursor/mcp.json` in the project | Managed by Cursor |
| Guidance location | `.cursor/rules/` in the project | `rules/` in the plugin |

`mcp.json` at the repo root is the single source of truth for the server definition and the pre-approved tool list. `deploy.js` reads it and rewrites only the server path, so the two options cannot drift apart.

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

This keeps user data outside the install location under both options, so re-deploying or reinstalling never destroys work. It also means each project gets its own independent lifecycle data.

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

Common to both options:

- Confirm `node --version` is 18+ and that `node` is on the PATH Cursor sees.
- Check **Customize → MCP** and confirm `sdd-summary` is listed and toggled on.
- Run the bundle directly to check it is intact. It should print
  `SDD Summary MCP server running (stdio)` and wait; Ctrl+C to exit.

  ```bash
  # Project scope — run from the project root
  node .cursor/sdd-summary/sdd-summary-mcp.mjs

  # User scope
  node ~/.cursor/plugins/local/sdd-summary/mcp-server/bundle/sdd-summary-mcp.mjs
  ```

Project scope specifically:

- Confirm you opened the **project folder** as the workspace root — not the nested
  `sdd-summary-mcp/` clone, and not a parent folder. This is the most common mistake.
- Confirm `.cursor/mcp.json` exists in that project and is valid JSON.
- If you ran `node deploy.js` without `..`, it deployed into the clone instead of the
  project. Delete `sdd-summary-mcp/.cursor/` and re-run with `..`.

User scope specifically:

- Confirm the plugin is listed and enabled under **Customize → Plugins**.
- If the server is listed but fails to start, the `${CURSOR_PLUGIN_ROOT}` placeholder may not
  resolve on your Cursor version — official docs also use `${PLUGIN_ROOT}` for this. Try
  swapping it in `mcp.json`. Project scope avoids this entirely, since it uses
  `${workspaceFolder}`.

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
