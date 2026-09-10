/* Run dashboard views.
   Levels: overview → test case → rubric dimension → transcript, plus a requirements
   pivot over the same data. Every view is rendered from MODEL, so adding a pivot means
   adding a render function rather than regenerating HTML server-side. */

/** Weighted is the default headline; the toggle switches every score column at once. */
var WEIGHTED = true;

function metricOf(stats) {
  return WEIGHTED ? stats.weightedScore : stats.averageScore;
}

function scoreLabel() {
  return WEIGHTED ? "Weighted score" : "Mean score";
}

function toggleWeighting() {
  WEIGHTED = !WEIGHTED;
  setStamp(MODEL.headline.passRate,
    (WEIGHTED ? "Weighted" : "Mean") + " score " + score2(metricOf(MODEL.headline.stats)));
  renderRoute();
}

function weightToggle() {
  return '<button class="btn' + (WEIGHTED ? " active" : "") + '" onclick="toggleWeighting()">' +
    (WEIGHTED ? "Weighted scoring" : "Unweighted scoring") + "</button>" +
    '<span class="empty" style="font-size:0.76rem">' +
    (WEIGHTED ? "dimension weight 1–5 applied" : "every dimension counts equally") + "</span>";
}

function findTestCase(name) {
  for (var i = 0; i < MODEL.testCases.length; i++) if (MODEL.testCases[i].name === name) return MODEL.testCases[i];
  return null;
}

function findDim(tc, name) {
  for (var i = 0; i < tc.dimensions.length; i++) if (tc.dimensions[i].name === name) return tc.dimensions[i];
  return null;
}

function niceName(s) {
  return pretty(s);
}

/* ── Findings ───────────────────────────────────────────────────────────── */

var KIND_LABELS = {
  "dimension-failure": "Rubric dimension",
  "requirement-risk": "Requirement at risk",
  "regression": "Regression",
  "coverage-gap": "Coverage gap",
  "scoring-anomaly": "Scoring anomaly",
};

function findingCard(f) {
  var links = [];
  if (f.links.testCase && f.links.dimension) {
    links.push('<button class="btn" onclick="go(\'/tc/' + encodeURIComponent(f.links.testCase) +
      "/dim/" + encodeURIComponent(f.links.dimension) + '\')">Open rubric dimension</button>');
  } else if (f.links.testCase) {
    links.push('<button class="btn" onclick="go(\'/tc/' + encodeURIComponent(f.links.testCase) + '\')">Open test case</button>');
  }
  if (f.links.requirementId) {
    links.push('<button class="btn" onclick="go(\'/req/' + encodeURIComponent(f.links.requirementId) + '\')">Open requirement</button>');
  }
  var ev = "";
  if (f.evidence && f.evidence.length) {
    ev = "<ul>";
    for (var i = 0; i < f.evidence.length; i++) ev += "<li>" + esc(f.evidence[i]) + "</li>";
    ev += "</ul>";
  }
  return '<div class="finding ' + f.severity + '">' +
    '<div class="kind">' + esc(KIND_LABELS[f.kind] || f.kind) + "</div>" +
    "<h3>" + esc(f.title) + "</h3><p>" + esc(f.detail) + "</p>" + ev +
    (links.length ? '<div class="links">' + links.join("") + "</div>" : "") +
    "</div>";
}

/* ── Overview ───────────────────────────────────────────────────────────── */

