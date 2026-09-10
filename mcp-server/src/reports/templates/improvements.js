/* Improvements dashboard views.
   Run-over-run performance, a changelog of what changed between runs, and the same
   requirements pivot as the run dashboard so compliance can be tracked over time. */

var METRIC = "passRate"; // or "weightedScore"

function metricLabel() {
  return METRIC === "passRate" ? "Pass rate" : "Weighted score";
}

/** Pass rates read as percentages; weighted scores read as 0–1 decimals. */
function metricValue(v) {
  return METRIC === "passRate" ? pct(v) : score2(v);
}

function metricToggle() {
  return '<button class="btn' + (METRIC === "passRate" ? " active" : "") + '" onclick="setMetric(\'passRate\')">Pass rate</button>' +
    '<button class="btn' + (METRIC === "weightedScore" ? " active" : "") + '" onclick="setMetric(\'weightedScore\')">Weighted score</button>';
}

function setMetric(m) { METRIC = m; renderRoute(); }

function latest() { return MODEL.runs[MODEL.runs.length - 1]; }

function best() {
  var b = null;
  for (var i = 0; i < MODEL.runs.length; i++) {
    var v = MODEL.runs[i][METRIC];
    if (v !== null && (b === null || v > b[METRIC])) b = MODEL.runs[i];
  }
  return b;
}

/** True when not every run measured the same test set — deltas across the boundary lie. */
function signaturesDiffer() {
  for (var i = 1; i < MODEL.runs.length; i++) {
    if (MODEL.runs[i].testSetSignature !== MODEL.runs[0].testSetSignature) return true;
  }
  return false;
}

/* ── Trend chart ────────────────────────────────────────────────────────── */

function trendChart() {
  var runs = MODEL.runs;
  var W = 900, H = 240, padL = 42, padR = 16, padT = 16, padB = 46;
  var innerW = W - padL - padR, innerH = H - padT - padB;
  var n = runs.length;

  function x(i) { return n === 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW; }
  function y(v) { return padT + innerH - v * innerH; }

  var grid = "";
  for (var g = 0; g <= 4; g++) {
    var v = g / 4;
    grid += '<line x1="' + padL + '" y1="' + y(v) + '" x2="' + (W - padR) + '" y2="' + y(v) +
      '" stroke="#1e2d47" stroke-width="1"/>' +
      '<text x="' + (padL - 8) + '" y="' + (y(v) + 4) + '" fill="#5b6f8f" font-size="10" text-anchor="end">' +
      Math.round(v * 100) + "%</text>";
  }

  var pts = [], dots = "", labels = "", markers = "";
  for (var i = 0; i < n; i++) {
    var val = runs[i][METRIC];
    if (val === null) continue;
    pts.push(x(i) + "," + y(val));
    dots += '<circle cx="' + x(i) + '" cy="' + y(val) + '" r="4.5" fill="' + colour(val) +
      '" stroke="#0b1220" stroke-width="2"><title>Run ' + runs[i].runNumber + " — " + pct(val) + "</title></circle>";
    labels += '<text x="' + x(i) + '" y="' + (H - padB + 16) + '" fill="#8397b5" font-size="10" text-anchor="middle">' +
      runs[i].runNumber + "</text>" +
      '<text x="' + x(i) + '" y="' + (H - padB + 29) + '" fill="#5b6f8f" font-size="9" text-anchor="middle">v' +
      (runs[i].promptVersion.number === null ? "?" : runs[i].promptVersion.number) + "</text>";
    // Mark the run where the test set composition changed.
    if (i > 0 && runs[i].testSetSignature !== runs[i - 1].testSetSignature) {
      var mx = (x(i) + x(i - 1)) / 2;
      markers += '<line x1="' + mx + '" y1="' + padT + '" x2="' + mx + '" y2="' + (padT + innerH) +
        '" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 3"/>' +
        '<text x="' + (mx + 4) + '" y="' + (padT + 11) + '" fill="#fbbf24" font-size="9">test set changed</text>';
    }
  }

  return '<div class="chart"><svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none">' +
    grid + markers +
    '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linejoin="round"/>' +
    dots + labels +
    '<text x="' + padL + '" y="' + (H - 6) + '" fill="#5b6f8f" font-size="10">run / prompt version</text>' +
    "</svg>" +
    '<div class="legend"><span>' + esc(metricLabel()) + " across " + MODEL.runs.length + " runs</span>" +
    (signaturesDiffer() ? '<span style="color:#fbbf24">dashed line = test set composition changed</span>' : "") +
    "</div></div>";
}

