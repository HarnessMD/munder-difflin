/* Bright coded scene for "Agent Tools Today, 8 Oct 2026". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const bo = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
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

  const SC = {};

  /* ---- the day at a glance: a long toaster pops five slices, each drops into the toast rack standing on it, and its name is toasted on ---- */
  const LAUNCH = [
    [["Claude", "Haiku 5.5"], "Anthropic says around 75% less to run than Haiku 4.5 on average", YEL],
    [["GPT-6 and", "Intelligent UI"], "Intelligent UI: answers with tappable buttons, forms and charts", BLUE],
    [["Docker", "Agent"], "Define agents in a YAML file, run them with docker agent run", LIL],
    [["Claude Code", "v2.1.293"], "Claude Haiku 5.5 is the default Haiku model on the Anthropic API", SKY],
    [["Codex CLI", "0.161.0"], "/mcp login <name> signs in to an MCP server from a running session", MINT],
  ];
  const SLICE = "M-58 146 Q-62 146 -62 142 V48 C-72 36 -68 7 -44 4 C-30 -3 -12 -3 0 3 C12 -3 30 -3 44 4 C68 7 72 36 62 48 V142 Q62 146 58 146 Z";
  SC.today = {
    dur: 12, still: 9.5,
    build(svg, api) {
      const X0 = 112, PX = 144, REST = 162, APEX = 130, HID = 352, TOP = 384, GAP = 1.5;
      const cx = (i) => X0 + i * PX;
      txt(svg, 756, 76, "Top 5 launches", { "text-anchor": "end", "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 108, "tap a slice", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const tip = strip(svg, 522, 720);
      const slices = el("g", {}, svg), front = el("g", {}, svg);
      // the rack: posts between the slices, a base plate with the numbers, two legs down to the toaster
      for (let k = 0; k <= 5; k++) el("path", { d: `M${40 + k * PX} 304 V214`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, front);
      [184, 616].forEach((x) => el("path", { d: `M${x} 336 V${TOP}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, front));
      el("rect", { x: 30, y: 302, width: 740, height: 34, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, front);
      // the toaster
      [84, 686].forEach((x) => el("rect", { x, y: 494, width: 30, height: 13, rx: 4, fill: INK }, front));
      el("rect", { x: 34, y: TOP, width: 732, height: 116, rx: 24, fill: SKY, stroke: INK, "stroke-width": 3 }, front);
      el("path", { d: "M100 474 H700", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, front);
      el("rect", { x: 368, y: 466, width: 64, height: 16, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, front);
      el("circle", { cx: 64, cy: 440, r: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, front);
      el("path", { d: "M64 440 L71 432", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, front);
      el("rect", { x: 736, y: 408, width: 8, height: 70, rx: 4, fill: INK }, front);
      const knob = el("rect", { x: 726, y: -8, width: 28, height: 16, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, front);
      let pinned = -1;
      const ps = LAUNCH.map(([lines, line, col], i) => {
        const x = cx(i);
        el("rect", { x: x - 62, y: TOP - 5, width: 124, height: 10, rx: 5, fill: INK }, front);
        const light = el("circle", { cx: x, cy: 420, r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, front);
        el("circle", { cx: x, cy: 319, r: 12, fill: col, stroke: INK, "stroke-width": 3 }, front);
        txt(front, x, 325, String(i + 1), { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
        const g = el("g", { opacity: 0 }, slices);
        el("rect", { x: -69, y: -7, width: 138, height: 156, rx: 14, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("path", { d: SLICE, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const lab = el("g", { opacity: 0 }, g);
        lines.forEach((s, k) => txt(lab, 0, 88 + k * 24, s, { "text-anchor": "middle", "font-size": 18, "font-weight": 600 }));
        button(g, `${lines.join(" ")}: ${line}`, () => { pinned = i; api.poke(); });
        return { g, lab, light, x, T: 0.5 + i * GAP };
      });
      return (t) => {
        let last = -1, ky = 470;
        const gone = 1 - seg(t, 11.3, 11.9);
        ps.forEach((p, i) => {
          const s = t - p.T;
          p.light.setAttribute("fill", s >= 0 && gone >= 1 ? YEL : "#fff");
          if (s < 0) { p.g.setAttribute("opacity", 0); return; }
          const up = seg(s, 0, 0.42);
          const y = s < 0.42 ? HID + (APEX - HID) * oc(up) : APEX + (REST - APEX) * bo(seg(s, 0.42, 0.95));
          const lift = pinned === i && s >= 0.95 ? -12 : 0;
          p.g.setAttribute("transform", `translate(${p.x} ${y + lift}) rotate(${Math.sin(up * Math.PI) * (i % 2 ? 3 : -3)} 0 73)`);
          p.g.setAttribute("opacity", gone);
          p.lab.setAttribute("opacity", seg(s, 0.95, 1.4));
          ky = 470 - 46 * oc(seg(s, 0, 0.1)) + (i < 4 ? 46 * io(seg(s, 0.65, 1.25)) : 0);
          if (s >= 0.95) last = i;
        });
        knob.setAttribute("transform", `translate(0 ${gone < 1 ? 470 : ky})`);
        const show = pinned >= 0 ? pinned : last;
        tip.textContent = show < 0 || (pinned < 0 && gone < 1) ? "five launches, in the order of the list below" : LAUNCH[show][1];
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('600 18px "Space Grotesk"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
