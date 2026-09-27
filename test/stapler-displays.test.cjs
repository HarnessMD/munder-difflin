/**
 * The Stapler around external monitors (0.5.3, fix list bugs 6 and 15).
 *
 * Every Stapler test before this one modelled ONE display that never changed,
 * so all of them stayed green while the window could be lost. These run the
 * real `src/main/puck.ts` against an Electron stub whose display list MOVES:
 * a second monitor arrives, becomes the main display and re-bases every
 * coordinate, then leaves again.
 *
 * WHAT THESE DO NOT PROVE. The stale read in test 4 is a model of what macOS
 * is believed to do while it rearranges displays, not a recording of it. The
 * arithmetic, the listeners and the second look are proven. A real cable
 * being pulled is the founder's to check, and the tracker says so.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'stapler-displays-'));

/* ---- displays that can be rearranged ------------------------------------- */
const MENU = 25;
const display = (id, x, y, width, height, scaleFactor) => ({
  id, scaleFactor,
  bounds: { x, y, width, height },
  workArea: { x, y: y + MENU, width, height: height - MENU }
});
const LAPTOP_ALONE = () => [display(1, 0, 0, 1512, 982, 2)];
// The external is the MAIN display, so it owns the origin and the laptop is
// pushed to the left of it. This is the founder's own arrangement.
const DOCKED = () => [display(2, 0, 0, 2560, 1440, 1), display(1, -1512, 458, 1512, 982, 2)];

let displays = LAPTOP_ALONE();
let cursor = { x: 0, y: 0 };
const inside = (p, r) => p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height;
const nearest = (p) => {
  const hit = displays.find((d) => inside(p, d.bounds));
  if (hit) return hit;
  const dist = (d) => {
    const cx = Math.min(d.bounds.x + d.bounds.width, Math.max(d.bounds.x, p.x));
    const cy = Math.min(d.bounds.y + d.bounds.height, Math.max(d.bounds.y, p.y));
    return Math.hypot(cx - p.x, cy - p.y);
  };
  return [...displays].sort((a, b) => dist(a) - dist(b))[0];
};

const screenListeners = new Map();
const fire = (name) => { for (const fn of screenListeners.get(name) ?? []) fn(); };

/* ---- one fake window, which remembers where it was put ------------------- */
let theWindow = null;
class FakeWindow {
  constructor(opts) {
    this.bounds = { x: opts.x, y: opts.y, width: opts.width, height: opts.height };
    this.visible = false; this.destroyed = false; this.shows = 0; this.events = new Map();
    this.webContents = { on: (n, fn) => { this.events.set(`wc:${n}`, fn); }, send() {}, setWindowOpenHandler() {} };
    theWindow = this;
  }
  static getAllWindows() { return []; }
  on(n, fn) { this.events.set(n, fn); } once(n, fn) { this.events.set(n, fn); }
  setBounds(b) { this.bounds = { ...b }; this.placed = (this.placed ?? 0) + 1; } getBounds() { return { ...this.bounds }; }
  isDestroyed() { return this.destroyed; } isVisible() { return this.visible; }
  showInactive() { this.visible = true; this.shows += 1; } hide() { this.visible = false; }
  destroy() { this.destroyed = true; }
  loadFile() { return Promise.resolve(); } loadURL() { return Promise.resolve(); }
  setMenuBarVisibility() {} setAlwaysOnTop() {} setVisibleOnAllWorkspaces() {}
  setIgnoreMouseEvents() {} setContentProtection() {}
}

const handlers = new Map();
const readyCbs = [];
const electronStub = {
  app: { whenReady: () => ({ then: (cb) => { readyCbs.push(cb); return Promise.resolve(); } }), on() {}, getPath: () => HOME },
  BrowserWindow: FakeWindow,
  desktopCapturer: { getSources: async () => [] },
  ipcMain: { handle: (c, fn) => { handlers.set(c, fn); } },
  nativeImage: { createFromPath: () => ({ resize: () => ({ toDataURL: () => '' }) }) },
  screen: {
    on: (n, fn) => { screenListeners.set(n, [...(screenListeners.get(n) ?? []), fn]); },
    getPrimaryDisplay: () => displays[0],
    getAllDisplays: () => displays,
    getDisplayNearestPoint: (p) => nearest(p),
    // null is a platform that cannot read the pointer at all (Wayland): it throws.
    getCursorScreenPoint: () => { if (!cursor) throw new Error('no pointer'); return { ...cursor }; }
  },
  shell: { openExternal() {}, showItemInFolder() {}, trashItem: async () => {} },
  systemPreferences: { getMediaAccessStatus: () => 'granted' }
};

