/* Bright coded scenes for "What is the Claude Agent SDK". Vanilla JS, no library.
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


  /* set a line of text and shrink it a little if it would run past max */
  const say = (n, s, max) => {
    if (n.textContent === s) return;
    n.textContent = s; n.setAttribute("font-size", 20);
    const w = n.getComputedTextLength();
    if (w > max) n.setAttribute("font-size", Math.max(16, (20 * max) / w).toFixed(2));
  };

  const SC = {};

  /* ---- 1. one music box mechanism lifts out of one case and lowers into another, still turning ---- */
  SC.musicbox = {
    dur: 11.6, still: 8.2,
    build(svg) {
      txt(svg, 44, 62, "The same agent, a different way in", { "font-size": 32, "font-weight": 700 });
      const LX = 215, RX = 585, REST = 322, UP = 152, MS = 1.3;
      el("rect", { x: LX - 150, y: 168, width: 300, height: 84, rx: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: LX - 132, y: 184, width: 264, height: 44, rx: 10, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      [LX, RX].forEach((x) => {
        el("rect", { x: x - 150, y: 236, width: 300, height: 220, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
        el("rect", { x: x - 126, y: 254, width: 256, height: 122, rx: 14, fill: "#fff", stroke: LIL, "stroke-width": 2, "stroke-dasharray": "4 7", "stroke-linecap": "round" }, svg);
      });
      const notes = [BLUE, LIL, MINT].map((c) => {
        const g = el("g", {}, svg);
        el("path", { d: "M5 0 V-26 q9 2 11 12", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, g);
        el("ellipse", { cx: -2, cy: 0, rx: 8, ry: 6.5, fill: c, stroke: INK, "stroke-width": 3 }, g);
        return g;
      });
      const mech = el("g", {}, svg);
      el("rect", { x: -92, y: 30, width: 184, height: 14, rx: 7, fill: BLUE, stroke: INK, "stroke-width": 3 }, mech);
      el("rect", { x: -76, y: -8, width: 12, height: 40, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, mech);
      el("rect", { x: 50, y: -8, width: 12, height: 40, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, mech);
      el("rect", { x: -64, y: -46, width: 114, height: 13, rx: 4, fill: SKY, stroke: INK, "stroke-width": 3 }, mech);
      const COLS = Array.from({ length: 9 }, (_, c) => -52 + c * 11.5);
      el("path", { d: COLS.map((x) => `M${x} -33 V-25`).join(" "), stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, mech);
      el("rect", { x: -64, y: -24, width: 114, height: 50, rx: 12, fill: MINT }, mech);
      const clip = el("clipPath", { id: "mb-cyl" }, mech);
      el("rect", { x: -64, y: -24, width: 114, height: 50, rx: 12 }, clip);
      const pinWrap = el("g", { "clip-path": "url(#mb-cyl)" }, mech), pins = el("g", {}, pinWrap);
      COLS.forEach((x, c) => { for (let k = 0; k < 5; k++) el("circle", { cx: x, cy: -72 + ((c * 7) % 24) + k * 24, r: 3.4, fill: INK }, pins); });
      el("rect", { x: -64, y: -24, width: 114, height: 50, rx: 12, fill: "none", stroke: INK, "stroke-width": 3 }, mech);
      el("path", { d: "M62 1 H84", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, mech);
      const arm = el("path", { stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, mech);
      const knob = el("circle", { r: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, mech);
      [[LX, YEL, "Claude Code CLI"], [RX, "#fff", "your app"]].forEach(([x, fill, name]) => {
        el("rect", { x: x - 150, y: 380, width: 300, height: 84, rx: 18, fill, stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, x, 432, name, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      });
      el("rect", { x: 40, y: 500, width: 720, height: 48, rx: 24, fill: SOFT }, svg);
      const cap = txt(svg, 400, 531, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      return (t) => {
        const lift = io(seg(t, 1.6, 2.6)), across = io(seg(t, 2.6, 4.2)), lower = io(seg(t, 4.2, 5.2));
        const x = LX + (RX - LX) * across, y = REST - (REST - UP) * (lift - lower);
        const op = seg(t, 0, 0.4) * (1 - seg(t, 10.8, 11.3));
        tf(mech, x, y, MS, Math.sin(across * Math.PI) * 5); mech.setAttribute("opacity", op);
        pins.setAttribute("transform", `translate(0 ${(t * 22) % 24})`);
        const ky = 1 + 20 * Math.sin(t * 4.4);
        arm.setAttribute("d", `M84 1 V${ky.toFixed(1)}`); knob.setAttribute("cx", 84); knob.setAttribute("cy", ky);
        const seated = cl(1 - lift * 3) + cl(lower * 3 - 2);
        notes.forEach((n, j) => {
          const p = (t * 0.42 + j / 3) % 1;
          tf(n, x + (j - 1) * 62 + Math.sin(p * 6 + j * 2) * 9, y - 84 - 70 * p, 1 + 0.3 * p, (j - 1) * 10);
          n.setAttribute("opacity", Math.sin(p * Math.PI) * seated * op);
        });
        say(cap, t < 1.6 || t >= 10.8 ? "Claude Code CLI: “built for daily interactive use”" : t < 5.2 ? "“the same tools, agent loop, and context management”" : "Agent SDK: for embedding the agent “in a process you operate”", 680);
      };
    },
  };

  /* ---- 2. a pocket knife opens eight tools, one per capability ---- */
  SC.penknife = {
    dur: 13.4, still: 11,
    build(svg, api) {
      txt(svg, 44, 62, "Eight Claude Code capabilities", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a label", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const CY = 290, PL = 305, PR = 495, L = 135;
      const heel = (h) => `H0 A${h} ${h} 0 0 1 0 ${-h} Z`;
      let saw = "M0 -10 H135 V2"; for (let x = 135; x > 26; x -= 12) saw += ` L${x - 6} 10 L${x - 12} 2`; saw += " L15 10 " + heel(10);
      const TOOLS = [
        ["tools", "Built-in tools", "“Read, write, edit files, run commands, and search the web”", PL, 0, -105, SOFT, "M0 -11 H90 Q126 -11 135 8 L132 11 " + heel(11), ""],
        ["hooks", "Hooks", "custom code at key points in the agent lifecycle", PR, 180, 285, SKY, "M0 -9 H92 L100 -4 H122 L135 -9 V9 L122 4 H100 L92 9 " + heel(9), ""],
        ["subagents", "Subagents", "specialized agents for focused subtasks", PR, 180, 330, MINT, saw, ""],
        ["MCP", "MCP", "external tools and data sources", PR, 180, 20, LIL, "M0 -10 H126 Q135 -10 135 0 Q135 10 126 10 " + heel(10), "M34 -10 L44 10 M52 -10 L62 10 M70 -10 L80 10 M88 -10 L98 10 M106 -10 L116 10"],
        ["permissions", "Permissions", "which tools run automatically and which need approval", PR, 180, 70, BLUE, "M0 -10 H98 Q110 -10 112 -22 L135 -4 Q128 10 110 10 " + heel(10), ""],
        ["sessions", "Sessions", "context you can resume or fork later", PL, 0, 110, "#fff", "M0 -10 H52 L135 0 L52 10 " + heel(10), ""],
        ["skills", "Skills, commands and memory", "loaded from .claude/ and ~/.claude/", PL, 0, 160, MINT, "M0 -10 H130 Q135 -10 135 -5 V10 H120 V1 H104 V10 " + heel(10), ""],
        ["plugins", "Plugins", "loaded by local path", PL, 0, -150, LIL, "M0 -10 H135 V10 " + heel(10), "M30 -10 V-1 M45 -10 V-4 M60 -10 V-1 M75 -10 V-4 M90 -10 V-1 M105 -10 V-4 M120 -10 V-1"],
      ];
      let pinned = -1;
      const pick = (i) => () => { pinned = i; api.poke(); };
      const blades = TOOLS.map(([, , , px, , , fill, d, extra], i) => {
        const g = el("g", { class: "mg-hit" }, svg);
        el("path", { d, fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        if (extra) el("path", { d: extra, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        g.addEventListener("click", pick(i));
        return g;
      });
      el("rect", { x: PL - 38, y: CY - 32, width: PR - PL + 76, height: 64, rx: 32, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      [PL, PR].forEach((x) => el("circle", { cx: x, cy: CY, r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg));
      el("rect", { x: 372, y: CY - 12, width: 56, height: 24, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const labels = TOOLS.map(([name, full, line, px, , open], i) => {
        const r = (open * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r), g = el("g", {}, svg);
        const side = Math.abs(c) > 0.5, tx = px + (L + (side ? 22 : 0)) * c + (side ? 0 : c * 20), ty = side ? CY + L * s + 7 + (s > 0 ? 12 : -4) : CY + L * s + (s < 0 ? -22 : 36);
        const box = el("rect", { height: 34, rx: 17, fill: SOFT, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const t = txt(g, tx, ty, name, { "text-anchor": side ? (c > 0 ? "start" : "end") : "middle", "font-size": 21, "font-weight": 700 });
        const w = t.getComputedTextLength(), x0 = side ? (c > 0 ? tx : tx - w) : tx - w / 2;
        box.setAttribute("x", x0 - 13); box.setAttribute("y", ty - 24); box.setAttribute("width", w + 26);
        button(g, `${full}: ${line}`, pick(i));
        return g;
      });
      el("rect", { x: 40, y: 484, width: 720, height: 84, rx: 26, fill: SOFT }, svg);
      const head = txt(svg, 400, 518, "", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const cap = txt(svg, 400, 549, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      return (t) => {
        const fold = io(seg(t, 12.3, 13.1));
        let cur = -1;
        TOOLS.forEach(([, , , px, shut, open], i) => {
          const a = 0.7 + i * 1.15, p = ob(seg(t, a, a + 0.75)) * (1 - fold);
          tf(blades[i], px, CY, 1, shut + (open - shut) * p);
          labels[i].setAttribute("opacity", seg(t, a + 0.4, a + 0.7) * (1 - seg(t, 12.1, 12.35)));
          labels[i].setAttribute("pointer-events", t >= a + 0.4 && t < 12.1 ? "auto" : "none");
          if (t >= a + 0.35) cur = i;
        });
        const show = pinned >= 0 ? pinned : t > 10.2 ? -1 : cur;
        head.textContent = show < 0 ? "Eight capabilities" : TOOLS[show][1];
        say(cap, show < 0 ? "according to the overview's table" : TOOLS[show][2], 680);
      };
    },
  };

  /* ---- 3. a set of points: the lever decides which siding the cart rolls to ---- */
  SC.points = {
    dur: 12, still: 10.2,
    build(svg, api) {
      txt(svg, 44, 62, "Where the SDK's usage lands", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "tap the lever", { "font-size": 20, fill: MUTE, "font-weight": 500 });
      const D = ["M48 300 H290 C380 300 400 190 490 190 H716", "M48 300 H290 C380 300 400 410 490 410 H716"];
      const tracks = D.map((d) => el("path", { d, stroke: INK, "stroke-width": 32, fill: "none", "stroke-linecap": "round" }, svg));
      D.forEach((d) => el("path", { d, stroke: SOFT, "stroke-width": 26, fill: "none", "stroke-linecap": "round" }, svg));
      D.forEach((d) => el("path", { d, stroke: LIL, "stroke-width": 16, fill: "none", "stroke-dasharray": "3 14" }, svg));
      [190, 410].forEach((y) => el("rect", { x: 724, y: y - 26, width: 12, height: 52, rx: 6, fill: INK }, svg));
      const LEN = tracks.map((p) => p.getTotalLength());
      txt(svg, 603, 148, "Claude Console", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      txt(svg, 603, 470, "plan usage limits", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      const blade = el("g", {}, svg);
      el("rect", { x: 0, y: -6, width: 70, height: 12, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, blade);
      el("circle", { cx: 290, cy: 300, r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const carts = [BLUE, MINT].map((c) => {
        const g = el("g", { "pointer-events": "none" }, svg);
        el("rect", { x: -31, y: -20, width: 62, height: 40, rx: 10, fill: c, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -13, y: -10, width: 26, height: 20, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
        return g;
      });
      const LVX = 190, LVY = 446, lever = el("g", {}, svg);
      const ring = el("rect", { y: LVY - 84, height: 116, rx: 22, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, lever);
      el("rect", { x: LVX - 48, y: LVY - 4, width: 96, height: 24, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, lever);
      const arm = el("g", {}, lever);
      el("path", { d: "M0 0 V-60", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, arm);
      el("circle", { cx: 0, cy: -60, r: 13, fill: YEL, stroke: INK, "stroke-width": 3 }, arm);
      const la = txt(lever, LVX - 62, LVY - 40, "API key", { "text-anchor": "end", "font-size": 22, "font-weight": 700 });
      const lb = txt(lever, LVX + 62, LVY - 40, "plan login", { "font-size": 22, "font-weight": 700 });
      const x0 = LVX - 62 - la.getComputedTextLength() - 14, x1 = LVX + 62 + lb.getComputedTextLength() + 14;
      ring.setAttribute("x", x0); ring.setAttribute("width", x1 - x0);
      let man = null, from = 0, at = -9, pos = 0, target = 0;
      button(lever, "Lever: switch between API key and plan login", () => { from = pos; man = 1 - target; at = api.now(); lever.setAttribute("aria-pressed", man ? "true" : "false"); api.seek(0.2); });
      lever.setAttribute("aria-pressed", "false");
      const cap = strip(svg, 500, 720);
      const place = (g, k, s) => {
        const p = tracks[k], a = p.getPointAtLength(Math.max(0, s - 2)), b = p.getPointAtLength(s + 2);
        tf(g, (a.x + b.x) / 2, (a.y + b.y) / 2, 1, (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI);
      };
      return (t, now) => {
        if (man == null) { pos = io(seg(t, 4.9, 5.4)) - io(seg(t, 11.4, 11.9)); target = t >= 4.9 && t < 11.4 ? 1 : 0; }
        else { target = man; pos = from + (man - from) * io(seg(now, at, at + 0.3)); if (now < at) pos = man; }
        arm.setAttribute("transform", `translate(${LVX} ${LVY}) rotate(${-34 + 68 * pos})`);
        la.setAttribute("fill", target ? MUTE : INK); lb.setAttribute("fill", target ? INK : MUTE);
        tf(blade, 290, 300, 1, -15 + 30 * pos);
        const out = 1 - seg(t, 11.2, 11.7);
        const ka = man == null ? 0 : man, kb = man == null ? 1 : man;
        place(carts[0], ka, 18 + (LEN[ka] - 52) * io(seg(t, 0.6, 3.8)));
        place(carts[1], kb, 18 + (LEN[kb] - 52 - (ka === kb ? 76 : 0)) * io(seg(t, 6.2, 9.4)));
        carts[0].setAttribute("opacity", seg(t, 0.3, 0.6) * out); carts[1].setAttribute("opacity", seg(t, 5.9, 6.2) * out);
        say(cap, target ? "Claude plan login: SDK usage draws from the plan's usage limits" : "API key: set ANTHROPIC_API_KEY from the Claude Console", 680);
      };
    },
  };

  /* ---- 4. an egg box fills one session at a time, and the next egg finds no cup ---- */
  SC.eggbox = {
    dur: 12, still: 9.75,
    build(svg) {
      txt(svg, 44, 62, "“One agent session maps to one subprocess”", { "font-size": 32, "font-weight": 700 });
      const X = (i) => 110 + i * 116, SEAT = 262, HOVER = 172;
      const EGG = "M0 -44 C24 -44 34 -8 34 10 C34 30 18 42 0 42 C-18 42 -34 30 -34 10 C-34 -8 -24 -44 0 -44 Z";
      el("rect", { x: 52, y: 104, width: 696, height: 150, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 68, y: 120, width: 664, height: 104, rx: 14, fill: "none", stroke: LIL, "stroke-width": 2, "stroke-dasharray": "4 7", "stroke-linecap": "round" }, svg);
      el("rect", { x: 52, y: 232, width: 696, height: 70, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const COL = [YEL, SKY, MINT, LIL, BLUE, YEL];
      const eggs = COL.map((c, i) => {
        const g = el("g", {}, svg);
        el("path", { d: EGG, fill: c, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M-16 -8 Q-14 -24 -6 -30", stroke: "#fff", "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, g);
        return { g, x: X(i), a: 0.8 + i * 0.95 };
      });
      const extra = el("g", {}, svg);
      el("path", { d: EGG, fill: SOFT, stroke: INK, "stroke-width": 3 }, extra);
      el("path", { d: "M-16 -8 Q-14 -24 -6 -30", stroke: "#fff", "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, extra);
      let d = "M52 254"; for (let i = 0; i < 6; i++) d += ` Q${X(i)} 306 ${X(i) + 58} 254`;
      el("path", { d: d + " V338 Q748 352 734 352 H66 Q52 352 52 338 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      txt(svg, 400, 336, "your machine", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const tags = eggs.map((e) => {
        const g = el("g", {}, svg);
        ["1 GiB RAM", "5 GiB disk", "1 CPU"].forEach((s, k) => txt(g, e.x, 388 + k * 27, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 600 }));
        return g;
      });
      const cap = strip(svg, 490, 720);
      const HOP = [3, 4, 2, 3, 1, 3, 4, 2], T0 = 7.6, STEP = 0.72;
      return (t) => {
        const out = 1 - seg(t, 11.2, 11.7);
        eggs.forEach((e, i) => {
          const q = seg(t, e.a, e.a + 0.4), sq = Math.sin(seg(t, e.a + 0.4, e.a + 0.7) * Math.PI) * 0.08;
          e.g.setAttribute("transform", `translate(${e.x} ${SEAT - 330 * (1 - q * q) + 40 * sq}) scale(${1 + sq} ${1 - sq})`);
          e.g.setAttribute("opacity", (t < e.a ? 0 : 1) * out);
          const k = oc(seg(t, e.a + 0.4, e.a + 0.75));
          tags[i].setAttribute("opacity", k * out); tags[i].setAttribute("transform", `translate(0 ${8 * (1 - k)})`);
        });
        const q = seg(t, T0 - 0.4, T0), u = Math.max(0, t - T0) / STEP, k = Math.min(Math.floor(u), HOP.length - 2), f = cl(u - k);
        const ex = X(HOP[k]) + (X(HOP[k + 1]) - X(HOP[k])) * io(f), ey = HOVER - 250 * (1 - q * q) - 44 * Math.sin(Math.PI * f) * (t > T0 ? 1 : 0);
        tf(extra, ex, ey, 1, t > T0 ? Math.sin(f * Math.PI) * (X(HOP[k + 1]) > X(HOP[k]) ? 14 : -14) : 0);
        extra.setAttribute("opacity", (t < T0 - 0.4 ? 0 : 1) * out);
        say(cap, t >= T0 - 0.2 && t < 11.2 ? "The 1 GiB figure “is a floor, not the ceiling”" : "Per agent: 1 GiB RAM, 5 GiB disk, 1 CPU, “a reasonable starting point”", 680);
      };
    },
  };

  /* ---- title card, 16 by 9: a wall of toy building bricks with one brick still to place ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 1.5,
    build(svg) {
      const kg = el("g", { transform: "translate(64 62)" }, svg);
      const kr = el("rect", { x: 0, y: 0, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, kg);
      const kt = txt(kg, 20, 28, "Explainer", { "font-size": 22, "font-weight": 700 });
      kr.setAttribute("width", kt.getComputedTextLength() + 40);
      const title = txt(svg, 62, 206, "Claude Agent SDK", { "font-size": 96, "font-weight": 700 });
      const tw = title.getComputedTextLength();
      if (tw > 830) title.setAttribute("font-size", ((96 * 830) / tw).toFixed(1));
      el("path", { d: `M66 236 H${62 + Math.min(tw, 830) - 6}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 292, "Checked 8 Oct 2026", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const G = 478, U = 56, BH = 46, X0 = 88;
      el("path", { d: `M64 ${G} H896`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const brick = (p, n, fill) => {
        for (let u = 0; u < n; u++) el("rect", { x: u * U + 15, y: -10, width: 26, height: 14, rx: 4, fill, stroke: INK, "stroke-width": 3 }, p);
        el("rect", { x: 0, y: 0, width: n * U, height: BH, rx: 7, fill, stroke: INK, "stroke-width": 3 }, p);
      };
      const ROWS = [
        [[0, 3, YEL], [3, 2, SKY], [5, 4, LIL], [9, 2, MINT], [11, 3, BLUE]],
        [[1, 2, MINT], [3, 3, BLUE], [6, 2, YEL], [10, 3, SKY]],
        [[2, 2, LIL], [4, 2, SKY]],
      ];
      ROWS.forEach((row, r) => row.forEach(([u, n, c]) => brick(el("g", { transform: `translate(${X0 + u * U} ${G - (r + 1) * BH})` }, svg), n, c)));
      el("rect", { x: X0 + 8 * U + 4, y: G - 2 * BH + 4, width: 2 * U - 8, height: BH - 8, rx: 6, fill: "none", stroke: LIL, "stroke-width": 2, "stroke-dasharray": "4 7", "stroke-linecap": "round" }, svg);
      const fly = el("g", {}, svg), inner = el("g", { transform: `translate(${-U} ${-BH / 2})` }, fly);
      brick(inner, 2, LIL);
      return (t) => tf(fly, X0 + 9 * U + 10, G - 2 * BH - 48 + 7 * Math.sin((t / 6) * 2 * Math.PI * 2), 1, -9);
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
