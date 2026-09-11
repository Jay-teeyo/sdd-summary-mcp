import fs from "fs";
import path from "path";
import { getStorageDir, getLifecycleDir } from "./config.js";
import type {
  StoredTranscript,
  Rubric,
  TestRun,
  TestCase,
  TestSet,
  EvalRunMeta,
  EvalRunPendingMeta,
  EvalRunResult,
  TestCaseEvalFile,
  VersionSnapshot,
  SummarySetting,
} from "./types.js";

// ─── Generic helpers ──────────────────────────────────────────────────────────

function ensureDir(d: string): string {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function writeJson<T>(p: string, data: T): void {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}

function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
}

function listJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => f.replace(/\.json$/, ""));
}

// ─── Legacy global directories (.sdd-summary) ────────────────────────────────

function legacyDir(subdir: string): string {
  return ensureDir(path.join(getStorageDir(), subdir));
}

function legacyFilePath(baseDir: () => string, id: string): string {
  return path.join(baseDir(), `${id}.json`);
}

function legacyRubricsDir() { return legacyDir("rubrics"); }
function legacyTestRunsDir() { return legacyDir("test-runs"); }
function legacyDashboardsDir() { return legacyDir("dashboards"); }

// ─── Legacy: Rubrics (kept for backward compatibility) ────────────────────────

export function saveRubric(r: Rubric): void {
  writeJson(legacyFilePath(legacyRubricsDir, r.id), r);
}

export function getRubric(id: string): Rubric | null {
  const p = legacyFilePath(legacyRubricsDir, id);
  if (!fs.existsSync(p)) return null;
  return readJson<Rubric>(p);
}