function viewOverview() {
  setTab("overview");
  var h = MODEL.headline;
  var cmp = MODEL.comparison;
  var cov = MODEL.coverage;

  var covered = cov.requirementsUnavailable ? null : cov.requirementsCovered / Math.max(cov.requirementsTotal, 1);

  var out = '<div class="metrics">' +
    '<div class="metric primary"><div class="val" style="color:' + colour(h.passRate) + '">' + pct(h.passRate) + "</div>" +
    '<div class="lbl">Transcript pass rate</div><div class="note">' + h.transcriptsPassed + " of " +
    h.transcriptsEvaluated + " passed every test case" + (cmp ? " · " + deltaTag(cmp.passRateDelta) : "") + "</div></div>" +

    '<div class="metric"><div class="val" style="color:' + colour(metricOf(h.stats)) + '">' + score2(metricOf(h.stats)) + "</div>" +
    '<div class="lbl">' + scoreLabel() + '</div><div class="note">' +
    (WEIGHTED ? "unweighted " + score2(h.stats.averageScore) : "weighted " + score2(h.stats.weightedScore)) +
    (cmp && WEIGHTED ? " · " + deltaTag(cmp.weightedScoreDelta) : "") + "</div></div>" +

    '<div class="metric"><div class="val">' + h.stats.evaluated + "</div>" +
    '<div class="lbl">Dimension scores</div><div class="note">' + h.stats.failed + " failed · " +
    h.stats.na + " not applicable</div></div>" +

    '<div class="metric"><div class="val" style="color:' + colour(covered) + '">' +
    (cov.requirementsUnavailable ? "—" : cov.requirementsCovered + "/" + cov.requirementsTotal) + "</div>" +
    '<div class="lbl">Requirements covered</div><div class="note">' +
    (cov.requirementsUnavailable ? "requirements.md not found" :
      cov.uncoveredRequirementIds.length + " untested") + "</div></div>" +
    "</div>";

  // Prompt and run provenance
  if (MODEL.run.prompt) {
    out += '<details class="block"><summary>Prompt tested in this run' +
      (MODEL.run.promptVersion.number !== null ? " (version " + MODEL.run.promptVersion.number + ")" : "") +
      '</summary><pre class="text">' + esc(MODEL.run.prompt) + "</pre></details>";
  }

  if (MODEL.findings.length) {
    out += '<div class="section"><h2>What this run is telling you <span class="hint">derived from these results, ranked by weighted impact</span></h2>';
    for (var i = 0; i < MODEL.findings.length; i++) out += findingCard(MODEL.findings[i]);
    out += "</div>";
  }

  out += '<div class="section"><h2>Test cases</h2>' + testCaseTable() + "</div>";

  if (cmp) {
    out += '<div class="section"><h2>Movement since run ' + cmp.previousRunNumber +
      (cmp.testSetChanged ? ' <span class="hint">test set composition changed — these compare different populations</span>' : "") +
      "</h2>" + deltaTable(cmp.testCaseDeltas, "Test case", niceName) + "</div>";
  }

  if (MODEL.run.skipped.length) {
    out += '<div class="section"><h2>Skipped transcripts <span class="hint">excluded before scoring, absent from every denominator</span></h2><div class="panel">' +
      '<table class="data"><thead><tr><th>Transcript</th><th>Returned instead of a summary</th></tr></thead><tbody>';
    for (var s = 0; s < MODEL.run.skipped.length; s++) {
      var sk = MODEL.run.skipped[s];
      out += "<tr><td>" + esc(sk.label) + '<div class="sub mono">' + esc(sk.id) + "</div></td><td>" +
        esc(sk.summary) + '<div class="sub">' + esc(sk.reason) + "</div></td></tr>";
    }
    out += "</tbody></table></div></div>";
  }

  mount(out);
}

function testCaseTable() {
  var out = '<div class="toolbar">' + weightToggle() + "</div>" +
    '<table class="data"><thead><tr><th>Test case</th><th>Pass rate</th><th class="num">' +
    scoreLabel() + '</th><th class="mid">Dimensions</th><th class="mid">Failures</th><th></th></tr></thead><tbody>';
  for (var i = 0; i < MODEL.testCases.length; i++) {
    var tc = MODEL.testCases[i];
    out += '<tr class="clickable" onclick="go(\'/tc/' + encodeURIComponent(tc.name) + '\')">' +
      "<td><strong>" + esc(niceName(tc.name)) + '</strong><div class="sub">' + clip(tc.description, 110) + "</div></td>" +
      "<td>" + bar(tc.passRate) + "</td>" +
      '<td class="num" style="color:' + colour(metricOf(tc.stats)) + '">' + score2(metricOf(tc.stats)) + "</td>" +
      '<td class="mid">' + tc.dimensions.length + "</td>" +
      '<td class="mid">' + (tc.stats.failed ? '<span class="badge fail">' + tc.stats.failed + "</span>" : '<span class="badge pass">0</span>') + "</td>" +
      '<td class="num" style="color:var(--dim)">›</td></tr>';
  }
  return out + "</tbody></table>";
}

function deltaTable(deltas, label, fmt) {
  if (!deltas || !deltas.length) return '<div class="panel empty">Nothing comparable.</div>';
  var sorted = deltas.slice().sort(function (a, b) {
    return ((a.to || 0) - (a.from || 0)) - ((b.to || 0) - (b.from || 0));
  });
  var out = '<table class="data"><thead><tr><th>' + label +
    '</th><th class="num">Before</th><th class="num">After</th><th class="num">Change</th></tr></thead><tbody>';
  for (var i = 0; i < sorted.length; i++) {
    var d = sorted[i];
    var delta = (d.to === null || d.from === null) ? null : d.to - d.from;
    out += "<tr><td>" + esc(fmt ? fmt(d.name) : d.name) + '</td><td class="num">' + pct(d.from) +
      '</td><td class="num">' + pct(d.to) + '</td><td class="num">' + (deltaTag(delta) || "—") + "</td></tr>";
  }
  return out + "</tbody></table>";
}

/* ── Test case detail ───────────────────────────────────────────────────── */

