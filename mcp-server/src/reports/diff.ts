/**
 * Line diff for prompt versions, used by the improvements changelog.
 *
 * Prompts are short enough (tens of lines) that a plain LCS table is cheap and gives a
 * far more readable result than a heuristic. The output is trimmed to the changed regions
 * with a little context, because a changelog entry showing an unchanged 60-line prompt
 * buries the two lines that actually moved.
 */

import type { PromptDiffLine } from "./model.js";

const CONTEXT_LINES = 2;
/** Beyond this, a diff stops being reviewable in a report and belongs in a diff tool. */
const MAX_LINES = 120;

export interface PromptDiff {
  added: number;
  removed: number;
  lines: PromptDiffLine[];
  isFirst: boolean;
  unavailable: boolean;
}

function lcsDiff(before: string[], after: string[]): PromptDiffLine[] {
  const n = before.length;
  const m = after.length;
  // table[i][j] = length of the longest common subsequence of before[i:] and after[j:]
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] = before[i] === after[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const out: PromptDiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      out.push({ type: "context", text: before[i] });
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push({ type: "remove", text: before[i] });
      i++;
    } else {
      out.push({ type: "add", text: after[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: "remove", text: before[i++] });
  while (j < m) out.push({ type: "add", text: after[j++] });
  return out;
}

/** Drops runs of unchanged lines that are far from any change. */
function trimContext(lines: PromptDiffLine[]): PromptDiffLine[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, idx) => {
    if (line.type === "context") return;
    for (let k = Math.max(0, idx - CONTEXT_LINES); k <= Math.min(lines.length - 1, idx + CONTEXT_LINES); k++) {
      keep[k] = true;
    }
  });

  const out: PromptDiffLine[] = [];
  let skipping = false;
  lines.forEach((line, idx) => {
    if (keep[idx]) {
      out.push(line);
      skipping = false;
    } else if (!skipping) {
      out.push({ type: "context", text: "…" });
      skipping = true;
    }
  });
  return out.slice(0, MAX_LINES);
}

export function diffPrompts(before: string | null, after: string | null): PromptDiff {
  if (after === null) {
    return { added: 0, removed: 0, lines: [], isFirst: false, unavailable: true };
  }
  if (before === null) {
    return { added: 0, removed: 0, lines: [], isFirst: true, unavailable: false };
  }

  const lines = lcsDiff(before.split(/\r?\n/), after.split(/\r?\n/));
  return {
    added: lines.filter((l) => l.type === "add").length,
    removed: lines.filter((l) => l.type === "remove").length,
    lines: trimContext(lines),
    isFirst: false,
    unavailable: false,
  };
}
