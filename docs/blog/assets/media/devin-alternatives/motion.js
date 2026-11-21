/* Bright coded scenes for "Devin alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const around = (n, cx, cy, s, r = 0) => n.setAttribute("transform", `translate(${cx} ${cy}) rotate(${r}) scale(${s}) translate(${-cx} ${-cy})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* a dashed focus ring (shown on focus and hover by motion.css) and a clear hit area */
  const ring = (p, a) => el("rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 7", class: "mg-ring" }, a), p);
  const pad = (p, a) => el("rect", Object.assign({ fill: "#fff", "fill-opacity": 0 }, a), p);
  /* shrink a line to a width if the font runs wide */
  const fit = (n, max) => { let w = 0; try { w = n.getComputedTextLength(); } catch (e) { w = 0; } if (w > max) { n.setAttribute("textLength", max); n.setAttribute("lengthAdjust", "spacingAndGlyphs"); } return n; };

  /* a claw on a cable, drawn from the top of its hub; grip 0 is open, 1 is closed */
  const claw = (p, fill) => {
    const g = el("g", {}, p);
    const arms = [-1, 1].map((s) => {
      const a = el("g", {}, g), d = `M${18 * s} 20 C${40 * s} 28 ${56 * s} 52 ${46 * s} 80 L${36 * s} 85`;
      el("path", { d, stroke: INK, "stroke-width": 13, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, a);
      el("path", { d, stroke: fill, "stroke-width": 7, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, a);
      return a;
    });
    el("rect", { x: -25, y: 0, width: 50, height: 26, rx: 9, fill, stroke: INK, "stroke-width": 3 }, g);
    el("circle", { cx: 0, cy: 13, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
    return {
      g,
      set: (x, y, grip, r = 0, s = 1) => { tf(g, x, y, s, r); const a = 22 * (1 - grip); arms[0].setAttribute("transform", `rotate(${a} -18 20)`); arms[1].setAttribute("transform", `rotate(${-a} 18 20)`); },
    };
  };

  const SC = {};

  /* ---- 1. a crane game takes a Task card and drops it into the PR chute ---- */
  SC.cranegame = {
    dur: 8.6, still: 8.6,
    build(svg, api) {
      const C0 = 1.6, END = C0 + 5.8, RX = 270, RYT = 176, CX = 546;
      const SLOT = [[182, 386, -4], [270, 386, 3], [358, 386, -2], [226, 336, 4], [314, 336, -3]];
      const ORDER = [3, 4, 0, 1, 2];
      let cur = 0, again = false, refill = false, lastT = 0;
      const root = el("g", {}, svg);
      pad(root, { x: 80, y: 30, width: 644, height: 556 });
      ring(root, { x: 74, y: 24, width: 662, height: 570, rx: 36 });
      const cab = el("g", {}, root);
      el("rect", { x: 102, y: 52, width: 620, height: 530, rx: 28, fill: LIL }, cab);
      el("rect", { x: 90, y: 40, width: 620, height: 530, rx: 28, fill: SKY, stroke: INK, "stroke-width": 3 }, cab);
      el("rect", { x: 176, y: 500, width: 64, height: 40, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, cab);
      el("path", { d: "M208 510 V530", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, cab);
      el("rect", { x: 470, y: 494, width: 152, height: 52, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, cab);
      el("path", { d: "M494 510 H598", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, cab);
      /* the light on top */
      const halo = el("circle", { cx: 400, cy: 96, r: 34, fill: SOFT }, cab);
      const rays = el("g", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, cab);
      [-160, -125, -90, -55, -20].forEach((a) => { const r = (a * Math.PI) / 180; el("path", { d: `M${400 + Math.cos(r) * 30} ${99 + Math.sin(r) * 30} L${400 + Math.cos(r) * 40} ${99 + Math.sin(r) * 40}` }, rays); });
      const bulb = el("path", { d: "M380 99 A20 20 0 0 1 420 99 Z", fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, cab);
      el("rect", { x: 374, y: 98, width: 52, height: 14, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, cab);
      /* the glass box, floor and rail */
      el("rect", { x: 118, y: 132, width: 564, height: 336, rx: 16, fill: "#fff" }, cab);
      el("path", { d: "M118 440 H682 V452 Q682 468 666 468 H134 Q118 468 118 452 Z", fill: SOFT }, cab);
      el("rect", { x: 140, y: 146, width: 520, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, cab);
      const cards = SLOT.map(() => { const g = el("g", {}, cab); el("rect", { x: -42, y: -26, width: 84, height: 52, rx: 9, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g); mono(g, 0, 6.5, "Task", 18); return g; });
      const chute = el("g", {}, cab);
      el("path", { d: "M430 312 H662 V440 H430 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, chute);
      el("path", { d: "M418 290 H674 L662 314 H430 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, chute);
      el("path", { d: "M530 334 L546 350 L562 334", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, chute);
      fit(mono(chute, 546, 394, "PR is ready to merge", 17), 214);
      const arm = el("g", {}, cab);
      const trolley = el("rect", { x: -22, y: 0, width: 44, height: 24, rx: 7, fill: LIL, stroke: INK, "stroke-width": 2.5 }, arm);
      const cable = el("path", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, arm);
      const cw = claw(arm, LIL);
      el("rect", { x: 118, y: 132, width: 564, height: 336, rx: 16, fill: "none", stroke: INK, "stroke-width": 3 }, cab);
      button(root, "Crane game: send the claw down for the next card", () => {
        if (!api.calm && lastT < END) return;
        again = true;
        if (cur >= ORDER.length - 1) { cur = 0; refill = true; } else { cur += 1; refill = false; }
        if (api.calm) api.redraw(); else api.seek(refill ? 0 : C0);
      });
      return (t) => {
        lastT = t;
        const E = again ? 99 : t, P = again && !refill ? 99 : t, u = t - C0;
        around(cab, 400, 305, lerp(0.94, 1, oc(seg(E, 0, 0.5)))); cab.setAttribute("opacity", seg(E, 0, 0.3));
        /* claw path: down to the card, grab, lift, across to the chute, let go, back home */
        const tgt = SLOT[ORDER[cur]], gy = tgt[1] - 34;
        let x = RX, y = RYT, g = 0.3, r = 0;
        if (u >= 0) {
          x = lerp(RX, tgt[0], io(seg(u, 0, 0.6)));
          y = lerp(RYT, gy, io(seg(u, 0.1, 1.1)));
          g = lerp(0.3, 0, oc(seg(u, 0, 0.4))) + oc(seg(u, 1.1, 1.4));
          y = lerp(y, RYT, io(seg(u, 1.45, 2.35)));
          x = lerp(x, CX, io(seg(u, 2.45, 3.55)));
          r = 5 * Math.sin(2 * Math.PI * seg(u, 2.45, 3.55)) + (u > 3.55 ? 3 * Math.sin((u - 3.55) * 14) * Math.max(0, 1 - (u - 3.55) / 0.6) : 0);
          g = g - oc(seg(u, 3.65, 3.9)) + 0.3 * oc(seg(u, 4.7, 5.4));
          x = lerp(x, RX, io(seg(u, 4.7, 5.8)));
        }
        if (!again) { const k = ob(seg(t, 0.6, 1.1)); y -= 10 * (1 - k); arm.setAttribute("opacity", seg(t, 0.6, 0.8)); } else arm.setAttribute("opacity", 1);
        tf(trolley, x, 140); cable.setAttribute("d", `M${x} 164 V${y + 2}`); cw.set(x, y, g, r);
        cards.forEach((n, s) => {
          const op = ORDER.indexOf(s), [cx, cy, tl] = SLOT[s], d = 0.35 + s * 0.09;
          if (op < cur) { n.setAttribute("opacity", 0); return; }
          if (op === cur && u >= 1.45) {
            if (u < 3.7) { const a = seg(u, 1.45, 2.35); n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) translate(0 60) rotate(${tl * (1 - a)})`); n.setAttribute("opacity", 1); }
            else { const f = seg(u, 3.7, 4.1); n.setAttribute("transform", `translate(${CX} ${RYT + 60 + 170 * f * f})`); n.setAttribute("opacity", f < 1 ? 1 : 0); }
            return;
          }
          n.setAttribute("transform", `translate(${cx} ${cy + 26 - 90 * (1 - oc(seg(P, d, d + 0.45)))}) rotate(${tl})`);
          n.setAttribute("opacity", seg(P, d, d + 0.1));
        });
        /* key beat: the chute bounces and the light blinks on */
        const cb = seg(u, 4.1, 4.5), ck = ob(seg(E, 0.25, 0.7));
        around(chute, 546, 440, lerp(0.8, 1, ck) * (1 + 0.05 * Math.sin(Math.PI * 2 * cb) * (1 - cb)));
        chute.setAttribute("opacity", seg(E, 0.25, 0.4));
        const on = (u >= 4.15 && u < 4.35) || u >= 4.55, hk = ob(seg(u, 4.55, 4.95));
        bulb.setAttribute("fill", on ? SOFT : SKY);
        halo.setAttribute("opacity", on ? 1 : 0); around(halo, 400, 99, lerp(0.7, 1, hk));
        rays.setAttribute("opacity", on ? 1 : 0); around(rays, 400, 99, lerp(0.8, 1, hk));
      };
    },
  };

  /* ---- 2. a price ladder the marker climbs one rung at a time ---- */
  SC.ladder = {
    dur: 8.6, still: 8.6,
    build(svg, api) {
      const RY = [508, 404, 300, 196], LAB = ["Free $0", "Pro $20", "Teams $80", "Max $200"], S = [1.7, 3.0, 4.3, 5.6], R0 = 0.9;
      let again = false, fromY = RY[0], fromN = 0, lastY = RY[0], lastN = 0;
      const root = el("g", { transform: "translate(48 0)" }, svg);
      pad(root, { x: 128, y: 30, width: 444, height: 552 });
      ring(root, { x: 122, y: 24, width: 456, height: 560, rx: 24 });
      const rails = el("g", {}, root);
      [262, 510].forEach((x) => el("rect", { x: x + 8, y: 138, width: 28, height: 432, rx: 14, fill: SOFT }, rails));
      [262, 510].forEach((x) => el("rect", { x, y: 130, width: 28, height: 432, rx: 14, fill: SKY, stroke: INK, "stroke-width": 3 }, rails));
      const rungs = RY.map((y, i) => {
        const g = el("g", {}, root);
        const sh = el("rect", { x: 254, y: y - 21, width: 308, height: 58, rx: 14, fill: LIL }, g);
        el("rect", { x: 246, y: y - 29, width: 308, height: 58, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
        mono(g, 400, y + 9, LAB[i], 26);
        return { g, sh };
      });
      const tag = el("g", {}, root);
      el("path", { d: "M322 64 H502 Q510 64 510 72 V104 Q510 112 502 112 H322 L298 88 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 318, cy: 88, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      fit(mono(tag, 412, 97, "Enterprise", 24), 170);
      const str = el("path", { d: "M276 132 Q282 100 318 88", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, root);
      const mk = el("g", {}, root);
      const MK = "M-84 -24 H-28 L0 0 L-28 24 H-84 Q-94 24 -94 14 V-14 Q-94 -24 -84 -24 Z";
      el("path", { d: MK, fill: SOFT, transform: "translate(6 6)" }, mk);
      el("path", { d: MK, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, mk);
      el("circle", { cx: -62, cy: 0, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, mk);
      button(root, "Ladder: send the marker back down to climb again", () => { fromY = lastY; fromN = lastN; again = true; api.seek(R0); });
      return (t) => {
        const E = again ? 99 : t;
        const rk = Math.max(0.001, oc(seg(E, 0, 0.6)));
        rails.setAttribute("transform", `translate(0 562) scale(1 ${rk}) translate(0 -562)`);
        let n = 0;
        rungs.forEach((r, i) => {
          const d = 0.35 + i * 0.1, k = ob(seg(E, d, d + 0.45));
          const pop = api.calm ? 0 : 0.07 * Math.sin(Math.PI * seg(t, S[i], S[i] + 0.32));
          around(r.g, 400, RY[i], lerp(0.6, 1, k) + pop); r.g.setAttribute("opacity", seg(E, d, d + 0.1));
          let v = oc(seg(t, S[i], S[i] + 0.25));
          if (again && t < S[i] && i < fromN) v = 1 - seg(t, R0, R0 + 0.4);
          r.sh.setAttribute("opacity", v); if (v > 0.5) n++;
        });
        const tk = ob(seg(E, 0.85, 1.45)), sw = seg(E, 0.85, 1.7), wig = seg(t, 6.0, 7.0);
        const ang = -3 + (api.calm ? 0 : 7 * Math.sin(wig * Math.PI * 4) * (1 - wig) - 8 * Math.sin(sw * Math.PI * 3) * (1 - sw));
        tag.setAttribute("transform", `translate(0 ${-36 * (1 - tk)}) rotate(${ang} 318 88)`);
        tag.setAttribute("opacity", seg(E, 0.85, 1.0)); str.setAttribute("opacity", seg(E, 1.2, 1.45));
        let y = RY[0], dx = 0, mo = 1;
        if (t < S[0]) {
          if (again) y = api.calm ? RY[0] : lerp(fromY, RY[0], io(seg(t, R0, S[0] - 0.1)));
          else { dx = -60 * (1 - ob(seg(t, 1.2, 1.7))); mo = seg(t, 1.2, 1.35); }
        } else {
          for (let i = 1; i < 4; i++) {
            const p = seg(t, S[i] - 0.55, S[i]);
            if (p > 0) { y = api.calm ? (p < 1 ? RY[i - 1] : RY[i]) : lerp(RY[i - 1], RY[i], ob(p)); dx = api.calm ? 0 : -14 * Math.sin(Math.PI * p); }
          }
        }
        tf(mk, 236 + dx, y); mk.setAttribute("opacity", mo);
        lastY = y; lastN = n;
      };
    },
  };

  /* ---- 3. six bumper cars, each bumps forward to show who it suits ---- */
  SC.bumpercars = {
    dur: 8.6, still: 8.6,
    build(svg, api) {
      const NAME = ["OpenHands", "Munder Difflin", "Codex", "Copilot", "Jules", "OpenComputer"];
      const SUIT = ["Open source", "Team of agents", "ChatGPT", "GitHub", "Gemini", "Slack"];
      const FILL = [SKY, YEL, SKY, SKY, SKY, LIL];
      const POS = [[175, 280], [400, 280], [625, 280], [175, 502], [400, 502], [625, 502]];
      const B = (i) => 2.1 + i * 0.72;
      const ev = NAME.map(() => null);
      let lastT = 0;
      /* u is seconds since the bump began; below 0 the car waits at the start */
      const bump = (u) => ({ x: u <= 0 ? -14 : -14 + 28 * ob(seg(u, 0, 0.42)), rot: -2.5 * Math.sin(Math.PI * seg(u, 0.04, 0.4)), ln: u > 0 && u < 0.55 ? 1 - seg(u, 0.15, 0.55) : 0, pole: oc(seg(u, 0.12, 0.36)), sign: ob(seg(u, 0.22, 0.56)), so: seg(u, 0.22, 0.32), txt: oc(seg(u, 0.4, 0.62)), wig: 0 });
      const state = (i, t, now) => {
        const e = ev[i];
        if (!e) return bump(t - B(i));
        const d = api.calm ? 99 : now - e.at;
        if (e.k === "bump") return bump(d);
        if (e.k === "jolt") { const s = bump(99); s.x += 12 * Math.sin(Math.PI * seg(d, 0, 0.32)); s.rot = -2 * Math.sin(Math.PI * seg(d, 0, 0.3)); s.ln = d < 0.5 ? 1 - seg(d, 0.1, 0.5) : 0; s.wig = 6 * Math.sin(d * 20) * (1 - seg(d, 0, 0.7)); return s; }
        const f = e.f, w = i * 0.06, k = io(seg(d, w, w + 0.6)), q = oc(seg(d, w, w + 0.3));
        return { x: lerp(f.x, -14, k), rot: 1.5 * Math.sin(Math.PI * k), ln: 0, pole: f.pole * (1 - k), sign: f.sign * (1 - q), so: f.so * (1 - q), txt: f.txt * (1 - seg(d, w, w + 0.15)), wig: 0 };
      };
      const rink = el("g", {}, svg);
      ring(rink, { x: 14, y: 34, width: 776, height: 554, rx: 58 });
      el("rect", { x: 38, y: 58, width: 744, height: 516, rx: 48, fill: LIL }, rink);
      el("rect", { x: 28, y: 48, width: 744, height: 516, rx: 48, fill: BLUE, stroke: INK, "stroke-width": 3 }, rink);
      el("rect", { x: 44, y: 64, width: 712, height: 484, rx: 34, fill: SOFT, stroke: INK, "stroke-width": 3 }, rink);
      [140, 270, 400, 530, 660].forEach((x) => [56, 556].forEach((y) => el("circle", { cx: x, cy: y, r: 3.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, rink)));
      button(rink, "Rink: send every car back to the start", () => {
        const now = api.now();
        NAME.forEach((_, i) => { ev[i] = { k: "back", at: now, f: state(i, lastT, now) }; });
        api.hold(1.5);
      });
      const cars = NAME.map((nm, i) => {
        const [cx, by] = POS[i], g = el("g", {}, svg);
        pad(g, { x: cx - 108, y: by - 176, width: 216, height: 188 });
        ring(g, { x: cx - 108, y: by - 176, width: 216, height: 188, rx: 18 });
        const mv = el("g", {}, g);
        const lines = el("g", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, mv);
        [-64, -46, -28].forEach((y, j) => el("path", { d: `M${-110 + j * 4} ${y} H-96` }, lines));
        const pole = el("path", { stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, mv);
        const sign = el("g", {}, mv);
        el("rect", { x: -88, y: -42, width: 176, height: 42, rx: 10, fill: MINT, stroke: INK, "stroke-width": 3 }, sign);
        const st = fit(mono(sign, 0, -15, SUIT[i], 16), 160);
        el("rect", { x: -82, y: -20, width: 176, height: 26, rx: 13, fill: LIL }, mv);
        el("path", { d: "M-82 -24 V-78 Q-82 -88 -72 -88 H-22 Q-12 -88 -10 -78 L-6 -62 H58 Q80 -62 82 -42 V-24 Z", fill: FILL[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, mv);
        el("rect", { x: -88, y: -26, width: 176, height: 26, rx: 13, fill: "#fff", stroke: INK, "stroke-width": 3 }, mv);
        el("path", { d: "M16 -62 L24 -76", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, mv);
        el("ellipse", { cx: 26, cy: -78, rx: 12, ry: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, mv);
        fit(mono(mv, 0, -36, nm, 16), 150);
        button(g, `${nm}: bump it forward to show who it suits`, () => {
          const now = api.now(), s = state(i, lastT, now);
          ev[i] = { k: s.sign > 0.5 ? "jolt" : "bump", at: now };
          api.hold(1.3);
        });
        return { mv, lines, pole, sign, st, cx, by };
      });
      return (t, now) => {
        lastT = t;
        around(rink, 400, 306, lerp(0.96, 1, oc(seg(t, 0, 0.5)))); rink.setAttribute("opacity", seg(t, 0, 0.3));
        cars.forEach((c, i) => {
          const s = state(i, t, now), d0 = 0.4 + i * 0.09, k = ob(seg(t, d0, d0 + 0.6));
          tf(c.mv, c.cx + s.x - 70 * (1 - k), c.by, 1, s.rot);
          c.mv.setAttribute("opacity", seg(t, d0, d0 + 0.15));
          c.lines.setAttribute("opacity", s.ln);
          c.pole.setAttribute("d", `M-58 -86 V${-86 - lerp(12, 34, s.pole)}`);
          c.sign.setAttribute("transform", `translate(0 -120) rotate(${s.wig}) scale(${Math.max(0.001, lerp(0.3, 1, s.sign))})`);
          c.sign.setAttribute("opacity", s.so); c.st.setAttribute("opacity", s.txt);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const NAME = ["OpenHands", "Munder Difflin", "Codex", "Copilot", "Jules", "OpenComputer"], FILL = [SKY, YEL, SKY, SKY, SKY, LIL];
      const ul = el("path", { stroke: YEL, "stroke-width": 12, "stroke-linecap": "round", fill: "none" }, svg);
      const pill = el("g", {}, svg);
      el("rect", { x: 64, y: 102, width: 162, height: 40, rx: 20, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pill);
      fit(mono(pill, 145, 128, "Comparisons", 18), 140);
      const t1 = txt(svg, 64, 224, "Devin", { "font-size": 72, "font-weight": 700 });
      const t2 = fit(txt(svg, 64, 300, "alternatives", { "font-size": 72, "font-weight": 700 }), 490);
      const l1 = txt(svg, 64, 384, "6 agents that take a task", { "font-size": 28, "font-weight": 500 });
      const l2 = txt(svg, 64, 424, "Checked 21 Nov 2026", { "font-size": 22, "font-weight": 500, fill: MUTE });
      const rz = el("g", {}, svg);
      el("rect", { x: 568, y: 62, width: 212, height: 14, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, rz);
      el("rect", { x: 552, y: 474, width: 228, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, rz);
      el("rect", { x: 678, y: 420, width: 84, height: 12, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2 }, rz);
      const card = el("g", {}, svg);
      el("rect", { x: -38, y: -25, width: 76, height: 50, rx: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, card);
      el("path", { d: "M-22 -7 H22 M-22 8 H10", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, card);
      const tray = el("rect", { x: 672, y: 428, width: 96, height: 46, rx: 10, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      const arm = el("g", {}, svg);
      const trol = el("rect", { x: -20, y: 0, width: 40, height: 22, rx: 6, fill: SKY, stroke: INK, "stroke-width": 2.5 }, arm);
      const cable = el("path", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, arm);
      const cw = claw(arm, SKY);
      const stack = NAME.map((nm, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -68, y: -15, width: 146, height: 40, rx: 9, fill: LIL }, g);
        el("rect", { x: -73, y: -20, width: 146, height: 40, rx: 9, fill: FILL[i], stroke: INK, "stroke-width": 2.5 }, g);
        fit(mono(g, 0, 5.5, nm, 15), 130);
        return g;
      });
      return (t) => {
        const up = (n, d) => { n.setAttribute("transform", `translate(0 ${18 * (1 - oc(seg(t, d, d + 0.5)))})`); n.setAttribute("opacity", seg(t, d, d + 0.3)); };
        around(pill, 145, 122, lerp(0.6, 1, ob(seg(t, 0, 0.45)))); pill.setAttribute("opacity", seg(t, 0, 0.2));
        up(t1, 0.1); up(t2, 0.2); up(l1, 0.45); up(l2, 0.55);
        ul.setAttribute("d", `M68 326 H${68 + 240 * oc(seg(t, 0.35, 0.85))}`); ul.setAttribute("opacity", seg(t, 0.35, 0.4));
        rz.setAttribute("opacity", seg(t, 0.15, 0.5)); arm.setAttribute("opacity", seg(t, 0.15, 0.5));
        around(tray, 720, 474, lerp(0.7, 1, ob(seg(t, 0.4, 0.8))) * (1 + 0.04 * Math.sin(Math.PI * seg(t, 3.72, 3.95)))); tray.setAttribute("opacity", seg(t, 0.4, 0.5));
        const X0 = 598, X1 = 720, YR = 104, YG = 390, YL = 160, YE = 196, HC = 59;
        let y = lerp(YR, YG, io(seg(t, 0.7, 1.6)));
        let g = lerp(0.3, 0, oc(seg(t, 0.7, 1.0))) + oc(seg(t, 1.6, 1.85));
        y = lerp(y, YL, io(seg(t, 1.9, 2.6)));
        const x = lerp(X0, X1, io(seg(t, 2.65, 3.25)));
        g = g - oc(seg(t, 3.3, 3.5)) + 0.6 * oc(seg(t, 3.7, 4.2));
        y = lerp(y, YE, io(seg(t, 3.6, 4.1)));
        const r = 4 * Math.sin(2 * Math.PI * seg(t, 2.65, 3.25));
        tf(trol, x, 58); cable.setAttribute("d", `M${x} 80 V${y + 2}`); cw.set(x, y, g, r, 1);
        if (t < 1.85) { tf(card, X0, 449, lerp(0.6, 1, ob(seg(t, 0.3, 0.7)))); card.setAttribute("opacity", seg(t, 0.3, 0.4)); }
        else if (t < 3.38) card.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) translate(0 ${HC})`);
        else { const f = seg(t, 3.38, 3.72); tf(card, X1, YL + HC + (435 - YL - HC) * f * f - 5 * Math.sin(Math.PI * seg(t, 3.72, 3.95))); }
        stack.forEach((n, i) => { const d = 3.75 + i * 0.11; tf(n, 866, 204 + i * 50 - 26 * (1 - ob(seg(t, d, d + 0.45)))); n.setAttribute("opacity", seg(t, d, d + 0.15)); });
      };
    },
  };

  /* ---- player ----
     The timeline plays once, from the first time the scene is in view; it pauses out of view and holds on its last frame. */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm, run = false, at = 0, busy = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    const pos = () => (held ? sc.still : run ? cl(clock() + off, 0, sc.dur) : at);
    let draw = () => {};
    const frame = () => draw(pos(), clock());
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && ((run && !held && clock() + off < sc.dur) || clock() < busy)) raf = requestAnimationFrame(tick); };
    /* seek(s) plays from s; hold(s) redraws for s seconds so a tap animates on a held frame; redraw() paints once */
    const api = { calm, now: clock, seek: (s) => { held = false; run = true; off = s - clock(); tick(); }, hold: (s) => { busy = Math.max(busy, clock() + s); tick(); }, redraw: () => frame() };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) {
        if (!held && !run) { run = true; off = at - clock(); }
        tick();
        if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); }
      } else { if (run) { at = pos(); run = false; } cancelAnimationFrame(raf); }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
