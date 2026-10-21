/* Bright coded scenes for "LiteLLM 1.107.0 Compromise". Vanilla JS, no library.
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
  const strip = (svg, y, w = 680) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    return txt(svg, 400, y + 31, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
  };

  const SC = {};

  /* ---- title card, 16 by 9: a parcel whose tape seal splits ---- */
  SC.hero = {
    w: 960, h: 540, dur: 7.5, still: 4,
    build(svg) {
      el("rect", { x: 64, y: 72, width: 132, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 130, 99, "Security", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 64, 214, "LiteLLM 1.107.0", { "font-size": 80, "font-weight": 700 });
      el("path", { d: "M66 244 H470", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 304, "What it steals and how to check", { "font-size": 30, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 474, "Checked 21 Oct 2026", { "font-size": 20, "font-weight": 500, fill: MUTE });
      el("ellipse", { cx: 790, cy: 486, rx: 150, ry: 10, fill: SOFT }, svg);
      el("rect", { x: 676, y: 322, width: 228, height: 14, fill: INK }, svg);
      el("rect", { x: 670, y: 330, width: 240, height: 150, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3.5 }, svg);
      const zig = [768, 775.3, 782.7, 790, 797.3, 804.7, 812].map((x, i) => `L${x} ${i % 2 ? 337 : 329}`);
      const lid = el("g", {}, svg);
      el("rect", { x: 658, y: 300, width: 264, height: 36, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3.5 }, lid);
      el("path", { d: `M768 300 H812 ${zig.slice().reverse().join(" ")} Z`, fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, lid);
      const low = el("path", { d: `M768 329 ${zig.join(" ")} V410 H768 Z`, fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
      const sparks = el("g", {}, svg);
      ["M836 318 L850 306", "M842 330 L860 328", "M744 318 L730 306", "M738 330 L720 328"].forEach((d) => el("path", { d, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, sparks));
      const tag = el("g", {}, svg);
      el("path", { d: "M0 0 H112 Q118 0 118 6 V34 Q118 40 112 40 H0 L-16 20 Z", fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: -3, cy: 20, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      txt(tag, 58, 27, "1.107.0", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      tf(tag, 792, 426, 1, -4);
      return (t) => {
        const back = 1 - io(seg(t, 5.6, 6.8));
        const k1 = oc(seg(t, 0.6, 1.5)) * back, k2 = ob(seg(t, 1.2, 2.4)) * back;
        low.setAttribute("transform", `rotate(${14 * k1} 790 410)`);
        lid.setAttribute("transform", `translate(0 ${-26 * k2}) rotate(${-7 * k2} 658 336)`);
        sparks.setAttribute("opacity", cl(k2));
      };
    },
  };

  /* ---- 1. the exposure window on a day timeline ---- */
  SC.window = {
    dur: 11, still: 9,
    build(svg) {
      txt(svg, 44, 62, "21 Oct 2026, UTC", { "font-size": 32, "font-weight": 700 });
      const X = (h, m) => 60 + ((h + m / 60 - 10) / 5) * 680, AY = 400, TOP = 190;
      const xa = X(10, 44), xb = X(11, 40), xp = X(13, 23), xd = X(14, 32);
      const g = el("g", {}, svg);
      const yb = el("rect", { x: xb, y: TOP, width: 0, height: AY - TOP, fill: YEL, "fill-opacity": 0.5 }, g);
      const lb = el("rect", { x: xp, y: TOP, width: 0, height: AY - TOP, fill: LIL, "fill-opacity": 0.35 }, g);
      const brk = el("path", { d: "", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      const lab = txt(g, (xb + xp) / 2, 160, "Exposure window", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      const ticks = [0, 1, 2, 3, 4, 5].map((i) => el("path", { d: `M${60 + i * 136} ${AY - 9} V${AY + 9}`, stroke: MUTE, "stroke-width": 2, "stroke-linecap": "round" }, g));
      const axis = el("path", { d: "", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g);
      const mk = (x, label, col, y0, w) => {
        const m = el("g", {}, g), line = el("path", { d: `M${x} ${TOP - 6} V${y0}`, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 6", "stroke-linecap": "round" }, m);
        const pill = el("g", {}, m);
        el("rect", { x: -w / 2, y: 0, width: w, height: 34, rx: 17, fill: col, stroke: INK, "stroke-width": 2.5 }, pill);
        txt(pill, 0, 23, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
        return (k) => { line.setAttribute("opacity", oc(k)); pill.setAttribute("opacity", k > 0 ? 1 : 0); tf(pill, x, y0 - 22 * (1 - ob(k)), 0.6 + 0.4 * ob(k)); };
      };
      const pkg = (x, ver, time, col, ok) => {
        const p = el("g", {}, g);
        el("rect", { x: -32, y: -46, width: 64, height: 46, rx: 6, fill: col, stroke: INK, "stroke-width": 3 }, p);
        el("path", { d: "M-32 -34 H32", stroke: INK, "stroke-width": 2.5 }, p);
        el("rect", { x: -7, y: -46, width: 14, height: 12, fill: "#fff", stroke: INK, "stroke-width": 2 }, p);
        if (ok) el("path", { d: "M-10 -17 L-3 -10 L10 -24", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, p);
        txt(p, 0, -58, ver, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
        const tl = txt(g, x, AY + 34, time, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 500 });
        return (t, a) => {
          const f = seg(t, a, a + 0.45), b = Math.sin(seg(t, a + 0.45, a + 0.8) * Math.PI) * -10;
          tf(p, x, AY - 240 * (1 - f * f) + b); p.setAttribute("opacity", f > 0 ? 1 : 0);
          tl.setAttribute("opacity", oc(seg(t, a + 0.45, a + 0.9)));
        };
      };
      const A = pkg(xa, "1.106.2", "10:44", MINT, true), B = pkg(xb, "1.107.0", "11:40", YEL, false);
      const P = mk(xp, "PyPI 13:23", YEL, 458, 140), D = mk(xd, "Docker 14:32", LIL, 508, 160);
      return (t) => {
        const ax = io(seg(t, 0.3, 1.1));
        axis.setAttribute("d", ax > 0 ? `M60 ${AY} H${60 + 680 * ax}` : "");
        ticks.forEach((n, i) => n.setAttribute("opacity", ax * 680 >= i * 136 - 1 && ax > 0 ? 1 : 0));
        A(t, 1.3); B(t, 2.4);
        const y1 = io(seg(t, 3.2, 5.0)), l1 = io(seg(t, 5.7, 6.9));
        yb.setAttribute("width", (xp - xb) * y1); lb.setAttribute("width", (xd - xp) * l1);
        brk.setAttribute("d", y1 > 0 ? `M${xb} ${TOP - 6} V${TOP - 14} H${xb + (xp - xb) * y1} V${TOP - 6}` : "");
        lab.setAttribute("opacity", oc(seg(t, 3.6, 4.3)));
        P(seg(t, 5.0, 5.6)); D(seg(t, 6.9, 7.5));
        g.setAttribute("opacity", 1 - seg(t, 10.2, 10.9));
      };
    },
  };

  /* ---- 2. a magnet lifts keys out of six folders into a locked box ---- */
  const HOLDS = [["SSH", "SSH, GPG and TLS keys", SKY], ["Cloud", "AWS, Azure, Google Cloud, Kubernetes", BLUE], ["CI", "GitLab, Jenkins, Vault, Terraform", MINT], ["Agent tokens", "Claude Code, Codex, Cursor, Gemini CLI", YEL], ["Browser", "Saved passwords, history", LIL], ["Proxy keys", "Provider keys in the proxy database", SKY]];
  const key = (p) => {
    const k = el("g", {}, p);
    el("path", { d: "M-3 0 H20 M12 0 V7 M18 0 V6", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, k);
    el("circle", { cx: -12, cy: 0, r: 9, fill: YEL, stroke: INK, "stroke-width": 2.5 }, k);
    el("circle", { cx: -12, cy: 0, r: 3, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, k);
    return k;
  };
  SC.magnet = {
    dur: 12, still: 10,
    build(svg, api) {
      txt(svg, 756, 60, "Tap a folder", { "text-anchor": "end", "font-size": 18, "font-weight": 500, fill: MUTE });
      const BASE = 360, MY = 190, BX = 712, fx = (i) => 76 + i * 98;
      el("rect", { x: 24, y: BASE, width: 762, height: 14, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      let pinned = -1;
      const folders = HOLDS.map(([name, holds, col], i) => {
        const g = el("g", {}, svg), body = el("g", {}, g);
        el("path", { d: "M-44 0 V-80 H-14 L-6 -72 H44 V0 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
        el("rect", { x: -34, y: -86, width: 66, height: 44, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, body);
        el("path", { d: "M-46 -56 H46 L43 0 H-43 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
        txt(g, 0, 44, name, { "text-anchor": "middle", "font-size": 16, "font-weight": 600 });
        el("rect", { x: -47, y: -98, width: 94, height: 154, rx: 14, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6", class: "mg-ring" }, g);
        tf(g, fx(i), BASE);
        button(g, `${name}: ${holds}`, () => { pinned = i; api.poke(); });
        return body;
      });
      const defs = el("defs", {}, svg), cp = el("clipPath", { id: "mg-magnet-window" }, defs);
      el("rect", { x: BX - 57, y: BASE - 93, width: 114, height: 46, rx: 5 }, cp);
      el("rect", { x: BX - 70, y: BASE - 108, width: 140, height: 108, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3.5 }, svg);
      el("rect", { x: BX - 24, y: BASE - 114, width: 48, height: 10, rx: 5, fill: INK }, svg);
      el("rect", { x: BX - 58, y: BASE - 94, width: 116, height: 48, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      const pg = el("g", { "clip-path": "url(#mg-magnet-window)" }, svg);
      const spots = [[-34, -60, -12], [0, -60, 8], [34, -60, -4], [-34, -80, 10], [0, -80, -8], [34, -80, 6]];
      const pile = spots.map(() => key(pg));
      const shackle = el("path", { d: "M-7 0 V-5 A7 7 0 0 1 7 -5 V0", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, svg);
      el("rect", { x: BX - 12, y: BASE - 26, width: 24, height: 18, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      el("circle", { cx: BX, cy: BASE - 17, r: 2.5, fill: INK }, svg);
      txt(svg, BX, BASE + 44, "Sent out", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
      const fly = HOLDS.map(() => key(svg));
      const mag = el("g", {}, svg), field = el("g", {}, mag);
      el("path", { d: "M-22 54 Q0 64 22 54", stroke: BLUE, "stroke-width": 2.5, fill: "none", "stroke-dasharray": "3 6", "stroke-linecap": "round" }, field);
      el("path", { d: "M-34 66 Q0 82 34 66", stroke: BLUE, "stroke-width": 2.5, fill: "none", "stroke-dasharray": "3 6", "stroke-linecap": "round" }, field);
      el("path", { d: "M-30 30 V0 A30 30 0 0 1 30 0 V30", stroke: INK, "stroke-width": 26, fill: "none" }, mag);
      el("path", { d: "M-30 30 V0 A30 30 0 0 1 30 0 V30", stroke: BLUE, "stroke-width": 19, fill: "none" }, mag);
      el("rect", { x: -43, y: 28, width: 26, height: 16, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 3 }, mag);
      el("rect", { x: 17, y: 28, width: 26, height: 16, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 3 }, mag);
      const card = el("g", {}, svg);
      el("rect", { x: 40, y: BASE + 74, width: 720, height: 84, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, card);
      const ptr = el("g", {}, card);
      el("path", { d: "M-13 75 L0 60 L13 75", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, ptr);
      el("path", { d: "M-11 75.6 H11", stroke: "#fff", "stroke-width": 3.5 }, ptr);
      const dot = el("circle", { cx: 70, cy: BASE + 98, r: 8, stroke: INK, "stroke-width": 2 }, card);
      const nm = txt(card, 88, BASE + 104, "", { "font-size": 17, "font-weight": 700 });
      const hd = txt(card, 62, BASE + 138, "", { "font-size": 22, "font-weight": 500 });
      const mp = (t) => { const p = seg(t, 0.5, 7.0); return -70 + (BX + 70) * p * p * (3 - 2 * p); };
      const when = HOLDS.map((_, i) => { for (let t = 0; t < 7; t += 0.01) if (mp(t) >= fx(i)) return t; return 7; });
      return (t) => {
        const mx = mp(t), my = MY - 44 * io(seg(t, 8.6, 9.4)) - 240 * io(seg(t, 11.1, 11.8)), reset = seg(t, 11.2, 11.8);
        tf(mag, mx, my); field.setAttribute("opacity", t < 8.5 ? 0.6 + 0.4 * Math.sin(t * 9) : 0);
        let last = -1;
        fly.forEach((k, i) => {
          const lift = oc(seg(t, when[i] - 0.2, when[i] + 0.5)), drop = io(seg(t, 7.3 + i * 0.15, 7.75 + i * 0.15));
          if (t >= when[i] - 0.2) last = i;
          const ax = mx + (i - 2.5) * 9, ay = MY + 58 + (i % 2) * 8, sx = fx(i), sy = BASE - 98;
          let x = sx + (ax - sx) * lift, y = sy + (ay - sy) * lift;
          x += (BX - x) * drop; y += (BASE - 118 - y) * drop;
          tf(k, x, y, 1 - 0.5 * drop, (i % 2 ? 14 : -14) * lift);
          k.setAttribute("opacity", lift <= 0 || drop >= 1 ? 0 : cl(lift * 4) * (1 - seg(drop, 0.8, 1)));
        });
        pile.forEach((k, i) => {
          const f = oc(seg(t, 7.75 + i * 0.15, 8.05 + i * 0.15)), [dx, dy, r] = spots[i];
          tf(k, BX + dx, BASE + dy - 26 * (1 - f) + 3, 0.62, r); k.setAttribute("opacity", f > 0 ? 1 - reset : 0);
        });
        const lock = oc(seg(t, 8.6, 8.9)) * (1 - reset);
        shackle.setAttribute("transform", `translate(${BX} ${BASE - 26 - 5 * (1 - lock)})`);
        const show = pinned >= 0 ? pinned : t >= 11.2 ? -1 : t >= 8.6 ? 3 : last;
        card.setAttribute("opacity", show < 0 ? 0 : 1);
        folders.forEach((b, i) => b.setAttribute("transform", `translate(0 ${i === show ? -6 : 0})`));
        if (show >= 0) { tf(ptr, fx(show), BASE); dot.setAttribute("fill", HOLDS[show][2]); nm.textContent = HOLDS[show][0]; hd.textContent = HOLDS[show][1]; }
      };
    },
  };

  /* ---- 3. a magnifying glass walks the folder tree down to site-packages ---- */
  SC.lens = {
    dur: 12, still: 10,
    build(svg, api) {
      txt(svg, 756, 60, "Tap the glass", { "text-anchor": "end", "font-size": 18, "font-weight": 500, fill: MUTE });
      const R = [[0, 0, 0, 90], [1, 0, 0, 70], [2, 0, 0, 110], [3, 0, "site-packages"], [4, 1, 0, 80], [4, 1, "cook.pth"], [4, 1, "cook.py"], [4, 0, "litellm-1.107.0.dist-info"], [4, 1, "sitecustomize.py"], [4, 1, 0, 100]];
      const RY = (i) => 96 + i * 38, RX = (d) => 64 + d * 30, TY = 486;
      const lines = el("g", { stroke: MUTE, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, svg);
      for (let i = 1; i <= 3; i++) el("path", { d: `M${RX(i - 1)} ${RY(i - 1) + 12} V${RY(i)} H${RX(i) - 16}` }, lines);
      el("path", { d: `M${RX(3)} ${RY(3) + 12} V${RY(9)}` }, lines);
      for (let i = 4; i <= 9; i++) el("path", { d: `M${RX(3)} ${RY(i)} H${RX(4) - 14}` }, lines);
      const hl = el("g", {}, svg), lit = {};
      R.forEach(([d, file, label, w], i) => {
        const x = RX(d), y = RY(i), g = el("g", {}, svg);
        if (file) { el("path", { d: "M-9 -12 H4 L10 -6 V12 H-9 Z", fill: "#fff", stroke: INK, "stroke-width": 2.2, "stroke-linejoin": "round" }, g); el("path", { d: "M4 -12 V-6 H10", stroke: INK, "stroke-width": 2, fill: "none", "stroke-linejoin": "round" }, g); }
        else el("path", { d: "M-13 -9 H-4 L0 -5 H13 V10 H-13 Z", fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        tf(g, x, y);
        if (!label) { el("rect", { x: x + 34, y: y - 6, width: w, height: 12, rx: 6, fill: SOFT }, svg); return; }
        const n = txt(svg, x + 34, y + 6, label, { "font-family": MONO, "font-size": 18, "font-weight": 500 });
        if (i >= 5 && i <= 8) { const lw = n.getComputedTextLength() || label.length * 10.8; lit[i] = el("rect", { x: x - 20, y: y - 17, width: lw + 66, height: 34, rx: 10, fill: i === 7 ? LIL : YEL, "fill-opacity": i === 7 ? 0.6 : 1 }, hl); }
      });
      const tags = [], tag = (x, label) => {
        const g = el("g", {}, svg), shape = el("path", { fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("circle", { cx: -2, cy: 0, r: 3.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        const n = txt(g, 12, 6, label, { "font-family": MONO, "font-size": 18, "font-weight": 500 }), w = (n.getComputedTextLength() || label.length * 10.8) + 24;
        shape.setAttribute("d", `M0 -17 H${w} Q${w + 6} -17 ${w + 6} -11 V11 Q${w + 6} 17 ${w} 17 H0 L-14 0 Z`);
        tags.push({ g, x }); return x + w + 6;
      };
      const end = tag(RX(4) + 12, "/tmp marker"); tag(end + 36, "lock file");
      const cap = strip(svg, 532, 400), CAPS = ["1 Implant files", "2 litellm-1.107.0.dist-info", "3 /tmp marker and lock file"];
      const glass = el("g", {}, svg);
      el("path", { d: "M-17 17 L-38 38", stroke: INK, "stroke-width": 10, "stroke-linecap": "round" }, glass);
      el("path", { d: "M-19 19 L-36 36", stroke: BLUE, "stroke-width": 5, "stroke-linecap": "round" }, glass);
      el("circle", { r: 24, fill: SKY, "fill-opacity": 0.3, stroke: INK, "stroke-width": 5 }, glass);
      el("path", { d: "M-13 -7 A14 14 0 0 1 -5 -14", stroke: "#fff", "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, glass);
      el("circle", { r: 46, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6", class: "mg-ring" }, glass);
      const gp = (i) => [RX(R[i][0]), RY(i)], TAG = [RX(4) - 34, TY];
      const K = [[0, gp(0)], [1.0, gp(1)], [1.6, gp(2)], [2.2, gp(3)], [3.1, gp(5)], [3.8, gp(6)], [4.6, gp(8)], [6.0, gp(7)], [7.2, TAG], [11.9, gp(0)]];
      const where = (t) => { let p = K[0][1]; for (let j = 1; j < K.length; j++) { const [ta, q] = K[j], mv = j === K.length - 1 ? 0.6 : 0.5; if (t >= ta) { p = q; continue; } const k = io(seg(t, ta - mv, ta)); return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]; } return p; };
      const LIT = { 5: 3.1, 6: 3.8, 8: 4.6, 7: 6.0 }, TAGAT = [7.2, 7.45], TGT = [gp(5), gp(7), TAG];
      const auto = (t) => (t >= 11.3 ? 0 : t >= 6.7 ? 2 : t >= 5.4 ? 1 : 0);
      let pin = -1, from = gp(0), at = 0, cur = gp(0), lastT = 0;
      button(glass, "Magnifying glass: step through the three checks", () => { pin = ((pin >= 0 ? pin : auto(lastT)) + 1) % 3; from = cur; at = api.now(); api.poke(); });
      return (t, now) => {
        lastT = t;
        const fade = pin >= 0 ? 1 : 1 - seg(t, 11.2, 11.8);
        if (pin >= 0) { const k = io(cl((now - at) / 0.45)), q = TGT[pin]; cur = [from[0] + (q[0] - from[0]) * k, from[1] + (q[1] - from[1]) * k]; }
        else cur = where(t);
        tf(glass, cur[0], cur[1]);
        for (const i in lit) lit[i].setAttribute("opacity", pin >= 0 ? 1 : oc(seg(t, LIT[i] - 0.05, LIT[i] + 0.3)) * fade);
        tags.forEach((g, i) => { const k = pin >= 0 ? 1 : ob(seg(t, TAGAT[i], TAGAT[i] + 0.45)); g.g.setAttribute("opacity", cl(k * 3) * fade); tf(g.g, g.x, TY + 14 * (1 - cl(k)), 0.7 + 0.3 * k); });
        cap.textContent = CAPS[pin >= 0 ? pin : auto(t)];
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
