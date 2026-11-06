/* Bright coded scenes for "Windsurf alternatives". Vanilla JS, no library.
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
  /* shrink a line to a width if the font runs wide */
  const fit = (n, max) => {
    n.removeAttribute("textLength"); n.removeAttribute("lengthAdjust");
    let w = 0; try { w = n.getComputedTextLength(); } catch (e) { w = 0; }
    if (w > max) { n.setAttribute("textLength", max); n.setAttribute("lengthAdjust", "spacingAndGlyphs"); }
  };
  const say = (n, s, max) => { if (n.textContent !== s) { n.textContent = s; fit(n, max); } };
  /* a flip that turns over in 0.4 s, or at once under reduced motion */
  const flipper = (api) => {
    let on = false, at = -99;
    return {
      toggle() { on = !on; at = api.now(); api.hold(0.5); },
      read(now) { const f = api.calm ? 1 : seg(now - at, 0, 0.4); return { side: f < 0.5 ? !on : on, sx: Math.max(0.02, Math.abs(Math.cos(Math.PI * f))) }; },
      get on() { return on; },
    };
  };

  const SC = {};

  /* ---- 1. the badge on the lanyard swaps its card ---- */
  SC.badge = {
    dur: 9, still: 9,
    build(svg, api) {
      el("path", { d: "M330 -20 L400 112 L470 -20", stroke: INK, "stroke-width": 36, fill: "none", "stroke-linejoin": "round" }, svg);
      el("path", { d: "M330 -20 L400 112 L470 -20", stroke: BLUE, "stroke-width": 30, fill: "none", "stroke-linejoin": "round" }, svg);
      el("path", { d: "M330 -20 L400 112 L470 -20", stroke: "#fff", "stroke-width": 2, fill: "none", "stroke-dasharray": "6 8", "stroke-linejoin": "round" }, svg);
      const badge = el("g", {}, svg);
      el("circle", { cx: 400, cy: 122, r: 13, fill: "none", stroke: INK, "stroke-width": 5 }, badge);
      el("rect", { x: 386, y: 130, width: 28, height: 44, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 3 }, badge);
      el("rect", { x: 206, y: 158, width: 388, height: 404, rx: 34, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 7", class: "mg-ring" }, badge);
      el("rect", { x: 220, y: 172, width: 360, height: 376, rx: 24, fill: SOFT, stroke: INK, "stroke-width": 3 }, badge);
      el("rect", { x: 368, y: 184, width: 64, height: 12, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, badge);
      const card = (band) => {
        const g = el("g", {}, badge);
        el("rect", { x: 250, y: 205, width: 300, height: 322, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M251.5 270 V221 Q251.5 206.5 266 206.5 H534 Q548.5 206.5 548.5 221 V270 Z", fill: band }, g);
        el("path", { d: "M251.5 270 H548.5", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: 372, y: 226, width: 56, height: 12, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        return g;
      };
      const old = card(LIL);
      fit(txt(old, 400, 412, "Windsurf", { "text-anchor": "middle", "font-family": MONO, "font-size": 44, "font-weight": 700 }), 260);
      const neu = card(YEL);
      fit(txt(neu, 400, 352, "Devin Desktop", { "text-anchor": "middle", "font-family": MONO, "font-size": 34, "font-weight": 700 }), 264);
      el("path", { d: "M330 378 H470", stroke: SOFT, "stroke-width": 6, "stroke-linecap": "round" }, neu);
      fit(txt(neu, 400, 426, "June 2, 2026", { "text-anchor": "middle", "font-size": 28, "font-weight": 600 }), 260);
      fit(txt(neu, 400, 470, "Cognition", { "text-anchor": "middle", "font-size": 24, "font-weight": 500, fill: MUTE }), 260);
      el("path", { d: "M220 262 H350 A50 50 0 0 0 450 262 H580 V524 Q580 548 556 548 H244 Q220 548 220 524 Z", fill: SKY, "fill-opacity": 0.22, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, badge);
      el("path", { d: "M520 516 L548 488 M540 530 L560 510", stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round", opacity: 0.9 }, badge);
      const spark = Array.from({ length: 8 }, (_, i) => el("path", { d: "M0 0 H22", stroke: [YEL, MINT, LIL, SKY][i % 4], "stroke-width": 6, "stroke-linecap": "round" }, svg));
      let peek = -99;
      button(badge, "Badge: show the old Windsurf card for a moment", () => { peek = api.now(); api.hold(2.9); });
      return (t, now) => {
        let oy = -640 * io(seg(t, 1.4, 2.6)), ny = -640 * (1 - oc(seg(t, 2.8, 3.9)));
        const p = now - peek;
        if (p >= 0 && p < 2.8) {
          if (api.calm) { oy = p < 2.2 ? 0 : -640; ny = p < 2.2 ? -640 : 0; }
          else { ny = -640 * (io(seg(p, 0, 0.4)) - io(seg(p, 2.3, 2.7))); oy = -640 * (1 - io(seg(p, 0.4, 0.8)) + io(seg(p, 1.9, 2.3))); }
        }
        old.setAttribute("transform", `translate(0 ${oy})`); neu.setAttribute("transform", `translate(0 ${ny})`);
        const land = Math.sin(seg(t, 3.9, 4.6) * Math.PI);
        badge.setAttribute("transform", `rotate(${(Math.sin(t * 1.8) * 1.6 + land * 2) * (1 - seg(t, 6.5, 8.5))} 400 122)`);
        const c = seg(t, 3.85, 4.7);
        spark.forEach((n, i) => { const a = (i / 8) * 6.283 + 0.2, r = 232 + 46 * oc(c); n.setAttribute("transform", `translate(${400 + Math.cos(a) * r * 0.86} ${360 + Math.sin(a) * r * 0.92}) rotate(${(a * 180) / Math.PI})`); n.setAttribute("opacity", c > 0 && c < 1 ? 1 - c : 0); });
      };
    },
  };

  /* ---- 2. pancakes stack up, each with a price flag ---- */
  SC.pancakes = {
    dur: 9, still: 9,
    build(svg, api) {
      const FLIP = "Checked 6 Nov 2026";
      const fl = flipper(api), flags = [];
      const pancake = (g, x, y, w) => {
        el("rect", { x, y, width: w, height: 30, rx: 15, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${x + 24} ${y + 9} H${x + w - 70}`, stroke: "#fff", "stroke-width": 3.5, "stroke-linecap": "round", opacity: 0.85 }, g);
      };
      const flag = (g, px, top, base, w, h, lines) => {
        el("path", { d: `M${px} ${top - 4} V${base}`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g);
        el("circle", { cx: px, cy: top - 6, r: 5, fill: INK }, g);
        const f = el("g", {}, g), body = el("g", {}, f);
        el("rect", { x: 0, y: 0, width: w, height: h, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, body);
        const a = lines.map((s, i) => { const n = txt(body, 14, lines.length > 1 ? 31 + i * 28 : h / 2 + 8, s, { "font-size": i ? 19 : 21, "font-weight": i ? 500 : 600, fill: i ? MUTE : INK }); fit(n, w - 26); return n; });
        const b = txt(body, 14, h / 2 + 8, FLIP, { "font-size": 20, "font-weight": 600, fill: INK }); fit(b, w - 26);
        flags.push({ f, a, b, px, top });
        return f;
      };
      const stack = el("g", {}, svg);
      el("rect", { x: 80, y: 360, width: 340, height: 148, rx: 26, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 7", class: "mg-ring" }, stack);
      el("ellipse", { cx: 250, cy: 478, rx: 160, ry: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, stack);
      el("ellipse", { cx: 250, cy: 476, rx: 118, ry: 13, fill: SOFT, stroke: INK, "stroke-width": 1.5 }, stack);
      const P1 = [["Free $0", 440, 280, 280], ["Pro $20 a month", 410, 215, 210], ["Max $200 a month", 380, 150, 140]];
      const cakes = P1.map(([s, y, px, top]) => { const g = el("g", {}, stack); const f = flag(g, px, top, y + 24, 230, 50, [s]); pancake(g, 140, y, 220); return { g, f }; });
      const plate2 = el("g", {}, svg);
      el("ellipse", { cx: 610, cy: 478, rx: 135, ry: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, plate2);
      el("ellipse", { cx: 610, cy: 476, rx: 98, ry: 12, fill: SOFT, stroke: INK, "stroke-width": 1.5 }, plate2);
      const f2 = flag(plate2, 540, 150, 434, 244, 74, ["Teams $80 a month", "plus $40 per full seat"]);
      pancake(plate2, 515, 440, 190); pancake(plate2, 515, 410, 190);
      button(stack, "Pancake stack: flip every flag to the date the prices were checked", () => fl.toggle());
      return (t, now) => {
        cakes.forEach((c, i) => {
          const d = 0.5 + i * 0.9, fall = seg(t, d, d + 0.45), hop = Math.sin(seg(t, d + 0.45, d + 0.7) * Math.PI) * -10;
          c.g.setAttribute("transform", `translate(0 ${-560 * (1 - fall * fall) + hop})`);
          c.g.setAttribute("opacity", t >= d ? 1 : 0);
          c.pop = ob(seg(t, d + 0.5, d + 0.85));
        });
        plate2.setAttribute("transform", `translate(${360 * (1 - oc(seg(t, 3.7, 4.6)))} 0)`);
        const pops = cakes.map((c) => c.pop).concat([ob(seg(t, 4.7, 5.1))]);
        const r = fl.read(now);
        flags.forEach((g, i) => {
          const k = Math.max(0.001, pops[i]);
          g.f.setAttribute("transform", `translate(${g.px} ${g.top}) scale(${k * r.sx} ${k})`);
          g.a.forEach((n) => n.setAttribute("opacity", r.side ? 0 : 1)); g.b.setAttribute("opacity", r.side ? 1 : 0);
        });
      };
    },
  };

  /* ---- 3. a bento box opens on six picks ---- */
  SC.bento = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      const PICKS = [["Cursor", "Free $0, Premium $30"], ["Munder Difflin", "Free and open source"], ["Zed", "GPL 3.0, Pro $10"], ["GitHub Copilot", "Free $0, Pro $10"], ["Cline", "Apache 2.0"], ["Claude Code", "Pro from $17"]];
      const FILL = [SKY, MINT, LIL, MINT, LIL, SKY], Y = 130;
      el("rect", { x: 90, y: Y, width: 620, height: 380, rx: 28, fill: BLUE, stroke: INK, "stroke-width": 4 }, svg);
      const cells = PICKS.map((p, i) => {
        const c = i % 3, r = Math.floor(i / 3), x0 = 110 + c * 200, y0 = Y + 20 + r * 176;
        el("rect", { x: x0, y: y0, width: 188, height: 164, rx: 16, fill: FILL[i], stroke: INK, "stroke-width": 3 }, svg);
        el("path", { d: `M${x0 + 22} ${y0 + 140} H${x0 + 70} M${x0 + 120} ${y0 + 24} H${x0 + 166}`, stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round", opacity: 0.8 }, svg);
        return [x0 + 94, y0 + 84];
      });
      const cards = PICKS.map(([name, line], i) => {
        const g = el("g", {}, svg), flip = el("g", {}, g);
        el("rect", { x: -98, y: -44, width: 196, height: 88, rx: 18, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 6", class: "mg-ring" }, g);
        const face = el("rect", { x: -90, y: -34, width: 180, height: 68, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, flip);
        const a = txt(flip, 0, 7, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 }); fit(a, 156);
        const b = txt(flip, 0, 6, line, { "text-anchor": "middle", "font-size": 16, "font-weight": 600 }); fit(b, 162);
        const fl = flipper(api);
        button(g, `${name}: ${line}`, () => fl.toggle());
        return { g, flip, face, a, b, fl, x: cells[i][0], y: cells[i][1], d: 2.5 + i * 0.6 };
      });
      const lid = el("g", {}, svg);
      el("rect", { x: 84, y: Y - 10, width: 632, height: 400, rx: 30, fill: LIL, stroke: INK, "stroke-width": 4 }, lid);
      el("rect", { x: 370, y: Y - 10, width: 60, height: 400, fill: YEL, stroke: INK, "stroke-width": 3 }, lid);
      el("rect", { x: 84, y: Y + 160, width: 632, height: 60, fill: YEL, stroke: INK, "stroke-width": 3 }, lid);
      el("rect", { x: 84, y: Y - 10, width: 632, height: 400, rx: 30, fill: "none", stroke: INK, "stroke-width": 4 }, lid);
      return (t, now) => {
        const up = oc(seg(t, 0.8, 1.3)), away = io(seg(t, 1.3, 2.3));
        lid.setAttribute("transform", `translate(${120 * away} ${-36 * up - 560 * away}) rotate(${-5 * up + 10 * away} 400 ${Y + 190})`);
        lid.setAttribute("opacity", away >= 1 ? 0 : 1);
        cards.forEach((c) => {
          const k = ob(seg(t, c.d, c.d + 0.45));
          c.g.setAttribute("transform", `translate(${c.x} ${c.y + 18 * (1 - k)}) scale(${Math.max(0.001, k)})`);
          c.g.setAttribute("opacity", t >= c.d ? 1 : 0);
          const r = c.fl.read(now);
          c.flip.setAttribute("transform", `scale(${r.sx} 1)`);
          c.face.setAttribute("fill", r.side ? YEL : "#fff");
          c.a.setAttribute("opacity", r.side ? 0 : 1); c.b.setAttribute("opacity", r.side ? 1 : 0);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.6, still: 3.6,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 176, height: 40, rx: 20, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      fit(txt(svg, 152, 71, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }), 150);
      fit(txt(svg, 62, 168, "Windsurf alternatives", { "font-size": 72, "font-weight": 700 }), 832);
      fit(txt(svg, 64, 220, "6 picks now that Windsurf is Devin Desktop", { "font-size": 28, "font-weight": 500, fill: MUTE }), 832);
      fit(txt(svg, 64, 258, "Checked 6 Nov 2026", { "font-size": 20, "font-weight": 500, fill: "#6B5878" }), 400);
      el("rect", { x: 380, y: 298, width: 200, height: 52, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      fit(txt(svg, 480, 331, "Windsurf", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700, fill: MUTE }), 176);
      const NAMES = ["Cursor", "Munder Difflin", "Zed", "GitHub Copilot", "Cline", "Claude Code"], FILL = [SKY, MINT, LIL, MINT, LIL, SKY];
      const lines = el("path", { d: "M480 350 V384 M100 384 H860", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      const tiles = NAMES.map((s, i) => {
        const x = 28 + i * 152, g = el("g", {}, svg);
        el("path", { d: `M${x + 72} 384 V418`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        el("rect", { x, y: 418, width: 144, height: 60, rx: 14, fill: FILL[i], stroke: INK, "stroke-width": 2.5 }, g);
        fit(txt(g, x + 72, 454, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 }), 128);
        return g;
      });
      return (t) => {
        lines.setAttribute("opacity", oc(seg(t, 0.2, 0.5)));
        tiles.forEach((g, i) => { const k = oc(seg(t, 0.4 + i * 0.3, 0.9 + i * 0.3)); g.setAttribute("transform", `translate(0 ${60 * (1 - k)})`); g.setAttribute("opacity", k); });
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
    let off = 0, raf = 0, seen = frozen, held = calm || frozen, busy = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    const stillAt = frozen && !isNaN(fixed) ? fixed : sc.still;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? stillAt : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && (!held || clock() < busy)) raf = requestAnimationFrame(tick); };
    /* hold(s) redraws for s seconds without starting the loop, so a tap still animates on a held or frozen frame */
    const api = { now: clock, calm, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); }, hold: (s) => { busy = Math.max(busy, clock() + s); tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(stillAt, 0); return; }
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
