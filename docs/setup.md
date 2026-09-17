# Setup Guide

How to install the SDD Summary tooling in **Kiro** or **Cursor** and verify it works.

It ships a pre-built, self-contained server bundle, so there is no dependency install and no build step — Node.js 18+ and one of the two editors are the only prerequisites. The same bundle runs on both; only the wiring around it differs, and `deploy.js` asks which editor you use and writes only that one's configuration.

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
| Mechanism | `.kiro/` or `.cursor/` files in the target project | Global config directory / Cursor plugin |

The server exposes 44 Genesys tools and always-applied pipeline guidance. At user scope those load into every project you open — unrelated work gets Genesys tooling in scope and roughly 490 lines of guidance injected into every request.

Host-specific caveats at user scope:

- **Kiro** — global steering in `~/.kiro/steering/` loads in *every* workspace, and a global agent in `~/.kiro/agents/` needs an absolute path to the bundle, so the install stops being portable.
- **Cursor** — Cursor documents **no way to disable a user-scoped plugin for individual projects**, so this is decided at install time rather than adjusted later. The plugin scope picker ("Install and choose a project or user scope") is documented only for **marketplace** installs; the local-directory install path is inherently user-global.

---

## Option A — Project scope (recommended)

Every step happens inside your editor. You create an empty project folder, open it as your workspace, then clone and deploy from its own terminal.

The order matters. Opening the folder *first* means the workspace root is already correct when the files land in it, which removes the single most common way this install goes wrong.

### 1. Create and open the project folder

From the menu bar: **File → Open Folder**.

In the dialog:

1. Navigate to wherever you keep your work.
2. Click **New Folder**.
3. Name it — `my-summary-project` works, or anything that suits the job.
4. Create it, then open it.

The editor now shows that empty folder in the Explorer. It is your **workspace root**, and it is where all the tooling will be installed.

### 2. Open the built-in terminal

From the menu bar: **View → Terminal**.

The terminal opens in the workspace root, so you are already in the right directory. If you have customised the terminal's working directory, confirm with `pwd` before continuing.

### 3. Clone and deploy

One command, run from the project root:

```bash
git clone https://github.com/Jay-teeyo/sdd-summary-mcp.git sdd-summary-mcp && node sdd-summary-mcp/deploy.js
```

**Windows PowerShell** rejects `&&` with *"The token '&&' is not a valid statement separator in
this version"*. The operator was only added in PowerShell 7, and Windows ships 5.1. Run the two
commands on separate lines:

```powershell
git clone https://github.com/Jay-teeyo/sdd-summary-mcp.git sdd-summary-mcp
node sdd-summary-mcp/deploy.js
```

If you want it as a single line, gate the second command on the exit code rather than on `$?` —
`git clone` writes its progress to stderr, which can make `$?` report failure after a clone that
actually succeeded:

```powershell
git clone https://github.com/Jay-teeyo/sdd-summary-mcp.git sdd-summary-mcp; if ($LASTEXITCODE -eq 0) { node sdd-summary-mcp/deploy.js }
```

`;` on its own is not a substitute for `&&`: it runs the second command even if the clone failed,
which would leave `deploy.js` looking for a directory that isn't there.

`deploy.js` deploys into the current working directory when given no argument, which is why this works from the project root with no path to pass and no `cd`.

It then asks which editor you use:

```
  Which editor will you use this in?

    1) Kiro
    2) Cursor

  Enter 1 or 2:
```

Only that editor's configuration is written — you do not end up with stray files for the other one. To skip the question in a script, pass the host directly as `--kiro` or `--cursor`. A non-interactive run with no flag **refuses** rather than guessing, because writing a whole config tree for the wrong editor looks like a broken install rather than a wrong choice.

Cloning *inside* the project keeps everything in one place: the deployed tooling and the server it came from travel together, and re-deploying later doesn't require hunting for wherever the repo was put.

> If you prefer to run it from inside the clone, pass the target explicitly:
> `cd sdd-summary-mcp && node deploy.js ..` (PowerShell: `cd sdd-summary-mcp; node deploy.js ..`)
> — the `..` is what points it at the project rather than at the clone itself.

