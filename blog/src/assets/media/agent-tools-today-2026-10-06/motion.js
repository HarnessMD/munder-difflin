/* Bright coded scene for "Agent Tools Today, 6 Oct 2026". Vanilla JS, no library.
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

  /* ---- the day at a glance: five parcels drop in unmarked, get stamped, and stack up with a name tag ---- */
  const LAUNCH = [
    ["OpenAI text watermarking", "API customers worldwide can opt in to text watermarking", YEL],
    ["Beam", "501 billion total parameters, 23 billion active", BLUE],
    ["Cloudflare Web Search API", "Agents search the web through AI Gateway", LIL],
    ["Claude Code v2.1.290", "It adds claude attach <name> and claude logs <name>", SKY],
    ["Codex CLI 0.160.1", "A patch on 5 Oct with one fix", MINT],
  ];
  SC.today = {
    dur: 12, still: 9.5,
    build(svg, api) {
      const BY = 400, CY = BY - 27, X0 = 90, XS = 185, X1 = 280, TX = 384, GAP = 1.5;
      txt(svg, 44, 62, "Top 5 launches", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap a parcel", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      // ground, pallet, belt
      el("path", { d: "M36 474 H454", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: 336, y: 460, width: 96, height: 13, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M72 428 V472 M258 428 V472", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: 36, y: BY, width: 262, height: 28, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const dash = el("path", { d: "M54 414 H282", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "8 16" }, svg);
      // stamper: two posts, a bar, a piston
      el("path", { d: `M${XS - 50} 246 V${BY} M${XS + 50} 246 V${BY}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const rod = el("path", { d: "", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: XS - 62, y: 220, width: 124, height: 28, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      const head = el("rect", { x: -32, y: -22, width: 64, height: 22, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const tip = strip(svg, 520, 720);
      let pinned = -1;
      const jx = [0, 6, -5, 4, -3];
      const ps = LAUNCH.map(([name, line, col], i) => {
        const g = el("g", { opacity: 0 }, svg), tag = el("g", {}, g), box = el("g", {}, g);
        el("path", { d: "M30 0 H56", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, tag);
        const shape = el("path", { fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
        el("circle", { cx: 70, cy: 0, r: 5.5, fill: col, stroke: INK, "stroke-width": 2.5 }, tag);
        const label = txt(tag, 86, 7.5, name, { "font-size": 21 });
        const w = (label.getComputedTextLength && label.getComputedTextLength()) || name.length * 12, R = 86 + w + 18;
        shape.setAttribute("d", `M68 -22 H${R - 12} Q${R} -22 ${R} -10 V10 Q${R} 22 ${R - 12} 22 H68 L52 7 V-7 Z`);
        el("rect", { x: -36, y: -33, width: 72, height: 66, rx: 14, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, box);
        const face = el("rect", { x: -30, y: -27, width: 60, height: 54, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, box);
        const mark = txt(box, 0, 9, "?", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        button(g, `${name}: ${line}`, () => { pinned = i; api.poke(); });
        return { g, tag, box, face, mark, col, T: 0.4 + i * GAP, sx: TX + jx[i], sy: 460 - 29 - i * 56 };
      });
      // the chute the parcels fall out of, drawn last so they appear from behind it
      const chute = el("g", {}, svg);
      el("rect", { x: -44, y: -40, width: 88, height: 80, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, chute);
      txt(chute, 0, 13, "?", { "text-anchor": "middle", "font-size": 38, "font-weight": 700 });
      return (t, now) => {
        dash.setAttribute("stroke-dashoffset", -now * 70);
        let press = 0, last = -1, shake = 0;
        const gone = 1 - seg(t, 11.3, 11.9);
        ps.forEach((p, i) => {
          const s = t - p.T;
          if (s < 0) { p.g.setAttribute("opacity", 0); return; }
          shake = Math.max(shake, Math.sin(seg(s, 0, 0.35) * Math.PI));
          const dn = oc(seg(s, 0.85, 1)) * (1 - io(seg(s, 1, 1.2))); press = Math.max(press, dn);
          const hop = seg(s, 1.45, 2), h = io(hop), done = s >= 0.98, landed = s >= 2;
          const bx = X0 + (XS - X0) * io(seg(s, 0.5, 0.85)) + (X1 - XS) * io(seg(s, 1.15, 1.45));
          const x = bx + (p.sx - bx) * h, y = 162 + (CY - 162) * bo(seg(s, 0, 0.5)) + (p.sy - CY) * h - Math.sin(hop * Math.PI) * (70 + i * 12);
          tf(p.g, x, y); p.g.setAttribute("opacity", gone);
          const pop = done ? ob(seg(s, 0.98, 1.3)) : 1, land = landed ? Math.sin(seg(s, 2, 2.35) * Math.PI) * 0.12 : 0;
          p.box.setAttribute("transform", `translate(0 ${27 * (dn * 0.14 + land)}) rotate(${360 * h}) scale(${(0.8 + 0.2 * pop) * (1 + land)} ${(0.8 + 0.2 * pop) * (1 - dn * 0.14 - land)})`);
          p.face.setAttribute("fill", done ? p.col : "#fff"); p.mark.textContent = done ? String(i + 1) : "?";
          const k = ob(seg(s, 2, 2.45));
          p.tag.setAttribute("transform", `translate(30 0) rotate(${-24 * (1 - k) + (landed ? Math.sin(now * 2 + i) * 1.2 : 0)}) scale(${cl(k, 0, 1.2)}) translate(-30 0)`);
          p.tag.setAttribute("opacity", landed ? 1 : 0);
          if (landed) last = i;
        });
        const hy = 300 + (CY - 27 - 300) * press;
        tf(head, XS, hy); rod.setAttribute("d", `M${XS} 248 V${hy - 22}`);
        tf(chute, X0, 160, 1 + 0.06 * shake, Math.sin(shake * Math.PI * 2) * 3);
        const show = pinned >= 0 ? pinned : last;
        tip.textContent = show < 0 || (pinned < 0 && gone < 1) ? "the question was where things come from" : LAUNCH[show][1];
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('600 21px "Space Grotesk"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
