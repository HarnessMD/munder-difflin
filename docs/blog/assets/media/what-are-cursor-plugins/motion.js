/* Bright coded scenes for "What Are Cursor Plugins?". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-weight": 500 }, a));
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
  const hit = (g, a) => el("rect", Object.assign({ fill: "#fff", "fill-opacity": 0 }, a), g);
  const ring = (g, a) => el("rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", class: "mg-ring" }, a), g);
  const hint = (svg, s) => mono(svg, 756, 48, s, { "text-anchor": "end", "font-size": 18, fill: MUTE });
  const wob = (tau, a, w = 9, d = 3) => (tau > 0 ? a * Math.exp(-d * tau) * Math.sin(w * tau) : 0);
  let uid = 0; /* counter for SVG ids, never random */

  /* ---- small shared objects for the title card ---- */
  const miniBox = (p) => {
    el("path", { d: "M-20 -30 V-38 Q-20 -44 -14 -44 H14 Q20 -44 20 -38 V-30", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, p);
    el("rect", { x: -50, y: -30, width: 100, height: 20, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, p);
    el("rect", { x: -46, y: -10, width: 92, height: 44, rx: 7, fill: BLUE, stroke: INK, "stroke-width": 3 }, p);
    el("rect", { x: -10, y: -14, width: 20, height: 16, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, p);
  };
  const miniJar = (p) => {
    el("rect", { x: -30, y: -22, width: 60, height: 56, rx: 11, fill: SKY, stroke: INK, "stroke-width": 3 }, p);
    el("path", { d: "M-18 -10 V8", stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round" }, p);
    el("rect", { x: -34, y: -42, width: 68, height: 22, rx: 6, fill: SKY, stroke: INK, "stroke-width": 3 }, p);
    [-20, -7, 7, 20].forEach((x) => el("path", { d: `M${x} -36 V-26`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, p));
  };

  const SC = {};

  /* ---- 1. a blue tackle box opens and two yellow trays slide out with six compartments ---- */
  SC.tacklebox = {
    dur: 9, still: 9,
    build(svg, api) {
      hint(svg, "tap the box");
      const CMP = [["Rules", "Skills", "Agents"], ["Commands", "MCP Servers", "Hooks"]];
      const TW = 416, TH = 66, OPEN = [[30, 198], [350, 274]], SHUT = [[400 - TW * 0.45, 386], [400 - TW * 0.45, 446]];
      el("ellipse", { cx: 400, cy: 546, rx: 236, ry: 13, fill: SOFT }, svg);
      const lid = el("g", {}, svg);
      const h1 = el("path", { stroke: INK, "stroke-width": 14, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, lid);
      const h2 = el("path", { stroke: BLUE, "stroke-width": 8, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, lid);
      const lidR = el("rect", { x: 200, width: 400, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, lid);
      const lidIn = el("rect", { x: 224, width: 352, rx: 10, fill: SKY, stroke: INK, "stroke-width": 2.5 }, lid);
      const rivet = el("circle", { cx: 510, r: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, lid);
      const arms = [[0, 262, 120], [0, 338, 300], [1, 462, 110], [1, 540, 300]].map(([j, bx, ox]) => ({ j, bx, ox, n: el("path", { stroke: INK, "stroke-width": 6, "stroke-linecap": "round", fill: "none" }, svg) }));
      const trays = CMP.map((labs) => {
        const g = el("g", {}, svg);
        el("rect", { width: TW, height: TH, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
        const ls = labs.map((s, i) => {
          el("rect", { x: 8 + i * 136, y: 8, width: 128, height: 50, rx: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
          const lg = el("g", {}, g);
          mono(lg, 0, 6, s, { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
          return { lg, cx: 72 + i * 136 };
        });
        return { g, ls };
      });
      const box = el("g", {}, svg);
      el("rect", { x: 200, y: 360, width: 400, height: 170, rx: 16, fill: BLUE, stroke: INK, "stroke-width": 3 }, box);
      el("path", { d: "M222 410 H578", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, box);
      el("rect", { x: 374, y: 352, width: 52, height: 38, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, box);
      el("circle", { cx: 400, cy: 371, r: 5, fill: BLUE, stroke: INK, "stroke-width": 2 }, box);
      const tag = el("g", {}, svg);
      el("path", { d: "M0 0 V14", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
      el("rect", { x: -82, y: 14, width: 164, height: 44, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, tag);
      mono(tag, 0, 43, "plugin.json", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      const rip = el("g", {}, svg);
      el("ellipse", { cx: 700, cy: 528, rx: 66, ry: 9, fill: "none", stroke: SKY, "stroke-width": 4 }, rip);
      el("ellipse", { cx: 700, cy: 528, rx: 38, ry: 5, fill: "none", stroke: SKY, "stroke-width": 4 }, rip);
      const splash = el("ellipse", { cx: 700, cy: 528, fill: "none", stroke: SKY, "stroke-width": 3 }, svg);
      const fl = el("g", {}, svg);
      el("path", { d: "M0 -54 V-84", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, fl);
      el("circle", { cy: -88, r: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, fl);
      el("circle", { r: 56, fill: LIL, stroke: INK, "stroke-width": 3 }, fl);
      txt(fl, 0, -2, "Cursor", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      txt(fl, 0, 28, "2.5", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const hg = el("g", {}, svg);
      hit(hg, { x: 186, y: 92, width: 428, height: 454 });
      ring(hg, { x: 188, y: 344, width: 424, height: 198, rx: 22 });
      let tapAt = -1;
      button(hg, "Tackle box: tap to close it and open it again", () => { if (api.calm) { tapAt = api.now(); api.hold(9.1); } else api.seek(0); });
      return (t, now) => {
        if (tapAt >= 0) { const v = now - tapAt; if (v < 9) t = v; else tapAt = -1; }
        let L, T, fy, fo, lab = 1;
        if (t < 1) {
          T = [1 - io(seg(t, 0.06, 0.46)), 1 - io(seg(t, 0, 0.4))]; L = 1 - io(seg(t, 0.42, 0.9));
          const f = io(seg(t, 0, 0.45)); fy = 50 * f; fo = 1 - f;
        } else {
          L = ob(seg(t, 1.6, 2.5)); T = [ob(seg(t, 2.4, 3.3)), ob(seg(t, 2.6, 3.5))];
          const f = ob(seg(t, 4.6, 5.3)); fy = -260 * (1 - f); fo = seg(t, 4.6, 4.75); lab = -1;
        }
        const top = 314 - 208 * L;
        h1.setAttribute("d", `M360 ${top + 2} V${top - 14} Q360 ${top - 24} 370 ${top - 24} H430 Q440 ${top - 24} 440 ${top - 14} V${top + 2}`); h2.setAttribute("d", h1.getAttribute("d"));
        lidR.setAttribute("y", top); lidR.setAttribute("height", 362 - top);
        lidIn.setAttribute("y", top + 46); lidIn.setAttribute("height", Math.max(0, 362 - top - 74)); lidIn.setAttribute("opacity", cl((L - 0.5) / 0.4));
        rivet.setAttribute("cy", top + 16);
        const P = trays.map((tr, j) => {
          const k = T[j], x = SHUT[j][0] + (OPEN[j][0] - SHUT[j][0]) * k, y = SHUT[j][1] + (OPEN[j][1] - SHUT[j][1]) * k, s = 0.9 + 0.1 * cl(k, 0, 1.2);
          tf(tr.g, x, y, s);
          tr.ls.forEach((l, i) => {
            const d = 3.25 + (j * 3 + i) * 0.1, q = lab > 0 ? 1 : ob(seg(t, d, d + 0.4));
            tf(l.lg, l.cx, 33, Math.max(0.001, 0.6 + 0.4 * q)); l.lg.setAttribute("opacity", lab > 0 ? 1 : seg(t, d, d + 0.15));
          });
          return [x, y, s];
        });
        arms.forEach((a) => { const [x, y, s] = P[a.j]; a.n.setAttribute("d", `M${a.bx} 400 L${x + a.ox * s} ${y + (TH - 10) * s}`); });
        tf(tag, 510, top + 16, 1, wob(t - 1.9, 16, 8, 2.4) - wob(t - 0.7, 12, 8, 2.4));
        const env = 1 - io(seg(t, 7, 8.6)), bob = t > 5.3 ? Math.sin((2 * Math.PI * (t - 5.3)) / 1.2) * env : 0;
        tf(fl, 700, 466 + fy + 5 * bob, 1, 3 * bob); fl.setAttribute("opacity", fo);
        rip.setAttribute("opacity", t < 1 ? fo : seg(t, 4.95, 5.2));
        const sp = seg(t, 5.0, 6.0); splash.setAttribute("rx", 40 + 80 * oc(sp)); splash.setAttribute("ry", 6 + 9 * oc(sp)); splash.setAttribute("opacity", sp > 0 && sp < 1 ? 1 - sp : 0);
      };
    },
  };

  /* ---- 2. a sky spice rack: blue powder fills each jar to its count ---- */
  SC.spicerack = {
    dur: 9, still: 9,
    build(svg, api) {
      hint(svg, "tap a jar");
      const LAB = [["Integrations"], ["Developer", "Tools"], ["Productivity"], ["Finance and", "Legal"], ["Utilities"]], N = [122, 16, 8, 3, 1];
      const JW = 116, TOP = 200, BOT = 432, HMAX = 200, defs = el("defs", {}, svg);
      el("ellipse", { cx: 400, cy: 552, rx: 382, ry: 12, fill: SOFT }, svg);
      [26, 754].forEach((x) => el("rect", { x, y: 100, width: 20, height: 448, rx: 8, fill: SKY, stroke: INK, "stroke-width": 3 }, svg));
      el("rect", { x: 18, y: 100, width: 764, height: 22, rx: 9, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      const user = N.map(() => -99);
      const jars = LAB.map((lab, i) => {
        const x = 68 + i * 137, cx = x + JW / 2, g = el("g", {}, svg), id = `mgcp-jar-${++uid}`;
        el("rect", { x: x + 5, y: TOP + 5, width: JW - 10, height: BOT - TOP - 10, rx: 13 }, el("clipPath", { id }, defs));
        el("rect", { x, y: TOP, width: JW, height: BOT - TOP, rx: 18, fill: SOFT }, g);
        const pw = el("rect", { x: x + 5, width: JW - 10, fill: BLUE, "clip-path": `url(#${id})` }, g);
        const parts = [0, 1, 2, 3, 4].map(() => el("circle", { r: 5, fill: BLUE, stroke: INK, "stroke-width": 1.5, "clip-path": `url(#${id})` }, g));
        el("rect", { x, y: TOP, width: JW, height: BOT - TOP, rx: 18, fill: "none", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${x + 20} ${TOP + 30} V${TOP + 96}`, stroke: "#fff", "stroke-width": 6, "stroke-linecap": "round" }, g);
        const num = txt(g, cx, 330, "", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
        const lid = el("g", {}, g);
        el("rect", { x: x - 5, y: TOP - 30, width: JW + 10, height: 32, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, lid);
        for (let k = 1; k < 8; k++) el("path", { d: `M${x - 5 + k * 15.75} ${TOP - 22} V${TOP - 6}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, lid);
        hit(g, { x: x - 12, y: TOP - 44, width: JW + 24, height: BOT - TOP + 56 });
        ring(g, { x: x - 12, y: TOP - 44, width: JW + 24, height: BOT - TOP + 56, rx: 16 });
        button(g, `${lab.join(" ")} jar, ${N[i]}: tap to fill it again`, () => { user[i] = api.now(); api.hold(1.6); });
        return { x, cx, g, pw, parts, num, lid, lab };
      });
      el("rect", { x: 18, y: 432, width: 764, height: 84, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      jars.forEach((j) => j.lab.forEach((s, k) => mono(svg, j.cx, j.lab.length > 1 ? 468 + k * 26 : 481, s, { "text-anchor": "middle", "font-size": 16, "font-weight": 700 })));
      const tag = el("g", {}, svg);
      [334, 466].forEach((x) => el("path", { d: `M${x} 84 V102`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, tag));
      el("rect", { x: 300, y: 36, width: 200, height: 52, rx: 12, fill: LIL, stroke: INK, "stroke-width": 3 }, tag);
      txt(tag, 400, 71, "150 plugins", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      return (t, now) => {
        jars.forEach((j, i) => {
          const s = 1.1 + i * 1.0;
          let f, lift, flow, no, ph = t * 2.6, pop = 0;
          if (t < 1) { f = 1 - io(seg(t, 0.1 + i * 0.06, 0.75 + i * 0.06)); lift = 0; flow = 0; no = 1 - seg(t, 0.05, 0.4); }
          else { f = oc(seg(t, s + 0.2, s + 0.95)); lift = io(seg(t, s, s + 0.2)) - io(seg(t, s + 0.95, s + 1.2)); flow = seg(t, s + 0.12, s + 0.22) * (1 - seg(t, s + 0.85, s + 0.95)); no = seg(t, s + 0.15, s + 0.3); pop = Math.sin(Math.PI * seg(t, s + 0.9, s + 1.25)); }
          const u = now - user[i];
          if (u >= 0 && u < 1.5) { f = u < 0.4 ? 1 - io(seg(u, 0, 0.3)) : oc(seg(u, 0.45, 1.2)); lift = io(seg(u, 0.25, 0.42)) - io(seg(u, 1.2, 1.42)); flow = seg(u, 0.4, 0.5) * (1 - seg(u, 1.1, 1.2)); no = 1; ph = u * 2.6; pop = Math.sin(Math.PI * seg(u, 1.15, 1.5)); }
          const c = N[i] * cl(f), h = c <= 0.02 ? 0 : Math.max(3, (HMAX * c) / 122), sy = BOT - 5 - h;
          j.pw.setAttribute("y", sy); j.pw.setAttribute("height", h + 2);
          j.parts.forEach((p, k) => { const q = (ph + k / 5) % 1, y = TOP + 4 + q * (sy - TOP - 4); p.setAttribute("cx", j.cx + 36 + (k % 2 ? 4 : -4)); p.setAttribute("cy", y); p.setAttribute("opacity", flow * (q < 0.92 ? 1 : 0)); });
          j.num.textContent = String(Math.round(c)); j.num.setAttribute("opacity", no);
          j.lid.setAttribute("transform", `translate(0 ${-24 * lift}) rotate(${-7 * lift} ${j.cx} ${TOP - 14})`);
          j.g.setAttribute("transform", `translate(${j.cx} ${BOT}) scale(${1 + 0.035 * pop}) translate(${-j.cx} ${-BOT})`);
        });
        let dy, o, r;
        if (t < 1) { const k = io(seg(t, 0, 0.35)); dy = -30 * k; o = 1 - k; r = 0; }
        else { const k = ob(seg(t, 6.4, 7.1)); dy = -70 * (1 - k); o = seg(t, 6.4, 6.55); r = -9 * (1 - k) + wob(t - 7.0, 3, 9, 3); }
        tag.setAttribute("transform", `translate(0 ${dy}) rotate(${r} 400 100)`); tag.setAttribute("opacity", o);
      };
    },
  };

  /* ---- 3. a soft white chain: three charms click on, then a lilac clasp swings between two tags ---- */
  SC.charmbracelet = {
    dur: 9, still: 9,
    build(svg, api) {
      hint(svg, "tap a charm");
      const CY = 290;
      el("path", { d: `M40 ${CY + 12} H560`, stroke: SOFT, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      for (let i = 0; i < 22; i++) {
        const x = 44 + i * 24;
        if (i % 2) el("rect", { x: x - 12, y: CY - 4, width: 24, height: 8, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
        else { el("ellipse", { cx: x, cy: CY, rx: 14, ry: 9, fill: "none", stroke: INK, "stroke-width": 8 }, svg); el("ellipse", { cx: x, cy: CY, rx: 14, ry: 9, fill: "none", stroke: SOFT, "stroke-width": 3 }, svg); }
      }
      const ICON = [
        (g) => [-14, 0, 14].forEach((y, k) => { el("path", { d: `M-20 ${y} H20`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g); el("circle", { cx: [-8, 10, -2][k], cy: y, r: 5.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); }),
        (g) => { el("circle", { cx: -5, cy: -5, r: 14, fill: "#fff", stroke: INK, "stroke-width": 3.5 }, g); el("path", { d: "M6 6 L19 19", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g); },
        (g) => { el("path", { d: "M0 -22 V6 M-11 -5 L0 6 L11 -5", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g); el("path", { d: "M-20 8 V18 H20 V8", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g); },
      ];
      const CH = [["Open Customize", YEL], ["Find the plugin", BLUE], ["Install", MINT]], CX = [116, 308, 500];
      const user = [-99, -99, -99];
      const charms = CH.map(([lab, col], i) => {
        const g = el("g", { transform: `translate(${CX[i]} ${CY})` }, svg), body = el("g", {}, g);
        el("path", { d: "M0 10 V24", stroke: INK, "stroke-width": 3 }, body);
        el("rect", { x: -9, y: 18, width: 18, height: 14, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, body);
        el("circle", { cy: 74, r: 44, fill: col, stroke: INK, "stroke-width": 3 }, body);
        ICON[i](el("g", { transform: "translate(0 74)" }, body));
        el("circle", { cy: 8, r: 8, fill: "none", stroke: INK, "stroke-width": 7 }, body);
        el("circle", { cy: 8, r: 8, fill: "none", stroke: SOFT, "stroke-width": 2.5 }, body);
        const burst = el("g", {}, g);
        [-140, -90, -40].forEach((a) => { const r = (a * Math.PI) / 180; el("path", { d: `M${Math.cos(r) * 22} ${Math.sin(r) * 22 + 4} L${Math.cos(r) * 34} ${Math.sin(r) * 34 + 4}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, burst); });
        const lg = el("g", {}, g);
        mono(lg, 0, 0, lab, { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
        hit(g, { x: -62, y: -18, width: 124, height: 142 });
        ring(g, { x: -62, y: -18, width: 124, height: 142, rx: 22 });
        button(g, `${lab} charm: tap to click it on again`, () => { user[i] = api.now(); api.hold(2.1); });
        return { body, burst, lg };
      });
      const tags = [["project", CY - 92], ["user", CY + 92]].map(([s, y]) => {
        const g = el("g", {}, svg);
        el("path", { d: "M0 0 L20 -22 H122 Q130 -22 130 -14 V14 Q130 22 122 22 H20 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("circle", { cx: 22, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        mono(g, 78, 7, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        return { g, y };
      });
      const clasp = el("g", {}, svg);
      el("path", { d: "M8 0 H24", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, clasp);
      el("path", { d: "M22 -12 Q22 -20 32 -20 H70 Q92 -20 92 0 Q92 20 70 20 H32 Q22 20 22 12 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, clasp);
      el("rect", { x: 34, y: -6, width: 40, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, clasp);
      el("circle", { cx: 46, cy: -20, r: 5, fill: LIL, stroke: INK, "stroke-width": 2.5 }, clasp);
      el("circle", { r: 9, fill: "none", stroke: INK, "stroke-width": 7 }, clasp);
      el("circle", { r: 9, fill: "none", stroke: SOFT, "stroke-width": 2.5 }, clasp);
      return (t, now) => {
        charms.forEach((c, i) => {
          const at = 1.3 + i * 1.05;
          let k, lk, sw = 0, bu = 0;
          if (t < 1) { const d = 0.1 + (2 - i) * 0.1; k = 1 - io(seg(t, d, d + 0.4)); lk = 1 - seg(t, d - 0.05, d + 0.2); }
          else { k = ob(seg(t, at, at + 0.5)); lk = oc(seg(t, at + 0.35, at + 0.75)); sw = wob(t - at - 0.45, 9, 10, 3); bu = Math.sin(Math.PI * seg(t, at + 0.38, at + 0.78)); }
          const u = now - user[i];
          if (u >= 0 && u < 2) { k = u < 0.38 ? 1 - io(seg(u, 0, 0.3)) : ob(seg(u, 0.4, 0.9)); lk = 1; sw = wob(u - 0.85, 9, 10, 3); bu = Math.sin(Math.PI * seg(u, 0.83, 1.2)); }
          c.body.setAttribute("transform", `translate(0 ${70 * (1 - k)}) rotate(${sw} 0 4)`); c.body.setAttribute("opacity", cl(k * 3));
          c.burst.setAttribute("opacity", bu); c.burst.setAttribute("transform", `translate(0 4) scale(${0.8 + 0.4 * bu}) translate(0 -4)`);
          c.lg.setAttribute("transform", `translate(0 ${152 + 14 * (1 - lk)})`); c.lg.setAttribute("opacity", lk);
        });
        let ck, th;
        if (t < 1) { ck = 1 - io(seg(t, 0, 0.35)); th = 0; }
        else { ck = ob(seg(t, 4.85, 5.3)); const tau = t - 5.3; th = tau < 0 ? -46 : -46 * Math.cos(2.4 * tau) * Math.exp(-0.5 * tau) * (1 - io(seg(t, 7.2, 8.3))); }
        clasp.setAttribute("transform", `translate(568 ${CY}) rotate(${th}) scale(${Math.max(0.001, ck)})`); clasp.setAttribute("opacity", cl(ck * 3));
        tags.forEach((g, j) => {
          const k = t < 1 ? 1 - io(seg(t, 0.1, 0.45)) : ob(seg(t, 4.5 + j * 0.1, 4.95 + j * 0.1)), hl = ck > 0.5 ? cl(1 - Math.abs(th - (j ? 46 : -46)) / 30) : 0;
          g.g.setAttribute("transform", `translate(711 ${g.y}) scale(${Math.max(0.001, k * (1 + 0.08 * hl))}) translate(-65 0)`); g.g.setAttribute("opacity", cl(k * 2));
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 64, y: 44, width: 150, height: 42, rx: 21, fill: SKY, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 139, 72, "Concepts", { "text-anchor": "middle", "font-size": 21, "font-weight": 600 });
      const title = txt(svg, 64, 162, "What Are Cursor Plugins?", { "font-size": 62, "font-weight": 700 });
      let tw = 0; try { tw = title.getComputedTextLength(); } catch (e) { tw = 0; }
      const uw = tw > 100 ? tw - 4 : 760;
      const ul = el("path", { stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      svg.insertBefore(ul, title);
      const line = txt(svg, 64, 244, "Bundles of rules, skills, agents, commands, MCP servers and hooks", { "font-size": 24, "font-weight": 500, fill: MUTE });
      const chk = mono(svg, 64, 286, "Checked 28 Nov 2026", { "font-size": 18, fill: CAP });
      const TL = [[64, LIL, "150 plugins", miniBox], [492, MINT, "Cursor 2.5, 17 Feb 2026", miniJar]].map(([x, col, s, draw]) => {
        const g = el("g", {}, svg);
        el("rect", { x, y: 318, width: 404, height: 184, rx: 20, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const ic = el("g", {}, g); draw(ic);
        const lb = txt(g, x + 202, 472, s, { "text-anchor": "middle", "font-size": 27, "font-weight": 700 });
        return { g, ic, lb, cx: x + 202 };
      });
      return (t) => {
        const p = ob(seg(t, 0.15, 0.6)); pill.setAttribute("transform", `translate(139 65) scale(${Math.max(0.001, p)}) translate(-139 -65)`); pill.setAttribute("opacity", seg(t, 0.15, 0.3));
        const a = oc(seg(t, 0.3, 0.9)); title.setAttribute("opacity", a); title.setAttribute("transform", `translate(0 ${24 * (1 - a)})`);
        ul.setAttribute("d", `M66 188 H${66 + Math.max(1, uw * io(seg(t, 0.8, 1.4)))}`); ul.setAttribute("opacity", seg(t, 0.8, 0.85));
        [line, chk].forEach((n, i) => { const k = oc(seg(t, 1.0 + i * 0.12, 1.5 + i * 0.12)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(${-16 * (1 - k)} 0)`); });
        TL.forEach((tl, i) => {
          const k = ob(seg(t, 1.5 + i * 0.1, 2.0 + i * 0.1)), q = ob(seg(t, 1.9 + i * 0.1, 2.4 + i * 0.1)), l = oc(seg(t, 2.3 + i * 0.1, 2.7 + i * 0.1));
          tl.g.setAttribute("transform", `translate(${tl.cx} 410) scale(${Math.max(0.001, 0.85 + 0.15 * k)}) translate(${-tl.cx} -410)`); tl.g.setAttribute("opacity", seg(t, 1.5 + i * 0.1, 1.65 + i * 0.1));
          tf(tl.ic, tl.cx, 388 - 30 * (1 - q), Math.max(0.001, 0.6 + 0.4 * q)); tl.ic.setAttribute("opacity", seg(t, 1.9 + i * 0.1, 2.0 + i * 0.1));
          tl.lb.setAttribute("opacity", l); tl.lb.setAttribute("transform", `translate(0 ${12 * (1 - l)})`);
        });
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
    let off = 0, raf = 0, seen = frozen, held = calm || frozen, busy = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    const stillAt = frozen && !isNaN(fixed) ? fixed : sc.still;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? stillAt : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && (!held || clock() < busy)) raf = requestAnimationFrame(tick); };
    /* hold(s) redraws for s seconds without starting the loop, so a tap still animates on a held frame */
    const api = { now: clock, calm, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); }, hold: (s) => { busy = Math.max(busy, clock() + s); tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(stillAt, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
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