### 4. Activate — this differs by editor

#### Kiro

**Nothing to do.** Kiro starts the server on demand and hot-reloads configuration changes, so there is no toggle to switch on and no window to reload. A later re-run of `deploy.js` is picked up the same way.

The deploy also sets `chat.defaultAgent` in the project's `.kiro/settings/cli.json`, so the pipeline agent is this project's default and no `--agent` flag is needed. That setting is workspace-scoped — every other project you open is untouched.

To confirm the install, run `/mcp` in a chat or `kiro-cli mcp list`. You should see `sdd-summary` with **44 tools**.

#### Cursor

Two manual steps.

**Reload:** **View → Command Palette**, then run **Developer: Reload Window**. Because you opened the project folder back in step 1, there is nothing to re-open — the workspace root is already correct. Reloading is only needed so Cursor picks up the newly written `.cursor/mcp.json`.

**Enable:** reloading does *not* enable the server. The config is in place, but Cursor treats "configured" and "active" as separate things, and there is no documented setting that can pre-enable a server. It has to be switched on by hand, once per project:

Open **Customize** in the sidebar → **MCPs** → toggle **`sdd-summary`** on.

It should then report **44 tools**. If the entry is absent entirely, the config was not found — see troubleshooting below.

### 5. Start the pipeline

**On Kiro**, open a terminal in the project directory and run:

```bash
kiro-cli chat
```

**On Cursor**, open a new chat in the editor.

Then say **"begin"**. The agent asks whether you already have a Genesys OAuth client, and only walks you through creating one if you don't. See [First Run](#verify) below.

On Kiro it must be `kiro-cli chat` **started in the project directory**. The deploy sets the pipeline agent as this project's default, but `chat.defaultAgent` is a *workspace* setting — it only applies when the CLI starts inside the project. Be explicit if you prefer: `kiro-cli chat --agent sdd-summary`.

> **A chat on any other agent has none of the tools, and that is by design.** The `sdd-summary` server is declared inside `.kiro/agents/sdd-summary.json`, so it loads for that agent only. Any other agent sees no `@sdd-summary/*` tools — a different CLI agent, an assistant opened on the same folder, or a **KiroCrew dashboard session**, which runs its own agent (`kiro_agent: "kirocrew"`) and therefore loads that agent's MCP servers rather than this one's.
>
> Note what is *not* the reason: a dashboard session bound to this project does run with the project as its working directory, so the project's agent config is perfectly discoverable. The tools are absent because a different agent is selected, not because the directory is out of reach.
>
> This follows from Kiro putting `allowedTools` only in an agent config: the tools and their pre-approvals have to travel together, which is what lets a full eval suite run without hundreds of prompts. The cost is that reach is per-agent by construction.

#### Driving it from the KiroCrew dashboard instead

If you would rather work in the dashboard's sessions UI than a terminal, the supported route is a **KiroCrew crew** whose `kiro_agent` is `sdd-summary`, used on a session bound to this project directory.

That works cleanly precisely because the working directory is already correct: the workspace agent is discovered, the relative bundle path resolves, the steering glob resolves, storage anchors to the project root, and all pre-approvals come along because they live in that agent config. Nothing needs an absolute path and nothing leaks into unrelated workspaces.

Crews are configured on the KiroCrew side, not by anything in this repository. Two things must both be true: the crew's `kiro_agent` is `sdd-summary`, and the session is opened on this project directory.

**Do not reach for the alternatives.** Adding the server to KiroCrew's own global agent would put 44 Genesys tools and ~490 lines of guidance into every unrelated chat. Copying the agent to `~/.kiro/agents/` globally is worse: the working directory would then be the KiroCrew workspace rather than this project, so the relative bundle path would not resolve and — more seriously — the storage anchor would walk up to `~/.kiro/` and write OAuth tokens and customer transcripts outside the project entirely.

### Resulting layout

On **Kiro**:

