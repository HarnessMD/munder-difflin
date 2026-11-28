/* Bright coded scenes for "Claude Code Privacy: Your Email Address, Saved Rules and Secrets". Vanilla JS, no library.
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
  const pop = (n, cx, cy, s) => n.setAttribute("transform", `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
  let uid = 0; const nid = (p) => `mg-${p}-${++uid}`;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hint = (svg, s) => txt(svg, 756, 44, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });

  const SC = {};

  /* ---- 1. a postcard slides toward a wall slot and a card asks first ---- */
  SC.postcard = {
    dur: 8, still: 7.9,
    build(svg, api) {
      hint(svg, "Tap Deny");
      el("rect", { x: 30, y: 300, width: 604, height: 262, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 650, y: 272, width: 120, height: 306, rx: 18, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 684, y: 336, width: 52, height: 190, rx: 26, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 697, y: 350, width: 26, height: 162, rx: 13, fill: INK }, svg);
      const lines = [0, 1, 2].map((i) => el("path", { d: `M0 ${-30 + i * 30} H${-46 - (i % 2) * 22}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg));
      const pc = el("g", {}, svg);
      el("rect", { x: -95, y: -62, width: 190, height: 124, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, pc);
      el("path", { d: "M6 -44 V44", stroke: MUTE, "stroke-width": 2.5, "stroke-linecap": "round" }, pc);
      [[-30, 60], [-10, 50], [10, 56], [30, 38]].forEach(([y, w]) => el("path", { d: `M-76 ${y} H${-76 + w}`, stroke: MUTE, "stroke-width": 4, "stroke-linecap": "round" }, pc));
      el("rect", { x: 40, y: -50, width: 40, height: 46, rx: 5, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pc);
      el("circle", { cx: 34, cy: -20, r: 15, fill: "none", stroke: BLUE, "stroke-width": 3 }, pc);
      [16, 34].forEach((y, i) => el("path", { d: `M22 ${y} H${78 - i * 12}`, stroke: MUTE, "stroke-width": 4, "stroke-linecap": "round" }, pc));
      const dlg = el("g", {}, svg);
      el("rect", { x: 150, y: 60, width: 500, height: 196, rx: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, dlg);
      txt(dlg, 400, 128, "Send your email address?", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      el("rect", { x: 214, y: 162, width: 168, height: 60, rx: 30, fill: MINT, stroke: INK, "stroke-width": 3 }, dlg);
      txt(dlg, 298, 201, "Allow", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const deny = el("g", {}, dlg), dbody = el("g", {}, deny);
      el("rect", { x: 411, y: 155, width: 182, height: 74, rx: 37, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, deny);
      el("rect", { x: 418, y: 162, width: 168, height: 60, rx: 30, fill: SKY, stroke: INK, "stroke-width": 3 }, dbody);
      txt(dbody, 502, 201, "Deny", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const X0 = 150, X1 = 520, R0 = -9;
      let denyAt = -99, fromX = X0, fromR = R0, lastX = X0, lastR = R0;
      button(deny, "Deny: the postcard slides back to the desk", () => { if (denyAt > 0) return; denyAt = api.now(); fromX = lastX; fromR = lastR; api.poke(); });
      return (t, now) => {
        let x, r, card, speed;
        const s = now - denyAt;
        if (denyAt > 0 && s >= 3.4) { denyAt = -99; api.seek(0); return; }
        if (denyAt > 0) {
          const k = io(seg(s, 0.3, 1.6));
          x = fromX + (X0 - fromX) * k; r = fromR + (R0 - fromR) * k;
          card = 1 - oc(seg(s, 0.12, 0.42)); speed = seg(s, 0.3, 0.5) * (1 - seg(s, 1.1, 1.6));
          pop(dbody, 502, 192, 1 - 0.08 * Math.sin(seg(s, 0, 0.2) * Math.PI));
        } else {
          const k = oc(seg(t, 0.6, 3.0));
          x = X0 + (X1 - X0) * k; r = R0 * (1 - k);
          card = ob(seg(t, 2.9, 3.35)); speed = seg(t, 0.6, 0.9) * (1 - seg(t, 1.9, 2.8));
          pop(dbody, 502, 192, 1);
        }
        lastX = x; lastR = r;
        tf(pc, x, 430, 1, r);
        const dir = denyAt > 0 ? 1 : -1;
        lines.forEach((n, i) => { n.setAttribute("transform", `translate(${x + dir * (112 + i * 8)} 430)`); n.setAttribute("opacity", speed); if (dir > 0) n.setAttribute("transform", `translate(${x + 112 + i * 8} 430) scale(-1 1)`); });
        pop(dlg, 400, 256, 0.6 + 0.4 * card); dlg.setAttribute("opacity", cl(card * 1.5));
      };
    },
  };

  /* ---- 2. a typewriter types a saved rule onto settings.local.json ---- */
  SC.typewriter = {
    dur: 10, still: 8.4,
    build(svg, api) {
      hint(svg, "Tap the sheet");
      const LINE = "Bash(npm test *)", CW = 15.6, TX = 275;
      const G = el("g", {}, svg);
      const ring = el("rect", { x: 236, y: 130, width: 328, height: 180, rx: 14, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6", class: "mg-ring" }, G);
      const sheet = el("g", {}, G);
      el("rect", { x: 250, y: 140, width: 300, height: 400, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, sheet);
      txt(sheet, 400, 186, "settings.local.json", { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
      el("path", { d: "M274 204 H526", stroke: MUTE, "stroke-width": 2, "stroke-linecap": "round" }, sheet);
      const typed = txt(sheet, TX, 284, "", { "font-family": MONO, "font-size": 26, "font-weight": 700 });
      const caret = el("rect", { y: 290, width: 15, height: 4, rx: 2, fill: INK }, sheet);
      el("path", { d: "M120 562 L172 334 H628 L680 562 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 150, y: 296, width: 500, height: 48, rx: 24, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      const knobs = [132, 668].map((cx) => { const g = el("g", {}, svg); el("circle", { r: 26, fill: LIL, stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M0 -16 V16", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g); return { g, cx }; });
      const keys = [];
      [[392, 8], [438, 9], [484, 8]].forEach(([y, n]) => { for (let i = 0; i < n; i++) { const g = el("g", {}, svg); el("circle", { r: 17, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); keys.push({ g, x: 400 + (i - (n - 1) / 2) * 50, y }); } });
      const space = el("rect", { x: 300, y: 516, width: 200, height: 24, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      const at = (i) => 0.7 + i * 0.17;
      let lastT = 0;
      button(G, "Tap the sheet: it rolls back down and the line types again", () => { if (lastT >= 3.9 && lastT < 8.6) api.seek(8.6); else if (lastT < 3.9) api.seek(0.4); });
      return (t) => {
        lastT = t;
        let n = 0, hit = -1;
        for (let i = 0; i < LINE.length; i++) if (t >= at(i)) { n = i + 1; if (t - at(i) < 0.12) hit = i; }
        typed.textContent = LINE.slice(0, n);
        typed.setAttribute("opacity", 1 - seg(t, 9.4, 9.8));
        caret.setAttribute("x", TX + n * CW); caret.setAttribute("opacity", t < 3.8 && n < LINE.length ? 1 : 0);
        keys.forEach((k, i) => { const on = hit >= 0 && LINE[hit] !== " " && (hit * 7 + 3) % keys.length === i; tf(k.g, k.x, k.y + (on ? 4 : 0)); k.g.firstChild.setAttribute("fill", on ? SKY : "#fff"); });
        const sp = hit >= 0 && LINE[hit] === " ";
        space.setAttribute("transform", `translate(0 ${sp ? 4 : 0})`); space.setAttribute("fill", sp ? SKY : "#fff");
        const up = 110 * (io(seg(t, 3.9, 5.1)) - io(seg(t, 8.6, 9.4)));
        sheet.setAttribute("transform", `translate(0 ${-up})`);
        ring.setAttribute("y", 130 - up); ring.setAttribute("height", 180 + up);
        knobs.forEach((k) => tf(k.g, k.cx, 320, 1, up * 3));
      };
    },
  };

  /* ---- 3. file cards pour through a strainer; .env stays in the mesh ---- */
  SC.strainer = {
    dur: 9, still: 8.0,
    build(svg, api) {
      hint(svg, "Tap the strainer");
      const bowlD = "M220 220 H580 Q580 384 400 384 Q220 384 220 220 Z", cid = nid("mesh");
      const cp = el("clipPath", { id: cid }, el("defs", {}, svg)); el("path", { d: bowlD }, cp);
      const words = el("g", {}, svg);
      el("rect", { x: 226, y: 126, width: 348, height: 54, rx: 27, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, words);
      txt(words, 400, 162, "Read(./.env) denied", { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
      const G = el("g", {}, svg);
      el("rect", { x: 198, y: 188, width: 578, height: 212, rx: 30, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, G);
      const S1 = el("g", {}, G);
      el("path", { d: bowlD, fill: "#fff" }, S1);
      const mesh = el("g", { "clip-path": `url(#${cid})` }, S1);
      for (let x = 230; x < 580; x += 18) el("path", { d: `M${x} 220 V390`, stroke: MUTE, "stroke-width": 1.6 }, mesh);
      for (let y = 238; y < 390; y += 18) el("path", { d: `M220 ${y} H580`, stroke: MUTE, "stroke-width": 1.6 }, mesh);
      el("path", { d: bowlD, fill: "none", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, S1);
      const layer = el("g", {}, G), S2 = el("g", {}, G);
      el("path", { d: "M578 222 L748 198", stroke: INK, "stroke-width": 22, "stroke-linecap": "round" }, S2);
      el("path", { d: "M578 222 L748 198", stroke: BLUE, "stroke-width": 15, "stroke-linecap": "round" }, S2);
      el("circle", { cx: 744, cy: 199, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, S2);
      el("rect", { x: 208, y: 211, width: 384, height: 18, rx: 9, fill: BLUE, stroke: INK, "stroke-width": 3 }, S2);
      const cards = [["notes", LIL, 320, 0.3, 1.2, 345, -8, 6], ["README", MINT, 480, 0.7, 1.6, 455, 7, -5], [".env", YEL, 400, 1.8, null, 400, 5, 3]].map(([name, col, x, fall, pass, bx, r0, r1]) => {
        const g = el("g", {}, layer);
        el("path", { d: "M-52 -34 H34 L52 -16 V34 H-52 Z", fill: col, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("path", { d: "M34 -34 V-16 H52", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        txt(g, -4, 10, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return { g, x, fall, pass, bx, r0, r1 };
      });
      el("path", { d: "M240 456 H560 Q556 570 400 570 Q244 570 240 456 Z", fill: SKY, stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 228, y: 448, width: 344, height: 16, rx: 8, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      let shakeAt = -99;
      button(G, "Tap the strainer: it shakes and the .env card still stays", () => { shakeAt = api.now(); api.poke(); });
      return (t, now) => {
        const s = now - shakeAt, sh = shakeAt > 0 && s < 1, dx = sh ? Math.sin(s * 34) * 13 * (1 - s) : 0;
        const shake = `translate(${dx} 0) rotate(${dx * 0.25} 400 300)`;
        S1.setAttribute("transform", shake); S2.setAttribute("transform", shake);
        const fade = 1 - seg(t, 8.4, 8.9);
        cards.forEach((c, i) => {
          const k = seg(t, c.fall, c.fall + 0.7), b = Math.sin(seg(t, c.fall + 0.7, c.fall + 1.0) * Math.PI) * 12;
          let x = c.x, y = -60 + 364 * k * k - b, r = c.r0 * (1 - k) + c.r1 * k;
          const p = c.pass == null ? 0 : io(seg(t, c.pass, c.pass + 0.8)), inside = c.pass == null || t < c.pass;
          if (p > 0) { x = c.x + (c.bx - c.x) * p; y = 304 + (432 - 304) * p; r = c.r1 * (1 - 2 * p); }
          if (c.pass == null) { y += Math.sin(seg(t, 2.6, 3.1) * Math.PI) * 8; if (sh) { y -= Math.abs(Math.sin(s * 17)) * 10 * (1 - s); r += Math.sin(s * 30) * 6 * (1 - s); } }
          c.g.setAttribute("transform", `${inside ? shake : ""} translate(${x} ${y}) rotate(${r})`);
          c.g.setAttribute("opacity", fade);
        });
        pop(words, 400, 180, ob(seg(t, 3.0, 3.5))); words.setAttribute("opacity", cl(seg(t, 3.0, 3.2)) * fade);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 2.2, still: 2.2,
    build(svg) {
      el("rect", { x: 64, y: 64, width: 104, height: 38, rx: 19, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 116, 90, "Guide", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 64, 200, "Claude Code", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 284, "privacy", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 314 H326", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 376, "Your email address, saved rules and secrets", { "font-size": 23, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 470, "Checked 9 Nov 2026", { "font-size": 18, "font-weight": 600, fill: MUTE });
      const cards = [["2.1.317", SKY, -3], ["settings.local.json", YEL, 2], ["Read(./.env)", MINT, -2]].map(([s, c, r], i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -150, y: -34, width: 300, height: 68, rx: 16, fill: c, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, 8, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        return { g, r, y: 132 + i * 96 };
      });
      let done = false;
      return (t) => {
        if (t >= 1.9) done = true;
        const u = done ? 2.2 : t;
        cards.forEach((c, i) => { const k = oc(seg(u, 0.3 + i * 0.45, 0.9 + i * 0.45)); tf(c.g, 775 + 240 * (1 - k), c.y, 1, c.r * k + 8 * (1 - k)); c.g.setAttribute("opacity", k); });
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