const cache = new Map();
function loadTs(filename) {
  const hit = cache.get(filename);
  if (hit) return hit.exports;
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename
  });
  const mod = { exports: {} };
  cache.set(filename, mod);
  const req = (r) => {
    if (r === 'electron') return electronStub;
    if (r.startsWith('.')) {
      const base = path.resolve(path.dirname(filename), r);
      for (const c of [base, `${base}.ts`, path.join(base, 'index.ts')]) {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) return loadTs(c);
      }
      return {};
    }
    return Module.createRequire(filename)(r);
  };
  new Function('module', 'exports', 'require', '__filename', '__dirname', out.outputText)(mod, mod.exports, req, filename, path.dirname(filename));
  return mod.exports;
}

let config = { harnessHome: HOME, groqApiKey: '', puck: { enabled: true, snapToEdges: false } };
const deps = {
  readConfig: () => config,
  writeConfig: (patch) => { config = { ...config, ...patch }; return config; },
  onConfigWritten: () => () => {},
  hiveEnabled: () => true, hiveSend: () => ({ id: 'm' }), transcribe: async () => ({ ok: true, text: '' }),
  broadcast: () => {}, openSettings: () => {}, agentIds: () => [],
  preload: '/preload.js', rendererUrl: null, rendererDir: '/renderer'
};

/* Timers the module sets are HELD, so a test decides when the display layout
   has "settled" and the second look happens. */
const held = [];
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...a) => {
  if (typeof ms === 'number' && ms >= 100 && ms <= 5000) { const t = { fn, unref() { return t; } }; held.push(t); return t; }
  return realSetTimeout(fn, ms, ...a);
};
const realClearTimeout = globalThis.clearTimeout;
globalThis.clearTimeout = (t) => { const i = held.indexOf(t); if (i >= 0) held.splice(i, 1); else realClearTimeout(t); };
const settle = () => { while (held.length) held.shift().fn(); };

const { registerPuck } = loadTs(path.join(ROOT, 'src/main/puck.ts'));
registerPuck(deps);
for (const cb of readyCbs) cb();
const call = (channel, arg) => handlers.get(channel)({}, arg);

test.after(() => {
  globalThis.setTimeout = realSetTimeout; globalThis.clearTimeout = realClearTimeout;
  fs.rmSync(HOME, { recursive: true, force: true });
});

const discCentre = async () => {
  const st = await call('puck:state');
  return { x: theWindow.bounds.x + st.offset.x, y: theWindow.bounds.y + st.offset.y };
};
const displayHolding = (p) => displays.find((d) => inside(p, d.bounds)) ?? null;
const open = async () => {
  await call('puck:admit', true);
  theWindow.events.get('ready-to-show')?.();
  theWindow.events.get('wc:did-finish-load')?.();
};

/* A drag the way the page makes one since rc.6: grab the disc (dragStart,
   where on the disc), the system pointer moves, the page reports its own
   motion, release. Main reads the pointer; the page never says where to go. */
const grabDisc = async (at = { x: 0, y: 0 }) => {
  const c = await discCentre();
  cursor = { x: c.x + at.x, y: c.y + at.y };
  await call('puck:dragStart', at);
};
const dragTo = async (to) => {
  await grabDisc();
  const d = { dx: to.x - cursor.x, dy: to.y - cursor.y };
  cursor = to;
  await call('puck:drag', d);
  await call('puck:dragEnd');
};

test('1. a display ARRIVING re places the Stapler, on its own, with no other event', async () => {
  // Creed's review: this test used to check only that a listener EXISTED, and it
  // passed with the handler gutted to a no op. It now fires the one event and
  // watches the window get placed.
  displays = LAPTOP_ALONE();
  await open();
  for (const name of ['display-added', 'display-removed', 'display-metrics-changed']) {
    const before = theWindow.placed ?? 0;
    fire(name); settle();
    assert.ok((theWindow.placed ?? 0) > before, `${name} fired and the Stapler was not placed again`);
  }
});

