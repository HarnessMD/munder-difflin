/* Bright coded scenes for "Agent tools today, 15 Oct 2026". Vanilla JS, no library.
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

  const SC = {};

  /* ---- a jigsaw puzzle: four pieces of OpenCode 2.0 slide in and lock, then the 2.0 piece drops into the middle ---- */
  SC.today = {
    dur: 12, still: 9.5,
    build(svg, api) {
      const CX = 400, CY = 300, RH = 80;
      const rad = (d) => (d * Math.PI) / 180;
      const rev = (a) => a.slice().reverse();
      const path = (pts) => "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
      /* a round jigsaw knob on an edge at (mx, my): u runs along the edge, v points out; neck half width n, head radius r, head centre h out */
      const knob = (mx, my, ux, uy, vx, vy, n, r, h) => {
        const top = h - Math.sqrt(r * r - n * n), pts = [[mx - ux * n + vx * top, my - uy * n + vy * top]];
        const a0 = Math.atan2(top - h, -n), a1 = Math.atan2(top - h, n) - 2 * Math.PI, hx = mx + vx * h, hy = my + vy * h;
        for (let i = 1; i < 32; i++) { const a = a0 + ((a1 - a0) * i) / 32, c = Math.cos(a) * r, s = Math.sin(a) * r; pts.push([hx + ux * c + vx * s, hy + uy * c + vy * s]); }
        pts.push([mx + ux * n + vx * top, my + uy * n + vy * top]);
        return pts;
      };
      /* a straight seam with one knob in the middle, bulging along (vx, vy) */
      const seam = (A, B, vx, vy) => {
        const len = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / len, uy = (B[1] - A[1]) / len, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
        return [A, [mx - ux * 15, my - uy * 15], ...knob(mx, my, ux, uy, vx, vy, 15, 25, 34), [mx + ux * 15, my + uy * 15], B];
      };
      /* a quarter of the round hole in the middle, with a knob of the 2.0 piece pointing out at its middle */
      const quarter = (a0, a1) => {
        const m = (a0 + a1) / 2, d = (Math.asin(12 / RH) * 180) / Math.PI, pts = [];
        const on = (a) => [CX + RH * Math.cos(rad(a)), CY + RH * Math.sin(rad(a))];
        for (let i = 0; i <= 12; i++) pts.push(on(a0 + ((m - d - a0) * i) / 12));
        const [mx, my] = on(m);
        pts.push(...knob(mx, my, -Math.sin(rad(m)), Math.cos(rad(m)), Math.cos(rad(m)), Math.sin(rad(m)), 12, 20, 30));
        for (let i = 0; i <= 12; i++) pts.push(on(m + d + ((a1 - m - d) * i) / 12));
        return pts;
      };
      const sTop = seam([400, 70], [400, 220], 1, 0), sRight = seam([480, 300], [730, 300], 0, 1);
      const sBot = seam([400, 380], [400, 530], -1, 0), sLeft = seam([70, 300], [320, 300], 0, -1);
      const qBR = quarter(0, 90), qBL = quarter(90, 180), qTL = quarter(180, 270), qTR = quarter(270, 360);
      const P = [
        { pts: [[70, 70], [400, 70], ...sTop, ...rev(qTL), ...rev(sLeft)], fill: BLUE, label: "Service", lx: 226, ly: 182, px: 235, py: 185, fx: -330, fy: -240, fr: -22, sx: -30, sy: -22, sr: -8, tab: [434, 145] },
        { pts: [[400, 70], [730, 70], [730, 300], ...rev(sRight), ...rev(qTR), ...rev(sTop)], fill: MINT, label: "Code Mode", lx: 590, ly: 182, px: 565, py: 185, fx: 330, fy: -240, fr: 20, sx: 30, sy: -22, sr: 7, tab: [605, 334] },
        { pts: [...sLeft, ...rev(qBL), ...sBot, [70, 530]], fill: LIL, label: "Background", lx: 206, ly: 452, px: 235, py: 415, fx: -330, fy: 250, fr: 18, sx: -30, sy: 22, sr: 6, tab: [195, 266] },
        { pts: [[730, 300], [730, 530], [400, 530], ...rev(sBot), ...rev(qBR), ...sRight], fill: SKY, label: "Plugins", lx: 584, ly: 452, px: 565, py: 415, fx: 330, fy: 250, fr: -20, sx: 30, sy: 22, sr: -7, tab: [366, 455] },
      ];
      const hole = [...qBR, ...qBL, ...qTL, ...qTR];
      /* the board and the empty slots */
      el("rect", { x: 34, y: 34, width: 732, height: 532, rx: 28, fill: SOFT }, svg);
      [...P.map((p) => p.pts), hole].forEach((pts) => el("path", { d: path(pts), fill: "#fff", stroke: LIL, "stroke-width": 2, "stroke-dasharray": "7 8", "stroke-linejoin": "round" }, svg));
      /* the pieces; the whole puzzle is the tap target */
      const puz = el("g", {}, svg);
      el("rect", { x: 52, y: 52, width: 696, height: 496, rx: 20, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, puz);
      const pcs = P.map((p) => {
        const g = el("g", {}, puz);
        el("path", { d: path(p.pts), fill: p.fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        txt(g, p.lx, p.ly, p.label, { "text-anchor": "middle", "font-size": 38, "font-weight": 700 });
        return g;
      });
      const mid = el("g", {}, puz);
      el("path", { d: path(hole.map(([x, y]) => [x - CX, y - CY])), fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, mid);
      txt(mid, 0, 16, "2.0", { "text-anchor": "middle", "font-size": 46, "font-weight": 700 });
      let t0 = -99;
      button(puz, "Scatter and rebuild the puzzle", () => { t0 = api.now(); api.poke(); });
      /* a click ring where each piece locks, and a little burst when the middle piece lands */
      const rings = P.map((p) => el("circle", { cx: p.tab[0], cy: p.tab[1], r: 12, fill: "none", stroke: INK, "stroke-width": 3, opacity: 0 }, svg));
      const rays = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ a: rad(22.5 + i * 45), n: el("path", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round", opacity: 0 }, svg) }));
      return (t, now) => {
        const dt = now - t0, sp = dt >= 0 && dt < 2.3 ? (dt < 0.6 ? oc(dt / 0.6) : 1 - io(seg(dt, 1.0, 2.1))) : 0;
        const out = 1 - seg(t, 11.3, 11.9);
        pcs.forEach((g, i) => {
          const p = P[i], ti = 0.7 + i, k = oc(seg(t, ti, ti + 0.8)), pulse = 1 + 0.04 * Math.sin(Math.PI * seg(t, ti + 0.8, ti + 1.15));
          const x = p.fx * (1 - k) + p.sx * sp, y = p.fy * (1 - k) + p.sy * sp, r = p.fr * (1 - k) + p.sr * sp;
          g.setAttribute("transform", `translate(${x + p.px} ${y + p.py}) rotate(${r}) scale(${pulse}) translate(${-p.px} ${-p.py})`);
          g.setAttribute("opacity", seg(t, ti, ti + 0.25) * out);
          const kr = seg(t, ti + 0.8, ti + 1.5);
          rings[i].setAttribute("r", 12 + 40 * oc(kr));
          rings[i].setAttribute("stroke-width", 3 * (1 - kr));
          rings[i].setAttribute("opacity", kr > 0 && kr < 1 ? 1 : 0);
        });
        const km = seg(t, 4.9, 5.7), kp = seg(t, 5.7, 6.05);
        const ms = 1 + 0.07 * Math.sin(Math.PI * kp) + 0.12 * sp, mr = -140 * (1 - oc(km)) + 30 * sp;
        mid.setAttribute("transform", `translate(${CX} ${CY - 340 * (1 - oc(km))}) rotate(${mr}) scale(${ms})`);
        mid.setAttribute("opacity", seg(t, 4.9, 5.1) * out);
        const kb = seg(t, 5.75, 6.5), r1 = 98 + 12 * oc(kb), r2 = 104 + 32 * oc(kb);
        rays.forEach((y) => {
          const c = Math.cos(y.a), s = Math.sin(y.a);
          y.n.setAttribute("d", `M${CX + c * r1} ${CY + s * r1} L${CX + c * r2} ${CY + s * r2}`);
          y.n.setAttribute("stroke-width", 3 * (1 - seg(kb, 0.5, 1)));
          y.n.setAttribute("opacity", kb > 0 && kb < 1 ? 1 : 0);
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
