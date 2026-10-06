'use strict';

/**
 * Every interactive-shell probe must run in its OWN session.
 *
 * The failure this file exists to prevent: `spawnSync(SHELL, ['-ilc', …])`
 * without `detached`. An interactive shell enables job control — it opens
 * /dev/tty and tcsetpgrp()s itself into the foreground. Launched from a
 * terminal (`npm run dev`), that takes the controlling terminal away from
 * Electron, and the app is left STOPPED by SIGTTIN/SIGTTOU the moment a hive
 * opens. Worse, a *stopped* process never runs a SIGTERM handler, so the
 * wedged tree survives pkill and keeps holding the Vite port and the Electron
 * singleton lock.
 *
 * `-i` itself is load-bearing and must stay: a non-interactive shell skips the
 * rc file (the stock `case $- in *i*) ;; *) return;; esac` guard), which costs
 * us every nvm/asdf/brew PATH edit — and that PATH is handed to every agent.
 * So the fix is the session, not the flag.
 *
 * Parse the TypeScript AST rather than grepping, so a comment or an unrelated
 * string cannot satisfy the contract.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const mainDir = path.join(__dirname, '..', 'src', 'main');

function property(object, name) {
  return object.properties.find((entry) => (
    ts.isPropertyAssignment(entry)
    && ((ts.isIdentifier(entry.name) && entry.name.text === name)
      || (ts.isStringLiteral(entry.name) && entry.name.text === name))
  ));
}

/** `{ … } as SpawnSyncOptions…` — `detached` is honored by libuv but missing
 *  from @types/node's spawnSync options, so the call sites assert. Unwrap it. */
function unwrap(node) {
  let out = node;
  while (out && (ts.isAsExpression(out) || ts.isParenthesizedExpression(out))) out = out.expression;
  return out;
}

/** Every spawnSync(cmd, [... '-ilc' ...], opts) across the main process. */
function interactiveShellSpawns() {
  const found = [];
  for (const file of fs.readdirSync(mainDir).filter((f) => f.endsWith('.ts'))) {
    const filename = path.join(mainDir, file);
    const text = fs.readFileSync(filename, 'utf8');
    const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);

    function visit(node) {
      if (
        ts.isCallExpression(node)
        && ts.isIdentifier(node.expression)
        && node.expression.text === 'spawnSync'
      ) {
        const args = unwrap(node.arguments?.[1]);
        const isInteractive = args
          && ts.isArrayLiteralExpression(args)
          && args.elements.some((el) => ts.isStringLiteral(el) && el.text.includes('-i'));
        if (isInteractive) found.push({ file, options: unwrap(node.arguments?.[2]) });
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
  }
  return found;
}

test('every interactive-shell spawnSync is detached from our session', () => {
  const spawns = interactiveShellSpawns();

  // Guard the guard: if the call sites are renamed or removed, this test must
  // fail loudly rather than vacuously pass on an empty list.
  assert.ok(
    spawns.length >= 2,
    `expected the shellEnv + memory interactive-shell probes, found ${spawns.length}`
  );

  for (const { file, options } of spawns) {
    assert.ok(
      options && ts.isObjectLiteralExpression(options),
      `${file}: interactive spawnSync must pass a literal options object`
    );
    const detached = property(options, 'detached');
    assert.ok(detached, `${file}: interactive spawnSync must set detached`);
    assert.equal(
      detached.initializer.kind,
      ts.SyntaxKind.TrueKeyword,
      `${file}: detached must be true — otherwise the shell steals the terminal`
    );
  }
});
