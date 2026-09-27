/**
 * The missing-engine-CLI install ladder.
 *
 * Split out of index.ts deliberately: it imports NOTHING from electron, so the
 * decision ("which installer can actually succeed on this machine?") and the
 * script it emits are both testable without booting an app.
 */
import type { AgentProvider, ProviderInstallInfo } from '../shared/agentProvider';
import { installInfoForProvider } from '../shared/agentProvider';
import type { CliMissingState } from '../shared/cliMissing';
import type { NodeInstaller } from './nodeInstall';
import { buildNodeInstallScript } from './nodeInstall';

export type InstallRungKind = 'npm' | 'node-then-npm' | 'native' | 'manual';

/** The card's state for a missing CLI (I2): the rung the ladder would run and
 *  the exact command, said before anything runs. The same inputs as
 *  buildMissingCliScript, so what the card promises is what Install does. */
export function describeMissingCli(
  provider: AgentProvider,
  bin: string,
  npmAvailable: boolean,
  platform: string = process.platform,
  nodeInstaller?: NodeInstaller | null
): CliMissingState {
  const info = installInfoForProvider(provider, platform);
  const rung = chooseInstallRung(info, npmAvailable, nodeInstaller);
  const safeBin = (bin || provider).replace(/[^A-Za-z0-9._-]/g, '') || provider;
  return {
    provider,
    label: info.label,
    bin: safeBin,
    rung: rung.kind,
    command: rung.command ?? null,
    manualCommand: rung.kind === 'manual' ? (info.command ?? null) : null,
    nodeMissing: rung.nodeMissing,
    ...(rung.kind === 'node-then-npm' && nodeInstaller ? { nodeVersion: nodeInstaller.version } : {}),
    ...(info.docsUrl ? { docsUrl: info.docsUrl } : {})
  };
}

/** Pick which rung of the install ladder to run, given what this machine has.
 *
 *  Every provider's `installCommand` is `npm install -g …`, which needs npm,
 *  which needs node. On a machine with no node the banner used to print that
 *  command anyway and run it — so the user watched `npm: command not found`
 *  scroll past and concluded the app was broken. Classify first:
 *
 *    npm usable                        → npm install (unchanged; the common case)
 *    npm absent, Node installer found  → install real Node + npm, THEN npm install
 *    npm absent, native installer      → the vendor's self-contained installer
 *    neither                           → manual only. Do NOT run a doomed command.
 *
 *  Founder decision (2026-08-07) put `node-then-npm` ABOVE `native`, reversing the
 *  earlier "never auto-install a system Node" rule: a user who only ever gets the
 *  node-free Claude installer still has no runtime for MCP servers, hooks, or any
 *  other provider — so the default is to fix the machine, not to route around it.
 *  `native` survives as the fallback for when no installer could be resolved
 *  (offline, or a platform nodejs.org ships no package for).
 *
 *  `npmAvailable` means npm is present AND its Node is new enough (see
 *  nodeInstall.NODE_FLOOR_MAJOR) — an ancient Node routes into the upgrade rung. */
export function chooseInstallRung(
  info: ProviderInstallInfo,
  npmAvailable: boolean,
  nodeInstaller?: NodeInstaller | null
): { command?: string; kind: InstallRungKind; nodeMissing: boolean } {
  if (info.command && npmAvailable) return { command: info.command, kind: 'npm', nodeMissing: false };
  if (info.command && nodeInstaller) return { command: info.command, kind: 'node-then-npm', nodeMissing: true };
  if (info.nativeCommand) return { command: info.nativeCommand, kind: 'native', nodeMissing: !npmAvailable };
  return { kind: 'manual', nodeMissing: !npmAvailable };
}