function viewTestCase(name) {
  setTab("testcases");
  var tc = findTestCase(name);
  if (!tc) { mount('<div class="panel empty">Unknown test case.</div>'); return; }

  var out = crumbs([{ label: "Overview", href: "/" }, { label: niceName(tc.name) }]) +
    '<div class="detail-head"><p class="eyebrow" style="color:var(--azure)">Test case</p><h1>' +
    esc(niceName(tc.name)) + '</h1><p class="sub">' + esc(tc.description) + "</p></div>";

  out += '<div class="metrics">' +
    '<div class="metric"><div class="val" style="color:' + colour(tc.passRate) + '">' + pct(tc.passRate) +
    '</div><div class="lbl">Transcript pass rate</div><div class="note">' +
    tc.transcripts.filter(function (t) { return t.passed; }).length + " of " + tc.transcripts.length + "</div></div>" +
    '<div class="metric"><div class="val" style="color:' + colour(metricOf(tc.stats)) + '">' + score2(metricOf(tc.stats)) +
    '</div><div class="lbl">' + scoreLabel() + "</div></div>" +
    '<div class="metric"><div class="val">' + tc.stats.failed + '</div><div class="lbl">Failed scores</div>' +
    '<div class="note">of ' + tc.stats.evaluated + " evaluated · " + tc.stats.na + " n/a</div></div>" +
    "</div>";

  out += '<div class="section"><h2>Rubric <span class="hint">click a dimension to see how it scored against every interaction</span></h2>' +
    '<div class="toolbar">' + weightToggle() + "</div>" +
    '<table class="data"><thead><tr><th>Dimension</th><th class="mid">Weight</th><th class="mid">Threshold</th>' +
    '<th>Pass rate</th><th class="num">Mean</th><th class="mid">n/a</th><th>Requirements</th><th></th></tr></thead><tbody>';

  var dims = tc.dimensions.slice().sort(function (a, b) {
    var ap = a.stats.passRate === null ? 2 : a.stats.passRate;
    var bp = b.stats.passRate === null ? 2 : b.stats.passRate;
    if (ap !== bp) return ap - bp;
    return b.weight - a.weight;
  });

  for (var i = 0; i < dims.length; i++) {
    var d = dims[i];
    var reqs = d.requirementIds.length
      ? d.requirementIds.map(function (id) {
          return '<span class="badge w mono" title="' + esc(id) + '">' + esc(id.replace(/^BR-.*-(\d+)$/, "BR-$1")) + "</span>";
        }).join(" ")
      : '<span class="empty">none</span>';
    out += '<tr class="clickable" onclick="go(\'/tc/' + encodeURIComponent(tc.name) + "/dim/" + encodeURIComponent(d.name) + '\')">' +
      "<td><strong>" + esc(d.name) + "</strong>" +
      (d.applicabilityCondition && d.applicabilityCondition !== "always"
        ? '<div class="sub">Conditional: ' + clip(d.applicabilityCondition, 90) + "</div>" : "") +
      "</td>" +
      '<td class="mid"><span class="badge w">' + d.weight + "</span></td>" +
      '<td class="mid" style="color:var(--muted)">' + d.passThreshold.toFixed(2) + "</td>" +
      "<td>" + bar(d.stats.passRate) + "</td>" +
      '<td class="num" style="color:' + colour(d.stats.averageScore) + '">' + score2(d.stats.averageScore) + "</td>" +
      '<td class="mid" style="color:var(--dim)">' + (d.stats.na || "—") + "</td>" +
      "<td>" + reqs + "</td>" +
      '<td class="num" style="color:var(--dim)">›</td></tr>';
  }
  out += "</tbody></table></div>";

  out += '<div class="section"><h2>Dimension × interaction <span class="hint">rows fail together = rubric problem · columns fail together = summary problem</span></h2>' +
    '<div class="panel heat-wrap">' + heatmap(tc) + "</div></div>";

  out += '<div class="section"><h2>Interactions</h2>' + transcriptTable(tc) + "</div>";
  mount(out);
}

function heatmap(tc) {
  // Columns are numbered rather than labelled: interaction labels are far too long to sit
  // above a 30px cell, and a key below stays readable at any number of transcripts.
  var out = '<table class="heat"><thead><tr><th class="row-h"></th>';
  for (var c = 0; c < tc.transcripts.length; c++) {
    out += '<th title="' + esc(tc.transcripts[c].label) + '">T' + (c + 1) + "</th>";
  }
  out += "</tr></thead><tbody>";

  for (var i = 0; i < tc.dimensions.length; i++) {
    var d = tc.dimensions[i];
    out += '<tr><th class="row-h" title="' + esc(d.name) + '">' + esc(clip(d.name, 40)) +
      ' <span class="badge w">' + d.weight + "</span></th>";
    for (var j = 0; j < tc.transcripts.length; j++) {
      var t = tc.transcripts[j];
      var s = null;
      for (var k = 0; k < t.scores.length; k++) if (t.scores[k].dimension === d.name) s = t.scores[k];
      var href = "/tc/" + encodeURIComponent(tc.name) + "/dim/" + encodeURIComponent(d.name);
      if (!s || s.na) {
        out += '<td class="cell na" title="Not applicable: ' + esc(s ? s.reasoning : "") +
          '" onclick="go(\'' + href + '\')">n/a</td>';
      } else {
        out += '<td class="cell" style="background:' + heatColour(s.score) + '" title="' +
          esc(t.label) + " — " + s.score.toFixed(2) + ": " + esc(clip(s.reasoning, 160)) +
          '" onclick="go(\'' + href + '\')">' + s.score.toFixed(1) + "</td>";
      }
    }
    out += "</tr>";
  }
  out += "</tbody></table>";

  var key = [];
  for (var q = 0; q < tc.transcripts.length; q++) {
    key.push('<span><strong style="color:var(--muted)">T' + (q + 1) + "</strong> " +
      esc(tc.transcripts[q].label) + "</span>");
  }
  return out + '<div class="legend">' + key.join("") + "</div>";
}