test('2. DRIFT: dragged into a screen edge and back, the disc comes back with the pointer', async () => {
  displays = LAPTOP_ALONE();
  await open();
  const start = await discCentre();
  cursor = { ...start };
  await call('puck:dragStart', { x: 0, y: 0 });
  // 500 to the right of a disc that is about 60 from the edge, then 500 back.
  // The edge stops the disc; it must not also eat the pointer's travel.
  for (const step of [250, 250, -250, -250]) {
    cursor = { x: cursor.x + step, y: cursor.y };
    await call('puck:drag', { dx: step, dy: 0 });
  }
  await call('puck:dragEnd');
  assert.deepEqual(await discCentre(), start, 'the pointer is back where it started and the disc is not');
});

test('3. PLUG IN: a monitor that becomes the main display does not pull the Stapler off the laptop', async () => {
  const before = await discCentre();
  const rel = { x: before.x, y: before.y };            // laptop origin was 0,0
  displays = DOCKED();                                 // laptop is now at -1512,458
  fire('display-added'); fire('display-metrics-changed'); settle();
  const after = await discCentre();
  assert.equal(displayHolding(after)?.id, 1, 'the Stapler left the screen it was on');
  assert.deepEqual({ x: after.x + 1512, y: after.y - 458 }, rel, 'same spot on the same screen');
});

test('4. UNPLUG the main display: the Stapler is on the laptop, even when the first look was stale', async () => {
  // Put it on the external first, the way the founder had it.
  const ext = displays[0];
  const to = { x: ext.bounds.x + 2300, y: ext.bounds.y + 1200 };
  await dragTo(to);
  assert.equal(displayHolding(await discCentre())?.id, 2, 'set up: it is on the external');

  // The event arrives while the list still shows the old arrangement, and
  // NOTHING ELSE ARRIVES. With a second event after the list settles the old
  // code recovered, which is why its arithmetic was never the fault: what it
  // lacked was a second look of its own.
  fire('display-removed');
  displays = LAPTOP_ALONE();
  settle();
  const after = await discCentre();
  assert.equal(displayHolding(after)?.id, 1, `the Stapler is at ${JSON.stringify(after)}, which is on no screen`);
  const b = theWindow.bounds;
  assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 1512 && b.y + b.height <= 982, 'the whole window is on the laptop');
});

test('5. a Stapler the rearrangement hid is shown again', async () => {
  theWindow.visible = false;
  const shows = theWindow.shows;
  fire('display-metrics-changed'); settle();
  assert.ok(theWindow.shows > shows && theWindow.visible, 'it stayed hidden');
});

/* ---- 6 to 9: from Creed's review of the first fix (findings 3, 4, 10) ------
   The first fix forgot WHICH monitor the Stapler was on the moment that monitor
   went away, and wiped the saved position too. A monitor that sleeps, or a lid
   that closes, is a monitor that goes away and COMES BACK with the same id,
   and by then there was nothing left to go back to. Tests 3, 4 and 5 never had
   a monitor return, so they could not see it. */
const dockAndPark = async () => {
  displays = DOCKED();
  fire('display-added'); fire('display-metrics-changed'); settle();
  const ext = displays[0];
  const to = { x: ext.bounds.x + 2300, y: ext.bounds.y + 1200 };
  await dragTo(to);
  const parked = await discCentre();
  assert.equal(displayHolding(parked)?.id, 2, 'set up: parked on the external');
  return parked;
};

test('6. THE MONITOR SLEEPS AND WAKES: the Stapler goes back to where it was parked, and the choice is still saved', async () => {
  const parked = await dockAndPark();
  displays = LAPTOP_ALONE(); fire('display-removed'); fire('display-metrics-changed'); settle();
  assert.equal(displayHolding(await discCentre())?.id, 1, 'while it sleeps the Stapler is visible on the laptop');
  assert.equal(config.puck.home?.displayId, 2, 'the monitor going away is not the person changing their mind: the choice must survive it');
  displays = DOCKED(); fire('display-added'); fire('display-metrics-changed'); settle();
  assert.deepEqual(await discCentre(), parked, 'the same monitor came back and the Stapler did not');
});

