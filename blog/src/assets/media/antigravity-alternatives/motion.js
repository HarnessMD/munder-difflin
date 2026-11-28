/* Bright coded scenes for "Antigravity alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", GREY = "#DCD6E2";
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

  /* ---- 1. a desk calendar flips to November 18 and a note lands ---- */
  SC.calendar = {
    dur: 4.2,
    build(svg, api) {
      const X = 200, Y = 110, W = 400, H = 420, FL = [0.4, 0.95, 1.5, 2.05], FD = 0.5;
      const cal = el("g", {}, svg);
      el("rect", { x: X - 28, y: Y - 34, width: W + 56, height: H + 62, rx: 24, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 8" }, cal);
      el("rect", { x: X - 60, y: Y + H + 8, width: W + 120, height: 34, rx: 17, fill: BLUE, stroke: INK, "stroke-width": 3 }, cal);
      el("rect", { x: X - 16, y: Y - 22, width: W + 32, height: H + 36, rx: 18, fill: LIL, stroke: INK, "stroke-width": 3 }, cal);
      const HEAD = [SKY, MINT, LIL, BLUE];
      const face = (i) => {
        const g = el("g", {}, cal);
        el("rect", { x: X, y: Y, width: W, height: H, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        if (i < 4) {
          el("rect", { x: X, y: Y, width: W, height: 74, rx: 12, fill: HEAD[i], stroke: INK, "stroke-width": 3 }, g);
          for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) el("rect", { x: X + 34 + c * 70, y: Y + 110 + r * 72, width: 52, height: 52, rx: 10, fill: SOFT }, g);
        } else {
          el("rect", { x: X, y: Y, width: W, height: 74, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
          txt(g, X + W / 2, Y + 50, "November", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
          txt(g, X + W / 2, Y + 236, "18", { "text-anchor": "middle", "font-size": 150, "font-weight": 700 });
        }
        return g;
      };
      const under = [0, 1, 2, 3, 4].map(face);
      const flip = el("g", {}, cal);
      const flipFace = [0, 1, 2, 3].map((i) => { const f = face(i); flip.appendChild(f); return f; });
      const back = el("rect", { x: X, y: Y, width: W, height: H, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, flip);
      for (let i = 0; i < 8; i++) {
        const x = X + 40 + i * 45;
        el("rect", { x: x - 6, y: Y - 18, width: 12, height: 34, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, cal);
      }
      const note = el("g", {}, cal);
      el("rect", { x: -130, y: -64, width: 260, height: 128, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, note);
      ["Claude 4.6 and", "GPT OSS 120b", "leave Antigravity"].forEach((s, i) => txt(note, 0, -22 + i * 32, s, { "text-anchor": "middle", "font-size": 23, "font-weight": 700 }));
      button(cal, "Calendar: flip the pages again", () => api.seek(0));
      return (t) => {
        const n = FL.filter((s) => t >= s).length, cur = n - 1, p = n ? seg(t, FL[cur], FL[cur] + FD) : 1;
        const show = n === 0 ? 0 : p < 1 ? cur + 1 : n;
        under.forEach((g, i) => g.setAttribute("display", i === show || (n === 0 && i === 0) ? "inline" : "none"));
        if (n === 0 || p >= 1) flip.setAttribute("display", "none");
        else {
          const s = 1 - 1.25 * io(p);
          flip.setAttribute("display", "inline");
          flip.setAttribute("transform", `translate(0 ${Y}) scale(1 ${Math.abs(s) < 0.01 ? 0.01 : s}) translate(0 ${-Y})`);
          flipFace.forEach((f, i) => f.setAttribute("display", i === cur && s > 0 ? "inline" : "none"));
          back.setAttribute("display", s > 0 ? "none" : "inline");
        }
        const k = seg(t, 2.8, 3.4), d = ob(k);
        tf(note, 460, 440 - 260 * (1 - d), 1.25 - 0.25 * oc(k), -4 + 10 * (1 - oc(k)));
        note.setAttribute("opacity", k <= 0 ? 0 : cl(k * 4));
      };
    },
  };

  /* ---- 2. a vending machine with six snacks, each card says where it runs ---- */
  SC.vending = {
    dur: 3,
    build(svg, api) {
      const NAMES = ["Claude Code", "Munder Difflin", "Codex", "Cursor", "Cline", "Zed"];
      const RUNS = ["Terminal, IDE, desktop, web", "Your computer", "CLI, IDE, desktop app, web", "Desktop, CLI, cloud agents", "VS Code, JetBrains, terminal, desktop", "Your computer"];
      const COL = [YEL, MINT, LIL, SKY, YEL, MINT];
      const WX = 116, WY = 50, WW = 568, WH = 240, slot = WW / 6, cx = (i) => WX + slot * (i + 0.5);
      let pick = 1;
      el("rect", { x: 90, y: 24, width: 620, height: 556, rx: 28, fill: BLUE, stroke: INK, "stroke-width": 4 }, svg);
      el("rect", { x: WX, y: WY, width: WW, height: WH, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const clip = el("clipPath", { id: "mgv-win" }, el("defs", {}, svg));
      el("rect", { x: WX + 2, y: WY + 2, width: WW - 4, height: 206 - WY - 3, rx: 14 }, clip);
      el("path", { d: `M${WX} 206 H${WX + WW}`, stroke: INK, "stroke-width": 3 }, svg);
      NAMES.forEach((s, i) => {
        const w = s.split(" ");
        w.forEach((p, j) => txt(svg, cx(i), (w.length > 1 ? 238 : 250) + j * 24, p, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 }));
      });
      const win = el("g", { "clip-path": "url(#mgv-win)" }, svg);
      const items = NAMES.map((s, i) => {
        const coil = el("circle", { cx: 0, cy: 0, r: 38, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "190 49", "stroke-linecap": "round" }, win);
        tf(coil, cx(i), 140);
        const snack = el("g", {}, win);
        el("rect", { x: -30, y: -44, width: 60, height: 88, rx: 8, fill: COL[i], stroke: INK, "stroke-width": 3 }, snack);
        el("rect", { x: -34, y: -54, width: 68, height: 14, rx: 4, fill: COL[i], stroke: INK, "stroke-width": 3 }, snack);
        el("rect", { x: -34, y: 40, width: 68, height: 14, rx: 4, fill: COL[i], stroke: INK, "stroke-width": 3 }, snack);
        el("circle", { cx: 0, cy: 0, r: 13, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, snack);
        return { coil, snack };
      });
      el("rect", { x: WX, y: 316, width: WW, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const btns = NAMES.map((s, i) => {
        const g = el("g", {}, svg);
        el("circle", { r: 31, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5 }, g);
        const face = el("circle", { r: 19, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M-7 -3 L0 5 L7 -3", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        tf(g, cx(i), 344);
        button(g, `${s}: ${RUNS[i]}`, () => { pick = i; api.seek(0); });
        return face;
      });
      el("rect", { x: 140, y: 400, width: 520, height: 152, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const tclip = el("clipPath", { id: "mgv-tray" }, el("defs", {}, svg));
      el("rect", { x: 142, y: 402, width: 516, height: 148, rx: 18 }, tclip);
      const card = el("g", {}, el("g", { "clip-path": "url(#mgv-tray)" }, svg));
      el("rect", { x: 160, y: 424, width: 480, height: 108, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      const cName = txt(card, 400, 462, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700, fill: MUTE });
      const cRun = txt(card, 400, 504, "", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      return (t) => {
        items.forEach((it, i) => {
          const on = i === pick, r = on ? 360 * io(seg(t, 0.2, 1.2)) : 0, f = on ? seg(t, 1.0, 1.6) : 0;
          tf(it.coil, cx(i), 140, 1, r - 40);
          tf(it.snack, cx(i), 140 + 230 * f * f);
          it.snack.setAttribute("opacity", 1 - seg(f, 0.75, 1));
          btns[i].setAttribute("fill", on ? MINT : YEL);
        });
        cName.textContent = NAMES[pick]; cRun.textContent = RUNS[pick];
        card.setAttribute("transform", `translate(0 ${140 * (1 - ob(seg(t, 1.7, 2.4)))})`);
      };
    },
  };

  /* ---- 3. a wallet opens and three keys slide up ---- */
  SC.wallet = {
    dur: 4.4, start: 1.2,
    build(svg, api) {
      const HX = 400, T = 290, B = 540, PW = 270, LABEL = ["Anthropic key", "OpenAI key", "Google key"], COL = [YEL, LIL, MINT], TOP = [104, 160, 216];
      const wal = el("g", { transform: "translate(0 -36)" }, svg);
      el("rect", { x: HX - PW - 24, y: 80, width: 2 * PW + 48, height: B - 56, rx: 26, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 8" }, wal);
      el("rect", { x: HX, y: T, width: PW, height: B - T, rx: 20, fill: BLUE, stroke: INK, "stroke-width": 4 }, wal);
      const cards = LABEL.map((s, i) => {
        const g = el("g", {}, wal);
        el("rect", { x: HX + 24, y: 0, width: PW - 48, height: 150, rx: 14, fill: COL[i], stroke: INK, "stroke-width": 3 }, g);
        txt(g, HX + 44, 38, s, { "font-size": 23, "font-weight": 700 });
        return g;
      });
      el("rect", { x: HX, y: 336, width: PW, height: B - 336, rx: 20, fill: SKY, stroke: INK, "stroke-width": 4 }, wal);
      el("path", { d: `M${HX + 18} 356 H${HX + PW - 18}`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 7", "stroke-linecap": "round" }, wal);
      const flap = el("g", {}, wal);
      const inside = el("g", {}, flap);
      el("rect", { x: -PW, y: T, width: PW, height: B - T, rx: 20, fill: LIL, stroke: INK, "stroke-width": 4 }, inside);
      el("rect", { x: -PW + 30, y: T + 34, width: PW - 60, height: 172, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, inside);
      ["Free for", "individual", "developers"].forEach((s, i) => txt(inside, -PW / 2, T + 92 + i * 42, s, { "text-anchor": "middle", "font-size": 29, "font-weight": 700 }));
      const outside = el("g", {}, flap);
      el("rect", { x: -PW, y: T, width: PW, height: B - T, rx: 20, fill: BLUE, stroke: INK, "stroke-width": 4 }, outside);
      el("rect", { x: -PW + 16, y: T + 16, width: PW - 32, height: B - T - 32, rx: 12, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 7" }, outside);
      button(wal, "Wallet: close it and open it again", () => api.seek(0));
      return (t) => {
        const fk = t < 1.1 ? 1 - io(seg(t, 0.4, 1.0)) : io(seg(t, 1.4, 2.2)), sx = -1 + 2 * fk;
        flap.setAttribute("transform", `translate(${HX} 0) scale(${Math.abs(sx) < 0.01 ? 0.01 : sx} 1)`);
        inside.setAttribute("display", sx > 0 ? "inline" : "none"); outside.setAttribute("display", sx > 0 ? "none" : "inline");
        cards.forEach((g, i) => {
          const k = t < 1.1 ? 1 - io(seg(t, 0, 0.5)) : ob(seg(t, 2.4 + 0.5 * i, 2.9 + 0.5 * i));
          g.setAttribute("transform", `translate(0 ${350 + (TOP[i] - 350) * k})`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.6,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 150, height: 38, rx: 19, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 139, 69, "Alternatives", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      txt(svg, 64, 158, "Antigravity alternatives", { "font-size": 62, "font-weight": 700 });
      el("path", { d: "M66 182 H420", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 230, "6 picks by why you are leaving", { "font-size": 27, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 266, "Checked 4 Nov 2026", { "font-family": MONO, "font-size": 17, "font-weight": 700, fill: MUTE });
      const NAMES = ["Claude Code", "Munder Difflin", "Codex", "Cursor", "Cline", "Zed"], COL = [YEL, MINT, LIL, SKY, YEL, MINT];
      const TW = 132, GAP = (832 - 6 * TW) / 5, tx = (i) => 64 + i * (TW + GAP);
      el("rect", { x: 380, y: 300, width: 200, height: 52, rx: 14, fill: GREY, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 480, 333, "Antigravity", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700, fill: MUTE });
      const wire = el("path", { d: `M480 352 V386 M${tx(0) + TW / 2} 386 H${tx(5) + TW / 2}`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      const tiles = NAMES.map((s, i) => {
        const g = el("g", {}, svg);
        el("path", { d: `M${tx(i) + TW / 2} 386 V420`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        el("rect", { x: tx(i), y: 420, width: TW, height: 56, rx: 14, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, tx(i) + TW / 2, 454, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 13.5, "font-weight": 700 });
        return g;
      });
      return (t) => {
        wire.setAttribute("opacity", oc(seg(t, 0.2, 0.6)));
        tiles.forEach((g, i) => { const k = seg(t, 0.5 + i * 0.35, 1.1 + i * 0.35); g.setAttribute("transform", `translate(0 ${50 * (1 - ob(k))})`); g.setAttribute("opacity", oc(k)); });
      };
    },
  };

  /* ---- player: each scene plays once when it comes into view, then rests on its final frame ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600, still = sc.still != null ? sc.still : sc.dur, t0 = sc.start || 0;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, begun = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const pos = () => Math.min(clock() + off, sc.dur);
    const frame = () => draw(calm ? still : pos(), clock());
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !calm && clock() + off < sc.dur) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); tick(); }, poke: () => tick() };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) {
        if (!begun) { begun = true; api.seek(t0); } else tick();
        if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); }
      } else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    draw(calm ? still : t0, 0);
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
