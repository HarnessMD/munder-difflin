import { describe, it, expect } from 'vitest';
import {
  validatePack, readPngHeader, isSafeRelPath, normalizeThemeId, hexToNumber, numberToHex,
  PACK_LIMITS, type PackManifest,
} from '../../src/shared/themePack';

const enc = (s: string) => new TextEncoder().encode(s);

/** A header-only PNG: signature + IHDR is all the validator reads. */
export function fakePng(w: number, h: number, colorType = 6): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  b.set([0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52], 8);
  const dv = new DataView(b.buffer);
  dv.setUint32(16, w); dv.setUint32(20, h);
  b[24] = 8; b[25] = colorType;
  return b;
}

const W = 10, H = 10;
const plain = (fill = 0, n = W * H) => Array.from({ length: n }, () => fill);

function baseMap(over: Record<string, unknown> = {}) {
  const floor = plain(1);
  return {
    width: W, height: H, tilewidth: 16, tileheight: 16, infinite: false, orientation: 'orthogonal',
    layers: [
      { name: 'floor', type: 'tilelayer', data: floor },
      { name: 'walls', type: 'tilelayer', data: plain() },
      { name: 'furniture-below', type: 'tilelayer', data: plain() },
      { name: 'furniture-above', type: 'tilelayer', data: plain() },
      { name: 'collision', type: 'tilelayer', data: plain() },
      { name: 'spawn-points', type: 'objectgroup', objects: [
        { name: 'desk-ceo' }, { name: 'pc-1' }, { name: 'cafe-seat-1' }, { name: 'cafe-stand-coffee' },
      ] },
      { name: 'zones', type: 'objectgroup', objects: [] },
    ],
    tilesets: [
      { firstgid: 1, columns: 16, image: '../tilesets/a.png', imagewidth: 256, imageheight: 32, name: 'a', tilecount: 32, tilewidth: 16, tileheight: 16 },
    ],
    ...over,
  };
}

function baseManifest(over: Partial<PackManifest> = {}): PackManifest {
  return {
    schema: 1, id: 'test-pack', name: 'Test', version: '1.0.0', author: 'a', license: 'MIT',
    map: 'map.tmj',
    tilesets: [{ file: 'tilesets/a.png', embedded: true }, { file: 'tilesets/b.png', firstgid: 33 }],
    seats: { primary: ['desk-ceo', 'pc-1'], cafe: ['cafe-seat-1'], cafeStands: [['cafe-stand-coffee', 'coffee']] },
    coffee: {
      trayTile: { x: 1, y: 1 }, trayStand: { x: 1, y: 2 }, machineStand: { x: 2, y: 2 },
      sinkTile: { x: 3, y: 1 }, sinkStand: { x: 3, y: 2 }, maxCups: 4,
    },
    anchors: { calendar: { x: 1, y: 0 }, boards: { x: 2, y: 0 }, clock: { x: 3, y: 0 } },
    errandSpots: [{ kind: 'water', stand: { x: 4, y: 4 }, facing: 'left', fx: { x: 3, y: 4 }, duration: 4.5 }],
    monitor: { offTopLeftGid: 5, onGids: [[6, 0, 0]] },
    palette: { background: '#1a1320', noteColors: { todo: '#f2df8a', doing: '#9ecbf0', blocked: '#f0a3a3', done: '#a8e0b0' } },
    ...over,
  };
}

function pack(manifest: unknown = baseManifest(), map: unknown = baseMap(), extra: Record<string, Uint8Array> = {}) {
  return {
    dirName: 'test-pack',
    files: {
      'theme.json': enc(JSON.stringify(manifest)),
      'map.tmj': enc(JSON.stringify(map)),
      'tilesets/a.png': fakePng(256, 32),
      'tilesets/b.png': fakePng(64, 64),
      ...extra,
    } as Record<string, Uint8Array>,
  };
}

const codes = (r: ReturnType<typeof validatePack>, level?: 'error' | 'warn') =>
  r.issues.filter((i) => !level || i.level === level).map((i) => i.code);

