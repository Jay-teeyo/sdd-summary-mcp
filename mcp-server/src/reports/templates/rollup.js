/* Rollup views — the closing account of one improvement cycle.

   Two things separate this from the improvements report. It is anchored on the version that
   was actually implemented rather than on the latest run, because those are often different
   runs; and it carries an authored narrative, which is rendered but never invented here. */

function impl() { return MODEL.implemented; }

/** The run the cycle closed on: the implemented one, or the last one if nothing shipped. */
function closingRun() {
  for (var i = 0; i < MODEL.runs.length; i++) {
    if (MODEL.runs[i].implemented) return MODEL.runs[i];
  }
  return MODEL.runs[MODEL.runs.length - 1];
}

function versionLabel(n) { return n === null || n === undefined ? "v?" : "v" + n; }

/** True when the implemented version is not the highest scoring one — worth stating plainly. */
function shippedIsNotBest() {
  var i = impl();
  if (!i || !MODEL.best || i.runNumber === null) return false;
  return MODEL.best.runNumber !== i.runNumber;
}

/* ── Trend chart ────────────────────────────────────────────────────────── */

function trendChart() {
  var runs = MODEL.runs;
  var W = 900, H = 250, padL = 42, padR = 16, padT = 20, padB = 50;
  var innerW = W - padL - padR, innerH = H - padT - padB;
  var n = runs.length;

  function x(i) { return n === 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW; }
  function y(v) { return padT + innerH - v * innerH; }

  var grid = "";
  for (var g = 0; g <= 4; g++) {
    var gv = g / 4;
    grid += '<line x1="' + padL + '" y1="' + y(gv) + '" x2="' + (W - padR) + '" y2="' + y(gv) +
      '" stroke="rgba(21,37,80,0.10)" stroke-width="1"/>' +
      '<text x="' + (padL - 8) + '" y="' + (y(gv) + 4) + '" fill="#8a92a6" font-size="10" font-family="Roboto Mono, monospace" text-anchor="end">' +
      Math.round(gv * 100) + "%</text>";
  }

  var pts = [], dots = "", labels = "", marks = "";
  for (var i = 0; i < n; i++) {
    var r = runs[i], v = r.passRate;
    if (v === null) continue;
    pts.push(x(i) + "," + y(v));

    // The implemented run is ringed rather than recoloured, so the colour still reads as
    // its score and the ring reads as "this is the one that shipped".
    if (r.implemented) {
      dots += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="11" fill="none" stroke="#152550" stroke-width="2"/>';
      marks += '<line x1="' + x(i) + '" y1="' + padT + '" x2="' + x(i) + '" y2="' + (padT + innerH) +
        '" stroke="#152550" stroke-width="1" stroke-dasharray="3 4" opacity="0.45"/>' +
        '<text x="' + (x(i) - 6) + '" y="' + (padT + 11) + '" fill="#152550" font-size="9" font-weight="800" text-anchor="end" letter-spacing="0.8">IMPLEMENTED</text>';
    } else if (r.best && shippedIsNotBest()) {
      marks += '<text x="' + x(i) + '" y="' + (y(v) - 14) + '" fill="#a8730a" font-size="9" font-weight="800" text-anchor="middle" letter-spacing="0.8">BEST</text>';
    }

    dots += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="5" fill="' + colour(v) +
      '" stroke="#ffffff" stroke-width="2.5"><title>Run ' + r.runNumber + " \u2014 " + pct(v) + "</title></circle>";
    labels += '<text x="' + x(i) + '" y="' + (H - padB + 19) + '" fill="#152550" font-size="11" font-weight="700" text-anchor="middle">' +
      r.runNumber + "</text>" +
      '<text x="' + x(i) + '" y="' + (H - padB + 32) + '" fill="#8a92a6" font-size="9" font-family="Roboto Mono, monospace" text-anchor="middle">' +
      versionLabel(r.promptVersion.number) + "</text>";
  }

  return '<div class="chart"><svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">' +
    grid + marks +
    '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#2243a2" stroke-width="2.5" stroke-linejoin="round"/>' +
    dots + labels +
    '<text x="' + padL + '" y="' + (H - 5) + '" fill="#8a92a6" font-size="9" font-weight="700" letter-spacing="1">RUN / PROMPT VERSION</text>' +
    "</svg>" +
    '<div class="legend"><span>Overall pass rate across ' + MODEL.runs.length + " runs</span>" +
    (impl() ? '<span>ringed = version implemented in Genesys</span>' : "") +
    (shippedIsNotBest() ? '<span style="color:#a8730a">the highest scoring run is not the one implemented</span>' : "") +
    "</div></div>";
}

