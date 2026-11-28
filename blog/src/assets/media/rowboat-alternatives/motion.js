/* Bright coded scenes for "Rowboat alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878", GREY = "#D9D0E4";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const MW = (s, size) => s.length * size * 0.6; // JetBrains Mono advances 0.6 em per glyph
  const tw = (n, s, size) => { let w = 0; try { w = n.getComputedTextLength(); } catch (e) { w = 0; } return w > 0 ? w : s.length * size * 0.56; };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  const SC = {};

  /* ---- 1. a corkboard: cards with blue string to one plain Markdown card ---- */
  SC.corkboard = {
    dur: 9, still: 8.2,
    build(svg, api) {
      const C = [400, 300];
      const board = el("g", {}, svg);
      el("rect", { x: 16, y: 16, width: 768, height: 568, rx: 32, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 8", class: "mg-ring" }, board);
      el("rect", { x: 30, y: 30, width: 740, height: 540, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, board);
      el("rect", { x: 46, y: 46, width: 708, height: 508, rx: 12, fill: YEL, stroke: INK, "stroke-width": 2.5 }, board);
      const strings = el("g", {}, board), cards = el("g", {}, board);
      const card = (label, x, y, pin, rule = SKY) => {
        const w = Math.max(150, MW(label, 24) + 44), h = 86, g = el("g", {}, cards), b = el("g", {}, g);
        el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, b);
        el("path", { d: `M${-w / 2 + 12} -14 H${w / 2 - 12}`, stroke: rule, "stroke-width": 3, "stroke-linecap": "round" }, b);
        txt(b, 0, 24, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
        el("circle", { cx: 0, cy: -30, r: 9, fill: pin, stroke: INK, "stroke-width": 2.5 }, b);
        el("circle", { cx: -2.5, cy: -32.5, r: 2.5, fill: "#fff" }, b);
        tf(g, x, y);
        return { g, b };
      };
      const str = (x, y) => el("path", { d: `M${x} ${y} Q${(x + C[0]) / 2} ${(y + C[1]) / 2 + 18} ${C[0]} ${C[1]}`, pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1, stroke: BLUE, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, strings);
      const item = (label, x, y, pin, at) => ({ c: card(label, x, y, pin), l: str(x, y), at });
      const base = [["Email", 160, 140, BLUE], ["Meetings", 640, 140, LIL], ["Slack", 160, 460, MINT], ["Chats", 640, 460, SKY]].map(([s, x, y, p], i) => item(s, x, y, p, 0.5 + 0.4 * i));
      const note = item("New note", 400, 120, MINT, 3.6);
      const extra = [[400, 480, LIL], [130, 300, BLUE], [670, 300, MINT]].map(([x, y, p]) => item("New note", x, y, p, -1));
      const hub = card("Plain Markdown", C[0], C[1], YEL, LIL);
      const drop = (o, k, from, wob) => { const e = ob(k); o.c.b.setAttribute("opacity", cl(k * 5)); o.c.b.setAttribute("transform", `translate(0 ${-from * (1 - e)}) rotate(${wob * (1 - e)} 0 -30)`); };
      button(board, "Pin one more card to the board", () => {
        let i = extra.findIndex((e) => e.at < 0);
        if (i < 0) { extra.forEach((e) => { e.at = -1; }); i = 0; }
        extra[i].at = api.now(); api.poke();
      });
      return (t, now) => {
        const fade = 1 - seg(t, 8.5, 9);
        hub.b.setAttribute("opacity", 1);
        base.forEach((o) => {
          drop(o, seg(t, o.at, o.at + 0.6), 60, 0);
          o.l.setAttribute("stroke-dashoffset", 1 - oc(seg(t, o.at + 0.45, o.at + 1.05)));
          o.c.g.setAttribute("opacity", fade); o.l.setAttribute("opacity", fade);
        });
        drop(note, seg(t, 3.6, 4.6), 180, -9);
        note.l.setAttribute("stroke-dashoffset", 1 - oc(seg(t, 4.5, 5.2)));
        note.c.g.setAttribute("opacity", fade); note.l.setAttribute("opacity", fade);
        extra.forEach((o) => {
          const on = o.at >= 0, s = now - o.at;
          o.c.g.setAttribute("display", on ? "inline" : "none"); o.l.setAttribute("display", on ? "inline" : "none");
          if (on) { drop(o, seg(s, 0, 1), 180, -9); o.l.setAttribute("stroke-dashoffset", 1 - oc(seg(s, 0.9, 1.6))); }
        });
      };
    },
  };

  /* ---- 2. a rowboat with one oar per agent ---- */
  SC.oars = {
    dur: 10, still: 8,
    build(svg, api) {
      const wave = (y, wl, amp, x0, x1, close) => { let d = `M${x0} ${y}`; for (let x = x0; x < x1; x += wl) d += ` q${wl / 4} ${-amp} ${wl / 2} 0 t${wl / 2} 0`; return close ? `${d} V${close} H${x0} Z` : d; };
      const back = el("path", { d: wave(356, 100, 6, -200, 1000, 620), fill: SKY, stroke: BLUE, "stroke-width": 2.5 }, svg);
      const bBack = el("g", {}, svg);
      el("path", { d: "M235 330 V136", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, bBack);
      const flag = el("path", { fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, bBack);
      txt(bBack, 132, 177, "One group chat", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      el("path", { d: "M212 332 H702 Q694 374 640 394 H284 Q230 382 212 332 Z", fill: GREY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bBack);
      el("path", { d: "M226 354 H688", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, bBack);
      el("rect", { x: 204, y: 323, width: 506, height: 11, rx: 5.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, bBack);
      const front = el("path", { d: wave(374, 80, 7, -160, 1000, 620), fill: SKY, stroke: BLUE, "stroke-width": 3 }, svg);
      const ripples = [432, 492, 552].map((y, i) => el("path", { d: `M-360 ${y} H1160`, stroke: BLUE, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "60 120", "stroke-dashoffset": i * 70 }, svg));
      const bFront = el("g", {}, svg);
      el("rect", { x: 20, y: 126, width: 708, height: 288, rx: 22, fill: "#fff", "fill-opacity": 0 }, bFront);
      el("rect", { x: 20, y: 126, width: 708, height: 288, rx: 22, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 8", class: "mg-ring" }, bFront);
      const wake = [386, 400].map(() => el("path", { stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round" }, bFront));
      const OARS = [["Hermes", 320, 0, LIL], ["OpenClaw", 405, 1, SKY], ["Claude Code", 490, 0, YEL], ["Codex", 575, 1, MINT], ["New agent", 652, 0, BLUE]];
      const oars = OARS.map(([s, x, row, col]) => {
        const g = el("g", {}, bFront), w = MW(s, 18) + 28, ty = row ? 232 : 176;
        el("path", { d: `M${x} ${ty + 34} V290`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 6", "stroke-linecap": "round" }, g);
        el("rect", { x: x - w / 2, y: ty, width: w, height: 34, rx: 17, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, x, ty + 23, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
        const o = el("g", {}, g);
        el("path", { d: "M0 -44 V106", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, o);
        el("rect", { x: -10, y: 98, width: 20, height: 46, rx: 9, fill: col, stroke: INK, "stroke-width": 2.5 }, o);
        el("circle", { r: 5.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, o);
        return { g, o, x };
      });
      let fast = false, flip = -99, ph = 0, wph = 0, last = null;
      button(bFront, "Add another oar and speed the boat up", () => { fast = !fast; flip = api.now(); api.poke(); });
      return (t, now) => {
        const sk = fast ? oc(seg(now - flip, 0, 0.7)) : 1 - oc(seg(now - flip, 0, 0.7));
        const rate = 2.6 + 2.2 * sk, flow = 46 + 90 * sk;
        if (last == null) { ph = t * rate; wph = t * flow; } else { const d = cl(now - last, 0, 0.1); ph += d * rate; wph += d * flow; }
        last = now;
        const gx = -760 * (1 - oc(seg(t, 0, 2.4))) + 780 * io(seg(t, 9.1, 10));
        const T = `translate(${gx} ${Math.sin(ph * 0.9) * 3}) rotate(${Math.sin(ph * 0.6) * 0.8} 460 360)`;
        bBack.setAttribute("transform", T); bFront.setAttribute("transform", T);
        const th = 26 * Math.sin(ph);
        oars.forEach((o) => tf(o.o, o.x, 329, 1, th));
        const n = oars[4].g; n.setAttribute("display", sk > 0.001 ? "inline" : "none"); n.setAttribute("opacity", cl(sk * 2)); n.setAttribute("transform", `translate(0 ${30 * (1 - ob(sk))})`);
        const f = 7 * Math.sin(ph * 1.7);
        flag.setAttribute("d", `M233 142 C200 ${142 - f} 165 ${142 + f} 132 142 S64 ${142 + f} 32 142 V198 C64 ${198 + f} 99 ${198 - f} 132 198 S200 ${198 - f} 233 198 Z`);
        const len = (26 + 64 * sk) * (0.85 + 0.15 * Math.sin(ph * 2));
        wake[0].setAttribute("d", `M${200 - len} 386 H200`); wake[1].setAttribute("d", `M${190 - len * 0.7} 400 H190`);
        back.setAttribute("transform", `translate(${-((wph * 0.5) % 100)} 0)`);
        front.setAttribute("transform", `translate(${-(wph % 80)} 0)`);
        ripples.forEach((r, i) => r.setAttribute("transform", `translate(${-((wph * (0.8 + 0.15 * i)) % 180)} 0)`));
      };
    },
  };

  /* ---- 3. a compass whose six points pair with six tools ---- */
  SC.compass = {
    dur: 11.5, still: 11,
    build(svg, api) {
      const C = [400, 262];
      const PTS = [["Local memory", "AnythingLLM"], ["Agent team", "Munder Difflin"], ["Big task", "Eigent"], ["Many CLIs", "AionUi"], ["Claude plan", "Claude Cowork"], ["Stay put", "Rowboat"]];
      const chips = PTS.map(([s], i) => {
        const a = (i * 60 * Math.PI) / 180, x = C[0] + Math.sin(a) * 190, y = C[1] - Math.cos(a) * 190;
        const anchor = i === 0 || i === 3 ? "middle" : i < 3 ? "start" : "end", ty = i === 0 ? y - 4 : i === 3 ? y + 20 : y + 8;
        const chip = el("rect", { y: ty - 28, height: 40, rx: 20, fill: "none" }, svg);
        const w = tw(txt(svg, x, ty, s, { "text-anchor": anchor, "font-size": 24, "font-weight": 600 }), s, 24);
        chip.setAttribute("x", (anchor === "middle" ? x - w / 2 : anchor === "start" ? x : x - w) - 14); chip.setAttribute("width", w + 28);
        return chip;
      });
      const comp = el("g", {}, svg);
      el("circle", { cx: C[0], cy: C[1], r: 168, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 8", class: "mg-ring" }, comp);
      el("circle", { cx: C[0], cy: C[1], r: 156, fill: YEL, stroke: INK, "stroke-width": 3.5 }, comp);
      el("circle", { cx: C[0], cy: C[1], r: 126, fill: "#fff", stroke: INK, "stroke-width": 3 }, comp);
      el("circle", { cx: C[0], cy: C[1], r: 92, fill: "none", stroke: SOFT, "stroke-width": 12 }, comp);
      for (let i = 0; i < 36; i++) if (i % 6) el("path", { d: "M0 -122 V-112", stroke: INK, "stroke-width": 2, "stroke-linecap": "round", transform: `translate(${C[0]} ${C[1]}) rotate(${i * 10})` }, comp);
      for (let i = 0; i < 6; i++) el("path", { d: "M0 -152 L10 -130 H-10 Z", fill: i % 2 ? LIL : BLUE, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round", transform: `translate(${C[0]} ${C[1]}) rotate(${i * 60})` }, comp);
      const nd = el("g", {}, comp);
      el("path", { d: "M0 -108 L15 0 L-15 0 Z", fill: BLUE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, nd);
      el("path", { d: "M0 108 L15 0 L-15 0 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, nd);
      el("circle", { r: 13, fill: YEL, stroke: INK, "stroke-width": 3 }, nd);
      el("circle", { r: 4, fill: INK }, nd);
      el("rect", { x: 230, y: 508, width: 340, height: 58, rx: 29, fill: SOFT }, svg);
      const lab = txt(svg, 400, 546, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 });
      const ARR = PTS.map((_, i) => 1.3 + 1.55 * i);
      const ang = (t) => {
        if (t < ARR[0]) return 300 + 420 * oc(seg(t, 0, ARR[0]));
        for (let i = 5; i >= 1; i--) { const s = ARR[i] - 0.6; if (t >= s) return 720 + 60 * (i - 1) + 60 * ob(seg(t, s, ARR[i])); }
        return 720;
      };
      button(comp, "Spin the needle again", () => api.seek(0.01));
      return (t) => {
        tf(nd, C[0], C[1], 1, ang(t));
        let idx = -1; ARR.forEach((a, i) => { if (t >= a) idx = i; });
        chips.forEach((c, i) => { c.setAttribute("fill", i === idx ? YEL : "none"); c.setAttribute("stroke", i === idx ? INK : "none"); c.setAttribute("stroke-width", 2); });
        lab.textContent = idx < 0 ? "" : PTS[idx][1];
        const k = idx < 0 ? 0 : oc(seg(t, ARR[idx], ARR[idx] + 0.35));
        lab.setAttribute("opacity", k); lab.setAttribute("transform", `translate(0 ${10 * (1 - k)})`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4.5, still: 4.4,
    build(svg) {
      const pill = el("rect", { x: 64, y: 54, height: 40, rx: 20, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      pill.setAttribute("width", tw(txt(svg, 84, 81, "Alternatives", { "font-size": 20, "font-weight": 700 }), "Alternatives", 20) + 40);
      txt(svg, 64, 176, "Rowboat alternatives", { "font-size": 70, "font-weight": 700 });
      el("path", { d: "M66 202 H340", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 254, "5 tools like Rowboat for an AI coworker", { "font-size": 28, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 292, "Checked 13 Nov 2026", { "font-size": 19, "font-weight": 500, fill: CAP });
      const top = el("g", {}, svg), rw = 176;
      el("rect", { x: 480 - rw / 2, y: 330, width: rw, height: 52, rx: 14, fill: GREY, stroke: INK, "stroke-width": 2.5 }, top);
      txt(top, 480, 364, "Rowboat", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      const NAMES = ["AnythingLLM", "Munder Difflin", "Eigent", "AionUi", "Claude Cowork"], COLS = [YEL, BLUE, LIL, SKY, MINT];
      const ws = NAMES.map((s) => MW(s, 20) + 32), gap = 18, total = ws.reduce((a, b) => a + b, 0) + gap * 4;
      let x = (960 - total) / 2;
      const mids = ws.map((w) => { const m = x + w / 2; x += w + gap; return m; });
      const stem = el("path", { d: `M480 382 V410 M${mids[0]} 410 H${mids[4]}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, svg);
      const tiles = NAMES.map((s, i) => {
        const drop = el("path", { d: `M${mids[i]} 410 V438`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg), g = el("g", {}, svg);
        el("rect", { x: mids[i] - ws[i] / 2, y: 438, width: ws[i], height: 52, rx: 14, fill: COLS[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, mids[i], 471, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return { g, drop };
      });
      return (t) => {
        top.setAttribute("opacity", oc(seg(t, 0, 0.4)));
        stem.setAttribute("opacity", seg(t, 0.3, 0.6));
        tiles.forEach(({ g, drop }, i) => { const k = seg(t, 0.6 + 0.35 * i, 1.15 + 0.35 * i); g.setAttribute("opacity", cl(k * 3)); drop.setAttribute("opacity", seg(k, 0.5, 1)); g.setAttribute("transform", `translate(0 ${50 * (1 - ob(k))})`); });
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
