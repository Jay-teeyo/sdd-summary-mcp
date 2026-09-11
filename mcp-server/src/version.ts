/**
 * Single source of truth for the server version.
 *
 * Reports stamp this into their footer, so a user looking at a generated dashboard can
 * tell which version of the plugin produced it — which matters once templates change and
 * old reports are re-rendered. Keep it in step with package.json.
 */
export const SERVER_VERSION = "2.0.0";