describe('validatePack: happy path', () => {
  it('accepts a minimal valid pack and derives tileset metadata from PNG headers', () => {
    const r = validatePack(pack());
    expect(codes(r, 'error')).toEqual([]);
    expect(r.pack).not.toBeNull();
    const [a, b] = r.pack!.tilesets;
    expect(a).toEqual({ file: 'tilesets/a.png', embedded: true });
    expect(b.meta).toEqual({
      firstgid: 33, image: 'b', imagewidth: 64, imageheight: 64,
      tilewidth: 16, tileheight: 16, columns: 4, tilecount: 16,
    });
    expect(r.pack!.mapRaw).toBe(JSON.stringify(baseMap()));
  });

  it('assigns firstgid = previous end when omitted and honours an `image` label', () => {
    const m = baseManifest({ tilesets: [
      { file: 'tilesets/a.png', embedded: true }, { file: 'tilesets/b.png', image: 'label' },
    ] });
    const r = validatePack(pack(m));
    expect(r.pack!.tilesets[1].meta).toMatchObject({ firstgid: 33, image: 'label' });
  });

  it('accepts optional seats.facing for declared primary and cafe seats', () => {
    const m = baseManifest({
      seats: {
        primary: ['desk-ceo', 'pc-1'],
        cafe: ['cafe-seat-1'],
        cafeStands: [['cafe-stand-coffee', 'coffee']],
        facing: { 'desk-ceo': 'down', 'cafe-seat-1': 'left' },
      },
    });
    const r = validatePack(pack(m));
    expect(codes(r, 'error')).toEqual([]);
    expect(r.pack).not.toBeNull();
    expect(r.pack!.manifest.seats.facing).toEqual({ 'desk-ceo': 'down', 'cafe-seat-1': 'left' });
  });
});

