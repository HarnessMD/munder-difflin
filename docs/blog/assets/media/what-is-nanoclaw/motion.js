/* Bright coded scenes for "What Is NanoClaw?". Vanilla JS, no library.
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
  const qp = (a, c, b, k) => [(1 - k) * (1 - k) * a[0] + 2 * (1 - k) * k * c[0] + k * k * b[0], (1 - k) * (1 - k) * a[1] + 2 * (1 - k) * k * c[1] + k * k * b[1]];
  const qd = (a, c, b) => `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`;
  const cable = (p, d, col = INK) => el("path", { d, fill: "none", stroke: col, "stroke-width": SW, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 }, p);
  /* a folder with a tab, top left at 0,0, drawn into its own group */
  const folder = (p, w, h, fill, label) => {
    const g = el("g", {}, p);
    el("path", { d: `M0 22 V${h} H${w} V22 Z`, fill: SOFT, transform: "translate(12 12)" }, g);
    el("path", { d: `M0 0 H${w * 0.4} L${w * 0.4 + 22} 22 H${w} V${h} H0 Z`, fill, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, g);
    txt(g, w / 2, h / 2 + 24, label, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
    return g;
  };
  const chip = (p, x, y, w, label, aria, fn) => {
    const g = el("g", {}, p);
    ring(g, x - 9, y - 9, w + 18, 114, 57);
    const r = el("rect", { x, y, width: w, height: 96, rx: 48, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
    txt(g, x + w / 2, y + 60, label, { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
    button(g, aria, fn);
    return r;
  };

  /* ---- 1. a container box; only the mounted folder goes in; a button toggles the mount ---- */
  SC.box = {
    w: 1600, h: 1200, dur: 10, still: 7,
    build(svg, api) {
      txt(svg, 80, 124, "What is NanoClaw?", { "font-size": 52, "font-weight": 700 });
      txt(svg, 80, 184, "Each agent group works inside its own container", { "font-size": 32, "font-weight": 500, fill: MUTE });
      let on = true;
      const tog = chip(svg, 1150, 90, 370, "Mount: on", "Toggle whether the folder is mounted into the container", () => { on = !on; tog.nextSibling.textContent = on ? "Mount: on" : "Mount: off"; api.seek(0.3); });
      /* the box: wall with a door gap on its left side */
      el("rect", { x: 712, y: 332, width: 800, height: 600, rx: 36, fill: SOFT }, svg);
      el("rect", { x: 700, y: 320, width: 800, height: 600, rx: 36, fill: "#fff" }, svg);
      el("path", { d: "M700 560 V356 Q700 320 736 320 H1464 Q1500 320 1500 356 V884 Q1500 920 1464 920 H736 Q700 920 700 884 V740", fill: "none", stroke: INK, "stroke-width": SW, "stroke-linecap": "round" }, svg);
      const door = el("path", { d: "M700 560 V740", stroke: INK, "stroke-width": SW, "stroke-linecap": "round" }, svg);
      txt(svg, 1100, 300, "container", { "text-anchor": "middle", "font-size": 34, "font-weight": 700, fill: MUTE });
      el("rect", { x: 950, y: 400, width: 300, height: 150, rx: 28, fill: YEL, stroke: INK, "stroke-width": SW }, svg);
      txt(svg, 1100, 488, "agent", { "text-anchor": "middle", "font-size": 44, "font-weight": 700 });
      const stay1 = folder(svg, 300, 170, "#fff", "not mounted"), stay2 = folder(svg, 300, 170, "#fff", "not mounted");
      tf(stay1, 120, 300); tf(stay2, 120, 760);
      const mf = folder(svg, 300, 170, SKY, "mounted");
      txt(svg, 800, 1110, "From NanoClaw's README, 17 Oct 2026", { "text-anchor": "middle", "font-size": 30, "font-weight": 500, fill: MUTE });
      return (t) => {
        const out = 1 - io(seg(t, 9.3, 9.9)), open = on ? oc(seg(t, 1, 1.6)) * (1 - oc(seg(t, 4.2, 4.8))) : 0;
        door.setAttribute("opacity", 1 - open);
        const k = on ? io(seg(t, 1.6, 3.8)) * out : 0;
        const [x, y] = qp([120, 530], [560, 600], [950, 650], k);
        tf(mf, x, y - 40 * Math.sin(Math.PI * k));
        tog.setAttribute("fill", on ? MINT : "#fff");
      };
    },
  };

  /* ---- 2. two stacks of sheets grow; chips switch lines and config files ---- */
  SC.scale = {
    w: 1600, h: 1200, dur: 10, still: 8,
    build(svg, api) {
      txt(svg, 80, 124, "NanoClaw next to OpenClaw", { "font-size": 52, "font-weight": 700 });
      const M = [["Lines", "Runtime TypeScript lines", 29300, 434453, (v) => (v >= 1000 ? Math.round(v).toLocaleString("en-US") : String(Math.round(v)))], ["Config files", "Manual config files", 0, 53, (v) => String(Math.round(v))]];
      let sel = 0;
      const chips = M.map((m, i) => chip(svg, 80 + i * 330, 190, 300, m[0], `${m[1]}: NanoClaw ${i === 0 ? "about " : ""}${m[4](m[2])}, OpenClaw ${m[4](m[3])}`, () => { sel = i; api.seek(0.3); }));
      const lab = txt(svg, 1520, 254, "", { "text-anchor": "end", "font-size": 32, "font-weight": 500, fill: MUTE });
      const defs = el("defs", {}, svg), pat = el("pattern", { id: "nc-sheets", width: 40, height: 22, patternUnits: "userSpaceOnUse" }, defs);
      el("rect", { width: 40, height: 22, fill: "#fff" }, pat);
      el("path", { d: "M0 20 H40", stroke: LIL, "stroke-width": 5 }, pat);
      const BASE = 1010, MAXH = 600;
      el("path", { d: `M200 ${BASE} H1400`, stroke: INK, "stroke-width": SW, "stroke-linecap": "round" }, svg);
      const S = [[380, "NanoClaw", YEL], [900, "OpenClaw", SKY]].map(([x, name, col]) => {
        el("rect", { x: x + 12, y: BASE + 30, width: 320, height: 0 }, svg);
        const fillR = el("rect", { x, width: 320, fill: "url(#nc-sheets)" }, svg);
        const edge = el("rect", { x, width: 320, rx: 10, fill: "none", stroke: INK, "stroke-width": SW }, svg);
        const v = txt(svg, x + 160, 0, "", { "text-anchor": "middle", "font-size": 56, "font-weight": 700, "font-family": MONO });
        const tag = el("rect", { x: x + 40, y: BASE + 26, width: 240, height: 64, rx: 32, fill: col, stroke: INK, "stroke-width": SW }, svg);
        txt(svg, x + 160, BASE + 70, name, { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
        return { fillR, edge, v };
      });
      txt(svg, 800, 1150, "NanoClaw's own figures, from nanoclaw.dev on 17 Oct 2026", { "text-anchor": "middle", "font-size": 30, "font-weight": 500, fill: MUTE });
      return (t) => {
        const m = M[sel], out = 1 - io(seg(t, 9.3, 9.9));
        lab.textContent = m[1];
        chips.forEach((r, i) => { r.setAttribute("fill", i === sel ? YEL : "#fff"); r.parentNode.setAttribute("aria-pressed", i === sel); });
        [m[2], m[3]].forEach((val, i) => {
          const k = oc(seg(t, 0.6 + i * 0.6, 3.4 + i * 1.2)) * out, cur = val * k, h = Math.max((cur / m[3]) * MAXH, 0.001);
          S[i].fillR.setAttribute("y", BASE - h); S[i].fillR.setAttribute("height", h);
          S[i].edge.setAttribute("y", BASE - h); S[i].edge.setAttribute("height", h); S[i].edge.setAttribute("opacity", h > 2 ? 1 : 0);
          S[i].v.setAttribute("y", BASE - h - 28); S[i].v.textContent = k > 0.01 ? (sel === 0 && i === 0 ? "~" : "") + m[4](cur) : ""; S[i].v.setAttribute("opacity", k > 0.01 ? 1 : 0);
        });
      };
    },
  };

  /* ---- 3. a terminal runs the setup script; a checklist ticks off; a button runs it again ---- */
  SC.setup = {
    w: 1600, h: 1200, dur: 11, still: 9.4,
    build(svg, api) {
      txt(svg, 80, 124, "How do you install NanoClaw?", { "font-size": 52, "font-weight": 700 });
      const again = chip(svg, 1150, 90, 370, "Run again", "Run the setup again", () => api.seek(0.3));
      el("rect", { x: 92, y: 302, width: 660, height: 520, rx: 30, fill: SOFT }, svg);
      el("rect", { x: 80, y: 290, width: 660, height: 520, rx: 30, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
      el("path", { d: "M80 360 H740", stroke: INK, "stroke-width": SW }, svg);
      [124, 164, 204].forEach((x, i) => el("circle", { cx: x, cy: 325, r: 12, fill: [YEL, SKY, MINT][i], stroke: INK, "stroke-width": 4 }, svg));
      const L = ["$ cd nanoclaw-v2", "$ bash nanoclaw.sh"].map((s, i) => ({ s, n: txt(svg, 120, 450 + i * 80, "", { "font-family": MONO, "font-size": 40, "font-weight": 700 }) }));
      const caret = el("rect", { width: 22, height: 44, fill: BLUE }, svg);
      const T = ["Node and pnpm", "Docker", "Credential gateway", "Agent container", "First channel"];
      const rows = T.map((s, i) => {
        const y = 330 + i * 110, g = el("g", {}, svg);
        const box = el("rect", { x: 860, y, width: 640, height: 86, rx: 24, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
        const dot = el("circle", { cx: 912, cy: y + 43, r: 22, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
        const tick = el("path", { d: `M900 ${y + 44} L910 ${y + 54} L926 ${y + 34}`, fill: "none", stroke: INK, "stroke-width": SW, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": "1 1" }, g);
        txt(g, 960, y + 55, s, { "font-size": 34, "font-weight": 700 });
        return { box, dot, tick };
      });
      txt(svg, 800, 1000, "It installs Node, pnpm and Docker if they are missing", { "text-anchor": "middle", "font-size": 30, "font-weight": 500, fill: MUTE });
      txt(svg, 800, 1050, "From NanoClaw's README, 17 Oct 2026", { "text-anchor": "middle", "font-size": 30, "font-weight": 500, fill: MUTE });
      return (t) => {
        const out = 1 - io(seg(t, 10.4, 10.9));
        let cx = 120, cy = 450;
        L.forEach((l, i) => {
          const a = 0.4 + i * 1.1, n = Math.round(seg(t, a, a + 0.8) * l.s.length);
          l.n.textContent = out > 0.5 ? l.s.slice(0, n) : "";
          if (t > a) { cx = 120 + n * 24.1; cy = 450 + i * 80; }
        });
        tf(caret, cx + 4, cy - 36); caret.setAttribute("opacity", Math.floor(t * 2.5) % 2 && out > 0.5 ? 1 : 0.15);
        rows.forEach((r, i) => {
          const a = 3 + i * 1.2, k = seg(t, a, a + 0.4) * out, done = k >= 1;
          r.tick.setAttribute("stroke-dashoffset", 1 - k);
          r.dot.setAttribute("fill", done ? MINT : "#fff");
          r.box.setAttribute("fill", done && i === 4 ? SKY : "#fff");
        });
        again.setAttribute("fill", t < 0.8 ? YEL : "#fff");
      };
    },
  };

  /* ---- title card: chat apps wired into one container with an agent inside ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6, still: 4,
    build(svg) {
      txt(svg, 100, 150, "What is NanoClaw?", { "font-size": 68, "font-weight": 700 });
      txt(svg, 100, 214, "A personal AI assistant that runs agents in containers", { "font-size": 32, "font-weight": 500, fill: MUTE });
      const apps = [["WhatsApp", 330, MINT], ["Telegram", 480, SKY], ["Slack", 630, LIL]];
      const cs = apps.map(([, y]) => cable(svg, qd([420, y + 45], [700, y + 45], [900, 520])));
      const tiles = apps.map(([name, y, col]) => {
        const g = el("g", {}, svg);
        el("rect", { x: 100, y, width: 320, height: 90, rx: 45, fill: col, stroke: INK, "stroke-width": SW }, g);
        txt(g, 260, y + 58, name, { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
        return g;
      });
      el("rect", { x: 912, y: 312, width: 560, height: 440, rx: 36, fill: SOFT }, svg);
      el("rect", { x: 900, y: 300, width: 560, height: 440, rx: 36, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
      txt(svg, 1180, 370, "container", { "text-anchor": "middle", "font-size": 32, "font-weight": 700, fill: MUTE });
      const ag = el("g", {}, svg);
      el("rect", { x: 1040, y: 450, width: 280, height: 140, rx: 28, fill: YEL, stroke: INK, "stroke-width": SW }, ag);
      txt(ag, 1180, 534, "agent", { "text-anchor": "middle", "font-size": 46, "font-weight": 700 });
      return (t) => {
        const out = 1 - io(seg(t, 5.4, 5.9));
        cs.forEach((c, i) => c.setAttribute("stroke-dashoffset", 1 - oc(seg(t, 0.6 + i * 0.4, 1.6 + i * 0.4)) * out));
        tiles.forEach((g, i) => g.setAttribute("opacity", seg(t, 0.2 + i * 0.3, 0.5 + i * 0.3) * out > 0.02 ? 1 : 0));
        const k = ob(seg(t, 2.2, 2.9)) * out;
        tf(ag, 1180 * (1 - k), 520 * (1 - k), Math.max(k, 0.001));
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
