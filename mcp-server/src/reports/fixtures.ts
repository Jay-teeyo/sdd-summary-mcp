/**
 * Synthetic report models for developing and reviewing the templates.
 *
 * These deliberately include the awkward cases the real data will eventually contain:
 * an N/A dimension, a skipped transcript, an untested requirement, a dimension pointing
 * at a requirement ID that does not exist, a test set whose composition changed
 * mid-history, and a run that improved overall while regressing a heavily weighted
 * compliance dimension.
 *
 * Render them with `npm run preview:reports`.
 */

import {
  REPORT_SCHEMA_VERSION,
  computeStats,
  testSetSignature,
  type Delta,
  type Finding,
  type ImprovementsReport,
  type ReportRequirement,
  type ReportTestCase,
  type RunReport,
  type ScoreStats,
} from "./model.js";

const CONFIG = "Acme_CallSummary";
const TEST_SET = "Acme_CallSummary-Full-Test-Suite";

const generator = {
  serverVersion: "2.0.0",
  schemaVersion: REPORT_SCHEMA_VERSION,
  generatedAt: "2026-09-11T09:40:00.000Z",
};

// ─── Requirement catalogue ────────────────────────────────────────────────────

const REQUIREMENTS = [
  { id: "BR-Acme_CallSummary-001", category: "Structure", text: "The summary must contain the four prescribed sections in order.", source: "summary prompt" },
  { id: "BR-Acme_CallSummary-002", category: "Structure", text: "Each section heading must appear exactly as written in the prompt.", source: "summary prompt" },
  { id: "BR-Acme_CallSummary-007", category: "Content Accuracy", text: "The reason for contact must reflect what the customer actually asked for.", source: "summary prompt" },
  { id: "BR-Acme_CallSummary-008", category: "Content Accuracy", text: "Outcomes must not be recorded as complete unless they concluded during the interaction.", source: "qa-feedback.eml" },
  { id: "BR-Acme_CallSummary-012", category: "Terminology", text: "The external participant must be referred to as the customer.", source: "BR-Support-2026.docx" },
  { id: "BR-Acme_CallSummary-019", category: "Privacy", text: "No personally identifiable information may appear in the summary.", source: "BR-Support-2026.docx" },
  { id: "BR-Acme_CallSummary-024", category: "Content Accuracy", text: "Where a third party participated, their relationship to the customer must be stated.", source: "qa-feedback.eml" },
  { id: "BR-Acme_CallSummary-031", category: "Style", text: "Summaries must not exceed 200 words.", source: "summary prompt" },
  { id: "BR-Acme_CallSummary-036", category: "Privacy", text: "Payment card details must never be restated, even partially.", source: "BR-Support-2026.docx" },
  { id: "BR-Acme_CallSummary-041", category: "Style", text: "Prohibited words must not appear: advised, promised, guaranteed.", source: "summary prompt" },
  { id: "BR-Acme_CallSummary-047", category: "Structure", text: "Outstanding items must be listed as separate bullets under Resolution.", source: "qa-feedback.eml" },
  { id: "BR-Acme_CallSummary-052", category: "Content Accuracy", text: "Where the customer disputes a decision, the dispute must be recorded as the reason for contact.", source: "BR-Support-2026.docx" },
];

// ─── Transcript corpus ────────────────────────────────────────────────────────

interface FixtureTranscript {
  id: string;
  label: string;
  summary: string;
  text: string;
}