/* ── Overview ───────────────────────────────────────────────────────────── */

function viewOverview() {
  setTab("overview");
  var h = MODEL.headline, i = impl(), closing = closingRun();

  var out = '<div class="metrics">' +
    '<div class="metric"><div class="val" style="color:' + colour(h.baselinePassRate) + '">' + pct(h.baselinePassRate) +
    '</div><div class="lbl">Baseline</div><div class="note">run ' + MODEL.baseline.runNumber + " \u00b7 " +
    versionLabel(MODEL.baseline.versionNumber) + " as production had it</div></div>" +

    '<div class="metric primary"><div class="val" style="color:' + colour(h.implementedPassRate) + '">' + pct(h.implementedPassRate) +
    '</div><div class="lbl">' + (i ? "Implemented" : "Latest") + '</div><div class="note">' +
    (i ? versionLabel(i.versionNumber) + " \u00b7 measured by run " + (i.runNumber === null ? "\u2014" : i.runNumber)
       : "run " + closing.runNumber + " \u00b7 nothing deployed yet") + "</div></div>" +

    '<div class="metric"><div class="val" style="color:' + (h.delta === null ? "var(--navy)" : h.delta >= 0 ? "var(--patina-deep)" : "var(--orange)") + '">' +
    (h.delta === null ? "\u2014" : (h.delta >= 0 ? "+" : "\u2212") + pct(Math.abs(h.delta))) +
    '</div><div class="lbl">Movement</div><div class="note">overall pass rate, baseline to implemented</div></div>' +

    '<div class="metric"><div class="val">' + h.testCasesImproved + "<span style=\"color:var(--faint);font-size:18px\"> / " +
    (h.testCasesImproved + h.testCasesHeld + h.testCasesRegressed) + '</span></div><div class="lbl">Test cases improved</div>' +
    '<div class="note">' + h.testCasesHeld + " held \u00b7 " + h.testCasesRegressed + " regressed</div></div>" +

    '<div class="metric"><div class="val">' + MODEL.runs.length + '</div><div class="lbl">Runs</div>' +
    '<div class="note">' + (MODEL.period.from ? date(MODEL.period.from) + " \u2192 " + date(MODEL.period.to) : "\u2014") + "</div></div></div>";

  if (MODEL.narrative && MODEL.narrative.executiveSummary) {
    out += '<div class="section"><h2>Executive summary</h2><div class="panel prose">' +
      paras(MODEL.narrative.executiveSummary) + "</div></div>";
  } else {
    out += '<div class="section"><h2>Executive summary</h2><div class="panel empty">' +
      "No narrative has been recorded for this cycle. Call generate_rollup_report with the " +
      "executive summary, themes and next steps to author it \u2014 the measurements below are " +
      "rebuilt from the runs either way.</div></div>";
  }

  out += '<div class="section"><h2>Overall pass rate by run</h2>' + trendChart() + "</div>";
  out += '<div class="section"><h2>What shipped</h2>' + deploymentPanel() + "</div>";
  out += '<div class="section"><h2>Baseline \u2192 implemented <span class="hint">per test case, run ' +
    MODEL.baseline.runNumber + " versus run " + closing.runNumber + '</span></h2>' + deltaTable() + "</div>";

  if (MODEL.outstanding.length) {
    out += '<div class="section"><h2>Still open <span class="hint">unresolved in the implemented run</span></h2>';
    for (var w = 0; w < MODEL.outstanding.length; w++) out += findingCard(MODEL.outstanding[w]);
    out += "</div>";
  }

  out += '<div class="section"><h2>Runs</h2>' + runTable() + "</div>";
  mount(out);
}

