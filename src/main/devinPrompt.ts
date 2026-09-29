import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { homedir } from 'node:os';

/** Devin rejects --prompt-file together with a positional initial prompt. When
 * the user supplied a prompt file, keep its contents and the hive briefing in
 * one private file, then pass only --prompt-file to Devin. The user's file is
 * never modified. Without a prompt file, leave `-- <hive prompt>` intact. */
export function prepareDevinPromptFile(args: string[], cwd: string, agentDir: string): string[] {
  const separator = args.lastIndexOf('--');
  if (separator < 0 || separator !== args.length - 2) return args;

  let fileArg = -1;
  let sourcePath = '';
  let equalsForm = false;
  for (let i = 0; i < separator; i++) {
    if (args[i] === '--prompt-file' && i + 1 < separator) {
      fileArg = i + 1;
      sourcePath = args[i + 1];
      equalsForm = false;
      i++;
    } else if (args[i].startsWith('--prompt-file=')) {
      fileArg = i;
      sourcePath = args[i].slice('--prompt-file='.length);
      equalsForm = true;
    }
  }
  if (fileArg < 0) return args;

  const expanded = sourcePath === '~' ? homedir() : sourcePath.startsWith('~/') ? join(homedir(), sourcePath.slice(2)) : sourcePath;
  const source = isAbsolute(expanded) ? expanded : resolve(cwd, expanded);
  const personalPrompt = readFileSync(source, 'utf8');
  const privateDir = join(agentDir, '.devin');
  mkdirSync(privateDir, { recursive: true, mode: 0o700 });
  const combinedPath = join(privateDir, 'initial-prompt.md');
  writeFileSync(combinedPath, `${personalPrompt.trimEnd()}\n\n${args[separator + 1]}\n`, { mode: 0o600 });

  const result = args.slice(0, separator);
  result[fileArg] = equalsForm ? `--prompt-file=${combinedPath}` : combinedPath;
  return result;
}
