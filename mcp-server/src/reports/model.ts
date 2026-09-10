/**
 * The report model — the single data contract between eval results on disk and the
 * HTML reports.
 *
 * Reports are derived artefacts, never the record: everything here is rebuilt from the
 * JSON files in eval-runs/, test-cases/ and requirements/, so any run can be re-rendered
 * with a newer template. That is what lets a user pull a new version of this plugin and
 * see their existing history in the new views.
 *
 * The model is also embedded verbatim in each rendered page, which is what makes a report
 * self-contained and lets the viewer pivot the same data by test case, by rubric
 * dimension, by transcript or by business requirement without regenerating anything.
 *
 * Bump REPORT_SCHEMA_VERSION on any breaking change so a viewer can refuse a model it
 * does not understand rather than rendering it wrongly.
 */

export const REPORT_SCHEMA_VERSION = 1;

export interface GeneratorInfo {
  /** Server version that produced the report, shown in the page footer. */
  serverVersion: string;
  schemaVersion: number;
  generatedAt: string;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Aggregate scores for a set of dimension scores.
 *
 * `weightedScore` is the headline quality number: dimensions carry a weight of 1–5, so a
 * must-not-happen compliance rule should not count the same as a style preference.
 * `averageScore` is the unweighted mean, kept alongside it because it is the number
 * earlier runs were reported with.
 *
 * N/A dimensions are excluded from every field here, so `evaluated` — not the total
 * number of dimensions — is the denominator.
 */
export interface ScoreStats {
  evaluated: number;
  na: number;
  passed: number;
  failed: number;
  /** passed / evaluated, or null when nothing was evaluated. */
  passRate: number | null;
  /** Unweighted mean score across evaluated dimensions. */
  averageScore: number | null;
  /** Σ(weight × score) / Σ(weight) across evaluated dimensions. */
  weightedScore: number | null;
}

// ─── Rubric dimensions ────────────────────────────────────────────────────────

export interface ReportDimension {
  name: string;
  description: string;
  weight: number;
  passThreshold: number;
  applicabilityCondition: string;
  passCriteria: string;
  failCriteria: string;
  /** Business requirement IDs this dimension validates. */
  requirementIds: string[];
  /** How this dimension scored across every transcript in the run. */
  stats: ScoreStats;
}

// ─── Per-transcript results ───────────────────────────────────────────────────

export interface ReportDimensionScore {
  dimension: string;
  /** Null when the dimension's applicabilityCondition was not met (na). */
  score: number | null;
  na: boolean;
  passed: boolean;
  reasoning: string;
}

export interface ReportTranscript {
  id: string;
  label: string;
  /** The summary that was evaluated. */
  summary: string;
  /**
   * The source conversation the summary was generated from. Included so a reviewer can
   * judge a score in context and so an exported report stands alone — note this means
   * exported reports contain raw conversation content.
   */
  transcriptText: string | null;
  stats: ScoreStats;
  passed: boolean;
  scores: ReportDimensionScore[];
}

export interface ReportTestCase {
  name: string;
  description: string;
  dimensions: ReportDimension[];
  transcripts: ReportTranscript[];
  /** Transcripts passed / transcripts evaluated. */
  passRate: number;
  stats: ScoreStats;
}

// ─── Requirements pivot ───────────────────────────────────────────────────────

export interface RequirementCoverage {
  testCase: string;
  dimension: string;
  weight: number;
}

export interface ReportRequirement {
  id: string;
  category: string;
  text: string;
  source: string;
  /** Dimensions that validate this requirement. Empty means it is untested. */
  coveredBy: RequirementCoverage[];
  /** Aggregated across every dimension that maps to this requirement. */
  stats: ScoreStats;
}

/**
 * Coverage problems worth surfacing regardless of scores, because both are silent today:
 * a requirement no dimension tests looks like a pass, and a dimension pointing at a
 * requirement ID that does not exist looks like coverage.
 */
export interface CoverageReport {
  requirementsTotal: number;
  requirementsCovered: number;
  uncoveredRequirementIds: string[];
  unknownRequirementIds: Array<{ id: string; testCase: string; dimension: string }>;
  /** True when requirements.md could not be found — the pivot is unavailable, not empty. */
  requirementsUnavailable: boolean;
}

// ─── Findings ─────────────────────────────────────────────────────────────────

export type FindingSeverity = "high" | "medium" | "low";

export type FindingKind =
  | "dimension-failure"
  | "requirement-risk"
  | "regression"
  | "coverage-gap"
  | "scoring-anomaly";

/**
 * An observation derived from this run's own data — never from prewritten domain advice,
 * which cannot be right for every summary configuration. `evidence` quotes the scorer's
 * own reasoning so a reader can judge the finding instead of taking it on trust.
 */
export interface Finding {
  severity: FindingSeverity;
  kind: FindingKind;
  title: string;
  detail: string;
  evidence: string[];
  links: {
    testCase?: string;
    dimension?: string;
    requirementId?: string;
    runNumber?: number;
  };
}

// ─── Run comparison ───────────────────────────────────────────────────────────

export interface Delta {
  name: string;
  from: number | null;
  to: number | null;
}

export interface RunComparison {
  previousRunNumber: number;
  passRateDelta: number | null;
  weightedScoreDelta: number | null;
  testCaseDeltas: Delta[];
  requirementDeltas: Delta[];
  /**
   * True when the test set's transcripts or test cases changed between the two runs, in
   * which case the deltas compare different things and must be labelled as such.
   */
  testSetChanged: boolean;
}

// ─── Run report ───────────────────────────────────────────────────────────────

export interface SkippedTranscriptReport {
  id: string;
  label: string;
  summary: string;
  reason: string;
}

export interface RunReport {
  kind: "run";
  generator: GeneratorInfo;
  config: { name: string };
  testSet: {
    name: string;
    testCaseNames: string[];
    transcriptIds: string[];
    /** Identifies the test set's composition, so runs over different sets are comparable. */
    signature: string;
  };
  run: {
    number: number;
    mode: "existing" | "prompt_test";
    startedAt: string;
    finalizedAt: string | null;
    promptVersion: { number: number | null; status: "candidate" | "deployed" | null };
    prompt: string | null;
    /** Whether preview structure was inherited from the live Genesys setting. */
    previewStructure: string | null;
    transcriptsEvaluated: number;
    skipped: SkippedTranscriptReport[];
  };
  headline: {
    passRate: number;
    stats: ScoreStats;
    transcriptsPassed: number;
    transcriptsEvaluated: number;
  };
  testCases: ReportTestCase[];
  requirements: ReportRequirement[];
  coverage: CoverageReport;
  findings: Finding[];
  comparison: RunComparison | null;
}

// ─── Improvements report ──────────────────────────────────────────────────────

export interface RunSeriesEntry {
  runNumber: number;
  finalizedAt: string | null;
  mode: "existing" | "prompt_test";
  promptVersion: { number: number | null; status: "candidate" | "deployed" | null };
  passRate: number | null;
  weightedScore: number | null;
  averageScore: number | null;
  transcriptsEvaluated: number;
  skippedCount: number;
  testSetSignature: string;
  /** Relative path to this run's own dashboard, for drill-through. */
  dashboardHref: string;
}

export interface PromptDiffLine {
  type: "add" | "remove" | "context";
  text: string;
}

export interface ChangelogEntry {
  runNumber: number;
  finalizedAt: string | null;
  versionNumber: number | null;
  versionStatus: "candidate" | "deployed" | null;
  /** Notes recorded on the version snapshot. */
  notes: string | null;
  promptDiff: {
    added: number;
    removed: number;
    /** Truncated to the changed regions plus a little context. */
    lines: PromptDiffLine[];
    /** True when there is no earlier prompt to diff against. */
    isFirst: boolean;
    unavailable: boolean;
  };
  passRateDelta: number | null;
  weightedScoreDelta: number | null;
  testCaseDeltas: Delta[];
  requirementDeltas: Delta[];
  testSetChanged: boolean;
}

export interface SeriesRow {
  key: string;
  label: string;
  category?: string;
  /** One entry per run in `runs`, null where the row was not evaluated in that run. */
  series: Array<number | null>;
}

export interface ImprovementsReport {
  kind: "improvements";
  generator: GeneratorInfo;
  config: { name: string };
  testSet: { name: string };
  runs: RunSeriesEntry[];
  changelog: ChangelogEntry[];
  testCaseSeries: SeriesRow[];
  requirementSeries: SeriesRow[];
  /** Regressions and risks that persist in the latest run. */
  watchlist: Finding[];
}

export type Report = RunReport | ImprovementsReport;

// ─── Shared computation ───────────────────────────────────────────────────────

/**
 * Aggregate a set of scored dimensions. Weights come from the test case definition; a
 * dimension whose weight is missing counts as 1 so an unweighted test case still totals
 * correctly.
 */
export function computeStats(
  scores: Array<{ score: number | null; na: boolean; passed: boolean; weight?: number }>,
): ScoreStats {
  const evaluated = scores.filter((s) => !s.na && s.score !== null);
  const na = scores.length - evaluated.length;
  const passed = evaluated.filter((s) => s.passed).length;

  let weightSum = 0;
  let weightedTotal = 0;
  let plainTotal = 0;
  for (const s of evaluated) {
    const w = s.weight ?? 1;
    weightSum += w;
    weightedTotal += w * (s.score as number);
    plainTotal += s.score as number;
  }

  return {
    evaluated: evaluated.length,
    na,
    passed,
    failed: evaluated.length - passed,
    passRate: evaluated.length > 0 ? passed / evaluated.length : null,
    averageScore: evaluated.length > 0 ? plainTotal / evaluated.length : null,
    weightedScore: weightSum > 0 ? weightedTotal / weightSum : null,
  };
}

/**
 * A stable fingerprint of what a run was measured against. Two runs are only comparable
 * when these match; otherwise a pass-rate delta is comparing different populations.
 */
export function testSetSignature(testCaseNames: string[], transcriptIds: string[]): string {
  return `${[...testCaseNames].sort().join(",")}|${[...transcriptIds].sort().join(",")}`;
}
