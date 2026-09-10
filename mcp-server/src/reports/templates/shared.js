/* Shared viewer helpers. Loaded before the per-report script.
   Plain ES5-compatible browser JS: no build step, no dependencies, no network. */

/** The report model, embedded by the generator. */
var MODEL = JSON.parse(document.getElementById("report-model").textContent);

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Percentage for display. Null means "nothing was evaluated", not zero. */
function pct(n, dash) {
  if (n === null || n === undefined || isNaN(n)) return dash === undefined ? "—" : dash;
  return Math.round(n * 100) + "%";
}

function score2(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  return n.toFixed(2);
}

/** Traffic-light colour. Thresholds match the pass/fail language used in the guides. */
function colour(v) {
  if (v === null || v === undefined || isNaN(v)) return "var(--na)";
  if (v >= 0.9) return "var(--pass)";
  if (v >= 0.7) return "var(--warn)";
  return "var(--fail)";
}

function heatColour(v) {
  if (v === null || v === undefined) return null;
  // Brand ramp: orange → amber → patina, so a grid reads at a glance and still looks
  // like the rest of the report. Values are tinted rather than saturated so the navy
  // numerals stay legible on every cell.
  var stops = [[0, [255, 138, 112]], [0.5, [250, 205, 120]], [0.8, [196, 226, 168]], [1, [126, 232, 207]]];
  for (var i = 0; i < stops.length - 1; i++) {
    if (v <= stops[i + 1][0]) {
      var t = (v - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
      var a = stops[i][1], b = stops[i + 1][1];
      return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * t) + "," +
        Math.round(a[1] + (b[1] - a[1]) * t) + "," +
        Math.round(a[2] + (b[2] - a[2]) * t) + ")";
    }
  }
  return "rgb(126,232,207)";
}

function bar(v) {
  if (v === null || v === undefined) return '<span class="empty">n/a</span>';
  return '<div class="bar-row"><span class="pct" style="color:' + colour(v) + '">' + pct(v) +
    '</span><div class="bar"><i style="width:' + (v * 100) + '%;background:' + colour(v) + '"></i></div></div>';
}

function deltaTag(d) {
  if (d === null || d === undefined) return "";
  if (Math.abs(d) < 0.005) return '<span class="delta eq">no change</span>';
  var cls = d > 0 ? "up" : "dn";
  return '<span class="delta ' + cls + '">' + (d > 0 ? "▲" : "▼") + " " + pct(Math.abs(d)) + "</span>";
}

function date(iso, withTime) {
  if (!iso) return "—";
  var d = new Date(iso);
  var opts = { day: "numeric", month: "short", year: "numeric" };
  if (withTime) { opts.hour = "2-digit"; opts.minute = "2-digit"; }
  return d.toLocaleString("en-AU", opts);
}

/** Truncate for table cells while keeping the full text in a tooltip. */
function clip(s, n) {
  s = String(s || "");
  return s.length > n ? esc(s.slice(0, n)) + "…" : esc(s);
}

/** Prettify a test case name for display. Requirement IDs are left alone — their
    hyphens are part of the identifier. */
function pretty(s) {
  s = String(s);
  return /^TC-/.test(s) ? s.replace(/^TC-/, "").replace(/-/g, " ") : s;
}

/* ── Hash routing ─────────────────────────────────────────────────────────
   Deep links work inside a single self-contained file, so a specific rubric or
   transcript can be shared by URL without a server. */

var ROUTES = [];

function route(pattern, render) {
  ROUTES.push({ parts: pattern.split("/").filter(Boolean), render: render });
}

function go(path) {
  if (location.hash === "#" + path) { renderRoute(); return; }
  location.hash = path;
}

function renderRoute() {
  var path = location.hash.replace(/^#/, "") || "/";
  var parts = path.split("/").filter(Boolean);
  for (var i = 0; i < ROUTES.length; i++) {
    var r = ROUTES[i];
    if (r.parts.length !== parts.length) continue;
    var args = [];
    var ok = true;
    for (var j = 0; j < r.parts.length; j++) {
      if (r.parts[j].charAt(0) === ":") args.push(decodeURIComponent(parts[j]));
      else if (r.parts[j] !== parts[j]) { ok = false; break; }
    }
    if (ok) {
      r.render.apply(null, args);
      window.scrollTo(0, 0);
      return;
    }
  }
  ROUTES[0].render();
}

function mount(html) {
  document.getElementById("body").innerHTML = html;
}

function crumbs(items) {
  var out = [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    out.push(it.href
      ? '<a onclick="go(\'' + it.href + '\')">' + esc(it.label) + "</a>"
      : "<span>" + esc(it.label) + "</span>");
  }
  return '<div class="crumbs">' + out.join(' <span>/</span> ') + "</div>";
}

/**
 * Paint the hero dial. The arc is the headline metric, coloured by the same thresholds as
 * every other score in the report so the hero cannot disagree with the tables below it.
 */
function setDial(value, label, sub) {
  var el = document.getElementById("dial");
  var pctVal = (value === null || value === undefined || isNaN(value)) ? 0 : value;
  var hue = pctVal >= 0.9 ? "var(--patina)" : pctVal >= 0.7 ? "var(--amber)" : "var(--orange)";
  el.style.setProperty("--arc", Math.round(pctVal * 100) + "%");
  el.style.setProperty("--dial-color", hue);
  document.getElementById("dialnum").innerHTML =
    (value === null || value === undefined || isNaN(value))
      ? "—"
      : Math.round(value * 100) + "<small>%</small>";
  if (label) document.getElementById("diallab").textContent = label;
  document.getElementById("dialsub").textContent = sub || "";
}

/** The status dot in the hero: green when healthy, amber marginal, orange failing. */
function setStamp(value, text) {
  var dot = document.getElementById("stampdot");
  dot.className = "live-dot" + (value >= 0.9 ? "" : value >= 0.7 ? " warn" : " fail");
  document.getElementById("stamptext").textContent = text;
}

function setTab(name) {
  var tabs = document.querySelectorAll(".tab");
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].className = "tab" + (tabs[i].getAttribute("data-tab") === name ? " active" : "");
  }
}

window.addEventListener("hashchange", renderRoute);
