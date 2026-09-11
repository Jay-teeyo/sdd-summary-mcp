/**
 * Reads business requirements out of requirements/final/requirements.md.
 *
 * requirements.md is hand-maintained markdown, not a generated file, so parsing is
 * deliberately forgiving: anything that looks like a `BR-` row in a pipe table is taken,
 * and anything else is ignored. A file that cannot be parsed leaves the requirements
 * pivot unavailable rather than empty — the two mean very different things, since an
 * empty pivot reads as "nothing to check" when the truth is "we could not look".
 */

import fs from "fs";
import path from "path";
import { lifecycleConfigDir } from "../storage.js";

export interface ParsedRequirement {
  id: string;
  category: string;
  text: string;
  source: string;
}

export interface ParsedRequirements {
  requirements: ParsedRequirement[];
  /** Absolute path read, for reporting back to the user. */
  filePath: string | null;
  /** True when requirements.md does not exist or held no recognisable rows. */
  unavailable: boolean;
}

function requirementsPath(configName: string): string {
  return path.join(lifecycleConfigDir(configName), "requirements", "final", "requirements.md");
}

/** Strips markdown emphasis and inline code so a table cell reads as plain prose. */
function cleanCell(cell: string): string {
  return cell
    .replace(/`/g, "")
    .replace(/\*\*/g, "")
    .replace(/^\*|\*$/g, "")
    .trim();
}

export function parseRequirementsMarkdown(markdown: string): ParsedRequirement[] {
  const out: ParsedRequirement[] = [];
  const seen = new Set<string>();

  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trimStart().startsWith("|")) continue;

    const cells = line.split("|").slice(1, -1).map(cleanCell);
    if (cells.length < 3) continue;

    // Only rows whose first cell is a real requirement ID. This skips the header, the
    // separator row, the out-of-scope table in the guide, and any prose table the author
    // has added — without needing to know where the requirements table starts.
    const id = cells[0];
    if (!/^BR-[A-Za-z0-9_]+-\d+$/.test(id)) continue;
    // A template row copied from the guide is not a requirement.
    if (/\{|\}/.test(cells.join(" "))) continue;
    if (seen.has(id)) continue;
    seen.add(id);

    out.push({
      id,
      category: cells[1] || "Uncategorised",
      text: cells[2] || "",
      source: cells[3] || "",
    });
  }

  return out;
}

export function loadRequirements(configName: string): ParsedRequirements {
  const filePath = requirementsPath(configName);
  if (!fs.existsSync(filePath)) {
    return { requirements: [], filePath: null, unavailable: true };
  }
  const requirements = parseRequirementsMarkdown(fs.readFileSync(filePath, "utf-8"));
  return { requirements, filePath, unavailable: requirements.length === 0 };
}
