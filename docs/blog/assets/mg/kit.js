/* Munder Difflin blog scene kit. One script for every post. No dependencies.
   A post ships <figure class="mg" data-scene="NAME"> holding a still <img> and, for kit scenes, a
   <script type="application/json"> with the page's own data. This script swaps the still for a live SVG
   scene (viewBox 960 by 540) that plays only while on screen. Reduced motion keeps one drawn frame.
   "?mgstill=<seconds>" freezes every scene on that frame, "?mgstill" alone on each scene's still frame.
   Under 520 px wide a kit scene uses a tall stage (540 by 720) with larger type and the host below the content.
   "?mgtall=1" forces the tall stage, "?mgtall=0" the wide one.
   Custom scenes register with (window.MGQ = window.MGQ || []).push((MG) => MG.scene("name", {...})).
   Guide: blog/MG_KIT.md. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const C = { ink: "#1A1320", ink2: "#251B2E", ink3: "#3D2E4A", faint: "#8E7B9C", soft: "#D9CFE0", line: "#4A3A58", paper: "#FCFAF0", y: "#FFCA54", sky: "#4ECDC4", lilac: "#B197FC", blue: "#6C8EF5", mint: "#6BCF7F" };
  const W = 960, H = 540, GROUND = 500, WIDE = { W: 960, H: 540, x0: 60, x1: 704, top: 140, bot: 452, gy: 500, hx: 856, tall: false }, TALL = { W: 540, H: 720, x0: 28, x1: 512, top: 140, bot: 520, gy: 694, hx: 84, tall: true }, GROT = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const BASE = (document.currentScript && document.currentScript.src ? document.currentScript.src : "/blog/assets/mg/kit.js").replace(/[^/]*$/, "");
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const back = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
  const hopY = (k) => Math.sin(clamp(k) * Math.PI);
  const lerp = (a, b, k) => a + (b - a) * k;
  const el = (tag, attrs, parent, text) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  };
  const set = (n, attrs) => { for (const k in attrs) n.setAttribute(k, attrs[k]); };
  const txt = (parent, x, y, s, size, fill, extra) => el("text", Object.assign({ x, y, "font-size": size, fill, "font-family": GROT, "font-weight": 500 }, extra || {}), parent, s);
  const wrap = (s, n) => {
    const o = []; let l = "";
    String(s == null ? "" : s).split(/\s+/).forEach((w) => { if (l && (l + " " + w).length > n) { o.push(l); l = w; } else l = l ? l + " " + w : w; });
    if (l) o.push(l);
    return o.length ? o : [""];
  };
  const lines = (parent, x, y, arr, size, fill, extra, lh) => {
    const t = txt(parent, x, y, null, size, fill, extra);
    arr.forEach((s, i) => el("tspan", { x, dy: i ? lh || size * 1.28 : 0 }, t, s));
    return t;
  };
  const num = (v, d) => Number(v).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const decimals = (v) => (String(v).split(".")[1] || "").length;

  // Stage: deep ink panel, a soft glow, a fine grid, a kicker chip and a title.
  // stage(svg, data, layout, glow) returns the layout it drew on, with "top" moved down when the title wraps.
  let uid = 0;
  function stage(svg, data, a, b) {
    const L = Object.assign({}, a && !Array.isArray(a) ? a : WIDE), gl = Array.isArray(a) ? a : b || [0.5, 0.35];
    const id = "mg" + ++uid, d = el("defs", {}, svg);
    const g = el("radialGradient", { id: id + "g", cx: gl[0], cy: gl[1], r: 0.75 }, d);
    el("stop", { offset: 0, "stop-color": "#3A2A4A" }, g);
    el("stop", { offset: 1, "stop-color": C.ink }, g);
    const pt = el("pattern", { id: id + "p", width: 48, height: 48, patternUnits: "userSpaceOnUse" }, d);
    el("path", { d: "M48 0H0V48", fill: "none", stroke: "#FFFFFF", "stroke-opacity": 0.035, "stroke-width": 1 }, pt);
    el("rect", { width: L.W, height: L.H, fill: `url(#${id}g)` }, svg);
    el("rect", { width: L.W, height: L.H, fill: `url(#${id}p)` }, svg);
    if (data && data.kicker) chip(svg, L.x0, 36, String(data.kicker).toUpperCase());
    if (data && data.title) {
      const y = data.kicker ? 104 : 70, T = wrap(data.title, L.tall ? 30 : 52).slice(0, L.tall ? 3 : 2);
      lines(svg, L.x0, y, T, L.tall ? 25 : 27, C.paper, { "font-weight": 600 }, 32);
      L.top = y + (T.length - 1) * 32 + 36;
    }
    return L;
  }
  function floor(svg, x0, x1, y) {
    el("rect", { x: x0, y: (y || GROUND) - 2, width: x1 - x0, height: 4, rx: 2, fill: C.line }, svg);
  }
  function chip(parent, x, y, s, fill) {
    const g = el("g", {}, parent);
    const r = el("rect", { x, y, height: 30, rx: 15, fill: fill || C.y }, g);
    const t = txt(g, x + 14, y + 20.5, s, 14, C.ink, { "font-weight": 700, "letter-spacing": "0.14em" });
    const fit = (v) => r.setAttribute("width", Math.max(52, v.length * 10.6 + 28));
    fit(s);
    return { g, r, t, set(v) { t.textContent = v; fit(v); } };
  }

  /* The cast. Sprites come from the landing page (blog/scripts/build-mg-cast.mjs packs them into cast.png):
     one row per character, 4 walk frames then the portrait, each cell 18 by 32.
     Table: row, left and right shoulder edge, then sleeve, skin and outline colours for the arms. */
  const CAST = {
    /*CAST:START*/
    michael: [0,2,15,"#221E2A","#F7C9AA","#26222E"],
    jim: [1,2,15,"#221E2A","#F7C9AA","#26222E"],
    pam: [2,2,15,"#784C2A","#F7C9AA","#26222E"],
    dwight: [3,2,15,"#CE8646","#F7C9AA","#26222E"],
    kevin: [4,1,16,"#F28C28","#F7C9AA","#26222E"],
    angela: [5,2,15,"#221E2A","#F7C9AA","#26222E"],
    oscar: [6,2,15,"#F0ECDE","#D6A274","#26222E"],
    stanley: [7,1,16,"#221E2A","#785038","#26222E"],
    phyllis: [8,1,16,"#8054B0","#F7C9AA","#26222E"],
    andy: [9,2,15,"#3A3446","#F7C9AA","#26222E"],
    kelly: [10,2,15,"#181216","#D6A274","#26222E"],
    ryan: [11,2,15,"#5E544C","#F7C9AA","#26222E"],
    toby: [12,2,15,"#C4BEAC","#F7C9AA","#26222E"],
    creed: [13,2,15,"#2E2A3A","#F7C9AA","#26222E"],
    meredith: [14,2,15,"#F0ECDE","#F7C9AA","#26222E"],
    /*CAST:END*/
  };
  // Arms are drawn on the sprite's own pixel grid: [steps out from the shoulder, y, width, height, is hand].
  const ARMS = {
    side: [[1, 19, 3, 2, 0], [4, 19, 2, 2, 1]],
    up: [[1, 19, 2, 2, 0], [2, 18, 2, 2, 0], [3, 17, 2, 2, 0], [4, 15, 2, 2, 1]],
    raise: [[1, 14, 2, 6, 0], [1, 12, 2, 2, 1]],
  };
  function actor(parent, name, scale) {
    const s = scale || 4, m = CAST[name] || CAST.jim;
    const g = el("g", {}, parent);
    el("ellipse", { cx: 0, cy: -15 * s, rx: 15 * s, ry: 19 * s, fill: "#5A4470", opacity: 0.28 }, g);
    const sh = el("ellipse", { cx: 0, cy: 0, rx: 7 * s, ry: 1.4 * s, fill: "#000", opacity: 0.35 }, g);
    const body = el("g", {}, g);
    const sv = el("svg", { x: -9 * s, y: -32 * s, width: 18 * s, height: 32 * s, viewBox: `0 ${m[0] * 32} 18 32`, preserveAspectRatio: "none" }, body);
    const img = el("image", { href: BASE + "cast.png", width: 90, height: 480, style: "image-rendering:pixelated" }, sv);
    img.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", BASE + "cast.png");
    const arms = el("g", { transform: `translate(${-9 * s} ${-32 * s}) scale(${s})`, "shape-rendering": "crispEdges" }, body);
    const built = {};
    const arm = (side, kind) => {
      const key = side + kind;
      if (built[key]) return built[key];
      const a = el("g", { display: "none" }, arms), X = (dx, w) => (side === "R" ? m[2] + dx : m[1] - dx - w + 1);
      ARMS[kind].forEach((r) => el("rect", { x: X(r[0], r[2]) - 1, y: r[1] - 1, width: r[2] + 2, height: r[3] + 2, fill: m[5] }, a));
      ARMS[kind].forEach((r) => el("rect", { x: X(r[0], r[2]), y: r[1], width: r[2], height: r[3], fill: r[4] ? m[4] : m[3] }, a));
      return (built[key] = a);
    };
    let shown = [];
    return {
      g, name, s, top: 32 * s,
      // o: x, y (feet), step (walk phase, 0 stands still), arm ("", "left", "right", "up-left", "up-right", "raise"), hop (0 to 1), bob (0 or 1), opacity
      draw(o) {
        const lift = hopY(o.hop || 0) * 9 * s + (o.bob ? s : 0);
        set(g, { transform: `translate(${Math.round(o.x)} ${Math.round(o.y == null ? GROUND : o.y)})`, opacity: o.opacity == null ? 1 : o.opacity });
        set(body, { transform: `translate(0 ${-Math.round(lift)})` });
        set(sh, { rx: 7 * s * (1 - 0.35 * hopY(o.hop || 0)) });
        const f = o.step ? Math.floor(o.step * 8) % 4 : 0;
        sv.setAttribute("viewBox", `${f * 18} ${m[0] * 32} 18 32`);
        const a = o.arm || "", want = a === "raise" ? [arm("L", "raise"), arm("R", "raise")] : a ? [arm(a.includes("left") ? "L" : "R", a.startsWith("up") ? "up" : "side")] : [];
        shown.forEach((n) => { if (!want.includes(n)) n.setAttribute("display", "none"); });
        want.forEach((n) => n.removeAttribute("display"));
        shown = want;
      },
    };
  }
  // A walk from one x to another between two times, then standing. Returns { x, step }.
  const walk = (t, t0, t1, x0, x1) => { const k = p(t, t0, t1); return { x: lerp(x0, x1, k), step: k > 0 && k < 1 ? t : 0 }; };

  // Speech bubble. draw(x, y, k): the tail tip sits at x, y; k from 0 to 1 pops it.
  // side "right" puts the bubble to the right of the tip (tail points left); the default sits above it.
  function bubble(parent, max, size, layout, side) {
    const sz = size || 19, mx = max || 24, L = layout || WIDE, g = el("g", { opacity: 0 }, parent);
    const r = el("rect", { rx: 14, fill: C.paper }, g), tail = el("path", { fill: C.paper }, g);
    let t = null, w = 0, h = 0, cur = null;
    const o = {
      g, maxLines: 4,
      set(s) {
        if (s === cur) return; cur = s; if (t) t.remove();
        const T = wrap(s, mx).slice(0, o.maxLines);
        w = Math.max.apply(null, T.map((l) => l.length)) * sz * 0.53 + 34; h = T.length * sz * 1.28 + 20;
        t = lines(g, 0, 0, T, sz, C.ink, { "font-weight": 600 });
        set(r, { width: w, height: h });
      },
      draw(x, y, k) {
        if (!(k > 0) || !cur) return g.setAttribute("opacity", 0);
        let bx, by, px = x, py = y;
        if (side === "right") {
          bx = Math.min(L.W - 12 - w, x + 13); by = Math.max(8, Math.min(L.H - 8 - h, y - h / 2));
          tail.setAttribute("d", `M${bx + 1} ${y - 9}L${bx - 13} ${y}L${bx + 1} ${y + 9}z`); px = bx - 13;
        } else {
          bx = Math.max(12, Math.min(L.W - 12 - w, x - w / 2)); by = Math.max(8, y - 13 - h); px = Math.max(bx + 22, Math.min(bx + w - 22, x)); py = by + h + 13;
          tail.setAttribute("d", `M${px - 9} ${by + h - 1}L${px} ${py}L${px + 9} ${by + h - 1}z`);
        }
        set(r, { x: bx, y: by });
        set(t, { y: by + 12 + sz });
        Array.prototype.forEach.call(t.childNodes, (n) => n.setAttribute("x", bx + 17));
        set(g, { opacity: Math.min(1, k * 3), transform: `translate(${px} ${py}) scale(${back(clamp(k))}) translate(${-px} ${-py})` });
      },
    };
    return o;
  }

  // The host of a data scene: walks in, points at the content and speaks.
  // Wide stage: stands on the right, bubble above. Tall stage: stands below the content, bubble beside.
  function host(svg, L, name) {
    const who = actor(svg, name), bub = bubble(svg, L.tall ? 30 : 18, 19, L, L.tall ? "right" : "");
    return {
      who, bub,
      // o: arm, hop, bob (as actor.draw). line: what the host says. k: bubble pop, 0 to 1.
      draw(t, o, line, k) {
        const wk = walk(t, 0.2, 1.4, L.tall ? -60 : L.W + 50, L.hx), arm = o.arm && o.arm !== "raise" && L.tall ? "up-right" : o.arm;
        who.draw({ x: wk.x, y: L.gy, step: wk.step, arm: wk.step ? "" : arm, hop: o.hop, bob: o.bob });
        bub.set(line || "");
        if (L.tall) bub.draw(L.hx + 44, L.gy - 70, line ? k : 0); else bub.draw(L.hx, L.gy - who.top - 4, line ? k : 0);
      },
    };
  }

  // A focusable, clickable group. fn(key): undefined for click, Enter or Space; "hover" for a mouse; an arrow key name.
  function hit(parent, label, fn) {
    const g = el("g", { tabindex: 0, role: "button", "aria-label": label, class: "mg-hit" }, parent);
    g.addEventListener("click", () => fn());
    g.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") fn("hover"); });
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); }
      else if (e.key.startsWith("Arrow")) { e.preventDefault(); fn(e.key); }
    });
    return g;
  }
  // Call after the group has its content: adds the hit area and the focus ring on top.
  const ring = (g, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx: rx == null ? 12 : rx, fill: "#fff", "fill-opacity": 0, stroke: C.y, "stroke-width": 3, class: "mg-ring" }, g);
  const hint = (svg, s, L) => txt(svg, (L || WIDE).W - 28, 42, s, 13, C.faint, { "text-anchor": "end", "font-weight": 600, "letter-spacing": "0.08em", class: "mg-hint" });
  const step = (i, n, key, fwd) => Math.max(0, Math.min(n - 1, i + (fwd.includes(key) ? 1 : -1)));

  const SCENES = {};

  /* price-ladder. data: { kicker, title, prefix, suffix, items: [{ label, value, display, note, highlight }], host, say } */
  SCENES["price-ladder"] = {
    tall: true,
    build(svg, data, api) {
      const L = stage(svg, data, api.L, [0.35, 0.4]);
      const items = (data.items || []).slice(0, 6), n = items.length || 1, max = Math.max.apply(null, items.map((i) => +i.value || 0)) || 1;
      const x0 = L.x0, x1 = L.x1, gap = L.tall ? 10 : 18, bw = (x1 - x0 - gap * (n - 1)) / n, base = L.bot, tall = Math.min(240, base - L.top - 56), dec = Math.max.apply(null, items.map((i) => decimals(i.value)));
      const T = 1.2 + n * 0.28 + 0.6, hi = items.findIndex((i) => i.highlight);
      floor(svg, x0, x1, base + 2);
      let sel = -1;
      const fmt = (it, v) => (it.display != null ? it.display : (data.prefix || "") + num(v, dec) + (data.suffix || ""));
      const bars = items.map((it, i) => {
        const x = x0 + i * (bw + gap), h = Math.max(26, (tall * (+it.value || 0)) / max);
        const g = hit(svg, `${it.label}: ${fmt(it, it.value)}${it.note ? ". " + it.note : ""}`, (key) => {
          if (key && key.startsWith("Arrow")) { const j = step(i, n, key, ["ArrowRight", "ArrowUp"]); bars[j].g.focus(); return api.poke(() => { sel = j; }); }
          if (key === "hover" && sel === i) return;
          api.poke(() => { sel = i; });
        });
        const r = el("rect", { x, width: bw, rx: 8 }, g);
        const v = txt(g, x + bw / 2, 0, "", Math.min(21, bw / 3.4), C.paper, { "text-anchor": "middle", "font-family": MONO, "font-weight": 700 });
        lines(g, x + bw / 2, base + 26, wrap(it.label, Math.max(6, Math.floor(bw / 8.4))).slice(0, 2), 14.5, C.soft, { "text-anchor": "middle", "font-weight": 600 }, 17);
        ring(g, x - 4, base - tall - 44, bw + 8, tall + 92);
        return { g, r, v, h, x, it };
      });
      const Hs = host(svg, L, data.host || "kevin");
      hint(svg, "TAP A STEP", L);
      const draw = (t) => {
        bars.forEach((b, i) => {
          const k = p(t, 0.5 + i * 0.28, 1.15 + i * 0.28), h = b.h * Math.max(0.02, back(k)), on = sel >= 0 ? sel === i : i === hi && t > T - 0.5;
          set(b.r, { y: base - h, height: h, fill: on ? C.y : i % 2 ? C.blue : C.lilac, opacity: sel >= 0 && !on ? 0.45 : 1 });
          b.v.textContent = fmt(b.it, (+b.it.value || 0) * out(k));
          set(b.v, { y: base - h - 12, opacity: p(t, 0.5 + i * 0.28, 0.8 + i * 0.28), fill: on ? C.y : C.paper });
        });
        const line = sel >= 0 ? items[sel].note || `${items[sel].label}: ${fmt(items[sel], items[sel].value)}` : data.say;
        Hs.draw(t, { arm: t > 1.6 ? "up-left" : "", hop: sel >= 0 ? api.ui.k : p(t, T - 0.1, T + 0.35), bob: t > T && Math.floor(t * 5) % 2 }, line, sel >= 0 ? api.ui.k : p(t, T, T + 0.4));
      };
      return { draw, dur: T + 4.5, still: T + 1 };
    },
  };

  /* compare. data: { kicker, title, cols: [a, b], pick (0 or 1), rows: [{ label, a, b, win ("a", "b" or ""), note }], host, say } */
  SCENES.compare = {
    tall: true,
    build(svg, data, api) {
      const L = stage(svg, data, api.L, [0.3, 0.45]);
      const rows = (data.rows || []).slice(0, 5), n = rows.length, cols = data.cols || ["A", "B"], pick = data.pick, f = L.tall ? 15 : 17;
      const lw = (L.x1 - L.x0) * (L.tall ? 0.3 : 0.34), cw = (L.x1 - L.x0 - lw) / 2, cx = [L.x0, L.x0 + lw, L.x0 + lw + cw], top = L.top + 10;
      const rh = Math.min(L.tall ? 66 : 58, (L.bot - top - 36) / Math.max(1, n)), T = 1.0 + n * 0.5 + 0.5, mc = Math.floor((cw - 30) / (f * 0.56)), cut = (v, m) => String(v == null ? "" : v).slice(0, m);
      let sel = -1;
      const heads = cols.slice(0, 2).map((c, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: cx[i + 1] + 4, y: top - 14, width: cw - 8, height: 40, rx: 10, fill: pick === i ? C.y : C.ink3 }, g);
        txt(g, cx[i + 1] + cw / 2, top + 13, cut(c, mc + 2), f, pick === i ? C.ink : C.paper, { "text-anchor": "middle", "font-weight": 700 });
        return g;
      });
      const R = rows.map((r, i) => {
        const y = top + 40 + i * rh;
        const g = hit(svg, `${r.label}. ${cols[0]}: ${r.a}. ${cols[1]}: ${r.b}.${r.note ? " " + r.note : ""}`, (key) => {
          if (key && key.startsWith("Arrow")) { const j = step(i, n, key, ["ArrowRight", "ArrowDown"]); R[j].g.focus(); return api.poke(() => { sel = j; }); }
          if (key === "hover" && sel === i) return;
          api.poke(() => { sel = i; });
        });
        const bg = el("rect", { x: L.x0 - 8, y: y + 3, width: L.x1 - L.x0 + 16, height: rh - 6, rx: 10, fill: C.ink2 }, g);
        const lab = wrap(r.label, Math.floor((lw - 6) / (f * 0.54))).slice(0, 2);
        lines(g, cx[0] + 4, y + rh / 2 + 6 - (lab.length - 1) * f * 0.6, lab, f, C.soft, { "font-weight": 600 }, f * 1.2);
        const ticks = ["a", "b"].map((k, j) => {
          // a long cell shrinks to fit its column (down to 11 px) before it is cut
          const won = r.win === k, s = cut(r[k], 30), mid = cx[j + 1] + cw / 2, fs = Math.max(11, Math.min(f, (cw - (won ? 50 : 20)) / (Math.max(1, s.length) * 0.56)));
          txt(g, mid + (won ? 10 : 0), y + rh / 2 + fs * 0.35, s, fs, won ? C.y : C.paper, { "text-anchor": "middle", "font-weight": won ? 700 : 500 });
          return won ? el("path", { d: `M${mid - s.length * fs * 0.29 - 20} ${y + rh / 2}l6 6 11-12`, fill: "none", stroke: C.y, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": 26 }, g) : null;
        });
        ring(g, L.x0 - 8, y + 3, L.x1 - L.x0 + 16, rh - 6, 10);
        return { g, bg, ticks };
      });
      const Hs = host(svg, L, data.host || "oscar");
      hint(svg, "TAP A ROW", L);
      const draw = (t) => {
        heads.forEach((g, i) => { const k = back(p(t, 0.3 + i * 0.15, 0.75 + i * 0.15)); set(g, { opacity: clamp(k * 2), transform: `translate(0 ${(1 - k) * -18})` }); });
        R.forEach((r, i) => {
          const a = 1.0 + i * 0.5, k = out(p(t, a, a + 0.4));
          set(r.g, { opacity: k, transform: `translate(${(1 - k) * -40} 0)` });
          set(r.bg, { fill: sel === i ? C.ink3 : C.ink2 });
          r.ticks.forEach((c) => c && set(c, { "stroke-dashoffset": 26 * (1 - out(p(t, a + 0.3, a + 0.6))) }));
        });
        const cur = Math.min(n - 1, Math.floor((t - 1.0) / 0.5));
        const line = sel >= 0 ? rows[sel].note || `${rows[sel].label}: ${rows[sel].win === "b" ? cols[1] : rows[sel].win === "a" ? cols[0] : "a tie"}` : data.say;
        Hs.draw(t, { arm: t > 1.5 ? (sel < 0 && t < T && cur % 2 ? "left" : "up-left") : "", hop: sel >= 0 ? api.ui.k : p(t, T, T + 0.4) }, line, sel >= 0 ? api.ui.k : p(t, T + 0.1, T + 0.5));
      };
      return { draw, dur: T + 4.5, still: T + 1 };
    },
  };

  /* timeline. data: { kicker, title, events: [{ when, label, note }], host } */
  SCENES.timeline = {
    tall: true,
    build(svg, data, api) {
      const L = stage(svg, data, api.L, [0.5, 0.6]);
      const ev = (data.events || []).slice(0, 6), n = ev.length || 1, HOP = 0.9, STAY = 1.7, T0 = 1.0, at = (i) => T0 + i * (HOP + STAY) + HOP, T = at(n - 1) + STAY;
      // a, b: the two ends of the line. wide: across. tall: down.
      const a = L.tall ? L.top + 24 : 100, b = L.tall ? L.bot - 34 : 860, P = (v) => (n === 1 ? (a + b) / 2 + v * 120 : lerp(a, b, v / (n - 1)));
      const y = Math.max(392, L.top + 252), x = L.x0 + 18, gapN = n > 1 ? (b - a) / (n - 1) : 170;
      el("rect", L.tall ? { x: x - 2, y: a - 26, width: 4, height: b - a + 52, rx: 2, fill: C.line } : { x: a - 30, y: y - 2, width: b - a + 60, height: 4, rx: 2, fill: C.line }, svg);
      const prog = el("rect", L.tall ? { x: x - 2, y: a - 26, width: 4, rx: 2, fill: C.y } : { x: a - 30, y: y - 2, height: 4, rx: 2, fill: C.y }, svg);
      let sel = -1, from = 0;
      const dots = ev.map((e, i) => {
        const q = P(i);
        const g = hit(svg, `${e.when}: ${e.label}${e.note ? ". " + e.note : ""}`, (key) => {
          let j = i;
          if (key && key.startsWith("Arrow")) { j = step(i, n, key, ["ArrowRight", "ArrowDown"]); dots[j].g.focus(); }
          if (key === "hover") return;
          api.poke(() => { from = sel >= 0 ? sel : Math.min(n - 1, 1); sel = j; }, 500);
        });
        let c, w, l;
        if (L.tall) {
          c = el("circle", { cx: x, cy: q, r: 11, stroke: C.ink, "stroke-width": 4 }, g);
          w = txt(g, x + 30, q - 3, String(e.when).slice(0, 22), 16, C.y, { "font-family": MONO, "font-weight": 700 });
          l = lines(g, x + 30, q + 19, wrap(e.label, 44).slice(0, gapN > 82 ? 2 : 1), 16, C.paper, { "font-weight": 600 }, 20);
          ring(g, L.x0 - 6, q - 24, L.x1 - L.x0 + 12, Math.min(70, gapN - 6));
        } else {
          const cw = Math.min(170, gapN - 14);
          c = el("circle", { cx: q, cy: y, r: 11, stroke: C.ink, "stroke-width": 4 }, g);
          w = txt(g, q, y + 38, String(e.when).slice(0, 14), 15, C.y, { "text-anchor": "middle", "font-family": MONO, "font-weight": 700 });
          l = lines(g, q, y + 62, wrap(e.label, Math.max(8, Math.floor(cw / 8))).slice(0, 3), 15, C.paper, { "text-anchor": "middle", "font-weight": 600 }, 19);
          ring(g, q - cw / 2, y - 22, cw, 150);
        }
        return { g, c, w, l };
      });
      const mark = L.tall ? el("circle", { cx: x, r: 7, fill: C.paper, stroke: C.ink, "stroke-width": 3 }, svg) : null;
      const Hs = L.tall ? host(svg, L, data.host || "jim") : null, who = L.tall ? null : actor(svg, data.host || "jim"), bub = L.tall ? null : bubble(svg, 26, 18, L);
      hint(svg, "TAP A DATE", L);
      const draw = (t) => {
        let v = -0.6, st = 0, cur = -1, k = 0;
        if (sel >= 0) { v = lerp(from, sel, io(api.ui.k)); st = api.ui.k < 1 ? api.ui.k * 0.9 : 0; cur = sel; k = p(api.ui.k, 0.7, 1); }
        else for (let i = 0; i < n; i++) {
          const s0 = at(i) - HOP; if (t < s0) break;
          const m = p(t, s0, at(i)); v = lerp(i ? i - 1 : -0.6, i, m); st = m > 0 && m < 1 ? t : 0;
          if (t >= at(i)) { cur = i; k = Math.min(p(t, at(i), at(i) + 0.35), 1 - p(t, at(i) + STAY - 0.3, at(i) + STAY - 0.05) * (i < n - 1 ? 1 : 0)); }
        }
        const q = P(v);
        set(prog, L.tall ? { height: Math.max(0, q - (a - 26)) } : { width: Math.max(0, q - (a - 30)) });
        dots.forEach((d, i) => {
          const seen = sel >= 0 ? true : t >= at(i), pop = sel >= 0 ? 1 : back(p(t, at(i) - 0.1, at(i) + 0.3));
          set(d.c, { r: 8 + 5 * pop + (cur === i ? 3 : 0), fill: seen ? C.y : C.line });
          set(d.w, { opacity: seen ? 1 : 0.35 }); set(d.l, { opacity: seen ? 1 : 0.35 });
        });
        const line = cur >= 0 ? ev[cur].note || ev[cur].label : "", talk = cur >= 0 && !st && sel < 0 && Math.floor(t * 5) % 2;
        if (L.tall) { set(mark, { cy: Math.max(a - 26, q) }); Hs.draw(t, { arm: cur >= 0 ? "up-right" : "", bob: talk, hop: sel >= 0 ? api.ui.k : 0 }, line, k); }
        else { who.draw({ x: q, y: y - 18, step: st, bob: talk }); bub.set(line); bub.draw(q, y - 18 - who.top - 2, line ? k : 0); }
      };
      return { draw, dur: T + 1.2, still: at(Math.min(n - 1, 1)) + 0.8 };
    },
  };

  /* flow. data: { kicker, title, nodes: [{ label, note }], labels: [text on the arrow after node i], host, say } */
  SCENES.flow = {
    tall: true,
    build(svg, data, api) {
      const L = stage(svg, data, api.L, [0.4, 0.5]);
      const nodes = (data.nodes || []).slice(0, 8), n = nodes.length || 1, Wd = L.x1 - L.x0;
      const per = L.tall ? Math.min(2, n) : n <= 4 ? n : Math.ceil(n / 2), rows = Math.ceil(n / per);
      const bw = L.tall ? (per > 1 ? (Wd - 64) / 2 : Wd) : n <= 4 ? Math.min(190, (Wd - (n - 1) * 34) / n) : 140, bh = rows === 1 ? 108 : L.tall ? 70 : 76;
      const gapX = per > 1 ? (Wd - per * bw) / (per - 1) : 0, y0 = L.top + (rows === 1 ? 46 : 30), stepY = rows > 1 ? Math.min(154, (L.bot - y0 - bh) / (rows - 1)) : 0;
      // rows snake: left to right, then right to left
      const pos = nodes.map((_, i) => { const r = Math.floor(i / per), c = i % per; return { x: L.x0 + (r % 2 ? per - 1 - c : c) * (bw + gapX), y: y0 + r * stepY }; });
      const STEP = 1.1, T0 = 0.8, T = T0 + n * STEP;
      let sel = -1, from = 0;
      const edges = pos.slice(0, -1).map((a, i) => {
        const b = pos[i + 1], down = a.y !== b.y, dir = b.x > a.x ? 1 : -1, xa = dir > 0 ? a.x + bw : a.x, xb = dir > 0 ? b.x - 8 : b.x + bw + 8;
        const path = el("path", { d: down ? `M${a.x + bw / 2} ${a.y + bh}V${b.y - 8}` : `M${xa} ${a.y + bh / 2}H${xb}`, fill: "none", stroke: C.paper, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
        const len = down ? b.y - 8 - a.y - bh : Math.abs(xb - xa);
        path.setAttribute("stroke-dasharray", len);
        const head = el("path", { d: down ? `M${a.x + bw / 2 - 6} ${b.y - 12}l6 8 6-8z` : dir > 0 ? `M${b.x - 12} ${a.y + bh / 2 - 6}l8 6-8 6z` : `M${b.x + bw + 12} ${a.y + bh / 2 - 6}l-8 6 8 6z`, fill: C.paper }, svg);
        return { path, head, len, down, a, b, xa, xb };
      });
      const B = nodes.map((nd, i) => {
        const q = pos[i];
        const g = hit(svg, `Step ${i + 1} of ${n}: ${nd.label}${nd.note ? ". " + nd.note : ""}`, (key) => {
          let j = i;
          if (key && key.startsWith("Arrow")) { j = step(i, n, key, ["ArrowRight", "ArrowDown"]); B[j].g.focus(); }
          if (key === "hover") return;
          api.poke(() => { from = sel >= 0 ? sel : n - 1; sel = j; });
        });
        const r = el("rect", { x: q.x, y: q.y, width: bw, height: bh, rx: 14, fill: C.ink2, "stroke-width": 2.5 }, g);
        const no = txt(g, q.x + 12, q.y + 20, String(i + 1), 12, C.faint, { "font-family": MONO, "font-weight": 700 });
        const T2 = wrap(nd.label, Math.max(7, Math.floor(bw / 9.4))).slice(0, 2);
        lines(g, q.x + bw / 2, q.y + bh / 2 + (T2.length > 1 ? -2 : 7), T2, 16.5, C.paper, { "text-anchor": "middle", "font-weight": 600 }, 20);
        ring(g, q.x - 4, q.y - 4, bw + 8, bh + 8, 16);
        return { g, r, no };
      });
      // Arrow labels go on last, above the row, so a neighbouring box never covers them.
      edges.forEach((e, i) => {
        const lab = (data.labels || [])[i];
        if (!lab) return;
        const s = String(lab).slice(0, 16), g = (e.lg = el("g", {}, svg)), w = s.length * 7.4 + 14;
        const cx = e.down ? e.a.x + bw / 2 + 12 + w / 2 : (e.xa + e.xb) / 2, cy = e.down ? (e.a.y + bh + e.b.y) / 2 - 2 : e.a.y - 14;
        el("rect", { x: cx - w / 2, y: cy - 11, width: w, height: 22, rx: 11, fill: C.ink, stroke: C.y, "stroke-width": 1.5 }, g);
        txt(g, cx, cy + 4.5, s, 13, C.y, { "text-anchor": "middle", "font-weight": 700 });
        if (!e.down) el("path", { d: `M${cx} ${cy + 11}V${e.a.y + bh / 2 - 6}`, stroke: C.y, "stroke-width": 1.5, "stroke-dasharray": "3 3" }, g);
      });
      const dot = el("circle", { r: 9, fill: C.y, stroke: C.ink, "stroke-width": 3 }, svg);
      const Hs = host(svg, L, data.host || "pam");
      hint(svg, "TAP A STEP", L);
      const ctr = (i) => ({ x: pos[i].x + bw / 2, y: pos[i].y - 2 });
      const draw = (t) => {
        const cur = sel >= 0 ? sel : Math.min(n - 1, Math.floor((t - T0) / STEP));
        B.forEach((b, i) => {
          const a = T0 + i * STEP, k = sel >= 0 ? 1 : back(p(t, a - 0.35, a + 0.1)), on = cur === i && t >= T0;
          set(b.g, { opacity: clamp(k * 2), transform: `translate(${pos[i].x + bw / 2} ${pos[i].y + bh / 2}) scale(${Math.max(0.01, k)}) translate(${-(pos[i].x + bw / 2)} ${-(pos[i].y + bh / 2)})` });
          set(b.r, { stroke: on ? C.y : C.line, fill: on ? C.ink3 : C.ink2 }); set(b.no, { fill: on ? C.y : C.faint });
        });
        edges.forEach((e, i) => {
          const a = T0 + i * STEP + 0.25, k = sel >= 0 ? 1 : io(p(t, a, a + 0.5));
          set(e.path, { "stroke-dashoffset": e.len * (1 - k) }); set(e.head, { opacity: p(k, 0.9, 1) }); if (e.lg) set(e.lg, { opacity: k });
        });
        let A, Bq, m;
        if (sel >= 0) { A = ctr(from); Bq = ctr(sel); m = io(api.ui.k); }
        else { const i = Math.max(0, cur); A = ctr(Math.max(0, i - 1)); Bq = ctr(i); m = io(p(t, T0 + i * STEP - 0.3, T0 + i * STEP + 0.2)); }
        set(dot, { cx: lerp(A.x, Bq.x, m), cy: lerp(A.y, Bq.y, m) - hopY(m) * 22, opacity: t >= T0 - 0.2 || sel >= 0 ? 1 : 0 });
        Hs.draw(t, { arm: t > 1.5 ? (t < T || sel >= 0 ? "up-left" : "left") : "", hop: sel >= 0 ? api.ui.k : p(t, T, T + 0.4) }, sel >= 0 ? nodes[sel].note || nodes[sel].label : data.say, sel >= 0 ? api.ui.k : p(t, T + 0.1, T + 0.5));
      };
      return { draw, dur: T + 4.5, still: T + 1 };
    },
  };

  /* before-after. data: { kicker, title, before: { label, lines: [] }, after: { label, lines: [] }, host, say } */
  SCENES["before-after"] = {
    tall: true,
    build(svg, data, api) {
      const L = stage(svg, data, api.L, [0.35, 0.5]);
      const bx = L.x0, by = L.top, bw = L.x1 - L.x0, bh = L.bot - L.top + 6, mid = bx + bw / 2, chars = Math.floor((bw - 56) / 14.6);
      let side = 1, flips = 0;
      const card = hit(svg, "Flip between before and after", (key) => { if (key === "hover") return; api.poke(() => { side = 1 - side; flips++; }, 420); });
      const face = (d, after) => {
        const g = el("g", {}, card), rows = [];
        el("rect", { x: bx, y: by, width: bw, height: bh, rx: 18, fill: after ? C.paper : C.ink2, stroke: after ? C.y : C.line, "stroke-width": after ? 4 : 2 }, g);
        chip(g, bx + 24, by + 22, String((d && d.label) || (after ? "After" : "Before")).toUpperCase(), after ? C.y : C.soft);
        ((d && d.lines) || []).forEach((s) => wrap(s, chars).forEach((l) => rows.push(l)));
        const lh = Math.min(42, (bh - 96) / Math.max(1, rows.length));
        lines(g, bx + 28, by + 98, rows.slice(0, 10), Math.min(27, lh * 0.66), after ? C.ink : C.soft, { "font-weight": after ? 600 : 500 }, lh);
        return g;
      };
      const A = face(data.before, 0), Bf = face(data.after, 1);
      ring(card, bx, by, bw, bh, 18);
      const Hs = host(svg, L, data.host || "dwight");
      hint(svg, L.tall ? "TAP THE CARD" : "TAP THE CARD TO FLIP", L);
      const F1 = 3.2, F2 = 8.2, D = 0.6;
      const draw = (t) => {
        // m runs 0 (before) to 1 (after)
        const m = flips ? lerp(1 - side, side, io(api.ui.k)) : io(p(t, F1, F1 + D)) - io(p(t, F2, F2 + D)), after = m > 0.5;
        A.setAttribute("display", after ? "none" : "inline"); Bf.setAttribute("display", after ? "inline" : "none");
        set(card, { transform: `translate(${mid} 0) scale(${Math.max(0.02, Math.abs(Math.cos(m * Math.PI)))} 1) translate(${-mid} 0)` });
        const land = flips ? (side ? api.ui.k : 0) : Math.min(p(t, F1 + D, F1 + D + 0.4), 1 - p(t, F2 - 0.4, F2 - 0.1));
        Hs.draw(t, { arm: t > 1.5 ? (after ? "up-left" : "left") : "", hop: flips ? api.ui.k : p(t, F1 + D - 0.1, F1 + D + 0.35) }, data.say, land);
      };
      return { draw, dur: F2 + D + 1.2, still: F1 + D + 1 };
    },
  };

  /* counter. data: { kicker, title, from, to, prefix, suffix, label, note, host, say } */
  SCENES.counter = {
    tall: true,
    build(svg, data, api) {
      const L = stage(svg, data, api.L, [0.35, 0.55]);
      const a = +data.from || 0, b = +data.to || 0, dec = Math.max(decimals(data.from || 0), decimals(data.to || 0)), full = (data.prefix || "") + num(b, dec) + (data.suffix || "");
      const Wd = L.x1 - L.x0, size = Math.min(150, (Wd * 1.6) / Math.max(4, full.length)), cx = L.x0 + Wd / 2, cy = L.top + (L.bot - L.top) * 0.55, T0 = 1.0, RUN = 2.2, T = T0 + RUN;
      let replays = 0;
      const g = hit(svg, `${full}${data.label ? " " + data.label : ""}. Press to count again.`, (key) => { if (key === "hover") return; api.poke(() => { replays++; }, 1400); });
      const big = txt(g, cx, cy, "", size, C.y, { "text-anchor": "middle", "font-family": MONO, "font-weight": 700 });
      el("rect", { x: L.x0 + 22, y: cy + 34, width: Wd - 44, height: 8, rx: 4, fill: C.line }, g);
      const bar = el("rect", { x: L.x0 + 22, y: cy + 34, height: 8, rx: 4, fill: C.y }, g);
      if (data.label) lines(g, cx, cy + 82, wrap(data.label, L.tall ? 34 : 44).slice(0, 2), 23, C.paper, { "text-anchor": "middle", "font-weight": 600 });
      if (data.note) lines(g, cx, cy + 142, wrap(data.note, L.tall ? 56 : 76).slice(0, 2), 14, C.faint, { "text-anchor": "middle" });
      ring(g, L.x0, cy - size - 6, Wd, size + 176, 18);
      const Hs = host(svg, L, data.host || "kevin");
      hint(svg, "TAP THE NUMBER", L);
      const draw = (t) => {
        const k = replays ? out(p(api.ui.k, 0, 0.8)) : out(p(t, T0, T)), done = replays ? p(api.ui.k, 0.8, 1) : p(t, T, T + 0.35);
        big.textContent = (data.prefix || "") + num(lerp(a, b, k), dec) + (data.suffix || "");
        set(big, { transform: `translate(${cx} ${cy}) scale(${1 + 0.09 * hopY(done)}) translate(${-cx} ${-cy})`, opacity: replays ? 1 : p(t, 0.5, 0.9) });
        set(bar, { width: (Wd - 44) * k });
        Hs.draw(t, { arm: done > 0 ? "raise" : t > 1.5 ? "up-left" : "", hop: done }, data.say, replays ? done : p(t, T + 0.2, T + 0.6));
      };
      return { draw, dur: T + 4.5, still: T + 1 };
    },
  };

  /* stage. data: { kicker, title, board: { label, lines: [] }, script: [{ who, say, point ("left", "right", "up-left", "up-right", "raise"), carry }] } */
  SCENES.stage = {
    tall: true,
    build(svg, data, api) {
      const L = stage(svg, data, api.L, [0.5, 0.7]);
      const sc = (data.script || []).slice(0, 5), names = [];
      sc.forEach((l) => { if (!names.includes(l.who)) names.push(l.who); });
      const n = names.length || 1, S = data.board ? 4 : L.tall && n > 3 ? 5 : 6, edge = L.tall ? 66 : 150, X = (i) => (n === 1 ? L.W / 2 : lerp(edge, L.W - edge, i / (n - 1))), SAY = 2.6, IN = 1.0, G = L.gy;
      floor(svg, L.tall ? 16 : 40, L.W - (L.tall ? 16 : 40), G);
      if (data.board) {
        const bw = Math.min(460, L.W - 56), bx = (L.W - bw) / 2, by = L.top - 22, T = [];
        (data.board.lines || []).forEach((s) => wrap(s, Math.floor((bw - 44) / 9.6)).forEach((l) => T.push(l)));
        const rows = T.slice(0, L.tall ? 7 : 4), ty = by + (data.board.label ? 72 : 36);
        el("rect", { x: bx, y: by, width: bw, height: ty - by + rows.length * 23 - 6, rx: 16, fill: C.ink2, stroke: C.line, "stroke-width": 2 }, svg);
        if (data.board.label) chip(svg, bx + 20, by + 16, String(data.board.label).toUpperCase());
        lines(svg, bx + 22, ty, rows, 17, C.paper, { "font-weight": 600 }, 23);
      }
      // each line: its actor walks in on first use, then speaks
      let t0 = 0.3; const seen = {}, beats = sc.map((l) => { const first = !seen[l.who]; seen[l.who] = 1; const b = { l, i: names.indexOf(l.who), in: t0, at: t0 + (first ? IN : 0.15) }; t0 = b.at + SAY; return b; });
      const T = t0;
      let sel = -1;
      const A = names.map((nm, i) => {
        const g = hit(svg, `${nm[0].toUpperCase() + nm.slice(1)}. Press to hear the line again.`, (key) => { if (key === "hover") return; api.poke(() => { sel = i; }, 420); });
        const a = actor(g, nm, S), tag = txt(g, 0, 0, nm[0].toUpperCase() + nm.slice(1), 13, C.faint, { "text-anchor": "middle", "font-weight": 700, "letter-spacing": "0.1em" });
        const carry = (sc.find((l) => l.who === nm && l.carry) || {}).carry, cg = carry ? el("g", {}, g) : null;
        if (cg) { const w = Math.max(60, String(carry).length * 10 + 26); el("rect", { x: -w / 2, y: -30, width: w, height: 30, rx: 8, fill: C.y, stroke: C.ink, "stroke-width": 3 }, cg); txt(cg, 0, -9.5, String(carry).slice(0, 14), 15, C.ink, { "text-anchor": "middle", "font-weight": 700 }); }
        const r = ring(g, -11 * S, -34 * S, 22 * S, 34 * S + 34, 14);
        return { g, a, tag, cg, r, x: X(i), from: X(i) < L.W / 2 ? -20 * S : L.W + 20 * S };
      });
      // With a board on the wide stage the bubble is wider and two lines at most, so it stays under the board.
      const bub = bubble(svg, L.tall ? 24 : data.board ? 34 : 26, 19, L);
      if (data.board && !L.tall) bub.maxLines = 2;
      hint(svg, "TAP A CHARACTER", L);
      const lastLine = (i) => { let s = ""; sc.forEach((l) => { if (l.who === names[i]) s = l.say; }); return s; };
      const draw = (t) => {
        let talk = -1, k = 0, line = "";
        if (sel >= 0) { talk = sel; k = api.ui.k; line = lastLine(sel); }
        else beats.forEach((b) => { if (t >= b.at && t < b.at + SAY) { talk = b.i; line = b.l.say; k = Math.min(p(t, b.at, b.at + 0.3), 1 - p(t, b.at + SAY - 0.25, b.at + SAY)); } });
        A.forEach((o, i) => {
          const b0 = beats.find((b) => b.i === i), w = b0 ? walk(t, b0.in, b0.in + IN, o.from, o.x) : { x: o.x, step: 0 };
          const cur = sel < 0 ? beats.filter((b) => b.i === i && t >= b.at).pop() : null, here = talk === i;
          const carrying = o.cg && (!cur || cur.l.carry || sel >= 0);
          const arm = carrying ? "" : here && sel < 0 && cur && cur.l.point ? cur.l.point : t >= T && sel < 0 ? "raise" : here ? (o.x < L.W / 2 ? "up-right" : "up-left") : "";
          const hop = sel === i ? api.ui.k : sel < 0 ? p(t, T + i * 0.08, T + 0.4 + i * 0.08) : 0;
          o.a.draw({ x: w.x, y: G, step: w.step, arm, hop, bob: here && Math.floor(t * 6) % 2 && sel < 0 });
          set(o.r, { transform: `translate(${Math.round(w.x)} ${G})` });
          set(o.tag, { x: Math.round(w.x), y: G + 22, fill: here ? C.y : C.faint });
          if (o.cg) set(o.cg, { transform: `translate(${Math.round(w.x)} ${G - 5.5 * S - hopY(hop) * 9 * S})`, opacity: carrying ? 1 : 0 });
        });
        bub.set(line); bub.draw(talk >= 0 ? A[talk].x : 0, G - 32 * S - 4, talk >= 0 && line ? k : 0);
      };
      return { draw, dur: T + 1.6, still: beats.length ? beats[Math.min(beats.length - 1, 1)].at + 1.2 : 1 };
    },
  };

  /* title. The title card of a post: big title, kicker, two or three cast members, nothing to tap.
     data: { kicker, title, sub, cast: [names], say }. Screenshot it with ?mgstill at 1600 by 900 for the title image. */
  SCENES.title = {
    tall: true,
    build(svg, data, api) {
      const L = stage(svg, { kicker: data.kicker }, api.L, [0.72, 0.8]);
      const cast = (data.cast && data.cast.length ? data.cast : ["michael", "jim"]).slice(0, 3), n = cast.length, S = 6, G = L.gy;
      const T = wrap(data.title || "", L.tall ? 15 : 27).slice(0, L.tall ? 4 : 3), size = L.tall ? 52 : T.length > 2 ? 54 : 60, lh = size * 1.1, y0 = (data.kicker ? 92 : 50) + size;
      el("ellipse", { cx: L.tall ? L.W / 2 : L.W - 70 - (n - 1) * 60, cy: G - 60, rx: 120 + n * 70, ry: 150, fill: C.y, opacity: 0.07 }, svg);
      floor(svg, L.tall ? 16 : 40, L.W - (L.tall ? 16 : 40), G);
      const rows = T.map((s, i) => txt(svg, L.x0, y0 + i * lh, s, size, C.paper, { "font-weight": 700, "letter-spacing": "-0.02em" }));
      const subT = data.sub ? wrap(data.sub, L.tall ? 40 : 38).slice(0, 2) : [], sub = subT.length ? lines(svg, L.x0, L.tall ? y0 + T.length * lh + 4 : G - 44, subT, L.tall ? 19 : 21, C.y, { "font-weight": 600 }, 27) : null;
      const X = (i) => (L.tall ? L.W / 2 + (i - (n - 1) / 2) * 140 : L.W - 96 - (n - 1 - i) * 132);
      const A = cast.map((nm) => actor(svg, nm, S)), bub = bubble(svg, 20, 19, L);
      bub.maxLines = 2;
      const draw = (t) => {
        rows.forEach((r, i) => { const k = out(p(t, 0.2 + i * 0.16, 0.8 + i * 0.16)); set(r, { opacity: k, transform: `translate(0 ${(1 - k) * 26})` }); });
        if (sub) set(sub, { opacity: p(t, 1.0, 1.5) });
        A.forEach((a, i) => {
          const s0 = 0.7 + i * 0.35, w = walk(t, s0, s0 + 1.1, L.W + 80 + i * 60, X(i)), h0 = 2.6 + i * 0.18, h1 = 6.2 + i * 0.18;
          a.draw({ x: w.x, y: G, step: w.step, hop: Math.max(p(t, h0, h0 + 0.4) < 1 ? p(t, h0, h0 + 0.4) : 0, p(t, h1, h1 + 0.4) < 1 ? p(t, h1, h1 + 0.4) : 0), arm: w.step || t < 2.4 ? "" : i === 0 ? "up-left" : i === n - 1 && n > 1 ? "raise" : "" });
        });
        bub.set(data.say || ""); bub.draw(X(0), G - 32 * S - 4, data.say ? Math.min(p(t, 3.0, 3.4), 1 - p(t, 7.2, 7.5)) : 0);
      };
      return { draw, dur: 8, still: 4.2 };
    },
  };

  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slug = () => location.pathname.split("/").filter(Boolean).pop() || "";
  const send = (name, scene) => { try { if (window.posthog && window.posthog.capture) window.posthog.capture(name, { slug: slug(), scene }); } catch (e) { /* analytics never breaks a page */ } };
  const params = new URLSearchParams(location.search);
  // Tall stage for a kit scene in a narrow column. Custom scenes stay wide unless they set tall: true and read api.L.
  const wantTall = (fig, sc) => !!sc.tall && (params.get("mgtall") != null ? params.get("mgtall") !== "0" : fig.clientWidth > 0 && fig.clientWidth < 520);

  function mount(fig) {
    const name = fig.dataset.scene, sc = SCENES[name], img = fig.querySelector("img");
    if (!sc || !img || fig.dataset.mgLive) return;
    let data = {};
    const js = fig.querySelector('script[type="application/json"]');
    if (js) data = JSON.parse(js.textContent); else if (fig.dataset.mg) data = JSON.parse(fig.dataset.mg);
    const tall = wantTall(fig, sc), L = tall ? TALL : WIDE;
    const svg = el("svg", { viewBox: `0 0 ${L.W} ${L.H}`, role: "group", "aria-label": img.alt, class: "mg-svg" + (tall ? " mg-tall" : "") });
    let t = 0, last = 0, on = false, raf = 0, tw = 0, held = false, obs = null, ro = null, draw, dur, still;
    const q = params.get("mgstill"), frozen = q != null;
    const again = { g: null };
    const api = {
      ui: { k: 1 }, data, L,
      // A reader did something: stop the story on its still frame, apply the change, and play a short move (ui.k from 0 to 1).
      poke(change, ms) {
        if (!fig._mgTouched) { fig._mgTouched = true; send("blog_scene_interact", name); }
        held = true; cancelAnimationFrame(raf); cancelAnimationFrame(tw);
        if (change) change();
        again.g.removeAttribute("display"); svg.querySelectorAll(".mg-hint").forEach((n) => n.setAttribute("display", "none"));
        if (reduce() || frozen) { api.ui.k = 1; return draw(still); }
        const a = performance.now(), d = ms || 340;
        const tick = (now) => { api.ui.k = clamp((now - a) / d); draw(still); if (api.ui.k < 1) tw = requestAnimationFrame(tick); };
        api.ui.k = 0; tw = requestAnimationFrame(tick);
      },
    };
    const built = sc.build(svg, data, api);
    draw = built.draw || built; dur = built.dur || sc.dur || 10; still = built.still || sc.still || dur * 0.6;
    const remount = () => { cancelAnimationFrame(raf); cancelAnimationFrame(tw); if (obs) obs.disconnect(); if (ro) ro.disconnect(); delete fig.dataset.mgLive; svg.replaceWith(img); mount(fig); };
    // Play again: shown once a reader has taken over.
    again.g = hit(svg, "Play the animation again", (key) => { if (key) return; remount(); const b = fig.querySelector(".mg-hit"); if (b) b.focus({ preventScroll: true }); });
    el("rect", { x: L.W - 122, y: 22, width: 98, height: 30, rx: 15, fill: C.ink3 }, again.g);
    txt(again.g, L.W - 73, 42, "PLAY AGAIN", 12, C.paper, { "text-anchor": "middle", "font-weight": 700, "letter-spacing": "0.1em" });
    ring(again.g, L.W - 122, 22, 98, 30, 15);
    again.g.setAttribute("display", "none");
    img.replaceWith(svg); fig.dataset.mgLive = "1";
    // A phone turned on its side, or a resized window: swap between the tall and the wide stage.
    if (window.ResizeObserver) { ro = new ResizeObserver(() => { if (wantTall(fig, sc) !== tall) remount(); }); ro.observe(fig); }
    if (frozen || reduce()) return draw(q ? +q : still);
    const loop = (now) => {
      if (!on || held) return;
      t = (t + Math.min(0.05, (now - last) / 1000)) % dur; last = now;
      draw(t); raf = requestAnimationFrame(loop);
    };
    draw(0);
    obs = new IntersectionObserver(([e]) => {
      on = e.isIntersecting; cancelAnimationFrame(raf);
      if (on && !fig._mgViewed) { fig._mgViewed = true; send("blog_scene_view", name); }
      if (on && !held) { last = performance.now(); raf = requestAnimationFrame(loop); }
    }, { threshold: 0.25 });
    obs.observe(svg);
  }

  const MG = {
    C, W, H, GROUND, WIDE, TALL, GROT, MONO, CAST, el, set, txt, lines, wrap, num, p, io, out, back, lerp, clamp, hopY,
    stage, floor, chip, actor, walk, bubble, host, hit, ring, hint,
    scene(name, def) { SCENES[name] = def; },
    mount,
  };
  const start = () => {
    const q = window.MGQ || [];
    window.MGQ = { push(fn) { try { fn(MG); } catch (e) { /* a broken page scene keeps its still */ } start.scan(); } };
    q.forEach((fn) => { try { fn(MG); } catch (e) { /* same */ } });
    start.scan();
  };
  start.scan = () => document.querySelectorAll("figure.mg[data-scene]").forEach((f) => { try { mount(f); } catch (e) { /* keep the still image */ } });
  window.MG = MG;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
