/* Bright coded scenes for "What is Kimi K3.1 Pro". Vanilla JS, no library.
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
  const strip = (svg, y, w = 680) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    return txt(svg, 400, y + 31, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
  };

  /* one high jump standard: two posts and a crossbar that rides up them; returns a setter for the bar's y */
  const standard = (p, cx, base, top, half, col, post = 4) => {
    const g = el("g", {}, p);
    [-half + 4, half - 4].forEach((dx) => {
      el("path", { d: `M${cx + dx} ${base} V${top}`, stroke: INK, "stroke-width": post, "stroke-linecap": "round" }, g);
      el("path", { d: `M${cx + dx - 9} ${base} H${cx + dx + 9}`, stroke: INK, "stroke-width": post, "stroke-linecap": "round" }, g);
    });
    const bar = el("rect", { x: cx - half, width: half * 2, height: 12, rx: 6, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
    return { g, set: (y) => bar.setAttribute("y", y - 6) };
  };

  const SC = {};

  /* ---- 1. three high jump bars on the Terminal-Bench 4.0 scale ---- */
  SC.highjump = {
    dur: 8, still: 8,
    build(svg, api) {
      const BASE = 470, Y = (v) => BASE - (v - 55) * 21.33;
      txt(svg, 44, 70, "Terminal-Bench 4.0", { "font-size": 32, "font-weight": 700 });
      [55, 60, 65, 70].forEach((v) => {
        el("path", { d: `M120 ${Y(v)} H740`, stroke: SOFT, "stroke-width": 2 }, svg);
        txt(svg, 100, Y(v) + 6, String(v), { "text-anchor": "end", "font-family": MONO, "font-size": 16, "font-weight": 500, fill: MUTE });
      });
      el("rect", { x: 150, y: BASE, width: 590, height: 14, rx: 7, fill: SOFT }, svg);
      const DATA = [["GPT-6 Astra", 58.2, SKY, 260], ["Kimi K3.1 Pro", 65.7, YEL, 450], ["Claude Opus 5.5", 66.4, LIL, 640]];
      let pinned = -1;
      const src = el("g", { opacity: 0 }, svg), srcText = strip(src, 530, 360); srcText.textContent = "Kimi's launch post";
      const bars = DATA.map(([name, v, col, cx], i) => {
        const g = el("g", {}, svg);
        el("rect", { x: cx - 80, y: 120, width: 160, height: 410, rx: 14, fill: "#fff", "fill-opacity": 0 }, g);
        el("rect", { x: cx - 84, y: 116, width: 168, height: 412, rx: 16, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        const s = standard(g, cx, BASE, Y(70) - 8, 66, col);
        const val = txt(g, cx, 0, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        txt(g, cx, BASE + 42, name, { "text-anchor": "middle", "font-size": 21 });
        button(g, `${name}: ${v}. Source: Kimi's launch post`, () => { pinned = i; api.poke(); });
        return { s, val, v, d: 0.4 + i * 0.5 };
      });
      const rx = 545, rTop = Y(66.4), rBot = Y(65.7);
      const ruler = el("g", {}, svg);
      el("path", { d: `M516 ${rBot} H${rx + 14} M${rx - 14} ${rTop} H574`, stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "3 4" }, ruler);
      el("path", { d: `M${rx} ${rTop} V${rBot} M${rx - 8} ${rTop} H${rx + 8} M${rx - 8} ${rBot} H${rx + 8} M${rx} ${rTop} V134`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, ruler);
      el("rect", { x: rx - 62, y: 100, width: 124, height: 34, rx: 17, fill: MINT, stroke: INK, "stroke-width": 2.5 }, ruler);
      txt(ruler, rx, 123, "0.7 points", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      return (t) => {
        bars.forEach((b) => {
          const k = oc(seg(t, b.d, b.d + 1.3)), y = Y(55) + (Y(b.v) - Y(55)) * k;
          b.s.set(y); b.val.setAttribute("y", y - 20);
          b.val.textContent = (55 + (b.v - 55) * k).toFixed(1);
          b.val.setAttribute("opacity", seg(t, b.d, b.d + 0.3));
        });
        const r = oc(seg(t, 3.2, 4.1));
        ruler.setAttribute("opacity", r); ruler.setAttribute("transform", `translate(${90 * (1 - r)} 0)`);
        src.setAttribute("opacity", pinned >= 0 ? 1 : 0);
      };
    },
  };

  /* ---- 2. a parcel tracking line with three stops ---- */
  SC.route = {
    dur: 8, still: 8,
    build(svg, api) {
      const all = el("g", {}, svg);
      el("rect", { x: 0, y: 0, width: 800, height: 600, fill: "#fff", "fill-opacity": 0 }, all);
      el("rect", { x: 10, y: 10, width: 780, height: 580, rx: 16, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, all);
      const LY = 350, X = [140, 400, 660];
      const STOPS = [["Launched 23 Oct", true], ["API and apps today", true], ["Weights by 4 Nov", false]];
      el("path", { d: `M${X[0]} ${LY} H${X[2]}`, stroke: SOFT, "stroke-width": 18, "stroke-linecap": "round" }, all);
      el("path", { d: `M${X[0]} ${LY} H${X[2]}`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 12", "stroke-linecap": "round" }, all);
      const done = el("path", { d: "", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, all);
      const wait = el("circle", { cx: X[2], cy: LY, r: 34, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6" }, all);
      const stops = STOPS.map(([label, tick], i) => {
        const g = el("g", {}, all), c = el("circle", { cx: X[i], cy: LY, r: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const mark = tick ? el("path", { d: `M${X[i] - 10} ${LY} l7 7 l13 -14`, stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g) : null;
        txt(g, X[i], LY + 66, label, { "text-anchor": "middle", "font-size": 22 });
        return { c, mark, tick };
      });
      const parcel = el("g", {}, all);
      el("rect", { x: -82, y: -112, width: 164, height: 92, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, parcel);
      el("path", { d: "M-82 -86 H82", stroke: INK, "stroke-width": 2.5 }, parcel);
      el("rect", { x: -70, y: -74, width: 140, height: 40, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, parcel);
      txt(parcel, 0, -48, "Kimi K3.1 Pro", { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
      el("path", { d: "M-20 -20 L0 -4 L20 -20", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round" }, parcel);
      button(all, "Replay the parcel route", () => api.seek(0.01));
      const legs = [[1.4, 2.8], [3.8, 5.4]], arrive = [0.6, 2.8, 5.4];
      return (t) => {
        const a = io(seg(t, legs[0][0], legs[0][1])), b = io(seg(t, legs[1][0], legs[1][1]));
        const x = X[0] + (X[1] - X[0]) * a + (X[2] - X[1]) * b, moving = (a > 0 && a < 1) || (b > 0 && b < 1);
        const drop = oc(seg(t, 0.2, 0.7));
        tf(parcel, x, LY - 32 - 60 * (1 - drop) - (moving ? Math.abs(Math.sin(t * 9)) * 6 : 0));
        parcel.setAttribute("opacity", drop);
        done.setAttribute("d", `M${X[0]} ${LY} H${x}`);
        stops.forEach((s, i) => {
          const k = ob(seg(t, arrive[i], arrive[i] + 0.4)), on = t >= arrive[i];
          if (s.tick) { s.c.setAttribute("fill", on ? MINT : "#fff"); s.mark.setAttribute("opacity", on ? 1 : 0); s.mark.setAttribute("transform", `translate(${X[i]} ${LY}) scale(${0.4 + 0.6 * cl(k, 0, 1.2)}) translate(${-X[i]} ${-LY})`); }
        });
        const w = seg(t, 5.4, 6.0), pulse = 1 + 0.08 * Math.sin((t - 5.4) * 4) * (t > 6 ? 1 : w);
        wait.setAttribute("opacity", w); wait.setAttribute("transform", `translate(${X[2]} ${LY}) scale(${pulse}) translate(${-X[2]} ${-LY})`);
      };
    },
  };

  /* ---- 3. three plugs slide into a power strip ---- */
  SC.plugs = {
    dur: 8, still: 8,
    build(svg, api) {
      const SY = 360, X = [210, 400, 590];
      const P = [["Kimi Code", "model picker", BLUE, "Kimi Code: /model"], ["Codex", "config.toml", LIL, "Codex: api.moonshot.ai/v1"], ["Claude Code", "settings.json", SKY, "Claude Code: api.moonshot.ai/anthropic"]];
      const body = el("rect", { x: 90, y: SY, width: 620, height: 96, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, SY + 80, "Kimi API", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const lights = X.map((x) => {
        el("rect", { x: x - 34, y: SY + 14, width: 68, height: 34, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
        el("path", { d: `M${x - 12} ${SY + 22} V${SY + 40} M${x + 12} ${SY + 22} V${SY + 40}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
        return el("circle", { cx: x + 54, cy: SY + 31, r: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      });
      const out = el("g", { opacity: 0 }, svg), outText = strip(out, 512, 600);
      outText.setAttribute("font-family", MONO); outText.setAttribute("font-size", 19);
      let pinned = -1;
      const plugs = P.map(([name, tag, col, ep], i) => {
        const g = el("g", {}, svg), x = X[i];
        el("path", { d: `M${x} -20 C${x} 60 ${x + (i - 1) * 30} 90 ${x} 160 V240`, stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, g);
        el("rect", { x: x - 86, y: 150, width: 172, height: 206, rx: 18, fill: "#fff", "fill-opacity": 0 }, g);
        el("rect", { x: x - 90, y: 146, width: 180, height: 214, rx: 20, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("rect", { x: x - 66, y: 166, width: 132, height: 34, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        txt(g, x, 189, tag, { "text-anchor": "middle", "font-family": MONO, "font-size": 15, "font-weight": 500 });
        el("path", { d: `M${x - 12} ${SY - 34} V${SY + 30} M${x + 12} ${SY - 34} V${SY + 30}`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, g);
        el("rect", { x: x - 80, y: 240, width: 160, height: 88, rx: 16, fill: col, stroke: INK, "stroke-width": 3 }, g);
        txt(g, x, 292, name, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        button(g, `${name}, ${tag}. Endpoint: ${ep}`, () => { pinned = i; api.poke(); });
        return { g, d: 0.5 + i * 1.3 };
      });
      return (t) => {
        let lit = 0;
        plugs.forEach((p, i) => {
          const k = ob(seg(t, p.d, p.d + 0.9)), on = t >= p.d + 0.75;
          p.g.setAttribute("transform", `translate(0 ${-330 * (1 - cl(k, 0, 1.1))})`);
          lights[i].setAttribute("fill", on ? MINT : "#fff"); if (on) lit++;
        });
        body.setAttribute("fill", lit === 3 && t >= 4.6 ? YEL : SOFT);
        out.setAttribute("opacity", pinned >= 0 ? 1 : 0);
        if (pinned >= 0) outText.textContent = P[pinned][3];
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 96, width: 132, height: 40, rx: 20, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 130, 123, "Concepts", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 64, 240, "Kimi K3.1 Pro", { "font-size": 80, "font-weight": 700 });
      el("path", { d: "M66 268 H500", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 330, "1M context, weights by 4 Nov", { "font-size": 28, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 466, "Checked 29 Oct 2026", { "font-family": MONO, "font-size": 18, "font-weight": 500, fill: MUTE });
      const BASE = 470, Y = (v) => BASE - (v - 50) * 16;
      el("rect", { x: 606, y: BASE, width: 328, height: 12, rx: 6, fill: SOFT }, svg);
      [[58.2, SKY, 660], [65.7, YEL, 770], [66.4, LIL, 880]].forEach(([v, col, cx]) => standard(svg, cx, BASE, Y(70) - 6, 38, col, 3.5).set(Y(v)));
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