function transcriptTable(tc) {
  var rows = tc.transcripts.slice().sort(function (a, b) {
    return (metricOf(a.stats) || 0) - (metricOf(b.stats) || 0);
  });
  var out = '<table class="data"><thead><tr><th>Interaction</th><th class="num">' + scoreLabel() +
    '</th><th class="mid">Result</th><th>Failed dimensions</th><th></th></tr></thead><tbody>';
  for (var i = 0; i < rows.length; i++) {
    var t = rows[i];
    var failed = t.scores.filter(function (s) { return !s.na && !s.passed; })
      .map(function (s) { return esc(s.dimension); }).join(", ");
    out += '<tr class="clickable" onclick="go(\'/tx/' + encodeURIComponent(t.id) + '\')">' +
      "<td>" + esc(t.label) + '<div class="sub mono">' + esc(t.id) + "</div></td>" +
      '<td class="num" style="color:' + colour(metricOf(t.stats)) + '">' + score2(metricOf(t.stats)) + "</td>" +
      '<td class="mid">' + (t.passed ? '<span class="badge pass">PASS</span>' : '<span class="badge fail">FAIL</span>') + "</td>" +
      '<td style="color:var(--muted);font-size:0.82rem">' + (failed || "—") + "</td>" +
      '<td class="num" style="color:var(--dim)">›</td></tr>';
  }
  return out + "</tbody></table>";
}

/* ── Dimension detail ───────────────────────────────────────────────────── */

function viewDimension(tcName, dimName) {
  setTab("testcases");
  var tc = findTestCase(tcName);
  var d = tc && findDim(tc, dimName);
  if (!d) { mount('<div class="panel empty">Unknown dimension.</div>'); return; }

  var out = crumbs([
    { label: "Overview", href: "/" },
    { label: niceName(tc.name), href: "/tc/" + encodeURIComponent(tc.name) },
    { label: d.name },
  ]);

  out += '<div class="detail-head"><p class="eyebrow" style="color:var(--azure)">Rubric dimension</p><h1>' +
    esc(d.name) + '</h1><p class="sub">' + esc(d.description) + '</p><div class="meta-row on-light">' +
    '<span class="chip">Weight <strong>' + d.weight + " of 5</strong></span>" +
    '<span class="chip">Pass threshold <strong>' + d.passThreshold.toFixed(2) + "</strong></span>" +
    '<span class="chip">Pass rate <strong style="color:' + colour(d.stats.passRate) + '">' + pct(d.stats.passRate) + "</strong></span>" +
    '<span class="chip">Mean <strong>' + score2(d.stats.averageScore) + "</strong></span>" +
    (d.stats.na ? '<span class="chip warn">' + d.stats.na + " not applicable</span>" : "") +
    "</div></div>";

  out += '<div class="section"><h2>Scoring criteria <span class="hint">what the evaluator was told to apply</span></h2><div class="panel"><dl class="criteria">' +
    "<dt>Applies</dt><dd>" + esc(d.applicabilityCondition === "always" ? "Every interaction (always)" : d.applicabilityCondition) + "</dd>" +
    "<dt>Pass</dt><dd>" + esc(d.passCriteria) + "</dd>" +
    "<dt>Fail</dt><dd>" + esc(d.failCriteria) + "</dd>" +
    "<dt>Requirements</dt><dd>" + (d.requirementIds.length
      ? d.requirementIds.map(function (id) {
        return '<a class="mono" style="color:var(--accent);cursor:pointer" onclick="go(\'/req/' +
          encodeURIComponent(id) + '\')">' + esc(id) + "</a>";
      }).join(", ")
      : '<span class="empty">This dimension is not mapped to any business requirement.</span>') + "</dd>" +
    "</dl></div></div>";

  // Every interaction, worst first — reading the reasoning column top to bottom is how you
  // tell a genuinely failing dimension from a badly worded one.
  var rows = [];
  for (var i = 0; i < tc.transcripts.length; i++) {
    var t = tc.transcripts[i];
    for (var j = 0; j < t.scores.length; j++) {
      if (t.scores[j].dimension === d.name) rows.push({ t: t, s: t.scores[j] });
    }
  }
  rows.sort(function (a, b) {
    if (a.s.na !== b.s.na) return a.s.na ? 1 : -1;
    return (a.s.score || 0) - (b.s.score || 0);
  });

  out += '<div class="section"><h2>Scored against every interaction <span class="hint">worst first</span></h2>' +
    '<table class="data"><thead><tr><th>Interaction</th><th class="num">Score</th><th class="mid">Result</th>' +
    "<th>Evaluator reasoning</th><th></th></tr></thead><tbody>";
  for (var r = 0; r < rows.length; r++) {
    var s = rows[r].s, tx = rows[r].t;
    out += '<tr class="clickable" onclick="go(\'/tx/' + encodeURIComponent(tx.id) + '\')">' +
      "<td>" + esc(tx.label) + '<div class="sub mono">' + esc(tx.id) + "</div></td>" +
      '<td class="num" style="color:' + colour(s.score) + '">' + (s.na ? "—" : s.score.toFixed(2)) + "</td>" +
      '<td class="mid">' + (s.na ? '<span class="badge na">N/A</span>'
        : s.passed ? '<span class="badge pass">PASS</span>' : '<span class="badge fail">FAIL</span>') + "</td>" +
      '<td style="color:var(--muted);font-size:12.5px">' + esc(s.reasoning) + "</td>" +
      '<td class="num" style="color:var(--dim)">›</td></tr>';
  }
  out += "</tbody></table></div>";
  mount(out);
}

