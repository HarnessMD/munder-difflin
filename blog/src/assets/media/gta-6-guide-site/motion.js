/* Bright coded scenes for "GTA 6 guide site or newsletter". Vanilla JS, no library.
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
  /* a tween started by a tap: 0 to 1 over d seconds, instant when reduced motion is on */
  const tween = (api, now, since, d) => (api.calm ? 1 : cl((now - since) / d));
  const ring = (p, a) => el("rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, a), p);

  const SC = {};

  /* ---- 1. index cards slide into a card file drawer; the Ending card is turned away ---- */
  SC.cardfile = {
    dur: 10, still: 9.9,
    build(svg, api) {
      const END = 9.9, W = 300, H = 150, X = 100;
      el("path", { d: "M90 362 L80 170 H420 L410 362 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg); // the open lid
      el("path", { d: "M70 390 L88 362 H412 L430 390 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg); // the drawer rim
      const card = (label, chip) => {
        const g = el("g", { opacity: 0 }, svg);
        el("rect", { width: W, height: H, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M14 44 H${W - 14}`, stroke: BLUE, "stroke-width": 2 }, g);
        el("circle", { cx: 26, cy: 21, r: 8, fill: chip, stroke: INK, "stroke-width": 2 }, g);
        txt(g, 44, 28, label, { "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return g;
      };
      const CARDS = [["Map", BLUE, 214], ["Missions", MINT, 254], ["Discord FAQ", LIL, 294], ["Newsletter", YEL, 334]].map(([s, c, y], i) => ({ g: card(s, c), y, at: 0.4 + i * 0.7 }));
      const map = CARDS[0].g;
      [84, 116].forEach((y) => el("path", { d: `M14 ${y} H${W - 14}`, stroke: SKY, "stroke-width": 2 }, map));
      const note = txt(map, 26, 76, "Your own note", { "font-size": 24, "font-weight": 600, opacity: 0 });
      const drawer = el("g", {}, svg);
      ring(drawer, { x: 56, y: 376, width: 388, height: 168, rx: 22 });
      el("path", { d: "M70 390 H430 V514 Q430 530 414 530 H86 Q70 530 70 514 Z", fill: YEL, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, drawer);
      el("rect", { x: 200, y: 416, width: 100, height: 36, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, drawer);
      el("rect", { x: 212, y: 474, width: 76, height: 22, rx: 11, fill: BLUE, stroke: INK, "stroke-width": 3 }, drawer);
      const end = card("Ending", SKY);
      const tag = el("g", { opacity: 0 }, svg);
      el("path", { d: "M620 40 V140", stroke: INK, "stroke-width": 2 }, tag);
      el("circle", { cx: 620, cy: 40, r: 6, fill: LIL, stroke: INK, "stroke-width": 2 }, tag);
      el("path", { d: "M540 150 L558 132 H682 L700 150 V188 Q700 196 692 196 H548 Q540 196 540 188 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 620, cy: 143, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      txt(tag, 620, 182, "No spoilers", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      let pulled = false, since = -99, tapped = false;
      button(drawer, "Card file drawer: pull out the Map card", () => { tapped = true; pulled = !pulled; since = api.now(); api.poke(); });
      return (t, now) => {
        if (tapped) t = END;
        const k = tween(api, now, since, 0.6), p = io(pulled ? k : 1 - k);
        CARDS.forEach((c, i) => {
          const d = ob(seg(t, c.at, c.at + 0.6));
          tf(c.g, X, -H - 30 + (c.y + H + 30) * d - (i ? 0 : 150 * p));
          c.g.setAttribute("opacity", t >= c.at ? 1 : 0);
        });
        note.setAttribute("opacity", seg(p, 0.5, 1));
        const drop = oc(seg(t, 3.6, 4.2)), bump = Math.sin(seg(t, 4.2, 4.55) * Math.PI) * 10, away = io(seg(t, 5.6, 6.6));
        tf(end, X + 400 * away, -H - 30 + (20 + H + 30) * drop - bump + 202 * away, 1 - 0.2 * away, 2 * away);
        end.setAttribute("opacity", t >= 3.6 ? 1 : 0);
        const tg = seg(t, 4.7, 5.3), sw = seg(t, 5.3, 6.6);
        tag.setAttribute("transform", `translate(0 ${-220 * (1 - ob(tg))}) rotate(${Math.sin(sw * Math.PI * 3) * 7 * (1 - sw)} 620 40)`);
        tag.setAttribute("opacity", t >= 4.7 ? 1 : 0);
      };
    },
  };

  /* ---- 2. a magnifying glass moves from the tall copied stack to the short real one ---- */
  SC.magnifier = {
    dur: 9.5, still: 9.4,
    build(svg, api) {
      const END = 9.4, PW = 220, PH = 180, Y = 300, GY = 392;
      const stack = (x0, n) => {
        const g = el("g", {}, svg), pages = [];
        for (let i = n - 1; i >= 0; i--) {
          const p = el("g", { opacity: 0 }, g), x = x0 + (i % 2 ? 3 : 0), y = Y - i * 11;
          el("rect", { x, y, width: PW, height: PH, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5, class: "pg" }, p);
          [170, 140, 176, 120, 156].forEach((w, j) => el("rect", { x: x + 24, y: y + 28 + j * 26, width: w, height: 10, rx: 5, fill: SKY }, p));
          pages[i] = p;
        }
        return { g, pages };
      };
      const tall = stack(90, 16), short = stack(490, 3);
      const lab = txt(svg, 200, 530, "Many pages, nothing new", { "text-anchor": "middle", "font-size": 22, opacity: 0 });
      const stamp = el("g", { opacity: 0 }, short.g);
      el("rect", { x: -98, y: -28, width: 196, height: 56, rx: 10, fill: MINT, stroke: INK, "stroke-width": 3 }, stamp);
      txt(stamp, 0, 7, "Your play notes", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const glass = el("g", {}, svg);
      el("circle", { r: 124, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, glass);
      const hd = el("g", { transform: "rotate(-45)" }, glass);
      el("rect", { x: 104, y: -13, width: 22, height: 26, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 3 }, hd);
      el("rect", { x: 124, y: -16, width: 92, height: 32, rx: 16, fill: YEL, stroke: INK, "stroke-width": 4 }, hd);
      el("circle", { r: 108, fill: SKY, "fill-opacity": 0.18, stroke: INK, "stroke-width": 6 }, glass);
      el("path", { d: "M-80 -34 A86 86 0 0 1 -40 -76", stroke: "#fff", "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, glass);
      let side = 1, since = -99, from = 600, gx = -260, tapped = false;
      button(glass, "Magnifying glass: move it to the other stack", () => { tapped = true; from = gx; side = 1 - side; since = api.now(); api.poke(); });
      return (t, now) => {
        if (tapped) t = END;
        tall.pages.forEach((p, i) => { const a = 0.2 + (15 - i) * 0.07, k = oc(seg(t, a, a + 0.25)); p.setAttribute("opacity", k); p.setAttribute("transform", `translate(0 ${-24 * (1 - k)})`); });
        short.pages.forEach((p, i) => { const a = 0.5 + (2 - i) * 0.25, k = oc(seg(t, a, a + 0.25)); p.setAttribute("opacity", k); p.setAttribute("transform", `translate(0 ${-24 * (1 - k)})`); });
        const fade = io(seg(t, 3.4, 4.8));
        tall.g.setAttribute("opacity", 1 - 0.6 * fade); tall.g.querySelectorAll(".pg").forEach((n) => n.setAttribute("stroke", fade > 0.05 ? LIL : INK));
        lab.setAttribute("opacity", seg(t, 1.0, 1.5)); lab.setAttribute("fill", fade > 0.5 ? MUTE : INK);
        const s = seg(t, 1.6, 2.1);
        tf(stamp, 600, GY, 1.6 - 0.6 * ob(s), -5); stamp.setAttribute("opacity", cl(s * 3));
        const pop = 1 + Math.sin(seg(t, 6.4, 6.9) * Math.PI) * 0.04;
        short.g.setAttribute("transform", `translate(600 ${GY}) scale(${pop}) translate(-600 ${-GY})`);
        let x = -260 + 460 * io(seg(t, 2.2, 3.2)) + 400 * io(seg(t, 5.0, 6.4));
        if (tapped) x = from + ((side ? 600 : 200) - from) * io(tween(api, now, since, 0.8));
        gx = x; tf(glass, x, GY);
      };
    },
  };

  /* ---- 3. a string runs through the six pipeline cards on a pinboard ---- */
  SC.pinboard = {
    dur: 9.5, still: 9.4,
    build(svg, api) {
      const END = 9.4, CW = 180, CH = 105;
      el("rect", { x: 30, y: 40, width: 740, height: 520, rx: 24, fill: SOFT, stroke: INK, "stroke-width": 4 }, svg);
      const STEPS = [["Notes", "You"], ["Brief", "Agent"], ["Draft", "Agent"], ["Fact check", "Agent"], ["Your edit", "You"], ["Publish", "You"]];
      const LIT = [SKY, LIL, MINT, SKY, LIL, MINT];
      const PIN = [0.4, 3.0, 3.8, 4.6, 5.4, 6.2], STR = [0, 1.0, 3.1, 3.9, 4.7, 5.5];
      const P = STEPS.map((_, i) => { const up = i % 2 === 0, cx = 140 + i * 104; return { cx, cy: up ? 162.5 : 437.5, py: up ? 215 : 385 }; });
      const strs = P.slice(1).map((b, i) => { const a = P[i], L = Math.hypot(b.cx - a.cx, b.py - a.py); return { n: el("path", { d: `M${a.cx} ${a.py} L${b.cx} ${b.py}`, stroke: BLUE, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": `${L} ${L}`, "stroke-dashoffset": L }, svg), L }; });
      let tapped = false;
      const cards = STEPS.map(([name, who], i) => {
        const { cx, cy } = P[i], x = cx - CW / 2, y = cy - CH / 2;
        const g = el("g", {}, svg);
        ring(g, { x: x - 10, y: y - 10, width: CW + 20, height: CH + 20, rx: 18 });
        const body = el("g", {}, g);
        const halo = el("rect", { x: x - 6, y: y - 6, width: CW + 12, height: CH + 12, rx: 15, fill: "none", stroke: YEL, "stroke-width": 8, opacity: 0 }, body);
        const front = el("g", {}, body);
        el("rect", { x, y, width: CW, height: CH, rx: 10, fill: "#fff" }, front);
        const lit = el("rect", { x, y, width: CW, height: CH, rx: 10, fill: LIT[i], opacity: 0 }, front);
        const edge = el("rect", { x, y, width: CW, height: CH, rx: 10, fill: "none", stroke: INK, "stroke-width": 3 }, front);
        const word = txt(front, cx, cy + 7, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        const back = el("g", { display: "none" }, body);
        el("rect", { x, y, width: CW, height: CH, rx: 10, fill: who === "You" ? YEL : BLUE, stroke: INK, "stroke-width": 3 }, back);
        txt(back, cx, cy + 4, who, { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
        txt(back, cx, cy + 34, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 14, "font-weight": 500 });
        const c = { body, front, back, lit, edge, halo, word, flip: false, since: -99, cx, cy };
        button(g, `${name} card: flip it to see who does this step`, () => { tapped = true; c.flip = !c.flip; c.since = api.now(); api.poke(); });
        return c;
      });
      const pins = P.map(() => { const g = el("g", { opacity: 0 }, svg); el("circle", { r: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, g); el("circle", { cx: -3.5, cy: -3.5, r: 3, fill: "#fff" }, g); return g; });
      return (t, now) => {
        if (tapped) t = END;
        strs.forEach((s, i) => s.n.setAttribute("stroke-dashoffset", s.L * (1 - io(seg(t, STR[i + 1], STR[i + 1] + 0.6)))));
        cards.forEach((c, i) => {
          const pinned = t >= PIN[i];
          c.lit.setAttribute("opacity", oc(seg(t, PIN[i], PIN[i] + 0.4)));
          c.halo.setAttribute("opacity", Math.sin(seg(t, PIN[i], PIN[i] + 0.8) * Math.PI));
          c.edge.setAttribute("stroke", pinned ? INK : MUTE); c.word.setAttribute("fill", pinned ? INK : MUTE);
          let rot = 0;
          if (i === 2) { rot = (-7 + 2.5 * Math.sin(t * 3)) * (1 - ob(seg(t, PIN[2], PIN[2] + 0.4))); c.edge.setAttribute("stroke-dasharray", pinned ? "none" : "7 6"); }
          const f = c.flip ? tween(api, now, c.since, 0.5) : 1 - tween(api, now, c.since, 0.5), sx = Math.max(Math.abs(Math.cos(f * Math.PI)), 0.001);
          c.front.setAttribute("display", f < 0.5 ? "inline" : "none"); c.back.setAttribute("display", f < 0.5 ? "none" : "inline");
          c.body.setAttribute("transform", `rotate(${rot} ${c.cx} ${P[i].py}) translate(${c.cx} ${c.cy}) scale(${sx} 1) translate(${-c.cx} ${-c.cy})`);
        });
        pins.forEach((pn, i) => {
          const p = P[i];
          if (i === 1) { // the Brief pin hovers, then is pressed in
            const push = io(seg(t, 2.75, 3.0));
            tf(pn, p.cx, p.py - 46 * (1 - push) + (push > 0 ? 0 : Math.sin(t * 5) * 5), 1.35 - 0.35 * push);
            pn.setAttribute("opacity", seg(t, 1.3, 1.6));
          } else {
            const k = io(seg(t, PIN[i] - 0.3, PIN[i]));
            tf(pn, p.cx, p.py - 46 * (1 - k), 1.35 - 0.35 * k);
            pn.setAttribute("opacity", t >= PIN[i] - 0.3 ? 1 : 0);
          }
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.5, still: 3.5, once: true,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 132, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 130, 70, "Use Cases", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      txt(svg, 896, 70, "Checked 16 Nov 2026", { "text-anchor": "end", "font-size": 18, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 196, "GTA 6 guide site", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 278, "or newsletter", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 306 H300", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 362, "Run it with AI agents, the way this blog runs", { "font-size": 26, "font-weight": 500, fill: MUTE });
      el("path", { d: "M64 460 H896", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      const COL = [YEL, SKY, LIL, MINT, BLUE, SOFT];
      const tiles = ["Notes", "Brief", "Draft", "Fact check", "Your edit", "Publish"].map((s, i) => {
        const g = el("g", { opacity: 0 }, svg), x = 64 + i * 141.6;
        el("rect", { x, y: 432, width: 124, height: 56, rx: 12, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, x + 62, 466, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
        return g;
      });
      return (t) => tiles.forEach((g, i) => { const k = oc(seg(t, 0.3 + i * 0.4, 0.9 + i * 0.4)); g.setAttribute("opacity", k); g.setAttribute("transform", `translate(${-90 * (1 - k)} 0)`); });
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
    const time = (now) => { const T = now + off; return held ? sc.still : sc.once ? Math.min(T, sc.still) : ((T % sc.dur) + sc.dur) % sc.dur; };
    const frame = () => { const now = clock(); draw(time(now), now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held && !(sc.once && clock() + off >= sc.still)) raf = requestAnimationFrame(tick); };
    const api = { calm, now: clock, seek: (s) => { off = s - clock(); held = calm; tick(); }, poke: () => { held = calm; tick(); } };
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