/** Renders authored prose as paragraphs. Escaped first — narrative is text, not markup. */
function paras(text) {
  var blocks = String(text || "").split(/\n\s*\n/);
  var out = "";
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].replace(/\s/g, "") === "") continue;
    out += "<p>" + esc(blocks[i].replace(/\s*\n\s*/g, " ")) + "</p>";
  }
  return out;
}

function deploymentPanel() {
  var i = impl();
  if (!i) {
    return '<div class="panel empty">No candidate from this cycle is live in Genesys. The newest ' +
      "deployed snapshot is still the prompt production started with, so this rollup describes " +
      "measured work that has not been implemented.</div>";
  }

  var rows = [
    ["Implemented version", versionLabel(i.versionNumber) + (i.matchedBy === "unmatched"
      ? ' <span class="chip warn">no matching candidate</span>'
      : ' <span class="chip deployed">live in Genesys</span>')],
    ["Deployed", date(i.deployedAt, true) + ' <span class="mono">snapshot ' + i.deployedSnapshotVersion + "</span>"],
    ["Evidence", i.runNumber === null
      ? '<span class="empty">no run measured this prompt</span>'
      : 'run ' + i.runNumber + " \u2014 " + pct(i.passRate) +
        ' <a class="btn" href="' + esc(runHref(i.runNumber)) + '">Open run \u2192</a>'],
    ["Rollback point", i.rollbackVersion === null
      ? '<span class="empty">none recorded</span>'
      : 'version-history snapshot ' + i.rollbackVersion + " holds the replaced prompt"],
  ];

  var out = '<table class="data"><tbody>';
  for (var r = 0; r < rows.length; r++) {
    out += '<tr><td style="width:190px;color:var(--muted)">' + rows[r][0] + "</td><td>" + rows[r][1] + "</td></tr>";
  }
  out += "</tbody></table>";

  if (i.notes) out += '<div class="panel prose" style="margin-top:12px">' + paras(i.notes) + "</div>";

  if (shippedIsNotBest()) {
    out += '<div class="finding medium" style="margin-top:12px"><div class="kind">Worth knowing</div>' +
      "<h3>The implemented version is not the highest scoring one</h3><p>Run " + MODEL.best.runNumber +
      " (" + versionLabel(MODEL.best.versionNumber) + ") scored " + pct(MODEL.best.passRate) + ", above the " +
      pct(i.passRate) + " of run " + i.runNumber + " which measured what shipped. That can be the right call \u2014 a " +
      "higher headline can hide a regression on a heavier requirement \u2014 but it is stated here so the choice is " +
      "visible rather than implied.</p></div>";
  }
  return out;
}

function deltaTable() {
  var out = '<table class="data"><thead><tr><th>Test case</th><th class="num">Baseline</th>' +
    '<th class="num">Implemented</th><th class="mid">Movement</th></tr></thead><tbody>';

  var rows = MODEL.baselineToImplemented.slice().sort(function (a, b) {
    var da = (a.from === null || a.to === null) ? 0 : a.to - a.from;
    var db = (b.from === null || b.to === null) ? 0 : b.to - b.from;
    return db - da;
  });

  for (var i = 0; i < rows.length; i++) {
    var d = rows[i];
    var move = (d.from === null || d.to === null) ? null : d.to - d.from;
    out += "<tr><td>" + esc(pretty(d.name)) + "</td>" +
      '<td class="num" style="color:' + colour(d.from) + '">' + pct(d.from) + "</td>" +
      '<td class="num" style="color:' + colour(d.to) + '">' + pct(d.to) + "</td>" +
      '<td class="mid">' + (deltaTag(move) || '<span class="empty">not comparable</span>') + "</td></tr>";
  }
  return out + "</tbody></table>";
}

var KIND_LABELS = {
  "dimension-failure": "Rubric dimension",
  "requirement-risk": "Requirement at risk",
  "regression": "Regression",
  "coverage-gap": "Coverage gap",
  "scoring-anomaly": "Scoring anomaly",
};

function findingCard(f) {
  var ev = "";
  if (f.evidence && f.evidence.length) {
    ev = "<ul>";
    for (var i = 0; i < f.evidence.length; i++) ev += "<li>" + esc(f.evidence[i]) + "</li>";
    ev += "</ul>";
  }
  return '<div class="finding ' + f.severity + '"><div class="kind">' + esc(KIND_LABELS[f.kind] || f.kind) +
    "</div><h3>" + esc(f.title) + "</h3><p>" + esc(f.detail) + "</p>" + ev + "</div>";
}

