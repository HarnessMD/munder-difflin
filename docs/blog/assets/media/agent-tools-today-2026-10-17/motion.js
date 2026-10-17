/* Bright coded scenes for "Agent tools today, 17 Oct 2026". Vanilla JS, no library.
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
  let uid = 0;

  /* ---- four Mac Studio boxes joined by one cable, and a counter above them that rolls up to 36 tokens per second ---- */
  SC.today = {
    dur: 11, still: 8.4,
    build(svg, api) {
      const id = `mg17-${++uid}`;
      const defs = el("defs", {}, svg);
      txt(svg, 400, 72, "Muse Spark Open on four Mac Studios", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });

      /* the counter: a yellow case with two digit wheels behind windows */
      const CX = 400, CY = 112, CW = 300, CH = 168;
      const counter = el("g", {}, svg);
      el("rect", { x: CX - CW / 2, y: CY, width: CW, height: CH, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, counter);
      el("rect", { x: CX - CW / 2 + 12, y: CY + 12, width: CW - 24, height: CH - 24, rx: 18, fill: "none", stroke: INK, "stroke-width": 2 }, counter);
      const WW = 92, WH = 116, WY = CY + 26, DH = 116;
      const wheels = [CX - WW - 8, CX + 8].map((wx, i) => {
        const cid = `${id}-w${i}`;
        el("rect", { x: wx, y: WY, width: WW, height: WH, rx: 12 }, el("clipPath", { id: cid }, defs));
        el("rect", { x: wx, y: WY, width: WW, height: WH, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, counter);
        const win = el("g", { "clip-path": `url(#${cid})` }, counter);
        const col = el("g", {}, win);
        for (let d = 0; d <= 10; d++) txt(col, wx + WW / 2, WY + WH / 2 + 30 + d * DH, String(d % 10), { "text-anchor": "middle", "font-family": MONO, "font-size": 84, "font-weight": 700 });
        el("rect", { x: wx, y: WY, width: WW, height: 18, fill: SOFT, opacity: 0.8 }, win);
        el("rect", { x: wx, y: WY + WH - 18, width: WW, height: 18, fill: SOFT, opacity: 0.8 }, win);
        el("rect", { x: wx, y: WY, width: WW, height: WH, rx: 12, fill: "none", stroke: INK, "stroke-width": 3 }, counter);
        return col;
      });
      const label = txt(svg, CX, CY + CH + 40, "tokens per second", { "text-anchor": "middle", "font-size": 26, "font-weight": 600 });

      /* four boxes on a shelf line, joined by a cable that carries a pulse */
      const BX = [80, 250, 420, 590], BY = 404, BW = 130, BH = 104;
      el("path", { d: "M50 540 H750", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const cable = el("path", { d: `M${BX[0] + BW / 2} ${BY + BH - 6} C${BX[0] + BW / 2} 532 ${BX[3] + BW / 2} 532 ${BX[3] + BW / 2} ${BY + BH - 6}`, fill: "none", stroke: BLUE, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      const cableLen = 600;
      cable.setAttribute("stroke-dasharray", cableLen);
      const links = BX.slice(0, 3).map((x, i) => el("path", { d: `M${x + BW} ${BY + 40} H${BX[i + 1]}`, stroke: BLUE, "stroke-width": 5, "stroke-linecap": "round" }, svg));
      const pulse = el("circle", { r: 8, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);
      const boxes = BX.map((x, i) => {
        const g = el("g", {}, svg);
        el("rect", { x, y: BY, width: BW, height: BH, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: x + 10, y: BY + BH - 30, width: BW - 20, height: 4, rx: 2, fill: INK, opacity: 0.25 }, g);
        [0, 1].forEach((k) => el("rect", { x: x + 20 + k * 22, y: BY + 22, width: 12, height: 6, rx: 3, fill: INK }, g));
        const light = el("circle", { cx: x + BW - 24, cy: BY + 25, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, x + BW / 2, BY + BH + 66, "Mac Studio", { "text-anchor": "middle", "font-size": 20, "font-weight": 600, fill: MUTE });
        return { g, light, x, i };
      });
      const sparks = [[92, 150, YEL], [706, 160, MINT], [640, 98, LIL]].map(([x, y, c], i) => {
        const g = el("g", {}, svg);
        el("path", { d: "M0 -14 Q0 0 14 0 Q0 0 0 14 Q0 0 -14 0 Q0 0 0 -14 Z", fill: c, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        return { g, x, y, i };
      });

      let last = 0;
      button(counter, "Count the tokens per second again", () => { if (last > 2.8) api.seek(2.8); });
      return (t) => {
        last = t;
        const out = 1 - io(seg(t, 10.2, 10.8));
        boxes.forEach((b) => {
          const s = ob(seg(t, 0.2 + b.i * 0.18, 0.75 + b.i * 0.18));
          b.g.setAttribute("transform", `translate(0 ${(1 - cl(s, 0, 1.2)) * -60})`);
          b.g.setAttribute("opacity", cl(s * 3) * out);
          b.light.setAttribute("fill", t > 2.0 + b.i * 0.15 && t < 10.3 ? MINT : "#fff");
        });
        const draw = io(seg(t, 1.1, 2.0));
        cable.setAttribute("stroke-dashoffset", cableLen * (1 - draw));
        cable.setAttribute("opacity", out);
        links.forEach((l, i) => l.setAttribute("opacity", cl(seg(t, 1.2 + i * 0.15, 1.5 + i * 0.15)) * out));
        const pk = ((t - 2.2) % 1.6) / 1.6;
        if (t > 2.2 && t < 10.1) {
          const p = cable.getPointAtLength(cableLen * Math.min(pk, 0.999) * 0.98);
          pulse.setAttribute("cx", p.x); pulse.setAttribute("cy", p.y); pulse.setAttribute("opacity", Math.sin(Math.PI * pk));
        } else pulse.setAttribute("opacity", 0);
        const rise = ob(seg(t, 2.2, 2.8));
        counter.setAttribute("transform", `translate(${CX} ${CY + CH / 2}) scale(${cl(rise, 0, 1.15)}) translate(${-CX} ${-(CY + CH / 2)})`);
        counter.setAttribute("opacity", (rise > 0.01 ? 1 : 0) * out);
        label.setAttribute("opacity", cl(seg(t, 2.7, 3.1)) * out);
        const v = 36 * oc(seg(t, 2.9, 6.6));
        const ones = v - 10 * Math.floor(v / 10), tens = Math.floor(v / 10) + Math.max(0, ones - 9);
        wheels[0].setAttribute("transform", `translate(0 ${-tens * DH})`);
        wheels[1].setAttribute("transform", `translate(0 ${-ones * DH})`);
        sparks.forEach((w) => {
          const s = seg(t, 6.5 + w.i * 0.2, 6.9 + w.i * 0.2) * out;
          tf(w.g, w.x, w.y, ob(s) * (0.85 + 0.15 * Math.sin(t * 2.4 + w.i)), 14 * Math.sin(t + w.i));
          w.g.setAttribute("opacity", s <= 0 ? 0 : 1);
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
