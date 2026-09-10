/**
 * Report templates are imported as strings via the virtual `template:` specifier and
 * inlined at build time by the plugin in build-shared.mjs. This declaration lets tsc
 * typecheck those imports without resolving the files itself — which matters for the
 * viewer scripts, since TypeScript would otherwise treat them as untyped JavaScript
 * modules rather than as text.
 */
declare module "template:*" {
  const contents: string;
  export default contents;
}
