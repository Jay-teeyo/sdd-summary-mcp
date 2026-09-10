# Setup Guide

How to install the SDD Summary plugin in Cursor and verify it works.

The plugin targets **Cursor only**. It ships a pre-built, self-contained server bundle, so there is no dependency install and no build step — Node.js 18+ and Cursor are the only prerequisites.

---

## Prerequisites

```bash
node --version   # must be 18 or higher
```

You also need a Genesys Cloud OAuth2 client with all **8** required scopes:

`ai-studio`, `analytics`, `assistants`, `conversations`, `notifications`, `routing:readonly`, `speech-and-text-analytics:readonly`, `users:readonly`

See [`oauth-setup.md`](./oauth-setup.md) for step-by-step client creation.

---

## Choosing a scope

This decision comes first, because it determines which projects the tooling is active in.

| | Project scope *(recommended)* | User scope |
|---|---|---|
| Active in | One project only | Every workspace you open |
| Mechanism | `.cursor/` files in the target project | Cursor plugin |

The server exposes 42 Genesys tools and an always-applied pipeline rule. At user scope, those load into every project you open — unrelated work gets Genesys tooling in scope and roughly 488 lines of guidance injected into every request.

Cursor documents **no way to disable a user-scoped plugin for individual projects**, so this is decided at install time rather than adjusted later. Note also that the plugin scope picker ("Install and choose a project or user scope") is documented only for **marketplace** installs — the local-directory install path is inherently user-global.

---

## Option A — Project scope (recommended)

Every step happens inside Cursor. You create an empty project folder, open it as your workspace, then clone and deploy from its own terminal.

The order matters. Opening the folder *first* means Cursor's workspace root is already correct when the files land in it, which removes the single most common way this install goes wrong.

### 1. Create and open the project folder in Cursor

From the menu bar: **File → Open Folder**.

In the dialog:

1. Navigate to wherever you keep your work.
2. Click **New Folder**.
3. Name it — `my-summary-project` works, or anything that suits the job.
4. Create it, then open it.

Cursor now shows that empty folder in the Explorer. It is your **workspace root**, and it is where all the tooling will be installed.

### 2. Open the built-in terminal

From the menu bar: **View → Terminal**.

The terminal opens in the workspace root, so you are already in the right directory. If you have customised `terminal.integrated.cwd`, confirm with `pwd` before continuing.

### 3. Clone and deploy

One command, run from the project root:

```bash
git clone https://github.com/Jay-teeyo/sdd-summary-mcp.git sdd-summary-mcp && node sdd-summary-mcp/deploy.js
```

`deploy.js` deploys into the current working directory when given no argument, which is why this works from the project root with no path to pass and no `cd`.

Cloning *inside* the project keeps everything in one place: the deployed tooling and the server it came from travel together, and re-deploying later doesn't require hunting for wherever the repo was put.

> If you prefer to run it from inside the clone, pass the target explicitly:
> `cd sdd-summary-mcp && node deploy.js ..` — the `..` is what points it at the
> project rather than at the clone itself.

### 4. Reload Cursor

**View → Command Palette**, then run **Developer: Reload Window**.

Because you opened the project folder back in step 1, there is nothing to re-open — the workspace root is already correct. Reloading is only needed so Cursor picks up the newly written `.cursor/mcp.json`.

### 5. Enable the server — manual step

**Reloading does not enable the server.** The config is now in place, but Cursor treats "configured" and "active" as separate things, and there is no documented setting that can pre-enable a server. It has to be switched on by hand, once per project.

Open **Customize** in the sidebar → **MCPs** → toggle **`sdd-summary`** on.

It should then report **42 tools**. If the entry is absent entirely, the config was not found — see troubleshooting below.

### 6. Start the pipeline

Open a new chat and say **"begin"**. The agent asks whether you already have a Genesys OAuth client, and only walks you through creating one if you don't. See [First Run](#verify) below.

### Resulting layout

