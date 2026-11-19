/* Pixel office scenes for "GTA 6 for AI agents". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live canvas of our own
   office simulation art (the sim-*.webp files beside it) with an SVG layer of labels on top.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const HOME = ((document.currentScript && document.currentScript.src) || "").replace(/[^/]*$/, "");
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", AQUA = "#3FC6C9", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const pop = (t, a, d = 0.45) => ob(seg(t, a, a + d));
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  /* ---- the simulation: room, props, seats and the cast sheet, as its manifest lays them out ---- */
  const Z = 4, FW = 48, SPR = 60; // room pixels are drawn 4 times, cast pixels 5 times (the cast scale is 1.25)
  const ROWS = ["down", "up", "left", "right", "sitDown", "sitUp", "sitLeft", "sitRight", "workDown", "workUp", "workLeft", "workRight", "carryDown", "carryUp", "carryLeft", "carryRight", "stretch", "drink", "read", "use", "talk", "cheer", "nap", "crouch", "reach"];
  const PROPS = [["chair-boss", 377, 216], ["desk-boss", 360, 251], ["chair-teal-front", 249, 224], ["desk-plan", 235, 251], ["chair-mint-front", 505, 225], ["desk-leaf", 492, 251], ["chair-mint-front", 121, 225], ["desk-plan", 107, 251], ["chair-teal-front", 633, 224], ["desk-leaf", 620, 251],
    ["desk-fan", 172, 304], ["chair-teal-back", 185, 333], ["desk-fan", 300, 304], ["chair-lilac-back", 313, 333], ["desk-fan", 428, 304], ["chair-mint-back", 441, 333], ["desk-fan", 556, 304], ["chair-teal-back", 569, 333], ["skimmer", 302, 482]];
  const SEAT = [[0, 0, 24, 15], [2, 0, 16, 15], [4, 0, 32, 15], [6, 0, 8, 15], [8, 0, 40, 15], [11, 1, 12, 21], [13, 1, 20, 21], [15, 1, 28, 21], [17, 1, 36, 21]]; // chair prop, faces up, cell
  const BOARD = { x: 346, y: 76, w: 150, h: 82 };
  const IMG = {};
  let art = null;
  const loadArt = () => art || (art = Promise.all(["room", "cast"].concat(PROPS.map((p) => p[0])).filter((n, i, a) => a.indexOf(n) === i).map((n) => new Promise((ok, no) => { const i = new Image(); i.onload = () => { IMG[n] = i; ok(); }; i.onerror = no; i.src = HOME + "sim-" + n + ".webp"; }))));
  const fr = (f) => ((Math.floor(f) % 4) + 4) % 4;
  const stand = (c, row, f, x, y) => ({ c, r: ROWS.indexOf(row), f: fr(f), x: x - SPR / 2, y: y - 57.5, foot: y }); // x, y is the feet point in room pixels
  const seat = (c, n, f, work = true) => { const [pi, up] = SEAT[n], p = PROPS[pi], im = IMG[p[0]]; return { c, r: ROWS.indexOf((work ? "work" : "sit") + (up ? "Up" : "Down")), f: fr(f), x: p[1] + im.width / 2 - SPR / 2, y: p[2] - (up ? 24 : 9), foot: p[2] + im.height + (up ? -0.25 : 0.75) }; };
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  const along = (pts, d) => { // where a walker is after d room pixels of a path, and which way it faces
    for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay); if (d <= L) { const k = Math.max(0, d) / L; return { x: ax + (bx - ax) * k, y: ay + (by - ay) * k, dir: Math.abs(bx - ax) >= Math.abs(by - ay) ? (bx > ax ? "right" : "left") : (by > ay ? "down" : "up"), done: false }; } d -= L; }
    const e = pts[pts.length - 1]; return { x: e[0], y: e[1], dir: "down", done: true };
  };
  const world = (g, cam, sc) => { // one frame of the room into a canvas, whole number pixels only
    const X = (v) => Math.round((v - cam[0]) * Z), Y = (v) => Math.round((v - cam[1]) * Z);
    g.imageSmoothingEnabled = false;
    g.drawImage(IMG.room, X(0), Y(0), IMG.room.width * Z, IMG.room.height * Z);
    if (sc.under) sc.under(g, X, Y);
    (sc.glow || []).forEach((n) => { const s = SEAT[n]; g.save(); g.globalAlpha = 0.26 + 0.1 * Math.sin(sc.t * 4 + n); g.fillStyle = AQUA; g.beginPath(); g.ellipse(X((s[2] + 0.5) * 16), Y(s[1] ? (s[3] - 0.9) * 16 : (s[3] + 1.45) * 16), 60, 24, 0, 0, 7); g.fill(); g.restore(); });
    const list = PROPS.map((p) => ({ foot: p[2] + IMG[p[0]].height, p })).concat(sc.actors).sort((a, b) => a.foot - b.foot);
    for (const a of list) {
      if (a.p) g.drawImage(IMG[a.p[0]], X(a.p[1]), Y(a.p[2]), IMG[a.p[0]].width * Z, IMG[a.p[0]].height * Z);
      else g.drawImage(IMG.cast, (a.c * 4 + a.f) * FW, a.r * FW, FW, FW, X(a.x), Y(a.y), SPR * Z, SPR * Z);
    }
    if (sc.over) sc.over(g, X, Y);
  };
  const pstar = (g, x, y, r, col) => { // a pixel star on the 4 px grid, ink edge first
    x = Math.round(x / Z) * Z; y = Math.round(y / Z) * Z;
    const shape = (ox, oy) => { g.fillRect(x - r * Z + ox, y + oy, (2 * r + 1) * Z, Z); g.fillRect(x + ox, y - r * Z + oy, Z, (2 * r + 1) * Z); if (r > 1) g.fillRect(x - Z + ox, y - Z + oy, 3 * Z, 3 * Z); };
    g.fillStyle = INK; shape(-Z, 0); shape(Z, 0); shape(0, -Z); shape(0, Z);
    g.fillStyle = col; shape(0, 0);
  };
  const burst = (g, x, y, u) => { // u from 0 to 1: yellow, aqua and lilac stars fly out and thin
    if (u <= 0 || u >= 1) return;
    const e = oc(u), cols = [YEL, AQUA, LIL];
    for (let i = 0; i < 30; i++) {
      if (u > 0.7 && i % 2) continue; if (u > 0.88 && i % 4) continue;
      const a = i * 2.399, d = (70 + ((i * 37) % 170)) * (0.2 + 0.8 * e), r = u > 0.8 ? 1 : i % 3 === 0 ? 3 : 2;
      pstar(g, x + Math.cos(a) * d * 1.25, y + Math.sin(a) * d - 60 * e + 90 * u * u, r, cols[i % 3]);
    }
  };
  /* tilt shift: the sharp frame, then two blurred copies let through only near the top and bottom edge */
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const stage = (w, h, band) => {
    const a = mk(w, h), b = mk(w, h), s = mk(Math.ceil(w / 8), Math.ceil(h / 8)), ga = a.getContext("2d"), gb = b.getContext("2d"), gs = s.getContext("2d"), real = typeof gb.filter === "string";
    return { g: ga, paint(ctx, vx, vy) {
      ctx.drawImage(a, vx, vy);
      [[3, band], [8, band * 0.6]].forEach(([px, bh]) => {
        gb.globalCompositeOperation = "source-over"; gb.clearRect(0, 0, w, h);
        const hh = Math.ceil(bh + 24);
        if (real) { gb.filter = `blur(${px}px)`; gb.drawImage(a, 0, 0, w, hh, 0, 0, w, hh); gb.drawImage(a, 0, h - hh, w, hh, 0, h - hh, w, hh); gb.filter = "none"; }
        else { gs.imageSmoothingEnabled = true; gs.drawImage(a, 0, 0, s.width, s.height); gb.imageSmoothingEnabled = true; gb.drawImage(s, 0, 0, w, h); }
        const lg = gb.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, "rgba(0,0,0,1)"); lg.addColorStop(bh / h, "rgba(0,0,0,0)"); lg.addColorStop(1 - bh / h, "rgba(0,0,0,0)"); lg.addColorStop(1, "rgba(0,0,0,1)");
        gb.globalCompositeOperation = "destination-in"; gb.fillStyle = lg; gb.fillRect(0, 0, w, h);
        ctx.drawImage(b, vx, vy);
      });
    } };
  };

  /* ---- label chips: clean type on a white chip, ink outline, soft lilac offset shadow ---- */
  const chip = (p, x, y, s, o = {}) => {
    const g = el("g", { transform: `translate(${x} ${y})` }, p), b = el("g", {}, g);
    const size = o.size || 24, lines = [].concat(s), lh = size * 1.28, n = lines.length;
    const ts = lines.map((ln, i) => txt(b, o.tx || 0, (i - (n - 1) / 2) * lh + size * 0.35, ln, { "text-anchor": "middle", "font-family": o.sans ? SANS : MONO, "font-size": size, "font-weight": 700, fill: o.ink || INK }));
    let tw = 0; ts.forEach((t, i) => { let w = 0; try { w = t.getComputedTextLength(); } catch (e) { w = 0; } tw = Math.max(tw, w || lines[i].length * size * 0.6); });
    const w = o.w || Math.ceil(tw + (o.pad || 36)), h = o.h || Math.ceil(n * lh + 22), rx = o.rx == null ? 12 : o.rx;
    const sh = el("rect", { x: -w / 2 + 6, y: -h / 2 + 7, width: w, height: h, rx, fill: o.shadow || LIL, "fill-opacity": 0.75 });
    const r = el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx, fill: o.fill || "#fff", stroke: INK, "stroke-width": 3 });
    b.insertBefore(r, b.firstChild); b.insertBefore(sh, r);
    if (o.pin) el("circle", { cx: 0, cy: -h / 2 + 3, r: 8, fill: o.pin, stroke: INK, "stroke-width": 2.5 }, b);
    return { g, b, w, h, ts, set(k, rot = 0, dx = 0, dy = 0) { g.setAttribute("opacity", k <= 0.02 ? 0 : 1); b.setAttribute("transform", `translate(${dx} ${dy}) rotate(${rot}) scale(${Math.max(k, 0.001)})`); } };
  };
  const ring = (g, x, y, w, h, rx = 18) => {
    el("rect", { x, y, width: w, height: h, rx, fill: "#fff", "fill-opacity": 0 }, g);
    el("rect", { x: x - 4, y: y - 4, width: w + 8, height: h + 8, rx: rx + 4, fill: "none", stroke: YEL, "stroke-width": 12, class: "mg-glow" }, g);
    el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": 4, "stroke-dasharray": "4 10", "stroke-linecap": "round", class: "mg-ring" }, g);
  };
  const drift = (t) => Math.round(io(seg(t, 0, 9)) * 5 * Z) / Z; // the camera eases 5 room pixels to the right; chips pinned to the screen stay put

  const SC = {};

  /* ---- 1. one request on the corkboard, then the crew walk to their desks ---- */
  SC.request = {
    dur: 10, still: 9.5,
    build(svg, api, ctx) {
      const st = stage(1600, 1200, 250), wg0 = el("g", {}, svg), wg = el("g", { transform: "translate(-112 0)" }, wg0);
      const from = [770, 222], to = [[716, 304], [916, 304], [1116, 304]];
      const strings = to.map((p) => el("path", { d: `M${from[0]} ${from[1]} Q${(from[0] + p[0]) / 2} ${p[1] - 10} ${p[0]} ${p[1]}`, stroke: BLUE, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, wg));
      const tagString = el("path", { d: "M862 192 Q884 206 906 196", stroke: BLUE, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, wg);
      strings.concat(tagString).forEach((s) => { s.L = s.getTotalLength() || 200; s.setAttribute("stroke-dasharray", s.L); });
      const cards = [["21", "posts"], ["Motion in", "every post"], ["A crew", "office"]].map((s, i) => chip(wg, to[i][0], 346, s, { w: 176, h: 92, pin: [AQUA, MINT, LIL][i] }));
      const tag = chip(wg, 1050, 196, "Deadline: launch day", { fill: SKY, h: 54, pin: YEL });
      const one = chip(wg, 750, 190, "One request", { sans: true, size: 32, fill: YEL, h: 64, pad: 44, pin: BLUE });
      const hit = el("g", {}, wg); ring(hit, 462, 106, 874, 378, 10);
      button(hit, "Pin the cards again", () => api.seek(1.35));
      const last = chip(svg, 800, 1122, "You: logged off", { sans: true, size: 34, fill: YEL, h: 70, pad: 52, rx: 35 });
      const crew = [[1, 1, [[172, 214], [264, 214]], 4.3], [2, 2, [[612, 214], [520, 214]], 4.55], [6, 6, [[172, 372], [328, 372]], 4.1], [7, 7, [[612, 372], [456, 372]], 4.4]];
      return (t) => {
        const dx = drift(t), A = [], glow = [];
        wg0.setAttribute("transform", `translate(${-dx * Z} 0)`);
        if (t < 1.3) { const p = along([[538, 208], [421, 208]], t * 90); A.push(stand(0, "left", t * 8, p.x, p.y)); }
        else if (t < 4.2) A.push(stand(0, "reach", t * 3, 421, 208));
        else { const p = along([[421, 208], [392, 213]], (t - 4.2) * 60); if (p.done) { A.push(seat(0, 0, t * 3)); glow.push(0); } else A.push(stand(0, "left", t * 8, p.x, p.y)); }
        crew.forEach(([c, n, pts, t0]) => { if (t < t0) return; const p = along(pts, (t - t0) * 72); if (p.done) { A.push(seat(c, n, t * 3 + n)); glow.push(n); } else A.push(stand(c, p.dir, t * 8 + n, p.x, p.y)); });
        world(st.g, [192 + dx, 44], { t, actors: A, glow }); st.paint(ctx, 0, 0);
        const k1 = seg(t, 1.5, 1.95); one.set(ob(k1), -2 - 10 * (1 - oc(k1)), 150 * (1 - oc(k1)), 270 * (1 - oc(k1)));
        strings.forEach((s, i) => s.setAttribute("stroke-dashoffset", s.L * (1 - oc(seg(t, 2.2 + i * 0.1, 2.75 + i * 0.1)))));
        cards.forEach((c, i) => { const k = seg(t, 2.6 + i * 0.12, 3.05 + i * 0.12); c.set(ob(k), [-3, 1.5, 3][i] + 12 * (1 - oc(k)) * (i - 1), 0, -26 * (1 - oc(k))); });
        tagString.setAttribute("stroke-dashoffset", tagString.L * (1 - oc(seg(t, 3.4, 3.7))));
        const k2 = seg(t, 3.6, 4.05), sw = Math.sin(seg(t, 3.6, 5.2) * Math.PI * 5) * 7 * (1 - seg(t, 3.6, 5.2));
        tag.set(ob(k2), 2 + sw);
        const k3 = seg(t, 7.5, 7.95); last.set(ob(k3), 0, 0, 30 * (1 - oc(k3)));
      };
    },
  };

  /* ---- 2. the night shift: one job per desk, a page passed down the row ---- */
  SC.nightshift = {
    dur: 10, still: 9.5,
    build(svg, api, ctx) {
      const st = stage(1600, 1200, 150), wg = el("g", {}, svg), CY = 68;
      const cols = [YEL, AQUA, LIL, MINT, SKY, "#fff"];
      const count = (t) => Math.floor(seg(t, 0.8, 6.4) * 21 + 0.0001);
      const under = (t) => (g, X, Y) => {
        const n = count(t);
        for (let i = 0; i < n; i++) {
          const x = X(BOARD.x + 5 + (i % 7) * 20), y = Y(BOARD.y + 5 + Math.floor(i / 7) * 25), up = i === n - 1 && n < 21 ? Z : 0;
          g.fillStyle = INK; g.fillRect(x - Z, y - Z - up, 60, 68); g.fillStyle = cols[(i * 5) % 6]; g.fillRect(x, y - up, 52, 60);
          g.fillStyle = INK; g.globalAlpha = 0.35; g.fillRect(x + 8, y + 24 - up, 36, Z); g.fillRect(x + 8, y + 36 - up, 28, Z); g.fillRect(x + 8, y + 48 - up, 32, Z); g.globalAlpha = 1;
          g.fillStyle = BLUE; g.fillRect(x + 20, y - up, 12, 12);
        }
      };
      const num = chip(wg, 456, 196, "0", { sans: true, size: 76, w: 168, h: 124, rx: 20 });
      el("path", { d: "M-44 44 H44", stroke: YEL, "stroke-width": 10, "stroke-linecap": "round" }, num.b);
      num.ts[0].setAttribute("y", 18);
      const desks = [["Writer", 258, "One job: a page", YEL], ["Fact check", 768, "One job: a tick", MINT], ["Animation", 1282, "One job: three frames and a title card", SKY]];
      let pinned = -1;
      const signs = desks.map(([name, x, job, col], i) => {
        const g = el("g", {}, wg), lift = el("g", { class: "mg-lift" }, g);
        ring(g, x - 136, 560, 272, 330, 20);
        const c = chip(lift, x, 516, name, { size: 26, h: 54 });
        el("circle", { cx: -c.w / 2 + 2, cy: -c.h / 2 + 2, r: 9, fill: col, stroke: INK, "stroke-width": 2.5 }, c.b);
        button(g, `${name}. ${job}`, () => { pinned = i; api.poke(); });
        return c;
      });
      const jobs = desks.map(([name, x, job, col]) => chip(wg, Math.min(x, 1296), 440, job, { size: 24, fill: col, h: 50 }));
      const clock = chip(wg, 514, 820, "20 min", { size: 24, w: 178, h: 54, tx: 20 });
      el("circle", { cx: -58, cy: 0, r: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, clock.b);
      const hand = el("path", { d: "M-58 0 V-10", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, clock.b);
      el("path", { d: "M-58 0 H-51", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, clock.b);
      const codex = chip(wg, 514, 902, "Codex helper", { size: 24, h: 48 });
      const stack = [SKY, LIL, AQUA, YEL].map((col, i) => {
        const g = el("g", {}, wg), last = i === 3, w = last ? 124 : 96;
        el("rect", { x: -w / 2 + 5, y: -21, width: w, height: 54, rx: 8, fill: LIL, "fill-opacity": 0.75 }, g);
        el("rect", { x: -w / 2, y: -27, width: w, height: 54, rx: 8, fill: last ? YEL : "#fff", stroke: INK, "stroke-width": 3 }, g);
        if (last) { el("path", { d: "M-40 -6 H24", stroke: INK, "stroke-width": 7, "stroke-linecap": "round" }, g); el("path", { d: "M-40 12 H-2", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g); }
        else { el("rect", { x: -w / 2 + 9, y: -18, width: w - 18, height: 36, rx: 3, fill: col, stroke: INK, "stroke-width": 2.5 }, g); el("path", { d: "M-7 -9 L9 0 L-7 9 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g); }
        return g;
      });
      const card = el("g", {}, wg);
      el("rect", { x: -29, y: -17, width: 68, height: 48, rx: 7, fill: BLUE, "fill-opacity": 0.6 }, card);
      el("rect", { x: -34, y: -24, width: 68, height: 48, rx: 7, fill: LIL, stroke: INK, "stroke-width": 3 }, card);
      el("path", { d: "M-20 -8 H18 M-20 8 H6", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, card);
      const page = el("g", {}, wg), pb = el("g", {}, page);
      el("rect", { x: -22, y: -28, width: 56, height: 70, rx: 7, fill: LIL, "fill-opacity": 0.75 }, pb);
      el("rect", { x: -28, y: -35, width: 56, height: 70, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, pb);
      el("path", { d: "M-16 -18 H16 M-16 -4 H16 M-16 10 H4", stroke: MUTE, "stroke-width": 4, "stroke-linecap": "round" }, pb);
      const tick = el("g", {}, pb);
      el("circle", { cx: 24, cy: -30, r: 19, fill: MINT, stroke: INK, "stroke-width": 3 }, tick);
      el("path", { d: "M15 -30 l7 7 l12 -15", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
      const punch = chip(svg, 1396, 226, ["Nobody grades", "their own homework"], { sans: true, size: 32, fill: YEL, pad: 48, h: 116, rx: 22 });
      const P = [[330, 772], [690, 772], [1216, 772]];
      return (t) => {
        const dx = drift(t);
        wg.setAttribute("transform", `translate(${-dx * Z} 0)`);
        world(st.g, [200 + dx, CY], { t, under: under(t), glow: [1, 0, 2, 7], actors: [seat(1, 1, t * 3), seat(5, 0, t * 3 + 1), seat(3, 2, t * 3 + 2), seat(8, 7, t * 3 + 3)] });
        st.paint(ctx, 0, 0);
        const n = count(t), since = t - (0.8 + (n / 21) * 5.6);
        num.ts[0].textContent = String(n); num.set(pop(t, 0.5) * (1 + 0.1 * (n > 0 && n < 21 ? 1 - seg(since, 0, 0.16) : 0) + 0.14 * Math.sin(seg(t, 6.4, 6.9) * Math.PI)));
        signs.forEach((c, i) => { const k = seg(t, 0.25 + i * 0.1, 0.7 + i * 0.1); c.set(ob(k), 0, 0, -24 * (1 - oc(k))); });
        jobs.forEach((c, i) => c.set(pinned === i ? 1 : 0));
        codex.set(pop(t, 0.6));
        const shake = Math.sin((t - 5.3) * 42) * 8 * (t > 5.3 ? 1 - seg(t, 5.3, 5.9) : 0);
        clock.set(pop(t, 0.72), shake); hand.setAttribute("transform", `rotate(${Math.min(t, 5.3) * 200} -58 0)`);
        const a = io(seg(t, 1.6, 2.5)), b = io(seg(t, 3.1, 4.0)), px = P[0][0] + (P[1][0] - P[0][0]) * a + (P[2][0] - P[1][0]) * b;
        const py = 772 - 72 * Math.sin(a * Math.PI) - 72 * Math.sin(b * Math.PI) + 8 * Math.sin(seg(t, 2.5, 2.9) * Math.PI);
        page.setAttribute("transform", `translate(${px} ${py})`); page.setAttribute("opacity", t < 1.0 ? 0 : 1);
        pb.setAttribute("transform", `rotate(${9 * Math.sin(a * Math.PI) + 9 * Math.sin(b * Math.PI) - 5}) scale(${Math.max(pop(t, 1.0), 0.001)})`);
        const tk = pop(t, 2.55, 0.4); tick.setAttribute("transform", `translate(24 -30) scale(${Math.max(tk, 0.001)}) translate(-24 30)`); tick.setAttribute("opacity", t < 2.55 ? 0 : 1);
        stack.forEach((g, i) => { const t0 = [4.2, 4.42, 4.64, 5.0][i], k = seg(t, t0, t0 + 0.45); g.setAttribute("transform", `translate(1500 ${846 - i * 62 - 46 * (1 - ob(k))}) rotate(${[-2, 2, -1.5, 3][i]}) scale(${Math.max(ob(k), 0.001)})`); g.setAttribute("opacity", t < t0 ? 0 : 1); });
        const c = io(seg(t, 6.0, 6.9)), land = Math.sin(seg(t, 6.9, 7.2) * Math.PI) * 8;
        card.setAttribute("transform", `translate(${514 + 574 * c} ${986 - 14 * c - 64 * Math.sin(c * Math.PI) - land}) rotate(${-6 + 14 * Math.sin(c * Math.PI)}) scale(${Math.max(pop(t, 0.8), 0.001)})`); card.setAttribute("opacity", t < 0.8 ? 0 : 1);
        const k3 = seg(t, 7.6, 8.05); punch.set(ob(k3), -2 * (1 - oc(k3)) + 0, 0, -30 * (1 - oc(k3)));
      };
    },
  };

  /* ---- 3. the DONE envelope walks to the Boss, stars pop, someone is on a coconut break ---- */
  const envelope = (p, scale = 1) => {
    const g = el("g", {}, p), b = el("g", { transform: `scale(${scale})` }, g);
    el("rect", { x: -62, y: -39, width: 136, height: 92, rx: 9, fill: LIL, "fill-opacity": 0.75 }, b);
    el("rect", { x: -68, y: -46, width: 136, height: 92, rx: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, b);
    el("path", { d: "M-66 -42 L0 -4 L66 -42", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round" }, b);
    el("circle", { cx: 0, cy: -5, r: 8, fill: AQUA, stroke: INK, "stroke-width": 2.5 }, b);
    txt(b, 0, 33, "DONE", { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
    return g;
  };
  SC.envelope = {
    dur: 10, still: 9.5,
    build(svg, api, ctx) {
      const st = stage(1600, 1200, 105), wg = el("g", {}, svg), CX = 192, CY = 188, TR = [1262, 800];
      const sx = (x) => (x - CX) * Z, sy = (y) => (y - CY) * Z;
      const brk = chip(wg, sx(350), sy(470 - 57.5) - 30, "Break", { size: 26, h: 52, fill: MINT });
      const stamp = chip(wg, 1470, 792, "Approve", { size: 26, w: 164, h: 62, fill: MINT, rx: 10 });
      el("rect", { x: -75, y: -24, width: 150, height: 48, rx: 6, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 5" }, stamp.b);
      const trayBack = el("g", {}, wg);
      el("rect", { x: TR[0] - 104, y: TR[1] - 62, width: 220, height: 96, rx: 12, fill: LIL, "fill-opacity": 0.75 }, trayBack);
      el("rect", { x: TR[0] - 110, y: TR[1] - 70, width: 220, height: 96, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, trayBack);
      const hit = el("g", {}, wg), lift = el("g", { class: "mg-lift" }, hit), env = envelope(lift);
      el("circle", { r: 78, fill: "none", stroke: YEL, "stroke-width": 12, class: "mg-glow" }, env);
      el("rect", { x: -80, y: -58, width: 160, height: 116, rx: 16, fill: "none", stroke: INK, "stroke-width": 4, "stroke-dasharray": "4 10", "stroke-linecap": "round", class: "mg-ring" }, env);
      const tray = chip(wg, TR[0], TR[1] + 2, "Pull request", { size: 24, w: 220, h: 52 });
      let turn = 0; const who = [6, 8, 3];
      button(hit, "Send the next envelope across the lobby", () => { turn++; api.seek(0.25); });
      const last = chip(svg, 1250, 1066, "You: playing", { sans: true, size: 34, fill: YEL, h: 70, pad: 52, rx: 35 });
      return (t) => {
        const dx = drift(t), c = who[turn % 3], A = [seat(0, 0, t * 3, t < 3.7 || t > 5.6), seat(1, 1, t * 3 + 1), seat(2, 2, t * 3 + 2), seat(7, 7, t * 3 + 3), stand(5, "drink", t * 2.5, 350, 470)], glow = [1, 2, 7];
        if (t < 3.7 || t > 5.6) glow.push(0);
        wg.setAttribute("transform", `translate(${-dx * Z} 0)`);
        let ex = sx(176), bob = 0;
        if (t < 3.78) { const p = along([[158, 298], [338, 298]], Math.max(0, t - 0.3) * 51.8); A.push(stand(c, "carryRight", t * 8, p.x, p.y)); ex = sx(p.x); bob = fr(t * 8) % 2 ? 4 : 0; }
        else if (t < 4.2) { A.push(stand(c, "carryRight", 0, 338, 298)); ex = sx(338); }
        else if (t < 5.5) { A.push(stand(c, "cheer", (t - 4.2) * 8, 338, 298)); ex = sx(338); }
        else { const p = along([[338, 298], [376, 298], [376, 372], [328, 372]], (t - 5.5) * 72); if (p.done) { A.push(seat(c, 6, t * 3)); glow.push(6); } else A.push(stand(c, p.dir, t * 8, p.x, p.y)); ex = sx(338); }
        world(st.g, [CX + dx, CY], { t, actors: A, glow, over: (g, X, Y) => burst(g, X(372), Y(236), seg(t, 4.2, 5.5)) });
        st.paint(ctx, 0, 0);
        const ey0 = sy(298 - 57.5) - 40 + bob + 10 * Math.sin(seg(t, 3.78, 3.98) * Math.PI) - 26 * oc(seg(t, 3.98, 4.25));
        const f = io(seg(t, 4.4, 5.3)), ty = TR[1] - 62, land = Math.sin(seg(t, 5.3, 5.6) * Math.PI) * 9;
        env.setAttribute("transform", `translate(${ex + (TR[0] - ex) * f} ${ey0 + (ty - ey0) * f - 150 * Math.sin(f * Math.PI) + land}) rotate(${-10 * Math.sin(f * Math.PI)}) scale(${Math.max(pop(t, 0.3), 0.001)})`);
        brk.set(pop(t, 0.3)); tray.set(pop(t, 0.42)); trayBack.setAttribute("opacity", t < 0.42 ? 0 : 1);
        const th = seg(t, 5.7, 6.1); stamp.set(pop(t, 0.54) * (1 + 0.5 * Math.sin(th * Math.PI) * (1 - th)), -7 - 10 * Math.sin(th * Math.PI));
        const k3 = seg(t, 8.0, 8.45); last.set(ob(k3), 0, 0, 30 * (1 - oc(k3)));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    h: 900, dur: 6, still: 3.6, plain: true,
    build(svg, api, ctx) {
      const V = { x: 792, y: 156, w: 744, h: 672 }, st = stage(V.w, V.h, 96), cam = [299, 197];
      const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
      el("rect", { x: 64, y: 58, width: 128, height: 52, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 128, 93, "Story", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      txt(svg, 1536, 94, "Checked 19 Nov 2026", { "text-anchor": "end", "font-size": 26, "font-weight": 500, fill: MUTE });
      txt(svg, 60, 370, "GTA 6", { "font-size": 138, "font-weight": 700 });
      txt(svg, 60, 512, "AI agents", { "font-size": 138, "font-weight": 700 });
      el("path", { d: "M68 566 H300", stroke: YEL, "stroke-width": 18, "stroke-linecap": "round" }, svg);
      txt(svg, 62, 664, "My office works while I play", { "font-size": 40, "font-weight": 500, fill: MUTE });
      el("rect", { x: V.x, y: V.y, width: V.w, height: V.h, rx: 30, fill: "none", stroke: INK, "stroke-width": 4 }, svg);
      const env = envelope(svg, 0.86);
      chip(svg, V.x + V.w - 150, V.y + V.h - 6, "You: playing", { sans: true, size: 30, fill: YEL, h: 62, pad: 46, rx: 31 });
      return (t) => {
        const x = 312 + 78 * (t / 6), f = t * 8;
        world(st.g, cam, { t, glow: [0, 6, 7], actors: [seat(0, 0, t * 3), seat(6, 6, t * 3 + 1), seat(7, 7, t * 3 + 2), stand(3, "carryRight", f, x, 298)] });
        ctx.clearRect(0, 0, 1600, 900);
        ctx.fillStyle = LIL; ctx.globalAlpha = 0.75; rr(V.x + 12, V.y + 14, V.w, V.h, 30); ctx.fill(); ctx.globalAlpha = 1;
        ctx.save(); rr(V.x, V.y, V.w, V.h, 30); ctx.clip(); st.paint(ctx, V.x, V.y); ctx.restore();
        const k = Math.min(pop(t, 0.1), 1 - seg(t, 5.7, 5.95));
        env.setAttribute("transform", `translate(${V.x + (x - cam[0]) * Z} ${V.y + (298 - 57.5 - cam[1]) * Z - 34 + (fr(f) % 2 ? 4 : 0)}) scale(${Math.max(k, 0.001)})`);
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = 1600, H = sc.h || 1200;
    const box = document.createElement("div"); box.className = "mg-svg mg-px"; box.setAttribute("role", "group"); box.setAttribute("aria-label", img.alt || ""); box.style.aspectRatio = `${W} / ${H}`;
    const cv = mk(W, H), ctx = cv.getContext("2d"); box.appendChild(cv);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}` }, box);
    img.replaceWith(box);
    let off = 0, raf = 0, seen = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const paint = (t, live) => { // live frames soften the loop point: the scene clears to soft and comes back
      draw(t);
      const w = live && !sc.plain ? Math.max(1 - seg(t, 0, 0.3), seg(t, sc.dur - 0.3, sc.dur)) : 0;
      if (w > 0) { ctx.globalAlpha = w; ctx.fillStyle = SOFT; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
      svg.style.opacity = String(1 - w);
    };
    const frame = () => { const now = clock(); if (held) paint(sc.still, false); else paint((((now + off) % sc.dur) + sc.dur) % sc.dur, true); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
    draw = sc.build(svg, api, ctx);
    if (frozen) { paint(isNaN(fixed) ? sc.still : fixed, false); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => loadArt().then(() => document.querySelectorAll("figure.mg[data-scene]").forEach(mount), () => {}); // no art, no swap: the still stays
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
