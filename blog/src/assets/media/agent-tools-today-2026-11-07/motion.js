/* Bright coded scenes for "Agent Tools Today, 7 Nov 2026". Vanilla JS, no library.
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

  const SC = {};

  /* ---- 1. three dice roll onto a table, the top faces carry the day's three lead items ---- */
  SC.dice = {
    dur: 9.8, still: 8,
    build(svg, api) {
      const H = 84, TY = 384, D2R = Math.PI / 180, YAW = -24 * D2R, PIT = 40 * D2R;
      const rx = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
      const ry = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
      const rz = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
      const view = (p) => rx(ry(p, YAW), PIT);
      const die = (p, phi, th) => rz(rx(p, phi), th);
      /* the table */
      el("path", { d: `M70 ${TY - 86} H730 L776 ${TY + 52} H24 Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 24, y: TY + 52, width: 752, height: 22, rx: 4, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      [64, 704].forEach((x) => el("rect", { x, y: TY + 74, width: 32, height: 100, fill: YEL, stroke: INK, "stroke-width": 3 }, svg));
      /* faces: normal n, in plane axes u and v; pips in face units */
      const FACES = [
        { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], pips: [] },
        { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], pips: [] },
        { n: [0, 0, 1], u: [1, 0, 0], v: [0, -1, 0], pips: [[-0.5, -0.5], [0.5, 0.5]] },
        { n: [1, 0, 0], u: [0, 0, -1], v: [0, -1, 0], pips: [[-0.5, -0.5], [0, 0], [0.5, 0.5]] },
        { n: [-1, 0, 0], u: [0, 0, 1], v: [0, -1, 0], pips: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]] },
        { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, -1], pips: [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]] },
      ];
      const CUBE = [];
      for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) CUBE.push([a * H, b * H, c * H]);
      const drop = Math.max(...CUBE.map((p) => -view(p)[1])), top = Math.min(...CUBE.map((p) => -view(p)[1]));
      const halfW = Math.max(...CUBE.map((p) => view(p)[0])), CY = TY - drop;
      const restUp = view([0, 1, 0])[2];
      const DICE = [
        { x: 140, col: BLUE, name: ["Claude Code"] },
        { x: 400, col: LIL, name: ["OpenCode"] },
        { x: 660, col: MINT, name: ["Cloudflare", "skill"] },
      ].map((d, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: d.x - halfW - 16, y: CY + top - 16, width: 2 * halfW + 32, height: drop - top + 32, rx: 26, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, g);
        const body = el("g", {}, g);
        const faces = FACES.map((f) => {
          const path = el("path", { fill: d.col, stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round" }, body);
          const pg = el("g", {}, body);
          f.pips.forEach(([a, b]) => el("circle", { cx: a, cy: b, r: 0.17, fill: INK }, pg));
          return { f, path, pg };
        });
        const label = (lines, size) => {
          const lg = el("g", {}, body), off = (lines.length - 1) * 0.5 * (size + 4);
          lines.forEach((s, k) => txt(lg, 0, k * (size + 4) - off + size * 0.36, s, { "text-anchor": "middle", "font-family": MONO, "font-size": size, "font-weight": 700 }));
          return lg;
        };
        const nameG = label(d.name, 19), dateG = label(["6 Nov"], 24);
        const st = { flipped: false, at: -99 };
        const start = 0.3 + i * 1.0, land = start + 0.75;
        button(g, `${d.name.join(" ")} die. Roll it over to show 6 Nov.`, () => {
          st.flipped = !st.flipped; st.at = api.now(); g.setAttribute("aria-pressed", st.flipped);
          if (api.calm) api.paint(); else api.poke();
        });
        g.setAttribute("aria-pressed", "false");
        return { d, g, body, faces, nameG, dateG, st, start, land };
      });
      const proj = (p, ox, oy) => { const q = view(p); return [ox + q[0], oy - q[1]]; };
      return (t, now) => {
        const out = seg(t, 9.15, 9.7);
        DICE.forEach((k) => {
          if (t < k.land) k.st.flipped = false;
          const p = seg(t, k.start, k.land), b = seg(t, k.land, k.land + 0.42), b2 = seg(t, k.land + 0.42, k.land + 0.64);
          const ox = k.d.x - 80 * (1 - p);
          let oy = CY - 440 * (1 - p * p) - 18 * Math.sin(Math.PI * b) - 5 * Math.sin(Math.PI * b2);
          const th = 180 * (1 - p) * D2R;
          const fp = api.calm ? 1 : io(seg(now - k.st.at, 0, 0.6)), phiDeg = k.st.flipped ? 90 * fp : 90 * (1 - fp);
          const phi = phiDeg * D2R, lift = H * (Math.SQRT2 * Math.cos((phiDeg - 45) * D2R) - 1);
          oy -= view([0, lift, 0])[1];
          k.body.setAttribute("opacity", t < k.start ? 0 : 1 - out);
          k.faces.forEach(({ f, path, pg }) => {
            const n = die(f.n, phi, th), vis = view(n)[2] > 0.001;
            path.setAttribute("display", vis ? "inline" : "none"); pg.setAttribute("display", vis ? "inline" : "none");
            if (!vis) return;
            const c = die(f.n.map((x) => x * H), phi, th), u = die(f.u.map((x) => x * H), phi, th), v = die(f.v.map((x) => x * H), phi, th);
            const S = (a, bb) => proj([c[0] + a * u[0] + bb * v[0], c[1] + a * u[1] + bb * v[1], c[2] + a * u[2] + bb * v[2]], ox, oy);
            const pts = [S(-1, -1), S(1, -1), S(1, 1), S(-1, 1)];
            path.setAttribute("d", `M${pts.map((q) => q[0].toFixed(2) + " " + q[1].toFixed(2)).join(" L")} Z`);
            const s0 = S(0, 0), su = S(1, 0), sv = S(0, 1);
            pg.setAttribute("transform", `matrix(${su[0] - s0[0]} ${su[1] - s0[1]} ${sv[0] - s0[0]} ${sv[1] - s0[1]} ${s0[0]} ${s0[1]})`);
          });
          const lab = oc(seg(t, k.land, k.land + 0.3));
          [[k.nameG, [0, 1, 0]], [k.dateG, [0, 0, -1]]].forEach(([lg, n0]) => {
            const n = die(n0, phi, th), c = proj(die(n0.map((x) => x * H), phi, th), ox, oy);
            const sy = cl(view(n)[2] / restUp, 0.05, 1);
            lg.setAttribute("transform", `translate(${c[0]} ${c[1]}) scale(1 ${sy})`);
            lg.setAttribute("opacity", lab * cl((n[1] - 0.55) / 0.35));
          });
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
    const api = { now: clock, calm, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); },
      paint: () => { const end = clock() + 0.6, f = () => { frame(); if (clock() < end) requestAnimationFrame(f); }; f(); } };
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