test('7. THE WINDOW IS MADE AGAIN after docking (relaunch, Stapler off and on, leaving the Pro shell): same spot, same screen', async () => {
  // Creed's exact case. Parked on the laptop while it was alone, so the saved
  // point is in the OLD coordinates. Then a monitor arrives as main display and
  // moves the origin. In memory that was handled. A NEW window knew nothing of
  // it and read the saved point raw, which now lies on the other screen.
  displays = LAPTOP_ALONE(); fire('display-removed'); fire('display-metrics-changed'); settle();
  const to = { x: 1400, y: 900 };
  await dragTo(to);
  const parked = await discCentre();
  displays = DOCKED(); fire('display-added'); fire('display-metrics-changed'); settle();
  const docked = await discCentre();
  assert.deepEqual({ x: docked.x + 1512, y: docked.y - 458 }, parked, 'set up: docking kept it on the laptop');
  await call('puck:admit', false);
  await call('puck:admit', true);
  theWindow.events.get('ready-to-show')?.(); theWindow.events.get('wc:did-finish-load')?.();
  assert.deepEqual(await discCentre(), docked, 'the screen it was on lived only in memory, so a new window read a stale absolute point and landed on the other screen');
});

test('8. a saved point that is on NO screen any more never decides where the Stapler goes', async () => {
  displays = LAPTOP_ALONE(); fire('display-removed'); settle();
  await call('puck:admit', false);
  config = { ...config, puck: { ...config.puck, home: null, position: { x: -100, y: 1300 } } };
  await call('puck:admit', true);
  theWindow.events.get('ready-to-show')?.(); theWindow.events.get('wc:did-finish-load')?.();
  const at = await discCentre();
  assert.equal(displayHolding(at)?.id, 1);
  const b = theWindow.bounds;
  assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 1512 && b.y + b.height <= 982, `the window is at ${JSON.stringify(b)}`);
});

test('9. ITS SCREEN SHRINKS: the Stapler stays on that screen, it does not hop to the neighbour', async () => {
  displays = [display(1, 0, 0, 1512, 982, 2), display(2, 1512, 0, 2560, 1440, 1)];
  fire('display-metrics-changed'); settle();
  await dragTo({ x: 1450, y: 500 });
  assert.equal(displayHolding(await discCentre())?.id, 1, 'set up: near the right edge of the laptop');
  // The laptop is set to a lower resolution. Its right edge moves left, past the disc.
  displays = [display(1, 0, 0, 1280, 800, 2), display(2, 1280, 0, 2560, 1440, 1)];
  fire('display-metrics-changed'); settle();
  assert.equal(displayHolding(await discCentre())?.id, 1, 'it was rebuilt from the old offset and then handed to whichever screen that point now lies on');
});

test('10. A POINTER THAT NEVER MOVES (it answers instead of throwing): the disc still follows the drag', async () => {
  // Finding 22. Only a THROW reached the fallback. A platform that reports a
  // frozen pointer set the grab once and the disc never moved again.
  displays = LAPTOP_ALONE(); fire('display-metrics-changed'); settle();
  await call('puck:dragEnd');
  const start = await discCentre();
  cursor = { x: 0, y: 0 };                       // and it stays there
  await call('puck:dragStart', { x: 0, y: 0 });
  for (const step of [-40, -40, -40]) await call('puck:drag', { dx: step, dy: 0 });
  await call('puck:dragEnd');
  const end = await discCentre();
  assert.ok(start.x - end.x >= 80, `dragged 120 to the left and the disc moved ${start.x - end.x}`);
});

test('11. THE PAGE RELOADS MID DRAG: the next small move is a small move', async () => {
  // Finding 23. No dragEnd ever arrives from a page that reloaded, and the grab
  // it left behind made the next one pixel move jump by the whole earlier drag.
  await grabDisc();
  cursor = { x: cursor.x - 200, y: cursor.y };
  await call('puck:drag', { dx: -200, dy: 0 });   // a drag in progress...
  theWindow.events.get('wc:did-finish-load')?.(); // ...and the page reloads
  const before = await discCentre();
  cursor = { x: cursor.x + 300, y: cursor.y + 300 };   // the pointer is somewhere else by now
  cursor = { x: cursor.x - 1, y: cursor.y };
  await call('puck:drag', { dx: -1, dy: 0 });
  const after = await discCentre();
  await call('puck:dragEnd');
  assert.ok(Math.abs(after.x - before.x) <= 2 && Math.abs(after.y - before.y) <= 2, `a one pixel move took the disc from ${JSON.stringify(before)} to ${JSON.stringify(after)}`);
});

