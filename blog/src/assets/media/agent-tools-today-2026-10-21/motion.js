/* Bright coded scenes for "Agent tools today, 21 Oct 2026". Vanilla JS, no library.
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

  const SC = {};

  /* ---- a terminal whose tab bar folds into a tall sidebar: four agent rows, three running, one lights up and needs you ---- */
  SC.today = {
    w: 1600, h: 1200, dur: 10, still: 9,
    build(svg, api) {
      const SW = 4;
      const A = (o) => Object.assign({ stroke: INK, "stroke-width": SW, "stroke-linejoin": "round", "stroke-linecap": "round" }, o);
      const lp = (a, b, p) => a + (b - a) * p;
      const set = (n, a) => { for (const k in a) n.setAttribute(k, typeof a[k] === "number" ? +a[k].toFixed(2) : a[k]); };
      const NEED = 2, ICON = [SKY, LIL, BLUE, MINT], tint = (k) => (k === NEED ? YEL : ICON[k]);
      /* window, sidebar and pane geometry */
      const WX = 110, WY = 110, WW = 1380, WH = 980, TOP = 196, BOT = 1070;
      const PL = 130, PR0 = 1470, PR1 = 640, BAR = 88, QX1 = 660, QY0 = 300;
      const TY = 210, TH = 60, TW = 280, RX = 150, RW = 470, RH = 150;
      /* beats, in seconds */
      const T_W0 = 0.45, T_W1 = 1.25, T_H0 = 1.1, T_H1 = 1.6, T_ROW = 2.0, T_DOT = 3.85, T_LIT = 4.75;
      const T_CUR = 5.5, T_CLK = 6.4, T_OP = 6.55, T_FILL = 7.0, T_UP = 7.3, T_TYPE = 7.15;

      /* a terminal glyph: a square with a prompt and an underscore */
      const icon = (p, c) => {
        const g = el("g", {}, p);
        el("rect", A({ width: 70, height: 70, rx: 16, fill: c }), g);
        el("path", A({ d: "M21 24 L34 35 L21 46 M39 47 H51", fill: "none" }), g);
        return g;
      };

      /* the window and its title bar */
      el("rect", A({ x: WX, y: WY, width: WW, height: WH, rx: 28, fill: "#fff" }), svg);
      el("path", A({ d: `M${WX} ${WY + 70} V${WY + 28} Q${WX} ${WY} ${WX + 28} ${WY} H${WX + WW - 28} Q${WX + WW} ${WY} ${WX + WW} ${WY + 28} V${WY + 70} Z`, fill: SOFT }), svg);
      [LIL, SKY, MINT].forEach((c, i) => el("circle", A({ cx: WX + 44 + i * 40, cy: WY + 35, r: 11, fill: c }), svg));

      const inner = el("g", {}, svg);
      const panel = el("rect", A({ rx: 22, fill: SOFT }), inner);
      const pane = el("rect", A({ rx: 22, fill: INK }), inner);
      const cid = "mgc" + Math.random().toString(36).slice(2, 9);
      const clipR = el("rect", { x: 0, y: 0, rx: 22 }, el("clipPath", { id: cid }, el("defs", {}, svg)));
      const view = el("g", { "clip-path": `url(#${cid})` }, inner);

      /* one terminal per agent row: a header in the row's colour, lines of output, then a running line or a waiting prompt */
      const LC = [SKY, LIL, MINT, SOFT, MUTE];
      const term = [0, 1, 2, 3].map((k) => {
        let s = 1009 + 7919 * k;
        const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
        const g = el("g", { opacity: 0 }, view);
        const head = el("g", {}, g);
        el("rect", A({ x: -20, y: -20, width: 1500, height: 108, fill: tint(k) }), head);
        tf(icon(head, "#fff"), 26, 9);
        el("rect", { x: 118, y: 35, width: 210, height: 18, rx: 9, fill: INK }, head);
        let hring = null;
        if (k !== NEED) {
          hring = el("circle", { cx: 758, cy: 44, r: 13, fill: "none", stroke: INK, "stroke-width": 3 }, head);
          el("circle", A({ cx: 758, cy: 44, r: 13, fill: MINT }), head);
        }
        const body = el("g", {}, g), n = k === NEED ? 9 : 11, lines = [];
        for (let j = 0; j < n; j++) {
          const ln = el("g", {}, body);
          el("path", A({ d: "M40 -11 L52 0 L40 11", fill: "none", stroke: MINT }), ln);
          let x = 76 + (r() < 0.3 ? 44 : 0);
          for (let q = 0, m = 1 + Math.floor(r() * 3); q < m; q++) {
            const w = 50 + Math.round(r() * 190); if (x + w > 720) break;
            el("rect", { x, y: -9, width: w, height: 18, rx: 9, fill: LC[Math.floor(r() * LC.length)] }, ln);
            x += w + 20;
          }
          lines.push(ln);
        }
        const tail = el("g", {}, body), y = 140 + 58 * n;
        let grow = null, caret;
        if (k === NEED) {
          el("rect", { x: 32, y: y - 34, width: 700, height: 176, rx: 20, fill: "none", stroke: YEL, "stroke-width": 5 }, tail);
          el("rect", { x: 68, y: y + 2, width: 440, height: 18, rx: 9, fill: SOFT }, tail);
          el("rect", { x: 68, y: y + 42, width: 300, height: 18, rx: 9, fill: SOFT }, tail);
          caret = el("rect", { x: 68, y: y + 80, width: 26, height: 38, rx: 4, fill: YEL }, tail);
        } else {
          el("path", A({ d: `M40 ${y - 11} L52 ${y} L40 ${y + 11}`, fill: "none", stroke: MINT }), tail);
          grow = el("rect", { x: 76, y: y - 9, height: 18, rx: 9, fill: SKY }, tail);
          caret = el("rect", { y: y - 19, width: 22, height: 38, rx: 4, fill: SOFT }, tail);
        }
        return (on, hd, rev, t) => {
          g.setAttribute("opacity", on ? 1 : 0);
          if (!on) return;
          head.setAttribute("opacity", hd ? 1 : 0);
          body.setAttribute("transform", `translate(0 ${hd ? 0 : -80})`);
          const N = n + 1;
          lines.forEach((ln, j) => {
            const o = cl(rev * N - j);
            ln.setAttribute("opacity", o);
            ln.setAttribute("transform", `translate(${(-18 * (1 - o)).toFixed(1)} ${140 + 58 * j})`);
          });
          tail.setAttribute("opacity", cl(rev * N - n));
          if (grow) {
            const gw = 30 + 250 * ((t * 0.5 + k * 0.37) % 1);
            grow.setAttribute("width", gw.toFixed(1));
            caret.setAttribute("x", (76 + gw + 14).toFixed(1));
          }
          caret.setAttribute("opacity", Math.floor(t * 2.5) % 2 === 0 ? 1 : 0);
          if (hring) { const p = (t * 0.7 + k * 0.3) % 1; set(hring, { r: 13 + 18 * p, opacity: 1 - p }); }
        };
      });

      /* the opened row, sliding out from behind its row edge into the pane */
      const ghost = el("rect", A({ rx: 22, opacity: 0 }), inner);

      /* the selected tab or row, then the four tabs that become agent rows */
      const sel = el("rect", { fill: "none", stroke: BLUE, "stroke-width": 5 }, inner);
      const rows = [0, 1, 2, 3].map((i) => {
        const g = el("g", {}, inner), o = { g, i };
        o.ring = el("rect", { fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 8", class: "mg-ring" }, g);
        o.bg = el("rect", A({ fill: "#fff" }), g);
        if (i === NEED) o.lit = el("rect", A({ fill: YEL, opacity: 0 }), g);
        o.ic = icon(g, ICON[i]);
        o.nb = el("rect", { fill: MUTE, rx: 8 }, g);
        o.sub = el("rect", { width: 150, height: 16, rx: 8, fill: LIL, opacity: 0 }, g);
        if (i === NEED) {
          o.pill = el("g", { opacity: 0 }, g);
          el("rect", A({ width: 248, height: 56, rx: 28, fill: "#fff" }), o.pill);
          txt(o.pill, 124, 40, "Needs you", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
        } else {
          o.dot = el("g", { opacity: 0 }, g);
          o.pr = el("circle", { r: 13, fill: "none", stroke: MINT, "stroke-width": 4 }, o.dot);
          el("circle", A({ r: 13, fill: MINT }), o.dot);
        }
        return o;
      });

      /* what the dot means */
      const legend = el("g", { opacity: 0 }, inner);
      el("circle", A({ cx: 182, cy: 976, r: 12, fill: MINT }), legend);
      txt(legend, 210, 987, "running work", { "font-size": 30, "font-weight": 600 });

      /* the click ring and the pointer */
      const ripple = el("circle", { fill: "none", stroke: INK, "stroke-width": 4, opacity: 0 }, inner);
      const arrow = el("g", { opacity: 0 }, inner);
      el("path", A({ d: "M0 0 L0 50 L13 38 L23 60 L33 55 L23 34 L40 33 Z", fill: "#fff" }), arrow);

      /* tap a row, or press Enter or Space on it, to open its terminal */
      let last = 0, kick = -99, from = 0, pick = NEED, fromOpen = false, manual = false;
      rows.forEach((o) => button(o.g, o.i === NEED ? "Open the terminal of the agent that needs you" : `Open the terminal of agent row ${o.i + 1}`, () => {
        fromOpen = last >= T_FILL; from = fromOpen ? pick : 0; pick = o.i; manual = true; kick = api.now();
        if (calm) api.redraw(); else api.seek(T_CLK - 0.06);
      }));

      return (t, now = 0) => {
        if (manual && t < 1 && now - kick > 1) { manual = false; from = 0; pick = NEED; fromOpen = false; }
        last = t;
        inner.setAttribute("opacity", (oc(seg(t, 0, 0.35)) * (1 - io(seg(t, 9.45, 9.9)))).toFixed(3));

        /* the tab bar narrows, then grows down into a tall sidebar while the pane moves over */
        const pw = io(seg(t, T_W0, T_W1)), ph = io(seg(t, T_H0, T_H1));
        const PR = lp(PR0, PR1, pw), PB = lp(TOP + BAR, BOT, ph);
        set(panel, { x: PL, y: TOP, width: PR - PL, height: PB - TOP });
        const qx = lp(PL, QX1, pw), qy = lp(QY0, TOP, ph), qw = PR0 - qx, qh = BOT - qy;
        set(pane, { x: qx, y: qy, width: qw, height: qh });
        view.setAttribute("transform", `translate(${qx.toFixed(2)} ${qy.toFixed(2)})`);
        set(clipR, { width: qw, height: qh });

        /* tabs squeeze, drop into a column, slide left, then open into rows one by one */
        const w1 = Math.min(TW, (PR - 20 - RX - 60) / 4), G = [];
        let cy = TY;
        for (let i = 0; i < 4; i++) {
          const d = io(seg(t, 1.15 + 0.05 * i, 1.5 + 0.05 * i)), l = io(seg(t, 1.45 + 0.05 * i, 1.85 + 0.05 * i));
          const e = oc(seg(t, T_ROW + 0.4 * i, T_ROW + 0.45 + 0.4 * i)), h = lp(TH, RH, e);
          G.push({ x: lp(RX + i * (w1 + 20), RX, l), y: lp(TY, cy, d), w: lp(lp(w1, TW, l), RW, e), h, e });
          cy += h + lp(12, 24, e);
        }
        const L = io(seg(t, T_LIT, T_LIT + 0.35)), pp = seg(t, T_LIT + 0.15, T_LIT + 0.5);
        rows.forEach((o) => {
          const { x, y, w, h, e } = G[o.i], rr = lp(14, 22, e), show = seg(e, 0.6, 1);
          set(o.ring, { x: x - 12, y: y - 12, width: w + 24, height: h + 24, rx: rr + 12 });
          set(o.bg, { x, y, width: w, height: h, rx: rr });
          tf(o.ic, x + lp(12, 24, e), y + lp(11, 40, e), lp(38 / 70, 1, e));
          set(o.nb, { x: x + lp(62, 118, e), y: y + lp(22, 36, e), width: lp(cl(w - 78, 0, 150), 190, e), height: lp(16, 18, e) });
          set(o.sub, { x: x + 118, y: y + 90, opacity: show * (o.lit ? 1 - seg(t, T_LIT + 0.1, T_LIT + 0.25) : 1) });
          if (o.lit) {
            set(o.lit, { x, y, width: w, height: h, rx: rr, opacity: L });
            o.pill.setAttribute("transform", `translate(${(x + 242).toFixed(1)} ${(y + 96).toFixed(1)}) scale(${ob(pp).toFixed(3)}) translate(-124 -28)`);
            o.pill.setAttribute("opacity", pp > 0 ? 1 : 0);
          } else {
            const k = o.i < NEED ? o.i : o.i - 1, pd = seg(t, T_DOT + 0.22 * k, T_DOT + 0.22 * k + 0.35);
            tf(o.dot, x + 418, y + 75, ob(pd));
            o.dot.setAttribute("opacity", pd > 0 ? 1 : 0);
            const p = ((((t - T_DOT) * 0.7 + o.i * 0.29) % 1) + 1) % 1;
            set(o.pr, { r: 13 + 18 * p, "stroke-opacity": pd >= 1 ? 1 - p : 0 });
          }
        });
        legend.setAttribute("opacity", io(seg(t, T_DOT + 0.5, T_DOT + 0.9)));

        /* the selection moves to the opened row */
        const S = io(seg(t, T_CLK + 0.05, T_CLK + 0.4)), a = G[from], b = G[pick];
        set(sel, { x: lp(a.x, b.x, S) - 7, y: lp(a.y, b.y, S) - 7, width: lp(a.w, b.w, S) + 14, height: lp(a.h, b.h, S) + 14, rx: lp(14, 22, b.e) + 7 });

        /* the pointer travels to the row and clicks */
        const ex = b.x + 412, ey = b.y + 40, pm = io(seg(t, T_CUR, T_CLK - 0.1));
        tf(arrow, lp(1190, ex, pm).toFixed(1), (lp(800, ey, pm) - 90 * Math.sin(Math.PI * pm)).toFixed(1), (1 - 0.14 * Math.sin(Math.PI * seg(t, T_CLK - 0.08, T_CLK + 0.14))).toFixed(3));
        arrow.setAttribute("opacity", manual ? 0 : seg(t, T_CUR - 0.2, T_CUR + 0.05));
        const rp = seg(t, T_CLK, T_CLK + 0.5);
        set(ripple, { cx: ex, cy: ey, r: 10 + 50 * oc(rp), opacity: rp > 0 && rp < 1 ? 1 - rp : 0 });

        /* the row grows into the pane, then rolls up into the terminal's header */
        const gp = io(seg(t, T_OP, T_FILL)), gu = io(seg(t, T_FILL, T_UP));
        set(ghost, { x: lp(b.x + b.w - 40, qx, gp), y: lp(b.y, qy, gp), width: lp(40, qw, gp), height: lp(lp(b.h, qh, gp), 88, gu), fill: tint(pick), opacity: t >= T_OP && t < T_UP ? 1 : 0 });
        const sw = t >= T_FILL, shown = sw ? pick : from;
        term.forEach((paint, j) => paint(j === shown, sw || fromOpen, sw ? seg(t, T_TYPE, T_TYPE + 1.1) : 1, t));
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
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); }, redraw: () => frame() };
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