/* ── Overview ───────────────────────────────────────────────────────────── */

function viewOverview() {
  setTab("overview");
  var l = latest(), b = best(), first = MODEL.runs[0];
  var lifetime = (l[METRIC] !== null && first[METRIC] !== null) ? l[METRIC] - first[METRIC] : null;

  var out = '<div class="toolbar">' + metricToggle() + "</div>";

  out += '<div class="metrics">' +
    '<div class="metric primary"><div class="val" style="color:' + colour(l[METRIC]) + '">' + metricValue(l[METRIC]) +
    '</div><div class="lbl">Latest — run ' + l.runNumber + '</div><div class="note">' +
    date(l.finalizedAt) + " · version " + (l.promptVersion.number === null ? "?" : l.promptVersion.number) + "</div></div>" +

    '<div class="metric"><div class="val" style="color:' + colour(b ? b[METRIC] : null) + '">' + metricValue(b ? b[METRIC] : null) +
    '</div><div class="lbl">Best recorded</div><div class="note">run ' + (b ? b.runNumber : "—") + "</div></div>" +

    '<div class="metric"><div class="val">' + (lifetime === null ? "—" : (lifetime >= 0 ? "+" : "") + metricValue(lifetime)) +
    '</div><div class="lbl">Since run ' + first.runNumber + '</div><div class="note">' +
    esc(metricLabel().toLowerCase()) + " change over " + MODEL.runs.length + " runs</div></div>" +

    '<div class="metric"><div class="val">' + MODEL.runs.length + '</div><div class="lbl">Runs recorded</div>' +
    '<div class="note">' + MODEL.changelog.filter(function (c) { return c.promptDiff.added || c.promptDiff.removed; }).length +
    " with prompt changes</div></div></div>";

  out += '<div class="section"><h2>' + esc(metricLabel()) + " over time</h2>" + trendChart() + "</div>";

  if (MODEL.watchlist.length) {
    out += '<div class="section"><h2>Watchlist <span class="hint">still unresolved in the latest run</span></h2>';
    for (var w = 0; w < MODEL.watchlist.length; w++) out += watchCard(MODEL.watchlist[w]);
    out += "</div>";
  }

  out += '<div class="section"><h2>Runs</h2>' + runTable() + "</div>";
  mount(out);
}

function watchCard(f) {
  var ev = "";
  if (f.evidence && f.evidence.length) {
    ev = "<ul>";
    for (var i = 0; i < f.evidence.length; i++) ev += "<li>" + esc(f.evidence[i]) + "</li>";
    ev += "</ul>";
  }
  return '<div class="finding ' + f.severity + '"><div class="kind">' + esc(KIND_LABELS[f.kind] || f.kind) +
    "</div><h3>" + esc(f.title) + "</h3><p>" + esc(f.detail) + "</p>" + ev + "</div>";
}

var KIND_LABELS = {
  "dimension-failure": "Rubric dimension",
  "requirement-risk": "Requirement at risk",
  "regression": "Regression",
  "coverage-gap": "Coverage gap",
  "scoring-anomaly": "Scoring anomaly",
};

function runTable() {
  var out = '<table class="data"><thead><tr><th>Run</th><th>Date</th><th>Mode</th><th>Version</th>' +
    '<th>Pass rate</th><th class="num">Weighted</th><th class="mid">Interactions</th><th></th></tr></thead><tbody>';
  for (var i = MODEL.runs.length - 1; i >= 0; i--) {
    var r = MODEL.runs[i];
    var prev = i > 0 ? MODEL.runs[i - 1] : null;
    var delta = (prev && r.passRate !== null && prev.passRate !== null) ? r.passRate - prev.passRate : null;
    out += "<tr><td><strong>" + r.runNumber + "</strong></td>" +
      "<td>" + date(r.finalizedAt) + "</td>" +
      '<td style="color:var(--muted)">' + (r.mode === "existing" ? "existing" : "prompt test") + "</td>" +
      '<td><span class="chip ' + (r.promptVersion.status || "") + '">v' +
      (r.promptVersion.number === null ? "?" : r.promptVersion.number) +
      (r.promptVersion.status ? " · " + r.promptVersion.status : "") + "</span></td>" +
      "<td>" + bar(r.passRate) + " " + (deltaTag(delta) || "") + "</td>" +
      '<td class="num" style="color:' + colour(r.weightedScore) + '">' + score2(r.weightedScore) + "</td>" +
      '<td class="mid">' + r.transcriptsEvaluated +
      (r.skippedCount ? ' <span class="chip warn">' + r.skippedCount + " skipped</span>" : "") + "</td>" +
      '<td class="num"><a class="btn" href="' + esc(r.dashboardHref) + '">Open run →</a></td></tr>';
  }
  return out + "</tbody></table>";
}

