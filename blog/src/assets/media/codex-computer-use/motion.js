/* Bright coded scenes for "Codex computer use". Vanilla JS, no library.
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


  const CAP = "#6B5878";
  const pill = (svg, x, y, w, label, fn) => {
    const g = el("g", {}, svg);
    el("rect", { x, y, width: w, height: 52, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("rect", { x: x - 6, y: y - 6, width: w + 12, height: 64, rx: 32, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
    txt(g, x + w / 2, y + 34, label, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
    button(g, label, fn);
    return g;
  };
  /* a plain arrow cursor, tip at 0,0 */
  const pointer = (p, s = 1.3) => {
    const g = el("g", {}, p), ring = el("circle", { cx: 0, cy: 0, r: 10, fill: "none", stroke: BLUE, "stroke-width": 3 }, g);
    const arrow = el("g", {}, g);
    el("path", { d: "M0 0 V30 L7.5 23 L13 35.5 L19.5 32.5 L14 20.5 H24.5 Z", fill: BLUE, stroke: INK, "stroke-width": 2.4, "stroke-linejoin": "round", transform: `scale(${s})` }, arrow);
    return { g, arrow, ring };
  };
  const press = (P, k) => { // k from 0 to 1 over one click
    const dn = Math.sin(cl(k) * Math.PI);
    P.arrow.setAttribute("transform", `scale(${1 - 0.1 * dn})`);
    P.ring.setAttribute("r", 8 + 22 * k); P.ring.setAttribute("opacity", k > 0 && k < 1 ? 1 - k : 0);
  };
  /* a switch: soft track, mint when on */
  const toggle = (p, x, y, w = 68, h = 36) => {
    const g = el("g", {}, p);
    el("rect", { x: x - 7, y: y - 7, width: w + 14, height: h + 14, rx: (h + 14) / 2, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 6", class: "mg-ring" }, g);
    el("rect", { x, y, width: w, height: h, rx: h / 2, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
    const on = el("rect", { x, y, width: w, height: h, rx: h / 2, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
    const r = h / 2 - 6, knob = el("circle", { cx: x + h / 2, cy: y + h / 2, r, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
    return { g, set: (v) => { on.setAttribute("opacity", cl(v)); knob.setAttribute("cx", x + h / 2 + (w - h) * cl(v)); } };
  };
  const tick = (p, cx, cy, r = 17) => {
    const g = el("g", {}, p);
    el("circle", { cx, cy, r, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g);
    el("path", { d: `M${cx - r * 0.5} ${cy} l${r * 0.35} ${r * 0.35} l${r * 0.65} ${-r * 0.7}`, stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    return g;
  };
  const windowFrame = (p, x, y, w, h, title) => {
    el("rect", { x: x + 10, y: y + 10, width: w, height: h, rx: 18, fill: SOFT }, p);
    el("rect", { x, y, width: w, height: h, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, p);
    el("path", { d: `M${x} ${y + 54} H${x + w}`, stroke: INK, "stroke-width": 3 }, p);
    [0, 1, 2].forEach((i) => el("circle", { cx: x + 28 + i * 24, cy: y + 27, r: 7, fill: [SOFT, YEL, MINT][i], stroke: INK, "stroke-width": 2.2 }, p));
    if (title) txt(p, x + w / 2, y + 35, title, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
  };
  const lerp = (a, b, k) => a + (b - a) * k;

  const SC = {};

  /* ---- 1. a pointer flips one switch in a Settings window and clicks Save ---- */
  SC.window = {
    dur: 10, still: 8.6,
    build(svg, api) {
      const root = el("g", {}, svg);
      const X = 50, Y = 110, WW = 460, WH = 390;
      windowFrame(root, X, Y, WW, WH, "Settings");
      const ROWS = [204, 274, 344], BAR = [190, 150, 210];
      const sw = ROWS.map((y, i) => {
        el("rect", { x: X + 40, y: y - 6, width: BAR[i], height: 12, rx: 6, fill: SOFT }, root);
        const s = toggle(root, X + WW - 108, y - 18);
        s.g.setAttribute("aria-pressed", "false");
        return s;
      });
      const SV = { x: X + WW - 176, y: Y + WH - 76, w: 136, h: 50 };
      const save = el("g", {}, root);
      el("rect", { x: SV.x, y: SV.y + 5, width: SV.w, height: SV.h, rx: 25, fill: INK }, save);
      const saveTop = el("g", {}, save);
      el("rect", { x: SV.x, y: SV.y, width: SV.w, height: SV.h, rx: 25, fill: YEL, stroke: INK, "stroke-width": 3 }, saveTop);
      txt(saveTop, SV.x + SV.w / 2, SV.y + 33, "Save", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const card = el("g", {}, root), CX = 548, CY = 252, CW = 232, CH = 96;
      el("rect", { x: CX + 6, y: CY + 6, width: CW, height: CH, rx: 18, fill: SOFT }, card);
      el("rect", { x: CX, y: CY, width: CW, height: CH, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      txt(card, CX + CW / 2, CY + CH / 2 + 8, "Done in the app", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      tick(card, CX + 4, CY + 4);
      const P = pointer(root);
      const T2 = [X + WW - 108 + 50, ROWS[1] + 4], SVP = [SV.x + SV.w - 30, SV.y + SV.h / 2 + 4], START = [760, 590];
      const user = [null, null, null], last = [0, 0, 0];
      let prevT = 0;
      sw.forEach((s, i) => button(s.g, `Switch ${i + 1}. Flip it`, () => { user[i] = { from: last[i], to: last[i] > 0.5 ? 0 : 1, at: api.now() }; api.poke(); }));
      return (t, now) => {
        if (t < prevT - 1) user.fill(null); prevT = t;
        root.setAttribute("opacity", seg(t, 0, 0.4) * (1 - seg(t, 9.4, 10)));
        sw.forEach((s, i) => {
          const u = user[i], auto = i === 1 ? io(seg(t, 3.0, 3.3)) : 0;
          const v = u ? lerp(u.from, u.to, oc(seg(now - u.at, 0, 0.25))) : auto;
          last[i] = v; s.set(v); s.g.setAttribute("aria-pressed", v > 0.5);
        });
        const a = io(seg(t, 1.0, 2.6)), b = io(seg(t, 3.7, 4.9));
        let x = lerp(START[0], T2[0], a) + Math.sin(a * Math.PI) * 30, y = lerp(START[1], T2[1], a);
        x = lerp(x, SVP[0], b); y = lerp(y, SVP[1], b) - Math.sin(b * Math.PI) * 30;
        P.g.setAttribute("transform", `translate(${x} ${y})`);
        P.g.setAttribute("opacity", seg(t, 0.9, 1.2));
        press(P, t < 3.5 ? seg(t, 2.75, 3.3) : seg(t, 5.0, 5.55));
        saveTop.setAttribute("transform", `translate(0 ${4 * Math.sin(seg(t, 5.0, 5.3) * Math.PI)})`);
        const c = ob(seg(t, 5.5, 6.1));
        card.setAttribute("opacity", seg(t, 5.5, 5.65)); card.setAttribute("transform", `translate(${24 * (1 - c)} 0)`);
      };
    },
  };

  /* ---- 2. an approval card; Always allow sends the app tile to a shelf ---- */
  SC.approval = {
    dur: 10, still: 8.6,
    build(svg, api) {
      const root = el("g", {}, svg);
      const C = { x: 160, y: 56, w: 480, h: 262 };
      el("rect", { x: C.x + 10, y: C.y + 10, width: C.w, height: C.h, rx: 22, fill: SOFT }, root);
      el("rect", { x: C.x, y: C.y, width: C.w, height: C.h, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, root);
      el("rect", { x: 196, y: 92, width: 90, height: 90, rx: 18, fill: "none", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "5 7" }, root);
      txt(root, 312, 150, "Use Calculator?", { "font-size": 30, "font-weight": 700 });
      const B = [["Allow once", 196], ["Always allow", 420]].map(([label, x]) => {
        const g = el("g", {}, root), y = 230, w = 204, h = 54;
        el("rect", { x: x - 7, y: y - 7, width: w + 14, height: h + 14, rx: 34, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 6", class: "mg-ring" }, g);
        el("rect", { x, y, width: w, height: h, rx: 27, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const lit = el("rect", { x, y, width: w, height: h, rx: 27, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
        txt(g, x + w / 2, y + 35, label, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        g.setAttribute("aria-pressed", "false");
        return { g, lit, label };
      });
      const S = { x: 130, y: 400, w: 540, h: 172 };
      el("rect", { x: S.x + 8, y: S.y + 8, width: S.w, height: S.h, rx: 22, fill: SOFT }, root);
      el("rect", { x: S.x, y: S.y, width: S.w, height: S.h, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, root);
      txt(root, S.x + 32, S.y + 146, "Always allowed apps", { "font-size": 22, "font-weight": 700 });
      [0, 1, 2, 3].forEach((i) => el("rect", { x: S.x + 32 + i * 96, y: S.y + 24, width: 76, height: 76, rx: 16, fill: "none", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "5 7" }, root));
      const tile = el("g", {}, root);
      el("rect", { x: 0, y: 0, width: 90, height: 90, rx: 18, fill: SKY, stroke: INK, "stroke-width": 3 }, tile);
      el("rect", { x: 14, y: 13, width: 62, height: 20, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.2 }, tile);
      [0, 1].forEach((r) => [0, 1, 2].forEach((c) => el("rect", { x: 14 + c * 23, y: 42 + r * 21, width: 16, height: 15, rx: 4, fill: r === 1 && c === 2 ? YEL : "#fff", stroke: INK, "stroke-width": 2 }, tile)));
      const FROM = [196, 92, 1], TO = [S.x + 32 + 1.5, S.y + 24 + 1.5, 73 / 90];
      let user = null, prevT = 0, lA = 0, lO = 0, lT = 0;
      const pick = (which) => { user = { which, at: api.now(), A: lA, O: lO, T: lT }; api.poke(); };
      button(B[0].g, "Allow once", () => pick(0)); button(B[1].g, "Always allow", () => pick(1));
      return (t, now) => {
        if (t < prevT - 1) user = null; prevT = t;
        root.setAttribute("opacity", seg(t, 0, 0.4) * (1 - seg(t, 9.4, 10)));
        let A, O, T;
        if (user) {
          const u = now - user.at, k = oc(seg(u, 0, 0.3)), m = io(seg(u, 0.4, 1.6)), al = user.which === 1;
          A = lerp(user.A, al ? 1 : 0, k); O = lerp(user.O, al ? 0 : 1, k); T = lerp(user.T, al ? 1 : 0, m);
        } else { A = oc(seg(t, 3.0, 3.3)); O = 0; T = io(seg(t, 4.0, 5.4)); }
        lA = A; lO = O; lT = T;
        B[0].lit.setAttribute("opacity", O); B[1].lit.setAttribute("opacity", A);
        B[0].g.setAttribute("aria-pressed", O > 0.5); B[1].g.setAttribute("aria-pressed", A > 0.5);
        const x = lerp(FROM[0], TO[0], T), y = lerp(FROM[1], TO[1], T) - Math.sin(T * Math.PI) * 50, s = lerp(FROM[2], TO[2], T);
        tile.setAttribute("transform", `translate(${x} ${y}) rotate(${Math.sin(T * Math.PI) * -6} 45 45) scale(${s})`);
      };
    },
  };

  /* ---- 3. a padlock opens under a lilac cover for an active task, then relocks on a key press ---- */
  SC.padlock = {
    dur: 10, still: 9,
    build(svg, api) {
      const root = el("g", {}, svg);
      el("rect", { x: 128, y: 48, width: 480, height: 350, rx: 20, fill: SOFT }, root);
      el("rect", { x: 120, y: 40, width: 480, height: 350, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 4 }, root);
      el("rect", { x: 140, y: 60, width: 440, height: 312, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2 }, root);
      el("path", { d: "M70 390 H650 L624 428 H96 Z", fill: "#fff", stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round" }, root);
      el("path", { d: "M318 390 Q318 402 330 402 H390 Q402 402 402 390", fill: SOFT, stroke: INK, "stroke-width": 2.5 }, root);
      const clip = el("clipPath", { id: "mg-pl-clip" }, svg);
      el("rect", { x: 141, y: 61, width: 438, height: 310, rx: 9 }, clip);
      const cover = el("circle", { cx: 360, cy: 294, r: 0, fill: LIL, "clip-path": "url(#mg-pl-clip)" }, root);
      const tag = el("g", {}, root);
      el("rect", { x: 412, y: 82, width: 148, height: 40, rx: 20, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 486, 109, "Active task", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const lock = el("g", {}, root), shackle = el("g", {}, lock), body = el("g", {}, lock);
      const SH = "M318 244 V200 A42 42 0 0 1 402 200 V244";
      el("path", { d: SH, stroke: INK, "stroke-width": 26, fill: "none", "stroke-linecap": "round" }, shackle);
      el("path", { d: SH, stroke: YEL, "stroke-width": 14, fill: "none", "stroke-linecap": "round" }, shackle);
      el("rect", { x: 288, y: 236, width: 144, height: 118, rx: 22, fill: YEL, stroke: INK, "stroke-width": 4 }, body);
      el("circle", { cx: 360, cy: 284, r: 12, fill: INK }, body);
      el("rect", { x: 354, y: 284, width: 12, height: 36, rx: 5, fill: INK }, body);
      const key = el("g", {}, root), K = { x: 662, y: 300, s: 80 };
      el("rect", { x: K.x, y: K.y + 8, width: K.s, height: K.s - 6, rx: 16, fill: INK }, key);
      const cap = el("g", {}, key);
      el("rect", { x: K.x, y: K.y, width: K.s, height: K.s - 6, rx: 16, fill: SKY, stroke: INK, "stroke-width": 3 }, cap);
      el("path", { d: `M${K.x + 40} ${K.y + 18} V${K.y + 52} M${K.x + 28} ${K.y + 40} L${K.x + 40} ${K.y + 52} L${K.x + 52} ${K.y + 40}`, stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, cap);
      const burst = el("path", { d: `M${K.x + 40} ${K.y - 14} V${K.y - 30} M${K.x + 8} ${K.y - 8} L${K.x - 4} ${K.y - 20} M${K.x + 72} ${K.y - 8} L${K.x + 84} ${K.y - 20}`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, key);
      pill(svg, 620, 512, 140, "Lock", () => api.seek(0));
      return (t) => {
        root.setAttribute("opacity", seg(t, 0, 0.4) * (1 - seg(t, 9.4, 10)));
        const pop = ob(seg(t, 0.4, 1.0));
        lock.setAttribute("opacity", seg(t, 0.4, 0.55));
        const shut = ob(seg(t, 6.05, 6.3)), open = io(seg(t, 2.3, 2.75)) * (1 - shut);
        const jolt = Math.sin(seg(t, 6.2, 6.5) * Math.PI) * 5;
        lock.setAttribute("transform", `translate(360 ${295 + jolt}) scale(${0.6 + 0.4 * pop}) translate(-360 -295)`);
        shackle.setAttribute("transform", `translate(0 ${-26 * open}) rotate(${-28 * open} 318 244)`);
        const tg = oc(seg(t, 1.4, 1.9));
        tag.setAttribute("opacity", seg(t, 1.4, 1.6)); tag.setAttribute("transform", `translate(0 ${-14 * (1 - tg)})`);
        cover.setAttribute("r", 470 * io(seg(t, 2.6, 4.0)) * (1 - io(seg(t, 6.5, 7.5))));
        const kp = ob(seg(t, 5.3, 5.7)), down = Math.sin(seg(t, 5.85, 6.15) * Math.PI);
        key.setAttribute("opacity", seg(t, 5.3, 5.45));
        key.setAttribute("transform", `translate(${K.x + 40} ${K.y + 37}) scale(${0.6 + 0.4 * kp}) translate(${-K.x - 40} ${-K.y - 37})`);
        cap.setAttribute("transform", `translate(0 ${7 * down})`);
        burst.setAttribute("opacity", seg(t, 5.9, 6.05));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 8, still: 8,
    build(svg) {
      el("rect", { x: 64, y: 88, width: 110, height: 42, rx: 21, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 119, 116, "Guide", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 60, 230, "Codex", { "font-family": MONO, "font-size": 76, "font-weight": 700 });
      txt(svg, 60, 310, "computer use", { "font-size": 70, "font-weight": 700 });
      txt(svg, 64, 370, "Setup, plans and limits", { "font-size": 27, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 412, "Checked 26 Oct 2026", { "font-size": 18, "font-weight": 500, fill: CAP });
      const win = el("g", {}, svg), X = 600, Y = 130, WW = 300, WH = 270;
      windowFrame(win, X, Y, WW, WH);
      [[X + 34, Y + 92, 170], [X + 34, Y + 122, 120]].forEach(([x, y, w]) => el("rect", { x, y: y - 6, width: w, height: 12, rx: 6, fill: SOFT }, win));
      const sw = toggle(win, X + 80, Y + 170, 140, 66);
      const P = pointer(svg, 1.5);
      return (t) => {
        const k = ob(seg(t, 0.2, 0.9));
        win.setAttribute("opacity", seg(t, 0.2, 0.35)); win.setAttribute("transform", `translate(0 ${-30 * (1 - k)})`);
        const a = io(seg(t, 1.0, 2.0));
        P.g.setAttribute("transform", `translate(${lerp(940, X + 200, a)} ${lerp(530, Y + 212, a) - Math.sin(a * Math.PI) * 20})`);
        P.g.setAttribute("opacity", seg(t, 1.0, 1.2));
        press(P, seg(t, 2.1, 2.6));
        sw.set(io(seg(t, 2.25, 2.55)));
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
