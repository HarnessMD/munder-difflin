/* Bright coded scenes for "Turnstone alternatives". Vanilla JS, no library.
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
  const hit = (g, x, y, w, h, r = 22) => {
    el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0 }, g);
    el("rect", { x: x + 4, y: y + 4, width: w - 8, height: h - 8, rx: r, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, g);
  };

  const SC = {};

  /* ---- 1. one flashlight, three plan batteries, the beam stays lit ---- */
  SC.flashlight = {
    dur: 10, still: 9.2,
    build(svg, api) {
      const BAT = [["ChatGPT plan", BLUE], ["Claude plan", LIL], ["Grok plan", MINT]];
      const beam = el("g", {}, svg);
      el("path", { d: "M248 168 L552 168 L790 -10 L10 -10 Z", fill: YEL, "fill-opacity": 0.3 }, beam);
      [-1, 1].forEach((s) => el("path", { d: `M${400 + s * 150} 168 L${400 + s * 360} 12`, stroke: YEL, "stroke-width": 5, "stroke-linecap": "round" }, beam));
      txt(beam, 400, 104, "Same Agent", { "text-anchor": "middle", "font-size": 52, "font-weight": 700 });
      const fl = el("g", {}, svg);
      hit(fl, 222, 148, 356, 446);
      el("rect", { x: 300, y: 552, width: 200, height: 30, rx: 9, fill: SKY, stroke: INK, "stroke-width": 3 }, fl);
      el("rect", { x: 512, y: 300, width: 20, height: 48, rx: 7, fill: SKY, stroke: INK, "stroke-width": 2.5 }, fl);
      el("rect", { x: 280, y: 242, width: 240, height: 318, rx: 20, fill: YEL, stroke: INK, "stroke-width": 3 }, fl);
      el("path", { d: "M240 172 H560 L520 244 H280 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, fl);
      el("rect", { x: 236, y: 160, width: 328, height: 16, rx: 8, fill: SKY, stroke: INK, "stroke-width": 3 }, fl);
      el("rect", { x: 300, y: 262, width: 200, height: 280, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, fl);
      const bats = BAT.map(([name, col]) => {
        const g = el("g", {}, fl);
        el("rect", { x: -18, y: -46, width: 36, height: 10, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -88, y: -38, width: 176, height: 76, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        const ch = el("rect", { x: -84, y: -34, width: 168, height: 68, rx: 9, fill: col }, g);
        txt(g, 0, 7, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return { g, ch };
      });
      const DR = [[1.2, 3.0], [4.6, 6.4]], SW = [3.1, 6.7];
      const place = (t) => {
        let order = [0, 1, 2]; const ys = [0, 1, 2], xs = [0, 0, 0];
        for (const st of SW) {
          const s = seg(t, st, st + 1.3); if (s <= 0) break;
          const mover = order[0], next = order.slice(1).concat(mover), m = io(seg(s, 0.3, 0.7));
          order.forEach((b, i) => { ys[b] = i + (next.indexOf(b) - i) * m; });
          xs[mover] = -250 * (s < 0.3 ? io(s / 0.3) : s < 0.7 ? 1 : 1 - io((s - 0.7) / 0.3));
          if (s < 1) break;
          order = next;
        }
        return { ys, xs };
      };
      let cur = 0;
      button(fl, "Flashlight: drain the current battery so the next one takes over", () => api.seek(cur < 1.2 ? 1.2 : cur < 4.6 ? 4.6 : 0.4));
      return (t) => {
        cur = t;
        const { ys, xs } = place(t), fade = t > 9.5 ? 1 - seg(t, 9.5, 9.95) : seg(t, 0, 0.35);
        bats.forEach((b, i) => {
          const c = i < 2 ? 1 - seg(t, DR[i][0], DR[i][1]) : 1;
          b.ch.setAttribute("width", 168 * c); b.ch.setAttribute("opacity", cl(c * 4));
          tf(b.g, 400 + xs[i], 312 + 86 * ys[i]); b.g.setAttribute("opacity", fade);
        });
      };
    },
  };

  /* ---- 2. two envelopes, two price cards ---- */
  SC.envelopes = {
    dur: 9, still: 7.4,
    build(svg, api) {
      const E = [["Turnstone for Mac", "$0 forever", false], ["Cloud", "$49 a month", true]];
      const tapAt = [-99, -99];
      const envs = E.map(([name, price, soon], i) => {
        const x0 = 60 + i * 360, w = 320, cx = x0 + 160, g = el("g", {}, svg);
        hit(g, x0 - 14, 70, w + 28, 470);
        el("path", { d: `M${x0} 302 L${cx} 222 L${x0 + w} 302 Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const card = el("g", {}, g);
        el("rect", { x: x0 + 24, y: 0, width: w - 48, height: 190, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, card);
        txt(card, cx, 76, price, { "text-anchor": "middle", "font-size": 42, "font-weight": 700 });
        const tag = el("g", {}, card);
        if (soon) {
          el("rect", { x: cx - 76, y: 102, width: 152, height: 38, rx: 19, fill: LIL, stroke: INK, "stroke-width": 2.5 }, tag);
          txt(tag, cx, 128, "Coming soon", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
        }
        el("rect", { x: x0, y: 300, width: w, height: 210, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${x0 + 3} 303 L${cx} 398 L${x0 + w - 3} 303`, fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("rect", { x: cx - 140, y: 426, width: 280, height: 56, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, cx, 463, name, { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
        button(g, `${name} envelope: ${price}${soon ? ", Coming soon" : ""}`, () => { tapAt[i] = api.now(); api.poke(); });
        return { card, tag };
      });
      return (t, now) => {
        const tuck = 1 - io(seg(t, 8.2, 8.9));
        envs.forEach((e, i) => {
          let p = ob(seg(t, 0.5 + i, 1.4 + i)) * tuck;
          const d = now - tapAt[i];
          if (d >= 0 && d < 1.3) p = d < 0.45 ? 1 - io(d / 0.45) : ob(seg(d, 0.45, 1.3));
          tf(e.card, 0, 312 - 184 * p);
          e.tag.setAttribute("opacity", oc(seg(t, 2.3, 2.7)));
        });
      };
    },
  };

  /* ---- 3. an egg carton of platforms ---- */
  SC.eggcarton = {
    dur: 7, still: 6.5,
    build(svg, api) {
      const CUPS = [["Mac app", 145, 250, 2], ["Cloud", 315, 250, 1], ["iPhone app", 485, 250, 1], ["Web app", 655, 250, 1], ["Windows", 230, 440, 0], ["Linux", 400, 440, 0], ["Android", 570, 440, 0]];
      const g = el("g", {}, svg);
      hit(g, 36, 84, 728, 486, 38);
      el("rect", { x: 50, y: 98, width: 700, height: 458, rx: 34, fill: SKY, stroke: INK, "stroke-width": 3 }, g);
      const EGG = "M0 -90 C26 -90 40 -42 40 -26 C40 -4 22 6 0 6 C-22 6 -40 -4 -40 -26 C-40 -42 -26 -90 0 -90 Z";
      const eggs = [];
      CUPS.forEach(([name, x, y, kind]) => {
        el("ellipse", { cx: x, cy: y, rx: 66, ry: 36, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${x - 48} ${y + 8} Q${x} ${y + 26} ${x + 48} ${y + 8}`, stroke: SOFT, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, g);
        if (kind) {
          const e = el("g", {}, g);
          el("path", { d: EGG, fill: kind === 2 ? BLUE : SOFT, stroke: INK, "stroke-width": 3 }, e);
          el("path", { d: "M-20 -56 Q-24 -40 -18 -28", stroke: "#fff", "stroke-width": 5, fill: "none", "stroke-linecap": "round", opacity: kind === 2 ? 0.7 : 1 }, e);
          if (kind === 1) {
            el("rect", { x: -64, y: -130, width: 128, height: 32, rx: 16, fill: LIL, stroke: INK, "stroke-width": 2.5 }, e);
            txt(e, 0, -108, "Coming soon", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
          }
          eggs.push({ e, x, y: y + 6, kind });
          el("path", { d: `M${x - 66} ${y} A66 36 0 0 0 ${x + 66} ${y} Z`, fill: "#fff" }, g);
          el("path", { d: `M${x - 66} ${y} A66 36 0 0 0 ${x + 66} ${y}`, fill: "none", stroke: INK, "stroke-width": 3 }, g);
          el("path", { d: `M${x - 48} ${y + 8} Q${x} ${y + 26} ${x + 48} ${y + 8}`, stroke: SOFT, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, g);
        }
        txt(g, x, y + 74, name, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      });
      button(g, "Egg carton: Mac app available; Cloud, iPhone app and Web app coming soon; Windows, Linux and Android empty. Wobble the eggs", () => api.seek(0.3));
      return (t) => {
        let j = 0;
        eggs.forEach((o) => {
          if (o.kind === 2) { const s = seg(t, 0.4, 1.1); tf(o.e, o.x, o.y - 26 * Math.sin(Math.PI * s), 1, 0); return; }
          const st = 1.3 + 0.2 * j++, u = t - st;
          const a = u > 0 && u < 3 ? 13 * Math.sin(u * 11) * Math.exp(-u * 1.5) : 0;
          tf(o.e, o.x, o.y, 1, a);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.6, still: 3.6, once: true,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 160, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 144, 72, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 64, 160, "Turnstone alternatives", { "font-size": 64, "font-weight": 700 });
      txt(svg, 64, 220, "5 tools like Turnstone for AI teammates", { "font-size": 27, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 258, "Checked 11 Nov 2026", { "font-size": 19, "font-weight": 500, fill: MUTE });
      const top = el("g", {}, svg);
      const tn = txt(top, 480, 346, "Turnstone", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700, fill: MUTE });
      const tw = tn.getComputedTextLength() + 44;
      top.insertBefore(el("rect", { x: 480 - tw / 2, y: 316, width: tw, height: 44, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }), tn);
      const NAMES = ["Claude Cowork", "Munder Difflin", "Grok Bot", "Perplexity Teammates", "OpenClaw"], COL = [YEL, SKY, LIL, MINT, YEL];
      const tiles = NAMES.map((s, i) => {
        const g = el("g", {}, svg), n = txt(g, 0, 448, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        const w = n.getComputedTextLength() + 26, r = el("rect", { y: 420, width: w, height: 42, rx: 11, fill: COL[i], stroke: INK, "stroke-width": 2.5 });
        g.insertBefore(r, n);
        return { g, n, r, w };
      });
      const gap = 16, total = tiles.reduce((a, b) => a + b.w, 0) + gap * 4;
      let x = (960 - total) / 2;
      const lines = tiles.map((o) => {
        const cx = x + o.w / 2; o.r.setAttribute("x", x); o.n.setAttribute("x", cx); x += o.w + gap;
        const p = el("path", { d: `M480 360 V390 H${cx} V420`, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 7", "stroke-linecap": "round" }, svg);
        svg.insertBefore(p, tiles[0].g);
        return p;
      });
      return (t) => {
        tiles.forEach((o, i) => {
          const s = seg(t, 0.4 + i * 0.4, 1.0 + i * 0.4), k = ob(s);
          tf(o.g, 0, 34 * (1 - k)); o.g.setAttribute("opacity", cl(s * 2.5)); lines[i].setAttribute("opacity", cl(s * 2.5));
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
    const frame = () => { const now = clock(); draw(held ? sc.still : sc.once ? Math.min(now + off, sc.dur) : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
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
