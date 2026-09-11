/**
 * Builds report models from what is on disk.
 *
 * Nothing here reads from memory or from a live API: a report is rebuilt from
 * eval-runs/, test-cases/, transcripts/, version-history/ and requirements/final/ every
 * time. That is what allows a user to pull a newer version of this plugin and re-render
 * runs they finished months ago into the current views.
 *
 * Where the run data cannot answer something — no requirements.md, a test case that has
 * since been deleted, a run recorded before prompts were captured — the model says so
    10| * explicitly rather than defaulting to a value that reads as a real measurement.
 */

import * as storage from "../storage.js";
import { SERVER_VERSION } from "../version.js";
import { diffPrompts } from "./diff.js";
import { deriveRunFindings, findDimensionRegressions } from "./findings.js";
import {
  REPORT_SCHEMA_VERSION,
  computeStats,
  testSetSignature,
} from "./model.js";
import type {
  ChangelogEntry,
  CoverageReport,
  Delta,
  GeneratorInfo,
  ImprovementsReport,
  ReportDimension,
  ReportRequirement,
  ReportTestCase,
  ReportTranscript,
  RunComparison,
  RunReport,
  RunSeriesEntry,
  SeriesRow,
} from "./model.js";
import { loadRequirements } from "./requirements.js";
import type { EvalRunPendingMeta, RubricDimension, TestCaseEvalFile } from "../types.js";

const DEFAULT_PASS_THRESHOLD = 0.8;