/* ---- rc.4: never off screen, and Reset puts it in the middle ------------- */
const P = loadTs(path.join(ROOT, 'src/shared/puck.ts'));
const discInside = (c, area, size) =>
  c.x - size / 2 >= area.x && c.x + size / 2 <= area.x + area.width && c.y - size / 2 >= area.y && c.y + size / 2 <= area.y + area.height;

test('rc.4 snap on every edge, from inside and from beyond it, keeps the whole disc on the work area', () => {
  const area = { x: 0, y: 25, width: 1512, height: 957 };
  const size = 96;
  const drops = [
    { x: 40, y: 400 }, { x: -300, y: 400 },          // left, and dragged past it
    { x: 1480, y: 400 }, { x: 2400, y: 400 },        // right
    { x: 700, y: 40 }, { x: 700, y: -500 },          // top
    { x: 700, y: 960 }, { x: 700, y: 3000 },         // bottom
    { x: 3000, y: 3000 }, { x: -800, y: -800 }       // both at once, a corner well outside
  ];
  for (const p of drops) {
    const c = P.snapToEdge(p, area, size);
    assert.ok(discInside(c, area, size), `snap of ${JSON.stringify(p)} left the disc at ${JSON.stringify(c)}`);
  }
});

test('rc.4 a saved point beyond the right or bottom edge is pulled back; one on no screen goes to the middle', () => {
  const displays = [{ id: 1, bounds: { x: 0, y: 0, width: 1512, height: 982 }, workArea: { x: 0, y: 25, width: 1512, height: 957 } }];
  const edge = P.resolvePuckPlacement({ home: null, position: { x: 1510, y: 980 }, corner: 'bottom-right', size: 96, displays, primaryId: 1 });
  assert.ok(discInside(edge.centre, displays[0].workArea, 96), JSON.stringify(edge.centre));
  const parked = P.resolvePuckPlacement({ home: { displayId: 1, dx: 5000, dy: 5000 }, position: null, corner: 'bottom-right', size: 96, displays, primaryId: 1 });
  assert.ok(discInside(parked.centre, displays[0].workArea, 96), 'a home past the edge is pulled back too');
  const lost = P.resolvePuckPlacement({ home: null, position: { x: 9000, y: 9000 }, corner: 'bottom-right', size: 96, displays, primaryId: 1 });
  assert.equal(lost.source, 'centre');
  assert.deepEqual(lost.centre, P.centreOf(displays[0].workArea));
  // No saved point at all is still the configured corner.
  assert.equal(P.resolvePuckPlacement({ home: null, position: null, corner: 'bottom-right', size: 96, displays, primaryId: 1 }).source, 'corner');
});

test('rc.4 a drop past the edge, snap on, ends with the disc on screen and saved there', async () => {
  displays = LAPTOP_ALONE();
  config = { ...config, puck: { ...config.puck, snapToEdges: true } };
  fire('display-metrics-changed'); settle();
  const size = (await call('puck:state')).size ?? config.puck.size ?? P.DEFAULT_PUCK_CONFIG.size;
  const to = { x: cursor.x + 4000, y: cursor.y + 4000 };
  await dragTo(to);
  const c = await discCentre();
  const area = displays[0].workArea;
  assert.ok(discInside(c, area, P.normalizePuckConfig(config.puck).size), `the disc is at ${JSON.stringify(c)}`);
  assert.ok(discInside(config.puck.position, area, P.normalizePuckConfig(config.puck).size), 'the saved point is on screen too');
  void size;
});

test('rc.4 Reset puts the disc in the middle of the main screen, now and after a restart', async () => {
  displays = DOCKED();
  fire('display-added'); settle();
  await call('puck:resetPosition');
  const mid = P.centreOf(displays[0].workArea);
  assert.deepEqual(await discCentre(), mid, 'in the middle now');
  assert.deepEqual(config.puck.position, mid, 'saved as the position');
  assert.equal(config.puck.home.displayId, displays[0].id, 'and as the chosen screen');
  // A restart reads the config again: the same middle.
  const again = P.resolvePuckPlacement({ home: config.puck.home, position: config.puck.position, corner: 'bottom-right', size: 96, displays, primaryId: displays[0].id });
  assert.deepEqual(again.centre, mid);
});