describe('validatePack: errors reject the pack whole', () => {
  it.each([
    ['missing theme.json', () => { const p = pack(); delete p.files['theme.json']; return p; }, 'missing-manifest'],
    ['unparseable theme.json', () => { const p = pack(); p.files['theme.json'] = enc('{nope'); return p; }, 'bad-manifest'],
    ['unsupported schema', () => pack({ ...baseManifest(), schema: 2 }), 'unsupported-schema'],
    ['id != dir name', () => pack(baseManifest({ id: 'other' })), 'id-mismatch'],
    ['missing map', () => { const p = pack(); delete p.files['map.tmj']; return p; }, 'missing-map'],
    ['unparseable map', () => { const p = pack(); p.files['map.tmj'] = enc('x'); return p; }, 'bad-map'],
    ['missing layer', () => pack(baseManifest(), baseMap({ layers: baseMap().layers.filter((l) => l.name !== 'walls') })), 'missing-layer'],
    ['no desk-ceo', () => pack(baseManifest(), (() => { const m = baseMap(); (m.layers[5] as any).objects = [{ name: 'pc-1' }, { name: 'cafe-seat-1' }, { name: 'cafe-stand-coffee' }]; return m; })()), 'missing-desk-ceo'],
    ['seat not in spawn-points', () => pack(baseManifest({ seats: { primary: ['desk-ceo', 'pc-9'], cafe: [], cafeStands: [] } })), 'missing-spawn'],
    ['tileset missing', () => { const p = pack(); delete p.files['tilesets/b.png']; return p; }, 'missing-tileset'],
    ['tileset not PNG', () => pack(baseManifest(), baseMap(), { 'tilesets/b.png': enc('hello world, definitely not a png at all') }), 'tileset-not-png'],
    ['tileset dims not multiple of 16', () => pack(baseManifest(), baseMap(), { 'tilesets/b.png': fakePng(70, 64) }), 'tileset-bad-dims'],
    ['tileset too wide', () => pack(baseManifest(), baseMap(), { 'tilesets/b.png': fakePng(4096, 64) }), 'tileset-too-big'],
    ['tileset path escape', () => pack(baseManifest({ tilesets: [{ file: 'tilesets/a.png', embedded: true }, { file: '../x.png' }] })), 'bad-tileset-path'],
    ['too many tilesets', () => pack(baseManifest({ tilesets: Array.from({ length: 9 }, () => ({ file: 'tilesets/b.png' })) })), 'too-many-tilesets'],
    ['map wrong tile size', () => pack(baseManifest(), baseMap({ tilewidth: 32 })), 'bad-tile-size'],
    ['infinite map', () => pack(baseManifest(), baseMap({ infinite: true })), 'infinite-map'],
    ['map too small', () => pack(baseManifest(), baseMap({ width: 4 })), 'bad-map-size'],
    ['base64 layer data', () => { const m = baseMap(); (m.layers[0] as any).data = 'AAAA'; (m.layers[0] as any).encoding = 'base64'; return pack(baseManifest(), m); }, 'encoded-layer'],
    ['reserved id', () => ({ ...pack(), dirName: 'office' }), 'reserved-id'],
    ['bad dir name', () => ({ ...pack(), dirName: '_template' }), 'bad-dir-name'],
    ['map file name', () => pack({ ...baseManifest(), map: 'map.json' }), 'bad-map-name'],
    ['seat facing not an object', () => pack(baseManifest({ seats: { primary: ['desk-ceo', 'pc-1'], cafe: ['cafe-seat-1'], cafeStands: [['cafe-stand-coffee', 'coffee']], facing: 'down' as any } })), 'bad-seat-facing'],
    ['seat facing invalid direction', () => pack(baseManifest({ seats: { primary: ['desk-ceo', 'pc-1'], cafe: ['cafe-seat-1'], cafeStands: [['cafe-stand-coffee', 'coffee']], facing: { 'desk-ceo': 'sideways' as any } } })), 'bad-seat-facing'],
    ['seat facing undeclared seat name', () => pack(baseManifest({ seats: { primary: ['desk-ceo', 'pc-1'], cafe: ['cafe-seat-1'], cafeStands: [['cafe-stand-coffee', 'coffee']], facing: { 'non-existent-seat': 'down' } } })), 'bad-seat-facing'],
  ])('%s', (_label, make, code) => {
    const r = validatePack(make() as any);
    expect(r.pack).toBeNull();
    expect(codes(r, 'error')).toContain(code);
  });

  it('rejects when >5% of gids are unresolved, warns below that', () => {
    const bad = baseMap();
    // a.png = 32 tiles @1, b.png = 16 tiles @33 => valid gids 1..48; 999 is unresolved
    (bad.layers[0] as any).data = plain(1).map((_, i) => (i < 10 ? 999 : 1)); // 10% unresolved
    expect(codes(validatePack(pack(baseManifest(), bad)), 'error')).toContain('unresolved-gids');
    const few = baseMap();
    (few.layers[0] as any).data = plain(1).map((_, i) => (i < 2 ? 999 : 1)); // 2%
    const r = validatePack(pack(baseManifest(), few));
    expect(r.pack).not.toBeNull();
    expect(codes(r, 'warn')).toContain('unresolved-gids');
  });

  it('masks Tiled flip bits before the gid check', () => {
    const m = baseMap();
    (m.layers[0] as any).data = plain(1).map(() => (1 | 0x80000000 | 0x40000000) >>> 0);
    const r = validatePack(pack(baseManifest(), m));
    expect(codes(r)).not.toContain('unresolved-gids');
    expect(r.pack).not.toBeNull();
  });

  it('rejects a pack over the total size cap', () => {
    const big = new Uint8Array(PACK_LIMITS.packBytes + 1);
    const r = validatePack(pack(baseManifest(), baseMap(), { 'tilesets/c.png': big }));
    expect(r.pack).toBeNull();
    expect(codes(r, 'error')).toContain('pack-too-large');
  });
});

