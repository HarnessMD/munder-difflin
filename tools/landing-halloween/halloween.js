/* Halloween layer for the munderdiffl.in story page (Pam, 1 Oct 2026). Plain script, no library.
   The page reads whole without it; this only adds light and motion. html.hw-full = version C. */
(function () {
  var root = document.documentElement;
  var FULL = root.classList.contains('hw-full');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  root.classList.add('js-hw');
  /* the season can be switched off from the nav; ON says whether the dress is showing now */
  var ON = root.classList.contains('hw-on');
  var onHooks = [];

  /* ---- one frame loop; each job says whether it still wants frames ---- */
  var jobs = [], running = false, last = 0;
  function want(job) { if (!ON) return; if (jobs.indexOf(job) < 0) jobs.push(job); if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    jobs = ON ? jobs.filter(function (j) { return j(dt, now) !== false; }) : [];
    if (jobs.length) requestAnimationFrame(loop); else running = false;
  }
  function visible(el, cb) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(true); return; }
    var seen = false;
    new IntersectionObserver(function (es) { es.forEach(function (e) { seen = e.isIntersecting; cb(seen); }); }, { rootMargin: '80px 0px' }).observe(el);
    onHooks.push(function () { if (seen) cb(true); });
  }

  /* ---- the title: words rise out of their own line, then (C) catch the candle ---- */
  var h1 = $('.hw-h1');
  if (h1) {
    var go = function () { requestAnimationFrame(function () { h1.classList.add('in'); if (FULL && !reduce) setTimeout(function () { h1.classList.add('lit'); }, 1050); }); };
    if (reduce) h1.classList.add('in'); else if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(go, 120); }); else setTimeout(go, 200);
  }

  /* ---- the hero screen plays the office in the season, the launch film otherwise; the button always plays the film, with sound ---- */
  var v = $('#launchVideo'), sb = $('#soundBtn');
  function showFilm(play) {
    var film = v.getAttribute('data-film');
    if (film && v.currentSrc.indexOf(film) < 0) { v.poster = v.getAttribute('data-film-poster') || v.poster; v.src = film; v.load(); if (play) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
  }
  function showOffice() {
    var office = v.getAttribute('data-office');
    if (office && v.currentSrc.indexOf(office) < 0 && !v.controls) { v.poster = v.getAttribute('data-office-poster') || v.poster; v.src = office; v.load(); var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  }
  /* The office recording is 1942 by 1340 and the launch video is 16:9. When the video plays in the season,
     the screen keeps its height and grows wider to the video's shape, as far as the window allows. */
  var cinema = $('#cinema'), scr = $('#screen'), filmMode = false;
  var OFFICE_AR = 1942 / 1340, FILM_AR = 16 / 9;
  function fitScreen(animate) {
    if (!cinema || !scr) return;
    var par = cinema.parentElement, cs = getComputedStyle(par);
    var inner = par.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var wb = Math.min(864, inner), hb = wb / OFFICE_AR;
    var clear = function () { cinema.classList.remove('hw-grow'); cinema.style.width = cinema.style.maxWidth = cinema.style.marginLeft = ''; scr.style.height = scr.style.aspectRatio = ''; };
    var target = function () {
      if (ON && filmMode) { var wf = Math.min(hb * FILM_AR, window.innerWidth - 32); return { w: wf, h: wf / FILM_AR }; }
      return { w: wb, h: hb };
    };
    if (!ON || (!filmMode && !cinema.style.width)) { clear(); return; }
    var t = target();
    var set = function (w, h) { cinema.style.maxWidth = 'none'; cinema.style.width = w + 'px'; cinema.style.marginLeft = ((inner - w) / 2) + 'px'; scr.style.aspectRatio = 'auto'; scr.style.height = h + 'px'; };
    if (!animate || reduce) { cinema.classList.remove('hw-grow'); set(t.w, t.h); if (!filmMode) clear(); return; }
    cinema.classList.remove('hw-grow'); set(cinema.offsetWidth, scr.offsetHeight);
    void cinema.offsetWidth;
    cinema.classList.add('hw-grow'); set(t.w, t.h);
    if (!filmMode) setTimeout(function () { if (!filmMode) clear(); }, 760);
  }
  window.addEventListener('resize', function () { if (filmMode) fitScreen(false); });
  if (v && sb) {
    sb.addEventListener('click', function () { if (ON) { filmMode = true; fitScreen(true); } showFilm(false); }, true);
    if (!ON) showFilm(!reduce);
  }

  /* ---- the dusk: the page sky follows the workday clock, cream at nine, lilac by five ---- */
  var STOPS = [[540, [251, 244, 234]], [690, [251, 241, 227]], [780, [250, 235, 219]], [870, [246, 228, 216]], [930, [241, 225, 230]], [975, [233, 222, 236]], [1000, [226, 215, 234]], [1020, [217, 205, 230]]];
  function skyAt(m) {
    if (m <= STOPS[0][0]) return STOPS[0][1];
    for (var i = 1; i < STOPS.length; i++) if (m <= STOPS[i][0]) {
      var a = STOPS[i - 1], b = STOPS[i], k = (m - a[0]) / (b[0] - a[0]);
      k = k * k * (3 - 2 * k);
      return [0, 1, 2].map(function (c) { return Math.round(a[1][c] + (b[1][c] - a[1][c]) * k); });
    }
    return STOPS[STOPS.length - 1][1];
  }
  var chaps = $$('[data-chapter]'), clock = $('#dayclock'), night = $('.afterhours'), nfloor = $('.nightfloor');
  var tm = function (el) { var s = (el.getAttribute('data-chapter') || '09:00').split('|')[0].split(':'); return (+s[0]) * 60 + (+s[1]); };
  var lastSky = '';
  function dusk() {
    var vh = window.innerHeight, mid = vh * 0.5, ci = 0;
    var tops = chaps.map(function (c) { return c.getBoundingClientRect().top; });
    for (var i = 0; i < chaps.length; i++) if (tops[i] < mid) ci = i;
    var t0 = tm(chaps[ci]), t1 = ci + 1 < chaps.length ? tm(chaps[ci + 1]) : t0;
    var span = ci + 1 < chaps.length ? tops[ci + 1] - tops[ci] : 1, f = clamp((mid - tops[ci]) / span, 0, 1);
    var mins = t0 + (t1 - t0) * f;
    var c = skyAt(mins), s = 'rgb(' + c.join(',') + ')';
    if (s !== lastSky) { root.style.setProperty('--hw-sky', s); lastSky = s; }
    if (clock) clock.style.setProperty('--dusk', clamp((mins - 540) / 480, 0, 1).toFixed(3));
    if (night) root.classList.toggle('hw-night', night.getBoundingClientRect().top < 64);
    if (night && nfloor) {
      var r = night.getBoundingClientRect();
      nfloor.style.setProperty('--rise', reduce ? 1 : clamp((vh - r.top) / (vh * 0.95), 0, 1).toFixed(3));
    }
  }
  var dq = false;
  window.addEventListener('scroll', function () { if (!dq) { dq = true; requestAnimationFrame(function () { dq = false; dusk(); }); } }, { passive: true });
  window.addEventListener('resize', dusk);
  dusk();
  if (clock && !$('.hw-orb', clock)) { var orb = document.createElement('span'); orb.className = 'hw-orb hw-x'; orb.innerHTML = '<i></i>'; clock.insertBefore(orb, clock.firstChild); }

  /* ---- lantern strings: they light one by one as you pass, and swing when you brush them ---- */
  $$('.hw-string').forEach(function (str) {
    var lans = $$('.hw-lan', str);
    var st = lans.map(function () { return { a: 0, w: 0 }; });
    var active = false, px = null, pt = 0;
    var litNow = str.hasAttribute('data-lit');
    function light() { lans.forEach(function (l, i) { setTimeout(function () { l.classList.add('lit'); if (!reduce) kick(i, (i % 2 ? 1 : -1) * 1.6); }, reduce || litNow ? 0 : 140 * i); }); }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); light(); } }); }, { rootMargin: '0px 0px -38% 0px' });
      io.observe(str);
    } else light();
    function kick(i, w) { st[i].w += w; if (!active) { active = true; want(step); } }
    function step(dt) {
      var moving = false;
      for (var i = 0; i < st.length; i++) {
        var s = st[i];
        s.w += (-34 * s.a - 2.1 * s.w) * dt; s.a += s.w * dt;
        s.a = clamp(s.a, -0.9, 0.9);
        if (Math.abs(s.a) > 0.0008 || Math.abs(s.w) > 0.002) moving = true; else { s.a = 0; s.w = 0; }
        lans[i].firstElementChild.style.transform = 'rotate(' + s.a.toFixed(4) + 'rad)';
      }
      if (!moving) active = false;
      return moving;
    }
    if (reduce) return;
    lans.forEach(function (l, i) {
      l.addEventListener('pointerenter', function (e) { var dx = px === null ? 0 : e.clientX - px; kick(i, clamp(dx * 0.12, -3, 3) || (Math.random() < 0.5 ? -1.2 : 1.2)); });
      l.addEventListener('click', function () { kick(i, (Math.random() < 0.5 ? -1 : 1) * 5); });
    });
    window.addEventListener('pointermove', function (e) { px = e.clientX; pt = e.timeStamp; }, { passive: true });
  });

  /* ---- candy: a Download press throws a small handful ---- */
  var fx = null, fctx = null, bits = [];
  function ensureFx() {
    if (fx) return;
    fx = document.createElement('canvas'); fx.className = 'hw-fx'; fx.setAttribute('aria-hidden', 'true'); document.body.appendChild(fx);
    fctx = fx.getContext('2d');
    var size = function () { fx.width = innerWidth * DPR; fx.height = innerHeight * DPR; };
    size(); window.addEventListener('resize', size);
  }
  var CANDY = ['corn', 'corn', 'wrap', 'wrap', 'star'];
  function burst(x, y) {
    ensureFx();
    for (var i = 0; i < 16; i++) {
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9, sp = 360 + Math.random() * 420;
      bits.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 14, t: 0, life: 0.9 + Math.random() * 0.45, k: CANDY[(Math.random() * CANDY.length) | 0], s: 0.85 + Math.random() * 0.5, hue: Math.random() < 0.5 ? '#7B4FB0' : '#F59A3C' });
    }
    want(drawFx);
  }
  function drawFx(dt) {
    var c = fctx; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, fx.width, fx.height);
    bits = bits.filter(function (b) { return b.t < b.life; });
    bits.forEach(function (b) {
      b.t += dt; b.vy += 1500 * dt; b.vx *= 0.992; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
      var al = clamp((b.life - b.t) / 0.35, 0, 1);
      c.save(); c.globalAlpha = al; c.translate(b.x, b.y); c.rotate(b.r); c.scale(b.s, b.s);
      if (b.k === 'corn') {
        c.beginPath(); c.moveTo(0, -7); c.lineTo(5.5, 6); c.quadraticCurveTo(0, 8, -5.5, 6); c.closePath(); c.fillStyle = '#FFE08A'; c.fill();
        c.save(); c.clip(); c.fillStyle = '#F59A3C'; c.fillRect(-6, -3, 12, 5); c.fillStyle = '#FFFCF7'; c.fillRect(-6, -8, 12, 5); c.restore();
      } else if (b.k === 'wrap') {
        c.fillStyle = b.hue; c.beginPath(); c.arc(0, 0, 4.6, 0, 6.29); c.fill();
        c.beginPath(); c.moveTo(-4, 0); c.lineTo(-9, -3.6); c.lineTo(-9, 3.6); c.closePath(); c.moveTo(4, 0); c.lineTo(9, -3.6); c.lineTo(9, 3.6); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(-1.4, -1.4, 1.4, 0, 6.29); c.fill();
      } else {
        c.fillStyle = '#FFE08A'; c.beginPath();
        for (var i = 0; i < 10; i++) { var rr = i % 2 ? 2.4 : 6, aa = i * Math.PI / 5; c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); }
        c.closePath(); c.fill();
      }
      c.restore();
    });
    if (!bits.length) { c.clearRect(0, 0, fx.width, fx.height); return false; }
  }
  if (!reduce) $$('.btn.primary').forEach(function (b) {
    b.addEventListener('pointerdown', function (e) { if (ON) burst(e.clientX, e.clientY); });
  });

  /* ---- after hours: stars, now and then a shooting star ---- */
  var sc = $('.hw-stars');
  if (sc && night) {
    var sx = sc.getContext('2d'), stars = [], shoot = null, nextShoot = 2.5, starsOn = false, T = 0;
    var sizeStars = function () {
      var w = sc.clientWidth, h = sc.clientHeight; sc.width = w * DPR; sc.height = h * DPR; stars = [];
      var n = Math.round(w * h / 9000);
      for (var i = 0; i < n; i++) stars.push({ x: Math.random() * w, y: Math.random() * h * 0.62, r: Math.random() < 0.12 ? 1.6 : 0.6 + Math.random() * 0.7, p: Math.random() * 6.28, s: 0.6 + Math.random() * 1.8 });
      drawStars(0);
    };
    var drawStars = function (dt) {
      T += dt; var w = sc.clientWidth, h = sc.clientHeight, c = sx;
      c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, w, h);
      stars.forEach(function (s) { var a = reduce ? 0.7 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(T * s.s + s.p)); c.globalAlpha = a; c.fillStyle = '#F1E8F7'; c.fillRect(s.x, s.y, s.r, s.r); });
      if (!reduce) {
        nextShoot -= dt;
        if (!shoot && nextShoot <= 0) { shoot = { x: w * (0.15 + Math.random() * 0.5), y: h * (0.05 + Math.random() * 0.2), t: 0 }; nextShoot = 5 + Math.random() * 6; }
        if (shoot) {
          shoot.t += dt; var k = shoot.t / 0.9, x = shoot.x + k * 260, y = shoot.y + k * 90;
          var g = c.createLinearGradient(x - 90, y - 31, x, y); g.addColorStop(0, 'rgba(255,224,138,0)'); g.addColorStop(1, 'rgba(255,241,208,.9)');
          c.globalAlpha = clamp(1 - k, 0, 1); c.strokeStyle = g; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 90, y - 31); c.lineTo(x, y); c.stroke();
          if (k >= 1) shoot = null;
        }
      }
      c.globalAlpha = 1;
      return starsOn && !reduce;
    };
    sizeStars(); window.addEventListener('resize', sizeStars);
    visible(night, function (on) { starsOn = on; if (on && !reduce) want(drawStars); });
  }

  /* ---- the nav switch: Halloween on or off, in place, remembered on this browser ---- */
  var sw = $('#hwToggle'), sheet = document.getElementById('hw-halloween');
  function paintSwitch() { if (!sw) return; sw.setAttribute('aria-checked', ON ? 'true' : 'false'); sw.title = ON ? 'Switch to the normal version' : 'Switch to the Halloween version'; }
  function setSeason(on) {
    ON = on;
    try { localStorage.setItem('mdf_season', on ? 'halloween' : 'none'); } catch (e) {}
    var apply = function () {
      if (sheet) sheet.disabled = !on;
      root.classList.toggle('hw-on', on);
      paintSwitch();
      if (v) { if (on) showOffice(); else showFilm(!reduce); filmMode = on && v.controls; fitScreen(false); }
      if (on) { dusk(); onHooks.forEach(function (f) { f(); }); } else { jobs = []; if (fctx) fctx.clearRect(0, 0, fx.width, fx.height); bits = []; }
    };
    if (document.startViewTransition && !reduce) document.startViewTransition(apply); else apply();
  }
  if (sw) { paintSwitch(); sw.addEventListener('click', function () { setSeason(!ON); }); }

  /* ================================ C only ================================ */
  if (!FULL) return;

  /* embers rising in the hero */
  var ec = $('.hw-embers'), hero = $('.hero');
  if (ec && hero && !reduce) {
    var ex = ec.getContext('2d'), embers = [], eOn = false, spr = document.createElement('canvas');
    spr.width = spr.height = 32; var sg = spr.getContext('2d'), rg = sg.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, 'rgba(255,224,138,1)'); rg.addColorStop(0.25, 'rgba(255,176,103,.8)'); rg.addColorStop(1, 'rgba(245,154,60,0)'); sg.fillStyle = rg; sg.fillRect(0, 0, 32, 32);
    var sizeE = function () { ec.width = hero.clientWidth * DPR; ec.height = hero.clientHeight * DPR; };
    var seed = function (e, fresh) { var w = hero.clientWidth, h = hero.clientHeight; e.x = Math.random() * w; e.y = fresh ? h * (0.45 + Math.random() * 0.55) : h + 10; e.v = 16 + Math.random() * 26; e.r = 2 + Math.random() * 3.5; e.p = Math.random() * 6.28; e.a = 0.3 + Math.random() * 0.4; return e; };
    sizeE(); for (var i = 0; i < 18; i++) embers.push(seed({}, true));
    window.addEventListener('resize', sizeE);
    var drawE = function (dt, now) {
      var c = ex, w = hero.clientWidth; c.setTransform(DPR, 0, 0, DPR, 0, 0); c.clearRect(0, 0, w, hero.clientHeight);
      embers.forEach(function (e) {
        e.y -= e.v * dt; e.x += Math.sin(now / 1400 + e.p) * 10 * dt;
        var hh = hero.clientHeight; if (e.y < hh * 0.25) seed(e, false);
        c.globalAlpha = e.a * clamp((e.y - hh * 0.25) / (hh * 0.3), 0, 1) * (0.6 + 0.4 * Math.sin(now / 300 + e.p)); c.drawImage(spr, e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
      });
      return eOn;
    };
    visible(hero, function (on) { eOn = on; if (on) want(drawE); });
  }

  /* spiders drop from the lantern cords as each string lights, and climb back up when you reach for them */
  var SPIDER = '<svg viewBox="0 0 20 16" width="14" height="11"><g stroke="#2B2238" stroke-width="1.2" stroke-linecap="round" fill="none"><path d="M7 7 L2 3 M7 8 L1 8 M7 9 L2 13 M13 7 L18 3 M13 8 L19 8 M13 9 L18 13"/></g><ellipse cx="10" cy="8.5" rx="4" ry="4.5" fill="#2B2238"/><circle cx="8.6" cy="7.6" r="1.1" fill="#FBF8FF"/><circle cx="11.4" cy="7.6" r="1.1" fill="#FBF8FF"/><circle cx="8.8" cy="7.9" r=".5" fill="#1F1628"/><circle cx="11.6" cy="7.9" r=".5" fill="#1F1628"/></svg>';
  $$('.hw-string:not([data-lit])').forEach(function (str, n) {
    var t = [0.66, 0.24, 0.8, 0.38][n % 4], y = (1 - t) * (1 - t) * 6 + 2 * t * (1 - t) * 60 + t * t * 6;
    var sp = document.createElement('i'); sp.className = 'hw-spider hw-x';
    sp.style.left = 'calc(var(--pad) + ' + (t * 100).toFixed(2) + '% - ' + (t * 2).toFixed(3) + ' * var(--pad))'; sp.style.top = y.toFixed(1) + 'px';
    sp.innerHTML = '<i class="rig">' + SPIDER + '</i>'; str.appendChild(sp);
    if (reduce || !('IntersectionObserver' in window)) { sp.classList.add('down'); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); setTimeout(function () { sp.classList.add('down'); }, 1300); } }); }, { rootMargin: '0px 0px -38% 0px' });
    io.observe(str);
    var up = null;
    sp.addEventListener('pointerenter', function () { if (!sp.classList.contains('down')) return; sp.classList.remove('down'); clearTimeout(up); up = setTimeout(function () { sp.classList.add('down'); }, 2600); });
  });

  /* a cobweb spins into the corner of the card you hover */
  var WEB = '<svg class="hw-cweb" viewBox="0 0 80 80" aria-hidden="true"><path d="M80 0 L10 0"/><path d="M80 0 L22 38"/><path d="M80 0 L48 62"/><path d="M80 0 L80 72"/><path d="M66 0 Q68 8 80 12"/><path d="M50 0 Q54 16 62 23 Q70 26 80 26"/><path d="M34 0 Q40 22 51 33 Q60 40 80 42"/><path d="M20 0 Q28 28 40 44 Q54 56 80 58"/></svg>';
  if (finePointer) $$('.tier, .mode, .act, .ms-card, .soon > div, .storey:not(.snew)').forEach(function (c) { c.classList.add('hw-webbed'); c.insertAdjacentHTML('beforeend', WEB.replace('class="hw-cweb"', 'class="hw-cweb hw-x"')); });

  /* a ghost peeks out of each answer as it opens */
  var GHOST = '<svg viewBox="0 0 40 46" width="34" height="40"><path d="M4 22 C4 9, 12 2, 20 2 C28 2, 36 9, 36 22 L36 42 C33 39, 31 45, 28 42 C25 39, 23 45, 20 42 C17 39, 15 45, 12 42 C9 39, 7 45, 4 42 Z" fill="#FBF8FF" stroke="#7B4FB0" stroke-width="1.8"/><g fill="#2B2238"><ellipse cx="16" cy="16" rx="2.4" ry="3.2"/><ellipse cx="27" cy="16" rx="2.4" ry="3.2"/><ellipse cx="22" cy="27" rx="2" ry="1.4"/></g></svg>';
  if (!reduce) $$('.faq details').forEach(function (d) {
    var g = document.createElement('i'); g.className = 'hw-peek hw-x'; g.setAttribute('aria-hidden', 'true'); g.innerHTML = GHOST; d.appendChild(g);
    d.addEventListener('toggle', function () { if (!d.open) return; g.classList.remove('go'); void g.offsetWidth; g.classList.add('go'); });
  });

  /* a torch in the dark office: it follows the pointer with a little lag, and sweeps by itself on touch */
  var tf = $('.nightfloor');
  if (tf && !reduce) {
    var torch = document.createElement('i'); torch.className = 'hw-torch hw-x'; torch.setAttribute('aria-hidden', 'true'); tf.appendChild(torch);
    var tx = 0, ty = 0, gx = null, gy = null, lastMove = -1e9, tOn = false;
    tf.parentElement.addEventListener('pointermove', function (e) { var r = tf.getBoundingClientRect(); gx = e.clientX - r.left; gy = e.clientY - r.top; lastMove = performance.now(); }, { passive: true });
    var drawT = function (dt, now) {
      var w = tf.clientWidth, h = tf.clientHeight;
      if (now - lastMove > 2600 || gx === null) { gx = w * (0.5 + 0.38 * Math.sin(now / 2400)); gy = h * (0.62 + 0.18 * Math.sin(now / 1700)); }
      if (tx === 0 && ty === 0) { tx = gx; ty = gy; }
      var k = 1 - Math.pow(0.0016, dt); tx += (gx - tx) * k; ty += (gy - ty) * k;
      torch.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
      return tOn;
    };
    visible(tf, function (on) { tOn = on; if (on) want(drawT); });
  }
})();
