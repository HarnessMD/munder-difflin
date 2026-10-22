/* Bright coded scenes for "What is Claude Duet". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const LIL_SOFT = "#E6DCFF";
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
  const hint = (svg, s) => txt(svg, 756, 60, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  /* a rounded token sized to its label, drawn with its left edge at x = 0 */
  const pill = (p, label, fill, fs = 15, pad = 15) => {
    const g = el("g", {}, p);
    const r = el("rect", { x: 0, y: -17, height: 34, rx: 17, fill, stroke: INK, "stroke-width": 2.5 }, g);
    const t = txt(g, pad, 5.5, label, { "font-size": fs, "font-weight": 600 });
    const w = Math.ceil(t.getComputedTextLength()) + pad * 2;
    r.setAttribute("width", w);
    return { g, w };
  };

  const SC = {};

  /* ---- 1. the morning brief sorts itself into two trays ---- */
  SC.brief = {
    dur: 11, still: 11,
    build(svg, api) {
      txt(svg, 44, 62, "Morning brief", { "font-size": 32, "font-weight": 700 });
      hint(svg, "Tap a card");
      const tray = (x, fill, label) => {
        el("rect", { x, y: 196, width: 340, height: 262, rx: 22, fill, stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, x + 24, 234, label, { "font-size": 22, "font-weight": 700 });
      };
      tray(50, YEL, "Needs you"); tray(410, LIL_SOFT, "Can wait");
      const CARDS = [
        ["Invoice overdue", "Due today", 0, 0, BLUE], ["Meeting moved", "Clashes with a flight", 0, 1, SKY], ["Contract to sign", "Waiting on you", 0, 2, LIL],
        ["Newsletter", "No action", 1, 0, MINT], ["Receipt", "Filed", 1, 1, SOFT],
      ];
      const ORDER = [0, 3, 1, 4, 2];
      const reason = el("g", {}, svg);
      el("rect", { x: 140, y: 494, width: 520, height: 52, rx: 26, fill: SOFT }, reason);
      const rt = txt(reason, 400, 527, "", { "text-anchor": "middle", "font-size": 21, "font-weight": 500 });
      const rn = el("tspan", { fill: MUTE }, rt), rr = el("tspan", { "font-weight": 700 }, rt);
      let pinned = -1, lastT = 0;
      const cards = CARDS.map(([name, why, tr, slot, dot], i) => {
        const g = el("g", {}, svg);
        const sh = el("rect", { x: -150, y: -24, width: 300, height: 48, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 2.5, opacity: 0 }, g);
        const body = el("g", {}, g);
        el("rect", { x: -150, y: -24, width: 300, height: 48, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, body);
        el("circle", { cx: -124, cy: 0, r: 8, fill: dot, stroke: INK, "stroke-width": 2 }, body);
        txt(body, -106, 7, name, { "font-size": 20, "font-weight": 600 });
        el("rect", { x: -157, y: -31, width: 314, height: 62, rx: 20, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 5", class: "mg-ring" }, body);
        const pick = () => { if (pinned === i && lastT >= 6.3) return; pinned = i; if (lastT < 6.3) api.seek(6.3); else api.poke(); };
        button(g, `${name}: ${why}`, pick);
        g.addEventListener("focus", pick);
        return { g, body, sh, name, why, x: tr ? 580 : 220, y: 282 + slot * 60, start: 0.5 + ORDER.indexOf(i) * 1.15 };
      });
      return (t) => {
        if (t < lastT - 0.5) pinned = -1;
        lastT = t;
        cards.forEach((c) => {
          const d = oc(seg(t, c.start, c.start + 0.45)), m = io(seg(t, c.start + 0.7, c.start + 1.2));
          tf(c.g, 400 + (c.x - 400) * m, -40 + 168 * d + (c.y - 128) * m);
          c.g.setAttribute("opacity", seg(t, c.start, c.start + 0.15));
        });
        const up = pinned >= 0 ? pinned : t >= 6.9 ? 0 : -1;
        cards.forEach((c, i) => { const on = i === up; c.body.setAttribute("transform", on ? "translate(-5 -7)" : "translate(0 0)"); c.sh.setAttribute("opacity", on ? 1 : 0); });
        if (up >= 0) { rn.textContent = cards[up].name + ": "; rr.textContent = cards[up].why; }
        reason.setAttribute("opacity", up >= 0 ? 1 : 0);
      };
    },
  };

  /* ---- 2. three lanes: free, gated, walled ---- */
  SC.gate = {
    dur: 14, still: 14,
    build(svg, api) {
      hint(svg, "Tap Approve");
      const Y = [140, 290, 440], GX = 676;
      el("rect", { x: 40, y: Y[0] - 30, width: 720, height: 60, rx: 30, fill: SOFT }, svg);
      el("rect", { x: 40, y: Y[1] - 30, width: 720, height: 60, rx: 30, fill: SOFT }, svg);
      el("rect", { x: 40, y: Y[2] - 30, width: GX - 30, height: 60, rx: 30, fill: SOFT }, svg);
      txt(svg, 48, Y[0] - 44, "Works on its own", { "font-size": 20, "font-weight": 700 });
      txt(svg, GX, Y[1] - 60, "Your approval", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, GX, Y[2] - 56, "Off limits", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const tokens = (labels, fill, fs, pad) => labels.map((s) => pill(svg, s, fill, fs, pad));
      // first listed token leads, so it ends up nearest the right
      const right = (ts, edge, gap) => { let x = edge; return ts.map((k) => { x -= k.w; const at = x; x -= gap; return at; }); };
      const top = tokens(["Read", "Draft", "Prepare"], MINT), topAt = right(top, 748, 10);
      const mid = tokens(["Send a message", "Make a payment", "Sign a document", "Delete anything"], SKY, 14, 12), GAP = 7;
      const midAt = right(mid, GX - 20, GAP);
      const bot = tokens(["Move money", "Trade securities"], "#fff"), botAt = right(bot, GX - 18, 8);
      const gate = el("g", {}, svg);
      el("rect", { x: GX - 10, y: Y[1] - 40, width: 20, height: 80, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, gate);
      el("path", { d: `M${GX - 10} ${Y[1] - 14} H${GX + 10} M${GX - 10} ${Y[1] + 14} H${GX + 10}`, stroke: INK, "stroke-width": 2.5 }, gate);
      el("circle", { cx: GX, cy: Y[1] - 40, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      const wall = el("rect", { x: GX - 14, y: Y[2] - 46, width: 28, height: 92, rx: 5, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      let approved = [], lastT = 0;
      const btn = el("g", {}, svg);
      el("rect", { x: 586, y: 516, width: 150, height: 52, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, btn);
      el("rect", { x: 580, y: 510, width: 162, height: 64, rx: 32, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, btn);
      txt(btn, 661, 549, "Approve", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      button(btn, "Approve the first waiting action", () => {
        if (approved.length >= mid.length) approved = [];
        else approved.push(Math.max(api.now(), (approved.length ? approved[approved.length - 1] : -99) + 1.2));
        if (lastT < 6) api.seek(6); else api.poke();
      });
      return (t, now) => {
        if (t < lastT - 0.5) approved = [];
        lastT = t;
        top.forEach((k, i) => { const u = io(seg(t, 0.4 + i * 0.5, 2.2 + i * 0.5)); tf(k.g, -k.w + (topAt[i] + k.w) * u, Y[0]); });
        const s = approved.map((a) => (api.calm ? 9 : now - a));
        const shift = (j) => { let d = 0; for (let i = 0; i < Math.min(j, s.length); i++) d += (mid[i].w + GAP) * io(seg(s[i], 0.6, 1.3)); return d; };
        mid.forEach((k, j) => {
          const enter = io(seg(t, 0.9 + j * 0.6, 2.7 + j * 0.6)), base = -k.w + (midAt[j] + k.w) * enter + shift(j);
          let x = base, op = 1;
          if (j < s.length) { x = base + (820 - base) * io(seg(s[j], 0.3, 1.4)); op = 1 - seg(s[j], 1.0, 1.4); }
          tf(k.g, x, Y[1]); k.g.setAttribute("opacity", op);
        });
        let open = 0;
        s.forEach((v) => { open = Math.max(open, oc(seg(v, 0, 0.35)) * (1 - io(seg(v, 1.3, 1.7)))); });
        const top0 = Y[1] - 40;
        gate.setAttribute("transform", `translate(0 ${top0}) scale(1 ${1 - 0.86 * open}) translate(0 ${-top0})`);
        const u = seg(t, 2.6, 4.0), D = botAt[0] + 34 + bot[0].w, back = 34 * ob(seg(t, 4.0, 4.9));
        bot.forEach((k, i) => tf(k.g, botAt[i] + 34 - (t < 4.0 ? D * (1 - u * u) : back), Y[2]));
        const hit = seg(t, 4.0, 4.6);
        wall.setAttribute("transform", `translate(${hit > 0 && hit < 1 ? Math.sin(hit * Math.PI * 4) * 3 * (1 - hit) : 0} 0)`);
      };
    },
  };

  /* ---- 3. one usage bar shared by chats, background checks and large tasks ---- */
  SC.meter = {
    dur: 11, still: 11,
    build(svg) {
      txt(svg, 60, 112, "Your plan's usage limits", { "font-size": 30, "font-weight": 700 });
      const B = { x: 60, y: 136, w: 680, h: 84 };
      const defs = el("defs", {}, svg), cp = el("clipPath", { id: "mg-duet-bar" }, defs);
      el("rect", { x: B.x, y: B.y, width: B.w, height: B.h, rx: 20 }, cp);
      el("rect", { x: B.x, y: B.y, width: B.w, height: B.h, rx: 20, fill: "#fff" }, svg);
      const bar = el("g", { "clip-path": "url(#mg-duet-bar)" }, svg);
      const CH = 204, SB = 40.8, LG = 149.6;
      const chats = el("rect", { x: B.x - 3, y: B.y - 3, width: 0, height: B.h + 6, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, bar);
      const skies = [0, 1, 2, 3].map((i) => el("rect", { x: B.x + CH + i * SB, y: B.y - 3, width: SB, height: B.h + 6, fill: SKY, stroke: INK, "stroke-width": 2.5, opacity: 0 }, bar));
      const big = el("g", {}, bar);
      el("rect", { x: 0, y: B.y - 3, width: LG, height: B.h + 6, fill: LIL, stroke: INK, "stroke-width": 2.5 }, big);
      txt(big, LG / 2, B.y + B.h / 2 + 6.5, "Large tasks", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      el("rect", { x: B.x, y: B.y, width: B.w, height: B.h, rx: 20, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      [[BLUE, "Chats"], [SKY, "Background checks"], [LIL, "Large tasks"]].forEach(([c, s], i) => {
        el("rect", { x: 60, y: 286 + i * 52, width: 26, height: 26, rx: 7, fill: c, stroke: INK, "stroke-width": 2.5 }, svg);
        txt(svg, 100, 306 + i * 52, s, { "font-size": 22, "font-weight": 500 });
      });
      const C = [590, 396], R = 66;
      const pulse = el("circle", { cx: C[0], cy: C[1], r: R, fill: "none", stroke: SKY, "stroke-width": 6, opacity: 0 }, svg);
      el("circle", { cx: C[0], cy: C[1], r: R, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, r1 = i % 3 ? 54 : 48; el("path", { d: `M${C[0] + Math.cos(a) * r1} ${C[1] + Math.sin(a) * r1} L${C[0] + Math.cos(a) * 58} ${C[1] + Math.sin(a) * 58}`, stroke: INK, "stroke-width": i % 3 ? 2 : 3.5, "stroke-linecap": "round" }, svg); }
      const hand = el("path", { d: "M0 6 V-40", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      el("circle", { cx: C[0], cy: C[1], r: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, C[0], C[1] + R + 40, "Every few hours", { "text-anchor": "middle", "font-size": 21, "font-weight": 600 });
      const TK = [2.6, 3.6, 4.6, 5.6];
      const fly = TK.map(() => el("rect", { x: -SB / 2, y: -B.h / 2, width: SB, height: B.h, rx: 6, fill: SKY, stroke: INK, "stroke-width": 2.5, opacity: 0 }, svg));
      return (t) => {
        chats.setAttribute("width", 3 + CH * oc(seg(t, 0.6, 2.0)));
        let turns = 0, pl = 0;
        TK.forEach((k, i) => {
          turns += ob(seg(t, k, k + 0.3)); const p = seg(t, k, k + 0.6); if (p > 0 && p < 1) pl = p;
          const f = seg(t, k + 0.05, k + 0.8), e = io(f), tx = B.x + CH + i * SB + SB / 2, ty = B.y + B.h / 2;
          const x = C[0] + (tx - C[0]) * e, y = C[1] + (ty - C[1]) * e - Math.sin(f * Math.PI) * 60;
          tf(fly[i], x, y, 0.35 + 0.65 * e);
          fly[i].setAttribute("opacity", f > 0 && f < 1 ? 1 : 0);
          skies[i].setAttribute("opacity", f >= 1 ? 1 : 0);
        });
        tf(hand, C[0], C[1], 1, turns * 60);
        pulse.setAttribute("r", R + 22 * pl); pulse.setAttribute("opacity", pl > 0 ? 1 - pl : 0);
        const b = oc(seg(t, 6.6, 7.7)), at = B.x + CH + 4 * SB;
        big.setAttribute("transform", `translate(${B.x + B.w + 10 + (at - B.x - B.w - 10) * b} 0)`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 7, still: 7,
    build(svg) {
      el("rect", { x: 64, y: 62, width: 112, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 120, 89, "Launch", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 60, 200, "Claude Duet", { "font-size": 84, "font-weight": 700 });
      el("path", { d: "M66 228 H340", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 286, "Anthropic's proactive agent app", { "font-size": 28, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 476, "Checked 22 Oct 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });
      const defs = el("defs", {}, svg), cp = el("clipPath", { id: "mg-duet-sky" }, defs);
      el("rect", { x: 0, y: 0, width: 960, height: 452 }, cp);
      const sky = el("g", { "clip-path": "url(#mg-duet-sky)" }, svg), sun = el("g", {}, sky), rays = el("g", {}, sun);
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; el("path", { d: `M${Math.cos(a) * 126} ${Math.sin(a) * 126} L${Math.cos(a) * 146} ${Math.sin(a) * 146}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, rays); }
      el("circle", { r: 108, fill: YEL, stroke: INK, "stroke-width": 3 }, sun);
      el("path", { d: "M560 452 H916", stroke: SOFT, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      el("path", { d: "M560 452 H916", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      const cards = [[BLUE, -15], [MINT, 15], [LIL, 0]].map(([c, r]) => {
        const g = el("g", {}, svg);
        el("rect", { x: -84, y: -118, width: 168, height: 118, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("circle", { cx: -56, cy: -88, r: 11, fill: c, stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -36, y: -94, width: 96, height: 12, rx: 6, fill: SOFT }, g);
        el("rect", { x: -62, y: -62, width: 124, height: 10, rx: 5, fill: SOFT }, g);
        el("rect", { x: -62, y: -40, width: 90, height: 10, rx: 5, fill: SOFT }, g);
        return { g, r };
      });
      const bell = el("g", {}, svg);
      el("path", { d: "M0 -12 V4", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, bell);
      el("circle", { cx: 0, cy: 54, r: 7, fill: INK }, bell);
      el("path", { d: "M-30 46 Q-28 6 0 4 Q28 6 30 46 L36 52 H-36 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bell);
      const ring = el("g", { opacity: 0 }, svg);
      el("path", { d: "M-50 16 Q-60 32 -50 48 M50 16 Q60 32 50 48", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, ring);
      tf(ring, 870, 96);
      return (t) => {
        tf(sun, 740, 600 - 262 * oc(seg(t, 0.2, 2.6)));
        rays.setAttribute("opacity", seg(t, 2.0, 2.8));
        const f = ob(seg(t, 2.2, 3.4));
        cards.forEach((c) => tf(c.g, 740 + c.r * 2.6 * f, 446, 1, c.r * f));
        const b = seg(t, 3.6, 5.6), amp = b > 0 && b < 1 ? Math.sin(b * Math.PI * 5) * 24 * (1 - b) : 0;
        tf(bell, 870, 96, 1, amp);
        ring.setAttribute("opacity", cl(Math.abs(amp) / 10));
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
    // with reduced motion a tap redraws the still frame with the new choice instead of starting playback
    const api = { now: clock, calm, seek: (s) => { if (calm) return frame(); off = s - clock(); held = false; tick(); }, poke: () => { if (calm) return frame(); held = false; tick(); } };
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