/* ── Transcript detail ──────────────────────────────────────────────────── */

function viewTranscript(id) {
  setTab("transcripts");
  var found = null;
  for (var i = 0; i < MODEL.testCases.length && !found; i++) {
    for (var j = 0; j < MODEL.testCases[i].transcripts.length; j++) {
      if (MODEL.testCases[i].transcripts[j].id === id) found = MODEL.testCases[i].transcripts[j];
    }
  }
  if (!found) { mount('<div class="panel empty">Unknown interaction.</div>'); return; }

  var out = crumbs([{ label: "Overview", href: "/" }, { label: "Interactions", href: "/transcripts" }, { label: found.label }]);
  out += '<div class="detail-head"><p class="eyebrow" style="color:var(--azure)">Interaction</p><h1>' +
    esc(found.label) + '</h1><p class="sub mono">' + esc(found.id) + "</p></div>";

  out += '<div class="two-col"><div class="panel"><div class="col-head">Generated summary</div><pre class="text">' +
    esc(found.summary) + "</pre></div>";
  out += '<div class="panel"><div class="col-head">Source interaction</div>' +
    (found.transcriptText
      ? '<pre class="text">' + esc(found.transcriptText) + "</pre>"
      : '<p class="empty">Not included in this report.</p>') + "</div></div>";

  out += '<div class="section" style="margin-top:26px"><h2>Scored against every test case</h2>';
  for (var t = 0; t < MODEL.testCases.length; t++) {
    var tc = MODEL.testCases[t];
    var row = null;
    for (var k = 0; k < tc.transcripts.length; k++) if (tc.transcripts[k].id === id) row = tc.transcripts[k];
    if (!row) continue;
    out += '<div style="margin-bottom:18px"><div class="toolbar"><strong>' + esc(niceName(tc.name)) + "</strong>" +
      (row.passed ? '<span class="badge pass">PASS</span>' : '<span class="badge fail">FAIL</span>') +
      '<span class="empty">' + scoreLabel().toLowerCase() + " " + score2(metricOf(row.stats)) + "</span>" +
      '<div class="spacer"></div><button class="btn" onclick="go(\'/tc/' + encodeURIComponent(tc.name) + '\')">Open test case</button></div>' +
      '<table class="data"><thead><tr><th>Dimension</th><th class="mid">Weight</th><th class="num">Score</th>' +
      "<th class=\"mid\">Result</th><th>Reasoning</th></tr></thead><tbody>";
    for (var s = 0; s < row.scores.length; s++) {
      var sc = row.scores[s];
      var dim = findDim(tc, sc.dimension);
      out += '<tr class="clickable" onclick="go(\'/tc/' + encodeURIComponent(tc.name) + "/dim/" +
        encodeURIComponent(sc.dimension) + '\')"><td>' + esc(sc.dimension) + "</td>" +
        '<td class="mid"><span class="badge w">' + (dim ? dim.weight : "—") + "</span></td>" +
        '<td class="num" style="color:' + colour(sc.score) + '">' + (sc.na ? "—" : sc.score.toFixed(2)) + "</td>" +
        '<td class="mid">' + (sc.na ? '<span class="badge na">N/A</span>'
          : sc.passed ? '<span class="badge pass">PASS</span>' : '<span class="badge fail">FAIL</span>') + "</td>" +
        '<td style="color:var(--muted);font-size:12.5px">' + esc(sc.reasoning) + "</td></tr>";
    }
    out += "</tbody></table></div>";
  }
  out += "</div>";
  mount(out);
}