function runHref(runNumber) {
  for (var i = 0; i < MODEL.runs.length; i++) {
    if (MODEL.runs[i].runNumber === runNumber) return MODEL.runs[i].dashboardHref;
  }
  return "#";
}

function runTable() {
  var out = '<table class="data"><thead><tr><th></th><th>Run</th><th>Date</th><th>Mode</th><th>Version</th>' +
    '<th>Pass rate</th><th class="num">Weighted</th><th class="mid">Interactions</th><th></th></tr></thead><tbody>';

  for (var i = MODEL.runs.length - 1; i >= 0; i--) {
    var r = MODEL.runs[i];
    var prev = i > 0 ? MODEL.runs[i - 1] : null;
    var delta = (prev && r.passRate !== null && prev.passRate !== null) ? r.passRate - prev.passRate : null;
    var flag = r.implemented
      ? '<span class="chip deployed">live</span>'
      : (r.best && shippedIsNotBest() ? '<span class="chip warn">best</span>' : "");

    out += '<tr' + (r.implemented ? ' class="implemented"' : "") + "><td>" + flag + "</td>" +
      "<td><strong>" + r.runNumber + "</strong></td>" +
      "<td>" + date(r.finalizedAt) + "</td>" +
      '<td style="color:var(--muted)">' + (r.mode === "existing" ? "existing" : "prompt test") + "</td>" +
      '<td><span class="chip ' + (r.promptVersion.status || "") + '">' + versionLabel(r.promptVersion.number) +
      (r.promptVersion.status ? " \u00b7 " + r.promptVersion.status : "") + "</span></td>" +
      "<td>" + bar(r.passRate) + " " + (deltaTag(delta) || "") + "</td>" +
      '<td class="num" style="color:' + colour(r.weightedScore) + '">' + score2(r.weightedScore) + "</td>" +
      '<td class="mid">' + r.transcriptsEvaluated +
      (r.skippedCount ? ' <span class="chip warn">' + r.skippedCount + " skipped</span>" : "") + "</td>" +
      '<td class="num"><a class="btn" href="' + esc(r.dashboardHref) + '">Open run \u2192</a></td></tr>';
  }

  return out + "</tbody></table>" +
    '<div class="legend"><span><a class="btn" href="improvements.html">Open the improvements report \u2192</a></span>' +
    "<span>run-by-run prompt diffs and what each change moved</span></div>";
}

/* ── Commentary ─────────────────────────────────────────────────────────── */

function viewCommentary() {
  setTab("commentary");
  var n = MODEL.narrative;

  if (!n || (!n.themes.length && !n.methodologyNotes.length && !n.nextSteps.length)) {
    mount('<div class="panel empty">No commentary has been recorded. Call generate_rollup_report ' +
      "with themes describing what was wrong, what was changed and what it bought \u2014 the numbers " +
      "are in the other tabs, but only the agent that made the changes can explain them.</div>");
    return;
  }

  var out = "";
  if (n.themes.length) {
    out += '<div class="section"><h2>Issues, approach, benefit</h2>';
    for (var i = 0; i < n.themes.length; i++) {
      var t = n.themes[i];
      out += '<div class="theme"><div class="theme-head"><h3>' + esc(t.title) + "</h3>" +
        (t.metric ? '<span class="chip">' + esc(t.metric) + "</span>" : "") + "</div>" +
        row("Issue", t.issue) + row("Approach", t.approach) + row("Benefit", t.benefit) + "</div>";
    }
    out += "</div>";
  }

  if (n.methodologyNotes.length) {
    out += '<div class="section"><h2>Notes on the measurement <span class="hint">the harness, not the prompt</span></h2>' +
      '<div class="panel prose"><ul class="notes">';
    for (var m = 0; m < n.methodologyNotes.length; m++) out += "<li>" + esc(n.methodologyNotes[m]) + "</li>";
    out += "</ul></div></div>";
  }

  if (n.nextSteps.length) {
    out += '<div class="section"><h2>Recommended next steps</h2><div class="panel prose"><ol class="notes">';
    for (var s = 0; s < n.nextSteps.length; s++) out += "<li>" + esc(n.nextSteps[s]) + "</li>";
    out += "</ol></div></div>";
  }

  out += '<div class="legend"><span>Narrative recorded ' + date(n.authoredAt, true) + "</span></div>";
  mount(out);
}

