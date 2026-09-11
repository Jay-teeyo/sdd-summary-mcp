/**
 * End-to-end check of the report pipeline against a synthetic lifecycle workspace.
 *
 * Builds a throwaway .summaryconfig-lifecycle tree with two finalized runs, real test-case
 * definitions, transcripts and a requirements.md, then drives the actual MCP handlers —
 * generate_eval_run_dashboard, generate_improvements_dashboard, regenerate_reports — and
 * asserts the rendered HTML contains what the run data says it should.
 *
 * Run with `npm run verify:reports`. Output lands in .reports-preview/verify/ for eyeballing.
 */

import esbuild from "esbuild";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { templateTextPlugin } from "../build-shared.mjs";

const root = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "sdd-report-verify-"));
const CONFIG = "VerifyConfig";
const TEST_SET = "Verify-Suite";

process.env.SDDSUM_LIFECYCLE_PATH = workspace;
process.env.SDDSUM_STORAGE_PATH = path.join(workspace, ".sdd-summary");

// ─── Synthetic workspace ──────────────────────────────────────────────────────

const configDir = path.join(workspace, CONFIG);
const write = (rel, data) => {
  const p = path.join(configDir, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, typeof data === "string" ? data : JSON.stringify(data, null, 2), "utf-8");
};

const DIMENSIONS = [
  {
    name: "All four sections present",
    description: "The summary carries the four prescribed headings.",
    weight: 4,
    passCriteria: "Score 1.0: all four headings present in order.",
    failCriteria: "Score 0: a heading is missing or out of order.",
    passThreshold: 1.0,
    requirementIds: ["BR-VerifyConfig-001"],
    applicabilityCondition: "always",
  },
  {
    name: "No PII in summary",
    description: "No personally identifiable information appears.",
    weight: 5,
    passCriteria: "Score 1.0: no names, references or card details.",
    failCriteria: "Score 0: any identifier appears.",
    passThreshold: 1.0,
    requirementIds: ["BR-VerifyConfig-002", "BR-VerifyConfig-999"],
    applicabilityCondition: "always",
  },
  {
    name: "Third party identified",
    description: "A third party's relationship to the customer is stated.",
    weight: 2,
    passCriteria: "Score 1.0: relationship stated.",
    failCriteria: "Score 0: third party present but unexplained.",
    passThreshold: 0.8,
    requirementIds: ["BR-VerifyConfig-003"],
    applicabilityCondition: "Only when a third party participated.",
  },
];

write("test-cases/TC-Verify.json", {
  name: "TC-Verify",
  description: "Structure, privacy and third-party handling.",
  dimensions: DIMENSIONS,
  createdAt: "2026-09-01T00:00:00.000Z",
});

write(
  "requirements/final/requirements.md",
  [
    "# VerifyConfig — Business Requirements",
    "",
    "*Source: summary prompt · Setting ID: `abc` · Last modified: 2026-09-01 · settingType: `Prompt`*",
    "",
    "## Requirements",
    "",
    "| ID | Category | Requirement | Source |",
    "|----|----------|-------------|--------|",
    "| BR-VerifyConfig-001 | Structure | The summary must contain the four prescribed sections in order. | summary prompt |",
    "| BR-VerifyConfig-002 | Privacy | No personally identifiable information may appear in the summary. | summary prompt |",
    "| BR-VerifyConfig-003 | Content Accuracy | A third party's relationship to the customer must be stated. | summary prompt |",
    "| BR-VerifyConfig-004 | Style | Summaries must not exceed 200 words. | qa-feedback.eml |",
    "",
  ].join("\n"),
);

const TRANSCRIPTS = [
  { id: "tx-alpha", label: "Order status enquiry — 4m12s", text: "Consultant: Thanks for calling.\nCustomer: I lodged a claim." },
  { id: "tx-beta", label: "Complaint about delay — 11m21s", text: "Consultant: How can I help?\nCustomer: Nobody called back." },
  { id: "tx-gamma", label: "Third party on call — 7m48s", text: "Consultant: Who am I speaking with?\nCustomer: I'm calling for my father." },
];
for (const t of TRANSCRIPTS) {
  write(`transcripts/static/${t.id}.json`, {
    id: t.id,
    label: t.label,
    plainText: t.text,
    createdAt: "2026-09-01T00:00:00.000Z",
    transcriptType: "static",
  });
}

