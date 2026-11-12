/* The office, drawn in code for this page.
   Floors, walls, desks and props are painted here, pixel by pixel, so the page ships no tileset.
   The people are the app's own: MDAv paints them from portraitArt.ts.
   One engine serves every map on the page: the hero, the hiring strip, the sandbox and 24x7. */
(function () {
  'use strict';
  var T = 16;
  var A = window.MDAv;
  var OUT = '#26222E';

  /* ---------- small helpers ---------- */
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function R(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
  function box(g, x, y, w, h, fill, line) { R(g, x, y, w, h, line || OUT); R(g, x + 1, y + 1, w - 2, h - 2, fill); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexRgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(a, b, t) { var x = hexRgb(a), y = hexRgb(b); return 'rgb(' + Math.round(lerp(x[0], y[0], t)) + ',' + Math.round(lerp(x[1], y[1], t)) + ',' + Math.round(lerp(x[2], y[2], t)) + ')'; }
  function canvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* ---------- the app's people ---------- */
  var spriteCache = new Map();
  function bufCanvas(buf, w, h) { var c = canvas(w, h), x = c.getContext('2d'), im = x.createImageData(w, h); im.data.set(buf); x.putImageData(im, 0, 0); return c; }
  function sprites(recipe) {
    var k = JSON.stringify(recipe), s = spriteCache.get(k);
    if (!s) {
      var f = A.sceneFrameBufsFor(recipe);
      s = { front: f.front.map(function (b) { return bufCanvas(b, A.SCENE_W, A.SCENE_H); }), back: f.back.map(function (b) { return bufCanvas(b, A.SCENE_W, A.SCENE_H); }) };
      spriteCache.set(k, s);
    }
    return s;
  }
  function portrait(recipe, scale) {
    var c = bufCanvas(A.portraitBufFor(recipe), A.PORTRAIT_W, A.PORTRAIT_H);
    c.className = 'pxa';
    if (scale) { c.style.width = (18 * scale) + 'px'; c.style.height = (28 * scale) + 'px'; }
    return c;
  }
  function recipeOf(name) { return A.CAST_RECIPES[name] || A.presetRecipe(0); }

  /* ---------- layouts ----------
     Tiles are 16 px. The top `wall` rows are wall. A desk is two tiles wide; seat 'n' puts the agent
     behind it facing you, seat 's' puts the agent in front of it with the screen showing. */
  var LAYOUTS = {
    wide: {
      cols: 28, rows: 15, wall: 3, door: { x: 5 },
      windows: [{ x: 1, w: 3 }, { x: 8, w: 3 }, { x: 15, w: 3 }, { x: 22, w: 3 }],
      board: { x: 11, w: 3 }, clock: { x: 19 },
      desks: [
        { x: 8, y: 6, seat: 'n' }, { x: 11, y: 6, seat: 'n' }, { x: 14, y: 6, seat: 'n' }, { x: 17, y: 6, seat: 'n' },
        { x: 8, y: 9, seat: 's' }, { x: 11, y: 9, seat: 's' }, { x: 14, y: 9, seat: 's' }, { x: 17, y: 9, seat: 's' },
        { x: 23, y: 5, seat: 'n', boss: true },
        { x: 8, y: 13, seat: 'n' }, { x: 11, y: 13, seat: 'n' }, { x: 14, y: 13, seat: 'n' }, { x: 17, y: 13, seat: 'n' }
      ],
      glass: { x: 21, y: 3, w: 7, h: 5, gap: 23 },
      props: [
        { k: 'counter', x: 1, y: 3, w: 3 }, { k: 'cooler', x: 0, y: 6 }, { k: 'plant', x: 0, y: 3 }, { k: 'plant', x: 27, y: 9 },
        { k: 'rug', x: 1, y: 9, w: 5, h: 4 }, { k: 'sofa', x: 1, y: 13, w: 3 }, { k: 'plant', x: 0, y: 13 }, { k: 'arcade', x: 0, y: 9 }, { k: 'bag', x: 4, y: 10 }, { k: 'bag', x: 2, y: 10 },
        { k: 'table', x: 21, y: 11, w: 4, h: 2 }, { k: 'printer', x: 26, y: 13 }, { k: 'shelf', x: 26, y: 3, w: 2 }, { k: 'plant', x: 6, y: 13 }, { k: 'files', x: 19, y: 3 }, { k: 'files', x: 20, y: 3 }, { k: 'plant', x: 27, y: 13 }
      ],
      errands: [
        { x: 2, y: 4, face: 'up', kind: 'coffee' }, { x: 1, y: 6, face: 'down', kind: 'cooler' }, { x: 26, y: 12, face: 'up', kind: 'printer' },
        { x: 9, y: 3, face: 'up', kind: 'window' }, { x: 16, y: 3, face: 'up', kind: 'window' }, { x: 22, y: 10, face: 'down', kind: 'chat' },
        { x: 24, y: 10, face: 'down', kind: 'chat' }, { x: 3, y: 12, face: 'up', kind: 'rug' }, { x: 12, y: 3, face: 'up', kind: 'board' }, { x: 1, y: 11, face: 'up', kind: 'arcade' }
      ],
      ambient: { x: 24, y: 12 }, posters: [6.5, 18.2, 25.6]
    },
    tall: {
      cols: 14, rows: 21, wall: 3, door: { x: 11 },
      windows: [{ x: 1, w: 3 }, { x: 6, w: 3 }],
      board: { x: 9, w: 2 }, clock: { x: 5 },
      desks: [
        { x: 2, y: 6, seat: 'n' }, { x: 6, y: 6, seat: 'n' }, { x: 10, y: 6, seat: 'n' },
        { x: 2, y: 9, seat: 's' }, { x: 6, y: 9, seat: 's' }, { x: 10, y: 9, seat: 's' },
        { x: 2, y: 14, seat: 'n' }, { x: 6, y: 14, seat: 'n' }, { x: 10, y: 14, seat: 'n' }
      ],
      props: [
        { k: 'plant', x: 0, y: 3 }, { k: 'cooler', x: 13, y: 3 }, { k: 'counter', x: 0, y: 18, w: 3 }, { k: 'plant', x: 13, y: 12 },
        { k: 'rug', x: 4, y: 17, w: 6, h: 3 }, { k: 'sofa', x: 5, y: 20, w: 4 }, { k: 'printer', x: 13, y: 19 }, { k: 'plant', x: 0, y: 12 }
      ],
      errands: [
        { x: 12, y: 3, face: 'up', kind: 'cooler' }, { x: 1, y: 19, face: 'up', kind: 'coffee' }, { x: 12, y: 19, face: 'down', kind: 'printer' },
        { x: 7, y: 3, face: 'up', kind: 'window' }, { x: 6, y: 18, face: 'down', kind: 'rug' }, { x: 9, y: 3, face: 'up', kind: 'board' }
      ],
      ambient: { x: 12, y: 16 }
    },
    strip: {
      cols: 19, rows: 7, wall: 3, door: { x: 17 },
      windows: [{ x: 2, w: 3 }, { x: 9, w: 3 }],
      board: { x: 13, w: 2 }, clock: { x: 6 },
      desks: [{ x: 1, y: 5, seat: 'n' }, { x: 4, y: 5, seat: 'n' }, { x: 7, y: 5, seat: 'n' }, { x: 10, y: 5, seat: 'n' }, { x: 13, y: 5, seat: 'n' }],
      props: [{ k: 'plant', x: 16, y: 5 }, { k: 'plant', x: 0, y: 3 }, { k: 'cooler', x: 18, y: 5 }],
      errands: [{ x: 17, y: 4, face: 'down', kind: 'cooler' }, { x: 10, y: 3, face: 'up', kind: 'window' }],
      ambient: { x: 16, y: 6 }
    },
    // one small office inside a sandbox: two rows of desks and a corner to wander to
    box: {
      cols: 16, rows: 10, wall: 3, door: { x: 13 },
      windows: [{ x: 1, w: 3 }, { x: 8, w: 3 }],
      board: { x: 5, w: 2 }, clock: { x: 12 },
      desks: [{ x: 1, y: 5, seat: 'n' }, { x: 5, y: 5, seat: 'n' }, { x: 9, y: 5, seat: 'n' }, { x: 1, y: 8, seat: 'n' }, { x: 5, y: 8, seat: 'n' }],
      props: [{ k: 'plant', x: 0, y: 3 }, { k: 'plant', x: 15, y: 3 }, { k: 'cooler', x: 15, y: 6 }, { k: 'bag', x: 10, y: 9 }, { k: 'bag', x: 12, y: 9 }],
      errands: [{ x: 14, y: 6, face: 'down', kind: 'cooler' }, { x: 9, y: 3, face: 'up', kind: 'window' }, { x: 11, y: 8, face: 'down', kind: 'chat' }, { x: 13, y: 8, face: 'down', kind: 'chat' }],
      ambient: { x: 13, y: 7 }
    }
  };

  /* ---------- colours ---------- */
  var THEMES = {
    office: {
      name: 'The Office', floor: 'carpet', wall: 'office', desk: 'wood',
      P: { floor: '#D6CDB8', floor2: '#CDC3AC', speck: '#C0B59D', wall: '#F4EEE1', wall2: '#E8E0CC', base: '#8E7B62', trim: '#FAF6EC',
        top: '#CDA173', topHi: '#DDB98D', front: '#A37853', frontLo: '#83603F', chair: '#4B4F5E', chairHi: '#646979',
        screen: '#D9EEF8', code: ['#4F9FD9', '#E060A8', '#3F8F5E', '#E0803A'], glow: 'rgba(170,215,255,', lamp: 'rgba(255,214,140,',
        rug: '#FFC94F', rug2: '#F0B53A', leaf: ['#5DAA62', '#448A4C', '#7CC57F'], pot: '#B9683F', potHi: '#D07E52' }
    }
  };

  /* ---------- floor painters ---------- */
  var FLOOR = {
    carpet: function (g, L, P, rnd) {
      var W = L.cols * T, H = L.rows * T, y0 = L.wall * T;
      R(g, 0, y0, W, H - y0, P.floor);
      for (var y = y0; y < H; y += T) for (var x = 0; x < W; x += T) { R(g, x, y, T, 1, P.floor2); R(g, x, y, 1, T, P.floor2); }
      for (var i = 0; i < W * (H - y0) / 40; i++) R(g, Math.floor(rnd() * W), y0 + Math.floor(rnd() * (H - y0)), 1, 1, P.speck);
    }
  };

  /* ---------- wall painters (static part; the sky and anything that moves is drawn per frame) ---------- */
  function windowFrame(g, x, y, w, h, frame, glass) { box(g, x, y, w, h, glass, OUT); R(g, x + 1, y + 1, w - 2, 1, frame); R(g, x + 1, y + h - 2, w - 2, 1, frame); R(g, x + 1, y + 1, 1, h - 2, frame); R(g, x + w - 2, y + 1, 1, h - 2, frame); R(g, x + (w >> 1), y + 1, 1, h - 2, frame); }
  var WALL = {
    office: function (g, L, P) {
      var W = L.cols * T, H = L.wall * T;
      R(g, 0, 0, W, H, P.wall); R(g, 0, 0, W, 4, P.wall2); R(g, 0, H - 4, W, 4, P.base); R(g, 0, H - 5, W, 1, P.trim);
      L.windows.forEach(function (w) { windowFrame(g, w.x * T + 2, 7, w.w * T - 4, 26, '#F7F2E7', '#000'); });
      if (L.board) { box(g, L.board.x * T + 2, 8, L.board.w * T - 4, 24, '#FFFFFF', '#9C9789'); R(g, L.board.x * T + 6, 13, 14, 1, '#4F9FD9'); R(g, L.board.x * T + 6, 17, 22, 1, '#E060A8'); R(g, L.board.x * T + 6, 21, 10, 1, '#3F8F5E'); R(g, L.board.x * T + 22, 22, 8, 6, '#FFE08A'); }
      if (L.clock) { var cx = L.clock.x * T + 8; box(g, cx - 5, 10, 11, 11, '#FFFFFF', OUT); R(g, cx, 12, 1, 4, OUT); R(g, cx, 15, 3, 1, OUT); }
      var d = L.door.x * T; box(g, d + 1, 9, 2 * T - 2, H - 9, '#A98763', OUT); R(g, d + 3, 11, 2 * T - 6, H - 13, '#B9976F'); R(g, d + 2 * T - 7, 30, 2, 2, '#FFC94F');
    }
  };

  /* ---------- furniture ---------- */
  function drawPlant(g, x, y, P) {
    box(g, x + 4, y + 2, 9, 7, P.pot, OUT); R(g, x + 5, y + 3, 7, 1, P.potHi);
    R(g, x + 3, y - 7, 11, 9, P.leaf[1]); R(g, x + 5, y - 10, 7, 4, P.leaf[0]); R(g, x + 1, y - 4, 4, 4, P.leaf[0]); R(g, x + 12, y - 5, 4, 4, P.leaf[0]); R(g, x + 6, y - 9, 2, 2, P.leaf[2]); R(g, x + 10, y - 5, 2, 2, P.leaf[2]); R(g, x + 3, y - 2, 2, 1, P.leaf[2]);
  }
  function drawCooler(g, x, y, P) {
    box(g, x + 3, y - 2, 11, 10, '#E9EEF2', OUT); R(g, x + 4, y - 1, 9, 2, '#FFFFFF'); box(g, x + 4, y - 13, 9, 11, '#9FD3F2', OUT); R(g, x + 5, y - 12, 2, 8, '#CFEAFA'); R(g, x + 6, y + 3, 3, 2, '#4F9FD9');
  }
  function drawCounter(g, x, y, w, P) {
    var W = w * T;
    var top = '#F2EEE6';
    var front = '#C9BFAE';
    box(g, x, y - 2, W, 13, front, OUT); R(g, x + 1, y - 1, W - 2, 4, top);
    for (var d = 0; d < w; d++) R(g, x + d * T + 7, y + 5, 2, 2, OUT);
    box(g, x + 4, y - 11, 10, 10, '#3D3A44', OUT); R(g, x + 6, y - 9, 6, 2, '#E0803A'); R(g, x + 7, y - 4, 4, 2, '#FFFFFF');
    R(g, x + 20, y - 5, 4, 4, '#FFFFFF'); R(g, x + 20, y - 5, 4, 1, '#8E7B62'); R(g, x + 30, y - 6, 9, 5, '#E9EEF2');
  }
  function drawRug(g, x, y, w, h, P) { var W = w * T, H = h * T; box(g, x + 2, y + 2, W - 4, H - 4, P.rug, P.rug2); for (var i = 6; i < W - 6; i += 6) R(g, x + i, y + 5, 3, H - 10, P.rug2); }
  function drawSofa(g, x, y, w, P) {
    var W = w * T, c = '#4F9FD9';
    var hi = '#7DB9E6';
    box(g, x, y - 4, W, 13, c, OUT); R(g, x + 1, y - 3, W - 2, 2, hi); box(g, x - 2, y - 2, 5, 11, c, OUT); box(g, x + W - 3, y - 2, 5, 11, c, OUT); R(g, x + 3, y + 3, W - 6, 1, OUT);
  }
  function drawTable(g, x, y, w, h, P) {
    var W = w * T, top = '#E9E3D6';
    var edge = '#BEB5A3';
    for (var i = 0; i < w; i++) { box(g, x + i * T + 4, y - 6, 9, 7, P.chair, OUT); box(g, x + i * T + 4, y + h * T - 4, 9, 7, P.chair, OUT); }
    box(g, x + 1, y, W - 2, h * T - 4, top, OUT); R(g, x + 2, y + h * T - 8, W - 4, 3, edge);
    R(g, x + 10, y + 6, 8, 6, '#FFFFFF'); R(g, x + 26, y + 10, 6, 4, '#FFE08A'); R(g, x + W - 18, y + 5, 7, 9, '#2E2C36');
  }
  function drawPrinter(g, x, y, P) { var c = '#E9EEF2'; box(g, x + 1, y - 6, 15, 14, c, OUT); R(g, x + 3, y - 9, 11, 4, '#FFFFFF'); R(g, x + 3, y - 3, 11, 2, OUT); R(g, x + 12, y + 2, 2, 2, '#3F8F5E'); }
  function drawShelf(g, x, y, w, P) {
    var W = w * T, wood = '#8C6A48';
    box(g, x + 1, y - 14, W - 2, 22, wood, OUT); R(g, x + 2, y - 6, W - 4, 1, OUT);
    var cols = ['#4F9FD9', '#E060A8', '#FFC94F', '#3F8F5E', '#9482D3', '#E0803A'];
    for (var i = 0; i < (W - 6) / 3; i++) { R(g, x + 3 + i * 3, y - 12, 2, 6, cols[i % 6]); R(g, x + 3 + i * 3, y - 4, 2, 6, cols[(i + 3) % 6]); }
  }
  function drawGlass(g, L) {
    var G = L.glass; if (!G) return;
    var x = G.x * T, y = G.y * T, w = G.w * T, h = G.h * T;
    R(g, x, y, 2, h, 'rgba(160,210,235,.55)'); R(g, x, y + h - 2, w, 2, 'rgba(160,210,235,.55)');
    R(g, x + 2, y, 1, h, 'rgba(255,255,255,.7)');
    R(g, (G.gap) * T, y + h - 2, 2 * T, 2, 'rgba(0,0,0,0)');
  }

  /* desk: top surface, front panel, the monitor; seat 'n' shows the monitor's back, 's' its screen */
  function drawDesk(g, d, P, back) {
    var x = d.x * T, y = d.y * T, W = 2 * T;
    box(g, x, y - 2, W, 13, P.front, OUT); R(g, x + 1, y - 1, W - 2, 5, P.top); R(g, x + 1, y - 1, W - 2, 1, P.topHi); R(g, x + 1, y + 4, W - 2, 1, P.frontLo); R(g, x + 3, y + 6, W - 6, 1, P.frontLo);
    // monitor
    var mx = x + 10, my = y - 10;
    if (back) { box(g, mx - 1, my, 14, 10, '#3A3843', OUT); R(g, mx + 5, my + 10, 3, 2, OUT); R(g, mx + 1, my + 2, 10, 1, '#4A4855'); }
    else { box(g, mx - 1, my, 14, 10, '#2E2C36', OUT); R(g, mx + 5, my + 10, 3, 2, OUT); }
    if (!back) { R(g, x + 4, y + 1, 7, 2, '#E9EEF2'); }
    else { R(g, x + 3, y, 5, 3, '#FFFFFF'); }
    var acc = (d.x * 7 + d.y * 3) % 5, ax = back ? x + 25 : x + 1;
    if (acc === 0) { R(g, ax + 1, y - 5, 4, 4, '#5DAA62'); R(g, ax + 2, y - 7, 2, 2, '#7CC57F'); R(g, ax + 1, y - 1, 4, 3, '#B9683F'); }
    else if (acc === 1) { R(g, ax + 2, y - 6, 1, 6, OUT); R(g, ax, y - 8, 5, 3, '#FFC94F'); }
    else if (acc === 2) { R(g, ax, y - 1, 5, 3, '#FFFFFF'); R(g, ax, y - 2, 5, 1, '#E9E3D6'); }
    else if (acc === 3) { R(g, ax + 1, y - 2, 3, 3, '#E060A8'); R(g, ax + 4, y - 1, 1, 1, '#E060A8'); }
    else { R(g, ax, y - 4, 5, 4, '#2E2C36'); R(g, ax + 1, y - 3, 3, 2, '#9FD3F2'); }
  }
  function shadow(g, x, y, w) { g.fillStyle = 'rgba(30,20,10,.10)'; g.fillRect(x + 1, y, w - 1, 2); }
  function drawArcade(g, x, y) { box(g, x + 1, y - 18, 15, 26, '#3A2F55', OUT); R(g, x + 3, y - 15, 11, 9, '#0B1020'); R(g, x + 4, y - 14, 3, 2, '#E060A8'); R(g, x + 9, y - 12, 3, 3, '#FFC94F'); R(g, x + 5, y - 9, 6, 1, '#3FB8C4'); R(g, x + 3, y - 4, 11, 3, '#55477A'); R(g, x + 5, y - 6, 1, 2, OUT); R(g, x + 4, y - 7, 3, 1, '#E060A8'); R(g, x + 10, y - 4, 2, 1, '#4ADE80'); R(g, x + 2, y - 19, 13, 3, '#E060A8'); }
  function drawBag(g, x, y, c, hi) { R(g, x + 3, y - 1, 11, 9, OUT); R(g, x + 2, y + 1, 13, 6, OUT); R(g, x + 4, y, 9, 7, c); R(g, x + 3, y + 2, 11, 4, c); R(g, x + 5, y + 1, 4, 2, hi); }
  function drawFiles(g, x, y) { var c = '#B8BEC6'; box(g, x + 1, y - 10, 14, 19, c, OUT); for (var i = 0; i < 3; i++) { R(g, x + 2, y - 9 + i * 6, 12, 1, 'rgba(0,0,0,.18)'); R(g, x + 6, y - 6 + i * 6, 4, 1, OUT); } }
  function drawPoster(g, x, i) { var cols = [['#FFC94F', '#E060A8'], ['#4F9FD9', '#FFC94F'], ['#3F8F5E', '#E0803A']][i % 3]; box(g, x, 10, 14, 18, '#FFFFFF', OUT); R(g, x + 2, 12, 10, 8, cols[0]); R(g, x + 4, 14, 6, 4, cols[1]); R(g, x + 2, 22, 10, 1, '#6B685F'); R(g, x + 2, 24, 6, 1, '#6B685F'); }
  function drawChairBehind(g, d, P) { var x = d.x * T + 10, y = d.y * T - 15; box(g, x, y, 12, 9, P.chair, OUT); R(g, x + 2, y + 1, 8, 2, P.chairHi); }
  function drawChairFront(g, d, P) { var x = d.x * T + 10, y = d.y * T + 14; box(g, x, y, 12, 6, P.chair, OUT); R(g, x + 2, y + 1, 8, 1, P.chairHi); }

  /* ---------- the scene ---------- */
  function Scene(cv, opts) {
    this.cv = cv; this.g = cv.getContext('2d');
    this.layoutName = opts.layout || 'wide';
    this.L = LAYOUTS[this.layoutName];
    this.W = this.L.cols * T; this.H = this.L.rows * T;
    cv.width = this.W; cv.height = this.H;
    this.themeName = opts.theme || 'office';
    this.time = opts.time == null ? 11 : opts.time;
    this.fps = opts.fps || 30;
    this.agents = [];
    this.t = 0; this.raf = 0; this.running = false; this.last = 0;
    this.rnd = mulberry(opts.seed || 7);
    this.walk = this.buildWalk();
    this.bg = this.paint(this.themeName);
    this.stars = []; var r = mulberry(99); for (var i = 0; i < 90; i++) this.stars.push([r() * this.W, r() * this.L.wall * T, r()]);
    this.onTick = null;
    var self = this;
    (opts.agents || []).forEach(function (a) { self.add(a); });
    this.draw();
  }
  Scene.prototype.buildWalk = function () {
    var L = this.L, grid = [];
    for (var y = 0; y < L.rows; y++) { grid.push([]); for (var x = 0; x < L.cols; x++) grid[y].push(y >= L.wall ? 1 : 0); }
    function block(x, y, w, h) { for (var j = y; j < y + h; j++) for (var i = x; i < x + w; i++) if (grid[j] && grid[j][i] !== undefined) grid[j][i] = 0; }
    L.desks.forEach(function (d) { block(d.x, d.y, 2, 1); });
    L.props.forEach(function (p) { if (p.k === 'rug') return; if (p.k === 'table') block(p.x, p.y, p.w, p.h); else block(p.x, p.y, p.w || 1, 1); });
    if (L.glass) { var G = L.glass; for (var j = G.y; j < G.y + G.h; j++) grid[j][G.x] = 0; for (var i = G.x; i < G.x + G.w; i++) if (i !== G.gap && i !== G.gap + 1) grid[G.y + G.h - 1][i] = 0; }
    grid[L.wall - 1][L.door.x] = 1; grid[L.wall - 1][L.door.x + 1] = 1;
    return grid;
  };
  Scene.prototype.path = function (sx, sy, tx, ty) {
    var L = this.L, grid = this.walk, W = L.cols, H = L.rows, prev = new Int16Array(W * H).fill(-1), q = [sy * W + sx], seen = new Uint8Array(W * H);
    seen[sy * W + sx] = 1;
    var ok = function (x, y) { return x >= 0 && y >= 0 && x < W && y < H && grid[y][x]; };
    while (q.length) {
      var c = q.shift(), cx = c % W, cy = (c / W) | 0;
      if (cx === tx && cy === ty) break;
      var nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var k = 0; k < 4; k++) { var nx = cx + nb[k][0], ny = cy + nb[k][1], ni = ny * W + nx; if ((ok(nx, ny) || (nx === tx && ny === ty)) && !seen[ni]) { seen[ni] = 1; prev[ni] = c; q.push(ni); } }
    }
    var out = [], cur = ty * W + tx; if (!seen[cur]) return null;
    while (cur !== sy * W + sx && cur >= 0) { out.unshift([cur % W, (cur / W) | 0]); cur = prev[cur]; }
    return out;
  };
  Scene.prototype.paint = function (name) {
    var th = THEMES[name], P = th.P, L = this.L, c = canvas(this.W, this.H), g = c.getContext('2d'), rnd = mulberry(11);
    FLOOR[th.floor](g, L, P, rnd);
    WALL[th.wall](g, L, P);
    var self = this;
    L.props.forEach(function (p) { if (p.k === 'rug') drawRug(g, p.x * T, p.y * T, p.w, p.h, P); });
    drawGlassBase(g, L);
    // things on the floor, painted top to bottom; desks are drawn per frame so seated agents sit behind them
    var items = [];
    L.props.forEach(function (p) { if (p.k !== 'rug') items.push({ y: p.y + (p.h || 1), p: p }); });
    items.sort(function (a, b) { return a.y - b.y; });
    items.forEach(function (it) {
      var p = it.p, x = p.x * T, y = p.y * T;
      if (p.k === 'plant') drawPlant(g, x, y + 6, P);
      else if (p.k === 'cooler') drawCooler(g, x, y + 7, P);
      else if (p.k === 'counter') drawCounter(g, x, y + 2, p.w, P);
      else if (p.k === 'sofa') drawSofa(g, x, y + 4, p.w, P);
      else if (p.k === 'table') drawTable(g, x, y + 2, p.w, p.h, P);
      else if (p.k === 'printer') drawPrinter(g, x, y + 7, P);
      else if (p.k === 'shelf') drawShelf(g, x, y + 6, p.w, P);
      else if (p.k === 'arcade') drawArcade(g, x, y + 7);
      else if (p.k === 'bag') drawBag(g, x, y + 6, '#E060A8', '#F2A6CF');
      else if (p.k === 'files') drawFiles(g, x, y + 7);
    });
    if (L.posters) L.posters.forEach(function (px, i) { drawPoster(g, Math.round(px * T), i); });
    L.desks.forEach(function (d) { shadow(g, d.x * T, d.y * T + 11, 2 * T); });
    return c;
  };
  function drawGlassBase(g, L) { if (!L.glass) return; var G = L.glass; R(g, G.x * T + 2, G.y * T, G.w * T - 2, G.h * T - 2, 'rgba(255,255,255,.18)'); }

  /* agents */
  Scene.prototype.seatTile = function (d) { return d.seat === 'n' ? [d.x, d.y - 1] : [d.x, d.y + 1]; };
  Scene.prototype.add = function (a, o) {
    o = o || {};
    var L = this.L, d = L.desks[a.desk], st = this.seatTile(d);
    var ag = { id: a.id, name: a.name, recipe: a.recipe, desk: a.desk, spr: sprites(a.recipe), x: st[0], y: st[1], fx: st[0] * T + 16, fy: 0, state: 'seat', face: d.seat === 'n' ? 'down' : 'up', phase: 0, timer: 2 + this.rnd() * 6, path: null, bubble: null, bob: 0, typing: this.rnd(), busy: a.busy !== false, hidden: false, human: !!a.human };
    ag.fy = this.seatFeetY(d);
    if (o.enter) { ag.x = L.door.x; ag.y = L.wall - 1; ag.fx = ag.x * T + 8; ag.fy = ag.y * T + 14; ag.state = 'walk'; ag.path = this.path(ag.x, ag.y, st[0], st[1]); ag.then = 'seat'; ag.face = 'down'; }
    this.agents.push(ag);
    return ag;
  };
  Scene.prototype.seatFeetY = function (d) { return d.seat === 'n' ? d.y * T + 4 : d.y * T + 30; };
  Scene.prototype.get = function (id) { for (var i = 0; i < this.agents.length; i++) if (this.agents[i].id === id) return this.agents[i]; return null; };
  Scene.prototype.leave = function (id) { var a = this.get(id); if (!a) return; a.state = 'walk'; a.path = this.path(a.x, a.y, this.L.door.x, this.L.wall - 1); a.then = 'gone'; };
  Scene.prototype.come = function (id) { var a = this.get(id); if (!a || !a.hidden) return; a.hidden = false; a.x = this.L.door.x; a.y = this.L.wall - 1; a.fx = a.x * T + 8; a.fy = a.y * T + 14; var d = this.L.desks[a.desk], st = this.seatTile(d); a.state = 'walk'; a.path = this.path(a.x, a.y, st[0], st[1]); a.then = 'seat'; };
  Scene.prototype.grab = function (id) { var a = this.get(id); if (!a || a.hidden) return null; a.state = 'held'; a.path = null; a.target = null; a.bubble = null; return a; };
  Scene.prototype.hold = function (id, x, y) { var a = this.get(id); if (a && a.state === 'held') { a.fx = x; a.fy = y; } };
  Scene.prototype.drop = function (id) {
    var a = this.get(id); if (!a || a.state !== 'held') return;
    var L = this.L, w = this.walk, tx = Math.max(0, Math.min(L.cols - 1, Math.round((a.fx - 8) / T))), ty = Math.max(L.wall, Math.min(L.rows - 1, Math.round((a.fy - 14) / T)));
    if (!w[ty][tx]) { var best = null, bd = 1e9; for (var y = L.wall; y < L.rows; y++) for (var x = 0; x < L.cols; x++) if (w[y][x]) { var dd = (x - tx) * (x - tx) + (y - ty) * (y - ty); if (dd < bd) { bd = dd; best = [x, y]; } } if (best) { tx = best[0]; ty = best[1]; } }
    a.x = tx; a.y = ty; a.fx = tx * T + 8; a.fy = ty * T + 14;
    var st = this.seatTile(L.desks[a.desk]); a.state = 'walk'; a.path = this.path(tx, ty, st[0], st[1]) || []; a.then = 'seat';
  };
  Scene.prototype.bubble = function (id, kind, secs) { var a = this.get(id); if (a) a.bubble = { kind: kind, until: this.t + (secs || 3) }; };
  Scene.prototype.feet = function (id) { var a = this.get(id); return a ? { x: a.fx, y: a.fy, head: a.fy - (a.state === 'seat' && this.L.desks[a.desk].seat === 'n' ? 28 : 31) } : null; };
  Scene.prototype.hit = function (px, py) {
    for (var i = this.agents.length - 1; i >= 0; i--) { var a = this.agents[i]; if (a.hidden) continue; var top = a.fy - 31; if (px >= a.fx - 9 && px <= a.fx + 9 && py >= top && py <= a.fy) return a.id; }
    return null;
  };
  Scene.prototype.errand = function (a) {
    var E = this.L.errands, e = E[Math.floor(this.rnd() * E.length)];
    var taken = this.agents.some(function (b) { return b !== a && b.target === e; }); if (taken) return false;
    var p = this.path(a.x, a.y, e.x, e.y); if (!p || !p.length) return false;
    a.state = 'walk'; a.path = p; a.then = 'errand'; a.target = e; return true;
  };
  Scene.prototype.step = function (dt) {
    var self = this, L = this.L;
    this.agents.forEach(function (a) {
      if (a.hidden) return;
      if (a.state === 'seat') {
        a.typing += dt; a.timer -= dt;
        if (a.timer <= 0) { if (a.busy && self.rnd() < .55 && self.errand(a)) { a.timer = 0; } else a.timer = 3 + self.rnd() * 7; }
      } else if (a.state === 'walk') {
        if (!a.path || !a.path.length) { self.arrive(a); return; }
        var n = a.path[0], tx = n[0] * T + 8, ty = n[1] * T + 14, sp = 34 * dt;
        var dx = tx - a.fx, dy = ty - a.fy, dist = Math.hypot(dx, dy);
        a.face = Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? 'up' : 'down') : (a.face === 'up' && Math.abs(dy) > .5 ? 'up' : 'down');
        if (dist <= sp) { a.fx = tx; a.fy = ty; a.x = n[0]; a.y = n[1]; a.path.shift(); if (!a.path.length) self.arrive(a); }
        else { a.fx += dx / dist * sp; a.fy += dy / dist * sp; }
        a.phase += dt * 7;
      } else if (a.state === 'held') {
        a.phase += dt * 9;
      } else if (a.state === 'errand') {
        a.timer -= dt; if (a.timer <= 0) { var d = L.desks[a.desk], st = self.seatTile(d); a.target = null; a.state = 'walk'; a.path = self.path(a.x, a.y, st[0], st[1]); a.then = 'seat'; }
      }
    });
  };
  Scene.prototype.arrive = function (a) {
    var L = this.L;
    if (a.then === 'seat') { var d = L.desks[a.desk]; a.state = 'seat'; a.fx = d.x * T + 16; a.fy = this.seatFeetY(d); a.face = d.seat === 'n' ? 'down' : 'up'; a.timer = 4 + this.rnd() * 8; }
    else if (a.then === 'errand') { a.state = 'errand'; a.face = a.target.face; a.timer = 2 + this.rnd() * 3; var k = a.target.kind; a.bubble = { kind: k === 'coffee' ? 'coffee' : k === 'chat' ? 'dots' : k === 'window' ? 'sun' : k === 'board' ? 'idea' : k === 'cooler' ? 'drop' : 'dots', until: this.t + 2.4 }; }
    else if (a.then === 'gone') { a.hidden = true; a.state = 'gone'; }
  };

  /* drawing */
  function drawBubble(g, x, y, kind, t) {
    box(g, x - 7, y - 11, 15, 10, '#FFFFFF', OUT); R(g, x - 1, y - 2, 3, 2, '#FFFFFF'); R(g, x - 1, y - 1, 1, 2, OUT); R(g, x + 1, y - 1, 1, 1, OUT); R(g, x, y, 1, 1, OUT);
    var cx = x - 4, cy = y - 8;
    if (kind === 'dots') { for (var i = 0; i < 3; i++) R(g, cx + 1 + i * 3, cy + 2 + ((Math.floor(t * 4) + i) % 3 === 0 ? -1 : 0), 2, 2, '#6B685F'); }
    else if (kind === 'coffee') { R(g, cx + 1, cy + 1, 6, 5, '#8C5A31'); R(g, cx + 7, cy + 2, 1, 2, '#8C5A31'); R(g, cx + 2, cy + 1, 4, 1, '#D9B184'); }
    else if (kind === 'check') { R(g, cx + 1, cy + 3, 2, 2, '#3F8F5E'); R(g, cx + 3, cy + 4, 2, 2, '#3F8F5E'); R(g, cx + 5, cy + 1, 2, 3, '#3F8F5E'); R(g, cx + 7, cy, 1, 2, '#3F8F5E'); }
    else if (kind === 'ask') { R(g, cx + 3, cy, 2, 4, '#D6903F'); R(g, cx + 3, cy + 5, 2, 1, '#D6903F'); }
    else if (kind === 'heart') { R(g, cx + 1, cy + 1, 2, 2, '#E060A8'); R(g, cx + 5, cy + 1, 2, 2, '#E060A8'); R(g, cx + 1, cy + 2, 6, 2, '#E060A8'); R(g, cx + 2, cy + 4, 4, 1, '#E060A8'); R(g, cx + 3, cy + 5, 2, 1, '#E060A8'); }
    else if (kind === 'idea') { R(g, cx + 2, cy, 4, 4, '#FFC94F'); R(g, cx + 3, cy + 4, 2, 2, '#8E8A84'); }
    else if (kind === 'sun') { R(g, cx + 2, cy + 1, 4, 4, '#FFC94F'); R(g, cx + 3, cy, 2, 1, '#FFC94F'); R(g, cx + 3, cy + 5, 2, 1, '#FFC94F'); R(g, cx + 1, cy + 2, 1, 2, '#FFC94F'); R(g, cx + 6, cy + 2, 1, 2, '#FFC94F'); }
    else if (kind === 'drop') { R(g, cx + 3, cy, 2, 2, '#4F9FD9'); R(g, cx + 2, cy + 2, 4, 3, '#4F9FD9'); R(g, cx + 3, cy + 3, 1, 1, '#CFEAFA'); }
    else if (kind === 'zz') { R(g, cx + 1, cy + 1, 4, 1, '#9482D3'); R(g, cx + 3, cy + 2, 1, 1, '#9482D3'); R(g, cx + 2, cy + 3, 1, 1, '#9482D3'); R(g, cx + 1, cy + 4, 4, 1, '#9482D3'); R(g, cx + 6, cy + 3, 2, 1, '#9482D3'); R(g, cx + 6, cy + 5, 2, 1, '#9482D3'); }
    else if (kind === 'mail') { R(g, cx, cy + 1, 9, 6, '#FFFFFF'); R(g, cx, cy + 1, 9, 1, '#E0803A'); R(g, cx, cy + 6, 9, 1, '#E0803A'); R(g, cx, cy + 1, 1, 6, '#E0803A'); R(g, cx + 8, cy + 1, 1, 6, '#E0803A'); R(g, cx + 2, cy + 2, 2, 1, '#E0803A'); R(g, cx + 5, cy + 2, 2, 1, '#E0803A'); R(g, cx + 4, cy + 3, 1, 1, '#E0803A'); }
  }
  function skyAt(h) {
    var K = [[0, '#141A38'], [5, '#1C2550'], [6.5, '#F2A87E'], [8, '#A6D8F2'], [16.5, '#A6D8F2'], [18.5, '#F29E6C'], [20, '#2A3366'], [24, '#141A38']];
    for (var i = 0; i < K.length - 1; i++) if (h >= K[i][0] && h <= K[i + 1][0]) return mix(K[i][1], K[i + 1][1], (h - K[i][0]) / (K[i + 1][0] - K[i][0]));
    return '#A6D8F2';
  }
  function darkAt(h) { if (h >= 8 && h <= 17) return 0; if (h > 17 && h < 20.5) return (h - 17) / 3.5 * .58; if (h >= 20.5 || h < 5) return .58; return .58 * (1 - (h - 5) / 3); }

  Scene.prototype.drawAgent = function (g, a, crop) {
    if (a.state === 'held') {
      g.fillStyle = 'rgba(20,20,30,.22)'; g.fillRect(Math.round(a.fx - 6), Math.round(a.fy + 2), 12, 2);
      g.drawImage(a.spr.front[Math.floor(a.phase) % 2 ? 1 : 2], Math.round(a.fx - 9), Math.round(a.fy - 38)); return;
    }
    var fr = a.face === 'up' ? a.spr.back : a.spr.front, ph = a.state === 'walk' ? (Math.floor(a.phase) % 4 === 1 ? 1 : Math.floor(a.phase) % 4 === 3 ? 2 : 0) : 0;
    var img = fr[ph], x = Math.round(a.fx - 9), y = Math.round(a.fy - 31);
    if (a.state === 'seat' && a.busy) { var tb = Math.sin(a.typing * 9) > .6 ? 1 : 0; y += tb; }
    if (crop) g.drawImage(img, 0, 0, 18, crop, x, y, 18, crop); else g.drawImage(img, x, y);
  };
  Scene.prototype.draw = function () {
    var g = this.g, L = this.L, th = THEMES[this.themeName], P = th.P, t = this.t, self = this;
    g.imageSmoothingEnabled = false;
    // sky and anything behind the windows
    var sky = skyAt(this.time), night = darkAt(this.time);
    g.drawImage(this.bg, 0, 0);
    this.drawWindows(g, sky, night);
    // desks and agents, sorted so the seated sit behind their desks
    var list = [];
    L.desks.forEach(function (d, i) { list.push({ z: d.y * T + 8, desk: d }); });
    this.agents.forEach(function (a) { if (!a.hidden) list.push({ z: a.state === 'held' ? 1e9 : a.state === 'seat' ? (L.desks[a.desk].seat === 'n' ? L.desks[a.desk].y * T - 1 : L.desks[a.desk].y * T + 17) : a.fy, agent: a }); });
    list.sort(function (p, q) { return p.z - q.z; });
    list.forEach(function (it) {
      if (it.desk) {
        var d = it.desk, seated = self.agents.some(function (a) { return !a.hidden && a.state === 'seat' && L.desks[a.desk] === d; });
        if (d.seat === 'n' && !seated) drawChairBehind(g, d, P);
        drawDesk(g, d, P, d.seat === 'n');
        if (d.seat === 's') { self.drawScreen(g, d, P, seated, t); if (!seated) drawChairFront(g, d, P); }
      } else {
        var a = it.agent;
        if (a.state === 'seat') { var d2 = L.desks[a.desk]; if (d2.seat === 'n') { drawChairBehind(g, d2, P); self.drawAgent(g, a); } else { drawChairFront(g, d2, P); self.drawAgent(g, a, 24); } }
        else self.drawAgent(g, a);
      }
    });
    if (L.glass) drawGlass(g, L);
    // night
    if (night > 0) {
      g.fillStyle = 'rgba(14,16,40,' + night + ')'; g.fillRect(0, 0, this.W, this.H);
      g.globalCompositeOperation = 'lighter';
      this.agents.forEach(function (a) {
        if (a.hidden || a.state !== 'seat') return; var d = L.desks[a.desk];
        var cx = d.x * T + 16, cy = d.y * T - 4, rg = g.createRadialGradient(cx, cy, 2, cx, cy, 26);
        rg.addColorStop(0, P.glow + (night * .9) + ')'); rg.addColorStop(1, P.glow + '0)'); g.fillStyle = rg; g.fillRect(cx - 28, cy - 28, 56, 56);
      });
      if (L.ambient) { var lx = L.ambient.x * T, ly = L.ambient.y * T, lg = g.createRadialGradient(lx, ly, 2, lx, ly, 40); lg.addColorStop(0, P.lamp + (night * .7) + ')'); lg.addColorStop(1, P.lamp + '0)'); g.fillStyle = lg; g.fillRect(lx - 42, ly - 42, 84, 84); }
      g.globalCompositeOperation = 'source-over';
      this.agents.forEach(function (a) { if (a.hidden || a.state !== 'seat') return; var d = L.desks[a.desk]; if (d.seat === 's') self.drawScreen(g, d, P, true, t); });
    }
    // bubbles last
    this.agents.forEach(function (a) { if (a.hidden || !a.bubble || a.bubble.until < t) return; var head = a.fy - (a.state === 'seat' && L.desks[a.desk].seat === 's' ? 24 : 31); drawBubble(g, Math.round(a.fx), Math.round(head - 1), a.bubble.kind, t); });
    if (this.onDraw) this.onDraw(g);
  };
  Scene.prototype.drawScreen = function (g, d, P, on, t) {
    var mx = d.x * T + 10, my = d.y * T - 10;
    R(g, mx, my + 1, 12, 8, on ? P.screen : '#24222B');
    if (on) { for (var i = 0; i < 3; i++) { var w = 3 + ((Math.floor(t * 2.5) + i * 3 + d.x) % 7); R(g, mx + 1, my + 2 + i * 2, w, 1, P.code[(i + d.x) % 4]); } }
  };
  Scene.prototype.drawWindows = function (g, sky, night) {
    var L = this.L, t = this.t, self = this;
    L.windows.forEach(function (w) {
      var x0 = w.x * T + 3, ww = w.w * T - 6, y0 = 8, hh = 24;
      g.fillStyle = sky; g.fillRect(x0, y0, ww, hh);
      if (night > .25) self.stars.forEach(function (s) { var sx = s[0] % ww, sy = s[1] % hh; g.fillStyle = 'rgba(255,255,255,' + (.25 + .6 * Math.abs(Math.sin(t * .8 + s[2] * 7))) + ')'; g.fillRect(x0 + (sx | 0), y0 + (sy | 0), 1, 1); });
      else { var cx = ((t * 3 + w.x * 20) % (ww + 20)) - 10; g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(x0 + (cx | 0), y0 + 7, 8, 2); g.fillRect(x0 + (cx | 0) + 2, y0 + 5, 4, 2); }
      g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x0, y0 + hh - 6, ww, 6);
      g.fillStyle = '#F7F2E7'; g.fillRect(x0 + (ww >> 1), y0, 1, hh);
    });
    if (L.clock) { var cx2 = L.clock.x * T + 8, ang = (this.time / 12) * Math.PI * 2; g.fillStyle = '#E060A8'; g.fillRect(cx2 + Math.round(Math.sin(ang) * 3), 15 - Math.round(Math.cos(ang) * 3), 1, 1); }
  };

  Scene.prototype.setTime = function (h) { this.time = ((h % 24) + 24) % 24; if (!this.running) this.draw(); };
  Scene.prototype.frame = function (now) {
    if (!this.running) return;
    var self = this;
    this.raf = requestAnimationFrame(function (n) { self.frame(n); });
    if (now - this.last < 1000 / this.fps - 2) return;
    var dt = Math.min(.1, (now - (this.last || now)) / 1000); this.last = now; this.t += dt;
    this.step(dt); this.draw(); if (this.onTick) this.onTick(dt);
  };
  Scene.prototype.start = function () { if (this.running) return; this.running = true; this.last = 0; var self = this; this.raf = requestAnimationFrame(function (n) { self.last = n; self.frame(n); }); };
  Scene.prototype.stop = function () { this.running = false; cancelAnimationFrame(this.raf); };

  window.MDOffice = { Scene: Scene, THEMES: THEMES, LAYOUTS: LAYOUTS, portrait: portrait, sprites: sprites, recipeOf: recipeOf, T: T };
})();
