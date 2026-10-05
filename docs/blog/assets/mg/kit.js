/* Munder Difflin blog scene kit. One script for every post. No dependencies.
   A post ships <figure class="mg" data-scene="NAME"> holding a still <img> and, for kit scenes, a
   <script type="application/json"> with the page's own data. This script swaps the still for a live SVG
   scene (viewBox 960 by 540) that plays only while on screen. Reduced motion keeps one drawn frame.
   "?mgstill=<seconds>" freezes every scene on that frame, "?mgstill" alone on each scene's still frame.
   Custom scenes register with (window.MGQ = window.MGQ || []).push((MG) => MG.scene("name", {...})).
   Guide: blog/MG_KIT.md. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const C = { ink: "#1A1320", ink2: "#251B2E", ink3: "#3D2E4A", faint: "#8E7B9C", soft: "#D9CFE0", line: "#4A3A58", paper: "#FCFAF0", y: "#FFCA54", sky: "#4ECDC4", lilac: "#B197FC", blue: "#6C8EF5", mint: "#6BCF7F" };
  const W = 960, H = 540, GROUND = 500, GROT = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
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
  let uid = 0;
  function stage(svg, data, glow) {
    const id = "mg" + ++uid, d = el("defs", {}, svg), gl = glow || [0.5, 0.35];
    const g = el("radialGradient", { id: id + "g", cx: gl[0], cy: gl[1], r: 0.75 }, d);
    el("stop", { offset: 0, "stop-color": "#3A2A4A" }, g);
    el("stop", { offset: 1, "stop-color": C.ink }, g);
    const pt = el("pattern", { id: id + "p", width: 48, height: 48, patternUnits: "userSpaceOnUse" }, d);
    el("path", { d: "M48 0H0V48", fill: "none", stroke: "#FFFFFF", "stroke-opacity": 0.035, "stroke-width": 1 }, pt);
    el("rect", { width: W, height: H, fill: `url(#${id}g)` }, svg);
    el("rect", { width: W, height: H, fill: `url(#${id}p)` }, svg);
    if (data && data.kicker) chip(svg, 60, 36, String(data.kicker).toUpperCase());
    if (data && data.title) lines(svg, 60, data.kicker ? 104 : 70, wrap(data.title, 52).slice(0, 2), 27, C.paper, { "font-weight": 600 });
    return d;
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
  function bubble(parent, max, size) {
    const sz = size || 19, mx = max || 24, g = el("g", { opacity: 0 }, parent);
    const r = el("rect", { rx: 14, fill: C.paper }, g), tail = el("path", { fill: C.paper }, g);
    let t = null, w = 0, h = 0, cur = null;
    return {
      g,
      set(s) {
        if (s === cur) return; cur = s; if (t) t.remove();
        const L = wrap(s, mx).slice(0, 4);
        w = Math.max.apply(null, L.map((l) => l.length)) * sz * 0.53 + 34; h = L.length * sz * 1.28 + 20;
        t = lines(g, 0, 0, L, sz, C.ink, { "font-weight": 600 });
        set(r, { width: w, height: h });
      },
      draw(x, y, k) {
        if (!(k > 0) || !cur) return g.setAttribute("opacity", 0);
        const bx = Math.max(12, Math.min(W - 12 - w, x - w / 2)), by = Math.max(8, y - 13 - h), tx = Math.max(bx + 22, Math.min(bx + w - 22, x));
        set(r, { x: bx, y: by });
        set(t, { y: by + 12 + sz });
        Array.prototype.forEach.call(t.childNodes, (n) => n.setAttribute("x", bx + 17));
        tail.setAttribute("d", `M${tx - 9} ${by + h - 1}L${tx} ${by + h + 13}L${tx + 9} ${by + h - 1}z`);
        const sc = back(clamp(k));
        set(g, { opacity: Math.min(1, k * 3), transform: `translate(${tx} ${by + h + 13}) scale(${sc}) translate(${-tx} ${-(by + h + 13)})` });
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
  const hint = (svg, s) => txt(svg, W - 28, 42, s, 13, C.faint, { "text-anchor": "end", "font-weight": 600, "letter-spacing": "0.08em", class: "mg-hint" });

  const SCENES = {};

  /* price-ladder. data: { kicker, title, prefix, suffix, items: [{ label, value, display, note, highlight }], host, say } */
  SCENES["price-ladder"] = {
    build(svg, data, api) {
      stage(svg, data, [0.35, 0.4]);
      const items = (data.items || []).slice(0, 6), n = items.length || 1, max = Math.max.apply(null, items.map((i) => +i.value || 0)) || 1;
      const x0 = 60, x1 = 704, gap = 18, bw = (x1 - x0 - gap * (n - 1)) / n, base = 452, tall = 240, dec = Math.max.apply(null, items.map((i) => decimals(i.value)));
      const T = 1.2 + n * 0.28 + 0.6, say0 = data.say || "";
      floor(svg, x0, x1, base + 2);
      let sel = -1, hi = items.findIndex((i) => i.highlight);
      const fmt = (it, v) => (it.display != null ? it.display : (data.prefix || "") + num(v, dec) + (data.suffix || ""));
      const bars = items.map((it, i) => {
        const x = x0 + i * (bw + gap), h = Math.max(26, (tall * (+it.value || 0)) / max);
        const g = hit(svg, `${it.label}: ${fmt(it, it.value)}${it.note ? ". " + it.note : ""}`, (key) => {
          if (key && key.startsWith("Arrow")) { const j = Math.max(0, Math.min(n - 1, i + (key === "ArrowRight" || key === "ArrowUp" ? 1 : -1))); bars[j].g.focus(); return api.poke(() => { sel = j; }); }
          if (key === "hover" && sel === i) return;
          api.poke(() => { sel = i; });
        });
        const r = el("rect", { x, width: bw, rx: 8 }, g);
        const v = txt(g, x + bw / 2, 0, "", 21, C.paper, { "text-anchor": "middle", "font-family": MONO, "font-weight": 700 });
        lines(g, x + bw / 2, base + 26, wrap(it.label, Math.max(6, Math.floor(bw / 8.4))).slice(0, 2), 14.5, C.soft, { "text-anchor": "middle", "font-weight": 600 }, 17);
        ring(g, x - 4, base - tall - 44, bw + 8, tall + 92);
        return { g, r, v, h, x, it };
      });
      const who = actor(svg, data.host || "kevin"), bub = bubble(svg, 18);
      hint(svg, "TAP A STEP");
      const draw = (t) => {
        bars.forEach((b, i) => {
          const k = p(t, 0.5 + i * 0.28, 1.15 + i * 0.28), h = b.h * Math.max(0.02, back(k)), on = sel >= 0 ? sel === i : i === hi && t > T - 0.5;
          set(b.r, { y: base - h, height: h, fill: on ? C.y : i % 2 ? C.blue : C.lilac, opacity: sel >= 0 && !on ? 0.45 : 1 });
          b.v.textContent = fmt(b.it, (+b.it.value || 0) * out(k));
          set(b.v, { y: base - h - 12, opacity: p(t, 0.5 + i * 0.28, 0.8 + i * 0.28), fill: on ? C.y : C.paper });
        });
        const wk = walk(t, 0.2, 1.5, W + 50, 856), land = sel >= 0 ? api.ui.k : p(t, T, T + 0.4);
        who.draw({ x: wk.x, step: wk.step, arm: t > 1.6 ? "up-left" : "", hop: sel >= 0 ? api.ui.k : p(t, T - 0.1, T + 0.35), bob: t > T && Math.floor(t * 5) % 2 });
        const line = sel >= 0 ? items[sel].note || `${items[sel].label}: ${fmt(items[sel], items[sel].value)}` : say0;
        bub.set(line); bub.draw(856, GROUND - who.top - 4, line ? land : 0);
      };
      return { draw, dur: T + 4.5, still: T + 1 };
    },
  };

  /* compare. data: { kicker, title, cols: [a, b], pick (0 or 1), rows: [{ label, a, b, win ("a", "b" or ""), note }], host, say } */
  SCENES.compare = {
    build(svg, data, api) {
      stage(svg, data, [0.3, 0.45]);
      const rows = (data.rows || []).slice(0, 5), n = rows.length, cols = data.cols || ["A", "B"], pick = data.pick;
      const cx = [60, 282, 494], cw = [214, 204, 204], top = 150, rh = Math.min(58, 290 / Math.max(1, n)), T = 1.0 + n * 0.5 + 0.5;
      let sel = -1;
      const heads = cols.slice(0, 2).map((c, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: cx[i + 1], y: top - 14, width: cw[i + 1], height: 40, rx: 10, fill: pick === i ? C.y : C.ink3 }, g);
        txt(g, cx[i + 1] + cw[i + 1] / 2, top + 13, String(c).slice(0, 20), 17, pick === i ? C.ink : C.paper, { "text-anchor": "middle", "font-weight": 700 });
        return g;
      });
      const R = rows.map((r, i) => {
        const y = top + 40 + i * rh;
        const g = hit(svg, `${r.label}. ${cols[0]}: ${r.a}. ${cols[1]}: ${r.b}.${r.note ? " " + r.note : ""}`, (key) => {
          if (key && key.startsWith("Arrow")) { const j = Math.max(0, Math.min(n - 1, i + (key === "ArrowDown" || key === "ArrowRight" ? 1 : -1))); R[j].g.focus(); return api.poke(() => { sel = j; }); }
          if (key === "hover" && sel === i) return;
          api.poke(() => { sel = i; });
        });
        const bg = el("rect", { x: 52, y: y + 3, width: 654, height: rh - 6, rx: 10, fill: C.ink2 }, g);
        txt(g, cx[0] + 10, y + rh / 2 + 6, String(r.label).slice(0, 24), 17, C.soft, { "font-weight": 600 });
        const cells = ["a", "b"].map((k, j) => {
          const won = r.win === k;
          const t = txt(g, cx[j + 1] + cw[j + 1] / 2 + (won ? 10 : 0), y + rh / 2 + 6, String(r[k] == null ? "" : r[k]).slice(0, 22), 17, won ? C.y : C.paper, { "text-anchor": "middle", "font-weight": won ? 700 : 500 });
          const half = String(r[k] == null ? "" : r[k]).slice(0, 22).length * 4.9 + 4;
          const tick = won ? el("path", { d: `M${cx[j + 1] + cw[j + 1] / 2 - half - 16} ${y + rh / 2}l6 6 11-12`, fill: "none", stroke: C.y, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": 26 }, g) : null;
          return { t, tick };
        });
        ring(g, 52, y + 3, 654, rh - 6, 10);
        return { g, bg, cells };
      });
      const who = actor(svg, data.host || "oscar"), bub = bubble(svg, 18);
      hint(svg, "TAP A ROW");
      const draw = (t) => {
        heads.forEach((g, i) => { const k = back(p(t, 0.3 + i * 0.15, 0.75 + i * 0.15)); set(g, { opacity: clamp(k * 2), transform: `translate(0 ${(1 - k) * -18})` }); });
        R.forEach((r, i) => {
          const a = 1.0 + i * 0.5, k = out(p(t, a, a + 0.4));
          set(r.g, { opacity: k, transform: `translate(${(1 - k) * -40} 0)` });
          set(r.bg, { fill: sel === i ? C.ink3 : C.ink2 });
          r.cells.forEach((c) => c.tick && set(c.tick, { "stroke-dashoffset": 26 * (1 - out(p(t, a + 0.3, a + 0.6))) }));
        });
        const wk = walk(t, 0.2, 1.4, W + 50, 856);
        const cur = Math.min(n - 1, Math.floor((t - 1.0) / 0.5));
        who.draw({ x: wk.x, step: wk.step, arm: t > 1.5 && (sel >= 0 || t < T) ? (cur % 2 ? "left" : "up-left") : t >= T ? "up-left" : "", hop: sel >= 0 ? api.ui.k : p(t, T, T + 0.4) });
        const line = sel >= 0 ? rows[sel].note || `${rows[sel].label}: ${rows[sel].win === "b" ? cols[1] : rows[sel].win === "a" ? cols[0] : "a tie"}` : data.say || "";
        bub.set(line); bub.draw(856, GROUND - who.top - 4, line ? (sel >= 0 ? api.ui.k : p(t, T + 0.1, T + 0.5)) : 0);
      };
      return { draw, dur: T + 4.5, still: T + 1 };
    },
  };

  /* timeline. data: { kicker, title, events: [{ when, label, note }], host } */
  SCENES.timeline = {
    build(svg, data, api) {
      stage(svg, data, [0.5, 0.6]);
      const ev = (data.events || []).slice(0, 6), n = ev.length || 1, y = 392, xa = 100, xb = 860, X = (i) => (n === 1 ? (xa + xb) / 2 : lerp(xa, xb, i / (n - 1)));
      const HOP = 0.9, STAY = 1.7, T0 = 1.0, at = (i) => T0 + i * (HOP + STAY) + HOP, T = at(n - 1) + STAY;
      el("rect", { x: xa - 30, y: y - 2, width: xb - xa + 60, height: 4, rx: 2, fill: C.line }, svg);
      const prog = el("rect", { x: xa - 30, y: y - 2, height: 4, rx: 2, fill: C.y }, svg);
      let sel = -1, from = 0;
      const dots = ev.map((e, i) => {
        const x = X(i), cw = Math.min(170, (xb - xa) / Math.max(1, n - 1) - 14 || 170);
        const g = hit(svg, `${e.when}: ${e.label}${e.note ? ". " + e.note : ""}`, (key) => {
          let j = i;
          if (key && key.startsWith("Arrow")) { j = Math.max(0, Math.min(n - 1, i + (key === "ArrowRight" || key === "ArrowDown" ? 1 : -1))); dots[j].g.focus(); }
          if (key === "hover") return;
          api.poke(() => { from = sel >= 0 ? sel : n - 1; sel = j; }, 500);
        });
        const c = el("circle", { cx: x, cy: y, r: 11, stroke: C.ink, "stroke-width": 4 }, g);
        const w = txt(g, x, y + 38, String(e.when).slice(0, 14), 15, C.y, { "text-anchor": "middle", "font-family": MONO, "font-weight": 700 });
        const l = lines(g, x, y + 62, wrap(e.label, Math.max(8, Math.floor(cw / 8))).slice(0, 3), 15, C.paper, { "text-anchor": "middle", "font-weight": 600 }, 19);
        ring(g, x - cw / 2, y - 22, cw, 150);
        return { g, c, w, l, x };
      });
      const who = actor(svg, data.host || "jim"), bub = bubble(svg, 26, 18);
      hint(svg, "TAP A DATE");
      const draw = (t) => {
        let x, step = 0, cur = -1, k = 0;
        if (sel >= 0) { const m = io(api.ui.k); x = lerp(X(from), X(sel), m); step = api.ui.k < 1 ? api.ui.k * 0.9 : 0; cur = sel; k = p(api.ui.k, 0.7, 1); }
        else {
          x = xa - 80;
          for (let i = 0; i < n; i++) { const a = at(i) - HOP, w = walk(t, a, at(i), i ? X(i - 1) : xa - 80, X(i)); if (t >= a) { x = w.x; step = w.step; if (t >= at(i)) { cur = i; k = Math.min(p(t, at(i), at(i) + 0.35), 1 - p(t, at(i) + STAY - 0.3, at(i) + STAY - 0.05) * (i < n - 1 ? 1 : 0)); } } }
        }
        set(prog, { width: Math.max(0, x - (xa - 30)) });
        dots.forEach((d, i) => {
          const seen = sel >= 0 ? true : t >= at(i), pop = sel >= 0 ? 1 : back(p(t, at(i) - 0.1, at(i) + 0.3)), on = cur === i;
          set(d.c, { r: 8 + 5 * pop + (on ? 3 : 0), fill: seen ? C.y : C.line });
          set(d.w, { opacity: seen ? 1 : 0.35 }); set(d.l, { opacity: seen ? 1 : 0.35 });
        });
        who.draw({ x, y: y - 18, step, bob: cur >= 0 && !step && Math.floor(t * 5) % 2 && sel < 0 });
        const line = cur >= 0 ? ev[cur].note || ev[cur].label : "";
        bub.set(line); bub.draw(x, y - 18 - who.top - 2, line ? k : 0);
      };
      return { draw, dur: T + 1.2, still: at(Math.min(n - 1, 1)) + 0.8 };
    },
  };

  /* flow. data: { kicker, title, nodes: [{ label, note }], labels: [text on the arrow after node i], host, say } */
  SCENES.flow = {
    build(svg, data, api) {
      stage(svg, data, [0.4, 0.5]);
      const nodes = (data.nodes || []).slice(0, 8), n = nodes.length || 1, per = n <= 4 ? n : Math.ceil(n / 2), bw = n <= 4 ? Math.min(190, (644 - (n - 1) * 34) / n)   : 140, bh = n <= 4 ? 108 : 76, gap = per > 1 ? (644 - per * bw) / (per - 1) : 0;
      const pos = nodes.map((_, i) => { const row = i < per ? 0 : 1, col = row ? per - 1 - (i - per) : i; return { x: 60 + col * (bw + gap), y: n <= 4 ? 186 : row ? 330 : 176 }; });
      const STEP = 1.1, T0 = 0.8, T = T0 + n * STEP;
      let sel = -1, from = 0;
      const edges = pos.slice(0, -1).map((a, i) => {
        const b = pos[i + 1], down = a.y !== b.y, dir = b.x > a.x ? 1 : -1;
        const d = down ? `M${a.x + bw / 2} ${a.y + bh}V${b.y - 8}` : `M${dir > 0 ? a.x + bw : a.x} ${a.y + bh / 2}H${dir > 0 ? b.x - 8 : b.x + bw + 8}`;
        const path = el("path", { d, fill: "none", stroke: C.paper, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
        const len = down ? b.y - 8 - a.y - bh : Math.abs((dir > 0 ? b.x - 8 : b.x + bw + 8) - (dir > 0 ? a.x + bw : a.x));
        path.setAttribute("stroke-dasharray", len);
        const tip = down ? `M${a.x + bw / 2 - 6} ${b.y - 12}l6 8 6-8z` : dir > 0 ? `M${b.x - 12} ${a.y + bh / 2 - 6}l8 6-8 6z` : `M${b.x + bw + 12} ${a.y + bh / 2 - 6}l-8 6 8 6z`;
        const head = el("path", { d: tip, fill: C.paper }, svg);
        const lab = (data.labels || [])[i];
        const lt = lab ? txt(svg, down ? a.x + bw / 2 + 12 : (a.x + b.x + bw) / 2, down ? (a.y + bh + b.y) / 2 + 5 : a.y + bh / 2 - 12, String(lab).slice(0, 12), 13, C.y, { "text-anchor": down ? "start" : "middle", "font-weight": 700 }) : null;
        return { path, head, len, lt };
      });
      const B = nodes.map((nd, i) => {
        const q = pos[i];
        const g = hit(svg, `Step ${i + 1} of ${n}: ${nd.label}${nd.note ? ". " + nd.note : ""}`, (key) => {
          let j = i;
          if (key && key.startsWith("Arrow")) { j = Math.max(0, Math.min(n - 1, i + (key === "ArrowRight" || key === "ArrowDown" ? 1 : -1))); B[j].g.focus(); }
          if (key === "hover") return;
          api.poke(() => { from = sel >= 0 ? sel : n - 1; sel = j; });
        });
        const r = el("rect", { x: q.x, y: q.y, width: bw, height: bh, rx: 14, fill: C.ink2, "stroke-width": 2.5 }, g);
        const no = txt(g, q.x + 12, q.y + 20, String(i + 1), 12, C.faint, { "font-family": MONO, "font-weight": 700 });
        const L = wrap(nd.label, Math.max(7, Math.floor(bw / 9.4))).slice(0, 2);
        lines(g, q.x + bw / 2, q.y + bh / 2 + (L.length > 1 ? -2 : 7), L, 16.5, C.paper, { "text-anchor": "middle", "font-weight": 600 }, 20);
        ring(g, q.x - 4, q.y - 4, bw + 8, bh + 8, 16);
        return { g, r, no };
      });
      const dot = el("circle", { r: 9, fill: C.y, stroke: C.ink, "stroke-width": 3 }, svg);
      const who = actor(svg, data.host || "pam"), bub = bubble(svg, 18);
      hint(svg, "TAP A STEP");
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
          set(e.path, { "stroke-dashoffset": e.len * (1 - k) }); set(e.head, { opacity: p(k, 0.9, 1) }); if (e.lt) set(e.lt, { opacity: k });
        });
        let dx, dy;
        if (sel >= 0) { const a = ctr(from), b = ctr(sel), m = io(api.ui.k); dx = lerp(a.x, b.x, m); dy = lerp(a.y, b.y, m) - hopY(api.ui.k) * 26; }
        else { const i = Math.max(0, cur), a = ctr(Math.max(0, i - 1)), b = ctr(i), m = io(p(t, T0 + i * STEP - 0.3, T0 + i * STEP + 0.2)); dx = lerp(a.x, b.x, m); dy = lerp(a.y, b.y, m) - hopY(m) * 26; }
        set(dot, { cx: dx, cy: dy, opacity: t >= T0 - 0.2 || sel >= 0 ? 1 : 0 });
        const wk = walk(t, 0.1, 1.2, W + 50, 856);
        who.draw({ x: wk.x, step: wk.step, arm: t > 1.3 ? (t < T || sel >= 0 ? "up-left" : "left") : "", hop: sel >= 0 ? api.ui.k : p(t, T, T + 0.4) });
        const line = sel >= 0 ? nodes[sel].note || nodes[sel].label : data.say || "";
        bub.set(line); bub.draw(856, GROUND - who.top - 4, line ? (sel >= 0 ? api.ui.k : p(t, T + 0.1, T + 0.5)) : 0);
      };
      return { draw, dur: T + 4.5, still: T + 1 };
    },
  };

  /* before-after. data: { kicker, title, before: { label, lines: [] }, after: { label, lines: [] }, host, say } */
  SCENES["before-after"] = {
    build(svg, data, api) {
      stage(svg, data, [0.35, 0.5]);
      const bx = 60, by = 140, bw = 644, bh = 318, mid = bx + bw / 2;
      let side = 1, flips = 0;
      const card = hit(svg, "Flip between before and after", (key) => { if (key === "hover") return; api.poke(() => { side = 1 - side; flips++; }, 420); });
      const face = (d, after) => {
        const g = el("g", {}, card), rows = [];
        el("rect", { x: bx, y: by, width: bw, height: bh, rx: 18, fill: after ? C.paper : C.ink2, stroke: after ? C.y : C.line, "stroke-width": after ? 4 : 2 }, g);
        chip(g, bx + 24, by + 22, String((d && d.label) || (after ? "After" : "Before")).toUpperCase(), after ? C.y : C.soft);
        ((d && d.lines) || []).forEach((s) => wrap(s, 36).forEach((l) => rows.push(l)));
        const lh = Math.min(42, 222 / Math.max(1, rows.length));
        lines(g, bx + 28, by + 98, rows.slice(0, 9), Math.min(27, lh * 0.66), after ? C.ink : C.soft, { "font-weight": after ? 600 : 500 }, lh);
        return g;
      };
      const A = face(data.before, 0), Bf = face(data.after, 1);
      ring(card, bx, by, bw, bh, 18);
      const who = actor(svg, data.host || "dwight"), bub = bubble(svg, 18);
      hint(svg, "TAP THE CARD TO FLIP");
      const F1 = 3.2, F2 = 8.2, D = 0.6;
      const draw = (t) => {
        // m runs 0 (before) to 1 (after)
        let m;
        if (flips) m = lerp(1 - side, side, io(api.ui.k));
        else m = io(p(t, F1, F1 + D)) - io(p(t, F2, F2 + D));
        const sx = Math.abs(Math.cos(m * Math.PI)), showAfter = m > 0.5;
        A.setAttribute("display", showAfter ? "none" : "inline"); Bf.setAttribute("display", showAfter ? "inline" : "none");
        set(card, { transform: `translate(${mid} 0) scale(${Math.max(0.02, sx)} 1) translate(${-mid} 0)` });
        const wk = walk(t, 0.2, 1.4, W + 50, 856), land = flips ? (side ? api.ui.k : 0) : Math.min(p(t, F1 + D, F1 + D + 0.4), 1 - p(t, F2 - 0.4, F2 - 0.1));
        who.draw({ x: wk.x, step: wk.step, arm: t > 1.5 ? (showAfter ? "up-left" : "left") : "", hop: flips ? api.ui.k : p(t, F1 + D - 0.1, F1 + D + 0.35) });
        bub.set(data.say || ""); bub.draw(856, GROUND - who.top - 4, data.say ? land : 0);
      };
      return { draw, dur: F2 + D + 1.2, still: F1 + D + 1 };
    },
  };

  /* counter. data: { kicker, title, from, to, prefix, suffix, label, note, host, say } */
  SCENES.counter = {
    build(svg, data, api) {
      stage(svg, data, [0.35, 0.55]);
      const a = +data.from || 0, b = +data.to || 0, dec = Math.max(decimals(data.from || 0), decimals(data.to || 0)), full = (data.prefix || "") + num(b, dec) + (data.suffix || "");
      const size = Math.min(150, 1060 / Math.max(4, full.length)), cx = 382, cy = 330, T0 = 1.0, RUN = 2.2, T = T0 + RUN;
      let replays = 0;
      const g = hit(svg, `${full}${data.label ? " " + data.label : ""}. Press to count again.`, (key) => { if (key === "hover") return; api.poke(() => { replays++; }, 1400); });
      const big = txt(g, cx, cy, "", size, C.y, { "text-anchor": "middle", "font-family": MONO, "font-weight": 700 });
      el("rect", { x: 82, y: cy + 34, width: 600, height: 8, rx: 4, fill: C.line }, g);
      const bar = el("rect", { x: 82, y: cy + 34, height: 8, rx: 4, fill: C.y }, g);
      if (data.label) lines(g, cx, cy + 82, wrap(data.label, 44).slice(0, 2), 23, C.paper, { "text-anchor": "middle", "font-weight": 600 });
      if (data.note) txt(g, cx, cy + 142, String(data.note).slice(0, 70), 14, C.faint, { "text-anchor": "middle" });
      ring(g, 60, cy - size - 6, 644, size + 170, 18);
      const who = actor(svg, data.host || "kevin"), bub = bubble(svg, 18);
      hint(svg, "TAP THE NUMBER");
      const draw = (t) => {
        const k = replays ? out(p(api.ui.k, 0, 0.8)) : out(p(t, T0, T)), done = replays ? p(api.ui.k, 0.8, 1) : p(t, T, T + 0.35);
        big.textContent = (data.prefix || "") + num(lerp(a, b, k), dec) + (data.suffix || "");
        const sc = 1 + 0.09 * hopY(done);
        set(big, { transform: `translate(${cx} ${cy}) scale(${sc}) translate(${-cx} ${-cy})`, opacity: replays ? 1 : p(t, 0.5, 0.9) });
        set(bar, { width: 600 * k });
        const wk = walk(t, 0.2, 1.4, W + 50, 856);
        who.draw({ x: wk.x, step: wk.step, arm: done > 0 ? "raise" : t > 1.5 ? "up-left" : "", hop: done });
        bub.set(data.say || ""); bub.draw(856, GROUND - who.top - 4, data.say ? (replays ? done : p(t, T + 0.2, T + 0.6)) : 0);
      };
      return { draw, dur: T + 4.5, still: T + 1 };
    },
  };

  /* stage. data: { kicker, title, board: { label, lines: [] }, script: [{ who, say, point ("left", "right", "up-left", "up-right", "raise"), carry }] } */
  SCENES.stage = {
    build(svg, data, api) {
      stage(svg, data, [0.5, 0.7]);
      const sc = (data.script || []).slice(0, 5), names = [];
      sc.forEach((l) => { if (!names.includes(l.who)) names.push(l.who); });
      const n = names.length || 1, X = (i) => (n === 1 ? 480 : lerp(150, 810, i / (n - 1))), SAY = 2.6, IN = 1.0, S = data.board ? 4 : 6;
      floor(svg, 40, W - 40);
      if (data.board) {
        const L = [];
        (data.board.lines || []).forEach((s) => wrap(s, 40).forEach((l) => L.push(l)));
        const bh = 62 + Math.min(4, L.length) * 27, by = data.title ? 128 : 60;
        el("rect", { x: 250, y: by, width: 460, height: bh, rx: 16, fill: C.ink2, stroke: C.line, "stroke-width": 2 }, svg);
        if (data.board.label) chip(svg, 270, by + 16, String(data.board.label).toUpperCase());
        lines(svg, 272, by + (data.board.label ? 76 : 44), L.slice(0, 4), 19, C.paper, { "font-weight": 600 }, 27);
      }
      // each line: its actor walks in on first use, then speaks
      let t0 = 0.3; const seen = {}, beats = sc.map((l) => { const first = !seen[l.who]; seen[l.who] = 1; const b = { l, i: names.indexOf(l.who), first, in: t0, at: t0 + (first ? IN : 0.15) }; t0 = b.at + SAY; return b; });
      const T = t0;
      let sel = -1;
      const A = names.map((nm, i) => {
        const g = hit(svg, `${nm[0].toUpperCase() + nm.slice(1)}. Press to hear the line again.`, (key) => { if (key === "hover") return; api.poke(() => { sel = i; }, 420); });
        const a = actor(g, nm, S), tag = txt(g, 0, 0, nm[0].toUpperCase() + nm.slice(1), 13, C.faint, { "text-anchor": "middle", "font-weight": 700, "letter-spacing": "0.1em" });
        const carry = (sc.find((l) => l.who === nm && l.carry) || {}).carry, cg = carry ? el("g", {}, g) : null;
        if (cg) { const w = Math.max(60, String(carry).length * 10 + 26); el("rect", { x: -w / 2, y: -30, width: w, height: 30, rx: 8, fill: C.y, stroke: C.ink, "stroke-width": 3 }, cg); txt(cg, 0, -9.5, String(carry).slice(0, 14), 15, C.ink, { "text-anchor": "middle", "font-weight": 700 }); }
        const r = ring(g, -11 * S, -34 * S, 22 * S, 34 * S + 34, 14);
        return { g, a, tag, cg, r, x: X(i), from: X(i) < 480 ? -20 * S : W + 20 * S };
      });
      const bub = bubble(svg, 26);
      hint(svg, "TAP A CHARACTER");
      const lastLine = (i) => { let s = ""; sc.forEach((l) => { if (l.who === names[i]) s = l.say; }); return s; };
      const draw = (t) => {
        let talk = -1, k = 0, line = "";
        if (sel >= 0) { talk = sel; k = api.ui.k; line = lastLine(sel); }
        else beats.forEach((b) => { if (t >= b.at && t < b.at + SAY) { talk = b.i; line = b.l.say; k = Math.min(p(t, b.at, b.at + 0.3), 1 - p(t, b.at + SAY - 0.25, b.at + SAY)); } });
        A.forEach((o, i) => {
          const b0 = beats.find((b) => b.i === i), w = b0 ? walk(t, b0.in, b0.in + IN, o.from, o.x) : { x: o.x, step: 0 };
          const cur = sel < 0 ? beats.filter((b) => b.i === i && t >= b.at).pop() : null, here = talk === i;
          const carrying = o.cg && (!cur || cur.l.carry || sel >= 0);
          const arm = carrying ? "" : here && sel < 0 && cur && cur.l.point ? cur.l.point : t >= T && sel < 0 ? "raise" : here ? (o.x < 480 ? "up-right" : "up-left") : "";
          const hop = sel === i ? api.ui.k : sel < 0 ? p(t, T + i * 0.08, T + 0.4 + i * 0.08) : 0;
          o.a.draw({ x: w.x, step: w.step, arm, hop, bob: here && Math.floor(t * 6) % 2 && sel < 0 });
          set(o.r, { transform: `translate(${Math.round(w.x)} ${GROUND})` });
          set(o.tag, { x: Math.round(w.x), y: GROUND + 26, fill: here ? C.y : C.faint });
          if (o.cg) set(o.cg, { transform: `translate(${Math.round(w.x)} ${GROUND - 5.5 * S - hopY(hop) * 9 * S})`, opacity: carrying ? 1 : 0 });
        });
        bub.set(line); bub.draw(talk >= 0 ? A[talk].x : 0, GROUND - 32 * S - 4, talk >= 0 && line ? k : 0);
      };
      return { draw, dur: T + 1.6, still: beats.length ? beats[Math.min(beats.length - 1, 1)].at + 1.2 : 1 };
    },
  };

  const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slug = () => location.pathname.split("/").filter(Boolean).pop() || "";
  const send = (name, scene) => { try { if (window.posthog && window.posthog.capture) window.posthog.capture(name, { slug: slug(), scene }); } catch (e) { /* analytics never breaks a page */ } };

  function mount(fig) {
    const name = fig.dataset.scene, sc = SCENES[name], img = fig.querySelector("img");
    if (!sc || !img || fig.dataset.mgLive) return;
    let data = {};
    const js = fig.querySelector('script[type="application/json"]');
    if (js) data = JSON.parse(js.textContent); else if (fig.dataset.mg) data = JSON.parse(fig.dataset.mg);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "group", "aria-label": img.alt, class: "mg-svg" });
    let t = 0, last = 0, on = false, raf = 0, tw = 0, held = false, obs = null, draw, dur, still;
    const q = new URLSearchParams(location.search).get("mgstill"), frozen = q != null;
    const api = {
      ui: { k: 1 }, data,
      // A reader did something: stop the story on its still frame, apply the change, and play a short move (ui.k from 0 to 1).
      poke(change, ms) {
        if (!fig._mgTouched) { fig._mgTouched = true; send("blog_scene_interact", name); }
        held = true; cancelAnimationFrame(raf); cancelAnimationFrame(tw);
        if (change) change();
        again.removeAttribute("display"); svg.querySelectorAll(".mg-hint").forEach((n) => n.setAttribute("display", "none"));
        if (reduce() || frozen) { api.ui.k = 1; return draw(still); }
        const a = performance.now(), d = ms || 340;
        const step = (now) => { api.ui.k = clamp((now - a) / d); draw(still); if (api.ui.k < 1) tw = requestAnimationFrame(step); };
        api.ui.k = 0; tw = requestAnimationFrame(step);
      },
    };
    const built = sc.build(svg, data, api);
    draw = built.draw || built; dur = built.dur || sc.dur || 10; still = built.still || sc.still || dur * 0.6;
    // Play again: shown once a reader has taken over.
    const again = hit(svg, "Play the animation again", (key) => { if (key) return; cancelAnimationFrame(tw); obs && obs.disconnect(); delete fig.dataset.mgLive; svg.replaceWith(img); mount(fig); const b = fig.querySelector(".mg-hit"); if (b) b.focus({ preventScroll: true }); });
    el("rect", { x: W - 122, y: 22, width: 98, height: 30, rx: 15, fill: C.ink3 }, again);
    txt(again, W - 73, 42, "PLAY AGAIN", 12, C.paper, { "text-anchor": "middle", "font-weight": 700, "letter-spacing": "0.1em" });
    ring(again, W - 122, 22, 98, 30, 15);
    again.setAttribute("display", "none");
    img.replaceWith(svg); fig.dataset.mgLive = "1";
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
    C, W, H, GROUND, GROT, MONO, CAST, el, set, txt, lines, wrap, num, p, io, out, back, lerp, clamp, hopY,
    stage, floor, chip, actor, walk, bubble, hit, ring, hint,
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
