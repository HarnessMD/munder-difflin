/* Bright coded scenes for "Claude Duet app". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
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
  let uid = 0;
  const pill = (svg, cx, cy, w, label, fn) => {
    const g = el("g", {}, svg);
    el("rect", { x: cx - w / 2 - 7, y: cy - 32, width: w + 14, height: 64, rx: 32, fill: "none", stroke: INK, "stroke-width": 2.5, class: "mg-ring" }, g);
    el("rect", { x: cx - w / 2, y: cy - 25, width: w, height: 50, rx: 25, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    txt(g, cx, cy + 8, label, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
    button(g, label, fn);
    return g;
  };
  const hint = (svg, s, x = 756, y = 52, anchor = "end") => txt(svg, x, y, s, { "text-anchor": anchor, "font-size": 18, "font-weight": 500, fill: MUTE });

  const SC = {};

  /* ---- 1. one key ring moves from the Claude app hook to the Claude Duet hook ---- */
  SC.keyring = {
    dur: 7.2, still: 6.4,
    build(svg, api) {
      hint(svg, "tap Swing");
      const HX = [240, 560], P = [[252, 205], [572, 205]];
      HX.forEach((x, i) => {
        txt(svg, x, 112, i ? "Claude Duet" : "Claude app", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
        el("rect", { x: x - 34, y: 130, width: 68, height: 32, rx: 10, fill: i ? LIL : SKY, stroke: INK, "stroke-width": 3 }, svg);
        [-20, 20].forEach((d) => el("circle", { cx: x + d, cy: 146, r: 3.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg));
      });
      const ring = el("g", {}, svg), dang = el("g", {}, ring);
      const T = [["Memory", BLUE, -140], ["Skills", LIL, 0], ["Connectors", MINT, 140]];
      T.forEach(([, , x]) => el("path", { d: `M0 60 L${x} 176`, stroke: INK, "stroke-width": 2 }, dang));
      T.forEach(([s, c, x]) => {
        el("rect", { x: x - 62, y: 176, width: 124, height: 40, rx: 10, fill: c, stroke: INK, "stroke-width": 3 }, dang);
        txt(dang, x, 202.5, s, { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      });
      el("path", { d: "M0 60 V86", stroke: INK, "stroke-width": 2.5 }, ring);
      el("rect", { x: -128, y: 86, width: 256, height: 48, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, ring);
      el("circle", { cx: -108, cy: 110, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, ring);
      txt(ring, 10, 117, "Your Claude account", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      el("circle", { cx: 0, cy: 30, r: 30, fill: "none", stroke: INK, "stroke-width": 10 }, ring);
      el("circle", { cx: 0, cy: 30, r: 30, fill: "none", stroke: YEL, "stroke-width": 4.5 }, ring);
      HX.forEach((x) => el("path", { d: `M${x} 160 V188 Q${x} 208 ${x + 12} 208 Q${x + 26} 208 ${x + 26} 192`, stroke: INK, "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, svg));
      pill(svg, 400, 528, 150, "Swing", () => api.seek(0.75));
      const ang = (t) => {
        if (t < 0.9) return 3 * Math.sin(t * 2.6) * (1 - seg(t, 0.6, 0.9));
        if (t < 3) return 14 * Math.sin(2 * Math.PI * io(seg(t, 0.9, 3)));
        const s = t - 3; return -12 * Math.exp(-1.6 * s) * Math.sin(4.8 * s);
      };
      return (t) => {
        const u = io(seg(t, 0.9, 3)), th = ang(t);
        const x = P[0][0] + (P[1][0] - P[0][0]) * u, y = P[0][1] - 50 * Math.sin(Math.PI * u);
        ring.setAttribute("transform", `translate(${x} ${y}) rotate(${th})`);
        dang.setAttribute("transform", `rotate(${(ang(t - 0.18) - th) * 0.8} 0 60)`);
        ring.setAttribute("opacity", seg(t, 0, 0.35) * (1 - seg(t, 6.85, 7.2)));
      };
    },
  };

  /* ---- 2. four stands on a shelf, three get a lamp, one stays empty ---- */
  SC.stands = {
    dur: 8.4, still: 7.8,
    build(svg, api) {
      const X = [130, 310, 490, 670], ON = [1.0, 2.2, 3.4], CARD = 4.6, LITC = [SKY, MINT, LIL];
      const LAB = [["iPhone"], ["Android"], ["Web at", "claude.ai"], ["Mac or", "Windows app"]];
      const tap = [null, null, null, null];
      const cones = X.map((x) => el("path", { d: `M${x - 26} 108 L${x + 26} 108 L${x + 76} 398 L${x - 76} 398 Z`, fill: YEL, opacity: 0 }, svg));
      const lamps = X.map((x) => {
        el("path", { d: `M${x} 0 V72`, stroke: INK, "stroke-width": 2.5 }, svg);
        const bulb = el("circle", { cx: x, cy: 106, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
        const shade = el("path", { d: `M${x - 30} 104 L${x - 15} 70 H${x + 15} L${x + 30} 104 Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
        return { bulb, shade };
      });
      el("rect", { x: 40, y: 400, width: 720, height: 20, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      [220, 580].forEach((x) => el("path", { d: `M${x - 18} 420 V462 L${x + 22} 420 Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg));
      LAB.forEach((ls, i) => ls.forEach((s, j) => txt(svg, X[i], 456 + j * 26, s, Object.assign({ "text-anchor": "middle", "font-size": 20, "font-weight": 600 }, s === "claude.ai" ? { "font-family": MONO } : {}))));
      hint(svg, "tap a stand", 400, 562, "middle");
      const screens = [];
      let card;
      X.forEach((x, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: x - 84, y: 172, width: 168, height: 238, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 6", class: "mg-ring" }, g);
        if (i === 2) {
          el("path", { d: `M${x - 60} 400 L${x - 44} 378 H${x + 44} L${x + 60} 400 Z`, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
          el("rect", { x: x - 52, y: 290, width: 104, height: 78, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
          screens[i] = el("rect", { x: x - 44, y: 298, width: 88, height: 62, rx: 4, fill: SOFT }, g);
          el("rect", { x: x - 66, y: 366, width: 132, height: 12, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        } else {
          el("path", { d: `M${x + 10} 386 L${x + 40} 310`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g);
          el("rect", { x: x - 42, y: 386, width: 84, height: 14, rx: 4, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
          if (i < 3) {
            el("rect", { x: x - 28, y: 280, width: 56, height: 104, rx: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
            screens[i] = el("rect", { x: x - 21, y: 291, width: 42, height: 78, rx: 4, fill: SOFT }, g);
          } else {
            el("rect", { x: x - 28, y: 280, width: 56, height: 104, rx: 11, fill: "none", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "6 6" }, g);
            card = el("g", {}, g);
            el("rect", { x: x - 80, y: 184, width: 160, height: 74, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, card);
            txt(card, x, 215, "Not named", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
            txt(card, x, 241, "by Anthropic", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
          }
          el("rect", { x: x - 36, y: 374, width: 72, height: 12, rx: 4, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
        }
        button(g, LAB[i].join(" "), () => { tap[i] = api.now(); api.poke(); });
      });
      return (t, now) => {
        for (let i = 0; i < 3; i++) {
          const tapped = tap[i] != null, k = tapped ? 1 : oc(seg(t, ON[i], ON[i] + 0.4));
          const p = Math.sin((tapped ? seg(now - tap[i], 0, 0.5) : seg(t, ON[i], ON[i] + 0.4)) * Math.PI);
          cones[i].setAttribute("opacity", 0.32 * k);
          lamps[i].bulb.setAttribute("fill", k > 0.4 ? YEL : "#fff");
          lamps[i].shade.setAttribute("fill", k > 0.4 ? YEL : SOFT);
          lamps[i].bulb.setAttribute("r", 9 + 4 * p);
          screens[i].setAttribute("fill", k > 0.4 ? LITC[i] : SOFT);
        }
        if (tap[3] != null) { card.setAttribute("opacity", 1); card.setAttribute("transform", `translate(670 221) scale(${1 + 0.12 * Math.sin(seg(now - tap[3], 0, 0.5) * Math.PI)}) translate(-670 -221)`); }
        else { const k = ob(seg(t, CARD, CARD + 0.45)); card.setAttribute("opacity", cl(k * 3)); card.setAttribute("transform", `translate(670 221) scale(${Math.max(0.01, k)}) translate(-670 -221)`); }
      };
    },
  };

  /* ---- 3. invitation parcel, sign in key, a few minutes, ready lamp ---- */
  SC.parcel = {
    dur: 9.6, still: 9.0,
    build(svg, api) {
      hint(svg, "tap Open");
      const defs = el("defs", {}, svg);
      // doormat
      el("rect", { x: 70, y: 228, width: 260, height: 24, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      for (let x = 92; x <= 308; x += 18) el("path", { d: `M${x} 234 V246`, stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round" }, svg);
      // parcel with its tag behind the front
      const box = el("g", {}, svg), pid = "mgc" + (++uid);
      el("rect", { x: 0, y: -400, width: 800, height: 626 }, el("clipPath", { id: pid }, defs));
      const tagG = el("g", {}, el("g", { "clip-path": `url(#${pid})` }, box));
      el("path", { d: "M200 84 V150", stroke: INK, "stroke-width": 2.5 }, tagG);
      el("rect", { x: 112, y: 46, width: 176, height: 38, rx: 10, fill: SKY, stroke: INK, "stroke-width": 2.5 }, tagG);
      txt(tagG, 200, 71, "iPhone or Android", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
      el("rect", { x: 115, y: 138, width: 170, height: 90, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, box);
      txt(box, 200, 191, "Invitation email", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      const fl = el("rect", { x: 115, y: 130, width: 85, height: 10, rx: 3, fill: YEL, stroke: INK, "stroke-width": 3 }, box);
      const fr = el("rect", { x: 200, y: 130, width: 85, height: 10, rx: 3, fill: YEL, stroke: INK, "stroke-width": 3 }, box);
      // lock
      const shackle = el("g", {}, svg);
      el("path", { d: "M595 142 V108 A30 30 0 0 1 655 108 V142", stroke: INK, "stroke-width": 11, fill: "none" }, shackle);
      el("path", { d: "M595 142 V108 A30 30 0 0 1 655 108 V142", stroke: SOFT, "stroke-width": 5, fill: "none" }, shackle);
      const body = el("rect", { x: 570, y: 138, width: 110, height: 92, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: 625, cy: 178, r: 8, fill: INK }, svg);
      el("path", { d: "M621 180 L618 200 H632 L629 180 Z", fill: INK }, svg);
      txt(svg, 625, 264, "Sign in", { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
      // key with its tag
      const slide = el("g", {}, svg);
      el("path", { d: "M-118 16 L-152 54", stroke: INK, "stroke-width": 2.5 }, slide);
      el("rect", { x: -250, y: 54, width: 196, height: 34, rx: 10, fill: MINT, stroke: INK, "stroke-width": 2.5 }, slide);
      txt(slide, -152, 77, "Your Claude account", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
      const key = el("g", {}, slide);
      el("rect", { x: -104, y: -5, width: 104, height: 10, rx: 3, fill: YEL, stroke: INK, "stroke-width": 2.5 }, key);
      el("path", { d: "M-24 5 V15 H-16 V5 M-12 5 V12 H-4 V5", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, key);
      el("circle", { cx: -118, cy: 0, r: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, key);
      el("circle", { cx: -118, cy: 0, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, key);
      // sand timer
      const gid = "mgc" + (++uid), glass = "M168 322 C168 360 196 372 196 385 C196 398 168 410 168 448 H232 C232 410 204 398 204 385 C204 372 232 360 232 322 Z";
      el("path", { d: glass }, el("clipPath", { id: gid }, defs));
      el("path", { d: glass, fill: "#fff" }, svg);
      const sand = el("g", { "clip-path": `url(#${gid})` }, svg);
      const top = el("rect", { x: 160, y: 326, width: 80, height: 60, fill: YEL }, sand);
      const bot = el("rect", { x: 160, y: 448, width: 80, height: 0, fill: YEL }, sand);
      const stream = el("path", { d: "M200 384 V448", stroke: YEL, "stroke-width": 4 }, sand);
      el("path", { d: glass, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      [158, 242].forEach((x) => el("path", { d: `M${x} 322 V448`, stroke: INK, "stroke-width": 4 }, svg));
      [310, 448].forEach((y) => el("rect", { x: 148, y, width: 104, height: 12, rx: 5, fill: LIL, stroke: INK, "stroke-width": 3 }, svg));
      txt(svg, 200, 494, "A few minutes", { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
      // desk lamp
      el("path", { d: "M470 460 H740", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const beam = el("path", { d: "M582 366 L662 366 L716 458 L528 458 Z", fill: YEL, opacity: 0 }, svg);
      el("path", { d: "M600 446 L566 386 L618 332", stroke: INK, "stroke-width": 7, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      el("circle", { cx: 566, cy: 386, r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 550, y: 444, width: 100, height: 16, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      const bulb = el("circle", { cx: 622, cy: 366, r: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      const shade = el("path", { d: "M600 326 L644 326 L662 366 L582 366 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      txt(svg, 600, 494, "Ready", { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
      pill(svg, 400, 548, 130, "Open", () => api.seek(0));
      return (t) => {
        const d = seg(t, 0.4, 1.1), bump = Math.sin(seg(t, 1.1, 1.35) * Math.PI) * 12;
        box.setAttribute("transform", `translate(0 ${-260 * (1 - oc(d)) - bump})`);
        box.setAttribute("opacity", seg(t, 0.4, 0.5));
        const f = io(seg(t, 1.4, 1.9));
        fl.setAttribute("transform", `rotate(${-125 * f} 115 140)`);
        fr.setAttribute("transform", `rotate(${125 * f} 285 140)`);
        tagG.setAttribute("transform", `translate(0 ${100 * (1 - ob(seg(t, 1.7, 2.3)))})`);
        const s = oc(seg(t, 2.6, 3.3)), turn = io(seg(t, 3.3, 3.9));
        slide.setAttribute("transform", `translate(${625 - 60 * (1 - s)} 182)`);
        slide.setAttribute("opacity", seg(t, 2.6, 2.9));
        key.setAttribute("transform", `scale(1 ${Math.cos(Math.PI * turn)})`);
        const open = ob(seg(t, 3.9, 4.25));
        shackle.setAttribute("transform", `translate(0 ${-16 * open})`);
        body.setAttribute("fill", open > 0.5 ? MINT : BLUE);
        const k = io(seg(t, 4.6, 6.8));
        top.setAttribute("y", 326 + 58 * k); top.setAttribute("height", 60 - 58 * k);
        bot.setAttribute("y", 448 - 56 * k); bot.setAttribute("height", 56 * k);
        stream.setAttribute("opacity", k > 0 && k < 1 ? 1 : 0);
        const on = oc(seg(t, 7.0, 7.3));
        beam.setAttribute("opacity", 0.34 * on);
        bulb.setAttribute("fill", on > 0.3 ? YEL : "#fff"); shade.setAttribute("fill", on > 0.3 ? YEL : SOFT);
      };
    },
  };

  /* ---- 4. three spoons scoop from one jar, the price tag reads None ---- */
  SC.jar = {
    dur: 9.2, still: 8.6,
    build(svg, api) {
      hint(svg, "tap Scoop");
      const defs = el("defs", {}, svg), S = [0.7, 2.5, 4.3], FLIP = 6.3;
      const lvl = (n) => 0.35 + 0.55 * Math.pow(0.85, n), LY = (f) => 466 - f * 236;
      el("rect", { x: 30, y: 470, width: 740, height: 16, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 486, y: 248, width: 262, height: 222, rx: 18, fill: SOFT }, svg);
      // lid leaning on the left, with its price tag
      el("circle", { cx: 122, cy: 404, r: 62, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: 122, cy: 404, r: 48, fill: "none", stroke: INK, "stroke-width": 2 }, svg);
      el("circle", { cx: 122, cy: 350, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("path", { d: "M122 356 V396", stroke: INK, "stroke-width": 2.5 }, svg);
      const tag = el("g", {}, svg);
      const tagR = el("rect", { x: 47, y: 388, width: 150, height: 48, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: 122, cy: 397, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      const tagT = txt(tag, 122, 426, "Extra charge", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      // jar contents
      const jarD = "M250 200 V222 Q210 226 210 260 V430 Q210 470 250 470 H390 Q430 470 430 430 V260 Q430 226 390 222 V200";
      const cid = "mgc" + (++uid);
      el("path", { d: jarD + " Z" }, el("clipPath", { id: cid }, defs));
      const fillG = el("g", { "clip-path": `url(#${cid})` }, svg);
      const goo = el("rect", { x: 205, y: 254, width: 230, height: 300, fill: YEL }, fillG);
      const surf = el("path", { d: "M205 254 H435", stroke: INK, "stroke-width": 2.5 }, fillG);
      el("path", { d: "M228 272 V420", stroke: "#fff", "stroke-width": 6, "stroke-linecap": "round", opacity: 0.8 }, fillG);
      // spoons
      const SP = [["Chats", SKY], ["Background checks", LIL], ["Large tasks", MINT]];
      const REST = [[612, 290], [612, 360], [612, 430]];
      const spoons = SP.map(([s, c]) => {
        const g = el("g", {}, svg);
        el("rect", { x: -58, y: -14, width: 172, height: 28, rx: 14, fill: c, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 30, 5, s, { "text-anchor": "middle", "font-size": 14, "font-weight": 700 });
        el("ellipse", { cx: -80, cy: 0, rx: 25, ry: 17, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const scoop = el("circle", { cx: -80, cy: 0, r: 12, fill: YEL, stroke: INK, "stroke-width": 2 }, g);
        return { g, scoop };
      });
      // glass on top so a dipping spoon reads as inside
      el("path", { d: jarD, fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      el("rect", { x: 242, y: 192, width: 156, height: 14, rx: 7, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 252, y: 360, width: 136, height: 66, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 320, 388, "Your plan's", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      txt(svg, 320, 412, "usage limits", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      let extra = 0, tapAt = null;
      pill(svg, 400, 545, 140, "Scoop", () => { extra++; tapAt = api.now(); api.poke(); });
      // r: seconds into one scoop; y: level line; returns [x, y, angle]
      const pose = (j, r, y) => {
        const [rx, ry] = REST[j], st = [341, 112], dip = [341, y + 18 - 77];
        const a = io(seg(r, 0, 0.45)), dn = io(seg(r, 0.45, 0.75)), up = io(seg(r, 0.75, 1.0)), back = io(seg(r, 1.0, 1.45));
        if (r < 0.45) return [rx + (st[0] - rx) * a, ry + (st[1] - ry) * a, -75 * a];
        if (r < 0.75) return [st[0], st[1] + (dip[1] - st[1]) * dn, -75];
        if (r < 1.0) return [st[0], dip[1] + (st[1] - dip[1]) * up, -75];
        return [st[0] + (rx - st[0]) * back, st[1] + (ry - st[1]) * back, -75 * (1 - back)];
      };
      return (t, now) => {
        const T = extra > 0 ? 8.6 : t;
        let n = 0, f = lvl(0);
        S.forEach((s0, j) => { if (T >= s0 + 0.62) n = j + 1; });
        S.forEach((s0, j) => { const r = T - s0; if (r >= 0.55 && r < 0.8) f = lvl(j) + (lvl(j + 1) - lvl(j)) * oc(seg(r, 0.55, 0.8)); });
        if (!S.some((s0) => T - s0 >= 0.55 && T - s0 < 0.8)) f = lvl(n);
        let busy = -1, rr = 0;
        if (extra > 0) {
          const r = now - tapAt, m = 3 + extra;
          busy = (extra - 1) % 3; rr = r;
          f = r < 0.55 ? lvl(m - 1) : lvl(m - 1) + (lvl(m) - lvl(m - 1)) * oc(seg(r, 0.55, 0.8));
        }
        const y = LY(f);
        goo.setAttribute("y", y); surf.setAttribute("d", `M205 ${y} H435`);
        spoons.forEach((sp, j) => {
          let r = T - S[j], has = r >= 0.75;
          if (busy === j) { r = rr; has = true; }
          const [x, yy, a] = r > 0 && r < 1.45 ? pose(j, r, y) : REST[j].concat(0);
          tf(sp.g, x, yy, 1, a);
          sp.scoop.setAttribute("opacity", has ? 1 : 0);
        });
        const k = io(seg(T, FLIP, FLIP + 0.6)), c = Math.cos(Math.PI * k), back = c < 0;
        tag.setAttribute("transform", `translate(122 0) scale(${Math.max(0.02, Math.abs(c))} 1) translate(-122 0)`);
        tagR.setAttribute("fill", back ? MINT : YEL);
        tagT.textContent = back ? "None" : "Extra charge";
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 5.6,
    build(svg) {
      el("rect", { x: 64, y: 62, width: 84, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 106, 89, "App", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      txt(svg, 64, 194, "Claude Duet app", { "font-size": 84, "font-weight": 700 });
      el("path", { d: "M66 222 H560", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 278, "iPhone, Android and web", { "font-size": 30, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 320, "Checked 23 Oct 2026", { "font-size": 20, "font-weight": 500, fill: CAP });
      el("path", { d: "M150 436 H820", stroke: SOFT, "stroke-width": 22, "stroke-linecap": "round" }, svg);
      const links = [[178, 262], [318, 400], [620, 730]].map(([a, b]) => el("path", { d: `M${a} 436 H${b}`, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "2 12", "stroke-linecap": "round" }, svg));
      const screens = [];
      [150, 290].forEach((x) => {
        el("rect", { x: x - 28, y: 384, width: 56, height: 104, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        screens.push(el("rect", { x: x - 20, y: 396, width: 40, height: 76, rx: 4, fill: SOFT }, svg));
        el("path", { d: `M${x - 7} 480 H${x + 7}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      });
      el("rect", { x: 400, y: 380, width: 220, height: 112, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M400 404 H620", stroke: INK, "stroke-width": 2.5 }, svg);
      [418, 432, 446].forEach((x) => el("circle", { cx: x, cy: 392, r: 4, fill: SOFT, stroke: INK, "stroke-width": 1.5 }, svg));
      screens.push(el("rect", { x: 412, y: 414, width: 196, height: 66, rx: 6, fill: SOFT }, svg));
      const card = el("rect", { x: 730, y: 404, width: 180, height: 66, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 820, 445, "Claude Duet", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
      const ON = [0.6, 1.6, 2.6], CARDT = 3.6, COL = [SKY, MINT, LIL];
      return (t) => {
        screens.forEach((s, i) => s.setAttribute("fill", t >= ON[i] ? COL[i] : SOFT));
        links.forEach((l, i) => l.setAttribute("stroke", t >= (i < 2 ? ON[i + 1] : CARDT) ? BLUE : INK));
        card.setAttribute("fill", t >= CARDT ? YEL : "#fff");
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
