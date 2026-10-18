/* Bright coded scenes for "What Is ZeroClaw?". Vanilla JS, no library.
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
  const SW = 6; /* one stroke width for every outline */
  const ring = (g, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": SW, class: "mg-ring" }, g);
  /* a four point sparkle, centred on 0,0 */
  const star = (p, r, fill) => el("path", { d: `M0 ${-r} Q${r * 0.2} ${-r * 0.2} ${r} 0 Q${r * 0.2} ${r * 0.2} 0 ${r} Q${-r * 0.2} ${r * 0.2} ${-r} 0 Q${-r * 0.2} ${-r * 0.2} 0 ${-r} Z`, fill, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, p);

  const SC = {};
  const cable = (p, d, col = INK) => el("path", { d, fill: "none", stroke: col, "stroke-width": SW, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 }, p);
  const hexd = (cx, cy, r) => { let d = ""; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + (i * Math.PI) / 3; d += `${i ? "L" : "M"}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)} `; } return d + "Z"; };
  const tile = (p, x, y, w, h, label, size = 32) => {
    const g = el("g", {}, p);
    const r = el("rect", { x, y, width: w, height: h, rx: h / 2, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
    txt(g, x + w / 2, y + h / 2 + size * 0.36, label, { "text-anchor": "middle", "font-size": size, "font-weight": 700 });
    return r;
  };
  const chip = (p, x, y, w, label, aria, fn) => {
    const g = el("g", {}, p);
    ring(g, x - 9, y - 9, w + 18, 114, 57);
    const r = el("rect", { x, y, width: w, height: 96, rx: 48, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
    txt(g, x + w / 2, y + 60, label, { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
    button(g, aria, fn);
    return r;
  };

  /* ---- 1. one binary in the middle wires out to providers, channels and tools; tap the hexagon to replay ---- */
  SC.hub = {
    w: 1600, h: 1200, dur: 10, still: 7.5,
    build(svg, api) {
      txt(svg, 80, 124, "What is ZeroClaw?", { "font-size": 52, "font-weight": 700 });
      txt(svg, 80, 184, "One Rust binary between a model, your channels and your tools", { "font-size": 32, "font-weight": 500, fill: MUTE });
      const H = [800, 560];
      const G = [
        ["providers", 240, 380, BLUE, [["Anthropic", 90, 410], ["OpenAI", 90, 530], ["Ollama", 90, 650]]],
        ["channels", 1360, 380, SKY, [["Discord", 1210, 410], ["Telegram", 1210, 530], ["Email", 1210, 650]]],
        ["tools", 200, 966, MINT, [["Shell", 300, 910], ["Browser", 650, 910], ["MCP servers", 1000, 910]]],
      ];
      const groups = G.map(([name, lx, ly, col, items]) => {
        txt(svg, lx, ly, name, { "text-anchor": "middle", "font-size": 30, "font-weight": 700, fill: MUTE });
        const lines = items.map(([, x, y]) => {
          const end = name === "providers" ? [x + 300, y + 45] : name === "channels" ? [x, y + 45] : [x + 150, y];
          const mid = name === "tools" ? [end[0], H[1] + 120] : [(H[0] + end[0]) / 2, end[1]];
          return cable(svg, `M${H[0]} ${H[1]} Q${mid[0]} ${mid[1]} ${end[0]} ${end[1]}`);
        });
        const tiles = items.map(([label, x, y]) => tile(svg, x, y, 300, 90, label));
        return { lines, tiles, col };
      });
      const hx = el("g", {}, svg);
      ring(hx, 640, 400, 320, 320, 160);
      el("path", { d: hexd(H[0] + 12, H[1] + 12, 150), fill: SOFT }, hx);
      el("path", { d: hexd(H[0], H[1], 150), fill: YEL, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, hx);
      txt(hx, H[0], H[1] + 16, "ZeroClaw", { "text-anchor": "middle", "font-size": 46, "font-weight": 700 });
      button(hx, "ZeroClaw: replay the connections", () => api.seek(0.3));
      txt(svg, 800, 1130, "From ZeroClaw's README, 17 Oct 2026", { "text-anchor": "middle", "font-size": 30, "font-weight": 500, fill: MUTE });
      return (t) => {
        const out = 1 - io(seg(t, 9.3, 9.9));
        groups.forEach((g, i) => {
          const a = 0.6 + i * 1.6, k = oc(seg(t, a, a + 1)) * out, lit = t > a + 1 && out > 0.5;
          g.lines.forEach((l) => l.setAttribute("stroke-dashoffset", 1 - k));
          g.tiles.forEach((r) => r.setAttribute("fill", lit ? g.col : "#fff"));
        });
      };
    },
  };

  /* ---- 2. three action cards meet the supervised gate; a button approves the waiting card ---- */
  SC.gate = {
    w: 1600, h: 1200, dur: 10, still: 6,
    build(svg, api) {
      txt(svg, 80, 124, "How does ZeroClaw keep the agent in check?", { "font-size": 48, "font-weight": 700 });
      txt(svg, 80, 184, "The default autonomy level is supervised", { "font-size": 32, "font-weight": 500, fill: MUTE });
      let ok = false;
      const ap = chip(svg, 1150, 1040, 370, "Approve", "Approve the medium risk action", () => { ok = true; api.seek(2.6); });
      const LANES = [["low risk", 380, MINT], ["medium risk", 600, YEL], ["high risk", 820, LIL]];
      LANES.forEach(([, y]) => el("path", { d: `M80 ${y + 55} H1520`, stroke: SOFT, "stroke-width": 14, "stroke-linecap": "round" }, svg));
      /* the gate column */
      el("path", { d: "M900 330 V950", stroke: INK, "stroke-width": SW + 4, "stroke-linecap": "round" }, svg);
      const sign = el("g", {}, svg);
      el("rect", { x: 930, y: 560, width: 300, height: 90, rx: 20, fill: YEL, stroke: INK, "stroke-width": SW }, sign);
      txt(sign, 1080, 600, "needs your", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      txt(sign, 1080, 636, "approval", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const bar = el("g", {}, svg);
      el("rect", { x: 880, y: 790, width: 40, height: 170, rx: 12, fill: LIL, stroke: INK, "stroke-width": SW }, bar);
      el("rect", { x: 930, y: 830, width: 300, height: 90, rx: 20, fill: "#fff", stroke: INK, "stroke-width": SW }, bar);
      txt(bar, 1080, 888, "blocked", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
      const runs = txt(svg, 1420, 448, "runs", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
      const cards = LANES.map(([label, y, col]) => {
        const g = el("g", {}, svg);
        el("rect", { x: 0, y: 0, width: 280, height: 110, rx: 24, fill: col, stroke: INK, "stroke-width": SW }, g);
        txt(g, 140, 68, label, { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
        return { g, y };
      });
      txt(svg, 80, 1100, "From ZeroClaw's README, 17 Oct 2026", { "font-size": 30, "font-weight": 500, fill: MUTE });
      return (t) => {
        const out = 1 - io(seg(t, 9.3, 9.9));
        const k0 = io(seg(t, 0.6, 3.2)), x0 = lerp(80, 1000, k0);
        tf(cards[0].g, x0, cards[0].y); cards[0].g.setAttribute("opacity", out);
        runs.setAttribute("opacity", k0 >= 1 ? out : 0);
        const k1 = io(seg(t, 0.9, 2.4)), k1b = ok ? io(seg(t, 3, 4.6)) : 0;
        tf(cards[1].g, lerp(80, 580, k1) + k1b * 620, cards[1].y); cards[1].g.setAttribute("opacity", out);
        sign.setAttribute("opacity", k1b > 0.3 ? 0.25 : 1);
        const k2 = io(seg(t, 1.2, 2.7)), bump = Math.sin(Math.PI * seg(t, 2.7, 3.1)) * 14;
        tf(cards[2].g, lerp(80, 580, k2) - bump, cards[2].y); cards[2].g.setAttribute("opacity", out);
        ap.setAttribute("fill", ok ? MINT : "#fff"); ap.parentNode.setAttribute("aria-pressed", ok);
      };
    },
  };

  /* ---- 3. a terminal runs the quick start; the service light turns on; a button restarts it ---- */
  SC.service = {
    w: 1600, h: 1200, dur: 10, still: 8,
    build(svg, api) {
      txt(svg, 80, 124, "How do you install ZeroClaw?", { "font-size": 52, "font-weight": 700 });
      const again = chip(svg, 1150, 90, 370, "Restart", "Run the quick start again", () => api.seek(0.3));
      el("rect", { x: 92, y: 322, width: 800, height: 500, rx: 30, fill: SOFT }, svg);
      el("rect", { x: 80, y: 310, width: 800, height: 500, rx: 30, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
      el("path", { d: "M80 380 H880", stroke: INK, "stroke-width": SW }, svg);
      [124, 164, 204].forEach((x, i) => el("circle", { cx: x, cy: 345, r: 12, fill: [YEL, SKY, MINT][i], stroke: INK, "stroke-width": 4 }, svg));
      const L = ["$ zeroclaw quickstart", "$ zeroclaw service install", "$ zeroclaw service start"].map((s, i) => ({ s, n: txt(svg, 120, 470 + i * 90, "", { "font-family": MONO, "font-size": 34, "font-weight": 700 }) }));
      const caret = el("rect", { width: 20, height: 40, fill: BLUE }, svg);
      el("rect", { x: 1022, y: 402, width: 480, height: 340, rx: 30, fill: SOFT }, svg);
      const box = el("rect", { x: 1010, y: 390, width: 480, height: 340, rx: 30, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
      txt(svg, 1250, 470, "zeroclaw service", { "text-anchor": "middle", "font-size": 34, "font-weight": 700, "font-family": MONO });
      const led = el("circle", { cx: 1250, cy: 580, r: 48, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
      const st = txt(svg, 1250, 690, "", { "text-anchor": "middle", "font-size": 38, "font-weight": 700 });
      txt(svg, 800, 1000, "Quickstart picks a provider and writes a working config", { "text-anchor": "middle", "font-size": 30, "font-weight": 500, fill: MUTE });
      txt(svg, 800, 1050, "From ZeroClaw's README, 17 Oct 2026", { "text-anchor": "middle", "font-size": 30, "font-weight": 500, fill: MUTE });
      return (t) => {
        const out = 1 - io(seg(t, 9.3, 9.9));
        let cx = 120, cy = 470;
        L.forEach((l, i) => {
          const a = 0.4 + i * 1.6, n = Math.round(seg(t, a, a + 1.1) * l.s.length);
          l.n.textContent = out > 0.5 ? l.s.slice(0, n) : "";
          if (t > a) { cx = 120 + n * 20.5; cy = 470 + i * 90; }
        });
        tf(caret, cx + 4, cy - 32); caret.setAttribute("opacity", Math.floor(t * 2.5) % 2 && out > 0.5 ? 1 : 0.15);
        const on = t > 5.4 && out > 0.5, k = ob(seg(t, 5.4, 6));
        led.setAttribute("fill", on ? MINT : "#fff"); led.setAttribute("r", on ? 48 + 8 * Math.sin(Math.PI * seg(t, 5.4, 6)) : 48);
        box.setAttribute("fill", on && k > 0.9 ? "#fff" : "#fff");
        st.textContent = on ? "always on" : "stopped"; st.setAttribute("fill", on ? INK : MUTE);
        again.setAttribute("fill", t < 0.8 ? YEL : "#fff");
      };
    },
  };

  /* ---- title card: the hexagon with three spokes ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6, still: 4,
    build(svg) {
      txt(svg, 100, 160, "What is ZeroClaw?", { "font-size": 68, "font-weight": 700 });
      txt(svg, 100, 224, "One Rust binary for models, channels and tools", { "font-size": 32, "font-weight": 500, fill: MUTE });
      const H = [560, 560];
      const S = [["models", 1000, 340, BLUE], ["channels", 1100, 560, SKY], ["tools", 1000, 780, MINT]];
      const cs = S.map(([, x, y]) => cable(svg, `M${H[0]} ${H[1]} Q${(H[0] + x) / 2 + 60} ${y} ${x} ${y}`));
      const ts = S.map(([label, x, y, col]) => {
        const g = el("g", {}, svg);
        el("rect", { x, y: y - 50, width: 320, height: 100, rx: 50, fill: col, stroke: INK, "stroke-width": SW }, g);
        txt(g, x + 160, y + 14, label, { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
        return g;
      });
      el("path", { d: hexd(H[0] + 12, H[1] + 12, 150), fill: SOFT }, svg);
      const hx = el("path", { d: hexd(H[0], H[1], 150), fill: YEL, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, svg);
      txt(svg, H[0], H[1] + 16, "ZeroClaw", { "text-anchor": "middle", "font-size": 46, "font-weight": 700 });
      return (t) => {
        const out = 1 - io(seg(t, 5.4, 5.9));
        cs.forEach((c, i) => c.setAttribute("stroke-dashoffset", 1 - oc(seg(t, 0.6 + i * 0.4, 1.6 + i * 0.4)) * out));
        ts.forEach((g, i) => g.setAttribute("opacity", seg(t, 1.4 + i * 0.4, 1.7 + i * 0.4) * out > 0.02 ? 1 : 0));
        hx.setAttribute("stroke-width", SW);
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
