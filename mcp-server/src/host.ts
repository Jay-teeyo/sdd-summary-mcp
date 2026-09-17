/**
 * Host detection, so ONE committed bundle can serve both Cursor and Kiro.
 *
 * WHY THIS EXISTS
 * ---------------
 * Almost all of this server is host-agnostic — it speaks stdio MCP and nothing
 * else. Exactly one piece of its guidance is not: how the calling agent spawns
 * the parallel scoring subagents for an eval run. Cursor and Kiro expose
 * different mechanisms under different names, and naming the wrong one does not
 * fail loudly — the agent simply has no such tool, so the parallel eval mode
 * quietly stops working.
 *
 * Rather than shipping two bundles, the deploy script writes SDDSUM_HOST into
 * the generated MCP config and the guidance text is selected from it here.
 *
 * An unset or unrecognised value is NOT an error: it yields deliberately
 * host-neutral wording that tells the agent to use whatever parallel mechanism
 * it has. That keeps a hand-rolled or future-host install working, just with
 * less specific instructions.
 */

export type HostKind = "cursor" | "kiro" | "generic";

export function getHost(): HostKind {
  const raw = (process.env.SDDSUM_HOST ?? "").trim().toLowerCase();
  if (raw === "cursor") return "cursor";
  if (raw === "kiro") return "kiro";
  return "generic";
}

/**
 * The agent config name the Kiro deploy installs for scoring stages.
 * Kept in one place because the deploy script, the steering doc and this
 * guidance all have to agree on it — a mismatch means the crew tool refuses
 * the stage with "Agents not available for crew stages".
 */
export const KIRO_SCORER_AGENT = "sdd-summary-scorer";

/** The model Kiro scoring stages run on. Cheapest and fastest available tier. */
export const KIRO_SCORER_MODEL = "claude-haiku-4.5";

/**
 * How to refer to the host in text a HUMAN reads — currently the OAuth callback
 * page, which used to hardcode "return to Cursor" and so told half the users to
 * switch to an editor they are not running.
 *
 * Falls back to "your editor", which is correct everywhere and reads naturally.
 */
export function hostDisplayName(host: HostKind = getHost()): string {
  switch (host) {
    case "cursor":
      return "Cursor";
    case "kiro":
      return "Kiro";
    default:
      return "your editor";
  }
}

/**
 * One-line spawn instruction for SERVER_INSTRUCTIONS, which is kept to a tight
 * token budget because it is sent on every handshake.
 */
export function spawnInstructionBrief(host: HostKind = getHost()): string {
  switch (host) {
    case "cursor":
      return "Spawn one subagent per batch in parallel using the Task tool with model composer-2.5-fast.";
    case "kiro":
      return (
        `Spawn one subagent per batch in parallel with the use_subagent tool: one stage per batch, ` +
        `each with role "${KIRO_SCORER_AGENT}" and model ${KIRO_SCORER_MODEL}. That role is what ` +
        `grants a stage the submit_eval_scores tool — any other role lacks it. Every stage MUST call ` +
        `the summary tool before ending, or its work is discarded.`
      );
    default:
      return (
        "Spawn one subagent per batch in parallel using whatever parallel-agent mechanism this host " +
        "provides. Each subagent needs the submit_eval_scores tool from this server."
      );
  }
}

/**
 * The fuller block used by FULL_PIPELINE_GUIDE, where there is room to spell out
 * the host's failure modes. These are not hypothetical: on Kiro a fail-fast
 * cancellation is the most likely way a run ends up started but never finalized.
 */
export function spawnInstructionFull(host: HostKind = getHost()): string {
  switch (host) {
    case "cursor":
      return [
        "- Spawn **one subagent per batch** using model `composer-2.5-fast`",
      ].join("\n");

    case "kiro":
      return [
        "- Spawn **one subagent per batch** with the `use_subagent` tool — one stage per batch, each",
        `  with \`role: "${KIRO_SCORER_AGENT}"\` and \`model: "${KIRO_SCORER_MODEL}"\`.`,
        "- **The role is load-bearing.** A Kiro subagent loads MCP servers from its OWN agent config, so",
        `  only the \`${KIRO_SCORER_AGENT}\` agent has \`submit_eval_scores\`. A stage given any other role`,
        "  cannot record scores at all, and will not say so — it will improvise or report success having",
        "  written nothing. If the crew tool refuses the role outright (\"Agents not available for crew",
        "  stages\"), the deploy did not install the scorer agent: stop and report that, do not substitute",
        "  another role and do not score in the parent session.",
        "- **Every stage must call the `summary` tool before it ends.** A stage that finishes with plain",
        "  text delivers nothing back, so its batch looks unscored even though the tool calls succeeded.",
        "- **Kiro's crew is fail-fast.** If one stage errors, its still-running siblings are cancelled, so",
        "  a single bad batch can leave the run started with only some batches submitted. Do NOT call",
        "  `finalize_eval_run` on the assumption it all landed: call",
        "  `get_pipeline_state(summary_config_name=...)` to see which run is open, re-run only the missing",
        "  batches, and finalize once.",
      ].join("\n");

    default:
      return [
        "- Spawn **one subagent per batch** in parallel using this host's parallel-agent mechanism.",
        "- Each subagent must have this server's `submit_eval_scores` tool available to it. If the host",
        "  scopes tools per subagent, grant it there — scores cannot be recorded any other way.",
      ].join("\n");
  }
}
