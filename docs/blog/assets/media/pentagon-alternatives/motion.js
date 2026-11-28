/* Bright coded scenes for "Pentagon alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", GREY = "#D9D0E4";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  const SC = {};

  /* ---- 1. a blue floor plan: rooms with name tags, a Team group, envelopes between rooms ---- */
  SC.floorplan = {
    dur: 9, still: 9,
    build(svg, api) {
      const S = 160, X0 = 80, Y0 = 92, HOP = 1.5;
      const tagAt = (r, c) => [X0 + S * c + S / 2 - 18, Y0 + S * r + S / 2 - 16];
      const mailAt = (r, c) => [X0 + S * c + S / 2 + 54, Y0 + S * r + S / 2 + 52];
      const nameTag = (p, col) => {
        const g = el("g", {}, p);
        el("rect", { x: -42, y: -25, width: 84, height: 50, rx: 9, fill: "#fff" }, g);
        el("path", { d: "M-42 -9 V-16 Q-42 -25 -33 -25 H33 Q42 -25 42 -16 V-9 Z", fill: col }, g);
        el("path", { d: "M-42 -9 H42", stroke: INK, "stroke-width": 2 }, g);
        el("rect", { x: -9, y: -21, width: 18, height: 5, rx: 2.5, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, g);
        el("rect", { x: -30, y: 1, width: 54, height: 7, rx: 3.5, fill: GREY }, g);
        el("rect", { x: -30, y: 13, width: 34, height: 5, rx: 2.5, fill: GREY }, g);
        el("rect", { x: -42, y: -25, width: 84, height: 50, rx: 9, fill: "none", stroke: INK, "stroke-width": 2.5 }, g);
        return g;
      };
      for (let c = 1; c < 4; c++) el("path", { d: `M${X0 + S * c} ${Y0} V${Y0 + 3 * S}`, stroke: BLUE, "stroke-width": 5 }, svg);
      for (let r = 1; r < 3; r++) el("path", { d: `M${X0} ${Y0 + S * r} H${X0 + 4 * S}`, stroke: BLUE, "stroke-width": 5 }, svg);
      el("rect", { x: X0, y: Y0, width: 4 * S, height: 3 * S, rx: 6, fill: "none", stroke: BLUE, "stroke-width": 7 }, svg);
      const team = el("rect", { x: X0 - 10, y: Y0 - 10, width: 2 * S + 20, height: S + 20, rx: 16, fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-dasharray": "0.5 9", "stroke-linecap": "round" }, svg);
      el("rect", { x: X0 - 10, y: Y0 - 48, width: 82, height: 32, rx: 16, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, X0 + 31, Y0 - 25.5, "Team", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      const FILLED = { "0,0": YEL, "0,1": LIL, "0,3": SKY, "1,1": MINT, "1,3": BLUE, "2,3": YEL, "2,0": LIL };
      const NEW = [MINT, SKY, YEL, LIL, BLUE];
      let added = 0;
      const rooms = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const [tx, ty] = tagAt(r, c), col = FILLED[r + "," + c];
        if (col) { tf(nameTag(svg, col), tx, ty); continue; }
        const g = el("g", {}, svg);
        el("rect", { x: X0 + S * c + 6, y: Y0 + S * r + 6, width: S - 12, height: S - 12, fill: "#fff", "fill-opacity": 0 }, g);
        el("rect", { x: X0 + S * c + 10, y: Y0 + S * r + 10, width: S - 20, height: S - 20, rx: 12, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", class: "mg-ring" }, g);
        const hint = el("g", {}, g);
        el("rect", { x: tx - 42, y: ty - 25, width: 84, height: 50, rx: 9, fill: "none", stroke: GREY, "stroke-width": 2.5, "stroke-dasharray": "6 6" }, hint);
        el("path", { d: `M${tx - 8} ${ty} H${tx + 8} M${tx} ${ty - 8} V${ty + 8}`, stroke: MUTE, "stroke-width": 2.5, "stroke-linecap": "round" }, hint);
        const room = { g, hint, tag: null, at: -99, tx, ty };
        button(g, "Empty room: drop in another name tag", () => {
          if (!room.tag) { room.tag = nameTag(g, NEW[added++ % NEW.length]); g.setAttribute("aria-label", "Room with a new name tag: drop it in again"); }
          room.at = api.now(); api.poke();
        });
        rooms.push(room);
      }
      const box = { x: -50, y: -33, width: 100, height: 66, rx: 14, fill: "none" };
      const pulse = el("rect", Object.assign({ stroke: MINT, "stroke-width": 4 }, box), svg);
      const ring = el("g", {}, svg);
      el("rect", Object.assign({ stroke: INK, "stroke-width": 10 }, box), ring);
      el("rect", Object.assign({ stroke: MINT, "stroke-width": 6 }, box), ring);
      const env = () => {
        const g = el("g", {}, svg);
        el("rect", { x: -14, y: -10, width: 28, height: 20, rx: 3, fill: GREY, stroke: INK, "stroke-width": 2 }, g);
        el("path", { d: "M-14 -9 L0 2 L14 -9", fill: "none", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
        return g;
      };
      const CYC = [[0, 0], [0, 1], [1, 1], [1, 3], [2, 3], [2, 0]], G = [0, 3], D = [1, 3];
      const e1 = env(), e2 = env();
      const hop = (a, b, t0, t) => {
        const [ax, ay] = mailAt(a[0], a[1]), [bx, by] = mailAt(b[0], b[1]);
        const g = io(seg(t, t0 + 0.15, t0 + 1.15)), land = seg(t, t0 + 1.15, t0 + 1.45);
        return [lerp(ax, bx, g), lerp(ay, by, g) - 7 * Math.sin(Math.PI * land), 1 + 0.18 * Math.sin(Math.PI * g)];
      };
      return (t, now) => {
        team.setAttribute("stroke-dashoffset", (-t / 9) * 9.5 * 6);
        const h = Math.min(5, Math.floor(t / HOP)), arr = h * HOP + 1.15;
        const [x1, y1, s1] = hop(CYC[h], CYC[(h + 1) % 6], h * HOP, t); tf(e1, x1, y1, s1);
        const [x2, y2, s2] = t < 2.6 ? hop(G, D, 0.6, t) : hop(D, G, 2.6, t); tf(e2, x2, y2, s2);
        const on = t >= arr ? CYC[(h + 1) % 6] : CYC[h], since = t >= arr ? t - arr : t - arr + HOP;
        const [rx, ry] = tagAt(on[0], on[1]);
        tf(ring, rx, ry, 0.82 + 0.18 * ob(seg(since, 0, 0.4)));
        const p = (t % HOP) / HOP;
        tf(pulse, rx, ry, 1 + 0.12 * oc(p)); pulse.setAttribute("opacity", 1 - p);
        rooms.forEach((rm) => {
          rm.hint.setAttribute("opacity", rm.tag ? 0 : 1);
          if (!rm.tag) return;
          const k = cl((now - rm.at) / 0.6);
          tf(rm.tag, rm.tx, rm.ty - 70 * (1 - ob(k))); rm.tag.setAttribute("opacity", cl(k * 4));
        });
      };
    },
  };

  /* ---- 2. desks in a row, each with a mail slot and a memory card ---- */
  SC.mailslot = {
    dur: 9.6, still: 9.6,
    build(svg, api) {
      const DX = [140, 400, 660], HOP = 3.2, REST = 192, UP = 136, IN = 244;
      const bx = (i) => DX[i] - 48;
      const floor = el("g", {}, svg);
      el("rect", { x: 24, y: 380, width: 752, height: 190, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 2 }, floor);
      el("rect", { x: 16, y: 372, width: 768, height: 206, rx: 34, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", class: "mg-ring" }, floor);
      const desks = el("g", { "pointer-events": "none" }, svg);
      DX.forEach((x) => {
        el("rect", { x: x - 100, y: 308, width: 12, height: 132, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, desks);
        el("rect", { x: x + 88, y: 308, width: 12, height: 132, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, desks);
        el("rect", { x: x - 112, y: 292, width: 224, height: 20, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 3 }, desks);
      });
      const envs = el("g", { "pointer-events": "none" }, svg);
      const mk = () => {
        const g = el("g", {}, envs);
        el("rect", { x: -27, y: -18, width: 54, height: 36, rx: 5, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-25 -16 L0 3 L25 -16", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
        return g;
      };
      const pool = Array.from({ length: 4 }, () => ({ g: mk(), from: 0, at: -99 }));
      const main = mk();
      const front = el("g", { "pointer-events": "none" }, svg);
      const boxes = DX.map((x) => {
        const g = el("g", {}, front);
        el("rect", { x: x - 100, y: 208, width: 104, height: 84, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: x - 82, y: 203, width: 68, height: 10, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, x - 48, 258, "Mailbox", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
        el("rect", { x: x + 14, y: 238, width: 90, height: 54, rx: 8, fill: LIL, stroke: INK, "stroke-width": 2.5 }, front);
        txt(front, x + 59, 271, "Memory", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
        return { g, x: x - 48 };
      });
      const glide = (a, b, g) => [lerp(bx(a), bx(b), g), UP - (b > a ? 70 : 100) * Math.sin(Math.PI * g), (b > a ? 7 : -7) * Math.sin(Math.PI * g)];
      const path = (a, b, u) => {
        if (u < 0.9) return [bx(a), lerp(REST, UP, oc(seg(u, 0.5, 0.9))), 0];
        if (u < 2.1) return glide(a, b, io(seg(u, 0.9, 2.1)));
        return [bx(b), lerp(UP, REST, ob(seg(u, 2.1, 2.6))), 0];
      };
      const sent = (a, b, e) => {
        if (e < 0.4) return [bx(a), lerp(IN, UP, oc(seg(e, 0, 0.4))), 0];
        if (e < 1.4) return glide(a, b, io(seg(e, 0.4, 1.4)));
        return [bx(b), lerp(UP, IN, io(seg(e, 1.4, 1.9))), 0];
      };
      let lastT = 0;
      button(floor, "Send another envelope on to the next desk", () => {
        const h = Math.min(2, Math.floor(lastT / HOP)), u = lastT - h * HOP, now = api.now();
        const p = pool.find((q) => now - q.at > 2.1) || pool.reduce((m, q) => (q.at < m.at ? q : m));
        p.from = u >= 2.1 ? (h + 1) % 3 : h; p.at = now; api.poke();
      });
      return (t, now) => {
        lastT = t;
        const h = Math.min(2, Math.floor(t / HOP)), u = t - h * HOP, b = (h + 1) % 3, bump = [0, 0, 0];
        const [x, y, r] = path(h, b, u); tf(main, x, y, 1, r);
        bump[b] = Math.sin(Math.PI * seg(u, 2.25, 2.7));
        pool.forEach((p) => {
          const e = now - p.at;
          if (e < 0 || e > 2.1) { p.g.setAttribute("opacity", 0); return; }
          const to = (p.from + 1) % 3, [px, py, pr] = sent(p.from, to, e);
          tf(p.g, px, py, 1, pr); p.g.setAttribute("opacity", 1);
          bump[to] = Math.max(bump[to], Math.sin(Math.PI * seg(e, 1.75, 2.1)));
        });
        boxes.forEach((o, i) => o.g.setAttribute("transform", `translate(${o.x} 292) scale(${1 + 0.04 * bump[i]} ${1 - 0.07 * bump[i]}) translate(${-o.x} -292)`));
      };
    },
  };

  /* ---- 3. a desk bell: each ring flips the card to the next answer ---- */
  SC.deskbell = {
    dur: 12, still: 12,
    build(svg, api) {
      const R = [1, 2.5, 4, 5.5, 7, 8.5, 10], F = 0.4;
      const ANS = [["Which one"], ["Group chat", "Rowboat"], ["Team of agents", "Munder Difflin"], ["Agents talk", "Agent Relay"], ["Perplexity Max", "Teammates"], ["Claude plan", "Cowork"], ["Mac canvas", "Pentagon"]];
      el("rect", { x: 86, y: 450, width: 628, height: 116, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      [296, 504].forEach((x) => el("path", { d: `M${x} 460 V556`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg));
      el("rect", { x: 66, y: 430, width: 668, height: 22, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const card = el("g", {}, svg);
      el("rect", { x: 162, y: 78, width: 500, height: 192, rx: 22, fill: YEL }, card);
      el("rect", { x: 150, y: 66, width: 500, height: 192, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      const one = txt(card, 400, 184, "", { "text-anchor": "middle", "font-size": 64, "font-weight": 700 });
      const top = txt(card, 400, 134, "", { "text-anchor": "middle", "font-size": 28, "font-weight": 500, fill: MUTE });
      const big = txt(card, 400, 210, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 48, "font-weight": 700 });
      const bell = el("g", {}, svg);
      el("rect", { x: 284, y: 280, width: 232, height: 166, fill: "#fff", "fill-opacity": 0 }, bell);
      el("rect", { x: 280, y: 276, width: 240, height: 174, rx: 20, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", class: "mg-ring" }, bell);
      const waves = [-1, 1].flatMap((s) => [0, 1, 2].map((j) => {
        const r = 112 + j * 20, a = (22 * Math.PI) / 180, x = 400 + s * r * Math.cos(a);
        return el("path", { d: `M${x} ${356 - r * Math.sin(a)} A${r} ${r} 0 0 ${s > 0 ? 1 : 0} ${x} ${356 + r * Math.sin(a)}`, fill: "none", stroke: [BLUE, LIL, SKY][j], "stroke-width": 5, "stroke-linecap": "round", opacity: 0 }, bell);
      }));
      const plunger = el("g", {}, bell);
      el("rect", { x: 395, y: 296, width: 10, height: 26, fill: GREY, stroke: INK, "stroke-width": 2.5 }, plunger);
      el("ellipse", { cx: 400, cy: 296, rx: 18, ry: 7, fill: GREY, stroke: INK, "stroke-width": 2.5 }, plunger);
      const dome = el("g", {}, bell);
      el("path", { d: "M320 418 C320 352 354 318 400 318 C446 318 480 352 480 418 Z", fill: GREY, stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round" }, dome);
      el("path", { d: "M346 396 C346 368 360 348 382 340", fill: "none", stroke: "#fff", "stroke-width": 7, "stroke-linecap": "round" }, dome);
      el("rect", { x: 308, y: 412, width: 184, height: 22, rx: 11, fill: GREY, stroke: INK, "stroke-width": 3 }, bell);
      let lastT = 0;
      button(bell, "Ring the bell to flip the card", () => { const k = R.findIndex((r) => r > lastT + 0.05); api.seek(k < 0 ? R[0] - 0.2 : R[k] - 0.2); });
      return (t) => {
        lastT = t;
        let n = 0, s = 1, press = 0, w = -1;
        R.forEach((r) => {
          if (t >= r + F / 2) n++;
          if (t >= r && t < r + F) s = Math.max(0.04, Math.abs(Math.cos(Math.PI * seg(t, r, r + F))));
          press = Math.max(press, Math.sin(Math.PI * seg(t, r - 0.2, r + 0.15)));
          if (t >= r && t < r + 0.7) w = seg(t, r, r + 0.7);
        });
        const a = ANS[n % 7];
        one.textContent = a.length === 1 ? a[0] : ""; top.textContent = a.length > 1 ? a[0] : ""; big.textContent = a.length > 1 ? a[1] : "";
        card.setAttribute("transform", `translate(0 162) scale(1 ${s}) translate(0 -162)`);
        plunger.setAttribute("transform", `translate(0 ${8 * press})`);
        dome.setAttribute("transform", `rotate(${w < 0 ? 0 : 4 * Math.sin(w * Math.PI * 8) * (1 - w)} 400 418)`);
        waves.forEach((p, i) => {
          const j = i % 3;
          p.setAttribute("opacity", w < 0 ? 0 : cl(w * 8 - j * 1.2) * (1 - w));
          p.setAttribute("transform", `translate(400 356) scale(${0.92 + 0.14 * cl(w)}) translate(-400 -356)`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 4,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 160, height: 38, rx: 19, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 144, 69.5, "Alternatives", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 896, 70, "Checked 13 Nov 2026", { "text-anchor": "end", "font-size": 19, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 170, "Pentagon alternatives", { "font-size": 66, "font-weight": 700 });
      el("path", { d: "M66 200 H372", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 250, "5 tools like Pentagon for AI teammates", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const NAMES = ["Rowboat", "Munder Difflin", "Agent Relay", "Perplexity Teammates", "Claude Cowork"], COL = [YEL, BLUE, LIL, SKY, MINT];
      const W = NAMES.map((s) => s.length * 9.6 + 28), GAP = 14;
      let x = (960 - W.reduce((a, b) => a + b) - GAP * 4) / 2;
      const tiles = NAMES.map((s, i) => {
        const w = W[i], mid = x + w / 2; x += w + GAP;
        const line = el("path", { d: `M480 346 V378 H${mid} V412`, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
        const g = el("g", {}, svg);
        el("rect", { x: mid - w / 2, y: 412, width: w, height: 48, rx: 12, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, mid, 442, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        return { line, g };
      });
      el("rect", { x: 388, y: 296, width: 184, height: 50, rx: 12, fill: GREY, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 480, 328, "Pentagon", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
      return (t) => {
        tiles.forEach((o, i) => {
          const k = seg(t, 0.6 + i * 0.4, 1.2 + i * 0.4);
          o.g.setAttribute("transform", `translate(0 ${46 * (1 - ob(k))})`); o.g.setAttribute("opacity", cl(k * 3));
          o.line.setAttribute("opacity", cl(k * 2 - 0.4));
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