write("version-history/summary-configuration-1.json", {
  version: 1,
  status: "deployed",
  setting: { name: CONFIG, prompt: "Summarise the interaction in four sections.\nKeep it brief." },
  notes: "Baseline prompt as deployed.",
  snapshotAt: "2026-09-02T00:00:00.000Z",
});
write("version-history/summary-configuration-2.json", {
  version: 2,
  status: "candidate",
  setting: {
    name: CONFIG,
    prompt: "Summarise the interaction in four sections.\nNever include identifiers.\nState a third party's relationship.",
  },
  notes: "Added the PII prohibition and third-party rule.",
  snapshotAt: "2026-09-08T00:00:00.000Z",
});

/** One finalized run: _pending.json plus the merged per-test-case results file. */
function writeRun(runNumber, { version, prompt, scores, skipped = [], passRate }) {
  const dir = `eval-runs/${TEST_SET}/${String(runNumber).padStart(4, "0")}`;
  const results = TRANSCRIPTS.map((t, i) => {
    const dimensionScores = DIMENSIONS.map((d) => {
      const value = scores[d.name][i];
      if (value === null) {
        return { dimension: d.name, score: null, na: true, passed: true, reasoning: "No third party participated." };
      }
      return {
        dimension: d.name,
        score: value,
        na: false,
        passed: value >= (d.passThreshold ?? 0.8),
        reasoning: value >= (d.passThreshold ?? 0.8)
          ? `${d.name} satisfied for ${t.label}.`
          : `${d.name} failed for ${t.label} — the summary breaches the rule.`,
      };
    });
    const scored = dimensionScores.filter((d) => !d.na);
    return {
      testCaseName: "TC-Verify",
      transcriptId: t.id,
      transcriptLabel: t.label,
      summary: `Reason for Contact\n- ${t.label}\n\nResolution\n- Recorded.`,
      dimensionScores,
      overallPassed: scored.every((d) => d.passed),
      overallScore: scored.reduce((s, d) => s + d.score, 0) / scored.length,
    };
  });

  write(`${dir}/_pending.json`, {
    runNumber,
    testSetName: TEST_SET,
    summaryConfigName: CONFIG,
    useExistingSummaries: false,
    transcriptIds: TRANSCRIPTS.map((t) => t.id),
    skippedTranscripts: skipped.length ? skipped : undefined,
    testCaseNames: ["TC-Verify"],
    startedAt: "2026-09-08T01:00:00.000Z",
    finalizedAt: `2026-09-0${runNumber + 7}T02:00:00.000Z`,
    aggregatePassRate: passRate,
    testCasePassRates: { "TC-Verify": passRate },
    promptText: prompt,
    promptVersionNumber: version,
    promptVersionStatus: version === 1 ? "deployed" : "candidate",
    previewStructure: "inherited from the live Genesys setting (format: BulletPoints, insights: 3, participant labels: yes)",
  });

  write(`${dir}/TC-Verify.json`, {
    testCaseName: "TC-Verify",
    totalTranscripts: results.length,
    passRate,
    averageScore: results.reduce((s, r) => s + r.overallScore, 0) / results.length,
    results,
  });
}

writeRun(1, {
  version: 1,
  prompt: "Summarise the interaction in four sections.\nKeep it brief.",
  passRate: 1 / 3,
  scores: {
    "All four sections present": [1, 1, 1],
    "No PII in summary": [0, 0, 1],
    "Third party identified": [null, null, 1],
  },
});

writeRun(2, {
  version: 2,
  prompt: "Summarise the interaction in four sections.\nNever include identifiers.\nState a third party's relationship.",
  passRate: 1 / 3,
  skipped: [
    {
      transcriptId: "tx-delta",
      transcriptLabel: "Wrong number — 0m21s",
      summary: "The interaction is too short to create a summary.",
      reason: "Genesys returned the too-short-to-summarise placeholder instead of a summary",
    },
  ],
  scores: {
    // PII improved; the third-party dimension regressed, which the findings must catch.
    "All four sections present": [1, 1, 1],
    "No PII in summary": [1, 0, 1],
    "Third party identified": [null, null, 0],
  },
});

// ─── Drive the real handlers ──────────────────────────────────────────────────

