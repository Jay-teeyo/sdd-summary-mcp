/**
 * Findings — "what this run is telling you", derived entirely from the run's own numbers.
 *
 * Deliberately no domain advice. The dashboard this replaces carried hardcoded
 * domain-specific recommendations, which were wrong for every configuration that was not
 * a orders line and unfalsifiable for the one that was. Everything here is either a
 * measured fact about this run or a comparison against the previous one, and the evidence
 * is the scorer's own reasoning so a reader can disagree with it.
 */

import type {
  CoverageReport,
  Finding,
  ReportRequirement,
  ReportTestCase,
  RunComparison,
} from "./model.js";

/** Below this pass rate a dimension is worth naming; above it, the detail views suffice. */
const DIMENSION_ATTENTION = 0.8;
/** Below this, a requirement is called out as at risk rather than merely imperfect. */
const REQUIREMENT_RISK = 0.7;
/** A drop smaller than this is noise from a handful of interactions, not a regression. */
const REGRESSION_THRESHOLD = 0.05;
const MAX_DIMENSION_FINDINGS = 3;
const MAX_REQUIREMENT_FINDINGS = 2;
const MAX_EVIDENCE = 3;

export interface DimensionRegression {
  testCase: string;
  dimension: string;
  weight: number;
  from: number;
  to: number;
  previousRunNumber: number;
}

export interface FindingInputs {
  testCases: ReportTestCase[];
  requirements: ReportRequirement[];
  coverage: CoverageReport;
  comparison: RunComparison | null;
  /** Dimensions whose pass rate fell against the previous comparable run. */
  regressions: DimensionRegression[];
}

function pctOf(v: number | null): number {
  return Math.round((v ?? 0) * 100);
}