```
my-summary-project/                    ← Kiro workspace root
├── .kiro/
│   ├── agents/
│   │   ├── sdd-summary.json           ← server + 32 pre-approved tools + steering
│   │   └── sdd-summary-scorer.json    ← eval scoring subagent
│   ├── settings/cli.json              ← chat.defaultAgent → sdd-summary
│   ├── steering/
│   │   └── sdd-summary-pipeline.md    ← pipeline guidance (inclusion: always)
│   └── sdd-summary/
│       └── sdd-summary-mcp.mjs        ← vendored server bundle
├── .gitignore                         ← created or extended by deploy.js
├── .sdd-summary/                      ← created at first login (tokens)
├── .summaryconfig-lifecycle/          ← created on first fetch (transcripts, evals)
└── sdd-summary-mcp/                   ← this repo, gitignored
```

On **Cursor**:

```
my-summary-project/                    ← Cursor workspace root
├── .cursor/
│   ├── mcp.json                       ← server definition
│   ├── permissions.json               ← pre-approved tool list (mcpAllowlist)
│   ├── rules/                         ← pipeline guidance
│   ├── skills/                        ← pipeline skills (when present in the repo)
│   └── sdd-summary/
│       └── sdd-summary-mcp.mjs        ← vendored server bundle
├── .gitignore                         ← created or extended by deploy.js
├── .sdd-summary/                      ← created at first login (tokens)
├── .summaryconfig-lifecycle/          ← created on first fetch (transcripts, evals)
└── sdd-summary-mcp/                   ← this repo, gitignored
```

### Why Kiro needs two agent files

Kiro's tool pre-approval (`allowedTools`) exists **only** in an agent configuration — `.kiro/settings/mcp.json` has no such key. So pre-approving the tool list requires shipping an agent, not merely an MCP config. Without it, a full eval suite prompts on every one of its hundreds of `submit_eval_scores` calls.

The second file, `sdd-summary-scorer.json`, is not optional either. A Kiro subagent loads MCP servers from its *own* agent configuration, so scoring stages would have no `submit_eval_scores` tool at all unless a dedicated agent declares this server. That failure is silent — the stage improvises rather than erroring — which is why the deploy always writes both.

It also explains the `resources` entry in `sdd-summary.json`: custom Kiro agents do **not** inherit steering files automatically (only the built-in default agent does), so the agent must declare `file://.kiro/steering/**/*.md` explicitly or the pipeline guidance silently vanishes.

### The nested clone is gitignored deliberately

A folder you create this way is not a git repo yet, but most projects become one. The moment yours does, the clone sitting inside it would be committed as an *embedded repository* — dragging the full server source and the ~880 KB bundle into your history, and confusing git along the way. So `deploy.js` gets ahead of it: on detecting that it is running from inside its own target, it adds the clone's folder name to the project's `.gitignore`.

The comparison is made on resolved real paths, so a symlink above either location cannot hide the nesting.

Only `.kiro/` (or `.cursor/`) and `.gitignore` are left for you to commit.

### Why the bundle is vendored into the project

Copying the server in is what keeps the deployed configuration free of **absolute paths**, so the project survives being moved, renamed, or handed to a colleague, and does not depend on this repo staying where it is.

The two editors reach that same result differently, and the difference is worth knowing:

- **Cursor** expands `${workspaceFolder}`, so `.cursor/mcp.json` refers to the bundle through that placeholder.
- **Kiro** does *not* expand `${workspaceFolder}` — the placeholder would reach the server verbatim. Instead Kiro launches an MCP server with the **workspace root as its working directory**, so the agent config uses a plain workspace-relative path and it resolves correctly.

The same asymmetry decides where your data lands. On Cursor the deploy pins `SDDSUM_STORAGE_PATH` and `SDDSUM_LIFECYCLE_PATH` to `${workspaceFolder}` paths. On Kiro it sets **neither**: the server's own defaults already resolve to the project root, which it locates by walking up for a `.kiro/`, `.cursor/` or `.git/` marker. That anchoring matters — it means starting a chat from a subdirectory still writes to the one project root, rather than quietly creating a second `.summaryconfig-lifecycle/` further down and splitting your transcripts and eval runs across two trees.