function row(label, text) {
  return '<div class="theme-row"><span class="k">' + label + '</span><div class="v">' + paras(text) + "</div></div>";
}

/* ── Matrices ───────────────────────────────────────────────────────────── */

/**
 * The run-by-run matrix. The implemented version's column is outlined: the shipped version
 * is often not the best scoring one, so the table must show which column is production
 * rather than letting the highest number imply it.
 */
function seriesTable(rows, label, withCategory) {
  if (!rows.length) return '<div class="panel empty">No data recorded.</div>';

  var implIdx = -1;
  for (var q = 0; q < MODEL.runs.length; q++) if (MODEL.runs[q].implemented) implIdx = q;

  var out = '<div class="heat-wrap"><table class="data"><thead><tr><th>' + label + "</th>";
  for (var r = 0; r < MODEL.runs.length; r++) {
    var run = MODEL.runs[r];
    out += '<th class="mid' + (r === implIdx ? " implemented" : "") + '">' + run.runNumber +
      '<div class="sub" style="font-weight:400">' + versionLabel(run.promptVersion.number) + "</div>" +
      (r === implIdx ? '<div class="flag">LIVE</div>' : "") + "</th>";
  }
  out += '<th class="mid">Baseline \u2192 live</th></tr></thead><tbody>';

  // Overall first, so the headline movement frames the per-test-case rows below it.
  out += matrixRow({ label: "Overall", key: "", series: MODEL.runs.map(function (x) { return x.passRate; }) },
    implIdx, false, true);
  for (var i = 0; i < rows.length; i++) out += matrixRow(rows[i], implIdx, withCategory, false);

  return out + "</tbody></table></div>" +
    '<div class="legend">' +
    (implIdx >= 0 ? '<span><b>Outlined column</b> = the version implemented in Genesys (run ' +
      MODEL.runs[implIdx].runNumber + ", " + versionLabel(MODEL.runs[implIdx].promptVersion.number) + ")</span>" : "") +
    "<span>values are pass rates as percentages</span></div>";
}

function matrixRow(row, implIdx, withCategory, isOverall) {
  var out = "<tr" + (isOverall ? ' class="overall"' : "") + "><td>" +
    (isOverall ? "<strong>" + esc(row.label) + "</strong>" : esc(pretty(row.label)));
  // Only show the key when it adds something — test case rows are keyed by their own name.
  if (!isOverall && row.key && row.key !== row.label) {
    out += withCategory && row.category
      ? '<div class="sub">' + esc(row.category) + " \u00b7 " + esc(row.key) + "</div>"
      : '<div class="sub mono">' + esc(row.key) + "</div>";
  } else if (!isOverall && withCategory && row.category) {
    out += '<div class="sub">' + esc(row.category) + "</div>";
  }
  out += "</td>";

  for (var j = 0; j < row.series.length; j++) {
    var v = row.series[j];
    var cls = "mid cell" + (j === implIdx ? " implemented" : "");
    if (v === null || v === undefined) {
      out += '<td class="' + cls + '" style="color:var(--faint)">\u2014</td>';
    } else {
      out += '<td class="' + cls + '" style="background:' + heatColour(v) + '">' + Math.round(v * 100) + "</td>";
    }
  }

  // Baseline to implemented, which is the movement this rollup is reporting on.
  var from = row.series[0], to = implIdx >= 0 ? row.series[implIdx] : row.series[row.series.length - 1];
  var move = (from === null || from === undefined || to === null || to === undefined) ? null : to - from;
  return out + '<td class="mid">' + (deltaTag(move) || "\u2014") + "</td></tr>";
}

function viewTestCases() {
  setTab("testcases");
  mount('<div class="section"><h2>Pass rates by run</h2>' +
    seriesTable(MODEL.testCaseSeries, "Test case", false) + "</div>");
}