const TRANSCRIPTS: FixtureTranscript[] = [
  {
    id: "c8f1a2b0",
    label: "Order status enquiry — 4m12s",
    summary:
      "Reason for Contact\n- Customer enquired about the status of a delayed delivery.\n\n" +
      "Key Information Obtained\n- The order was placed three weeks earlier and has not arrived.\n\n" +
      "Actions Completed\n- Confirmed the order is with the fulfilment team.\n\n" +
      "Resolution\n- Customer advised the fulfilment team will make contact within five business days.",
    text:
      "Customer Service Consultant: Thanks for calling, you're speaking with Dana.\n" +
      "Customer: Hi Dana, I lodged a delayed delivery about three weeks ago and I haven't heard anything.\n" +
      "Customer Service Consultant: Let me take a look for you. Can I confirm your order reference?\n" +
      "Customer: It's ORD-4471029.\n" +
      "Customer Service Consultant: That one is with the fulfilment team now. They'll be in touch within five business days.\n" +
      "Customer: That's fine, thank you.",
  },
  {
    id: "a41d77e3",
    label: "Third party on call — 7m48s",
    summary:
      "Reason for Contact\n- Customer's daughter called to discuss an outstanding order on her mother's behalf.\n\n" +
      "Key Information Obtained\n- Authority to act was confirmed on the account.\n\n" +
      "Actions Completed\n- Confirmed the outstanding balance.\n\n" +
      "Resolution\n- Interaction concluded without final action.\n- Outstanding: customer to return call to confirm payment method.",
    text:
      "Customer Service Consultant: Good afternoon, this is Priya.\n" +
      "Customer: Hi, I'm calling about my mum's order — I'm listed as an authorised contact.\n" +
      "Customer Service Consultant: Thank you, I can see you're recorded as authorised. What can I help with?\n" +
      "Customer: We wanted to know the balance.\n" +
      "Customer Service Consultant: The outstanding balance is $250. Will she be paying by card?\n" +
      "Customer: She'll call back to sort that out.",
  },
  {
    id: "b902ce54",
    label: "Payment details taken — 5m03s",
    summary:
      "Reason for Contact\n- Customer called to pay the balance on order ORD-2288104.\n\n" +
      "Key Information Obtained\n- Payment taken on card ending 4417.\n\n" +
      "Actions Completed\n- Processed $250 outstanding balance payment.\n\n" +
      "Resolution\n- Balance paid and order progressed to dispatch scheduling.",
    text:
      "Customer Service Consultant: You're speaking with Tom.\n" +
      "Customer: I want to pay the balance on my damaged item.\n" +
      "Customer Service Consultant: Of course. I can take that now — could you read out the long number?\n" +
      "Customer: 4111 1111 1111 4417.\n" +
      "Customer Service Consultant: Thank you, that's gone through. Your order moves to dispatch scheduling now.",
  },
  {
    id: "d55b1907",
    label: "Complaint about delay — 11m21s",
    summary:
      "Reason for Contact\n- Customer raised a complaint about the length of time an assessment has taken.\n\n" +
      "Key Information Obtained\n- Order placed 9 August, no update since 22 August.\n\n" +
      "Actions Completed\n- Logged a formal complaint and escalated to the orders team leader.\n\n" +
      "Resolution\n- Customer guaranteed a call back within 24 hours.",
    text:
      "Customer Service Consultant: This is Alex speaking.\n" +
      "Customer: I've been waiting a month. Nobody has called me back. This is unacceptable.\n" +
      "Customer Service Consultant: I'm sorry, that's clearly not good enough. I'll log this as a formal complaint.\n" +
      "Customer: I want someone to actually call me.\n" +
      "Customer Service Consultant: I'm escalating to the team leader and you'll hear back within 24 hours.",
  },
  {
    id: "e7710b28",
    label: "Travel booking query — 6m30s",
    summary:
      "Reason for Contact\n- Caller asked about changing flights on an existing travel booking.\n\n" +
      "Key Information Obtained\n- No order-material information was obtained.\n\n" +
      "Actions Completed\n- Directed the caller to the travel provider.\n\n" +
      "Resolution\n- Interaction concluded without final action.",
    text:
      "Customer Service Consultant: Hello, Sam here.\n" +
      "Customer: I need to move my flights, can you do that?\n" +
      "Customer Service Consultant: That would be with your travel provider rather than us, I'm afraid.\n" +
      "Customer: Ah okay, I'll call them.",
  },
];

const SKIPPED = [
  {
    id: "f0021ab9",
    label: "Misdial — 0m14s",
    summary: "The interaction is too short to create a summary.",
    reason: "Genesys returned the too-short-to-summarise placeholder instead of a summary",
  },
];

// ─── Rubric definitions ───────────────────────────────────────────────────────

interface FixtureDim {
  name: string;
  description: string;
  weight: number;
  passThreshold: number;
  applicabilityCondition: string;
  passCriteria: string;
  failCriteria: string;
  requirementIds: string[];
  /** Score per transcript, in TRANSCRIPTS order. null = N/A. */
  scores: Array<number | null>;
  reasons: string[];
}

interface FixtureTestCase {
  name: string;
  description: string;
  dimensions: FixtureDim[];
}

