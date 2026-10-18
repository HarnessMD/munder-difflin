'use strict';

/**
 * Read a SOURCE file for a test that inspects its text — LINE-ENDING INDEPENDENT.
 *
 * WHY THIS EXISTS. This repo has `core.autocrlf=true` and no `.gitattributes`, so the
 * same committed file is LF in the working tree it was authored in and CRLF in a fresh
 * checkout. A test that searches source for a literal containing `\n` therefore passes in
 * its author's tree and fails — or worse, passes for a different reason — everywhere else.
 * Dwight's validation of L0-FUSION stage 5.1 caught exactly that: `commitSectionSource`
 * looked for `'\n}\n'`, found nothing in a CRLF checkout, and failed before it had
 * inspected a single prohibition. Green only in the tree it was written in.
 *
 * So: every source-reading test in the L0-FUSION stage-5 files reads THROUGH HERE, and a
 * registered test asserts that none of them calls `readFileSync` on its own.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

/** CRLF and lone CR both become LF. Idempotent. */
function normaliseEol(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Read a repo file (relative to the repo root, or absolute) with LF line endings. */
function readSource(file) {
  return normaliseEol(fs.readFileSync(path.isAbsolute(file) ? file : path.join(ROOT, file), 'utf8'));
}

/** The same text as a CRLF checkout and as an LF checkout would hold it on disk. */
function bothEolRenderings(text) {
  const lf = normaliseEol(text);
  return { lf, crlf: lf.replace(/\n/g, '\r\n') };
}

/**
 * Source with its COMMENTS blanked out, for a check that something is ABSENT from code (the
 * files that removed a thing are exactly the files whose comments explain the removal).
 *
 * PARSED, NOT PATTERN-MATCHED. The first version was two regexes, and a `/*` inside a
 * STRING in src/main/index.ts made it swallow about two thousand lines of real code as one
 * "comment" - an absence check that could not see the code it was checking. Here the
 * TypeScript parser decides what a token is, and only the comment ranges between tokens
 * are blanked (with spaces, so offsets and line numbers survive).
 */
function codeOnly(text, fileName = 'x.tsx') {
  const ts = require('typescript');
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const ranges = [];
  const visit = (node) => {
    const kids = node.getChildren(sf);
    if (!kids.length || node.kind === ts.SyntaxKind.JsxText) {
      for (const r of ts.getLeadingCommentRanges(text, node.getFullStart()) ?? []) ranges.push(r);
      for (const r of ts.getTrailingCommentRanges(text, node.getEnd()) ?? []) ranges.push(r);
      return;
    }
    kids.forEach(visit);
  };
  visit(sf);
  let out = text;
  for (const r of ranges) out = out.slice(0, r.pos) + out.slice(r.pos, r.end).replace(/[^\n]/g, ' ') + out.slice(r.end);
  return out;
}

module.exports = { ROOT, normaliseEol, readSource, bothEolRenderings, codeOnly };