/* ---- rc.6: the drag rebuilt (founder, 26 Sep 2026: "sometimes it just
   starts moving away from the cursor ... this needs to be resolved from the
   scratch"). Main reads the system pointer; the page's motion is only a sign
   of life, and the drive only where the pointer cannot be read. ------------ */
const M = loadTs(path.join(ROOT, 'src/main/puck.ts'));
const sleep = (ms) => new Promise((r) => realSetTimeout(r, ms));
const inWindow = (c, size) => {
  const b = theWindow.bounds;
  return c.x - size / 2 >= b.x && c.x + size / 2 <= b.x + b.width && c.y - size / 2 >= b.y && c.y + size / 2 <= b.y + b.height;
};
const home = async () => {
  displays = LAPTOP_ALONE(); fire('display-metrics-changed'); settle();
  await call('puck:dragEnd');
  await call('puck:resetPosition');
};

test('rc.6 A SLOW TRACKPAD MOVE: fractions of a pixel keep the disc under the pointer, at the point it was grabbed', async () => {
  // The rc.5 bug. The page saw 0.4px, the system pointer (whole pixels) had
  // not changed, and the guard for a frozen pointer took over for the rest of
  // the drag, with the page's deltas driving the disc.
  await home();
  const grab = { x: 12, y: -7 };
  await grabDisc(grab);
  for (let i = 0; i < 60; i++) {
    if (i % 3 === 0) cursor = { x: cursor.x + 1, y: cursor.y + 1 };
    await call('puck:drag', { dx: 0.4, dy: 0.4 });
    assert.deepEqual(await discCentre(), { x: cursor.x - grab.x, y: cursor.y - grab.y }, `step ${i}: the disc left the pointer`);
  }
  await call('puck:dragEnd');
});

test('rc.6 THE PAGE MISREPORTS THE MOTION (its window moving under it): the disc follows the real pointer', async () => {
  await home();
  await grabDisc();
  for (let i = 0; i < 20; i++) {
    cursor = { x: cursor.x + 5, y: cursor.y };
    await call('puck:drag', { dx: -30, dy: 25 });
  }
  assert.deepEqual(await discCentre(), cursor);
  await call('puck:dragEnd');
});

test('rc.6 main keeps the disc under the pointer with no word from the page', async () => {
  await home();
  await grabDisc();
  cursor = { x: cursor.x - 150, y: cursor.y - 100 };
  await sleep(M.DRAG_TICK_MS * 5);
  assert.deepEqual(await discCentre(), cursor);
  await call('puck:dragEnd');
});

test('rc.6 A RELEASE THE PAGE NEVER HEARD: the drag ends, and the disc does not follow a hand that let go', async () => {
  await home();
  await grabDisc();
  cursor = { x: cursor.x + 60, y: cursor.y };
  await sleep(M.DRAG_SILENT_MS + 150);
  const parked = await discCentre();
  cursor = { x: cursor.x + 300, y: cursor.y + 200 };
  await sleep(M.DRAG_TICK_MS * 5);
  assert.deepEqual(await discCentre(), parked, 'the disc followed the pointer after the drag should have ended');
  assert.deepEqual(config.puck.position, parked, 'and where it stopped was saved');
});

test('rc.6 DRAGGED FAR PAST THE BOTTOM RIGHT: the whole disc stays on screen every frame, and comes back under the pointer', async () => {
  await home();
  const size = P.normalizePuckConfig(config.puck).size;
  const area = displays[0].workArea;
  await grabDisc();
  const start = { ...cursor };
  for (let i = 1; i <= 20; i++) {
    cursor = { x: start.x + i * 200, y: start.y + i * 150 };
    await call('puck:drag', { dx: 200, dy: 150 });
    const c = await discCentre();
    assert.ok(discInside(c, area, size), `frame ${i}: the disc is at ${JSON.stringify(c)}, off the screen`);
    assert.ok(inWindow(c, size), `frame ${i}: the disc is outside its own window`);
  }
  cursor = { ...start };
  await call('puck:drag', { dx: -4000, dy: -3000 });
  assert.deepEqual(await discCentre(), start, 'back where it started, and the disc is not under the pointer');
  await call('puck:dragEnd');
});

