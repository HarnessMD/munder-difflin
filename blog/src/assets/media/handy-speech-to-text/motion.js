/* Bright coded scenes for "How to talk instead of typing with Handy, free speech to text". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const lab = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const around = (n, cx, cy, s = 1, dy = 0) => n.setAttribute("transform", `translate(${cx} ${cy + dy}) scale(${s}) translate(${-cx} ${-cy})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (p, a) => el(a.r ? "circle" : "rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 8", "stroke-linecap": "round", class: "mg-ring" }, a), p);
  const pad = (p, a) => { const n = el("rect", Object.assign({ fill: "#fff", "fill-opacity": 0 }, a)); p.insertBefore(n, p.firstChild); return n; };
  const card = (p, x, y, w, h, r, fill, sh = LIL, o = 16) => { if (sh) el("rect", { x: x + o, y: y + o, width: w, height: h, rx: r, fill: sh }, p); return el("rect", { x, y, width: w, height: h, rx: r, fill, stroke: INK, "stroke-width": 3 }, p); };
  const hint = (p, x, y, s) => lab(p, x, y, s, 26, { "font-weight": 500, fill: MUTE });
  const land = (n, t, t0) => { const k = seg(t, t0, t0 + 0.5); n.setAttribute("opacity", cl(k * 3)); n.setAttribute("transform", `translate(0 ${18 * (1 - oc(k))})`); };
  const blink = (t, t0) => ((t - t0) % 0.8) < 0.5;

  /* ---- a mint sound wave: a sine line with a crisp ink outline, flat at both ends ---- */
  const wave = (p) => {
    const g = el("g", { "pointer-events": "none" }, p);
    const a = el("path", { fill: "none", stroke: INK, "stroke-width": 17, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    const b = el("path", { fill: "none", stroke: MINT, "stroke-width": 11, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    return (x0, x1, y, amp, len, ph, fade = 90) => {
      const on = x1 - x0 >= 2; g.setAttribute("opacity", on ? 1 : 0); if (!on) return;
      const n = Math.max(2, Math.ceil((x1 - x0) / 6)); let d = "";
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n, k = Math.min(1, (x - x0) / fade, (x1 - x) / fade);
        d += `${i ? " L" : "M"}${x.toFixed(1)} ${(y + Math.sin((x / len) * 6.2832 - ph) * amp * k).toFixed(1)}`;
      }
      a.setAttribute("d", d); b.setAttribute("d", d);
    };
  };

  /* ---- a yellow microphone on a stand, head centred on 0,0; outlines stay 3 px at any size ---- */
  const mic = (p, s = 1) => {
    const g = el("g", {}, p), S = (v) => +(v * s).toFixed(2), o = Math.max(7, 14 * s);
    el("rect", { x: S(-100) + o, y: S(-170) + o, width: S(200), height: S(340), rx: S(100), fill: LIL }, g);
    el("rect", { x: S(-120) + o, y: S(376) + o * 0.6, width: S(240), height: S(44), rx: S(22), fill: LIL }, g);
    el("path", { d: `M0 ${S(214)} V${S(380)}`, stroke: INK, "stroke-width": S(30) + 6 }, g);
    el("path", { d: `M0 ${S(214)} V${S(380)}`, stroke: YEL, "stroke-width": S(30) }, g);
    const hold = `M${S(-132)} ${S(-10)} V${S(90)} A${S(132)} ${S(132)} 0 0 0 ${S(132)} ${S(90)} V${S(-10)}`;
    el("path", { d: hold, fill: "none", stroke: INK, "stroke-width": S(16) + 6, "stroke-linecap": "round" }, g);
    el("path", { d: hold, fill: "none", stroke: YEL, "stroke-width": S(16), "stroke-linecap": "round" }, g);
    el("rect", { x: S(-120), y: S(376), width: S(240), height: S(44), rx: S(22), fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    const head = el("g", {}, g);
    el("rect", { x: S(-100), y: S(-170), width: S(200), height: S(340), rx: S(100), fill: YEL, stroke: INK, "stroke-width": 3 }, head);
    [-80, -30, 20].forEach((y) => el("path", { d: `M${S(-68)} ${S(y)} H${S(68)}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, head));
    el("path", { d: `M${S(-98)} ${S(80)} H${S(98)}`, stroke: INK, "stroke-width": 3 }, head);
    return { g, head };
  };

  /* ---- a small soft white keyboard for the title card ---- */
  const miniKeys = (p, cx, cy) => {
    const g = el("g", {}, p), U = 214 / 7;
    card(g, cx - 130, cy - 62, 260, 124, 18, SOFT, LIL, 8);
    [[1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1], [1.5, 4, 1.5]].forEach((ws, r) => {
      let x = cx - 107;
      ws.forEach((w) => { el("rect", { x, y: cy - 46 + r * 32, width: w * U - 6, height: 26, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); x += w * U; });
    });
    return g;
  };

  const SC = {};

  /* ---- 1. a microphone sends a wave that turns into letters in a text box ---- */
  SC.microphone = {
    w: 1600, h: 1200, dur: 7.5, still: 7.5,
    build(svg, api) {
      const MX = 300, MY = 430, WY = 385, LX = 690, X0 = 420, X1 = 1420, LINES = [["One tool,", 540], ["one job", 690]];
      const box = el("g", {}, svg); card(box, 610, 320, 880, 440, 36, SOFT, LIL);
      const cur = el("rect", { width: 12, height: 0, rx: 6, fill: BLUE }, svg);
      const m = mic(svg, 1);
      pad(m.g, { x: -170, y: -205, width: 340, height: 660 });
      ring(m.g, { x: -170, y: -205, width: 340, height: 660, rx: 44 });
      button(m.g, "Tap the microphone to send a new wave and play it again", () => api.rewind(1, 0.8));
      const wv = wave(svg);
      let fs = 140;
      const probe = txt(svg, LX, 0, "", { "font-size": fs, "font-weight": 700 });
      const wmax = Math.max(...LINES.map(([s]) => { probe.textContent = s; return probe.getComputedTextLength(); }));
      if (wmax > 720) { fs = Math.floor((fs * 720) / wmax); probe.setAttribute("font-size", fs); }
      const ends = [], lets = [];
      LINES.forEach(([s, by]) => {
        probe.textContent = s; probe.setAttribute("y", by);
        ends.push(LX + probe.getComputedTextLength());
        for (let i = 0; i < s.length; i++) {
          if (s[i] === " ") continue;
          lets.push({ ch: s[i], x: probe.getStartPositionOfChar(i).x, w: probe.getExtentOfChar(i).width, by });
        }
      });
      probe.remove();
      lets.forEach((L) => {
        L.n = txt(svg, L.x, L.by, L.ch, { "font-size": fs, "font-weight": 700, fill: LIL, stroke: INK, "stroke-width": 5, "stroke-linejoin": "round", "paint-order": "stroke" });
        L.cx = L.x + L.w / 2; L.cy = L.by - fs * 0.36; L.t0 = 2.7 + ((L.cx - X0) / (X1 - X0)) * 1.6;
      });
      const tip = hint(svg, MX, 935, "tap the microphone");
      return (t) => {
        const km = seg(t, 0, 0.6), kb = seg(t, 0.1, 0.7);
        tf(m.g, MX, MY + 40 * (1 - oc(km))); m.g.setAttribute("opacity", cl(km * 3));
        box.setAttribute("opacity", cl(kb * 3)); box.setAttribute("transform", `translate(${40 * (1 - oc(kb))} 0)`);
        const pk = seg(t, 1.1, 1.6); around(m.head, 0, 0, 1 + 0.09 * Math.sin(Math.PI * pk));
        wv(lerp(X0, X1, seg(t, 2.7, 4.3)), lerp(X0, X1, oc(seg(t, 1.3, 2.8))), WY, 30, 150, t * 7);
        lets.forEach((L) => {
          const a = seg(t, L.t0, L.t0 + 0.22), d = seg(t, L.t0 + 0.12, L.t0 + 0.62);
          L.n.setAttribute("opacity", a > 0 ? 1 : 0);
          around(L.n, L.cx, L.cy, 0.25 + 0.75 * ob(a), (WY - L.cy) * (1 - ob(d)));
        });
        const done = t >= 4.75, by = done ? LINES[1][1] : LINES[0][1];
        cur.setAttribute("x", done ? ends[1] + 14 : LX - 22); cur.setAttribute("y", by - fs * 0.74); cur.setAttribute("height", fs * 0.92);
        cur.setAttribute("opacity", t < 0.7 || (t >= 2.7 && t < 4.75) ? 0 : t >= 6.3 ? 1 : blink(t, done ? 4.75 : 0.7) ? 1 : 0);
        land(tip, t, 5.2);
      };
    },
  };

  /* ---- 2. Option and Space go down, the wave pulses, the keys rise, text appears ---- */
  SC.keyboard = {
    w: 1600, h: 1200, dur: 8, still: 8,
    build(svg, api) {
      const tb = el("g", {}, svg); card(tb, 440, 70, 720, 230, 32, LIL, SOFT);
      const bars = [[600, 125], [520, 185], [330, 245]].map(([w, y]) => ({ w, n: el("rect", { x: 500, y: y - 15, width: 0, height: 30, rx: 15, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, tb) }));
      const wv = wave(svg);
      const kb = el("g", {}, svg);
      card(kb, 170, 556, 1260, 484, 40, SOFT, LIL);
      const halos = el("g", {}, kb), U = 1180 / 15, G = 12, hot = [];
      const ROWS = [Array(15).fill(1), [1.5, ...Array(12).fill(1), 1.5], [1.75, ...Array(11).fill(1), 2.25], [2.25, ...Array(10).fill(1), 2.75], [1, 1, 1.75, 1.25, 5.5, 1.5, 1, 1, 1]];
      const rows = ROWS.map((ws, r) => {
        const g = el("g", {}, kb), y = 584 + r * 88; let x = 216;
        ws.forEach((w, i) => {
          const kw = w * U - G, name = r === 4 && i === 2 ? "Option" : r === 4 && i === 4 ? "Space" : "";
          const k = el("g", {}, g);
          el("rect", { x, y: y + 7, width: kw, height: 72, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, k);
          const cap = el("g", {}, k), face = el("rect", { x, y, width: kw, height: 72, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, cap);
          if (name) {
            lab(cap, x + kw / 2, y + 45, name, 26);
            hot.push({ cap, face, cx: x + kw / 2, at: i === 2 ? 1.3 : 1.4, h: el("rect", { x: x - 5, y: y - 5, width: kw + 10, height: 89, rx: 16, fill: "none", stroke: YEL, "stroke-width": 0 }, halos) });
          }
          x += w * U;
        });
        return g;
      });
      pad(kb, { x: 146, y: 532, width: 1308, height: 532 });
      ring(kb, { x: 146, y: 532, width: 1308, height: 532, rx: 52 });
      button(kb, "Tap the keyboard to press the keys again", () => api.rewind(1, 0.8));
      const LC = (hot[0].cx + hot[1].cx) / 2, lbl = el("g", {}, svg);
      el("rect", { x: LC - 150, y: 446, width: 300, height: 68, rx: 34, fill: SKY, stroke: INK, "stroke-width": 3 }, lbl);
      el("path", { d: `M${LC - 16} 512.5 L${LC} 532 L${LC + 16} 512.5`, fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, lbl);
      lab(lbl, LC, 491, "Push To Talk", 30);
      const tip = hint(svg, 800, 1120, "tap the keyboard");
      return (t) => {
        const k0 = seg(t, 0, 0.6), kt = seg(t, 0.15, 0.65);
        kb.setAttribute("transform", `translate(0 ${60 * (1 - oc(k0))})`); kb.setAttribute("opacity", cl(k0 * 3));
        rows.forEach((g, r) => { const k = seg(t, 0.2 + r * 0.08, 0.65 + r * 0.08); g.setAttribute("transform", `translate(0 ${20 * (1 - oc(k))})`); g.setAttribute("opacity", cl(k * 3)); });
        tb.setAttribute("transform", `translate(0 ${-30 * (1 - oc(kt))})`); tb.setAttribute("opacity", cl(kt * 3));
        hot.forEach((h) => {
          h.cap.setAttribute("transform", `translate(0 ${7 * ob(seg(t, h.at, h.at + 0.25)) - 7 * ob(seg(t, 4.7, 5))})`);
          h.face.setAttribute("fill", t >= h.at ? YEL : "#fff");
          h.h.setAttribute("stroke-width", 10 * oc(seg(t, h.at, h.at + 0.2)) * (1 - io(seg(t, 4.75, 5.15))));
        });
        const kl = seg(t, 1.5, 1.9); around(lbl, LC, 480, 0.4 + 0.6 * ob(kl)); lbl.setAttribute("opacity", cl(kl * 4));
        const ext = oc(seg(t, 1.6, 2)) * (1 - 0.45 * io(seg(t, 5, 5.5)));
        const amp = 34 * oc(seg(t, 1.7, 2.1)) * (1 - io(seg(t, 4.65, 5))) * (0.6 + 0.4 * Math.sin(t * 8));
        wv(800 - 500 * ext, 800 + 500 * ext, 380, amp, 170, t * 8);
        bars.forEach((b, i) => b.n.setAttribute("width", b.w * oc(seg(t, 5.3 + i * 0.35, 5.75 + i * 0.35))));
        land(tip, t, 6.6);
      };
    },
  };

  /* ---- 3. one long bubble splits into three short ones that drop their words into a text box ---- */
  SC.speechbubble = {
    w: 1600, h: 1200, dur: 8.4, still: 8.4,
    build(svg, api) {
      const BY = 290, BH = 160, MID = BY + BH / 2, R = 46, GAP = 16, TX = 460, LINE0 = 690, LSTEP = 90;
      const PW = [[112, 78, 132], [96, 128, 84], [120, 92, 108]], JX = [340, 800, 1260], SX = [300, 800, 1300];
      const bub = (x, w, tx, tk) => `M${x + R} ${BY} H${x + w - R} Q${x + w} ${BY} ${x + w} ${BY + R} V${BY + BH - R} Q${x + w} ${BY + BH} ${x + w - R} ${BY + BH} H${tx + 56} L${tx + 8} ${BY + BH + 46 * tk} L${tx} ${BY + BH} H${x + R} Q${x} ${BY + BH} ${x} ${BY + BH - R} V${BY + R} Q${x} ${BY} ${x + R} ${BY} Z`;
      const box = el("g", {}, svg); card(box, 400, 600, 600, 360, 32, SOFT, LIL);
      const cur = el("rect", { width: 10, height: 60, rx: 5, fill: BLUE }, svg);
      const tick = el("g", {}, svg);
      el("circle", { cx: 10, cy: 10, r: 66, fill: LIL }, tick);
      el("circle", { r: 66, fill: MINT, stroke: INK, "stroke-width": 3 }, tick);
      const chk = el("path", { d: "M-30 2 L-9 23 L30 -20", fill: "none", stroke: INK, "stroke-width": 10, "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
      const CL = chk.getTotalLength() + 2; chk.setAttribute("stroke-dasharray", CL);
      const bg = el("g", {}, svg);
      const long = el("path", { d: bub(110, 1380, 180, 1), fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bg);
      const pcs = [0, 1, 2].map(() => el("path", { fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bg));
      pad(bg, { x: 80, y: 262, width: 1440, height: 260 });
      ring(bg, { x: 80, y: 262, width: 1440, height: 260, rx: 44 });
      button(bg, "Tap a bubble to join them into one long bubble and split it again", () => api.rewind(1, 1));
      const pills = [];
      PW.forEach((ws, b) => {
        const tot = ws.reduce((a, c) => a + c, 0) + GAP * (ws.length - 1); let o = -tot / 2;
        ws.forEach((w) => { pills.push({ b, w, o, lo: TX + o + tot / 2, j: pills.length, n: el("rect", { width: w, height: 44, rx: 22, fill: BLUE, stroke: INK, "stroke-width": 2.5, "pointer-events": "none" }, svg) }); o += w + GAP; });
      });
      const tag = el("g", {}, svg);
      el("rect", { x: 630, y: 150, width: 340, height: 72, rx: 20, fill: YEL, stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: 662, cy: 186, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      lab(tag, 822, 198, "short takes", 34);
      const tip = hint(svg, 800, 1070, "tap a bubble");
      return (t) => {
        const kb = seg(t, 0.25, 0.75); box.setAttribute("opacity", cl(kb * 3)); box.setAttribute("transform", `translate(0 ${40 * (1 - oc(kb))})`);
        const e = seg(t, 0.1, 0.6), sq = Math.sin(Math.PI * seg(t, 1.35, 1.6)), joined = t < 1.6, se = 0.6 + 0.4 * ob(e);
        long.setAttribute("opacity", joined && e > 0 ? 1 : 0);
        long.setAttribute("transform", `translate(800 ${MID}) scale(${se * (1 - 0.025 * sq)} ${se * (1 + 0.06 * sq)}) translate(-800 ${-MID})`);
        const k = ob(seg(t, 1.6, 2.2)), w = lerp(460, 400, k), pop = 1 + 0.07 * Math.sin(Math.PI * seg(t, 1.75, 2.05));
        const cx = JX.map((x, i) => lerp(x, SX[i], k));
        pcs.forEach((n, i) => {
          const x = cx[i] - w / 2, tk = i === 0 ? 1 : ob(seg(t, 1.95 + 0.1 * (i - 1), 2.35 + 0.1 * (i - 1)));
          n.setAttribute("d", bub(x, w, x + 64, tk)); n.setAttribute("fill", t >= 1.85 ? SKY : LIL); n.setAttribute("opacity", joined ? 0 : 1);
          around(n, cx[i], MID, pop);
        });
        let last = null;
        pills.forEach((P) => {
          const T = 2.9 + P.j * 0.36, p = seg(t, T, T + 0.5), b = seg(t, T + 0.5, T + 0.72), e2 = seg(t, 0.45 + P.j * 0.07, 0.8 + P.j * 0.07);
          const x0 = cx[P.b] + P.o, y0 = MID - 22, x1 = P.lo, y1 = LINE0 + P.b * LSTEP - 22;
          const x = lerp(x0, x1, io(p)), y = lerp(y0, y1, p * p) - 90 * Math.sin(Math.PI * p) * (1 - p) - 10 * Math.sin(Math.PI * b);
          P.n.setAttribute("x", x); P.n.setAttribute("y", y); P.n.setAttribute("opacity", e2 > 0 ? 1 : 0);
          around(P.n, x + P.w / 2, y + 22, (0.3 + 0.7 * ob(e2)) * (p > 0 ? 1 : pop));
          if (t >= T + 0.5) last = P;
        });
        const ly = last ? LINE0 + last.b * LSTEP : LINE0;
        cur.setAttribute("x", last ? last.lo + last.w + 16 : TX - 4); cur.setAttribute("y", ly - 30);
        cur.setAttribute("opacity", t < 0.8 ? 0 : (t > 2.9 && t < 6.6) || t > 7 || blink(t, 0.8) ? 1 : 0);
        const kt = seg(t, 6.6, 7.05);
        tf(tick, 1140, 780, Math.max(0.001, ob(kt))); tick.setAttribute("opacity", kt > 0 ? 1 : 0);
        chk.setAttribute("stroke-dashoffset", CL * (1 - oc(seg(t, 6.75, 7.1))));
        const kg = seg(t, 2.25, 2.8);
        tag.setAttribute("transform", `translate(0 ${-70 * (1 - ob(kg))}) rotate(${8 * (1 - kg) * Math.sin(kg * 9)} 800 150)`); tag.setAttribute("opacity", cl(kg * 4));
        land(tip, t, 7.1);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 4, still: 4,
    build(svg) {
      const chip = el("g", {}, svg), cr = el("rect", { x: 120, y: 196, width: 190, height: 62, rx: 31, fill: YEL, stroke: INK, "stroke-width": 3 }, chip);
      const ct = lab(chip, 148, 237, "AI tools", 28, { "text-anchor": "start" }); cr.setAttribute("width", ct.getComputedTextLength() + 56);
      const title = txt(svg, 112, 450, "Handy", { "font-size": 200, "font-weight": 700 });
      const s1 = txt(svg, 120, 552, "Types what you say", { "font-size": 52, "font-weight": 500 });
      const s2 = txt(svg, 120, 616, "into any text box", { "font-size": 52, "font-weight": 500 });
      const ck = lab(svg, 120, 690, "Checked 25 Nov 2026", 26, { "text-anchor": "start", "font-weight": 500, fill: MUTE });
      const m = mic(svg, 0.34), kk = miniKeys(svg, 1340, 408);
      const cards = [[1020, LIL, SOFT, "free and", "open source"], [1340, SKY, LIL, "Mac, Windows", "and Linux"]].map(([x, c, sh, a, b]) => {
        const g = el("g", {}, svg); card(g, x - 140, 505, 280, 180, 28, c, sh, 14); lab(g, x, 584, a, 30); lab(g, x, 626, b, 30); return g;
      });
      const up = (n, t, t0, d = 30) => { const k = seg(t, t0, t0 + 0.5); n.setAttribute("opacity", cl(k * 3)); n.setAttribute("transform", `translate(0 ${d * (1 - oc(k))})`); };
      return (t) => {
        const kc = seg(t, 0.1, 0.5); around(chip, 120, 227, 0.5 + 0.5 * ob(kc)); chip.setAttribute("opacity", cl(kc * 3));
        up(title, t, 0.2); up(s1, t, 0.32); up(s2, t, 0.42); up(ck, t, 0.54);
        const km = seg(t, 0.7, 1.2); tf(m.g, 1020, 327 - 40 * (1 - ob(km))); m.g.setAttribute("opacity", cl(km * 3));
        up(cards[0], t, 0.8); up(kk, t, 0.9, -30); up(cards[1], t, 1);
      };
    },
  };

  /* ---- player: plays once in view, holds the final frame; a tap rewinds and replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm, rw = null, last = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => false;
    const at = () => {
      if (held) return sc.still;
      if (rw) { const p = (clock() - rw.at) / rw.len; if (p < 1) return rw.from + (rw.to - rw.from) * io(p); off = rw.to - clock(); rw = null; }
      return cl(clock() + off, 0, sc.dur);
    };
    const frame = () => { const t = at(); last = t; return draw(t, clock()) || !!rw || (!held && t < sc.dur); };
    const tick = () => { cancelAnimationFrame(raf); if (frame() && seen) raf = requestAnimationFrame(tick); };
    const api = {
      now: clock,
      rewind: (to, len) => { rw = { from: last, to, at: clock(), len }; held = false; tick(); },
      poke: () => { if (held) { off = sc.still - clock(); held = false; } tick(); },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (!rw && !held) off = last - clock(); tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
