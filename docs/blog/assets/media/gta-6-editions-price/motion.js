/* Split flap board scenes for "GTA 6 editions and price". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", AQUA = "#3FC6C9", SOFT = "#F1ECF9", MUTE = "#7A6A88", NAVY = "#22305E";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const hash = (n) => { let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  let uid = 0;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  /* ---- the split flap kit: cells that riffle through the charset and settle ---- */
  const CH = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,", STEP = 0.07;
  const kit = (svg, cw, ch, fs) => {
    const defs = el("defs", {}, svg), A = "mgf" + ++uid, B = "mgf" + ++uid, all = [];
    el("rect", { x: -cw / 2 - 1, y: -ch / 2 - 1, width: cw + 2, height: ch / 2 + 1 }, el("clipPath", { id: A }, defs));
    el("rect", { x: -cw / 2 - 1, y: 0, width: cw + 2, height: ch / 2 + 1 }, el("clipPath", { id: B }, defs));
    const glyph = (p) => txt(p, 0, fs * 0.365, "", { "text-anchor": "middle", "font-family": MONO, "font-size": fs, "font-weight": 700 });
    const cell = (p, x, y) => {
      const g = el("g", {}, p);
      el("rect", { x: -cw / 2, y: -ch / 2, width: cw, height: ch, rx: 2.6, fill: "#fff", stroke: INK, "stroke-width": 1.3 }, g);
      const top = glyph(el("g", { "clip-path": `url(#${A})` }, g)), bot = glyph(el("g", { "clip-path": `url(#${B})` }, g));
      const fc = el("g", { display: "none" }, g), fl = el("g", {}, fc);
      el("rect", { x: -cw / 2 + 0.65, y: -ch / 2 + 0.65, width: cw - 1.3, height: ch - 1.3, rx: 2, fill: SOFT, stroke: INK, "stroke-width": 0.8 }, fl);
      const ft = glyph(fl);
      el("path", { d: `M${-cw / 2 + 0.6} 0 H${cw / 2 - 0.6}`, stroke: INK, "stroke-width": 0.9, "stroke-opacity": 0.32 }, g);
      el("path", { d: `M${-cw / 2} -1.7 V1.7 M${cw / 2} -1.7 V1.7`, stroke: INK, "stroke-width": 1.7, "stroke-linecap": "round" }, g);
      const c = { g, x, y, top, bot, fc, fl, ft, tr: [], ov: [], last: " ", fin: " ", ol: null, id: all.length, a: "", b: "", f: "", busy: true };
      all.push(c); tf(g, x, y); return c;
    };
    const row = (p, x, y, n, pitch) => Array.from({ length: n }, (_, i) => cell(p, x + pitch / 2 + i * pitch, y));
    const sq = (from, to, n) => { const s = [from], k = CH.indexOf(to); for (let i = 1; i <= n; i++) s.push(CH[(k - (n - i) + CH.length * 2) % CH.length]); return s; };
    const add = (cells, str, at, o, live) => {
      const step = o.step == null ? 0.06 : o.step; let land = at;
      cells.forEach((c, i) => {
        const from = live ? (c.ol == null ? c.fin : c.ol) : c.last, to = str[i] || " ";
        if (from === to && !(o.force && to !== " ")) return;
        const list = live ? c.ov : c.tr, n = 3 + ((hash(c.id * 7 + list.length * 131 + (live ? 17 : 0)) * 5) | 0), a = at + i * step;
        list.push({ at: a, s: sq(from, to, n) }); land = Math.max(land, a + n * STEP);
        if (live) c.ol = to; else c.last = to;
      });
      return land;
    };
    const put = (cells, str, at, o = {}) => add(cells, str, at, o, false);
    const flip = (cells, str, now, o = {}) => add(cells, str, now, o, true);
    const seal = (at) => all.forEach((c) => { c.fin = c.last; if (c.last !== " ") { c.tr.push({ at: at + hash(c.id * 3 + 5) * 0.55, s: sq(c.last, " ", 3) }); } });
    const resetOv = () => all.forEach((c) => { c.ov = []; c.ol = null; });
    const st = (list, time, base) => {
      let k = -1; for (let i = 0; i < list.length; i++) if (list[i].at <= time) k = i;
      if (k < 0) return [base, base, 0, 9];
      const r = list[k], n = r.s.length - 1, loc = (time - r.at) / STEP, i = Math.min(n, Math.floor(loc));
      return [r.s[i], r.s[Math.min(n, i + 1)], i < n ? loc - i : 0, time - (r.at + n * STEP)];
    };
    const paint = (t, now) => {
      for (const c of all) {
        const [cur, nxt, f, age] = c.ov.length ? st(c.ov, now, c.fin) : st(c.tr, t, " ");
        const idle = f <= 0 && (age < 0 || age > 0.24);
        if (idle && !c.busy && c.b === cur) continue;
        const a = f > 0 ? nxt : cur;
        if (c.a !== a) { c.top.textContent = a; c.a = a; }
        if (c.b !== cur) { c.bot.textContent = cur; c.b = cur; }
        if (f > 0) {
          const ang = Math.pow(f, 1.45) * 180, up = ang < 90, face = up ? cur : nxt;
          c.fc.setAttribute("display", "inline"); c.fc.setAttribute("clip-path", `url(#${up ? A : B})`);
          if (c.f !== face) { c.ft.textContent = face; c.f = face; }
          c.fl.setAttribute("transform", `scale(1 ${Math.max(0.03, Math.abs(Math.cos((ang * Math.PI) / 180)))})`);
        } else c.fc.setAttribute("display", "none");
        const k = age >= 0 && age < 0.24 ? age / 0.24 : 1;
        tf(c.g, c.x, c.y + Math.sin(k * Math.PI) * 2 * (1 - k));
        c.busy = !idle;
      }
    };
    return { cell, row, put, flip, seal, resetOv, paint, all };
  };

  /* ---- shared furniture ---- */
  const plate = (p, x, y, w, h, fill = SOFT, sh = LIL) => {
    el("rect", { x: x + 4, y: y + 5, width: w, height: h, rx: 9, fill: sh }, p);
    return el("rect", { x, y, width: w, height: h, rx: 9, fill, stroke: INK, "stroke-width": 1.4 }, p);
  };
  const head = (p, x, y, s) => txt(p, 0, 0, s, { transform: `translate(${x} ${y}) scale(0.86 1)`, "font-size": 13.5, "font-weight": 600, "letter-spacing": 1.7, fill: MUTE });
  const board = (svg, x, y, w, h) => {
    const g = el("g", {}, svg), lift = el("g", { class: "mg-lift" }, g);
    el("rect", { x: x + 9, y: y + 10, width: w, height: h, rx: 16, fill: LIL }, lift);
    el("rect", { x, y, width: w, height: h, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, lift);
    [[x + 13, y + 13], [x + w - 13, y + 13], [x + 13, y + h - 13], [x + w - 13, y + h - 13]].forEach(([cx, cy]) => { el("circle", { cx, cy, r: 3.2, fill: SOFT, stroke: INK, "stroke-width": 1 }, lift); });
    return { g, lift };
  };
  const stage = (svg, title, hint) => {
    const id = "mgd" + ++uid, pt = el("pattern", { id, width: 40, height: 40, patternUnits: "userSpaceOnUse" }, el("defs", {}, svg));
    el("circle", { cx: 20, cy: 20, r: 2.6, fill: "#fff" }, pt);
    const dots = el("rect", { x: -40, y: -80, width: 880, height: 760, fill: `url(#${id})` }, svg);
    const ttl = txt(svg, 40, 76, title, { "font-size": 38, "font-weight": 700 });
    const bar = el("path", { d: "M42 92 H118", stroke: YEL, "stroke-width": 7, "stroke-linecap": "round" }, svg);
    const tip = txt(svg, 760, 72, hint, { "text-anchor": "end", "font-family": MONO, "font-size": 13.5, "font-weight": 500, fill: NAVY });
    el("path", { d: "M40 566 H760", stroke: INK, "stroke-width": 1.5, "stroke-linecap": "round" }, svg);
    return (t, S, E) => {
      const out = io(seg(t, E, E + 0.5)), a = oc(seg(t, 0.05, 0.55)) * (1 - out);
      dots.setAttribute("transform", `translate(0 ${-14 * (1 - oc(seg(t, 0, 1.4))) - 8 * out})`);
      ttl.setAttribute("opacity", a); ttl.setAttribute("transform", `translate(${-16 * (1 - oc(seg(t, 0.05, 0.55)))} 0)`);
      const b = oc(seg(t, 0.3, 0.8)) * (1 - out); bar.setAttribute("stroke-dasharray", `${76 * b} 200`); bar.setAttribute("opacity", b > 0.01 ? 1 : 0);
      tip.setAttribute("opacity", oc(seg(t, S - 0.5, S - 0.1)) * (1 - seg(t, E - 0.6, E - 0.3)));
      return { y: -46 * (1 - ob(seg(t, 0.1, 0.75))) - 34 * out * out, o: seg(t, 0.1, 0.3) * (1 - out) };
    };
  };
  const mover = (b, m, dip = 0) => { b.g.setAttribute("transform", `translate(0 ${m.y + dip})`); b.g.setAttribute("opacity", m.o); };
  /* a small traveller who watches the board: round head, two dots, a case */
  const traveller = (svg, x, tint) => {
    const g = el("g", {}, svg);
    el("ellipse", { cx: 6, cy: 0, rx: 30, ry: 3.4, fill: LIL }, g);
    const b = el("g", {}, g);
    el("rect", { x: 17, y: -19, width: 19, height: 18, rx: 4, fill: YEL, stroke: INK, "stroke-width": 1.4 }, b);
    el("path", { d: "M22 -19 V-24 H31 V-19", stroke: INK, "stroke-width": 1.4, fill: "none", "stroke-linejoin": "round" }, b);
    el("path", { d: "M-6 -8 V-1 M5 -8 V-1", stroke: INK, "stroke-width": 2.6, "stroke-linecap": "round" }, b);
    el("rect", { x: -13, y: -36, width: 25, height: 29, rx: 9, fill: tint, stroke: INK, "stroke-width": 1.4 }, b);
    const hd = el("g", {}, b);
    el("circle", { cx: 0, cy: -48, r: 12, fill: "#fff", stroke: INK, "stroke-width": 1.4 }, hd);
    el("circle", { cx: -6, cy: -51, r: 1.5, fill: INK }, hd); el("circle", { cx: 2, cy: -52, r: 1.5, fill: INK }, hd);
    return (t, L, E) => {
      const inn = oc(seg(t, 0.9, 1.7)), out = io(seg(t, E, E + 0.5)), hop = Math.sin(seg(t, L, L + 0.45) * Math.PI);
      tf(g, x + 60 * (1 - inn) + 40 * out, 565); g.setAttribute("opacity", seg(t, 0.9, 1.2) * (1 - out));
      b.setAttribute("transform", `translate(0 ${-11 * hop + Math.sin(t * 2.2) * 0.7})`);
      hd.setAttribute("transform", `rotate(${-7 * seg(t, L - 0.3, L) + Math.sin(t * 1.3) * 2} 0 -40)`);
    };
  };
  /* keeps the final frame on screen while someone plays with it, then hands the loop back */
  const pinner = (api, K, S, isBase, revert) => {
    let pin = false, last = 0, rev = 0;
    return {
      tap(now) { pin = true; last = now; rev = 0; },
      time(t, now) {
        if (!pin) return t;
        if (!api.calm) {
          if (!rev && now - last > 9) { rev = now; if (isBase()) rev = now - 2; else revert(now); }
          if (rev && now - rev > 1.8) { pin = false; rev = 0; K.resetOv(); api.seek(S + 1.6); return null; }
        }
        return S;
      },
    };
  };
  const ring = (p, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: AQUA, "stroke-width": 2.4, class: "mg-ring" }, p);
  const pulse = (p, x, y, w, h, rx) => { const n = el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: AQUA, "stroke-width": 2, opacity: 0 }, p); return (k) => { n.setAttribute("opacity", k > 0 && k < 1 ? 1 - k : 0); const d = 12 * oc(k); n.setAttribute("x", x - d); n.setAttribute("y", y - d); n.setAttribute("width", w + 2 * d); n.setAttribute("height", h + 2 * d); n.setAttribute("rx", rx + d); }; };
  const pop = (n, cx, cy, k) => n.setAttribute("transform", `translate(${cx} ${cy}) scale(${0.72 + 0.28 * k}) translate(${-cx} ${-cy})`);

  const SC = {};

  /* ---- 1. two editions as two departures ---- */
  SC.editions = {
    dur: 11.9, still: 8,
    build(svg, api) {
      const S = 8, E = S + 3.3, P = 21, X = 58.3, cols = [0, 8 * P + 16, 22 * P + 32];
      const anim = stage(svg, "Two departures", "tapping a row flips it"), who = traveller(svg, 668, BLUE);
      const B = board(svg, 40, 112, 720, 380), K = kit(svg, 19.4, 36, 21);
      const hs = ["EDITION", "WITH", "STATUS"].map((s, i) => head(B.lift, X + cols[i] + 1, 141, s));
      const data = [
        { name: "STANDARD", items: ["GAME", "VINTAGE PACK", "GTA PLUS MONTH"], adds: ["VINTAGE PACK", "GTA PLUS MONTH", ""], y: 152, at: 0.95 },
        { name: "ULTIMATE", items: ["GAME", "VINTAGE PACK", "GTA PLUS MONTH", "UPGRADE"], adds: ["UPGRADE", "", "", ""], y: 296, at: 3.0 },
      ];
      let land = 0;
      const blocks = data.map((d, bi) => {
        const n = d.items.length, h = n * 40 + 12, g = el("g", {}, B.lift), lift = el("g", { class: "mg-lift" }, g);
        const pl = plate(lift, 48, d.y, 704, h), sx = X + cols[2], sy = d.y + 4;
        const glow = pulse(lift, sx - 4.5, sy, 9 * P + 7.4, 44, 7);
        const hi = el("rect", { x: sx - 4.5, y: sy, width: 9 * P + 7.4, height: 44, rx: 7, fill: YEL, stroke: INK, "stroke-width": 1.3, opacity: 0 }, lift);
        const lines = d.items.map((_, li) => cols.map((c, ci) => K.row(lift, X + c, d.y + 26 + li * 40, [8, 14, 9][ci], P)));
        ring(g, 43, d.y - 5, 714, h + 12, 13);
        K.put(lines[0][0], d.name, d.at);
        d.items.forEach((s, li) => K.put(lines[li][1], s, d.at + 0.4 + li * 0.45 + (li === 3 ? 0.25 : 0)));
        land = Math.max(land, K.put(lines[0][2], "SAME GAME", 6.2 + bi * 0.14));
        const b = { d, g, pl, hi, glow, lines, on: false, cx: sx + 4.5 * P, cy: sy + 22 };
        button(g, `${d.name}: ${d.items.join(", ")}. Status: SAME GAME. Flip to show only what this edition adds.`, () => toggle(b, api.calm ? api.now() - 99 : api.now(), true));
        g.setAttribute("aria-pressed", "false");
        return b;
      });
      K.seal(S + 2.6);
      const toggle = (b, now, user) => {
        b.on = !b.on; b.g.setAttribute("aria-pressed", String(b.on));
        b.lines.forEach((ln, li) => K.flip(ln[1], b.on ? b.d.adds[li] : b.d.items[li], now + li * 0.1));
        if (user) { pin.tap(api.now()); api.poke(); }
      };
      const pin = pinner(api, K, S, () => !blocks.some((b) => b.on), (now) => blocks.forEach((b) => { if (b.on) toggle(b, now, false); }));
      return (t, now) => {
        t = pin.time(t, now); if (t === null) return;
        const m = anim(t, S, E); mover(B, m, 3 * Math.sin(seg(t, 6.0, 6.2) * Math.PI)); who(t, land, E);
        hs.forEach((h, i) => h.setAttribute("opacity", oc(seg(t, 0.5 + i * 0.1, 0.9 + i * 0.1))));
        blocks.forEach((b, i) => {
          const L = land - 0.12 + i * 0.1, k = seg(t, L, L + 0.45), gone = t > S + 2.75;
          b.hi.setAttribute("opacity", k > 0 && !gone ? 1 : 0); pop(b.hi, b.cx, b.cy, ob(k)); b.glow(seg(t, L + 0.05, L + 0.6));
          b.pl.setAttribute("fill", b.on ? MINT : SOFT);
        });
        K.paint(t, now);
      };
    },
  };

  /* ---- 2. four currencies, two prices each, both stores the same ---- */
  SC.departures = {
    dur: 11.9, still: 8,
    build(svg, api) {
      const S = 8, E = S + 3.3, P = 21, X = 57, cols = [0, 3 * P + 12, 8 * P + 24, 13 * P + 36];
      const anim = stage(svg, "Departures", "tapping a row flips its store label"), who = traveller(svg, 668, MINT);
      const B = board(svg, 40, 112, 720, 360), K = kit(svg, 19.4, 40, 22);
      const hs = [["STANDARD", X + cols[1]], ["ULTIMATE", X + cols[2]], ["STORE", X + cols[3]], ["STATUS", 622]].map(([s, x]) => head(B.lift, x + 1, 144, s));
      const data = [["USD", "79.99", "99.99"], ["GBP", "69.99", "89.99"], ["EUR", "79.99", "99.99"], ["INR", "5,999", "7,499"]];
      const rows = data.map((d, r) => {
        const y = 156 + r * 74, g = el("g", {}, B.lift), lift = el("g", { class: "mg-lift" }, g), pl = plate(lift, 48, y, 558, 62);
        const c = cols.map((cx, ci) => K.row(lift, X + cx, y + 31, [3, 5, 5, 11][ci], P)), at = 0.95 + r * 1.0;
        ring(g, 43, y - 5, 568, 72, 13);
        K.put(c[0], d[0], at); K.put(c[1], d[1], at + 0.2); K.put(c[2], d[2], at + 0.5);
        const end = K.put(c[3], "PLAYSTATION", at + 0.8);
        const row = { g, pl, c, at, end, x: false, hit: -9 };
        const say = () => g.setAttribute("aria-label", `${d[0]}: STANDARD ${d[1]}, ULTIMATE ${d[2]}, store ${row.x ? "XBOX" : "PLAYSTATION"}. Flip the store label; the prices stay.`);
        row.flip = (now, user) => { row.x = !row.x; say(); row.hit = now; K.flip(c[3], row.x ? "XBOX" : "PLAYSTATION", now); if (user) { pin.tap(api.now()); api.poke(); } };
        button(g, "", () => row.flip(api.calm ? api.now() - 99 : api.now(), true)); say();
        return row;
      });
      const sg = el("g", {}, B.lift), sp = plate(sg, 616, 156, 136, 284), glow = pulse(sg, 616, 156, 136, 284, 9);
      let land = 0;
      ["PS AND", "XBOX", "MATCH"].forEach((s, i) => { land = Math.max(land, K.put(K.row(sg, 621, 298 + (i - 1) * 56, 6, P), s, 6.2 + i * 0.16)); });
      K.seal(S + 2.6);
      const pin = pinner(api, K, S, () => !rows.some((r) => r.x), (now) => rows.forEach((r) => { if (r.x) r.flip(now, false); }));
      return (t, now) => {
        t = pin.time(t, now); if (t === null) return;
        const m = anim(t, S, E); mover(B, m, 3 * Math.sin(seg(t, 6.0, 6.2) * Math.PI)); who(t, land, E);
        hs.forEach((h, i) => h.setAttribute("opacity", oc(seg(t, 0.5 + i * 0.1, 0.9 + i * 0.1))));
        rows.forEach((r) => r.pl.setAttribute("fill", (t >= r.at && t < r.end + 0.1) || (now - r.hit >= 0 && now - r.hit < 0.8) ? YEL : SOFT));
        const k = seg(t, land - 0.1, land + 0.4);
        sp.setAttribute("fill", k > 0 && t < S + 2.75 ? YEL : SOFT); pop(sg, 684, 298, k > 0 ? 0.8 + 0.2 * ob(k) : 1); glow(seg(t, land, land + 0.55));
        K.paint(t, now);
      };
    },
  };

  /* ---- 3. standard plus the upgrade is the ultimate price ---- */
  SC.upgrade = {
    dur: 12.3, still: 8.4,
    build(svg, api) {
      const S = 8.4, E = S + 3.3, P = 26, X = 62;
      const anim = stage(svg, "The upgrade", "tapping the board flips every row"), who = traveller(svg, 668, SKY);
      const B = board(svg, 40, 112, 720, 360), K = kit(svg, 24.2, 38, 25);
      const hs = [["CURRENCY", X + 17 * P], ["PRICE", X + 21 * P]].map(([s, x]) => head(B.lift, x + 1, 141, s));
      plate(B.lift, 48, 152, 704, 162);
      const names = ["STANDARD", "UPGRADE", "ULTIMATE"], at = [0.95, 1.95, 3.25];
      const cur = ["USD", "GBP", "EUR", "INR"], price = [["79.99", "20.00", "99.99"], ["69.99", "20.00", "89.99"], ["79.99", "20.00", "99.99"], ["5,999", "1,500", "7,499"]];
      const sum = names.map((s, i) => { const c = K.row(B.lift, X, 183 + i * 50, 26, P); K.put(c.slice(0, 8), s, at[i]); K.put(c.slice(17, 20), "USD", at[i] + 0.35); K.put(c.slice(21), price[0][i], at[i] + 0.55); return c; });
      const rule = el("path", { d: `M${X + 1} 258 H${X + 26 * P - 3}`, stroke: INK, "stroke-width": 1.6, "stroke-linecap": "round" }, B.lift);
      const plus = el("g", {}, B.lift);
      el("circle", { r: 11.5, fill: YEL, stroke: INK, "stroke-width": 1.4 }, plus); el("path", { d: "M-5.5 0 H5.5 M0 -5.5 V5.5", stroke: INK, "stroke-width": 2.4, "stroke-linecap": "round" }, plus);
      const px = X + 15.5 * P, py = 233;
      const tg = el("g", {}, B.lift), tp = plate(tg, 48, 324, 704, 56), glow = pulse(tg, 48, 324, 704, 56, 9), total = K.row(tg, X, 352, 26, P);
      plate(B.lift, 48, 392, 704, 56, LIL, SOFT);
      const low = K.row(B.lift, X, 420, 26, P);
      K.put(low, "PLAYSTATION NO PRICE SHOWN", 4.5, { step: 0.035 });
      const land = K.put(total, "XBOX SAME TOTAL", 6.3);
      K.seal(S + 2.6);
      ring(B.g, 34, 106, 732, 372, 21);
      let idx = 0, hit = -9;
      const say = () => B.g.setAttribute("aria-label", `${cur[idx]}: STANDARD ${price[idx][0]}, UPGRADE ${price[idx][1]}, ULTIMATE ${price[idx][2]}. XBOX SAME TOTAL. PLAYSTATION NO PRICE SHOWN. Flip every row to the next currency.`);
      const go = (to, now, user) => {
        idx = to; say();
        sum.forEach((c, i) => { K.flip(c.slice(17, 20), cur[idx], now + i * 0.12); K.flip(c.slice(21), price[idx][i], now + 0.15 + i * 0.12); });
        hit = K.flip(total, "XBOX SAME TOTAL", now + 0.45, { force: true, step: 0.04 });
        if (user) { pin.tap(api.now()); api.poke(); }
      };
      button(B.g, "", () => go((idx + 1) % 4, api.calm ? api.now() - 99 : api.now(), true)); say();
      const pin = pinner(api, K, S, () => idx === 0, (now) => go(0, now, false));
      return (t, now) => {
        t = pin.time(t, now); if (t === null) return;
        const m = anim(t, S, E); mover(B, m, 3 * Math.sin(seg(t, 6.1, 6.3) * Math.PI)); who(t, land, E);
        hs.forEach((h, i) => h.setAttribute("opacity", oc(seg(t, 0.5 + i * 0.1, 0.9 + i * 0.1))));
        const r = oc(seg(t, 2.85, 3.3)) * (1 - seg(t, S + 2.9, S + 3.2)); rule.setAttribute("stroke-dasharray", `${680 * r} 900`); rule.setAttribute("opacity", r > 0.005 ? 1 : 0);
        const p = seg(t, 2.35, 2.75) * (1 - seg(t, S + 2.8, S + 3.1)); tf(plus, px, py, p > 0 ? ob(p) : 0, 90 * (1 - oc(p))); plus.setAttribute("opacity", p > 0 ? 1 : 0);
        const live = now - hit > -1 && now - hit < 0.6, k = live ? seg(now, hit - 0.1, hit + 0.4) : seg(t, land - 0.1, land + 0.4);
        tp.setAttribute("fill", k > 0 && t < S + 2.75 ? YEL : SOFT); pop(tg, 400, 352, k > 0 ? 0.86 + 0.14 * ob(k) : 1);
        glow(live ? seg(now, hit, hit + 0.55) : seg(t, land, land + 0.55));
        K.paint(t, now);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 11, still: 7.6, bg: "#fff",
    build(svg) {
      const S = 7.6, E = S + 2.4, P = 27, X = 534;
      const pill = el("g", {}, svg);
      el("rect", { x: 64, y: 48, width: 112, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 1.5 }, pill);
      txt(pill, 120, 75, "Guides", { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
      const chk = txt(svg, 896, 75, "Checked 19 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      const ts = ["GTA 6", "editions", "and price"].map((s, i) => txt(svg, 64, 196 + i * 82, s, { "font-size": 80, "font-weight": 700, "letter-spacing": -1.5 }));
      const bar = el("path", { d: "M68 392 H228", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      const sub = txt(svg, 64, 462, "Every edition in dollars, pounds, euros and rupees", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const B = board(svg, 512, 128, 400, 244), K = kit(svg, 25, 42, 26);
      plate(B.lift, 524, 140, 376, 60); K.row(B.lift, X, 170, 8, P);
      const cx = X + 10 * P + 8, cg = el("g", {}, B.lift), glow = pulse(cg, cx - 5, 145, 3 * P + 9, 50, 7);
      const cp = el("rect", { x: cx - 5, y: 145, width: 3 * P + 9, height: 50, rx: 7, fill: YEL, stroke: INK, "stroke-width": 1.3 }, cg), chip = K.row(cg, cx, 170, 3, P);
      const cur = ["USD", "GBP", "EUR", "INR"], price = [["79.99", "99.99"], ["69.99", "89.99"], ["79.99", "99.99"], ["5,999", "7,499"]], when = [2.7, 4.0, 5.2, 6.4];
      const rows = ["STANDARD", "ULTIMATE"].map((s, i) => {
        plate(B.lift, 524, 212 + i * 72, 376, 60);
        const a = K.row(B.lift, X, 242 + i * 72, 8, P), b = K.row(B.lift, X + 8 * P + 8, 242 + i * 72, 5, P);
        K.put(a, s, 0.9 + i * 0.55); K.put(b, price[0][i], 1.3 + i * 0.55);
        return b;
      });
      const lands = when.map((w, j) => { const l = K.put(chip, cur[j], w); if (j) rows.forEach((b, i) => K.put(b, price[j][i], w + 0.12 + i * 0.12)); return l; });
      K.seal(S + 1.6);
      return (t) => {
        const out = io(seg(t, E, E + 0.5));
        [pill, chk].forEach((n, i) => { const k = oc(seg(t, 0.05 + i * 0.1, 0.5 + i * 0.1)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${-10 * (1 - k)})`); });
        ts.forEach((n, i) => { const k = oc(seg(t, 0.15 + i * 0.1, 0.7 + i * 0.1)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(${-22 * (1 - k)} 0)`); });
        const b = oc(seg(t, 0.6, 1.1)); bar.setAttribute("stroke-dasharray", `${160 * b} 400`); bar.setAttribute("opacity", b > 0.01 ? 1 : 0);
        sub.setAttribute("opacity", oc(seg(t, 0.7, 1.2)));
        mover(B, { y: -40 * (1 - ob(seg(t, 0.2, 0.85))) - 30 * out * out, o: seg(t, 0.2, 0.4) * (1 - out) });
        let k = 1, g = 0; lands.forEach((l) => { if (t >= l - 0.1) { k = 0.84 + 0.16 * ob(seg(t, l - 0.1, l + 0.35)); g = seg(t, l, l + 0.6); } });
        cp.setAttribute("opacity", t >= lands[0] - 0.1 && t < S + 1.8 ? 1 : 0); pop(cg, cx + 1.5 * P, 170, (k - 0.72) / 0.28); glow(g);
        K.paint(t, 0);
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: sc.bg || SOFT }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { calm, now: clock, seek: (s) => { off = s - clock(); if (!calm) held = false; tick(); }, poke: () => { if (!calm) held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 20px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 14px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
