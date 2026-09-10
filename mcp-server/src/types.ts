// ─── Genesys credentials & config ────────────────────────────────────────────

export interface GenesysConfig {
  clientId: string;
  /** Required for client_credentials flow; not needed for user login (PKCE) */
  clientSecret?: string;
  /** e.g. "mypurecloud.com.au" */
  region: string;
  /**
   * Override the login base URL used for OAuth (token exchange + authorization endpoint).
   * Defaults to https://login.{region}. Provide this when your Genesys environment uses
   * a different login domain — copy it from your OAuth client's Authorization URL in Genesys Admin,
   * stripping the path (e.g. "https://login.mypurecloud.com.au").
   */
  loginUrl?: string;
  /**
   * The last Authorization URL the user provided (from Genesys Admin → OAuth → client page).
   * Stored so that when a user token expires we can automatically re-open the browser
   * for login without asking the user to paste the URL again.
   */
  lastAuthorizationUrl?: string;
}

export interface AppConfig {
  genesys?: GenesysConfig;
  /** Stored user token from Authorization Code + PKCE flow */
  userToken?: UserToken;
  /** Optional: path to .sdd-summary directory. Defaults to CWD/.sdd-summary */
  storagePath?: string;
}

// ─── OAuth token ─────────────────────────────────────────────────────────────

export interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  /** Epoch ms when token expires */
  expiresAt: number;
}

export interface UserToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  /** Epoch ms when access_token expires */
  expiresAt: number;
}

// ─── Transcript ───────────────────────────────────────────────────────────────

export interface GeneratedSummaryRecord {
  prompt: string;
  summary: string;
  generatedAt: string;
}

export interface StoredTranscript {
  id: string;
  label: string;
  conversationId?: string;
  communicationId?: string;
  /** Plain-text "Speaker: utterance" format ready for preview API */
  plainText: string;
  /** Raw JSON from S3 (if fetched from Genesys) */
  rawJson?: unknown;
  createdAt: string;
  /** Whether this transcript is a static control-group transcript or a dynamic one */
  transcriptType?: "static" | "dynamic";
  /** Dynamic transcripts can accumulate generated summaries from different prompt versions */
  generatedSummaries?: GeneratedSummaryRecord[];
  /** Human-edited ideal summary for this transcript (for test case authoring) */
  editedSummary?: string;
  /**
   * The best existing production summary for this conversation.
   * If the agent edited the AI-generated summary, this is the agent-edited version.
   * Otherwise it is the AI-generated Agent-type summary.
   */
  existingSummary?: string;
  /**
   * The original AI-generated Agent-type summary, populated only when the agent
   * subsequently edited it (i.e. existingSummary !== aiGeneratedSummary).
   * Use this together with existingSummary for before/after comparison.
   */
  aiGeneratedSummary?: string;
}

// ─── Summary setting ──────────────────────────────────────────────────────────

export type PredefinedInsight = "ReasonForContact" | "Resolution" | "ActionItems";
export type SummaryType = "Concise" | "Detailed" | "Structured";
export type SummaryFormat = "TextBlock" | "BulletPoints";
export type SummarySettingType = "Prompt" | "PredefinedInsights";

export interface SummarySetting {
  id?: string;
  name: string;
  language: string;
  summaryType: SummaryType;
  format: SummaryFormat;
  maskPII: { all: boolean };
  predefinedInsights: PredefinedInsight[];
  settingType: SummarySettingType;
  prompt: string;
  serviceType: string;
  timeoutDuration: number;
}

// ─── Rubric ───────────────────────────────────────────────────────────────────

export interface RubricDimension {
  name: string;
  description: string;
  weight: number; // 1–5
  passCriteria: string;
  failCriteria: string;
  /** Minimum score (0–1) required to pass this dimension. Default 0.8 if omitted. */
  passThreshold?: number;
  /** Business requirement IDs this dimension validates, e.g. ["BR-Acme_CallSummary-001"] */
  requirementIds?: string[];
  /**
   * Condition that must be true for this dimension to be evaluated.
   * Use "always" (default) to evaluate unconditionally.
   * Any other string describes a conditional check: if the condition does not apply to the
   * transcript, the evaluator must submit score: null (N/A) and the dimension is excluded
   * from pass-rate and average-score calculations for that transcript.
   * Every dimension must have this field — "always" is the canonical value for
   * unconditional dimensions.
   */
  applicabilityCondition?: string;
}

export interface Rubric {
  id: string;
  name: string;
  description: string;
  dimensions: RubricDimension[];
  createdAt: string;
}

// ─── Test run ─────────────────────────────────────────────────────────────────

export interface DimensionScore {
  dimension: string;
  passed: boolean;
  /**
   * Decimal 0–1, or null when the dimension was marked not-applicable (na: true).
   * Null scores are excluded from pass-rate and average-score calculations.
   */
  score: number | null;
  /**
   * True when the dimension's applicabilityCondition was not met for this transcript.
   * N/A dimensions do not count as failures — they are excluded from all aggregation.
   */
  na: boolean;
  reasoning: string;
}

export interface TranscriptResult {
  transcriptId: string;
  transcriptLabel: string;
  summary: string;
  dimensionScores: DimensionScore[];
  overallPassed: boolean;
  overallScore: number;
}

export interface TestRun {
  id: string;
  label: string;
  summarySettingId?: string;
  summarySetting: SummarySetting;
  rubricId: string;
  transcriptIds: string[];
  results: TranscriptResult[];
  aggregatePassRate: number;
  promptVersion: number;
  previousRunId?: string;
  suggestedImprovements?: string;
  createdAt: string;
}

// ─── Conversation search result ───────────────────────────────────────────────

