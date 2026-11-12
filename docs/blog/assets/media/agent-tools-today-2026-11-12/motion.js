/* Bright coded scenes for "Agent Tools Today, 12 Nov 2026". Vanilla JS, no library.
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
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  let uid = 0;
  const SC = {};

  /* ---- a periscope rises from its box and looks at the day's three lead items in turn ---- */
  SC.periscope = {
    dur: 10, still: 7,
    build(svg, api) {
      const NAMES = ["Emulator", "Decisions", "Maya"];
      const WIN = [[520, 120], [650, 300], [520, 480]], R = 84;
      const PX = 200, PY = 300, LOW = 230, TIP = 115;
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const clip = `mg-periscope-clip-${++uid}`;
      const AIM = WIN.map(([x, y]) => (Math.atan2(y - PY, x - PX) * 180) / Math.PI);
      const back = (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
      const arc = (r, a0, a1) => {
        const p = (a) => [(r * Math.cos((a * Math.PI) / 180)).toFixed(1), (r * Math.sin((a * Math.PI) / 180)).toFixed(1)];
        const [x0, y0] = p(a0), [x1, y1] = p(a1);
        return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`;
      };
      // the floor and the box's back flap, behind the periscope
      el("ellipse", { cx: 200, cy: 542, rx: 172, ry: 9, fill: SOFT }, svg);
      el("path", { d: "M86 440 L100 410 H300 L314 440 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      // a few sparkles in the open sky
      const STAR = "M0 -1 Q0.14 -0.14 1 0 Q0.14 0.14 0 1 Q-0.14 0.14 -1 0 Q-0.14 -0.14 0 -1 Z";
      const sparks = [[110, 130, 16, YEL], [334, 92, 12, SKY], [758, 96, 13, LIL], [748, 522, 12, MINT]].map(([x, y, s, c]) => {
        const g = el("g", {}, el("g", { transform: `translate(${x} ${y})` }, svg));
        el("path", { d: STAR, fill: c, stroke: INK, "stroke-width": 2.5 / s, "stroke-linejoin": "round", transform: `scale(${s})` }, g);
        return g;
      });
      // the dotted sightline from the lens, under the windows
      const sight = el("line", { stroke: SKY, "stroke-width": 5, "stroke-linecap": "round", "stroke-dasharray": "1 13", opacity: 0 }, svg);
      // three round mint windows, each a button
      let turn = () => {};
      const wins = NAMES.map((name, i) => {
        const g = el("g", { transform: `translate(${WIN[i][0]} ${WIN[i][1]})` }, svg);
        const glow = el("g", { opacity: 0 }, g);
        el("circle", { r: R + 16, fill: "none", stroke: YEL, "stroke-width": 5, "stroke-opacity": 0.45 }, glow);
        el("circle", { r: R + 8, fill: "none", stroke: YEL, "stroke-width": 9 }, glow);
        el("circle", { r: R, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
        const shine = el("path", { d: arc(R - 13, 215, 250), fill: "none", stroke: "#fff", "stroke-width": 6, "stroke-linecap": "round", opacity: 0.55 }, g);
        const label = el("g", {}, g);
        txt(label, 0, 9, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
        const date = el("g", { opacity: 0 }, g);
        el("rect", { x: -40, y: 12, width: 80, height: 28, rx: 14, fill: YEL, stroke: INK, "stroke-width": 2 }, date);
        txt(date, 0, 31.5, "11 Nov", { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        const hit = el("g", {}, g);
        el("circle", { r: R + 18, fill: "#fff", "fill-opacity": 0 }, hit);
        el("circle", { r: R + 24, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 7", class: "mg-ring" }, hit);
        button(hit, `Turn the periscope to ${name}`, () => turn(i));
        return { glow, shine, label, date };
      });
      // the periscope: tube, head and lens, clipped so it hides inside the box
      const defs = el("defs", {}, svg), cp = el("clipPath", { id: clip }, defs);
      el("rect", { x: 0, y: 0, width: 800, height: 530 }, cp);
      const scope = el("g", {}, el("g", { "clip-path": `url(#${clip})` }, svg));
      el("rect", { x: -20, y: 0, width: 40, height: 200, fill: BLUE, stroke: INK, "stroke-width": 3 }, scope);
      el("path", { d: "M-9 36 V60 M-9 100 V128", stroke: SKY, "stroke-width": 5, "stroke-linecap": "round" }, scope);
      el("rect", { x: -25, y: 72, width: 50, height: 16, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, scope);
      const head = el("g", {}, scope);
      el("rect", { x: -6, y: -22, width: 92, height: 44, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, head);
      el("path", { d: "M54 -12 H70", stroke: SKY, "stroke-width": 4, "stroke-linecap": "round" }, head);
      el("rect", { x: 34, y: -22, width: 12, height: 44, fill: YEL, stroke: INK, "stroke-width": 2.5 }, head);
      el("rect", { x: 78, y: -28, width: 28, height: 56, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, head);
      el("ellipse", { cx: 106, cy: 0, rx: 9, ry: 21, fill: SKY, stroke: INK, "stroke-width": 3 }, head);
      el("ellipse", { cx: 107, cy: -8, rx: 3, ry: 6, fill: "#fff" }, head);
      el("circle", { r: 26, fill: BLUE, stroke: INK, "stroke-width": 3 }, scope);
      el("circle", { r: 8, fill: SKY, stroke: INK, "stroke-width": 2.5 }, scope);
      // the box's front and side flaps, over the periscope's foot
      el("path", { d: "M70 440 L36 410 L48 398 L80 428 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M330 440 L364 410 L352 398 L320 428 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 70, y: 440, width: 260, height: 100, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 168, y: 474, width: 64, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      // the timeline: rise, face Emulator, Decisions and Maya in turn, swing back level, sink
      const timeline = (t) => ({
        u: t < 0.3 ? 0 : t < 8.5 ? back(seg(t, 0.3, 1.5)) : 1 - io(seg(t, 8.5, 9.4)),
        th: AIM[0] * io(seg(t, 1.9, 2.6)) + (AIM[1] - AIM[0]) * io(seg(t, 3.7, 4.4)) + (AIM[2] - AIM[1]) * io(seg(t, 5.5, 6.2)) - AIM[2] * io(seg(t, 7.6, 8.3)),
        lit: seg(t, 2.25, 2.6) * (1 - seg(t, 7.6, 7.8)),
        d: [0, 0, 0],
      });
      let user = null, last = timeline(0);
      const tapped = (now) => {
        const s = calm ? 99 : now - user.t0, { from: f, n } = user;
        return {
          u: f.u + (1 - f.u) * oc(seg(s, 0, 0.5)),
          th: f.th + (AIM[n] - f.th) * io(seg(s, 0.15, 0.85)),
          lit: f.lit + (1 - f.lit) * seg(s, 0, 0.3),
          d: f.d.map((d, i) => (i === n ? Math.max(d, oc(seg(s, 0.75, 1.1))) : d * (1 - seg(s, 0, 0.25)))),
        };
      };
      turn = (n) => {
        user = { from: { u: last.u, th: last.th, lit: last.lit, d: last.d.slice() }, n, t0: api.now() };
        api.poke();
      };
      return (t, now) => {
        const P = user ? tapped(now) : timeline(t); last = P;
        const tw = calm ? 7 : t, py = PY + LOW * (1 - P.u), up = seg(P.u, 0.85, 1);
        scope.setAttribute("transform", `translate(${PX} ${py})`);
        head.setAttribute("transform", `rotate(${P.th})`);
        let best = 0, top = 0;
        wins.forEach((w, i) => {
          const g = P.lit * up * oc(cl(1 - Math.abs(P.th - AIM[i]) / 14));
          if (g > top) { top = g; best = i; }
          w.glow.setAttribute("opacity", g);
          w.shine.setAttribute("opacity", 0.55 + 0.45 * g);
          w.label.setAttribute("transform", `translate(0 ${-14 * P.d[i]})`);
          w.date.setAttribute("opacity", P.d[i]);
          w.date.setAttribute("transform", `translate(0 ${8 * (1 - P.d[i])})`);
        });
        const a = (P.th * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
        const far = Math.hypot(WIN[best][0] - PX, WIN[best][1] - py) - R - 22;
        sight.setAttribute("x1", PX + (TIP + 15) * c); sight.setAttribute("y1", py + (TIP + 15) * s);
        sight.setAttribute("x2", PX + far * c); sight.setAttribute("y2", py + far * s);
        sight.setAttribute("opacity", top);
        sight.setAttribute("stroke-dashoffset", -28 * tw);
        sparks.forEach((g, i) => g.setAttribute("transform", `scale(${0.8 + 0.2 * Math.sin(Math.PI * 2 * (tw * 6 / 10 + i * 0.27))})`));
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