/* ── Changelog ──────────────────────────────────────────────────────────── */

function viewChangelog() {
  setTab("changelog");
  var out = '<div class="section"><h2>Changelog <span class="hint">what changed between runs, and what it moved</span></h2><div class="timeline">';

  for (var i = 0; i < MODEL.changelog.length; i++) {
    var c = MODEL.changelog[i];
    var dir = c.passRateDelta === null ? "" : c.passRateDelta > 0.005 ? "up" : c.passRateDelta < -0.005 ? "dn" : "";

    out += '<div class="tl-item ' + dir + '"><div class="tl-head">' +
      '<span class="run">Run ' + c.runNumber + "</span>" +
      '<span class="chip ' + (c.versionStatus || "") + '">v' + (c.versionNumber === null ? "?" : c.versionNumber) +
      (c.versionStatus ? " · " + c.versionStatus : "") + "</span>" +
      '<span class="date">' + date(c.finalizedAt) + "</span>" +
      (c.passRateDelta !== null ? deltaTag(c.passRateDelta) + ' <span class="empty">pass rate</span>' : '<span class="empty">baseline</span>') +
      "</div>";

    if (c.testSetChanged) {
      out += '<div class="chip warn" style="margin:6px 0">Test set composition changed — deltas below compare different populations</div>';
    }

    if (c.notes) out += '<div class="tl-notes">' + esc(c.notes) + "</div>";

    // Prompt diff
    if (c.promptDiff.isFirst) {
      out += '<div class="empty" style="font-size:0.8rem">First recorded run — no earlier prompt to compare.</div>';
    } else if (c.promptDiff.unavailable) {
      out += '<div class="empty" style="font-size:0.8rem">Prompt text was not recorded for one of these runs, so no diff is available.</div>';
    } else if (!c.promptDiff.added && !c.promptDiff.removed) {
      out += '<div class="empty" style="font-size:0.8rem">Prompt unchanged — this run re-measured the same prompt.</div>';
    } else {
      var lines = "";
      for (var d = 0; d < c.promptDiff.lines.length; d++) {
        var ln = c.promptDiff.lines[d];
        var mark = ln.type === "add" ? "+ " : ln.type === "remove" ? "− " : "  ";
        lines += '<div class="' + ln.type + '">' + mark + esc(ln.text) + "</div>";
      }
      out += '<details class="block" ' + (i === 0 ? "open" : "") + '><summary>Prompt changes — ' +
        '<span class="a">+' + c.promptDiff.added + "</span> / <span class=\"r\">−" + c.promptDiff.removed + "</span>" +
        '</summary><div class="diff" style="margin-top:10px">' + lines + "</div></details>";
    }

    // Movers
    var movers = [];
    var all = c.testCaseDeltas.concat(c.requirementDeltas);
    for (var m = 0; m < all.length; m++) {
      var dl = all[m];
      if (dl.from === null || dl.to === null) continue;
      var diff = dl.to - dl.from;
      if (Math.abs(diff) < 0.005) continue;
      movers.push('<span class="mover ' + (diff > 0 ? "up" : "dn") + '">' +
        esc(pretty(dl.name)) + " " +
        (diff > 0 ? "▲" : "▼") + " " + pct(Math.abs(diff)) + "</span>");
    }
    if (movers.length) out += '<div class="movers">' + movers.join("") + "</div>";
    else if (!c.promptDiff.isFirst) out += '<div class="empty" style="font-size:0.8rem;margin-top:6px">Nothing moved measurably.</div>';

    out += "</div>";
  }

  mount(out + "</div></div>");
}