export function deriveRunFindings(input: FindingInputs): Finding[] {
  const findings: Finding[] = [];
  const { testCases, requirements, coverage, comparison, regressions } = input;

  // Weight first, then failure rate. Weight is the author's statement of what matters, so a
  // weight-5 rule failing at all outranks any weight-4 rule however often it fails; within
  // one weight the worse failure rate leads.
  const failureRate = (passRate: number | null) => 1 - (passRate ?? 1);
  const failing = testCases
    .flatMap((tc) => tc.dimensions.map((d) => ({ testCase: tc.name, d })))
    .filter((x) => x.d.stats.evaluated > 0 && (x.d.stats.passRate ?? 1) < DIMENSION_ATTENTION)
    .sort(
      (a, b) =>
        b.d.weight - a.d.weight ||
        failureRate(b.d.stats.passRate) - failureRate(a.d.stats.passRate),
    );

  const shown = failing.slice(0, MAX_DIMENSION_FINDINGS);
  for (const { testCase, d } of shown) {
    const reasons = (testCases.find((t) => t.name === testCase)?.transcripts ?? [])
      .flatMap((t) => t.scores.filter((s) => s.dimension === d.name && !s.na && !s.passed))
      .map((s) => s.reasoning)
      .filter((r) => r.trim().length > 0);

    findings.push({
      severity: d.weight >= 4 ? "high" : "medium",
      kind: "dimension-failure",
      title: `${d.name} fails ${pctOf(1 - (d.stats.passRate ?? 1))}% of interactions`,
      detail:
        `Weight ${d.weight} of 5, pass threshold ${d.passThreshold.toFixed(2)}. ` +
        `${d.stats.failed} of ${d.stats.evaluated} evaluated interactions scored below it.`,
      evidence: [...new Set(reasons)].slice(0, MAX_EVIDENCE),
      links: { testCase, dimension: d.name },
    });
  }

  const remaining = failing.length - shown.length;
  if (remaining > 0) {
    findings.push({
      severity: "low",
      kind: "dimension-failure",
      title: `${remaining} further dimension${remaining === 1 ? " is" : "s are"} below ${Math.round(DIMENSION_ATTENTION * 100)}% pass`,
      detail: "Lower weighted than those above. Open each test case to review them in full.",
      evidence: failing.slice(MAX_DIMENSION_FINDINGS).map(
        (x) => `${x.d.name} — ${pctOf(x.d.stats.passRate)}% pass (weight ${x.d.weight})`,
      ),
      links: {},
    });
  }

  // Requirements at risk, skipping any whose failures are already explained by a dimension
  // listed above — otherwise the same PII failure is reported three times over.
  const explained = new Set(shown.flatMap(({ d }) => d.requirementIds));
  const atRisk = requirements.filter(
    (r) =>
      r.coveredBy.length > 0 &&
      r.stats.evaluated > 0 &&
      (r.stats.passRate ?? 1) < REQUIREMENT_RISK &&
      !explained.has(r.id),
  );
  for (const req of atRisk.slice(0, MAX_REQUIREMENT_FINDINGS)) {
    findings.push({
      severity: "high",
      kind: "requirement-risk",
      title: `${req.id} is failing`,
      detail:
        `${req.text} Compliance is ${pctOf(req.stats.passRate)}% across ` +
        `${req.coveredBy.length} dimension${req.coveredBy.length === 1 ? "" : "s"}.`,
      evidence: [],
      links: { requirementId: req.id },
    });
  }

  // Regressions matter even when the headline improved — an averaged pass rate can rise
  // while a high-weight compliance rule falls.
  for (const r of regressions.slice(0, MAX_DIMENSION_FINDINGS)) {
    findings.push({
      severity: r.weight >= 4 ? "high" : "medium",
      kind: "regression",
      title: `${r.dimension} regressed since run ${r.previousRunNumber}`,
      detail:
        `This weight-${r.weight} dimension moved from ${pctOf(r.from)}% to ${pctOf(r.to)}% pass. ` +
        (comparison && (comparison.passRateDelta ?? 0) >= 0
          ? "The overall pass rate did not fall, so the run's headline number hides this."
          : "It is part of an overall decline in this run."),
      evidence: [],
      links: { testCase: r.testCase, dimension: r.dimension, runNumber: r.previousRunNumber },
    });
  }

  if (!coverage.requirementsUnavailable && coverage.uncoveredRequirementIds.length > 0) {
    const uncovered = coverage.uncoveredRequirementIds;
    findings.push({
      severity: "medium",
      kind: "coverage-gap",
      title: `${uncovered.length} requirement${uncovered.length === 1 ? " has" : "s have"} no test coverage`,
      detail:
        "No dimension maps to these requirement IDs, so nothing in this run tells you whether they hold. " +
        "An untested requirement is indistinguishable from a passing one on every other view.",
      evidence: uncovered.map((id) => {
        const req = requirements.find((r) => r.id === id);
        return req ? `${id} — ${req.text}` : id;
      }),
      links: {},
    });
  }

  if (coverage.unknownRequirementIds.length > 0) {
    findings.push({
      severity: "medium",
      kind: "coverage-gap",
      title:
        `${coverage.unknownRequirementIds.length} dimension reference` +
        `${coverage.unknownRequirementIds.length === 1 ? "s" : ""} a requirement that does not exist`,
      detail:
        "These look like coverage but test nothing traceable. Either the ID is a typo or the " +
        "requirement was removed from requirements.md.",
      evidence: coverage.unknownRequirementIds.map(
        (u) => `${u.id} — ${u.testCase} · ${u.dimension}`,
      ),
      links: {},
    });
  }

  if (comparison?.testSetChanged) {
    findings.push({
      severity: "low",
      kind: "scoring-anomaly",
      title: `Test set composition changed since run ${comparison.previousRunNumber}`,
      detail:
        "The transcripts or test cases differ between the two runs, so deltas across that " +
        "boundary compare different populations. Re-run the earlier version against the " +
        "current set for a like-for-like baseline.",
      evidence: [],
      links: { runNumber: comparison.previousRunNumber },
    });
  }

  return findings;
}

/**
 * Which dimensions fell between two comparable runs. Both sides are keyed by test case and
 * dimension name, so a renamed or removed dimension simply drops out rather than showing
 * as a 100% regression.
 */
export function findDimensionRegressions(
  previous: ReportTestCase[],
  current: ReportTestCase[],
  previousRunNumber: number,
): DimensionRegression[] {
  const out: DimensionRegression[] = [];
  for (const tc of current) {
    const prevTc = previous.find((p) => p.name === tc.name);
    if (!prevTc) continue;
    for (const d of tc.dimensions) {
      const prevD = prevTc.dimensions.find((p) => p.name === d.name);
      if (!prevD) continue;
      const from = prevD.stats.passRate;
      const to = d.stats.passRate;
      if (from === null || to === null) continue;
      if (from - to < REGRESSION_THRESHOLD) continue;
      out.push({
        testCase: tc.name,
        dimension: d.name,
        weight: d.weight,
        from,
        to,
        previousRunNumber,
      });
    }
  }
  // Heaviest first, as with the dimension findings; the larger drop breaks ties within a weight.
  return out.sort((a, b) => b.weight - a.weight || (b.from - b.to) - (a.from - a.to));
}