describe('validatePack: warnings degrade one field', () => {
  it('drops bad coffee, errand spots (OOB / blocked stand), and bad monitor', () => {
    const m = baseMap();
    (m.layers[4] as any).data = plain(0).map((_, i) => (i === 5 * W + 5 ? 1 : 0)); // block (5,5)
    const man = baseManifest({
      coffee: { trayTile: { x: 99, y: 1 }, trayStand: { x: 1, y: 2 }, machineStand: { x: 2, y: 2 }, sinkTile: { x: 3, y: 1 }, sinkStand: { x: 3, y: 2 }, maxCups: 4 },
      errandSpots: [
        { kind: 'water', stand: { x: 4, y: 4 }, facing: 'left', fx: { x: 3, y: 4 }, duration: 4.5 },
        { kind: 'water', stand: { x: 5, y: 5 }, facing: 'left', fx: { x: 3, y: 4 }, duration: 4.5 },
        { kind: 'bin', stand: { x: 50, y: 5 }, facing: 'left', fx: { x: 3, y: 4 }, duration: 4.5 },
      ],
      monitor: { offTopLeftGid: 'x' } as any,
    });
    const r = validatePack(pack(man, m));
    expect(r.pack).not.toBeNull();
    expect(r.pack!.manifest.coffee).toBeUndefined();
    expect(r.pack!.manifest.errandSpots).toHaveLength(1);
    expect(r.pack!.manifest.monitor).toEqual({ offTopLeftGid: 0, onGids: [] });
    expect(codes(r, 'warn')).toEqual(expect.arrayContaining(['bad-coffee', 'bad-errand', 'bad-monitor']));
    expect(codes(r, 'error')).toEqual([]);
  });

  it('ignores a tokens.css containing url() or @import', () => {
    const man = baseManifest({ chrome: { tokens: 'chrome/tokens.css' } });
    const r = validatePack(pack(man, baseMap(), { 'chrome/tokens.css': enc(':root{--cth-x:url(http://e)}') }));
    expect(r.pack!.tokensCss).toBeUndefined();
    expect(codes(r, 'warn')).toContain('bad-tokens');
    const ok = validatePack(pack(man, baseMap(), { 'chrome/tokens.css': enc(':root{--cth-coral:#f00}') }));
    expect(ok.pack!.tokensCss).toContain('--cth-coral');
  });

  it('accepts a valid chrome.tokens css with both light and dark blocks', () => {
    const man = baseManifest({ chrome: { tokens: 'chrome/tokens.css', defaultMode: 'dark' } });
    const css = ":root{--cth-coral:#cc6666;--cth-ink-900:#e8ecf4}\n:root[data-cth-theme='dark']{--cth-ink-900:#f1f4fa}";
    const r = validatePack(pack(man, baseMap(), { 'chrome/tokens.css': enc(css) }));
    expect(codes(r, 'warn')).not.toContain('bad-tokens');
    expect(r.pack).not.toBeNull();
    expect(r.pack!.tokensCss).toBe(css);
    expect(r.pack!.manifest.chrome).toEqual({ tokens: 'chrome/tokens.css', defaultMode: 'dark' });
  });

  it('warns and drops an oversize tokens.css', () => {
    const man = baseManifest({ chrome: { tokens: 'chrome/tokens.css' } });
    const big = enc(':root{--cth-coral:#f00}' + ' '.repeat(PACK_LIMITS.tokensBytes));
    const r = validatePack(pack(man, baseMap(), { 'chrome/tokens.css': big }));
    expect(r.pack).not.toBeNull();
    expect(r.pack!.tokensCss).toBeUndefined();
    expect(codes(r, 'warn')).toContain('bad-tokens');
  });

  it('warns and drops chrome.tokens when the referenced file is missing', () => {
    const man = baseManifest({ chrome: { tokens: 'chrome/tokens.css' } });
    const r = validatePack(pack(man));
    expect(r.pack).not.toBeNull();
    expect(r.pack!.tokensCss).toBeUndefined();
    expect(codes(r, 'warn')).toContain('bad-tokens');
  });

  it('accepts valid fonts[] (woff2, <= 300 KB, <= 4 entries) and drops the rest', () => {
    const okBytes = new Uint8Array(1024);
    const tooBig = new Uint8Array(PACK_LIMITS.fontBytes + 1);
    const man = baseManifest({
      fonts: [
        { family: 'Pack UI', file: 'chrome/fonts/ui.woff2', slot: 'ui' },
        { family: 'Pack Mono', file: 'chrome/fonts/mono.woff2', slot: 'mono' },
        { family: 'Too Big', file: 'chrome/fonts/big.woff2', slot: 'display' },
        { family: 'Missing', file: 'chrome/fonts/missing.woff2', slot: 'display' },
      ],
    });
    const r = validatePack(pack(man, baseMap(), {
      'chrome/fonts/ui.woff2': okBytes,
      'chrome/fonts/mono.woff2': okBytes,
      'chrome/fonts/big.woff2': tooBig,
    }));
    expect(r.pack).not.toBeNull();
    expect(r.pack!.manifest.fonts).toEqual([
      { family: 'Pack UI', file: 'chrome/fonts/ui.woff2', slot: 'ui' },
      { family: 'Pack Mono', file: 'chrome/fonts/mono.woff2', slot: 'mono' },
    ]);
    expect(codes(r, 'warn').filter((c) => c === 'bad-font')).toHaveLength(2);
  });
});