const TEST_CASES: FixtureTestCase[] = [
  {
    name: "TC-Structure-And-Sections",
    description: "Validates the four prescribed sections, their order, and their exact headings.",
    dimensions: [
      {
        name: "All four sections present",
        description: "Every prescribed section appears in the summary.",
        weight: 4,
        passThreshold: 1.0,
        applicabilityCondition: "always",
        passCriteria: "Score 1.0: all four sections present. Score 0.5: one missing. Score 0: two or more missing.",
        failCriteria: "Score 0: the summary is missing two or more prescribed sections.",
        requirementIds: ["BR-Acme_CallSummary-001"],
        scores: [1, 1, 1, 1, 1],
        reasons: [
          "All four sections present in the prescribed order.",
          "All four sections present in the prescribed order.",
          "All four sections present in the prescribed order.",
          "All four sections present in the prescribed order.",
          "All four sections present in the prescribed order.",
        ],
      },
      {
        name: "Headings match exactly",
        description: "Section headings are reproduced verbatim from the prompt.",
        weight: 2,
        passThreshold: 0.8,
        applicabilityCondition: "always",
        passCriteria: "Score 1.0: all headings verbatim. Deduct 0.25 per altered heading.",
        failCriteria: "Score 0: headings are paraphrased or reordered.",
        requirementIds: ["BR-Acme_CallSummary-002"],
        scores: [1, 1, 1, 1, 1],
        reasons: [
          "Headings verbatim.",
          "Headings verbatim.",
          "Headings verbatim.",
          "Headings verbatim.",
          "Headings verbatim.",
        ],
      },
      {
        name: "Section spacing correct",
        description: "Adjacent sections are separated by a blank line.",
        weight: 1,
        passThreshold: 0.8,
        applicabilityCondition: "Summary contains at least 2 sections.",
        passCriteria: "Score 1.0: every pair of adjacent sections is separated by a blank line.",
        failCriteria: "Score 0: sections run together.",
        requirementIds: ["BR-Acme_CallSummary-001"],
        scores: [1, 1, 1, 1, 1],
        reasons: ["Spacing correct.", "Spacing correct.", "Spacing correct.", "Spacing correct.", "Spacing correct."],
      },
    ],
  },
  {
    name: "TC-Content-Accuracy",
    description: "Validates that the summary reflects what actually happened in the interaction.",
    dimensions: [
      {
        name: "Reason for contact is accurate",
        description: "The recorded reason matches what the customer asked for.",
        weight: 5,
        passThreshold: 0.8,
        applicabilityCondition: "always",
        passCriteria: "Score 1.0: reason matches the opening request. Score 0.5: partially correct.",
        failCriteria: "Score 0: the reason contradicts the transcript.",
        requirementIds: ["BR-Acme_CallSummary-007"],
        scores: [1, 1, 1, 0.5, 1],
        reasons: [
          "Matches the customer's opening request about order status.",
          "Correctly identifies the daughter calling on the customer's behalf.",
          "Correctly identifies the balance payment as the reason.",
          "Records the complaint but omits that the customer explicitly asked to be called back, which was the substance of the request.",
          "Correctly identifies the flight change request.",
        ],
      },
      {
        name: "Outcomes not overstated as complete",
        description: "Future commitments are not recorded as completed outcomes.",
        weight: 5,
        passThreshold: 1.0,
        applicabilityCondition: "always",
        passCriteria: "Score 1.0: only concluded outcomes are recorded as complete.",
        failCriteria: "Score 0: a future commitment is recorded as a completed action or resolution.",
        requirementIds: ["BR-Acme_CallSummary-008"],
        scores: [0, 1, 1, 0, 1],
        reasons: [
          "Resolution states the fulfilment team will make contact within five business days — a future commitment recorded as the resolution rather than an outstanding item.",
          "Correctly uses the concluded-without-final-action fallback and lists the callback as outstanding.",
          "Payment concluded during the interaction, so recording it as complete is correct.",
          "Resolution records a guaranteed call back within 24 hours as the outcome; nothing was concluded on the call.",
          "Correctly uses the fallback for an interaction with no action taken.",
        ],
      },
      {
        name: "Third-party role stated",
        description: "When a third party participates, their relationship to the customer is stated.",
        weight: 3,
        passThreshold: 0.8,
        applicabilityCondition: "Only applies when a third party (non-customer, non-agent) participated in the interaction.",
        passCriteria: "Score 1.0: relationship clearly stated. Score 0.5: participation noted but relationship absent.",
        failCriteria: "Score 0: third party present but entirely unacknowledged.",
        requirementIds: ["BR-Acme_CallSummary-024"],
        scores: [null, 1, null, null, null],
        reasons: [
          "No third party participated.",
          "Identifies the caller as the customer's daughter and notes authority to act.",
          "No third party participated.",
          "No third party participated.",
          "No third party participated.",
        ],
      },
    ],
  },
  {
    name: "TC-Compliance-And-Style",
    description: "Validates privacy obligations, terminology and prohibited language.",
    dimensions: [
      {
        name: "No PII in summary",
        description: "No personally identifiable information appears in the summary.",
        weight: 5,
        passThreshold: 1.0,
        applicabilityCondition: "always",
        passCriteria: "Score 1.0: no PII present.",
        failCriteria: "Score 0: any PII present — name, date of birth, contact details, card or reference numbers.",
        requirementIds: ["BR-Acme_CallSummary-019", "BR-Acme_CallSummary-036"],
        scores: [0, 1, 0, 1, 1],
        reasons: [
          "Includes the claim reference ORD-4471029.",
          "No identifying details present.",
          "Restates the card's last four digits (4417) and the claim reference ORD-2288104.",
          "No identifying details present.",
          "No identifying details present.",
        ],
      },
      {
        name: "Customer terminology used",
        description: "The external participant is referred to as the customer.",
        weight: 3,
        passThreshold: 0.8,
        applicabilityCondition: "always",
        passCriteria: "Score 1.0: referred to as the customer throughout.",
        failCriteria: "Score 0: referred to as customer, client or caller.",
        requirementIds: ["BR-Acme_CallSummary-012"],
        scores: [1, 1, 1, 1, 0],
        reasons: [
          "Referred to as the customer throughout.",
          "Referred to as the customer throughout.",
          "Referred to as the customer throughout.",
          "Referred to as the customer throughout.",
          "Refers to the caller rather than the customer throughout.",
        ],
      },
      {
        name: "No prohibited words",
        description: "The words advised, promised and guaranteed do not appear.",
        weight: 2,
        passThreshold: 1.0,
        applicabilityCondition: "always",
        passCriteria: "Score 1.0: no prohibited word appears.",
        failCriteria: "Score 0: any prohibited word appears.",
        requirementIds: ["BR-Acme_CallSummary-041", "BR-Acme_CallSummary-099"],
        scores: [0, 1, 1, 0, 1],
        reasons: [
          "Uses \"advised\" in the Resolution section.",
          "No prohibited words.",
          "No prohibited words.",
          "Uses \"guaranteed\" in the Resolution section.",
          "No prohibited words.",
        ],
      },
      {
        name: "Within word limit",
        description: "The summary does not exceed 200 words.",
        weight: 1,
        passThreshold: 1.0,
        applicabilityCondition: "always",
        passCriteria: "Score 1.0: 200 words or fewer.",
        failCriteria: "Score 0: over 200 words.",
        requirementIds: ["BR-Acme_CallSummary-031"],
        scores: [1, 1, 1, 1, 1],
        reasons: ["68 words.", "74 words.", "61 words.", "72 words.", "54 words."],
      },
    ],
  },
];

