/* Bright coded scenes for "OpenClaw Alternatives". Vanilla JS, no library.
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
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---- the seven picks, in the post's order: name, colour, the post's "Best for" line ---- */
  const PICKS = [
    ["Hermes Agent", LIL, "the same job, with memory that grows"],
    ["Munder Difflin", YEL, "people who used OpenClaw mostly to get code written"],
    ["NanoClaw", SKY, "isolation first"],
    ["ZeroClaw", BLUE, "a small always on service"],
    ["nanobot", MINT, "Python people who want to read the core"],
    ["Goose", LIL, "a desktop app first"],
    ["Claude", SOFT, "no server to run"],
  ];
  const pill = (p, name, col, w = 180, h = 44) => {
    const g = el("g", {}, p);
    el("rect", { x: -w / 2 - 5, y: -h / 2 - 5, width: w + 10, height: h + 10, rx: h / 2 + 5, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: col, stroke: INK, "stroke-width": 3 }, g);
    txt(g, 0, 7, name, { "text-anchor": "middle", "font-size": 20 });
    return g;
  };
  const bin = (svg, x, w, top, bot) => el("path", { d: `M${x} ${top} V${bot - 22} Q${x} ${bot} ${x + 22} ${bot} H${x + w - 22} Q${x + w} ${bot} ${x + w} ${bot - 22} V${top}`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
  const hopper = (svg, x, y) => el("path", { d: `M${x - 62} ${y} H${x + 62} L${x + 26} ${y + 62} H${x - 26} Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);

  const SC = {};

  /* ---- 1. seven picks drop out of a hopper and a flap sorts them: six free, one hosted ---- */
  SC.sorter = {
    dur: 12, still: 9.6,
    build(svg, api) {
      txt(svg, 44, 62, "Seven picks, sorted", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap a name", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const top = 262, bot = 440, FX = 500, FY = 214;
      bin(svg, 40, 412, top, bot); bin(svg, 548, 212, top, bot);
      const lab = [txt(svg, 246, 476, "", { "text-anchor": "middle", "font-size": 22 }), txt(svg, 654, 476, "", { "text-anchor": "middle", "font-size": 22 })];
      const slot = (i) => (i === 6 ? [654, 408] : [148 + (i % 2) * 196, 408 - Math.floor(i / 2) * 52]);
      const D = (i) => 0.8 + i * 1.05;
      let pinned = -1, lastT = 0;
      const flap = el("g", {}, svg);
      el("rect", { x: -84, y: -7, width: 168, height: 14, rx: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, flap);
      el("circle", { r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, flap);
      const pills = PICKS.map(([name, col, best], i) => {
        const g = pill(svg, name, col);
        button(g, `${name}. Best for: ${best}`, () => { pinned = i; api.poke(); });
        return g;
      });
      hopper(svg, FX, 84);
      const tip = strip(svg, 516, 736);
      const angle = (t) => {
        const flip = ob(seg(t, D(6) - 0.55, D(6) - 0.1)), back = io(seg(t, 11.2, 11.9));
        let a = -18 + 36 * (flip - back);
        for (let i = 0; i < 7; i++) { const s = t - D(i) - 0.3; if (s > 0 && s < 0.7) a += Math.sin(s * 22) * 3 * (1 - s / 0.7); }
        return a;
      };
      return (t) => {
        if (t < lastT) pinned = -1; lastT = t;
        const a = angle(t), out = seg(t, 11.3, 11.9), n = [0, 0]; let last = -1;
        tf(flap, FX, FY, 1, a);
        pills.forEach((g, i) => {
          const d = D(i), dir = i === 6 ? 1 : -1, [sx, sy] = slot(i);
          const k1 = seg(t, d, d + 0.3), k2 = io(seg(t, d + 0.3, d + 0.6)), k3 = seg(t, d + 0.6, d + 1.1);
          const s = 0.55 + 0.45 * ob(k3), off = 22 * 0.55 + 9, ra = (a * Math.PI) / 180;
          const on = (k) => [FX + dir * 78 * k * Math.cos(ra) + off * Math.sin(ra), FY + dir * 78 * k * Math.sin(ra) - off * Math.cos(ra)];
          let [x, y] = on(k2);
          if (k1 < 1) y = lerp(118, y, k1 * k1);
          if (k3 > 0) { const [ex, ey] = on(1); x = lerp(ex, sx, oc(k3)); y = lerp(ey, sy, k3 * k3) - Math.sin(seg(t, d + 1.1, d + 1.45) * Math.PI) * 7; }
          tf(g, x, y, s * (1 - 0.5 * out), a * k1 * (1 - cl(k3 * 1.6)));
          g.setAttribute("opacity", t < d ? 0 : 1 - out);
          g.lastChild.previousSibling.setAttribute("stroke-width", pinned === i ? 4.5 : 3);
          if (t >= d + 1.1) { n[i === 6 ? 1 : 0]++; last = i; }
        });
        lab[0].textContent = `${n[0]} free and open source`; lab[1].textContent = `${n[1]} hosted`;
        lab[0].setAttribute("fill", n[0] ? INK : MUTE); lab[1].setAttribute("fill", n[1] ? INK : MUTE);
        const show = pinned >= 0 ? pinned : last;
        tip.textContent = show < 0 ? "Each one is best for a different job" : `${PICKS[show][0]}: ${PICKS[show][2]}`;
      };
    },
  };

  /* ---- 2. one command carries four parcels from OpenClaw to Hermes Agent ---- */
  SC.move = {
    dur: 11, still: 7.4,
    build(svg, api) {
      txt(svg, 44, 62, "The easiest move", { "font-size": 32, "font-weight": 700 });
      const top = 160, bot = 388, LX = 48, RX = 468, W = 284;
      const things = [["settings", SKY], ["memories", LIL], ["skills", MINT], ["API keys", YEL]];
      const at = (x0, i) => [x0 + 74 + (i % 2) * 136, i < 2 ? 270 : 346];
      el("path", { d: `M190 134 Q400 34 610 134`, stroke: INK, "stroke-width": 2, fill: "none", "stroke-dasharray": "2 12", "stroke-linecap": "round" }, svg);
      [[LX, "OpenClaw"], [RX, "Hermes Agent"]].forEach(([x, name]) => {
        bin(svg, x, W, top, bot).setAttribute("stroke-width", 4);
        el("path", { d: `M${x + 40} ${bot + 2} v10 M${x + W - 40} ${bot + 2} v10`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
        txt(svg, x + 4, 432, name, { "font-size": 24, "font-weight": 700 });
        el("rect", { x: x + W - 76, y: 408, width: 76, height: 34, rx: 17, fill: MINT, stroke: INK, "stroke-width": 2 }, svg);
        txt(svg, x + W - 38, 432, "MIT", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        things.forEach((_, i) => { const [cx, cy] = at(x, i); el("rect", { x: cx - 62, y: cy - 32, width: 124, height: 64, rx: 12, fill: "none", stroke: "#C9BDD8", "stroke-width": 2, "stroke-dasharray": "5 6" }, svg); });
      });
      const box = (name, col, ghost) => {
        const g = el("g", {}, svg);
        el("rect", Object.assign({ x: -62, y: -32, width: 124, height: 64, rx: 12, fill: ghost ? "#fff" : col, stroke: INK, "stroke-width": ghost ? 2.5 : 3 }, ghost ? { "stroke-dasharray": "6 6" } : {}), g);
        if (!ghost) el("rect", { x: -13, y: -32, width: 26, height: 12, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        txt(g, 0, ghost ? 7 : 13, name, { "text-anchor": "middle", "font-size": 20, fill: ghost ? MUTE : INK });
        return g;
      };
      const solid = things.map(([n, c]) => box(n, c)), ghosts = things.map(([n, c]) => box(n, c, true));
      const tick = el("g", {}, svg);
      el("circle", { r: 24, fill: MINT, stroke: INK, "stroke-width": 3 }, tick);
      el("path", { d: "M-10 1 L-3 8 L11 -8", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
      const cmd = el("g", {}, svg);
      el("rect", { x: -145, y: -26, width: 290, height: 52, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, cmd);
      txt(cmd, 0, 7, "hermes claw migrate", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      let dry = -99;
      const btn = el("g", {}, svg);
      el("rect", { x: 473, y: 457, width: 160, height: 62, rx: 31, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, btn);
      el("rect", { x: 478, y: 462, width: 150, height: 52, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-dasharray": "7 6" }, btn);
      txt(btn, 553, 495, "--dry-run", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      button(btn, "--dry-run: preview the import first", () => { dry = api.now(); api.poke(); });
      const cap = strip(svg, 534, 700);
      const fly = (g, i, k, sc = 1) => {
        const [sx, sy] = at(LX, i), [dx, dy] = at(RX, i), m = io(k);
        tf(g, lerp(sx, dx, m), lerp(sy, dy, m) - Math.sin(Math.PI * m) * (sy - 122), sc, Math.sin(Math.PI * m) * (i % 2 ? 9 : -9));
      };
      const D = (i) => 1.4 + i * 1.1;
      return (t, now) => {
        const s = now - dry, on = s >= 0 && s < 4.2;
        if (!on && dry > 0) { dry = -99; api.seek(0); return; }
        const tt = on ? 0 : t, back = on ? 0 : io(seg(t, 10.2, 10.9));
        let done = 0;
        solid.forEach((g, i) => {
          const k = seg(tt, D(i), D(i) + 0.9) - back, land = Math.sin(seg(tt, D(i) + 0.9, D(i) + 1.25) * Math.PI);
          fly(g, i, k, 1 + 0.08 * land); if (k >= 1) done++;
        });
        ghosts.forEach((g, i) => { const k = on ? seg(s, 0.3 + i * 0.35, 1.2 + i * 0.35) : 0; fly(g, i, k); g.setAttribute("opacity", on && k > 0 ? 1 - seg(s, 3.6, 4.1) : 0); });
        const press = on ? 0 : Math.sin(seg(tt, 0.9, 1.3) * Math.PI);
        tf(cmd, 317, 488, 1 - 0.08 * press);
        btn.firstChild.nextSibling.setAttribute("fill", on ? SKY : "#fff");
        const tk = on ? 0 : ob(seg(tt, 5.9, 6.3)) * (1 - seg(tt, 10.2, 10.6));
        tf(tick, 740, 160, tk); tick.setAttribute("opacity", tk > 0.01 ? 1 : 0);
        cap.textContent = on ? "--dry-run previews the import first" : done === 4 ? "Imported: settings, memories, skills and API keys" : tt > 1 && done < 4 && back === 0 ? "It imports your settings, memories, skills and API keys" : "One command moves an OpenClaw setup to Hermes Agent";
      };
    },
  };

  /* ---- 3. price tags on a line flip over: seven say Free, one says $20 ---- */
  SC.tags = {
    dur: 11, still: 7,
    build(svg, api) {
      txt(svg, 44, 62, "What it costs to start", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap the Claude tag", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const names = ["OpenClaw", "Hermes Agent", "Munder Difflin", "NanoClaw", "ZeroClaw", "nanobot", "Goose", "Claude"];
      const lines = [112, 296], xs = [112, 304, 496, 688];
      lines.forEach((y) => el("path", { d: `M24 ${y} Q400 ${y + 18} 776 ${y}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, svg));
      let max = false, flipAt = -9;
      const tags = names.map((name, i) => {
        const x = xs[i % 4], u = (x - 24) / 752, y = lines[i < 4 ? 0 : 1] + 2 * u * (1 - u) * 18, paid = i === 7;
        const g = el("g", {}, svg), card = el("g", {}, g);
        el("path", { d: "M0 0 V30", stroke: INK, "stroke-width": 2.5 }, card);
        if (paid) el("path", { d: "M-91 40 L-63 13 H63 L91 40 V140 Q91 157 74 157 H-74 Q-91 157 -91 140 Z", fill: "none", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round", class: "mg-ring" }, card);
        const body = el("path", { d: "M-86 42 L-60 18 H60 L86 42 V140 Q86 152 74 152 H-74 Q-86 152 -86 140 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, card);
        el("circle", { cx: 0, cy: 34, r: 5.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, card);
        const nm = txt(card, 0, 76, name, { "text-anchor": "middle", "font-size": 20 });
        const pr = txt(card, 0, paid ? 112 : 122, "?", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
        const sub = txt(card, 0, 138, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
        el("rect", { x: -7, y: -12, width: 14, height: 24, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
        if (paid) button(g, "Claude: switch between Pro and Max", () => { max = !max; flipAt = api.now(); api.poke(); });
        return { g, card, body, nm, pr, sub, x, y, paid, d: 1 + i * 0.6 };
      });
      const cap = strip(svg, 500, 560); cap.textContent = "The software costs nothing. The model does.";
      return (t, now) => {
        tags.forEach((o, i) => {
          const k = seg(t, o.d, o.d + 0.5) - seg(t, 10.2, 10.7), s = t - o.d;
          let sx = Math.abs(Math.cos(Math.PI * k)), up = k > 0.5, showMax = max;
          if (o.paid) { const kk = seg(now, flipAt, flipAt + 0.5); sx *= Math.abs(Math.cos(Math.PI * kk)); if (kk < 0.5) showMax = !max; }
          const swing = (s > 0 ? Math.sin(s * 7) * 9 * Math.exp(-s * 1.5) : 0) + Math.sin(now * 1.3 + i * 1.7) * 1.2;
          tf(o.g, o.x, o.y, 1, swing);
          o.card.setAttribute("transform", `scale(${Math.max(sx, 0.02)} 1)`);
          o.body.setAttribute("fill", !up ? SOFT : o.paid ? YEL : MINT);
          o.pr.setAttribute("fill", up ? INK : MUTE);
          if (o.paid) {
            o.nm.textContent = !up ? "Claude" : showMax ? "Claude Max" : "Claude Pro";
            o.pr.textContent = !up ? "?" : showMax ? "From $100" : "$20";
            o.pr.setAttribute("font-size", up && showMax ? 28 : 32); o.pr.setAttribute("y", up && showMax ? 120 : up ? 112 : 122);
            o.sub.textContent = up && !showMax ? "a month" : "";
          } else o.pr.textContent = up ? "Free" : "?";
        });
      };
    },
  };

  /* ---- 4. two switches, the job then whose computer, and the pick pops out ---- */
  SC.switches = {
    dur: 12, still: 6,
    build(svg, api) {
      const P = 4;
      txt(svg, 44, 62, "Two switches, one pick", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap to flip", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const combos = [
        { a: 0, b: 0, dim: 0, pick: "Hermes Agent", col: LIL, why: "OpenClaw's job with a learning loop and an import command" },
        { a: 1, b: 0, dim: 0, pick: "Munder Difflin", col: YEL, why: "The work is code and you want several agents on it at once" },
        { a: 1, b: 1, dim: 1, pick: "Claude", col: SKY, why: "You would rather pay than host" },
      ];
      let cur = 0;
      const hit = el("g", {}, svg);
      el("rect", { x: 70, y: 96, width: 660, height: 238, rx: 28, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, hit);
      const sw = (y, head, l, r, col) => {
        const g = el("g", {}, hit);
        txt(g, 400, y - 46, head, { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
        const track = el("rect", { x: 290, y: y - 30, width: 220, height: 60, rx: 30, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const L = txt(g, 270, y + 8, l, { "text-anchor": "end", "font-size": 22 }), R = txt(g, 530, y + 8, r, { "font-size": 22 });
        const knob = el("g", {}, g);
        el("circle", { r: 23, fill: "#fff", stroke: INK, "stroke-width": 3 }, knob);
        el("path", { d: "M-6 -7 V7 M0 -7 V7 M6 -7 V7", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, knob);
        return (p, dim) => {
          tf(knob, 320 + 160 * p, y); g.setAttribute("opacity", 1 - 0.68 * dim);
          L.setAttribute("fill", p < 0.5 ? INK : MUTE); R.setAttribute("fill", p >= 0.5 ? INK : MUTE);
          L.setAttribute("font-weight", p < 0.5 ? 700 : 500); R.setAttribute("font-weight", p >= 0.5 ? 700 : 500);
        };
      };
      const s1 = sw(170, "first, the job", "chat assistant", "code", SKY), s2 = sw(288, "then, whose computer", "yours", "Anthropic's", MINT);
      button(hit, "Flip to the next combination", () => api.seek(((cur + 1) % 3) * P + 0.01));
      const chev = el("path", { d: "M-13 -7 L0 7 L13 -7", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const card = el("g", {}, svg);
      const shade = el("rect", { x: -190, y: -34, width: 400, height: 88, rx: 24, fill: YEL }, card);
      el("rect", { x: -200, y: -44, width: 400, height: 88, rx: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      const name = txt(card, 0, 14, "", { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
      const cap = strip(svg, 516, 720);
      return (t) => {
        const i = Math.floor(t / P) % 3, u = (t % P) / P, c = combos[i], p = combos[(i + 2) % 3];
        cur = i;
        const m1 = ob(seg(u, 0.02, 0.14)), m2 = ob(seg(u, 0.08, 0.2));
        s1(lerp(p.a, c.a, m1), lerp(p.dim, c.dim, seg(u, 0, 0.12))); s2(lerp(p.b, c.b, m2), 0);
        const pop = ob(seg(u, 0.22, 0.34)) * (1 - io(seg(u, 0.93, 1)));
        tf(card, 400, 424, Math.max(pop, 0)); card.setAttribute("opacity", pop > 0.02 ? 1 : 0);
        shade.setAttribute("fill", c.col); name.textContent = c.pick;
        tf(chev, 400, 350 + Math.sin(seg(u, 0.14, 0.3) * Math.PI) * 8);
        cap.textContent = pop > 0.02 ? c.why : "Pick by the job first, then by whose computer does the work";
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 64, 138, "OpenClaw", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 224, "alternatives", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 250 H500", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 306, "7 picks for chat, code and cloud", { "font-size": 25, "font-weight": 500, fill: MUTE });
      hopper(svg, 760, 70);
      const fl = el("g", {}, svg);
      el("rect", { x: -84, y: -7, width: 168, height: 14, rx: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, fl);
      el("circle", { r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, fl);
      tf(fl, 760, 246, 1, -18);
      tf(pill(svg, PICKS[6][0], PICKS[6][1]), 760, 178, 0.9);
      const spots = [[160, 392, -3], [356, 386, 2], [552, 392, -2], [748, 330, -14], [258, 452, 2], [454, 448, -2], [650, 452, 3]];
      [0, 1, 2, 3, 4, 5].forEach((i, j) => { const [x, y, r] = spots[j < 3 ? j : j + 1]; tf(pill(svg, PICKS[i][0], PICKS[i][1]), x, y, 1, r); });
      el("path", { d: "M48 492 H848", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
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