/** Build the shell script the missing-CLI auto-install path runs IN PLACE of a
 *  missing engine CLI. When a rung of the ladder above is runnable it prints a
 *  banner then RUNS it visibly (so the user can watch + finish any sign-in);
 *  otherwise it prints a manual instruction only and runs nothing. The script is
 *  emitted in the target platform's shell syntax ($SHELL on unix, cmd.exe on
 *  Windows) — `platform` is a parameter only so the Windows branch is reachable
 *  from a test on macOS. The only user-derived value (the missing binary name) is
 *  sanitized to a safe identifier; the install commands are trusted constants. */
export function buildMissingCliScript(
  bin: string,
  provider: AgentProvider,
  npmAvailable: boolean,
  platform: string = process.platform,
  nodeInstaller?: NodeInstaller | null
): string {
  const info: ProviderInstallInfo = installInfoForProvider(provider, platform);
  const safeBin = (bin || provider).replace(/[^A-Za-z0-9._-]/g, '') || provider;
  const rung = chooseInstallRung(info, npmAvailable, nodeInstaller);
  // Only the rung that actually needs it gets the Node install spliced in.
  const nodeSteps = rung.kind === 'node-then-npm' && nodeInstaller
    ? buildNodeInstallScript(nodeInstaller, platform)
    : null;
  const cmd = rung.command; // trusted constant, or undefined → manual hint only
  const label = info.label;
  const docs = info.docsUrl;
  const rule = '------------------------------------------------------------';

  if (platform === 'win32') {
    // ONE cmd.exe line: `&` chains steps, `^&` prints a literal ampersand, and the
    // script carries NO double-quotes (it is wrapped verbatim in `/d /s /c "..."`).
    // We avoid `if errorlevel` branching (untestable here) — a combined success/
    // failure hint after the install is robust and satisfies the manual-fallback DoD.
    const parts: string[] = ['echo.', `echo ${rule}`, `echo   Engine CLI not found:  ${safeBin}`, 'echo.'];
    if (nodeSteps && nodeInstaller) {
      parts.push(
        'echo   Node.js is not installed on this machine, so the usual npm',
        `echo   installer cannot run yet. Installing Node ${nodeInstaller.version} ^(+ npm^) first,`,
        'echo   straight from nodejs.org, checksum-verified.',
        'echo.',
        ...nodeSteps,
        'echo.'
      );
    } else if (rung.nodeMissing) {
      parts.push('echo   Node.js is not installed on this machine, so the usual', 'echo   npm installer cannot run here.', 'echo.');
    }
    if (cmd) {
      if (rung.kind === 'native') parts.push(`echo   Using the self-contained ${label} installer instead ^(no Node needed^):`);
      else parts.push(`echo   Installing the ${label} CLI now so you can watch:`);
      parts.push(
        'echo.',
        `echo     ${cmd}`,
        `echo ${rule}`,
        'echo.',
        cmd,
        'echo.',
        'echo   [done] If it succeeded, the next step shows above the message box.',
        'echo   If it failed, run the command above by hand, then press Check again on the card.'
      );
    } else {
      if (rung.nodeMissing) {
        parts.push(
          `echo   Install Node.js ^(nodejs.org^), then the ${label} CLI:`,
          `echo     ${info.command ?? ''}`,
          'echo   …or install the CLI by whatever method its docs recommend.'
        );
      } else {
        parts.push(
          `echo   No bundled installer for the ${label} provider.`,
          'echo   Install it manually, then restart the agent to launch it.'
        );
      }
      if (docs) parts.push(`echo   Docs: ${docs}`);
      parts.push(`echo ${rule}`);
    }
    return parts.join(' & ');
  }

  // unix ($SHELL -lc <script>): one statement per line, single-quoted echo text so
  // no shell metacharacter expands. We avoid `!` so any shell with history
  // expansion never fires. npm is found via the interactive PATH spawn() injects.
  const lines: string[] = [
    `echo ''`,
    `echo '${rule}'`,
    `echo '  Engine CLI not found:  ${safeBin}'`,
    `echo ''`
  ];
  if (nodeSteps && nodeInstaller) {
    // The default path on a bare machine: fix the runtime, then use it. Every
    // step aborts the whole script on failure, so the npm install below only
    // ever runs against a Node that actually landed.
    lines.push(
      `echo '  Node.js is not installed on this machine, so the usual npm'`,
      `echo '  installer cannot run yet. Installing Node ${nodeInstaller.version} (+ npm) first,'`,
      `echo '  straight from nodejs.org, checksum-verified.'`,
      `echo ''`,
      ...nodeSteps,
      `echo ''`
    );
  } else if (rung.nodeMissing) {
    lines.push(
      `echo '  Node.js is not installed on this machine, so the usual npm'`,
      `echo '  installer cannot run here.'`,
      `echo ''`
    );
  }
  if (cmd) {
    lines.push(
      ...(rung.kind === 'native'
        ? [`echo '  Using the self-contained ${label} installer instead (no Node needed) —'`,
           `echo '  finish any sign-in it prompts for, then come back to this terminal.'`]
        : [`echo '  Installing the ${label} CLI now so you can watch — finish any'`,
           `echo '  sign-in it prompts for, then come back to this terminal.'`]),
      `echo ''`,
      `echo '    ${cmd}'`,
      `echo '${rule}'`,
      `echo ''`,
      cmd,
      `__clirc=$?`,
      `echo ''`,
      `if [ $__clirc -eq 0 ]; then`,
      `  echo '  [done] Installed. The next step shows above the message box.'`,
      `else`,
      `  echo "  [x] Install exited with code $__clirc. Press Set up manually on the card, or run:"`,
      `  echo '    ${cmd}'`,
      ...(docs ? [`  echo '    Docs: ${docs}'`] : []),
      `  echo '  Then press Setup complete, start agent above the message box.'`,
      `fi`,
      // The installer's own exit code is the script's: without this the last
      // echo made every install exit 0, a failed one included, and main moved
      // on to sign in for a CLI that was not there (batch 2).
      `exit $__clirc`
    );
  } else if (rung.nodeMissing) {
    // The honest dead end: no node, and this vendor ships no node-free installer.
    // Say what is actually missing instead of running a command that cannot work.
    lines.push(
      `echo '  Install Node.js (nodejs.org), then the ${label} CLI:'`,
      ...(info.command ? [`echo '    ${info.command}'`] : []),
      `echo '  …or install the CLI by whatever method its docs recommend.'`,
      ...(docs ? [`echo '  Docs: ${docs}'`] : []),
      `echo '${rule}'`
    );
  } else {
    lines.push(
      `echo '  No bundled installer for the ${label} provider.'`,
      `echo '  Install it manually, then restart the agent to launch it.'`,
      ...(docs ? [`echo '  Docs: ${docs}'`] : []),
      `echo '${rule}'`
    );
  }
  return lines.join(String.fromCharCode(10));
}