// ─── Assembly ─────────────────────────────────────────────────────────────────

function buildTestCases(): ReportTestCase[] {
  return TEST_CASES.map((tc) => {
    const weightOf = new Map(tc.dimensions.map((d) => [d.name, d.weight]));

    const dimensions = tc.dimensions.map((d) => ({
      name: d.name,
      description: d.description,
      weight: d.weight,
      passThreshold: d.passThreshold,
      applicabilityCondition: d.applicabilityCondition,
      passCriteria: d.passCriteria,
      failCriteria: d.failCriteria,
      requirementIds: d.requirementIds,
      stats: computeStats(
        d.scores.map((s) => ({
          score: s,
          na: s === null,
          passed: s !== null && s >= d.passThreshold,
          weight: d.weight,
        })),
      ),
    }));

    const transcripts = TRANSCRIPTS.map((t, i) => {
      const scores = tc.dimensions.map((d) => ({
        dimension: d.name,
        score: d.scores[i],
        na: d.scores[i] === null,
        passed: d.scores[i] !== null && (d.scores[i] as number) >= d.passThreshold,
        reasoning: d.reasons[i],
      }));
      const stats = computeStats(
        scores.map((s) => ({ ...s, weight: weightOf.get(s.dimension) ?? 1 })),
      );
      return {
        id: t.id,
        label: t.label,
        summary: t.summary,
        transcriptText: t.text,
        stats,
        passed: stats.failed === 0,
        scores,
      };
    });

    const allScores = transcripts.flatMap((t) =>
      t.scores.map((s) => ({ ...s, weight: weightOf.get(s.dimension) ?? 1 })),
    );

    return {
      name: tc.name,
      description: tc.description,
      dimensions,
      transcripts,
      passRate: transcripts.filter((t) => t.passed).length / transcripts.length,
      stats: computeStats(allScores),
    };
  });
}

function buildRequirements(testCases: ReportTestCase[]): ReportRequirement[] {
  return REQUIREMENTS.map((req) => {
    const coveredBy: ReportRequirement["coveredBy"] = [];
    const scores: Array<{ score: number | null; na: boolean; passed: boolean; weight: number }> = [];

    for (const tc of testCases) {
      for (const dim of tc.dimensions) {
        if (!dim.requirementIds.includes(req.id)) continue;
        coveredBy.push({ testCase: tc.name, dimension: dim.name, weight: dim.weight });
        for (const t of tc.transcripts) {
          const s = t.scores.find((x) => x.dimension === dim.name);
          if (s) scores.push({ score: s.score, na: s.na, passed: s.passed, weight: dim.weight });
        }
      }
    }

    return { ...req, coveredBy, stats: computeStats(scores) };
  });
}

