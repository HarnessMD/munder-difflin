/* Bright coded scenes for "Google Workspace MCP Servers". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", WHITE = "#fff";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  let uid = 0;
  const nid = (p) => `mggw-${p}-${++uid}`;
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* a clear hit area plus a dashed focus ring that shows on hover and keyboard focus */
  const ring = (g, x, y, w, h, r) => {
    el("rect", { x, y, width: w, height: h, rx: r, fill: WHITE, "fill-opacity": 0 }, g);
    el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", class: "mg-ring" }, g);
  };
  /* a luggage tag drawn from its left tip at 0,0; a label in mono, or two blank lines */
  const tag = (p, col, label, size, w0) => {
    const g = el("g", {}, p), r = (size + 22) / 2;
    const body = el("path", { fill: col, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    el("circle", { cx: 17, cy: 0, r: 4.5, fill: WHITE, stroke: INK, "stroke-width": 2 }, g);
    let t = null, w = w0;
    if (label) { t = txt(g, 30, size * 0.36, label, { "font-family": MONO, "font-size": size, "font-weight": 700 }); w = 46 + t.getComputedTextLength(); }
    else { el("rect", { x: 30, y: -8, width: w - 48, height: 6, rx: 3, fill: WHITE }, g); el("rect", { x: 30, y: 3, width: (w - 48) * 0.6, height: 6, rx: 3, fill: WHITE }, g); }
    body.setAttribute("d", `M0 0 L15 ${-r} H${w - 9} Q${w} ${-r} ${w} ${-r + 9} V${r - 9} Q${w} ${r} ${w - 9} ${r} H15 Z`);
    return { g, w, t };
  };

  const SC = {};

  /* ---- 1. a toolbox opens three drawers; Gmail's tool tags rise one by one ---- */
  SC.toolbox = {
    dur: 7.5, still: 7.5, end: 5.1, rest: 0.9, rwLen: 1.4,
    build(svg, api) {
      const root = el("g", { transform: "translate(0 -28)" }, svg);
      const shelf = el("g", {}, root);
      el("path", { d: "M132 534 V580 L182 534 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, shelf);
      el("path", { d: "M668 534 V580 L618 534 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, shelf);
      el("rect", { x: 46, y: 512, width: 708, height: 24, rx: 8, fill: MINT, stroke: INK, "stroke-width": 3 }, shelf);
      const box = el("g", {}, root);
      ["M90 384 H74 Q66 384 66 392 V420 Q66 428 74 428 H90", "M710 384 H726 Q734 384 734 392 V420 Q734 428 726 428 H710"].forEach((d) => el("path", { d, fill: SOFT, stroke: INK, "stroke-width": 3 }, box));
      el("path", { d: "M90 318 L118 288 H682 L710 318 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, box);
      el("path", { d: "M90 318 H710 V500 Q710 512 698 512 H102 Q90 512 90 500 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, box);
      el("path", { d: "M90 350 H710", stroke: INK, "stroke-width": 2.5 }, box);
      el("rect", { x: 382, y: 340, width: 36, height: 20, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, box);
      const HY = 374, DW = 174, DH = 88;
      const DR = [["Gmail", 112, 40], ["Drive", 313, 18], ["Calendar", 514, 18]].map(([name, x, drop]) => ({ name, x, cx: x + DW / 2, drop }));
      DR.forEach((d) => el("rect", { x: d.x, y: HY, width: DW, height: DH, rx: 8, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, box));
      DR.forEach((d) => { d.tray = el("path", { fill: WHITE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, box); });
      const layer = el("g", {}, box);
      DR.forEach((d) => {
        d.g = el("g", {}, box);
        el("rect", { x: -DW / 2, y: -DH / 2, width: DW, height: DH, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, d.g);
        txt(d.g, 0, -4, d.name, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        el("rect", { x: -26, y: 14, width: 52, height: 12, rx: 6, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, d.g);
      });
      const items = [];
      [[1, SKY, 2.45], [2, LIL, 2.75]].forEach(([k, col, at]) => [0, 1, 2].forEach((i) => {
        const g = tag(layer, col, null, 17, 132);
        items.push(Object.assign(g, { d: DR[k], x: DR[k].cx - 66, y: 148 + i * 52, at: at + i * 0.1 }));
      }));
      const gm = ["search_threads", "get_thread", "create_draft", "trash_thread"].map((s) => tag(layer, BLUE, s, 17));
      const gw = Math.max(...gm.map((g) => g.w));
      gm.forEach((g, i) => items.push(Object.assign(g, { d: DR[0], x: DR[0].cx - gw / 2, y: 96 + i * 52, at: 3.25 + i * 0.36 })));
      const hit = el("g", {}, root);
      ring(hit, 40, 52, 720, 540, 24);
      button(hit, "Toolbox with Gmail, Drive and Calendar drawers. Press to close every drawer and open them again", () => api.replay());
      return (t) => {
        const sk = oc(seg(t, 0, 0.45));
        shelf.setAttribute("opacity", seg(t, 0, 0.25)); tf(shelf, 0, 18 * (1 - sk));
        const sq = 0.03 * Math.sin(Math.PI * seg(t, 0.62, 0.88));
        box.setAttribute("opacity", seg(t, 0.12, 0.3));
        box.setAttribute("transform", `translate(0 ${-56 * (1 - oc(seg(t, 0.12, 0.66)))}) translate(400 512) scale(${1 + sq * 0.6} ${1 - sq}) translate(-400 -512)`);
        DR.forEach((d, i) => {
          const p = ob(seg(t, 0.95 + i * 0.42, 1.5 + i * 0.42)), dy = d.drop * p, s = 1 + (0.07 * dy) / 40;
          const top = HY + DH / 2 + dy - (DH * s) / 2;
          d.g.setAttribute("transform", `translate(${d.cx} ${HY + DH / 2 + dy}) scale(${s})`);
          d.tray.setAttribute("d", dy > 0.5 ? `M${d.x} ${HY} H${d.x + DW} L${d.cx + (DW * s) / 2 - 3} ${top + 1} H${d.cx - (DW * s) / 2 + 3} Z` : "M0 0");
          d.tray.setAttribute("opacity", dy > 0.5 ? 1 : 0);
        });
        items.forEach((it) => {
          const k = seg(t, it.at, it.at + 0.62), e = ob(k, 0.9), s = 0.45 + 0.55 * oc(k);
          const y0 = HY + DH / 2 + it.d.drop;
          tf(it.g, lerp(it.d.cx - (it.w * 0.45) / 2, it.x, oc(k)), lerp(y0, it.y, e), s);
          it.g.setAttribute("opacity", k > 0 ? 1 : 0);
          if (it.t) { const lk = oc(seg(t, it.at + 0.38, it.at + 0.72)); it.t.setAttribute("opacity", lk); it.t.setAttribute("transform", `translate(${8 * (1 - lk)} 0)`); }
        });
      };
    },
  };

  /* ---- 2. a keycard waits at a turnstile until it is stamped is_agentic ---- */
  SC.turnstile = {
    dur: 8, still: 8, end: 6.2, rest: 0.7, rwLen: 1.6,
    build(frame, api) {
      const svg = el("g", { transform: "translate(0 40)" }, frame);
      const floor = el("rect", { x: 30, y: 468, width: 740, height: 20, rx: 10, fill: SOFT }, svg);
      const panel = el("g", {}, svg);
      el("rect", { x: 572, y: 162, width: 196, height: 306, rx: 22, fill: LIL, opacity: 0.45 }, panel);
      el("rect", { x: 560, y: 150, width: 196, height: 318, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, panel);
      el("rect", { x: 569, y: 244, width: 178, height: 114, rx: 16, fill: WHITE, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "7 7" }, panel);
      const plab = txt(svg, 658, 210, "MCP server", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const light = el("g", {}, svg);
      const pulse = el("circle", { r: 17, fill: "none", stroke: BLUE, "stroke-width": 4 }, light);
      const bulb = el("circle", { r: 17, fill: BLUE, stroke: INK, "stroke-width": 3 }, light);
      const gate = el("g", {}, svg);
      el("rect", { x: 334, y: 214, width: 76, height: 254, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, gate);
      el("rect", { x: 320, y: 196, width: 104, height: 28, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, gate);
      const arm = el("g", {}, gate);
      el("rect", { x: -132, y: -11, width: 140, height: 22, rx: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, arm);
      el("circle", { cx: 372, cy: 301, r: 19, fill: WHITE, stroke: INK, "stroke-width": 3 }, gate);
      el("circle", { cx: 372, cy: 301, r: 7, fill: MINT, stroke: INK, "stroke-width": 2.5 }, gate);
      const card = el("g", {}, svg), body = el("g", {}, card);
      el("rect", { x: -85, y: -52, width: 170, height: 104, rx: 14, fill: SKY, stroke: INK, "stroke-width": 3 }, body);
      el("rect", { x: -67, y: -38, width: 32, height: 24, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, body);
      el("rect", { x: -20, y: -36, width: 86, height: 7, rx: 3.5, fill: WHITE }, body);
      el("rect", { x: -20, y: -23, width: 56, height: 7, rx: 3.5, fill: WHITE }, body);
      const cid = nid("wipe"), cp = el("clipPath", { id: cid }, el("defs", {}, svg)), cr = el("rect", { x: -85, y: -52, width: 170, height: 104 }, cp);
      const word = el("g", { "clip-path": `url(#${cid})` }, body);
      el("rect", { x: -72, y: 2, width: 144, height: 38, rx: 8, fill: "none", stroke: INK, "stroke-width": 2.5 }, word);
      txt(word, 0, 28, "is_agentic", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const streak = el("rect", { x: -9, y: -2, width: 18, height: 46, rx: 9, fill: WHITE, opacity: 0 }, body);
      ring(card, -98, -66, 196, 132, 22);
      button(card, "Keycard stamped is_agentic. Press to wipe the stamp off the card and play it again", () => api.replay());
      const stamp = el("g", {}, svg);
      el("rect", { x: -12, y: -84, width: 24, height: 38, fill: YEL, stroke: INK, "stroke-width": 3 }, stamp);
      el("circle", { cx: 0, cy: -96, r: 21, fill: YEL, stroke: INK, "stroke-width": 3 }, stamp);
      el("rect", { x: -66, y: -50, width: 132, height: 36, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, stamp);
      el("rect", { x: -78, y: -16, width: 156, height: 16, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 3 }, stamp);
      let snap = null, lastSY = -40, lastWord = 0;
      return (t) => {
        const rw = api.rw;
        if (rw == null) snap = null; else if (!snap) snap = { sy: lastSY, word: lastWord };
        floor.setAttribute("opacity", seg(t, 0, 0.25));
        gate.setAttribute("opacity", seg(t, 0.05, 0.2));
        gate.setAttribute("transform", `translate(372 468) scale(1 ${0.4 + 0.6 * ob(seg(t, 0.05, 0.55))}) translate(-372 -468)`);
        panel.setAttribute("opacity", seg(t, 0.15, 0.3));
        panel.setAttribute("transform", `translate(658 468) scale(${0.85 + 0.15 * ob(seg(t, 0.15, 0.65))}) translate(-658 -468)`);
        const lk = oc(seg(t, 0.4, 0.75));
        plab.setAttribute("opacity", lk); plab.setAttribute("transform", `translate(0 ${12 * (1 - lk)})`);
        /* card: slides in, bumps the shut arm, then glides to the panel */
        const bump = 5 * Math.sin(Math.PI * seg(t, 1.45, 1.8));
        const cx = lerp(-110, 152, oc(seg(t, 0.75, 1.55))) + bump + (658 - 152) * io(seg(t, 4.3, 5.6));
        const press = rw == null ? Math.sin(Math.PI * seg(t, 2.45, 2.8)) : 0;
        tf(card, cx, 301);
        body.setAttribute("transform", `scale(${1 + 0.02 * press} ${1 - 0.04 * press})`);
        const jig = seg(t, 1.45, 2.2), give = 6 * Math.sin(Math.PI * 3 * jig) * (1 - jig);
        arm.setAttribute("transform", `translate(372 301) rotate(${give - 90 * ob(seg(t, 3.6, 4.25))})`);
        /* stamp: drops, presses, lifts and parks; a replay sends it up and away */
        let sy = t < 2.8 ? lerp(-40, 341, Math.pow(seg(t, 2.0, 2.45), 2)) : lerp(341, 150, oc(seg(t, 2.8, 3.4)));
        if (snap) sy = lerp(snap.sy, -40, io(seg(rw, 0, 0.45))); else lastSY = sy;
        stamp.setAttribute("transform", `translate(152 ${sy}) scale(${1 + 0.03 * press} ${1 - 0.07 * press})`);
        /* the stamped word, wiped off left to right on a replay */
        let wv = t >= 2.6 ? 1 : 0, wx = -85, so = 0;
        if (snap) { const w = io(seg(rw, 0.02, 0.32)); wv = snap.word && rw < 0.32 ? 1 : 0; wx = -85 + 170 * w; so = snap.word ? Math.sin(Math.PI * w) : 0; }
        else lastWord = wv;
        word.setAttribute("opacity", wv); cr.setAttribute("x", wx);
        streak.setAttribute("x", wx - 9); streak.setAttribute("opacity", so);
        /* the blue light blinks once when the card docks */
        const bl = rw == null ? seg(t, 5.6, 6.2) : 0;
        light.setAttribute("opacity", seg(t, 0.3, 0.45));
        tf(light, 658, 412, (0.6 + 0.4 * ob(seg(t, 0.3, 0.7))) * (1 + (rw == null ? 0.22 * Math.sin(Math.PI * seg(t, 5.6, 5.95)) : 0)));
        pulse.setAttribute("r", 17 + 26 * oc(bl)); pulse.setAttribute("opacity", bl > 0 && bl < 1 ? 1 - bl : 0);
        bulb.setAttribute("fill", BLUE);
      };
    },
  };

  /* ---- 3. a needle crosses from the Standard zone into the Scaled zone ---- */
  SC.meter = {
    dur: 8, still: 8, end: 6.2, rest: 2.9, rwLen: 1.3,
    build(svg, api) {
      const cx = 400, cy = 340, R = 232, ZR = 188;
      const pt = (r, a) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)];
      const arc = (r, a0, a1) => { const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1); return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`; };
      const dial = el("g", {}, svg);
      const face = `M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} V${cy + 12} Q${cx + R} ${cy + 30} ${cx + R - 18} ${cy + 30} H${cx - R + 18} Q${cx - R} ${cy + 30} ${cx - R} ${cy + 12} Z`;
      el("path", { d: face, fill: LIL, opacity: 0.45, transform: "translate(12 12)" }, dial);
      el("path", { d: face, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, dial);
      const zm = el("path", { d: arc(ZR, 180, 90), fill: "none", stroke: MINT, "stroke-width": 48, pathLength: 100 }, dial);
      const zl = el("path", { d: arc(ZR, 90, 0), fill: "none", stroke: LIL, "stroke-width": 48, pathLength: 100 }, dial);
      el("path", { d: arc(ZR + 24, 180, 0), fill: "none", stroke: INK, "stroke-width": 2.5 }, dial);
      el("path", { d: arc(ZR - 24, 180, 0), fill: "none", stroke: INK, "stroke-width": 2.5 }, dial);
      [180, 90, 0].forEach((a) => { const [x0, y0] = pt(ZR - 24, a), [x1, y1] = pt(ZR + 24, a); el("path", { d: `M${x0} ${y0} L${x1} ${y1}`, stroke: INK, "stroke-width": 2.5 }, dial); });
      const label = (s, a0, a1) => {
        const id = nid("arc");
        el("path", { id, d: arc(ZR - 8, a0, a1), fill: "none" }, dial);
        const n = el("text", { "text-anchor": "middle", "font-family": SANS, "font-size": 24, "font-weight": 700, fill: INK }, dial);
        el("textPath", { href: `#${id}`, startOffset: "50%" }, n).textContent = s;
        return n;
      };
      const labs = [label("Standard", 180, 90), label("Scaled", 90, 0)];
      const ticks = Array.from({ length: 13 }, (_, i) => { const [x0, y0] = pt(140, i * 15), [x1, y1] = pt(154, i * 15); return el("path", { d: `M${x0} ${y0} L${x1} ${y1}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, dial); });
      const needle = el("g", {}, dial);
      el("path", { d: "M-14 -8 L170 -2.5 Q177 0 170 2.5 L-14 8 Z", fill: BLUE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, needle);
      el("circle", { r: 22, fill: YEL, stroke: INK, "stroke-width": 3 }, needle);
      el("circle", { r: 7, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, needle);
      ring(dial, 146, 92, 508, 304, 24);
      button(dial, "Dial with a Standard zone and a Scaled zone. Press to swing the needle back to Standard", () => api.replay());
      const pill = el("g", {}, svg);
      const ptx = txt(pill, 0, 7, "5,000 requests per day", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const pw = ptx.getComputedTextLength() + 36;
      pill.insertBefore(el("rect", { x: -pw / 2, y: -22, width: pw, height: 44, rx: 22, fill: MINT, stroke: INK, "stroke-width": 2.5 }), ptx);
      const slip = el("g", {}, svg);
      el("path", { d: "M0 0 H76 V96 L66 88 L57 96 L47 88 L38 96 L28 88 L19 96 L9 88 L0 96 Z", fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, slip);
      [[14, 24, 48], [14, 42, 34], [14, 60, 44]].forEach(([x, y, w]) => el("path", { d: `M${x} ${y} H${x + w}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, slip));
      const tg = tag(svg, YEL, "April 1, 2027", 20), tx = 650 - 18 - tg.w;
      return (t) => {
        const fk = ob(seg(t, 0, 0.55));
        dial.setAttribute("opacity", seg(t, 0, 0.18));
        dial.setAttribute("transform", `translate(${cx} ${cy}) scale(${0.88 + 0.12 * fk}) translate(${-cx} ${-cy})`);
        zm.setAttribute("stroke-dasharray", `${100 * oc(seg(t, 0.3, 1.0))} 200`);
        zl.setAttribute("stroke-dasharray", `${100 * oc(seg(t, 0.5, 1.2))} 200`);
        ticks.forEach((n, i) => n.setAttribute("opacity", seg(t, 0.25 + i * 0.06, 0.4 + i * 0.06)));
        labs.forEach((n, i) => n.setAttribute("opacity", oc(seg(t, 0.95 + i * 0.12, 1.35 + i * 0.12))));
        const a = 180 - 45 * ob(seg(t, 1.4, 2.3), 1.2) - 90 * ob(seg(t, 3.4, 4.4));
        needle.setAttribute("transform", `translate(${cx} ${cy}) rotate(${-a}) scale(${ob(seg(t, 0.5, 0.95))})`);
        const pk = oc(seg(t, 2.2, 2.7));
        tf(pill, 250, 444 + 16 * (1 - pk)); pill.setAttribute("opacity", pk);
        const sk = oc(seg(t, 4.45, 4.95));
        tf(slip, 650, 398 + 24 * (1 - sk)); slip.setAttribute("opacity", sk);
        const dk = seg(t, 4.95, 5.55), sw = seg(t, 5.35, 6.2);
        tf(tg.g, tx, lerp(314, 444, ob(dk, 1.2)), 1, dk > 0 ? 7 * Math.sin(sw * Math.PI * 2) * (1 - sw) : 0);
        tg.g.setAttribute("opacity", oc(seg(dk, 0, 0.2)));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const P = [];
      const part = (at, pop) => { const g = el("g", {}, svg); P.push({ g, at, pop }); return g; };
      const RX = 762;
      const chip = part(0.1);
      const ct = txt(chip, 84, 135, "Guides", { "font-size": 20, "font-weight": 600 });
      chip.insertBefore(el("rect", { x: 64, y: 108, width: ct.getComputedTextLength() + 40, height: 40, rx: 20, fill: SKY, stroke: INK, "stroke-width": 2.5 }), ct);
      txt(part(0.22), 64, 222, "Google Workspace", { "font-size": 56, "font-weight": 700 });
      const t2 = txt(part(0.34), 64, 290, "MCP Servers", { "font-size": 56, "font-weight": 700 });
      const ul = el("path", { d: `M70 314 H${60 + t2.getComputedTextLength()}`, stroke: YEL, "stroke-width": 12, "stroke-linecap": "round", pathLength: 100 }, svg);
      /* a small yellow mailbox over a lilac card */
      const mb = el("g", { transform: `translate(${RX} 128)` }, part(0.7, [RX, 170]));
      el("rect", { x: -7, y: 8, width: 14, height: 34, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, mb);
      el("path", { d: "M-44 10 V-14 Q-44 -38 -20 -38 H20 Q44 -38 44 -14 V10 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, mb);
      el("path", { d: "M-18 -10 H18", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, mb);
      el("path", { d: "M44 4 V-46", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, mb);
      el("path", { d: "M44 -46 H66 L60 -38 L66 -30 H44 Z", fill: BLUE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, mb);
      /* a small blue meter over a mint card */
      const mt = el("g", { transform: `translate(${RX} 340)` }, part(1.05, [RX, 352]));
      el("rect", { x: -58, y: 0, width: 116, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, mt);
      el("path", { d: "M-50 0 A50 50 0 0 1 50 0 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, mt);
      el("path", { d: "M-35 0 A35 35 0 0 1 35 0", fill: "none", stroke: WHITE, "stroke-width": 6 }, mt);
      const hn = el("path", { d: "M0 0 H32", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, mt);
      el("circle", { r: 7, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, mt);
      const card = (at, y, col, s) => {
        const g = part(at), tt = txt(g, RX, y + 39, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        const r = el("rect", { y, height: 62, rx: 16, fill: col, stroke: INK, "stroke-width": 2.5 });
        g.insertBefore(r, tt);
        return { r, w: tt.getComputedTextLength() + 48 };
      };
      const cards = [card(0.85, 182, LIL, "Gmail: no send tool"), card(1.2, 368, MINT, "5,000 requests per day")];
      const cw = Math.max(...cards.map((c) => c.w));
      cards.forEach((c) => { c.r.setAttribute("x", RX - cw / 2); c.r.setAttribute("width", cw); });
      txt(part(1.4), 64, 372, "Eight servers are GA", { "font-size": 30, "font-weight": 500 });
      txt(part(1.55), 64, 414, "Checked 26 Nov 2026", { "font-family": MONO, "font-size": 18, "font-weight": 500, fill: MUTE });
      return (t) => {
        P.forEach((p) => {
          const k = seg(t, p.at, p.at + 0.5);
          p.g.setAttribute("opacity", oc(seg(k, 0, 0.5)));
          p.g.setAttribute("transform", p.pop ? `translate(${p.pop[0]} ${p.pop[1]}) scale(${0.6 + 0.4 * ob(k)}) translate(${-p.pop[0]} ${-p.pop[1]})` : `translate(0 ${16 * (1 - oc(k))})`);
        });
        const u = io(seg(t, 0.55, 1.0));
        ul.setAttribute("stroke-dasharray", `${100 * u} 200`); ul.setAttribute("opacity", u > 0 ? 1 : 0);
        hn.setAttribute("transform", `rotate(${lerp(-170, -48, ob(seg(t, 1.2, 1.8)))})`);
      };
    },
  };

  /* ---- player: plays when in view, holds the calm final frame, then rewinds smoothly and plays again ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, first = true, held = calm, last = 0, rw = null;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const len = sc.rwLen || 1.2;
    const frame = () => {
      const now = clock();
      let t;
      if (held) t = sc.still;
      else if (sc.rest == null) t = (((now + off) % sc.dur) + sc.dur) % sc.dur;
      else {
        if (!rw && now + off >= sc.dur) { if (calm) held = true; else rw = { from: Math.min(last, sc.end || sc.dur), at: now }; }
        if (rw && (now - rw.at) / len >= 1) { rw = null; off = sc.rest - now; }
        api.rw = rw ? (now - rw.at) / len : null;
        t = held ? sc.still : rw ? lerp(rw.from, sc.rest, io(api.rw)) : cl(now + off, 0, sc.dur);
      }
      last = t; draw(t, now);
    };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { rw: null, now: clock, replay: () => { if (sc.rest == null) return; held = false; if (!rw) rw = { from: Math.min(last, sc.end || sc.dur), at: clock() }; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (first) { first = false; off = -clock(); } tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 20px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
