/* Bright coded scenes for "What Is Roo Code?". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const strip = (svg, y, w = 680) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    return txt(svg, 400, y + 31, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  /* a polyline drawn up to fraction k of its length */
  const part = (pts, k) => {
    let L = 0; const ls = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); ls.push(l); L += l; }
    let left = L * k, d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length && left > 0; i++) {
      const f = Math.min(1, left / ls[i - 1]);
      d += ` L${lerp(pts[i - 1][0], pts[i][0], f).toFixed(1)} ${lerp(pts[i - 1][1], pts[i][1], f).toFixed(1)}`;
      left -= ls[i - 1];
    }
    return d;
  };
  /* a little 4 point sparkle */
  const spark = (svg, x, y, r, col) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill: col, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, svg);

  const SC = {};

  /* ---- 1. a glass shop door: the hanging card swings over from Roo Code to Archived ---- */
  SC.closed = {
    dur: 12, still: 9,
    build(svg, api) {
      txt(svg, 44, 60, "Is Roo Code dead?", { "font-size": 32, "font-weight": 700 });
      const G = 556, TOP = 92;
      /* shop front and its striped awning */
      el("rect", { x: 40, y: TOP, width: 720, height: G - TOP, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const N = 9, AW = 720 / N;
      for (let i = 0; i < N; i++) {
        const x = 40 + i * AW;
        el("path", { d: `M${x} ${TOP} H${x + AW} V128 A${AW / 2} 16 0 0 1 ${x} 128 Z`, fill: i % 2 ? "#fff" : SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      }
      /* two windows */
      const glare = (x, y, h) => el("path", { d: `M${x} ${y + h} L${x + h * 0.5} ${y}`, stroke: "#fff", "stroke-width": 9, "stroke-linecap": "round" }, svg);
      [64, 544].forEach((x) => {
        el("rect", { x, y: 180, width: 192, height: 290, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        el("rect", { x: x + 12, y: 192, width: 168, height: 266, rx: 3, fill: SKY, "fill-opacity": 0.35, stroke: INK, "stroke-width": 2.5 }, svg);
        glare(x + 30, 206, 60); glare(x + 60, 206, 34);
        el("rect", { x: x - 10, y: 470, width: 212, height: 14, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      });
      /* the door: frame, glass, handle */
      el("rect", { x: 280, y: 166, width: 240, height: G - 166, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 302, y: 188, width: 196, height: 340, rx: 3, fill: "#fff" }, svg);
      el("rect", { x: 302, y: 188, width: 196, height: 340, rx: 3, fill: SKY, "fill-opacity": 0.35, stroke: INK, "stroke-width": 2.5 }, svg);
      glare(318, 430, 74); glare(346, 450, 50);
      el("path", { d: "M466 392 H480 M466 468 H480", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      el("rect", { x: 474, y: 380, width: 14, height: 100, rx: 7, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M30 ${G} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      /* notes taped inside the windows */
      const note = (x, y, r, lines) => {
        const g = el("g", {}, svg), body = el("rect", { rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const ts = lines.map(([s, sz, f], i) => txt(g, 0, (i - (lines.length - 1) / 2) * 36 + sz * 0.36, s, { "text-anchor": "middle", "font-size": sz, "font-weight": 700, "font-family": f || SANS }));
        const w = Math.max(...ts.map((n) => n.getComputedTextLength())) + 26, h = lines.length * 36 + 24;
        Object.entries({ x: -w / 2, y: -h / 2, width: w, height: h }).forEach(([k, v]) => body.setAttribute(k, v));
        [-1, 1].forEach((d) => el("rect", { x: d * (w / 2 - 6) - 17, y: -h / 2 - 9, width: 34, height: 16, rx: 3, fill: LIL, stroke: INK, "stroke-width": 2, transform: `rotate(${d * 28} ${d * (w / 2 - 6)} ${-h / 2})` }, g));
        return { g, x, y, r };
      };
      const notes = [note(160, 318, -4, [["read only", 24]]), note(640, 326, 3, [["final release", 21], ["v3.54.0", 22, MONO]])];
      /* the hanging card */
      const card = el("g", {}, svg);
      const face = el("g", {}, card);
      el("path", { d: "M0 0 L-64 46 M0 0 L64 46", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, face);
      el("rect", { x: -100, y: 30, width: 200, height: 130, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, face);
      const front = el("g", {}, face), back = el("g", {}, face);
      el("rect", { x: -92, y: 42, width: 184, height: 106, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, front);
      txt(front, 0, 106, "Roo Code", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
      el("rect", { x: -92, y: 42, width: 184, height: 106, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, back);
      txt(back, 0, 90, "Archived", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      txt(back, 0, 128, "15 May 2026", { "text-anchor": "middle", "font-size": 22, "font-weight": 700, "font-family": MONO });
      [-64, 64].forEach((x) => el("circle", { cx: x, cy: 50, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, face));
      el("circle", { cx: 400, cy: 206, r: 7, fill: INK }, svg);
      let taps = 0, last = -99;
      button(card, "Turn the card over: archived on GitHub, last push 15 May 2026", () => { taps++; last = api.now(); api.poke(); });
      return (t, now) => {
        const out = seg(t, 11.3, 11.85), kd = seg(t, 0.4, 1.1);
        const fl = 180 * io(seg(t, 3, 3.9)) + (taps ? 180 * (taps - 1) + 180 * io(cl((now - last) / 0.8)) : 0);
        let sw = 1.6 * Math.sin(t * 1.7);
        const ts = t - 3; if (ts > 0) sw += 16 * Math.exp(-1.3 * ts) * Math.sin(5.2 * ts);
        const tu = now - last; if (taps && tu >= 0) sw += 12 * Math.exp(-1.6 * tu) * Math.sin(6 * tu);
        card.setAttribute("transform", `translate(400 ${206 - 260 * (1 - ob(kd))}) rotate(${sw})`);
        card.setAttribute("opacity", (kd > 0 ? 1 : 0) * (1 - out));
        const c = Math.cos((fl * Math.PI) / 180);
        face.setAttribute("transform", `translate(0 95) scale(${Math.max(Math.abs(c), 0.02)} 1) translate(0 -95)`);
        front.setAttribute("opacity", c >= 0 ? 1 : 0); back.setAttribute("opacity", c < 0 ? 1 : 0);
        notes.forEach((n, i) => { const k = seg(t, 4.6 + i * 0.8, 5.05 + i * 0.8); tf(n.g, n.x, n.y, 0.5 + 0.5 * ob(k), n.r); n.g.setAttribute("opacity", (k > 0 ? 1 : 0) * (1 - out)); });
      };
    },
  };

  /* ---- 2. a family tree of cards draws itself: Cline, then Roo Code, then its forks ---- */
  SC.tree = {
    dur: 12, still: 9.6,
    build(svg, api) {
      txt(svg, 44, 60, "Where did Roo Code come from?", { "font-size": 32, "font-weight": 700 });
      const CW = 280, CH = 84;
      /* a soft tree behind the cards */
      const crown = el("g", {}, svg);
      el("path", { d: "M378 330 C380 400 372 452 340 492 H460 C428 452 420 400 422 330 Z", fill: SOFT }, crown);
      [[400, 198, 104], [236, 248, 104], [564, 248, 104], [300, 318, 100], [500, 318, 100], [128, 302, 58], [672, 302, 58]].forEach(([cx, cy, r]) => el("circle", { cx, cy, r, fill: SOFT }, crown));
      const C = [
        { name: "Cline", x: 400, y: 142, r: -2, fill: LIL, t: 0.5, say: "Roo Code's README: Cline, “from where Roo Code originated”" },
        { name: "Roo Code", x: 400, y: 282, r: 1.5, fill: YEL, t: 1.9, say: "Roo Code: archived, last push 15 May 2026" },
        { name: "ZooCode", x: 214, y: 424, r: -2.5, fill: MINT, t: 3.4, say: "Roo's README on ZooCode: “a fork started by the Roo Code community”" },
        { name: "Kilo Code", x: 586, y: 424, r: 2, fill: SKY, t: 4.9, dash: 1, say: "Kilo: “We started Kilo as a Roo fork in 2025.”" },
      ];
      const L = [
        { pts: [[400, 184], [400, 240]], a: 1.2, b: 1.9 },
        { pts: [[400, 324], [400, 354], [214, 354], [214, 382]], a: 2.6, b: 3.4 },
        { pts: [[400, 324], [400, 354], [586, 354], [586, 382]], a: 4.1, b: 4.9, dash: 1 },
      ].map((l) => Object.assign(l, { n: el("path", { fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": l.dash ? "2 10" : "none" }, svg) }));
      let pick = -1, at = -99;
      const cards = C.map((c, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -CW / 2 - 9, y: -CH / 2 - 9, width: CW + 18, height: CH + 18, rx: 22, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("rect", { x: -CW / 2, y: -CH / 2, width: CW, height: CH, rx: 16, fill: c.fill, stroke: INK, "stroke-width": 3, "stroke-dasharray": c.dash ? "10 7" : "none" }, g);
        txt(g, 0, 12, c.name, { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
        el("circle", { cy: -CH / 2, r: 7, fill: i ? INK : "#fff", stroke: INK, "stroke-width": 3 }, g);
        button(g, c.say, () => { pick = i; at = api.now(); api.poke(); });
        return g;
      });
      const cap = strip(svg, 500, 732);
      return (t, now) => {
        const out = seg(t, 11.3, 11.85), kc = oc(seg(t, 0, 0.8));
        crown.setAttribute("transform", `translate(400 300) scale(${0.85 + 0.15 * kc}) translate(-400 -300)`);
        crown.setAttribute("opacity", kc * (1 - out));
        L.forEach((l) => { const k = io(seg(t, l.a, l.b)); l.n.setAttribute("d", part(l.pts, Math.max(k, 0.001))); l.n.setAttribute("opacity", (k > 0 ? 1 : 0) * (1 - out)); });
        let cur = 0;
        cards.forEach((g, i) => {
          const c = C[i], k = seg(t, c.t, c.t + 0.5), d = now - at, hop = pick === i && d >= 0 && d < 0.6 ? -14 * Math.sin((Math.PI * d) / 0.6) : 0;
          tf(g, c.x, c.y + hop, 0.6 + 0.4 * ob(k), c.r); g.setAttribute("opacity", (k > 0 ? 1 : 0) * (1 - out));
          if (t >= c.t) cur = i;
        });
        const user = pick >= 0 && now - at < 4;
        cap.textContent = user ? C[pick].say : t >= 6.6 && t < 11.3 ? "Roo Code came from Cline; two of its forks are ZooCode and Kilo." : C[cur].say;
        cap.setAttribute("font-size", cap.textContent.length > 60 ? 18 : 20);
      };
    },
  };

  /* ---- 3. a removal box fills with settings cards, shuts, and slides to a new shelf; API keys stay behind ---- */
  SC.boxes = {
    dur: 12, still: 9.6,
    build(svg, api) {
      txt(svg, 44, 60, "How do you move off Roo Code?", { "font-size": 32, "font-weight": 700 });
      const cap = strip(svg, 82, 732);
      const P = 470, BW = 260, BH = 200, BT = P - BH, X0 = 210, X1 = 590;
      /* two shelves and their brackets */
      [[40, 340, "Roo Code"], [420, 340, "Kilo Code"]].forEach(([x, w, s]) => {
        [[x + 40, 1], [x + w - 40, -1]].forEach(([bx, d]) => el("path", { d: `M${bx} ${P + 34} V${P + 72} L${bx + d * 34} ${P + 34} Z`, stroke: INK, "stroke-width": 3, fill: YEL, "stroke-linejoin": "round" }, svg));
        el("rect", { x, y: P, width: w, height: 34, rx: 6, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, x + w / 2, P + 25, s, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      });
      /* the outline left where the box stood */
      const ghost = el("rect", { x: X0 - BW / 2, y: BT, width: BW, height: BH, rx: 8, fill: "none", stroke: LIL, "stroke-width": 3, "stroke-dasharray": "3 9", "stroke-linecap": "round" }, svg);
      /* the cards that go in */
      const mk = (s, fill, mono) => {
        const g = el("g", {}, svg), r = el("rect", { y: -22, height: 44, rx: 10, fill, stroke: INK, "stroke-width": 3 }, g);
        const n = txt(g, 0, 7, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700, "font-family": mono ? MONO : SANS });
        const w = n.getComputedTextLength() + 34; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
        return g;
      };
      const IN = [["Architect mode", LIL], ["custom modes", MINT], ["keybindings.json", "#fff", 1]].map(([s, f, m], i) => ({ g: mk(s, f, m), y: 214 + i * 62, a: 1.4 + i * 0.95 }));
      /* the card that stays: it slips down behind the box and is left on the old shelf */
      const key = mk("API keys", BLUE);
      let kt = -99;
      const keyHit = el("rect", { x: -78, y: -32, width: 156, height: 64, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, key);
      key.insertBefore(keyHit, key.firstChild);
      button(key, "API keys: Re-authenticate manually. Keys don't port.", () => { kt = api.now(); api.poke(); });
      /* the box */
      const box = el("g", {}, svg);
      el("rect", { x: -BW / 2, y: 0, width: BW, height: BH, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, box);
      el("rect", { x: -96, y: 52, width: 192, height: 98, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, box);
      txt(box, 0, 94, "Roo Code", { "text-anchor": "middle", "font-size": 29, "font-weight": 700 });
      txt(box, 0, 130, "settings", { "text-anchor": "middle", "font-size": 29, "font-weight": 700 });
      const flaps = [-1, 1].map((d) => { const g = el("g", {}, box); el("rect", { x: d < 0 ? 0 : -BW / 2, y: -12, width: BW / 2, height: 12, rx: 4, fill: YEL, stroke: INK, "stroke-width": 3 }, g); return { g, d }; });
      const tape = el("rect", { x: -16, y: -14, width: 32, height: 40, rx: 3, fill: LIL, stroke: INK, "stroke-width": 2.5 }, box);
      const KX = 590, KY = 400, FX = X0 + 8, FY = P - 24;
      return (t, now) => {
        const out = seg(t, 11.3, 11.85);
        const shut = io(seg(t, 4.9, 5.4)), open = io(seg(t, 0.2, 0.9)) * (1 - shut);
        const sl = io(seg(t, 6.6, 8)), bx = lerp(X0, X1, sl), tilt = 2.5 * Math.sin(Math.PI * sl);
        box.setAttribute("transform", `translate(${bx} ${BT}) rotate(${tilt} 0 ${BH})`);
        box.setAttribute("opacity", 1 - out);
        flaps.forEach((f) => f.g.setAttribute("transform", `translate(${f.d * BW / 2} 0) rotate(${f.d * 100 * open})`));
        tape.setAttribute("opacity", seg(t, 5.5, 5.7));
        ghost.setAttribute("opacity", seg(t, 7.2, 7.9) * (1 - out));
        IN.forEach((c) => {
          const k = io(seg(t, c.a, c.a + 0.8));
          tf(c.g, lerp(KX, X0, k), lerp(c.y, BT + 70, k) - 70 * Math.sin(Math.PI * k), 1 - 0.25 * k, -8 * Math.sin(Math.PI * k));
          c.g.setAttribute("opacity", k >= 1 ? 0 : seg(t, 0.3, 0.7) * (1 - out));
        });
        /* API keys: flies at the box, bounces on the shut flaps, slips down behind it */
        const k1 = io(seg(t, 4.5, 5.3)), kb = seg(t, 5.3, 5.75), k2 = seg(t, 5.75, 6.35), d = now - kt, hop = d >= 0 && d < 0.7 ? Math.sin((Math.PI * d) / 0.7) : 0;
        let x = lerp(KX, X0, k1), y = lerp(KY, BT - 34, k1) - 110 * Math.sin(Math.PI * k1) - 26 * Math.sin(Math.PI * kb), r = 9 * Math.sin(Math.PI * kb);
        if (k2 > 0) { x = lerp(X0, FX, k2); y = lerp(BT - 34, FY, k2 * k2); r = -3 * k2; }
        tf(key, x, y - 60 * hop, 1, r + 10 * hop);
        key.setAttribute("opacity", seg(t, 0.3, 0.7) * (1 - out));
        cap.textContent = d >= 0 && d < 4 ? "Re-authenticate manually. Keys don't port." : t < 1.4 || t >= 11.3 ? "Pick a successor, then carry your settings across by hand" : t < 2.35 ? "Architect mode to Kilo's plan agent" : t < 3.3 ? "custom modes in YAML to custom agents in Markdown" : t < 4.5 ? "roo-cline.* to kilo-code.* in keybindings.json" : "Re-authenticate manually. Keys don't port.";
      };
    },
  };

  /* ---- title card, 16 by 9: a museum display case ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 112, "The archived VS Code agent, explained", { "font-size": 25, "font-weight": 500, fill: MUTE });
      txt(svg, 62, 210, "What Is", { "font-size": 84, "font-weight": 700 });
      txt(svg, 62, 300, "Roo Code?", { "font-size": 84, "font-weight": 700 });
      el("path", { d: "M68 330 H470", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 374, width: 312, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 218, 411, "Checked 17 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      const c = el("g", { transform: "translate(724 0)" }, svg);
      /* rope barrier */
      [-178, 178].forEach((x) => {
        el("rect", { x: x - 7, y: 400, width: 14, height: 84, rx: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, c);
        el("rect", { x: x - 24, y: 478, width: 48, height: 12, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, c);
      });
      [-1, 1].forEach((d) => {
        const p = `M${d * 178} 400 Q${d * 150} 452 ${d * 120} 424`;
        el("path", { d: p, stroke: INK, "stroke-width": 13, fill: "none", "stroke-linecap": "round" }, c);
        el("path", { d: p, stroke: LIL, "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, c);
        el("circle", { cx: d * 178, cy: 398, r: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, c);
      });
      /* plinth */
      el("rect", { x: -120, y: 330, width: 240, height: 160, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, c);
      el("rect", { x: -134, y: 316, width: 268, height: 22, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, c);
      el("rect", { x: -88, y: 376, width: 176, height: 52, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, c);
      txt(c, 0, 411, "v3.54.0", { "text-anchor": "middle", "font-size": 24, "font-weight": 700, "font-family": MONO });
      /* the exhibit: a code tile on a little stand */
      el("path", { d: "M-34 316 L-22 270 H22 L34 316 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, c);
      const tile = el("g", { transform: "translate(0 206) rotate(-6)" }, c);
      el("rect", { x: -62, y: -62, width: 124, height: 124, rx: 26, fill: BLUE, stroke: INK, "stroke-width": 3 }, tile);
      el("path", { d: "M-20 -24 L-42 0 L-20 24 M20 -24 L42 0 L20 24 M10 -32 L-10 32", stroke: "#fff", "stroke-width": 9, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tile);
      /* glass case */
      el("rect", { x: -112, y: 92, width: 224, height: 224, rx: 4, fill: SKY, "fill-opacity": 0.22, stroke: INK, "stroke-width": 3 }, c);
      el("rect", { x: -124, y: 76, width: 248, height: 20, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, c);
      [[-90, 290, 70], [-62, 290, 38]].forEach(([x, y, h]) => el("path", { d: `M${x} ${y} L${x + h * 0.5} ${y - h}`, stroke: "#fff", "stroke-width": 9, "stroke-linecap": "round" }, c));
      el("path", { d: "M78 116 V176", stroke: "#fff", "stroke-width": 9, "stroke-linecap": "round" }, c);
      spark(svg, 590, 118, 15, SKY); spark(svg, 892, 166, 18, MINT); spark(svg, 566, 300, 12, YEL); spark(svg, 902, 60, 11, LIL);
      return () => {};
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
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
