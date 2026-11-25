/* Bright coded scenes for "Firecrawl alternatives". Vanilla JS, no library.
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
  const lerp = (a, b, k) => a + (b - a) * k;
  let nid = 0; const uid = (p) => `mg-${p}-${++nid}`;
  const pad = (p, x, y, w, h) => el("rect", { x, y, width: w, height: h, fill: "#fff", "fill-opacity": 0 }, p);
  const ring = (p, x, y, w, h, r = 26) => el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", class: "mg-ring" }, p);
  const band = (p, d, col, w = 11, cap = "round") => { el("path", { d, fill: "none", stroke: INK, "stroke-width": w + 6, "stroke-linecap": cap }, p); el("path", { d, fill: "none", stroke: col, "stroke-width": w, "stroke-linecap": cap }, p); };
  const DROP = "M0 -17 C7 -7 12 -1 12 6 A12 12 0 0 1 -12 6 C-12 -1 -7 -7 0 -17 Z";

  const SC = {};

  /* ---- 1. a block of websites drops into a sieve; navs, footers and ads fall through, clean markdown stays ---- */
  SC.sieve = {
    dur: 9, still: 9,
    build(svg, api) {
      const RX = 175, RY = 30, CY = 250, root = el("g", { transform: "translate(0 -46)" }, svg);
      el("path", { d: "M110 552 H690", stroke: SOFT, "stroke-width": 12, "stroke-linecap": "round" }, root);
      const chips = [["navs", 252, -8, 372], ["footers", 400, 3, 400], ["ads", 548, 7, 428]].map(([s, x, r, sx]) => {
        const g = el("g", {}, root), w = s.length * 13.2 + 40;
        el("rect", { x: -w / 2 + 6, y: -17, width: w, height: 46, rx: 12, fill: LIL }, g);
        el("rect", { x: -w / 2, y: -23, width: w, height: 46, rx: 12, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, 8, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        return { g, x, r, sx };
      });
      const sv = el("g", {}, root);
      pad(sv, 200, 118, 570, 300);
      ring(sv, 194, 112, 582, 312, 28);
      band(sv, "M582 246 L728 208", MINT, 16);
      el("circle", { cx: 722, cy: 210, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sv);
      el("ellipse", { cx: 400, cy: CY, rx: RX, ry: RY, fill: SKY }, sv);
      band(sv, `M${400 - RX} ${CY} A${RX} ${RY} 0 1 1 ${400 + RX} ${CY} A${RX} ${RY} 0 1 1 ${400 - RX} ${CY}`, MINT, 11, "butt");
      const blk = el("g", {}, sv);
      el("rect", { x: -102, y: -52, width: 220, height: 120, rx: 16, fill: SOFT }, blk);
      el("rect", { x: -110, y: -60, width: 220, height: 120, rx: 16, fill: LIL, stroke: INK, "stroke-width": 3 }, blk);
      txt(blk, 0, -6, "websites", { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 });
      const card = el("g", {}, sv);
      el("rect", { x: -142, y: -40, width: 300, height: 92, rx: 16, fill: LIL }, card);
      el("rect", { x: -150, y: -48, width: 300, height: 92, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, card);
      const word = txt(card, 0, 10, "clean markdown", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
      el("path", { d: `M${400 - RX} ${CY} C230 360 300 405 400 405 C500 405 570 360 ${400 + RX} ${CY} A${RX} ${RY} 0 0 1 ${400 - RX} ${CY} Z`, fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, sv);
      [[305, 255, 545], [335, 272, 528], [362, 300, 500], [386, 338, 462]].forEach(([y, a, b]) => { const n = Math.round((b - a) / 32); for (let i = 0; i <= n; i++) el("circle", { cx: a + ((b - a) * i) / n, cy: y, r: 5.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, sv); });
      el("path", { d: `M${400 + RX} ${CY} A${RX} ${RY} 0 0 1 ${400 - RX} ${CY}`, fill: "none", stroke: INK, "stroke-width": 17 }, sv);
      el("path", { d: `M${400 + RX * 0.9945} ${CY - RY * 0.1045} A${RX} ${RY} 0 1 1 ${400 - RX * 0.9945} ${CY - RY * 0.1045}`, fill: "none", stroke: MINT, "stroke-width": 11 }, sv);
      button(sv, "Drop a new block into the sieve and shake it", () => api.seek(0));
      return (t) => {
        const pre = 1 - oc(seg(t, 0, 0.4));
        const dp = seg(t, 0.5, 1.2), land = Math.sin(seg(t, 1.2, 1.55) * Math.PI);
        const shrink = lerp(1, 0.86, io(seg(t, 2.1, 3.4)));
        blk.setAttribute("opacity", t < 0.5 ? 0 : 1 - seg(t, 3.5, 3.9));
        blk.setAttribute("transform", `translate(400 ${lerp(-150, 232, dp * dp) - land * 12}) scale(${shrink * (1 + land * 0.06)} ${shrink * (1 - land * 0.06)})`);
        const sk = seg(t, 1.7, 3.6), env = Math.sin(Math.PI * sk) ** 2, w = (t - 1.7) * Math.PI * 9;
        sv.setAttribute("transform", `translate(${(Math.sin(w) * 10 * env).toFixed(2)} 0) rotate(${(Math.sin(w + 0.8) * 2.4 * env).toFixed(2)} 400 330)`);
        const ci = seg(t, 3.6, 4.2), li = seg(t, 4.5, 5.1);
        card.setAttribute("opacity", t < 3.6 ? pre : cl(ci * 3));
        card.setAttribute("transform", `translate(400 214) scale(${t < 3.6 ? 1 : 0.7 + 0.3 * ob(ci)})`);
        word.setAttribute("opacity", t < 3.6 ? pre : oc(li));
        word.setAttribute("transform", `translate(0 ${t < 3.6 ? 0 : 14 * (1 - ob(li))})`);
        chips.forEach((c, i) => {
          const a = 2.25 + i * 0.12, p = seg(t, a, a + 0.6), b = seg(t, a + 0.6, a + 0.95);
          if (t < a) { c.g.setAttribute("opacity", pre); tf(c.g, c.x, 523, 1, c.r); return; }
          c.g.setAttribute("opacity", 1);
          tf(c.g, lerp(c.sx, c.x, oc(p)), lerp(372, 523, p * p) - Math.sin(b * Math.PI) * 16, 1, c.r * oc(seg(t, a + 0.3, a + 0.95)));
        });
      };
    },
  };

  /* ---- 2. a bucket of credits fills while five plan tags rise beside it ---- */
  SC.bucket = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      const BX = 270, TY = 210, BY = 470, root = el("g", { transform: "translate(0 -20)" }, svg);
      el("ellipse", { cx: 284, cy: 500, rx: 150, ry: 16, fill: SOFT }, root);
      const tags = ["Free $0", "Hobby $16", "Standard $83", "Growth $333", "Scale $599"].map((s, i) => {
        const g = el("g", {}, root), d = "M0 0 L24 -27 H226 Q234 -27 234 -19 V19 Q234 27 226 27 H24 Z";
        el("path", { d, fill: LIL, transform: "translate(7 7)" }, g);
        el("path", { d, fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("circle", { cx: 26, cy: 0, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        txt(g, 46, 8, s, { "font-family": MONO, "font-size": 22, "font-weight": 700 });
        return { g, y: 466 - i * 72 };
      });
      const bk = el("g", {}, root);
      pad(bk, 110, 80, 320, 440);
      ring(bk, 104, 74, 332, 446, 28);
      el("path", { d: "M134 214 C142 96 398 96 406 214", fill: "none", stroke: INK, "stroke-width": 4.5, "stroke-linecap": "round" }, bk);
      el("path", { d: `M130 ${TY} L165 ${BY} A105 24 0 0 0 375 ${BY} L410 ${TY} A140 32 0 0 1 130 ${TY} Z`, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bk);
      el("path", { d: "M137 262 A133 30 0 0 0 403 262", fill: "none", stroke: INK, "stroke-width": 2.5 }, bk);
      el("path", { d: "M161 440 A109 25 0 0 0 379 440", fill: "none", stroke: INK, "stroke-width": 2.5 }, bk);
      const cid = uid("bucket"), cp = el("clipPath", { id: cid }, el("defs", {}, svg));
      el("ellipse", { cx: BX, cy: TY, rx: 139, ry: 31 }, cp);
      el("ellipse", { cx: BX, cy: TY, rx: 140, ry: 32, fill: SOFT }, bk);
      const inner = el("g", { "clip-path": `url(#${cid})` }, bk);
      const liq = el("path", { fill: MINT }, inner), top = el("path", { fill: "none", stroke: INK, "stroke-width": 2.5 }, inner);
      const rip = el("ellipse", { fill: "none", stroke: INK, "stroke-width": 2 }, inner);
      el("ellipse", { cx: BX, cy: TY, rx: 140, ry: 32, fill: "none", stroke: INK, "stroke-width": 3.5 }, bk);
      const lab = el("g", {}, bk);
      el("rect", { x: -108, y: -26, width: 216, height: 52, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, lab);
      txt(lab, 0, 7, "credits a month", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const DX = [-50, 34, -16, 66, 4, -70, 48, -30, 20, -56, 60, -6];
      const drops = DX.map(() => el("path", { d: DROP, fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, root));
      const spill = Array.from({ length: 7 }, () => el("path", { d: DROP, fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, root));
      button(bk, "Tip the bucket empty and start the fill again", () => api.seek(0));
      return (t) => {
        const back = ob(seg(t, 0.7, 1.3));
        bk.setAttribute("transform", `rotate(${t < 1.3 ? (-24 * oc(seg(t, 0, 0.45)) * (1 - back)).toFixed(2) : 0} 165 ${BY})`);
        const lv = t < 1.3 ? 1 - oc(seg(t, 0.1, 0.6)) : io(seg(t, 1.7, 5.9));
        const d = lerp(78, 6, lv), cy = TY + d, rx = 138 - d * 0.12, ry = 30;
        liq.setAttribute("d", `M${BX - rx} ${cy} A${rx} ${ry} 0 0 1 ${BX + rx} ${cy} V${cy + 240} H${BX - rx} Z`);
        top.setAttribute("d", `M${BX - rx} ${cy} A${rx} ${ry} 0 0 1 ${BX + rx} ${cy}`);
        drops.forEach((n, i) => { const s = 1.5 + i * 0.36, p = seg(t, s, s + 0.48); n.setAttribute("opacity", p > 0 && p < 1 ? 1 : 0); tf(n, BX + DX[i], lerp(16, TY + 14, p * p), 1 - 0.15 * p); });
        const k = Math.floor((t - 1.98) / 0.36);
        if (k >= 0 && k < 12 && lv > 0.12) { const rp = seg(t, 1.98 + k * 0.36, 2.38 + k * 0.36); rip.setAttribute("cx", BX + DX[k]); rip.setAttribute("cy", Math.min(cy - 9, TY + 22)); rip.setAttribute("rx", 8 + 28 * oc(rp)); rip.setAttribute("ry", 3 + 6 * oc(rp)); rip.setAttribute("opacity", 1 - rp); } else rip.setAttribute("opacity", 0);
        spill.forEach((n, i) => { const s = 0.12 + i * 0.06, p = seg(t, s, s + 0.62); n.setAttribute("opacity", p > 0 && p < 1 && t < 1.3 ? 1 - seg(p, 0.75, 1) : 0); tf(n, 46 - 46 * p - (i % 3) * 8, 252 + 250 * p * p - 30 * Math.sin(p * Math.PI), 0.9, -40); });
        tags.forEach((g, i) => {
          if (t < 1.3) { const q = oc(seg(t, 0.05 + (4 - i) * 0.07, 0.4 + (4 - i) * 0.07)); g.g.setAttribute("opacity", 1 - q); tf(g.g, 500, g.y + 40 * q); return; }
          const a = 1.8 + i * 0.85;
          g.g.setAttribute("opacity", oc(seg(t, a, a + 0.18))); tf(g.g, 500, g.y + 70 * (1 - ob(seg(t, a, a + 0.6))));
        });
        tf(lab, BX, 352, 1 + 0.08 * Math.sin(seg(t, 5.9, 6.4) * Math.PI));
      };
    },
  };

  /* ---- 3. a net lifts one card out of a pool of pages ---- */
  SC.fishingnet = {
    dur: 9, still: 9,
    build(svg, api) {
      const S = 330, RT = 200;
      const wave = (t) => { let d = `M71.5 ${S}`; for (let x = 71.5; x <= 729; x += 16.4) d += ` L${x} ${(S + Math.sin(x * 0.035 + t * 2.2) * 4).toFixed(1)}`; return d; };
      el("path", { d: "M82 342 V534 Q82 572 120 572 H704 Q742 572 742 534 V342 Z", fill: SOFT }, svg);
      const water = el("path", { fill: SKY }, svg);
      el("path", { d: "M70 286 V522 Q70 560 108 560 H692 Q730 560 730 522 V286", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const page = (p, fill, lw) => { const g = el("g", {}, p); el("rect", { x: -48, y: -35, width: 96, height: 70, rx: 10, fill, stroke: INK, "stroke-width": 2.5 }, g); [[-17, 60], [0, 46], [17, 54]].forEach(([y, w]) => el("path", { d: `M-34 ${y} H${-34 + w}`, stroke: MUTE, "stroke-width": lw, "stroke-linecap": "round" }, g)); return g; };
      const FL = [[150, 400, -8], [262, 446, 7], [300, 380, -5], [528, 378, 9], [572, 452, -6], [660, 405, 5]];
      const SK = [[150, 504, -4], [258, 478, 6], [352, 508, -6], [466, 480, 5], [570, 506, -3], [664, 482, 7]];
      const cards = FL.map((f, i) => ({ g: page(svg, SOFT, 3.5), f, s: SK[i] }));
      const H = `M190 0 A190 22 0 0 1 -190 0`;
      const nb = el("g", {}, svg);
      band(nb, `M-190 0 A190 22 0 0 1 190 0`, LIL, 8, "butt");
      const yc = el("g", {}, svg);
      el("rect", { x: -157, y: -72, width: 330, height: 140, rx: 16, fill: LIL }, yc);
      el("rect", { x: -165, y: -80, width: 330, height: 140, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, yc);
      const lines = el("g", {}, yc), wid = uid("words"), wcp = el("clipPath", { id: wid }, el("defs", {}, svg)), wipe = el("rect", { x: -170, y: -70, width: 0, height: 100 }, wcp);
      [[-44, 230], [-8, 180], [28, 210]].forEach(([y, w]) => el("path", { d: `M-115 ${y} H${-115 + w}`, stroke: MUTE, "stroke-width": 8, "stroke-linecap": "round" }, lines));
      const words = el("g", { "clip-path": `url(#${wid})` }, yc);
      txt(words, 4, -26, "which information", { "text-anchor": "middle", "font-size": 29, "font-weight": 700 });
      txt(words, 4, 12, "you want", { "text-anchor": "middle", "font-size": 29, "font-weight": 700 });
      const nf = el("g", {}, svg);
      pad(nf, -212, -156, 424, 280);
      ring(nf, -216, -160, 432, 288, 28);
      const mid = uid("net"), mcp = el("clipPath", { id: mid }, el("defs", {}, svg));
      const BAG = `M-190 0 C-182 76 -96 104 0 104 C96 104 182 76 190 0 A190 22 0 0 1 -190 0 Z`;
      el("path", { d: BAG }, mcp);
      const mesh = el("g", { "clip-path": `url(#${mid})` }, nf);
      for (let x = -320; x <= 320; x += 26) { el("path", { d: `M${x} 0 l120 120`, stroke: LIL, "stroke-width": 3.5 }, mesh); el("path", { d: `M${x} 0 l-120 120`, stroke: LIL, "stroke-width": 3.5 }, mesh); }
      el("path", { d: BAG, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, nf);
      el("path", { d: H, fill: "none", stroke: INK, "stroke-width": 14 }, nf);
      el("path", { d: "M188.96 -2.3 A190 22 0 1 1 -188.96 -2.3", fill: "none", stroke: LIL, "stroke-width": 8 }, nf);
      band(nf, "M188 -4 L520 -336", LIL, 14);
      const rip = el("ellipse", { fill: "none", stroke: INK, "stroke-width": 2.5 }, svg);
      const surf = el("path", { fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
      button(nf, "Drop the card back into the pool and lift it out again", () => api.seek(0));
      const W = [410, 458];
      return (t) => {
        const wv = wave(t);
        water.setAttribute("d", `${wv} L728 522 Q728 558 692 558 H108 Q72 558 72 522 Z`); surf.setAttribute("d", wv);
        let nx = 400, ny = RT, rot = 0;
        if (t < 1.4) ny = RT - Math.sin(seg(t, 0.1, 0.7) * Math.PI) * 12;
        else if (t < 2.6) { const k = io(seg(t, 1.4, 2.6)); ny = lerp(RT, 446, k); nx = lerp(400, 410, k); rot = -6 * Math.sin(k * Math.PI); }
        else if (t < 3.0) { nx = 410; ny = 446; rot = Math.sin((t - 2.6) * 20) * 2 * (1 - seg(t, 2.6, 3.0)); }
        else { const k = io(seg(t, 3.0, 4.6)); ny = lerp(446, RT, k) - Math.sin(seg(t, 4.4, 5.0) * Math.PI) * 14; nx = lerp(410, 400, k); rot = 5 * Math.sin(k * Math.PI); }
        const ntf = `translate(${nx.toFixed(2)} ${ny.toFixed(2)}) rotate(${rot.toFixed(2)})`;
        nb.setAttribute("transform", ntf); nf.setAttribute("transform", ntf);
        let cx, cy, cs, cr;
        if (t < 1.4) { const p = seg(t, 0.15, 0.9); cx = lerp(400, W[0], p * p); cy = lerp(RT - 50, W[1], p * p) + Math.sin(seg(t, 0.9, 1.25) * Math.PI) * 6 + Math.sin(t * 2) * 3 * seg(t, 0.9, 1.4); cs = lerp(1, 0.45, oc(p)); cr = lerp(0, 4, p); }
        else if (t < 2.4) { cx = W[0]; cy = W[1] + Math.sin(t * 2) * 3; cs = 0.45; cr = 4; }
        else {
          cs = t < 3.6 ? 0.45 : 0.45 + 0.55 * ob(seg(t, 3.6, 4.6));
          const off = lerp(14, -50, (cs - 0.45) / 0.55), a = io(seg(t, 2.4, 2.8));
          cx = lerp(W[0], nx, a); cy = lerp(W[1] + Math.sin(t * 2) * 3, ny + off, a); cr = lerp(4, rot, a);
        }
        tf(yc, cx, cy, cs, cr);
        const tin = seg(t, 4.8, 5.4);
        wipe.setAttribute("width", (340 * (t < 3 ? 1 - oc(seg(t, 0, 0.3)) : oc(tin))).toFixed(1));
        words.setAttribute("transform", `translate(0 ${t < 3 ? 0 : 10 * (1 - ob(tin))})`);
        lines.setAttribute("transform", `translate(-115 0) scale(${(t < 3 ? oc(seg(t, 0.1, 0.45)) : 1 - io(seg(t, 4.2, 4.7))).toFixed(3)} 1) translate(115 0)`);
        cards.forEach((c, i) => {
          const [fx, fy, fr] = c.f, [sx, sy, sr] = c.s;
          const k = t < 2 ? 1 - io(seg(t, 0.25 + i * 0.08, 1.35 + i * 0.08)) : io(seg(t, 3.3 + i * 0.09, 5.0 + i * 0.09));
          const push = Math.sin(seg(t, 1.9, 3.3) * Math.PI) * (fx < 410 ? -1 : 1) * (Math.abs(fx - 410) < 200 ? 18 : 6);
          const ride = i === 2 || i === 3 ? -46 * Math.sin(seg(t, 3.0, 4.0) * Math.PI) : 0;
          tf(c.g, lerp(fx, sx, k) + push, lerp(fy, sy, k) + Math.sin(t * 2 + i * 1.3) * 3 * (1 - k) + ride, 1, lerp(fr, sr, k) + ride * 0.1);
        });
        const r1 = seg(t, 0.85, 1.35), r2 = seg(t, 3.9, 4.5), rp = r1 > 0 && r1 < 1 ? r1 : r2;
        rip.setAttribute("cx", 410); rip.setAttribute("cy", S + 2); rip.setAttribute("rx", 40 + 150 * oc(rp)); rip.setAttribute("ry", 6 + 12 * oc(rp)); rip.setAttribute("opacity", rp > 0 && rp < 1 ? 1 - rp : 0);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 64, y: 48, width: 178, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 153, 76, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const chk = txt(svg, 896, 76, "Checked 25 Nov 2026", { "text-anchor": "end", "font-family": MONO, "font-size": 17, "font-weight": 700, fill: MUTE });
      const title = txt(svg, 62, 178, "Firecrawl Alternatives", { "font-size": 64, "font-weight": 700 });
      const sub = txt(svg, 64, 230, "Five picks for AI agent web data, checked 25 Nov 2026", { "font-size": 24, "font-weight": 500, fill: MUTE });
      const strip = el("g", {}, svg);
      el("rect", { x: 84, y: 282, width: 200, height: 38, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, strip);
      for (let i = 0; i < 9; i++) { el("circle", { cx: 102 + i * 20.5, cy: 294, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, strip); if (i < 8) el("circle", { cx: 112 + i * 20.5, cy: 308, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, strip); }
      const pail = el("g", {}, svg);
      el("path", { d: "M524 286 C526 252 584 252 586 286", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, pail);
      el("path", { d: "M522 286 L530 324 A25 6 0 0 0 580 324 L588 286 A33 8 0 0 1 522 286 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, pail);
      el("ellipse", { cx: 555, cy: 286, rx: 33, ry: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, pail);
      const tile = (x, fill, a, b) => { const g = el("g", {}, svg); el("rect", { x: x + 8, y: 344, width: 400, height: 140, rx: 18, fill: SOFT }, g); el("rect", { x, y: 336, width: 400, height: 140, rx: 18, fill, stroke: INK, "stroke-width": 2.5 }, g); const l = el("g", {}, g); txt(l, x + 28, 396, a, { "font-family": MONO, "font-size": 19, "font-weight": 700 }); txt(l, x + 28, 432, b, { "font-family": MONO, "font-size": 19, "font-weight": 700 }); return { g, l }; };
      const t1 = tile(64, LIL, "Firecrawl: AGPL 3.0,", "from $16 a month billed yearly"), t2 = tile(496, SKY, "Crawl4AI: Apache 2.0,", "v0.9.6");
      const seq = [[pill, 0.1], [chk, 0.2], [title, 0.3], [sub, 0.42], [strip, 0.7], [t1.g, 0.8], [pail, 0.9], [t2.g, 1.0]];
      return (t) => {
        seq.forEach(([n, a]) => { const k = seg(t, a, a + 0.55); n.setAttribute("opacity", oc(seg(t, a, a + 0.2))); n.setAttribute("transform", `translate(0 ${(18 * (1 - ob(k))).toFixed(2)})`); });
        [[t1.l, 1.5], [t2.l, 1.62]].forEach(([n, a]) => { const k = seg(t, a, a + 0.5); n.setAttribute("opacity", oc(k)); n.setAttribute("transform", `translate(${(-12 * (1 - oc(k))).toFixed(2)} 0)`); });
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