function generator(): GeneratorInfo {
  return {
    serverVersion: SERVER_VERSION,
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * A test case definition can change or be deleted after a run was scored. The results
 * still name every dimension, so a placeholder keeps the run renderable — with weight 1 so
 * it neither dominates nor vanishes from the weighted score.
 */
function placeholderDimension(name: string): RubricDimension {
  return {
    name,
    description: "Definition unavailable — the test case has changed since this run was scored.",
    weight: 1,
    passCriteria: "",
    failCriteria: "",
    passThreshold: DEFAULT_PASS_THRESHOLD,
    requirementIds: [],
    applicabilityCondition: "always",
  };
}

interface BuildTestCaseOptions {
  /** Source conversations are large; the improvements report and comparisons don't need them. */
  includeTranscriptText: boolean;
}

function buildTestCases(
  configName: string,
  files: TestCaseEvalFile[],
  options: BuildTestCaseOptions,
): ReportTestCase[] {
  return files.map((file) => {
    const definition = storage.getTestCase(configName, file.testCaseName);
    const definedDimensions = definition?.dimensions ?? [];

    // Dimension order follows the definition, then anything scored but no longer defined.
    const scoredNames = [
      ...new Set(file.results.flatMap((r) => r.dimensionScores.map((d) => d.dimension))),
    ];
    const dimensionDefs: RubricDimension[] = [
      ...definedDimensions,
      ...scoredNames
        .filter((n) => !definedDimensions.some((d) => d.name === n))
        .map(placeholderDimension),
    ].filter((d) => scoredNames.includes(d.name));

    const weightOf = (name: string) =>
      dimensionDefs.find((d) => d.name === name)?.weight ?? 1;

    const transcripts: ReportTranscript[] = file.results.map((result) => {
      const scores = result.dimensionScores.map((s) => ({
        dimension: s.dimension,
        score: s.score,
        na: s.na,
        passed: s.passed,
        reasoning: s.reasoning,
      }));
      const stored = options.includeTranscriptText
        ? storage.getLifecycleTranscript(configName, result.transcriptId)
        : null;

      return {
        id: result.transcriptId,
        label: result.transcriptLabel,
        summary: result.summary,
        transcriptText: stored?.plainText ?? null,
        stats: computeStats(scores.map((s) => ({ ...s, weight: weightOf(s.dimension) }))),
        passed: result.overallPassed,
        scores,
      };
    });

    const dimensions: ReportDimension[] = dimensionDefs.map((d) => {
      const across = transcripts
        .map((t) => t.scores.find((s) => s.dimension === d.name))
        .filter((s): s is NonNullable<typeof s> => s != null);
      return {
        name: d.name,
        description: d.description,
        weight: d.weight,
        passThreshold: d.passThreshold ?? DEFAULT_PASS_THRESHOLD,
        applicabilityCondition: d.applicabilityCondition ?? "always",
        passCriteria: d.passCriteria,
        failCriteria: d.failCriteria,
        requirementIds: d.requirementIds ?? [],
        stats: computeStats(across.map((s) => ({ ...s, weight: d.weight }))),
      };
    });

    const allScores = transcripts.flatMap((t) =>
      t.scores.map((s) => ({ ...s, weight: weightOf(s.dimension) })),
    );

    return {
      name: file.testCaseName,
      description: definition?.description ?? "Test case definition no longer available.",
      dimensions,
      transcripts,
      passRate: transcripts.length > 0
        ? transcripts.filter((t) => t.passed).length / transcripts.length
        : 0,
      stats: computeStats(allScores),
    };
  });
}

function buildRequirementsPivot(
  configName: string,
  testCases: ReportTestCase[],
): { requirements: ReportRequirement[]; coverage: CoverageReport } {
  const parsed = loadRequirements(configName);

  const unknownRequirementIds: CoverageReport["unknownRequirementIds"] = [];
  const known = new Set(parsed.requirements.map((r) => r.id));

  // Which dimensions claim each requirement, and every score they produced.
  const coverage = new Map<
    string,
    { coveredBy: ReportRequirement["coveredBy"]; scores: Array<{ score: number | null; na: boolean; passed: boolean; weight: number }> }
  >();

  for (const tc of testCases) {
    for (const d of tc.dimensions) {
      for (const id of d.requirementIds) {
        if (!parsed.unavailable && !known.has(id)) {
          unknownRequirementIds.push({ id, testCase: tc.name, dimension: d.name });
          continue;
        }
        const entry = coverage.get(id) ?? { coveredBy: [], scores: [] };
        entry.coveredBy.push({ testCase: tc.name, dimension: d.name, weight: d.weight });
        for (const t of tc.transcripts) {
          const s = t.scores.find((x) => x.dimension === d.name);
          if (s) entry.scores.push({ ...s, weight: d.weight });
        }
        coverage.set(id, entry);
      }
    }
  }

  const requirements: ReportRequirement[] = parsed.requirements.map((r) => {
    const entry = coverage.get(r.id);
    return {
      id: r.id,
      category: r.category,
      text: r.text,
      source: r.source,
      coveredBy: entry?.coveredBy ?? [],
      stats: computeStats(entry?.scores ?? []),
    };
  });

  const covered = requirements.filter((r) => r.coveredBy.length > 0);

  return {
    requirements,
    coverage: {
      requirementsTotal: requirements.length,
      requirementsCovered: covered.length,
      uncoveredRequirementIds: requirements
        .filter((r) => r.coveredBy.length === 0)
        .map((r) => r.id),
      unknownRequirementIds,
      requirementsUnavailable: parsed.unavailable,
    },
  };
}

function modeOf(meta: EvalRunPendingMeta): "existing" | "prompt_test" {
  return meta.useExistingSummaries ? "existing" : "prompt_test";
}

function signatureOf(meta: EvalRunPendingMeta): string {
  return testSetSignature(meta.testCaseNames, meta.transcriptIds);
}

/** The newest finalized run before `runNumber`, or null when this is the first. */
function previousFinalizedRun(
  configName: string,
  testSetName: string,
  runNumber: number,
): EvalRunPendingMeta | null {
  const earlier = storage
    .readAllFinalizedRunMetas(configName, testSetName)
    .filter((m) => m.runNumber < runNumber)
    .sort((a, b) => b.runNumber - a.runNumber);
  return earlier[0] ?? null;
}

function deltasByName(
  previous: Array<{ name: string; value: number | null }>,
  current: Array<{ name: string; value: number | null }>,
): Delta[] {
  return current
    .map((c) => {
      const p = previous.find((x) => x.name === c.name);
      return { name: c.name, from: p ? p.value : null, to: c.value };
    })
    .filter((d) => d.from !== d.to);
}

// ─── Run report ───────────────────────────────────────────────────────────────

export function buildRunReport(
  configName: string,
  testSetName: string,
  runNumber: number,
): RunReport {
  const finalized = storage.readFinalizedEvalRun(configName, testSetName, runNumber);
  if (!finalized) {
    throw new Error(
      `Eval run ${runNumber} for "${testSetName}" was not found, or has not been finalized yet.`,
    );
  }
  const { meta, testCaseFiles } = finalized;

  const testCases = buildTestCases(configName, testCaseFiles, { includeTranscriptText: true });
  const { requirements, coverage } = buildRequirementsPivot(configName, testCases);

  // Headline numbers come from the transcript level, so one interaction failing three
  // test cases counts once — matching how finalize_eval_run reports the run.
  const transcriptOutcomes = new Map<string, boolean>();
  for (const tc of testCases) {
    for (const t of tc.transcripts) {
      transcriptOutcomes.set(t.id, (transcriptOutcomes.get(t.id) ?? true) && t.passed);
    }
  }
  const transcriptsEvaluated = transcriptOutcomes.size;
  const transcriptsPassed = [...transcriptOutcomes.values()].filter(Boolean).length;

  const allScores = testCases.flatMap((tc) =>
    tc.transcripts.flatMap((t) =>
      t.scores.map((s) => ({
        ...s,
        weight: tc.dimensions.find((d) => d.name === s.dimension)?.weight ?? 1,
      })),
    ),
  );

  // Comparison against the previous finalized run, built without transcript text since
  // only the aggregates are needed.
  let comparison: RunComparison | null = null;
  let regressions: ReturnType<typeof findDimensionRegressions> = [];
  const previousMeta = previousFinalizedRun(configName, testSetName, runNumber);
  if (previousMeta) {
    const previousFinalized = storage.readFinalizedEvalRun(
      configName,
      testSetName,
      previousMeta.runNumber,
    );
    if (previousFinalized) {
      const previousTestCases = buildTestCases(configName, previousFinalized.testCaseFiles, {
        includeTranscriptText: false,
      });
      const previousPivot = buildRequirementsPivot(configName, previousTestCases);
      const previousStats = computeStats(
        previousTestCases.flatMap((tc) =>
          tc.transcripts.flatMap((t) =>
            t.scores.map((s) => ({
              ...s,
              weight: tc.dimensions.find((d) => d.name === s.dimension)?.weight ?? 1,
            })),
          ),
        ),
      );

      const currentWeighted = computeStats(allScores).weightedScore;
      comparison = {
        previousRunNumber: previousMeta.runNumber,
        passRateDelta:
          previousMeta.aggregatePassRate === undefined
            ? null
            : (transcriptsEvaluated > 0 ? transcriptsPassed / transcriptsEvaluated : 0) -
              previousMeta.aggregatePassRate,
        weightedScoreDelta:
          currentWeighted === null || previousStats.weightedScore === null
            ? null
            : currentWeighted - previousStats.weightedScore,
        testCaseDeltas: deltasByName(
          previousTestCases.map((tc) => ({ name: tc.name, value: tc.passRate })),
          testCases.map((tc) => ({ name: tc.name, value: tc.passRate })),
        ),
        requirementDeltas: deltasByName(
          previousPivot.requirements
            .filter((r) => r.coveredBy.length > 0)
            .map((r) => ({ name: r.id, value: r.stats.passRate })),
          requirements
            .filter((r) => r.coveredBy.length > 0)
            .map((r) => ({ name: r.id, value: r.stats.passRate })),
        ),
        testSetChanged: signatureOf(previousMeta) !== signatureOf(meta),
      };

      // A regression across a changed test set compares different populations, so it is
      // reported as an anomaly by deriveRunFindings instead of as a regression.
      if (!comparison.testSetChanged) {
        regressions = findDimensionRegressions(
          previousTestCases,
          testCases,
          previousMeta.runNumber,
        );
      }
    }
  }

  return {
    kind: "run",
    generator: generator(),
    config: { name: configName },
    testSet: {
      name: testSetName,
      testCaseNames: meta.testCaseNames,
      transcriptIds: meta.transcriptIds,
      signature: signatureOf(meta),
    },
    run: {
      number: runNumber,
      mode: modeOf(meta),
      startedAt: meta.startedAt,
      finalizedAt: meta.finalizedAt ?? null,
      promptVersion: {
        number: meta.promptVersionNumber ?? null,
        status: meta.promptVersionStatus ?? null,
      },
      prompt: meta.promptText ?? null,
      previewStructure: meta.previewStructure ?? null,
      transcriptsEvaluated,
      skipped: (meta.skippedTranscripts ?? []).map((s) => ({
        id: s.transcriptId,
        label: s.transcriptLabel,
        summary: s.summary,
        reason: s.reason,
      })),
    },
    headline: {
      passRate: transcriptsEvaluated > 0 ? transcriptsPassed / transcriptsEvaluated : 0,
      stats: computeStats(allScores),
      transcriptsPassed,
      transcriptsEvaluated,
    },
    testCases,
    requirements,
    coverage,
    findings: deriveRunFindings({ testCases, requirements, coverage, comparison, regressions }),
    comparison,
  };
}

// ─── Improvements report ──────────────────────────────────────────────────────

interface RunSnapshot {
  meta: EvalRunPendingMeta;
  entry: RunSeriesEntry;
  testCases: ReportTestCase[];
  requirements: ReportRequirement[];
}

export function buildImprovementsReport(
  configName: string,
  testSetName: string,
): ImprovementsReport {
  const metas = storage
    .readAllFinalizedRunMetas(configName, testSetName)
    .sort((a, b) => a.runNumber - b.runNumber);

  if (metas.length === 0) {
    throw new Error(
      `No finalized runs found for test set "${testSetName}". Finalize at least one run first.`,
    );
  }

  const snapshots: RunSnapshot[] = [];
  for (const meta of metas) {
    const finalized = storage.readFinalizedEvalRun(configName, testSetName, meta.runNumber);
    if (!finalized) continue;
    const testCases = buildTestCases(configName, finalized.testCaseFiles, {
      includeTranscriptText: false,
    });
    const { requirements } = buildRequirementsPivot(configName, testCases);
    const stats = computeStats(
      testCases.flatMap((tc) =>
        tc.transcripts.flatMap((t) =>
          t.scores.map((s) => ({
            ...s,
            weight: tc.dimensions.find((d) => d.name === s.dimension)?.weight ?? 1,
          })),
        ),
      ),
    );

    snapshots.push({
      meta,
      testCases,
      requirements,
      entry: {
        runNumber: meta.runNumber,
        finalizedAt: meta.finalizedAt ?? null,
        mode: modeOf(meta),
        promptVersion: {
          number: meta.promptVersionNumber ?? null,
          status: meta.promptVersionStatus ?? null,
        },
        passRate: meta.aggregatePassRate ?? null,
        weightedScore: stats.weightedScore,
        averageScore: stats.averageScore,
        transcriptsEvaluated: meta.transcriptIds.length,
        skippedCount: meta.skippedTranscripts?.length ?? 0,
        testSetSignature: signatureOf(meta),
        dashboardHref: `${String(meta.runNumber).padStart(4, "0")}/dashboard.html`,
      },
    });
  }

  const versions = storage.listVersionSnapshots(configName);
  const notesFor = (version: number | null) =>
    version === null ? null : versions.find((v) => v.version === version)?.notes ?? null;

  const changelog: ChangelogEntry[] = snapshots.map((snap, idx) => {
    const previous = idx > 0 ? snapshots[idx - 1] : null;
    const testSetChanged =
      previous !== null && previous.entry.testSetSignature !== snap.entry.testSetSignature;

    return {
      runNumber: snap.meta.runNumber,
      finalizedAt: snap.entry.finalizedAt,
      versionNumber: snap.entry.promptVersion.number,
      versionStatus: snap.entry.promptVersion.status,
      notes: notesFor(snap.entry.promptVersion.number),
      promptDiff: previous
        ? diffPrompts(previous.meta.promptText ?? null, snap.meta.promptText ?? null)
        : { added: 0, removed: 0, lines: [], isFirst: true, unavailable: false },
      passRateDelta:
        previous === null || snap.entry.passRate === null || previous.entry.passRate === null
          ? null
          : snap.entry.passRate - previous.entry.passRate,
      weightedScoreDelta:
        previous === null ||
        snap.entry.weightedScore === null ||
        previous.entry.weightedScore === null
          ? null
          : snap.entry.weightedScore - previous.entry.weightedScore,
      testCaseDeltas: previous
        ? deltasByName(
            previous.testCases.map((tc) => ({ name: tc.name, value: tc.passRate })),
            snap.testCases.map((tc) => ({ name: tc.name, value: tc.passRate })),
          )
        : [],
      requirementDeltas: previous
        ? deltasByName(
            previous.requirements
              .filter((r) => r.coveredBy.length > 0)
              .map((r) => ({ name: r.id, value: r.stats.passRate })),
            snap.requirements
              .filter((r) => r.coveredBy.length > 0)
              .map((r) => ({ name: r.id, value: r.stats.passRate })),
          )
        : [],
      testSetChanged,
    };
  })
    // Newest first: the changelog is read as "what happened lately".
    .reverse();

  // Series rows are keyed by name across runs, so a test case added later simply has nulls
  // for the runs before it existed rather than shifting the columns.
  const testCaseNames = [
    ...new Set(snapshots.flatMap((s) => s.testCases.map((tc) => tc.name))),
  ].sort();
  const testCaseSeries: SeriesRow[] = testCaseNames.map((name) => ({
    key: name,
    label: name,
    series: snapshots.map((s) => {
      const tc = s.testCases.find((x) => x.name === name);
      return tc ? tc.passRate : null;
    }),
  }));

  const requirementIds = [
    ...new Set(
      snapshots.flatMap((s) =>
        s.requirements.filter((r) => r.coveredBy.length > 0).map((r) => r.id),
      ),
    ),
  ].sort();
  const requirementSeries: SeriesRow[] = requirementIds.map((id) => {
    const anywhere = snapshots
      .flatMap((s) => s.requirements)
      .find((r) => r.id === id);
    return {
      key: id,
      label: id,
      category: anywhere?.category,
      series: snapshots.map((s) => s.requirements.find((r) => r.id === id)?.stats.passRate ?? null),
    };
  });

  // The watchlist is the latest run's findings, minus anything already resolved there —
  // it answers "what is still wrong now", not "what has ever been wrong".
  const latest = snapshots[snapshots.length - 1];
  const latestReport = buildRunReport(configName, testSetName, latest.meta.runNumber);
  const watchlist = latestReport.findings.filter(
    (f) => f.severity !== "low" || f.kind === "scoring-anomaly",
  );

  return {
    kind: "improvements",
    generator: generator(),
    config: { name: configName },
    testSet: { name: testSetName },
    runs: snapshots.map((s) => s.entry),
    changelog,
    testCaseSeries,
    requirementSeries,
    watchlist,
  };
}
