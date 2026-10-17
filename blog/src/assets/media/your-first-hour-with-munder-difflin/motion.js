/* Bright coded scenes for "Your First Hour With Munder Difflin 0.5.6". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame.

   TO ADD A SCENE: write SC.NAME = { dur, still, build(svg, api) { ...; return (t, now) => {} } } just above
   the line marked "ADD NEW SCENES ABOVE THIS LINE". Change nothing else in this file.
   - The drawing is 800 by 600 units (shown 1600 by 1200). dur is the loop in seconds, still is the frame for NAME.png.
   - build draws everything once and returns the frame function: t is the loop time, now never wraps (idle motion).
   - api.seek(s) jumps the loop to second s (a replay). api.now() is the clock. api.poke() redraws after a tap.
   - Helpers: el, txt, head (heading plus tap hint), strip and say (the caption line), button (tap and keyboard),
     pill, star, fit, mv (marks a group that moves, for the measurement tests), seg, io, oc, bk, land, lerp, tf. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
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
  /* ease that lands a little past the mark and settles; c sets how far past */
  const bk = (x, c) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const land = (k, c = 2.2) => cl(bk(k, c), 0, 1.5);
  /* scene heading on the left, the tap hint on the right; the heading shrinks if the two would touch */
  const head = (svg, s, hint) => {
    const a = txt(svg, 44, 62, s, { "font-size": 32, "font-weight": 700 });
    const b = txt(svg, 756, 60, hint, { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
    const room = 756 - b.getComputedTextLength() - 28 - 44, w = a.getComputedTextLength();
    if (w > room) a.setAttribute("font-size", Math.floor((32 * room) / w));
  };
  const star = (p, x, y, r, fill) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, p);
  /* shrink a label until it fits the room it has */
  const fit = (n, room) => { const w = n.getComputedTextLength(), f = parseFloat(n.getAttribute("font-size")); if (w > room) n.setAttribute("font-size", Math.floor((f * room * 10) / w) / 10); return n; };
  /* set the caption strip, at 20 unless the line is too long for the strip */
  const say = (n, s, room = 690) => { if (n._s === s) return; n._s = s; n.textContent = s; n.setAttribute("font-size", 20); fit(n, room); };
  /* a status pill sized to its word, with or without a tick */
  const pill = (p, s, fill, tick) => {
    const g = el("g", {}, p), r = el("rect", { y: -18, height: 36, rx: 18, fill, stroke: INK, "stroke-width": 2.5 }, g);
    const w = txt(g, tick ? 12 : 0, 7, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }).getComputedTextLength() + (tick ? 54 : 34);
    r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    if (tick) el("path", { d: `M${-w / 2 + 15} 1 l6 6 l10 -13`, fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    return g;
  };
  /* mark a group as moving, so the measurement tests can see when it crosses a label */
  const mv = (g) => { g.setAttribute("data-mv", ""); return g; };

  const SC = {};

  /* ---- title card, 16 by 9: a stopwatch whose hand goes once round, one hour, and then it rings ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 2.6,
    build(svg) {
      txt(svg, 66, 92, "From first sign in to a working office", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const L = ["Your First Hour", "With Munder Difflin", "0.5.6"].map((s, i) => txt(svg, 62, 176 + i * 74, s, { "font-size": 76, "font-weight": 700 }));
      const w = Math.max(...L.map((n) => n.getComputedTextLength()));
      if (w > 556) L.forEach((n) => n.setAttribute("font-size", Math.floor((76 * 556) / w)));
      el("path", { d: `M68 344 H${Math.round(56 + L[2].getComputedTextLength())}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      const pt = txt(svg, 0, 419, "Onboarding guide", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 }), pw = Math.round(pt.getComputedTextLength() + 64);
      svg.insertBefore(el("rect", { x: 62, y: 382, width: pw, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }), pt);
      pt.setAttribute("x", 62 + pw / 2);
      el("path", { d: "M70 494 C190 468 300 518 420 490 S560 492 620 478", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 16" }, svg);
      el("circle", { cx: 70, cy: 494, r: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      /* the stopwatch: a ring on top, two side buttons, the crown, a face with sixty marks */
      const c = el("g", {}, svg);
      el("circle", { cx: 0, cy: -172, r: 15, fill: "none", stroke: INK, "stroke-width": 4 }, c);
      [-1, 1].forEach((s) => el("rect", { x: -12, y: -142, width: 24, height: 26, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3, transform: `rotate(${s * 40})` }, c));
      el("rect", { x: -11, y: -136, width: 22, height: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, c);
      const crown = el("rect", { x: -24, y: -160, width: 48, height: 26, rx: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, c);
      el("circle", { r: 118, fill: BLUE, stroke: INK, "stroke-width": 3 }, c);
      el("circle", { r: 98, fill: "#fff", stroke: INK, "stroke-width": 3 }, c);
      const LEN = 2 * Math.PI * 62;
      const ring = el("circle", { r: 62, fill: "none", stroke: YEL, "stroke-width": 22, transform: "rotate(-90)" }, c);
      el("circle", { r: 88, fill: "none", stroke: MUTE, "stroke-width": 7, "stroke-dasharray": `2 ${((2 * Math.PI * 88) / 60 - 2).toFixed(3)}`, "stroke-dashoffset": 1 }, c);
      for (let i = 0; i < 12; i++) el("path", { d: "M0 -76 V-92", stroke: INK, "stroke-width": 4.5, "stroke-linecap": "round", transform: `rotate(${i * 30})` }, c);
      const hand = el("path", { d: "M0 16 V-78", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, c);
      el("circle", { r: 10, fill: INK }, c);
      el("circle", { r: 4, fill: YEL }, c);
      const ding = el("path", { d: [-1, 1].map((s) => `M${s * 128} -42 q${s * 12} 42 0 84 M${s * 142} -60 q${s * 14} 60 0 120`).join(" "), fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, c);
      star(svg, 646, 132, 15, YEL); star(svg, 912, 470, 17, MINT); star(svg, 662, 456, 12, SKY);
      return (t) => {
        const k = io(seg(t, 0.35, 2.3)), out = io(seg(t, 3.5, 3.95)), tau = t - 2.3, ring2 = tau > 0 && tau < 1.3 ? Math.exp(-2.5 * tau) : 0;
        ring.setAttribute("stroke-dasharray", `${(LEN * k * (1 - out)).toFixed(2)} ${(LEN + 4).toFixed(2)}`);
        hand.setAttribute("transform", `rotate(${(360 * k * (1 - out) + (tau > 0 ? 6 * Math.exp(-5 * tau) * Math.sin(20 * tau) : 0)).toFixed(2)})`);
        crown.setAttribute("transform", `translate(0 ${(5 * Math.sin(Math.PI * seg(t, 0.1, 0.35))).toFixed(2)})`);
        c.setAttribute("transform", `translate(${(794 + 2.2 * ring2 * Math.sin(tau * 60)).toFixed(2)} 296)`);
        ding.setAttribute("opacity", (seg(t, 2.3, 2.4) * (1 - seg(t, 3.3, 3.55))).toFixed(2));
        ding.setAttribute("transform", `scale(${(1 + 0.04 * Math.sin(Math.max(0, tau) * 26)).toFixed(3)})`);
      };
    },
  };

  /* ---- hour: a bus route with six stops, one for each part of the hour; the bus takes the hairpin a little fast ---- */
  SC.hour = {
    dur: 14, still: 12.4,
    build(svg, api) {
      head(svg, "Your first hour", "tap a stop");
      const X0 = 122, XE = 634, R1 = 222, R2 = 406, RAD = 92, RUN = XE - X0, ARC = Math.PI * RAD, LEN = 2 * RUN + ARC;
      const S = [0, 216, 432, RUN + ARC + 80, RUN + ARC + 296, LEN];
      const LIT = [0.8, 2.6, 4.6, 7.3, 9.3, 11.3], DEP = [1.6, 3.5, 5.5, 8.2, 10.2];
      const ST = [["Minute 0", ["sign in"]], ["Minute 10", ["a first job"]], ["Minute 20", ["a small team"]], ["Minute 35", ["work that starts", "without you"]], ["Minute 45", ["temps and tokens"]], ["Minute 50", ["the Pro screens"]]];
      const SAY = ["Minute 0: sign in", "Minute 10: give your orchestrator one real job", "Minute 20: hire a small team", "Minute 35: set up work that starts without you", "Minute 45: temps and tokens", "Minute 50: learn the Pro screens"];
      /* where the bus is at distance s along the route, and how far round the hairpin it has come */
      const at = (s) => {
        if (s <= RUN) return [X0 + s, R1, 0];
        if (s <= RUN + ARC) { const a = (s - RUN) / RAD; return [XE + RAD * Math.sin(a), R1 + RAD - RAD * Math.cos(a), a]; }
        return [XE - (s - RUN - ARC), R2, Math.PI];
      };
      /* trees and a pond, because it is a map */
      const trees = [[700, 164, 17], [744, 160, 23], [668, 494, 15], [710, 498, 23], [752, 492, 17]].map(([x, y, r]) => {
        const g = el("g", {}, svg);
        el("path", { d: `M${x} ${y} V${y - r - 10}`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g);
        el("circle", { cx: x, cy: y - r - 14, r, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g);
        return { g, x, y };
      });
      el("ellipse", { cx: 662, cy: 314, rx: 36, ry: 24, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);
      const rip = el("ellipse", { cx: 662, cy: 314, fill: "none", stroke: "#fff", "stroke-width": 3 }, svg);
      /* the road, and the part of it the bus has already driven */
      const D = `M${X0} ${R1} H${XE} A${RAD} ${RAD} 0 0 1 ${XE} ${R2} H${X0}`;
      el("path", { d: D, fill: "none", stroke: INK, "stroke-width": 18, "stroke-linecap": "round" }, svg);
      el("path", { d: D, fill: "none", stroke: "#fff", "stroke-width": 12, "stroke-linecap": "round" }, svg);
      const done = el("path", { d: D, fill: "none", stroke: BLUE, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      /* skid marks on the outside of the hairpin */
      const A0 = 0.95, A1 = 2.2;
      const skid = [RAD + 16, RAD + 23].map((r) => {
        const p = (a) => `${(XE + r * Math.sin(a)).toFixed(1)} ${(R1 + RAD - r * Math.cos(a)).toFixed(1)}`;
        return { n: el("path", { d: `M${p(A0)} A${r} ${r} 0 0 1 ${p(A1)}`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg), L: r * (A1 - A0) };
      });
      /* the six stops; each one is a button that sends the bus there */
      let ov = null, cur = 0;
      const send = (i) => { ov = { s: cur, to: S[i], t0: api.now() }; api.seek(LIT[i] - 0.8); };
      const stops = ST.map(([m, nm], i) => {
        const [x, y] = at(S[i]), g = el("g", {}, svg);
        el("rect", { x: x - 102, y: y - 112, width: 204, height: nm.length > 1 ? 192 : 162, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const p = pill(g, m, SOFT);
        const dot = el("circle", { cx: x, cy: y, r: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const names = nm.map((s, j) => txt(g, x, y + 44 + j * 27, s, { "text-anchor": "middle", "font-size": 22, fill: MUTE }));
        button(g, `Send the bus to ${m.toLowerCase()}: ${nm.join(" ")}`, () => send(i));
        return { x, y, p, r: p.firstChild, dot, names };
      });
      /* the bus, side on; it stays upright and turns round in the hairpin */
      const bus = mv(el("g", { "pointer-events": "none" }, svg));
      el("rect", { x: -35, y: -46, width: 70, height: 34, rx: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, bus);
      [-28, -10].forEach((x) => el("rect", { x, y: -40, width: 14, height: 12, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2 }, bus));
      el("rect", { x: 8, y: -40, width: 21, height: 12, rx: 3, fill: SKY, stroke: INK, "stroke-width": 2 }, bus);
      el("path", { d: "M-35 -21 H35", stroke: INK, "stroke-width": 2 }, bus);
      const wh = [-18, 18].map((x) => {
        const w = el("g", {}, bus);
        el("circle", { r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, w);
        el("path", { d: "M-4 0 H4", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, w);
        return { w, x };
      });
      const sp = el("g", { "pointer-events": "none" }, svg); star(sp, 0, 0, 13, YEL);
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 13.2, 13.45), vis = 1 - out, home = t >= 13.45;
        let s = home ? 0 : LEN, last = 0, turn = 1;
        for (let i = 0; i < 6; i++) if (t >= LIT[i]) last = i;
        if (!home) for (let i = 0; i < 5; i++) if (t < LIT[i + 1]) { s = lerp(S[i], S[i + 1], io(seg(t, DEP[i], LIT[i + 1]))); break; }
        /* after a tap the bus drives from where it was to the stop that was tapped, then turns to face the route again */
        if (ov) {
          const k = (now - ov.t0) / 0.8;
          if (k < 0 || k >= 1) ov = null;
          else { const d = Math.sign(ov.to - ov.s) || 1; s = lerp(ov.s, s, io(k)); turn = lerp(d, 1, io(seg(k, 0.72, 1))); }
        }
        cur = s;
        const [x, y, a] = at(s);
        const face = lerp(1, -1, io(seg(a, 1.15, 2.0))) * turn, lean = 13 * Math.sin(a);
        const ta = t - LIT[last], hop = !ov && ta > 0 && ta < 1.2 ? 4 * Math.exp(-6 * ta) * Math.abs(Math.sin(15 * ta)) : 0;
        const idle = t > 11.9 && !home ? 0.8 * Math.sin(now * 14) : 0;
        bus.setAttribute("transform", `translate(${x.toFixed(2)} ${(y - 8 - hop + idle).toFixed(2)}) rotate(${lean.toFixed(2)}) scale(${face.toFixed(3)} 1)`);
        bus.setAttribute("opacity", (home ? seg(t, 13.5, 13.75) : vis).toFixed(2));
        wh.forEach((w) => w.w.setAttribute("transform", `translate(${w.x} -8) rotate(${((s / 8) * 57.3).toFixed(1)})`));
        done.setAttribute("stroke-dasharray", `${s.toFixed(1)} ${LEN + 40}`);
        done.setAttribute("opacity", vis.toFixed(2));
        const sk = seg(s, RUN + RAD * (A0 + 0.2), RUN + RAD * (A1 + 0.35));
        skid.forEach((m) => { m.n.setAttribute("stroke-dasharray", `${(m.L * sk).toFixed(1)} ${(m.L + 20).toFixed(1)}`); m.n.setAttribute("opacity", sk > 0 ? vis.toFixed(2) : 0); });
        stops.forEach((st, i) => {
          const lit = t >= LIT[i] && !home && out < 0.5, bump = Math.sin(Math.PI * seg(t, LIT[i], LIT[i] + 0.4)) * vis;
          tf(st.p, st.x, st.y - 84, (1 + 0.12 * bump).toFixed(3));
          st.r.setAttribute("fill", lit ? YEL : SOFT);
          st.dot.setAttribute("fill", lit ? YEL : "#fff");
          st.dot.setAttribute("r", (12 + 3 * bump).toFixed(2));
          st.names.forEach((n) => n.setAttribute("fill", lit ? INK : MUTE));
        });
        tf(sp, 182, 366, (land(seg(t, 11.5, 11.9), 2.6) * (home ? 0 : vis) * (1 + 0.12 * Math.sin(now * 3))).toFixed(3), (now * 20).toFixed(1));
        trees.forEach((tr, i) => tr.g.setAttribute("transform", `rotate(${(1.6 * Math.sin(now * 1.4 + i * 1.3)).toFixed(2)} ${tr.x} ${tr.y})`));
        const rp = (now * 0.4 + 0.35) % 1;
        rip.setAttribute("rx", (6 + 24 * rp).toFixed(1)); rip.setAttribute("ry", (4 + 15 * rp).toFixed(1)); rip.setAttribute("opacity", (1 - rp).toFixed(2));
        say(cap, t >= LIT[0] && !home && out < 0.5 ? SAY[last] : "The first hour as a route", 700);
      };
    },
  };

  /* ---- brief: a long toaster with two slots; a vague note comes back as a question, a full brief as three tasks ---- */
  SC.brief = {
    dur: 14, still: 12,
    build(svg, api) {
      head(svg, "Give your orchestrator a first job", "tap a note");
      const XA = 212, XB = 588, TOP = 388;
      const clip = el("clipPath", { id: "mg-brief-slots" }, el("defs", {}, svg));
      el("rect", { x: 0, y: 0, width: 800, height: TOP + 1 }, clip);
      /* the two notepads; each is a button that drops its note again */
      const pad = (x, tag, tagFill, lines, label, at) => {
        const g = el("g", {}, svg);
        el("rect", { x: x - 152, y: 80, width: 304, height: 190, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("rect", { x: x - 126, y: 134, width: 264, height: 126, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: x - 132, y: 128, width: 264, height: 126, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: x - 132, y: 128, width: 264, height: 20, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
        [0, 1, 2].forEach((j) => el("path", { d: `M${x - 114} ${189 + j * 28} H${x + 114}`, stroke: LIL, "stroke-width": 1.5 }, g));
        lines.forEach((s, j) => {
          el("circle", { cx: x - 108, cy: 175 + j * 28, r: 4.5, fill: BLUE }, g);
          txt(g, x - 96, 182 + j * 28, s, { "font-size": 21, "font-weight": 600 });
        });
        tf(pill(g, tag, tagFill), x, 104);
        button(g, label, () => api.seek(at));
      };
      pad(XA, "Weak", SOFT, ["clean up my project"], "Drop the weak note again", 0.7);
      pad(XB, "Better", MINT, ["the outcome", "the folder", "what done looks like"], "Drop the better note again", 5.0);
      /* the back of the toaster: the two slots, which glow while it works */
      const back = el("g", {}, svg);
      const slots = [XA, XB].map((x) => el("rect", { x: x - 80, y: TOP - 9, width: 160, height: 18, rx: 9, fill: INK, stroke: INK, "stroke-width": 3 }, back));
      /* what goes in and what comes out, clipped at the top of the toaster */
      const lay = el("g", { "clip-path": "url(#mg-brief-slots)" }, svg);
      const slip = (n) => {
        const g = mv(el("g", { "pointer-events": "none" }, lay));
        el("rect", { x: -36, y: -26, width: 72, height: 52, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -36, y: -26, width: 72, height: 11, rx: 5, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: n === 1 ? "M-22 4 H16" : "M-22 -2 H20 M-22 8 H12 M-22 18 H22", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        return g;
      };
      const SA = slip(1), SB = slip(3);
      const Q = mv(el("g", { "pointer-events": "none" }, lay));
      el("rect", { x: -52, y: -116, width: 104, height: 140, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, Q);
      txt(Q, 0, -38, "?", { "text-anchor": "middle", "font-size": 70, "font-weight": 700, fill: MUTE });
      const tasks = [SKY, LIL, YEL].map((c) => {
        const g = mv(el("g", { "pointer-events": "none" }, lay));
        el("rect", { x: -38, y: -98, width: 76, height: 94, rx: 8, fill: c, stroke: INK, "stroke-width": 3 }, g);
        const box = el("rect", { x: -26, y: -86, width: 24, height: 24, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const tick = el("path", { d: "M-20 -74 l4.5 5 l9 -11", fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        el("path", { d: "M6 -74 H26 M-26 -48 H26 M-26 -33 H26 M-26 -18 H10", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        return { g, box, tick };
      });
      /* the front of the toaster */
      const front = el("g", {}, svg);
      const BOT = TOP + 102;
      el("path", { d: `M132 ${TOP} H668 A40 40 0 0 1 708 ${TOP + 40} V${BOT - 14} A14 14 0 0 1 694 ${BOT} H106 A14 14 0 0 1 92 ${BOT - 14} V${TOP + 40} A40 40 0 0 1 132 ${TOP} Z`, fill: LIL, stroke: INK, "stroke-width": 3 }, front);
      el("path", { d: `M136 ${TOP + 20} H664`, stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round" }, front);
      [122, 644].forEach((x) => el("rect", { x, y: BOT, width: 34, height: 8, rx: 3, fill: INK }, front));
      txt(front, 400, TOP + 66, "your orchestrator", { "text-anchor": "middle", "font-size": 27, "font-weight": 700 });
      el("circle", { cx: 150, cy: TOP + 58, r: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, front);
      const dial = el("path", { d: "M0 0 V-13", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, front);
      el("rect", { x: 648, y: TOP + 32, width: 12, height: 58, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, front);
      const lever = el("rect", { x: 634, width: 40, height: 16, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, front);
      /* the vague note is still smoking a little */
      const puff = [0, 1].map(() => el("path", { d: "M0 0 q-9 -11 0 -22 t0 -22", fill: "none", stroke: MUTE, "stroke-width": 3, "stroke-linecap": "round" }, svg));
      const cap = strip(svg, 508, 740);
      const PA = 3.3, PB = 7.6;
      return (t) => {
        const out = seg(t, 13.2, 13.45), vis = 1 - out, sink = 30 * io(seg(t, 13.2, 13.5));
        const cookA = t >= 2.05 && t < PA, cookB = t >= 6.35 && t < PB, cook = cookA || cookB;
        /* the slips: each pops out under its pad and drops into its slot */
        [[SA, XA, 0.9], [SB, XB, 5.2]].forEach(([g, x, a]) => {
          const f = io(seg(t, a + 0.45, a + 1.1));
          tf(g, x, (292 + (TOP + 70 - 292) * f).toFixed(2), land(seg(t, a, a + 0.3), 2).toFixed(3), (-8 * Math.sin(Math.PI * f)).toFixed(2));
          g.setAttribute("opacity", t >= a && t < a + 1.15 ? 1 : 0);
        });
        /* the toaster works, then pops */
        const lv = Math.max(seg(t, 1.95, 2.1) * (1 - seg(t, PA, PA + 0.06)), seg(t, 6.25, 6.4) * (1 - seg(t, PB, PB + 0.06)));
        const ha = t - PA, hb = t - PB, hp = (v) => (v > 0 && v < 1 ? 5 * Math.exp(-7 * v) * Math.abs(Math.sin(16 * v)) : 0);
        const jig = cook ? 1.3 * Math.sin(t * 60) : 0, lift = hp(ha) + hp(hb);
        [back, front].forEach((g) => g.setAttribute("transform", `translate(${jig.toFixed(2)} ${(-lift).toFixed(2)})`));
        lever.setAttribute("y", (TOP + 30 + 46 * lv).toFixed(2));
        slots[0].setAttribute("fill", cookA ? YEL : INK);
        slots[1].setAttribute("fill", cookB ? YEL : INK);
        const dk = cookA ? seg(t, 2.1, PA) : cookB ? seg(t, 6.4, PB) : 1;
        dial.setAttribute("transform", `translate(150 ${TOP + 58}) rotate(${(150 * (1 - dk)).toFixed(1)})`);
        /* the vague note comes back as one grey card with a question mark */
        const qa = land(seg(t, PA, PA + 0.42), 1.7), qw = t - PA - 0.4;
        tf(Q, XA, (TOP + 120 * (1 - qa) + sink).toFixed(2), 1, (qw > 0 ? 7 * Math.exp(-4 * qw) * Math.sin(13 * qw) : 0).toFixed(2));
        Q.setAttribute("opacity", t >= PA ? vis.toFixed(2) : 0);
        puff.forEach((c, j) => {
          const p0 = (t - PA - 0.1) * 0.4 - j * 0.5, p = p0 % 1;
          c.setAttribute("transform", `translate(${(XA + 64 + 8 * j + 4 * Math.sin(p * 5)).toFixed(1)} ${(TOP - 10 - 58 * p).toFixed(1)}) scale(${(0.7 + 0.45 * p).toFixed(3)})`);
          c.setAttribute("opacity", p0 < 0 ? 0 : (cl(p * 5) * (1 - p) * vis).toFixed(2));
        });
        /* the full brief comes back as three task cards that hop apart, and each gets its tick */
        const ta = land(seg(t, PB, PB + 0.4), 1.6), spr = io(seg(t, PB + 0.45, PB + 1.05));
        tasks.forEach((k, i) => {
          const hop = i === 1 ? 0 : 16 * Math.sin(Math.PI * spr);
          tf(k.g, (XB + (i - 1) * 86 * spr).toFixed(2), (TOP + 104 * (1 - ta) - hop + sink).toFixed(2), 1, ((i - 1) * 10 * Math.sin(Math.PI * spr)).toFixed(2));
          k.g.setAttribute("opacity", t >= PB ? vis.toFixed(2) : 0);
          const tk = seg(t, 9.1 + 0.45 * i, 9.4 + 0.45 * i);
          k.tick.setAttribute("stroke-dasharray", `${(21 * tk).toFixed(2)} 30`);
          k.tick.setAttribute("opacity", tk > 0 ? 1 : 0);
          k.box.setAttribute("fill", tk > 0.5 ? MINT : "#fff");
        });
        say(cap, t >= 13.2 || t < PA ? "A vague brief gets a vague job" : t < 5.2 ? "A vague one turns into a question" : t < PB ? "The outcome, the folder, and what done looks like" : "Turns into clear tasks", 700);
      };
    },
  };

  /* ---- team: three office chairs roll in, one per hire; a change goes from the builder to the reviewer and back with a tick ---- */
  SC.team = {
    dur: 14, still: 12.4,
    build(svg, api) {
      head(svg, "Hire a small team", "tap the builder");
      const XS = [150, 400, 650], FL = 400, COL = [SKY, LIL, MINT], PR = [0.7, 2.6, 4.3], IN = [0.85, 2.75, 4.45];
      const ROLE = ["builder", "reviewer", "helper"], ENG = ["on Claude Code", "on Codex", "on a free engine"];
      el("path", { d: `M44 ${FL + 2} H756`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      /* three open seats, drawn as dotted outlines */
      const ghost = XS.map((x) => {
        const g = el("g", { fill: "none", stroke: LIL, "stroke-width": 3, "stroke-dasharray": "7 8", "stroke-linecap": "round" }, svg);
        el("rect", { x: x - 50, y: FL - 214, width: 100, height: 92, rx: 22 }, g);
        el("rect", { x: x - 56, y: FL - 104, width: 112, height: 22, rx: 11 }, g);
        el("path", { d: `M${x} ${FL - 80} V${FL - 14} M${x - 38} ${FL - 6} H${x + 38}` }, g);
        return g;
      });
      /* under each seat: its role, and the engine it runs on once hired */
      const zone = XS.map((x, i) => {
        const g = el("g", {}, svg);
        if (i === 0) el("rect", { x: x - 112, y: 170, width: 224, height: 332, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const slot = el("rect", { x: x - 96, y: 458, width: 192, height: 36, rx: 18, fill: "none", stroke: LIL, "stroke-width": 2.5, "stroke-dasharray": "6 7" }, g);
        const role = txt(g, x, 438, ROLE[i], { "text-anchor": "middle", "font-size": 26, "font-weight": 700, fill: MUTE });
        const p = pill(g, ENG[i], COL[i]);
        return { slot, role, p };
      });
      button(zone[0].role.parentNode, "Send another change from the builder to the reviewer", () => api.seek(6.5));
      /* the chairs */
      const chairs = COL.map((c) => {
        const g = mv(el("g", { "pointer-events": "none" }, svg)), top = el("g", {}, g);
        el("path", { d: "M-38 -10 L0 -24 L38 -10 M0 -24 V-10", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        [-38, 0, 38].forEach((x) => el("circle", { cx: x, cy: -6, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
        el("rect", { x: -6, y: -86, width: 12, height: 64, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M8 -90 H32", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, top);
        el("circle", { cx: 35, cy: -90, r: 5, fill: YEL, stroke: INK, "stroke-width": 2 }, top);
        el("rect", { x: -7, y: -132, width: 14, height: 36, fill: INK }, top);
        el("path", { d: "M-62 -102 V-134 M62 -102 V-134", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, top);
        el("path", { d: "M-74 -136 H-52 M52 -136 H74", stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, top);
        el("rect", { x: -50, y: -214, width: 100, height: 92, rx: 22, fill: c, stroke: INK, "stroke-width": 3 }, top);
        el("rect", { x: -56, y: -104, width: 112, height: 22, rx: 11, fill: c, stroke: INK, "stroke-width": 3 }, top);
        return { g, top };
      });
      /* the helper's papers, in a heap until they are tidied */
      const pile = [[-14, -16], [2, 9], [12, 22]].map(([dx, r]) => {
        const g = mv(el("g", { "pointer-events": "none" }, svg));
        el("rect", { x: -19, y: -25, width: 38, height: 50, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-9 -10 H9 M-9 0 H9 M-9 10 H3", stroke: MUTE, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        return { g, dx, r };
      });
      /* the change: a sheet that goes to the reviewer and comes back with a tick */
      const sheet = mv(el("g", { "pointer-events": "none" }, svg));
      el("rect", { x: -22, y: -28, width: 44, height: 56, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, sheet);
      const sl = [-12, 0, 12].map((y, j) => el("path", { d: `M-12 ${y} H${j === 2 ? 4 : 12}`, stroke: MUTE, "stroke-width": 3, "stroke-linecap": "round" }, sheet));
      const ok = el("g", {}, sheet);
      el("circle", { r: 12, fill: MINT, stroke: INK, "stroke-width": 2.5 }, ok);
      el("path", { d: "M-5.5 0 l4 4.5 l7.5 -9", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, ok);
      /* the button you press, and the pointer pressing it */
      const B = el("g", {}, svg);
      el("rect", { x: -100, y: -24, width: 200, height: 48, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, B);
      txt(B, 0, 8, "Add an agent", { "text-anchor": "middle", "font-size": 23, "font-weight": 700 });
      const rip = el("circle", { fill: "none", stroke: INK, "stroke-width": 2.5 }, svg);
      const ptr = el("path", { d: "M0 0 V26 L7 19.5 L12 30 L16.5 28 L11.5 17.5 H21 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
      const cap = strip(svg, 508, 740);
      const bump = (t, a) => Math.sin(Math.PI * seg(t, a, a + 0.3));
      return (t, now) => {
        const out = seg(t, 13.2, 13.6), vis = 1 - out, idle = t > 11.8 && t < 13.2 ? 1 : 0;
        const press = Math.max(...PR.map((a) => bump(t, a)));
        tf(B, 400, 122, (1 - 0.06 * press + 0.012 * idle * Math.sin(now * 3)).toFixed(3));
        const lastP = PR.filter((a) => t >= a).pop(), rk = lastP === undefined ? 1 : seg(t, lastP, lastP + 0.6);
        rip.setAttribute("cx", 474); rip.setAttribute("cy", 138);
        rip.setAttribute("r", (8 + 30 * oc(rk)).toFixed(1)); rip.setAttribute("opacity", (rk < 1 ? 1 - rk : 0).toFixed(2));
        ptr.setAttribute("transform", `translate(${(474 + 2 * press).toFixed(2)} ${(138 + 3 * press + 2 * idle * Math.sin(now * 2)).toFixed(2)})`);
        /* each press rolls a chair in from the right; the third one arrives still spinning */
        chairs.forEach((ch, i) => {
          const k = seg(t, IN[i], IN[i] + 1.05), x = lerp(880, XS[i], land(k, 1.15)), st = t - IN[i] - 1.05;
          const lean = 3 * Math.sin(Math.PI * k) - (st > 0 ? 3 * Math.exp(-5 * st) * Math.sin(14 * st) : 0);
          tf(ch.g, x.toFixed(2), FL, 1, lean.toFixed(2));
          ch.g.setAttribute("opacity", t < IN[i] ? 0 : vis.toFixed(2));
          const sx = i === 2 ? Math.cos(4 * Math.PI * (1 - oc(seg(t, IN[2], IN[2] + 1.9)))) : 1;
          ch.top.setAttribute("transform", `scale(${sx.toFixed(3)} 1)`);
          ghost[i].setAttribute("opacity", Math.max(1 - seg(t, IN[i] + 0.6, IN[i] + 1.0), out).toFixed(2));
          const z = zone[i], on = t >= IN[i] + 1.0 && t < 13.2, pk = land(seg(t, IN[i] + 1.05, IN[i] + 1.4), 2.4) * vis;
          z.role.setAttribute("fill", on ? INK : MUTE);
          tf(z.p, XS[i], 476, pk.toFixed(3));
          z.slot.setAttribute("opacity", pk > 0.6 ? 0 : 1);
        });
        /* the change goes over, is read line by line, gets its tick and comes back */
        const g1 = io(seg(t, 7.2, 8.2)), g2 = io(seg(t, 9.9, 10.9)), back = t >= 9.9, k = back ? g2 : g1, lw = t - 10.9;
        const sx = lerp(XS[0], XS[1], back ? 1 - g2 : g1), sy = FL - 132 - 70 * Math.sin(Math.PI * k);
        const rot = (back ? -12 : 12) * Math.sin(Math.PI * k) + (lw > 0 ? 6 * Math.exp(-5 * lw) * Math.sin(14 * lw) : 0);
        tf(sheet, sx.toFixed(2), sy.toFixed(2), (land(seg(t, 6.6, 6.95), 2.2) * vis).toFixed(3), rot.toFixed(2));
        sl.forEach((l, j) => l.setAttribute("stroke", t > 8.45 + 0.3 * j && t < 13.2 ? INK : MUTE));
        tf(ok, 20, -24, land(seg(t, 9.45, 9.8), 2.6).toFixed(3));
        /* the helper's heap lands, then squares itself into a neat stack */
        pile.forEach((p, j) => {
          const dk = land(seg(t, 6.0 + 0.12 * j, 6.35 + 0.12 * j), 1.6), td = io(seg(t, 11.0 + 0.1 * j, 11.6 + 0.1 * j));
          tf(p.g, (XS[2] + lerp(p.dx, (j - 1) * 3, td)).toFixed(2), (FL - 130 - 60 * (1 - dk) - 3 * j * td).toFixed(2), 1, lerp(p.r, 0, td).toFixed(2));
          p.g.setAttribute("opacity", t < 6.0 + 0.12 * j ? 0 : vis.toFixed(2));
        });
        say(cap, t < PR[0] || t >= 13.2 ? "Press Add an agent" : t < PR[1] ? "A builder on Claude Code, writing the feature" : t < PR[2] ? "A reviewer on Codex, reading every change the builder makes" : t < 6.6 ? "A helper on a free engine, for docs and tidying" : t < 11 ? "Reading every change the builder makes" : "A first team of three", 700);
      };
    },
  };

  /* ---- schedule: press New automation, choose Schedule, fill in four things and walk off; the sun comes up and the card fires without you ---- */
  SC.schedule = {
    dur: 14, still: 12.4,
    build(svg, api) {
      head(svg, "Work that starts without you", "tap the card");
      const X0 = 44, X1 = 500, Y0 = 88, Y1 = 474, HZ = 226, FL = 472, AX = 652, VX = 176, VW = 306, FY = [228, 288, 348, 420];
      const around = (n, cx, cy, s) => n.setAttribute("transform", `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
      const chair = (p, c, s) => {
        const g = el("g", { "pointer-events": "none" }, p), b = el("g", { transform: `scale(${s})` }, g);
        el("path", { d: "M-38 -10 L0 -24 L38 -10 M0 -24 V-10", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, b);
        [-38, 0, 38].forEach((x) => el("circle", { cx: x, cy: -6, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, b));
        el("rect", { x: -6, y: -86, width: 12, height: 64, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, b);
        el("path", { d: "M8 -90 H32", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, b);
        el("circle", { cx: 35, cy: -90, r: 5, fill: YEL, stroke: INK, "stroke-width": 2 }, b);
        el("rect", { x: -7, y: -132, width: 14, height: 36, fill: INK }, b);
        el("path", { d: "M-62 -102 V-134 M62 -102 V-134", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, b);
        el("path", { d: "M-74 -136 H-52 M52 -136 H74", stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, b);
        el("rect", { x: -50, y: -214, width: 100, height: 92, rx: 22, fill: c, stroke: INK, "stroke-width": 3 }, b);
        el("rect", { x: -56, y: -104, width: 112, height: 22, rx: 11, fill: c, stroke: INK, "stroke-width": 3 }, b);
        return g;
      };
      const mini = (p, c) => {
        const g = el("g", {}, p);
        el("rect", { x: -9, y: -17, width: 18, height: 14, rx: 5, fill: c, stroke: INK, "stroke-width": 2 }, g);
        el("rect", { x: -11, y: -2, width: 22, height: 6, rx: 3, fill: c, stroke: INK, "stroke-width": 2 }, g);
        el("path", { d: "M0 4 V11 M-8 13 H8", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        return g;
      };
      /* the right side: the arc the sun climbs, the horizon, the floor and the agent's chair */
      el("path", { d: `M548 ${HZ} A104 104 0 0 1 756 ${HZ}`, fill: "none", stroke: LIL, "stroke-width": 3, "stroke-dasharray": "2 10", "stroke-linecap": "round" }, svg);
      const cp = el("clipPath", { id: "mg-schedule-sky" }, el("defs", {}, svg));
      el("rect", { x: 500, y: 70, width: 300, height: HZ - 70 }, cp);
      const sun = mv(el("g", { "pointer-events": "none" }, el("g", { "clip-path": "url(#mg-schedule-sky)" }, svg)));
      const rays = el("g", {}, sun);
      for (let i = 0; i < 8; i++) el("path", { d: "M0 -35 V-46", stroke: INK, "stroke-width": 4, "stroke-linecap": "round", transform: `rotate(${i * 45})` }, rays);
      el("circle", { r: 25, fill: YEL, stroke: INK, "stroke-width": 3 }, sun);
      el("path", { d: `M524 ${HZ} H758`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("path", { d: `M524 ${FL} H758`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const ag = chair(svg, SKY, 0.78);
      /* the card: Automations, the New automation button, the two kinds, then the four fields */
      const card = el("g", {}, svg);
      el("rect", { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      el("rect", { x: X0 - 9, y: Y0 - 9, width: X1 - X0 + 18, height: Y1 - Y0 + 18, rx: 24, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, card);
      button(card, "Fire the schedule again", () => api.seek(8.7));
      txt(card, 66, 128, "Automations", { "font-size": 24, "font-weight": 700 });
      const nb = el("g", {}, card);
      el("rect", { x: -98, y: -21, width: 196, height: 42, rx: 13, fill: YEL, stroke: INK, "stroke-width": 3 }, nb);
      txt(nb, 0, 7, "New automation", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      el("path", { d: `M${X0 + 2} 150 H${X1 - 2}`, stroke: SOFT, "stroke-width": 3 }, card);
      const k1 = pill(card, "Schedule", "#fff"), k2 = pill(card, "Webhook endpoint", "#fff");
      const w1 = parseFloat(k1.firstChild.getAttribute("width")), w2 = parseFloat(k2.firstChild.getAttribute("width")), KX = [66 + w1 / 2, 80 + w1 + w2 / 2];
      const names = ["Label", "When", "Sends to", "Message"].map((s, i) => txt(card, 66, FY[i] + 6, s, { "font-size": 18, "font-weight": 700, fill: MUTE }));
      const box = (y, h) => el("rect", { x: VX, y, width: VW, height: h, rx: 12, fill: "#fff", stroke: LIL, "stroke-width": 2.5, "stroke-dasharray": "6 7" }, card);
      const bx = [box(FY[0] - 20, 40), box(FY[1] - 20, 40), box(FY[2] - 20, 40), box(FY[3] - 32, 66)];
      const wk = el("rect", { x: VX + VW / 2 + 4, y: FY[1] - 16, width: VW / 2 - 8, height: 32, rx: 9, fill: YEL, stroke: INK, "stroke-width": 2 }, card);
      el("path", { d: `M${VX + VW / 2} ${FY[1] - 13} V${FY[1] + 13}`, stroke: LIL, "stroke-width": 2.5 }, card);
      const segT = ["Interval", "Weekly"].map((s, i) => txt(card, VX + VW / 4 + (i * VW) / 2, FY[1] + 7, s, { "text-anchor": "middle", "font-size": 19, "font-weight": 600, fill: MUTE }));
      const vL = txt(card, VX + 16, FY[0] + 7, "", { "font-size": 19, "font-weight": 600 });
      const vM = [txt(card, VX + 16, FY[3] - 5, "", { "font-size": 19, "font-weight": 600 }), txt(card, VX + 16, FY[3] + 21, "", { "font-size": 19, "font-weight": 600 })];
      const caret = el("rect", { width: 2.5, height: 21, fill: INK }, card);
      const st = el("g", {}, card);
      mini(st, SKY).setAttribute("transform", "translate(14 2) scale(0.86)");
      txt(st, 34, 7, "an agent", { "font-size": 19, "font-weight": 700 });
      /* when it fires: a ripple off the card and a slip that flies to the chair */
      const rip = el("circle", { fill: "none", stroke: INK, "stroke-width": 2.5 }, svg);
      const slip = mv(el("g", { "pointer-events": "none" }, svg));
      el("rect", { x: -19, y: -25, width: 38, height: 50, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, slip);
      [-11, 0, 11].forEach((y, j) => el("path", { d: `M-10 ${y} H${j === 2 ? 3 : 10}`, stroke: MUTE, "stroke-width": 3, "stroke-linecap": "round" }, slip));
      const ok = el("g", {}, slip);
      el("circle", { r: 11, fill: MINT, stroke: INK, "stroke-width": 2.5 }, ok);
      el("path", { d: "M-5 0 l3.6 4 l7 -8.5", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, ok);
      const ptr = el("path", { d: "M0 0 V26 L7 19.5 L12 30 L16.5 28 L11.5 17.5 H21 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", "pointer-events": "none" }, svg);
      const cap = strip(svg, 508, 740);
      const PR = [0.85, 2.35, 3.25, 5.25, 5.95, 6.45];
      const KP = [[0, 572, 296], [0.6, 478, 130], [1.6, 478, 130], [2.15, 66 + w1 - 12, 188], [2.7, 66 + w1 - 12, 188], [3.1, 470, 236], [4.6, 470, 236], [5.05, 470, 296], [5.5, 470, 296], [5.8, 470, 356], [6.15, 470, 356], [6.4, 470, 436], [7.9, 470, 436], [8.6, 870, 420], [10.8, 870, 318], [11.3, 742, 318], [11.9, 742, 318], [12.35, 870, 318], [13.4, 870, 318], [14, 572, 296]];
      const at = (t) => { for (let i = 1; i < KP.length; i++) if (t < KP[i][0]) { const a = KP[i - 1], b = KP[i], k = io((t - a[0]) / (b[0] - a[0])); return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; } return KP[KP.length - 1].slice(1); };
      const bump = (t, a) => Math.sin(Math.PI * seg(t, a, a + 0.3));
      const typed = (n, s, t, a, b) => { const c = Math.round(s.length * seg(t, a, b)), v = t < 13.2 ? s.slice(0, c) : s; if (n._v !== v) { n._v = v; n.textContent = v; } return t > a && t < b + 0.15; };
      return (t, now) => {
        const out = seg(t, 13.2, 13.6), vis = 1 - out, live = t < 13.2;
        const press = Math.max(...PR.map((a) => bump(t, a)));
        tf(nb, 392, 120, (1 - 0.07 * bump(t, PR[0])).toFixed(3));
        [k1, k2].forEach((k, i) => { tf(k, KX[i], 182, land(seg(t, 1.05 + 0.12 * i, 1.4 + 0.12 * i), 2).toFixed(3)); k.setAttribute("opacity", vis.toFixed(2)); });
        k1.firstChild.setAttribute("fill", t >= PR[1] + 0.12 && live ? LIL : "#fff");
        /* the fields wake up once Schedule is chosen */
        bx.forEach((b, i) => { const on = t >= 2.6 + 0.12 * i && live; b.setAttribute("stroke", on ? INK : LIL); b.setAttribute("stroke-dasharray", on ? "none" : "6 7"); names[i].setAttribute("fill", on ? INK : MUTE); });
        const wkOn = t >= PR[3] + 0.1 && live;
        around(wk, VX + (3 * VW) / 4, FY[1], land(seg(t, PR[3] + 0.05, PR[3] + 0.35), 2.4).toFixed(3));
        wk.setAttribute("opacity", vis.toFixed(2));
        segT[1].setAttribute("fill", wkOn ? INK : MUTE);
        tf(st, VX + 8, FY[2], land(seg(t, PR[4] + 0.05, PR[4] + 0.4), 2.4).toFixed(3));
        st.setAttribute("opacity", vis.toFixed(2));
        [vL, ...vM].forEach((n) => n.setAttribute("opacity", vis.toFixed(2)));
        const tL = typed(vL, "morning check", t, 3.4, 4.4), t1 = typed(vM[0], "check something and", t, 6.6, 7.25), t2 = typed(vM[1], "write you three lines", t, 7.3, 7.95);
        const cn = tL ? vL : t1 ? vM[0] : t2 ? vM[1] : null;
        caret.setAttribute("opacity", cn && Math.sin(now * 9) > -0.3 ? 1 : 0);
        if (cn) { caret.setAttribute("x", (parseFloat(cn.getAttribute("x")) + cn.getComputedTextLength() + 3).toFixed(1)); caret.setAttribute("y", parseFloat(cn.getAttribute("y")) - 17); }
        /* the sun climbs, the card fires, the slip flies to the chair and is ticked */
        const rise = io(seg(t, 8.6, 10.0)) * (1 - io(seg(t, 13.0, 13.6))), a = ((212 - 74 * rise) * Math.PI) / 180;
        tf(sun, (AX + 104 * Math.cos(a)).toFixed(2), (HZ - 104 * Math.sin(a)).toFixed(2));
        rays.setAttribute("transform", `rotate(${((now * 14) % 360).toFixed(1)})`);
        const pulse = bump(t, 10.0);
        around(card, (X0 + X1) / 2, (Y0 + Y1) / 2, (1 + 0.014 * pulse).toFixed(4));
        const rk = seg(t, 10.0, 10.6);
        rip.setAttribute("cx", X1); rip.setAttribute("cy", 418);
        rip.setAttribute("r", (8 + 40 * oc(rk)).toFixed(1)); rip.setAttribute("opacity", (rk > 0 && rk < 1 ? 1 - rk : 0).toFixed(2));
        const fk = io(seg(t, 10.4, 11.2)), lw = t - 11.2;
        const sx = lerp(530, AX, fk), sy = lerp(418, FL - 81 - 24, fk) - 70 * Math.sin(Math.PI * fk);
        const rot = -12 * Math.sin(Math.PI * fk) + (lw > 0 ? 7 * Math.exp(-5 * lw) * Math.sin(14 * lw) : 0);
        tf(slip, sx.toFixed(2), sy.toFixed(2), land(seg(t, 10.05, 10.35), 2.2).toFixed(3), rot.toFixed(2));
        slip.setAttribute("opacity", t < 10.05 ? 0 : vis.toFixed(2));
        tf(ok, 16, -20, land(seg(t, 11.35, 11.7), 2.6).toFixed(3));
        const hop = 8 * Math.sin(Math.PI * seg(t, 6.0, 6.35)) + 6 * Math.sin(Math.PI * seg(t, 11.15, 11.45));
        tf(ag, AX, (FL - hop).toFixed(2));
        /* the pointer: fills the card, walks off, and peeks back in once to check */
        const [px, py] = at(t), wig = t > 11.3 && t < 11.9 ? 3 * Math.sin((t - 11.3) * 26) * Math.sin((Math.PI * (t - 11.3)) / 0.6) : 0;
        ptr.setAttribute("transform", `translate(${(px + 2 * press + wig).toFixed(2)} ${(py + 3 * press).toFixed(2)})`);
        say(cap, t < 0.9 || t >= 13.2 ? "Open Automations and press New automation" : t < 2.45 ? "Choose Schedule" : t < 4.9 ? "Then fill in four things" : t < 6.3 ? "When: an Interval or Weekly" : t < 8.0 ? "The message is what the agent should do when it fires" : t < 10.0 ? "A schedule sends a message to an agent on a clock" : "Every weekday morning, ask an agent to check something", 700);
      };
    },
  };

  /* ---- slack: switch Slack on under Connections and pick who answers; each card sends a note down its own string and the reply comes back into the same thread. Once, the strings go slack ---- */
  SC.slack = {
    dur: 14, still: 12.6,
    build(svg, api) {
      head(svg, "Send work from a channel", "tap a card");
      const CY = [176, 290, 404], XC = 628, FL = 474, S = 0.72, E = [XC - 46, FL - 80], M = [4.6, 5.4, 6.2], IN = 2.45;
      const NAMES = ["a channel", "another channel", "a direct message"];
      const chair = (p, c, s) => {
        const g = el("g", { "pointer-events": "none" }, p), b = el("g", { transform: `scale(${s})` }, g);
        el("path", { d: "M-38 -10 L0 -24 L38 -10 M0 -24 V-10", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, b);
        [-38, 0, 38].forEach((x) => el("circle", { cx: x, cy: -6, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, b));
        el("rect", { x: -6, y: -86, width: 12, height: 64, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, b);
        el("path", { d: "M8 -90 H32", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, b);
        el("circle", { cx: 35, cy: -90, r: 5, fill: YEL, stroke: INK, "stroke-width": 2 }, b);
        el("rect", { x: -7, y: -132, width: 14, height: 36, fill: INK }, b);
        el("path", { d: "M-62 -102 V-134 M62 -102 V-134", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, b);
        el("path", { d: "M-74 -136 H-52 M52 -136 H74", stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, b);
        el("rect", { x: -50, y: -214, width: 100, height: 92, rx: 22, fill: c, stroke: INK, "stroke-width": 3 }, b);
        el("rect", { x: -56, y: -104, width: 112, height: 22, rx: 11, fill: c, stroke: INK, "stroke-width": 3 }, b);
        return g;
      };
      /* Settings, then Connections: the Slack switch and Every channel the bot is in */
      el("rect", { x: 44, y: 84, width: 712, height: 72, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 66, 111, "Settings", { "font-size": 16, "font-weight": 600, fill: MUTE });
      txt(svg, 66, 139, "Connections", { "font-size": 22, "font-weight": 700 });
      txt(svg, 248, 128, "Slack", { "font-size": 20, "font-weight": 700 });
      const trk = el("rect", { x: 314, y: 106, width: 54, height: 28, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const knob = el("circle", { cy: 120, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      const cb = el("rect", { x: 398, y: 107, width: 26, height: 26, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      const tick = el("path", { d: "M404.5 120.5 l5 5.5 l9 -11", fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": "0 1" }, svg);
      fit(txt(svg, 436, 128, "Every channel the bot is in", { "font-size": 20, "font-weight": 600 }), 300);
      /* who answers: an empty seat until the chair rolls in */
      fit(txt(svg, XC - 12, 292, "Who answers inbound messages", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 }), 290);
      el("path", { d: `M440 ${FL + 2} H758`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const ghost = el("g", { fill: "none", stroke: LIL, "stroke-width": 3, "stroke-dasharray": "7 8", "stroke-linecap": "round", transform: `translate(${XC} ${FL}) scale(${S})` }, svg);
      el("rect", { x: -50, y: -214, width: 100, height: 92, rx: 22 }, ghost);
      el("rect", { x: -56, y: -104, width: 112, height: 22, rx: 11 }, ghost);
      el("path", { d: "M0 -80 V-14 M-38 -6 H38" }, ghost);
      /* one string from each card to the chair */
      const P0 = CY.map((y) => [372, y + 50]);
      const strs = CY.map(() => el("path", { fill: "none", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", pathLength: 1 }, svg));
      const ctl = (i, sag) => [(P0[i][0] + E[0]) / 2, (P0[i][1] + E[1]) / 2 + sag];
      const bez = (i, s, sag) => { const [x0, y0] = P0[i], [cx, cy] = ctl(i, sag), u = 1 - s; return [u * u * x0 + 2 * u * s * cx + s * s * E[0], u * u * y0 + 2 * u * s * cy + s * s * E[1]]; };
      /* the three chat cards: a channel, another channel, a direct message */
      const cards = CY.map((y0, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: 44, y: y0, width: 328, height: 100, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: 37, y: y0 - 7, width: 342, height: 114, rx: 21, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        if (i < 2) el("path", { d: `M58 ${y0 + 15} h16 a5 5 0 0 1 5 5 v7 a5 5 0 0 1 -5 5 h-9 l-6 5 v-5 h-1 a5 5 0 0 1 -5 -5 v-7 a5 5 0 0 1 5 -5 z`, fill: SKY, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, g);
        else el("circle", { cx: 66, cy: y0 + 24, r: 9, fill: YEL, stroke: INK, "stroke-width": 2 }, g);
        txt(g, 88, y0 + 31, NAMES[i], { "font-size": 20, "font-weight": 700 });
        const msg = el("g", {}, g);
        el("rect", { x: 0, y: -11, width: 200, height: 22, rx: 11, fill: SOFT, stroke: INK, "stroke-width": 2 }, msg);
        el("path", { d: "M14 0 H122 M134 0 H180", stroke: MUTE, "stroke-width": 3, "stroke-linecap": "round" }, msg);
        const rep = el("g", {}, g);
        el("path", { d: "M10 13 V22 Q10 30 18 30 H25", fill: "none", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round" }, rep);
        const av = el("g", { transform: "translate(40 32) scale(0.74)" }, rep);
        el("rect", { x: -9, y: -17, width: 18, height: 14, rx: 5, fill: SKY, stroke: INK, "stroke-width": 2.4 }, av);
        el("rect", { x: -11, y: -2, width: 22, height: 6, rx: 3, fill: SKY, stroke: INK, "stroke-width": 2.4 }, av);
        el("path", { d: "M0 4 V11 M-8 13 H8", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, av);
        el("rect", { x: 56, y: 20, width: 200, height: 21, rx: 10.5, fill: MINT, stroke: INK, "stroke-width": 2 }, rep);
        el("path", { d: "M70 30.5 H170 M182 30.5 H232", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, rep);
        button(g, `Send a message from ${NAMES[i]}`, () => api.seek(M[i] - 0.15));
        return { msg, rep, y0 };
      });
      const ag = chair(svg, SKY, S);
      const note = CY.map(() => {
        const g = mv(el("g", { "pointer-events": "none" }, svg));
        el("rect", { x: -11, y: -14, width: 22, height: 28, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-5 -5 H5 M-5 2 H5 M-5 9 H1", stroke: MUTE, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        return g;
      });
      const back = CY.map(() => {
        const g = mv(el("g", { "pointer-events": "none" }, svg));
        el("rect", { x: -17, y: -10, width: 34, height: 20, rx: 10, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-8 0 H8", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        return g;
      });
      const ptr = el("path", { d: "M0 0 V26 L7 19.5 L12 30 L16.5 28 L11.5 17.5 H21 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", "pointer-events": "none" }, svg);
      const cap = strip(svg, 516, 740);
      const PR = [0.6, 1.45, 2.3];
      const KP = [[0, 540, 232], [0.45, 354, 126], [0.95, 354, 126], [1.25, 412, 128], [1.75, 412, 128], [2.1, 652, 402], [2.45, 652, 402], [3.0, 880, 232], [13.4, 880, 232], [14, 540, 232]];
      const at = (t) => { for (let i = 1; i < KP.length; i++) if (t < KP[i][0]) { const a = KP[i - 1], b = KP[i], k = io((t - a[0]) / (b[0] - a[0])); return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; } return KP[KP.length - 1].slice(1); };
      const bump = (t, a) => Math.sin(Math.PI * seg(t, a, a + 0.3));
      return (t, now) => {
        const out = seg(t, 13.2, 13.6), vis = 1 - out, live = t < 13.2;
        /* the switch: on at the first press; once it drops out and comes back by itself */
        const g1 = io(seg(t, 10.4, 10.6)), g2 = land(seg(t, 11.3, 11.6), 2.4), on = io(seg(t, PR[0], PR[0] + 0.25)) * (1 - io(seg(t, 13.2, 13.6))) * (1 - g1 + g1 * g2);
        knob.setAttribute("cx", (328 + 26 * on).toFixed(2));
        trk.setAttribute("fill", on > 0.5 ? MINT : SOFT);
        const chk = t >= PR[1] + 0.05 && live;
        cb.setAttribute("fill", chk ? YEL : "#fff");
        tick.setAttribute("stroke-dasharray", `${(oc(seg(t, PR[1] + 0.05, PR[1] + 0.35)) * (live ? 1 : 0)).toFixed(3)} 1`);
        /* the chair rolls in to the empty seat */
        const k = seg(t, IN, IN + 1.0), x = lerp(880, XC, land(k, 1.15)), st = t - IN - 1.0;
        const lean = 3 * Math.sin(Math.PI * k) - (st > 0 ? 3 * Math.exp(-5 * st) * Math.sin(14 * st) : 0);
        const hop = M.reduce((h, m) => h + 6 * Math.sin(Math.PI * seg(t, m + 1.05, m + 1.35)), 0);
        tf(ag, x.toFixed(2), (FL - hop).toFixed(2), 1, lean.toFixed(2));
        ag.setAttribute("opacity", t < IN ? 0 : vis.toFixed(2));
        ghost.setAttribute("opacity", Math.max(1 - seg(t, IN + 0.6, IN + 1.0), out).toFixed(2));
        /* the strings: drawn out, taut; slack while Slack is off; a twang when it comes back */
        const tau = t - 11.3, twang = tau > 0 && tau < 1.2 ? 9 * Math.exp(-4 * tau) * Math.sin(22 * tau) : 0;
        const slack = 66 * io(seg(t, 10.4, 10.8)) * (1 - oc(seg(t, 11.3, 11.75))) + 3 * Math.sin(now * 3) * seg(t, 10.6, 10.9) * (1 - seg(t, 11.3, 11.5));
        const sag = 8 + slack + twang + (t > 12.2 && live ? 1.5 * Math.sin(now * 2) : 0);
        strs.forEach((p, i) => {
          const [cx, cy] = ctl(i, sag);
          p.setAttribute("d", `M${P0[i][0]} ${P0[i][1]} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${E[0]} ${E[1]}`);
          p.setAttribute("stroke-dasharray", `${io(seg(t, 3.5 + 0.12 * i, 4.2 + 0.12 * i)).toFixed(3)} 1`);
          p.setAttribute("opacity", vis.toFixed(2));
        });
        /* each card: its message, the note down the string, the reply back, the reply in the thread */
        cards.forEach((c, i) => {
          const m = M[i];
          tf(c.msg, 66, c.y0 + 50, (land(seg(t, m, m + 0.35), 2.2) * vis).toFixed(3));
          tf(c.rep, 66, c.y0 + 50, (land(seg(t, m + 2.2, m + 2.55), 2.2) * vis).toFixed(3));
          const nk = io(seg(t, m + 0.25, m + 1.05)), [nx, ny] = bez(i, 0.07 + 0.89 * nk, sag);
          tf(note[i], nx.toFixed(2), ny.toFixed(2), land(seg(t, m + 0.25, m + 0.45), 2).toFixed(3), (8 * Math.sin(Math.PI * nk)).toFixed(2));
          note[i].setAttribute("opacity", t > m + 0.25 && t < m + 1.1 ? 1 : 0);
          const rk = io(seg(t, m + 1.4, m + 2.2)), [rx, ry] = bez(i, 0.96 - 0.88 * rk, sag);
          tf(back[i], rx.toFixed(2), ry.toFixed(2), land(seg(t, m + 1.4, m + 1.6), 2).toFixed(3), (-8 * Math.sin(Math.PI * rk)).toFixed(2));
          back[i].setAttribute("opacity", t > m + 1.4 && t < m + 2.22 ? 1 : 0);
        });
        const press = Math.max(...PR.map((a) => bump(t, a))), [px, py] = at(t);
        ptr.setAttribute("transform", `translate(${(px + 2 * press).toFixed(2)} ${(py + 3 * press).toFixed(2)})`);
        say(cap, t < 1.0 || t >= 13.2 ? "Under Settings, then Connections" : t < 2.0 ? "One bot can listen to Every channel the bot is in" : t < 3.6 ? "You choose the agent under Who answers inbound messages" : t < 6.2 ? "Send work from a channel and read the answer in the same thread" : t < 9.0 ? "A direct message to the bot is always answered" : t < 10.4 ? "The reply comes back in the same thread" : t < 12.0 ? "If Slack fails to start, it now comes back by itself" : "Read the answer in the same thread", 700);
      };
    },
  };

  /* ---- temp: a message comes in, a folding chair is opened (at the second try) beside the lasting chairs, takes the one job, reports done, folds flat and leaves ---- */
  SC.temp = {
    dur: 14, still: 9.9,
    build(svg, api) {
      head(svg, "A temp is an agent for one job", "tap the message");
      const FL = 444, XS = [124, 280, 436], COL = [SKY, LIL, MINT], TX = 640, FS = 1.15, HOME = [124, 140], WAIT = [612, 150], SEAT = [612, 318];
      const chair = (p, c, s) => {
        const g = el("g", { "pointer-events": "none" }, p), b = el("g", { transform: `scale(${s})` }, g);
        el("path", { d: "M-38 -10 L0 -24 L38 -10 M0 -24 V-10", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, b);
        [-38, 0, 38].forEach((x) => el("circle", { cx: x, cy: -6, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, b));
        el("rect", { x: -6, y: -86, width: 12, height: 64, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, b);
        el("path", { d: "M8 -90 H32", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, b);
        el("circle", { cx: 35, cy: -90, r: 5, fill: YEL, stroke: INK, "stroke-width": 2 }, b);
        el("rect", { x: -7, y: -132, width: 14, height: 36, fill: INK }, b);
        el("path", { d: "M-62 -102 V-134 M62 -102 V-134", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, b);
        el("path", { d: "M-74 -136 H-52 M52 -136 H74", stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, b);
        el("rect", { x: -50, y: -214, width: 100, height: 92, rx: 22, fill: c, stroke: INK, "stroke-width": 3 }, b);
        el("rect", { x: -56, y: -104, width: 112, height: 22, rx: 11, fill: c, stroke: INK, "stroke-width": 3 }, b);
        return g;
      };
      /* a folding chair seen from the side: back post, seat and front leg turn on one bolt */
      const folding = (p, ghost) => {
        const g = el("g", ghost ? { fill: "none", stroke: LIL, "stroke-width": 3, "stroke-dasharray": "7 8", "stroke-linecap": "round" } : { "pointer-events": "none" }, p);
        const ln = ghost ? {} : { stroke: INK, "stroke-width": 7.5, "stroke-linecap": "round" }, sh = ghost ? {} : { fill: YEL, stroke: INK, "stroke-width": 3 };
        const leg = el("path", Object.assign({ d: "M24 -92 L-40 0" }, ln), g);
        el("path", Object.assign({ d: "M24 0 V-176" }, ln), g);
        const seat = el("rect", Object.assign({ x: -58, y: -92, width: 88, height: 18, rx: 8 }, sh), g);
        el("rect", Object.assign({ x: 6, y: -188, width: 38, height: 60, rx: 10 }, sh), g);
        if (!ghost) el("circle", { cx: 24, cy: -92, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        return { g, leg, seat };
      };
      el("path", { d: `M44 ${FL + 2} H758`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const gh = folding(svg, true);
      tf(gh.g, TX, FL, FS);
      /* the lasting agents: the three office chairs from the team */
      const lc = XS.map((x, i) => chair(svg, COL[i], 0.95));
      el("path", { d: "M58 462 V472 H502 V462", fill: "none", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      txt(svg, 280, 500, "your lasting agents", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      /* the tag that hangs on the temp while it is here */
      const tag = el("g", {}, svg);
      const tp = pill(tag, "A temp", YEL), tw = parseFloat(tp.firstChild.getAttribute("width"));
      tf(tp, 716, 192);
      el("path", { d: `M${TX + 30} 232 Q${TX + 34} 206 ${716 - tw / 2 + 8} 196`, fill: "none", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round" }, tag);
      const fw = el("g", {}, svg), fc = folding(fw, false);
      /* the slot the message waits in, which is also the tap target */
      const slot = el("g", {}, svg);
      el("rect", { x: HOME[0] - 72, y: HOME[1] - 36, width: 144, height: 72, rx: 18, fill: "#fff", stroke: LIL, "stroke-width": 2.5, "stroke-dasharray": "6 7" }, slot);
      el("rect", { x: HOME[0] - 80, y: HOME[1] - 44, width: 160, height: 92, rx: 22, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, slot);
      button(slot, "Send another message to a temp", () => api.seek(0.7));
      const dots = [0, 1, 2].map((j) => el("circle", { cx: SEAT[0] - 30 + 18 * j, cy: 270, r: 5.5, fill: LIL, stroke: INK, "stroke-width": 2 }, svg));
      const msg = mv(el("g", { "pointer-events": "none" }, svg));
      el("path", { d: "M-32 24 L-42 42 L-14 24 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, msg);
      el("rect", { x: -62, y: -28, width: 124, height: 56, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, msg);
      txt(msg, 0, 8, "one job", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const done = mv(el("g", { "pointer-events": "none" }, svg));
      pill(done, "done", MINT, true);
      const cap = strip(svg, 516, 740);
      return (t, now) => {
        const out = seg(t, 13.2, 13.6), vis = 1 - out;
        /* the folding chair: slides in folded, half opens, snaps shut, opens properly; later folds and is dragged off */
        let u = 0;
        if (t >= 2.3 && t < 2.65) u = 0.5 * io(seg(t, 2.3, 2.65));
        else if (t >= 2.65 && t < 3.15) u = 0.5 - 0.42 * oc(seg(t, 2.65, 2.85));
        else if (t >= 3.15 && t < 8.1) u = 0.08 + 0.92 * land(seg(t, 3.15, 3.65), 1.4);
        else if (t >= 8.1 && t < 8.6) u = 1 - io(seg(t, 8.1, 8.5));
        const inK = seg(t, 1.1, 2.1), outK = io(seg(t, 9.0, 11.6));
        const fx = t < 8.6 ? lerp(900, TX, land(inK, 1.0)) : lerp(TX, 930, outK);
        const sh = t > 2.85 && t < 3.15 ? 1.6 * Math.sin((t - 2.85) * 50) * (1 - seg(t, 2.85, 3.15)) : 0;
        const lean = -8 * Math.sin(Math.PI * inK) + 12 * io(seg(t, 8.6, 9.0)) + sh;
        fc.leg.setAttribute("transform", `rotate(${(-34.8 * (1 - u)).toFixed(2)} 24 -92)`);
        fc.seat.setAttribute("transform", `rotate(${(90 * (1 - u)).toFixed(2)} 24 -92)`);
        tf(fc.g, fx.toFixed(2), (FL - 20 * FS * cl(1 - u)).toFixed(2), FS, lean.toFixed(2));
        gh.g.setAttribute("opacity", (1 - cl(u)).toFixed(2));
        /* marked as moving only while it slides in or out */
        if ((t > 1.1 && t < 2.3) || t > 8.6) fw.setAttribute("data-mv", ""); else fw.removeAttribute("data-mv");
        const tk = land(seg(t, 3.7, 4.0), 2.2) * (1 - seg(t, 7.9, 8.2));
        tag.setAttribute("opacity", tk > 0.02 ? Math.min(1, tk).toFixed(2) : 0);
        tf(tp, 716, 192, Math.min(1.2, tk).toFixed(3));
        /* the message: waits, flies over, hovers through the struggle, lands, is worked, and a new one arrives */
        let mx = HOME[0], my = HOME[1] + 3 * Math.sin(now * 2.2), ms = 1, mr = 0, mo = 1;
        if (t >= 0.8 && t < 1.0) ms = 1 + 0.06 * Math.sin(Math.PI * seg(t, 0.8, 1.0));
        else if (t >= 1.0 && t < 2.2) { const k = io(seg(t, 1.0, 2.2)); mx = lerp(HOME[0], WAIT[0], k); my = lerp(HOME[1], WAIT[1], k) - 22 * Math.sin(Math.PI * k); mr = 6 * Math.sin(Math.PI * k); }
        else if (t >= 2.2 && t < 3.85) { mx = WAIT[0]; my = WAIT[1] + 4 * Math.sin((t - 2.2) * 6); }
        else if (t >= 3.85 && t < 9.0) { const k = land(seg(t, 3.85, 4.35), 1.3); mx = lerp(WAIT[0], SEAT[0], cl(k)); my = lerp(WAIT[1], SEAT[1], k); ms = lerp(1, 0.8, cl(k)) * (1 - io(seg(t, 6.2, 6.5))); mo = t < 6.5 ? 1 : 0; }
        else if (t >= 9.0) { const k = land(seg(t, 9.0, 9.6), 1.4); mx = lerp(-90, HOME[0], k); mo = seg(t, 9.0, 9.12); }
        tf(msg, mx.toFixed(2), my.toFixed(2), ms.toFixed(3), mr.toFixed(2));
        msg.setAttribute("opacity", mo);
        dots.forEach((d, j) => { const w = t > 4.45 && t < 5.65 ? 1 : 0; d.setAttribute("opacity", w); d.setAttribute("cy", (270 - w * 6 * Math.max(0, Math.sin((t - 4.45) * 7 - j * 0.9))).toFixed(2)); });
        /* done pops up, flies to the first lasting chair, and that chair gives a small hop */
        const dk = io(seg(t, 6.7, 7.6)), lw = t - 7.6;
        const dx = lerp(SEAT[0] - 18, XS[0], dk), dy = lerp(222, 326, dk) - 90 * Math.sin(Math.PI * dk);
        tf(done, dx.toFixed(2), dy.toFixed(2), (land(seg(t, 5.7, 6.0), 2.4) * vis).toFixed(3), ((lw > 0 ? 6 * Math.exp(-5 * lw) * Math.sin(14 * lw) : 0) - 10 * Math.sin(Math.PI * dk)).toFixed(2));
        done.setAttribute("opacity", t < 5.7 ? 0 : vis.toFixed(2));
        lc.forEach((g, i) => tf(g, XS[i], (FL - (i === 0 ? 7 * Math.sin(Math.PI * seg(t, 7.6, 7.9)) : 0)).toFixed(2)));
        say(cap, t < 0.8 || t >= 13.2 ? "There is no button for one. You ask" : t < 3.8 ? "A temp can answer inbound messages" : t < 5.7 ? "It gets an objective, does the work" : t < 10.6 ? "Reports done and leaves" : "A temp answers one message or does one job", 700);
      };
    },
  };

  /* ---- tokens: slips fill a tall glass to the line and a press squashes them into one summary; on a switch of work the
     glass is turned over and shaken out (the summary clings on for one more shake), and a handoff.md note lands in it ---- */
  SC.tokens = {
    dur: 14, still: 12.6,
    build(svg, api) {
      head(svg, "Keep sessions small", "tap the glass");
      const GX = 214, GY = 356, PX = 360, PY = 196;
      /* the two rules, in Automations under Context, both switched on */
      el("rect", { x: 446, y: 92, width: 310, height: 290, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 468, 126, "Automations", { "font-size": 17, "font-weight": 600, fill: MUTE });
      txt(svg, 468, 158, "Context", { "font-size": 26, "font-weight": 700 });
      const lab = [];
      const rows = [["Compact when", "context fills"], ["Clear on a switch", "of work"]].map((L, i) => {
        const y = 176 + i * 102, r = el("rect", { x: 462, y, width: 278, height: 90, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
        L.forEach((s, j) => lab.push(fit(txt(svg, 480, y + 38 + j * 30, s, { "font-size": 21, "font-weight": 700 }), 184)));
        el("rect", { x: 676, y: y + 32, width: 50, height: 26, rx: 13, fill: MINT, stroke: INK, "stroke-width": 2.5 }, svg);
        el("circle", { cx: 713, cy: y + 45, r: 8.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
        return r;
      });
      const fs = Math.min(...lab.map((n) => parseFloat(n.getAttribute("font-size"))));
      lab.forEach((n) => n.setAttribute("font-size", fs));
      const keep = el("g", {}, svg);
      pill(keep, "Leave them on", MINT, true);
      /* the coaster and the glass; the slips, the summary and the note live inside the glass and turn with it */
      el("rect", { x: GX - 110, y: 476, width: 220, height: 10, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      const G = mv(el("g", {}, svg));
      const OUT = "M-88 -110 L-76 108 Q-75 118 -65 118 H65 Q75 118 76 108 L88 -110";
      el("path", { d: OUT + " Z", fill: "#fff" }, G);
      const C = el("g", {}, G);
      el("path", { d: "M-76 100 H76 L76 108 Q75 118 65 118 H-65 Q-75 118 -76 108 Z", fill: SOFT }, G);
      el("path", { d: "M-80 -58 H80", stroke: LIL, "stroke-width": 3, "stroke-dasharray": "8 8", "stroke-linecap": "round" }, G);
      el("path", { d: "M-64 -88 L-58 40", stroke: SKY, "stroke-width": 7, "stroke-linecap": "round" }, G);
      el("path", { d: OUT, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, G);
      el("path", { d: "M-76 100 H76", stroke: INK, "stroke-width": 2 }, G);
      const REST = [];
      for (let i = 0; i < 14; i++) REST.push([i % 2 ? 34 : -34, 89 - Math.floor(i / 2) * 22]);
      REST.push([-34, 53], [34, 53], [-28, 31]);
      const ROT = [-5, 4, 3, -4, -3, 5, 4, -3, -5, 2, 3, -4, -2, 4, 3, -4, 6];
      const TL = REST.map((_, i) => (i < 14 ? 0.7 + i * 0.22 : 6.8 + (i - 14) * 0.3));
      const S = REST.map(() => {
        const g = el("g", { "pointer-events": "none" }, C);
        el("rect", { x: -31, y: -9, width: 62, height: 18, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        el("path", { d: "M-21 0 H13", stroke: MUTE, "stroke-width": 3, "stroke-linecap": "round" }, g);
        return g;
      });
      const sum = el("g", {}, C);
      el("rect", { x: -66, y: -17, width: 132, height: 34, rx: 6, fill: MINT, stroke: INK, "stroke-width": 2.5 }, sum);
      const sumT = txt(sum, 0, 6, "summary", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      const ho = el("g", {}, C);
      el("rect", { x: -66, y: -19, width: 132, height: 38, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, ho);
      txt(ho, 0, 6, "handoff.md", { "text-anchor": "middle", "font-size": 18, "font-weight": 700, "font-family": MONO });
      /* the press: a knob, a rod and a mesh disc, parked beside the glass */
      const P = mv(el("g", { "pointer-events": "none" }, svg));
      el("path", { d: "M0 -6 V-54", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, P);
      el("circle", { cx: 0, cy: -66, r: 13, fill: YEL, stroke: INK, "stroke-width": 2.5 }, P);
      el("rect", { x: -70, y: -6, width: 140, height: 12, rx: 6, fill: SKY, stroke: INK, "stroke-width": 2.5 }, P);
      el("path", { d: "M-46 -6 V6 M-23 -6 V6 M0 -6 V6 M23 -6 V6 M46 -6 V6", stroke: INK, "stroke-width": 1.5 }, P);
      const hit = el("g", {}, svg);
      el("rect", { x: GX - 106, y: 230, width: 212, height: 266, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, hit);
      button(hit, "Fill the glass again", () => api.seek(0.3));
      const cap = strip(svg, 516, 740);
      return (t, now) => {
        const out = seg(t, 13.3, 13.7);
        /* the glass: turned over, shaken twice, turned back */
        const flip = io(seg(t, 8.0, 8.6)) + io(seg(t, 10.5, 11.1));
        const lift = 24 * (io(seg(t, 8.0, 8.4)) - io(seg(t, 10.7, 11.1)));
        const shA = t > 8.6 && t < 9.2 ? Math.sin((t - 8.6) * 46) * (1 - seg(t, 8.6, 9.2)) : 0;
        const shB = t > 9.5 && t < 10.1 ? Math.sin((t - 9.5) * 50) * (1 - seg(t, 9.5, 10.1)) : 0;
        const st = t - 11.1, settle = st > 0 && st < 0.7 ? 3 * Math.exp(-6 * st) * Math.sin(18 * st) : 0;
        const gr = 180 * flip + 5 * shA + 8 * shB + settle;
        tf(G, (GX + 7 * shA + 12 * shB).toFixed(2), (GY - lift).toFixed(2), 1, gr.toFixed(2));
        /* the press: parked with a small bob, swings over, presses down, comes back */
        const bob = (1 - seg(t, 3.8, 4.1) + seg(t, 6.8, 7.1)) * 2 * Math.sin(now * 2.2);
        let px = PX, py = PY + bob;
        if (t >= 4.1 && t < 4.8) { const k = io(seg(t, 4.1, 4.8)); px = lerp(PX, GX, k); py = lerp(PY, GY - 122, k) - 34 * Math.sin(Math.PI * k); }
        else if (t >= 4.8 && t < 5.65) { px = GX; py = GY + lerp(-122, 56, io(seg(t, 4.8, 5.4))); }
        else if (t >= 5.65 && t < 6.05) { px = GX; py = GY + lerp(56, -122, oc(seg(t, 5.65, 6.05))); }
        else if (t >= 6.05 && t < 6.8) { const k = seg(t, 6.05, 6.8); px = lerp(GX, PX, io(k)); py = lerp(GY - 122, PY, land(k, 1.2)) - 30 * Math.sin(Math.PI * io(k)); }
        tf(P, px.toFixed(2), py.toFixed(2));
        /* the slips: drop in, pile up, get squashed; the later ones fall out when the glass is turned over */
        const d = t >= 4.8 && t < 6.05 ? py - GY : -999, sq = cl((100 - (d + 6)) / 152, 0.12, 1), gone = seg(t, 5.42, 5.6);
        S.forEach((g, i) => {
          const [rx, ry] = REST[i], a = TL[i] - 0.45;
          let x = rx, y = ry, r = ROT[i], s = 1, sy = 1, o = t < a ? 0 : 1;
          if (t < TL[i]) { const k = seg(t, a, TL[i]); x = lerp(rx * 0.6, rx, io(k)); y = lerp(-196, ry, k * k); r = ROT[i] * (5 - 4 * k); s = Math.min(1.2, land(seg(t, a, a + 0.18), 2)); }
          else { const b = t - TL[i]; if (b < 0.3) y -= 6 * Math.sin((Math.PI * b) / 0.3) * (1 - b / 0.3); }
          if (i < 14) { y = 100 - (100 - y) * sq; sy = Math.min(1, Math.max(0.3, sq * 1.15)); o *= 1 - gone; }
          else if (t > 8.6) { const f0 = 8.62 + (i - 14) * 0.07, u = seg(t, f0, f0 + 0.45); y = lerp(ry, -180, u * u); r += 25 * u * (i % 2 ? 1 : -1); o *= 1 - seg(u, 0.55, 0.95); }
          g.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r.toFixed(2)}) scale(${s.toFixed(3)} ${(s * sy).toFixed(3)})`);
          g.setAttribute("opacity", o.toFixed(2));
          g.setAttribute("display", o < 0.01 ? "none" : "inline");
        });
        /* the summary: pops out of the squash, clings through the first shake, drops on the second */
        let sY = 81, sR = 0, so = t < 5.4 ? 0 : 1;
        if (t > 8.6 && t < 9.75) sY = 81 + 1.5 * shA;
        if (t >= 9.75) { const u = seg(t, 9.75, 10.25); sY = lerp(81, -180, u * u); sR = -30 * u; so = 1 - seg(u, 0.55, 0.95); }
        tf(sum, 0, sY.toFixed(2), Math.min(1.3, land(seg(t, 5.4, 5.7), 2.2)).toFixed(3), sR.toFixed(2));
        /* the slip turns with the glass; its word flips over halfway, while it is on its side, so it never reads upside down */
        sumT.setAttribute("transform", Math.round(flip) === 1 ? "rotate(180 0 -0.5)" : "");
        sum.setAttribute("opacity", so.toFixed(2));
        sum.setAttribute("display", so < 0.01 ? "none" : "inline");
        /* the handoff note drops into the clean glass and stays */
        const hk = seg(t, 11.25, 11.7), hb = t - 11.7;
        const hy = t < 11.7 ? lerp(-196, 79, hk * hk) : 79 - (hb < 0.35 ? 7 * Math.sin((Math.PI * hb) / 0.35) * (1 - hb / 0.35) : 0);
        tf(ho, 0, hy.toFixed(2), Math.min(1.2, land(seg(t, 11.25, 11.45), 2)).toFixed(3), (t < 11.7 ? 8 * (1 - hk) : 0).toFixed(2));
        const hoo = t < 11.25 ? 0 : 1 - out;
        ho.setAttribute("opacity", hoo.toFixed(2));
        ho.setAttribute("display", hoo < 0.01 ? "none" : "inline");
        rows[0].setAttribute("fill", t >= 3.9 && t < 6.4 ? YEL : SOFT);
        rows[1].setAttribute("fill", t >= 7.7 && t < 11.9 ? YEL : SOFT);
        tf(keep, 601, 432, (1 + 0.12 * Math.sin(Math.PI * seg(t, 12.0, 12.35))).toFixed(3));
        say(cap, t < 0.5 || t >= 13.3 ? "Two defaults in 0.5.6 keep sessions small" : t < 3.9 ? "Long sessions fill an agent's context" : t < 6.4 ? "Compact when context fills summarises a long session" : t < 7.7 ? "and carries the summary forward" : t < 11.2 ? "Clear on a switch of work clears the session" : t < 12.0 ? "and leaves a handoff file to carry the thread" : "Both rules are in Automations under Context", 700);
      };
    },
  };

  /* ---- sidebar: the Pro view's six rows; a highlight walks down them and each row writes its one line in the pane.
     Once it is picked, the Stapler row floats a little above the sidebar ---- */
  SC.sidebar = {
    dur: 14, still: 12.4,
    build(svg, api) {
      head(svg, "One window with a sidebar", "tap a row");
      const X0 = 44, X1 = 756, Y0 = 88, YB = 140, Y1 = 498, SW = 262, NX = 304;
      const RY = [182, 238, 294, 350, 406, 462], LIT = [1.0, 2.7, 4.4, 6.1, 7.8, 9.5];
      const NAMES = ["Tasks", "Inbox", "Automations", "Memory", "Capabilities", "Stapler"];
      const NOTE = ["every card in the office", "one conversation per agent", "Scheduled, Context and Webhooks", "Search every agent's memory", "what each agent can reach", "a small window that floats above every app"];
      el("rect", { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, rx: 18, fill: "#fff" }, svg);
      el("path", { d: `M${X0} ${YB} H${SW} V${Y1} H${X0 + 18} Q${X0} ${Y1} ${X0} ${Y1 - 18} Z`, fill: SOFT }, svg);
      [LIL, SKY, MINT].forEach((c, i) => el("circle", { cx: 72 + i * 24, cy: 114, r: 7, fill: c, stroke: INK, "stroke-width": 2 }, svg));
      /* the switch in the title bar */
      el("rect", { x: 560, y: 98, width: 180, height: 32, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      const thumb = el("rect", { x: 650, y: 101, width: 87, height: 26, rx: 13, fill: YEL, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 605, 120, "Classic", { "text-anchor": "middle", "font-size": 17, "font-weight": 600, fill: MUTE });
      txt(svg, 693, 120, "PRO", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
      /* the pane: a slot for each row's line, dashed while it is empty */
      const notes = NOTE.map((s, i) => {
        const bar = el("rect", { x: NX - 14, y: RY[i] - 21, height: 42, rx: 12, fill: SOFT, stroke: LIL, "stroke-width": 2, "stroke-dasharray": "6 6" }, svg);
        el("circle", { cx: 278, cy: RY[i], r: 5, fill: LIL, stroke: INK, "stroke-width": 2 }, svg);
        const n = fit(txt(svg, NX, RY[i] + 7, s, { "font-size": 21, "font-weight": 600 }), 420), w = n.getComputedTextLength();
        bar.setAttribute("width", (w + 28).toFixed(1));
        const id = `mg-sidebar-note-${i}`, cp = el("clipPath", { id }, svg);
        const cr = el("rect", { x: NX - 4, y: RY[i] - 24, width: 0, height: 48 }, cp);
        n.setAttribute("clip-path", `url(#${id})`);
        return { n, bar, cr, w };
      });
      /* the highlight, then the rows; the Stapler row's shadow shows when it floats */
      const shadow = el("ellipse", { cx: 153, cy: 487, rx: 78, ry: 3.5, fill: LIL }, svg);
      const hl = el("rect", { x: 54, y: -23, width: 198, height: 46, rx: 12, fill: YEL, stroke: INK, "stroke-width": 2 }, svg);
      const ICON = [
        (p, x, y) => { el("rect", { x: x - 11, y: y - 10, width: 22, height: 20, rx: 4, fill: SKY, stroke: INK, "stroke-width": 2 }, p); el("path", { d: `M${x - 4} ${y - 10} V${y + 10} M${x + 4} ${y - 10} V${y + 10}`, stroke: INK, "stroke-width": 2 }, p); },
        (p, x, y) => el("path", { d: `M${x - 10} ${y - 10} h20 a3 3 0 0 1 3 3 v10 a3 3 0 0 1 -3 3 h-11 l-7 6 v-6 h-2 a3 3 0 0 1 -3 -3 v-10 a3 3 0 0 1 3 -3 z`, fill: LIL, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, p),
        (p, x, y) => el("path", { d: `M${x + 3} ${y - 12} L${x - 8} ${y + 2} H${x} L${x - 3} ${y + 12} L${x + 8} ${y - 2} H${x} Z`, fill: YEL, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, p),
        (p, x, y) => { el("path", { d: `M${x - 8} ${y + 6} L${x} ${y - 7} L${x + 8} ${y + 6} Z`, fill: "none", stroke: INK, "stroke-width": 2 }, p); [[-8, 6], [0, -7], [8, 6]].forEach(([a, b]) => el("circle", { cx: x + a, cy: y + b, r: 4.5, fill: MINT, stroke: INK, "stroke-width": 2 }, p)); },
        (p, x, y) => star(p, x, y, 12, BLUE),
        (p, x, y) => { el("rect", { x: x - 13, y: y + 3, width: 26, height: 7, rx: 3.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, p); el("rect", { x: x - 13, y: y - 8, width: 24, height: 8, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2, transform: `rotate(-8 ${x + 10} ${y - 4})` }, p); el("circle", { cx: x + 10, cy: y + 1, r: 3, fill: INK }, p); },
      ];
      const rows = NAMES.map((s, i) => {
        const g = el("g", {}, svg), inner = el("g", {}, g);
        el("rect", { x: 50, y: RY[i] - 26, width: 206, height: 52, rx: 14, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, inner);
        ICON[i](inner, 80, RY[i]);
        fit(txt(inner, 104, RY[i] + 7, s, { "font-size": 21, "font-weight": 700 }), 142);
        button(g, `Show what ${s} is for`, () => api.seek(LIT[i] - 0.5));
        return inner;
      });
      /* the window's edge and lines go on last, so the border stays even */
      el("rect", { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, rx: 18, fill: "none", stroke: INK, "stroke-width": 2.5, "pointer-events": "none" }, svg);
      el("path", { d: `M${X0} ${YB} H${X1} M${SW} ${YB} V${Y1}`, stroke: INK, "stroke-width": 2, "pointer-events": "none" }, svg);
      const cap = strip(svg, 516, 740);
      return (t, now) => {
        const out = seg(t, 13.3, 13.7);
        /* the PRO side of the switch gives one small press at the start */
        const pr = 1 - 0.08 * Math.sin(Math.PI * seg(t, 0.2, 0.5));
        thumb.setAttribute("transform", `translate(693.5 114) scale(${pr.toFixed(3)}) translate(-693.5 -114)`);
        /* the Stapler row lifts off and floats once it is picked */
        const fl = io(seg(t, LIT[5], LIT[5] + 0.5)) * (1 - out), fy = -9 * fl + 2.2 * fl * Math.sin(now * 2.4);
        rows[5].setAttribute("transform", `translate(0 ${fy.toFixed(2)}) rotate(${(-1.5 * fl).toFixed(2)} 153 462)`);
        shadow.setAttribute("opacity", (0.85 * fl).toFixed(2));
        shadow.setAttribute("transform", `translate(153 0) scale(${(1 - 0.04 * Math.sin(now * 2.4) * fl).toFixed(3)} 1) translate(-153 0)`);
        /* the highlight walks down the rows, landing with a small overshoot */
        let hy = RY[0], on5 = 0;
        for (let j = 1; j < 6; j++) { const k = seg(t, LIT[j] - 0.45, LIT[j]); if (k > 0) hy = lerp(RY[j - 1], RY[j], land(k, 1.6)); if (j === 5) on5 = k; }
        const hs = Math.min(1.15, land(seg(t, 0.5, 0.85), 2)) * (1 - out);
        hl.setAttribute("transform", `translate(153 ${(hy + fy * on5).toFixed(2)}) rotate(${(-1.5 * fl).toFixed(2)}) scale(${hs.toFixed(3)}) translate(-153 0)`);
        hl.setAttribute("opacity", hs > 0.01 ? 1 : 0);
        /* each row writes its line; the current one keeps its soft slot */
        notes.forEach((nn, j) => {
          const k = oc(seg(t, LIT[j], LIT[j] + 0.6)) * (1 - out), cur = t >= LIT[j] && (j === 5 || t < LIT[j + 1]) && t < 13.3;
          nn.cr.setAttribute("width", ((nn.w + 8) * k).toFixed(1));
          nn.n.setAttribute("opacity", k > 0.01 ? 1 : 0);
          nn.bar.setAttribute("stroke-opacity", k > 0.4 ? 0 : 1);
          nn.bar.setAttribute("fill", cur || k < 0.4 ? SOFT : "#fff");
        });
        say(cap, t < 0.9 ? "The switch in the title bar moves between Classic and PRO" : "One window with a sidebar, and a screen for each part of the office", 700);
      };
    },
  };

  /* ---- askme: Ask me questions wait in a queue; the one in front gets a one line answer, its question mark turns
     into a tick, it moves on and the queue shuffles up (the last card is a little too keen and bumps the one ahead) ---- */
  SC.askme = {
    dur: 14, still: 11.0,
    build(svg, api) {
      head(svg, "Answering unblocks the task", "tap the card");
      const BX = 52, BY = 124, BW = 424, BH = 330, QX = 630, QY = [214, 326, 438], QW = 196, QH = 90, QB = [306, 280], FY = BY + 217;
      txt(svg, QX, 152, "waiting on a person", { "text-anchor": "middle", "font-size": 18, "font-weight": 600, fill: MUTE });
      const qcard = () => {
        const g = el("g", { "pointer-events": "none" }, svg);
        el("rect", { x: -QW / 2, y: -QH / 2, width: QW, height: QH, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-46 -14 H72 M-46 12 H40", stroke: MUTE, "stroke-width": 7, "stroke-linecap": "round", "stroke-opacity": 0.55 }, g);
        el("circle", { cx: -72, cy: -1, r: 15, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, -72, 6, "?", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
        return g;
      };
      const Q = [0, 1, 2, 3].map(qcard);
      /* the card that grows from the front of the queue into the big card */
      const mg = el("g", { "pointer-events": "none" }, svg);
      const mr = el("rect", { fill: "#fff", stroke: INK, "stroke-width": 2.5 }, mg);
      const ml = el("path", { stroke: MUTE, "stroke-linecap": "round", "stroke-opacity": 0.55 }, mg);
      const mb = el("g", {}, mg);
      el("circle", { r: 15, fill: LIL, stroke: INK, "stroke-width": 2.5 }, mb);
      txt(mb, 0, 7, "?", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      /* the big Ask me card */
      const BG = el("g", { "pointer-events": "none" }, svg);
      el("rect", { x: BX, y: BY, width: BW, height: BH, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, BG);
      const chip = pill(BG, "Ask me", YEL);
      tf(chip, BX + 24 + parseFloat(chip.firstChild.getAttribute("width")) / 2, BY + 46);
      txt(BG, BX + BW - 26, BY + 53, "Inbox", { "text-anchor": "end", "font-size": 17, "font-weight": 600, fill: MUTE });
      el("path", { d: `M${BX + 30} ${BY + 100} H${BX + 372} M${BX + 30} ${BY + 128} H${BX + 342} M${BX + 30} ${BY + 156} H${BX + 220}`, stroke: MUTE, "stroke-width": 9, "stroke-linecap": "round", "stroke-opacity": 0.55 }, BG);
      const qb = el("g", {}, BG);
      el("circle", { r: 18, fill: LIL, stroke: INK, "stroke-width": 2.5 }, qb);
      txt(qb, 0, 8, "?", { "text-anchor": "middle", "font-size": 23, "font-weight": 700 });
      const tb = el("g", {}, BG);
      el("circle", { r: 18, fill: MINT, stroke: INK, "stroke-width": 2.5 }, tb);
      el("path", { d: "M-8 0 l5 6 l11 -12", fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, tb);
      const field = el("rect", { x: BX + 24, y: FY - 27, width: BW - 48, height: 54, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2 }, BG);
      const ph = txt(BG, BX + 44, FY + 6, "Answer in one line", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const typed = el("path", { d: `M${BX + 46} ${FY} H${BX + 110} M${BX + 124} ${FY} H${BX + 186}`, stroke: INK, "stroke-width": 9, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "0 1" }, BG);
      const caret = el("path", { d: `M0 ${FY - 15} V${FY + 15}`, stroke: BLUE, "stroke-width": 2.5, "stroke-linecap": "round" }, BG);
      const send = el("g", {}, BG);
      el("circle", { r: 18, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, send);
      el("path", { d: "M-7 0 H6 M1 -6 L7 0 L1 6", fill: "none", stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, send);
      const wait = pill(BG, "waiting on you", SKY);
      const ww = parseFloat(wait.firstChild.getAttribute("width"));
      const unb = pill(BG, "unblocks the task", MINT, true);
      const uw = parseFloat(unb.firstChild.getAttribute("width"));
      const hit = el("g", {}, svg);
      el("rect", { x: BX - 7, y: BY - 7, width: BW + 14, height: BH + 14, rx: 27, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, hit);
      button(hit, "Ask again", () => api.seek(0.3));
      const cap = strip(svg, 516, 740);
      return (t, now) => {
        /* two questions per loop: the first moves on at 3.3, the second holds until 12.6 */
        const L0 = t < 8 ? 3.3 : 12.6, M0 = L0 + 0.5;
        const lk = io(seg(t, L0, L0 + 0.5));
        const bo = t < L0 ? 1 : t < L0 + 0.5 ? 1 - lk : seg(t, L0 + 1.1, L0 + 1.25);
        const bx = t >= L0 && t < L0 + 0.5 ? -70 * lk : 0, br = t >= L0 && t < L0 + 0.5 ? -4 * lk : 0;
        BG.setAttribute("transform", `translate(${bx.toFixed(2)} 0) rotate(${br.toFixed(2)} ${BX + BW / 2} ${BY + BH / 2})`);
        BG.setAttribute("opacity", bo.toFixed(2));
        /* the answer: focus, type one short line, send */
        const ty = t < 3.8 ? seg(t, 0.9, 2.1) : t < 13.1 ? seg(t, 5.9, 7.1) : 0;
        const focus = (t > 0.7 && t < 2.3) || (t > 5.7 && t < 7.3);
        const tick = (t >= 2.5 && t < 3.8) || (t >= 7.5 && t < 13.1), tk = t < 5 ? seg(t, 2.5, 2.75) : seg(t, 7.5, 7.75);
        const press = Math.sin(Math.PI * seg(t, 2.25, 2.45)) + Math.sin(Math.PI * seg(t, 7.25, 7.45));
        field.setAttribute("stroke", focus ? BLUE : INK);
        ph.setAttribute("opacity", ty > 0 ? 0 : 1);
        typed.setAttribute("stroke-dasharray", `${ty.toFixed(3)} 1`);
        typed.setAttribute("opacity", ty > 0.005 ? 1 : 0);
        const len = ty * 126, cx = len <= 64 ? BX + 46 + len : BX + 124 + (len - 64);
        caret.setAttribute("transform", `translate(${(cx + (ty > 0 ? 9 : 0)).toFixed(2)} 0)`);
        caret.setAttribute("opacity", focus && Math.floor(now * 2.6) % 2 === 0 ? 1 : 0);
        tf(send, BX + BW - 50, FY, (1 - 0.14 * press).toFixed(3));
        const breathe = tick ? 0 : 0.05 * Math.sin(now * 3);
        tf(qb, QB[0], QB[1], (tick ? 1 - oc(tk) : 1 + breathe).toFixed(3));
        qb.setAttribute("opacity", tick && tk >= 1 ? 0 : 1);
        tf(tb, QB[0], QB[1], (tick ? Math.min(1.25, land(tk, 2.4)) : 0).toFixed(3));
        tb.setAttribute("opacity", tick ? 1 : 0);
        const wk = tick ? io(seg(tk, 0, 0.5)) : 0, uk = tick ? Math.min(1.2, land(seg(tk, 0.4, 1), 2.2)) : 0;
        tf(wait, BX + 24 + ww / 2, BY + 288, (1 - wk).toFixed(3));
        wait.setAttribute("opacity", wk >= 1 ? 0 : 1);
        tf(unb, BX + 24 + uw / 2, BY + 288, uk.toFixed(3));
        unb.setAttribute("opacity", uk > 0.01 ? 1 : 0);
        /* the big card grows out of the front of the queue */
        const mk = io(seg(t, M0, M0 + 0.65)), mvis = t >= M0 && t < M0 + 0.8;
        const x0 = QX - QW / 2, y0 = QY[0] - QH / 2;
        mr.setAttribute("x", lerp(x0, BX, mk).toFixed(2)); mr.setAttribute("y", lerp(y0, BY, mk).toFixed(2));
        mr.setAttribute("width", lerp(QW, BW, mk).toFixed(2)); mr.setAttribute("height", lerp(QH, BH, mk).toFixed(2));
        mr.setAttribute("rx", lerp(16, 22, mk).toFixed(2));
        const lx = lerp(x0 + 52, BX + 30, mk), l1 = lerp(x0 + 170, BX + 372, mk), l2 = lerp(x0 + 138, BX + 342, mk), ly1 = lerp(y0 + 31, BY + 100, mk), ly2 = lerp(y0 + 57, BY + 128, mk);
        ml.setAttribute("d", `M${lx.toFixed(1)} ${ly1.toFixed(1)} H${l1.toFixed(1)} M${lx.toFixed(1)} ${ly2.toFixed(1)} H${l2.toFixed(1)}`);
        ml.setAttribute("stroke-width", lerp(7, 9, mk).toFixed(2));
        tf(mb, lerp(QX - 72, QB[0], mk).toFixed(2), lerp(QY[0] - 1, QB[1], mk).toFixed(2), lerp(1, 1.2, mk).toFixed(3));
        mb.setAttribute("opacity", t < L0 + 1.1 ? 1 : 0);
        mg.setAttribute("opacity", mvis ? 1 : 0);
        /* the queue shuffles up; on the first shuffle the last card is too keen and bumps the one ahead */
        const pos = [[QX, QY[0], 0, 1], [QX, QY[1], 0, 1], [QX, QY[2], 0, 1], [QX + 80, QY[2], 0, 0]];
        const SH = t >= M0 && t < M0 + 1.4 ? [M0, L0 < 8 ? 1 : 0] : null;
        if (SH) {
          const [s0, bump] = SH, k1 = seg(t, s0, s0 + 0.5), k2 = seg(t, s0 + 0.15, s0 + 0.7), k3 = seg(t, s0 + 0.4, s0 + 0.9), hb = t - (s0 + 0.42);
          const nudge = bump && hb > 0 ? Math.exp(-5 * hb) * Math.sin(16 * hb) : 0;
          pos[0][3] = 0;
          pos[1] = [QX, lerp(QY[1], QY[0], land(k1, 1.3)) - 7 * nudge, 4 * nudge, 1];
          pos[2] = [QX, lerp(QY[2], QY[1], land(k2, bump ? 2.8 : 1.3)), -3 * nudge, 1];
          pos[3] = [lerp(QX + 80, QX, oc(k3)), QY[2], 0, cl(k3 * 3)];
        }
        Q.forEach((g, j) => { tf(g, pos[j][0].toFixed(2), pos[j][1].toFixed(2), 1, pos[j][2].toFixed(2)); g.setAttribute("opacity", pos[j][3].toFixed(2)); });
        say(cap, t < 0.7 ? "Ask me is the list of questions waiting on a person" : t < 2.3 ? "Answer in one line" : t < 3.3 ? "Answering unblocks the task" : t < 5.7 ? "and the card moves on" : t < 7.3 ? "Answer in one line" : t < 12.6 ? "A short answer unblocks the task, and the card moves on" : "This is the screen that keeps an office moving", 700);
      };
    },
  };

  /* ---- stapler: Show the stapler goes on, the round stapler pops up over a plain app, its ring opens, Screenshot takes
     a region, a note is added and stapled to it, and the pair goes to an agent; then the ring opens again ---- */
  SC.stapler = {
    dur: 14, still: 12.2,
    build(svg, api) {
      head(svg, "Staple it", "tap the stapler");
      const SX = 680, SY = 408, PCX = 335, PCY = 282, AX = 88, AY = 108;
      /* the setting */
      el("rect", { x: 448, y: 82, width: 308, height: 48, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      fit(txt(svg, 468, 113, "Show the stapler", { "font-size": 20, "font-weight": 700 }), 200);
      const trk = el("rect", { x: 684, y: 93, width: 52, height: 26, rx: 13, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const knob = el("circle", { cy: 106, r: 8.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      /* where captures go */
      const ag = el("g", {}, svg);
      const agR = el("rect", { x: 62, y: 88, height: 40, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, ag);
      const agT = txt(ag, 112, 115, "an agent", { "font-size": 20, "font-weight": 700 });
      agR.setAttribute("width", (agT.getComputedTextLength() + 72).toFixed(1));
      el("circle", { cx: AX, cy: AY, r: 12, fill: SKY, stroke: INK, "stroke-width": 2.5 }, ag);
      const agK = el("g", {}, ag);
      el("circle", { cx: AX, cy: AY, r: 12, fill: MINT, stroke: INK, "stroke-width": 2.5 }, agK);
      el("path", { d: `M${AX - 6} ${AY} l4 4.5 l8 -9`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, agK);
      /* a plain app window with grey bars */
      el("rect", { x: 44, y: 146, width: 712, height: 346, rx: 16, fill: "#fff" }, svg);
      el("path", { d: "M44 182 H180 V492 H60 Q44 492 44 476 Z", fill: SOFT }, svg);
      [LIL, SKY, MINT].forEach((c, i) => el("circle", { cx: 68 + i * 22, cy: 164, r: 6.5, fill: c, stroke: INK, "stroke-width": 2 }, svg));
      el("rect", { x: 330, y: 158, width: 140, height: 12, rx: 6, fill: SOFT }, svg);
      const bars = (d) => el("path", { d, stroke: MUTE, "stroke-width": 7, "stroke-linecap": "round", "stroke-opacity": 0.45 }, svg);
      bars("M66 214 H150 M66 244 H136 M66 274 H154 M66 304 H128 M66 334 H146");
      [[202, 202, 264, 124], [486, 202, 250, 124], [202, 346, 534, 126]].forEach(([x, y, w, h]) => el("rect", { x, y, width: w, height: h, rx: 12, fill: SOFT }, svg));
      bars("M226 236 H400 M226 262 H440 M226 288 H350 M510 236 H690 M510 262 H650 M510 288 H700 M226 380 H600 M226 406 H520 M226 432 H640");
      el("rect", { x: 380, y: 276, width: 64, height: 38, rx: 8, fill: SKY }, svg);
      el("rect", { x: 44, y: 146, width: 712, height: 346, rx: 16, fill: "none", stroke: INK, "stroke-width": 2.5 }, svg);
      el("path", { d: "M44 182 H756", stroke: INK, "stroke-width": 2 }, svg);
      /* the region box drawn by the crosshair */
      const box = el("rect", { x: 212, y: 210, width: 0, height: 0, rx: 4, fill: SKY, "fill-opacity": 0.18, stroke: BLUE, "stroke-width": 2.5, "stroke-dasharray": "8 6" }, svg);
      /* the capture with its note, stapled; it flies as one */
      const P = mv(el("g", { "pointer-events": "none" }, svg)), Pin = el("g", { transform: `translate(${-PCX} ${-PCY})` }, P);
      el("rect", { x: 212, y: 210, width: 246, height: 108, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, Pin);
      el("path", { d: "M230 236 H400 M230 262 H436 M230 288 H350", stroke: MUTE, "stroke-width": 7, "stroke-linecap": "round", "stroke-opacity": 0.45 }, Pin);
      el("rect", { x: 380, y: 270, width: 60, height: 36, rx: 8, fill: SKY }, Pin);
      const note = el("g", {}, Pin);
      el("rect", { x: 212, y: 310, width: 246, height: 46, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, note);
      const nph = txt(note, 232, 340, "your note", { "font-size": 18, "font-weight": 500, fill: MUTE });
      const ntx = el("path", { d: "M234 334 H330 M344 334 H420", stroke: INK, "stroke-width": 7, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "0 1" }, note);
      const staple = el("path", { d: "M-12 5 V-4 H12 V5", fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, Pin);
      /* the ring: four actions that open out of the stapler */
      const RING = [["Screenshot", 502, 420], ["Record message", 512, 344], ["Record meeting", 566, 274], ["Make invisible", 650, 216]];
      const ICO = [
        (g) => el("path", { d: "M-8 -3 V-8 H-3 M3 -8 H8 V-3 M8 3 V8 H3 M-3 8 H-8 V3", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, g),
        (g) => { el("rect", { x: -4, y: -10, width: 8, height: 13, rx: 4, fill: LIL, stroke: INK, "stroke-width": 2 }, g); el("path", { d: "M-7 0 Q-7 7 0 7 Q7 7 7 0 M0 7 V10", fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g); },
        (g) => { el("circle", { r: 9.5, fill: "none", stroke: INK, "stroke-width": 2 }, g); el("circle", { r: 5.5, fill: BLUE }, g); },
        (g) => el("circle", { r: 8, fill: "none", stroke: MUTE, "stroke-width": 2.5, "stroke-dasharray": "3.5 3.5" }, g),
      ];
      const pills = RING.map(([s, x, y], i) => {
        const g = el("g", { "pointer-events": "none" }, svg);
        const r = el("rect", { y: -22, height: 44, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const tx = txt(g, 0, 7, s, { "font-size": 20, "font-weight": 700 }), w = tx.getComputedTextLength() + 70;
        r.setAttribute("x", (-w / 2).toFixed(1)); r.setAttribute("width", w.toFixed(1)); tx.setAttribute("x", (-w / 2 + 50).toFixed(1));
        const ic = el("g", { transform: `translate(${(-w / 2 + 25).toFixed(1)} 0)` }, g);
        el("circle", { r: 16, fill: SOFT }, ic);
        ICO[i](ic);
        return { g, x, y, r };
      });
      /* the stapler: a dashed spot until the setting is on, then a round button that floats */
      const HG = el("g", {}, svg);
      const ghost = el("circle", { cx: SX, cy: SY, r: 34, fill: "#fff", "fill-opacity": 0, stroke: LIL, "stroke-width": 3, "stroke-dasharray": "7 7" }, HG);
      el("circle", { cx: SX, cy: SY, r: 42, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, HG);
      button(HG, "Open the stapler ring", () => api.seek(1.45));
      const shadow = el("ellipse", { cx: SX, cy: SY + 50, rx: 26, ry: 5, fill: LIL, "pointer-events": "none" }, svg);
      const B = el("g", { "pointer-events": "none" }, svg);
      el("circle", { r: 34, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, B);
      el("rect", { x: -23, y: 9, width: 46, height: 7, rx: 3.5, fill: SOFT, stroke: INK, "stroke-width": 2 }, B);
      el("rect", { x: 11, y: -5, width: 11, height: 17, rx: 3, fill: INK }, B);
      const arm = el("path", { d: "M18 -9 H-15 Q-23 -9 -23 -2 Q-23 3 -17 3 H18 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, B);
      const ptr = el("path", { d: "M0 0 V26 L7 19.5 L12 30 L16.5 28 L11.5 17.5 H21 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", "pointer-events": "none" }, svg);
      const xh = el("path", { d: "M-13 0 H13 M0 -13 V13", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "pointer-events": "none" }, svg);
      const cap = strip(svg, 516, 740);
      const KP = [[0, 560, 300], [0.15, 560, 300], [0.45, 700, 110], [0.7, 700, 110], [1.35, 686, 412], [1.75, 686, 412], [2.3, 600, 470], [2.65, 444, 432], [3.1, 444, 432]];
      const at = (t) => { for (let i = 1; i < KP.length; i++) if (t < KP[i][0]) { const a = KP[i - 1], b = KP[i], k = io((t - a[0]) / (b[0] - a[0])); return [lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; } return KP[KP.length - 1].slice(1); };
      return (t, now) => {
        const out = seg(t, 13.3, 13.7);
        /* the setting goes on, and the stapler pops up in its spot */
        const on = io(seg(t, 0.5, 0.75)) * (1 - io(seg(t, 13.3, 13.6)));
        knob.setAttribute("cx", (697 + 26 * on).toFixed(2));
        trk.setAttribute("fill", on > 0.5 ? MINT : SOFT);
        const pop = Math.min(1.2, land(seg(t, 0.75, 1.1), 2.2)) * (1 - io(seg(t, 13.4, 13.7)));
        const press = Math.sin(Math.PI * seg(t, 1.45, 1.65)), bobY = 3 * Math.sin(now * 2) * cl(pop);
        tf(B, SX, (SY + bobY).toFixed(2), (pop * (1 - 0.1 * press)).toFixed(3));
        B.setAttribute("opacity", pop > 0.01 ? 1 : 0);
        ghost.setAttribute("stroke-opacity", (1 - cl(pop)).toFixed(2));
        shadow.setAttribute("rx", (26 * cl(pop) * (1 - 0.06 * Math.sin(now * 2))).toFixed(2));
        shadow.setAttribute("opacity", (0.5 * cl(pop)).toFixed(2));
        /* the staple: the stapler's arm comes down, and a staple joins the note to the capture */
        const chomp = Math.sin(Math.PI * seg(t, 6.85, 7.1));
        arm.setAttribute("transform", `rotate(${(9 - 11 * chomp).toFixed(2)} 16 -3)`);
        /* the ring opens, Screenshot is picked, it closes; later it opens again and stays */
        pills.forEach((p, i) => {
          const o1 = land(seg(t, 1.65 + 0.07 * i, 2.05 + 0.07 * i), 1.6), c1 = i === 0 ? io(seg(t, 3.05, 3.3)) : io(seg(t, 2.9, 3.15));
          const o2 = land(seg(t, 9.3 + 0.08 * i, 9.75 + 0.08 * i), 1.6), c2 = io(seg(t, 13.2, 13.5));
          const k = t < 6 ? o1 * (1 - c1) : o2 * (1 - c2), pick = i === 0 ? Math.sin(Math.PI * seg(t, 2.8, 3.0)) : 0;
          tf(p.g, lerp(SX, p.x, cl(k)).toFixed(2), lerp(SY, p.y, cl(k)).toFixed(2), (Math.min(1.12, Math.max(0, k)) * (1 + 0.08 * pick)).toFixed(3));
          p.g.setAttribute("opacity", k > 0.02 ? 1 : 0);
          p.r.setAttribute("fill", i === 0 && t > 2.8 && t < 3.3 ? YEL : "#fff");
        });
        /* the pointer: the setting, the stapler, Screenshot; then the crosshair drags the region */
        const [px, py] = at(t), click = Math.max(Math.sin(Math.PI * seg(t, 0.5, 0.7)), press, Math.sin(Math.PI * seg(t, 2.8, 3.0)));
        ptr.setAttribute("transform", `translate(${(px + 2 * click).toFixed(2)} ${(py + 3 * click).toFixed(2)})`);
        ptr.setAttribute("opacity", t < 3.1 ? 1 : 0);
        const xk = io(seg(t, 3.1, 3.6)), dk = io(seg(t, 3.7, 4.7));
        const xx = t < 3.7 ? lerp(444, 212, xk) : lerp(212, 458, dk), xy = t < 3.7 ? lerp(432, 210, xk) : lerp(210, 318, dk);
        tf(xh, xx.toFixed(2), xy.toFixed(2));
        xh.setAttribute("opacity", t >= 3.1 && t < 4.9 ? 1 : 0);
        box.setAttribute("width", (246 * dk).toFixed(2)); box.setAttribute("height", (108 * dk).toFixed(2));
        box.setAttribute("opacity", t >= 3.7 && t < 5.0 ? (1 - seg(t, 4.85, 5.0)).toFixed(2) : 0);
        /* the capture lifts, the note slides in and is typed, the staple goes in, the pair flies to the agent */
        const lift = land(seg(t, 4.85, 5.15), 2), nk = oc(seg(t, 5.05, 5.45)), ty = seg(t, 5.7, 6.7);
        note.setAttribute("transform", `translate(0 ${(-30 * (1 - nk)).toFixed(2)})`);
        note.setAttribute("opacity", nk.toFixed(2));
        nph.setAttribute("opacity", ty > 0 ? 0 : 1);
        ntx.setAttribute("stroke-dasharray", `${ty.toFixed(3)} 1`);
        ntx.setAttribute("opacity", ty > 0.005 ? 1 : 0);
        const sk = seg(t, 6.95, 7.15);
        tf(staple, 234, 312, t < 6.95 ? 0 : Math.min(1.5, land(sk, 2.4)).toFixed(3));
        const fk = io(seg(t, 7.5, 8.4)), jig = t > 6.95 && t < 7.4 ? 2.5 * Math.sin((t - 6.95) * 40) * (1 - seg(t, 6.95, 7.4)) : 0;
        const fx = lerp(PCX, AX, fk), fy = lerp(PCY, AY, fk) + 24 * Math.sin(Math.PI * fk);
        tf(P, fx.toFixed(2), fy.toFixed(2), ((1 + 0.03 * (lift - cl(lift))) * (1 - 0.9 * fk)).toFixed(3), (jig - 8 * Math.sin(Math.PI * fk)).toFixed(2));
        const po = t < 4.85 || t > 8.4 ? 0 : 1 - seg(fk, 0.6, 0.85);
        P.setAttribute("opacity", po.toFixed(2));
        P.setAttribute("display", po < 0.01 ? "none" : "inline");
        /* the agent takes it, gives a small hop and a tick */
        const ak = seg(t, 8.35, 8.6), hop = 6 * Math.sin(Math.PI * seg(t, 8.35, 8.65));
        ag.setAttribute("transform", `translate(0 ${(-hop).toFixed(2)})`);
        tf(agK, 0, 0, 1);
        agK.setAttribute("opacity", t < 8.35 ? 0 : Math.min(1, ak * 3 * (1 - out)).toFixed(2));
        say(cap, t < 0.7 || t >= 13.3 ? "Turn on Show the stapler" : t < 1.55 ? "The Stapler is a small window that floats above every app" : t < 2.9 ? "Then click it for its ring" : t < 5.0 ? "Screenshot captures a region of the screen" : t < 6.9 ? "and sends it to an agent with a note" : t < 9.2 ? "When you see a bug in any app, do not describe it. Staple it" : "Its ring offers Screenshot, Record message, Record meeting and Make invisible", 700);
      };
    },
  };

  /* ==== ADD NEW SCENES ABOVE THIS LINE ==== */

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