```
my-summary-project/            ← Cursor workspace root
├── .cursor/
│   ├── mcp.json               ← server definition
│   ├── permissions.json       ← pre-approved tool list (mcpAllowlist)
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

A folder you create this way is not a git repo yet, but most projects become one. The moment yours does, the clone sitting inside it would be committed as an *embedded repository* — dragging the full server source and the 727 KB bundle into your history, and confusing git along the way. So `deploy.js` gets ahead of it: on detecting that it is running from inside its own target, it adds the clone's folder name to the project's `.gitignore`.

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
| MCP server | `mcp.json` → the bundled server | Registered on reload, then enabled manually |
| Pipeline guidance | `rules/sdd-summary-pipeline.mdc` | Injected into agent sessions |
| Pre-approved tools | `alwaysAllow` list in `mcp.json` | Translated into `.cursor/permissions.json` at deploy time |

| | Project scope | User scope |
|---|---|---|
| Server path | `${workspaceFolder}/.cursor/sdd-summary/…` | `${CURSOR_PLUGIN_ROOT}/mcp-server/bundle/…` |
| Config location | `.cursor/mcp.json` in the project | Managed by Cursor |
| Guidance location | `.cursor/rules/` in the project | `rules/` in the plugin |
| Tool pre-approval | `.cursor/permissions.json` | Not available — see below |

`mcp.json` at the repo root is the single source of truth for the server definition and the tool list. `deploy.js` reads it and rewrites only the server path, so the two options cannot drift apart.

### Approval suppression

This matters more than it sounds. A full test suite issues hundreds of `submit_eval_scores` calls; without pre-approval, Cursor prompts on each one and the run stalls.

The mechanism is `.cursor/permissions.json`:

```json
{
  "mcpAllowlist": ["sdd-summary:submit_eval_scores", "..."]
}
```

Two tools are deliberately **excluded** because they write to live Genesys and must always be confirmed explicitly:

- `update_summary_setting`
- `update_copilot_config`

> **`alwaysAllow` inside `mcp.json` does not work.** It is not part of Cursor's
> documented schema and is ignored. This repo keeps the list under that key
> purely as the source of truth, and `deploy.js` strips it from the deployed
> config and re-emits it as `permissions.json` entries in the documented
> `server:tool` form. A user-scope plugin install therefore gets **no** tool
> pre-approval, which is another reason to prefer project scope.

Two caveats on `permissions.json`:

- It only takes effect when a Run Mode is active in Cursor Settings.
- When present, it **replaces** the in-app MCP allowlist for this workspace rather than merging with it. `deploy.js` preserves any non-`sdd-summary` entries already in the file, but entries you added through the Cursor UI are not migrated automatically.

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

1. Check **Customize → MCPs** lists `sdd-summary`, toggled **on**, with 42 tools.
2. Open a new chat in the project and say **"begin"**.

The agent asks whether you already have a Genesys OAuth client:

- **Yes** — it asks for your Authorization URL, then handles `login()`, `complete_login()` and `smoke_test_auth()`.
- **No** — it walks you through creating the client in the chat first (grant type, redirect URI, all 8 scopes), then logs you in.

Expect **8/8 scopes** from `smoke_test_auth()`. If you would rather drive it manually:

```
login(authorization_url="<the Authorization URL field, pasted verbatim>")
complete_login()
smoke_test_auth()
```

The value in that field is usually an `apps.{region}/directory/#/...` admin deep-link rather than an `/oauth/authorize` URL. Both are accepted — paste whichever you see, unchanged. See [`oauth-setup.md`](./oauth-setup.md#step-4--find-your-authorization-url).

On later sessions `login()` takes no argument, since the Authorization URL is stored.

### If the server does not appear

**First: is it toggled on?** A freshly deployed server is listed but inactive until you enable it under **Customize → MCPs**. This is the most common cause and it looks exactly like a broken install.

Then:

Common to both options:

- Confirm `node --version` is 18+ and that `node` is on the PATH Cursor sees.
- Run the bundle directly to check it is intact. It should print
  `SDD Summary MCP server running (stdio)` and wait; Ctrl+C to exit.

  ```bash
  # Project scope — run from the project root
  node .cursor/sdd-summary/sdd-summary-mcp.mjs

  # User scope
  node ~/.cursor/plugins/local/sdd-summary/mcp-server/bundle/sdd-summary-mcp.mjs
  ```

Project scope specifically:

- Confirm `.cursor/mcp.json` sits at the **top level of the Explorer**, beside
  `sdd-summary-mcp/`. If it is nested inside `sdd-summary-mcp/` instead, the deploy ran
  with the wrong target — see the next point.
- If you ran `node deploy.js` from *inside* the clone without `..`, it deployed into the
  clone rather than the project. Delete `sdd-summary-mcp/.cursor/`, then re-run from the
  project root: `node sdd-summary-mcp/deploy.js`.
- Confirm the workspace root is the project folder, not the `sdd-summary-mcp/` clone.
  Following the steps above makes this correct by default, but it can drift if you later
  reopen the clone directly from Cursor's recent-projects list.
- Confirm `.cursor/mcp.json` is valid JSON.

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
