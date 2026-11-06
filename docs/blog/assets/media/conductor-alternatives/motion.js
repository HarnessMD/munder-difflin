/* Bright coded scenes for "Conductor alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  let uid = 0;
  const nid = (p) => `mg-${p}-${++uid}`;
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const fit = (n, w) => { const L = n.getComputedTextLength ? n.getComputedTextLength() : 0; if (L > w) n.setAttribute("font-size", (parseFloat(n.getAttribute("font-size")) * w) / L); return n; };
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
  const ring = (p, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 6", class: "mg-ring" }, p);

  const SC = {};

  /* ---- 1. three notes stick to a fridge door ---- */
  SC.fridge = {
    dur: 9.6, still: 8.2,
    build(svg, api) {
      el("rect", { x: 130, y: 24, width: 540, height: 552, rx: 30, fill: SOFT, stroke: INK, "stroke-width": 4 }, svg);
      el("rect", { x: 148, y: 190, width: 18, height: 220, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const NOTES = [["Nov 4", "No new sign ups", YEL, BLUE, -2.5, 66], ["Nov 13", "Cloud read only", SKY, YEL, 2, 238], ["Nov 20", "Data deletion begins", LIL, MINT, -1.5, 410]];
      const lift = NOTES.map(() => -99);
      const notes = NOTES.map(([d, line, col, mag, rot, y], i) => {
        const g = el("g", {}, svg);
        const shadow = el("rect", { x: -210, y: -14, width: 420, height: 130, rx: 10, fill: INK, "fill-opacity": 0.14 }, g);
        el("rect", { x: -210, y: -14, width: 420, height: 130, rx: 10, fill: col, stroke: INK, "stroke-width": 3 }, g);
        ring(g, -219, -23, 438, 148, 14);
        txt(g, -184, 40, d, { "font-size": 26, "font-weight": 700 });
        fit(txt(g, -184, 92, line, { "font-size": 36, "font-weight": 700 }), 368);
        const m = el("g", {}, g);
        el("circle", { r: 16, fill: mag, stroke: INK, "stroke-width": 3 }, m);
        el("circle", { cx: -5, cy: -5, r: 4, fill: "#fff" }, m);
        button(g, `${d}: ${line}`, () => { lift[i] = api.now(); api.poke(); });
        return { g, m, shadow, rot, y };
      });
      return (t, now) => {
        const out = seg(t, 8.7, 9.3);
        notes.forEach((n, i) => {
          const s = 0.5 + i * 1.5, k = oc(seg(t, s, s + 0.7)), mk = seg(t, s + 0.62, s + 0.95);
          let r = n.rot + 14 * (1 - k);
          if (i === 2) r += Math.sin((t - s - 0.95) * 8) * 5 * seg(t, s + 0.95, s + 1.4) * (1 - seg(t, 6.9, 7.9));
          const d = now - lift[i], up = d >= 0 && d < 1.2 ? oc(seg(d, 0, 0.3)) * (1 - ob(seg(d, 0.55, 0.95))) : 0, u = Math.max(up, 0);
          tf(n.g, 425 + 640 * (1 - k), n.y - 18 * up, 1 + 0.05 * up, r - 1.5 * u);
          n.shadow.setAttribute("transform", `translate(${3 + 8 * u} ${5 + 12 * u})`);
          n.m.setAttribute("transform", `scale(${mk <= 0 ? 0 : ob(mk)})`);
          n.g.setAttribute("opacity", (t >= s ? 1 : 0) * (1 - out));
        });
      };
    },
  };

  /* ---- 2. six pencils drop into a cup, each with a paper flag ---- */
  SC.pencils = {
    dur: 8.4, still: 7.2,
    build(svg, api) {
      const P = [["Orca", "macOS, Windows, Linux", YEL], ["Munder Difflin", "Your computer", BLUE], ["Emdash", "macOS, Windows, Linux", MINT], ["T3 Code", "Desktop, web, mobile", SKY], ["Worktrunk", "Your terminal", YEL], ["Claude Code", "Your terminal", MINT]];
      const GEO = [[330, 250, 340], [355, 290, 230], [380, 340, 120], [420, 460, 120], [445, 510, 230], [470, 550, 340]];
      const BY = 550, RIM = 455, FW = 236;
      el("ellipse", { cx: 400, cy: RIM, rx: 132, ry: 26, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const layer = el("g", {}, svg);
      el("path", { d: `M268 ${RIM} Q400 ${RIM + 52} 532 ${RIM} L516 572 Q400 596 284 572 Z`, fill: LIL, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, svg);
      el("path", { d: `M290 ${RIM + 62} Q400 ${RIM + 104} 510 ${RIM + 62}`, stroke: "#fff", "stroke-width": 8, fill: "none", "stroke-linecap": "round" }, svg);
      const lift = P.map(() => -99);
      const pens = P.map(([name, where, col], i) => {
        const [bx, tx, ty] = GEO[i], left = i < 3;
        const len = Math.hypot(tx - bx, ty - BY), th = Math.atan2(tx - bx, BY - ty), deg = (th * 180) / Math.PI;
        const g = el("g", {}, layer);
        const pen = el("g", { transform: `translate(${bx} ${BY}) rotate(${deg})` }, g);
        el("path", { d: "M-12 -28 L0 0 L12 -28 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, pen);
        el("path", { d: "M-4 -9 L0 0 L4 -9 Z", fill: INK }, pen);
        el("rect", { x: -12, y: -len + 30, width: 24, height: len - 58, fill: col, stroke: INK, "stroke-width": 3 }, pen);
        el("rect", { x: -12, y: -len + 16, width: 24, height: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, pen);
        el("rect", { x: -12, y: -len, width: 24, height: 18, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, pen);
        el("rect", { x: -15, y: -len + 36, width: 30, height: 18, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, pen);
        const ax = tx - 45 * Math.sin(th), ay = ty + 45 * Math.cos(th);
        const fx = left ? ax - 12 - FW : ax + 12, fy = ay - 30, cx = fx + FW / 2;
        const flag = el("g", {}, g);
        const face = el("rect", { x: fx, y: fy, width: FW, height: 60, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, flag);
        const front = fit(txt(flag, cx, fy + 39, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 }), FW - 24);
        const back = fit(txt(flag, cx, fy + 38, where, { "text-anchor": "middle", "font-size": 22, "font-weight": 600, opacity: 0 }), FW - 24);
        ring(g, fx - 7, fy - 7, FW + 14, 74, 12);
        button(g, `${name}: ${where}`, () => { lift[i] = api.now(); layer.appendChild(g); api.poke(); });
        return { g, flag, face, front, back, cx };
      });
      return (t, now) => {
        const out = seg(t, 7.7, 8.2);
        pens.forEach((p, i) => {
          const s = 0.4 + i * 0.7, k = seg(t, s, s + 0.5), y = -640 * (1 - oc(k)) + 10 * Math.sin(seg(t, s + 0.5, s + 0.8) * Math.PI);
          const d = now - lift[i], on = d >= 0 && d < 3.2;
          const up = on ? oc(seg(d, 0, 0.3)) * (1 - io(seg(d, 2.7, 3.1))) : 0, f = on ? seg(d, 0.3, 0.7) - seg(d, 2.2, 2.6) : 0;
          p.g.setAttribute("transform", `translate(0 ${y - 44 * up})`);
          p.g.setAttribute("opacity", (t >= s ? 1 : 0) * (1 - out));
          p.flag.setAttribute("transform", `translate(${p.cx} 0) scale(${Math.max(0.02, Math.abs(Math.cos(Math.PI * f)))} 1) translate(${-p.cx} 0)`);
          const b = f > 0.5;
          p.face.setAttribute("fill", b ? SOFT : "#fff"); p.front.setAttribute("opacity", b ? 0 : 1); p.back.setAttribute("opacity", b ? 1 : 0);
        });
      };
    },
  };

  /* ---- 3. a lunchbox with two compartments ---- */
  SC.lunchbox = {
    dur: 9.6, still: 7.4,
    build(svg, api) {
      const X0 = 110, X1 = 690, TOP = 150, MID = 400, BOT = 500;
      el("path", { d: `M${X0} ${MID} V${TOP + 18} Q${X0} ${TOP} ${X0 + 18} ${TOP} H${X1 - 18} Q${X1} ${TOP} ${X1} ${TOP + 18} V${MID} Z`, fill: "#fff", stroke: INK, "stroke-width": 4 }, svg);
      el("rect", { x: 130, y: 168, width: 256, height: 214, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 414, y: 168, width: 256, height: 214, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const bread = "M-70 50 V-18 Q-84 -62 -40 -64 H40 Q84 -62 70 -18 V50 Q70 58 62 58 H-62 Q-70 58 -70 50 Z";
      const sand = el("g", {}, svg);
      el("path", { d: bread, fill: MINT, stroke: INK, "stroke-width": 3, transform: "translate(6 6) scale(1.06)" }, sand);
      el("path", { d: bread, fill: YEL, stroke: INK, "stroke-width": 3 }, sand);
      el("path", { d: bread, fill: "#fff", transform: "translate(0 4) scale(0.78)" }, sand);
      const apple = el("g", {}, svg);
      el("circle", { r: 58, fill: MINT, stroke: INK, "stroke-width": 3 }, apple);
      el("ellipse", { cx: -22, cy: -20, rx: 10, ry: 15, fill: "#fff", transform: "rotate(30 -22 -20)" }, apple);
      el("path", { d: "M0 -54 Q2 -70 12 -78", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, apple);
      el("path", { d: "M6 -66 Q26 -86 44 -72 Q26 -54 6 -66 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, apple);
      const cid = nid("lunch");
      const cp = el("clipPath", { id: cid }, svg);
      el("rect", { x: X0, y: TOP, width: X1 - X0, height: MID - TOP }, cp);
      const dw = el("g", { "clip-path": `url(#${cid})` }, svg);
      const div = el("rect", { x: 390, y: 160, width: 20, height: 240, rx: 6, fill: SKY, stroke: INK, "stroke-width": 3 }, dw);
      const lidG = el("g", {}, svg), lid = el("g", {}, lidG);
      const LH = 256;
      const lidFace = el("rect", { x: X0 - 6, y: TOP, width: X1 - X0 + 12, height: LH, rx: 20, fill: LIL, stroke: INK, "stroke-width": 4 }, lid);
      const handle = el("rect", { x: 340, y: TOP + 214, width: 120, height: 20, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, lid);
      const lidRing = ring(lid, X0 - 14, TOP - 8, X1 - X0 + 28, LH + 16, 26);
      let tap = -99;
      button(lidG, "Lid: close the box and open it again", () => { tap = api.now(); api.poke(); });
      el("path", { d: `M${X0} ${MID} H${X1} V${BOT - 24} Q${X1} ${BOT} ${X1 - 24} ${BOT} H${X0 + 24} Q${X0} ${BOT} ${X0} ${BOT - 24} Z`, fill: BLUE, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, svg);
      [["Session one", 255], ["Session two", 545]].forEach(([s, x]) => {
        el("rect", { x: x - 105, y: 424, width: 210, height: 52, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        fit(txt(svg, x, 459, s, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 }), 186);
      });
      const tag = el("g", {}, svg);
      el("path", { d: "M0 0 V120", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, tag);
      el("path", { d: "M-62 118 H62 L78 134 V164 Q78 174 68 174 H-68 Q-78 174 -78 164 V134 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 0, cy: 128, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      fit(txt(tag, 0, 162, "Own files", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 }), 140);
      const R = 58, SX = 545, AX0 = SX + 2 * Math.PI * R;
      return (t, now) => {
        let s = 1 - 1.44 * io(seg(t, 0.4, 1.3)) + 1.44 * io(seg(t, 8.6, 9.3));
        const d = now - tap, c = d >= 0 && d < 1.6 ? io(seg(d, 0, 0.45)) - io(seg(d, 0.85, 1.35)) : 0;
        s = s + (1 - s) * c;
        const h = Math.max(6, LH * Math.abs(s)), y0 = s < 0 ? TOP - h : TOP;
        lidFace.setAttribute("y", y0); lidFace.setAttribute("height", h); lidFace.setAttribute("rx", Math.min(20, h / 2));
        lidRing.setAttribute("y", y0 - 8); lidRing.setAttribute("height", h + 16);
        handle.setAttribute("y", TOP + 214 * s); handle.setAttribute("opacity", s > 0.3 ? 1 : 0);
        const sk = oc(seg(t, 1.6, 2.4));
        tf(sand, -120 + 378 * sk, 278);
        const ak = oc(seg(t, 2.6, 3.7)), ax = AX0 + (SX - AX0) * ak;
        tf(apple, ax, 282, 1, ((ax - AX0) / R) * (180 / Math.PI));
        div.setAttribute("transform", `translate(0 ${244 * (1 - oc(seg(t, 3.9, 4.6)))})`);
        const tk = seg(t, 4.8, 5.3), sw = Math.sin((t - 4.8) * 6) * 14 * (1 - seg(t, 4.9, 6.6));
        tf(tag, 400, MID, tk <= 0 ? 0.001 : ob(tk), tk <= 0 ? 0 : sw);
        tag.setAttribute("opacity", (tk > 0 ? 1 : 0) * (1 - seg(t, 8.6, 9.0)));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 3.8,
    build(svg) {
      el("rect", { x: 64, y: 40, width: 150, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      fit(txt(svg, 139, 67, "Alternatives", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 }), 128);
      fit(txt(svg, 60, 160, "Conductor alternatives", { "font-size": 64, "font-weight": 700 }), 836);
      fit(txt(svg, 64, 210, "6 picks now that Conductor is joining Meta", { "font-size": 27, "font-weight": 500, fill: MUTE }), 832);
      txt(svg, 64, 248, "Checked 6 Nov 2026", { "font-size": 19, "font-weight": 500, fill: CAP });
      const lines = el("path", { d: "M480 348 V380 M110 380 H850 " + [0, 1, 2, 3, 4, 5].map((i) => `M${110 + i * 148} 380 V410`).join(" "), stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      const top = el("g", {}, svg);
      el("rect", { x: -110, y: -29, width: 220, height: 58, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, top);
      txt(top, 0, 8, "Conductor", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700, fill: MUTE });
      const COL = [YEL, BLUE, MINT, SKY, YEL, MINT];
      const tiles = ["Orca", "Munder Difflin", "Emdash", "T3 Code", "Worktrunk", "Claude Code"].map((n, i) => {
        const g = el("g", {}, svg), x = 40 + i * 148;
        el("rect", { x, y: 410, width: 140, height: 58, rx: 12, fill: COL[i], stroke: INK, "stroke-width": 3 }, g);
        const tn = fit(txt(g, x + 70, 445, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 }), 124);
        return { g, tn };
      });
      const fs = Math.min(...tiles.map((o) => parseFloat(o.tn.getAttribute("font-size"))));
      tiles.forEach((o) => o.tn.setAttribute("font-size", fs));
      return (t) => {
        tf(top, 480, 319, ob(seg(t, 0.2, 0.6)));
        lines.setAttribute("opacity", seg(t, 0.6, 1));
        tiles.forEach(({ g }, i) => { const k = oc(seg(t, 1 + i * 0.25, 1.5 + i * 0.25)); g.setAttribute("transform", `translate(0 ${40 * (1 - k)})`); g.setAttribute("opacity", k); });
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('600 22px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