function headlineStats(testCases: ReportTestCase[]): ScoreStats {
  const all = testCases.flatMap((tc) => {
    const weightOf = new Map(tc.dimensions.map((d) => [d.name, d.weight]));
    return tc.transcripts.flatMap((t) =>
      t.scores.map((s) => ({ ...s, weight: weightOf.get(s.dimension) ?? 1 })),
    );
  });
  return computeStats(all);
}

function buildFindings(testCases: ReportTestCase[], requirements: ReportRequirement[]): Finding[] {
  const findings: Finding[] = [];

  // Dimensions ranked by weighted impact — a weight-5 rule failing a third of the time
  // matters more than a weight-1 rule failing most of the time.
  const dims = testCases
    .flatMap((tc) => tc.dimensions.map((d) => ({ tc: tc.name, d })))
    .filter((x) => (x.d.stats.passRate ?? 1) < 0.8)
    .sort(
      (a, b) =>
        b.d.weight * (1 - (b.d.stats.passRate ?? 1)) - a.d.weight * (1 - (a.d.stats.passRate ?? 1)),
    );

  const shownDimensions = dims.slice(0, 3);
  for (const { tc, d } of shownDimensions) {
    const failing = testCases
      .find((x) => x.name === tc)!
      .transcripts.flatMap((t) => t.scores.filter((s) => s.dimension === d.name && !s.na && !s.passed))
      .map((s) => s.reasoning);
    findings.push({
      severity: d.weight >= 4 ? "high" : "medium",
      kind: "dimension-failure",
      title: `${d.name} fails ${Math.round((1 - (d.stats.passRate ?? 1)) * 100)}% of interactions`,
      detail:
        `Weight ${d.weight} of 5, pass threshold ${d.passThreshold.toFixed(2)}. ` +
        `${d.stats.failed} of ${d.stats.evaluated} evaluated interactions scored below it.`,
      evidence: [...new Set(failing)].slice(0, 3),
      links: { testCase: tc, dimension: d.name },
    });
  }
  if (dims.length > shownDimensions.length) {
    findings.push({
      severity: "low",
      kind: "dimension-failure",
      title: `${dims.length - shownDimensions.length} further dimensions are below 80% pass`,
      detail: "Lower weighted impact than those above. Open each test case to review them in full.",
      evidence: dims.slice(3).map((x) => `${x.d.name} — ${Math.round((x.d.stats.passRate ?? 0) * 100)}% pass (weight ${x.d.weight})`),
      links: {},
    });
  }

  // Requirements at risk, skipping any whose failures are already explained by a dimension
  // listed above — otherwise the same PII failure is reported three times over.
  const explained = new Set(shownDimensions.flatMap(({ tc, d }) => d.requirementIds.map((id) => `${id}`)));
  const atRisk = requirements.filter(
    (r) => r.coveredBy.length > 0 && (r.stats.passRate ?? 1) < 0.7 && !explained.has(r.id),
  );
  for (const req of atRisk.slice(0, 2)) {
    findings.push({
      severity: "high",
      kind: "requirement-risk",
      title: `${req.id} is failing`,
      detail:
        `${req.text} Compliance is ${Math.round((req.stats.passRate ?? 0) * 100)}% across ` +
        `${req.coveredBy.length} dimension${req.coveredBy.length === 1 ? "" : "s"}.`,
      evidence: [],
      links: { requirementId: req.id },
    });
  }

  const uncovered = requirements.filter((r) => r.coveredBy.length === 0);
  if (uncovered.length > 0) {
    findings.push({
      severity: "medium",
      kind: "coverage-gap",
      title: `${uncovered.length} requirement${uncovered.length === 1 ? " has" : "s have"} no test coverage`,
      detail:
        "No dimension maps to these requirement IDs, so nothing in this run tells you whether they hold. " +
        "An untested requirement is indistinguishable from a passing one on every other view.",
      evidence: uncovered.map((r) => `${r.id} — ${r.text}`),
      links: {},
    });
  }

  findings.push({
    severity: "medium",
    kind: "regression",
    title: "Outcomes not overstated as complete regressed since run 4",
    detail:
      "This weight-5 dimension moved from 80% to 60% pass while the overall pass rate improved, " +
      "so the run's headline number hides a compliance regression.",
    evidence: [],
    links: { testCase: "TC-Content-Accuracy", dimension: "Outcomes not overstated as complete", runNumber: 4 },
  });

  return findings;
}

// ─── Run report ───────────────────────────────────────────────────────────────

