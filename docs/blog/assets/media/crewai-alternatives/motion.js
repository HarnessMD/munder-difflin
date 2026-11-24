/* Bright coded scenes for "CrewAI Alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 16, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const about = (n, cx, cy, s) => n.setAttribute("transform", `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
  const squash = (n, q) => n.setAttribute("transform", `scale(${1 + 0.08 * q} ${1 - 0.11 * q})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (g, a) => el("rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 7", "stroke-linecap": "round", rx: 18, class: "mg-ring" }, a), g);
  /* an upside down stacking cup, bottom centre at 0,0: bw wide at the lip, tw wide at the top, h tall */
  const cup = (p, bw, tw, h, lip, col, sw = 3, shadow = true) => {
    const g = el("g", {}, p), d = `M${-bw / 2} 0 L${-tw / 2} ${-h} Q0 ${-h - 5} ${tw / 2} ${-h} L${bw / 2} 0 Z`;
    if (shadow) el("path", { d, fill: LIL, transform: "translate(10 8)" }, g);
    el("path", { d, fill: col, stroke: INK, "stroke-width": sw, "stroke-linejoin": "round" }, g);
    el("rect", { x: -bw / 2 - 6, y: -lip, width: bw + 12, height: lip, rx: lip / 2, fill: col, stroke: INK, "stroke-width": sw }, g);
    return g;
  };
  /* a pull wagon, bed from x0 to x1 with its lip at y; wheels sit at wy */
  const wheel = (p, x, y, r, sw = 3) => {
    const g = el("g", {}, p);
    el("circle", { r, fill: "#fff", stroke: INK, "stroke-width": sw }, g);
    el("path", { d: `M${-r * 0.66} 0 H${r * 0.66} M0 ${-r * 0.66} V${r * 0.66}`, stroke: INK, "stroke-width": sw * 0.9, "stroke-linecap": "round" }, g);
    el("circle", { r: r * 0.26, fill: YEL, stroke: INK, "stroke-width": sw * 0.8 }, g);
    tf(g, x, y);
    return { g, x, y, r };
  };

  const SC = {};

  /* ---- 1. two chess pieces with role tags take turns as a crew ---- */
  SC.chessboard = {
    dur: 8, still: 8,
    build(svg, api) {
      const S = 50, BX = 200, BY = 150, sq = ([c, r]) => [BX + c * S + S / 2, BY + r * S + S / 2 + 10];
      const board = el("g", {}, svg);
      const edge = el("g", {}, board);
      el("rect", { x: BX - 14 + 12, y: BY - 14 + 12, width: 428, height: 428, rx: 18, fill: LIL }, edge);
      el("rect", { x: BX - 14, y: BY - 14, width: 428, height: 428, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, edge);
      ring(edge, { x: BX - 24, y: BY - 24, width: 448, height: 448, rx: 24 });
      const sqs = [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const n = el("rect", { x: -S / 2, y: -S / 2, width: S, height: S, fill: (r + c) % 2 ? SKY : SOFT }, board);
        sqs.push({ n, x: BX + c * S + S / 2, y: BY + r * S + S / 2, d: 0.15 + (r + c) * 0.06 });
      }
      const grid = el("rect", { x: BX, y: BY, width: 400, height: 400, fill: "none", stroke: INK, "stroke-width": 2.5 }, board);
      const piece = (col, label, side) => {
        const g = el("g", {}, board), body = el("g", {}, g);
        el("ellipse", { cx: 6, cy: 2, rx: 25, ry: 8, fill: LIL }, body);
        el("path", { d: "M-15 -12 C-13 -26 -8 -34 -7 -44 H7 C8 -34 13 -26 15 -12 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
        el("circle", { cy: -61, r: 14, fill: col, stroke: INK, "stroke-width": 3 }, body);
        el("rect", { x: -13, y: -49, width: 26, height: 8, rx: 4, fill: col, stroke: INK, "stroke-width": 3 }, body);
        el("rect", { x: -22, y: -13, width: 44, height: 14, rx: 6, fill: col, stroke: INK, "stroke-width": 3 }, body);
        const w = label.length * 9.6 + 44, x0 = side < 0 ? -18 - w : 18, hx = side < 0 ? x0 + w - 14 : x0 + 14;
        const tag = el("g", {}, g);
        el("path", { d: `M${side * 5} -74 Q${side * 8} -100 ${hx} -109`, stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, tag);
        el("rect", { x: x0, y: -128, width: w, height: 38, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
        el("circle", { cx: hx, cy: -109, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
        mono(tag, side < 0 ? x0 + 12 + (w - 36) / 2 : x0 + 24 + (w - 36) / 2, -103.5, label);
        return { g, body, tag };
      };
      const P = [piece(YEL, "Researcher", -1), piece(LIL, "Analyst", 1)];
      const START = [[2, 6], [5, 6]], CYC = [[[3, 4], [4, 4]], [[2, 3], [3, 3]], [[3, 2], [4, 2]], [[4, 3], [5, 3]]];
      const ban = el("g", {}, svg), banText = el("g", {}, ban);
      el("path", { d: "M-152 -14 H-108 V34 H-152 L-138 10 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, ban);
      el("path", { d: "M152 -14 H108 V34 H152 L138 10 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, ban);
      el("rect", { x: -122, y: -30, width: 244, height: 56, rx: 10, fill: MINT, stroke: INK, "stroke-width": 3 }, ban);
      ban.appendChild(banText);
      txt(banText, 0, 12, "Crews", { "text-anchor": "middle", "font-size": 38, "font-weight": 700 });
      let turn = 0, tapAt = -99;
      button(board, "Chessboard: the Researcher and Analyst pieces take their next turn", () => { if (api.now() - tapAt < 1.15) return; turn++; tapAt = api.now(); api.tap(1.5); });
      const place = (p, a, b, k, land, drop) => {
        const e = io(k), [ax, ay] = sq(a), [bx, by] = sq(b);
        tf(p.g, ax + (bx - ax) * e, ay + (by - ay) * e - Math.sin(Math.PI * k) * 44 - drop);
        squash(p.body, land > 0 && land < 1 ? Math.sin(Math.PI * land) : 0);
      };
      return (t, now) => {
        about(edge, 400, 350, 0.92 + 0.08 * oc(seg(t, 0, 0.5))); edge.setAttribute("opacity", oc(seg(t, 0, 0.4)));
        sqs.forEach((s) => tf(s.n, s.x, s.y, Math.max(0, ob(seg(t, s.d, s.d + 0.35)))));
        grid.setAttribute("opacity", seg(t, 0.9, 1.3));
        let from = START, to = CYC[0], k = [seg(t, 2.3, 3.2), seg(t, 3.4, 4.3)], land = [seg(t, 3.2, 3.55), seg(t, 4.3, 4.65)];
        if (turn > 0) {
          const s = api.calm ? 9 : now - tapAt;
          from = CYC[(turn - 1) % 4]; to = CYC[turn % 4];
          k = [seg(s, 0, 0.6), seg(s, 0.5, 1.1)]; land = [seg(s, 0.6, 0.95), seg(s, 1.1, 1.45)];
        }
        P.forEach((p, i) => {
          const din = seg(t, 1.1 + i * 0.1, 1.6 + i * 0.1);
          place(p, from[i], to[i], k[i], land[i], 70 * (1 - ob(din)));
          p.g.setAttribute("opacity", oc(seg(din, 0, 0.4)));
          const tg = oc(seg(t, 1.6 + i * 0.1, 2.0 + i * 0.1));
          p.tag.setAttribute("opacity", tg); p.tag.setAttribute("transform", `translate(0 ${10 * (1 - tg)})`);
        });
        const bk = ob(seg(t, 4.6, 5.3));
        tf(ban, 400, -60 + 134 * bk); ban.setAttribute("opacity", seg(t, 4.6, 4.8));
        const lk = oc(seg(t, 5.1, 5.6));
        banText.setAttribute("opacity", lk); banText.setAttribute("transform", `translate(0 ${8 * (1 - lk)})`);
      };
    },
  };

  /* ---- 2. a mint cup stacks on a blue cup on a soft white base ---- */
  SC.stackingcups = {
    dur: 7, still: 7,
    build(svg, api) {
      const B = 452, LIFT = 90;
      const base = el("g", {}, svg);
      el("rect", { x: -180, y: 10, width: 380, height: 60, rx: 18, fill: LIL }, base);
      el("rect", { x: -190, y: 0, width: 380, height: 60, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, base);
      const bl = el("g", {}, base);
      mono(bl, 0, 40, "1.2.24", { "font-size": 28 });
      const cups = el("g", {}, svg);
      ring(cups, { x: 190, y: 84, width: 420, height: 452, rx: 26 });
      const blue = el("g", {}, cups), bBody = el("g", {}, blue);
      cup(bBody, 320, 236, 206, 24, BLUE);
      const bLab = mono(bBody, 0, -104, "LangGraph", { "font-size": 30 });
      const mint = el("g", {}, cups), mBody = el("g", {}, mint);
      cup(mBody, 220, 160, 146, 20, MINT, 3, false);
      const mLab = mono(mBody, 0, -74, "Deep Agents", { "font-size": 22 });
      let tapAt = -99;
      button(cups, "Stacking cups: lift the Deep Agents cup off and drop it back on", () => { if (api.now() - tapAt < 1.55) return; tapAt = api.now(); api.tap(1.7); });
      /* s seconds after a drop starts from H above: falls, rebounds a little, squashes on landing */
      const fall = (s, H, up) => {
        const p = seg(s, 0, 0.5), b = seg(s, 0.5, 0.9);
        return [-H * (1 - p * p) - up * Math.sin(Math.PI * b), s >= 0.5 && s < 0.72 ? Math.sin(Math.PI * seg(s, 0.5, 0.72)) : 0];
      };
      return (t, now) => {
        const kb = oc(seg(t, 0.2, 0.8));
        tf(base, 400, B + 40 * (1 - kb)); base.setAttribute("opacity", kb);
        const lk = ob(seg(t, 3.9, 4.4));
        bl.setAttribute("opacity", seg(t, 3.9, 4.1)); bl.setAttribute("transform", `translate(0 ${12 * (1 - lk)})`);
        const [bd, bq] = fall(t - 0.8, 420, 16), mq2 = Math.sin(Math.PI * seg(t, 2.9, 3.1)) * 0.5;
        tf(blue, 400, B + bd); blue.setAttribute("opacity", t >= 0.8 ? 1 : 0); squash(bBody, bq + mq2);
        bLab.setAttribute("opacity", oc(seg(t, 1.5, 1.9)));
        let [md, mq] = fall(t - 2.4, 420, 18);
        const s = api.calm ? 9 : now - tapAt;
        if (s < 0.75) md -= LIFT * io(seg(s, 0, 0.5));
        else { const [td, tq] = fall(s - 0.75, LIFT, 10); md += td; mq = Math.max(mq, tq); }
        tf(mint, 400, B - 206 + md); mint.setAttribute("opacity", t >= 2.4 ? 1 : 0); squash(mBody, mq);
        mLab.setAttribute("opacity", oc(seg(t, 3.2, 3.6)));
      };
    },
  };

  /* ---- 3. a wagon carries the six picks; tap a block for who it suits ---- */
  SC.wagon = {
    dur: 7, still: 7,
    build(svg, api) {
      const DATA = [
        [SKY, ["LangGraph"], ["Control", "over state"], "LangGraph"],
        [YEL, ["Munder", "Difflin"], ["Team of", "agents"], "Munder Difflin"],
        [SKY, ["OpenAI", "Agents SDK"], ["Handoffs"], "OpenAI Agents SDK"],
        [SKY, ["Google", "ADK"], ["Gemini"], "Google ADK"],
        [SKY, ["Mastra"], ["TypeScript"], "Mastra"],
        [SKY, ["Agno"], ["Your cloud"], "Agno"],
      ];
      const up = el("g", { transform: "translate(0 -50)" }, svg);
      el("path", { d: "M24 512 H776", stroke: SOFT, "stroke-width": 14, "stroke-linecap": "round" }, up);
      const W = el("g", {}, up);
      el("path", { d: "M696 396 L768 322", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, W);
      el("circle", { cx: 770, cy: 320, r: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, W);
      const LIFTY = 116, blocks = DATA.map(([col, lines, suits, name], i) => {
        const x0 = 66 + i * 106, cx = x0 + 49, g = el("g", {}, W), lift = el("g", {}, g);
        ring(lift, { x: x0 - 6, y: 256, width: 110, height: 122, rx: 14 });
        el("rect", { x: x0, y: 262, width: 98, height: 110, rx: 10, fill: col, stroke: INK, "stroke-width": 3 }, lift);
        const lab = el("g", {}, lift);
        lines.forEach((s, j) => mono(lab, cx, (lines.length > 1 ? 304 : 318) + j * 22, s, { "font-size": 14 }));
        const sign = el("g", {}, lift), sw = Math.max(...suits.map((s) => s.length)) * 8.4 + 20, sh = suits.length * 22 + 16;
        el("path", { d: "M0 -2 V14", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, sign);
        el("rect", { x: -sw / 2, y: -sh, width: sw, height: sh, rx: 10, fill: MINT, stroke: INK, "stroke-width": 2.5 }, sign);
        suits.forEach((s, j) => mono(sign, 0, -sh + 24 + j * 22, s, { "font-size": 14 }));
        const b = { g, lift, lab, sign, cx, up: false, at: -99, from: 0, d: 0 };
        button(g, `${name}: ${suits.join(" ")}`, () => { b.from = b.d; b.up = !b.up; b.at = api.now(); api.tap(0.8); });
        return b;
      });
      const body = el("g", {}, W);
      ring(body, { x: 40, y: 352, width: 680, height: 160, rx: 22 });
      el("rect", { x: 70, y: 380, width: 640, height: 70, rx: 12, fill: LIL }, body);
      el("rect", { x: 60, y: 370, width: 640, height: 70, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, body);
      el("rect", { x: 50, y: 360, width: 660, height: 18, rx: 9, fill: BLUE, stroke: INK, "stroke-width": 3 }, body);
      const wheels = [wheel(body, 170, 469, 36, 3.5), wheel(body, 590, 469, 36, 3.5)];
      button(body, "Wagon: put every block back", () => { blocks.forEach((b) => { if (b.up || b.d > 0.001) { b.from = b.d; b.up = false; b.at = api.now(); } }); api.tap(0.8); });
      return (t, now) => {
        const x = -860 * (1 - io(seg(t, 0.3, 3.0))), rock = 2.2 * Math.sin(Math.PI * seg(t, 3.0, 3.45));
        W.setAttribute("transform", `translate(${x} 0) rotate(${rock} 590 505)`);
        wheels.forEach((w) => tf(w.g, w.x, w.y, 1, (x / w.r) * 57.3));
        blocks.forEach((b, i) => {
          const s = api.calm ? 9 : now - b.at, p = seg(s, 0, b.up ? 0.6 : 0.45);
          b.d = b.from + ((b.up ? 1 : 0) - b.from) * (b.up ? ob(p) : io(p));
          const hop = -12 * Math.sin(Math.PI * seg(t, 3.0 + i * 0.08, 3.3 + i * 0.08));
          b.lift.setAttribute("transform", `translate(0 ${hop - LIFTY * b.d})`);
          const lk = oc(seg(t, 3.5 + i * 0.09, 3.85 + i * 0.09));
          b.lab.setAttribute("opacity", lk); b.lab.setAttribute("transform", `translate(0 ${8 * (1 - lk)})`);
          const sg = cl((b.d - 0.35) / 0.65, 0, 1.2);
          b.sign.setAttribute("transform", `translate(${b.cx} 250) scale(${sg})`); b.sign.setAttribute("opacity", cl((b.d - 0.35) / 0.3));
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 56, y: 44, width: 160, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 136, 72, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
      const date = mono(svg, 904, 72, "Checked 24 Nov 2026", { "text-anchor": "end", "font-size": 18, "font-weight": 500, fill: MUTE });
      const title = txt(svg, 56, 178, "CrewAI Alternatives", { "font-size": 74, "font-weight": 700 });
      const line = el("path", { d: "M60 206 H270", stroke: YEL, "stroke-width": 13, "stroke-linecap": "round" }, svg);
      const sub = txt(svg, 56, 258, "Six picks for building or running a team of agents", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const tile = (x, col, s) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 8, y: 408, width: 408, height: 84, rx: 18, fill: SOFT }, g);
        el("rect", { x, y: 400, width: 408, height: 84, rx: 18, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        const lab = mono(g, x + 204, 450, s, { "font-size": 21 });
        return { g, lab };
      };
      const tiles = [tile(56, LIL, "CrewAI 1.15.45: 24 Nov 2026"), tile(496, SKY, "MIT licence")];
      const stack = el("g", {}, svg);
      [[80, 62, 42, 10], [60, 46, 34, 8], [44, 34, 26, 7]].reduce((y, [bw, tw, h, lip]) => { tf(cup(stack, bw, tw, h, lip, BLUE, 2.5, false), 0, y); return y - h; }, 0);
      const wag = el("g", {}, svg);
      el("path", { d: "M58 -26 L84 -52", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, wag);
      el("circle", { cx: 86, cy: -54, r: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, wag);
      el("rect", { x: -62, y: -50, width: 124, height: 34, rx: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, wag);
      el("rect", { x: -68, y: -56, width: 136, height: 10, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, wag);
      wheel(wag, -38, -13, 13, 2.5); wheel(wag, 38, -13, 13, 2.5);
      const rise = (n, a, dy = 16) => { const k = oc(seg(a, 0, 0.5)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${dy * (1 - k)})`); };
      return (t) => {
        rise(pill, t - 0.2); rise(date, t - 0.3); rise(title, t - 0.45, 24); rise(sub, t - 1.1);
        line.setAttribute("d", `M60 206 H${60 + 210 * oc(seg(t, 0.9, 1.4))}`); line.setAttribute("opacity", t >= 0.9 ? 1 : 0);
        tiles.forEach((o, i) => { const k = ob(seg(t, 1.6 + i * 0.1, 2.1 + i * 0.1)); about(o.g, 260 + 440 * i, 442, Math.max(0, k)); rise(o.lab, t - 2.6 - i * 0.1, 10); });
        [[stack, 260, 400], [wag, 700, 400]].forEach(([n, x, y], i) => { const k = ob(seg(t, 2.1 + i * 0.1, 2.6 + i * 0.1)); tf(n, x, y - 40 * (1 - k)); n.setAttribute("opacity", seg(t, 2.1 + i * 0.1, 2.25 + i * 0.1)); });
      };
    },
  };

  /* ---- player ----
     The timeline plays once, from the first time the scene is in view; it pauses out of view and holds on its last frame. */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm, run = false, at = 0, busy = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    const pos = () => (held ? sc.still : run ? cl(clock() + off, 0, sc.dur) : at);
    let draw = () => {};
    const frame = () => draw(pos(), clock());
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && ((run && !held && clock() + off < sc.dur) || clock() < busy)) raf = requestAnimationFrame(tick); };
    /* tap(s): a tap finishes the timeline on its last frame, then redraws for s seconds so the tap animates */
    const api = { calm, now: clock, tap: (s) => { held = true; busy = Math.max(busy, clock() + s); tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) {
        if (!held && !run) { run = true; off = at - clock(); }
        tick();
        if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); }
      } else { if (run) { at = pos(); run = false; } cancelAnimationFrame(raf); }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
