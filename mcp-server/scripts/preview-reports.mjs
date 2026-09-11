/**
 * Renders both reports from fixture data so the templates can be reviewed without running
 * an eval against Genesys.
 *
 *   npm run preview:reports
 *
 * Output goes to mcp-server/.reports-preview/ (gitignored). Open the printed paths in a
 * browser; deep links inside each page work from the file:// scheme.
 */
import * as esbuild from "esbuild";
import { mkdirSync, writeFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { templateTextPlugin } from "../build-shared.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, ".reports-preview");
const tmp = join(outDir, ".preview-entry.mjs");

mkdirSync(outDir, { recursive: true });

// Bundle the fixtures + renderer with the same template plugin the real build uses, so a
// preview can never look different from what ships.
await esbuild.build({
  stdin: {
    contents: `
      export { runReportFixture, improvementsReportFixture, rollupReportFixture } from "./src/reports/fixtures.ts";
      export { renderRunReport, renderImprovementsReport, renderRollupReport } from "./src/reports/render.ts";
    `,
    resolveDir: root,
    sourcefile: "preview-entry.ts",
    loader: "ts",
  },
  outfile: tmp,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  plugins: [templateTextPlugin],
});

const { runReportFixture, improvementsReportFixture, rollupReportFixture, renderRunReport,
  renderImprovementsReport, renderRollupReport } =
  await import(pathToFileURL(tmp).href);

const outputs = [
  ["run-dashboard.html", renderRunReport(runReportFixture())],
  ["improvements.html", renderImprovementsReport(improvementsReportFixture())],
  ["rollup.html", renderRollupReport(rollupReportFixture())],
];

for (const [name, html] of outputs) {
  const path = join(outDir, name);
  writeFileSync(path, html, "utf8");
  console.log(`${(statSync(path).size / 1024).toFixed(0).padStart(4)} KB  ${path}`);
}

rmSync(tmp, { force: true });
