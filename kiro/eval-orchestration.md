- Spawn **one subagent per batch** with the `use_subagent` tool — one stage per batch, each with
  `role: "sdd-summary-scorer"` and `model: "claude-haiku-4.5"`.
- **The role is load-bearing, and getting it wrong fails silently.** A Kiro subagent loads MCP
  servers from its OWN agent config, so only the `sdd-summary-scorer` agent has `submit_eval_scores`.
  A stage given any other role cannot record scores at all and will not report that as an error — it
  will improvise or claim success having written nothing. If the crew tool refuses the role
  ("Agents not available for crew stages"), the deploy did not install the scorer agent: stop and
  say so. Do **not** substitute another role, and do **not** fall back to scoring in this session —
  a single-session scoring pass over a full suite is what the batching exists to avoid.
- **Every stage must call the `summary` tool before it ends.** A stage that finishes with plain text
  delivers nothing back to you, so its batch looks unscored even though its tool calls succeeded.
- **Kiro's crew is fail-fast.** If one stage errors, its still-running siblings are cancelled — so a
  single bad batch can leave the run started with only some batches submitted. Never call
  `finalize_eval_run` on the assumption everything landed. Call
  `get_pipeline_state(summary_config_name=...)` to see which run is open and what was recorded,
  re-run only the missing batches, then finalize once.
- Subagents cannot spawn further subagents, so all batch stages must be declared in the one
  `use_subagent` call rather than nested.