Vendoring also avoids the failure that made the old `setup.js` approach fragile. That broke when the *server repo* sat inside a *different* workspace, so its config was silently ignored. Here the config lands at the root of the target project, which **is** the workspace root — correct by construction.

### Merging with existing configuration

If the target already has configuration of its own, the script merges into it rather than overwriting:

- **Cursor** — adds or replaces only the `sdd-summary` entry in `.cursor/mcp.json` and preserves every other MCP server. In `.cursor/permissions.json` it preserves unrelated allowlist entries and other keys such as `terminalAllowlist` and `autoRun`.
- **Kiro** — writes its own two agent files, and merges `chat.defaultAgent` into any existing `.kiro/settings/cli.json` while leaving your other settings intact. If a different default agent was already set, the deploy says so in its output rather than changing it silently.

In both cases it refuses to proceed if an existing file is not valid JSON, rather than clobbering it.

### Updating

```bash
cd sdd-summary-mcp
git pull
node deploy.js ..
```

The vendored copy is a snapshot, so `git pull` alone changes nothing the editor loads — the `deploy.js` re-run is what applies the update. On Cursor, reload the window afterwards; on Kiro the change is hot-reloaded, so there is nothing further to do.

After updating, run `regenerate_reports` for each summary config to bring historical runs onto the new report templates. Nothing is re-scored and no Genesys calls are made.

---

## Option B — User scope

