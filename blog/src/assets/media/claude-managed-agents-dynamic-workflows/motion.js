/* Bright coded scenes for "Claude Managed Agents dynamic workflows". Vanilla JS, no library.
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

  const pill = (p, s, fill, a = {}) => {
    const g = el("g", {}, p), r = el("rect", { y: -22, height: 44, rx: 22, fill, stroke: INK, "stroke-width": 3 }, g), t = txt(g, 0, 7, s, Object.assign({ "text-anchor": "middle", "font-size": 20, "font-weight": 700 }, a));
    const w = t.getComputedTextLength() + 36; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    return g;
  };

  const SC = {};

  /* ---- 1. three rail tracks merge at a junction: three wagons in the first phase, one in the second ---- */
  SC.tracks = {
    dur: 11, still: 9,
    build(svg) {
      txt(svg, 44, 62, "Anthropic's example", { "font-size": 32, "font-weight": 700 });
      const Y = [230, 320, 410], COL = [YEL, LIL, SKY];
      const d = (y) => `M30 ${y} H300 C400 ${y} 400 320 500 320 H770`;
      Y.forEach((y) => el("path", { d: d(y), stroke: INK, "stroke-width": 14, fill: "none", "stroke-linecap": "round" }, svg));
      const paths = Y.map((y) => el("path", { d: d(y), stroke: SOFT, "stroke-width": 8, fill: "none", "stroke-linecap": "round" }, svg));
      el("path", { d: "M430 128 V476", stroke: LIL, "stroke-width": 2, "stroke-dasharray": "6 8", fill: "none" }, svg);
      txt(svg, 215, 150, "first phase", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      txt(svg, 615, 150, "second phase", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const wagon = (w, h, label, col) => {
        const g = el("g", {}, svg);
        el("rect", { x: -w / 2, y: -h - 14, width: w, height: h, rx: 12, fill: col, stroke: INK, "stroke-width": 3 }, g);
        [-w / 4, w / 4].forEach((x) => el("circle", { cx: x, cy: -14, r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, g));
        txt(g, 0, -h / 2 - 9, label, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        return g;
      };
      const slips = paths.map((p) => {
        const g = el("g", {}, svg);
        el("rect", { x: -14, y: -18, width: 28, height: 36, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-7 -7 H7 M-7 1 H7 M-7 9 H3", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        return { g, p, L: p.getTotalLength() };
      });
      const wag = Y.map((y, i) => wagon(124, 44, "contract", COL[i]));
      const eng = wagon(150, 54, "one agent", MINT);
      const cap = strip(svg, 506, 700);
      return (t) => {
        const out = 1 - seg(t, 10.3, 10.8);
        const go = io(seg(t, 6.2, 7.6));
        wag.forEach((g, i) => { tf(g, -90 + 290 * oc(seg(t, 0.3 + i * 0.35, 1.7 + i * 0.35)), Y[i]); g.setAttribute("opacity", out); });
        slips.forEach((s, i) => {
          const a = 2.7 + i * 0.55, k = seg(t, a, a + 1.5), pt = s.p.getPointAtLength(170 + (s.L - 230 - 170) * io(k));
          if (k < 1) tf(s.g, pt.x, pt.y - 34 - 26 * Math.sin(k * Math.PI), 1, Math.sin(k * Math.PI * 2) * 8);
          else tf(s.g, 585 + 85 * go + (i - 1) * 38, 244, 1, (i - 1) * 7);
          s.g.setAttribute("opacity", k <= 0 ? 0 : out);
        });
        let bump = 0; [0, 1, 2].forEach((i) => { const a = 4.2 + i * 0.55; bump += Math.sin(seg(t, a, a + 0.3) * Math.PI) * 0.06; });
        eng.setAttribute("transform", `translate(${585 + 85 * go} 320) scale(${1 + bump} ${1 - bump})`);
        eng.setAttribute("opacity", out);
        cap.textContent = t < 5.9 ? "three agents read contracts in the first phase" : "one agent in the second phase works with what they returned";
      };
    },
  };

  /* ---- 2. a wall plate with two switches, both on by default ---- */
  SC.switches = {
    dur: 10, still: 7.2,
    build(svg, api) {
      txt(svg, 44, 62, "On by default", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap a switch", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const X = [280, 520], NAMES = ["subagents", "workflows"];
      const bulbs = X.map((x) => {
        el("path", { d: `M${x} 166 V200`, stroke: INK, "stroke-width": 3 }, svg);
        const rays = el("path", { d: [0, 1, 2, 3, 4].map((i) => { const a = Math.PI * (1 + (i + 0.5) / 5 * 1 ) ; const c = Math.cos(a), s = Math.sin(a); return `M${x + c * 36} ${128 + s * 36} L${x + c * 50} ${128 + s * 50}`; }).join(" "), stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
        el("rect", { x: x - 11, y: 148, width: 22, height: 18, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
        const b = el("circle", { cx: x, cy: 128, r: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        return { b, rays };
      });
      el("rect", { x: 160, y: 200, width: 480, height: 278, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 246, "multiagent_20261001", { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
      let user = null; const v = [0, 0];
      const rock = X.map((x, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: x - 54, y: 262, width: 108, height: 152, rx: 24, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("rect", { x: x - 44, y: 272, width: 88, height: 132, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const r = el("rect", { x: x - 32, width: 64, height: 58, rx: 12, stroke: INK, "stroke-width": 3 }, g);
        txt(svg, x, 448, NAMES[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        button(g, `Switch ${NAMES[i]} on or off`, () => { if (!user) user = v.map((k) => k > 0.5); user[i] = !user[i]; g.setAttribute("aria-pressed", user[i]); api.poke(); });
        return r;
      });
      el("rect", { x: 60, y: 506, width: 680, height: 48, rx: 24, fill: SOFT }, svg);
      const cap = txt(svg, 400, 537, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      return (t) => {
        const tg = user ? user.map(Number) : [seg(t, 0.6, 0.9) * (1 - seg(t, 4.6, 4.9)), seg(t, 1.2, 1.5)];
        tg.forEach((k, i) => {
          v[i] = user ? v[i] + (k - v[i]) * 0.3 : k;
          const on = v[i] > 0.5;
          rock[i].setAttribute("y", 336 - 54 * v[i]); rock[i].setAttribute("fill", on ? MINT : SOFT);
          bulbs[i].b.setAttribute("fill", on ? YEL : "#fff"); bulbs[i].rays.setAttribute("opacity", on ? 1 : 0);
        });
        const a = v[0] > 0.5, b = v[1] > 0.5;
        const s = a && b ? "subagents and workflows are both on by default" : !a && b ? '"subagents": {"type": "disabled"}' : a && !b ? '"workflows": {"type": "disabled"}' : user ? '{"type": "disabled"}' : "";
        cap.textContent = s; cap.setAttribute("font-family", a && b ? SANS : MONO);
      };
    },
  };

  /* ---- 3. a car park with 64 bays, a counter towards 1,000 and a 24 hour clock ---- */
  SC.carpark = {
    dur: 11, still: 8.6,
    build(svg) {
      txt(svg, 44, 62, "The limits in beta", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "on 11 Oct 2026", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const X0 = 44, Y0 = 134, BW = 42, BH = 38, COL = [YEL, BLUE, LIL, SKY, MINT];
      el("rect", { x: X0 - 6, y: Y0 - 6, width: BW * 8 + 12, height: BH * 8 + 12, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const car = (col) => { const g = el("g", {}, svg); el("rect", { x: -15, y: -11, width: 30, height: 22, rx: 7, fill: col, stroke: INK, "stroke-width": 2 }, g); el("path", { d: "M5 -6 V6", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g); return g; };
      const bays = Array.from({ length: 64 }, (_, i) => {
        const x = X0 + (i % 8) * BW, y = Y0 + Math.floor(i / 8) * BH;
        el("rect", { x: x + 2, y: y + 2, width: BW - 4, height: BH - 4, rx: 6, fill: SOFT, stroke: LIL, "stroke-width": 1.5 }, svg);
        return { x: x + BW / 2, y: y + BH / 2, rank: (i * 37 + 11) % 64 };
      });
      bays.forEach((b, i) => { b.g = car(COL[(i * 7 + Math.floor(i / 8) * 3 + (i % 3)) % 5]); });
      const FREE = 31, wait = car(YEL), WX = 406;
      txt(svg, 44, 488, "64 threads working at once", { "font-size": 22, "font-weight": 700 });
      txt(svg, 44, 520, "The API doesn't guarantee this number", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const CX = 596;
      el("rect", { x: 440, y: 128, width: 312, height: 84, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const num = txt(svg, CX, 189, "0", { "text-anchor": "middle", "font-family": MONO, "font-size": 54, "font-weight": 700 });
      txt(svg, CX, 244, "agents over the run's whole life", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      const CY = 356, R = 78;
      el("circle", { cx: CX, cy: CY, r: R, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const sector = el("path", { fill: MINT, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, svg);
      el("path", { d: Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * 6.2832, c = Math.sin(a), s = -Math.cos(a), r1 = i % 6 ? R - 9 : R - 16; return `M${CX + c * r1} ${CY + s * r1} L${CX + c * (R - 3)} ${CY + s * (R - 3)}`; }).join(" "), stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      const hand = el("path", { stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      el("circle", { cx: CX, cy: CY, r: 6, fill: INK }, svg);
      txt(svg, CX, 488, "24 hours by default", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      txt(svg, CX, 520, "run lifetime", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      return (t) => {
        bays.forEach((b, i) => {
          const a = 0.4 + (b.rank / 64) * 3.2; let k = ob(seg(t, a, a + 0.3));
          if (i === FREE) k = t < 5 ? k : 1 - seg(t, 5.0, 5.4);
          tf(b.g, b.x, b.y, Math.max(k, 0)); b.g.setAttribute("opacity", k <= 0.02 ? 0 : 1);
        });
        const w = ob(seg(t, 4.0, 4.3)), m = io(seg(t, 5.6, 6.3)), f = bays[FREE];
        tf(wait, WX + (f.x - WX) * m, f.y, w + Math.sin(t * 6) * 0.05 * (m <= 0 ? 1 : 0)); wait.setAttribute("opacity", w <= 0 ? 0 : 1);
        const k = seg(t, 0.4, 7), a = Math.min(k, 0.9999) * 6.2832;
        num.textContent = Math.round(1000 * k).toLocaleString("en-US");
        const hx = CX + Math.sin(a) * (R - 6), hy = CY - Math.cos(a) * (R - 6);
        sector.setAttribute("d", k <= 0 ? "" : `M${CX} ${CY} L${CX} ${CY - R + 6} A${R - 6} ${R - 6} 0 ${a > Math.PI ? 1 : 0} 1 ${hx} ${hy} Z`);
        hand.setAttribute("d", `M${CX} ${CY} L${CX + Math.sin(a) * (R - 22)} ${CY - Math.cos(a) * (R - 22)}`);
      };
    },
  };

  /* ---- 4. three taps fill one bathtub up to a budget line, then close ---- */
  SC.bathtub = {
    dur: 12, still: 8.4,
    build(svg, api) {
      txt(svg, 44, 62, "A run has no price of its own", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "drag the budget", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      txt(svg, 44, 98, "“every agent in a run uses tokens”", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const TX = [270, 400, 530], TOP = 236, BOT = 404, RATE = 24;
      txt(svg, 60, 157, "tokens", { "font-size": 22, "font-weight": 700 });
      el("rect", { x: 150, y: 138, width: 440, height: 22, rx: 11, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const streams = TX.map((x) => el("rect", { x: x - 6, y: 198, width: 12, rx: 6, fill: SKY, stroke: INK, "stroke-width": 2 }, svg));
      const handles = TX.map((x) => {
        el("rect", { x: x - 10, y: 158, width: 20, height: 26, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
        el("rect", { x: x - 18, y: 182, width: 36, height: 18, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
        const h = el("g", {}, svg); el("rect", { x: -22, y: -6, width: 44, height: 12, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, h);
        el("circle", { cx: x, cy: 126, r: 5, fill: INK }, svg);
        return h;
      });
      const tub = `M150 ${TOP} H650 V${BOT - 64} Q650 ${BOT} 586 ${BOT} H214 Q150 ${BOT} 150 ${BOT - 64} Z`;
      const cp = el("clipPath", { id: "mg-tub-" + Math.random().toString(36).slice(2, 8) }, svg); el("path", { d: tub }, cp);
      el("path", { d: `M214 ${BOT} L200 ${BOT + 22} M586 ${BOT} L600 ${BOT + 22}`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, svg);
      el("path", { d: tub, fill: "#fff" }, svg);
      const water = el("rect", { x: 150, width: 500, fill: SKY, "clip-path": `url(#${cp.id})` }, svg);
      el("path", { d: tub, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 134, y: TOP - 12, width: 532, height: 20, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const line = el("path", { stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 8", "stroke-linecap": "round" }, svg);
      const MIN = 268, MAX = 364; let yb = 292, lvl = 0, user = false, last = 0;
      const knob = el("g", { role: "slider", tabindex: 0, "aria-label": "Budget line", "aria-valuemin": 0, "aria-valuemax": 100, "aria-orientation": "vertical" }, svg);
      el("circle", { r: 26, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, knob);
      el("circle", { r: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, knob);
      el("path", { d: "M-6 -3 L0 -9 L6 -3 M-6 3 L0 9 L6 3", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, knob);
      const lab = txt(svg, 714, 0, "budget", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const set = (y) => { yb = cl(y, MIN, MAX); user = true; api.poke(); };
      let drag = false;
      const toY = (e) => { const m = svg.getScreenCTM(); return m ? (e.clientY - m.f) / m.d : yb; };
      knob.addEventListener("pointerdown", (e) => { drag = true; knob.setPointerCapture(e.pointerId); e.preventDefault(); });
      knob.addEventListener("pointermove", (e) => { if (drag) set(toY(e)); });
      ["pointerup", "pointercancel"].forEach((n) => knob.addEventListener(n, () => { drag = false; }));
      knob.addEventListener("keydown", (e) => { const s = e.key === "ArrowUp" || e.key === "ArrowRight" ? -12 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? 12 : 0; if (s) { e.preventDefault(); set(yb + s); } });
      const tick = el("g", { transform: "translate(150 444)" }, svg);
      el("rect", { width: 76, height: 40, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, tick);
      const bars = [0, 1, 2, 3].map((i) => el("rect", { x: 12 + i * 14, y: 10, width: 9, height: 20, rx: 3, stroke: INK, "stroke-width": 1.5 }, tick));
      txt(svg, 240, 471, "session runtime: $0.08 per session-hour", { "font-size": 20, "font-weight": 600 });
      const cap = strip(svg, 506, 620);
      const stop = pill(svg, "pauses", MINT);
      return (t, now) => {
        const cap0 = BOT - yb, target = Math.min(RATE * Math.max(0, t - 1), cap0) * (1 - seg(t, 11.2, 11.8));
        const dt = cl(now - last, 0, 0.1); last = now;
        lvl = user && now > 0 ? lvl + cl(target - lvl, -90 * dt, RATE * dt) : target;
        const full = t > 1 && lvl >= cap0 - 0.5, flow = t > 1 && t < 11.2 && !full;
        water.setAttribute("y", BOT - lvl); water.setAttribute("height", lvl + 1);
        streams.forEach((s, i) => { s.setAttribute("height", Math.max(0, BOT - lvl - 198 - 2)); s.setAttribute("opacity", flow ? 0.75 + 0.25 * Math.sin(now * 14 + i * 2) : 0); });
        handles.forEach((h, i) => tf(h, TX[i], 126, 1, flow ? 0 : 90));
        line.setAttribute("d", `M158 ${yb} H664`); tf(knob, 686, yb); lab.setAttribute("y", yb - 32);
        knob.setAttribute("aria-valuenow", Math.round(((MAX - yb) / (MAX - MIN)) * 100));
        const n = Math.floor(now * 2.5) % 5; bars.forEach((b, i) => b.setAttribute("fill", i < (now > 0 ? n : 3) ? BLUE : SOFT));
        tf(stop, 400, (BOT + yb) / 2, full ? 1 : 0); stop.setAttribute("opacity", full ? 1 : 0);
        cap.textContent = full ? "At the budget every open run pauses" : "tokens are billed at each model's rates";
      };
    },
  };

  /* ---- title card, 16 by 9: a cotton reel with threads fanning out ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 64, 92, "CLAUDE MANAGED AGENTS, IN BETA", { "font-family": MONO, "font-size": 22, "font-weight": 700, fill: MUTE });
      txt(svg, 64, 184, "Dynamic workflows", { "font-size": 82, "font-weight": 700 });
      el("path", { d: "M68 214 H640", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 272, "How to turn them on, limits and cost", { "font-size": 26, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 470, "Checked 11 Oct 2026", { "font-family": MONO, "font-size": 22, "font-weight": 700 });
      const RX = 560, RY = 400;
      [[BLUE, -150], [LIL, -90], [MINT, -30], [SKY, 30], [YEL, 86]].forEach(([c, dy], i) => {
        const y0 = RY - 36 + i * 18, y1 = RY + dy * 0.9 - 10;
        el("path", { d: `M${RX + 50} ${y0} C${RX + 150} ${y0} ${RX + 130} ${y1} ${RX + 230} ${y1} S${RX + 290} ${y1 + 26} ${RX + 336} ${y1 + 4}`, stroke: INK, "stroke-width": 9, fill: "none", "stroke-linecap": "round" }, svg);
        el("path", { d: `M${RX + 50} ${y0} C${RX + 150} ${y0} ${RX + 130} ${y1} ${RX + 230} ${y1} S${RX + 290} ${y1 + 26} ${RX + 336} ${y1 + 4}`, stroke: c, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, svg);
      });
      el("rect", { x: RX - 50, y: RY - 50, width: 100, height: 100, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      [-36, -18, 0, 18, 36].forEach((dy, i) => el("path", { d: `M${RX - 50} ${RY + dy} H${RX + 50}`, stroke: INK, "stroke-width": 2 }, svg));
      el("rect", { x: RX - 66, y: RY - 70, width: 132, height: 22, rx: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: RX - 66, y: RY + 48, width: 132, height: 22, rx: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
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
