import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';

import { validatePack, DEFAULT_THEME_ID } from '../../src/shared/themePack';

function readTree(dir: string, base = dir, out: Record<string, Uint8Array> = {}): Record<string, Uint8Array> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) readTree(full, base, out);
    else out[relative(base, full).split(sep).join('/')] = new Uint8Array(readFileSync(full));
  }
  return out;
}

const themesDir = resolve(__dirname, '../../resources/themes');

describe('built-in plain pack', () => {
  it('is the default theme id', () => {
    expect(DEFAULT_THEME_ID).toBe('plain');
  });

  const result = validatePack({ dirName: 'plain', files: readTree(resolve(themesDir, 'plain')) });

  it('validates with no errors and no warnings', () => {
    expect(result.issues).toEqual([]);
    expect(result.pack).not.toBeNull();
  });

  it('reserves desk-ceo as the first seat and provides an entrance', () => {
    const pack = result.pack!;
    expect(pack.manifest.seats.primary[0]).toBe('desk-ceo');
    expect(pack.mapRaw).toContain('"entrance"');
  });

  it('is the only pack shipped in the repo', () => {
    const tracked = readdirSync(themesDir).filter((n) => existsSync(join(themesDir, n, 'theme.json')));
    expect(tracked).toEqual(['plain']);
  });
});

// Optional: packs kept outside the repo (MD_THEMES_DIR) must still satisfy the contract.
const external = process.env.MD_THEMES_DIR;
describe.skipIf(!external || !existsSync(external ?? ''))('external packs (MD_THEMES_DIR)', () => {
  const dirs = external && existsSync(external)
    ? readdirSync(external).filter((n) => existsSync(join(external, n, 'theme.json')))
    : [];
  for (const name of dirs) {
    it(`${name} has no validation errors`, () => {
      const r = validatePack({ dirName: name, files: readTree(join(external!, name)) });
      expect(r.issues.filter((i) => i.level === 'error')).toEqual([]);
    });
  }
});
