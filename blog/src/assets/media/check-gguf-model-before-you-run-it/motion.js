/* Bright coded scenes for "GGUF Malware: How to Check a Model Before You Run It". Vanilla JS, no library.
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
  const lerp = (a, b, k) => a + (b - a) * k;
  const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
  const decay = (t, a, f, k) => (t < a ? 0 : Math.sin((t - a) * f) * Math.exp(-(t - a) * k));
  const show = (n, o) => n.setAttribute("opacity", o);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* one tap target per scene: a clear pad, plus a dashed ring that shows on hover and on keyboard focus */
  const hit = (svg, label, fn) => {
    const g = el("g", {}, svg), pad = el("rect", { fill: "#fff", "fill-opacity": 0 }, g);
    const ring = el("rect", { fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 10", "stroke-linecap": "round", class: "mg-ring" }, g);
    button(g, label, fn);
    return (x, y, w, h, r = 36) => [pad, ring].forEach((n) => { n.setAttribute("x", x); n.setAttribute("y", y); n.setAttribute("width", w); n.setAttribute("height", h); n.setAttribute("rx", r); });
  };
  const tickMark = (p, r = 24) => {
    const g = el("g", {}, p);
    el("circle", { r, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
    el("path", { d: `M${-r * 0.42} ${r * 0.04} L${-r * 0.1} ${r * 0.36} L${r * 0.44} ${-r * 0.3}`, stroke: INK, "stroke-width": 4.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    return g;
  };
  /* one half of a fortune cookie, drawn to the right of its centre fold; the left half is the same, mirrored */
  const half = (g, fill, sw = 3) => {
    el("path", { d: "M0 -112 C80 -112 180 -70 204 12 C214 52 182 80 140 72 C92 62 42 22 0 24 Z", fill, stroke: INK, "stroke-width": sw, "stroke-linejoin": "round" }, g);
    el("path", { d: "M10 -78 C70 -62 126 -18 150 44", stroke: INK, "stroke-width": sw * 0.85, fill: "none", "stroke-linecap": "round" }, g);
    el("path", { d: "M28 -88 C76 -86 122 -70 152 -44", stroke: "#fff", "stroke-width": sw * 2.4, fill: "none", "stroke-linecap": "round" }, g);
  };

  const SC = {};

  /* ---- 1. a fortune cookie cracks open and its slip, the chat template, holds one hidden line ---- */
  SC.fortunecookie = {
    dur: 9, still: 9,
    build(svg, api) {
      const CX = 700, CY = 790;
      const plate = el("g", {}, svg);
      el("ellipse", { cx: CX + 16, cy: 906, rx: 380, ry: 84, fill: LIL }, plate);
      el("ellipse", { cx: CX, cy: 890, rx: 380, ry: 84, fill: SOFT, stroke: INK, "stroke-width": 3 }, plate);
      el("ellipse", { cx: CX, cy: 882, rx: 284, ry: 54, fill: "none", stroke: INK, "stroke-width": 2.5 }, plate);
      const cup = el("g", {}, svg);
      el("ellipse", { cx: 1286, cy: 946, rx: 150, ry: 18, fill: SOFT }, cup);
      const hd = "M1398 806 C1484 800 1488 902 1368 900";
      el("path", { d: hd, stroke: INK, "stroke-width": 32, fill: "none", "stroke-linecap": "round" }, cup);
      el("path", { d: hd, stroke: BLUE, "stroke-width": 25, fill: "none", "stroke-linecap": "round" }, cup);
      el("path", { d: "M1130 770 H1410 C1410 872 1362 938 1300 938 H1240 C1178 938 1130 872 1130 770 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, cup);
      el("ellipse", { cx: 1270, cy: 770, rx: 140, ry: 24, fill: SOFT, stroke: INK, "stroke-width": 3 }, cup);

      /* the slip: 680 by 360, drawn behind the cookie so it is hidden until the cookie cracks */
      const slip = el("g", {}, svg);
      el("rect", { x: 16, y: 18, width: 680, height: 360, rx: 22, fill: LIL }, slip);
      el("rect", { x: 0, y: 0, width: 680, height: 360, rx: 22, fill: SKY, stroke: INK, "stroke-width": 3 }, slip);
      const head = txt(slip, 48, 80, "chat template", { "font-size": 50, "font-weight": 700 });
      const W = [440, 380, 420];
      const rows = W.map((w, i) => {
        const y = 120 + i * 76, g = el("g", {}, slip);
        if (i < 2) el("rect", { x: 112, y, width: w, height: 52, rx: 26, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        else el("rect", { x: 112, y, width: w, height: 52, rx: 26, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "10 9" }, g);
        return { g, y, tick: i < 2 ? tickMark(slip, 24) : null };
      });
      const lit = el("g", {}, slip);
      const litBar = el("rect", { x: 112, y: 272, width: 0, height: 52, rx: 26, fill: LIL, stroke: INK, "stroke-width": 2.5 }, lit);
      const word = txt(lit, 142, 308, "", { "font-family": MONO, "font-size": 32, "font-weight": 700 });

      const cookie = el("g", {}, svg), L = el("g", {}, cookie), R = el("g", {}, cookie);
      half(L, YEL); half(R, YEL);
      const CR = [[548, 908], [604, 934], [652, 914], [762, 930], [826, 906], [880, 928]];
      const crumbs = CR.map((_, i) => el("path", { d: "M-8 -4 L2 -9 L9 -1 L4 8 L-6 6 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg));
      const pad = hit(svg, "Close the fortune cookie and crack it open again", () => api.replay(1.15));
      pad(462, 646, 476, 240, 40);

      return (t) => {
        const kp = oc(seg(t, 0, 0.6)), kc = oc(seg(t, 0.12, 0.72));
        show(plate, seg(t, 0, 0.2)); tf(plate, 0, 40 * (1 - kp));
        show(cup, seg(t, 0.12, 0.32)); tf(cup, 0, 40 * (1 - kc));
        const f = seg(t, 0.3, 0.9), drop = -440 * (1 - f * f) - 24 * bump(t, 0.9, 1.15);
        const w = seg(t, 1.3, 1.9), wob = 3.5 * Math.sin(w * Math.PI * 4) * (1 - w);
        show(cookie, t < 0.3 ? 0 : 1);
        cookie.setAttribute("transform", `translate(${CX} ${CY + drop}) rotate(${wob} 0 24)`);
        const kk = ob(seg(t, 1.9, 2.45)), r = 16 * kk, dx = 36 * kk;
        R.setAttribute("transform", `translate(${dx} 0) rotate(${r} 0 24)`);
        L.setAttribute("transform", `translate(${-dx} 0) rotate(${-r} 0 24) scale(-1 1)`);
        crumbs.forEach((n, i) => {
          const a = 1.95 + i * 0.07, k = seg(t, a, a + 0.55), x0 = CX + (i - 2.5) * 12, y0 = CY - 40;
          const x = lerp(x0, CR[i][0], k), y = lerp(y0, CR[i][1], k) - 150 * 4 * k * (1 - k);
          show(n, t < a ? 0 : 1); tf(n, x, y, 1, 220 * k + i * 40);
        });
        /* slip rises out of the crack, then unfolds to full size with a small overshoot */
        const m = io(seg(t, 2.0, 3.1)), g = ob(seg(t, 2.25, 3.3)), sx = lerp(0.18, 1, g), sy = lerp(0.22, 1, g);
        show(slip, t < 1.95 ? 0 : 1);
        slip.setAttribute("transform", `translate(${CX} ${lerp(758, 416, m)}) scale(${sx} ${sy}) translate(-340 -180)`);
        const kh = oc(seg(t, 3.25, 3.65)); show(head, kh); head.setAttribute("transform", `translate(${-24 * (1 - kh)} 0)`);
        rows.forEach((rw, i) => {
          const a = 3.4 + i * 0.1, k = oc(seg(t, a, a + 0.4));
          show(rw.g, seg(t, a, a + 0.15)); rw.g.setAttribute("transform", `translate(${30 * (1 - k)} 0)`);
          if (rw.tick) { const b = 4.3 + i * 0.5, q = ob(seg(t, b, b + 0.4)); show(rw.tick, t < b ? 0 : 1); tf(rw.tick, 64, rw.y + 26, Math.max(0, q)); }
        });
        /* the blank third line lights up lilac, pulses once, then its words type in */
        litBar.setAttribute("width", 420 * oc(seg(t, 5.4, 5.9)));
        show(lit, t < 5.4 ? 0 : 1);
        const pulse = 1 + 0.07 * bump(t, 5.85, 6.3);
        lit.setAttribute("transform", `translate(322 298) scale(${pulse}) translate(-322 -298)`);
        word.textContent = "hidden line".slice(0, Math.round(11 * seg(t, 6.0, 6.75)));
      };
    },
  };

  /* ---- 2. a suitcase on a luggage scale tips over; its false bottom hides a parcel ---- */
  SC.baggage = {
    dur: 9, still: 9,
    build(svg, api) {
      const PX = 840, FL = 860;
      svg = el("g", { transform: "translate(-60 -150)" }, svg);
      const scale = el("g", {}, svg);
      el("rect", { x: 376, y: 914, width: 880, height: 100, rx: 22, fill: LIL }, scale);
      el("rect", { x: 360, y: 898, width: 880, height: 100, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, scale);
      el("rect", { x: 250, y: FL, width: 1100, height: 40, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, scale);
      el("circle", { cx: 800, cy: 950, r: 36, fill: "#fff", stroke: INK, "stroke-width": 3 }, scale);
      [-60, -30, 0, 30, 60].forEach((a) => el("path", { d: "M0 -31 V-24", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", transform: `translate(800 950) rotate(${a})` }, scale));
      const needle = el("path", { d: "M0 6 V-25", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, scale);
      el("circle", { cx: 800, cy: 950, r: 5, fill: INK }, scale);

      /* parcel sits inside the drawer, behind it, until it slips out */
      const parcel = el("g", {}, svg);
      el("rect", { x: 0, y: 0, width: 250, height: 82, rx: 10, fill: LIL, stroke: INK, "stroke-width": 3 }, parcel);
      el("path", { d: "M3 20 H247", stroke: INK, "stroke-width": 2.5 }, parcel);
      txt(parcel, 125, 60, "extra bytes", { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });

      /* the suitcase, drawn around its centre, 300 by 380; local x 60 to 150 is the false bottom */
      const bag = el("g", {}, svg);
      const hd = "M-105 -190 V-214 Q-105 -234 -85 -234 H-5 Q15 -234 15 -214 V-190";
      el("path", { d: hd, stroke: INK, "stroke-width": 20, fill: "none" }, bag);
      el("path", { d: hd, stroke: BLUE, "stroke-width": 13, fill: "none" }, bag);
      const drawer = el("g", {}, bag);
      el("path", { d: "M60 -190 H124 Q150 -190 150 -164 V164 Q150 190 124 190 H60 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, drawer);
      let lining = "M60 -182 V182 H70";
      for (let y = 182; y > -182; y -= 26) lining += ` Q86 ${y - 13} 70 ${y - 26}`;
      const lin = el("path", { d: lining + " H60 Z", fill: SOFT, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, drawer);
      el("rect", { x: 94, y: 166, width: 24, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, drawer);
      el("path", { d: "M-124 -190 H60 V190 H-124 Q-150 190 -150 164 V-164 Q-150 -190 -124 -190 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bag);
      [-110, 20].forEach((x) => el("path", { d: `M${x} -166 V166`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, bag));
      txt(bag, -45, 0, "model weights", { "text-anchor": "middle", "dominant-baseline": "central", "font-family": MONO, "font-size": 32, "font-weight": 700, transform: "rotate(-90 -45 0)" });

      const tag = el("g", {}, svg);
      el("rect", { x: -30, y: 34, width: 252, height: 70, rx: 14, fill: SKY, stroke: INK, "stroke-width": 3 }, tag);
      el("path", { d: "M0 0 V49", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, tag);
      el("circle", { cx: 0, cy: 58, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 117, 79, "last tensor", { "text-anchor": "middle", "font-family": MONO, "font-size": 27, "font-weight": 700 });

      const mag = el("g", {}, svg);
      el("path", { d: "M-90 -90 L-200 -200", stroke: INK, "stroke-width": 36, "stroke-linecap": "round" }, mag);
      el("path", { d: "M-90 -90 L-200 -200", stroke: YEL, "stroke-width": 29, "stroke-linecap": "round" }, mag);
      el("circle", { r: 118, fill: "none", stroke: INK, "stroke-width": 25 }, mag);
      el("circle", { r: 118, fill: "none", stroke: YEL, "stroke-width": 18 }, mag);
      const ok = tickMark(svg, 34);
      const pad = hit(svg, "Close the false bottom of the suitcase and open it again", () => api.replay(2.8));

      /* where a point on the suitcase lands once it has turned by a degrees about its bottom right corner */
      const world = (lx, ly, a, dy) => { const r = (a * Math.PI) / 180, vx = lx - 150, vy = ly - 190; return [PX + vx * Math.cos(r) - vy * Math.sin(r), FL + dy + vx * Math.sin(r) + vy * Math.cos(r)]; };

      return (t) => {
        const ks = oc(seg(t, 0, 0.6)); show(scale, seg(t, 0, 0.2)); tf(scale, 0, 50 * (1 - ks));
        const f = seg(t, 0.3, 0.8), dy = -380 * (1 - f * f) - 20 * bump(t, 0.8, 1.05);
        const a = 90 * io(seg(t, 1.6, 2.45)) - 5 * bump(t, 2.45, 2.75);
        show(bag, t < 0.3 ? 0 : 1); show(tag, t < 0.3 ? 0 : 1);
        bag.setAttribute("transform", `translate(${PX} ${FL + dy}) rotate(${a}) translate(-150 -190)`);
        needle.setAttribute("transform", `translate(800 950) rotate(${-55 + 80 * ob(seg(t, 0.8, 1.35)) + 8 * bump(t, 2.45, 2.85)})`);
        const d = 170 * ob(seg(t, 2.9, 3.55));
        drawer.setAttribute("transform", `translate(0 ${d})`); show(lin, d > 2 ? 1 : 0);
        const s = 310 * io(seg(t, 3.5, 4.45)), wob = 5 * decay(t, 4.45, 14, 5);
        show(parcel, t < 2.5 ? 0 : 1);
        parcel.setAttribute("transform", `translate(${PX + 20 - d - s} ${FL - 84}) rotate(${wob} 125 84)`);
        const [ax, ay] = world(-20, -234, a, dy);
        const sw = 12 * decay(t, 0.8, 11, 3) - 14 * bump(t, 1.6, 2.45) + 16 * decay(t, 2.45, 9, 2.6);
        tf(tag, ax, ay, 1, sw);
        const km = io(seg(t, 4.8, 5.7)), h = seg(t, 5.7, 6.5);
        const mx = lerp(250, 505, km) + 16 * Math.sin(h * Math.PI * 2) * (1 - h), my = lerp(470, 814, km) + 10 * Math.sin(h * Math.PI * 4) * (1 - h);
        show(mag, seg(t, 4.8, 5.0)); tf(mag, mx, my, 0.9 + 0.1 * km, -10 * (1 - km));
        const kt = ob(seg(t, 6.6, 7.1)); show(ok, t < 6.6 ? 0 : 1); tf(ok, 1178, 606, Math.max(0, kt));
        const p = cl(a / 90);
        pad(lerp(518, 652, p), lerp(418, 536, p), lerp(360, 640, p), lerp(462, 336, p), 40);
      };
    },
  };

  /* ---- 3. a smoke alarm with 8 lights runs the 8 checks one at a time ---- */
  SC.smokealarm = {
    dur: 9, still: 9,
    build(svg, api) {
      const CX = 800, CY = 410, S = 1.4, P = 0.62, FLAG = 3;
      const CHECKS = ["Original publisher", "Read the template", "Commands in the template", "Extra bytes", "Antivirus alone", "Your own template", "No command from a model", "Check again"];
      const panel = el("g", {}, svg);
      el("rect", { x: 416, y: 66, width: 768, height: 690, rx: 34, fill: SOFT }, panel);
      el("rect", { x: 400, y: 50, width: 768, height: 690, rx: 34, fill: SKY, stroke: INK, "stroke-width": 3 }, panel);
      [[450, 100], [1118, 100], [450, 690], [1118, 690]].forEach(([x, y]) => { el("circle", { cx: x, cy: y, r: 13, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, panel); el("path", { d: `M${x - 6} ${y + 6} L${x + 6} ${y - 6}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, panel); });
      const alarm = el("g", {}, svg);
      el("circle", { cx: CX + 14, cy: CY + 16, r: 250, fill: LIL }, alarm);
      el("circle", { cx: CX, cy: CY, r: 250, fill: SOFT, stroke: INK, "stroke-width": 3 }, alarm);
      el("circle", { cx: CX, cy: CY, r: 172, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, alarm);
      for (let j = 0; j < 12; j++) el("rect", { x: -17, y: -6, width: 34, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2, transform: `translate(${CX} ${CY}) rotate(${j * 30 + 15}) translate(128 0)` }, alarm);
      el("circle", { cx: CX, cy: CY, r: 62, fill: "#fff", stroke: INK, "stroke-width": 3 }, alarm);
      el("circle", { cx: CX, cy: CY, r: 42, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, alarm);
      const glow = el("circle", { r: 31, fill: "none", stroke: YEL, "stroke-width": 8 }, svg);
      const lights = CHECKS.map((_, i) => {
        const a = ((-90 + i * 45) * Math.PI) / 180;
        return { n: el("circle", { r: 18, stroke: INK, "stroke-width": 2.5 }, svg), x: CX + Math.cos(a) * 211, y: CY + Math.sin(a) * 211 };
      });
      const label = el("g", {}, svg);
      el("rect", { x: 392, y: 832, width: 840, height: 96, rx: 48, fill: SOFT }, label);
      el("rect", { x: 380, y: 820, width: 840, height: 96, rx: 48, fill: BLUE, stroke: INK, "stroke-width": 3 }, label);
      const old = txt(label, 800, 882, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 40, "font-weight": 700 });
      const word = txt(label, 800, 882, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 40, "font-weight": 700 });
      const ribbon = el("g", {}, svg);
      el("path", { d: "M556 994 H1076 L1046 1050 L1076 1106 H556 L586 1050 Z", fill: LIL }, ribbon);
      el("path", { d: "M540 980 H1060 L1030 1036 L1060 1092 H540 L570 1036 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, ribbon);
      const r8 = txt(ribbon, 800, 1054, "8 checks", { "text-anchor": "middle", "font-size": 52, "font-weight": 700 });
      const pad = hit(svg, "Run the lights on the smoke alarm again", () => api.replay(1.3));
      pad(CX - 272, CY - 272, 544, 544, 272);

      return (t) => {
        const kp = oc(seg(t, 0, 0.6)); show(panel, seg(t, 0, 0.2)); tf(panel, 0, -50 * (1 - kp));
        const ka = ob(seg(t, 0.12, 0.8)); show(alarm, seg(t, 0.12, 0.3));
        alarm.setAttribute("transform", `translate(${CX} ${CY}) scale(${0.8 + 0.2 * ka}) translate(${-CX} ${-CY})`);
        const step = t < S ? -1 : Math.min(7, Math.floor((t - S) / P)), done = t >= S + 8 * P;
        const all = 1 + 0.28 * bump(t, 6.5, 6.95);
        lights.forEach((L, i) => {
          const a = 0.5 + i * 0.06, k = ob(seg(t, a, a + 0.35)), on = t >= S + i * P;
          const flag = i === FLAG && t >= S + FLAG * P + 0.32;
          L.n.setAttribute("fill", flag ? LIL : on ? YEL : "#fff");
          const sh = i === FLAG ? 6 * decay(t, S + FLAG * P + 0.32, 40, 7) : 0;
          tf(L.n, L.x + sh, L.y, Math.max(0, k) * (1 + 0.4 * bump(t, S + i * P, S + i * P + 0.3)) * all);
        });
        if (step >= 0 && !done) {
          const L = lights[step], kg = ob(seg(t, S + step * P, S + step * P + 0.25));
          show(glow, 1); glow.setAttribute("stroke", step === FLAG && t >= S + FLAG * P + 0.32 ? LIL : YEL); tf(glow, L.x, L.y, Math.max(0, kg));
        } else show(glow, 0);
        const kl = oc(seg(t, 0.8, 1.25)); show(label, seg(t, 0.8, 1.0)); tf(label, 0, 40 * (1 - kl));
        /* the old check slides up and out while the new one slides in from below */
        const b = S + step * P, ko = seg(t, b, b + 0.16), kw = step < 0 ? 0 : oc(seg(t, b + 0.08, b + 0.34));
        word.textContent = step < 0 ? "" : CHECKS[step]; old.textContent = step > 0 ? CHECKS[step - 1] : "";
        const hush = api.busy() ? 0 : 1; /* no flicker of names while the lights rewind */
        show(word, kw * hush); word.setAttribute("transform", `translate(0 ${26 * (1 - kw)})`);
        show(old, (1 - ko) * hush); old.setAttribute("transform", `translate(0 ${-22 * ko})`);
        const kr = ob(seg(t, 6.45, 7.0)); show(ribbon, t < 6.45 ? 0 : 1);
        ribbon.setAttribute("transform", `translate(800 1036) scale(${Math.max(0, 0.6 + 0.4 * kr)}) translate(-800 -1036)`);
        const k8 = oc(seg(t, 6.8, 7.15)); show(r8, k8); r8.setAttribute("transform", `translate(0 ${18 * (1 - k8)})`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 96, y: 60, width: 172, height: 58, rx: 29, fill: SKY, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 182, 99, "Guides", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const line = el("path", { d: "M100 368 H100", stroke: YEL, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      const t1 = txt(svg, 96, 236, "GGUF Malware: How to Check", { "font-size": 84, "font-weight": 700 });
      const t2 = txt(svg, 96, 334, "a Model Before You Run It", { "font-size": 84, "font-weight": 700 });
      const uw = t2.getComputedTextLength ? t2.getComputedTextLength() : 1000;
      const sub = txt(svg, 96, 442, "Read the template. Scan the file.", { "font-size": 38, "font-weight": 500, fill: MUTE });
      const when = txt(svg, 96, 500, "Checked 28 Nov 2026", { "font-family": MONO, "font-size": 26, "font-weight": 500, fill: MUTE });
      const tiles = [[96, LIL, "5 malicious GGUF models"], [824, MINT, "2,428 downloads"]].map(([x, fill, s], i) => {
        const g = el("g", {}, svg), cx = x + 340;
        el("rect", { x: x + 14, y: 574, width: 680, height: 288, rx: 28, fill: SOFT }, g);
        el("rect", { x, y: 560, width: 680, height: 288, rx: 28, fill, stroke: INK, "stroke-width": 3 }, g);
        const ic = el("g", {}, g);
        if (i === 0) {
          const hd = "M-25 -48 V-62 Q-25 -72 -15 -72 H15 Q25 -72 25 -62 V-48";
          el("path", { d: hd, stroke: INK, "stroke-width": 15, fill: "none" }, ic);
          el("path", { d: hd, stroke: BLUE, "stroke-width": 9, fill: "none" }, ic);
          el("rect", { x: -58, y: -48, width: 116, height: 100, rx: 16, fill: BLUE, stroke: INK, "stroke-width": 3 }, ic);
          [-28, 28].forEach((dx) => el("path", { d: `M${dx} -36 V40`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, ic));
        } else {
          const L = el("g", { transform: "translate(0 16) scale(-0.52 0.52)" }, ic), R = el("g", { transform: "translate(0 16) scale(0.52)" }, ic);
          half(L, SKY, 5.8); half(R, SKY, 5.8);
        }
        const lab = txt(g, cx, 800, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 38, "font-weight": 700 });
        return { g, ic, lab, cx };
      });
      return (t) => {
        const kp = oc(seg(t, 0.1, 0.5)); show(pill, seg(t, 0.1, 0.25)); tf(pill, 0, -20 * (1 - kp));
        [t1, t2].forEach((n, i) => { const a = 0.22 + i * 0.1, k = oc(seg(t, a, a + 0.5)); show(n, seg(t, a, a + 0.2)); n.setAttribute("transform", `translate(0 ${30 * (1 - k)})`); });
        line.setAttribute("d", `M100 368 H${100 + (uw - 8) * io(seg(t, 0.8, 1.5))}`);
        [sub, when].forEach((n, i) => { const a = 0.95 + i * 0.12, k = oc(seg(t, a, a + 0.45)); show(n, seg(t, a, a + 0.2)); n.setAttribute("transform", `translate(${-20 * (1 - k)} 0)`); });
        tiles.forEach((T, i) => {
          const a = 1.4 + i * 0.12, k = ob(seg(t, a, a + 0.6)), sc = Math.max(0, lerp(0.6, 1, k));
          show(T.g, t < a ? 0 : 1); T.g.setAttribute("transform", `translate(${T.cx} 704) scale(${sc}) translate(${-T.cx} -704) translate(0 ${40 * (1 - k)})`);
          const b = 2.0 + i * 0.12, q = ob(seg(t, b, b + 0.5)); tf(T.ic, T.cx, 668, Math.max(0, q), i === 0 ? -6 * bump(t, b + 0.3, b + 0.8) : 0);
          const c = 2.4 + i * 0.12, z = oc(seg(t, c, c + 0.4)); show(T.lab, seg(t, c, c + 0.2)); T.lab.setAttribute("transform", `translate(0 ${16 * (1 - z)})`);
        });
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 1600, H = sc.h || 1200;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    /* each scene plays once, from when it first comes into view, and rests on its calm final frame */
    let cur = calm ? sc.still : 0, raf = 0, seen = false, last = 0, back = null;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const at = () => (back ? lerp(back.from, back.to, io(seg(clock(), back.t0, back.t0 + back.len))) : cur);
    const tick = () => {
      cancelAnimationFrame(raf);
      const now = clock(), dt = cl(now - last, 0, 0.1); last = now;
      if (back && now >= back.t0 + back.len) { cur = back.to; back = null; } else if (!back) cur = Math.min(sc.dur, cur + dt);
      draw(at(), now);
      if (seen && (back || cur < sc.dur)) raf = requestAnimationFrame(tick);
    };
    /* replay(to): ease the scene back to time `to`, then play it forward; with reduced motion it skips the ease back */
    const api = { now: clock, busy: () => !!back, replay: (to) => { const from = at(); back = calm ? null : { from, to, t0: clock(), len: 0.45 + 0.4 * cl((from - to) / sc.dur) }; if (calm) cur = to; last = clock(); tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { last = clock(); tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    draw(at(), 0);
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