const bundle = path.join(workspace, "handlers.mjs");
await esbuild.build({
  stdin: {
    contents:
      `export * as handlers from "${path.join(root, "src/tools/handlers.ts").replace(/\\/g, "/")}";\n` +
      `export * as findings from "${path.join(root, "src/reports/findings.ts").replace(/\\/g, "/")}";`,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node18",
  outfile: bundle,
  plugins: [templateTextPlugin],
  logLevel: "error",
});

const { handlers, findings: findingsModule } = await import(`file://${bundle}`);

const failures = [];
const check = (label, condition, detail = "") => {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

const textOf = (res) => res.content.map((c) => c.text).join("\n");

/** Pulls the embedded model back out of a rendered page — the reverse of embedJson. */
function modelFrom(htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf-8");
  const open = 'id="report-model">';
  const start = html.indexOf(open) + open.length;
  const json = html
    .slice(start, html.indexOf("</script>", start))
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">");
  return JSON.parse(json);
}

console.log("\nRun report (run 2)");
const runOut = textOf(
  await handlers.generate_eval_run_dashboard({
    summary_config_name: CONFIG,
    test_set_name: TEST_SET,
    run_number: 2,
  }),
);
const runHtmlPath = path.join(configDir, `eval-runs/${TEST_SET}/0002/dashboard.html`);
const runModel = modelFrom(runHtmlPath);

check("report written to the run directory", fs.existsSync(runHtmlPath));
check("requirement text read from requirements.md",
  runModel.requirements.find((r) => r.id === "BR-VerifyConfig-001")?.text.startsWith("The summary must contain"));
check("requirement categories preserved",
  runModel.requirements.find((r) => r.id === "BR-VerifyConfig-002")?.category === "Privacy");
check("untested requirement detected",
  runModel.coverage.uncoveredRequirementIds.join() === "BR-VerifyConfig-004",
  JSON.stringify(runModel.coverage.uncoveredRequirementIds));
check("unknown requirement ID detected",
  runModel.coverage.unknownRequirementIds.some((u) => u.id === "BR-VerifyConfig-999"));
check("N/A dimension excluded from the denominator",
  runModel.testCases[0].dimensions.find((d) => d.name === "Third party identified").stats.na === 2);
check("weighted score differs from the unweighted mean",
  runModel.headline.stats.weightedScore !== runModel.headline.stats.averageScore,
  `${runModel.headline.stats.weightedScore} vs ${runModel.headline.stats.averageScore}`);
check("skipped transcript carried into the report", runModel.run.skipped.length === 1);
check("transcript source text embedded",
  runModel.testCases[0].transcripts.every((t) => (t.transcriptText ?? "").includes("Consultant:")));
check("scorer reasoning used as finding evidence",
  runModel.findings.some((f) => f.evidence.some((e) => e.includes("breaches the rule"))));
check("regression against run 1 detected",
  runModel.findings.some((f) => f.kind === "regression" && f.links.dimension === "Third party identified"),
  JSON.stringify(runModel.findings.map((f) => f.kind)));
check("comparison points at the previous run", runModel.comparison?.previousRunNumber === 1);
check("preview structure recorded", (runModel.run.previewStructure ?? "").startsWith("inherited"));
check("tool output reports coverage", runOut.includes("Requirement coverage: 3/4"), runOut.split("\n").slice(0, 8).join(" | "));

console.log("\nImprovements report");
const impOut = textOf(
  await handlers.generate_improvements_dashboard({ summary_config_name: CONFIG, test_set_name: TEST_SET }),
);
const impHtmlPath = path.join(configDir, `eval-runs/${TEST_SET}/improvements.html`);
const impModel = modelFrom(impHtmlPath);

check("both runs in the series", impModel.runs.length === 2);
check("run dashboards linked relatively", impModel.runs[1].dashboardHref === "0002/dashboard.html");
check("prompt diff computed between versions",
  impModel.changelog[0].promptDiff.added === 2 && impModel.changelog[0].promptDiff.removed === 1,
  JSON.stringify(impModel.changelog[0].promptDiff));
check("version notes pulled from version history",
  impModel.changelog[0].notes === "Added the PII prohibition and third-party rule.");
check("first run marked as having no prior prompt",
  impModel.changelog[impModel.changelog.length - 1].promptDiff.isFirst);
check("requirement series covers tested requirements only",
  impModel.requirementSeries.map((r) => r.key).join() === "BR-VerifyConfig-001,BR-VerifyConfig-002,BR-VerifyConfig-003");
check("watchlist carries the latest run's unresolved items", impModel.watchlist.length > 0);
check("tool output lists the trend", impOut.includes("Run 1 (33%) → Run 2 (33%)"), impOut.split("\n")[2]);

// The rollup is the closing report, so it is checked in both states it can be asked for:
// before anything from the cycle is live, and after a candidate has been deployed.
console.log("\nRollup report");
const rollupHtmlPath = path.join(configDir, `eval-runs/${TEST_SET}/rollup.html`);

const preDeployState = JSON.parse(
  textOf(await handlers.get_pipeline_state({ summary_config_name: CONFIG })),
);
check("state reports a tested candidate awaiting a deployment decision",
  preDeployState.stage === "candidate-tested-awaiting-deployment-decision", preDeployState.stage);
check("tested-but-undeployed candidate identified",
  preDeployState.versions.candidates_tested_not_deployed.join() === "2");

await handlers.generate_rollup_report({ summary_config_name: CONFIG, test_set_name: TEST_SET });
check("rollup reports nothing implemented while the baseline is still live",
  modelFrom(rollupHtmlPath).implemented === null);

// Deploying v2 leaves two snapshots: a rollback copy of the outgoing prompt, and a record
// of the incoming one. Neither names the candidate, which is what the prompt match is for.
write("version-history/summary-configuration-3.json", {
  version: 3,
  status: "deployed",
  setting: { name: CONFIG, prompt: "Summarise the interaction in four sections.\nKeep it brief." },
  notes: "Rollback point captured before deploying candidate 2.",
  snapshotAt: "2026-09-09T00:00:00.000Z",
});
write("version-history/summary-configuration-4.json", {
  version: 4,
  status: "deployed",
  setting: {
    name: CONFIG,
    prompt: "Summarise the interaction in four sections.\nNever include identifiers.\nState a third party's relationship.",
  },
  notes: "Deployed candidate 2 — the PII prohibition held across every interaction.",
  snapshotAt: "2026-09-09T01:00:00.000Z",
});

const rollupOut = textOf(
  await handlers.generate_rollup_report({
    summary_config_name: CONFIG,
    test_set_name: TEST_SET,
    executive_summary: "The baseline leaked identifiers.\n\nCandidate 2 closed that.",
    themes: [
      {
        title: "PII in summaries",
        issue: "Identifiers were written into the summary body.",
        approach: "Added an explicit prohibition with examples.",
        benefit: "Two of three interactions clean, one still failing.",
        metric: "33% → 67%",
      },
    ],
    methodology_notes: ["One interaction was too short for Genesys to summarise and was skipped."],
    next_steps: ["Re-test the third-party rule, which regressed."],
  }),
);
const rollup = modelFrom(rollupHtmlPath);

check("implemented candidate matched by prompt text, not snapshot order",
  rollup.implemented.versionNumber === 2 && rollup.implemented.matchedBy === "prompt-identical",
  JSON.stringify(rollup.implemented));
check("deployment recorded against the snapshot that holds it",
  rollup.implemented.deployedSnapshotVersion === 4);
check("rollback snapshot identified", rollup.implemented.rollbackVersion === 3);
check("run that measured the implemented prompt identified", rollup.implemented.runNumber === 2);
check("implemented run flagged in the series",
  rollup.runs.filter((r) => r.implemented).map((r) => r.runNumber).join() === "2");
const rollupHtml = fs.readFileSync(rollupHtmlPath, "utf-8");
check("page carries what it needs to outline the implemented column",
  rollupHtml.includes("table.data td.implemented") && rollupHtml.includes('" implemented"'));
check("baseline to implemented computed per test case",
  rollup.baselineToImplemented.length === 1 && rollup.baselineToImplemented[0].from === 1 / 3);
check("narrative round-trips through rollup.json",
  rollup.narrative.themes.length === 1 && rollup.narrative.themes[0].metric === "33% → 67%");
check("tool output names the implemented version", rollupOut.includes("Implemented: v2"));

// Re-rendering without narrative arguments must not wipe an authored narrative.
await handlers.generate_rollup_report({ summary_config_name: CONFIG, test_set_name: TEST_SET });
check("re-rendering preserves the saved narrative",
  modelFrom(rollupHtmlPath).narrative.themes.length === 1);

console.log("\nRegeneration");
fs.rmSync(runHtmlPath);
fs.rmSync(impHtmlPath);
fs.rmSync(rollupHtmlPath);
const regenOut = textOf(await handlers.regenerate_reports({ summary_config_name: CONFIG }));
check("every run report rebuilt", fs.existsSync(runHtmlPath) && fs.existsSync(impHtmlPath));
check("rollup rebuilt from the saved narrative", fs.existsSync(rollupHtmlPath) &&
  modelFrom(rollupHtmlPath).narrative.themes.length === 1);
check("regeneration reports both runs", regenOut.includes("Run reports: 2"), regenOut.split("\n")[4]);
check("no failures during regeneration", !regenOut.includes("Failures:"));

// Keep the rendered output for inspection.
const outDir = path.join(root, ".reports-preview", "verify");
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(runHtmlPath, path.join(outDir, "run-dashboard.html"));
fs.copyFileSync(rollupHtmlPath, path.join(outDir, "rollup.html"));
fs.copyFileSync(impHtmlPath, path.join(outDir, "improvements.html"));

// get_pipeline_state is what lets an agent reject an instruction that describes finished
// work, so the fields a staleness check reads are asserted here too.
console.log("\nPipeline state");
const state = JSON.parse(
  textOf(await handlers.get_pipeline_state({ summary_config_name: CONFIG })),
);
check("stage reflects a closed cycle once the candidate is live",
  state.stage === "deployed-cycle-complete", state.stage);
check("latest version reported", state.versions.latest.version === 4 && state.versions.latest.status === "deployed");
check("newest deployed version reported", state.versions.latest_deployed.version === 4);
check("no candidate left awaiting deployment",
  state.versions.candidates_tested_not_deployed.length === 0);
check("highest run number reported", state.runs.by_test_set[0].highest_run_number === 2);
check("pass rate history in run order",
  state.runs.by_test_set[0].pass_rate_history.map((r) => r.run).join() === "1,2");
check("no run left in progress", state.runs.in_progress.length === 0);
check("unknown config reports no workspace rather than throwing",
  JSON.parse(textOf(await handlers.get_pipeline_state({ summary_config_name: "NotAConfig" }))).stage === "no-workspace");

// A missing requirements.md must disable the pivot, not silently report full compliance.
console.log("\nDegraded input");
fs.rmSync(path.join(configDir, "requirements/final/requirements.md"));
await handlers.generate_eval_run_dashboard({
  summary_config_name: CONFIG,
  test_set_name: TEST_SET,
  run_number: 2,
});
const degradedModel = modelFrom(runHtmlPath);
check("missing requirements.md marks the pivot unavailable", degradedModel.coverage.requirementsUnavailable);
check("no false coverage gaps without requirements.md",
  degradedModel.coverage.uncoveredRequirementIds.length === 0 &&
    !degradedModel.findings.some((f) => f.kind === "coverage-gap"));

// Finding order is weight-first, which on its own buries a lightly weighted dimension that
// fails outright. Driven directly rather than through a run, so the ranks are unambiguous.
console.log("\nFinding order");
const rankTestCase = (dims) => [
  {
    name: "Ranking",
    dimensions: dims.map((d) => ({
      name: d.name,
      weight: d.weight,
      passThreshold: 1,
      requirementIds: [],
      stats: { evaluated: 10, passed: Math.round(d.pass * 10), failed: 10 - Math.round(d.pass * 10), na: 0, passRate: d.pass },
    })),
    transcripts: [],
  },
];
const orderOf = (dims) =>
  findingsModule
    .deriveRunFindings({
      testCases: rankTestCase(dims),
      requirements: [],
      coverage: { requirementsUnavailable: true, uncoveredRequirementIds: [], unknownRequirementIds: [] },
      comparison: null,
      regressions: [],
    })
    .filter((f) => f.kind === "dimension-failure");

const mixed = orderOf([
  { name: "HeavyMild", weight: 5, pass: 0.7 },
  { name: "LightBroken", weight: 2, pass: 0.05 },
]);
check("heavier weight ranks above a worse failure rate",
  mixed[0].title.startsWith("HeavyMild"), mixed.map((f) => f.title).join(" | "));

const sixth = orderOf([
  ...[0.7, 0.71, 0.72, 0.73, 0.74].map((pass, i) => ({ name: `Heavy${i}`, weight: 5, pass })),
  { name: "LightBroken", weight: 2, pass: 0.04 },
  { name: "LightMild", weight: 2, pass: 0.75 },
]);
check("five dimensions named before anything is collapsed",
  sixth.filter((f) => f.severity !== "low").length === 6, `${sixth.length} cards`);
check("a dimension failing outright is promoted past the weight order",
  sixth.some((f) => f.title.startsWith("LightBroken") && f.severity === "high"),
  sixth.map((f) => f.title).join(" | "));
check("a merely weak dimension stays collapsed",
  sixth.some((f) => f.severity === "low" && f.evidence.some((e) => e.startsWith("LightMild"))),
  sixth.map((f) => f.title).join(" | "));

const allBroken = orderOf(
  [5, 5, 5, 5, 5, 4, 3].map((weight, i) => ({ name: `Broken${i}`, weight, pass: 0 })),
);
check("nothing promoted when the whole run is already failing outright",
  allBroken.filter((f) => f.severity !== "low").length === 5, `${allBroken.length} cards`);

fs.rmSync(workspace, { recursive: true, force: true });

console.log(`\nRendered output: ${outDir}`);
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:\n${failures.map((f) => `  • ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("\nAll checks passed.");