/**
 * The sign in step after a clean install (0.5.3, batch 2): the provider's own
 * login command, run in the SAME terminal so the install output stays above
 * it. `binPath` is the binary the install just produced, resolved by main; the
 * login args are the trusted constants from shared/cliSetup.ts. The person
 * finishes the sign in there, then presses "Setup complete, start agent" above
 * the message box, which discards this terminal and starts the agent fresh.
 */
export function buildLoginScript(binPath: string, args: readonly string[], label: string, platform: string = process.platform): string {
  const rule = '------------------------------------------------------------';
  const safeArgs = args.map((a) => a.replace(/[^A-Za-z0-9._-]/g, '')).filter(Boolean);
  if (platform === 'win32') {
    // cmd.exe line, no double quotes (see buildMissingCliScript): the bare
    // binary name, which the install just put on PATH.
    const name = (binPath.split(/[\\/]/).pop() || binPath).replace(/[^A-Za-z0-9._-]/g, '');
    return [
      'echo.', `echo ${rule}`,
      `echo   Sign in to ${label}. When it says you are signed in,`,
      'echo   press Setup complete, start agent above the message box.',
      `echo ${rule}`, 'echo.',
      [name, ...safeArgs].join(' ')
    ].join(' & ');
  }
  const quoted = `'${binPath.replace(/'/g, `'\\''`)}'`;
  return [
    `echo ''`,
    `echo '${rule}'`,
    `echo '  Sign in to ${label}. When it says you are signed in,'`,
    `echo '  press Setup complete, start agent above the message box.'`,
    `echo '${rule}'`,
    `echo ''`,
    [quoted, ...safeArgs].join(' ')
  ].join(String.fromCharCode(10));
}

/**
 * "Set up manually" (0.5.3, batch 4, founder 24 Sep 2026: "showing them set up
 * manually button that opens the terminal with the command that starts the
 * terminal with the agent provider that is causing the issues"). Runs in the
 * agent's own pty with the agent's own environment (its CLI home included),
 * so what the person fixes here is what the agent reads.
 *
 *   install  the install failed: the install command runs, and the person is
 *            told to run the CLI after it and sign in.
 *   signin   the CLI is here but the sign in failed or cannot be seen: the CLI
 *            itself runs, and the person signs in inside it.
 *
 * Either way the terminal then stays open at the person's own shell, so they
 * can try again or check the agent works, and "Setup complete, start agent"
 * above the message box discards it and starts the agent. `exec` is the
 * trusted install constant or the resolved binary; `shown` is what the person
 * reads. Everything put into echo text is sanitised to plain characters.
 */
export function buildManualSetupScript(o: {
  reason: 'install' | 'signin';
  label: string;
  binName: string;
  shown: string;
  exec: string;
}, platform: string = process.platform): string {
  const rule = '------------------------------------------------------------';
  // Safe inside single quotes (posix) and in a cmd.exe echo: no quote, no &,
  // no < or >. `^|` is how a Windows install constant spells its pipe.
  const plain = (v: string): string => v.replace(/[^A-Za-z0-9 ._@/:+=|^\u00b7-]/g, '');
  const label = plain(o.label);
  const bin = plain(o.binName);
  const shown = plain(o.shown);
  if (platform === 'win32') {
    // cmd.exe line, no double quotes (see buildMissingCliScript). A bare
    // `cmd` at the end leaves the person at a prompt in this same window.
    return [
      'echo.', `echo ${rule}`,
      `echo   Set up ${label} by hand. This terminal has the agent settings.`,
      `echo   It runs:  ${shown}`,
      ...(o.reason === 'install' ? [`echo   When the install ends, run ${bin} here and sign in.`] : ['echo   Sign in inside it.']),
      'echo   Once the agent works here, press Setup complete, start agent',
      'echo   above the message box.',
      `echo ${rule}`, 'echo.',
      o.exec,
      'echo.',
      'cmd'
    ].join(' & ');
  }
  const run = o.reason === 'install' ? o.exec : `'${o.exec.replace(/'/g, `'\\''`)}'`;
  return [
    `echo ''`,
    `echo '${rule}'`,
    `echo '  Set up ${label} by hand. This terminal has the agent settings.'`,
    `echo '  It runs:  ${shown}'`,
    o.reason === 'install'
      ? `echo '  When the install ends, run ${bin} here and sign in.'`
      : `echo '  Sign in inside it.'`,
    `echo '  Once the agent works here, press Setup complete, start agent'`,
    `echo '  above the message box.'`,
    `echo '${rule}'`,
    `echo ''`,
    run,
    `echo ''`,
    `echo '  Your shell. Run it again, or check ${bin} works, then press'`,
    `echo '  Setup complete, start agent above the message box.'`,
    // The person's own interactive shell, so rc files (and any PATH line the
    // installer just added) apply to what they type next.
    `exec "\${SHELL:-/bin/sh}" -il`
  ].join(String.fromCharCode(10));
}