export function runReportFixture(): RunReport {
  const testCases = buildTestCases();
  const requirements = buildRequirements(testCases);
  const knownIds = new Set(REQUIREMENTS.map((r) => r.id));

  const unknownRequirementIds: Array<{ id: string; testCase: string; dimension: string }> = [];
  for (const tc of testCases) {
    for (const d of tc.dimensions) {
      for (const id of d.requirementIds) {
        if (!knownIds.has(id)) unknownRequirementIds.push({ id, testCase: tc.name, dimension: d.name });
      }
    }
  }

  const transcriptsPassed = TRANSCRIPTS.filter((t) =>
    testCases.every((tc) => tc.transcripts.find((x) => x.id === t.id)?.passed),
  ).length;

  return {
    kind: "run",
    generator,
    config: { name: CONFIG },
    testSet: {
      name: TEST_SET,
      testCaseNames: TEST_CASES.map((t) => t.name),
      transcriptIds: TRANSCRIPTS.map((t) => t.id),
      signature: testSetSignature(TEST_CASES.map((t) => t.name), TRANSCRIPTS.map((t) => t.id)),
    },
    run: {
      number: 5,
      mode: "prompt_test",
      startedAt: "2026-09-11T09:12:00.000Z",
      finalizedAt: "2026-09-11T09:38:00.000Z",
      promptVersion: { number: 4, status: "candidate" },
      prompt:
        "You are summarising a completed contact centre interaction for an online retail support team.\n\n" +
        "Produce exactly four sections, in this order, using these headings verbatim:\n" +
        "Reason for Contact\nKey Information Obtained\nActions Completed\nResolution\n\n" +
        "Rules:\n" +
        "1. Refer to the external participant as the customer.\n" +
        "2. Only record an action under Actions Completed if it was fully completed during the interaction.\n" +
        "3. If no definitive outcome was reached, Resolution must read \"Interaction concluded without final action.\" followed by outstanding items.\n" +
        "4. Never include personally identifiable information, including order or card references.\n" +
        "5. Never use the words advised, promised or guaranteed.\n" +
        "6. Keep the summary under 200 words.",
      previewStructure:
        "inherited from the live Genesys setting (format: BulletPoints, insights: 3, participant labels: yes)",
      transcriptsEvaluated: TRANSCRIPTS.length,
      skipped: SKIPPED,
    },
    headline: {
      passRate: transcriptsPassed / TRANSCRIPTS.length,
      stats: headlineStats(testCases),
      transcriptsPassed,
      transcriptsEvaluated: TRANSCRIPTS.length,
    },
    testCases,
    requirements,
    coverage: {
      requirementsTotal: REQUIREMENTS.length,
      requirementsCovered: requirements.filter((r) => r.coveredBy.length > 0).length,
      uncoveredRequirementIds: requirements.filter((r) => r.coveredBy.length === 0).map((r) => r.id),
      unknownRequirementIds,
      requirementsUnavailable: false,
    },
    findings: buildFindings(testCases, requirements),
    comparison: {
      previousRunNumber: 4,
      passRateDelta: 0.2,
      weightedScoreDelta: 0.08,
      testCaseDeltas: [
        { name: "TC-Structure-And-Sections", from: 0.8, to: 1.0 },
        { name: "TC-Content-Accuracy", from: 0.6, to: 0.6 },
        { name: "TC-Compliance-And-Style", from: 0.4, to: 0.6 },
      ],
      requirementDeltas: [
        { name: "BR-Acme_CallSummary-001", from: 0.8, to: 1.0 },
        { name: "BR-Acme_CallSummary-008", from: 0.8, to: 0.6 },
        { name: "BR-Acme_CallSummary-019", from: 0.4, to: 0.6 },
        { name: "BR-Acme_CallSummary-041", from: 0.6, to: 0.6 },
      ],
      testSetChanged: false,
    },
  };
}

// ─── Improvements report ──────────────────────────────────────────────────────

const PROMPT_V1 =
  "Summarise the interaction in four sections: Reason for Contact, Key Information Obtained, Actions Completed, Resolution.\n" +
  "Refer to the customer as the customer.\n" +
  "Keep it brief.";

const PROMPT_V4 = runReportFixture().run.prompt!;

function diffPrompts(before: string, after: string) {
  const a = before.split("\n");
  const b = after.split("\n");
  const lines: Array<{ type: "add" | "remove" | "context"; text: string }> = [];
  let added = 0;
  let removed = 0;
  const bSet = new Set(b);
  const aSet = new Set(a);
  for (const line of a) {
    if (!bSet.has(line)) {
      lines.push({ type: "remove", text: line });
      removed++;
    }
  }
  for (const line of b) {
    if (!aSet.has(line)) {
      lines.push({ type: "add", text: line });
      added++;
    }
  }
  return { added, removed, lines: lines.slice(0, 24), isFirst: false, unavailable: false };
}

