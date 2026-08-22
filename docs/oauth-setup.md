# Genesys Cloud OAuth Client Setup

This guide walks through configuring a Genesys Cloud OAuth client for use with the SDD Summary MCP server.

---

## Overview

The MCP server supports two authentication modes:

| Mode | Grant Type | Use Case |
|---|---|---|
| **User login** (recommended) | Authorization Code + PKCE | Required for preview summary generation (delivers results via user-scoped WebSocket notifications) |
| **Client credentials** | Client Credentials | Machine-to-machine calls; does **not** support preview summaries |

For most workflows — especially `generate_preview_summary` and `run_test_suite` — you need the **user login** flow. Set up your OAuth client to support both so you have fallback access.

---

## Step 1 — Create the OAuth Client in Genesys Admin

1. Log in to your Genesys Cloud org.
2. Navigate to **Admin → Integrations → OAuth**.
3. Click **+ Add Client**.
4. Fill in the details:

| Field | Value |
|---|---|
| **App Name** | `SDD Summary MCP` (or any descriptive name) |
| **Description** | Optional — e.g. "Local MCP server for summary configuration testing" |
| **Token Duration** | Default (86400 seconds / 24 hours) is fine |
| **Grant Types** | ✅ **Code Authorization** (required for user login + PKCE) <br> ✅ **Client Credentials** (optional, for machine-to-machine fallback) |

5. Click **Save** — you will be shown the **Client ID** and optionally a **Client Secret**. Copy both immediately; the secret is not shown again.

---

## Step 2 — Configure the Redirect URI

The user login flow starts a temporary local HTTP server on port `8787` to receive the OAuth callback.

1. On the OAuth client's **Redirect URIs** tab, add:
   ```
   http://localhost:8787/callback
   ```
2. Click **Save**.

> **Note:** The port `8787` is hardcoded in the MCP server. If this port conflicts with another service on your machine, it can be changed in `mcp-server/src/genesys/auth.ts` (`REDIRECT_PORT`).

---

## Step 3 — Configure OAuth Scopes

Under the **Scope** tab of the OAuth client, add **all of the following scopes**. Each one maps to an API product used by the MCP server.

### Required Scopes

| Scope | API Product | Used by |
|---|---|---|
| `ai-studio` | AI Studio API | `list_summary_settings`, `get_summary_setting`, `create_summary_setting`, `update_summary_setting`, `generate_preview_summary` — all summary configuration and preview endpoints require the `ai-studio` scope (the Conversations Summaries API sits under the AI Studio product in Genesys) |
| `analytics` | Analytics API | `search_conversations` — queries conversation analytics by date/queue/wrap-up code; `fetch_transcript` — resolves customer communication ID from conversation details |
| `conversations` | Conversations API | `list_summary_settings`, `get_summary_setting`, `create_summary_setting`, `update_summary_setting`, `generate_preview_summary` — summary configuration endpoints live under `/api/v2/conversations/summaries/...` |
| `notifications` | Notifications API | `generate_preview_summary` — the preview API delivers results asynchronously via a user-scoped WebSocket notification channel; requires creating a channel and subscribing to the topic `v2.users.{userId}.conversations.summaries.settings.preview` |
| `speechandtextanalytics` | Speech & Text Analytics API | `fetch_transcript` — fetches pre-signed S3 transcript URLs; `get_existing_summaries` — retrieves production summaries for completed conversations |
| `users` | Users API | `generate_preview_summary` — resolves the current user's ID (`GET /api/v2/users/me`) to construct the correct WebSocket notification topic |
| `assistants` | Assistants / Agent Copilot API | `list_assistants`, `get_copilot_config`, `update_copilot_config` — manage Agent Copilot configurations that link to summary settings |
| `routing` | Routing API | `build_interaction_filter` — resolves queue names after fetching queue IDs from `GET /api/v2/assistants/{assistantId}/queues`; the routing API is queried to look up the display name of each queue |

> **Tip:** Add all scopes even if you are only using a subset of tools today. New tools you use in future sessions will require them, and re-configuring the OAuth client each time is disruptive.

