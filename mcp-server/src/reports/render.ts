/**
 * Renders a report model into a self-contained HTML page.
 *
 * The templates are real .html/.css/.js files under templates/, inlined into the bundle at
 * build time (see build.mjs). That means a deployed plugin can never have a stale template
 * sitting next to a newer server, and editing a view does not involve escaping HTML inside
 * TypeScript string literals.
 *
 * Rendering is deliberately thin: it injects the model and the assets, and the page renders
 * itself. Every pivot the viewer offers — by test case, by rubric dimension, by transcript,
 * by requirement — is the same model read differently, so pivots are added in the viewer
 * rather than by generating more HTML here.
 */

import runTemplate from "template:run.html";
import improvementsTemplate from "template:improvements.html";
import styles from "template:report.css";
import sharedScript from "template:shared.js";
import runScript from "template:run.js";
import improvementsScript from "template:improvements.js";
import type { ImprovementsReport, RunReport } from "./model.js";

/**
 * Embed JSON inside a <script> block safely. Escaping `<` is what prevents a `</script>`
 * sequence inside any transcript or prompt text from terminating the block early — and
 * transcripts are user content, so this is not hypothetical.
 */
function embedJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Replace a token everywhere without interpreting `$` patterns in the replacement. */
function fill(template: string, token: string, value: string): string {
  return template.split(`{{${token}}}`).join(value);
}

function render(
  template: string,
  viewer: string,
  pageTitle: string,
  model: unknown,
): string {
  let html = template;
  html = fill(html, "PAGE_TITLE", pageTitle.replace(/[<>&"]/g, ""));
  html = fill(html, "STYLES", styles);
  html = fill(html, "SHARED", sharedScript);
  html = fill(html, "VIEWER", viewer);
  // Model last: its content is data, so it must not be scanned for further tokens.
  html = fill(html, "MODEL", embedJson(model));
  return html;
}

export function renderRunReport(model: RunReport): string {
  return render(
    runTemplate,
    runScript,
    `Run ${model.run.number} — ${model.testSet.name}`,
    model,
  );
}

export function renderImprovementsReport(model: ImprovementsReport): string {
  return render(
    improvementsTemplate,
    improvementsScript,
    `Improvements — ${model.testSet.name}`,
    model,
  );
}
