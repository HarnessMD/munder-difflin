/* Bright coded scenes for "Cursor alternatives". Vanilla JS, no library.
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
  const spring = (x) => (x <= 0 ? 0 : 1 - Math.exp(-4.2 * x) * Math.cos(8.5 * x));

  const SC = {};

  /* ---- 1. three coats hang up on a coat rack, and it leans a little more with each ---- */
  SC.rack = {
    dur: 11.6, still: 9,
    build(svg, api) {
      txt(svg, 44, 62, "Three reasons people look elsewhere", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap a coat", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const PX = 400, BASE = 462, RAIL = 142, HX = [196, 400, 604];
      el("path", { d: `M60 ${BASE + 2} H740`, stroke: SOFT, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const rack = el("g", {}, svg);
      el("path", { d: `M${PX} ${RAIL} V${BASE - 8}`, stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, rack);
      el("path", { d: `M${PX} ${BASE - 46} L${PX - 78} ${BASE} M${PX} ${BASE - 46} L${PX + 78} ${BASE}`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round", fill: "none" }, rack);
      el("rect", { x: 104, y: RAIL - 11, width: 592, height: 22, rx: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, rack);
      HX.forEach((x) => el("path", { d: `M${x} ${RAIL + 11} V${RAIL + 30}`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, rack));
      const LINES = ["Price: Individual $20, Pro Plus $60, Ultra $200 a month", "Licence: its public GitHub repo carried no licence", "Plan limits: Hobby is free with “Limited Agent requests”"];
      const NAME = ["price", "licence", "plan limits"], COL = [YEL, LIL, SKY];
      let pinned = -1;
      const coats = HX.map((x, i) => {
        const g = el("g", {}, rack);
        el("rect", { x: -96, y: -14, width: 192, height: 240, rx: 22, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("path", { d: "M-24 16 L-70 36 L-88 150 L-62 155 L-58 88 L-62 214 L62 214 L58 88 L62 155 L88 150 L70 36 L24 16 Q0 36 -24 16 Z", fill: COL[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: "M-24 16 L0 58 L24 16 M0 58 V214", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
        el("circle", { cx: 0, cy: 6, r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        [160, 188].forEach((y) => el("circle", { cx: 14, cy: y, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
        el("rect", { x: -66, y: 84, width: 132, height: 46, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, 115, NAME[i], { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        button(g, LINES[i], () => { pinned = i; api.poke(); });
        return { g, x, land: 1.2 + i * 2.1 };
      });
      const cap = strip(svg, 506, 720);
      return (t) => {
        const out = seg(t, 10.6, 11.2);
        let lean = 0, last = -1;
        coats.forEach((c, i) => { lean += 2.1 * spring(t - c.land); if (t >= c.land) last = i; });
        lean *= 1 - io(out);
        rack.setAttribute("transform", `rotate(${lean} ${PX} ${BASE})`);
        coats.forEach((c) => {
          const tt = t - c.land + 0.5, q = seg(tt, 0, 0.5), sw = tt < 0.5 ? 26 * (1 - q) + 8 : 34 * Math.exp(-2.2 * (tt - 0.5)) * Math.cos(6.5 * (tt - 0.5) + 1.33);
          c.g.setAttribute("transform", `translate(${c.x + 130 * (1 - oc(q))} ${RAIL + 22 - 30 * (1 - q * q)}) rotate(${-lean + sw})`);
          c.g.setAttribute("opacity", seg(tt, 0, 0.15) * (1 - out));
        });
        cap.textContent = pinned >= 0 ? LINES[pinned] : t > 7.6 && t < 10.6 ? "Hobby free; Individual $20, Pro Plus $60, Ultra $200 a month" : last < 0 || t >= 10.6 ? "Three reasons: price, licence and plan limits" : LINES[last];
      };
    },
  };

  /* ---- 2. two bookends push two books of the same height upright; a label flips to the new name ---- */
  SC.bookends = {
    dur: 11.4, still: 8.8,
    build(svg, api) {
      txt(svg, 44, 62, "The closest swap, we think", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap the label", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const SH = 408, BW = 140, BH = 276, PL = 150, GAP = 6, LX = 400 - GAP / 2 - BW, RX = 400 + GAP / 2 + BW;
      const line = el("path", { stroke: LIL, "stroke-width": 3, "stroke-dasharray": "2 9", "stroke-linecap": "round", fill: "none" }, svg);
      const chip = el("g", {}, svg);
      el("rect", { x: -76, y: -21, width: 152, height: 42, rx: 21, fill: MINT, stroke: INK, "stroke-width": 3 }, chip);
      txt(chip, 0, 7, "same height", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      el("rect", { x: 50, y: SH, width: 700, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const book = (name, col, plan, right) => {
        const g = el("g", {}, svg), s = right ? -1 : 1, cx = (s * BW) / 2;
        el("rect", { x: right ? -BW : 0, y: -BH, width: BW, height: BH, rx: 10, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${cx - BW / 2} ${-BH + 26} h${BW} M${cx - BW / 2} ${-BH + 38} h${BW}`, stroke: INK, "stroke-width": 3 }, g);
        name.forEach((n, i) => txt(g, cx, -BH + (name.length > 1 ? 82 : 98) + i * 34, n, { "text-anchor": "middle", "font-size": 29, "font-weight": 700 }));
        const p = el("g", {}, g);
        el("rect", { x: -58, y: -52, width: 116, height: 104, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, p);
        txt(p, 0, -24, plan, { "text-anchor": "middle", "font-size": 19, "font-weight": 500 });
        txt(p, 0, 12, "$20", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
        txt(p, 0, 38, "a month", { "text-anchor": "middle", "font-size": 19, "font-weight": 500 });
        return { g, p, cx };
      };
      const A = book(["Cursor"], SKY, "Individual", false), B = book(["Devin", "Desktop"], LIL, "Pro", true);
      const end = (right) => { const g = el("g", {}, svg); el("path", { d: `M0 0 V${-PL} a8 8 0 0 0 -16 0 V-16 H-112 a8 8 0 0 0 0 16 Z`, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", transform: right ? "scale(-1 1)" : "" }, g); return g; };
      const EA = end(false), EB = end(true);
      const LBX = RX - BW / 2, LBY = 470;
      el("path", { d: `M${LBX - 70} ${SH + 16} V${LBY - 22} M${LBX + 70} ${SH + 16} V${LBY - 22}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      const note = txt(svg, LBX - 116, LBY + 7, "", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      const lab = el("g", {}, svg), face = el("g", {}, lab);
      el("rect", { x: -106, y: -28, width: 212, height: 56, rx: 18, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, lab);
      const fr = el("rect", { x: -100, y: -22, width: 200, height: 44, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, face);
      const ft = txt(face, 0, 8, "", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      lab.setAttribute("transform", `translate(${LBX} ${LBY})`);
      let taps = 0, tapAt = -99;
      button(lab, "Flip the label between Windsurf, the old name, and Devin Desktop, the new name", () => { taps++; tapAt = api.now(); api.poke(); });
      const cap = strip(svg, 516, 720);
      return (t, now) => {
        const out = io(seg(t, 10.4, 11.1)), m = io(seg(t, 1.1, 2.5)) - out, d = 300 * (1 - m);
        const lean = Math.min(13, (Math.atan(d / PL) * 180) / Math.PI), pop = seg(t, 0.15, 0.45);
        A.g.setAttribute("transform", `translate(${LX} ${SH}) rotate(${-lean})`); B.g.setAttribute("transform", `translate(${RX} ${SH}) rotate(${lean})`);
        A.g.setAttribute("opacity", pop); B.g.setAttribute("opacity", pop);
        tf(EA, LX - d, SH); tf(EB, RX + d, SH);
        const k = seg(t, 3.0, 3.6) * (1 - seg(t, 10.3, 10.5)), y = SH - BH - 16;
        line.setAttribute("d", `M${LX - 26} ${y} H${LX - 26 + (RX + 40 - LX + 26) * k}`); line.setAttribute("opacity", k <= 0 ? 0 : 1);
        const cp = ob(seg(t, 3.5, 3.9)) * (1 - seg(t, 10.3, 10.5)); tf(chip, RX + 126, y, cl(cp, 0, 1.3)); chip.setAttribute("opacity", cp <= 0.01 ? 0 : 1);
        [A, B].forEach((b, i) => { const p = ob(seg(t, 4.5 + i * 0.6, 4.9 + i * 0.6)) * (1 - seg(t, 10.3, 10.5)); tf(b.p, b.cx, -70, cl(p, 0, 1.3)); b.p.setAttribute("opacity", p <= 0.01 ? 0 : 1); });
        const u = seg(t, 6.6, 7.1), w = cl((now - tapAt) / 0.4), auto = u >= 0.5 ? 1 : 0;
        const side = (auto + taps + (w < 0.5 ? 1 : 0)) % 2;
        face.setAttribute("transform", `scale(1 ${Math.max(0.04, Math.min(Math.abs(Math.cos(Math.PI * u)), Math.abs(Math.cos(Math.PI * w))))})`);
        ft.textContent = side ? "Devin Desktop" : "Windsurf"; fr.setAttribute("fill", side ? YEL : "#fff");
        note.textContent = side ? "new name" : "old name";
        cap.textContent = t < 3 || t >= 10.4 ? "Both are editors with agents built in" : t < 4.5 ? "Same shape" : t < 6.6 ? "Both list a plan at $20 a month: Cursor Individual, Devin Pro" : t < 8.4 ? "“Devin Desktop is the new name for Windsurf.”" : "We ran no test, so this is about shape and price";
      };
    },
  };

  /* ---- 3. a vending machine: five slots light up free and drop a box, two stay unlit at $20 ---- */
  SC.vending = {
    dur: 11.8, still: 9.8,
    build(svg, api) {
      el("rect", { x: 60, y: 44, width: 700, height: 428, rx: 24, fill: SKY }, svg);
      el("path", { d: "M110 462 V478 M690 462 V478", stroke: INK, "stroke-width": 10, "stroke-linecap": "round" }, svg);
      el("rect", { x: 50, y: 34, width: 700, height: 428, rx: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M50 92 H750", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 76, 74, "Five free ways in", { "font-size": 30, "font-weight": 700 });
      txt(svg, 726, 72, "tap a slot", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      el("rect", { x: 684, y: 104, width: 54, height: 248, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 693, y: 116, width: 36, height: 30, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      const lampN = el("circle", { cx: 711, cy: 131, r: 7, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      for (let i = 0; i < 8; i++) el("circle", { cx: 701 + (i % 2) * 20, cy: 172 + Math.floor(i / 2) * 24, r: 6.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 696, y: 286, width: 30, height: 50, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("path", { d: "M705 311 H717", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 366, width: 676, height: 82, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M62 384 H738", stroke: INK, "stroke-width": 3 }, svg);
      const IT = [
        [["Zed"], 1, "Zed Personal: “$0 forever” with your own API keys"],
        [["Cline"], 1, "“Cline is free for individual developers”; you pay for inference"],
        [["OpenCode"], 1, "OpenCode: “Free models included”"],
        [["Devin", "Desktop"], 1, "Devin Desktop Free: “Light quota to code with agents”"],
        [["GitHub Copilot"], 1, "Copilot Free: “Limited chat and agent usage”"],
        [["Claude Code"], 0, "Claude Code is included in Claude Pro, $20 if billed monthly", "Claude Pro", "$20 if billed monthly"],
        [["Codex CLI"], 0, "Plus, $20 a month, is the first plan that lists the Codex CLI", "Plus", "$20 a month"],
      ];
      const BOXC = [YEL, LIL, SKY, MINT, BLUE];
      let pinned = -1, k = 0;
      const cells = IT.map(([name, free, line, plan, price], i) => {
        const top = i < 4, w = top ? 146 : 197, x = 62 + (top ? i * 154 : (i - 4) * 205.5), y = top ? 104 : 232, h = 120, cx = x + w / 2;
        const g = el("g", {}, svg);
        el("rect", { x: x - 4, y: y - 4, width: w + 8, height: h + 8, rx: 18, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const bg = el("rect", { x, y, width: w, height: h, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        let tag = null;
        if (free) {
          name.forEach((n, j) => txt(g, cx, y + (name.length > 1 ? 31 : 42) + j * 24, n, { "text-anchor": "middle", "font-size": 21, "font-weight": 700 }));
          tag = el("g", {}, g);
          el("rect", { x: -38, y: -17, width: 76, height: 34, rx: 17, fill: MINT, stroke: INK, "stroke-width": 3 }, tag);
          txt(tag, 0, 7, "free", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
        } else {
          txt(g, cx, y + 31, name[0], { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
          txt(g, cx, y + 61, plan, { "text-anchor": "middle", "font-size": 18, "font-weight": 500, fill: MUTE });
          el("rect", { x: cx - w / 2 + 5, y: y + 73, width: w - 10, height: 36, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
          txt(g, cx, y + 97, price, { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
        }
        button(g, line, () => { pinned = i; api.poke(); });
        const o = { bg, tag, cx, y, free, n: free ? k : -1, lit: free ? 0.9 + k * 1.45 : 99 };
        if (free) k++;
        return o;
      });
      const boxes = cells.filter((c) => c.free).map((c) => {
        const g = el("g", { "pointer-events": "none" }, svg);
        el("rect", { x: -22, y: -40, width: 44, height: 40, rx: 7, fill: BOXC[c.n], stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M-22 -27 H22 M0 -40 V-27", stroke: INK, "stroke-width": 3 }, g);
        return { g, c, bx: 240 + c.n * 80 };
      });
      const cap = strip(svg, 504, 720);
      return (t) => {
        const out = seg(t, 11, 11.5);
        let last = -1, busy = 0;
        cells.forEach((c, i) => {
          if (!c.free) return;
          const on = t >= c.lit && t < 11.2;
          c.bg.setAttribute("fill", on ? YEL : SOFT);
          const p = ob(seg(t, c.lit + 0.05, c.lit + 0.4)) * (1 - out);
          tf(c.tag, c.cx, c.y + 90, cl(p, 0, 1.3)); c.tag.setAttribute("opacity", p <= 0.01 ? 0 : 1);
          if (t >= c.lit) last = i;
          if (t >= c.lit && t < c.lit + 1.1) busy = 1;
        });
        lampN.setAttribute("fill", busy ? MINT : SOFT);
        boxes.forEach((b) => {
          const a = b.c.lit + 0.4, q = seg(t, a, a + 0.6), e = q * q, y0 = b.c.y + 132, bn = Math.sin(seg(t, a + 0.6, a + 0.9) * Math.PI) * 7;
          tf(b.g, b.c.cx + (b.bx - b.c.cx) * q, y0 + (442 - y0) * e - bn, 0.5 + 0.5 * seg(t, a, a + 0.2), (1 - q) * 20);
          b.g.setAttribute("opacity", seg(t, a, a + 0.1) * (1 - out));
        });
        cap.textContent = pinned >= 0 ? IT[pinned][2] : last === 4 && t > cells[4].lit + 1.7 && t < 11 ? "Five of the seven list a free way in" : last < 0 || t >= 11 ? "Seven tools, one slot each" : IT[last][2];
      };
    },
  };

  /* ---- 4. a split flap departure board: reason on the left, tool on the right ---- */
  SC.board = {
    dur: 12.6, still: 10.6,
    build(svg) {
      txt(svg, 44, 62, "Pick by the reason you are leaving", { "font-size": 32, "font-weight": 700 });
      const ROWS = [
        ["SAME KIND OF EDITOR", "DEVIN DESKTOP"],
        ["AGENTS AS A TEAM", "MUNDER DIFFLIN"],
        ["OPEN SOURCE EDITOR", "ZED"],
        ["STAY IN VS CODE", "CLINE OR CODEX IDE EXTENSION"],
        ["ANY MODEL", "OPENCODE"],
        ["HAND OVER WHOLE TASKS", "CLAUDE CODE"],
        ["TEAM LIVES ON GITHUB", "GITHUB COPILOT"],
      ];
      const NL = 21, NR = 28, N = NL + 1 + NR, X0 = 30, P = 740 / N, TW = P - 1.6, Y0 = 126, RP = 58, TH = 46, ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      txt(svg, X0, 108, "Your reason", { "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, X0 + (NL + 1) * P, 108, "The tool", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const tiles = [];
      ROWS.forEach(([a, b], r) => {
        const s = a.padEnd(NL, " ") + " " + b.padEnd(NR, " ");
        for (let c = 0; c < N; c++) {
          if (c === NL) continue;
          const x = X0 + c * P, y = Y0 + r * RP;
          const bg = el("rect", { x, y, width: TW, height: TH, rx: 3.5, fill: SOFT }, svg);
          el("path", { d: `M${x} ${y + TH / 2} h${TW}`, stroke: "#fff", "stroke-width": 1.5 }, svg);
          const tx = txt(svg, x + TW / 2, y + TH / 2 + 7, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
          tiles.push({ bg, tx, ch: s[c], right: c > NL, a: 0.5 + r * 1.25, z: 0.5 + r * 1.25 + 0.45 + c * 0.018, c, r, cur: "", col: "" });
        }
      });
      txt(svg, 400, 562, "Our view. Read your row.", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      return (t) => {
        const gone = t >= 12;
        tiles.forEach((k) => {
          const done = t >= k.z && !gone, ch = gone || t < k.a ? " " : done ? k.ch : ABC[(Math.floor(t * 15) + k.c * 7 + k.r * 11) % 26];
          const col = done && k.right && k.ch !== " " ? YEL : SOFT;
          if (ch !== k.cur) { k.cur = ch; k.tx.textContent = ch === " " ? "" : ch; }
          if (col !== k.col) { k.col = col; k.bg.setAttribute("fill", col); }
        });
      };
    },
  };

  /* ---- title card, 16 by 9: seven doors, one ajar ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 96, "Seven options compared", { "font-size": 26, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 186, "Cursor alternatives", { "font-size": 82, "font-weight": 700 });
      const tl = svg.lastChild.getComputedTextLength() || 740;
      el("path", { d: `M68 216 H${60 + tl}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 66, 274, "Checked 8 Oct 2026", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const COLS = [SKY, LIL, MINT, BLUE, YEL, SKY, LIL], T = 332, H = 150, W = 100;
      el("path", { d: `M40 ${T + H} H920`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      COLS.forEach((c, i) => {
        const x = 64 + i * 122;
        if (i === 4) {
          el("rect", { x, y: T, width: W, height: H, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
          el("path", { d: `M${x} ${T} L${x + 62} ${T - 14} V${T + H + 14} L${x} ${T + H} Z`, fill: c, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
          el("circle", { cx: x + 48, cy: T + H / 2 + 4, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
          return;
        }
        el("rect", { x, y: T, width: W, height: H, fill: c, stroke: INK, "stroke-width": 3 }, svg);
        el("rect", { x: x + 16, y: T + 16, width: W - 32, height: 48, rx: 4, fill: "none", stroke: INK, "stroke-width": 2 }, svg);
        el("rect", { x: x + 16, y: T + 80, width: W - 32, height: 54, rx: 4, fill: "none", stroke: INK, "stroke-width": 2 }, svg);
        el("circle", { cx: x + W - 9, cy: T + 72, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      });
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
