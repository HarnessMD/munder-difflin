/* Bright coded scene for "Agent tools today, 26 Oct 2026". Vanilla JS, no library.
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

  const SC = {};

  /* ---- a chat on a laptop hands a report request to a cloud session; the lid closes, the work keeps going, the report lands on the phone ---- */
  SC.today = {
    w: 1600, h: 1200, dur: 12.5, still: 11.4,
    build(svg, api) {
      const A = (o) => Object.assign({ stroke: INK, "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round" }, o);
      const NSS = { "vector-effect": "non-scaling-stroke" };
      const lp = (a, b, p) => a + (b - a) * p;
      /* geometry */
      const LX = 110, LW = 520, LT = 560, HINGE = 900, CX = 800, PCX = 1290, PCY = 742;
      const BX = 620, BY = 330, BW = 360, BH = 40;
      /* beats, in seconds */
      const T_Q = 0.7, T_A = 1.5, T_SEND = 2.4, T_LINE = 3.1, T_BAR = 4.3, T_BAR_END = 9.0, T_LID = 5.2, T_TAG = 6.3, T_DROP = 9.2, T_LAND = 10.4;

      const inner = el("g", {}, svg);

      /* the thin blue line from the laptop up to the cloud, drawn under the cloud */
      const line = el("path", { d: `M ${LX + LW / 2 + 40} ${LT - 6} C ${LX + LW / 2 + 40} 470, 500 430, 640 420`, fill: "none", stroke: BLUE, "stroke-width": 6, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }, inner);
      const packet = el("circle", A({ r: 14, fill: BLUE, "stroke-width": 3 }), inner);

      /* the cloud, labelled Cloud session, with a progress bar inside */
      const cloud = el("g", {}, inner);
      el("path", A({ d: "M560 440 A100 100 0 0 1 540 250 A130 130 0 0 1 760 170 A150 150 0 0 1 1010 220 A115 115 0 0 1 1040 440 Z", fill: SKY }), cloud);
      txt(cloud, CX, 300, "Cloud session", { "text-anchor": "middle", "font-size": 42, "font-weight": 700 });
      const clip = el("clipPath", { id: "mg-today-bar" }, el("defs", {}, svg));
      el("rect", { x: BX, y: BY, width: BW, height: BH, rx: BH / 2 }, clip);
      el("rect", { x: BX, y: BY, width: BW, height: BH, rx: BH / 2, fill: "#fff" }, cloud);
      const fill = el("rect", { x: BX, y: BY, width: 0, height: BH, fill: BLUE, "clip-path": "url(#mg-today-bar)" }, cloud);
      el("rect", A({ x: BX, y: BY, width: BW, height: BH, rx: BH / 2, fill: "none", "stroke-width": 3.5 }), cloud);

      /* the laptop, labelled Chat: a lid that folds down onto its base */
      const laptop = el("g", {}, inner);
      el("path", A({ d: `M${LX - 40} ${HINGE} H${LX + LW + 40} L${LX + LW + 74} ${HINGE + 46} Q${LX + LW + 78} ${HINGE + 56} ${LX + LW + 66} ${HINGE + 56} H${LX - 66} Q${LX - 78} ${HINGE + 56} ${LX - 74} ${HINGE + 46} Z`, fill: SOFT }), laptop);
      txt(laptop, LX + LW / 2, HINGE + 126, "Chat", { "text-anchor": "middle", "font-size": 42, "font-weight": 700 });
      const lid = el("g", {}, laptop);
      const lidFrame = el("rect", A(Object.assign({ x: LX, y: LT, width: LW, height: HINGE - LT, rx: 24, fill: LIL }, NSS)), lid);
      const screen = el("g", {}, lid);
      el("rect", A(Object.assign({ x: LX + 20, y: LT + 20, width: LW - 40, height: HINGE - LT - 40, rx: 12, fill: "#fff", "stroke-width": 3 }, NSS)), screen);
      /* bubbles: a short question, a quick answer, then the report request */
      const bubble = (x, y, w, h, f, lines, lc) => {
        const g = el("g", {}, screen);
        el("rect", A({ x, y, width: w, height: h, rx: 18, fill: f, "stroke-width": 3 }), g);
        lines.forEach((lw, i) => el("rect", { x: x + 22, y: y + 20 + i * 22, width: lw, height: 10, rx: 5, fill: lc }, g));
        return g;
      };
      const bq = bubble(LX + 290, LT + 42, 190, 56, SKY, [120], INK + "55");
      const ba = bubble(LX + 40, LT + 114, 300, 78, SOFT, [250, 170], MUTE + "99");
      const br = bubble(LX + 250, LT + 210, 230, 78, BLUE, [110, 80], "#ffffffcc");
      el("rect", A({ x: LX + 420, y: LT + 224, width: 38, height: 50, rx: 6, fill: "#fff", "stroke-width": 3 }), br);
      el("rect", { x: LX + 428, y: LT + 238, width: 22, height: 6, rx: 3, fill: YEL }, br);
      el("rect", { x: LX + 428, y: LT + 252, width: 16, height: 6, rx: 3, fill: YEL }, br);

      /* the Laptop closed tag, in warning yellow */
      const tag = el("g", {}, inner);
      el("rect", A({ x: -160, y: -32, width: 320, height: 64, rx: 32, fill: YEL, "stroke-width": 3 }), tag);
      txt(tag, 0, 11, "Laptop closed", { "text-anchor": "middle", "font-size": 31, "font-weight": 600 });

      /* the phone, labelled Mobile */
      const phone = el("g", {}, inner);
      el("rect", A({ x: PCX - 140, y: 520, width: 280, height: 540, rx: 46, fill: BLUE }), phone);
      el("rect", A({ x: PCX - 118, y: 568, width: 236, height: 452, rx: 22, fill: "#fff", "stroke-width": 3 }), phone);
      el("rect", { x: PCX - 30, y: 540, width: 60, height: 10, rx: 5, fill: INK }, phone);
      txt(phone, PCX, 1128, "Mobile", { "text-anchor": "middle", "font-size": 42, "font-weight": 700 });

      /* the sheet labelled Report */
      const sheet = el("g", {}, inner);
      el("rect", A({ x: -90, y: -110, width: 180, height: 220, rx: 14, fill: "#fff" }), sheet);
      txt(sheet, 0, -60, "Report", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      [[-34, 130], [-6, 108], [22, 130], [50, 76]].forEach(([y, w]) => el("rect", { x: -65, y, width: w, height: 12, rx: 6, fill: YEL }, sheet));

      /* the mint tick on the phone */
      const tick = el("g", {}, inner);
      el("circle", A({ cx: 0, cy: 0, r: 38, fill: MINT }), tick);
      const tickP = el("path", { d: "M-17 1 L-5 14 L18 -13", fill: "none", stroke: INK, "stroke-width": 7, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": "1 1" }, tick);

      /* the Send button and its hint */
      const btn = el("g", {}, inner), face = el("g", {}, btn);
      el("rect", { x: -10, y: -10, width: 220, height: 104, rx: 52, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 8", class: "mg-ring" }, face);
      el("rect", A({ width: 200, height: 84, rx: 42, fill: BLUE }), face);
      txt(face, 100, 55, "Send", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      const hint = txt(inner, 1330, 121, "Tap Send", { "text-anchor": "end", "font-size": 30, "font-weight": 500, fill: MUTE });

      /* press Send, or Enter or Space on it: the report request goes to the cloud again and lands on the phone */
      let at = -99;
      button(btn, "Send: replay the report going to the cloud and landing on the phone", () => {
        at = api.now();
        api.seek(T_SEND, calm);
      });

      const pop = (n, t0, x, y) => { const p = seg(t, t0, t0 + 0.45); tf(n, x, y, ob(p).toFixed(3)); n.setAttribute("opacity", p > 0 ? 1 : 0); };
      let t = 0;
      return (tt, now = 0) => {
        t = tt;
        inner.setAttribute("opacity", (oc(seg(t, 0, 0.3)) * (1 - io(seg(t, 11.9, 12.4)))).toFixed(3));
        laptop.setAttribute("opacity", io(seg(t, 0.1, 0.5)).toFixed(3));
        cloud.setAttribute("opacity", io(seg(t, 0.2, 0.6)).toFixed(3));
        phone.setAttribute("opacity", io(seg(t, 0.3, 0.7)).toFixed(3));

        /* chat bubbles pop in */
        [[bq, T_Q], [ba, T_A], [br, T_SEND]].forEach(([g, t0]) => {
          const p = seg(t, t0, t0 + 0.4);
          g.setAttribute("opacity", p.toFixed(3));
          g.setAttribute("transform", `translate(0 ${(14 * (1 - oc(p))).toFixed(1)})`);
        });

        /* the line draws up to the cloud, a dot rides it, then the line fades */
        const lnp = io(seg(t, T_LINE, T_LINE + 0.9));
        line.setAttribute("stroke-dashoffset", (1 - lnp).toFixed(3));
        line.setAttribute("opacity", (1 - seg(t, T_LID - 0.4, T_LID)).toFixed(3));
        const pp = io(seg(t, T_LINE + 0.2, T_LINE + 1.1));
        if (pp > 0 && pp < 1) { const pt = line.getPointAtLength(pp * line.getTotalLength()); packet.setAttribute("cx", pt.x.toFixed(1)); packet.setAttribute("cy", pt.y.toFixed(1)); packet.setAttribute("opacity", 1); }
        else packet.setAttribute("opacity", 0);

        /* the bar fills while the work runs in the cloud */
        const bp = seg(t, T_BAR, T_BAR_END);
        fill.setAttribute("width", (BW * bp).toFixed(1));

        /* the lid folds down; the screen contents go with it */
        const lc = io(seg(t, T_LID, T_LID + 0.9));
        const sy = Math.max(0.07, Math.cos(lc * Math.PI * 0.48));
        lid.setAttribute("transform", `translate(0 ${HINGE}) scale(1 ${sy.toFixed(4)}) translate(0 ${-HINGE})`);
        screen.setAttribute("opacity", (1 - seg(lc, 0.2, 0.7)).toFixed(3));
        pop(tag, T_TAG, LX + LW / 2, HINGE - 90);

        /* the Report sheet leaves the cloud and drops onto the phone */
        const dp = io(seg(t, T_DROP, T_LAND));
        const x0 = 1010, y0 = 500, x1 = PCX, y1 = 470, x2 = PCX, y2 = PCY;
        const sx = lp(lp(x0, x1, dp), lp(x1, x2, dp), dp), syy = lp(lp(y0, y1, dp), lp(y1, y2, dp), dp);
        tf(sheet, sx.toFixed(1), syy.toFixed(1), lp(0.35, 1, oc(seg(t, T_DROP, T_DROP + 0.7))).toFixed(3), -8 * (1 - dp));
        sheet.setAttribute("opacity", seg(t, T_DROP, T_DROP + 0.2).toFixed(3));

        /* a mint tick on the phone */
        const kp = seg(t, T_LAND + 0.1, T_LAND + 0.7);
        tf(tick, PCX, 935, ob(seg(kp, 0, 0.6)).toFixed(3));
        tick.setAttribute("opacity", kp > 0 ? 1 : 0);
        tickP.setAttribute("stroke-dashoffset", (1 - seg(kp, 0.35, 1)).toFixed(3));

        const bo = io(seg(t, 0.6, 1.0));
        btn.setAttribute("opacity", bo); hint.setAttribute("opacity", bo);
        tf(btn, 1360, 66);
        face.setAttribute("transform", `translate(100 42) scale(${(1 - 0.06 * Math.sin(Math.PI * seg(now - at, 0, 0.2))).toFixed(3)}) translate(-100 -42)`);
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
    let off = 0, raf = 0, seen = false, held = calm, once = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    /* "once": a replay asked for under reduced motion plays through one time, then holds on the still */
    const frame = () => { const now = clock(); if (once && now + off >= sc.still) { once = false; held = true; } draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s, hold) => { off = s - clock(); held = false; once = !!hold; tick(); }, poke: () => { held = false; tick(); }, redraw: () => frame() };
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
