/**
 * Bundles the MCP server into a single self-contained ES module.
 *
 * The output at bundle/sdd-summary-mcp.mjs is a COMMITTED artefact, because
 * Cursor installs a plugin by cloning its repository and never runs a build or
 * dependency install step. Anything the server needs at runtime therefore has
 * to already be inside that one file.
 *
 * Regenerate with `npm run bundle` and commit the result whenever src/ changes.
 */
import * as esbuild from "esbuild";
import { templateTextPlugin } from "./build-shared.mjs";
import { readFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const outfile = join(root, "bundle", "sdd-summary-mcp.mjs");
const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

mkdirSync(dirname(outfile), { recursive: true });

await esbuild.build({
  entryPoints: [join(root, "src", "index.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  // Matches the "node": ">=18.0.0" engines constraint in package.json.
  target: "node18",
  minify: false, // keep readable — this file is committed and gets reviewed
  sourcemap: false,
  banner: {
    // Shims `require` so bundling does not break any dependency that still
    // expects a CJS-style scope while running inside an ESM bundle.
    //
    // No shebang here: esbuild already hoists the one from src/index.ts to
    // line 1. Adding a second produced an invalid file that failed to parse.
    js: [
      "import { createRequire as __createRequire } from 'node:module';",
      "const require = __createRequire(import.meta.url);",
    ].join("\n"),
  },
  define: {
    "process.env.SDDSUM_VERSION": JSON.stringify(version),
  },
  // Report templates are authored as .html/.css/.js and inlined here, so the deployed
  // bundle carries them and cannot fall out of step with the code that renders them.
  plugins: [templateTextPlugin],
});

const kb = (statSync(outfile).size / 1024).toFixed(0);
console.log(`Bundled sdd-summary-mcp v${version} → bundle/sdd-summary-mcp.mjs (${kb} KB)`);