function viewTranscripts() {
  setTab("transcripts");
  // One row per interaction, aggregated across every test case in the run.
  var byId = {};
  for (var i = 0; i < MODEL.testCases.length; i++) {
    var tc = MODEL.testCases[i];
    for (var j = 0; j < tc.transcripts.length; j++) {
      var t = tc.transcripts[j];
      if (!byId[t.id]) byId[t.id] = { id: t.id, label: t.label, evaluated: 0, failed: 0, na: 0, weighted: [], failedTcs: [] };
      var agg = byId[t.id];
      agg.evaluated += t.stats.evaluated;
      agg.failed += t.stats.failed;
      agg.na += t.stats.na;
      if (metricOf(t.stats) !== null) agg.weighted.push(metricOf(t.stats));
      if (!t.passed) agg.failedTcs.push(niceName(tc.name));
    }
  }
  var rows = Object.keys(byId).map(function (k) {
    var a = byId[k];
    a.score = a.weighted.length ? a.weighted.reduce(function (x, y) { return x + y; }, 0) / a.weighted.length : null;
    return a;
  }).sort(function (a, b) { return (a.score || 0) - (b.score || 0); });

  var out = '<div class="toolbar">' + weightToggle() + "</div>" +
    '<table class="data"><thead><tr><th>Interaction</th><th class="num">' + scoreLabel() +
    '</th><th class="mid">Failed scores</th><th>Failing test cases</th><th></th></tr></thead><tbody>';
  for (var r = 0; r < rows.length; r++) {
    var a = rows[r];
    out += '<tr class="clickable" onclick="go(\'/tx/' + encodeURIComponent(a.id) + '\')">' +
      "<td>" + esc(a.label) + '<div class="sub mono">' + esc(a.id) + "</div></td>" +
      '<td class="num" style="color:' + colour(a.score) + '">' + score2(a.score) + "</td>" +
      '<td class="mid">' + (a.failed ? '<span class="badge fail">' + a.failed + "/" + a.evaluated + "</span>"
        : '<span class="badge pass">0/' + a.evaluated + "</span>") + "</td>" +
      '<td style="color:var(--muted);font-size:0.82rem">' + (a.failedTcs.join(", ") || "—") + "</td>" +
      '<td class="num" style="color:var(--dim)">›</td></tr>';
  }
  out += "</tbody></table>";

  if (MODEL.run.skipped.length) {
    out += '<div class="section" style="margin-top:26px"><h2>Skipped — not scored</h2><div class="panel"><table class="data"><tbody>';
    for (var s = 0; s < MODEL.run.skipped.length; s++) {
      out += "<tr><td>" + esc(MODEL.run.skipped[s].label) + '<div class="sub mono">' +
        esc(MODEL.run.skipped[s].id) + "</div></td><td>" + esc(MODEL.run.skipped[s].summary) + "</td></tr>";
    }
    out += "</tbody></table></div></div>";
  }
  mount(out);
}

/* ── Requirements pivot ─────────────────────────────────────────────────── */

function viewRequirements() {
  setTab("requirements");
  var cov = MODEL.coverage;

  if (cov.requirementsUnavailable) {
    mount('<div class="panel empty">No requirements.md was found for this configuration, so compliance ' +
      "cannot be reported. Gather requirements first, then regenerate this report.</div>");
    return;
  }

  var out = "";

  if (cov.unknownRequirementIds.length) {
    out += '<div class="finding high"><div class="kind">Coverage gap</div><h3>' +
      cov.unknownRequirementIds.length + " dimension" + (cov.unknownRequirementIds.length === 1 ? "" : "s") +
      " reference a requirement that does not exist</h3><p>These look like coverage but test nothing traceable. " +
      "Either the ID is a typo or the requirement was removed from requirements.md.</p><ul>";
    for (var u = 0; u < cov.unknownRequirementIds.length; u++) {
      var un = cov.unknownRequirementIds[u];
      out += '<li><span class="mono">' + esc(un.id) + "</span> — " + esc(niceName(un.testCase)) + " › " + esc(un.dimension) + "</li>";
    }
    out += "</ul></div>";
  }

  if (cov.uncoveredRequirementIds.length) {
    out += '<div class="finding medium"><div class="kind">Coverage gap</div><h3>' +
      cov.uncoveredRequirementIds.length + " requirements have no dimension testing them</h3>" +
      "<p>Nothing in this run tells you whether these hold. An untested requirement is indistinguishable " +
      "from a passing one on every other view.</p><ul>";
    for (var g = 0; g < cov.uncoveredRequirementIds.length; g++) {
      out += '<li><span class="mono">' + esc(cov.uncoveredRequirementIds[g]) + "</span></li>";
    }
    out += "</ul></div>";
  }

  // Group by category — this is the view a business stakeholder reads.
  var cats = {};
  for (var i = 0; i < MODEL.requirements.length; i++) {
    var r = MODEL.requirements[i];
    (cats[r.category] = cats[r.category] || []).push(r);
  }

  out += '<div class="toolbar">' + weightToggle() + "</div>";

  var names = Object.keys(cats).sort();
  for (var c = 0; c < names.length; c++) {
    out += '<div class="section"><h2>' + esc(names[c]) + "</h2>" +
      '<table class="data"><thead><tr><th>ID</th><th>Requirement</th><th>Compliance</th>' +
      '<th class="num">' + scoreLabel() + '</th><th class="mid">Tested by</th><th></th></tr></thead><tbody>';
    var list = cats[names[c]].slice().sort(function (a, b) {
      var ap = a.stats.passRate === null ? 2 : a.stats.passRate;
      var bp = b.stats.passRate === null ? 2 : b.stats.passRate;
      return ap - bp;
    });
    for (var j = 0; j < list.length; j++) {
      var req = list[j];
      var untested = req.coveredBy.length === 0;
      out += '<tr class="clickable" onclick="go(\'/req/' + encodeURIComponent(req.id) + '\')">' +
        '<td class="mono" style="white-space:nowrap">' + esc(req.id) + "</td>" +
        "<td>" + esc(req.text) + "</td>" +
        "<td>" + (untested ? '<span class="badge na">UNTESTED</span>' : bar(req.stats.passRate)) + "</td>" +
        '<td class="num" style="color:' + colour(metricOf(req.stats)) + '">' + score2(metricOf(req.stats)) + "</td>" +
        '<td class="mid" style="color:var(--muted)">' + (req.coveredBy.length || "—") + "</td>" +
        '<td class="num" style="color:var(--dim)">›</td></tr>';
    }
    out += "</tbody></table></div>";
  }
  mount(out);
}