test('rc.6 a drop past each edge, snap on or off, ends with the whole disc on screen', async () => {
  for (const snap of [true, false]) {
    await home();
    config = { ...config, puck: { ...config.puck, snapToEdges: snap } };
    const size = P.normalizePuckConfig(config.puck).size;
    const area = displays[0].workArea;
    for (const to of [{ x: 5000, y: 500 }, { x: 700, y: 5000 }, { x: 5000, y: 5000 }, { x: -900, y: 500 }, { x: 700, y: -900 }]) {
      await dragTo(to);
      const c = await discCentre();
      assert.ok(discInside(c, area, size), `snap ${snap}, dropped at ${JSON.stringify(to)}: the disc is at ${JSON.stringify(c)}`);
      assert.ok(inWindow(c, size));
    }
  }
  config = { ...config, puck: { ...config.puck, snapToEdges: true } };
});

test('rc.6 Reset in the middle of a drag ends the drag and the Stapler stays in the middle', async () => {
  await home();
  await dragTo({ x: 200, y: 200 });
  await grabDisc();
  await call('puck:resetPosition');
  cursor = { x: cursor.x + 100, y: cursor.y + 100 };
  await sleep(M.DRAG_TICK_MS * 5);
  assert.deepEqual(await discCentre(), P.centreOf(displays[0].workArea));
});

test('rc.6 a pointer that cannot be read at all (Wayland): the page motion drives the disc', async () => {
  await home();
  const start = await discCentre();
  cursor = null;
  await call('puck:dragStart', { x: 0, y: 0 });
  await call('puck:drag', { dx: -50, dy: -30 });
  await call('puck:drag', { dx: -50, dy: -30 });
  assert.deepEqual(await discCentre(), { x: start.x - 100, y: start.y - 60 });
  await call('puck:dragEnd');
  cursor = { x: 0, y: 0 };
});

test('rc.6 the page: no screen coordinates, the grab point to main, and a cancel is never a click', () => {
  const page = fs.readFileSync(path.join(ROOT, 'src/renderer/src/puck/PuckApp.tsx'), 'utf8');
  const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\.screenX|\.screenY/, 'screenX in a moving window is measured from where the window was');
  assert.match(code, /window\.cth\.puckDragStart\(d\.grab\)/);
  assert.match(code, /e\.movementX/);
  assert.match(code, /\(e\.buttons & 1\) === 0/, 'a move with the button up ends the drag');
  assert.match(code, /onPointerCancel=\{\(\) => \{ endDrag\(\); \}\}/);
  assert.match(code, /onLostPointerCapture=\{\(\) => \{ endDrag\(\); \}\}/);
  const preload = fs.readFileSync(path.join(ROOT, 'src/preload/index.ts'), 'utf8');
  assert.match(preload, /puckDragStart: \(at: \{ x: number; y: number \}\): Promise<PuckState> => ipcRenderer\.invoke\('puck:dragStart', at\)/);
});

test('rc.6 Reset position is its own row, outside the corner setting that waits for Save', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/renderer/src/components/pro/PuckScreen.tsx'), 'utf8');
  const row = src.slice(src.indexOf("<Line label={t('pro.puck.position')}"));
  assert.ok(src.includes("<Line label={t('pro.puck.position')}"), 'no Position row');
  assert.match(row.slice(0, row.indexOf('</Line>')), /window\.cth\.puckResetPosition\(\)/, 'Reset is not in the Position row');
  const corner = src.slice(src.indexOf("<Line label={t('pro.puck.corner')}"));
  assert.doesNotMatch(corner.slice(0, corner.indexOf('</Line>')), /puckResetPosition/, 'Reset still sits in the corner row');
  for (const l of ['en', 'ar', 'zh-CN']) {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, `src/renderer/src/i18n/locales/${l}.json`), 'utf8'));
    assert.ok(j.pro.puck.position && j.pro.puck.positionHint, `${l}: the Position row has no words`);
  }
});