export interface ConversationSummary {
  conversationId: string;
  startTime: string;
  endTime?: string;
  queueName?: string;
  wrapUpCode?: string;
  durationMs?: number;
  communications: Array<{
    communicationId: string;
    type: string;
    direction?: string;
  }>;
}

// ─── Preview API response ─────────────────────────────────────────────────────

export interface PreviewSummaryResponse {
  summary?: string;
  summaryText?: string;
  insights?: Array<{ type: string; content: string }>;
  [key: string]: unknown;
}

// ─── Lifecycle: test cases ────────────────────────────────────────────────────

/**
 * A test case defines the evaluation criteria (rubric) for one scenario.
 * Stored as {name}.json in .summaryconfig-lifecycle/{configName}/test-cases/
 */
export interface TestCase {
  name: string;
  description: string;
  dimensions: RubricDimension[];
  createdAt: string;
  updatedAt?: string;
}

// ─── Lifecycle: test sets ─────────────────────────────────────────────────────

/**
 * A test set is a named playlist of test cases and the transcripts to run them against.
 * Stored as {name}.json in .summaryconfig-lifecycle/{configName}/test-sets/
 */
export interface TestSet {
  name: string;
  description?: string;
  /** Names of test cases (from test-cases/) to evaluate against */
  testCaseNames: string[];
  /** IDs of transcripts (from transcripts/static/ or dynamic/) to use */
  transcriptIds: string[];
  createdAt: string;
  updatedAt?: string;
}

// ─── Lifecycle: eval runs ─────────────────────────────────────────────────────

/**
 * Result for a single transcript × test case evaluation.
 * Written as intermediate files during parallel eval; merged into TestCaseEvalFile on finalization.
 */
export interface EvalRunResult {
  testCaseName: string;
  transcriptId: string;
  transcriptLabel: string;
  summary: string;
  dimensionScores: DimensionScore[];
  overallPassed: boolean;
  overallScore: number;
}

/**
 * Final per-test-case output file: {testCaseName}.json in the run directory.
 * Contains results for every transcript evaluated against this test case.
 */
export interface TestCaseEvalFile {
  testCaseName: string;
  totalTranscripts: number;
  passRate: number;
  averageScore: number;
  results: EvalRunResult[];
}

/**
 * Metadata for an eval run, stored as _meta.json inside the run directory.
 * Provides a quick summary without loading every test-case result file.
 */
export interface EvalRunMeta {
  runNumber: number;
  testSetName: string;
  summaryConfigName: string;
  prompt: string;
  summarySetting: SummarySetting;
  transcriptIds: string[];
  testCaseNames: string[];
  aggregatePassRate: number;
  suggestedImprovements?: string;
  createdAt: string;
}

/**
 * Metadata written to disk when start_eval_run is called.
 * Allows stateless subagents to save results without in-memory state.
 */
export interface EvalRunPendingMeta {
  runNumber: number;
  testSetName: string;
  summaryConfigName: string;
  useExistingSummaries: boolean;
  transcriptIds: string[];
  testCaseNames: string[];
  startedAt: string;
  finalizedAt?: string;
  /** Populated by finalize_eval_run */
  aggregatePassRate?: number;
  /** Per-test-case pass rates, populated by finalize_eval_run */
  testCasePassRates?: Record<string, number>;
  /**
   * The prompt text used to generate summaries for this run.
   * For prompt_test mode: the candidate prompt (from version file or inline).
   * For existing mode: the prompt from the version snapshot at run start time, if available.
   */
  promptText?: string;
  /**
   * The version number from version-history/ that corresponds to the prompt tested in this run.
   * Set when version_number is passed to start_eval_run, or resolved from the latest snapshot.
   */
  promptVersionNumber?: number;
  /**
   * Status of the version snapshot: "candidate" (local draft, not deployed) or "deployed" (was live).
   * Omitted when the prompt was provided inline without a version_number.
   */
  promptVersionStatus?: "candidate" | "deployed";
}

// ─── Lifecycle: version history ───────────────────────────────────────────────

/**
 * A snapshot of a summary configuration at a point in time.
 * Stored as summary-configuration-{version}.json in version-history/
 */
export interface VersionSnapshot {
  version: number;
  /**
   * "candidate" — authored locally, not yet deployed to Genesys.
   * "deployed"  — was live in Genesys at snapshotAt.
   * Omitted on snapshots created before this field was introduced (treat as "deployed").
   */
  status?: "candidate" | "deployed";
  setting: SummarySetting;
  notes?: string;
  snapshotAt: string;
  /**
   * Evidence trail on hand-authored candidates: which eval run exposed each issue
   * and why the change addresses it. Written directly to the version file, not by
   * save_version.
   */
  changes?: Array<{
    change: string;
    affectedDimension?: string;
    runEvidence?: string;
    reason?: string;
  }>;
}

// ─── S3 transcript format ─────────────────────────────────────────────────────

export interface S3TranscriptPhrase {
  id?: string;
  participantId?: string;
  participantPurpose?: string;
  /** "customer" | "agent" | "external" | "bot" | "ivr" etc */
  channel?: string;
  text: string;
  confidence?: number;
  words?: Array<{ word: string; startTime: number; endTime: number }>;
  startTime?: number;
  endTime?: number;
}

export interface S3Transcript {
  participants?: Array<{
    id: string;
    purpose: string;
    name?: string;
    userId?: string;
  }>;
  phrases?: S3TranscriptPhrase[];
  transcripts?: Array<{
    channel: number;
    transcript: string;
    words?: Array<{ word: string; startOffset: number; endOffset: number; confidence?: number }>;
  }>;
  [key: string]: unknown;
}