---

## Step 4 — Find Your Authorization URL

Locate the **Authorization URL** for your OAuth client — this is the only thing you need to configure the MCP server. The `client_id`, region, and login domain are all extracted from it automatically.

1. In Genesys Admin, go to **IT and Integrations → OAuth**.
2. Open the OAuth client you just created.
3. At the **bottom** of the page, find the field labelled **"Authorization URL"**. It looks like:
   ```
   https://login.{your-region}/oauth/authorize?client_id=abc123-...&response_type=...
   ```
4. Copy the **entire URL** — client ID and all. Do not truncate it.

Two URL formats are accepted:

| Format | Example |
|--------|---------|
| OAuth authorize endpoint | `https://login.{your-region}/oauth/authorize?client_id={client_id}` |
| Admin deep-link | `https://apps.{your-region}/directory/#/admin/access-management/authorized-apps/{client_id}` |

> **Why the full URL matters:** The `client_id` is embedded in the URL. Pasting the full URL means there is nothing else to configure — no separate client ID entry, no region selection.

---

## Step 5 — Log in as a User

There is no separate `configure_credentials` step. Call `login` directly with the Authorization URL:

```
login(
  authorization_url="https://login.{your-region}/oauth/authorize?client_id=abc123-..."
)
```

The `login` tool will:
1. Extract the `client_id`, login base URL, and API region from the URL.
2. Save the configuration to `.sdd-summary/config.json` for future sessions.
3. Open the Genesys Cloud login page in your browser. If the browser does not open automatically, the tool response includes the full URL to open manually.
4. Start a temporary local server on `http://localhost:8787/callback` to receive the OAuth callback.

When you see **"Logged in to Genesys Cloud ✓"** in the browser, return to the assistant and call:

```
complete_login()
```

This exchanges the auth code for a user token using PKCE and verifies all required OAuth scopes. A **7/7** result confirms everything is configured correctly.

### Subsequent logins

After the first login, the Authorization URL is stored. Future logins require no arguments:

```
login()
```

### Switching orgs

Call `login(authorization_url="...")` with the new org's URL. Config is updated automatically.

### Verifying scopes

```
smoke_test_auth()
```

Run this any time you want to confirm all 7 scopes are active — especially after adding a new scope to the OAuth client.

**Common regions (for reference only — extracted automatically from the URL):**

| Region | Domain |
|--------|--------|
| Australia | `mypurecloud.com.au` |
| US East | `mypurecloud.com` |
| EU (Ireland) | `mypurecloud.ie` |
| EU (Frankfurt) | `mypurecloud.de` |
| UK | `mypurecloud.co.uk` |
| Japan | `mypurecloud.jp` |
| Canada | `cac1.pure.cloud` |
| APAC (Seoul) | `apne2.pure.cloud` |

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Login fails immediately / wrong domain | Login URL is not `https://login.{region}` for your environment | Find the Authorization URL from Genesys Admin (Step 4) and re-run `configure_credentials` with `login_url` set |
| `401 Unauthorized` on any call | Token expired or not configured | Run `login` again |
| `403 Forbidden` on a specific API | Scope missing from the OAuth client | Add the missing scope in Genesys Admin → OAuth → your client |
| `smoke_test_auth` reports notifications scope failing | User token not available or `notifications` scope missing | Run `login`, then check the scope list in Genesys Admin |
| Preview summary times out | WebSocket notification not received | Usually a scope issue on `notifications` or `conversations`; run `smoke_test_auth` |
| Browser does not open automatically | Sandbox or headless environment | The `login` tool response includes the full Authorization URL — copy and open it manually in your browser |
| Port `8787` already in use | Another process is using the port | Kill the conflicting process: `lsof -ti:8787 \| xargs kill -9` |

### Reading the login failure output

When `login` fails the tool response now includes:
- The **login base URL** that was actually used (check this first)
- Step-by-step instructions for finding the correct Authorization URL from Genesys Admin
- The full Authorization URL to copy and open manually if the browser didn't open
