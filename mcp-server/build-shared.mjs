/**
 * Shared esbuild configuration, used by both the server bundle and the report preview.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const templatesDir = join(dirname(fileURLToPath(import.meta.url)), "src", "reports", "templates");

/**
 * Resolves `template:<file>` imports to report template files and loads them as strings,
 * so templates can be authored as real .html, .css and .js files while still ending up
 * inside the single committed bundle.
 *
 * The virtual `template:` prefix is doing two jobs. It keeps esbuild's global `loader` map
 * out of it — mapping `.js` to `text` globally would turn every dependency in node_modules
 * into a string — and it stops TypeScript resolving the viewer scripts as JavaScript
 * modules, so one wildcard declaration covers all of them.
 */
export const templateTextPlugin = {
  name: "report-template-text",
  setup(build) {
    // The resolved path stays a bare filename and the directory is applied at load time.
    // esbuild writes each resolved path into the output as a module comment, so resolving to
    // an absolute path here would stamp the build machine's home directory into the
    // committed bundle.
    build.onResolve({ filter: /^template:/ }, (args) => ({
      path: args.path.slice("template:".length),
      namespace: "report-template",
    }));

    build.onLoad({ filter: /.*/, namespace: "report-template" }, async (args) => ({
      contents: await readFile(join(templatesDir, args.path), "utf8"),
      loader: "text",
    }));
  },
};