function viewRequirement(id) {
  setTab("requirements");
  var req = null;
  for (var i = 0; i < MODEL.requirements.length; i++) if (MODEL.requirements[i].id === id) req = MODEL.requirements[i];
  if (!req) { mount('<div class="panel empty">Unknown requirement.</div>'); return; }

  var out = crumbs([{ label: "Overview", href: "/" }, { label: "Requirements", href: "/requirements" }, { label: req.id }]);
  out += '<div class="detail-head"><p class="eyebrow" style="color:var(--azure)">Business requirement</p>' +
    '<h1 class="mono" style="font-size:26px">' + esc(req.id) + '</h1><p class="sub">' + esc(req.text) +
    '</p><div class="meta-row on-light">' +
    '<span class="chip">Category <strong>' + esc(req.category) + "</strong></span>" +
    '<span class="chip">Source <strong>' + esc(req.source) + "</strong></span>" +
    '<span class="chip">Compliance <strong style="color:' + colour(req.stats.passRate) + '">' + pct(req.stats.passRate) + "</strong></span>" +
    "</div></div>";

  if (!req.coveredBy.length) {
    out += '<div class="finding medium"><div class="kind">Coverage gap</div><h3>No dimension tests this requirement</h3>' +
      "<p>Add a dimension referencing " + esc(req.id) + " to a test case, or retire the requirement.</p></div>";
    mount(out);
    return;
  }

  out += '<div class="section"><h2>Tested by</h2><table class="data"><thead><tr><th>Test case</th><th>Dimension</th>' +
    '<th class="mid">Weight</th><th>Pass rate</th><th></th></tr></thead><tbody>';
  for (var c = 0; c < req.coveredBy.length; c++) {
    var cv = req.coveredBy[c];
    var tc = findTestCase(cv.testCase);
    var d = tc && findDim(tc, cv.dimension);
    out += '<tr class="clickable" onclick="go(\'/tc/' + encodeURIComponent(cv.testCase) + "/dim/" +
      encodeURIComponent(cv.dimension) + '\')"><td>' + esc(niceName(cv.testCase)) + "</td><td>" + esc(cv.dimension) + "</td>" +
      '<td class="mid"><span class="badge w">' + cv.weight + "</span></td>" +
      "<td>" + (d ? bar(d.stats.passRate) : "—") + "</td>" +
      '<td class="num" style="color:var(--dim)">›</td></tr>';
  }
  out += "</tbody></table></div>";

  // Every failure attributable to this requirement, with the scorer's reasoning.
  var fails = [];
  for (var k = 0; k < req.coveredBy.length; k++) {
    var cov2 = req.coveredBy[k];
    var tcase = findTestCase(cov2.testCase);
    if (!tcase) continue;
    for (var t = 0; t < tcase.transcripts.length; t++) {
      var tx = tcase.transcripts[t];
      for (var s = 0; s < tx.scores.length; s++) {
        var sc = tx.scores[s];
        if (sc.dimension === cov2.dimension && !sc.na && !sc.passed) {
          fails.push({ tx: tx, sc: sc, dim: cov2.dimension, tc: cov2.testCase });
        }
      }
    }
  }

  out += '<div class="section"><h2>Failures attributed to this requirement</h2>';
  if (!fails.length) {
    out += '<div class="panel empty">No failures — every dimension mapped to this requirement passed on every interaction.</div>';
  } else {
    out += '<table class="data"><thead><tr><th>Interaction</th><th>Dimension</th><th class="num">Score</th><th>Reasoning</th></tr></thead><tbody>';
    for (var f = 0; f < fails.length; f++) {
      out += '<tr class="clickable" onclick="go(\'/tx/' + encodeURIComponent(fails[f].tx.id) + '\')">' +
        "<td>" + esc(fails[f].tx.label) + "</td><td>" + esc(fails[f].dim) + "</td>" +
        '<td class="num" style="color:' + colour(fails[f].sc.score) + '">' + fails[f].sc.score.toFixed(2) + "</td>" +
        '<td style="color:var(--muted);font-size:12.5px">' + esc(fails[f].sc.reasoning) + "</td></tr>";
    }
    out += "</tbody></table>";
  }
  out += "</div>";
  mount(out);
}