describe('helpers', () => {
  it('readPngHeader', () => {
    expect(readPngHeader(fakePng(256, 512))).toEqual({ width: 256, height: 512, colorType: 6 });
    expect(readPngHeader(enc('not a png'))).toBeNull();
  });
  it('isSafeRelPath rejects traversal, absolute, backslash, NUL', () => {
    for (const bad of ['../a', 'a/../b', '/etc/passwd', 'C:/x', 'a\\b', 'a\0b', '', 'a//b', './a']) {
      expect(isSafeRelPath(bad)).toBe(false);
    }
    expect(isSafeRelPath('tilesets/a.png')).toBe(true);
  });
  it('normalizeThemeId rewrites the legacy alias only', () => {
    expect(normalizeThemeId('office')).toBe('munder-difflin');
    expect(normalizeThemeId('brooklyn99')).toBe('brooklyn99');
    expect(normalizeThemeId('__proto__')).toBe('__proto__');
  });
  it('hex round-trips', () => {
    expect(hexToNumber('#1a1320')).toBe(0x1a1320);
    expect(numberToHex(0x1a1320)).toBe('#1a1320');
  });
});

describe('validatePack: copy.orchestratorName', () => {
  it('carries a good display name through', () => {
    const r = validatePack(pack(baseManifest({ copy: { orchestratorName: ' Captain ' } })));
    expect(codes(r, 'error')).toEqual([]);
    expect(r.pack!.manifest.copy).toEqual({ orchestratorName: 'Captain' });
  });

  it('drops a bad one with a warning instead of rejecting the pack', () => {
    for (const bad of ['', '   ', 'x'.repeat(41), 'line\nbreak', 42]) {
      const r = validatePack(pack(baseManifest({ copy: { orchestratorName: bad as unknown as string } })));
      expect(codes(r, 'error')).toEqual([]);
      expect(codes(r, 'warn')).toContain('bad-copy');
      expect(r.pack!.manifest.copy?.orchestratorName).toBeUndefined();
    }
  });
});

describe('validatePack: cast roster (cast/cast.json)', () => {
  const roster = (v: unknown) => ({ 'cast/cast.json': enc(JSON.stringify(v)) });

  it('accepts a roster whose sprites are present', () => {
    const r = validatePack(pack(baseManifest(), baseMap(), {
      ...roster([{ name: 'ada', displayName: 'Ada' }]),
      'cast/sprites/ada.png': fakePng(108, 32),
    }));
    expect(codes(r)).toEqual([]);
  });

  it('warns (does not reject) for a missing sprite, a bad name, a non-array and bad JSON', () => {
    const missing = validatePack(pack(baseManifest(), baseMap(), roster([{ name: 'ada' }])));
    expect(codes(missing, 'warn')).toContain('cast-sprite-missing');
    expect(missing.pack).not.toBeNull();

    const badName = validatePack(pack(baseManifest(), baseMap(), roster([{ name: '../evil' }])));
    expect(codes(badName, 'warn')).toContain('bad-cast');

    expect(codes(validatePack(pack(baseManifest(), baseMap(), roster({ a: 1 }))), 'warn')).toContain('bad-cast');
    const notJson = validatePack(pack(baseManifest(), baseMap(), { 'cast/cast.json': enc('{nope') }));
    expect(codes(notJson, 'warn')).toContain('bad-cast');
    expect(notJson.pack).not.toBeNull();
  });

  it('no longer reports the manifest cast field as unsupported', () => {
    const r = validatePack(pack({ ...baseManifest(), cast: { roster: 'cast/cast.json', default: 'ada' } }));
    expect(codes(r)).not.toContain('cast-unsupported');
  });
});