Installs once and applies to every workspace you open. Not recommended — see [Choosing a scope](#choosing-a-scope) above.

### Kiro

Kiro has no plugin-marketplace equivalent, so a user-scope install is done by hand:

1. Copy both agent files from `kiro/agents/` to `~/.kiro/agents/`.
2. Copy the bundle (`mcp-server/bundle/sdd-summary-mcp.mjs`) somewhere stable, then edit each agent's `mcpServers.sdd-summary.args` to that **absolute** path. The workspace-relative path used at project scope will not resolve from an arbitrary workspace.
3. Build the steering file as the deploy would — rewrite the frontmatter to `inclusion: always` and substitute `kiro/eval-orchestration.md` into the `HOST-SPECIFIC:EVAL-ORCHESTRATION` region — and place it in `~/.kiro/steering/`.

Two costs to be aware of. Global steering loads in **every** workspace, so those ~490 lines are injected into unrelated work. And step 2 reintroduces an absolute path, so the install no longer survives moving the bundle.

Running `node deploy.js --kiro <some-project>` per project is almost always the better answer.

### Cursor

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

Every option registers the same three components from the same sources — only the location, the file format and the scope differ.

| Component | Source in repo | Effect |
|---|---|---|
| MCP server | `mcp.json` → the bundled server | Kiro: starts on demand. Cursor: registered on reload, then enabled manually |
| Pipeline guidance | `rules/sdd-summary-pipeline.mdc` | Injected into agent sessions |
| Pre-approved tools | `alwaysAllow` list in `mcp.json` | Translated to each host's own mechanism at deploy time |

Where each lands, at project scope:

| | Kiro | Cursor |
|---|---|---|
| Server path | `.kiro/sdd-summary/…` (workspace-relative) | `${workspaceFolder}/.cursor/sdd-summary/…` |
| Config location | `.kiro/agents/sdd-summary.json` | `.cursor/mcp.json` |
| Guidance location | `.kiro/steering/sdd-summary-pipeline.md` | `.cursor/rules/sdd-summary-pipeline.mdc` |
| Guidance frontmatter | `inclusion: always` | `alwaysApply: true` |
| Tool pre-approval | `allowedTools` in the agent config | `.cursor/permissions.json` → `mcpAllowlist` |
| Scoring subagent | `.kiro/agents/sdd-summary-scorer.json` | No separate config needed |
| Entry point | `chat.defaultAgent` in `.kiro/settings/cli.json` | The MCP toggle under Customize |

`mcp.json` at the repo root is the single source of truth for the server definition and the tool list. Each deploy target reads it and rewrites only what that host needs, so the two cannot drift apart — add a tool to `alwaysAllow` once and both hosts pick it up.

The pipeline guidance has one source too. `rules/sdd-summary-pipeline.mdc` is used verbatim by Cursor; the Kiro target rewrites its frontmatter and swaps the region between the `<!-- HOST-SPECIFIC:EVAL-ORCHESTRATION -->` markers for `kiro/eval-orchestration.md`, because that is the one passage where the two editors genuinely need different instructions. If those markers are ever removed, the Kiro deploy **fails loudly** rather than shipping Cursor's orchestration text to a Kiro user.

### Approval suppression

This matters more than it sounds. A full test suite issues hundreds of `submit_eval_scores` calls; without pre-approval the editor prompts on each one and the run stalls.

On **Kiro** the mechanism is `allowedTools` in the agent config, using the `@server/tool` form:

```json
{
  "allowedTools": ["@sdd-summary/submit_eval_scores", "..."]
}
```

Note this exists **only** in an agent configuration. `.kiro/settings/mcp.json` has no equivalent key, which is why the Kiro deploy ships an agent rather than just an MCP config.

On **Cursor** the mechanism is `.cursor/permissions.json`:

```json
{
  "mcpAllowlist": ["sdd-summary:submit_eval_scores", "..."]
}
```

Under both, two tools are deliberately **excluded** because they write to live Genesys and must always be confirmed explicitly:

- `update_summary_setting`
- `update_copilot_config`

On Kiro they are additionally removed outright from the scoring subagent via `disabledTools`, so a scoring stage cannot reach live Genesys even by mistake.

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

Storage is pinned to the **workspace you have open**, never the install location:

| Path | Contents |
|---|---|
| `{workspace}/.summaryconfig-lifecycle/` | Transcripts, requirements, test cases, eval runs, version history |
| `{workspace}/.sdd-summary/` | OAuth config and tokens |

Each host gets there by a different route. Cursor pins both paths explicitly using `${workspaceFolder}`. Kiro cannot — it does not expand that placeholder — so the deploy sets neither variable and the server resolves them itself, locating the project root by walking up for a `.kiro/`, `.cursor/` or `.git/` marker.

Either way user data stays outside the install location, so re-deploying or reinstalling never destroys work, and each project gets its own independent lifecycle data.

---

## Verify

**Kiro:** run `/mcp` in a chat, or `kiro-cli mcp list`. You should see `sdd-summary` with 44 tools. There is no enable step. `kiro-cli agent list` should also show `sdd-summary` and `sdd-summary-scorer` as workspace agents, with `sdd-summary` marked as the default.

**Cursor:** check **Customize → MCPs** lists `sdd-summary`, toggled **on**, with 44 tools.

Then open a new chat in the project and say **"begin"**.

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

**On Cursor, first: is it toggled on?** A freshly deployed server is listed but inactive until you enable it under **Customize → MCPs**. This is the most common cause and it looks exactly like a broken install. Kiro has no such toggle, so this step does not apply there.

Common to every option:

- Confirm `node --version` is 18+ and that `node` is on the PATH your editor sees.
- Run the bundle directly to check it is intact. It should print
  `SDD Summary MCP server running (stdio)` and wait; Ctrl+C to exit.

  ```bash
  # Kiro, project scope — run from the project root
  node .kiro/sdd-summary/sdd-summary-mcp.mjs

  # Cursor, project scope — run from the project root
  node .cursor/sdd-summary/sdd-summary-mcp.mjs

  # Cursor, user scope
  node ~/.cursor/plugins/local/sdd-summary/mcp-server/bundle/sdd-summary-mcp.mjs
  ```

Project scope, either editor:

- Confirm the config directory sits at the **top level of the Explorer**, beside
  `sdd-summary-mcp/`. If it is nested inside `sdd-summary-mcp/` instead, the deploy ran
  with the wrong target — see the next point.
- If you ran `node deploy.js` from *inside* the clone without `..`, it deployed into the
  clone rather than the project. Delete the stray `sdd-summary-mcp/.kiro/` or
  `sdd-summary-mcp/.cursor/`, then re-run from the project root:
  `node sdd-summary-mcp/deploy.js`.
- Confirm the workspace root is the project folder, not the `sdd-summary-mcp/` clone.
  Following the steps above makes this correct by default, but it can drift if you later
  reopen the clone directly from a recent-projects list.
- Confirm the written JSON is valid.

Kiro specifically:

- `kiro-cli agent list` only discovers workspace agents when run from a directory containing
  `.kiro/`. If the agents are missing, you are probably not in the project root.
- If tools work but every call prompts for approval, `allowedTools` is not being read — check
  the agent file is valid JSON and that you are on the `sdd-summary` agent rather than the
  built-in default. Note `kiro-cli agent validate` is permissive: it returns success even for
  an unrecognised field, so it will not catch a typo in `allowedTools`. Confirm with a real
  tool call instead.
- If eval scoring stages report they cannot record scores, or the crew tool answers
  *"Agents not available for crew stages"*, `sdd-summary-scorer.json` is missing — re-run the
  deploy.
- If the agent seems unaware of the pipeline, check `.kiro/steering/sdd-summary-pipeline.md`
  exists and that the agent's `resources` still lists `file://.kiro/steering/**/*.md`. Custom
  agents do not load steering implicitly.

Cursor, user scope specifically:

- Confirm the plugin is listed and enabled under **Customize → Plugins**.
- If the server is listed but fails to start, the `${CURSOR_PLUGIN_ROOT}` placeholder may not
  resolve on your Cursor version — official docs also use `${PLUGIN_ROOT}` for this. Try
  swapping it in `mcp.json`. Project scope avoids this entirely.

---

## Eval runs

Scoring is fanned out one subagent per batch. The mechanism differs by editor:

- **Kiro** — the `use_subagent` tool, one stage per batch, each with `role: "sdd-summary-scorer"` and `model: "claude-haiku-4.5"`. The role is what grants the stage its `submit_eval_scores` tool.
- **Cursor** — the Task tool with the `composer-2.5-fast` model.

See [`eval-guide.md`](./eval-guide.md) for the full flow and each host's failure modes.

---

## Environment Variable Reference

Credentials normally come from `login()`, which stores them under `.sdd-summary/`. The variables below are available for overrides.

| Variable | Required | Description |
|---|---|---|
| `SDDSUM_HOST` | Set by the deploy | `cursor` or `kiro`. Selects the host-specific guidance the server emits — chiefly how the agent should spawn parallel scoring subagents. Unset gives host-neutral wording. |
| `SDDSUM_STORAGE_PATH` | Set by the deploy on Cursor only | Path for `.sdd-summary/` (OAuth config and tokens). Left unset on Kiro. Defaults to `.sdd-summary/` at the project root. |
| `SDDSUM_LIFECYCLE_PATH` | Set by the deploy on Cursor only | Path for `.summaryconfig-lifecycle/`. Left unset on Kiro. Defaults to the project root. |
| `GENESYS_CLIENT_ID` | **Avoid** | Shadows the stored config and causes logins against the wrong org. Let `login()` manage this instead. |
| `GENESYS_REGION` | **Avoid** | Extracted from the Authorization URL automatically. |
| `GENESYS_CLIENT_SECRET` | No | Only for the vestigial machine-to-machine fallback. Not used by the standard PKCE user login. |

The project root is found by walking up from the server's working directory looking for a `.kiro/`, `.cursor/` or `.git/` marker. That is what makes the Kiro defaults land correctly even when a chat is started from a subdirectory.

---

## Security Checklist

Before committing or sharing this repo:

- [ ] `.sdd-summary/` is gitignored (contains OAuth tokens)
- [ ] `.summaryconfig-lifecycle/` is gitignored (contains customer transcripts with PII)
- [ ] `.cursor/mcp.json` is gitignored
- [ ] `.env` is gitignored
- [ ] No credentials hardcoded in any committed file

All of the above are already covered by the root `.gitignore`. Note that `mcp-server/bundle/` **is** committed by design — it contains only compiled server code, no credentials.

The deployed configuration files themselves are safe to commit under either host: they hold no credentials, and neither contains an absolute path, so a colleague can clone the project and use it as-is.