/* ── Test case list tab ─────────────────────────────────────────────────── */

function viewTestCases() {
  setTab("testcases");
  mount('<div class="section"><h2>Test cases <span class="hint">click through to the rubric</span></h2>' +
    testCaseTable() + "</div>");
}

/* ── Chrome + routes ────────────────────────────────────────────────────── */

function renderChrome() {
  var r = MODEL.run;
  var h = MODEL.headline;

  document.getElementById("eyebrow").textContent =
    "Eval run \u00b7 " + (r.mode === "existing" ? "Existing production summaries" : "Prompt test");
  // The set name is hyphenated and long; letting it break on spaces keeps the headline on
  // one or two tidy lines instead of splitting a word mid-hyphen.
  document.getElementById("title").innerHTML =
    '<span>Run ' + r.number + "</span> " + esc(MODEL.testSet.name.replace(/-/g, " "));
  document.getElementById("subtitle").textContent =
    MODEL.config.name + " \u00b7 " + MODEL.testCases.length + " test case" +
    (MODEL.testCases.length === 1 ? "" : "s") + " across " + h.transcriptsEvaluated +
    " interaction" + (h.transcriptsEvaluated === 1 ? "" : "s") +
    " \u00b7 finalised " + date(r.finalizedAt, true);

  setDial(h.passRate, "Passed every test case",
    h.transcriptsPassed + " of " + h.transcriptsEvaluated + " interactions");
  setStamp(h.passRate, (WEIGHTED ? "Weighted" : "Mean") + " score " + score2(metricOf(h.stats)));

  var chips = [
    '<span class="chip">Run <strong>' + r.number + "</strong></span>",
    r.promptVersion.number !== null
      ? '<span class="chip ' + (r.promptVersion.status || "") + '"><b>Version</b> <strong>' +
        r.promptVersion.number + "</strong>" + (r.promptVersion.status ? " \u00b7 " + r.promptVersion.status : "") + "</span>"
      : '<span class="chip warn">Unversioned prompt</span>',
    '<span class="chip"><b>Interactions</b> <strong>' + r.transcriptsEvaluated + "</strong></span>",
    '<span class="chip"><b>Dimension scores</b> <strong>' + h.stats.evaluated + "</strong></span>",
  ];
  if (r.skipped.length) {
    chips.push('<span class="chip warn"><b>Skipped</b> <strong>' + r.skipped.length + "</strong> \u00b7 too short to summarise</span>");
  }
  if (!MODEL.coverage.requirementsUnavailable && MODEL.coverage.uncoveredRequirementIds.length) {
    chips.push('<span class="chip danger"><b>Untested requirements</b> <strong>' +
      MODEL.coverage.uncoveredRequirementIds.length + "</strong></span>");
  }
  if (r.previewStructure && r.previewStructure.indexOf("fallback") === 0) {
    chips.push('<span class="chip danger">Preview structure: fallback defaults</span>');
  }
  document.getElementById("chips").innerHTML = chips.join("");

  document.getElementById("tab-counts-testcases").textContent = MODEL.testCases.length;
  document.getElementById("tab-counts-requirements").textContent =
    MODEL.coverage.requirementsUnavailable ? "\u2014" : MODEL.requirements.length;
  document.getElementById("tab-counts-transcripts").textContent = MODEL.run.transcriptsEvaluated;

  document.getElementById("foot").innerHTML =
    "<span>Generated " + date(MODEL.generator.generatedAt, true) + "</span>" +
    '<span class="mono">sdd-summary-mcp v' + esc(MODEL.generator.serverVersion) + "</span>" +
    '<span class="mono">report schema v' + MODEL.generator.schemaVersion + "</span>" +
    "<span>Self-contained \u2014 safe to copy or share as a single file</span>";
}

route("/", viewOverview);
route("/testcases", viewTestCases);
route("/tc/:name", viewTestCase);
route("/tc/:name/dim/:dim", viewDimension);
route("/transcripts", viewTranscripts);
route("/tx/:id", viewTranscript);
route("/requirements", viewRequirements);
route("/req/:id", viewRequirement);

renderChrome();
renderRoute();
