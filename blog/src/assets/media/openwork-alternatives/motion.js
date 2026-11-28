/* Bright coded scenes for "OpenWork alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", GREY = "#E8E6EC";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const wd = (n) => n.getComputedTextLength();
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (p, x, y, w, h, r) => el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", class: "mg-ring" }, p);
  const check = (p) => {
    const g = el("g", {}, p);
    el("circle", { r: 22, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
    el("path", { d: "M-9 1 L-3 7 L10 -7", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    return g;
  };

  const SC = {};

  /* ---- 1. a lockbox on a desk takes the folder in; cloud workers stay optional ---- */
  SC.lockbox = {
    dur: 9, still: 9,
    build(svg, api) {
      el("path", { d: "M216 0 V62 M384 0 V62", stroke: INK, "stroke-width": 2.5 }, svg);
      const sr = el("rect", { y: 58, height: 66, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      const st = txt(svg, 300, 102, "Desktop mode", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
      const sw = Math.max(260, wd(st) + 64); sr.setAttribute("x", 300 - sw / 2); sr.setAttribute("width", sw);
      el("rect", { x: 96, y: 460, width: 24, height: 114, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 680, y: 460, width: 24, height: 114, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 60, y: 440, width: 680, height: 28, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const guide = el("path", { d: "M426 252 C452 196 494 226 548 198", fill: "none", stroke: "none" }, svg);
      const GL = guide.getTotalLength(), pts = Array.from({ length: 61 }, (_, i) => guide.getPointAtLength((GL * i) / 60));
      const upTo = (p) => { const n = Math.round(p * 60); return n < 1 ? "" : "M" + pts.slice(0, n + 1).map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" L"); };
      const dots = el("path", { d: "", fill: "none", stroke: INK, "stroke-width": 4.5, "stroke-dasharray": "0.5 12", "stroke-linecap": "round" }, svg);
      const cloud = el("g", {}, svg);
      el("path", { d: "M540 200 C500 200 486 170 506 150 C494 118 530 96 560 106 C572 74 620 64 650 84 C676 62 726 70 732 106 C768 108 782 150 756 172 C760 194 736 204 716 200 Z", fill: GREY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, cloud);
      txt(cloud, 634, 141, "Cloud workers", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      txt(cloud, 634, 173, "optional", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      const folder = el("g", {}, svg);
      el("path", { d: "M-70 -44 V-50 Q-70 -56 -64 -56 H-26 L-16 -46 H64 Q70 -46 70 -40 V46 Q70 52 64 52 H-64 Q-70 52 -70 46 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, folder);
      el("path", { d: "M-70 -30 H70", stroke: INK, "stroke-width": 2.5 }, folder);
      const box = el("g", {}, svg);
      ring(box, 160, 238, 280, 218, 20);
      el("rect", { x: 180, y: 290, width: 240, height: 150, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3.5 }, box);
      const pl = el("rect", { y: 354, height: 50, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, box);
      const lt = txt(box, 300, 388, "Your files", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      const pw = wd(lt) + 40; pl.setAttribute("x", 300 - pw / 2); pl.setAttribute("width", pw);
      const lid = el("g", {}, box);
      el("rect", { x: 278, y: 250, width: 44, height: 16, rx: 5, fill: SKY, stroke: INK, "stroke-width": 2.5 }, lid);
      el("rect", { x: 172, y: 262, width: 256, height: 30, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3.5 }, lid);
      const lock = el("g", {}, box);
      el("path", { d: "M-11 0 V-9 A11 11 0 0 1 11 -9 V0", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, lock);
      el("rect", { x: -18, y: -2, width: 36, height: 28, rx: 6, fill: MINT, stroke: INK, "stroke-width": 3 }, lock);
      el("circle", { cx: 0, cy: 9, r: 3.5, fill: INK }, lock);
      el("path", { d: "M0 11 V17", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, lock);
      button(box, "Your files lockbox: open the lid and slide the folder in again", () => api.seek(0));
      const FS = [620, 226], FA = [300, 196], FB = [300, 384];
      return (t) => {
        const open = oc(seg(t, 0.25, 0.85)) - io(seg(t, 3.4, 4.1));
        lid.setAttribute("transform", `rotate(${-108 * open} 178 290)`);
        const lk = t < 1 ? 1 - io(seg(t, 0, 0.3)) : ob(seg(t, 4.1, 4.6));
        tf(lock, 300, 300, Math.max(lk, 0.001)); lock.setAttribute("opacity", lk > 0.01 ? 1 : 0);
        if (t < 0.7) { tf(folder, FB[0], FB[1]); folder.setAttribute("opacity", 1); }
        else {
          const sl = io(seg(t, 1.1, 2.5)), dr = io(seg(t, 2.5, 3.3));
          tf(folder, FS[0] + (FA[0] - FS[0]) * sl, FS[1] + (FA[1] - FS[1]) * sl + (FB[1] - FA[1]) * dr);
          folder.setAttribute("opacity", seg(t, 0.7, 1.1));
        }
        const fade = 1 - seg(t, 0, 0.4);
        dots.setAttribute("d", upTo(t < 1 ? 1 : oc(seg(t, 4.7, 5.9)))); dots.setAttribute("opacity", t < 1 ? fade : 1);
        const co = t < 1 ? fade : oc(seg(t, 5.6, 6.4));
        cloud.setAttribute("opacity", co); cloud.setAttribute("transform", `translate(0 ${t < 1 ? 0 : 14 * (1 - co)})`);
      };
    },
  };

  /* ---- 2. a tape measure pulls its tape past the two price marks ---- */
  SC.tapemeasure = {
    dur: 8, still: 8,
    build(svg, api) {
      const X0 = 226, XE = 720, M = [395, 645], TY = 266;
      const LBL = [["Free $0", "up to 5 users"], ["Team $10", "per user a month"]];
      const ticks = M.map((x, i) => {
        el("path", { d: `M${x} 252 V360`, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 6", "stroke-linecap": "round" }, svg);
        const c = el("rect", { y: 360, height: 92, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
        const a = txt(svg, x, 398, LBL[i][0], { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        const b = txt(svg, x, 432, LBL[i][1], { "text-anchor": "middle", "font-size": 22, "font-weight": 500 });
        const w = Math.max(wd(a), wd(b)) + 44; c.setAttribute("x", x - w / 2); c.setAttribute("width", w);
        return check(svg);
      });
      const tape = el("rect", { x: 200, y: TY, width: 30, height: 32, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, svg);
      const marks = el("path", { d: "", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      const hook = el("rect", { y: TY - 8, width: 10, height: 48, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const cs = el("g", {}, svg);
      ring(cs, 30, 134, 212, 222, 42);
      el("rect", { x: 150, y: 148, width: 48, height: 18, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, cs);
      el("rect", { x: 46, y: 160, width: 180, height: 180, rx: 36, fill: YEL, stroke: INK, "stroke-width": 3.5 }, cs);
      el("circle", { cx: 132, cy: 250, r: 56, fill: "#fff", stroke: INK, "stroke-width": 3 }, cs);
      const hub = el("g", {}, cs);
      el("path", { d: "M0 -40 V-22 M34.6 20 L19 11 M-34.6 20 L-19 11", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, hub);
      el("circle", { r: 16, fill: SKY, stroke: INK, "stroke-width": 3 }, hub);
      button(cs, "Tape measure: wind the tape in and pull it out again", () => api.seek(0));
      const ext = (t) => (t < 1.3 ? XE + (X0 - XE) * io(seg(t, 0, 0.9)) : X0 + (XE - X0) * io(seg(t, 1.3, 5)));
      const when = M.map((m) => { for (let t = 1.3; t < 5.2; t += 0.01) if (ext(t) >= m) return t; return 5; });
      return (t) => {
        const e = ext(t);
        tape.setAttribute("width", e - 200); hook.setAttribute("x", e - 2);
        let d = "";
        for (let x = 240, n = 1; x < e - 8; x += 14, n++) d += `M${x} ${TY + 3} V${TY + (n % 5 ? 10 : 17)} `;
        marks.setAttribute("d", d);
        hub.setAttribute("transform", `translate(132 250) rotate(${(e - X0) * 0.9})`);
        ticks.forEach((k, i) => {
          const s = t < 1.3 ? cl((e - M[i]) / 30) : ob(seg(t, when[i], when[i] + 0.45));
          tf(k, M[i], 220, Math.max(s, 0.001)); k.setAttribute("opacity", s > 0.01 ? 1 : 0);
        });
      };
    },
  };

  /* ---- 3. six tagged pencils in a pen holder ---- */
  SC.penholder = {
    dur: 8, still: 8,
    build(svg, api) {
      const sr = el("rect", { y: 16, height: 60, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const st = txt(svg, 400, 57, "Pick your tool", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
      const sw = wd(st) + 64; sr.setAttribute("x", 400 - sw / 2); sr.setAttribute("width", sw);
      const P = [
        [342, 316, 350, LIL, "Many CLIs:", "AionUi"],
        [366, 348, 240, SKY, "Team of agents:", "Munder Difflin"],
        [390, 378, 130, YEL, "Files and any model:", "Eigent"],
        [410, 422, 130, MINT, "One vendor:", "Claude Cowork"],
        [434, 452, 240, LIL, "One local agent:", "goose"],
        [458, 484, 350, YEL, "Shared skills:", "OpenWork"],
      ];
      const BY = 545, LIFT = 30;
      const pens = P.map(([bx, tx, ty, col, what, name], i) => {
        const left = i < 3, dx = tx - bx, dy = ty - BY, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
        const g = el("g", {}, svg), B = [tx - ux * 36, ty - uy * 36];
        const str = el("path", { stroke: INK, "stroke-width": 2, fill: "none" }, g);
        const pen = el("g", {}, g); tf(pen, bx, BY, 1, (Math.atan2(dx, -dy) * 180) / Math.PI);
        el("rect", { x: -22, y: -L, width: 44, height: L, fill: "#fff", "fill-opacity": 0 }, pen);
        el("rect", { x: -11, y: -L + 34, width: 22, height: L - 34, fill: col, stroke: INK, "stroke-width": 3 }, pen);
        el("path", { d: `M-11 ${-L + 34} L0 ${-L} L11 ${-L + 34} Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, pen);
        el("path", { d: `M-3.5 ${-L + 11} L0 ${-L} L3.5 ${-L + 11} Z`, fill: INK }, pen);
        const tag = el("g", {}, g);
        const tr = el("rect", { y: B[1] - 31, height: 62, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
        const rg = ring(tag, 0, B[1] - 38, 0, 76, 14);
        const t1 = txt(tag, 0, B[1] - 6, what, { "font-size": 16, "font-weight": 500 });
        const t2 = txt(tag, 0, B[1] + 19, name, { "font-family": MONO, "font-size": 19, "font-weight": 700 });
        const w = Math.max(wd(t1), wd(t2)) + 46, x0 = left ? 290 - w : 510, hx = left ? 277 : 523;
        tr.setAttribute("x", x0); tr.setAttribute("width", w);
        rg.setAttribute("x", x0 - 7); rg.setAttribute("width", w + 14);
        t1.setAttribute("x", left ? x0 + 16 : x0 + 30); t2.setAttribute("x", left ? x0 + 16 : x0 + 30);
        el("circle", { cx: hx, cy: B[1], r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
        str.setAttribute("d", `M${B[0].toFixed(1)} ${B[1].toFixed(1)} L${hx} ${B[1].toFixed(1)}`);
        const o = { g, tag, ux, uy, ax: left ? 290 : 510, ay: B[1], tap: -99 };
        button(g, `${what} ${name}`, () => { o.tap = api.now(); api.poke(); });
        return o;
      });
      el("ellipse", { cx: 400, cy: 578, rx: 126, ry: 9, fill: SOFT }, svg);
      el("rect", { x: 300, y: 440, width: 200, height: 132, rx: 16, fill: BLUE, stroke: INK, "stroke-width": 3.5 }, svg);
      el("rect", { x: 292, y: 428, width: 216, height: 24, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3.5 }, svg);
      el("path", { d: "M326 472 V544", stroke: SKY, "stroke-width": 7, "stroke-linecap": "round" }, svg);
      const ORDER = [2, 1, 0, 3, 4, 5];
      return (t, now) => {
        pens.forEach((p, i) => {
          const s0 = 0.5 + ORDER.indexOf(i);
          const auto = oc(seg(t, s0, s0 + 0.35)) * (1 - io(seg(t, s0 + 0.6, s0 + 1)));
          const s = now - p.tap, tp = s >= 0 && s < 2.4 ? ob(seg(s, 0, 0.35)) * (1 - io(seg(s, 1.9, 2.4))) : 0;
          const lift = LIFT * Math.max(auto, tp);
          p.g.setAttribute("transform", `translate(${(p.ux * lift).toFixed(2)} ${(p.uy * lift).toFixed(2)})`);
          p.tag.setAttribute("transform", `translate(${p.ax} ${p.ay}) scale(${1 + 0.3 * tp}) translate(${-p.ax} ${-p.ay})`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 600, still: 2.6,
    build(svg) {
      const pill = el("rect", { x: 56, y: 36, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2 }, svg);
      const pt = txt(svg, 76, 64, "Alternatives", { "font-size": 20, "font-weight": 700 });
      pill.setAttribute("width", wd(pt) + 40);
      txt(svg, 904, 64, "Checked 14 Nov 2026", { "text-anchor": "end", "font-size": 18, "font-weight": 500, fill: MUTE });
      const title = txt(svg, 56, 172, "OpenWork alternatives", { "font-size": 66, "font-weight": 700 });
      if (wd(title) > 848) title.setAttribute("font-size", (66 * 848) / wd(title));
      el("path", { d: "M60 202 H250", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 56, 252, "5 desktop AI agent apps like OpenWork for office work", { "font-size": 24, "font-weight": 500, fill: MUTE });
      const trunk = el("path", { d: "M480 348 V385", stroke: INK, "stroke-width": 1.5 }, svg);
      const KIDS = [["Eigent", YEL], ["Munder Difflin", BLUE], ["AionUi", LIL], ["Claude Cowork", SKY], ["goose", MINT]];
      const kids = KIDS.map(([n, c]) => {
        const br = el("path", { stroke: INK, "stroke-width": 1.5, fill: "none" }, svg);
        const g = el("g", {}, svg);
        const r = el("rect", { y: 422, height: 46, rx: 12, fill: c, stroke: INK, "stroke-width": 2 }, g);
        const tx = txt(g, 0, 451, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
        return { g, r, tx, br, w: Math.max(110, wd(tx) + 36) };
      });
      let x = 480 - (kids.reduce((s, k) => s + k.w, 0) + 18 * 4) / 2;
      kids.forEach((k) => { const cx = x + k.w / 2; k.r.setAttribute("x", x); k.r.setAttribute("width", k.w); k.tx.setAttribute("x", cx); k.br.setAttribute("d", `M480 385 H${cx.toFixed(1)} V422`); x += k.w + 18; });
      const rr = el("rect", { y: 300, height: 48, rx: 12, fill: GREY, stroke: INK, "stroke-width": 2 }, svg);
      const rt = txt(svg, 480, 331, "OpenWork", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const rw = wd(rt) + 48; rr.setAttribute("x", 480 - rw / 2); rr.setAttribute("width", rw);
      return (t) => {
        const u = Math.min(t, 2.6);
        trunk.setAttribute("opacity", seg(u, 0.2, 0.5));
        kids.forEach((k, i) => { const q = oc(seg(u, 0.5 + i * 0.3, 1 + i * 0.3)); k.g.setAttribute("opacity", q); k.br.setAttribute("opacity", q); k.g.setAttribute("transform", `translate(0 ${30 * (1 - q)})`); });
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