export function listRubrics(): Rubric[] {
  return listJsonFiles(legacyRubricsDir())
    .map((id) => readJson<Rubric>(legacyFilePath(legacyRubricsDir, id)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Legacy: Test runs (kept for backward compatibility) ──────────────────────

export function saveTestRun(run: TestRun): void {
  writeJson(legacyFilePath(legacyTestRunsDir, run.id), run);
}

export function getTestRun(id: string): TestRun | null {
  const p = legacyFilePath(legacyTestRunsDir, id);
  if (!fs.existsSync(p)) return null;
  return readJson<TestRun>(p);
}

export function listTestRuns(summarySettingId?: string): TestRun[] {
  const all = listJsonFiles(legacyTestRunsDir())
    .map((id) => readJson<TestRun>(legacyFilePath(legacyTestRunsDir, id)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (summarySettingId) {
    return all.filter((r) => r.summarySettingId === summarySettingId);
  }
  return all;
}

// ─── Legacy: Dashboards ───────────────────────────────────────────────────────

export function saveDashboard(id: string, html: string): string {
  const d = legacyDashboardsDir();
  const p = path.join(d, `${id}.html`);
  fs.writeFileSync(p, html, "utf-8");
  return p;
}

// ─── Lifecycle directory helpers ──────────────────────────────────────────────

/**
 * Returns (and creates) the root directory for a named summary configuration.
 * e.g. .summaryconfig-lifecycle/Acme_Sandbox/
 */
export function lifecycleConfigDir(configName: string): string {
  return ensureDir(path.join(getLifecycleDir(), configName));
}

function lcDir(configName: string, subdir: string): string {
  return ensureDir(path.join(lifecycleConfigDir(configName), subdir));
}

function staticTranscriptsDir(configName: string) { return lcDir(configName, "transcripts/static"); }
function dynamicTranscriptsDir(configName: string) { return lcDir(configName, "transcripts/dynamic"); }
function testCasesDir(configName: string) { return lcDir(configName, "test-cases"); }
function testSetsDir(configName: string) { return lcDir(configName, "test-sets"); }
function versionHistoryDir(configName: string) { return lcDir(configName, "version-history"); }
function requirementsArtefactsDir(configName: string) { return lcDir(configName, "requirements/artefacts"); }
function requirementsFinalDir(configName: string) { return lcDir(configName, "requirements/final"); }

/**
 * Creates the full lifecycle workspace for a summary configuration in one shot:
 *   transcripts/static, transcripts/dynamic
 *   test-cases, test-sets, eval-runs
 *   version-history
 *   requirements/artefacts, requirements/final
 */
export function ensureAllLifecycleDirs(configName: string): void {
  staticTranscriptsDir(configName);
  dynamicTranscriptsDir(configName);
  testCasesDir(configName);
  testSetsDir(configName);
  evalRunsBaseDir(configName);
  versionHistoryDir(configName);
  requirementsArtefactsDir(configName);
  requirementsFinalDir(configName);
}

/**
 * Saves the initial (v0) snapshot of a summary configuration.
 * Only writes if v0 does not already exist, so it is safe to call on every
 * build_interaction_filter run without overwriting a manually-saved v0.
 */
export function saveInitialVersionSnapshot(
  configName: string,
  setting: SummarySetting,
): VersionSnapshot | null {
  const d = versionHistoryDir(configName);
  const v0Path = path.join(d, "summary-configuration-0.json");
  if (fs.existsSync(v0Path)) return null;
  const snapshot: VersionSnapshot = {
    version: 0,
    setting,
    notes: "Initial snapshot — captured automatically when workspace was created.",
    snapshotAt: new Date().toISOString(),
  };
  writeJson(v0Path, snapshot);
  return snapshot;
}

function evalRunsBaseDir(configName: string) { return lcDir(configName, "eval-runs"); }
function evalRunsTestSetDir(configName: string, testSetName: string): string {
  return ensureDir(path.join(evalRunsBaseDir(configName), testSetName));
}
function evalRunDir(configName: string, testSetName: string, runNumber: number): string {
  return ensureDir(path.join(evalRunsTestSetDir(configName, testSetName), String(runNumber).padStart(4, "0")));
}

// ─── Preview cache (for prompt_test batched generation) ───────────────────────

export type PreviewCache = Record<string, string>; // transcriptId → generatedSummary

function previewCachePath(configName: string, testSetName: string, versionNumber: number): string {
  return path.join(evalRunsTestSetDir(configName, testSetName), `.preview-cache-v${versionNumber}.json`);
}

export function loadPreviewCache(
  configName: string,
  testSetName: string,
  versionNumber: number,
): PreviewCache {
  const p = previewCachePath(configName, testSetName, versionNumber);
  return fs.existsSync(p) ? readJson<PreviewCache>(p) : {};
}

export function savePreviewCache(
  configName: string,
  testSetName: string,
  versionNumber: number,
  cache: PreviewCache,
): void {
  writeJson(previewCachePath(configName, testSetName, versionNumber), cache);
}

export function clearPreviewCache(
  configName: string,
  testSetName: string,
  versionNumber: number,
): void {
  const p = previewCachePath(configName, testSetName, versionNumber);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// ─── Lifecycle: Transcripts ───────────────────────────────────────────────────

export function saveLifecycleTranscript(
  configName: string,
  transcript: StoredTranscript,
): void {
  const dir = transcript.transcriptType === "dynamic"
    ? dynamicTranscriptsDir(configName)
    : staticTranscriptsDir(configName);
  writeJson(path.join(dir, `${transcript.id}.json`), transcript);
}

export function getLifecycleTranscript(
  configName: string,
  id: string,
): StoredTranscript | null {
  // Check static first, then dynamic
  for (const dir of [staticTranscriptsDir(configName), dynamicTranscriptsDir(configName)]) {
    const p = path.join(dir, `${id}.json`);
    if (fs.existsSync(p)) return readJson<StoredTranscript>(p);
  }
  return null;
}

export function listLifecycleTranscripts(
  configName: string,
  type?: "static" | "dynamic",
): StoredTranscript[] {
  const dirs: Array<() => string> = [];
  if (!type || type === "static") dirs.push(() => staticTranscriptsDir(configName));
  if (!type || type === "dynamic") dirs.push(() => dynamicTranscriptsDir(configName));

  const all: StoredTranscript[] = [];
  for (const getDir of dirs) {
    const d = getDir();
    listJsonFiles(d).forEach((id) => {
      all.push(readJson<StoredTranscript>(path.join(d, `${id}.json`)));
    });
  }
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Update a dynamic transcript in place (e.g. to add a generated summary or edited summary). */
export function updateDynamicTranscript(
  configName: string,
  transcript: StoredTranscript,
): void {
  const p = path.join(dynamicTranscriptsDir(configName), `${transcript.id}.json`);
  if (!fs.existsSync(p)) throw new Error(`Dynamic transcript not found: ${transcript.id}`);
  writeJson(p, transcript);
}

// ─── Lifecycle: Test Cases ────────────────────────────────────────────────────

export function saveTestCase(configName: string, testCase: TestCase): void {
  writeJson(path.join(testCasesDir(configName), `${testCase.name}.json`), testCase);
}

export function getTestCase(configName: string, name: string): TestCase | null {
  const p = path.join(testCasesDir(configName), `${name}.json`);
  if (!fs.existsSync(p)) return null;
  return readJson<TestCase>(p);
}

export function listTestCases(configName: string): TestCase[] {
  const d = testCasesDir(configName);
  return listJsonFiles(d)
    .map((name) => readJson<TestCase>(path.join(d, `${name}.json`)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Lifecycle: Test Sets ─────────────────────────────────────────────────────

export function saveTestSet(configName: string, testSet: TestSet): void {
  writeJson(path.join(testSetsDir(configName), `${testSet.name}.json`), testSet);
}

export function getTestSet(configName: string, name: string): TestSet | null {
  const p = path.join(testSetsDir(configName), `${name}.json`);
  if (!fs.existsSync(p)) return null;
  return readJson<TestSet>(p);
}

export function listTestSets(configName: string): TestSet[] {
  const d = testSetsDir(configName);
  return listJsonFiles(d)
    .map((name) => readJson<TestSet>(path.join(d, `${name}.json`)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Lifecycle: Eval Runs ─────────────────────────────────────────────────────

/** Returns the next incremental run number for a given test set (1-based). */
export function getNextRunNumber(configName: string, testSetName: string): number {
  const d = evalRunsTestSetDir(configName, testSetName);
  const existing = fs.readdirSync(d)
    .filter((f) => fs.statSync(path.join(d, f)).isDirectory())
    .map((f) => parseInt(f, 10))
    .filter((n) => !isNaN(n));
  return existing.length === 0 ? 1 : Math.max(...existing) + 1;
}

export function saveEvalRun(
  configName: string,
  testSetName: string,
  runNumber: number,
  meta: EvalRunMeta,
  results: EvalRunResult[],
): void {
  const dir = evalRunDir(configName, testSetName, runNumber);
  writeJson(path.join(dir, "_meta.json"), meta);
  for (const result of results) {
    writeJson(path.join(dir, `${result.testCaseName}.json`), result);
  }
}

export function getEvalRunMeta(
  configName: string,
  testSetName: string,
  runNumber: number,
): EvalRunMeta | null {
  const p = path.join(evalRunDir(configName, testSetName, runNumber), "_meta.json");
  if (!fs.existsSync(p)) return null;
  return readJson<EvalRunMeta>(p);
}

export function getEvalRunResults(
  configName: string,
  testSetName: string,
  runNumber: number,
): EvalRunResult[] {
  const dir = evalRunDir(configName, testSetName, runNumber);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    // `_`-prefixed files are run metadata (`_meta.json`, `_pending.json`), not results.
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .flatMap((f) => {
      const parsed = readJson<EvalRunResult | TestCaseEvalFile>(path.join(dir, f));
      // The legacy flow wrote one EvalRunResult per file; the start/submit/finalize
      // flow writes a TestCaseEvalFile that wraps many results under `results`.
      return Array.isArray((parsed as TestCaseEvalFile).results)
        ? (parsed as TestCaseEvalFile).results
        : [parsed as EvalRunResult];
    });
}

export function listEvalRuns(
  configName: string,
  testSetName?: string,
): Array<EvalRunMeta & { runNumber: number }> {
  const baseDir = evalRunsBaseDir(configName);
  if (!fs.existsSync(baseDir)) return [];

  const testSets = testSetName
    ? [testSetName]
    : fs.readdirSync(baseDir).filter((f) => fs.statSync(path.join(baseDir, f)).isDirectory());

  const runs: Array<EvalRunMeta & { runNumber: number }> = [];
  for (const ts of testSets) {
    const tsDir = path.join(baseDir, ts);
    if (!fs.existsSync(tsDir)) continue;
    const runDirs = fs.readdirSync(tsDir)
      .filter((f) => fs.statSync(path.join(tsDir, f)).isDirectory())
      .sort();
    for (const rDir of runDirs) {
      const runNumber = parseInt(rDir, 10);
      const metaPath = path.join(tsDir, rDir, "_meta.json");
      if (fs.existsSync(metaPath)) {
        const meta = readJson<EvalRunMeta>(metaPath);
        runs.push({ ...meta, runNumber });
        continue;
      }
      // The start/submit/finalize flow writes `_pending.json` instead, so without
      // this fallback every run produced by the current pipeline is invisible here.
      const pendingPath = path.join(tsDir, rDir, "_pending.json");
      if (fs.existsSync(pendingPath)) {
        const pending = readJson<EvalRunPendingMeta>(pendingPath);
        // Skip runs still being scored — they have no pass rate yet.
        if (!pending.finalizedAt) continue;
        const prompt = pending.promptText ?? "";
        runs.push({
          runNumber,
          testSetName: pending.testSetName,
          summaryConfigName: pending.summaryConfigName,
          prompt,
          // This flow stores only the prompt text, not a full setting. Synthesize a
          // minimal one so consumers reading `summarySetting.prompt` still work.
          summarySetting: {
            name: pending.testSetName,
            prompt,
            language: "en-au",
            summaryType: "Concise",
            format: "TextBlock",
            maskPII: { all: false },
            predefinedInsights: [],
            settingType: "Prompt",
            serviceType: "Native",
            timeoutDuration: 20,
          },
          transcriptIds: pending.transcriptIds,
          testCaseNames: pending.testCaseNames,
          aggregatePassRate: pending.aggregatePassRate ?? 0,
          createdAt: pending.startedAt,
        });
      }
    }
  }
  return runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ─── Lifecycle: Version History ───────────────────────────────────────────────

// ─── Lifecycle: Stateless Eval Run (start/submit/finalize) ───────────────────

/**
 * Creates the eval run directory, writes the pending meta, and returns the run number.
 * Used by start_eval_run to establish a disk-backed run that subagents can write to.
 */
export function createPendingEvalRun(
  configName: string,
  testSetName: string,
  meta: Omit<EvalRunPendingMeta, "runNumber">,
): EvalRunPendingMeta {
  const runNumber = getNextRunNumber(configName, testSetName);
  const full: EvalRunPendingMeta = { ...meta, runNumber };
  const dir = evalRunDir(configName, testSetName, runNumber);
  writeJson(path.join(dir, "_pending.json"), full);
  return full;
}

export function getPendingEvalRun(
  configName: string,
  testSetName: string,
  runNumber: number,
): EvalRunPendingMeta | null {
  const p = path.join(evalRunDir(configName, testSetName, runNumber), "_pending.json");
  if (!fs.existsSync(p)) return null;
  return readJson<EvalRunPendingMeta>(p);
}

/**
 * Saves a single transcript × test case result.
 * File naming: {transcriptId}__{testCaseName}.json — safe for concurrent writes.
 */
export function saveEvalScore(
  configName: string,
  testSetName: string,
  runNumber: number,
  result: EvalRunResult,
): void {
  const dir = evalRunDir(configName, testSetName, runNumber);
  const filename = `${result.transcriptId}__${result.testCaseName}.json`;
  writeJson(path.join(dir, filename), result);
}

/**
 * Reads all per-transcript result files from a run directory.
 * Ignores _meta.json, _pending.json, and legacy {testCaseName}.json files.
 */
export function getEvalScores(
  configName: string,
  testSetName: string,
  runNumber: number,
): EvalRunResult[] {
  const dir = evalRunDir(configName, testSetName, runNumber);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json") && f.includes("__"))
    .map((f) => readJson<EvalRunResult>(path.join(dir, f)));
}

/**
 * Merges all intermediate {transcriptId}__{testCaseName}.json files into one
 * {testCaseName}.json per test case, then deletes the intermediate files.
 * Called by finalize_eval_run after all subagents have submitted their scores.
 */
export function mergeEvalScoresToTestCaseFiles(
  configName: string,
  testSetName: string,
  runNumber: number,
  testCaseNames: string[],
): TestCaseEvalFile[] {
  const dir = evalRunDir(configName, testSetName, runNumber);
  const all = getEvalScores(configName, testSetName, runNumber);
  const merged: TestCaseEvalFile[] = [];

  for (const testCaseName of testCaseNames) {
    const results = all.filter((r) => r.testCaseName === testCaseName);
    if (results.length === 0) continue;

    const passRate = results.filter((r) => r.overallPassed).length / results.length;
    const averageScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;

    const file: TestCaseEvalFile = {
      testCaseName,
      totalTranscripts: results.length,
      passRate,
      averageScore,
      results,
    };
    writeJson(path.join(dir, `${testCaseName}.json`), file);
    merged.push(file);
  }

  // Clean up intermediate per-transcript files
  fs.readdirSync(dir)
    .filter((f) => f.includes("__") && f.endsWith(".json"))
    .forEach((f) => fs.unlinkSync(path.join(dir, f)));

  return merged;
}

/**
 * Updates _pending.json with finalized aggregate stats.
 */
export function finalizePendingEvalRun(
  configName: string,
  testSetName: string,
  runNumber: number,
  aggregatePassRate: number,
  testCasePassRates: Record<string, number>,
): void {
  const p = path.join(evalRunDir(configName, testSetName, runNumber), "_pending.json");
  if (!fs.existsSync(p)) return;
  const meta = readJson<EvalRunPendingMeta>(p);
  meta.finalizedAt = new Date().toISOString();
  meta.aggregatePassRate = aggregatePassRate;
  meta.testCasePassRates = testCasePassRates;
  writeJson(p, meta);
}

/**
 * Every run on disk for a config, finalized or not, newest first.
 *
 * Unlike `listEvalRuns` this deliberately includes runs that were never finalized, because
 * an abandoned run is exactly the kind of state that makes a stale instruction look
 * plausible — "score the run" reads as valid whether the run is live or was left half
 * scored days ago.
 */
export function listRunStates(
  configName: string,
): Array<{
  testSetName: string;
  runNumber: number;
  startedAt: string;
  finalizedAt: string | null;
  mode: "existing" | "prompt_test";
  promptVersionNumber: number | null;
  promptVersionStatus: "candidate" | "deployed" | null;
  aggregatePassRate: number | null;
  transcriptsEvaluated: number;
  skippedCount: number;
}> {
  const baseDir = evalRunsBaseDir(configName);
  if (!fs.existsSync(baseDir)) return [];

  const out: ReturnType<typeof listRunStates> = [];
  for (const ts of fs.readdirSync(baseDir).filter((f) => fs.statSync(path.join(baseDir, f)).isDirectory())) {
    const tsDir = path.join(baseDir, ts);
    for (const rDir of fs.readdirSync(tsDir).filter((f) => fs.statSync(path.join(tsDir, f)).isDirectory())) {
      const pendingPath = path.join(tsDir, rDir, "_pending.json");
      if (!fs.existsSync(pendingPath)) continue;
      const m = readJson<EvalRunPendingMeta>(pendingPath);
      out.push({
        testSetName: m.testSetName,
        runNumber: m.runNumber,
        startedAt: m.startedAt,
        finalizedAt: m.finalizedAt ?? null,
        mode: m.useExistingSummaries ? "existing" : "prompt_test",
        promptVersionNumber: m.promptVersionNumber ?? null,
        promptVersionStatus: m.promptVersionStatus ?? null,
        aggregatePassRate: m.aggregatePassRate ?? null,
        transcriptsEvaluated: m.transcriptIds.length,
        skippedCount: m.skippedTranscripts?.length ?? 0,
      });
    }
  }
  return out.sort((a, b) =>
    a.testSetName === b.testSetName ? b.runNumber - a.runNumber : a.testSetName.localeCompare(b.testSetName),
  );
}

/**
 * Returns all finalized _pending.json metas for every run under a test set, sorted oldest→newest.
 */
export function readAllFinalizedRunMetas(
  configName: string,
  testSetName: string,
): EvalRunPendingMeta[] {
  const tsDir = path.join(evalRunsBaseDir(configName), testSetName);
  if (!fs.existsSync(tsDir)) return [];
  return fs.readdirSync(tsDir)
    .filter((f) => fs.statSync(path.join(tsDir, f)).isDirectory())
    .sort()
    .map((d) => {
      const p = path.join(tsDir, d, "_pending.json");
      if (!fs.existsSync(p)) return null;
      const meta = readJson<EvalRunPendingMeta>(p);
      return meta.finalizedAt ? meta : null;
    })
    .filter((m): m is EvalRunPendingMeta => m !== null);
}

/**
 * Writes improvements.html one level above the run subdirectories (at the test-set level).
 */
export function saveImprovementsDashboard(
  configName: string,
  testSetName: string,
  html: string,
): string {
  const tsDir = evalRunsTestSetDir(configName, testSetName);
  const filePath = path.join(tsDir, "improvements.html");
  fs.writeFileSync(filePath, html, "utf-8");
  return filePath;
}

/**
 * Writes rollup.html at the test-set level, alongside improvements.html.
 */
export function saveRollupReport(configName: string, testSetName: string, html: string): string {
  const filePath = path.join(evalRunsTestSetDir(configName, testSetName), "rollup.html");
  fs.writeFileSync(filePath, html, "utf-8");
  return filePath;
}

/**
 * The authored part of the rollup, kept next to the runs it describes.
 *
 * Stored as data rather than baked into the HTML so the rollup stays a derived artefact
 * like every other report: the narrative is the record, and the page can be re-rendered
 * from it with a newer template.
 */
export function saveRollupNarrative(
  configName: string,
  testSetName: string,
  narrative: unknown,
): string {
  const filePath = path.join(evalRunsTestSetDir(configName, testSetName), "rollup.json");
  writeJson(filePath, narrative);
  return filePath;
}

export function loadRollupNarrative<T>(configName: string, testSetName: string): T | null {
  const filePath = path.join(evalRunsTestSetDir(configName, testSetName), "rollup.json");
  return fs.existsSync(filePath) ? readJson<T>(filePath) : null;
}

/**
 * Writes improvements.md into the eval run directory and returns the path.
 * Called by save_improvement_recommendations after the agent has written its analysis.
 */
export function saveImprovementRecommendations(
  configName: string,
  testSetName: string,
  runNumber: number,
  markdown: string,
): string {
  const dir = evalRunDir(configName, testSetName, runNumber);
  const filePath = path.join(dir, "improvements.md");
  fs.writeFileSync(filePath, markdown, "utf-8");
  return filePath;
}

/**
 * Writes a dashboard HTML file into the eval run directory and returns the path.
 */
export function saveEvalRunDashboard(
  configName: string,
  testSetName: string,
  runNumber: number,
  html: string,
): string {
  const dir = evalRunDir(configName, testSetName, runNumber);
  const filePath = path.join(dir, "dashboard.html");
  fs.writeFileSync(filePath, html, "utf-8");
  return filePath;
}

/**
 * Reads all finalized {TestCaseName}.json files for an eval run.
 * Returns null if the run has not been finalized yet.
 */
export function readFinalizedEvalRun(
  configName: string,
  testSetName: string,
  runNumber: number,
): { meta: EvalRunPendingMeta; testCaseFiles: TestCaseEvalFile[] } | null {
  const dir = evalRunDir(configName, testSetName, runNumber);
  const metaPath = path.join(dir, "_pending.json");
  if (!fs.existsSync(metaPath)) return null;
  const meta = readJson<EvalRunPendingMeta>(metaPath);
  if (!meta.finalizedAt) return null;

  const testCaseFiles: TestCaseEvalFile[] = meta.testCaseNames
    .map((name) => {
      const p = path.join(dir, `${name}.json`);
      return fs.existsSync(p) ? readJson<TestCaseEvalFile>(p) : null;
    })
    .filter((f): f is TestCaseEvalFile => f !== null);

  return { meta, testCaseFiles };
}

// ─── Lifecycle: Version History ───────────────────────────────────────────────

export function getLatestVersionNumber(configName: string): number {
  const d = versionHistoryDir(configName);
  const existing = listJsonFiles(d)
    .map((name) => {
      const match = name.match(/summary-configuration-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => n > 0);
  return existing.length === 0 ? 0 : Math.max(...existing);
}

export function saveVersionSnapshot(
  configName: string,
  setting: SummarySetting,
  notes?: string,
  status?: "candidate" | "deployed",
): VersionSnapshot {
  const version = getLatestVersionNumber(configName) + 1;
  const snapshot: VersionSnapshot = {
    version,
    status,
    setting,
    notes,
    snapshotAt: new Date().toISOString(),
  };
  const d = versionHistoryDir(configName);
  writeJson(path.join(d, `summary-configuration-${version}.json`), snapshot);
  return snapshot;
}

export function listVersionSnapshots(configName: string): VersionSnapshot[] {
  const d = versionHistoryDir(configName);
  return listJsonFiles(d)
    .filter((name) => name.startsWith("summary-configuration-"))
    .map((name) => readJson<VersionSnapshot>(path.join(d, `${name}.json`)))
    .sort((a, b) => a.version - b.version);
}

// ─── Lifecycle: List configs ──────────────────────────────────────────────────

/** List all summary configuration names that have a lifecycle directory. */
export function listLifecycleConfigs(): string[] {
  const base = getLifecycleDir();
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base)
    .filter((f) => fs.statSync(path.join(base, f)).isDirectory());
}

// ─── Lifecycle: Interaction filter ───────────────────────────────────────────

export interface InteractionFilter {
  summaryConfigName: string;
  summarySettingId: string;
  /** Language code for the chosen summary setting, e.g. "en-au". Present when multi-language. */
  summaryLanguage?: string;
  builtAt: string;
  copilots: Array<{
    assistantId: string;
    assistantName: string;
    queues: Array<{ id: string; name: string }>;
  }>;
  /** Flat list of all queue IDs across all linked copilots — use this for conversation search. */
  queueIds: string[];
}

export function saveInteractionFilter(
  configName: string,
  filter: InteractionFilter,
): void {
  const filePath = path.join(lifecycleConfigDir(configName), "interaction-filter.json");
  fs.writeFileSync(filePath, JSON.stringify(filter, null, 2));
}

export function loadInteractionFilter(configName: string): InteractionFilter | null {
  const filePath = path.join(lifecycleConfigDir(configName), "interaction-filter.json");
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as InteractionFilter;
}
