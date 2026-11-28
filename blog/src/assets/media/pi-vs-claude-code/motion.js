/* Bright coded scenes for "Pi vs Claude Code". Vanilla JS, no library.
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
  /* an on/off switch that eases between states; under reduced motion it jumps */
  const toggle = (api, start = 0) => {
    const s = { from: start, to: start, at: -99, v: start, used: false };
    s.flip = (seed) => { s.from = s.used ? s.v : seed; s.to = s.from > 0.5 ? 0 : 1; s.at = api.now(); s.used = true; if (api.calm) api.redraw(); else api.poke(); };
    s.get = (now, dur = 0.6) => (s.v = api.calm ? s.to : s.from + (s.to - s.from) * oc(seg(now - s.at, 0, dur)));
    return s;
  };

  const SC = {};

  /* ---- 1. what comes in the box ---- */
  SC.box = {
    dur: 9, still: 7,
    build(svg, api) {
      const openBox = (x, w, flap, name) => {
        el("path", { d: `M${x} 150 L${x - 22} 98 H${x + w / 2 - 22} L${x + w / 2} 150 Z`, fill: flap, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
        el("path", { d: `M${x + w / 2} 150 L${x + w / 2 + 22} 98 H${x + w + 22} L${x + w} 150 Z`, fill: flap, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
        el("rect", { x, y: 150, width: w, height: 390, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, x + w / 2, 70, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 });
      };
      openBox(50, 310, YEL, "Claude Code");
      openBox(440, 310, LIL, "Pi");
      const card = (p, x, y, w, label, fill, mono) => {
        const g = el("g", {}, p);
        el("rect", { x, y, width: w, height: 54, rx: 12, fill, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, x + w / 2, y + 35, label, { "text-anchor": "middle", "font-size": 22, "font-weight": 700, "font-family": mono ? MONO : SANS });
        return g;
      };
      ["Read", "Write", "Edit", "Bash"].forEach((s, i) => card(svg, i % 2 ? 602 : 458, i < 2 ? 408 : 472, 130, s, SKY, true));
      const cc = ["Plan mode", "Subagents", "Permission modes", "Hooks", "MCP"].map((s, i) => ({ g: card(svg, 75, 472 - i * 64, 260, s, [SKY, MINT, YEL, BLUE, LIL][i]), d: 0.5 + i * 0.8 }));
      const slot = el("g", {}, svg);
      el("rect", { x: 457, y: 310, width: 276, height: 78, rx: 16, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, slot);
      const dash = el("rect", { x: 465, y: 318, width: 260, height: 62, rx: 12, fill: "#fff", stroke: MUTE, "stroke-width": 2.5, "stroke-dasharray": "9 7" }, slot);
      txt(slot, 595, 356, "Your extension", { "text-anchor": "middle", "font-size": 21, "font-weight": 600, fill: MUTE });
      const ext = el("g", {}, slot);
      el("rect", { x: 465, y: 318, width: 260, height: 62, rx: 12, fill: MINT, stroke: INK, "stroke-width": 2.5 }, ext);
      txt(ext, 595, 357, "Extension", { "text-anchor": "middle", "font-size": 23, "font-weight": 700 });
      const sw = toggle(api);
      button(slot, "Drop an extension card into the empty slot", () => sw.flip(0));
      return (t, now) => {
        const out = seg(t, 8.2, 8.9);
        cc.forEach(({ g, d }) => { const k = ob(seg(t, d, d + 0.55)); g.setAttribute("transform", `translate(0 ${-330 * (1 - k) - 40 * io(out)})`); g.setAttribute("opacity", seg(t, d, d + 0.1) * (1 - out)); });
        dash.setAttribute("stroke-dashoffset", -t * 14);
        const v = sw.get(now, 0.5);
        ext.setAttribute("opacity", cl(v * 3)); ext.setAttribute("transform", `translate(0 ${-200 * (1 - (api.calm ? v : ob(v)))})`);
      };
    },
  };

  /* ---- 2. one cable against a power strip ---- */
  SC.plugs = {
    dur: 10, still: 8,
    build(svg, api) {
      el("path", { d: "M400 60 V560", stroke: SOFT, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const nameCard = (x, label, fill) => { el("rect", { x, y: 66, width: 260, height: 74, rx: 16, fill, stroke: INK, "stroke-width": 3 }, svg); txt(svg, x + 130, 114, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 }); };
      nameCard(70, "Claude Code", YEL);
      nameCard(470, "Pi", LIL);
      /* left: one cable, one socket */
      const cable = el("path", { d: "M200 140 C200 230 130 260 200 348", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, svg);
      const L = cable.getTotalLength(); cable.setAttribute("stroke-dasharray", L);
      const plug = el("g", {}, svg);
      el("path", { d: "M-10 34 V48 M10 34 V48", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, plug);
      el("rect", { x: -28, y: 0, width: 56, height: 36, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, plug);
      const sock = el("rect", { x: 120, y: 384, width: 160, height: 64, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 200, 494, "Claude models", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      /* right: a strip of six sockets */
      el("path", { d: "M520 140 V176", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      const bar = el("g", {}, svg);
      el("rect", { x: 470, y: 166, width: 100, height: 358, rx: 22, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, bar);
      el("rect", { x: 480, y: 176, width: 80, height: 338, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, bar);
      const ys = [205, 261, 317, 373, 429, 485];
      const names = ["Anthropic", "OpenAI", "Google", "Mistral", "Ollama"], cols = [YEL, MINT, SKY, BLUE, LIL];
      const plugs = names.map((s, i) => {
        const g = el("g", {}, svg), c = ys[i];
        el("path", { d: `M546 ${c - 7} H566 M546 ${c + 7} H566`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g);
        el("rect", { x: 564, y: c - 17, width: 40, height: 34, rx: 8, fill: cols[i], stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M604 ${c} H616`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g);
        txt(g, 624, c + 7, s, { "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return { g, d: 1.8 + i * 0.75 };
      });
      const socks = ys.map((c) => { const r = el("rect", { x: 498, y: c - 18, width: 44, height: 36, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, bar); el("path", { d: `M510 ${c - 7} H530 M510 ${c + 7} H530`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, bar); return r; });
      svg.appendChild(bar);
      plugs.forEach((p) => svg.appendChild(p.g));
      const tag = el("g", {}, svg);
      el("rect", { x: 480, y: 538, width: 240, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 600, 565, "15 plus providers", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      button(bar, "Replay the plugs going into the strip", () => api.seek(1.8));
      return (t) => {
        const f = 1 - seg(t, 9.2, 9.9), k = io(seg(t, 0.3, 1.4)), pt = cable.getPointAtLength(L * k), seat = 4 * oc(seg(t, 1.4, 1.6));
        cable.setAttribute("stroke-dashoffset", L * (1 - k)); cable.setAttribute("opacity", f);
        tf(plug, pt.x, pt.y + seat); plug.setAttribute("opacity", seg(t, 0.3, 0.45) * f);
        sock.setAttribute("fill", t >= 1.5 && f > 0.5 ? MINT : "#fff");
        plugs.forEach((p, i) => {
          const m = oc(seg(t, p.d, p.d + 0.45)), click = Math.sin(seg(t, p.d + 0.45, p.d + 0.62) * Math.PI) * -5;
          tf(p.g, 150 * (1 - m) + click, 0); p.g.setAttribute("opacity", seg(t, p.d, p.d + 0.15) * f);
          socks[i].setAttribute("fill", t >= p.d + 0.5 && f > 0.5 ? MINT : "#fff");
        });
        const g = ob(seg(t, 5.7, 6.2));
        tag.setAttribute("transform", `translate(600 558) scale(${0.6 + 0.4 * g}) translate(-600 -558)`); tag.setAttribute("opacity", seg(t, 5.7, 5.85) * f);
      };
    },
  };

  /* ---- 3. a gate on one path, a sandbox around the other ---- */
  SC.gate = {
    dur: 9.6, still: 5.6,
    build(svg, api) {
      const top = "M60 190 H430 C530 190 540 270 640 270", bot = "M60 420 H430 C530 420 540 320 640 320";
      const box = el("g", {}, svg);
      el("rect", { x: 128, y: 364, width: 360, height: 124, rx: 20, fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "10 8" }, box);
      txt(box, 308, 476, "Container or sandbox", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      [top, bot].forEach((d) => el("path", { d, stroke: SOFT, "stroke-width": 44, fill: "none", "stroke-linecap": "round" }, svg));
      [top, bot].forEach((d) => el("path", { d, stroke: INK, "stroke-width": 2, fill: "none", "stroke-dasharray": "2 12", "stroke-linecap": "round" }, svg));
      txt(svg, 60, 150, "Claude Code", { "font-family": MONO, "font-size": 24, "font-weight": 700 });
      txt(svg, 60, 382, "Pi", { "font-family": MONO, "font-size": 24, "font-weight": 700 });
      const hit = el("g", {}, svg);
      el("rect", { x: 48, y: 354, width: 454, height: 144, rx: 24, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, hit);
      /* the gate, seen from above: a bar hinged on the top post */
      const G = [320, 164];
      el("path", { d: `M${G[0]} 134 V${G[1] - 7}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      const bar = el("g", {}, svg);
      el("rect", { x: -6, y: 0, width: 12, height: 54, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, bar);
      el("circle", { cx: G[0], cy: G[1], r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: G[0], cy: 220, r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const chip = el("g", {}, svg);
      el("rect", { x: G[0] - 60, y: 96, width: 120, height: 38, rx: 19, fill: YEL, stroke: INK, "stroke-width": 2.5 }, chip);
      const mode = txt(chip, G[0], 122, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      el("path", { d: "M640 248 Q640 236 652 236 H690 L702 250 H758 Q770 250 770 262 V340 Q770 352 758 352 H652 Q640 352 640 340 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      txt(svg, 705, 388, "Your repo", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const MODES = ["Manual", "Plan", "Auto"], OPEN = [30, 55, 85], P = 3.2;
      const auto = (t) => oc(seg(t, 1.0, 1.8)) - io(seg(t, 8.6, 9.4));
      const sw = toggle(api);
      let last = 0;
      button(hit, "Slide the sandbox box on or off the Pi path", () => sw.flip(last));
      return (t, now) => {
        const i = Math.floor(t / P) % 3, u = (t % P) / P;
        const a = OPEN[i] * ob(seg(u, 0.12, 0.4)) * (1 - io(seg(u, 0.82, 1)));
        tf(bar, G[0], G[1], 1, -a);
        mode.textContent = MODES[i];
        const pop = 1 + 0.12 * (1 - oc(seg(u, 0, 0.2)));
        chip.setAttribute("transform", `translate(${G[0]} 115) scale(${pop}) translate(${-G[0]} -115)`);
        const v = (last = sw.used ? sw.get(now) : auto(t));
        box.setAttribute("transform", `translate(${-440 * (1 - v)} 0)`); box.setAttribute("opacity", cl(v * 2));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 156, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 142, 70, "Comparisons", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      txt(svg, 62, 172, "Pi vs Claude Code", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 230, "Free harness or built in features?", { "font-size": 28, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 270, "Checked 27 Oct 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });
      const card = (x, label, fill) => { el("rect", { x, y: 318, width: 310, height: 160, rx: 22, fill, stroke: INK, "stroke-width": 3 }, svg); txt(svg, x + 155, 412, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 36, "font-weight": 700 }); };
      card(96, "Pi", LIL);
      card(554, "Claude Code", YEL);
      el("circle", { cx: 480, cy: 398, r: 36, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 480, 407, "vs", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
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
    const api = { now: clock, calm, redraw: () => frame(), seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
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
