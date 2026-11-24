/* Bright coded scenes for "AGENTS.md best practices". Vanilla JS, no library.
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
  const lerp = (a, b, k) => a + (b - a) * k;
  const mix = (a, b, k) => { const c = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16); return "#" + [0, 1, 2].map((i) => Math.round(lerp(c(a, i), c(b, i), k)).toString(16).padStart(2, "0")).join(""); };
  const pv = (n, x, y, s = 1, r = 0, dx = 0, dy = 0) => n.setAttribute("transform", `translate(${x + dx} ${y + dy}) rotate(${r}) scale(${s}) translate(${-x} ${-y})`);
  const fit = (n, max) => { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", (parseFloat(n.getAttribute("font-size")) * max) / w); };
  /* the scene eases out over its last 0.6 s, so the loop wraps to an empty frame without a cut */
  const fade = (t, dur) => 1 - io(seg(t, dur - 0.6, dur));
  /* one tap: a short reset animates from the frame on screen, then the timeline replays from `again` */
  const resetter = (api, again, R) => {
    let at = -1, from = 0, last = 0;
    return {
      tap: () => { if (at < 0) { at = api.now(); from = last; api.poke(); } },
      step: (t, now) => {
        if (at < 0) { last = t; return [t, -1]; }
        const r = (now - at) / R;
        if (r >= 1) { at = -1; api.seek(again); return null; }
        return [from, cl(r)];
      },
    };
  };
  /* the whole frame is the tap target; a dashed ink ring shows on focus (and faintly on hover) */
  const overlay = (svg, W, H, label, fn) => {
    const g = el("g", {}, svg);
    el("rect", { width: W, height: H, fill: "#fff", "fill-opacity": 0 }, g);
    el("rect", { x: 24, y: 24, width: W - 48, height: H - 48, rx: 36, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "14 12", class: "mg-ring" }, g);
    button(g, label, fn);
  };
  /* a sticky note centred on 0,0 with a folded corner */
  const note = (p, s, col) => {
    const h = s / 2, f = s * 0.24;
    el("path", { d: `M${-h} ${-h} H${h} V${h - f} L${h - f} ${h} H${-h} Z`, fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p);
    el("path", { d: `M${h} ${h - f} H${h - f} V${h} Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p);
  };

  const SC = {};

  /* ---- 1. a recipe card: five popular sections write on, each gets a tick, a clip pins it ---- */
  SC.recipecard = {
    w: 1600, h: 1200, dur: 9, still: 8,
    build(svg, api) {
      const LINES = ["Project overview", "Build and test commands", "Code style", "Testing", "Security"];
      const root = el("g", {}, svg);
      const card = el("g", {}, root);
      el("rect", { x: 324, y: 264, width: 1000, height: 860, rx: 34, fill: LIL }, card);
      el("rect", { x: 300, y: 236, width: 1000, height: 860, rx: 34, fill: SOFT, stroke: INK, "stroke-width": 3 }, card);
      el("path", { d: "M340 372 H1260", stroke: LIL, "stroke-width": 6, "stroke-linecap": "round" }, card);
      const rows = LINES.map((s, i) => {
        const y = 474 + i * 132;
        el("path", { d: `M340 ${y + 32} H1260`, stroke: LIL, "stroke-width": 3, "stroke-linecap": "round" }, card);
        const line = txt(card, 472, y, "", { "font-family": MONO, "font-size": 54, "font-weight": 700, fill: BLUE });
        const tick = el("g", {}, card);
        el("path", { d: "M-24 0 L-6 18 L26 -18", stroke: INK, "stroke-width": 20, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
        el("path", { d: "M-24 0 L-6 18 L26 -18", stroke: YEL, "stroke-width": 11, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
        return { s, y, line, tick, w: 1.8 + i * 1.0 };
      });
      const caret = el("rect", { width: 5, height: 56, rx: 2.5, fill: BLUE }, card);
      const clip = el("g", {}, root);
      el("path", { d: "M700 204 L676 116 Q671 94 694 94 H906 Q929 94 924 116 L900 204", stroke: INK, "stroke-width": 7, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, clip);
      el("path", { d: "M664 196 H936 L968 332 H632 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, clip);
      el("rect", { x: 690, y: 220, width: 220, height: 14, rx: 7, fill: "#fff" }, clip);
      const rz = resetter(api, 1.65, 0.8);
      overlay(svg, 1600, 1200, "Clear the card and write the lines again", rz.tap);
      return (t, now) => {
        const s = rz.step(t, now); if (!s) return; const [T, r] = s;
        root.setAttribute("opacity", r < 0 ? fade(T, 9) : lerp(fade(T, 9), 1, r));
        const kc = ob(seg(T, 0.1, 1.0)), dip = 10 * Math.sin(Math.PI * seg(T, 1.4, 1.8));
        tf(card, 0, 900 * (1 - kc) + dip); card.setAttribute("opacity", seg(T, 0.1, 0.3));
        const kp = ob(seg(T, 1.05, 1.55));
        tf(clip, 0, -280 * (1 - kp) + dip); clip.setAttribute("opacity", seg(T, 1.05, 1.15));
        let cx = -1, cy = 0;
        rows.forEach((o, i) => {
          const k = seg(T, o.w, o.w + 0.62), n = Math.round(o.s.length * k);
          o.line.textContent = o.s.slice(0, n);
          if (k > 0 && k < 1) { cx = 472 + n * 32.4 + 6; cy = o.y - 44; }
          const c = r < 0 ? 0 : oc(seg(r, i * 0.07, 0.45 + i * 0.07));
          o.line.setAttribute("opacity", 1 - c); tf(o.line, -40 * c, 0);
          const kt = ob(seg(T, o.w + 0.62, o.w + 1.02)) * (1 - c);
          tf(o.tick, 400, o.y - 18, kt); o.tick.setAttribute("opacity", kt > 0.01 ? 1 : 0);
        });
        caret.setAttribute("x", cx); caret.setAttribute("y", cy); caret.setAttribute("opacity", cx > 0 && r < 0 ? 1 : 0);
      };
    },
  };

  /* ---- 2. a Root folder opens on a Package folder; the arrow runs to the nearest note ---- */
  SC.stickynote = {
    w: 1600, h: 1200, dur: 9, still: 8,
    build(svg, api) {
      const root = el("g", {}, svg);
      const outer = el("g", {}, root);
      const BACK = "M160 1048 V192 Q160 152 200 152 H472 Q504 152 516 180 L540 240 H1400 Q1440 240 1440 280 V1048 Q1440 1088 1400 1088 H200 Q160 1088 160 1048 Z";
      el("path", { d: BACK, fill: LIL, transform: "translate(22 26)" }, outer);
      el("path", { d: BACK, fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, outer);
      const rootLbl = txt(outer, 226, 216, "Root", { "font-family": MONO, "font-size": 48, "font-weight": 700 });
      const inner = el("g", {}, outer);
      el("path", { d: "M300 1040 V468 Q300 428 340 428 H612 Q644 428 656 456 L680 516 H1160 Q1200 516 1200 556 V1040 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, inner);
      const pkg = txt(inner, 352, 492, "Package", { "font-family": MONO, "font-size": 48, "font-weight": 700 });
      const inNote = el("g", {}, inner); note(inNote, 160, YEL);
      const front = el("path", { fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, outer);
      const outNote = el("g", {}, outer); note(outNote, 180, YEL);
      const AD = "M1170 300 C1010 236 860 330 830 556";
      const aInk = el("path", { d: AD, stroke: INK, "stroke-width": 17, fill: "none", "stroke-linecap": "round" }, root);
      const aBlue = el("path", { d: AD, stroke: BLUE, "stroke-width": 9, fill: "none", "stroke-linecap": "round" }, root);
      const L = aBlue.getTotalLength();
      [aInk, aBlue].forEach((p) => p.setAttribute("stroke-dasharray", `${L} ${L + 40}`));
      const head = el("path", { d: "M26 0 L-20 -24 L-20 24 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, root);
      const tag = el("g", {}, root);
      el("rect", { x: -190, y: -40, width: 380, height: 80, rx: 40, fill: MINT, stroke: INK, "stroke-width": 3 }, tag);
      const tagTxt = txt(tag, 0, 16, "Nearest wins", { "text-anchor": "middle", "font-family": MONO, "font-size": 44, "font-weight": 700 });
      const rz = resetter(api, 3.7, 0.9);
      overlay(svg, 1600, 1200, "Send the arrow back to the outer folder and play it again", rz.tap);
      return (t, now) => {
        const s = rz.step(t, now); if (!s) return; const [T, r] = s;
        const back = r < 0 ? 1 : 1 - io(r);
        root.setAttribute("opacity", r < 0 ? fade(T, 9) : lerp(fade(T, 9), 1, r));
        const ke = ob(seg(T, 0, 0.8)); tf(outer, 0, 120 * (1 - ke)); outer.setAttribute("opacity", seg(T, 0, 0.25));
        rootLbl.setAttribute("opacity", seg(T, 0.5, 0.65)); tf(rootLbl, 0, 16 * (1 - ob(seg(T, 0.5, 0.9))));
        const kn = ob(seg(T, 0.8, 1.25)); tf(outNote, 1270, 292, 0.4 + 0.6 * kn, 6 - 20 * (1 - kn)); outNote.setAttribute("opacity", seg(T, 0.8, 0.9));
        const ko = io(seg(T, 1.5, 2.6)), yt = 392 + 552 * ko, sp = 28 * ko;
        front.setAttribute("d", `M${160 - sp} ${yt} L${1440 + sp} ${yt} L1440 1048 Q1440 1088 1400 1088 H200 Q160 1088 160 1048 Z`);
        tf(inner, 0, 220 * (1 - ob(seg(T, 1.9, 2.8))));
        pkg.setAttribute("opacity", seg(T, 2.55, 2.7)); tf(pkg, 0, 14 * (1 - ob(seg(T, 2.55, 2.95))));
        const kin = ob(seg(T, 3.0, 3.45)), grow = ob(seg(T, 5.4, 6.0)) * back;
        tf(inNote, 810, 672, (0.4 + 0.6 * kin) * (1 + 0.15 * grow), -4 - 16 * (1 - kin)); inNote.setAttribute("opacity", seg(T, 3.0, 3.1));
        const ap = io(seg(T, 3.9, 5.5)) * back, on = ap > 0.01 ? 1 : 0;
        [aInk, aBlue].forEach((p) => { p.setAttribute("stroke-dashoffset", L * (1 - ap)); p.setAttribute("opacity", on); });
        const a = aBlue.getPointAtLength(Math.max(0, L * ap - 3)), b = aBlue.getPointAtLength(Math.min(L, Math.max(3, L * ap)));
        tf(head, b.x, b.y, 1, (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI); head.setAttribute("opacity", on);
        const kt = ob(seg(T, 5.8, 6.3)), out = r < 0 ? 0 : seg(r, 0, 0.5);
        tf(tag, 810, 860 + 24 * (1 - kt) + 30 * out, 0.7 + 0.3 * kt); tag.setAttribute("opacity", seg(T, 5.8, 5.95) * (1 - out));
        tagTxt.setAttribute("opacity", seg(T, 6.1, 6.4)); tf(tagTxt, 0, 10 * (1 - oc(seg(T, 6.1, 6.5))));
      };
    },
  };

  /* ---- 3. a compass rose: the needle leaves Claude for Agents, then settles on Both ---- */
  SC.compassrose = {
    w: 1600, h: 1200, dur: 9, still: 8,
    build(svg, api) {
      const C = [800, 710];
      const root = el("g", {}, svg);
      const rose = el("g", {}, root);
      el("circle", { cx: 20, cy: 24, r: 280, fill: LIL }, rose);
      el("circle", { r: 280, fill: SKY, stroke: INK, "stroke-width": 3 }, rose);
      el("circle", { r: 232, fill: "none", stroke: "#fff", "stroke-width": 5 }, rose);
      const ticks = Array.from({ length: 24 }, (_, i) => el("path", { d: "M250 0 H268", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", transform: `rotate(${i * 15})` }, rose));
      const point = (ang, col) => {
        const g = el("g", {}, root);
        el("path", { d: "M0 0 L130 -66 L420 0 L130 66 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: "M30 0 H396", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        return (k) => { g.setAttribute("transform", `translate(${C[0]} ${C[1]}) rotate(${ang}) scale(${k})`); g.setAttribute("opacity", k > 0.01 ? 1 : 0); };
      };
      const pClaude = point(180, LIL), pAgents = point(0, LIL), pBoth = point(-90, YEL);
      const pill = (cx, cy, s, col) => {
        const g = el("g", {}, root), w = s.length * 30 + 64;
        const bg = el("rect", { x: -w / 2, y: -46, width: w, height: 92, rx: 46, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const tx = txt(g, 0, 18, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 50, "font-weight": 700 });
        return { g, bg, tx, cx, cy };
      };
      const lClaude = pill(238, 710, "Claude", LIL), lAgents = pill(1362, 710, "Agents", LIL), lBoth = pill(800, 216, "Both", YEL);
      const needle = el("g", {}, root);
      el("path", { d: "M-96 0 L0 -26 L318 0 L0 26 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, needle);
      el("circle", { r: 32, fill: "#fff", stroke: INK, "stroke-width": 3 }, needle);
      el("circle", { r: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, needle);
      const ang = (T) => 150 + 30 * ob(seg(T, 1.3, 2.0)) - 180 * io(seg(T, 3.2, 4.6)) - 90 * ob(seg(T, 5.8, 7.0));
      const rz = resetter(api, 2.0, 0.9);
      overlay(svg, 1600, 1200, "Swing the needle back to Claude", rz.tap);
      const show = (l, k, o = 1) => { tf(l.g, l.cx, l.cy, 0.6 + 0.4 * k); l.g.setAttribute("opacity", o); };
      return (t, now) => {
        const s = rz.step(t, now); if (!s) return; const [T, r] = s;
        const back = r < 0 ? 1 : 1 - io(r);
        root.setAttribute("opacity", r < 0 ? fade(T, 9) : lerp(fade(T, 9), 1, r));
        tf(rose, C[0], C[1], 0.7 + 0.3 * ob(seg(T, 0, 0.7))); rose.setAttribute("opacity", seg(T, 0, 0.2));
        ticks.forEach((n, i) => n.setAttribute("opacity", seg(T, 0.3 + i * 0.02, 0.4 + i * 0.02)));
        pClaude(ob(seg(T, 0.6, 1.1))); pAgents(ob(seg(T, 0.7, 1.2))); pBoth(ob(seg(T, 5.0, 5.6)) * back);
        show(lClaude, ob(seg(T, 1.0, 1.4)), seg(T, 1.0, 1.15)); show(lAgents, ob(seg(T, 1.1, 1.5)), seg(T, 1.1, 1.25));
        show(lBoth, ob(seg(T, 6.7, 7.2)), seg(T, 6.7, 6.85) * (r < 0 ? 1 : 1 - seg(r, 0, 0.5)));
        const f = io(seg(T, 2.6, 3.2)) * back;
        lClaude.bg.setAttribute("fill", mix(LIL, SOFT, f)); lClaude.bg.setAttribute("stroke", mix(INK, MUTE, f)); lClaude.tx.setAttribute("fill", mix(INK, MUTE, f));
        let a = ang(T);
        if (r >= 0) { const to = a - ((((a - 180) % 360) + 360) % 360); a = lerp(a, to, io(r)); }
        tf(needle, C[0], C[1], 0.6 + 0.4 * ob(seg(T, 1.3, 1.9)), a); needle.setAttribute("opacity", seg(T, 1.3, 1.45));
      };
    },
  };

  /* ---- title card, 16 by 9 (a still only) ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6, still: 5,
    build(svg) {
      const root = el("g", {}, svg);
      const pill = el("g", {}, root);
      el("rect", { x: 80, y: 64, width: 156, height: 64, rx: 32, fill: YEL, stroke: INK, "stroke-width": 3 }, pill);
      txt(pill, 158, 107, "Guide", { "text-anchor": "middle", "font-family": MONO, "font-size": 32, "font-weight": 700 });
      const chk = txt(root, 1520, 107, "Checked 24 Nov 2026", { "text-anchor": "end", "font-family": MONO, "font-size": 30, "font-weight": 500, fill: MUTE });
      const title = txt(root, 80, 292, "AGENTS.md best practices", { "font-size": 108, "font-weight": 700 }); fit(title, 1440);
      const ul = el("path", { stroke: YEL, "stroke-width": 18, "stroke-linecap": "round", fill: "none" }, root);
      const sub = txt(root, 82, 418, "One instructions file many coding agents read", { "font-size": 42, "font-weight": 500, fill: MUTE }); fit(sub, 1440);
      const tile = (x, col, l1, l2) => {
        const g = el("g", {}, root);
        el("rect", { x: x + 16, y: 596, width: 690, height: 230, rx: 30, fill: SOFT }, g);
        el("rect", { x, y: 578, width: 690, height: 230, rx: 30, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const words = el("g", {}, g);
        [l1, l2].forEach((s, i) => fit(txt(words, x + 44, 680 + i * 58, s, { "font-family": MONO, "font-size": 38, "font-weight": 700 }), 610));
        return { g, words };
      };
      const tL = tile(80, LIL, "Codex caps it at 32 KiB", "by default"), tR = tile(830, SKY, "Claude Code reads it when", "there is no CLAUDE.md");
      const card = el("g", {}, root);
      el("rect", { x: -75, y: -50, width: 150, height: 100, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, card);
      el("path", { d: "M-55 -24 H55", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, card);
      ["M-55 0 H40", "M-55 18 H52", "M-55 36 H18"].forEach((d) => el("path", { d, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, card));
      const stk = el("g", {}, root); note(stk, 104, MINT);
      return (t) => {
        root.setAttribute("opacity", fade(t, 6));
        pv(pill, 158, 96, 0.6 + 0.4 * ob(seg(t, 0.1, 0.5))); pill.setAttribute("opacity", seg(t, 0.1, 0.2));
        chk.setAttribute("opacity", seg(t, 0.2, 0.5)); tf(chk, 0, 12 * (1 - oc(seg(t, 0.2, 0.6))));
        title.setAttribute("opacity", seg(t, 0.35, 0.6)); tf(title, 0, 40 * (1 - oc(seg(t, 0.35, 0.95))));
        const u = io(seg(t, 0.85, 1.35)); ul.setAttribute("d", `M86 336 H${86 + 334 * u}`); ul.setAttribute("opacity", u > 0.01 ? 1 : 0);
        sub.setAttribute("opacity", seg(t, 1.0, 1.3)); tf(sub, 0, 20 * (1 - oc(seg(t, 1.0, 1.5))));
        [[tL, 1.4], [tR, 1.5]].forEach(([o, d]) => { tf(o.g, 0, 60 * (1 - ob(seg(t, d, d + 0.6)))); o.g.setAttribute("opacity", seg(t, d, d + 0.15)); o.words.setAttribute("opacity", seg(t, d + 0.9, d + 1.2)); });
        const kc = ob(seg(t, 1.95, 2.4)), kn = ob(seg(t, 2.05, 2.5));
        tf(card, 178, 508 - 40 * (1 - kc), 1, -6 - 14 * (1 - kc)); card.setAttribute("opacity", seg(t, 1.95, 2.05));
        tf(stk, 930, 506 - 40 * (1 - kn), 1, 6 + 14 * (1 - kn)); stk.setAttribute("opacity", seg(t, 2.05, 2.15));
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
