/* Bright coded scenes for "Claude Code skills". Vanilla JS, no library.
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
  /* keyframes [[t, x, y], ...] eased between stops */
  const kf = (t, K) => {
    if (t <= K[0][0]) return [K[0][1], K[0][2]];
    for (let i = 1; i < K.length; i++) if (t < K[i][0]) { const k = io(seg(t, K[i - 1][0], K[i][0])); return [lerp(K[i - 1][1], K[i][1], k), lerp(K[i - 1][2], K[i][2], k)]; }
    const L = K[K.length - 1]; return [L[1], L[2]];
  };
  const tick = (g) => { el("circle", { r: 17, fill: MINT, stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M-8 0 L-2 6 L8 -6", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g); };

  const SC = {};

  /* ---- 1. a rubber stamp inks once and prints the same checklist on three cards ---- */
  SC.stamp = {
    dur: 11, still: 9,
    build(svg) {
      txt(svg, 44, 62, "What is a Claude Code skill?", { "font-size": 32, "font-weight": 700 });
      const F = 470, CX = [320, 500, 680], CW = 160, CT = 112, PX = 127, HOV = 300, PRESS = 436, PAD = 420;
      el("path", { d: `M24 ${F} H776`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: 32, y: 432, width: 190, height: 38, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 44, y: PAD, width: 166, height: 16, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      const BARS = [62, 46, 56, 40];
      const cards = CX.map((cx) => {
        el("rect", { x: cx - CW / 2 + 8, y: CT + 8, width: CW, height: F - CT - 8, rx: 14, fill: LIL }, svg);
        el("rect", { x: cx - CW / 2, y: CT, width: CW, height: F - CT - 8, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        const p = el("g", {}, svg);
        el("rect", { x: cx - 64, y: 136, width: 128, height: 300, rx: 12, fill: "none", stroke: BLUE, "stroke-width": 3 }, p);
        txt(p, cx, 180, "SKILL.md", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700, fill: BLUE });
        el("path", { d: `M${cx - 48} 198 H${cx + 48}`, stroke: BLUE, "stroke-width": 3, "stroke-linecap": "round" }, p);
        [240, 294, 348, 402].forEach((y, k) => {
          el("rect", { x: cx - 48, y: y - 13, width: 26, height: 26, rx: 6, fill: "none", stroke: BLUE, "stroke-width": 3 }, p);
          el("path", { d: `M${cx - 42} ${y} l5 6 l9 -12`, stroke: BLUE, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, p);
          el("rect", { x: cx - 12, y: y - 6, width: BARS[k], height: 12, rx: 6, fill: BLUE }, p);
        });
        const k = el("g", {}, svg); tick(k);
        return { p, k, cx };
      });
      const st = el("g", { "pointer-events": "none" }, svg), body = el("g", {}, st);
      el("rect", { x: -14, y: -108, width: 28, height: 58, fill: YEL, stroke: INK, "stroke-width": 3 }, body);
      el("ellipse", { cx: 0, cy: -124, rx: 36, ry: 26, fill: LIL, stroke: INK, "stroke-width": 3 }, body);
      el("rect", { x: -76, y: -56, width: 152, height: 44, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, body);
      el("rect", { x: -54, y: -48, width: 108, height: 28, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, body);
      txt(body, 0, -28, "SKILL.md", { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
      el("rect", { x: -70, y: -14, width: 140, height: 14, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 3 }, body);
      const S0 = [1.9, 3.55, 5.2];
      const K = [[0, PX, PAD], [0.6, PX, PAD], [1.1, PX, HOV]];
      S0.forEach((s, i) => { K.push([s, CX[i], HOV], [s + 0.35, CX[i], PRESS], [s + 0.6, CX[i], PRESS], [s + 0.95, CX[i], HOV]); });
      K.push([7.1, PX, HOV], [7.45, PX, PAD]);
      const cap = strip(svg, 508, 740);
      return (t) => {
        const out = seg(t, 10.3, 10.8);
        const [x, y] = kf(t, K);
        let q = Math.sin(seg(t, 7.4, 7.7) * Math.PI) * 0.6;
        S0.forEach((s) => { q = Math.max(q, Math.sin(seg(t, s + 0.3, s + 0.65) * Math.PI)); });
        st.setAttribute("transform", `translate(${x} ${y})`);
        body.setAttribute("transform", `scale(${1.2 * (1 + 0.05 * q)} ${1.2 * (1 - 0.08 * q)})`);
        cards.forEach((c, i) => {
          c.p.setAttribute("opacity", (t >= S0[i] + 0.5 ? 1 : 0) * (1 - out));
          const p = ob(seg(t, 6.6 + i * 0.25, 7 + i * 0.25));
          tf(c.k, c.cx + 66, CT + 4, cl(p, 0, 1.3)); c.k.setAttribute("opacity", (p <= 0.01 ? 0 : 1) * (1 - out));
        });
        cap.textContent = t < S0[0] || t >= 10.3 ? "“the same instructions, checklist, or multi-step procedure”" : t < 6.6 ? "Write the instructions once and reuse them" : "A skill's body “loads only when it's used”";
      };
    },
  };

  /* ---- 2. a card catalogue: four drawers open in turn and each lifts one index card ---- */
  SC.drawers = {
    dur: 12, still: 9.6,
    build(svg, api) {
      txt(svg, 44, 62, "Where do Claude Code skills live?", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 100, "tap a drawer", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const D = [
        ["Personal", ["~/.claude/", "skills/", "<skill-name>/", "SKILL.md"], SKY, "Personal: all your projects on this machine"],
        ["Project", [".claude/", "skills/", "<skill-name>/", "SKILL.md"], MINT, "Project: sessions in this repository"],
        ["Plugin", ["<plugin>/", "skills/", "<skill-name>/", "SKILL.md"], LIL, "Plugin: wherever the plugin is enabled"],
        ["Enterprise", ["The managed", "settings", "directory"], YEL, "Enterprise: all users where your organization deploys it"],
      ];
      const ST = 330, SH = 116, CY = ST + SH / 2, CLIP = 412, TOP = 126;
      const defs = el("defs", {}, svg), cp = el("clipPath", { id: "mg-drawers-clip" }, defs);
      el("rect", { x: 0, y: 0, width: 800, height: CLIP }, cp);
      el("rect", { x: 60, y: 462, width: 22, height: 26, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 718, y: 462, width: 22, height: 26, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 40, y: 312, width: 720, height: 152, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 30, y: 296, width: 740, height: 20, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      let pinned = -1;
      const dr = D.map(([name, lines, col, line], i) => {
        const sx = 56 + i * 176, cx = sx + 80;
        el("rect", { x: sx, y: ST, width: 160, height: SH, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
        const inside = el("path", { fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
        const wrap = el("g", { "clip-path": "url(#mg-drawers-clip)" }, svg), card = el("g", {}, wrap);
        el("rect", { x: -78, y: 0, width: 156, height: 292, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
        el("path", { d: "M-76 18 H76", stroke: INK, "stroke-width": 2.5 }, card);
        el("rect", { x: -76.5, y: 1.5, width: 153, height: 16, rx: 8, fill: col }, card);
        el("path", { d: "M-78 18 H78", stroke: INK, "stroke-width": 2.5 }, card);
        const mono = i < 3;
        lines.forEach((s, k) => txt(card, -66, 52 + k * 33, s, mono ? { "font-family": MONO, "font-size": 16, "font-weight": 700 } : { "font-size": 19, "font-weight": 600 }));
        el("circle", { cx: 0, cy: 196, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, card);
        const front = el("g", {}, svg);
        el("rect", { x: sx - 6, y: ST - 6, width: 172, height: SH + 12, rx: 12, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, front);
        el("rect", { x: sx, y: ST, width: 160, height: SH, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, front);
        el("rect", { x: cx - 64, y: ST + 16, width: 128, height: 38, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, front);
        txt(front, cx, ST + 42, name, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        el("rect", { x: cx - 28, y: ST + 76, width: 56, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, front);
        button(front, `${name}: ${lines.join("")}. ${line}`, () => { pinned = i; api.poke(); });
        return { inside, card, front, cx, sx, a: 0.7 + i * 1.9 };
      });
      const cap = strip(svg, 508, 740);
      return (t) => {
        let last = -1;
        dr.forEach((d, i) => {
          const pin = pinned === i;
          let o = io(seg(t, d.a, d.a + 0.45)) * (1 - io(seg(t, 11.2, 11.7)));
          let r = ob(seg(t, d.a + 0.4, d.a + 0.95)) * (1 - io(seg(t, 10.7, 11.2)));
          if (pin) { o = 1; r = 1; }
          if (t >= d.a && t < 10.7) last = i;
          const s = 1 + 0.05 * o, dy = 30 * o, top = CY + dy - (SH / 2) * s, hw = 80 * s;
          d.front.setAttribute("transform", `translate(${d.cx} ${CY + dy}) scale(${s}) translate(${-d.cx} ${-CY})`);
          d.inside.setAttribute("d", `M${d.sx} ${ST} H${d.sx + 160} L${d.cx + hw} ${top + 1} H${d.cx - hw} Z`);
          d.inside.setAttribute("opacity", o > 0.02 ? 1 : 0);
          d.card.setAttribute("transform", `translate(${d.cx} ${CLIP - (CLIP - TOP) * r - (pin ? 10 : 0)})`);
        });
        cap.textContent = pinned >= 0 ? D[pinned][3] : t >= 8 && t < 10.7 ? "Enterprise wins over personal, and personal over project" : last < 0 ? "Where you save a skill decides which sessions load it" : D[last][3];
      };
    },
  };

  /* ---- 3. a book with bookmark tabs: a request lifts one tab and the book falls open there ---- */
  SC.bookmark = {
    dur: 12, still: 9.4,
    build(svg) {
      txt(svg, 44, 62, "How does Claude decide to use a skill?", { "font-size": 32, "font-weight": 700 });
      const W = 360, H = 246, BY = 214, OX = [12, 126, 240], TW = 108;
      const TABS = [["deploy"], ["summarize-", "changes"], ["last30days"]];
      const tabs = TABS.map((ls, i) => {
        const g = el("g", {}, svg), r = el("rect", { x: 0, y: -62, width: TW, height: 82, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
        ls.forEach((s, k) => txt(g, TW / 2, ls.length > 1 ? -40 + k * 21 : -26, s, { "text-anchor": "middle", "font-size": 16, "font-weight": 700 }));
        return { g, r, ox: OX[i] };
      });
      const page = el("g", {}, svg);
      el("rect", { x: 8, y: 8, width: W, height: H, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, page);
      el("rect", { x: 0, y: 0, width: W, height: H, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, page);
      txt(page, 28, 52, "## Current changes", { "font-family": MONO, "font-size": 17, "font-weight": 700 });
      el("rect", { x: 22, y: 70, width: 190, height: 34, rx: 8, fill: SOFT }, page);
      txt(page, 32, 93, "!`git diff HEAD`", { "font-family": MONO, "font-size": 17, "font-weight": 700 });
      txt(page, 28, 142, "## Instructions", { "font-family": MONO, "font-size": 17, "font-weight": 700 });
      txt(page, 28, 178, "Summarize the changes", { "font-family": MONO, "font-size": 17, "font-weight": 500 });
      el("rect", { x: 28, y: 196, width: 270, height: 9, rx: 4.5, fill: LIL }, page);
      el("rect", { x: 28, y: 214, width: 196, height: 9, rx: 4.5, fill: LIL }, page);
      const inner = el("g", {}, svg);
      el("rect", { x: -W - 8, y: 8, width: W, height: H, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, inner);
      el("rect", { x: -W, y: 0, width: W, height: H, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, inner);
      txt(inner, -W + 28, 46, "description", { "font-family": MONO, "font-size": 17, "font-weight": 700, fill: MUTE });
      const hl = el("rect", { y: 186, height: 32, rx: 8, fill: YEL }, inner);
      ["Summarizes uncommitted", "changes and flags", "anything risky.", "Use when the user"].forEach((s, k) => txt(inner, -W + 28, 84 + k * 30, s, { "font-size": 20, "font-weight": 600 }));
      const a5 = txt(inner, -W + 28, 208, "asks", { "font-size": 20, "font-weight": 600 });
      const ax = -W + 28 + a5.getComputedTextLength() + 6;
      const w5 = txt(inner, ax, 208, "what changed", { "font-size": 20, "font-weight": 600 });
      hl.setAttribute("x", ax - 5); hl.setAttribute("width", w5.getComputedTextLength() + 10);
      const cover = el("g", {}, svg);
      el("rect", { x: 0, y: 0, width: W, height: H, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, cover);
      el("path", { d: `M22 3 V${H - 3}`, stroke: INK, "stroke-width": 2.5 }, cover);
      el("rect", { x: W / 2 - 118, y: 74, width: 236, height: 52, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, cover);
      txt(cover, W / 2, 107, "~/.claude/skills/", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      el("path", { d: `M70 170 H${W - 50} M70 194 H${W - 110}`, stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round" }, cover);
      const req = el("g", {}, svg);
      el("rect", { x: 6, y: 6, width: 270, height: 56, rx: 14, fill: LIL }, req);
      el("rect", { x: 0, y: 0, width: 270, height: 56, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, req);
      txt(req, 135, 36, "What did I change?", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const link = el("path", { fill: "none", stroke: LIL, "stroke-width": 4, "stroke-linecap": "round", "stroke-dasharray": "1 11" }, svg);
      const cap = strip(svg, 508, 740);
      return (t) => {
        const c = io(seg(t, 10.5, 11.5)), o = io(seg(t, 3.5, 4.6)) - c, k = 1 - 2 * o, S = lerp(400 - W / 2, 400, o);
        const lift = 20 * cl(ob(seg(t, 2.5, 2.9)), 0, 1.2) * (1 - c);
        tabs.forEach((b, i) => { const up = i === 1 ? lift : 0; b.g.setAttribute("transform", `translate(${S + b.ox} ${BY - up})`); b.r.setAttribute("fill", i === 1 && t >= 2.5 && t < 11 ? SKY : YEL); });
        page.setAttribute("transform", `translate(${S} ${BY})`);
        cover.setAttribute("transform", `translate(${S} ${BY}) scale(${Math.max(k, 0.001)} 1)`); cover.setAttribute("opacity", k > 0 ? 1 : 0);
        inner.setAttribute("transform", `translate(${S} ${BY}) scale(${Math.max(-k, 0.001)} 1)`); inner.setAttribute("opacity", k < 0 ? 1 : 0);
        hl.setAttribute("opacity", seg(t, 4.7, 5) * (1 - c));
        const rx = lerp(-300, 44, io(seg(t, 0.9, 1.5))) - 360 * io(seg(t, 10.3, 11));
        req.setAttribute("transform", `translate(${rx} 84)`);
        const tx = S + OX[1] + TW / 2, ty = BY - 62 - lift - 4;
        link.setAttribute("d", `M${rx + 276} 112 Q${tx - 10} 106 ${tx} ${ty}`);
        link.setAttribute("opacity", seg(t, 2, 2.3) * (1 - c));
        cap.textContent = t < 0.9 || t >= 11 ? "Descriptions sit in context during a regular session" : t < 3.5 ? "Claude reads each skill's description" : "“full skill content only loads when invoked”";
      };
    },
  };

  /* ---- 4. one jar on a central spice rack, copied onto four small racks ---- */
  SC.rack = {
    dur: 11.5, still: 9.2,
    build(svg, api) {
      txt(svg, 44, 62, "How do you share skills across tools?", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 100, "tap the jar", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const jar = (g) => {
        el("rect", { x: -38, y: -122, width: 76, height: 22, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -48, y: -104, width: 96, height: 104, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -40, y: -56, width: 80, height: 49, rx: 10, fill: MINT }, g);
        const lab = el("rect", { x: -44, y: -94, width: 88, height: 34, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, -71, "SKILL.md", { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        return lab;
      };
      const rack = (cx, sy, w, h, name) => {
        el("rect", { x: cx - w / 2 + 10, y: sy - h, width: w - 20, height: h, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
        el("rect", { x: cx - w / 2, y: sy, width: w, height: 16, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
        const t0 = txt(svg, cx, sy + 49, name, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }), pw = t0.getComputedTextLength() + 30;
        el("rect", { x: cx - pw / 2, y: sy + 24, width: pw, height: 36, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg).after(t0);
      };
      const rail = (cx, sy, w) => {
        el("rect", { x: cx - w / 2 + 6, y: sy - 34, width: w - 12, height: 9, rx: 4.5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
        [cx - w / 2 + 6, cx + w / 2 - 16].forEach((x) => el("rect", { x, y: sy - 40, width: 10, height: 42, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg));
      };
      const CS = 250, SS = 436, SX = [115, 305, 495, 685], SW = 164, CSC = 1.15;
      const TOOLS = ["Claude Code", "Codex", "Cursor", "OpenCode"];
      rack(400, CS, 280, 120, "Skills Hub");
      const main = el("g", {}, svg);
      el("rect", { x: 340, y: CS - 150, width: 120, height: 156, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, main);
      const mj = el("g", { transform: `translate(400 ${CS}) scale(${CSC})` }, main), mlab = jar(mj);
      rail(400, CS, 280);
      const ghosts = [];
      SX.forEach((x, i) => {
        rack(x, SS, SW, 108, TOOLS[i]);
        const gh = el("g", { transform: `translate(${x} ${SS})` }, svg); ghosts.push(gh);
        el("path", { d: "M-38 -122 H38 V-104 H32 Q48 -104 48 -88 V-16 Q48 0 32 0 H-32 Q-48 0 -48 -16 V-88 Q-48 -104 -32 -104 H-38 Z", fill: "none", stroke: LIL, "stroke-width": 3, "stroke-dasharray": "3 8", "stroke-linecap": "round", "stroke-linejoin": "round" }, gh);
      });
      const copies = SX.map((x, i) => { const g = el("g", { "pointer-events": "none" }, svg), lab = jar(g); return { g, lab, x, a: 2 + i * 0.85 }; });
      SX.forEach((x) => rail(x, SS, SW));
      button(main, "Skills Hub: installs a skill once and syncs it to Claude Code, Codex, Cursor and OpenCode", () => api.seek(1.8));
      const cap = strip(svg, 508, 740);
      return (t) => {
        const out = seg(t, 10.8, 11.3), sync = t >= 6 && t < 10.8;
        copies.forEach((c, i) => {
          ghosts[i].setAttribute("opacity", t >= c.a + 0.85 && t < 10.8 ? 0 : 1);
          const p = io(seg(t, c.a, c.a + 0.9)), q = Math.sin(seg(t, c.a + 0.9, c.a + 1.15) * Math.PI);
          const x = lerp(400, c.x, p), y = lerp(CS, SS, p) - 90 * Math.sin(Math.PI * p), s = lerp(CSC, 1, p);
          c.g.setAttribute("transform", `translate(${x} ${y}) scale(${s * (1 + 0.06 * q)} ${s * (1 - 0.08 * q)})`);
          c.g.setAttribute("opacity", (t < c.a ? 0 : 1) * (1 - out));
          c.lab.setAttribute("fill", sync ? YEL : "#fff");
        });
        mlab.setAttribute("fill", sync ? YEL : "#fff");
        cap.textContent = t < 2 || t >= 10.8 ? "Skills Hub: a desktop app for macOS, Windows and Linux" : t < 6 ? "Installs a skill once and syncs it to the tools you choose" : "Skills Hub's README lists 48 supported tools";
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 112, "What they are, where they live, how to write one", { "font-size": 25, "font-weight": 500, fill: MUTE });
      txt(svg, 62, 206, "Claude Code", { "font-size": 80, "font-weight": 700 });
      txt(svg, 62, 292, "skills", { "font-size": 80, "font-weight": 700 });
      el("path", { d: "M68 320 H312", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 362, width: 312, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 218, 399, "Checked 14 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      const f = el("g", { transform: "translate(764 310)" }, svg);
      el("path", { d: "M-140 -100 Q-140 -112 -128 -112 H-62 Q-52 -112 -47 -103 L-40 -90 H128 Q140 -90 140 -78 V110 Q140 122 128 122 H-128 Q-140 122 -140 110 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, f);
      const sh = el("g", { transform: "translate(6 -14) rotate(-7)" }, f);
      el("rect", { x: -100, y: -146, width: 200, height: 220, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, sh);
      txt(sh, -78, -106, "SKILL.md", { "font-family": MONO, "font-size": 26, "font-weight": 700 });
      [[-78, -84, 150, LIL], [-78, -60, 116, SKY], [-78, -36, 136, LIL]].forEach(([x, y, w, c]) => el("rect", { x, y, width: w, height: 11, rx: 5.5, fill: c }, sh));
      el("path", { d: "M-150 6 H150 L141 110 Q140 122 128 122 H-128 Q-140 122 -141 110 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, f);
      [[606, 168, 15, SKY], [902, 470, 18, MINT], [560, 470, 12, LIL], [916, 150, 11, YEL]].forEach(([x, y, r, col]) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill: col, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, svg));
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
