/* Bright coded scenes for "Gemini 4 Argon". Vanilla JS, no library.
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

  const SC = {};

  /* ---- 1. a closed book; four paper bookmarks are pulled out of its pages, one fact on each ---- */
  SC.bookmarks = {
    dur: 12, still: 9.6,
    build(svg, api) {
      head(svg, "What is Gemini 4 Argon?", "tap a bookmark");
      const BX = 46, BY = 112, BW = 304, BH = 352, EX = BX + BW + 10, HID = BX + BW - 6, PEEK = EX + 22, OUT = 748;
      const BM = [
        ["gemini-4-argon", YEL, "API model ID: gemini-4-argon", 1],
        ["Up to 1M tokens", MINT, "Context window: up to 1M tokens, input and output combined", 0],
        ["Output: Text", SKY, "Input: text, images, audio and video. Output: text", 0],
        ["March 2026", LIL, "Knowledge cutoff: March 2026", 0],
      ];
      const A = [1.5, 3.1, 4.7, 6.3], CY = (i) => BY + 50 + i * 84;
      el("rect", { x: BX + 18, y: BY + 18, width: BW + 4, height: BH, rx: 14, fill: SOFT }, svg);
      /* the ribbon the book came with, which nobody uses */
      el("path", { d: "M-8 -10 H8 V30 L0 21 L-8 30 Z", fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${BX + 92} ${BY + BH + 8}) rotate(7)` }, svg);
      el("rect", { x: BX + 8, y: BY + 8, width: BW + 4, height: BH, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: BX + 4, y: BY + 4, width: BW + 6, height: BH, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("path", { d: `M${BX + BW + 5} ${BY + 14} V${BY + BH - 6}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      const cp = el("clipPath", { id: "mgc-book" }, el("defs", {}, svg));
      el("rect", { x: BX + 8, y: 0, width: 800, height: 600 }, cp);
      const pages = el("g", { "clip-path": "url(#mgc-book)" }, svg);
      let pinned = -1;
      const marks = BM.map(([s, col, line, mono], i) => {
        const cy = CY(i), hit = el("g", {}, pages);
        el("rect", { x: EX, y: cy - 37, width: 764 - EX, height: 74, rx: 14, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, hit);
        const g = el("g", {}, hit);
        el("path", { d: "M-440 -29 H0 L-20 0 L0 29 H-440 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("circle", { cx: -58, cy: 0, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, -222, 9, s, { "text-anchor": "middle", "font-size": mono ? 24 : 26, "font-weight": 700, "font-family": mono ? MONO : SANS });
        const m = { g, cy, t0: -99 };
        button(hit, line, () => { m.t0 = api.now(); pinned = i; api.poke(); });
        return m;
      });
      el("rect", { x: BX, y: BY, width: BW, height: BH, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M${BX + 32} ${BY + 2} V${BY + BH - 2}`, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: BX + 50, y: BY + 20, width: BW - 70, height: BH - 40, rx: 10, fill: "none", stroke: "#fff", "stroke-width": 2.5 }, svg);
      const PX = BX + 32 + (BW - 32) / 2;
      el("rect", { x: PX - 104, y: BY + 60, width: 208, height: 124, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, PX, BY + 114, "Gemini 4", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      txt(svg, PX, BY + 158, "Argon", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      star(svg, PX - 56, BY + 246, 20, YEL); star(svg, PX + 46, BY + 278, 14, "#fff"); star(svg, PX - 14, BY + 306, 10, MINT);
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        let cur = -1;
        marks.forEach((m, i) => {
          const a = A[i], peek = cl(bk(seg(t, 0.4 + i * 0.16, 0.8 + i * 0.16), 2.6), 0, 1.4), k = bk(seg(t, a, a + 0.8), 0.9);
          const back = io(seg(t, 11.1 + i * 0.06, 11.65 + i * 0.06)), w = now - m.t0, tau = t - a - 0.6;
          let tip = lerp(HID + (PEEK - HID) * peek + (OUT - PEEK) * k, HID, back);
          if (w >= 0 && w < 4.6) {
            const far = tip > OUT - 40;
            tip = Math.max(tip, HID + (OUT - HID) * bk(seg(w, 0, 0.6), 0.9) * (1 - io(seg(w, 4.1, 4.6))));
            if (far) tip += 14 * Math.exp(-3.2 * w) * Math.sin(w * 13);
          }
          const rot = (tau > 0 ? 1.7 * Math.exp(-4 * tau) * Math.sin(12 * tau) : 0) + (tip > OUT - 40 ? Math.sin(now * 1.5 + i * 1.3) * 0.45 : 0);
          m.g.setAttribute("transform", `rotate(${rot.toFixed(3)} ${EX} ${m.cy}) translate(${tip.toFixed(2)} ${m.cy})`);
          if (t >= a + 0.25 && t < 11.1) cur = i;
        });
        const pw = pinned >= 0 ? now - marks[pinned].t0 : 99;
        cap.textContent = pw < 4 ? BM[pinned][2] : cur < 0 || t >= 8.6 ? "Google's model card and models page, read 13 Oct 2026" : BM[cur][2];
      };
    },
  };

  /* ---- 2. a small stage; the curtain opens a crack for the first date, then all the way for the second ---- */
  SC.curtains = {
    dur: 12, still: 9.6,
    build(svg, api) {
      head(svg, "When was Gemini 4 Argon released?", "tap the stage");
      const L = 70, R = 730, TOP = 128, FL = 446, RAIL = 142;
      const stage = el("g", {}, svg);
      el("rect", { x: 34, y: 98, width: 732, height: 396, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, stage);
      el("rect", { x: L, y: TOP, width: R - L, height: FL - TOP, fill: SOFT, stroke: INK, "stroke-width": 3 }, stage);
      const cp = el("clipPath", { id: "mgc-stage" }, el("defs", {}, stage));
      el("rect", { x: L, y: TOP, width: R - L, height: FL - TOP }, cp);
      const inner = el("g", { "clip-path": "url(#mgc-stage)" }, stage);
      const card = (kick, date, lines, fill) => {
        const g = el("g", {}, inner);
        el("path", { d: "M-78 -420 V74 M78 -420 V74", stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -130, y: 72, width: 260, height: 168, rx: 14, fill, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, 110, kick, { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
        txt(g, 0, 148, date, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        el("path", { d: "M-104 164 H104", stroke: INK, "stroke-width": 2, "stroke-linecap": "round", "stroke-dasharray": "1 9" }, g);
        lines.forEach((s, i) => txt(g, 0, (lines.length > 1 ? 192 : 205) + i * 27, s, { "text-anchor": "middle", "font-size": 21, "font-weight": 600 }));
        return g;
      };
      const c1 = card("first reveal", "30 September 2026", ["trusted cyber", "defenders"], "#fff");
      const c2 = card("general release", "13 October 2026", ["globally available"], YEL);
      const curtain = (side) => {
        const g = el("g", {}, stage), body = el("path", { fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g), folds = el("path", { stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, g);
        return (w) => {
          const n = 6, f = w / n, x0 = side < 0 ? L : R, d = -side;
          let p = `M${x0} ${TOP + 6} H${(x0 + d * w).toFixed(1)} V${FL - 12}`, q = "";
          for (let i = 0; i < n; i++) p += ` q${((-d * f) / 2).toFixed(1)} 12 ${(-d * f).toFixed(1)} 0`;
          for (let i = 1; i < n; i++) q += `M${(x0 + d * f * i).toFixed(1)} ${TOP + 34} V${FL - 18} `;
          body.setAttribute("d", p + " Z"); folds.setAttribute("d", q);
        };
      };
      const setL = curtain(-1), setR = curtain(1);
      const cord = el("g", {}, stage), line = el("path", { stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, cord), tas = el("g", {}, cord);
      el("circle", { cy: 0, r: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, tas);
      el("path", { d: "M-8 6 H8 L10 34 H-10 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tas);
      el("path", { d: "M-3 14 V32 M3 14 V32", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, tas);
      let v = "M44 106 H756 V150";
      for (let i = 0; i < 8; i++) v += " q-44.5 30 -89 0";
      el("path", { d: v + " Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, stage);
      el("rect", { x: 44, y: FL, width: 712, height: 40, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, stage);
      const lights = [160, 280, 400, 520, 640].map((x) => { el("path", { d: `M${x - 17} ${FL + 32} a17 17 0 0 1 34 0 Z`, fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, stage); return el("circle", { cx: x, cy: FL + 26, r: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, stage); });
      button(stage, "Replay the curtain opening on the two dates", () => api.seek(0.9));
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const o1 = bk(seg(t, 1.8, 2.8), 1.2), o2 = bk(seg(t, 5.5, 6.6), 1), shut = io(seg(t, 11.1, 11.8));
        const w = lerp(lerp(lerp(330, 190, o1), 52, o2), 330, shut);
        setL(w); setR(w);
        const tug = 18 * (Math.sin(Math.PI * seg(t, 1.5, 2.1)) + Math.sin(Math.PI * seg(t, 5.2, 5.8)) + Math.sin(Math.PI * seg(t, 10.9, 11.5)));
        line.setAttribute("d", `M0 0 V${(116 + tug).toFixed(1)}`); tas.setAttribute("transform", `translate(0 ${(122 + tug).toFixed(1)})`);
        cord.setAttribute("transform", `translate(743 158) rotate(${(Math.sin(now * 1.1) * 1.6).toFixed(2)})`);
        const p = seg(t, 5.7, 6.7) * (1 - seg(t, 11.8, 11.95)), ta = t - 6.7, tb = t - 7.35;
        const r1 = -6 * Math.sin(2 * Math.PI * seg(t, 5.7, 6.7)) + (ta > 0 ? -4 * Math.exp(-2.6 * ta) * Math.sin(8 * ta) : 0) + Math.sin(now * 1.2) * 0.6;
        tf(c1, lerp(400, 258, io(p)).toFixed(2), RAIL, 1, r1.toFixed(3));
        const k2 = bk(seg(t, 6.5, 7.35), 1.3), r2 = (tb > 0 ? 3.4 * Math.exp(-2.8 * tb) * Math.sin(9 * tb) : 0) + Math.sin(now * 1.2 + 2) * 0.6;
        c2.setAttribute("transform", `translate(542 ${(RAIL - 340 * (1 - k2)).toFixed(2)}) rotate(${r2.toFixed(3)})`);
        c2.setAttribute("opacity", t < 6.5 || t >= 11.8 ? 0 : 1);
        const blink = Math.sin(now * 1.7) > 0.9 || (Math.sin(now * 29) > 0.5 && Math.sin(now * 1.7) > 0.72);
        lights.forEach((c, i) => c.setAttribute("fill", i === 3 && !blink ? "#fff" : YEL));
        cap.textContent = t < 1.8 || t >= 11.1 ? "The curtain opened in two pulls" : t < 6.5 ? "The Verge, 30 September 2026: for “trusted cyber defenders” at first" : "Google's launch post, Oct 13, 2026: “now globally available today”";
      };
    },
  };

  /* ---- 3. six doors; a sign drops beside each and the door swings open, except the last one ---- */
  SC.doors = {
    dur: 12, still: 10,
    build(svg, api) {
      head(svg, "Where can you use Gemini 4 Argon?", "tap a door");
      const D = [
        ["Gemini API", ["Paid tier"], BLUE, "Gemini API: Paid tier"],
        ["Google AI Studio", ["Paid tier", "or Ultra"], MINT, "Google AI Studio: Paid tier, or Google AI Ultra subscribers"],
        ["Android Studio", ["Paid tier"], LIL, "Android Studio: Paid tier of the Gemini API"],
        ["Antigravity", ["Ultra"], SKY, "Antigravity desktop app and CLI: Google AI Ultra subscribers"],
        ["Gemini app", ["Ultra", "and Pro"], BLUE, "Gemini app and AI Mode in Search: Ultra and Pro subscribers"],
        ["Free tier", ["not", "available"], SOFT, "Google's pricing page: “not available on the Free tier”"],
      ];
      const S = [1.2, 2.5, 3.8, 5.1, 6.4, 7.8];
      let pinned = -1;
      const doors = D.map(([name, sign, col, line], i) => {
        const cx = 150 + (i % 3) * 250, R = i < 3 ? 108 : 302, x0 = cx - 110, y0 = R + 48, y1 = R + 182, free = i === 5;
        const g = el("g", {}, svg);
        el("rect", { x: cx - 118, y: R - 6, width: 236, height: 196, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("rect", { x: cx - 112, y: R, width: 224, height: 36, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, cx, R + 25, name, { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
        el("path", { d: `M${cx - 114} ${y1} H${cx + 114}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        el("rect", { x: x0, y: y0, width: 92, height: y1 - y0, fill: free ? SOFT : YEL, stroke: INK, "stroke-width": 3 }, g);
        const leaf = el("path", { fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const pan = el("path", { fill: "none", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, g);
        const knob = el("circle", { r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        const set = (k, jx) => {
          const lw = 92 * (1 - 0.62 * k), s = 14 * k, P = (u, v) => `${(x0 + jx + u * lw).toFixed(1)} ${lerp(y0 + s * u, y1 - s * u, v).toFixed(1)}`;
          leaf.setAttribute("d", `M${P(0, 0)} L${P(1, 0)} L${P(1, 1)} L${P(0, 1)} Z`);
          pan.setAttribute("d", [[0.1, 0.45], [0.57, 0.92]].map(([a, b]) => `M${P(0.2, a)} L${P(0.8, a)} L${P(0.8, b)} L${P(0.2, b)} Z`).join(" "));
          const kp = P(0.88, 0.51).split(" "); knob.setAttribute("cx", kp[0]); knob.setAttribute("cy", kp[1]);
        };
        const nx = cx + 52, ny = R + 62, sh = free ? 72 : sign.length > 1 ? 66 : 44;
        if (!free) el("circle", { cx: nx, cy: ny, r: 3.5, fill: INK }, g);
        const sg = el("g", {}, g);
        if (!free) el("path", { d: "M0 0 L-44 20 M0 0 L44 20", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, sg);
        el("rect", { x: -58, y: 20, width: 116, height: sh, rx: 8, fill: free ? "#fff" : YEL, stroke: INK, "stroke-width": 3 }, sg);
        sign.forEach((s, j) => txt(sg, 0, 20 + (free ? 26 : sign.length > 1 ? 27 : 29) + j * 25, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }));
        /* the one sign that is nailed down at all four corners */
        const nails = free ? [[-49, 29], [49, 29], [-49, 83], [49, 83]].map(([x, y]) => el("circle", { cx: x, cy: y, r: 0, fill: INK }, sg)) : [];
        const d = { set, sg, nails, nx, ny, free, kt: -99 };
        button(g, line, () => { d.kt = api.now(); pinned = i; api.poke(); });
        return d;
      });
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 11.2, 11.8);
        let cur = -1;
        doors.forEach((d, i) => {
          const s = S[i], w = now - d.kt, hit = w >= 0 && w < 2.4, fall = seg(t, s, s + 0.28), tau = t - s - 0.28;
          const knock = hit && w < 0.54 ? Math.abs(Math.sin(w * Math.PI / 0.18)) : 0;
          const swing = tau < 0 ? 0 : 8 * Math.exp(-2.6 * tau) * Math.sin(8 * tau) + seg(tau, 1.2, 2.6) * Math.sin(now * 1.4 + i * 1.7) * 1.3;
          const rot = d.free ? 0 : swing + (hit ? 7 * Math.exp(-2.5 * w) * Math.sin(13 * w) : 0);
          d.sg.setAttribute("transform", `translate(${d.nx} ${(d.ny - 54 * (1 - fall * fall) + (d.free && tau > 0 ? -5 * Math.exp(-7 * tau) * Math.abs(Math.sin(14 * tau)) : 0)).toFixed(2)}) rotate(${rot.toFixed(3)})`);
          d.sg.setAttribute("opacity", seg(t, s, s + 0.08) * (1 - out));
          d.nails.forEach((n, j) => n.setAttribute("r", (3.6 * cl(bk(seg(t, s + 0.5 + j * 0.17, s + 0.68 + j * 0.17), 3.2), 0, 1.6)).toFixed(2)));
          const open = d.free ? 0 : 0.9 * bk(seg(t, s + 0.5, s + 1.15), 1.7) * (1 - io(seg(t, 11.2, 11.75)));
          const k = open > 0.3 ? open + (hit ? 0.13 * Math.exp(-2.6 * w) * Math.sin(12 * w) : 0) - knock * 0.05 : open;
          d.set(cl(k, 0, 1.2), open > 0.3 ? 0 : knock * 2.4);
          if (t >= s && !out) cur = i;
        });
        const pw = pinned >= 0 ? now - doors[pinned].kt : 99;
        cap.textContent = pw < 4 ? D[pinned][3] : cur < 0 ? "Google's launch post and pricing page, read 13 Oct 2026" : t >= 9.4 ? "The free door is shut" : D[cur][3];
      };
    },
  };

  /* ---- 4. a till prints a short receipt, rings, then prints a longer one; the paper roll pays for it ---- */
  SC.receipts = {
    dur: 12, still: 9.8,
    build(svg, api) {
      head(svg, "What does Gemini 4 Argon cost?", "tap the till");
      const F = 478, SX = 376, SY = 268;
      el("path", { d: `M30 ${F} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const slip = (H, a, b, bs, ps, pin, pout, Y) => {
        const g = el("g", {}, svg), T = -H;
        let d = `M-116 0 V${T}`;
        for (let i = 0; i < 16; i++) d += " l7.25 -6 l7.25 6";
        el("path", { d: d + " V0 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        txt(g, -96, T + Y[0], a, { "font-size": 20, "font-weight": 500, fill: MUTE });
        txt(g, -96, T + Y[1], b, { "font-size": bs, "font-weight": 700 });
        [Y[2], Y[5]].forEach((y) => el("path", { d: `M-96 ${T + y} H96`, stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 9" }, g));
        [["Input", pin, Y[3]], ["Output", pout, Y[4]]].forEach(([k, v, y]) => {
          txt(g, -96, T + y, k, { "font-size": 20, "font-weight": 500 });
          txt(g, 96, T + y + 2, v, { "text-anchor": "end", "font-size": ps, "font-weight": 700 });
        });
        txt(g, -96, T + Y[6], "per 1M tokens", { "font-size": 20, "font-weight": 500, fill: MUTE });
        return g;
      };
      const r1 = slip(238, "Through", "30 Nov 2026", 26, 24, "$2.00", "$10.00", [38, 70, 90, 126, 162, 184, 216]);
      const r2 = slip(338, "From", "1 Dec 2026", 30, 32, "$4.00", "$20.00", [44, 82, 106, 164, 228, 258, 296]);
      const till = el("g", {}, svg);
      el("rect", { x: 270, y: 176, width: 260, height: 314, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, till);
      const body = el("g", {}, till);
      const roll = el("circle", { cx: 332, fill: "#fff", stroke: INK, "stroke-width": 3 }, body), core = el("g", {}, body);
      el("circle", { r: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, core);
      el("path", { d: "M0 0 H7", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, core);
      const stub = el("path", { fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, body);
      const ink = el("path", { stroke: INK, "stroke-width": 2, "stroke-linecap": "round", fill: "none" }, body);
      el("rect", { x: 310, y: 276, width: 92, height: 28, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, body);
      el("path", { d: "M446 304 V274", stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, body);
      el("rect", { x: 408, y: 218, width: 94, height: 58, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, body);
      el("rect", { x: 418, y: 228, width: 74, height: 38, rx: 6, fill: SOFT }, body);
      el("path", { d: "M428 241 H460 M428 254 H448", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, body);
      const lamp = el("circle", { cx: 478, cy: 247, r: 6, fill: MINT, stroke: INK, "stroke-width": 2.5 }, body);
      const ding = el("path", { d: "M510 230 L526 224 M504 214 L514 200 M490 208 L492 192", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, body);
      el("path", { d: "M304 400 L324 302 H476 L496 400 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
      const keys = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) keys.push(el("rect", { x: 342 + c * 26 - r * 3, y: 320 + r * 23, width: 19, height: 15, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, body));
      el("rect", { x: 448, y: 320, width: 19, height: 61, rx: 5, fill: MINT, stroke: INK, "stroke-width": 2 }, body);
      el("rect", { x: 290, y: 400, width: 220, height: 76, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, body);
      const drawer = el("g", {}, body);
      el("rect", { x: 308, y: 414, width: 184, height: 46, rx: 8, fill: SKY, stroke: INK, "stroke-width": 2.5 }, drawer);
      el("rect", { x: 378, y: 431, width: 44, height: 12, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, drawer);
      button(till, "Print the two receipts again", () => api.seek(0.9));
      const cap = strip(svg, 508, 740);
      const fly = (g, t, now, a, X, lean, dir, ph, out) => {
        const p = seg(t, a, a + 0.9), e = io(p), tau = t - a - 0.9;
        const hop = tau > 0 ? 9 * Math.exp(-6 * tau) * Math.abs(Math.sin(9 * tau)) : 0;
        const rot = dir * 22 * Math.sin(Math.PI * p) * (1 - p) + lean * e + (tau > 0 ? dir * 4 * Math.exp(-3.4 * tau) * Math.sin(10 * tau) + seg(tau, 0.8, 2) * Math.sin(now * 1.1 + ph) * 0.5 : 0);
        tf(g, lerp(SX, X, oc(p)).toFixed(2), (lerp(SY + 4, F - 2, e) - 60 * Math.sin(Math.PI * p) * (1 - p) * (1 - p) - hop).toFixed(2), lerp(0.1, 1, e).toFixed(4), rot.toFixed(3));
        g.setAttribute("opacity", seg(t, a, a + 0.08) * (1 - out));
      };
      return (t, now) => {
        const out = seg(t, 11.2, 11.7), p1 = seg(t, 1.0, 2.2), p2 = seg(t, 5.4, 7.2), on1 = t >= 1.0 && t < 2.2, on2 = t >= 5.4 && t < 7.2, on = on1 || on2;
        const rr = 28 - 5 * p1 - 11 * p2 + 16 * io(seg(t, 11.3, 11.9));
        roll.setAttribute("r", rr.toFixed(2)); roll.setAttribute("cy", (279 - rr).toFixed(2));
        core.setAttribute("transform", `translate(332 ${(279 - rr).toFixed(2)}) rotate(${(-340 * p1 - 760 * p2).toFixed(1)})`);
        const feed = on1 ? p1 : on2 ? p2 : 0, h = on ? 6 + 38 * (Math.floor(feed * 7) + oc(cl((feed * 7) % 1 * 2.2))) / 7 : 0;
        stub.setAttribute("d", `M362 280 V${(280 - h).toFixed(1)} l5.33 -4 l5.33 4 l5.33 -4 l5.33 4 l5.33 -4 l5.33 4 V280 Z`); stub.setAttribute("opacity", on ? 1 : 0);
        let dd = "";
        for (let y = 274; y > 284 - h; y -= 9) dd += `M368 ${y} H${384 + ((y * 7) % 5)} `;
        ink.setAttribute("d", dd); ink.setAttribute("opacity", on ? 1 : 0);
        const rg = seg(t, 4.5, 5.2), bell = Math.sin(Math.PI * rg);
        body.setAttribute("transform", `translate(${((on ? Math.sin(t * 55) * 1.1 : 0) + bell * Math.sin(t * 42) * 2.4).toFixed(2)} ${(on ? Math.abs(Math.sin(t * 27)) * -1 : 0).toFixed(2)}) translate(400 476) scale(1.1) translate(-400 -476)`);
        const kx = on ? Math.floor(t * 10) % 12 : -1;
        keys.forEach((k, i) => k.setAttribute("fill", i === kx ? YEL : "#fff"));
        drawer.setAttribute("transform", `translate(0 ${(10 * cl(bk(seg(t, 4.5, 4.8), 2), 0, 1.4) * (1 - io(seg(t, 4.95, 5.3)))).toFixed(2)})`);
        ding.setAttribute("opacity", rg > 0 && rg < 1 ? Math.abs(Math.sin(rg * 3 * Math.PI)).toFixed(2) : 0);
        lamp.setAttribute("fill", Math.sin(now * 2.2) > -0.35 ? MINT : "#fff");
        fly(r1, t, now, 2.2, 150, 1.2, 1, 0, out); fly(r2, t, now, 7.2, 650, -1.2, -1, 2, out);
        cap.textContent = t < 2.4 || t >= 11.2 ? "Google's pricing page, read 13 Oct 2026" : t < 7.4 ? "Through 30 November 2026: $2.00 input, $10.00 output per 1M tokens" : t < 9.2 ? "From 1 December 2026: $4.00 input, $20.00 output per 1M tokens" : "The price doubles on 1 December 2026";
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 118, "Release date, price, access and scores", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const ti = txt(svg, 62, 220, "Gemini 4 Argon", { "font-size": 78, "font-weight": 700 });
      el("path", { d: `M68 252 H${Math.round(56 + ti.getComputedTextLength())}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 296, width: 312, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 218, 333, "Checked 13 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      el("path", { d: "M70 452 C190 396 300 492 420 436 S584 420 652 344", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 16" }, svg);
      el("circle", { cx: 70, cy: 452, r: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      const c = el("g", { transform: "translate(796 258)" }, svg);
      el("rect", { x: -6, y: 0, width: 12, height: 238, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, c);
      const wheel = el("g", {}, c);
      [YEL, BLUE, MINT, LIL].forEach((col, i) => {
        const b = el("g", { transform: `rotate(${i * 90})` }, wheel);
        el("path", { d: "M0 0 L0 -120 Q110 -112 76 -8 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, b);
        el("path", { d: "M0 0 L0 -120 L34 -52 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, b);
      });
      el("circle", { r: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, c);
      star(svg, 634, 118, 15, SKY); star(svg, 906, 452, 17, MINT); star(svg, 548, 478, 12, YEL);
      return (t, now) => wheel.setAttribute("transform", `rotate(${(16 + now * 48).toFixed(2)})`);
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
