/* Bright coded scenes for "How to use Claude Code". Vanilla JS, no library.
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

  /* ---- the five setup icons, each drawn around 0,0 and driven by k from 0 to 1 ---- */
  const ICONS = [
    (g) => { // install: a box opens and an arrow drops in
      const arrow = el("path", { d: "M0 -34 V-8 M-9 -17 L0 -8 L9 -17", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      el("rect", { x: -30, y: -4, width: 60, height: 38, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
      const lid = el("path", { d: "M-34 -4 H34", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g);
      return (k) => { lid.setAttribute("transform", `rotate(${-38 * k} -34 -4)`); arrow.setAttribute("transform", `translate(0 ${-26 + 30 * k})`); arrow.setAttribute("opacity", k < 0.05 ? 0 : 1); };
    },
    (g) => { // sign in: a key turns
      const key = el("g", {}, g);
      el("circle", { cx: -18, cy: 0, r: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, key);
      el("circle", { cx: -18, cy: 0, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, key);
      el("path", { d: "M-4 0 H30 M18 0 V10 M27 0 V8", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, key);
      return (k) => key.setAttribute("transform", `rotate(${-90 + 90 * k})`);
    },
    (g) => { // open a project: files rise out of a folder
      const files = [-16, 0, 16].map((x, i) => el("rect", { x: x - 9, y: -16, width: 18, height: 24, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
      el("path", { d: "M-32 -12 H-8 L-2 -4 H32 V30 H-32 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      return (k) => files.forEach((f, i) => f.setAttribute("transform", `translate(0 ${-20 * cl(k * 1.4 - i * 0.2)})`));
    },
    (g) => { // ask: a speech bubble pops
      const b = el("g", {}, g);
      el("path", { d: "M-32 -26 H32 Q38 -26 38 -20 V10 Q38 16 32 16 H-6 L-20 30 V16 H-32 Q-38 16 -38 10 V-20 Q-38 -26 -32 -26 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, b);
      txt(b, 0, 7, "?", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
      return (k) => b.setAttribute("transform", `scale(${0.55 + 0.45 * k})`);
    },
    (g) => { // make a change: one line of code turns green
      el("rect", { x: -32, y: -24, width: 40, height: 9, rx: 4.5, fill: "#D9D0E4" }, g);
      const mid = el("rect", { x: -32, y: -5, width: 30, height: 11, rx: 5.5, fill: "#D9D0E4" }, g);
      el("rect", { x: -32, y: 16, width: 48, height: 9, rx: 4.5, fill: "#D9D0E4" }, g);
      const plus = el("path", { d: "M-46 0 H-38 M-42 -4 V4", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
      return (k) => { mid.setAttribute("width", 30 + 34 * k); mid.setAttribute("fill", k > 0.3 ? MINT : "#D9D0E4"); plus.setAttribute("opacity", k); };
    },
  ];
  const STOPS = [
    ["Install", "curl -fsSL https://claude.ai/install.sh | bash"],
    ["Sign in", "claude, then follow the browser prompts"],
    ["Open a project", "cd /path/to/your/project, then claude"],
    ["Ask a question", "what does this project do?"],
    ["Make a change", "add a hello world function to the main file"],
  ];

  const SC = {};

  /* ---- 1. a marble rolls through the five setup stops ---- */
  SC.marble = {
    dur: 12.5, still: 10.2,
    build(svg, api) {
      txt(svg, 44, 62, "Zero to a first change", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap a stop", { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
      const d = "M60 200 H650 Q730 200 730 280 V330 Q730 410 650 410 H130";
      el("path", { d, stroke: SOFT, "stroke-width": 22, fill: "none", "stroke-linecap": "round" }, svg);
      const path = el("path", { d, stroke: INK, "stroke-width": 2, fill: "none", "stroke-dasharray": "2 12", "stroke-linecap": "round" }, svg);
      const L = path.getTotalLength();
      const at = [[150, 200], [390, 200], [585, 200], [540, 410], [250, 410]];
      const frac = at.map(([x, y]) => { let best = 0, bd = 1e9; for (let i = 0; i <= 600; i++) { const p = path.getPointAtLength((L * i) / 600), q = (p.x - x) ** 2 + (p.y - y) ** 2; if (q < bd) { bd = q; best = i / 600; } } return best; });
      const prog = (t) => io(seg(t, 0.6, 8.8));
      const when = frac.map((f) => { for (let t = 0; t < 9; t += 0.02) if (prog(t) >= f) return t; return 9; });
      let pinned = -1;
      const tip = strip(svg, 520, 720); tip.setAttribute("font-family", MONO); tip.setAttribute("font-size", 20);
      const stops = at.map(([x, y], i) => {
        const g = el("g", {}, svg), ic = el("g", {}, g);
        el("circle", { r: 58, fill: "#fff", "fill-opacity": 0 , class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, g);
        const run = ICONS[i](ic);
        const chip = el("circle", { cx: -52, cy: 126, r: 14, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        txt(g, -52, 131.5, String(i + 1), { "text-anchor": "middle", "font-size": 16, "font-weight": 700 });
        txt(g, -30, 134, STOPS[i][0], { "font-size": 22 });
        tf(g, x, y - 80);
        button(g, `${STOPS[i][0]}: ${STOPS[i][1]}`, () => { pinned = i; api.poke(); });
        return { ic, run, chip };
      });
      const conf = Array.from({ length: 16 }, (_, i) => el(i % 2 ? "circle" : "rect", i % 2 ? { r: 5, fill: [YEL, BLUE, LIL, MINT][i % 4] } : { width: 9, height: 9, rx: 2, fill: [MINT, YEL, SKY, LIL][i % 4] }, svg));
      const ball = el("g", {}, svg);
      el("circle", { r: 17, fill: YEL, stroke: INK, "stroke-width": 3 }, ball);
      el("path", { d: "M-9 0 H9", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, ball);
      return (t) => {
        const p = prog(t), pt = path.getPointAtLength(L * p);
        tf(ball, pt.x, pt.y - 20, 1, (L * p * 180) / (Math.PI * 17));
        let last = -1;
        stops.forEach((s, i) => {
          const k = ob(seg(t, when[i], when[i] + 0.55)), on = t >= when[i];
          s.run(cl(k, 0, 1.15)); s.ic.setAttribute("opacity", on ? 1 : 0.28);
          s.ic.setAttribute("transform", `scale(${on ? 0.9 + 0.2 * k : 0.9})`);
          s.chip.setAttribute("fill", on ? YEL : "#fff"); if (on) last = i;
        });
        const show = pinned >= 0 ? pinned : last;
        tip.textContent = show < 0 ? "five stops, one marble" : STOPS[show][1];
        const c = seg(t, when[4] + 0.3, when[4] + 1.5), [cx, cy] = [at[4][0], at[4][1] - 80];
        conf.forEach((n, i) => { const a = (i / 16) * 6.283 + 0.4, r = 110 * oc(c); n.setAttribute("transform", `translate(${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r * 0.8 + 30 * c * c}) rotate(${c * 300 + i * 40})`); n.setAttribute("opacity", c <= 0 ? 0 : 1 - c * c); });
      };
    },
  };

  /* ---- 2. drag from a vague prompt to a specific one ---- */
  SC.focus = {
    dur: 11, still: 5.5,
    build(svg, api) {
      txt(svg, 44, 62, "Same bug, two ways to ask", { "font-size": 32, "font-weight": 700 });
      el("rect", { x: 72, y: 104, width: 680, height: 300, rx: 26, fill: YEL }, svg);
      el("rect", { x: 60, y: 92, width: 680, height: 300, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const vague = txt(svg, 400, 258, "fix the login bug", { "text-anchor": "middle", "font-size": 50, "font-weight": 700 });
      const qs = Array.from({ length: 9 }, (_, i) => txt(svg, 0, 0, "?", { "text-anchor": "middle", "font-size": 30 + (i % 3) * 12, "font-weight": 700, fill: [LIL, BLUE, SKY][i % 3] }));
      const rows = [["symptom", LIL, "Users report that login fails after session timeout."], ["where", SKY, "Check the auth flow in src/auth/, especially token refresh."], ["proof", MINT, "Write a failing test that reproduces the issue, then fix it."]].map(([tag, col, line], i) => {
        const g = el("g", {}, svg);
        el("rect", { x: 92, y: 118 + i * 88, width: 104, height: 28, rx: 14, fill: col, stroke: INK, "stroke-width": 2 }, g);
        txt(g, 144, 138 + i * 88, tag, { "text-anchor": "middle", "font-size": 15, "font-weight": 700 });
        txt(g, 92, 176 + i * 88, line, { "font-size": 20, "font-weight": 500 });
        return g;
      });
      el("path", { d: "M170 462 H630", stroke: SOFT, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      const fill = el("path", { d: "M170 462 H170", stroke: YEL, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      txt(svg, 132, 469, "vague", { "text-anchor": "end", "font-size": 20, fill: MUTE });
      txt(svg, 668, 469, "specific", { "font-size": 20, fill: MUTE });
      const knob = el("g", { role: "slider", tabindex: "0", "aria-label": "From a vague prompt to a specific one", "aria-valuemin": 0, "aria-valuemax": 100, class: "mg-hit" }, svg);
      el("circle", { r: 34, fill: "#fff", "fill-opacity": 0 }, knob);
      el("circle", { r: 21, fill: "#fff", stroke: INK, "stroke-width": 3 }, knob);
      el("path", { d: "M-6 -6 L-12 0 L-6 6 M6 -6 L12 0 L6 6", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, knob);
      const cap = strip(svg, 520, 520);
      let user = null;
      const set = (e) => { const r = svg.getBoundingClientRect(); user = cl(((e.clientX - r.left) / r.width * 800 - 170) / 460); api.poke(); };
      let down = false;
      knob.addEventListener("pointerdown", (e) => { down = true; knob.setPointerCapture(e.pointerId); set(e); });
      knob.addEventListener("pointermove", (e) => { if (down) set(e); });
      knob.addEventListener("pointerup", () => { down = false; });
      knob.addEventListener("keydown", (e) => { const s = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.1 : 0; if (s) { e.preventDefault(); user = cl((user == null ? 1 : user) + s); api.poke(); } });
      return (t) => {
        const v = user != null ? user : io(seg(t, 1.2, 4.2)) - io(seg(t, 8, 10.2));
        tf(knob, 170 + 460 * v, 462); fill.setAttribute("d", `M170 462 H${170 + 460 * v}`); knob.setAttribute("aria-valuenow", Math.round(v * 100));
        const a = cl(1 - v * 2.4);
        vague.setAttribute("opacity", a); vague.setAttribute("transform", `translate(0 ${-30 * (1 - a)})`);
        qs.forEach((q, i) => { const ang = i * 0.7 + t * (0.5 + (i % 3) * 0.15), bx = 110 + ((i * 83) % 580), by = 150 + ((i * 57) % 190); tf(q, bx + Math.cos(ang) * 14, by + Math.sin(ang * 1.3) * 12, a, Math.sin(ang) * 14); q.setAttribute("opacity", a * 0.9); });
        rows.forEach((g, i) => { const k = oc(seg(v, 0.35 + i * 0.15, 0.7 + i * 0.15)); g.setAttribute("opacity", k); g.setAttribute("transform", `translate(${40 * (1 - k)} 0)`); });
        cap.textContent = v < 0.5 ? "Vague: Claude has to guess what you mean" : "Specific: the symptom, the place, the proof";
      };
    },
  };

  /* ---- 3. the four phase loop ---- */
  SC.loop = {
    dur: 10.4, still: 6.3,
    build(svg, api) {
      const C = [400, 280], R = 168, P = 2.6;
      const ph = [["Explore", "Plan mode: it reads,", "no changes.", SKY], ["Plan", "Ask for a", "detailed plan.", LIL], ["Implement", "It codes and", "runs the tests.", MINT], ["Commit", "Ask for a commit", "and a PR.", YEL]];
      txt(svg, 44, 62, "The working", { "font-size": 32, "font-weight": 700 }); txt(svg, 44, 100, "loop", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap a phase", { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
      el("circle", { cx: C[0], cy: C[1], r: R, fill: "none", stroke: SOFT, "stroke-width": 20 }, svg);
      el("circle", { cx: C[0], cy: C[1], r: R, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 12", "stroke-linecap": "round" }, svg);
      const n1 = txt(svg, C[0], C[1] - 4, "", { "text-anchor": "middle", "font-size": 21, "font-weight": 500 }), n2 = txt(svg, C[0], C[1] + 26, "", { "text-anchor": "middle", "font-size": 21, "font-weight": 500 });
      const pos = (i) => { const a = (-90 + i * 90) * Math.PI / 180; return [C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R]; };
      const draw = [
        (g) => { const m = el("g", {}, g); el("circle", { cx: -4, cy: -4, r: 15, fill: "#fff", stroke: INK, "stroke-width": 3.5 }, m); el("path", { d: "M7 7 L20 20", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, m); return (k, t) => m.setAttribute("transform", `translate(${Math.cos(t * 3) * 7 * k} ${Math.sin(t * 3) * 5 * k})`); },
        (g) => { const ts = [-14, 0, 14].map((y) => { el("path", { d: `M-4 ${y} H20`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g); return el("path", { d: `M-22 ${y} l4 4 l7 -9`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g); }); return (k) => ts.forEach((n, i) => n.setAttribute("opacity", cl(k * 4 - i - 0.5))); },
        (g) => { const bs = [[-22, 6], [2, 6], [-10, -16]].map(([x, y]) => el("rect", { x, y, width: 20, height: 18, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, g)); return (k) => bs.forEach((n, i) => { const q = ob(cl(k * 3.2 - i * 0.9)); n.setAttribute("transform", `translate(0 ${-34 * (1 - q)})`); n.setAttribute("opacity", cl(k * 3.2 - i * 0.9) > 0 ? 1 : 0); }); },
        (g) => { el("path", { d: "M-14 24 V-24", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g); const f = el("path", { d: "M-12 -22 H16 L8 -12 L16 -2 H-12 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g); return (k) => f.setAttribute("transform", `translate(0 ${28 * (1 - oc(cl(k * 2)))})`); },
      ];
      const nodes = ph.map((p, i) => {
        const [x, y] = pos(i), g = el("g", {}, svg), bg = el("circle", { r: 50, fill: "#fff", stroke: INK, "stroke-width": 3 }, g), ic = el("g", {}, g), run = draw[i](ic);
        tf(g, x, y);
        const lx = i === 1 ? x + 4 : i === 3 ? x - 4 : x, ly = i === 0 ? y - 64 : i === 2 ? y + 82 : y - 64;
        txt(svg, lx, ly, p[0], { "text-anchor": "middle", "font-size": 23, "font-weight": 700 });
        button(g, `${p[0]}: ${p[1]} ${p[2]}`, () => api.seek(i * P + 0.01));
        return { g, bg, run, x, y };
      });
      const dot = el("circle", { r: 13, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const cap = strip(svg, 546, 640); cap.textContent = "Could describe the diff in one sentence? Skip the plan.";
      return (t) => {
        const i = Math.floor(t / P) % 4, u = (t % P) / P, mv = io(seg(u, 0.72, 1)), a = (-90 + (i + mv) * 90) * Math.PI / 180;
        dot.setAttribute("cx", C[0] + Math.cos(a) * (R + 0)); dot.setAttribute("cy", C[1] + Math.sin(a) * R);
        dot.setAttribute("opacity", mv > 0.02 && mv < 0.98 ? 1 : 0);
        nodes.forEach((n, j) => { const on = j === i, k = on ? seg(u, 0, 0.7) : 0, pop = on ? ob(seg(u, 0, 0.18)) : 0; n.bg.setAttribute("fill", on ? ph[j][3] : "#fff"); tf(n.g, n.x, n.y, 1 + 0.12 * pop); n.run(on ? k : 1, t); });
        n1.textContent = ph[i][1]; n2.textContent = ph[i][2];
        const o = oc(seg(u, 0, 0.15)) * (1 - seg(u, 0.85, 1)); n1.setAttribute("opacity", o); n2.setAttribute("opacity", o);
      };
    },
  };

  /* ---- 4. the context window as a jar that fills up ---- */
  SC.jar = {
    dur: 12, still: 6.9,
    build(svg, api) {
      txt(svg, 44, 62, "The context window fills up", { "font-size": 32, "font-weight": 700 });
      const J = { x: 120, y: 130, w: 300, h: 330 }, r = 23, cols = 6;
      const jar = el("g", {}, svg);
      el("path", { d: `M${J.x} ${J.y} V${J.y + J.h - 40} Q${J.x} ${J.y + J.h} ${J.x + 40} ${J.y + J.h} H${J.x + J.w - 40} Q${J.x + J.w} ${J.y + J.h} ${J.x + J.w} ${J.y + J.h - 40} V${J.y}`, fill: "#fff", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, jar);
      const kinds = [[BLUE, "files Claude reads"], [LIL, "command output"], [YEL, "the conversation"]];
      const N = 36, balls = Array.from({ length: N }, (_, i) => {
        const row = Math.floor(i / cols), col = i % cols, x = J.x + 27 + col * 49.2 + (row % 2 ? 0 : 0), y = J.y + J.h - 30 - row * 47;
        return { n: el("circle", { r, fill: kinds[(i * 7 + row) % 3][0], stroke: INK, "stroke-width": 2.5 }, jar), x, y, d: 0.5 + i * 0.165 };
      });
      const sum = el("g", { opacity: 0 }, jar);
      el("rect", { x: J.x + 60, y: J.y + J.h - 86, width: 180, height: 62, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, sum);
      txt(sum, J.x + 150, J.y + J.h - 47, "summary", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      kinds.forEach(([c, s], i) => { el("circle", { cx: 486, cy: 168 + i * 44, r: 12, fill: c, stroke: INK, "stroke-width": 2.5 }, svg); txt(svg, 510, 176 + i * 44, s, { "font-size": 22, "font-weight": 500 }); });
      const warn = el("g", {}, svg);
      el("rect", { x: 470, y: 300, width: 290, height: 76, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 6" }, warn);
      txt(warn, 615, 332, "Performance degrades", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(warn, 615, 358, "as it fills", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const mk = (x, label, col, fn) => { const g = el("g", {}, svg); el("rect", { x, y: 404, width: 138, height: 54, rx: 27, fill: col, stroke: INK, "stroke-width": 3 }, g); el("rect", { x: x - 5, y: 399, width: 148, height: 64, rx: 32, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g); txt(g, x + 69, 438, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 }); button(g, label, fn); return g; };
      let squash = -99;
      mk(470, "/clear", YEL, () => { squash = -99; api.seek(8.6); });
      mk(622, "/compact", MINT, () => { squash = api.now(); api.poke(); });
      const cap = strip(svg, 520, 720);
      const TXT = { fill: "Everything Claude reads and every command output lands here", clear: "/clear starts a new conversation with empty context", compact: "/compact frees up context by summarizing the conversation so far" };
      return (t, now) => {
        const s = now - squash, sq = s >= 0 && s < 4.5;
        if (!sq && squash > 0) { squash = -99; api.seek(0); return; }
        const out = seg(t, 8.6, 9.6); let count = 0;
        balls.forEach((b, i) => {
          const k = oc(seg(t, b.d, b.d + 0.5)), bounce = Math.sin(seg(t, b.d + 0.5, b.d + 0.9) * Math.PI) * -7;
          let x = b.x, y = 96 + (b.y - 96) * k + bounce, sc = 1, op = seg(t, b.d, b.d + 0.12);
          if (t >= b.d) count++;
          if (sq) { const q = io(seg(s, 0, 0.8)); x = b.x + (J.x + 150 - b.x) * q; y = b.y + (J.y + J.h - 55 - b.y) * q; sc = 1 - 0.75 * q; op = t >= b.d ? 1 - seg(s, 0.6, 0.9) : 0; }
          else if (out > 0) { const q = io(cl(out * 1.5 - (i % cols) * 0.06)); y = b.y - 230 * q; x = b.x + (i % 2 ? 30 : -30) * q; op = 1 - q; sc = 1 - 0.4 * q; }
          tf(b.n, x, y, sc); b.n.setAttribute("opacity", op);
        });
        sum.setAttribute("opacity", sq ? ob(seg(s, 0.7, 1.1)) : 0);
        const full = sq || out > 0 ? 0 : count / N;
        warn.setAttribute("opacity", oc(seg(full, 0.6, 0.85)));
        jar.setAttribute("transform", `rotate(${full > 0.8 ? Math.sin(now * 9) * 1.2 * seg(full, 0.8, 1) : 0} ${J.x + 150} ${J.y + J.h})`);
        cap.textContent = sq ? TXT.compact : out > 0 || t > 8.6 ? TXT.clear : TXT.fill;
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 64, 150, "How to use", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 236, "Claude Code", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 262 H520", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 318, "Setup, a first task and the commands that matter", { "font-size": 25, "font-weight": 500, fill: MUTE });
      el("path", { d: "M70 478 H890", stroke: SOFT, "stroke-width": 22, "stroke-linecap": "round" }, svg);
      el("path", { d: "M70 478 H890", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 12", "stroke-linecap": "round" }, svg);
      ICONS.forEach((f, i) => { const g = el("g", {}, svg); f(g)(1); tf(g, 130 + i * 160, 412, 1.15); });
      const b = el("g", {}, svg); el("circle", { r: 19, fill: YEL, stroke: INK, "stroke-width": 3 }, b); el("path", { d: "M-10 0 H10", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, b); tf(b, 868, 456, 1, 30);
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
