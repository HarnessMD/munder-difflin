/* Bright coded scenes for "OpenCode Browse vs agent-browser". Vanilla JS, no library.
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
  let uid = 0; // counter for SVG ids
  const nid = (p) => `mg-${p}-${++uid}`;
  const fit = (n, max) => { const L = n.getComputedTextLength(); if (L > max) n.setAttribute("font-size", ((parseFloat(n.getAttribute("font-size")) * max) / L).toFixed(1)); return n; };
  const hint = (svg, s) => txt(svg, 756, 60, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  const ring = (p, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, p);

  /* a jigsaw piece centred on 0,0: a tab on top, a notch on the left */
  const PW = 280, PH = 120;
  const PIECE = (w, h) => { const x = w / 2, y = h / 2; return `M${-x} ${-y} H-20 A22 22 0 1 1 20 ${-y} H${x} V${y} H${-x} V18 A18 18 0 0 0 ${-x} -18 Z`; };
  /* a wooden tray: yellow with ink lines and a piece shaped slot */
  const tray = (p, cx, cy, w, h, s) => {
    const g = el("g", {}, p), x = cx - w / 2, y = cy - h / 2;
    el("rect", { x, y, width: w, height: h, rx: 24, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("rect", { x: x + 14, y: y + 14, width: w - 28, height: h - 28, rx: 14, fill: "none", stroke: INK, "stroke-width": 2 }, g);
    [[x + 32, y + 42, 1], [x + w - 32, y + 42, -1], [x + w - 32, y + h - 30, -1]].forEach(([gx, gy, d]) =>
      el("path", { d: `M${gx} ${gy} q${d * 13} -7 ${d * 26} 0 t${d * 26} 0`, stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, g));
    el("path", { d: PIECE(PW, PH), transform: `translate(${cx} ${cy}) scale(${s})`, fill: "#fff", stroke: INK, "stroke-width": 3 / s, "stroke-linejoin": "round" }, g);
    return g;
  };

  const SC = {};

  /* ---- 1. two trays, two pieces: your browser and a fresh one ---- */
  SC.puzzle = {
    dur: 8.5, still: 6,
    build(svg, api) {
      hint(svg, "tap a piece");
      const CY = 360;
      let lastT = 0;
      const items = [[220, "Your browser", "Signed in tabs", SKY, 0.6], [580, "Fresh browser", "Headless Chrome", MINT, 2.4]].map(([cx, label, word, col, at], i) => {
        fit(txt(svg, cx, 168, label, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 }), 320);
        tray(svg, cx, CY, 330, 300, 1);
        const burst = el("path", { d: "M-152 -72 L-166 -86 M-156 -56 L-176 -58 M-140 -78 L-143 -98 M152 -72 L166 -86 M156 -56 L176 -58 M140 -78 L143 -98", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", fill: "none", opacity: 0, transform: `translate(${cx} ${CY})` }, svg);
        const g = el("g", {}, svg);
        ring(g, -154, -112, 308, 186, 20);
        el("path", { d: PIECE(PW, PH), fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        fit(txt(g, 8, 9, word, { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 }), 220);
        const it = { g, burst, cx, at, i, tap: -99 };
        button(g, word, () => { it.tap = api.now(); api.seek(lastT); });
        return it;
      });
      return (t, now) => {
        lastT = t;
        items.forEach((it) => {
          const land = it.at + 0.65, f = seg(t, it.at, land);
          let off = t < land ? -520 * (1 - f * f) : -12 * Math.sin(Math.PI * seg(t, land, land + 0.25));
          off -= 520 * io(seg(t, 7.2, 8));
          const op = seg(t, it.at, it.at + 0.1) * (1 - seg(t, 7.5, 8));
          let r = 0, flash = seg(t, land, land + 0.05) * (1 - seg(t, land + 0.15, land + 0.45));
          const s = now - it.tap;
          if (it.tap >= 0 && s >= 0 && s < 1) {
            const k = s < 0.35 ? oc(s / 0.35) : s < 0.5 ? 1 : s < 0.78 ? 1 - seg(s, 0.5, 0.78) ** 2 : -0.12 * Math.sin(Math.PI * seg(s, 0.78, 1));
            off -= 70 * k; r = (it.i ? 5 : -5) * Math.max(0, k);
            flash = Math.max(flash, seg(s, 0.78, 0.8) * (1 - seg(s, 0.86, 1)));
          }
          tf(it.g, it.cx, CY + off, 1, r); it.g.setAttribute("opacity", op);
          it.burst.setAttribute("opacity", flash);
        });
      };
    },
  };

  /* ---- 2. a striped baton rolls from the Agent tray to You ---- */
  SC.baton = {
    dur: 8.2, still: 5.5,
    build(svg, api) {
      const A = 175, B = 625, Y = 390, CX = 615, CB = 288;
      [[A, "Agent", LIL], [B, "You", MINT]].forEach(([cx, label, col]) => {
        el("rect", { x: cx - 130, y: 296, width: 260, height: 124, rx: 14, fill: col, stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, cx, 342, label, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
      });
      el("path", { d: "M110 444 V500 L166 444 Z M690 444 V500 L634 444 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 36, y: 418, width: 728, height: 26, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M330 431 q13 -6 26 0 t26 0 M444 431 q13 -6 26 0 t26 0", stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, svg);
      const cid = nid("clip");
      el("rect", { x: -115, y: -28, width: 230, height: 56, rx: 28 }, el("clipPath", { id: cid }, el("defs", {}, svg)));
      const bat = el("g", {}, svg), body = el("g", { "clip-path": `url(#${cid})` }, bat);
      el("rect", { x: -115, y: -28, width: 230, height: 56, fill: SKY }, body);
      const stripes = el("g", {}, body);
      for (let i = -8; i <= 8; i++) el("path", { d: `M${i * 40 - 2} -30 h18 l-14 60 h-18 Z`, fill: BLUE }, stripes);
      el("rect", { x: -62, y: -30, width: 124, height: 60, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, body);
      el("rect", { x: -115, y: -28, width: 230, height: 56, rx: 28, fill: "none", stroke: INK, "stroke-width": 3 }, bat);
      fit(txt(bat, 0, 8, "Your tab", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 }), 110);
      [[A, LIL], [B, MINT]].forEach(([cx, col]) => el("rect", { x: cx - 136, y: 409, width: 272, height: 13, rx: 5, fill: col, stroke: INK, "stroke-width": 3 }, svg));
      el("rect", { x: CX - 145, y: 284, width: 290, height: 10, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const card = el("g", {}, svg);
      el("rect", { x: CX - 135, y: 102, width: 290, height: 182, rx: 18, fill: SKY }, card);
      el("rect", { x: CX - 145, y: 92, width: 290, height: 182, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      fit(txt(card, CX, 150, "Login, your turn", { "text-anchor": "middle", "font-size": 27, "font-weight": 700 }), 254);
      const btn = el("g", {}, card);
      ring(btn, CX - 96, 178, 192, 66, 33);
      el("rect", { x: CX - 88, y: 184, width: 176, height: 54, rx: 27, fill: YEL, stroke: INK, "stroke-width": 3 }, btn);
      txt(btn, CX, 219, "Continue", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      let lastT = 0, lastX = A, cardNow = 0, back = -1, x0 = B, k0 = 1;
      button(btn, "Continue", () => { if (cardNow < 0.6) return; back = api.now(); x0 = lastX; k0 = cardNow; api.seek(lastT); });
      return (t, now) => {
        lastT = t;
        let x = A + (B - A) * io(seg(t, 0.8, 3)), op = 1, press = 1;
        if (t >= 7) { op = t < 7.35 ? 1 - seg(t, 7, 7.35) : seg(t, 7.45, 7.9); if (t >= 7.35) x = A; }
        let k = ob(seg(t, 2.7, 3.3)) * (1 - io(seg(t, 6.6, 6.95)));
        if (back >= 0) {
          const s = now - back;
          if (s >= 3.2) { back = -1; api.seek(0); return; }
          press = 1 - 0.06 * Math.sin(Math.PI * seg(s, 0, 0.2));
          k = k0 * (1 - io(seg(s, 0.15, 0.5)));
          x = x0 + (A - x0) * io(seg(s, 0.4, 1.9)); op = 1;
        }
        lastX = x; cardNow = k;
        tf(bat, x, Y); bat.setAttribute("opacity", op);
        tf(stripes, ((((-x * 0.7) % 40) + 40) % 40), 0);
        card.setAttribute("transform", `translate(0 ${CB}) scale(1 ${Math.max(0.001, k)}) translate(0 ${-CB})`); card.setAttribute("visibility", k < 0.02 ? "hidden" : "visible");
        btn.setAttribute("transform", `translate(${CX} 211) scale(${press}) translate(${-CX} -211)`);
      };
    },
  };

  /* ---- 3. two lockers, refs on the plates; click @e2 opens the second ---- */
  SC.lockers = {
    dur: 8.5, still: 5.5,
    build(svg, api) {
      hint(svg, "tap either locker");
      const CMD = "click @e2", OPEN = 110;
      el("rect", { x: 220, y: 100, width: 360, height: 76, rx: 38, fill: SOFT }, svg);
      const ty = txt(svg, 0, 152, CMD, { "font-family": MONO, "font-size": 42, "font-weight": 700 });
      const TL = ty.getComputedTextLength() || 227, tx = 400 - TL / 2;
      ty.setAttribute("x", tx);
      const caret = el("rect", { y: 118, width: 4, height: 42, fill: INK }, svg);
      el("path", { d: "M120 521 H680", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      let lastT = 0;
      const lk = [[170, LIL, "@e1", 1], [420, SKY, "@e2", -1]].map(([x, col, ref, dir], i) => {
        const g = el("g", {}, svg);
        ring(g, x - 10, 208, 230, 324, 20);
        el("rect", { x, y: 220, width: 210, height: 300, rx: 12, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const plate = el("rect", { x: x + 40, y: 234, width: 130, height: 46, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, x + 105, 266, ref, { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
        el("rect", { x: x + 15, y: 296, width: 180, height: 208, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        if (i === 1) {
          const note = el("g", { transform: `rotate(-3 ${x + 105} 400)` }, g);
          el("path", { d: `M${x + 25} 342 H${x + 161} L${x + 185} 366 V458 H${x + 25} Z`, fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, note);
          el("path", { d: `M${x + 161} 342 V366 H${x + 185} Z`, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, note);
          fit(txt(note, x + 103, 394, "More", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 }), 140);
          fit(txt(note, x + 103, 426, "information", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 }), 140);
        }
        const face = el("path", { fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const door = el("g", {}, g);
        const marks = el("g", {}, door);
        el("path", { d: "M50 322 H130 M50 336 H130 M50 350 H130", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, marks);
        el("rect", { x: 150, y: 382, width: 14, height: 44, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, marks);
        const d = { door, face, marks, plate, col, dir, hx: dir > 0 ? x + 15 : x + 195, tap: -1 };
        button(g, ref, () => { d.tap = api.now(); api.seek(lastT); });
        return d;
      });
      return (t, now) => {
        lastT = t;
        const n = Math.round(CMD.length * (seg(t, 0.4, 1.9) - seg(t, 7.4, 7.9)));
        ty.textContent = CMD.slice(0, n);
        caret.setAttribute("x", tx + (TL / CMD.length) * n + 4);
        caret.setAttribute("opacity", (t > 0.4 && t < 1.9) || Math.floor(now * 2.4) % 2 === 0 ? 1 : 0);
        lk[1].plate.setAttribute("fill", t >= 2 && t < 7.4 ? YEL : "#fff");
        lk.forEach((d, i) => {
          let a = i === 1 ? OPEN * ob(seg(t, 2.3, 3.1)) * (1 - io(seg(t, 6.9, 7.5))) : 0;
          const s = now - d.tap;
          if (d.tap >= 0 && s >= 0 && s < 1.6) {
            const u = s / 1.6, b = u < 0.4 ? oc(u / 0.4) : u < 0.6 ? 1 : 1 - io(seg(u, 0.6, 1));
            a = a < OPEN / 2 ? a + (OPEN - a) * b : a * (1 - b);
          }
          const r = (a * Math.PI) / 180, c = Math.cos(r);
          const sk = -0.12 * Math.sin(r), fx = d.hx + d.dir * c * 180;
          d.door.setAttribute("transform", `matrix(${d.dir * c} ${sk} 0 1 ${d.hx} 0)`);
          d.face.setAttribute("d", `M${d.hx} 296 L${fx} ${296 + sk * 180} L${fx} ${504 + sk * 180} L${d.hx} 504 Z`);
          d.face.setAttribute("fill", c < 0 ? SOFT : d.col); d.marks.setAttribute("opacity", c < 0 ? 0 : 1);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 40, width: 124, height: 42, rx: 21, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 126, 68, "Versus", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      txt(svg, 896, 68, "Checked 11 Nov 2026", { "text-anchor": "end", "font-size": 19, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 142, "OpenCode Browse", { "font-size": 60, "font-weight": 700 });
      txt(svg, 64, 206, "vs agent-browser", { "font-size": 60, "font-weight": 700 });
      el("path", { d: "M66 230 H520", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 274, "Two browser tools for coding agents", { "font-size": 25, "font-weight": 500, fill: MUTE });
      [[256, "Browse", SKY], [704, "agent-browser", MINT]].forEach(([cx, name, col]) => {
        txt(svg, cx, 326, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        tray(svg, cx, 426, 384, 160, 0.55);
        el("path", { d: PIECE(PW, PH), transform: `translate(${cx} 426) scale(0.55)`, fill: col, stroke: INK, "stroke-width": 3 / 0.55, "stroke-linejoin": "round" }, svg);
      });
      return () => {};
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