/* ── Matrix pivots ──────────────────────────────────────────────────────── */

function seriesTable(rows, label, withCategory) {
  if (!rows.length) return '<div class="panel empty">No data recorded.</div>';

  var out = '<div class="heat-wrap"><table class="data"><thead><tr><th>' + label + "</th>";
  for (var r = 0; r < MODEL.runs.length; r++) {
    out += '<th class="mid">' + MODEL.runs[r].runNumber + '<div class="sub" style="font-weight:400">v' +
      (MODEL.runs[r].promptVersion.number === null ? "?" : MODEL.runs[r].promptVersion.number) + "</div></th>";
  }
  out += '<th class="mid">Trend</th></tr></thead><tbody>';

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    out += "<tr><td>" + esc(row.label) +
      (withCategory && row.category ? '<div class="sub">' + esc(row.category) + " · " + esc(row.key) + "</div>"
        : '<div class="sub mono">' + esc(row.key) + "</div>") + "</td>";
    for (var j = 0; j < row.series.length; j++) {
      var v = row.series[j];
      if (v === null || v === undefined) {
        out += '<td class="mid" style="color:var(--dim)">—</td>';
      } else {
        out += '<td class="mid" style="background:' + heatColour(v) + ';color:#04121f;font-weight:700;border-radius:4px">' +
          Math.round(v * 100) + "</td>";
      }
    }
    // First → last movement
    var firstVal = null, lastVal = null;
    for (var k = 0; k < row.series.length; k++) {
      if (row.series[k] !== null && row.series[k] !== undefined) {
        if (firstVal === null) firstVal = row.series[k];
        lastVal = row.series[k];
      }
    }
    var move = (firstVal === null || lastVal === null) ? null : lastVal - firstVal;
    out += '<td class="mid">' + (deltaTag(move) || "—") + "</td></tr>";
  }
  return out + "</tbody></table></div>";
}

function viewTestCases() {
  setTab("testcases");
  mount('<div class="section"><h2>Pass rate by test case <span class="hint">values are percentages</span></h2>' +
    seriesTable(MODEL.testCaseSeries, "Test case", false) + "</div>");
}

function viewRequirements() {
  setTab("requirements");
  if (!MODEL.requirementSeries.length) {
    mount('<div class="panel empty">No requirement history is available — requirements.md was not found, or no run ' +
      "recorded requirement mappings. Regenerate reports after gathering requirements.</div>");
    return;
  }
  mount('<div class="section"><h2>Requirement compliance over time ' +
    '<span class="hint">the same runs viewed through the business requirements they validate</span></h2>' +
    seriesTable(MODEL.requirementSeries, "Requirement", true) + "</div>");
}

/* ── Chrome + routes ────────────────────────────────────────────────────── */

function renderChrome() {
  document.getElementById("title").textContent = "Improvements — " + MODEL.testSet.name;
  document.getElementById("subtitle").textContent =
    MODEL.config.name + " · " + MODEL.runs.length + " run" + (MODEL.runs.length === 1 ? "" : "s") +
    " · latest " + date(latest().finalizedAt);

  var chips = [
    '<span class="chip">Latest run <strong>' + latest().runNumber + "</strong></span>",
    '<span class="chip">Latest pass rate <strong style="color:' + colour(latest().passRate) + '">' +
      pct(latest().passRate) + "</strong></span>",
  ];
  if (signaturesDiffer()) chips.push('<span class="chip warn">Test set changed mid-history</span>');
  document.getElementById("chips").innerHTML = chips.join("");

  document.getElementById("tab-counts-changelog").textContent = MODEL.changelog.length;
  document.getElementById("tab-counts-testcases").textContent = MODEL.testCaseSeries.length;
  document.getElementById("tab-counts-requirements").textContent = MODEL.requirementSeries.length;

  document.getElementById("foot").innerHTML =
    "<span>Generated " + date(MODEL.generator.generatedAt, true) + "</span>" +
    "<span>sdd-summary-mcp v" + esc(MODEL.generator.serverVersion) + "</span>" +
    "<span>report schema v" + MODEL.generator.schemaVersion + "</span>";
}

route("/", viewOverview);
route("/changelog", viewChangelog);
route("/testcases", viewTestCases);
route("/requirements", viewRequirements);

renderChrome();
renderRoute();
