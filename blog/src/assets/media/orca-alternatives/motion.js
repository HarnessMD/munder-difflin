/* Bright coded scenes for "Orca Alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const sat = (n, cx, cy, s = 1, dx = 0, dy = 0, r = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) rotate(${r}) scale(${s}) translate(${-cx} ${-cy})`);
  const op = (n, v) => n.setAttribute("opacity", cl(v));
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* a button that only takes focus and taps while it is on screen */
  const live = (g, on, st) => { if (on !== st.v) { st.v = on; g.setAttribute("tabindex", on ? "0" : "-1"); g.setAttribute("aria-hidden", on ? "false" : "true"); g.style.pointerEvents = on ? "" : "none"; } };
  /* a rounded box with a crisp ink outline and an optional soft offset shadow */
  const box = (p, x, y, w, h, r, fill, sh, off = 8, sw = 3) => {
    if (sh) el("rect", { x: x + off, y: y + off, width: w, height: h, rx: r, fill: sh }, p);
    return el("rect", { x, y, width: w, height: h, rx: r, fill, stroke: INK, "stroke-width": sw }, p);
  };
  /* the dashed focus and hover ring the stylesheet reveals */
  const ring = (p, a, t = "rect") => el(t, Object.assign({ fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6" }, a), p);

  const SC = {};

  /* ---- 1. two trams glide to their own worktree signs; tap a track to send a third down a new track ---- */
  SC.tramline = {
    dur: 8, still: 8,
    build(svg, api) {
      const ROWS = [200, 385, 560], ARR = [3.9, 4.3];
      const enter = (p) => -170 + 582 * io(seg(p, 0, 0.86)) - 12 * io(seg(p, 0.86, 1));
      let ov = null;
      /* the third track and its tram: drawn in by the default run, or by a tap */
      const row3 = (e) => {
        if (!ov || e < ov.at) return { k: oc(seg(e, 4.9, 5.5)), x: enter(seg(e, 5.3, 7.3)) };
        const s = e - ov.at, k = ov.k0 + (1 - ov.k0) * oc(seg(s, 0, 0.5));
        if (ov.x0 > -165) return { k, x: s < 0.75 ? ov.x0 + (990 - ov.x0) * Math.pow(seg(s, 0, 0.7), 2) : enter(seg(s, 0.8, 2.8)) };
        return { k, x: enter(seg(s, 0.3, 2.3)) };
      };
      const send = () => { const st = row3(api.now()); ov = { at: api.mark(), x0: st.x, k0: st.k }; api.poke(); };
      const signs = ROWS.slice(0, 2).map((Y) => {
        const g = el("g", {}, svg);
        el("path", { d: `M262 ${Y - 6} V${Y - 131} H538 V${Y - 6}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        const sign = el("g", {}, g);
        box(sign, 300, Y - 150, 200, 38, 12, MINT, LIL, 6);
        const word = mono(sign, 400, Y - 124, "own worktree", { "font-size": 20 });
        return { g, sign, word, Y };
      });
      const tracks = ROWS.map((Y) => {
        const g = el("g", {}, svg);
        ring(g, { x: 10, y: Y - 34, width: 780, height: 62, rx: 18 });
        const sl = Array.from({ length: 16 }, (_, j) => el("rect", { x: 24 + j * 48, y: Y + 3, width: 26, height: 12, rx: 3, fill: SKY, stroke: INK, "stroke-width": 2.5 }, g));
        const rail = el("rect", { x: 14, y: Y - 5, width: 772, height: 10, rx: 5, fill: SKY, stroke: INK, "stroke-width": 2.5 }, g);
        button(g, "Send the OpenCode tram down a new track", send);
        return { g, sl, rail, Y, st: {} };
      });
      const trams = [["Claude Code", YEL], ["Codex", LIL], ["OpenCode", SOFT]].map(([name, col]) => {
        const g = el("g", {}, svg); g.style.pointerEvents = "none";
        el("rect", { x: -120, y: -100, width: 240, height: 76, rx: 18, fill: col, stroke: INK, "stroke-width": 3 }, g);
        [-104, -50, 4, 58].forEach((x) => el("rect", { x, y: -90, width: 46, height: 24, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
        mono(g, 0, -37, name, { "font-size": 20 });
        const wh = [-72, 72].map((x) => { const w = el("g", {}, g); el("circle", { r: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, w); el("path", { d: "M-5 0 H5", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, w); return { w, x }; });
        return { g, wh };
      });
      const place = (t, x, Y) => { tf(t.g, x.toFixed(1), Y); t.wh.forEach((w) => tf(w.w, w.x, -14, 1, ((x * 5.73) % 360).toFixed(1))); };
      return (e) => {
        const r3 = row3(e);
        tracks.forEach((t, i) => {
          const k = i < 2 ? oc(seg(e, 0.1 + i * 0.12, 1 + i * 0.12)) : r3.k;
          t.rail.setAttribute("width", (772 * k).toFixed(1)); op(t.rail, k > 0.005 ? 1 : 0);
          t.sl.forEach((n, j) => { const q = ob(cl((k * 1.3 - (j * 48 + 10) / 772) * 4)); sat(n, 37 + j * 48, t.Y + 9, q.toFixed(3)); op(n, q > 0.01 ? 1 : 0); });
          if (i === 2) live(t.g, k > 0.5, t.st);
        });
        signs.forEach((s, i) => {
          const a = 0.5 + i * 0.12, k = ob(seg(e, a, a + 0.6));
          tf(s.g, 0, (-36 * (1 - k)).toFixed(2)); op(s.g, seg(e, a, a + 0.15));
          const w = ob(seg(e, ARR[i] - 0.1, ARR[i] + 0.35));
          sat(s.word, 400, s.Y - 131, (0.5 + 0.5 * w).toFixed(3)); op(s.word, seg(e, ARR[i] - 0.1, ARR[i] + 0.05));
          sat(s.sign, 400, s.Y - 131, (1 + 0.07 * Math.sin(Math.PI * seg(e, ARR[i] - 0.15, ARR[i] + 0.3))).toFixed(3));
        });
        [0, 1].forEach((i) => place(trams[i], enter(seg(e, 1.2 + i * 0.3, ARR[i])), ROWS[i]));
        place(trams[2], r3.x, ROWS[2]);
      };
    },
  };

  /* ---- 2. a mallet taps one bar per release day; tap the xylophone to play it again ---- */
  SC.xylophone = {
    dur: 7.5, still: 7.5,
    build(svg, api) {
      const X = [220, 340, 460, 580], HS = [300, 268, 236, 204], CY = 318, COL = [YEL, BLUE, LIL, MINT], DAYS = ["16 Nov", "17 Nov", "18 Nov", "19 Nov"];
      const TOP = HS.map((h) => CY - h / 2);
      const HOV = (i) => [X[i] + 8, TOP[i] - 16], HIT = (i) => [X[i], TOP[i] + 56], REST = [700, 384], START = [900, 110];
      const xylo = el("g", {}, svg);
      ring(xylo, { x: 128, y: 146, width: 544, height: 344, rx: 28 });
      const fr = el("g", {}, xylo);
      const rail = (y0, y1) => { const d = `M150 ${y0} L650 ${y1}`; el("path", { d, stroke: INK, "stroke-width": 20, "stroke-linecap": "round" }, fr); el("path", { d, stroke: SOFT, "stroke-width": 14, "stroke-linecap": "round" }, fr); };
      rail(190.7, 257.3); rail(445.3, 378.7);
      const bars = X.map((x, i) => {
        const g = el("g", {}, xylo);
        el("rect", { x: x - 48, y: TOP[i], width: 96, height: HS[i], rx: 16, fill: COL[i], stroke: INK, "stroke-width": 3 }, g);
        [190.7 + (x - 150) * 0.1332, 445.3 - (x - 150) * 0.1332].forEach((y) => el("circle", { cx: x, cy: y.toFixed(1), r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
        const fx = el("path", { d: `M${x - 26} ${TOP[i] - 10} L${x - 36} ${TOP[i] - 26} M${x} ${TOP[i] - 13} V${TOP[i] - 32} M${x + 26} ${TOP[i] - 10} L${x + 36} ${TOP[i] - 26}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round", fill: "none", opacity: 0 }, svg);
        return { g, fx, x };
      });
      const labs = X.map((x, i) => mono(svg, x, 528, DAYS[i], { "font-size": 22 }));
      const mal = el("g", {}, svg); mal.style.pointerEvents = "none";
      el("path", { d: "M0 0 L64 -88", stroke: INK, "stroke-width": 15, "stroke-linecap": "round" }, mal);
      el("path", { d: "M0 0 L64 -88", stroke: SOFT, "stroke-width": 9, "stroke-linecap": "round" }, mal);
      el("circle", { r: 24, fill: SOFT, stroke: INK, "stroke-width": 3 }, mal);
      const tag = el("g", {}, svg); tag.style.pointerEvents = "none";
      box(tag, 492, 112, 176, 48, 16, SKY, LIL, 6);
      el("path", { d: "M568 158 L580 176 L592 158", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      const tagT = mono(tag, 580, 144, "v1.4.264", { "font-size": 22 });
      /* where the mallet head is at u seconds after the first strike was due, starting from S; [x, y, lift] */
      const pose = (u, S) => {
        if (u < -1) return [S[0], S[1], 1];
        if (u >= 3) {
          const p = u - 3;
          if (p < 0.25) { const k = oc(p / 0.25); return [...lerp(HIT(3), HOV(3), k), k]; }
          const k = io(seg(p, 0.4, 1.2)); return [...lerp(HOV(3), REST, k), 1 - k];
        }
        const i = Math.min(3, Math.max(0, Math.ceil(u))), p = u - (i - 1);
        if (p >= 0.72) { const k = Math.pow((p - 0.72) / 0.28, 2); return [...lerp(HOV(i), HIT(i), k), 1 - k]; }
        if (i === 0) return [...lerp(S, HOV(0), io(seg(p, 0, 0.6))), 1];
        if (p < 0.25) { const k = oc(p / 0.25); return [...lerp(HIT(i - 1), HOV(i - 1), k), k]; }
        return [...lerp(HOV(i - 1), HOV(i), io(seg(p, 0.25, 0.7))), 1];
      };
      let ov = null;
      const st = (e) => (!ov || e < ov.at ? { b: 2, S: START, at: -1, t0: 0 } : { b: ov.at + 1, S: ov.S, at: ov.at, t0: ov.t0 });
      /* the version tag: [pop, text, opacity] */
      const tagK = (e) => {
        const s = st(e), land = s.b + 3.2, k = ob(seg(e, land, land + 0.5)), lo = oc(seg(e, land + 0.3, land + 0.7));
        if (s.at >= 0 && e < land) return [1, 1, s.t0 * (1 - oc(seg(e, s.at, s.at + 0.3)))];
        return [k, lo, seg(e, land, land + 0.12)];
      };
      button(xylo, "Play the bars again from the first", () => {
        const e = api.now(), s = st(e), p = pose(e - s.b, s.S), t0 = tagK(e)[2];
        ov = { S: [p[0], p[1]], t0, at: api.mark() }; api.poke();
      });
      return (e) => {
        const s = st(e), kf = oc(seg(e, 0, 0.5));
        tf(fr, 0, (24 * (1 - kf)).toFixed(2)); op(fr, kf);
        bars.forEach((b, i) => {
          const a = 0.3 + i * 0.09, k = ob(seg(e, a, a + 0.55)), T = s.b + i, d = e - T, hit = d >= 0 && d < 0.9;
          const dip = hit ? 5 * Math.sin(Math.PI * seg(d, 0, 0.2)) : 0, wob = hit ? 2.2 * Math.sin(d * 26) * Math.exp(-6 * d) : 0;
          sat(b.g, b.x, CY, (0.7 + 0.3 * k).toFixed(3), 0, Math.round((dip - 40 * (1 - k)) * 100) / 100, wob.toFixed(2)); op(b.g, seg(e, a, a + 0.12));
          op(b.fx, hit ? 1 - seg(d, 0.05, 0.5) : 0); sat(b.fx, b.x, TOP[i], (0.85 + 0.3 * seg(d, 0, 0.5)).toFixed(3));
          const lab = labs[i];
          if (s.at < 0) { const kl = ob(seg(e, T - 0.05, T + 0.4)); sat(lab, b.x, 520, (0.5 + 0.5 * kl).toFixed(3)); op(lab, seg(e, T - 0.05, T + 0.1)); }
          else { sat(lab, b.x, 520, (1 + 0.14 * Math.sin(Math.PI * seg(e, T, T + 0.35))).toFixed(3)); op(lab, 1); }
        });
        const p = pose(e - s.b, s.S);
        tf(mal, p[0].toFixed(1), p[1].toFixed(1), 1, (10 * p[2]).toFixed(2));
        const [k, lo, go] = tagK(e);
        sat(tag, 580, 176, (0.6 + 0.4 * k).toFixed(3)); op(tag, go); op(tagT, lo);
      };
    },
  };

  /* ---- 3. a carousel of six alternatives; tap a seat to bring it to the front ---- */
  SC.carousel = {
    dur: 8.5, still: 8.5,
    build(svg, api) {
      const C = [400, 290], RX = 246, RY = 118, V = 26, T = 1;
      const SEATS = [["Closest match", "T3 Code"], ["Team of agents", "Munder Difflin"], ["Issue trackers", "Emdash"], ["Hosted cloud", "Paradev"], ["Shape by asking", "Herdr"], ["On a Mac", "Conductor"]];
      const base = el("g", {}, svg);
      el("ellipse", { cx: 400, cy: 314, rx: 332, ry: 146, fill: LIL, stroke: INK, "stroke-width": 3 }, base);
      el("ellipse", { cx: 400, cy: 290, rx: 332, ry: 146, fill: LIL, stroke: INK, "stroke-width": 3 }, base);
      const dots = Array.from({ length: 12 }, () => el("circle", { r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, base));
      el("rect", { x: 391, y: 120, width: 18, height: 174, fill: LIL, stroke: INK, "stroke-width": 3 }, base);
      const roof = el("g", {}, svg);
      for (let k = 0; k < 8; k++) el("circle", { cx: (254 + k * 41.7).toFixed(1), cy: 124, r: 17, fill: LIL, stroke: INK, "stroke-width": 3 }, roof);
      el("path", { d: "M220 122 L372 48 H428 L580 122 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, roof);
      el("circle", { cx: 400, cy: 40, r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, roof);
      const seats = SEATS.map(([lab, pick], i) => {
        const g = el("g", {}, svg);
        ring(g, { x: -112, y: -33, width: 224, height: 66, rx: 22 });
        el("rect", { x: -100, y: -23, width: 200, height: 46, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
        mono(g, 0, 6.5, lab, { "font-size": 18 });
        button(g, `${lab}: ${pick}`, () => pickSeat(i));
        return g;
      });
      const card = el("g", {}, svg);
      ring(card, { x: 236, y: 464, width: 328, height: 122, rx: 28 });
      box(card, 250, 488, 300, 84, 22, SKY, LIL, 8);
      el("path", { d: "M386 490 L400 472 L414 490", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, card);
      const pickT = mono(card, 400, 540, "", { "font-size": 28 });
      /* rotation in degrees; seat i is in front when rot + 60 i is a whole turn */
      const spinRaw = (from, s) => from + V * (s < T ? (s * s) / (2 * T) : s - T / 2);
      const def = (e) => 150 + 214 * io(seg(e, 0.5, 5.6)) - 4 * io(seg(e, 5.6, 6.0));
      let ov = null; const lv = {};
      const state = (e) => {
        if (!ov || e < ov.at) return { rot: def(e), v: ob(seg(e, 5.9, 6.4)), lo: oc(seg(e, 6.3, 6.7)), pick: 0, land: 5.75 };
        const s = e - ov.at;
        if (ov.kind === "spin") { const v = ov.v0 * (1 - io(seg(s, 0, 0.35))); return { rot: api.calm ? ov.from : spinRaw(ov.from, s), v, lo: v, pick: ov.p0, land: -99 }; }
        const arr = ov.at + ov.D, rot = ov.from + (ov.to + 3 - ov.from) * io(seg(e, ov.at, ov.at + ov.D * 0.85)) - 3 * io(seg(e, ov.at + ov.D * 0.85, arr));
        if (e < arr - 0.05) { const v = ov.v0 * (1 - io(seg(s, 0, 0.3))); return { rot, v, lo: v, pick: ov.p0, land: -99 }; }
        return { rot, v: ob(seg(e, arr - 0.05, arr + 0.45)), lo: oc(seg(e, arr + 0.3, arr + 0.7)), pick: ov.seat, land: arr - ov.D * 0.15 };
      };
      const pickSeat = (i) => {
        const st = state(api.now());
        if (st.v > 0.99 && st.pick === i) return;
        const from = st.rot;
        let to = from + ((((-60 * i - from) % 360) + 360) % 360);
        if (to - from < 8) to += 360;
        ov = { kind: "stop", at: api.mark(), from, to, seat: i, D: 1 + (to - from) / 200, v0: cl(st.v), p0: st.pick };
        api.poke();
      };
      button(card, "Start the carousel again", () => {
        const st = state(api.now());
        if (st.v < 0.5) return;
        ov = { kind: "spin", at: api.mark(), from: st.rot, v0: cl(st.v), p0: st.pick };
        api.poke();
      });
      return (e) => {
        const st = state(e);
        const kb = ob(seg(e, 0, 0.55)); sat(base, 400, 300, (0.8 + 0.2 * kb).toFixed(3)); op(base, seg(e, 0, 0.12));
        const kr = ob(seg(e, 0.15, 0.7)); tf(roof, 0, (-60 * (1 - kr)).toFixed(2)); op(roof, seg(e, 0.15, 0.27));
        dots.forEach((d, k) => { const b = ((st.rot + k * 30) * Math.PI) / 180, c = Math.cos(b); d.setAttribute("cx", (400 + 332 * Math.sin(b)).toFixed(1)); d.setAttribute("cy", (302 + 146 * c).toFixed(1)); op(d, c > 0.35 ? 1 : 0); });
        const ds = e - st.land;
        seats.forEach((g, i) => {
          const a = ((st.rot + 60 * i) * Math.PI) / 180, c = Math.cos(a), t0 = 0.5 + i * 0.09, k = ob(seg(e, t0, t0 + 0.45));
          const bump = i === st.pick && ds > 0 ? 0.08 * Math.sin(Math.PI * seg(ds, 0, 0.45)) : 0;
          tf(g, (C[0] + Math.sin(a) * RX).toFixed(1), (C[1] + c * RY).toFixed(1), ((0.86 + 0.14 * c) * k + bump).toFixed(3)); op(g, seg(e, t0, t0 + 0.1));
        });
        tf(card, 0, (30 * (1 - st.v)).toFixed(2)); op(card, st.v);
        pickT.textContent = SEATS[st.pick][1]; op(pickT, st.lo); pickT.setAttribute("transform", `translate(0 ${(6 * (1 - st.lo)).toFixed(2)})`);
        live(card, st.v > 0.5, lv);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      box(pill, 397, 54, 166, 38, 19, LIL, null, 0, 2.5);
      mono(pill, 480, 79, "Alternatives", { "font-size": 18 });
      const title = txt(svg, 480, 170, "Orca alternatives", { "text-anchor": "middle", "font-size": 78, "font-weight": 700 });
      const line = txt(svg, 480, 220, "6 picks for parallel coding agents", { "text-anchor": "middle", "font-size": 28, "font-weight": 600 });
      const date = mono(svg, 480, 260, "Checked 19 Nov 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });
      const NAMES = ["T3 Code", "Munder Difflin", "Emdash", "Paradev", "Herdr", "Conductor"], COLS = [SKY, YEL, BLUE, MINT, LIL, SOFT];
      const ws = NAMES.map((s) => s.length * 12 + 36), gap = 14;
      let x = (960 - ws.reduce((a, b) => a + b, 0) - gap * 5) / 2;
      const xs = ws.map((w) => { const v = x; x += w + gap; return v; }), cx = xs.map((v, i) => v + ws[i] / 2);
      const wire = el("path", { d: `M480 360 V396 M${cx[0]} 422 V396 H${cx[5]} V422 ${cx.slice(1, 5).map((c) => `M${c} 396 V422`).join(" ")}`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const orca = el("g", {}, svg);
      box(orca, 415, 304, 130, 56, 16, SOFT, null, 0, 2.5);
      mono(orca, 480, 340, "Orca", { "font-size": 24, fill: MUTE });
      const tiles = NAMES.map((s, i) => { const g = el("g", {}, svg); box(g, xs[i], 422, ws[i], 58, 16, COLS[i], null, 0, 2.5); mono(g, cx[i], 458, s, { "font-size": 20 }); return g; });
      return (e) => {
        sat(pill, 480, 73, (0.6 + 0.4 * ob(seg(e, 0, 0.45))).toFixed(3)); op(pill, seg(e, 0, 0.12));
        [title, line].forEach((n, i) => { const k = oc(seg(e, 0.1 + i * 0.1, 0.6 + i * 0.1)); op(n, k); tf(n, 0, (20 * (1 - k)).toFixed(2)); });
        tf(orca, 0, (-24 * (1 - ob(seg(e, 0.6, 1.1)))).toFixed(2)); op(orca, seg(e, 0.6, 0.75));
        op(wire, seg(e, 1.0, 1.4));
        tiles.forEach((g, i) => { const t = 1.3 + i * 0.1; tf(g, 0, (36 * (1 - ob(seg(e, t, t + 0.55)))).toFixed(2)); op(g, seg(e, t, t + 0.15)); });
        const kd = oc(seg(e, 2.2, 2.7)); op(date, kd); tf(date, 0, (10 * (1 - kd)).toFixed(2));
      };
    },
  };

  /* ---- player: plays once in view, holds a calm final frame, replays when it comes back into view ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let e = 0, last = 0, raf = 0, seen = false, touched = false, draw = () => {};
    const frame = () => draw(calm ? sc.still : e);
    const tick = () => { cancelAnimationFrame(raf); const n = performance.now() / 1000; e += cl(n - last, 0, 0.1); last = n; frame(); if (seen && !calm) raf = requestAnimationFrame(tick); };
    const api = {
      calm,
      now: () => (calm ? sc.still : e),
      mark: () => { touched = true; return calm ? sc.still - 100 : e; },
      poke: () => (calm || !seen ? frame() : tick()),
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed); return; }
    new IntersectionObserver(([en]) => {
      seen = en.isIntersecting;
      if (seen) {
        if (!touched && e > sc.dur + 2) e = 0;
        last = performance.now() / 1000; tick();
        if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); }
      } else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 28px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
