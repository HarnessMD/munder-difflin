/* Bright coded scenes for "Agent Tools Today, 25 Nov 2026". Vanilla JS, no library.
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
  const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let uid = 0;
  const nid = (s) => `mg-att25-${s}-${++uid}`; // a counter for SVG ids

  /* ---- shared drawing ---- */
  // a yellow post standing on y = base, with a round cap
  const post = (p, x, top, base, w, r) => {
    const g = el("g", {}, p);
    el("rect", { x: x - w / 2, y: top, width: w, height: base - top, rx: w / 3.5, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("circle", { cx: x, cy: top - 2, r, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    return g;
  };
  // a blue line with an ink edge, drawn on from the left as k goes from 0 to 1
  const rope = (p, wi, wb) => {
    const ns = [[INK, wi], [BLUE, wb]].map(([c, w]) => el("path", { fill: "none", stroke: c, "stroke-width": w, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }, p));
    return (d, k) => ns.forEach((n) => { n.setAttribute("d", d); n.setAttribute("stroke-dashoffset", 1 - k); n.setAttribute("opacity", k > 0.01 ? 1 : 0); });
  };
  // a point on the sagging line at u from 0 to 1
  const bez = (u, a, c, b) => [(1 - u) ** 2 * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1]];
  // a sky clothes peg centred on the line
  const peg = (p, w, h, top) => {
    const g = el("g", {}, p);
    el("rect", { x: -w / 2, y: top, width: w, height: h, rx: w / 3, fill: SKY, stroke: INK, "stroke-width": 2.5 }, g);
    el("circle", { cx: 0, cy: top + h * 0.5, r: w / 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
    return g;
  };

  const SC = {};
  const WORDS = [["Skills", "over MCP"], ["Install", "as app"], ["Bonsai", "2.5"]], DATE = "24 Nov";

  /* ---- 1. a breeze crosses the clothesline and lifts each card; tap a card to stop the breeze and read its date ---- */
  SC.clothesline = {
    dur: 10, still: 9,
    build(svg, api) {
      const STILL = 9, GY = 506, P0 = [59, 180], P2 = [741, 180], U = [0.175, 0.5, 0.825], CW = 150, CH = 160, CT = 26;
      const root = el("g", {}, svg);
      const ground = el("path", { d: `M40 ${GY} H760`, stroke: SOFT, "stroke-width": 12, "stroke-linecap": "round" }, root);
      // the breeze: three sky streaks, each with its head at 0,0 and a curl at the front
      const SD = "M-200 0 C-170 -13 -140 13 -110 0 S-50 -13 -20 0 C-4 7 14 4 18 -6 C22 -18 6 -24 -1 -15";
      const ST = [[0, 116], [-96, 300], [-44, 452]];
      const streaks = ST.map(() => el("path", { d: SD, fill: "none", stroke: SKY, "stroke-width": 6, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0 }, root));
      const posts = [48, 752].map((x) => post(root, x, 150, GY, 22, 15));
      const line = rope(root, 9, 5);
      const knots = [P0, P2].map(([x, y]) => el("circle", { cx: x, cy: y, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, root));
      const F = (T) => -60 + 250 * (T - 2.2); // the breeze front, left to right
      const HIT = U.map((u) => 2.2 + (P0[0] + (P2[0] - P0[0]) * u - 40 + 60) / 250);
      // the lift: up to 1 in 0.32 s, then a damped swing back with one small overshoot, at rest by 2.6 s
      const lift = (tau) => {
        if (tau <= 0) return 0;
        if (tau < 0.32) return oc(tau / 0.32);
        const d = tau - 0.32;
        return Math.cos(3.4 * d) * Math.exp(-1.3 * Math.pow(d, 1.5)) * (1 - seg(d, 1.7, 2.3));
      };
      let pin = -1, pinFrom = STILL, pinTo = STILL, pinAt = 0, lastT = STILL, mFrom = 1, mTo = 1, mAt = -9, lastM = 1;
      const tags = WORDS.map(() => ({ on: false, at: -9 }));
      const press = (i) => {
        const now = api.now();
        if (pin === i) { pin = -1; tags[i].on = false; tags[i].at = now; mFrom = lastM; mTo = 1; mAt = now; api.seek(lastT); }
        else {
          if (pin < 0) { pinFrom = lastT; pinTo = cl(lastT, 2.4, STILL); pinAt = now; mFrom = lastM; mTo = 0; mAt = now; }
          else { tags[pin].on = false; tags[pin].at = now; }
          pin = i; tags[i].on = true; tags[i].at = now; api.poke();
        }
        cards.forEach((c, j) => c.g.setAttribute("aria-pressed", String(pin === j)));
      };
      const cards = WORDS.map((ws, i) => {
        const g = el("g", { "aria-pressed": "false" }, root), body = el("g", {}, g), id = nid("card");
        const cp = el("clipPath", { id }, body);
        el("rect", { x: -CW / 2, y: CT, width: CW, height: CH, rx: 14 }, cp);
        el("rect", { x: -CW / 2 + 7, y: CT + 7, width: CW, height: CH, rx: 14, fill: LIL }, body);
        el("rect", { x: -CW / 2, y: CT, width: CW, height: CH, rx: 14, fill: LIL }, body);
        const wipe = el("rect", { x: -CW / 2, y: CT, width: 0, height: CH, fill: MINT, "clip-path": `url(#${id})` }, body);
        el("rect", { x: -CW / 2, y: CT, width: CW, height: CH, rx: 14, fill: "none", stroke: INK, "stroke-width": 3 }, body);
        el("rect", { x: -CW / 2 - 10, y: CT - 8, width: CW + 20, height: CH + 18, rx: 22, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 7", class: "mg-ring" }, body);
        const words = el("g", {}, body);
        const ns = ws.map((s, j) => txt(words, 0, CT + 72 + j * 40, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 25, "font-weight": 700, fill: MUTE }));
        // the soft white date tag that hangs under a tapped card
        const tag = el("g", { opacity: 0 }, body), TY = CT + CH + 22;
        el("path", { d: `M0 ${CT + CH} V${TY + 10}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
        el("rect", { x: -51, y: TY + 5, width: 112, height: 50, rx: 12, fill: LIL }, tag);
        el("rect", { x: -56, y: TY, width: 112, height: 50, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, tag);
        el("circle", { cx: 0, cy: TY + 10, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
        txt(tag, 0, TY + 41, DATE, { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
        const pg = peg(g, 20, 56, -15);
        button(g, `${ws.join(" ")}, dated ${DATE}`, () => press(i));
        return { g, body, wipe, words, ns, tag, pg };
      });
      return (t, now) => {
        let T = CALM ? STILL : t;
        if (pin >= 0) T = CALM ? pinTo : pinFrom + (pinTo - pinFrom) * oc(seg(now - pinAt, 0, 0.7));
        lastT = T;
        const m = CALM ? 1 : mFrom + (mTo - mFrom) * io(seg(now - mAt, 0, 0.6)); lastM = m; // m eases the breeze out when a card is pinned
        root.setAttribute("opacity", 1 - io(seg(T, 9.35, 9.95)));
        const kg = oc(seg(T, 0, 0.5));
        ground.setAttribute("transform", `translate(400 0) scale(${kg} 1) translate(-400 0)`); ground.setAttribute("opacity", kg > 0.01 ? 1 : 0);
        posts.forEach((p, j) => { const e = ob(seg(T, 0.1 + j * 0.1, 0.7 + j * 0.1)); p.setAttribute("transform", `translate(0 ${GY}) scale(1 ${Math.max(e, 0.001)}) translate(0 ${-GY})`); p.setAttribute("opacity", seg(T, 0.1 + j * 0.1, 0.2 + j * 0.1)); });
        // the line sways, more while the breeze crosses, and comes to rest by 7.6 s
        const A = oc(seg(T, 1.3, 2.3)) * (1 - io(seg(T, 6.4, 7.6))) * m, bump = Math.sin(Math.PI * seg(T, 2.4, 6.4)) ** 2;
        const S = 40 + A * (3 * Math.sin(2.1 * T) + 6 * bump), dx = A * (8 * Math.sin(1.5 * T) + 12 * bump * Math.sin(3.1 * T));
        const C = [400 + dx, 180 + 2 * S];
        line(`M${P0[0]} ${P0[1]} Q${C[0]} ${C[1]} ${P2[0]} ${P2[1]}`, oc(seg(T, 0.55, 1.25)));
        knots.forEach((k) => k.setAttribute("opacity", seg(T, 0.5, 0.62)));
        const f = F(T);
        streaks.forEach((s, j) => { const x = f + ST[j][0]; tf(s, x, ST[j][1] + 5 * Math.sin(5 * T + j * 2)); s.setAttribute("opacity", seg(x, -10, 110) * (1 - seg(x, 760, 960)) * m); });
        cards.forEach((c, i) => {
          const [px, py] = bez(U[i], P0, C, P2), kd = seg(T, 0.95 + i * 0.1, 1.55 + i * 0.1), e = ob(kd);
          const tau = T - HIT[i], L = lift(tau) * m;
          const ang = -11 * L + A * 2.2 * Math.sin(1.8 * T + i * 1.1) - 6 * (1 - e), sy = L > 0 ? 1 - 0.3 * L : 1 - 0.12 * L;
          tf(c.g, px, py - 46 * (1 - e)); c.g.setAttribute("opacity", seg(kd, 0, 0.2));
          c.body.setAttribute("transform", `rotate(${ang}) scale(1 ${sy})`);
          c.pg.setAttribute("transform", `rotate(${ang})`);
          c.wipe.setAttribute("width", CW * oc(seg(tau, 0.05, 0.5)));
          const kw = oc(seg(T, 1.45 + i * 0.1, 1.95 + i * 0.1)), pop = Math.sin(Math.PI * seg(tau, 0.22, 0.62));
          c.words.setAttribute("opacity", kw);
          c.words.setAttribute("transform", `translate(0 ${CT + 80 + 10 * (1 - kw)}) scale(${1 + 0.12 * pop}) translate(0 ${-(CT + 80)})`);
          c.ns.forEach((n) => n.setAttribute("fill", tau >= 0.28 ? INK : MUTE));
          const s = tags[i], k = CALM ? (s.on ? 1 : 0) : s.on ? ob(seg(now - s.at, 0, 0.45)) : 1 - io(seg(now - s.at, 0, 0.25));
          const top = CT + CH;
          c.tag.setAttribute("opacity", cl(k * 1.5));
          c.tag.setAttribute("transform", `translate(0 ${top - 16 * (1 - k)}) scale(${0.7 + 0.3 * k}) translate(0 ${-top})`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9: the words land, then a small clothesline sways and settles ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: -76, y: -21, width: 152, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 0, 7, "Daily brief", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
      const lines = [
        txt(svg, 64, 196, "Agent Tools Today,", { "font-size": 66, "font-weight": 700 }),
        txt(svg, 64, 270, "25 Nov 2026", { "font-size": 66, "font-weight": 700 }),
        txt(svg, 64, 326, "Skills over MCP, Install as app, Bonsai 2.5", { "font-size": 25, "font-weight": 500, fill: MUTE }),
      ];
      const checked = txt(svg, 64, 380, "Checked 25 Nov", { "font-family": MONO, "font-size": 19, "font-weight": 700, fill: MUTE });
      const GY = 494, P0 = [651, 380], P2 = [893, 380], U = [0.2, 0.5, 0.8], CW = 58, CH = 68;
      const ground = el("path", { d: `M610 ${GY} H934`, stroke: SOFT, "stroke-width": 10, "stroke-linecap": "round" }, svg);
      const posts = [640, 904].map((x) => post(svg, x, 362, GY, 22, 13));
      const line = rope(svg, 7.5, 4);
      const cards = U.map(() => {
        const g = el("g", {}, svg), body = el("g", {}, g);
        el("rect", { x: -CW / 2 + 5, y: 13, width: CW, height: CH, rx: 9, fill: LIL }, body);
        el("rect", { x: -CW / 2, y: 8, width: CW, height: CH, rx: 9, fill: LIL, stroke: INK, "stroke-width": 2.5 }, body);
        el("rect", { x: -17, y: 36, width: 34, height: 7, rx: 3.5, fill: SOFT }, body);
        el("rect", { x: -17, y: 50, width: 22, height: 7, rx: 3.5, fill: SOFT }, body);
        const pg = peg(g, 11, 26, -10);
        return { g, body, pg };
      });
      return (t) => {
        const T = CALM ? 6 : t;
        tf(pill, 64 + 76, 96, 0.6 + 0.4 * ob(seg(T, 0, 0.45))); pill.setAttribute("opacity", seg(T, 0, 0.15));
        lines.forEach((n, i) => { const k = oc(seg(T, 0.12 + i * 0.09, 0.62 + i * 0.09)); n.setAttribute("transform", `translate(0 ${22 * (1 - k)})`); n.setAttribute("opacity", k); });
        const kg = oc(seg(T, 0.6, 1));
        ground.setAttribute("transform", `translate(772 0) scale(${kg} 1) translate(-772 0)`); ground.setAttribute("opacity", kg > 0.01 ? 1 : 0);
        posts.forEach((p, j) => { const e = ob(seg(T, 0.7 + j * 0.1, 1.25 + j * 0.1)); p.setAttribute("transform", `translate(0 ${GY}) scale(1 ${Math.max(e, 0.001)}) translate(0 ${-GY})`); p.setAttribute("opacity", seg(T, 0.7 + j * 0.1, 0.8 + j * 0.1)); });
        const A = oc(seg(T, 1.7, 2.3)) * (1 - io(seg(T, 3.4, 5))), S = 20 + 3 * A * Math.sin(2.2 * T), C = [772 + 8 * A * Math.sin(1.7 * T), 380 + 2 * S];
        line(`M${P0[0]} ${P0[1]} Q${C[0]} ${C[1]} ${P2[0]} ${P2[1]}`, oc(seg(T, 1, 1.6)));
        cards.forEach((c, i) => {
          const [px, py] = bez(U[i], P0, C, P2), kd = seg(T, 1.5 + i * 0.1, 2.05 + i * 0.1), e = ob(kd), ang = 5 * A * Math.sin(2 * T + i * 1.2) - 6 * (1 - e);
          tf(c.g, px, py - 30 * (1 - e)); c.g.setAttribute("opacity", seg(kd, 0, 0.2));
          c.body.setAttribute("transform", `rotate(${ang})`); c.pg.setAttribute("transform", `rotate(${ang})`);
        });
        const kc = oc(seg(T, 2.1, 2.6)); // the checked line lands last
        checked.setAttribute("transform", `translate(0 ${14 * (1 - kc)})`); checked.setAttribute("opacity", kc);
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