export function improvementsReportFixture(): ImprovementsReport {
  const runs = [
    { runNumber: 1, passRate: 0.2, weightedScore: 0.51, averageScore: 0.58, version: 1, status: "deployed" as const, mode: "existing" as const, n: 5, skipped: 0, sig: "A" },
    { runNumber: 2, passRate: 0.4, weightedScore: 0.62, averageScore: 0.66, version: 2, status: "candidate" as const, mode: "prompt_test" as const, n: 5, skipped: 0, sig: "A" },
    { runNumber: 3, passRate: 0.4, weightedScore: 0.64, averageScore: 0.69, version: 2, status: "deployed" as const, mode: "existing" as const, n: 5, skipped: 0, sig: "A" },
    { runNumber: 4, passRate: 0.4, weightedScore: 0.71, averageScore: 0.74, version: 3, status: "candidate" as const, mode: "prompt_test" as const, n: 5, skipped: 1, sig: "B" },
    { runNumber: 5, passRate: 0.6, weightedScore: 0.79, averageScore: 0.83, version: 4, status: "candidate" as const, mode: "prompt_test" as const, n: 5, skipped: 1, sig: "B" },
  ];

  const testCaseSeries = [
    { key: "TC-Structure-And-Sections", label: "Structure and sections", series: [0.4, 0.6, 0.6, 0.8, 1.0] },
    { key: "TC-Content-Accuracy", label: "Content accuracy", series: [0.2, 0.4, 0.4, 0.6, 0.6] },
    { key: "TC-Compliance-And-Style", label: "Compliance and style", series: [null, 0.2, 0.4, 0.4, 0.6] },
  ];

  const requirementSeries = [
    { key: "BR-Acme_CallSummary-001", label: "Four prescribed sections in order", category: "Structure", series: [0.6, 0.8, 0.8, 0.8, 1.0] },
    { key: "BR-Acme_CallSummary-007", label: "Reason for contact is accurate", category: "Content Accuracy", series: [0.6, 0.8, 0.8, 1.0, 1.0] },
    { key: "BR-Acme_CallSummary-008", label: "Outcomes not overstated as complete", category: "Content Accuracy", series: [0.4, 0.6, 0.6, 0.8, 0.6] },
    { key: "BR-Acme_CallSummary-012", label: "Customer terminology", category: "Terminology", series: [0.0, 0.4, 0.6, 0.8, 0.8] },
    { key: "BR-Acme_CallSummary-019", label: "No PII in summary", category: "Privacy", series: [0.2, 0.4, 0.4, 0.4, 0.6] },
    { key: "BR-Acme_CallSummary-041", label: "No prohibited words", category: "Style", series: [0.4, 0.6, 0.6, 0.6, 0.6] },
  ];

  const changelog: ImprovementsReport["changelog"] = [
    {
      runNumber: 5,
      finalizedAt: "2026-09-11T09:38:00.000Z",
      versionNumber: 4,
      versionStatus: "candidate",
      notes: "Added explicit PII prohibition covering order and card references, and the prohibited-word list.",
      promptDiff: diffPrompts(PROMPT_V1, PROMPT_V4),
      passRateDelta: 0.2,
      weightedScoreDelta: 0.08,
      testCaseDeltas: [
        { name: "TC-Structure-And-Sections", from: 0.8, to: 1.0 },
        { name: "TC-Compliance-And-Style", from: 0.4, to: 0.6 },
        { name: "TC-Content-Accuracy", from: 0.6, to: 0.6 },
      ],
      requirementDeltas: [
        { name: "BR-Acme_CallSummary-001", from: 0.8, to: 1.0 },
        { name: "BR-Acme_CallSummary-019", from: 0.4, to: 0.6 },
        { name: "BR-Acme_CallSummary-008", from: 0.8, to: 0.6 },
      ],
      testSetChanged: false,
    },
    {
      runNumber: 4,
      finalizedAt: "2026-09-05T14:02:00.000Z",
      versionNumber: 3,
      versionStatus: "candidate",
      notes: "Introduced the concluded-without-final-action fallback for interactions with no outcome.",
      promptDiff: {
        added: 3,
        removed: 1,
        lines: [
          { type: "remove", text: "Keep it brief." },
          { type: "add", text: "3. If no definitive outcome was reached, Resolution must read \"Interaction concluded without final action.\" followed by outstanding items." },
          { type: "add", text: "6. Keep the summary under 200 words." },
          { type: "add", text: "2. Only record an action under Actions Completed if it was fully completed during the interaction." },
        ],
        isFirst: false,
        unavailable: false,
      },
      passRateDelta: 0,
      weightedScoreDelta: 0.07,
      testCaseDeltas: [
        { name: "TC-Structure-And-Sections", from: 0.6, to: 0.8 },
        { name: "TC-Content-Accuracy", from: 0.4, to: 0.6 },
        { name: "TC-Compliance-And-Style", from: 0.4, to: 0.4 },
      ],
      requirementDeltas: [
        { name: "BR-Acme_CallSummary-008", from: 0.6, to: 0.8 },
        { name: "BR-Acme_CallSummary-012", from: 0.6, to: 0.8 },
      ],
      testSetChanged: true,
    },
    {
      runNumber: 3,
      finalizedAt: "2026-08-29T11:20:00.000Z",
      versionNumber: 2,
      versionStatus: "deployed",
      notes: "Deployed version 2 after prompt test in run 2.",
      promptDiff: { added: 0, removed: 0, lines: [], isFirst: false, unavailable: false },
      passRateDelta: 0,
      weightedScoreDelta: 0.02,
      testCaseDeltas: [{ name: "TC-Compliance-And-Style", from: 0.2, to: 0.4 }],
      requirementDeltas: [{ name: "BR-Acme_CallSummary-012", from: 0.4, to: 0.6 }],
      testSetChanged: false,
    },
    {
      runNumber: 2,
      finalizedAt: "2026-08-28T16:45:00.000Z",
      versionNumber: 2,
      versionStatus: "candidate",
      notes: "Switched customer to customer throughout and named the four sections explicitly.",
      promptDiff: {
        added: 2,
        removed: 1,
        lines: [
          { type: "remove", text: "Refer to the customer as the customer." },
          { type: "add", text: "1. Refer to the external participant as the customer." },
          { type: "add", text: "Produce exactly four sections, in this order, using these headings verbatim:" },
        ],
        isFirst: false,
        unavailable: false,
      },
      passRateDelta: 0.2,
      weightedScoreDelta: 0.11,
      testCaseDeltas: [
        { name: "TC-Structure-And-Sections", from: 0.4, to: 0.6 },
        { name: "TC-Content-Accuracy", from: 0.2, to: 0.4 },
      ],
      requirementDeltas: [{ name: "BR-Acme_CallSummary-012", from: 0.0, to: 0.4 }],
      testSetChanged: false,
    },
    {
      runNumber: 1,
      finalizedAt: "2026-08-27T10:05:00.000Z",
      versionNumber: 1,
      versionStatus: "deployed",
      notes: "Baseline measurement of the live prompt.",
      promptDiff: { added: 0, removed: 0, lines: [], isFirst: true, unavailable: false },
      passRateDelta: null,
      weightedScoreDelta: null,
      testCaseDeltas: [],
      requirementDeltas: [],
      testSetChanged: false,
    },
  ];

  const watchlist: Finding[] = [
    {
      severity: "high",
      kind: "regression",
      title: "Outcomes not overstated as complete regressed in run 5",
      detail:
        "This weight-5 dimension fell from 80% to 60% while the overall pass rate rose 20 points. " +
        "The version 4 prompt added the PII and prohibited-word rules but did not touch the outcome rules.",
      evidence: [
        "Resolution states the fulfilment team will make contact within five business days — a future commitment recorded as the resolution rather than an outstanding item.",
      ],
      links: { testCase: "TC-Content-Accuracy", dimension: "Outcomes not overstated as complete", runNumber: 5 },
    },
    {
      severity: "high",
      kind: "requirement-risk",
      title: "BR-Acme_CallSummary-019 has never passed above 60%",
      detail:
        "PII compliance has improved across five runs but remains the lowest-scoring requirement in the set. " +
        "Every failure so far has been an order or card reference rather than a name or contact detail.",
      evidence: [],
      links: { requirementId: "BR-Acme_CallSummary-019" },
    },
    {
      severity: "medium",
      kind: "scoring-anomaly",
      title: "Test set composition changed at run 4",
      detail:
        "Runs 1–3 and runs 4–5 were measured against different test set compositions, so deltas across " +
        "that boundary compare different populations. Re-run an earlier version against the current set " +
        "for a like-for-like baseline.",
      evidence: [],
      links: { runNumber: 4 },
    },
  ];

  return {
    kind: "improvements",
    generator,
    config: { name: CONFIG },
    testSet: { name: TEST_SET },
    runs: runs.map((r) => ({
      runNumber: r.runNumber,
      finalizedAt: changelog.find((c) => c.runNumber === r.runNumber)?.finalizedAt ?? null,
      mode: r.mode,
      promptVersion: { number: r.version, status: r.status },
      passRate: r.passRate,
      weightedScore: r.weightedScore,
      averageScore: r.averageScore,
      transcriptsEvaluated: r.n,
      skippedCount: r.skipped,
      testSetSignature: r.sig,
      dashboardHref: `./${String(r.runNumber).padStart(4, "0")}/dashboard.html`,
    })),
    changelog,
    testCaseSeries,
    requirementSeries,
    watchlist,
  };
}
