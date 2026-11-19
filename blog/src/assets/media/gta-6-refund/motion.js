/* Swiss flowchart scenes for "GTA 6 refund". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", AQUA = "#3FC6C9", NAVY = "#22305E";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  /* ---- shared Swiss flowchart kit ---- */
  const mono = (fs, a = {}) => Object.assign({ "font-family": MONO, "font-size": fs, "font-weight": 700, "text-anchor": "middle" }, a);
  const layer = (svg, hit) => el("g", hit ? {} : { "pointer-events": "none" }, svg);
  const dia = (hw, hh) => `M0 ${-hh} L${hw} 0 L0 ${hh} L${-hw} 0 Z`;
  const fit = (n, max) => { try { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", ((parseFloat(n.getAttribute("font-size")) * max) / w).toFixed(2)); } catch (e) { /* keeps its size */ } };
  const pathD = (pts) => pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
  const plen = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]); return s; };
  const pat = (pts, s) => {
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], l = Math.abs(dx) + Math.abs(dy);
      if (s <= l || i === pts.length - 1) { const k = l ? cl(s / l) : 0; return [pts[i - 1][0] + dx * k, pts[i - 1][1] + dy * k]; }
      s -= l;
    }
    return pts[0];
  };
  /* hover and focus lift: the shape rises off its lilac shadow */
  const lifter = (hit, lift) => {
    if (!calm) lift.style.transition = "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)";
    const up = () => { lift.style.transform = "translate(-2px, -3px)"; }, down = () => { lift.style.transform = ""; };
    hit.addEventListener("pointerenter", up); hit.addEventListener("pointerleave", down); hit.addEventListener("focus", up); hit.addEventListener("blur", down);
  };
  /* thin grid ticks on a 100 unit module, fading in as a diagonal wave */
  const grid = (svg, W, H, keep) => {
    const g = layer(svg), ms = [];
    for (let y = 50; y < H; y += 100) for (let x = 50; x < W; x += 100) if (!keep || keep(x, y)) ms.push([el("path", { d: `M${x - 5} ${y} H${x + 5} M${x} ${y - 5} V${y + 5}`, stroke: MUTE, "stroke-width": 1.2, opacity: 0 }, g), (x + y) / (W + H)]);
    return (t) => ms.forEach(([m, k]) => m.setAttribute("opacity", 0.4 * oc(seg(t, k * 0.7, k * 0.7 + 0.4))));
  };
  /* an ink line that draws itself and ends in an arrowhead */
  const wire = (p, pts, arrow = true) => {
    const g = el("g", {}, p), a = pts[pts.length - 2], b = pts[pts.length - 1], dx = Math.sign(b[0] - a[0]), dy = Math.sign(b[1] - a[1]);
    const cut = pts.slice(0, -1).concat([[b[0] - dx * (arrow ? 7 : 0), b[1] - dy * (arrow ? 7 : 0)]]), L = plen(cut) + 1;
    const ln = el("path", { d: pathD(cut), fill: "none", stroke: INK, "stroke-width": 2.75, "stroke-linejoin": "round", "stroke-linecap": "round", "stroke-dasharray": L, "stroke-dashoffset": L }, g);
    const head = arrow ? el("path", { d: "M0 0 L-12 -6.5 L-12 6.5 Z", fill: INK, stroke: INK, "stroke-width": 1, "stroke-linejoin": "round", transform: `translate(${b[0]} ${b[1]}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})` }, g) : null;
    return { g, set: (k) => { ln.setAttribute("stroke-dashoffset", L * (1 - k)); ln.setAttribute("opacity", k > 0 ? 1 : 0); if (head) head.setAttribute("opacity", k > 0.92 ? 1 : 0); } };
  };
  const pill = (p, x, y, s, fs = 15) => {
    const g = el("g", {}, p), w = s.length * fs * 0.6 + 22, h = fs + 14;
    const r = el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: "#fff", stroke: INK, "stroke-width": 1.75 }, g);
    const t = txt(g, 0, fs * 0.35, s, mono(fs));
    return { g, set: (k, on, lane) => { tf(g, x, y, k <= 0 ? 0 : 0.5 + 0.5 * ob(k)); g.setAttribute("opacity", seg(k, 0, 0.3)); r.setAttribute("fill", on ? (lane ? YEL : SKY) : "#fff"); t.setAttribute("fill", on || lane ? INK : MUTE); } };
  };
  /* the yellow outcome chip: the last thing to land */
  const chip = (p, x, y, s, fs, rot, w) => {
    const g = el("g", {}, p), W = w || s.length * fs * 0.6 + 44, H = fs + 34;
    el("rect", { x: -W / 2 + 5, y: -H / 2 + 6, width: W, height: H, rx: H / 2, fill: LIL }, g);
    el("rect", { x: -W / 2, y: -H / 2, width: W, height: H, rx: H / 2, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("path", { d: `M${-W / 2 + H / 2} ${-H / 2 + 7} H${-W / 2 + H / 2 + 46}`, stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.7 }, g);
    txt(g, 0, fs * 0.35, s, mono(fs));
    return (k) => { g.setAttribute("opacity", seg(k, 0, 0.25)); tf(g, x, y - 46 * (1 - oc(k)), k <= 0 ? 1.5 : 1.5 - 0.5 * ob(k), rot - 9 * (1 - oc(k))); };
  };
  const dotOf = (p) => {
    const g = el("g", { opacity: 0 }, p);
    el("circle", { cx: 2.5, cy: 3, r: 11, fill: LIL }, g);
    el("circle", { r: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("circle", { cx: -3.5, cy: -3.5, r: 2.6, fill: "#fff" }, g);
    return g;
  };
  const T0 = 2.2, SPEED = 330;

  /* ---- a decision chart: diamonds flip on tap, the dot takes the new route ---- */
  const flow = (svg, api, S) => {
    const gridF = grid(svg, 800, 600);
    const L = { sh: layer(svg), wire: layer(svg), trail: layer(svg), out: layer(svg), pill: layer(svg), dot: layer(svg), top: layer(svg, true), over: layer(svg) };
    const ids = Object.keys(S.nodes), ans = {}, flipAt = {}, N = {}, c = (id) => [S.nodes[id].x, S.nodes[id].y];
    let R = null, prev = 0, skip = false, dirty = false;
    const startRing = el("circle", { cx: S.start[0], cy: S.start[1], r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.75 }, L.wire);
    const entry = wire(L.wire, [S.start, S.entry]);
    const trail = el("path", { fill: "none", stroke: BLUE, "stroke-width": 5.5, "stroke-linejoin": "round", "stroke-linecap": "round" }, L.trail);
    ids.forEach((id, i) => {
      const n = S.nodes[id], o = N[id] = { i };
      if (n.type === "d") {
        ans[id] = n.def; flipAt[id] = -99;
        const hw = S.hw, hh = S.hh;
        o.sh = el("path", { d: dia(hw, hh), fill: LIL }, L.sh);
        o.g = el("g", {}, L.top); const lift = el("g", {}, o.g);
        el("path", { d: dia(hw + 13, hh + 9.5), fill: "none", stroke: AQUA, "stroke-width": 3, "stroke-linejoin": "round", class: "mg-ring" }, lift);
        o.body = el("path", { d: dia(hw, hh), fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, lift);
        fit(txt(lift, 0, 6.5, n.label, { "text-anchor": "middle", "font-size": 18.5 }), 2 * hw * (1 - 10 / hh) - 14);
        txt(o.g, -hw, -hh + 15, n.num, mono(14, { "text-anchor": "start", fill: MUTE }));
        const say = () => o.g.setAttribute("aria-label", `${n.label} Answer: ${ans[id] === "y" ? "Yes" : "No"}. Press to flip the answer.`);
        button(o.g, "", () => { ans[id] = ans[id] === "y" ? "n" : "y"; flipAt[id] = api.now(); dirty = true; skip = true; say(); R = route(); api.seek(T0 - 0.05); });
        say(); lifter(o.g, lift);
      } else if (n.type === "box") {
        o.sh = el("rect", { x: -n.w / 2, y: -n.h / 2, width: n.w, height: n.h, rx: 16, fill: LIL }, L.sh);
        o.g = el("g", {}, L.out);
        o.body = el("rect", { x: -n.w / 2, y: -n.h / 2, width: n.w, height: n.h, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, o.g);
        fit(txt(o.g, 0, n.fs * 0.35, n.label, { "text-anchor": "middle", "font-size": n.fs, "font-weight": 700 }), n.w - 30);
      } else {
        o.sh = el("circle", { r: 26, fill: LIL }, L.sh);
        o.g = el("g", {}, L.out);
        o.body = el("circle", { r: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, o.g);
        el("path", { d: "M-11 1 L-3.5 9 L12 -8", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, o.g);
      }
    });
    const E = []; let j = 0;
    for (const id in S.edges) for (const a of ["y", "n"]) { const e = S.edges[id][a]; E.push({ id, a, j: j++, w: wire(L.wire, e.pts), p: pill(L.pill, e.lp[0], e.lp[1], e.label) }); }
    const dot = dotOf(L.dot);
    const land = chip(L.over, S.chip.x, S.chip.y, S.chip.text, 17, S.chip.rot);
    const extra = S.extra ? S.extra(L) : null;
    function route() {
      const hops = [{ pts: [S.start, S.entry, c(S.first)], to: S.first }]; let cur = S.first;
      while (S.nodes[cur].type === "d") { const e = S.edges[cur][ans[cur]], nx = e.to; hops.push({ pts: [c(cur)].concat(e.pts, S.nodes[nx].type === "d" ? [c(nx)] : []), to: nx }); cur = nx; }
      let t = T0 + 0.5, acc = 0, all = []; const arr = {};
      hops.forEach((h) => { h.len = plen(h.pts); h.t0 = t; h.t1 = t + Math.max(0.5, h.len / SPEED); h.s0 = acc; acc += h.len; arr[h.to] = h.t1; t = h.t1 + (S.nodes[h.to].type === "d" ? 0.34 : 0); all = all.concat(h.pts); });
      trail.setAttribute("d", pathD(all));
      return { hops, all, arr, total: acc, end: cur, tA: hops[hops.length - 1].t1 };
    }
    R = route();
    const sx = Math.sign(S.entry[0] - S.start[0]), sy = Math.sign(S.entry[1] - S.start[1]);
    return (t, now) => {
      if (t < prev - 1 && !skip && dirty) { ids.forEach((id) => { if (S.nodes[id].type === "d") { ans[id] = S.nodes[id].def; N[id].g.setAttribute("aria-label", `${S.nodes[id].label} Answer: ${ans[id] === "y" ? "Yes" : "No"}. Press to flip the answer.`); } }); dirty = false; R = route(); }
      skip = false; prev = t;
      gridF(t);
      ids.forEach((id) => {
        const n = S.nodes[id], o = N[id], k = seg(t, 0.3 + o.i * 0.1, 0.8 + o.i * 0.1), a = R.arr[id], hit = a != null && t >= a;
        const pu = a != null ? Math.sin(seg(t, a, a + 0.45) * Math.PI) * (n.type === "d" ? 0.06 : 0.09) : 0;
        const w = now - (flipAt[id] == null ? -99 : flipAt[id]), rot = w > 0 && w < 0.6 ? Math.sin(w * 30) * 5 * (1 - w / 0.6) : 0;
        const s = k <= 0 ? 0.001 : 0.6 + 0.4 * ob(k) + pu, op = seg(k, 0, 0.35), sk = oc(seg(t, 0.6 + o.i * 0.1, 1.15 + o.i * 0.1));
        tf(o.g, n.x, n.y, s, rot); o.g.setAttribute("opacity", op);
        tf(o.sh, n.x + 5 * sk, n.y + 6 * sk, s, rot); o.sh.setAttribute("opacity", op);
        o.body.setAttribute("fill", !hit ? "#fff" : n.type === "d" ? SOFT : n.type === "box" ? YEL : MINT);
      });
      const ek = oc(seg(t, 0.75, 1.2)); entry.set(ek); startRing.setAttribute("opacity", ek);
      E.forEach((e) => { const on = ans[e.id] === e.a; e.w.set(io(seg(t, 0.95 + e.j * 0.09, 1.5 + e.j * 0.09))); e.w.g.setAttribute("opacity", on ? 1 : 0.3); e.p.set(seg(t, 1.4 + e.j * 0.09, 1.8 + e.j * 0.09), on); });
      let s = 0; const h0 = R.hops[0];
      if (t >= h0.t0) for (let i = 0; i < R.hops.length; i++) { const h = R.hops[i]; if (t <= h.t1 || i === R.hops.length - 1) { s = h.s0 + io(seg(t, h.t0, h.t1)) * h.len; break; } }
      const back = 9 * Math.sin(Math.PI * seg(t, T0 + 0.1, h0.t0 + 0.12)), p = pat(R.all, s), dk = seg(t, T0, T0 + 0.3);
      tf(dot, p[0] - sx * back, p[1] - sy * back, (dk <= 0 ? 0 : ob(dk)) * (1 + 0.3 * Math.sin(seg(t, R.tA, R.tA + 0.4) * Math.PI)));
      dot.setAttribute("opacity", dk > 0 ? 1 : 0);
      trail.setAttribute("stroke-dasharray", `${s} ${R.total + 40}`); trail.setAttribute("opacity", s > 0.5 ? 1 : 0);
      land(R.end === S.chip.on ? seg(t, R.tA + 0.75, R.tA + 1.25) : 0);
      if (extra) extra(t, now, ans, R);
    };
  };

  const SC = {};

  /* ---- 1. PlayStation: a preload already answered the question ---- */
  SC.preload = {
    dur: 10, still: 10,
    build(svg, api) {
      return flow(svg, api, {
        hw: 100, hh: 62, start: [24, 95], entry: [60, 95], first: "a",
        nodes: {
          a: { type: "d", x: 160, y: 95, label: "Preordered?", num: "01", def: "y" },
          b: { type: "d", x: 400, y: 235, label: "Within 14 days?", num: "02", def: "y" },
          c: { type: "d", x: 640, y: 375, label: "Downloaded?", num: "03", def: "y" },
          box: { type: "box", x: 640, y: 541, w: 290, h: 72, fs: 22, label: "No refund unless faulty" },
          ok: { type: "end", x: 440, y: 375 },
        },
        edges: {
          a: { y: { pts: [[260, 95], [400, 95], [400, 173]], to: "b", label: "Yes", lp: [330, 95] }, n: { pts: [[160, 157], [160, 235], [300, 235]], to: "b", label: "No", lp: [160, 198] } },
          b: { y: { pts: [[500, 235], [640, 235], [640, 313]], to: "c", label: "Yes", lp: [570, 235] }, n: { pts: [[400, 297], [400, 541], [495, 541]], to: "box", label: "No", lp: [400, 440] } },
          c: { y: { pts: [[640, 437], [640, 505]], to: "box", label: "Yes, preload counts", lp: [640, 469] }, n: { pts: [[540, 375], [466, 375]], to: "ok", label: "No", lp: [506, 375] } },
        },
        chip: { x: 203, y: 541, text: "Auto download already said yes", rot: -2, on: "box" },
      });
    },
  };

  /* ---- 2. Xbox: every open branch ends at the same desk ---- */
  SC.window = {
    dur: 10, still: 10,
    build(svg, api) {
      return flow(svg, api, {
        hw: 90, hh: 66, start: [118, 34], entry: [118, 86], first: "a",
        nodes: {
          a: { type: "d", x: 118, y: 152, label: "Cancel by 9 Nov?", num: "01", def: "n" },
          b: { type: "d", x: 388, y: 152, label: "Within 14 days?", num: "02", def: "y" },
          c: { type: "d", x: 658, y: 152, label: "Lots of play time?", num: "03", def: "n" },
          box: { type: "box", x: 520, y: 408, w: 440, h: 84, fs: 28, label: "Ask, Microsoft decides" },
          ok: { type: "end", x: 118, y: 330 },
        },
        edges: {
          a: { y: { pts: [[118, 218], [118, 304]], to: "ok", label: "Yes", lp: [118, 256] }, n: { pts: [[208, 152], [298, 152]], to: "b", label: "No", lp: [240, 152] } },
          b: { y: { pts: [[478, 152], [568, 152]], to: "c", label: "Yes", lp: [512, 152] }, n: { pts: [[388, 218], [388, 366]], to: "box", label: "No", lp: [388, 288] } },
          c: { y: { pts: [[748, 152], [770, 152], [770, 408], [740, 408]], to: "box", label: "Yes", lp: [770, 288] }, n: { pts: [[658, 218], [658, 366]], to: "box", label: "No", lp: [658, 288] } },
        },
        chip: { x: 520, y: 524, text: "Requests up to day 90, not all accepted", rot: -1.5, on: "box" },
        extra(L) { // the Closed stamp slams onto the first diamond as the dot arrives
          const g = el("g", { opacity: 0 }, L.over);
          el("rect", { x: -44, y: -15, width: 96, height: 38, rx: 7, fill: LIL }, g);
          el("rect", { x: -48, y: -19, width: 96, height: 38, rx: 7, fill: "#fff", stroke: NAVY, "stroke-width": 3 }, g);
          el("rect", { x: -43.5, y: -14.5, width: 87, height: 29, rx: 4, fill: "none", stroke: NAVY, "stroke-width": 1.25 }, g);
          txt(g, 0, 6.5, "Closed", mono(18, { fill: NAVY }));
          return (t, now, ans, R) => {
            const a = R.arr.a, k = seg(t, a + 0.06, a + 0.3), on = ans.a === "n" && k > 0;
            g.setAttribute("opacity", on ? seg(k, 0, 0.4) : 0);
            tf(g, 184 + Math.sin(seg(t, a + 0.3, a + 0.62) * Math.PI * 3) * 2.2 * (1 - seg(t, a + 0.3, a + 0.62)), 96, 2.3 - 1.3 * k * k * k, -10 - 8 * (1 - k));
          };
        },
      });
    },
  };

  /* ---- 3. one question, three lanes ---- */
  SC.router = {
    dur: 9, still: 9,
    build(svg, api) {
      const gridF = grid(svg, 800, 600), X = [138, 400, 662], names = ["PS Store", "Xbox", "A shop"], ends = ["Transaction History", "Refund page", "Shop policy"];
      const L = { band: layer(svg, true), sh: layer(svg), hi: layer(svg), wire: layer(svg), trail: layer(svg), out: layer(svg), pill: layer(svg), dot: layer(svg), top: layer(svg), over: layer(svg) };
      let sel = -1, selAt = -99, prev = 0, skip = false;
      const TD = 3.0, GO = 3.45, RUN = 1.35;
      const dSh = el("path", { d: dia(150, 60), fill: LIL }, L.sh), dG = el("g", {}, L.top);
      const dBody = el("path", { d: dia(150, 60), fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, dG);
      fit(txt(dG, 0, 7.5, "Where did you pay?", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 }), 230);
      const stem = wire(L.wire, [[400, 162], [400, 202]], false), bus = [wire(L.wire, [[400, 202], [138, 202]], false), wire(L.wire, [[400, 202], [662, 202]], false)];
      const lanes = X.map((x, i) => {
        const g = el("g", {}, L.band), pts = [[400, 162], [400, 202], [x, 202], [x, 370]], len = plen(pts);
        const band = el("rect", { x: x - 122, y: 228, width: 244, height: 250, rx: 18, fill: SOFT }, g);
        el("rect", { x: x - 128, y: 222, width: 256, height: 262, rx: 23, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, g);
        txt(g, x - 104, 257, "0" + (i + 1), mono(14, { "text-anchor": "start", fill: MUTE }));
        const hi = el("path", { d: pathD(pts), fill: "none", stroke: YEL, "stroke-width": 12, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0 }, L.hi);
        const tr = el("path", { d: pathD(pts), fill: "none", stroke: BLUE, "stroke-width": 5.5, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0 }, L.trail);
        const drop = wire(L.wire, [[x, 202], [x, 370]]);
        const sh = el("rect", { x: -106, y: -41, width: 212, height: 82, rx: 16, fill: LIL }, L.sh);
        const bg = el("g", {}, L.out), lift = el("g", {}, bg);
        const body = el("rect", { x: -106, y: -41, width: 212, height: 82, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, lift);
        fit(txt(lift, 0, 7, ends[i], { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }), 188);
        const tag = pill(L.pill, x, 290, names[i], 17);
        const dot = dotOf(L.dot);
        button(g, `${names[i]}: ${ends[i]}. Press to light this route.`, () => { sel = i; selAt = api.now(); skip = true; api.seek(TD - 0.05); });
        lifter(g, lift);
        return { x, g, band, pts, len, hi, tr, drop, sh, bg, body, tag, dot };
      });
      const land = chip(L.over, 400, 536, "The store decides", 23, -1, 708);
      return (t, now) => {
        if (t < prev - 1 && !skip) sel = -1;
        skip = false; prev = t;
        gridF(t);
        const k = seg(t, 0.3, 0.8), s = k <= 0 ? 0.001 : 0.6 + 0.4 * ob(k) + 0.05 * Math.sin(seg(t, TD, TD + 0.45) * Math.PI), sk = oc(seg(t, 0.6, 1.15));
        tf(dG, 400, 102, s); dG.setAttribute("opacity", seg(k, 0, 0.35)); tf(dSh, 400 + 5 * sk, 102 + 6 * sk, s); dSh.setAttribute("opacity", seg(k, 0, 0.35));
        dBody.setAttribute("fill", t >= TD ? SOFT : "#fff");
        stem.set(io(seg(t, 0.9, 1.15))); bus.forEach((b) => b.set(io(seg(t, 1.15, 1.6))));
        lanes.forEach((l, i) => {
          const on = sel === i, show = sel < 0 || on, t0 = GO + (sel < 0 ? i * 0.14 : 0), u = io(seg(t, t0, t0 + RUN)), hit = t >= t0 + RUN;
          const bk = oc(seg(t, 1.0 + i * 0.12, 1.5 + i * 0.12)); l.band.setAttribute("opacity", bk); l.band.setAttribute("transform", `translate(0 ${18 * (1 - bk)})`);
          l.g.querySelector("text").setAttribute("opacity", bk);
          l.drop.set(io(seg(t, 1.55 + i * 0.1, 2.05 + i * 0.1))); l.tag.set(seg(t, 1.95 + i * 0.1, 2.35 + i * 0.1), on, true);
          const pk = seg(t, 2.1 + i * 0.11, 2.6 + i * 0.11), ps = pk <= 0 ? 0.001 : 0.6 + 0.4 * ob(pk) + (show ? 0.08 * Math.sin(seg(t, t0 + RUN, t0 + RUN + 0.45) * Math.PI) : 0), shk = oc(seg(t, 2.4 + i * 0.11, 2.9 + i * 0.11));
          tf(l.bg, l.x, 412, ps); l.bg.setAttribute("opacity", seg(pk, 0, 0.35)); tf(l.sh, l.x + 5 * shk, 412 + 6 * shk, ps); l.sh.setAttribute("opacity", seg(pk, 0, 0.35));
          l.body.setAttribute("fill", on && hit ? YEL : "#fff");
          [l.hi, l.tr].forEach((n, m) => { n.setAttribute("stroke-dasharray", `${u * l.len} ${l.len + 40}`); n.setAttribute("opacity", (m ? sel < 0 : on) && u > 0.004 ? 1 : 0); });
          const p = pat(l.pts, u * l.len), dk = seg(t, TD, TD + 0.3), back = 7 * Math.sin(Math.PI * seg(t, TD + 0.1, t0 + 0.1));
          tf(l.dot, p[0], p[1] - back, (dk <= 0 ? 0 : ob(dk)) * (1 + 0.3 * Math.sin(seg(t, t0 + RUN, t0 + RUN + 0.4) * Math.PI)));
          l.dot.setAttribute("opacity", show && dk > 0 ? 1 : 0);
        });
        const tc = GO + RUN + (sel < 0 ? 0.28 : 0) + 0.8;
        land(seg(t, tc, tc + 0.5));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 800, h: 450, dur: 6, still: 6,
    build(svg) {
      const gridF = grid(svg, 800, 450, (x, y) => !(x < 500 && y > 200) && !(x > 560 && y < 100) && !(x > 700 && y > 100) && !(x > 500 && y > 300));
      const L = { sh: layer(svg), wire: layer(svg), trail: layer(svg), dot: layer(svg), top: layer(svg), type: layer(svg) };
      const tag = el("g", {}, L.type);
      el("rect", { x: 3, y: 4, width: 108, height: 38, rx: 19, fill: LIL }, tag);
      el("rect", { x: 0, y: 0, width: 108, height: 38, rx: 19, fill: YEL, stroke: INK, "stroke-width": 2.75 }, tag);
      txt(tag, 54, 25, "Guides", mono(17));
      const chk = txt(L.type, 754, 63, "Checked 19 Nov 2026", mono(15, { "font-weight": 500, "text-anchor": "end", fill: MUTE }));
      const title = txt(L.type, 43, 226, "GTA 6 refund", { "font-size": 70, "font-weight": 700, "letter-spacing": -1.5 });
      const rule = el("path", { d: "M48 261 H188", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round", "stroke-dasharray": 141, "stroke-dashoffset": 141 }, L.type);
      const subs = [txt(L.type, 46, 314, "How to get your money back", { "font-size": 23, "font-weight": 500, fill: MUTE }), txt(L.type, 46, 346, "on PS5 and Xbox", { "font-size": 23, "font-weight": 500, fill: MUTE })];
      const node = (x, y, w, h, s, fs, d) => {
        const sh = d ? el("path", { d: dia(w / 2, h / 2), fill: LIL }, L.sh) : el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 13, fill: LIL }, L.sh), g = el("g", {}, L.top);
        const body = d ? el("path", { d: dia(w / 2, h / 2), fill: "#fff", stroke: INK, "stroke-width": 2.75, "stroke-linejoin": "round" }, g) : el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 13, fill: "#fff", stroke: INK, "stroke-width": 2.75 }, g);
        fit(txt(g, 0, fs * 0.35, s, { "text-anchor": "middle", "font-size": fs, "font-weight": 700 }), d ? w * 0.66 : w - 22);
        return { body, set: (t, a, pu = 0) => { const k = seg(t, a, a + 0.5), sc = k <= 0 ? 0.001 : 0.6 + 0.4 * ob(k) + pu, sk = oc(seg(t, a + 0.3, a + 0.8)); tf(g, x, y, sc); tf(sh, x + 4 * sk, y + 5 * sk, sc); g.setAttribute("opacity", seg(k, 0, 0.35)); sh.setAttribute("opacity", seg(k, 0, 0.35)); } };
      };
      const q = node(626, 132, 264, 104, "Where did you pay?", 17, true), ps = node(552, 258, 128, 50, "PS Store", 17), xb = node(700, 258, 128, 50, "Xbox", 17), end = node(626, 378, 236, 60, "The store decides", 19);
      const W = [wire(L.wire, [[626, 184], [626, 208]], false), wire(L.wire, [[626, 208], [552, 208], [552, 233]]), wire(L.wire, [[626, 208], [700, 208], [700, 233]]), wire(L.wire, [[552, 283], [552, 316], [626, 316]], false), wire(L.wire, [[700, 283], [700, 316], [626, 316]], false), wire(L.wire, [[626, 316], [626, 348]], false)];
      const runs = [552, 700].map((x, i) => { const pts = [[626, 184], [626, 208], [x, 208], [x, 316], [626, 316], [626, 336]]; return { pts, len: plen(pts), tr: el("path", { d: pathD(pts), fill: "none", stroke: BLUE, "stroke-width": 5, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0 }, L.trail), dot: dotOf(L.dot), t0: 2.5 + i * 0.5 }; });
      return (t) => {
        gridF(t);
        const a = oc(seg(t, 0.1, 0.6)); tf(tag, 46, 40 - 14 * (1 - a), 1); tag.setAttribute("opacity", a);
        chk.setAttribute("opacity", oc(seg(t, 0.25, 0.75)));
        const b = oc(seg(t, 0.25, 0.9)); title.setAttribute("opacity", b); title.setAttribute("transform", `translate(0 ${26 * (1 - b)})`);
        rule.setAttribute("stroke-dashoffset", 141 * (1 - io(seg(t, 0.8, 1.35))));
        subs.forEach((n, i) => { const k = oc(seg(t, 0.95 + i * 0.1, 1.5 + i * 0.1)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${14 * (1 - k)})`); });
        const done = runs[0].t0 + 1.9;
        q.set(t, 0.5); ps.set(t, 0.75); xb.set(t, 0.85); end.set(t, 1.0, 0.09 * Math.sin(seg(t, done, done + 0.5) * Math.PI));
        end.body.setAttribute("fill", t >= done ? YEL : "#fff"); q.body.setAttribute("fill", t >= runs[0].t0 ? SOFT : "#fff");
        W.forEach((w, i) => w.set(io(seg(t, 1.2 + i * 0.1, 1.7 + i * 0.1))));
        runs.forEach((r) => { const u = io(seg(t, r.t0, r.t0 + 1.9)), p = pat(r.pts, u * r.len), dk = seg(t, r.t0 - 0.3, r.t0); tf(r.dot, p[0], p[1], dk <= 0 ? 0 : ob(dk)); r.dot.setAttribute("opacity", dk > 0 ? 1 : 0); r.tr.setAttribute("stroke-dasharray", `${u * r.len} ${r.len + 40}`); r.tr.setAttribute("opacity", u > 0.004 ? 1 : 0); });
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 20px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
