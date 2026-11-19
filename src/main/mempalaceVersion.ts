/**
 * Which MemPalace release is installed, read without blocking the main process.
 *
 * The setup rows compare it with MEMPALACE_PIN and show a notice when they
 * differ. Nothing here installs, upgrades or downgrades anything.
 *
 * Read from disk first. `uv tool install` puts the CLI at
 * `<tool>/bin/mempalace` (symlinked from ~/.local/bin) beside
 * `<tool>/lib/python3.X/site-packages/mempalace-<version>.dist-info`, and on
 * Windows at `<tool>\Scripts` beside `<tool>\Lib\site-packages`. The folder
 * name IS the version: an async readdir, no process. Only an install laid out
 * some other way (pip, Homebrew, a Windows trampoline copy) falls back to
 * `mempalace --version`, which starts Python and took 1.1 to 3.0 s here, so
 * it runs async, under a timeout, and only once per binary per launch.
 */
import { execFile } from 'node:child_process';
import { readdir, realpath } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const DIST_INFO = /^mempalace-(\d+\.\d+\.\d+[0-9A-Za-z.+-]*)\.dist-info$/;

/** "MemPalace 3.3.5" to "3.3.5"; null when there is no version in it. */
export function parseMempalaceVersion(text: string | null | undefined): string | null {
  const m = /(\d+\.\d+\.\d+[0-9A-Za-z.+-]*)/.exec(text ?? '');
  return m ? m[1] : null;
}

/** The site-packages folders a uv tool environment can have. */
async function sitePackages(toolDir: string): Promise<string[]> {
  const out = [join(toolDir, 'Lib', 'site-packages')];
  try {
    for (const name of await readdir(join(toolDir, 'lib'))) {
      if (name.startsWith('python')) out.push(join(toolDir, 'lib', name, 'site-packages'));
    }
  } catch { /* not a POSIX venv */ }
  return out;
}

/** The version from the dist-info folder beside the CLI, or null. */
export async function versionFromInstall(bin: string): Promise<string | null> {
  let real: string;
  try { real = await realpath(bin); } catch { return null; }
  const toolDir = dirname(dirname(real));
  for (const dir of await sitePackages(toolDir)) {
    let names: string[];
    try { names = await readdir(dir); } catch { continue; }
    for (const name of names) {
      const m = DIST_INFO.exec(name);
      if (m) return m[1];
    }
  }
  return null;
}

/** `mempalace --version`, async and bounded. Null on any failure. */
export function versionFromCli(bin: string, env: NodeJS.ProcessEnv = process.env, timeoutMs = 5000): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      execFile(bin, ['--version'], { env, timeout: timeoutMs, windowsHide: true, encoding: 'utf8' }, (err, stdout) => {
        resolve(err ? null : parseMempalaceVersion(stdout));
      });
    } catch { resolve(null); }
  });
}

const cliProbes = new Map<string, Promise<string | null>>();

/** The installed version for this binary; null when it cannot be read (no
 *  notice then). The dist-info read is cheap, so it runs on every check and a
 *  Recheck right after switching versions shows the new one. Only the slow
 *  `--version` fallback is cached, once per binary per launch, and concurrent
 *  callers share it. */
export async function mempalaceVersion(bin: string): Promise<string | null> {
  const fromDisk = await versionFromInstall(bin).catch(() => null);
  if (fromDisk) return fromDisk;
  let probe = cliProbes.get(bin);
  if (!probe) {
    probe = versionFromCli(bin);
    cliProbes.set(bin, probe);
  }
  return probe;
}

