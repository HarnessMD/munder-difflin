/* Everything that moves on the landing page. No framework: one scroll loop, IntersectionObservers that
   start and stop each scene, and small interactions on plain elements. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var O = window.MDOffice, A = window.MDAv, S = window.MDStapler;
  if (!O || !A || !S) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SMALL = matchMedia('(max-width: 700px)').matches;
  var HOVER = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var ua = navigator.userAgent;
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isPhone = isIOS || /Android/.test(ua);
  var OS = isPhone ? 'phone' : /Win/.test(navigator.platform || ua) ? 'win' : /Linux|X11|CrOS/.test(ua) ? 'linux' : 'mac';
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---------- vendor marks (assets/brands.js) ---------- */
  var BR = window.MDBrands || { engines: {}, apps: {}, mini: {} }, uidN = 0;
  var ENGKEY = { 'Claude Code': 'claude', 'Codex': 'codex', 'Gemini CLI': 'gemini', 'Grok': 'grok', 'Cursor': 'cursor', 'Copilot CLI': 'copilot', 'Qwen': 'qwen', 'Kimi Code': 'kimi', 'OpenCode': 'opencode', 'Crush': 'crush', 'Pi': 'pi', 'Antigravity': 'antigravity' };
  // each copy of a mark gets its own ids, so a gradient never points at a copy that is hidden
  function uniq(svg) { var n = ++uidN, ids = []; svg.replace(/id="([^"]+)"/g, function (m, id) { ids.push(id); }); ids.forEach(function (id) { svg = svg.split(id).join(id + '_' + n); }); return svg; }
  function mark(key) { var e = BR.engines[key]; return e ? '<i class="em" style="background:' + e.bg + '">' + uniq(e.logo) + '</i>' : ''; }
  function engHTML(name) { return mark(ENGKEY[name]) + name; }
  function appLogo(key) { var a = BR.apps[key]; return a ? uniq(a.logo) : ''; }

  /* ---------- the cast ---------- */
  var CAST = {
    pam: ['Pam', 'Product designer', 'Claude Code', '#F7E8F0'],
    kelly: ['Kelly', 'Customer support', 'Codex', '#FDEAF4'],
    dwight: ['Dwight', 'Sales development', 'Gemini CLI', '#F8F5E5'],
    kevin: ['Kevin', 'QA and test engineer', 'Claude Code', '#E6EFF6'],
    angela: ['Angela', 'Bookkeeper', 'Codex', '#EEECF5'],
    oscar: ['Oscar', 'Research analyst', 'Grok', '#E7F0EB'],
    andy: ['Andy', 'Growth marketer', 'Cursor', '#F4E9E0'],
    jim: ['Jim', 'Account executive', 'Claude Code', '#E6EFF6'],
    ryan: ['Ryan', 'Orchestrator', 'Claude Code', '#FFF3D2'],
    stanley: ['Stanley', 'Operations', 'Qwen', '#F4E9E0'],
    phyllis: ['Phyllis', 'Social media manager', 'Kimi Code', '#EEECF5'],
    meredith: ['Meredith', 'Community manager', 'OpenCode', '#E7F0EB'],
    toby: ['Toby', 'HR and recruiting', 'Copilot CLI', '#ECEAE3'],
    creed: ['Creed', 'Security engineer', 'Codex', '#ECEAE3']
  };
  var WIDE_TEAM = ['pam', 'kelly', 'dwight', 'kevin', 'angela', 'oscar', 'andy', 'jim', 'ryan', 'stanley', 'phyllis', 'meredith', 'toby'];
  var TALL_TEAM = ['pam', 'kelly', 'dwight', 'kevin', 'angela', 'oscar', 'andy', 'jim', 'ryan'];
  function rec(name) { return O.recipeOf(name); }
  function headCanvas(recipe) {
    var buf = A.portraitBufFor(recipe), c = document.createElement('canvas'); c.width = 18; c.height = 20;
    var g = c.getContext('2d'), im = g.createImageData(18, 20); im.data.set(buf.subarray(0, 18 * 20 * 4)); g.putImageData(im, 0, 0);
    c.className = 'pxa'; return c;
  }
  function tile(recipe, tint) { var t = el('span', 'tile'); t.style.background = tint || '#ECEAE3'; t.appendChild(headCanvas(recipe)); return t; }
  function team(names, layout) {
    var n = O.LAYOUTS[layout].desks.length;
    return names.slice(0, n).map(function (nm, i) { return { id: nm, name: CAST[nm][0], recipe: rec(nm), desk: i }; });
  }
  function stLabel(k) { return { 'st-work': 'Working', 'st-ask': 'Asks you', 'st-think': 'Thinking', 'st-idle': 'Idle', 'st-queue': 'Queued' }[k] || 'Idle'; }
  function agentCard(nm, status) {
    var c = CAST[nm], d = el('div', 'acard-in'); d.style.cssText = 'display:contents';
    var who = el('div', 'who', '<div class="r1"><b>' + c[0] + '</b></div><div class="r2"><span class="role">' + c[1] + '</span><span class="eng">' + engHTML(c[2]) + '</span></div>');
    var st = el('span', 'st ' + (status || 'st-idle'), '<i></i>' + stLabel(status || 'st-idle'));
    who.firstChild.appendChild(st);
    d.appendChild(tile(rec(nm), c[3])); d.appendChild(who);
    return { root: d, st: st };
  }
  function setSt(st, kind) { st.className = 'st ' + kind; st.innerHTML = '<i></i>' + stLabel(kind); }

  /* ---------- visibility helper: run a scene only while it is on screen ---------- */
  function whenVisible(node, on, off, margin) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) on(); else if (off) off(); }); }, { rootMargin: margin || '120px 0px' });
    io.observe(node); return io;
  }
  function scale(canvas) { return canvas.getBoundingClientRect().width / canvas.width; }

  (function stars() {
    var box = $('#ghStars'); if (!box) return;
    function short(n) { return n < 1000 ? String(n) : n < 100000 ? (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, '') + 'k' : Math.floor(n / 1000) + 'k'; }
    function show(n) { if (typeof n !== 'number' || !(n >= 0)) return; box.querySelector('b').textContent = short(n); box.hidden = false; box.parentNode.setAttribute('aria-label', 'Munder Difflin on GitHub, ' + n.toLocaleString('en') + ' stars');
      document.querySelectorAll('[data-stars]').forEach(function (b) { b.textContent = short(n); });
      document.querySelectorAll('[data-stars-label]').forEach(function (l) { l.textContent = 'stars on GitHub'; }); }
    var KEY = 'md-gh-stars', c = null;
    try { c = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { }
    if (c && Date.now() - c.t < 30 * 60 * 1000) return show(c.n);
    if (!window.fetch) return;
    fetch('https://api.github.com/repos/chaitanyagiri/munder-difflin', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (!j || typeof j.stargazers_count !== 'number') return; show(j.stargazers_count); try { sessionStorage.setItem(KEY, JSON.stringify({ n: j.stargazers_count, t: Date.now() })); } catch (e) { } })
      .catch(function () { });
  })();
  $$('.lim[data-mark]').forEach(function (l) { l.insertAdjacentHTML('afterbegin', mark(l.dataset.mark)); });
  (function () {
    var a = $('#phBadge'), im = a && a.querySelector('img'); if (!im) return;
    function fallback() { a.innerHTML = '<svg viewBox="0 0 250 54" width="250" height="54" aria-hidden="true"><rect x=".5" y=".5" width="249" height="53" rx="10" fill="#FFFFFF" stroke="#1A1916"/><g transform="translate(13 14)">' + (BR.mini.ph || '').replace('<svg', '<svg width="26" height="26"') + '</g><text x="51" y="21" font-size="9" font-weight="700" letter-spacing=".04em" fill="#6B685F">PRODUCT HUNT</text><text x="50" y="40" font-size="15" font-weight="750" fill="#1A1916">#5 Product of the Day</text></svg>'; a.setAttribute('aria-label', 'Number 5 Product of the Day on Product Hunt'); }
    if (im.complete && !im.naturalWidth) fallback(); else im.addEventListener('error', fallback);
  })();

  /* ---------- reveal ---------- */
  var rio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
  $$('[data-r]').forEach(function (n) { rio.observe(n); });

  /* ---------- downloads and Send to my computer ---------- */
  var DL = { mac: 'Download for Mac', win: 'Download for Windows', linux: 'Download for Linux', phone: 'Send to my computer' };
  $$('[data-dl-label]').forEach(function (s) { s.textContent = s.closest('.nav') ? (OS === 'phone' ? 'Get it' : 'Download') : DL[OS]; });
  var sheet = $('#sendSheet');
  function openSend() {
    var data = { title: 'Munder Difflin', text: 'Download Munder Difflin on my computer', url: 'https://harnessmd.com/download' };
    if (navigator.share) { navigator.share(data).catch(function (e) { if (!e || e.name !== 'AbortError') sheet.classList.add('on'); }); }
    else sheet.classList.add('on');
  }
  if (OS === 'phone') {
    $$('[data-dl]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); openSend(); }); });
    $$('[data-os]').forEach(function (a) { a.hidden = true; });
  }
  $$('[data-send]').forEach(function (b) { if (OS === 'phone') b.hidden = false; b.addEventListener('click', openSend); });
  $('#sendClose').addEventListener('click', function () { sheet.classList.remove('on'); });
  sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.classList.remove('on'); });
  $('#copyLink').addEventListener('click', function () {
    var b = this; var done = function () { b.textContent = 'Copied. Paste it on your computer.'; setTimeout(function () { b.textContent = 'Copy the link'; }, 2400); };
    if (navigator.clipboard) navigator.clipboard.writeText('https://harnessmd.com/download').then(done, done); else done();
  });

  /* ---------- magnetic buttons ---------- */
  if (HOVER && !RM) $$('[data-mag]').forEach(function (b) {
    b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .16).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .24).toFixed(1) + 'px)'; });
    b.addEventListener('pointerleave', function () { b.style.transform = ''; });
  });

  /* ---------- nav, progress and the little walker ---------- */
  var nav = $('#nav'), fill = $('#progFill'), walker = $('#walker'), wcv = document.createElement('canvas');
  wcv.width = 18; wcv.height = 32; wcv.className = 'pxa'; walker.appendChild(wcv);
  var wspr = O.sprites(rec('jim')), wg = wcv.getContext('2d'), lastY = 0, walked = 0;
  function drawWalker(ph) { wg.clearRect(0, 0, 18, 32); wg.drawImage(wspr.front[ph], 0, 0); }
  drawWalker(0);

  /* ---------- dark mode: Stapler's menu switches it, the choice is remembered ---------- */
  window.__dark = function (on) {
    if (on) document.documentElement.setAttribute('data-theme', 'dark'); else document.documentElement.removeAttribute('data-theme');
    var ph = document.querySelector('#phBadge img'); if (ph) ph.src = ph.src.replace(/theme=(light|dark)/, 'theme=' + (on ? 'dark' : 'light'));
    try { localStorage.setItem('md-dark', on ? '1' : '0'); } catch (e) { }
    var b = $('#darkBtn'), l = $('#darkLbl'); if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false'); if (l) l.textContent = on ? 'Back to light mode' : 'We have a dark mode as well';
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', on ? '#141311' : '#F5F4EF');
    dispatchEvent(new Event('scroll'));
  };
  window.__dark(document.documentElement.getAttribute('data-theme') === 'dark');

  /* ---------- menu: the section links in a dropdown ---------- */
  var menu = $('#menu'), menuBtn = $('#menuBtn'), menuY = 0;
  function setMenu(open, back) {
    if (menu.classList.contains('open') === open) return;
    menu.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      menuY = scrollY; nav.classList.remove('hide');
      $$('#navMenu a[href^="#"]').forEach(function (a) { var on = a.getAttribute('href') === '#' + curSec; a.classList.toggle('cur', on); if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    }
    if (!open && back) menuBtn.focus();
  }
  menuBtn.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
  $$('#navMenu a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('click', function (e) { if (!menu.contains(e.target)) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false, true); });
  menu.addEventListener('focusout', function (e) { if (e.relatedTarget && !menu.contains(e.relatedTarget)) setMenu(false); });

  /* ---------- the hero ---------- */
  (function hero() {
    $$('.hav').forEach(function (h, i) {
      var c = O.portrait(rec(h.dataset.cast)); c.style.setProperty('--bd', (-i * .7) + 's'); h.appendChild(c);
      var say = el('span', 'say', h.dataset.say); h.appendChild(say);
      setTimeout(function () { h.classList.add('in'); }, 250 + i * 200);
      h.addEventListener('click', function () { h.classList.add('talk'); setTimeout(function () { h.classList.remove('talk'); }, 2000); });
    });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { document.body.classList.add('ready'); });

    var layout = SMALL ? 'tall' : 'wide', names = SMALL ? TALL_TEAM : WIDE_TEAM;
    var cv = $('#heroMap'), scene = new O.Scene(cv, { layout: layout, theme: 'office', agents: team(names, layout), time: 11, seed: 3 });
    var frame = $('#heroFrame');
    // side list
    var side = $('#sideAgents'), dots = {};
    ['ryan', 'pam', 'kelly', 'dwight', 'kevin', 'angela', 'oscar'].forEach(function (nm) {
      var c = CAST[nm], r = el('div', 'arow');
      r.appendChild(tile(rec(nm), c[3]));
      r.appendChild(el('div', 'who', '<b>' + c[0] + '</b><span>' + c[1] + ' · ' + c[2] + '</span>'));
      var d = el('i', 'dot' + (nm === 'ryan' || nm === 'oscar' ? ' work' : '')); r.appendChild(d); dots[nm] = d; side.appendChild(r);
    });
    // floating agent card
    var fa = $('#fAgent'), card = agentCard('pam', 'st-idle'); fa.appendChild(card.root);

    // speech near an agent on the map
    function sayOnMap(id, text, ms) {
      var f = scene.feet(id); if (!f) return;
      var k = scale(cv), b = el('div', 'mapsay', text), fr = frame.getBoundingClientRect(), cr = cv.getBoundingClientRect();
      b.style.left = (cr.left - fr.left + f.x * k) + 'px'; b.style.top = (cr.top - fr.top + f.head * k) + 'px';
      frame.appendChild(b); requestAnimationFrame(function () { b.classList.add('on'); });
      setTimeout(function () { b.classList.remove('on'); setTimeout(function () { b.remove(); }, 300); }, ms || 2000);
    }
    // click an agent: their card
    var mc = null;
    frame.addEventListener('click', function (e) {
      var r = cv.getBoundingClientRect(), k = scale(cv), id = scene.hit((e.clientX - r.left) / k, (e.clientY - r.top) / k);
      if (mc) { mc.remove(); mc = null; }
      if (!id || !CAST[id]) return;
      var f = scene.feet(id), fr = frame.getBoundingClientRect();
      mc = el('div', 'mapcard card acard'); var ac = agentCard(id, dots[id] && dots[id].classList.contains('work') ? 'st-work' : 'st-think'); mc.appendChild(ac.root);
      mc.style.left = clamp(r.left - fr.left + f.x * k, 150, fr.width - 150) + 'px'; mc.style.top = (r.top - fr.top + f.head * k) + 'px';
      frame.appendChild(mc); requestAnimationFrame(function () { mc && mc.classList.add('on'); });
      scene.bubble(id, 'heart', 1.6);
      var m = mc; setTimeout(function () { if (m === mc) { m.classList.remove('on'); setTimeout(function () { m.remove(); }, 300); mc = null; } }, 2600);
    });

    // the composer script
    var to = $('#compTo'), txt = $('#compTxt'), send = $('#compSend'), bell = $('#bell'), fask = $('#fAsk'), live = false, loopOn = false;
    var SCRIPT = [
      { to: 'pam', text: 'make the launch hero pop, light and dark', reply: 'On it', ask: { q: 'Ship the light hero or the dark one first?', o: ['Light', 'Dark'] } },
      { to: 'kelly', text: 'answer the new tickets, drafts only', reply: 'Drafting now' },
      { to: 'pam', text: 'and a version for phones', reply: 'Next up', queued: true },
      { to: 'dwight', text: 'research the accounts for Monday', reply: 'Already on it' },
      { to: 'angela', text: 'match last month\'s payments to invoices', reply: 'Reconciling', ask: { q: 'Two invoices have no payment yet. Flag them?', o: ['Flag them', 'Wait a week'] } }
    ];
    function flyEnvelope(fromEl, id) {
      return new Promise(function (done) {
        var f = scene.feet(id); if (!f) return done();
        var a = fromEl.getBoundingClientRect(), r = cv.getBoundingClientRect(), k = scale(cv);
        var x0 = a.left + a.width / 2 - 14, y0 = a.top - 10, x1 = r.left + f.x * k - 14, y1 = r.top + f.head * k - 20;
        var env = el('div', 'env', '<svg viewBox="0 0 28 20"><rect x=".5" y=".5" width="27" height="19" rx="2" fill="#FFF8E7" stroke="#26222E"/><path d="M1 1l13 10L27 1" fill="none" stroke="#26222E"/><rect x="11" y="9" width="6" height="4" fill="#FFC94F"/></svg>');
        document.body.appendChild(env);
        if (RM) { env.remove(); return done(); }
        var t0 = performance.now(), D = 720;
        (function step(now) {
          var p = clamp((now - t0) / D, 0, 1), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          var x = lerp(x0, x1, e), y = lerp(y0, y1, e) - Math.sin(p * Math.PI) * 120;
          env.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + ((1 - p) * -18) + 'deg) scale(' + (1 - p * .35) + ')';
          if (p < 1) requestAnimationFrame(step); else { env.remove(); done(); }
        })(t0);
      });
    }
    async function runScript() {
      if (loopOn) return; loopOn = true;
      var i = 0;
      while (true) {
        if (!live) { await wait(400); continue; }
        var s = SCRIPT[i % SCRIPT.length], c = CAST[s.to];
        to.innerHTML = ''; to.appendChild(headCanvas(rec(s.to))); to.appendChild(el('b', '', '@' + c[0]));
        txt.classList.remove('ph'); txt.textContent = '';
        for (var k = 0; k < s.text.length; k++) { txt.textContent = s.text.slice(0, k + 1); await wait(RM ? 0 : 34); }
        await wait(420);
        send.classList.remove('go'); void send.offsetWidth; send.classList.add('go');
        var busy = s.queued;
        await flyEnvelope(send, s.to);
        txt.classList.add('ph'); txt.textContent = 'Message any agent. Enter sends.'; to.innerHTML = '';
        if (busy) { to.appendChild(el('span', 'st st-queue', '<i></i>Queued')); }
        scene.bubble(s.to, 'mail', 1.2);
        if (dots[s.to]) dots[s.to].className = 'dot work';
        if (s.to === 'pam') setSt(card.st, 'st-work');
        setTimeout(function (id, rep) { sayOnMap(id, rep, 1800); scene.bubble(id, 'dots', 4); }, 500, s.to, s.reply);
        if (s.ask) {
          await wait(2600);
          scene.bubble(s.to, 'ask', 4); bell.classList.add('on'); if (dots[s.to]) dots[s.to].className = 'dot asking';
          if (s.to === 'pam') setSt(card.st, 'st-ask');
          fask.hidden = false; fask.innerHTML = '';
          var h = el('div', 'ask-h', '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v5M10 13.5v.5"/></svg>' + c[0] + ' asks you');
          var p = el('p', '', s.ask.q), opts = el('div', 'opts');
          var picked = null, waitPick = new Promise(function (res) {
            s.ask.o.forEach(function (o) { var b = el('button', '', o); b.type = 'button'; b.addEventListener('click', function () { picked = b; res(); }); opts.appendChild(b); });
            setTimeout(res, 3400);
          });
          fask.appendChild(h); fask.appendChild(p); fask.appendChild(opts);
          fask.classList.remove('pop'); void fask.offsetWidth; fask.classList.add('pop');
          await waitPick; (picked || opts.firstChild).classList.add('pick');
          await wait(700);
          fask.innerHTML = '<div class="toast" style="padding:0"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5l4 4L16 6"/></svg>Answer sent to ' + c[0] + '</div>';
          bell.classList.remove('on'); if (dots[s.to]) dots[s.to].className = 'dot work'; if (s.to === 'pam') setSt(card.st, 'st-work');
          scene.bubble(s.to, 'check', 2);
          await wait(1500); fask.hidden = true;
        }
        await wait(busy ? 1400 : 1900);
        to.innerHTML = '';
        i++;
      }
    }
    whenVisible($('#stagewrap'), function () { live = true; if (!RM) scene.start(); else scene.draw(); runScript(); }, function () { live = false; scene.stop(); });

    // depth: the window tilts flat as you scroll; the cards drift at their own speeds
    var app = $('#app'), sw = $('#stagewrap'), mx = 0, my = 0;
    if (HOVER && !RM) document.querySelector('.hero').addEventListener('pointermove', function (e) { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
    window.__heroTick = function () {
      if (RM) return;
      var r = sw.getBoundingClientRect(), p = clamp(1 - (r.top - innerHeight * .25) / (innerHeight * .75), 0, 1);
      var rx = lerp(14, 0, p) + my * -2.5, ry = mx * 3.5, sc = lerp(.93, 1, p);
      app.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      var y = r.top;
      fa.style.transform = 'translate(' + (mx * -18).toFixed(1) + 'px,' + ((1 - p) * 60 + my * -12 + y * -.06).toFixed(1) + 'px)';
      fask.style.transform = 'translate(' + (mx * 22).toFixed(1) + 'px,' + ((1 - p) * 90 + my * 14 + y * .04).toFixed(1) + 'px)';
    };
  })();

  /* ---------- team ---------- */
  (function teamSection() {
    var NAMES = ['Nova', 'Remy', 'Juno', 'Kai', 'Ivy', 'Otis', 'Mila', 'Theo', 'Zara', 'Leo', 'Ada', 'Rio', 'Wren', 'Arlo', 'Nell', 'Sol', 'Bea', 'Ezra'];
    var ROLES = [
      ['Product designer', 'You own how a screen works and reads. You build three directions as real pages, check each by keyboard and at each size, and hand back one pick with reasons.'],
      ['Research analyst', 'You own the facts behind a decision. You read each source yourself and hand back a brief where every claim has a source you opened.'],
      ['Executive assistant', "You own one person's inbox, calendar and task list. You sort what came in, draft replies in their voice, and hand back a short briefing before each meeting."],
      ['Customer support', 'You own the support queue. You sort each ticket, reproduce the problem in a browser, and hand back a draft reply with the facts checked.'],
      ['Growth marketer', 'You own the funnel numbers. You find the biggest leak, write one test with its measure and its stop rule, and hand back the result with the query.'],
      ['Bookkeeper', 'You own the books. You sort each transaction, match the bank, card and payment balances, and hand back the month with every gap listed.']
    ];
    var ENGS = ['Claude Code', 'Codex', 'Gemini CLI', 'Grok', 'Cursor', 'Copilot CLI'];
    var TINTS = ['#F7E8F0', '#E6EFF6', '#F8F5E5', '#EEECF5', '#E7F0EB', '#F4E9E0', '#FFF3D2'];
    var faces = $('#faces'), roles = $('#roles'), engs = $('#engs'), big = $('#pvBig'), seed = 40;
    var pool = ['pam', 'jim', 'kelly', 'oscar', 'angela', 'andy', 'phyllis', 'stanley', 'meredith', 'kevin', 'toby', 'creed'].map(function (n) { return { name: CAST[n][0], recipe: rec(n) }; });
    for (var i = 0; i < 3; i++) pool.push({ name: NAMES[i], recipe: A.presetRecipe(i + 2) });
    var state = { face: 0, role: 0, eng: 0, tint: TINTS[0] };
    function drawFaces(roll) {
      faces.innerHTML = '';
      var dice = el('button', 'face dice', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/><circle cx="15" cy="9" r="1.2" fill="currentColor"/><circle cx="9" cy="15" r="1.2" fill="currentColor"/></svg>');
      dice.type = 'button'; dice.setAttribute('aria-label', 'Shuffle the faces'); dice.addEventListener('click', shuffle); faces.appendChild(dice);
      pool.forEach(function (p, i) {
        var b = el('button', 'face' + (i === state.face ? ' on' : '') + (roll ? ' roll' : '')); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-label', p.name);
        b.style.animationDelay = (i * 25) + 'ms';
        var c = O.portrait(p.recipe); c.style.animationDelay = (i * 22) + 'ms'; b.appendChild(c);
        b.addEventListener('click', function () { state.face = i; state.tint = TINTS[i % TINTS.length]; $$('.face', faces).forEach(function (f) { f.classList.remove('on'); }); b.classList.add('on'); preview(true); });
        faces.appendChild(b);
      });
    }
    function shuffle() {
      pool = pool.map(function (p, i) { seed += 7; return { name: NAMES[(seed + i) % NAMES.length], recipe: A.randomRecipe(seed * 131 + i) }; });
      state.face = 0; drawFaces(true); preview(true);
    }
    function seg(host, list, key) {
      host.innerHTML = '';
      list.forEach(function (l, i) {
        var b = el('button', i === state[key] ? 'on' : '', key === 'eng' ? engHTML(l) : Array.isArray(l) ? l[0] : l); b.type = 'button'; b.setAttribute('role', 'radio');
        b.addEventListener('click', function () { state[key] = i; $$('button', host).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); preview(false); });
        host.appendChild(b);
      });
      if (key === 'eng') { var more = el('span', 'chip', 'and six more'); more.style.height = '34px'; host.appendChild(more); }
    }
    function preview(pop) {
      var p = pool[state.face];
      big.innerHTML = ''; big.style.background = state.tint; big.appendChild(O.portrait(p.recipe));
      if (pop) { big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop'); }
      $('#pvName').textContent = p.name; $('#pvRole').textContent = ROLES[state.role][0]; $('#pvEng').innerHTML = engHTML(ENGS[state.eng]);
      $('#roleText').textContent = ROLES[state.role][1];
      $('#hire').textContent = 'Hire ' + p.name;
    }
    drawFaces(false); seg(roles, ROLES, 'role'); seg(engs, ENGS, 'eng'); preview(false);

    // the strip: a small office the hires walk into
    var cv = $('#stripMap'), scene = new O.Scene(cv, { layout: 'strip', theme: 'office', agents: [{ id: 'ryan', name: 'Ryan', recipe: rec('ryan'), desk: 0 }, { id: 'pam', name: 'Pam', recipe: rec('pam'), desk: 1 }], time: 11, seed: 9 });
    var order = ['ryan', 'pam'], hires = 0, cap = $('#stripCap'), hiring = false;
    function capText() { cap.textContent = 'Your office · ' + order.length + (order.length === 1 ? ' agent' : ' agents'); }
    capText();
    whenVisible(cv, function () { if (!RM) scene.start(); }, function () { scene.stop(); });
    $('#hire').addEventListener('click', function () {
      if (hiring) return; hiring = true; setTimeout(function () { hiring = false; }, RM ? 0 : 700);
      scene.agents = scene.agents.filter(function (a) { return !(a.hidden && order.indexOf(a.id) < 0); });
      var p = pool[state.face], id = 'h' + (++hires), used = scene.agents.filter(function (a) { return !a.hidden && a.then !== 'gone'; }).map(function (a) { return a.desk; });
      var desk = -1; for (var d = 0; d < 5; d++) if (used.indexOf(d) < 0) { desk = d; break; }
      var go = function (dk) {
        scene.add({ id: id, name: p.name, recipe: p.recipe, desk: dk }, { enter: true });
        setTimeout(function () { scene.bubble(id, 'heart', 2); }, 1600);
      };
      // the card flies to the door
      var from = big.getBoundingClientRect(), r = cv.getBoundingClientRect(), k = scale(cv);
      var fly = el('div', 'flyer'); fly.appendChild(O.portrait(p.recipe, 3)); document.body.appendChild(fly);
      var tx = r.left + (O.LAYOUTS.strip.door.x * 16 + 16) * k - 27, ty = r.top + 8 * k;
      if (RM) { fly.remove(); }
      else {
        var t0 = performance.now();
        (function step(now) {
          var q = clamp((now - t0) / 650, 0, 1), e = 1 - Math.pow(1 - q, 3);
          fly.style.transform = 'translate(' + lerp(from.left + 9, tx, e) + 'px,' + (lerp(from.top, ty, e) - Math.sin(q * Math.PI) * 90) + 'px) scale(' + (1 - q * .5) + ')';
          if (q < 1) requestAnimationFrame(step); else { fly.remove(); burst(tx + 27, ty + 20); }
        })(t0);
      }
      if (desk < 0) { var old = order.shift(), oa = scene.get(old); desk = oa ? oa.desk : 0; scene.leave(old); }
      order.push(id); capText();
      setTimeout(function () { go(desk); }, RM ? 0 : 600);
      // next face, so the next hire is someone new
      state.face = (state.face + 1) % pool.length; state.tint = TINTS[state.face % TINTS.length];
      $$('.face', faces).forEach(function (f, i) { f.classList.toggle('on', i - 1 === state.face); });
      preview(true);
    });
  })();
  function burst(x, y) {
    if (RM) return;
    var cols = ['#FFC94F', '#E060A8', '#4F9FD9', '#3F8F5E', '#E0803A', '#9482D3'];
    for (var i = 0; i < 18; i++) (function (i) {
      var b = el('i', 'burst'); b.style.background = cols[i % cols.length]; document.body.appendChild(b);
      var a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 80, t0 = performance.now();
      (function step(now) {
        var t = (now - t0) / 700; if (t >= 1) return b.remove();
        b.style.transform = 'translate(' + (x + Math.cos(a) * v * t) + 'px,' + (y + Math.sin(a) * v * t + 120 * t * t) + 'px)'; b.style.opacity = 1 - t;
        requestAnimationFrame(step);
      })(t0);
    })(i);
  }

  /* ---------- engines ---------- */
  (function engines() {
    var E = ['claude', 'codex', 'gemini', 'grok', 'copilot', 'cursor', 'antigravity', 'kimi', 'qwen', 'opencode', 'crush', 'pi'], NAME = { copilot: 'Copilot CLI' };
    var m = $('#marq');
    function card(k) {
      var e = BR.engines[k], c = el('div', 'ecard'); if (!e) return c;
      c.style.cssText = '--e-bg:' + e.bg + ';--e-fg:' + e.fg + ';--e-sub:' + e.sub + ';--e-chip:' + e.chip;
      c.innerHTML = '<div class="top"><span class="logo">' + uniq(e.logo) + '</span><span class="sig"><i></i>Signed in</span></div><div><div class="nm">' + (NAME[k] || e.name) + '</div><div class="pl">' + e.plan + '</div></div>';
      return c;
    }
    function row(list, rev, dur) {
      var r = el('div', 'mrow' + (rev ? ' rev' : '')); r.style.setProperty('--dur', dur + 's');
      list.concat(list).forEach(function (k) { r.appendChild(card(k)); });
      return r;
    }
    m.appendChild(row(E.slice(0, 6).concat(E.slice(6, 9)), false, SMALL ? 40 : 56));
    m.appendChild(row(E.slice(6).concat(E.slice(0, 3)), true, SMALL ? 46 : 64));
  })();

  /* ---------- simulations: every tile is a loop recorded in the app (0.5.8). A tile plays only while on screen;
     with reduced motion it keeps its poster. A tile whose poster is missing hides itself, and the Build your own
     tile widens to close the row, so the page never shows an empty tile. ---------- */
  (function simulations() {
    var grid = $('#sims'); if (!grid) return;
    var tiles = $$('.sim[data-sim]', grid);
    function fit() {
      var n = tiles.filter(function (t) { return !t.hidden; }).length;
      grid.style.setProperty('--byo3', 'span ' + (3 - n % 3)); grid.style.setProperty('--byo2', 'span ' + (2 - n % 2));
    }
    tiles.forEach(function (t) {
      var img = $('img', t), v = $('video', t);
      function gone() { t.hidden = true; fit(); }
      img.addEventListener('error', gone);
      if (img.complete && !img.naturalWidth && img.getAttribute('src')) gone();
      v.muted = true;
      v.addEventListener('playing', function () { t.classList.add('live'); });
      v.addEventListener('error', function () { t.classList.remove('live'); });
      if (RM) return;
      whenVisible(t, function () {
        if (t.hidden) return;
        if (!v.getAttribute('src')) v.src = v.dataset.src;
        var p = v.play(); if (p && p.catch) p.catch(function () { });
      }, function () { if (!v.paused) v.pause(); });
    });
    fit();
    // Build your own: shows the steps an agent takes in the app, from the one line typed here
    var input = $('#tprompt'), steps = $('#tsteps'), PH = ['on a beach', 'in a ski cabin', 'in a submarine lab', 'in a night market', 'on a farm'], phi = 0, building = false;
    setInterval(function () { if (document.activeElement !== input && !input.value) { phi = (phi + 1) % PH.length; input.placeholder = PH[phi]; } }, 2200);
    async function build() {
      if (building) return; building = true;
      steps.innerHTML = '';
      var L = ['Reading The Office', 'Drawing the room', 'Drawing the cast', 'Writing their lines', 'Checking it works'];
      for (var i = 0; i < L.length; i++) {
        var c = el('span', 'chip', '<i style="color:var(--blue)"></i>' + L[i]); steps.appendChild(c);
        requestAnimationFrame(function (c) { return function () { c.classList.add('in'); }; }(c));
        await wait(RM ? 0 : 420); c.classList.add('done'); c.querySelector('i').style.color = 'var(--ok)';
      }
      var note = el('span', 'note', 'In the app, an agent builds it from that one line.');
      steps.appendChild(note); requestAnimationFrame(function () { note.classList.add('in'); });
      building = false;
    }
    $('#tbuild').addEventListener('click', build);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') build(); });
  })();

  /* ---------- yours: the whole office is a folder of plain files on your computer (round 13) ---------- */
  (function local() {
    var scr = $('#memScreen'), tree = $('#fwTree'); if (!scr || !tree) return;
    var nameEl = $('#fwName'), text = $('#fwText'), saved = $('#fwSaved'), menu = $('#fwMenu'), cap = $('#fwCap'), capT = $('#fwCapT'), lock = $('#fwLock'), drive = $('#fwDrive'), dlabel = $('#fwDriveL'), fold = $('#fwFold');
    var CHEV = '<svg class="tw" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 2l3 3-3 3"/></svg>';
    var IC = {
      dir: '<svg class="ic" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2 5.2C2 4.5 2.5 4 3.2 4h4.1l1.9 1.9h7.6c.7 0 1.2.5 1.2 1.2v7.7c0 .7-.5 1.2-1.2 1.2H3.2C2.5 16 2 15.5 2 14.8z"/></svg>',
      file: '<svg class="ic" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M5 2.5h7l3.5 3.5v11.5H5z"/><path d="M12 2.5V6h3.5"/></svg>'
    };
    // the real shape of an office folder: board and tasks at the top, one folder per agent with its memory, handoff and inbox
    var ROWS = [['board', 0, 'file', 'board.md'], ['tasks', 0, 'file', 'tasks.json'], ['agents', 0, 'dir', 'agents', 1],
      ['pam', 1, 'agent', 'pam', 0], ['kelly', 1, 'agent', 'kelly', 1], ['kmem', 2, 'file', 'memory.md'], ['khand', 2, 'file', 'handoff.md'],
      ['dwight', 1, 'agent', 'dwight', 1], ['dmem', 2, 'file', 'memory.md'], ['inbox', 2, 'dir', 'inbox', 1], ['mail', 3, 'file', 'from-pam.json'], ['shared', 0, 'dir', 'shared', 0]];
    var row = {};
    ROWS.forEach(function (r) {
      var e = el('div', 'fw-row' + (r[2] === 'file' ? '' : r[4] ? ' open' : ''), (r[2] === 'file' ? '<span class="tw"></span>' : CHEV) + (r[2] === 'agent' ? '' : IC[r[2]]) + '<span class="nm">' + r[3] + '</span>');
      if (r[2] === 'agent') e.insertBefore(tile(rec(r[0]), CAST[r[0]][3]), e.children[1]);
      e.style.setProperty('--d', r[1]); tree.appendChild(e); row[r[0]] = e;
    });
    var K = function (k) { return '<span class="k">"' + k + '"</span>'; }, S = function (v, id) { return '<span class="s"' + (id ? ' id="' + id + '"' : '') + '>"' + v + '"</span>'; };
    var DOC = {
      kmem: ['agents/kelly/memory.md', ['<span class="h"># Kelly, customer support</span>', '- Refunds go through Pam first.', '- Customers like short replies.']],
      mail: ['agents/dwight/inbox/from-pam.json', ['{', '  ' + K('from') + ': ' + S('pam') + ',', '  ' + K('to') + ': ' + S('dwight') + ',', '  ' + K('work') + ': ' + S('invoice-bug') + ',', '  ' + K('body') + ': ' + S('Can you take the invoice bug today?'), '}']],
      tasks: ['tasks.json', ['[', '  { ' + K('id') + ': ' + S('invoice-bug') + ',', '    ' + K('owner') + ': ' + S('dwight') + ',', '    ' + K('status') + ': ' + S('todo', 'fwSt') + ' }', ']']]
    };
    var ADD = '- Dark mode requests come mostly from design teams.';
    var on = false;
    function sel(k) { Object.keys(row).forEach(function (x) { row[x].classList.toggle('sel', x === k); }); }
    function show(k) { nameEl.textContent = DOC[k][0]; text.innerHTML = DOC[k][1].map(function (l) { return '<div>' + l + '</div>'; }).join(''); }
    async function hold(ms) { var t = 0; while (t < ms) { await wait(100); if (on) t += 100; } }
    async function flash(k) { saved.classList.add('on'); row[k].classList.add('edited'); await hold(900); saved.classList.remove('on'); }
    async function say(t) { cap.classList.add('out'); await wait(260); capT.textContent = t; cap.classList.remove('out'); }
    async function kelly() {
      sel('kmem'); show('kmem'); await hold(500);
      var line = el('div', 'add'); text.appendChild(line);
      for (var i = 1; i <= ADD.length; i++) { line.innerHTML = ADD.slice(0, i) + '<i class="cur"></i>'; await wait(24); }
      line.textContent = ADD; await flash('kmem');
    }
    async function mail() {
      row.mail.style.display = ''; row.mail.classList.remove('new'); void row.mail.offsetWidth; row.mail.classList.add('new');
      await hold(400); sel('mail'); show('mail'); await flash('mail');
    }
    async function tasks() { sel('tasks'); show('tasks'); await hold(900); var st = $('#fwSt'); st.textContent = '"doing"'; st.classList.add('chg'); await flash('tasks'); }
    async function open() {
      var items = $$('span', menu); menu.classList.add('on');
      for (var i = 0; i < items.length; i++) { items.forEach(function (it, j) { it.classList.toggle('hi', j === i); }); await hold(450); }
      await hold(300); menu.classList.remove('on'); items.forEach(function (it) { it.classList.remove('hi'); });
    }
    async function copy() {
      drive.classList.add('on'); dlabel.textContent = 'Backup drive'; await hold(500);
      var a = fold.getBoundingClientRect(), b = $('.dv', drive).getBoundingClientRect(), s = scr.getBoundingClientRect();
      var g = el('div', 'fw-ghost', IC.dir); g.style.left = (a.left - s.left) + 'px'; g.style.top = (a.top - s.top) + 'px'; scr.appendChild(g);
      var dx = b.left + b.width / 2 - a.left - 9, dy = b.top + b.height / 2 - a.top - 9;
      await new Promise(function (res) { g.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + dx * .5 + 'px,' + (dy * .5 - 30) + 'px) scale(1.5)', opacity: 1, offset: .55 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.7)', opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = res; });
      g.remove(); dlabel.textContent = 'Copied'; drive.classList.add('done'); await hold(1300); drive.classList.remove('on', 'done');
    }
    async function guard() { lock.classList.add('glow'); await hold(1800); lock.classList.remove('glow'); }
    var STEPS = [
      ['Kelly learned something. It is saved in a file on your computer.', kelly],
      ['Pam asked Dwight for help. The message is a file too.', mail],
      ['Tasks and the board are plain files as well.', tasks],
      ['Open any of it in any app you like. No lock in.', open],
      ['Copy the folder to back it up, or to move to a new computer.', copy],
      ['Private and secure: your whole office stays on your disk.', guard]
    ];
    function reset() { row.mail.style.display = 'none'; Object.keys(row).forEach(function (x) { row[x].classList.remove('edited'); }); }
    if (RM) { sel('kmem'); show('kmem'); text.appendChild(el('div', 'add', ADD)); capT.textContent = 'Your whole office is plain files on your computer: private, yours, and easy to move.'; return; }
    reset(); sel('kmem'); show('kmem'); capT.textContent = STEPS[0][0];
    async function loop() {
      while (true) {
        for (var i = 0; i < STEPS.length; i++) { while (!on) await wait(300); await say(STEPS[i][0]); await STEPS[i][1](); await hold(1400); }
        reset();
      }
    }
    var started = false;
    whenVisible(scr, function () { on = true; if (!started) { started = true; loop(); } }, function () { on = false; }, '0px');
  })();

  /* ---------- sandbox: one glass office, your files outside it ---------- */
  (function sandbox() {
    var cv = $('#sbxMap'), glass = $('#glass'), nope = $('#nope'); if (!cv) return;
    var scene = new O.Scene(cv, { layout: 'box', theme: 'office', agents: team(['kevin', 'creed', 'andy', 'meredith', 'oscar'], 'box'), time: 11, seed: 21 });
    cv.__scene = scene; // read by the page checks in landing-059-src/check.cjs
    // your things, drawn as pixel art: filing cabinets, folders and files
    var OUT = '#26222E';
    function px(w, h, rects, sc) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w * sc + '" height="' + h * sc + '" aria-hidden="true">' + rects.map(function (r) { return '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '" fill="' + r[4] + '"/>'; }).join('') + '</svg>'; }
    function cabinet() { var r = [[0, 0, 14, 20, OUT], [1, 1, 12, 18, '#B8BEC6'], [1, 1, 12, 1, '#DDE2E7']]; for (var i = 0; i < 3; i++) { r.push([2, 2 + i * 6, 10, 5, '#CBD0D7'], [2, 6 + i * 6, 10, 1, '#99A0AA'], [5, 4 + i * 6, 4, 1, OUT], [6, 3 + i * 6, 2, 1, '#FFFFFF']); } return px(14, 20, r, 3); }
    function folder(c, hi) { return px(16, 13, [[0, 1, 7, 12, OUT], [0, 3, 16, 10, OUT], [1, 2, 5, 2, c], [1, 4, 14, 8, hi], [1, 4, 14, 1, '#FFF3D2'], [1, 11, 14, 1, c]], 3); }
    function doc(c) { return px(12, 15, [[0, 0, 12, 15, OUT], [1, 1, 10, 13, '#FFFFFF'], [8, 1, 3, 3, '#D6DCE3'], [2, 5, 8, 1, '#B8BEC6'], [2, 7, 8, 1, '#B8BEC6'], [2, 9, 5, 1, '#B8BEC6'], [2, 11, 4, 2, c]], 3); }
    var L = [['Filing cabinet', cabinet()], ['Documents', folder('#D9A23A', '#F6C453')], ['Photos', folder('#3F8FC0', '#7DB9E6')]];
    var R = [['Finances.xlsx', doc('#3F8F5E')], ['Contracts.pdf', doc('#E0803A')], ['Archive', cabinet()]];
    function fill(host, list) { list.forEach(function (it) { host.appendChild(el('div', 'it', it[1] + '<span>' + it[0] + '</span>')); }); }
    fill($('#stuffL'), L); fill($('#stuffR'), R);
    var LINES = ['Nope. Glass.', 'Not my folder.', 'This is my box.'], li = 0, lastBump = 0, held = null, auto = true;
    var LIM = { x0: 14, x1: cv.width - 14, y0: 44, y1: cv.height - 6 };
    // past the edge an agent stretches a few pixels, then stops: the glass
    function band(v, lo, hi) { var D = 5; if (v < lo) return lo - D * (1 - 1 / ((lo - v) / (D * 2) + 1)); if (v > hi) return hi + D * (1 - 1 / ((v - hi) / (D * 2) + 1)); return v; }
    function at(e) { var r = cv.getBoundingClientRect(), k = r.width / cv.width; return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; }
    function bump(side) {
      var now = performance.now(); if (now - lastBump < 1100) return; lastBump = now;
      nope.textContent = LINES[li++ % LINES.length];
      glass.classList.remove('bump'); void glass.offsetWidth; glass.classList.add('bump'); setTimeout(function () { glass.classList.remove('bump'); }, 1000);
      var host = side === 'l' ? $('#stuffL') : side === 'r' ? $('#stuffR') : null;
      if (host) { var it = host.children[Math.floor(Math.random() * host.children.length)]; it.classList.remove('shake'); void it.offsetWidth; it.classList.add('shake'); }
    }
    function moveTo(id, wx, wy) {
      scene.hold(id, band(wx, LIM.x0, LIM.x1), band(wy, LIM.y0, LIM.y1));
      if (!scene.running) scene.draw();
      if (wx < LIM.x0 - 10) bump('l'); else if (wx > LIM.x1 + 10) bump('r'); else if (wy < LIM.y0 - 10 || wy > LIM.y1 + 10) bump('t');
    }
    cv.addEventListener('pointerdown', function (e) {
      var p = at(e), id = scene.hit(p.x, p.y); if (!id) return;
      e.preventDefault(); auto = false;
      var a = scene.grab(id); if (!a) return;
      held = { id: id, ox: a.fx - p.x, oy: a.fy - p.y }; cv.setPointerCapture(e.pointerId); cv.classList.add('held');
      if (!scene.running) scene.start();
    });
    cv.addEventListener('pointermove', function (e) {
      var p = at(e);
      if (!held) { if (HOVER) cv.classList.toggle('can', !!scene.hit(p.x, p.y)); return; }
      moveTo(held.id, p.x + held.ox, p.y + held.oy);
    });
    function release() { if (!held) return; scene.drop(held.id); held = null; cv.classList.remove('held'); }
    cv.addEventListener('pointerup', release); cv.addEventListener('pointercancel', release);
    // once, when it first shows: someone tries to carry Andy out to your files
    function demo() {
      if (RM || !auto) return; auto = false;
      var id = 'andy', a = scene.grab(id); if (!a) return;
      var x0 = a.fx, y0 = a.fy, x1 = cv.width + 40, t0 = performance.now(), D = 1300;
      (function step(now) {
        var q = clamp((now - t0) / D, 0, 1), e = q < .5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
        moveTo(id, lerp(x0, x1, e), y0 - 4 - Math.sin(q * Math.PI) * 10);
        if (q < 1) requestAnimationFrame(step); else setTimeout(function () { scene.drop(id); }, 650);
      })(t0);
    }
    whenVisible(glass, function () { if (!RM) scene.start(); else scene.draw(); setTimeout(demo, 1400); }, function () { scene.stop(); }, '0px');
  })();

  /* ---------- plug and play ---------- */
  (function plug() {
    var C = [['slack', 'Slack'], ['gmail', 'Gmail'], ['gcal', 'Google Calendar'], ['gdrive', 'Google Drive'], ['github', 'GitHub'], ['notion', 'Notion'], ['linear', 'Linear'], ['atlassian', 'Atlassian'],
      ['hubspot', 'HubSpot'], ['stripe', 'Stripe'], ['sentry', 'Sentry'], ['figma', 'Figma'], ['supabase', 'Supabase'], ['brave', 'Brave Search'], ['canva', 'Canva'], ['airtable', 'Airtable']];
    var SAY = { Slack: 'Kelly can answer in your Slack threads now.', Gmail: 'Kelly can read the support inbox and draft replies.', 'Google Calendar': 'Kelly can see when a customer call is booked.', 'Google Drive': 'Kelly can find the policy docs in your Drive.', GitHub: 'Kelly can link a ticket to the issue that fixes it.', Notion: 'Kelly can read the help pages in Notion.', Linear: 'Kelly can file a bug as a Linear issue.', Atlassian: 'Kelly can file the bug as a Jira ticket.', HubSpot: 'Kelly can see the account before replying.', Stripe: 'Kelly can look up a payment before replying.', Sentry: 'Kelly can match a ticket to the error behind it.', Figma: 'Kelly can check the latest design before answering.', Supabase: 'Kelly can look up the customer record.', 'Brave Search': 'Kelly can search the web for an answer.', Canva: 'Kelly can make a quick graphic for a reply.', Airtable: 'Kelly can update the tracker in Airtable.' };
    var carts = $('#carts'), slots = $('#slots'), say = $('#consSay'), N = 8, filled = [];
    if (SMALL) C = C.slice(0, 12);
    var cons = agentCard('kelly', 'st-work'); $('#consAgent').appendChild(cons.root);
    for (var i = 0; i < N; i++) slots.appendChild(el('div', 'slot', '<i></i>Empty'));
    function count() { $('#consN').textContent = filled.length + ' plugged in'; }
    function render() { // no cap on skills: past eight, the last slot counts the rest
      var over = filled.length > N;
      $$('.slot', slots).forEach(function (s, i) {
        if (over && i === N - 1) { s.className = 'slot full more'; s.innerHTML = '<span class="lg">+' + (filled.length - N + 1) + '</span><span>more</span>'; return; }
        var f = filled[i]; s.className = 'slot' + (f ? ' full' : ''); s.innerHTML = f ? '<span class="lg">' + appLogo(f.key) + '</span><span>' + f.name + '</span>' : '<i></i>Empty';
      });
    }
    count();
    function plugIn(c, btn) {
      if (filled.some(function (f) { return f.name === c[1]; })) return;
      filled.push({ name: c[1], key: c[0], btn: btn }); btn.classList.add('used');
      var target = slots.children[Math.min(filled.length, N) - 1];
      var from = btn.getBoundingClientRect(), to = target.getBoundingClientRect();
      var fly = btn.cloneNode(true); fly.classList.remove('used'); fly.style.cssText += ';position:fixed;left:' + from.left + 'px;top:' + from.top + 'px;width:' + from.width + 'px;height:' + from.height + 'px;margin:0;z-index:60;pointer-events:none;transition:none';
      document.body.appendChild(fly);
      var done = function () {
        fly.remove();
        render();
        target.classList.remove('snap'); void target.offsetWidth; target.classList.add('snap');
        say.textContent = c[1] + ' plugged in. ' + (SAY[c[1]] || ''); count();
      };
      if (RM) return done();
      fly.animate([{ transform: 'none' }, { transform: 'translate(' + (to.left - from.left) + 'px,' + (to.top - from.top - 40) + 'px) scale(.75) rotate(-6deg)', offset: .6 }, { transform: 'translate(' + (to.left - from.left) + 'px,' + (to.top - from.top) + 'px) scale(.55)', opacity: .2 }], { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)' }).onfinish = done;
    }
    C.forEach(function (c) {
      var b = el('button', 'cart', '<span class="lg">' + appLogo(c[0]) + '</span><span class="tx"><b>' + c[1] + '</b><span class="k">Official MCP server</span></span>'); b.type = 'button'; b.setAttribute('aria-label', 'Plug in ' + c[1]);
      b.addEventListener('click', function () { plugIn(c, b); });
      carts.appendChild(b);
    });
    var auto = false;
    whenVisible(carts, function () { if (auto) return; auto = true; setTimeout(function () { plugIn(C[1], carts.children[1]); }, 700); setTimeout(function () { plugIn(C[0], carts.children[0]); }, 1500); setTimeout(function () { plugIn(C[5], carts.children[5]); }, 2300); setTimeout(function () { plugIn(C[8], carts.children[8]); }, 3100); });
  })();

  /* ---------- Stapler ---------- */
  var looks = { seed: 'puck', shape: 'capsule', expression: 'idle', color: '#FFC94F' }; // the app's Stapler: seed and colour from shared/puck.ts, capsule as the founder showed (7 Nov)
  (function stapler() {
    var stage = $('#stage'), ring = $('#ring'), disc = $('#disc'), demo = $('#demo'), size = SMALL ? 104 : 128, open = false, invisible = false;
    function paint() { disc.innerHTML = S.face(looks, size, true, 'always'); }
    paint();
    function buildRing() {
      var cx = stage.clientWidth / 2, cy = stage.clientHeight / 2, r = size * S.RING.radius, btn = Math.round(size * S.RING.button), orbit = r * 2;
      var html = '<div class="puck-orbit" style="left:' + cx + 'px;top:' + cy + 'px;width:' + orbit + 'px;height:' + orbit + 'px"></div><div class="puck-orbit dashed" style="left:' + cx + 'px;top:' + cy + 'px;width:' + (orbit + 26) + 'px;height:' + (orbit + 26) + 'px"></div>';
      Object.keys(S.RING_ANGLE).forEach(function (a, i) {
        var ang = S.RING_ANGLE[a] * Math.PI / 180, x = Math.round(Math.sin(ang) * r), y = Math.round(-Math.cos(ang) * r), side = S.labelSide(S.RING_ANGLE[a]);
        var lx = side === 'right' ? (btn / 2 + 10) + 'px' : side === 'left' ? 'calc(-100% - ' + (btn / 2 + 10) + 'px)' : '-50%';
        var ly = side === 'up' ? -(btn / 2 + 14) : side === 'down' ? (btn / 2 + 14) : 0;
        var dis = a === 'computerUse';
        html += '<div><button type="button" class="puck-btn" data-action="' + a + '"' + (dis ? ' disabled' : '') + ' style="--i:' + i + ';--x:' + x + 'px;--y:' + y + 'px;left:' + cx + 'px;top:' + cy + 'px;width:' + btn + 'px;height:' + btn + 'px" aria-label="' + S.RING_LABEL[a] + '">' + S.glyph(S.ICON[a], Math.round(btn * .42)) + '</button>' +
          '<span class="puck-label" style="left:' + (cx + x) + 'px;top:' + (cy + y + ly) + 'px;--lx:' + lx + '">' + S.RING_LABEL[a] + (S.RING_SUB[a] ? '<small>' + S.RING_SUB[a] + '</small>' : '') + '</span></div>';
      });
      ring.innerHTML = html;
    }
    buildRing(); addEventListener('resize', buildRing);
    function setOpen(v) { open = v; ring.classList.toggle('in', v); }
    disc.addEventListener('click', function () { setOpen(!open); });
    var dT = 0, recT = 0;
    function show(html, ms) { demo.innerHTML = html; demo.classList.add('on'); stage.classList.add('showing'); clearTimeout(dT); dT = setTimeout(function () { demo.classList.remove('on'); stage.classList.remove('showing'); }, ms || 4200); }
    function wave() { var w = '<div class="wave">'; for (var i = 0; i < 26; i++) w += '<i style="--k:' + i + ';height:' + (30 + (i * 37 % 70)) + '%"></i>'; return w + '</div>'; }
    async function act(a, fromRing) {
      if (a === 'computerUse') return;
      if (!fromRing) { setOpen(true); await wait(RM ? 0 : 420); }
      var btn = ring.querySelector('[data-action="' + a + '"]');
      if (btn) { btn.classList.add('hit'); await wait(RM ? 0 : 260); btn.classList.remove('hit'); }
      setOpen(false); disc.classList.toggle('rec', a === 'meeting' || a === 'message');
      clearTimeout(recT); recT = setTimeout(function () { disc.classList.remove('rec'); }, a === 'meeting' ? 6200 : 4200);
      if (a === 'screenshot') {
        var f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
        show('<h6>' + S.glyph('screenshot', 14) + 'Screenshot to Ryan</h6><div class="shot"></div><div>Note: <b>The spacing on this card is off.</b></div><div style="margin-top:8px"><span class="st st-work"><i></i>Sent to your orchestrator</span></div>');
      } else if (a === 'meeting') {
        show('<h6>' + S.glyph('video', 14) + 'Recording meeting</h6>' + wave() + '<div id="tr" style="display:grid;gap:4px"></div>', 6200);
        var lines = ['<b>Ryan:</b> Themes ship first.', '<b>Pam:</b> Gallery by Thursday.', '<b>Kelly:</b> I will tell the customers.'], tr = $('#tr');
        for (var i = 0; i < lines.length && tr; i++) { await wait(900); tr.appendChild(el('div', '', lines[i])); }
      } else if (a === 'message') {
        show('<h6>' + S.glyph('mic', 14) + 'Record message</h6>' + wave() + '<div><b>"Draft the follow up for today\'s calls."</b></div><div style="margin-top:6px;color:var(--ink3)">Shown to you before it goes.</div>');
      } else if (a === 'invisible') {
        invisible = !invisible; disc.style.opacity = invisible ? .22 : 1;
        show('<h6>' + S.glyph('eye', 14) + (invisible ? 'Invisible' : 'Visible again') + '</h6><div>' + (invisible ? 'Out of every screen share and recording. Click it again to come back.' : 'Back in the room.') + '</div>');
      }
    }
    ring.addEventListener('click', function (e) { var b = e.target.closest('.puck-btn'); if (b) act(b.dataset.action, true); });
    // the action list beside it
    var ACTS = [['screenshot', 'Screenshot', 'Capture a region and send it with a note.'], ['meeting', 'Record meeting', 'The microphone into a folder of transcripts, one per meeting.'], ['message', 'Record message', 'Speak it. It is written down and shown to you before it goes.'], ['invisible', 'Leave invisible', 'Hide Stapler from screen shares and recordings in one click.'], ['computerUse', 'Computer use', 'Coming soon.']];
    var host = $('#actions');
    ACTS.forEach(function (x) {
      var b = el('button', 'act' + (x[0] === 'computerUse' ? ' dis' : ''), '<span class="g">' + S.glyph(S.ICON[x[0]], 16) + '</span><span><b>' + x[1] + '</b><span>' + x[2] + '</span></span>');
      b.type = 'button'; b.addEventListener('click', function () { act(x[0]); }); host.appendChild(b);
    });
    // colours: the app's twelve swatches
    var sw = $('#swatches');
    S.PUCK_SWATCHES.forEach(function (w) {
      var b = el('button'); b.type = 'button'; b.style.background = w.hex; b.title = w.name; b.setAttribute('aria-label', w.name); if (w.hex === looks.color) b.classList.add('on');
      b.addEventListener('click', function () { looks.color = w.hex; $$('button', sw).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); paint(); paintBuddy(); });
      sw.appendChild(b);
    });
    var shuf = el('button', 'btn btn-line btn-sm', 'New face'); shuf.style.cssText = 'width:auto;height:34px;border-radius:9px;margin-left:6px'; shuf.type = 'button';
    shuf.addEventListener('click', function () { var w = S.SHUFFLE_WORDS, n = looks.seed; while (n === looks.seed) n = w[Math.floor(Math.random() * w.length)]; looks.seed = n; paint(); paintBuddy(); }); // the app's Shuffle: a new seed, same shape
    sw.appendChild(shuf);
  })();

  /* ---------- the companion ---------- */
  var buddy = $('#buddy'), bface = $('#buddyFace'), hidden = false;
  try { hidden = sessionStorage.getItem('md-buddy-hidden') === '1'; } catch (e) { }
  function paintBuddy() { bface.innerHTML = S.face(looks, SMALL ? 50 : 58, true, 'always'); } // the same face as the Stapler section (founder, 7 Nov)
  paintBuddy();
  (function () {
    var bx = 0, by = 0, sx = 0, sy = 0, moved = false, down = false, said = false;
    buddy.addEventListener('pointerdown', function (e) { if (e.target.closest('.bmenu')) return; e.preventDefault(); down = true; moved = false; sx = e.clientX - bx; sy = e.clientY - by; buddy.setPointerCapture(e.pointerId); });
    buddy.addEventListener('pointermove', function (e) { if (!down) return; var nx = e.clientX - sx, ny = e.clientY - sy; if (Math.abs(nx - bx) + Math.abs(ny - by) > 4) moved = true; if (moved) { bx = nx; by = ny; buddy.style.translate = bx + 'px ' + by + 'px'; } });
    function setOpen(v) { buddy.classList.toggle('open', v); bface.setAttribute('aria-expanded', v ? 'true' : 'false'); }
    buddy.addEventListener('pointerup', function (e) { if (!down) return; down = false; if (!moved && !e.target.closest('.bmenu')) setOpen(!buddy.classList.contains('open')); });
    bface.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!buddy.classList.contains('open')); } });
    buddy.addEventListener('keydown', function (e) { if (e.key === 'Escape' && buddy.classList.contains('open')) { setOpen(false); bface.focus(); } });
    $$('#bmenu a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    $('#darkBtn').addEventListener('click', function () { window.__dark(document.documentElement.getAttribute('data-theme') !== 'dark'); setOpen(false); });
    $('#buddyHide').addEventListener('click', function () { hidden = true; try { sessionStorage.setItem('md-buddy-hidden', '1'); } catch (e) { } buddy.classList.remove('on', 'open'); });
    window.__buddy = function (show) {
      if (hidden) show = false;
      buddy.classList.toggle('on', show); if (!show) buddy.classList.remove('open');
      if (show && !said) { said = true; setTimeout(function () { buddy.classList.add('talk'); setTimeout(function () { buddy.classList.remove('talk'); }, 3600); }, 700); }
    };
  })();
  var curSec = 'top';
  var sio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) curSec = e.target.id; }); }, { rootMargin: '-45% 0px -45% 0px' });
  $$('main > section').forEach(function (s) { sio.observe(s); });

  /* ---------- 24x7 ---------- */
  var always = (function () {
    var sec = $('#always'), layout = SMALL ? 'tall' : 'wide';
    var names = (SMALL ? TALL_TEAM : WIDE_TEAM).slice(0, O.LAYOUTS[layout].desks.length - 1);
    var ag = team(names, layout); ag.push({ id: 'you', name: 'You', recipe: A.presetRecipe(5), desk: names.length });
    var cv = $('#nightMap'), scene = new O.Scene(cv, { layout: layout, theme: 'office', agents: ag, time: 9, seed: 13 });
    var EV = [
      [9, 'You open your laptop', 'Agents pick up where they left off', 'ryan', 'sun'],
      [12.5, 'Webhook: a new support email', 'Kelly drafts a reply for you to check', 'kelly', 'bolt'],
      [18, 'Schedule: daily summary', 'Sent to you by email', 'ryan', 'clock'],
      [22, 'Laptop closed', 'Your Cloud Office keeps going', 'oscar', 'cloud'],
      [26, 'Schedule: nightly research digest', 'Waiting in your Inbox', 'oscar', 'clock'],
      [30.5, 'Schedule: morning brief', 'Posted to your Slack channel', 'ryan', 'clock']
    ];
    var IC = { sun: '<circle cx="10" cy="10" r="3.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M15.7 4.3l-1.4 1.4M5.7 14.3l-1.4 1.4"/>', bolt: '<path d="M11 2L4 11h5l-1 7 7-9h-5z"/>', clock: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l3 2"/>', cloud: '<path d="M6 15h8.5a3.5 3.5 0 00.4-7 5 5 0 00-9.6 1.4A2.8 2.8 0 006 15z"/>' };
    var list = $('#events'), rows = [];
    EV.forEach(function (e) {
      var h = e[0] % 24, tm = (h < 10 ? '0' : '') + Math.floor(h) + ':' + (h % 1 ? '30' : '00');
      var r = el('div', 'ev', '<span class="tm">' + tm + '</span><span class="k"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + IC[e[4]] + '</svg></span><span><b>' + e[1] + (e[4] === 'cloud' ? ' <span class="pro" style="vertical-align:2px">PRO</span>' : '') + '</b><span>' + e[2] + '</span></span>');
      var who = el('span', 'who'); who.appendChild(tile(rec(e[3]), CAST[e[3]][3])); who.firstChild.style.cssText = 'width:24px;height:24px;border-radius:7px'; who.firstChild.firstChild.style.cssText = 'width:20px;height:22px;margin-top:4px'; who.appendChild(document.createTextNode(CAST[e[3]][0])); r.appendChild(who);
      list.appendChild(r); rows.push(r);
    });
    var clock = $('#clock'), lab = $('#clockLab'), chip = $('#lidchip'), puffs = $('#puffs'), youIn = true, lastH = 9;
    for (var i = 0; i < 13; i++) { var p = el('i'); var w = 56 + (i * 37 % 64); p.style.cssText = 'left:' + (i * 8 - 3) + '%;width:' + w + 'px;height:' + w + 'px;bottom:' + (-w * .32) + 'px;transition-delay:' + (i * 40) + 'ms'; puffs.appendChild(p); }
    var LAP = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="4" width="14" height="9" rx="1.5"/><path d="M1.5 16h17"/></svg>';
    function chipText(cloud) { chip.innerHTML = cloud ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7">' + IC.cloud + '</svg>Cloud Office · always on <span class="pro">PRO</span>' : LAP + 'Running on your computer'; }
    chipText(false);
    var running = false;
    whenVisible(sec, function () { running = true; if (!RM) scene.start(); else scene.draw(); }, function () { running = false; scene.stop(); }, '0px');
    var BG = [[0, '#F5F4EF', '#1A1916'], [.3, '#F4E7D3', '#1A1916'], [.37, '#EFCB9C', '#1A1916'], [.42, '#3B3046', '#ECEAE6'], [.48, '#131317', '#ECEAE6'], [.86, '#131317', '#ECEAE6'], [.93, '#3B3550', '#ECEAE6'], [.97, '#FFE9B8', '#1A1916'], [1, '#FFF3D2', '#1A1916']];
    // dark mode: the same day and night, in dark tones (round 9)
    var BGD = [[0, '#141311', '#F2EFE7'], [.3, '#1D1913', '#F2EFE7'], [.37, '#2A2017', '#F2EFE7'], [.42, '#241E2D', '#ECEAE6'], [.48, '#131317', '#ECEAE6'], [.86, '#131317', '#ECEAE6'], [.93, '#231F33', '#ECEAE6'], [.97, '#2A2417', '#F2EFE7'], [1, '#2A2518', '#F2EFE7']];
    function hexMix(a, b, t) { var x = [1, 3, 5].map(function (i) { return parseInt(a.slice(i, i + 2), 16); }), y = [1, 3, 5].map(function (i) { return parseInt(b.slice(i, i + 2), 16); }); return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(',') + ')'; }
    return function tick() {
      var r = sec.getBoundingClientRect();
      if (r.top > innerHeight * 1.5 || r.bottom < -innerHeight * .5) return 0;
      var total = sec.offsetHeight - innerHeight, p = clamp(-r.top / total, 0, 1);
      var h = 9 + p * 22, hh = h % 24, H = Math.floor(hh), M = Math.floor((hh - H) * 60 / 15) * 15;
      clock.firstChild.nodeValue = (H < 10 ? '0' : '') + H + ':' + (M < 10 ? '0' : '') + M;
      lab.textContent = hh < 5 ? 'Night' : hh < 12 ? 'Morning' : hh < 17 ? 'Afternoon' : hh < 21 ? 'Evening' : 'Night';
      scene.setTime(hh);
      var DM = document.documentElement.getAttribute('data-theme') === 'dark', B = DM ? BGD : BG;
      for (var k = 0; k < B.length - 1; k++) if (p >= B[k][0] && p <= B[k + 1][0]) { var t = (p - B[k][0]) / (B[k + 1][0] - B[k][0]); sec.style.setProperty('--bgx', hexMix(B[k][1], B[k + 1][1], t)); sec.style.setProperty('--fgx', t < .5 ? B[k][2] : B[k + 1][2]); break; }
      var dark = DM || (p > .395 && p < .95);
      sec.style.setProperty('--evb', dark ? '#1B1B21' : '#FFFFFF'); sec.style.setProperty('--evl', dark ? '#34333C' : '#DEDBD2'); sec.style.setProperty('--evk', dark ? '#26262C' : '#ECEAE3');
      var curI = -1; rows.forEach(function (row, i) { var on = h >= EV[i][0]; row.classList.toggle('on', on); if (on) curI = i; });
      rows.forEach(function (row, i) { row.classList.toggle('cur', i === Math.max(0, curI)); });
      var cloud = h >= 22 && h < 30.8; sec.classList.toggle('cloudy', cloud); if (cloud !== chip._c) { chip._c = cloud; chipText(cloud); }
      // you leave at 18:30 and come back at 7:00
      var shouldBeIn = h < 18.5 || h >= 30.8;
      if (shouldBeIn !== youIn) { youIn = shouldBeIn; if (youIn) scene.come('you'); else scene.leave('you'); }
      EV.forEach(function (e) { if (h >= e[0] && lastH < e[0]) { scene.bubble(e[3], e[4] === 'bolt' ? 'mail' : e[4] === 'cloud' ? 'check' : 'idea', 2.4); } });
      lastH = h;
      return p;
    };
  })();

  /* ---------- teams ---------- */
  (function teams() {
    var net = $('#tNet'), cloud = $('#tCloud'), brain = $('#tBrain'); if (!net) return;
    var MOON = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M14.5 13.2A6.5 6.5 0 016.8 5.5a6.5 6.5 0 107.7 7.7z"/></svg>';
    function pill(host, nm, line1, line2, x, y, big) {
      var p = el('div', 'office-pill' + (big ? ' big' : '')); p.style.left = x + '%'; p.style.top = y + '%';
      p.appendChild(tile(rec(nm), CAST[nm][3]));
      p.appendChild(el('span', '', line1 + (line2 ? '<small>' + line2 + '</small>' : '')));
      host.appendChild(p); return p;
    }
    function wires(host, pairs) {
      var NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'tw'); svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('preserveAspectRatio', 'none');
      pairs.forEach(function (q) { var l = document.createElementNS(NS, 'line'); l.setAttribute('x1', q[0]); l.setAttribute('y1', q[1]); l.setAttribute('x2', q[2]); l.setAttribute('y2', q[3]); l.setAttribute('stroke', '#C9C5BA'); l.setAttribute('stroke-width', '1.4'); l.setAttribute('stroke-dasharray', '4 4'); l.setAttribute('vector-effect', 'non-scaling-stroke'); svg.appendChild(l); });
      host.appendChild(svg);
    }
    // a parcel that travels from one point to another, in percent of the host
    function send(host, a, b, label, col, ms) {
      return new Promise(function (done) {
        var p = el('div', 'parcel', '<i style="background:' + col + '"></i>' + label); host.appendChild(p);
        var W = host.clientWidth, H = host.clientHeight, x0 = a[0] / 100 * W, y0 = a[1] / 100 * H, x1 = b[0] / 100 * W, y1 = b[1] / 100 * H, D = ms || 1500;
        if (RM) { p.remove(); return done(); }
        p.animate([{ transform: 'translate(' + x0 + 'px,' + y0 + 'px) translate(-50%,-50%) scale(.6)', opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .85 }, { transform: 'translate(' + x1 + 'px,' + y1 + 'px) translate(-50%,-50%) scale(.6)', opacity: 0 }], { duration: D, easing: 'cubic-bezier(.45,0,.3,1)' }).onfinish = function () { p.remove(); done(); };
      });
    }
    // 1. Team Network: three people's offices, their agents passing work between them
    var N = [[22, 26], [78, 26], [50, 78]];
    wires(net, [[22, 26, 78, 26], [22, 26, 50, 78], [78, 26, 50, 78]]);
    pill(net, 'pam', "Pam's office", '3 agents', N[0][0], N[0][1]); pill(net, 'jim', "Jim's office", '4 agents', N[1][0], N[1][1]); pill(net, 'ryan', 'Your office', '5 agents', N[2][0], N[2][1]);
    var NET = [[0, 1, 'brief.md', '#FFC94F'], [1, 2, 'Take the pricing page?', '#4F9FD9'], [2, 0, 'Done: pricing page', '#3F8F5E'], [2, 1, 'customer-notes', '#E060A8'], [1, 0, 'Need the logo files', '#9482D3'], [0, 2, 'logos.zip', '#E0803A']];
    // 2. Team Cloud: one central agent in the cloud, everyone connected; each person also has their own Cloud Office
    cloud.insertAdjacentHTML('beforeend', '<svg class="cloudy-bg" viewBox="0 0 230 92" aria-hidden="true"><path d="M48 84h132a30 30 0 004-59.7A40 40 0 00108 14a34 34 0 00-62 16A27 27 0 0048 84z" fill="#E9EEF5" stroke="#C9D6E6" stroke-width="1.2"/></svg>');
    wires(cloud, [[50, 34, 18, 76], [50, 34, 50, 76], [50, 34, 82, 76]]);
    pill(cloud, 'oscar', 'Company agent', 'Cloud · shared context', 50, 30, true);
    var team3 = [['pam', 18], ['jim', 50], ['kelly', 82]];
    team3.forEach(function (t) { var p = pill(cloud, t[0], CAST[t[0]][0], '', t[1], 76); p.insertAdjacentHTML('beforeend', '<span class="moon" title="Their own Cloud Office">' + MOON + '</span>'); });
    var ASK = ['What did we promise Acme?', 'Where is the brand kit?', 'Latest pricing?'], ANS = ['From the March call notes', 'Linked in Drive', 'From the pricing doc'];
    // 3. Team Brain: a graph you curate; a role decides what is visible
    var KN = [['Sales', 22, 22, '#E0803A'], ['Product', 50, 14, '#4F9FD9'], ['Customers', 78, 22, '#E060A8'], ['Finance', 24, 52, '#3F8F5E'], ['How we work', 52, 44, '#FFC94F'], ['Legal', 78, 52, '#9482D3']];
    var KL = [[0, 1], [1, 2], [0, 4], [1, 4], [2, 4], [3, 4], [4, 5], [0, 3], [2, 5]];
    wires(brain, KL.map(function (l) { return [KN[l[0]][1], KN[l[0]][2], KN[l[1]][1], KN[l[1]][2]]; }));
    var LOCK = '<svg class="lk" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><rect x="4.5" y="9" width="11" height="8" rx="1.5"/><path d="M7 9V6.5a3 3 0 016 0V9"/></svg>';
    var kn = KN.map(function (k) { var n = el('div', 'knode', '<i style="background:' + k[3] + '"></i>' + k[0] + LOCK); n.style.left = k[1] + '%'; n.style.top = k[2] + '%'; brain.appendChild(n); return n; });
    var ROLES = [['Everyone', [0, 1, 2, 4]], ['Sales', [0, 2, 4]], ['Finance', [3, 4, 5]], ['Leads', [0, 1, 2, 3, 4, 5]]];
    var rr = el('div', 'roles'); ROLES.forEach(function (r) { rr.appendChild(el('span', '', r[0])); }); brain.appendChild(rr);
    function role(i) { $$('span', rr).forEach(function (s2, j) { s2.classList.toggle('on', j === i); }); kn.forEach(function (n, j) { n.classList.toggle('locked', ROLES[i][1].indexOf(j) < 0); }); }
    role(0);
    var on = false, started = false;
    async function loop() {
      var i = 0;
      while (true) {
        if (!on) { await wait(500); continue; }
        var m = NET[i % NET.length];
        send(net, N[m[0]], N[m[1]], m[2], m[3], 1700);
        var who = team3[i % 3], q = i % 3;
        send(cloud, [who[1], 70], [50, 36], ASK[q], '#4F9FD9', 1300).then(function (w, a) { return function () { return send(cloud, [50, 36], [w[1], 70], a, '#3F8F5E', 1300); }; }(who, ANS[q]));
        role((i + 1) % ROLES.length); kn.forEach(function (n) { n.classList.remove('lit'); }); var vis = ROLES[(i + 1) % ROLES.length][1]; kn[vis[i % vis.length]].classList.add('lit');
        await wait(RM ? 3000 : 2600); i++;
      }
    }
    whenVisible($('#teams'), function () { on = true; if (!started) { started = true; loop(); } }, function () { on = false; }, '0px');
  })();

  /* ---------- film ---------- */
  (function film() {
    if ($('#film').hidden) return;
    var tv = $('#tv'), v = $('#vid'), play = $('#play'), loaded = false;
    function load() { if (loaded) return; loaded = true; v.src = 'media/office-real.mp4'; }
    function go() { load(); var pr = v.play(); if (pr && pr.then) pr.then(function () { tv.classList.add('playing'); }, function () { }); }
    play.addEventListener('click', go);
    v.addEventListener('click', function () { if (v.paused) go(); else { v.pause(); tv.classList.remove('playing'); } });
    whenVisible(tv, function () { if (!RM) go(); }, function () { if (!v.paused) { v.pause(); tv.classList.remove('playing'); } }, '0px');
  })();

  /* ---------- get: the lineup ---------- */
  (function lineup() {
    var host = $('#lineup'), ps = [];
    ['angela', 'oscar', 'kevin', 'meredith', 'creed', 'phyllis', 'pam', 'ryan', 'jim', 'dwight', 'kelly', 'andy', 'stanley', 'toby'].forEach(function (nm, i) {
      var p = el('div', 'p'), c = O.portrait(rec(nm)); p.appendChild(c); p.appendChild(el('span', 'nm', CAST[nm][0]));
      p.addEventListener('click', function () { p.classList.remove('hop'); void p.offsetWidth; p.classList.add('hop'); });
      host.appendChild(p); ps.push(p);
    });
    function wave() { if (RM) return; ps.forEach(function (p, i) { setTimeout(function () { p.classList.remove('hop'); void p.offsetWidth; p.classList.add('hop'); }, i * 70); }); }
    whenVisible(host, wave, null, '0px');
    $$('#get .btn').forEach(function (b) { b.addEventListener('pointerenter', wave); b.addEventListener('pointerdown', function (e) { burst(e.clientX, e.clientY); }); });
  })();

  $$('main > section:not([hidden]) .kicker b').forEach(function (b, i) { b.textContent = (i < 9 ? '0' : '') + (i + 1); });

  /* ---------- one scroll loop ---------- */
  var ticking = false, sendbar = $('#sendbar'), heroCta = $('.hero .cta-row'), getSec = $('#get'), stageW = $('#stagewrap');
  function onScroll() {
    ticking = false;
    var y = scrollY, H = document.documentElement.scrollHeight - innerHeight, p = H > 0 ? y / H : 0;
    nav.classList.toggle('solid', y > 8);
    if (menu.classList.contains('open') && Math.abs(y - menuY) > 60) setMenu(false);
    nav.classList.toggle('hide', y > 640 && y > lastY + 2 && !nav.matches(':hover') && !menu.classList.contains('open'));
    if (y < lastY - 2) nav.classList.remove('hide');
    fill.style.width = (p * 100) + '%';
    walker.style.left = 'calc(' + (p * 100) + '% + ' + (5 - p * 10).toFixed(1) + 'px)';
    walked += Math.abs(y - lastY); drawWalker([0, 1, 0, 2][Math.floor(walked / 30) % 4]);
    lastY = y;
    if (window.__heroTick) window.__heroTick();
    if (always) always();
    var heroGone = heroCta.getBoundingClientRect().bottom < 0, nearEnd = getSec.getBoundingClientRect().top < innerHeight * .7;
    if (OS === 'phone' || SMALL) sendbar.classList.toggle('on', OS === 'phone' && heroGone && !nearEnd);
    var stapVis = (function () { var r = $('#stapler').getBoundingClientRect(); return r.top < innerHeight * .8 && r.bottom > innerHeight * .2; })();
    var appGone = stageW.getBoundingClientRect().bottom < innerHeight * .45;
    // Off the FAQ cards too (god, 9 Nov): its bubble and face sat on the questions' titles and buttons.
    var faqVis = (function () { var f = $('#faq'); if (!f) return false; var r = f.getBoundingClientRect(); return r.top < innerHeight * .8 && r.bottom > innerHeight * .2; })();
    window.__buddy(appGone && !stapVis && !faqVis && !(SMALL && nearEnd));
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
})();