function viewRequirements() {
  setTab("requirements");
  if (!MODEL.requirementSeries.length) {
    mount('<div class="panel empty">No requirement history is available \u2014 requirements.md was not ' +
      "found, or no run recorded requirement mappings.</div>");
    return;
  }
  mount('<div class="section"><h2>Requirement compliance by run <span class="hint">the same runs ' +
    'viewed through the business requirements they validate</span></h2>' +
    seriesTable(MODEL.requirementSeries, "Requirement", true) + "</div>");
}

/* ── Chrome + routes ────────────────────────────────────────────────────── */

function renderChrome() {
  var i = impl(), closing = closingRun(), h = MODEL.headline;

  document.getElementById("eyebrow").textContent = i ? "Rollup \u00b7 implemented" : "Rollup \u00b7 not yet implemented";
  // Hyphens are swapped for spaces so a long set name breaks between words in the headline.
  document.getElementById("title").innerHTML =
    esc(MODEL.config.name.replace(/_/g, "_\u200b")) + ' <span>\u00b7</span> ' +
    (i ? "shipped " + versionLabel(i.versionNumber) : "cycle to date");
  document.getElementById("subtitle").textContent =
    MODEL.testSet.name.replace(/-/g, " ") + " \u00b7 " + MODEL.runs.length + " runs \u00b7 " +
    (MODEL.period.from ? date(MODEL.period.from) + " to " + date(MODEL.period.to) : "\u2014") +
    (i && i.runNumber !== null ? " \u00b7 measured by run " + i.runNumber : "");

  setDial(h.implementedPassRate, i ? "Implemented" : "Latest run",
    h.delta === null ? "" : (h.delta >= 0 ? "+" : "\u2212") + pct(Math.abs(h.delta)) + " from baseline");
  setStamp(h.implementedPassRate, i
    ? versionLabel(i.versionNumber) + " live in Genesys"
    : "Run " + closing.runNumber + " \u00b7 nothing deployed");

  var chips = [
    '<span class="chip"><b>Baseline</b> <strong>' + pct(h.baselinePassRate) + "</strong> \u00b7 run " + MODEL.baseline.runNumber + "</span>",
    '<span class="chip ' + (i ? "deployed" : "") + '"><b>' + (i ? "Implemented" : "Latest") + "</b> <strong>" +
      pct(h.implementedPassRate) + "</strong> \u00b7 " + versionLabel(closing.promptVersion.number) + "</span>",
    '<span class="chip"><b>Test cases</b> <strong>' + h.testCasesImproved + " improved</strong>" +
      (h.testCasesRegressed ? " \u00b7 " + h.testCasesRegressed + " regressed" : "") + "</span>",
  ];
  if (shippedIsNotBest()) {
    chips.push('<span class="chip warn"><b>Best</b> <strong>' + pct(MODEL.best.passRate) +
      "</strong> \u00b7 run " + MODEL.best.runNumber + " not implemented</span>");
  }
  if (i && i.rollbackVersion !== null) {
    chips.push('<span class="chip"><b>Rollback</b> <strong>snapshot ' + i.rollbackVersion + "</strong></span>");
  }
  if (MODEL.outstanding.length) {
    chips.push('<span class="chip danger"><b>Still open</b> <strong>' + MODEL.outstanding.length + "</strong></span>");
  }
  document.getElementById("chips").innerHTML = chips.join("");

  document.getElementById("tab-counts-commentary").textContent =
    MODEL.narrative ? MODEL.narrative.themes.length : 0;
  document.getElementById("tab-counts-testcases").textContent = MODEL.testCaseSeries.length;
  document.getElementById("tab-counts-requirements").textContent = MODEL.requirementSeries.length;

  document.getElementById("foot").innerHTML =
    "<span>Generated " + date(MODEL.generator.generatedAt, true) + "</span>" +
    '<span class="mono">sdd-summary-mcp v' + esc(MODEL.generator.serverVersion) + "</span>" +
    '<span class="mono">report schema v' + MODEL.generator.schemaVersion + "</span>" +
    "<span>Self-contained \u2014 safe to copy or share as a single file</span>";
}

route("/", viewOverview);
route("/commentary", viewCommentary);
route("/testcases", viewTestCases);
route("/requirements", viewRequirements);

renderChrome();
renderRoute();
