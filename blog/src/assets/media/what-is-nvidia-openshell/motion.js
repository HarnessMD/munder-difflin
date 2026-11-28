/* Bright coded scenes for "What is NVIDIA OpenShell?". Vanilla JS, no library.
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
  let uid = 0; const nid = (p) => `mg-os-${p}-${++uid}`;
  const rr = (x, y, w, h, r) => `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
  const hint = (svg, s) => txt(svg, 756, 60, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  const envelope = (p, w, h, label) => {
    const g = el("g", {}, p);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
    el("path", { d: `M${-w / 2 + 3} ${-h / 2 + 3} L0 ${h * 0.06} L${w / 2 - 3} ${-h / 2 + 3}`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
    if (label) txt(g, 0, h / 2 - 16, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
    return g;
  };

  /* ---- the terrarium, drawn in an 800 by 600 frame; full adds every label and the outside pebble ---- */
  const terrarium = (p, full) => {
    const g = el("g", {}, p);
    if (full) el("path", { d: "M40 478 H760", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
    el("rect", { x: 194, y: 150, width: 392, height: 326, rx: 18, fill: SKY, stroke: INK, "stroke-width": 3 }, g);
    el("rect", { x: 202, y: 158, width: 376, height: 310, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2 }, g);
    el("path", { d: "M232 254 L262 220 M232 290 L292 224", stroke: SKY, "stroke-width": 9, "stroke-linecap": "round" }, g);
    el("path", { d: "M203 414 Q300 402 390 414 T577 412 V460 Q577 467 570 467 H210 Q203 467 203 460 Z", fill: "#fff" }, g);
    el("path", { d: "M203 414 Q300 402 390 414 T577 412", stroke: INK, "stroke-width": 2, fill: "none" }, g);
    const peb = (x, y, rx, fill, label) => {
      el("ellipse", { cx: x, cy: y, rx, ry: 21, fill, stroke: INK, "stroke-width": 2.5 }, g);
      if (label) txt(g, x, y + 6, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
    };
    peb(276, 438, 66, LIL, full && "workspace"); peb(392, 440, 40, LIL, full && "tmp");
    const sp = el("g", {}, g);
    el("path", { d: "M500 418 Q494 366 500 300", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, sp);
    el("path", { d: "M499 318 Q470 312 458 286 Q490 284 499 318 Z", fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, sp);
    el("path", { d: "M501 306 Q534 296 546 268 Q510 268 501 306 Z", fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, sp);
    txt(g, 500, 454, "Agent", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
    el("rect", { x: 184, y: 110, width: 412, height: 46, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, g);
    el("path", { d: "M211 128 V122 A8 8 0 0 1 227 122 V128", stroke: INK, "stroke-width": 3, fill: "none" }, g);
    el("rect", { x: 206, y: 127, width: 26, height: 20, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
    el("circle", { cx: 219, cy: 137, r: 2.5, fill: INK }, g);
    if (full) txt(g, 244, 141, "Locked at creation", { "font-size": 21, "font-weight": 700 });
    const vent = el("g", {}, g);
    if (full) {
      el("rect", { x: 46, y: 198, width: 180, height: 112, rx: 14, fill: "#fff", "fill-opacity": 0 }, vent);
      el("rect", { x: 46, y: 198, width: 180, height: 112, rx: 14, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, vent);
      txt(vent, 170, 222, "Reloads live", { "text-anchor": "end", "font-size": 20, "font-weight": 700 });
    }
    el("rect", { x: 180, y: 236, width: 36, height: 64, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, vent);
    const slats = [252, 268, 284].map((y) => el("path", { d: `M187 ${y} H209`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, vent));
    if (full) {
      el("ellipse", { cx: 688, cy: 452, rx: 62, ry: 22, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
      txt(g, 688, 458, "ssh keys", { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
    }
    return { sp, vent, slats };
  };

  const SC = {};

  /* ---- 1. the sprout leans out and the glass stops it; the vent lets one new host in ---- */
  SC.terrarium = {
    dur: 6, still: 3.6,
    build(svg, api) {
      hint(svg, "Tap the vent");
      const T = terrarium(svg, true);
      const stop = el("rect", { x: 564, y: 240, width: 32, height: 86, rx: 16, fill: "none", stroke: MUTE, "stroke-width": 3 }, svg);
      const mail = envelope(svg, 36, 24, "");
      let at = -99;
      button(T.vent, "Reloads live: open the vent and let one new host in", () => { at = api.now(); api.poke(); });
      return (t, now) => {
        const k = io(seg(t, 0.8, 2.1)) - io(seg(t, 4.6, 5.6)), b = seg(t, 2.1, 2.9);
        const wob = b > 0 && b < 1 ? Math.abs(Math.sin(b * Math.PI * 3)) * (1 - b) * 2.4 : 0;
        T.sp.setAttribute("transform", `rotate(${13 * k - wob} 500 418)`);
        stop.setAttribute("opacity", oc(seg(t, 2.0, 2.3)) * (1 - seg(t, 4.5, 4.9)));
        const s = now - at, on = at >= 0;
        const open = on ? oc(seg(s, 0, 0.35)) * (1 - io(seg(s, 1.9, 2.3))) : 0;
        T.slats.forEach((n, i) => n.setAttribute("transform", `rotate(${72 * open} 198 ${252 + i * 16})`));
        if (!on) { mail.setAttribute("opacity", 0); return; }
        const m = io(seg(s, 0.3, 1.7));
        tf(mail, 70 + 230 * m, 268 + 72 * m + Math.sin(s * 2.4) * 4 * seg(s, 1.7, 2.4), 1, -8 + 8 * m);
        mail.setAttribute("opacity", seg(s, 0.25, 0.45));
      };
    },
  };

  /* ---- 2. the safe clips the key card only to the openrouter.ai envelope ---- */
  SC.safe = {
    dur: 10, still: 9,
    build(svg, api) {
      hint(svg, "Tap the safe to replay");
      el("path", { d: "M30 486 H770", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const e2 = el("g", {}, svg), tag = el("g", { transform: "translate(0 -46) rotate(-6)" }, e2);
      envelope(e2, 180, 100, "other host");
      el("path", { d: "M-44 0 Q-66 10 -70 40", stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, tag);
      el("path", { d: "M-34 -18 H30 Q36 -18 36 -12 V12 Q36 18 30 18 H-34 L-46 0 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: -34, cy: 0, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      e2.insertBefore(tag, null);
      const e1 = envelope(svg, 180, 100, "openrouter.ai");
      el("rect", { x: 206, y: 338, width: 204, height: 10, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 290, y: 348, width: 36, height: 138, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 300, y: 374, width: 16, height: 106, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
      const safe = el("g", {}, svg);
      el("rect", { x: 208, y: 140, width: 200, height: 210, rx: 22, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, safe);
      el("rect", { x: 218, y: 150, width: 180, height: 188, rx: 16, fill: BLUE, stroke: INK, "stroke-width": 3 }, safe);
      el("rect", { x: 234, y: 166, width: 148, height: 156, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2 }, safe);
      const card = el("g", {}, svg);
      el("rect", { x: -58, y: -28, width: 116, height: 56, rx: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, card);
      txt(card, 0, 8, "API key", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const clip = el("path", { d: "M-60 -40 V-10 A7 7 0 0 0 -46 -10 V-34 A5 5 0 0 0 -56 -34 V-16", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, card);
      const door = el("g", {}, safe);
      el("path", { d: rr(234, 166, 148, 156, 10) + " " + rr(244, 180, 128, 68, 8), "fill-rule": "evenodd", fill: "#fff", stroke: INK, "stroke-width": 3 }, door);
      el("circle", { cx: 308, cy: 288, r: 20, fill: SOFT, stroke: INK, "stroke-width": 3 }, door);
      el("path", { d: "M308 272 V281 M342 288 H362", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, door);
      safe.insertBefore(card, door);
      button(safe, "Safe holding the API key: replay", () => api.seek(0));
      return (t) => {
        const x1 = 130 + 300 * io(seg(t, 0.5, 2.2)) + 240 * io(seg(t, 4.2, 5.4));
        const x2 = -160 + 290 * io(seg(t, 2.6, 4.0)) + 320 * io(seg(t, 5.6, 7.2));
        tf(e1, x1, 430); tf(e2, x2, 430);
        const d = oc(seg(t, 2.3, 2.8)) * (1 - io(seg(t, 3.7, 4.2)));
        door.setAttribute("transform", `translate(234 0) scale(${1 - 0.86 * d} 1) translate(-234 0)`);
        const c = io(seg(t, 2.8, 3.6));
        tf(card, 308 + (x1 - 308) * c, 214 + 170 * c, 1, -6 * c);
        clip.setAttribute("opacity", seg(t, 3.45, 3.6));
      };
    },
  };

  /* ---- 3. a new host waits in the airlock until its draft rule is approved ---- */
  SC.airlock = {
    dur: 9, still: 8,
    build(svg, api) {
      el("rect", { x: 190, y: 180, width: 420, height: 260, rx: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 240, y: 220, width: 320, height: 180, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      const doors = [[188.5, 241.5, 200], [558.5, 611.5, 570]].map(([a, b, x]) => {
        el("rect", { x: a, y: 251, width: b - a, height: 148, fill: SOFT }, svg);
        el("path", { d: `M${a + 2} 250 H${b - 2} M${a + 2} 400 H${b - 2}`, stroke: INK, "stroke-width": 2 }, svg);
        return x;
      });
      const env = envelope(svg, 130, 80, "new host");
      const tick = el("g", { transform: "translate(54 -38)" }, env);
      el("circle", { r: 18, fill: MINT, stroke: INK, "stroke-width": 2.5 }, tick);
      el("path", { d: "M-8 0 L-2 6 L9 -6", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
      const panels = doors.map((x, i) => {
        const id = nid("door"), cp = el("clipPath", { id }, svg);
        el("rect", { x: i ? 557 : 187, y: 250, width: 56, height: 150 }, cp);
        const outer = el("g", { "clip-path": `url(#${id})` }, svg), p = el("g", {}, outer);
        el("rect", { x, y: 251, width: 30, height: 148, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 3 }, p);
        el("path", { d: `M${x} 300 H${x + 30} M${x} 350 H${x + 30}`, stroke: INK, "stroke-width": 2 }, p);
        return p;
      });
      el("path", { d: "M400 160 V180", stroke: INK, "stroke-width": 3 }, svg);
      const rays = el("path", { d: "M276 122 L262 114 M276 150 L262 158 M524 122 L538 114 M524 150 L538 158", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const lamp = el("rect", { x: 290, y: 112, width: 220, height: 48, rx: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 144, "Policy check", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const card = el("g", {}, svg);
      el("rect", { x: 160, y: 478, width: 310, height: 64, rx: 16, fill: LIL, stroke: INK, "stroke-width": 3 }, card);
      txt(card, 184, 518, "Draft rule", { "font-size": 24, "font-weight": 700 });
      el("rect", { x: 340, y: 494, width: 110, height: 32, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 2 }, card);
      txt(card, 395, 516, "Pending", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
      const btn = el("g", {}, svg), face = el("g", {}, btn);
      el("rect", { x: 493, y: 473, width: 174, height: 74, rx: 37, fill: "none", stroke: INK, "stroke-width": 2.5, class: "mg-ring" }, btn);
      el("rect", { x: 500, y: 480, width: 160, height: 60, rx: 30, fill: BLUE, stroke: INK, "stroke-width": 3 }, face);
      txt(face, 580, 518, "Approve", { "text-anchor": "middle", "font-size": 24, "font-weight": 700, fill: "#fff" });
      let ap = -99;
      button(btn, "Approve the draft rule", () => { ap = api.now(); api.poke(); });
      return (t, now) => {
        const s = now - ap, on = ap >= 0 && s < 4.2;
        if (!on && ap >= 0) { ap = -99; api.seek(0); return; }
        const T = on ? 8 : t, fade = 1 - seg(T, 8.7, 8.98);
        const inner = 1 - io(seg(T, 2.0, 2.5)), outer = on ? oc(seg(s, 0, 0.5)) * (1 - io(seg(s, 3.3, 3.8))) : 0;
        panels[0].setAttribute("transform", `translate(0 ${-150 * inner})`);
        panels[1].setAttribute("transform", `translate(0 ${-150 * outer})`);
        const ex = -90 + 490 * io(seg(T, 0.3, 2.0)) + (on ? 320 * io(seg(s, 0.45, 1.6)) : 0);
        tf(env, ex, 330); env.setAttribute("opacity", fade);
        const tk = on ? ob(seg(s, 1.4, 1.8)) : 0;
        tick.setAttribute("transform", `translate(54 -38) scale(${tk})`); tick.setAttribute("opacity", tk > 0 ? 1 : 0);
        const lit = T >= 4.2 || (T >= 2.6 && Math.floor((T - 2.6) / 0.25) % 2 === 0);
        lamp.setAttribute("fill", lit ? YEL : "#fff"); rays.setAttribute("opacity", lit ? 1 : 0);
        const ck = ob(seg(T, 4.3, 4.8)), bk = ob(seg(T, 4.6, 5.1));
        card.setAttribute("opacity", cl(ck) * fade); card.setAttribute("transform", `translate(0 ${16 * (1 - ck)})`);
        btn.setAttribute("opacity", cl(bk) * fade); btn.setAttribute("transform", `translate(0 ${16 * (1 - bk)})`);
        const press = on ? 1 - 0.05 * Math.sin(seg(s, 0, 0.25) * Math.PI) : 1;
        face.setAttribute("transform", `translate(580 510) scale(${press}) translate(-580 -510)`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 48, width: 136, height: 40, rx: 20, fill: SKY, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 132, 74.5, "Explainer", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 64, 160, "What is NVIDIA OpenShell?", { "font-size": 54, "font-weight": 700 });
      el("path", { d: "M66 186 H420", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 236, "The agent sandbox, explained", { "font-size": 26, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 274, "Checked 11 Nov 2026", { "font-size": 18, "font-weight": 500, fill: CAP });
      el("path", { d: "M64 506 H896", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      terrarium(el("g", { transform: "translate(456.5 149) scale(0.75)" }, svg), false);
      return () => {};
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
