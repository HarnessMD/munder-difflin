/* Bright coded scenes for "Every Agent on Our Floor". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame.
   To add a scene: write SC.NAME = { dur, still, build(svg, api) { ...; return (t, now) => {} } } above the player. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
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
  /* ease that lands a little past the mark and settles; c sets how far past */
  const bk = (x, c) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  /* scene heading on the left, the tap hint on the right; the heading shrinks if the two would touch */
  const head = (svg, s, hint) => {
    const a = txt(svg, 44, 62, s, { "font-size": 32, "font-weight": 700 });
    const b = txt(svg, 756, 60, hint, { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
    const room = 756 - b.getComputedTextLength() - 28 - 44, w = a.getComputedTextLength();
    if (w > room) a.setAttribute("font-size", Math.floor((32 * room) / w));
  };
  const star = (p, x, y, r, fill) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, p);
  /* shrink a label until it fits the room it has */
  const fit = (n, room) => { const w = n.getComputedTextLength(), f = parseFloat(n.getAttribute("font-size")); if (w > room) n.setAttribute("font-size", Math.floor((f * room * 10) / w) / 10); return n; };
  /* set the caption strip, at 20 unless the line is too long for the strip */
  const say = (n, s, room = 690) => { if (n._s === s) return; n._s = s; n.textContent = s; n.setAttribute("font-size", 20); fit(n, room); };

  const SC = {};

  /* ---- floor: eleven desks seen from above; a name card drops on each and its plant grows a leaf ---- */
  SC.floor = {
    dur: 14, still: 12.2,
    build(svg, api) {
      head(svg, "What does the whole floor look like?", "tap a desk");
      const SEATS = [
        ["Orchestrator", "Orchestrator: takes your orders, splits them into jobs", YEL],
        ["Mission control", "Mission control: keeps one page of company numbers fresh", SKY],
        ["Community lead", "Community lead: a digest and a demand list", MINT],
        ["Growth", "Growth: researches and writes this blog", LIL],
        ["Motion graphics", "Motion graphics: launch videos and animation loops", BLUE],
        ["Research", "Research: a daily scout report, a link for every claim", MINT],
        ["Founder's office", "Founder's office: a morning briefing, Slack replies, first drafts", YEL],
        ["Scrum master", "Scrum master: keeps the task board readable", SKY],
        ["Engineering lead", "Engineering lead: plans the work and gates every piece", LIL],
        ["Engineers", "Engineers: build the pieces", BLUE],
        ["Designer", "Designer: draws every new screen before any code", MINT],
      ];
      const X0 = 36, PW = 182, Y0 = 100, PH = 131, DH = 92, ANG = [-58, 62, 180, 0, 122, -120];
      const A = SEATS.map((s, i) => 0.9 + i * 0.72);
      el("rect", { x: 26, y: 88, width: 748, height: 408, rx: 16, fill: SOFT }, svg);
      let tiles = "";
      for (let i = 1; i < 16; i++) tiles += `M${26 + i * 46.75} 90 V494 `;
      for (let i = 1; i < 8; i++) tiles += `M28 ${88 + i * 51} H772 `;
      el("path", { d: tiles, stroke: "#fff", "stroke-width": 2 }, svg);
      let pinned = -1;
      const desks = SEATS.map(([name, line, col], i) => {
        const wide = i === 9, c = i < 8 ? i % 4 : i === 8 ? 0 : i === 9 ? 1 : 3, r = i < 8 ? (i / 4) | 0 : 2;
        const x = X0 + c * PW + 6, y = Y0 + r * PH, w = (wide ? 2 : 1) * PW - 12, xs = wide ? [40, 112, 184, 256] : [40], px = w - 30, py = 27;
        const g = el("g", { transform: `translate(${x} ${y})` }, svg);
        el("rect", { x: -5, y: -5, width: w + 10, height: DH + 32, rx: 14, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const chairs = xs.map((cx) => {
          const ch = el("g", {}, g);
          el("rect", { x: -19, y: -14, width: 38, height: 28, rx: 9, fill: col, stroke: INK, "stroke-width": 2.5 }, ch);
          el("rect", { x: -15, y: 11, width: 30, height: 8, rx: 4, fill: INK }, ch);
          return { ch, cx };
        });
        el("rect", { width: w, height: DH, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        xs.forEach((lx) => {
          el("rect", { x: lx - 21, y: 12, width: 42, height: 30, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
          el("rect", { x: lx - 21, y: 12, width: 42, height: 11, rx: 4, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
          el("path", { d: `M${lx - 13} 30 H${lx + 13} M${lx - 13} 36 H${lx + 13}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round", "stroke-dasharray": "1 5" }, g);
        });
        if (!wide) {
          el("rect", { x: 76, y: 13, width: 26, height: 30, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2.5, transform: `rotate(${(i % 3) * 5 - 5} 89 28)` }, g);
          el("path", { d: "M82 22 H96 M82 28 H96 M82 34 H91", stroke: INK, "stroke-width": 2, "stroke-linecap": "round", transform: `rotate(${(i % 3) * 5 - 5} 89 28)` }, g);
        }
        el("circle", { cx: px, cy: py, r: 12, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
        const leaves = ANG.map(() => el("path", { d: "M0 0 Q8 -10 0 -21 Q-8 -10 0 0 Z", fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g));
        el("circle", { cx: px, cy: py, r: 3, fill: INK }, g);
        const card = el("g", {}, g);
        el("rect", { x: -79, y: -17, width: 158, height: 34, rx: 6, fill: col, stroke: INK, "stroke-width": 2.5 }, card);
        fit(txt(card, 0, 6.5, name, { "text-anchor": "middle", "font-size": 18, "font-weight": 700 }), 144);
        const d = { card, leaves, chairs, cx: w / 2, cy: DH - 23, px, py, kt: -99, extra: 0 };
        button(g, line, () => { d.extra = d.extra >= 3 ? 0 : d.extra + 1; d.kt = api.now(); pinned = i; api.poke(); });
        return d;
      });
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 13.2, 13.7), idle = io(seg(t, 9.2, 10.2)) * (1 - out);
        let cur = -1;
        desks.forEach((d, i) => {
          const a = A[i], k = seg(t, a, a + 0.42), e = cl(bk(k, 1.6), 0, 1.2), tau = t - a - 0.42, w = now - d.kt;
          const rot = (1 - oc(k)) * (i % 2 ? 16 : -16) + (tau > 0 ? 3 * Math.exp(-5 * tau) * Math.sin(16 * tau) : 0);
          d.card.setAttribute("transform", `translate(${d.cx} ${(d.cy - 34 * (1 - oc(k))).toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${lerp(1.9, 1, e).toFixed(3)})`);
          d.card.setAttribute("opacity", (seg(t, a, a + 0.12) * (1 - out)).toFixed(2));
          d.leaves.forEach((lf, j) => {
            const g = j < 2 ? 1 : j === 2 ? cl(bk(seg(t, a + 0.35, a + 0.95), 2.4), 0, 1.5) * (1 - out) : j - 3 >= d.extra ? 0 : j - 3 === d.extra - 1 ? cl(bk(seg(w, 0, 0.6), 2.4), 0, 1.5) : 1;
            lf.setAttribute("transform", `translate(${d.px} ${d.py}) rotate(${(ANG[j] + Math.sin(now * 1.3 + i * 0.9 + j * 2.1) * 4).toFixed(2)}) scale(${g.toFixed(3)})`);
          });
          /* one chair is left spinning */
          d.chairs.forEach(({ ch, cx }) => ch.setAttribute("transform", `translate(${cx} ${(DH + 4 + (i === 5 ? 5 * idle : 0)).toFixed(2)}) rotate(${(i === 5 ? 22 * idle * Math.sin(now * 0.9 + 1.1) : 0).toFixed(2)})`));
          if (t >= a && !out) cur = i;
        });
        const pw = pinned >= 0 ? now - desks[pinned].kt : 99;
        say(cap, pw < 4 ? SEATS[pinned][1] : cur < 0 ? "Fourteen seats, and nobody shares a job" : t >= 9.4 ? "Fourteen agents, each with one job" : SEATS[cur][1], 700);
      };
    },
  };

  /* ---- clock: the hand sweeps one day; a card slides out from behind the clock for each schedule ---- */
  SC.clock = {
    dur: 14, still: 12,
    build(svg, api) {
      head(svg, "Which agents work on a clock?", "tap the clock");
      const CX = 400, CY = 284, R = 128;
      const hourAt = (t) => { const p = seg(t, 1, 9.4); return 24 * p * p * (3 - 2 * p); };
      const timeOf = (H) => { let a = 1, b = 9.4; for (let i = 0; i < 28; i++) { const m = (a + b) / 2; if (hourAt(m) < H) a = m; else b = m; } return b; };
      const C = [
        [152, 154, "09:00", "briefing", YEL, [9], 0, "Andy, 09:00: a morning briefing"],
        [152, 420, "09:30 and 21:30", "blog runs", MINT, [9.5, 21.5], 0.3, "Jim, 09:30 and 21:30: one pull request per run"],
        [648, 420, "every 6 hours", "dashboard", SKY, [6, 12, 18, 24], 0, "Ryan, every 6 hours: the company dashboard"],
        [648, 154, "every 12 hours", "task board", LIL, [12, 24], 0, "Meredith, every 12 hours: keeps the task board readable"],
      ];
      C.forEach(([x, y]) => el("rect", { x: x - 118, y: y - 52, width: 236, height: 104, rx: 14, fill: "none", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 10" }, svg));
      const cards = C.map(([x, y, a, b, col, hrs, lag, line]) => {
        const g = el("g", {}, svg);
        el("rect", { x: -118, y: -52, width: 236, height: 104, rx: 14, fill: col, stroke: INK, "stroke-width": 3 }, g);
        fit(txt(g, -98, -9, a, { "font-size": 25, "font-weight": 700 }), 196);
        txt(g, -98, 27, b, { "font-size": 22, "font-weight": 500 });
        const pips = hrs.map((H, j) => ({ c: el("circle", { cx: 100 - (hrs.length - 1 - j) * 19, cy: 20, r: 6.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g), at: timeOf(H) + lag }));
        return { g, x, y, t0: timeOf(hrs[0]) - 0.6 + lag, pips, line };
      });
      const clock = el("g", {}, svg);
      el("circle", { cx: CX, cy: CY, r: R + 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, clock);
      const pen = el("g", {}, clock);
      el("path", { d: "M0 0 V52", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, pen);
      el("circle", { cy: 52, r: 15, fill: YEL, stroke: INK, "stroke-width": 3 }, pen);
      el("circle", { cx: CX, cy: CY - R - 14, r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, clock);
      el("circle", { cx: CX, cy: CY, r: R + 11, fill: BLUE, stroke: INK, "stroke-width": 3 }, clock);
      el("circle", { cx: CX, cy: CY, r: R - 3, fill: "#fff", stroke: INK, "stroke-width": 3 }, clock);
      /* the tick at seven was put on by eye */
      for (let i = 0; i < 12; i++) el("path", { d: `M${CX} ${CY - R + 11} V${CY - R + (i % 3 ? 25 : 37)}`, stroke: INK, "stroke-width": i % 3 ? 3 : 6, "stroke-linecap": "round", transform: `rotate(${i * 30} ${CX} ${CY}) rotate(${i === 7 ? 16 : 0} ${CX} ${CY - R + 18})` }, clock);
      const hand = el("g", {}, clock);
      el("path", { d: `M0 18 V${-(R - 44)}`, stroke: INK, "stroke-width": 9, "stroke-linecap": "round" }, hand);
      el("circle", { cy: -(R - 44), r: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, hand);
      el("circle", { cx: CX, cy: CY, r: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, clock);
      button(clock, "Run the day again", () => api.seek(0.9));
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const tau = t - 9.4, out = seg(t, 13.2, 13.7);
        const ang = hourAt(t) * 30 + (tau > 0 ? 6 * Math.exp(-4 * tau) * Math.sin(11 * tau) : 0);
        hand.setAttribute("transform", `translate(${CX} ${CY}) rotate(${ang.toFixed(2)})`);
        pen.setAttribute("transform", `translate(${CX} ${CY + R + 8}) rotate(${(Math.sin(now * 2.6 + 0.9) * 20).toFixed(2)})`);
        let cur = -1, last = -1;
        cards.forEach((c, i) => {
          const k = seg(t, c.t0, c.t0 + 0.6), e = bk(k, 1.5);
          let bump = 0;
          c.pips.forEach((p) => {
            const w = t - p.at, on = w >= 0 && out < 1;
            p.c.setAttribute("fill", on ? INK : "#fff");
            p.c.setAttribute("r", (6.5 * (on ? 1 + 0.7 * Math.exp(-7 * w) : 1)).toFixed(2));
            if (on) bump += Math.exp(-6 * w);
          });
          tf(c.g, lerp(CX, c.x, e).toFixed(2), lerp(CY, c.y, e).toFixed(2), (lerp(0.45, 1, cl(e, 0, 1.1)) * (1 + 0.06 * bump)).toFixed(4), ((1 - oc(k)) * (i % 2 ? 10 : -10)).toFixed(2));
          c.g.setAttribute("opacity", t >= c.t0 ? (1 - out).toFixed(2) : 0);
          if (t >= c.t0 && c.t0 > last) { last = c.t0; cur = i; }
        });
        say(cap, cur < 0 || out > 0 ? "Four of ours start from a schedule" : t > 9.8 ? "Four of ours start from a schedule, with no person typing anything" : cards[cur].line, 700);
      };
    },
  };

  /* ---- gate: a drawing becomes a jigsaw piece, waits at a raised drawbridge for three checks, then joins the row ---- */
  SC.gate = {
    dur: 14, still: 12,
    build(svg, api) {
      head(svg, "Who writes the code, and who checks it?", "tap the bridge");
      const G = 400, PIECE = "M-20 -20 H20 V-6 h5 a8 8 0 1 1 0 12 h-5 V20 H-20 V6 h5 a8 8 0 1 0 0 -12 h-5 Z";
      const piece = (p, fill) => el("path", { d: PIECE, fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p);
      const water = el("path", { fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 30, y: G, width: 446, height: 54, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 604, y: G, width: 166, height: 54, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 118, 435, "draws first", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      txt(svg, 322, 435, "build to an order", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      fit(txt(svg, 687, 435, "release branch", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 }), 148);
      /* drawing board */
      el("path", { d: `M70 ${G} L104 236 M166 ${G} L132 236 M118 ${G} V250`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      const board = el("g", { transform: "translate(118 232) rotate(-7)" }, svg);
      el("rect", { x: -72, y: -92, width: 144, height: 170, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, board);
      el("rect", { x: -78, y: 78, width: 156, height: 12, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, board);
      el("rect", { x: -54, y: -76, width: 108, height: 140, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, board);
      el("path", { d: "M-40 -54 H40 M-40 -30 H8 M-40 -6 H24", stroke: SOFT, "stroke-width": 8, "stroke-linecap": "round" }, board);
      el("path", { d: "M22 72 H58 L68 75 L58 78 H22 Z", fill: SKY, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, board);
      /* tool rail and workbench */
      el("path", { d: "M240 146 H404 M262 146 V158 M300 146 V158 M385 146 V158", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      el("rect", { x: 254, y: 156, width: 16, height: 96, rx: 3, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      el("path", { d: "M254 172 h7 M254 188 h7 M254 204 h7 M254 220 h7 M254 236 h7", stroke: INK, "stroke-width": 2 }, svg);
      el("path", { d: "M296 156 V236 H360 Z M308 192 V224 H334 Z", fill: SKY, "fill-rule": "evenodd", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 380, y: 156, width: 10, height: 76, rx: 4, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      el("circle", { cx: 385, cy: 240, r: 11, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      el("circle", { cx: 385, cy: 240, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
      [254, 378].forEach((x) => el("rect", { x, y: 344, width: 12, height: 56, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg));
      el("path", { d: "M266 376 H378", stroke: INK, "stroke-width": 3 }, svg);
      const bench = el("rect", { x: 238, y: 330, width: 170, height: 15, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const ham = el("g", {}, svg);
      el("rect", { x: -50, y: -3, width: 50, height: 6, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, ham);
      el("rect", { x: -62, y: -13, width: 16, height: 22, rx: 3, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, ham);
      /* the gate: a sign with three lights on a post, and the bridge it holds up */
      el("rect", { x: 462, y: 248, width: 16, height: 152, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      /* a lifebuoy on the post, in case a piece falls in */
      el("circle", { cx: 470, cy: 318, r: 13, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("circle", { cx: 470, cy: 318, r: 5, fill: BLUE, stroke: INK, "stroke-width": 2 }, svg);
      el("path", { d: "M470 305 V313 M470 323 V331 M457 318 H465 M475 318 H483", stroke: INK, "stroke-width": 2 }, svg);
      el("rect", { x: 462, y: 98, width: 290, height: 150, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 486, 134, "the gate", { "font-size": 26, "font-weight": 700 });
      el("path", { d: "M486 148 H728", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 9" }, svg);
      const L = [5.3, 6.1, 6.9];
      const lamps = ["reads the diff", "own tests", "full suite"].map((s, i) => {
        txt(svg, 522, 178 + i * 29, s, { "font-size": 22, "font-weight": 600 });
        return el("circle", { cx: 498, cy: 171 + i * 29, r: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      });
      const br = el("g", {}, svg);
      el("rect", { x: 468, y: 258, width: 146, height: 152, rx: 12, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, br);
      const rope = el("path", { stroke: INK, "stroke-width": 2, "stroke-linecap": "round", "stroke-dasharray": "2 6" }, br);
      const deck = el("g", {}, br);
      el("rect", { x: 0, y: -8, width: 130, height: 11, rx: 4, fill: YEL, stroke: INK, "stroke-width": 3 }, deck);
      el("path", { d: "M26 -8 V3 M52 -8 V3 M78 -8 V3 M104 -8 V3", stroke: INK, "stroke-width": 2 }, deck);
      button(br, "Send another piece to the gate", () => api.seek(0.9));
      /* the release branch: a row of pieces with room for one more */
      [[684, BLUE], [724, LIL]].forEach(([x, c]) => piece(el("g", { transform: `translate(${x} ${G - 20})` }, svg), c));
      const sp = el("g", {}, svg); star(sp, 0, 0, 13, "#fff");
      /* the sheet that leaves the board, and the piece it becomes */
      const sheet = el("g", {}, svg);
      el("rect", { x: -54, y: -70, width: 108, height: 140, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sheet);
      const parts = [
        el("rect", { x: -42, y: -58, width: 84, height: 18, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 2 }, sheet),
        el("rect", { x: -42, y: -30, width: 38, height: 44, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2 }, sheet),
        el("path", { d: "M6 -24 H42 M6 -9 H42 M6 6 H28", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, sheet),
        el("rect", { x: -42, y: 28, width: 46, height: 20, rx: 10, fill: MINT, stroke: INK, "stroke-width": 2 }, sheet),
      ];
      const pc = el("g", {}, svg); piece(pc, YEL);
      const HOPS = [[4.0, 4.7, 420, G - 20, 34], [8.8, 9.3, 506, G - 28, 22], [9.3, 9.8, 586, G - 28, 22], [9.8, 10.4, 644, G - 20, 28]];
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 13.1, 13.5);
        let w = `M476 456 V${(424 + 3 * Math.sin(now * 2.2)).toFixed(1)}`;
        for (let x = 492; x <= 604; x += 16) w += ` L${x} ${(424 + 3 * Math.sin(x * 0.11 + now * 2.2)).toFixed(1)}`;
        water.setAttribute("d", w + " V456 Z");
        /* sheet: drawn on the board, then flies to the bench */
        parts.forEach((p, i) => p.setAttribute("opacity", seg(t, 0.25 + i * 0.26, 0.5 + i * 0.26).toFixed(2)));
        const f = io(seg(t, 1.5, 2.6)), taps = t > 2.6 && t < 3.5 ? Math.abs(Math.sin(((t - 2.6) / 0.3) * Math.PI)) : 0;
        tf(sheet, lerp(117.3, 300, f).toFixed(2), (lerp(226, 296, f) - 76 * Math.sin(Math.PI * f) + (taps ? (1 - taps) * 3 : 0)).toFixed(2), lerp(1, 0.4, f).toFixed(4), (lerp(-7, 0, f) + 16 * Math.sin(Math.PI * f)).toFixed(2));
        sheet.setAttribute("opacity", (1 - seg(t, 3.15, 3.35)).toFixed(2));
        tf(ham, 402, 323, 1, (50 * taps).toFixed(2));
        bench.setAttribute("y", (330 + (taps && taps < 0.25 ? 1.5 : 0)).toFixed(1));
        /* the piece */
        let x = 300, y = 310, r = 0;
        HOPS.forEach(([a, b, X, Y, H]) => { const p = seg(t, a, b); if (p > 0) { const e = p < 1 ? p : 1; x = lerp(x, X, e); y = lerp(y, Y, e) - H * 4 * e * (1 - e); r = 9 * Math.sin(2 * Math.PI * e); } });
        const t1 = t - 4.7, t2 = t - 10.4;
        if (t1 > 0 && t < 8.8) x -= 6 * Math.exp(-7 * t1) * Math.abs(Math.sin(13 * t1));
        if (t2 > 0) r = 5 * Math.exp(-6 * t2) * Math.sin(18 * t2);
        tf(pc, x.toFixed(2), y.toFixed(2), cl(bk(seg(t, 3.2, 3.65), 2.2), 0, 1.4).toFixed(3), r.toFixed(2));
        pc.setAttribute("opacity", (1 - out).toFixed(2));
        lamps.forEach((c, i) => { const v = t - L[i], on = v >= 0 && t < 13.2; c.setAttribute("fill", on ? MINT : SOFT); c.setAttribute("r", (10 * (on ? 1 + 0.5 * Math.exp(-7 * v) : 1)).toFixed(2)); });
        const k = io(seg(t, 7.6, 8.5)) * (1 - io(seg(t, 13.2, 13.9))), tb = t - 8.5;
        const ang = -76 * (1 - k) - (tb > 0 && t < 13.2 ? 7 * Math.exp(-5 * tb) * Math.abs(Math.sin(11 * tb)) : 0), ar = (ang * Math.PI) / 180;
        deck.setAttribute("transform", `translate(478 398) rotate(${ang.toFixed(2)})`);
        rope.setAttribute("opacity", (1 - k).toFixed(2));
        rope.setAttribute("d", `M478 258 L${(478 + 124 * Math.cos(ar)).toFixed(1)} ${(394 + 124 * Math.sin(ar)).toFixed(1)}`);
        tf(sp, 646, 334, (cl(bk(seg(t, 10.4, 10.9), 2.6), 0, 1.5) * (1 - out) * (1 + 0.12 * Math.sin(now * 3))).toFixed(3), (now * 20).toFixed(1));
        say(cap, t < 1.5 || out > 0 ? "Pam draws first: every new screen is an HTML page" : t < 4 ? "Builders build to an order" : t < 5.3 ? "Kevin is the gate" : t < 10.4 ? "He reads the diff, writes his own tests, runs the full suite" : "He merges into a release branch, never into main", 700);
      };
    },
  };

  /* ---- title card, 16 by 9: a desk bell that somebody keeps ringing ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.2, still: 0.55,
    build(svg) {
      txt(svg, 66, 112, "AI agent use cases from a real company", { "font-size": 25, "font-weight": 500, fill: MUTE });
      txt(svg, 62, 204, "Every Agent", { "font-size": 82, "font-weight": 700 });
      const ti = txt(svg, 62, 294, "on Our Floor", { "font-size": 82, "font-weight": 700 });
      el("path", { d: `M68 324 H${Math.round(56 + ti.getComputedTextLength())}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 362, width: 312, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 218, 399, "Checked 14 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      el("path", { d: "M70 478 C190 440 300 508 420 468 S560 470 620 452", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 16" }, svg);
      el("circle", { cx: 70, cy: 478, r: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      const c = el("g", {}, svg), bell = el("g", {}, c);
      el("rect", { x: -7, y: -92, width: 14, height: 40, fill: "#fff", stroke: INK, "stroke-width": 3 }, bell);
      const knob = el("rect", { x: -24, y: -112, width: 48, height: 20, rx: 10, fill: LIL, stroke: INK, "stroke-width": 3 }, bell);
      el("path", { d: "M-104 72 C-104 -22 -58 -64 0 -64 C58 -64 104 -22 104 72 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bell);
      el("path", { d: "M-70 26 C-66 -10 -44 -32 -16 -40", stroke: "#fff", "stroke-width": 9, fill: "none", "stroke-linecap": "round" }, bell);
      el("rect", { x: -124, y: 72, width: 248, height: 24, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, c);
      el("path", { d: "M-150 110 H150", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, c);
      const ding = el("path", { d: "M122 -46 L152 -63 M134 -4 L164 -7 M92 -86 L110 -116 M-122 -46 L-152 -63 M-134 -4 L-164 -7 M-92 -86 L-110 -116", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, c);
      star(svg, 626, 132, 15, SKY); star(svg, 880, 468, 17, MINT); star(svg, 596, 396, 12, YEL);
      return (t) => {
        const press = Math.sin(Math.PI * seg(t, 0.1, 0.5)), tau = t - 0.3;
        knob.setAttribute("y", (-112 + 16 * press).toFixed(2));
        bell.setAttribute("transform", `rotate(${(tau > 0 ? 2.4 * Math.exp(-2.4 * tau) * Math.sin(26 * tau) : 0).toFixed(3)} 0 72)`);
        ding.setAttribute("opacity", (seg(t, 0.3, 0.42) * (1 - seg(t, 1.2, 2))).toFixed(2));
        tf(ding, 0, 0, (1 + 0.1 * oc(seg(t, 0.3, 1.2))).toFixed(3));
        tf(c, 760, 312, 0.96);
      };
    },
  };

  /* a status pill sized to its word, with or without a tick; used by the scenes below */
  const pill = (p, s, fill, tick) => {
    const g = el("g", {}, p), r = el("rect", { y: -18, height: 36, rx: 18, fill, stroke: INK, "stroke-width": 2.5 }, g);
    const w = txt(g, tick ? 12 : 0, 7, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }).getComputedTextLength() + (tick ? 54 : 34);
    r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    if (tick) el("path", { d: `M${-w / 2 + 15} 1 l6 6 l10 -13`, fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    return g;
  };
  const land = (k, c = 2.2) => cl(bk(k, c), 0, 1.5);

  /* ---- drafts: three clipboards; a pen signs the first two, the third only ever collects labels ---- */
  SC.drafts = {
    dur: 14, still: 12,
    build(svg, api) {
      head(svg, "Who deals with the outside world?", "tap the pen");
      const X = [146, 400, 654], TOP = 92, COL = [YEL, SKY, LIL], NAME = ["email draft", "pull request", "triage label"], WORD = ["sent", "merged", "labels only"], BT = [4.85, 7.45, 9.1];
      const SIG = "M-56 240 C-52 220 -40 220 -42 236 C-44 248 -30 246 -26 232 C-22 220 -12 222 -14 234 C-16 246 -2 244 2 232 C6 220 16 222 14 234 C14 244 26 244 32 232 C38 220 46 236 58 230";
      const TAGS = [[-18, 152, -4, MINT, 1.7], [14, 180, 4, YEL, 2.2], [-14, 208, 2, SKY, 8.1], [20, 236, -5, BLUE, 8.6]];
      const tag = (p, col) => {
        const g = el("g", {}, p);
        el("rect", { x: -38, y: -14, width: 76, height: 28, rx: 14, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        el("circle", { cx: -26, cy: 0, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        return g;
      };
      /* the desk edge the pen lies on */
      [344, 432].forEach((x) => el("path", { d: `M${x - 13} 432 V442 a13 13 0 0 0 26 0 V432`, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg));
      el("rect", { x: 30, y: 452, width: 740, height: 40, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 479, "a person", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const boards = X.map((x, i) => {
        const g = el("g", { transform: `translate(${x} ${TOP})` }, svg);
        el("rect", { x: -102, y: 0, width: 204, height: 300, rx: 14, fill: COL[i], stroke: INK, "stroke-width": 3 }, g);
        const sh = el("g", {}, g), b = { sh, tags: [] };
        el("rect", { x: -86, y: 16, width: 172, height: 268, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sh);
        txt(sh, 0, 70, NAME[i], { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        const faint = (d, col = LIL) => el("path", { d, stroke: col, "stroke-opacity": col === LIL ? 0.45 : 1, "stroke-width": 9, "stroke-linecap": "round" }, sh);
        if (i === 0) faint("M-64 100 H-8 M-64 124 H64 M-64 148 H64 M-64 172 H22");
        if (i === 1) { faint("M-64 100 H20 M-64 172 H48"); faint("M-64 124 H64 M-64 148 H30", MINT); }
        if (i === 2) {
          faint("M-38 100 H58 M-64 124 H30");
          el("circle", { cx: -57, cy: 100, r: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sh);
          b.tags = TAGS.map(([tx, ty, r, col, at]) => ({ g: tag(sh, col), tx, ty, r, at }));
          b.dang = tag(sh, MINT);
        } else {
          b.line = el("path", { d: "M-62 252 H62", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": "1 8" }, sh);
          b.sig = el("path", { d: SIG, fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, sh);
        }
        el("rect", { x: -40, y: -10, width: 80, height: 34, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("circle", { cx: 0, cy: 4, r: 5, fill: INK }, g);
        b.badge = pill(g, WORD[i], i === 2 ? YEL : MINT, i < 2);
        return b;
      });
      const SL = boards[0].sig.getTotalLength();
      boards.forEach((b) => b.sig && b.sig.setAttribute("stroke-dasharray", `${SL} ${SL}`));
      const at = (i, k) => { const p = boards[i].sig.getPointAtLength(cl(k) * SL); return [X[i] + p.x, TOP + p.y]; };
      const HOME = [322, 438], A0 = at(0, 0), A1 = at(0, 1), B0 = at(1, 0), B1 = at(1, 1), TILT = -55;
      const wr = (k) => lerp(k, io(k), 0.6);
      const pen = el("g", {}, svg);
      el("rect", { x: -10, y: -24, width: 156, height: 48, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, pen);
      el("rect", { x: 40, y: -12, width: 92, height: 24, rx: 11, fill: BLUE, stroke: INK, "stroke-width": 3 }, pen);
      el("path", { d: "M92 -12 V12", stroke: INK, "stroke-width": 2.5 }, pen);
      el("rect", { x: 92, y: -19, width: 36, height: 7, rx: 3.5, fill: YEL, stroke: INK, "stroke-width": 2 }, pen);
      el("rect", { x: 30, y: -11, width: 18, height: 22, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, pen);
      el("path", { d: "M0 0 L30 -10 V10 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, pen);
      el("path", { d: "M8 0 H24", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, pen);
      button(pen, "Sign the drafts again", () => api.seek(0.3));
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 13.2, 13.7);
        boards.forEach((b, i) => {
          const a = 0.25 + i * 0.35, k = seg(t, a, a + 0.45) * (1 - io(out)), v = t - a - 0.45;
          tf(b.sh, 0, (-24 * (1 - oc(k))).toFixed(2), 1, ((1 - oc(k)) * (i % 2 ? 6 : -6) + (v > 0 ? 2 * Math.exp(-5 * v) * Math.sin(14 * v) : 0)).toFixed(2));
          if (b.sig) {
            const s = wr(seg(t, i ? 5.5 : 3.8, i ? 6.4 : 4.7));
            b.sig.setAttribute("stroke-dashoffset", (SL * (1 - s)).toFixed(1));
            b.sig.setAttribute("opacity", s > 0 ? (1 - out).toFixed(2) : 0);
            b.line.setAttribute("opacity", s > 0 ? 1 : (0.6 + 0.4 * Math.sin(now * 4 + i * 2)).toFixed(2));
          }
          b.tags.forEach((g) => tf(g.g, g.tx, g.ty, (land(seg(t, g.at, g.at + 0.4), 2.4) * (1 - out)).toFixed(3), g.r));
          if (b.dang) {
            /* one label too many: it lets go and hangs off the edge */
            const w = t - 10, ang = w < 0 ? 172 : 98 + 74 * Math.exp(-2.2 * w) * Math.cos(5.5 * w) + 4 * Math.sin(now * 1.8) * seg(w, 1, 2);
            b.dang.setAttribute("transform", `translate(-76 150) rotate(${ang.toFixed(2)}) scale(${(land(seg(t, 9.8, 10.1), 2) * (1 - out)).toFixed(3)}) translate(26 0)`);
          }
          const bk2 = seg(t, BT[i], BT[i] + 0.45);
          tf(b.badge, 0, 300, land(bk2).toFixed(3), ((1 - oc(bk2)) * -10).toFixed(2));
          b.badge.setAttribute("opacity", bk2 > 0 ? (1 - out).toFixed(2) : 0);
        });
        let p = HOME, r = 0;
        if (t >= 3 && t < 3.8) { const k = io(seg(t, 3, 3.8)); p = [lerp(HOME[0], A0[0], k), lerp(HOME[1], A0[1], k) - 22 * Math.sin(Math.PI * k)]; r = TILT * k; }
        else if (t >= 3.8 && t < 4.7) { p = at(0, wr(seg(t, 3.8, 4.7))); r = TILT + 3 * Math.sin(t * 16); }
        else if (t >= 4.7 && t < 5.5) { const k = io(seg(t, 4.7, 5.5)); p = [lerp(A1[0], B0[0], k), lerp(A1[1], B0[1], k) - 18 * Math.sin(Math.PI * k)]; r = TILT; }
        else if (t >= 5.5 && t < 6.4) { p = at(1, wr(seg(t, 5.5, 6.4))); r = TILT + 3 * Math.sin(t * 16); }
        else if (t >= 6.4 && t < 7.4) { const k = io(seg(t, 6.55, 7.4)); p = [lerp(B1[0], HOME[0], k), lerp(B1[1] - 8 * oc(seg(t, 6.4, 6.6)), HOME[1], k)]; r = TILT * (1 - k); }
        else if (t >= 7.4) { const v = t - 7.4; r = -3.5 * Math.exp(-6 * v) * Math.sin(17 * v); }
        tf(pen, p[0].toFixed(2), p[1].toFixed(2), 1, r.toFixed(2));
        say(cap, t < 1.6 || out > 0 ? "Four agents read what is outside the office" : t < 3 ? "None of them takes the final step alone" : t < 5.4 ? "Replies to email are drafts" : t < 8 ? "Jim opens pull requests to this website. A person merges them." : "Angela can add labels. She cannot close or merge.", 700);
      };
    },
  };

  /* ---- temps: a tent is pitched for each job, reports done and is packed away; the house stays ---- */
  SC.temps = {
    dur: 15.2, still: 11.3,
    build(svg, api) {
      head(svg, "Not every job deserves a desk", "tap a job");
      const SX = [118, 290, 462], G = 440, COL = [SKY, LIL, YEL], T = [0.4, 4.1, 7.8], TENT = "M0 -165 L75 0 H-75 Z";
      const JOB = [["run the", "test suite"], ["fix one", "release bug"], ["free", "disk space"]];
      const LINE = ["Run the test suite and write an honest report", "Fix one release bug", "Free disk space on a laptop"];
      el("rect", { x: 30, y: G, width: 740, height: 46, rx: 8, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      /* the house, with its chimney going */
      const smoke = [0, 1, 2].map(() => el("circle", { fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg));
      el("rect", { x: 700, y: 196, width: 24, height: 60, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M552 268 L656 176 L760 268 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 570, y: 268, width: 172, height: 172, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 578, y: 282, width: 156, height: 40, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      fit(txt(svg, 656, 309, "lasting agent", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 }), 140);
      el("path", { d: "M634 440 V372 a22 22 0 0 1 44 0 V440 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("circle", { cx: 668, cy: 402, r: 3.5, fill: INK }, svg);
      [584, 692].forEach((x) => {
        el("rect", { x, y: 358, width: 34, height: 40, rx: 4, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);
        el("path", { d: `M${x + 17} 358 V398 M${x} 378 H${x + 34}`, stroke: INK, "stroke-width": 2 }, svg);
      });
      const spots = SX.map((x, i) => {
        el("path", { d: `M${x} 186 V${G}`, stroke: INK, "stroke-width": 3 }, svg);
        el("path", { d: TENT, transform: `translate(${x} ${G})`, fill: SOFT, stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 10" }, svg);
        const tk = el("g", { transform: `translate(${x} 150)` }, svg);
        el("rect", { x: -81, y: -46, width: 162, height: 126, rx: 14, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, tk);
        el("rect", { x: -75, y: -40, width: 150, height: 76, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, tk);
        el("circle", { cx: 0, cy: -40, r: 6, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, tk);
        JOB[i].forEach((s, j) => txt(tk, 0, -7 + j * 25, s, { "text-anchor": "middle", "font-size": 21, "font-weight": 700 }));
        el("rect", { x: -50, y: 50, width: 100, height: 14, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tk);
        const bar = el("rect", { x: -47, y: 53, width: 0, height: 8, rx: 4, fill: MINT }, tk), done = pill(tk, "done", MINT, true);
        button(tk, `Start a temp to ${JOB[i].join(" ")}`, () => api.seek(T[i]));
        return { x, bar, done };
      });
      spots.forEach((s, i) => {
        const tent = (s.tent = el("g", {}, svg));
        el("path", { d: "M-46 -64 L-82 0 M46 -64 L82 0", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tent);
        el("path", { d: TENT, fill: COL[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tent);
        el("path", { d: "M0 -112 L26 0 H-26 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tent);
        el("path", { d: "M0 -112 V0", stroke: INK, "stroke-width": 2 }, tent);
        el("circle", { cx: 0, cy: -165, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tent);
      });
      spots.forEach((s, i) => {
        const bag = (s.bag = el("g", {}, svg));
        el("path", { d: "M-12 -30 Q0 -47 12 -30", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, bag);
        el("rect", { x: -36, y: -30, width: 72, height: 30, rx: 13, fill: COL[i], stroke: INK, "stroke-width": 3 }, bag);
        el("path", { d: "M-14 -30 V0 M14 -30 V0", stroke: INK, "stroke-width": 2.5 }, bag);
      });
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 14.4, 14.9);
        smoke.forEach((c, j) => {
          const p = (now * 0.3 + j / 3) % 1;
          c.setAttribute("cx", (712 + 9 * Math.sin(p * 5 + j * 2)).toFixed(1)); c.setAttribute("cy", (186 - 70 * p).toFixed(1));
          c.setAttribute("r", (5 + 9 * p).toFixed(1)); c.setAttribute("opacity", (cl(p * 6) * (1 - p * p)).toFixed(2));
        });
        let cur = -1, line = "";
        spots.forEach((s, i) => {
          /* the third job took three goes, so its tent does too */
          const u = t - T[i], D = i === 2 ? 1.45 : 0.45, w0 = 0.7 + D, w1 = w0 + 0.9, f0 = w1 + 0.6, l0 = f0 + 0.3, l1 = l0 + 0.7;
          const kin = oc(seg(u, 0, 0.7)), ko = seg(u, l0, l1), early = u < w0;
          const bx = early ? lerp(-50, s.x, kin) : lerp(s.x, -50, ko * ko * ko);
          const hop = early ? 12 * Math.abs(Math.sin(kin * Math.PI * 3)) * (1 - kin) : 0;
          const bs = u <= 0 || u >= l1 ? 0 : early ? 1 - seg(u, 0.7, 0.85) : land(seg(u, f0 + 0.1, l0), 2);
          tf(s.bag, bx.toFixed(2), (G - hop).toFixed(2), bs.toFixed(3), (early ? 8 * Math.sin(kin * Math.PI * 3) * (1 - kin) : -9 * ko).toFixed(2));
          let h = 0;
          if (u >= 0.7 && u < f0) {
            const a = 0.7;
            if (i < 2) h = bk(seg(u, a, a + D), 1.8);
            else h = u < a + 0.3 ? 0.72 * oc(seg(u, a, a + 0.3)) : u < a + 0.55 ? lerp(0.72, 0.22, io(seg(u, a + 0.3, a + 0.55))) : u < a + 0.85 ? lerp(0.22, 0.86, oc(seg(u, a + 0.55, a + 0.85))) : u < a + 1.05 ? lerp(0.86, 0.28, io(seg(u, a + 0.85, a + 1.05))) : lerp(0.28, 1, bk(seg(u, a + 1.05, a + D), 1.8));
          } else if (u >= f0 && u < f0 + 0.3) { const k = seg(u, f0, f0 + 0.3); h = 1 - k * k; }
          const jig = u > w0 && u < w1 ? 1.1 * Math.sin(u * 30) : 0, joy = u >= w1 && u < w1 + 0.35 ? 9 * Math.sin(Math.PI * seg(u, w1, w1 + 0.35)) : 0;
          s.tent.setAttribute("transform", `translate(${s.x} ${(G - joy).toFixed(2)}) rotate(${jig.toFixed(2)}) scale(${(1 + 0.2 * (1 - cl(h))).toFixed(3)} ${Math.max(h, 0.001).toFixed(3)})`);
          s.tent.setAttribute("opacity", h > 0.01 ? 1 : 0);
          s.bar.setAttribute("width", (94 * (u >= w1 ? 1 : io(seg(u, w0, w1))) * (1 - out)).toFixed(1));
          tf(s.done, 0, 57, (land(seg(u, w1, w1 + 0.4)) * (1 - out)).toFixed(3));
          if (u >= 0) { cur = i; line = u < w1 ? LINE[i] : u < l1 ? "Removed when it reports done" : ""; }
        });
        say(cap, cur < 0 || out > 0 || (cur < 2 && !line) ? "A temp is started for one job" : line || "A temp is started for one job and removed when it reports done", 700);
      };
    },
  };

  /* ---- relay: a capsule goes outbox, the app, inbox through a tube; "done" comes back and the outboxes shut ---- */
  SC.relay = {
    dur: 13.5, still: 11.4,
    build(svg, api) {
      head(svg, "How does work move between them?", "tap the outbox");
      const P1 = "M96 200 H236 C300 200 292 134 340 134 C372 134 370 200 370 252 L430 348 C430 404 480 410 564 410 H704";
      const P2 = "M704 200 H564 C500 200 508 134 460 134 C428 134 430 200 430 252 L370 348 C370 404 320 410 236 410 H96";
      [[135, LIL, 12], [665, SKY, 88]].forEach(([cx, col, tab]) => {
        el("rect", { x: cx - 95 + tab, y: 104, width: 90, height: 40, rx: 9, fill: col, stroke: INK, "stroke-width": 3 }, svg);
        el("rect", { x: cx - 95, y: 124, width: 190, height: 356, rx: 16, fill: col, stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, cx, 250, "outbox", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        txt(svg, cx, 460, "inbox", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        /* a drawer for the memory file */
        el("rect", { x: cx - 62, y: 280, width: 124, height: 70, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
        el("path", { d: `M${cx - 16} 315 H${cx + 16}`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      });
      const tube = (d) => {
        el("path", { d, fill: "none", stroke: INK, "stroke-width": 38, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
        return el("path", { d, fill: "none", stroke: "#fff", "stroke-width": 32, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      };
      const t1 = tube(P1), t2 = tube(P2), L1 = t1.getTotalLength(), L2 = t2.getTotalLength();
      const capsule = (col, word) => {
        const g = el("g", {}, svg), w = word ? 66 : 52;
        el("rect", { x: -w / 2, y: -13, width: w, height: 26, rx: 13, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        if (word) txt(g, 0, 5.5, word, { "text-anchor": "middle", "font-size": 16, "font-weight": 700 });
        else {
          el("rect", { x: -11, y: -8, width: 22, height: 16, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
          el("path", { d: "M-6 -2 H6 M-6 3 H2", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g);
        }
        return g;
      };
      const c1 = capsule(BLUE), c2 = capsule(MINT, "done");
      [[230, 200], [570, 200], [230, 410], [570, 410]].forEach(([x, y]) => el("rect", { x: x - 6, y: y - 23, width: 12, height: 46, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, svg));
      const flap = () => {
        const g = el("g", {}, svg);
        el("rect", { x: -5, y: 0, width: 10, height: 38, rx: 4, fill: INK }, g);
        el("circle", { r: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
        return g;
      };
      const v1 = flap(), v2 = flap();
      const app = el("g", {}, svg);
      el("rect", { x: -84, y: -60, width: 168, height: 120, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, app);
      txt(app, 0, -6, "the app", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      const light = el("circle", { cx: 0, cy: 28, r: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, app);
      const tick = el("path", { d: "M-6 28 l4.5 5 l8 -10", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, app);
      const sp = el("g", {}, svg); star(sp, 0, 0, 15, "#fff");
      const file = el("g", {}, svg);
      el("path", { d: "M-15 -19 H7 L15 -11 V19 H-15 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, file);
      el("path", { d: "M7 -19 V-11 H15 M-8 -3 H8 M-8 5 H4", fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, file);
      const hit = el("g", {}, svg);
      el("rect", { x: 66, y: 172, width: 176, height: 90, rx: 14, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, hit);
      button(hit, "Send a note from the outbox", () => api.seek(0.3));
      const put = (g, path, L, s, flip, sc) => {
        const p = path.getPointAtLength(s), a = path.getPointAtLength(Math.max(0, s - 1)), b = path.getPointAtLength(Math.min(L, s + 1));
        tf(g, p.x.toFixed(2), p.y.toFixed(2), sc.toFixed(3), ((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + (flip ? 180 : 0)).toFixed(2));
        return p;
      };
      const near = (p, on) => (on && Math.abs(p.x - 400) < 80 ? cl(1 - Math.abs(p.y - 300) / 75) : 0);
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 12.7, 13.2), vis = 1 - out;
        /* a small file drops into the outbox and becomes a capsule */
        const fk = seg(t, 0.9, 1.4);
        tf(file, 135, lerp(100, 200, fk * fk).toFixed(2), (land(seg(t, 0.4, 0.75), 2) * lerp(1, 0.55, fk)).toFixed(3), (-8 * Math.sin(Math.PI * fk)).toFixed(2));
        file.setAttribute("opacity", (1 - seg(t, 1.3, 1.42)).toFixed(2));
        const s1 = t < 2.4 ? 40 - 9 * Math.sin(Math.PI * seg(t, 2.05, 2.4)) : lerp(40, L1 - 40, bk(seg(t, 2.4, 4.3), 0.8));
        const s2 = t < 6.6 ? 40 - 9 * Math.sin(Math.PI * seg(t, 6.25, 6.6)) : lerp(40, L2 - 40, bk(seg(t, 6.6, 8.3), 0.8));
        const a = put(c1, t1, L1, s1, false, land(seg(t, 1.35, 1.75), 2)), b = put(c2, t2, L2, s2, true, land(seg(t, 5.6, 6), 2));
        c1.setAttribute("opacity", vis.toFixed(2)); c2.setAttribute("opacity", vis.toFixed(2));
        const pulse = Math.max(near(a, t > 2.4 && t < 4.3), near(b, t > 6.6 && t < 8.3)), shut = seg(t, 8.8, 9.2) * vis;
        tf(app, 400, 300, (1 + 0.06 * pulse).toFixed(4), (1.6 * pulse * Math.sin(t * 40)).toFixed(2));
        light.setAttribute("fill", pulse > 0.1 || shut > 0 ? MINT : "#fff");
        light.setAttribute("r", (12 * (1 + 0.35 * Math.sin(Math.PI * shut))).toFixed(2));
        tick.setAttribute("opacity", shut.toFixed(2));
        /* the thread is closed: a flap drops over each outbox */
        const vk = cl(bk(seg(t, 9, 9.5), 1.4), 0, 1.3) * (1 - io(out));
        v1.setAttribute("transform", `translate(204 181) rotate(${(180 - 180 * vk).toFixed(2)})`);
        v2.setAttribute("transform", `translate(596 181) rotate(${(180 * vk - 180).toFixed(2)})`);
        tf(sp, 400, 440, (land(seg(t, 9.4, 9.9), 2.6) * vis * (1 + 0.12 * Math.sin(now * 3))).toFixed(3), (now * 20).toFixed(1));
        say(cap, t < 2.4 || out > 0 ? "An agent drops a small file in its outbox" : t < 5.4 ? "The app delivers it" : t < 8.8 ? "Two kinds of message, inform and done, end a thread" : "Two agents cannot reply to each other forever", 700);
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
