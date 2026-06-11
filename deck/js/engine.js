/* ============================================================
   ENGINE — camera-over-a-world: stations live at real coords on
   an infinite plane (data-x/data-y); a virtual camera pans/zooms
   between them (anime.js v4). Also: HUD/rail, generic station
   intros, full-screen site auto-scroll, input, boot.

   Loads LAST (after scene-kit.js and js/scenes/*) so every scene
   is registered before boot dispatches the first station.
   Scene-driven stations are handled via Deck.sceneFor(el) — to add
   a scene, add a js/scenes/<name>.js file + data-scene="name";
   do NOT add per-scene branches here.
   ============================================================ */
(function () {
  'use strict';
  const { animate, utils } = anime;
  const { EASE, MOTION, reduceMotion, splitLines, fitHeading, releaseClips } = Deck;
  const WEB_FLY = 1750;   // total duration of the "dive into the website" transition

  // ---- collect stations from the DOM ----
  const nodes = Array.from(document.querySelectorAll('.station'));
  const stations = nodes.map(el => {
    const x = +el.dataset.x, y = +el.dataset.y, zoom = +el.dataset.zoom || 1;
    el.style.transform = `translate(${x}px, ${y}px)`;     // place on the world plane
    return { el, x, y, w: el.offsetWidth, h: el.offsetHeight, zoom,
             cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2,
             name: el.dataset.name };
  });

  const world = document.getElementById('world');
  const hud = document.getElementById('hud');
  const cam = { x: stations[0].cx, y: stations[0].cy, zoom: stations[0].zoom };
  let cur = 0, busy = false, overview = false;

  // Persistent floating gift QR: clone the s12 QR into the fixed overlay, show from s12 → end.
  const FLOAT_FROM = stations.findIndex(s => s.el.id === 's12');
  (function initGiftQr() {
    const gq = document.getElementById('giftqr'), src = document.querySelector('#s12 .ty-qr'), card = gq && gq.querySelector('.gq-card');
    if (gq && src && card) card.appendChild(src.cloneNode(true));
  })();

  function vw() { return window.innerWidth; }
  function vh() { return window.innerHeight; }
  function render() {
    const tx = vw() / 2 - cam.x * cam.zoom;
    const ty = vh() / 2 - cam.y * cam.zoom;
    world.style.transform = `translate(${tx}px, ${ty}px) scale(${cam.zoom})`;
  }

  // ---- HUD + rail ----
  const rail = document.getElementById('rail');
  const railtip = document.createElement('div'); railtip.id = 'railtip'; document.body.appendChild(railtip);
  // full-screen veil for chapter-break transitions (data-fly="fade"): dip to the
  // destination's tone, jump the camera under cover, then lift — a deliberate cut, not a pan.
  const fadeVeil = document.createElement('div');
  fadeVeil.id = 'fadeveil';
  fadeVeil.style.cssText = 'position:fixed;inset:0;z-index:40;pointer-events:none;opacity:0;display:none';
  document.body.appendChild(fadeVeil);
  stations.forEach((s, i) => {
    const d = document.createElement('div'); d.className = 'dot' + (i ? '' : ' active');
    d.addEventListener('click', () => { if (!busy && i !== cur) goto(i); });
    d.addEventListener('mouseenter', () => {
      const r = d.getBoundingClientRect();
      railtip.textContent = String(i + 1).padStart(2, '0') + ' · ' + stations[i].name;
      railtip.style.left = (r.left + r.width / 2) + 'px';
      railtip.classList.add('show');
    });
    d.addEventListener('mouseleave', () => railtip.classList.remove('show'));
    rail.appendChild(d);
  });
  const dots = Array.from(rail.children);
  document.getElementById('total').textContent = String(stations.length).padStart(2, '0');
  function setHud(i) {
    document.getElementById('idx').textContent = String(i + 1).padStart(2, '0');
    hud.querySelector('.station-name').textContent = stations[i].name;
    dots.forEach((d, k) => d.classList.toggle('active', k === i));
    const dark = stations[i].el.classList.contains('dark');
    hud.classList.toggle('on-dark', dark); document.body.classList.toggle('dark-hud', dark);
    document.body.classList.toggle('show-giftqr', FLOAT_FROM >= 0 && i >= FLOAT_FROM);
  }

  // ---- camera fly ----
  function flyTo(target, { dur = 1150, ease = EASE } = {}) {
    busy = true;
    animate(cam, {
      x: target.x, y: target.y, zoom: target.zoom,
      duration: dur * MOTION, ease,
      onUpdate: render,
      onComplete: () => { busy = false; maskToStation(stations[cur]); }
    });
  }
  // fit the 16:9 station to the screen so type reads edge-to-edge (data-zoom multiplies for emphasis)
  function fitZoom(s) { return Math.min(vw() / s.w, vh() / s.h) * s.zoom; }
  // Letterbox mask: on non-16:9 screens (phones especially) the bars beside the fitted
  // frame are wide enough to reveal NEIGHBORING stations on the world plane. Clip the
  // viewport to the current frame at rest; open during flights so transitions still show
  // the world. #viewport's own background is clipped too, but body carries the same tone
  // (dark-hud), so the bars keep following the slide; HUD/rail/QR live outside #viewport.
  const viewportEl = document.getElementById('viewport');
  function maskToStation(s) {
    const z = fitZoom(s);
    const l = Math.max(0, (vw() - s.w * z) / 2).toFixed(1), t = Math.max(0, (vh() - s.h * z) / 2).toFixed(1);
    viewportEl.style.clipPath = `inset(${t}px ${l}px ${t}px ${l}px)`;
  }
  function unmask() { viewportEl.style.clipPath = 'inset(0px 0px 0px 0px)'; }

  // Phone survival: iOS Safari kills the tab under GPU/memory pressure — 30 stations
  // plus 6 live iframes on one composited plane is too much for a phone. On coarse
  // pointers, paint only the current station ±1 (visibility) and load showcase iframes
  // on approach (markup carries data-src; the loader swaps it in). next/prev only ever
  // crosses adjacent stations, so flights still pan over painted content; a rare dot-jump
  // crosses blank world mid-flight, which we accept on phones. Desktop paints everything.
  const MOBILE_CULL = matchMedia('(pointer: coarse)').matches;
  function loadFrames(root) {
    root.querySelectorAll('iframe[data-src]').forEach(f => { f.src = f.dataset.src; f.removeAttribute('data-src'); });
  }
  function updateCulling() {
    if (!MOBILE_CULL) return;
    stations.forEach((s, k) => {
      const near = overview || Math.abs(k - cur) <= 1;
      s.el.style.visibility = near ? '' : 'hidden';
      if (near) loadFrames(s.el);
    });
  }
  // websites: pull the camera back so the page reads as an object in space, then dive in
  // to fill the screen. Arriving at Page A = a dive-in; A→B = pull back out, then dive into B.
  function flyZoomWeb(s) {
    busy = true;
    const target = { x: s.cx, y: s.cy, zoom: fitZoom(s) };
    const outZoom = target.zoom * 0.34;                 // pronounced pull-back
    animate(cam, {
      x: target.x, y: target.y,
      zoom: [
        { to: outZoom,      duration: 720 * MOTION,  ease: 'inOutQuad' },
        { to: target.zoom,  duration: 1030 * MOTION, ease: EASE }
      ],
      duration: WEB_FLY * MOTION, ease: EASE, onUpdate: render, onComplete: () => { busy = false; maskToStation(stations[cur]); }
    });
  }
  function goto(i, opts) {
    if (i < 0 || i >= stations.length) return;
    const prev = cur; cur = i; overview = false;
    unmask();                                           // open the letterbox mask for the flight
    updateCulling();
    setHud(i);
    stopSiteScroll();                                   // reset any showcase scroll on every move
    Deck.stopScenes();                                  // cancel every scene when leaving a station
    stopCdScroll();                                     // stop the auto-scrolling doc panel when leaving
    const s = stations[i], isNew = i !== prev, fly = s.el.dataset.fly;
    if (fly === 'through-overview' && isNew && !reduceMotion) { flyThroughOverview(s); return; } // handles its own intro
    if (fly === 'fade' && isNew && !reduceMotion) { flyFade(s); return; }                        // chapter-break dip-to-tone (handles its own intro)
    if (fly === 'web' && isNew) flyZoomWeb(s);          // the dive is core content — run even under reduced motion
    else flyTo({ x: s.cx, y: s.cy, zoom: fitZoom(s) }, opts);
    const scene = Deck.sceneFor(s.el);
    if (scene) { if (isNew) scene.run(s.el); }          // a scene owns its station's reveal
    else playIntro(s, isNew);
    if (s.el.querySelector('.cd-scroll') && isNew) runCdScroll(s.el);   // start the design-system auto-scroll
    // full-screen site stations: let the camera land (after the longer dive) + a beat, then auto-scroll
    if (s.el.dataset.scroll && isNew) {
      const token = cur;
      const flyDur = (fly === 'web') ? WEB_FLY : 1150;
      setTimeout(() => { if (cur === token && !overview) runSiteScroll(s); }, flyDur * MOTION + 350);
    }
  }
  // camera position that frames the whole map (shared by the O key and the through-overview transition)
  function overviewCam() {
    const pad = 200;
    const minX = Math.min(...stations.map(s => s.x)) - pad, maxX = Math.max(...stations.map(s => s.x + s.w)) + pad;
    const minY = Math.min(...stations.map(s => s.y)) - pad, maxY = Math.max(...stations.map(s => s.y + s.h)) + pad;
    const zoom = Math.min(vw() / (maxX - minX), vh() / (maxY - minY));
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom };
  }
  function toOverview() {
    overview = true; busy = true;
    unmask();
    updateCulling();   // overview shows the whole map — unhide everything
    const c = overviewCam();
    animate(cam, { x: c.x, y: c.y, zoom: c.zoom, duration: 1300 * MOTION, ease: EASE, onUpdate: render, onComplete: () => busy = false });
  }
  // zoom OUT to the whole map, hold so the audience reads the structure, then zoom INTO the target
  function flyThroughOverview(s) {
    busy = true;
    const c = overviewCam();
    const target = { x: s.cx, y: s.cy, zoom: fitZoom(s) };
    animate(cam, { x: c.x, y: c.y, zoom: c.zoom, duration: 1000 * MOTION, ease: EASE, onUpdate: render,
      onComplete: () => setTimeout(() => {
        playIntro(s, true);   // fire the station's reveal as the camera arrives
        animate(cam, { x: target.x, y: target.y, zoom: target.zoom, duration: 1150 * MOTION, ease: EASE, onUpdate: render, onComplete: () => { busy = false; maskToStation(stations[cur]); } });
      }, 480)
    });
  }

  // chapter-break dip: fade to the destination tone, snap the camera while covered, then reveal.
  // Signals "new chapter" by breaking the continuous spatial pan. Self-handles the intro (goto returns).
  function flyFade(s) {
    busy = true;
    const target = { x: s.cx, y: s.cy, zoom: fitZoom(s) };
    fadeVeil.style.background = s.el.classList.contains('dark') ? 'var(--ink)' : 'var(--bg)';
    fadeVeil.style.display = 'block';
    animate(fadeVeil, {
      opacity: [0, 1], duration: 460 * MOTION, ease: 'inOutQuad',
      onComplete: () => {
        cam.x = target.x; cam.y = target.y; cam.zoom = target.zoom; render();  // move camera while hidden
        maskToStation(s);                                                       // re-mask under the veil
        playIntro(s, true);                                                     // reveal begins behind the veil
        animate(fadeVeil, {
          opacity: [1, 0], duration: 660 * MOTION, delay: 140 * MOTION, ease: 'inOutQuad',
          onComplete: () => { fadeVeil.style.display = 'none'; busy = false; }
        });
      }
    });
  }

  // ---- full-screen site showcase: keep a real 1080px viewport (so the page's own
  //      100vh / layout is correct) and scroll the CONTENT inside via scrollTo ----
  let siteScrollAnim = null;
  function sizeSiteFrame(f) {
    try {
      const doc = f.contentDocument || f.contentWindow.document;
      if (!doc.getElementById('__deck_noscroll')) {     // hide the page's scrollbar
        const st = doc.createElement('style'); st.id = '__deck_noscroll';
        st.textContent = 'html,body{scroll-behavior:auto!important;scrollbar-width:none}html::-webkit-scrollbar,body::-webkit-scrollbar{width:0;height:0;display:none}';
        (doc.head || doc.documentElement).appendChild(st);
      }
      const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight, 1080);
      f.dataset.dist = String(Math.max(0, h - 1080));   // content scroll range
    } catch (e) { f.dataset.dist = '0'; }                // cross-origin guard → no scroll
  }
  function initSiteFrames() {
    document.querySelectorAll('.site-frame').forEach(f => {
      f.addEventListener('load', () => sizeSiteFrame(f));
      if (f.contentDocument && f.contentDocument.readyState === 'complete') sizeSiteFrame(f);
    });
  }
  function stopSiteScroll() {
    if (siteScrollAnim) { if (siteScrollAnim.pause) siteScrollAnim.pause(); siteScrollAnim = null; }
    document.querySelectorAll('.site-frame').forEach(f => { try { f.contentWindow.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) {} });
  }
  function runSiteScroll(s) {
    const f = s.el.querySelector('.site-frame');
    if (!f) return;
    let win; try { win = f.contentWindow; win.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { return; }
    sizeSiteFrame(f);                          // recompute now that fonts/images have settled
    const dist = +f.dataset.dist || 0;
    if (dist <= 0) return;                     // the scroll IS the content — runs even under reduced-motion
    const dur = +s.el.dataset.scroll || 6000;
    const proxy = { y: 0 };
    siteScrollAnim = animate(proxy, {
      y: dist, duration: dur, ease: 'inOutSine',
      // behavior:'auto' overrides the page's own `scroll-behavior:smooth`, which would
      // otherwise fight our per-frame updates (stutter, then snap to the end).
      onUpdate: () => { try { win.scrollTo({ top: proxy.y, behavior: 'auto' }); } catch (e) {} }
    });
  }

  // ---- auto-scrolling doc panel (s6 Claude Design mockup): any station containing a
  //      .cd-scroll element gets its content scrolled DOWN over 10s, then UP over 10s,
  //      looping while the station is active. Generic facility — keyed on the class. ----
  let cdScroll = { token: 0, anim: null, timer: null };
  function stopCdScroll() {
    cdScroll.token++;
    if (cdScroll.anim && cdScroll.anim.pause) { try { cdScroll.anim.pause(); } catch (e) {} }
    cdScroll.anim = null;
    if (cdScroll.timer) { clearTimeout(cdScroll.timer); cdScroll.timer = null; }
    document.querySelectorAll('#s6 .cd-scroll').forEach(sc => { sc.scrollTop = 0; });
  }
  function runCdScroll(el) {
    stopCdScroll();
    const sc = el.querySelector('.cd-scroll');
    if (!sc) return;
    const token = cdScroll.token;
    const proxy = { y: 0 };
    const max = () => Math.max(0, sc.scrollHeight - sc.clientHeight);
    const leg = (to) => {                       // recompute max each leg (images settle late)
      if (token !== cdScroll.token) return;
      const target = to === 'down' ? max() : 0;
      cdScroll.anim = animate(proxy, {
        y: target, duration: 10000, ease: 'inOutSine',
        onUpdate: () => { if (token === cdScroll.token) sc.scrollTop = proxy.y; },
        onComplete: () => { if (token === cdScroll.token) leg(to === 'down' ? 'up' : 'down'); }
      });
    };
    sc.scrollTop = 0; proxy.y = 0;
    cdScroll.timer = setTimeout(() => { if (token === cdScroll.token) leg('down'); }, 600);  // let layout/fonts settle
  }

  // ---- generic station intro ----
  // HARD RULE: every station gets a transition on arrival, even subtle.
  // Big display = weighty LINE-RISE (editorial, expressive easing, one element owns motion).
  // Everything else = calm fade-up. Stations with no marked elements fall back to their children.
  function playIntro(s, isNew) {
    if (!isNew) return;
    const el = s.el;
    el.querySelectorAll('[data-split="lines"]').forEach(splitLines);
    el.querySelectorAll('[data-split="lines"]').forEach(fitHeading);
    const lines = el.querySelectorAll('.lineInner');
    const fades = Array.from(el.querySelectorAll('[data-fade]'));
    let autos = [];
    if (!lines.length && !fades.length) {
      autos = Array.from(el.children).filter(c => !c.classList.contains('bg') && getComputedStyle(c).position !== 'absolute');
    }
    const fadeTargets = [...fades, ...autos];
    utils.set(lines, { translateY: '100%' });
    utils.set(fadeTargets, { opacity: 0, translateY: 22 });
    if (lines.length) animate(lines, { translateY: ['100%', '0%'], duration: 1150 * MOTION, delay: anime.stagger(150 * MOTION), ease: EASE, onComplete: () => releaseClips(el) });
    else releaseClips(el);
    if (fadeTargets.length) animate(fadeTargets, { opacity: [0, 1], translateY: [22, 0], duration: 900 * MOTION, delay: anime.stagger(110 * MOTION, { start: (lines.length ? 440 : 90) * MOTION }), ease: 'out(2)' });
  }

  // ---- S3 · the slop feed: 3 columns of IDENTICAL generic AI landing pages, drifting up
  //      (static DOM builder — CSS animates it; not a scene) ----
  (function buildSlop() {
    const feed = document.getElementById('slopFeed');
    if (!feed) return;
    const page =
      '<div class="slop-page">' +
        '<div class="sp-nav"><span class="sp-logo"></span><span class="sp-links"><i></i><i></i><i></i></span></div>' +
        '<div class="sp-hero"><span class="sp-blob"></span><span class="sp-h w1"></span><span class="sp-h w2"></span><span class="sp-sub"></span><span class="sp-btn"></span></div>' +
        '<div class="sp-cards"><span></span><span></span><span></span></div>' +
      '</div>';
    const colPages = page.repeat(5);
    for (let c = 0; c < 3; c++) {
      const col = document.createElement('div');
      col.className = 'slop-col';
      col.innerHTML = colPages + colPages;   // duplicated for a seamless -50% loop
      feed.appendChild(col);
    }
  })();

  // ---- input ----
  function next() { if (!busy) goto(Math.min(cur + 1, stations.length - 1)); }
  function prev() { if (!busy) goto(Math.max(cur - 1, 0)); }
  Deck.nav = { next, prev };   // scenes use these to leave their station
  // true full screen (Fullscreen API) — no browser chrome; toggled by the HUD button or F
  function toggleFullscreen() {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) {
      const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) req.call(el);
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  }
  const fsbtn = document.getElementById('fsbtn');
  if (fsbtn) fsbtn.addEventListener('click', toggleFullscreen);
  ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => {
    const on = !!(document.fullscreenElement || document.webkitFullscreenElement);
    document.body.classList.toggle('is-fullscreen', on);
  }));
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); if (!Deck.handleSceneKey(1)) next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); if (!Deck.handleSceneKey(-1)) prev(); }
    else if (e.key === 'o' || e.key === 'O' || e.key === 'ArrowUp') { e.preventDefault(); busy ? null : toOverview(); }
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); }
    else if (e.key === 'ArrowDown' || e.key === 'Escape') { e.preventDefault(); if (!busy) goto(cur); }
  });
  // ---- touch input (the deck gets read on phones after the talk) ----
  // A single-finger swipe IS the arrow keys — same dispatch, so scenes that step on
  // arrows (the s5 reel) step on swipes too. Multi-touch is left to the browser so
  // pinch-zoom keeps working; while pinch-zoomed in, swipes pan instead of navigating.
  // base.css gives iframes pointer-events:none on coarse pointers — without that,
  // touches die inside the iframe document and swipes can't leave those stations.
  let swipeHint = null;
  function removeSwipeHint() { if (swipeHint) { swipeHint.remove(); swipeHint = null; } }
  if (matchMedia('(pointer: coarse)').matches) {
    swipeHint = document.createElement('div');
    swipeHint.id = 'swipehint'; swipeHint.textContent = 'Swipe to navigate';
    document.body.appendChild(swipeHint);
    swipeHint.addEventListener('animationend', removeSwipeHint);
  }
  let touch = null;
  window.addEventListener('touchstart', e => {
    touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  window.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
  window.addEventListener('touchend', e => {
    if (!touch || e.touches.length) return;
    const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (window.visualViewport && window.visualViewport.scale > 1.05) return;  // zoomed in → panning
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < 48) return;                       // a tap, not a swipe
    const dir = (ax >= ay ? dx : dy) < 0 ? 1 : -1;           // left/up = next, right/down = prev
    removeSwipeHint();
    if (!Deck.handleSceneKey(dir)) (dir > 0 ? next() : prev());
  }, { passive: true });
  // portrait overlay (CSS shows it only on small portrait touch screens): tap = read letterboxed
  const rotateHint = document.getElementById('rotatehint');
  if (rotateHint) rotateHint.addEventListener('click', () => document.body.classList.add('rh-dismissed'));
  // no Fullscreen API on iPhone Safari — drop the button rather than show a dead control
  if (fsbtn && !(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) fsbtn.style.display = 'none';

  // click a station while in overview to fly to it
  stations.forEach((s, i) => s.el.addEventListener('click', () => { if (overview && !busy) goto(i); }));
  world.style.cursor = 'default';

  window.addEventListener('resize', () => {
    stations.forEach(s => { s.w = s.el.offsetWidth; s.h = s.el.offsetHeight; s.cx = s.x + s.w/2; s.cy = s.y + s.h/2; });
    if (overview) { toOverview(); }
    else { const s = stations[cur]; cam.x = s.cx; cam.y = s.cy; cam.zoom = fitZoom(s); render(); maskToStation(s); }
  });

  // ---- boot ----
  // optional deep-link: #s2 / #s3 starts at that station (rehearsal + dev)
  const hashIdx = stations.findIndex(s => '#' + s.el.id === location.hash);
  const start = hashIdx >= 0 ? hashIdx : 0;
  cur = start;
  cam.x = stations[start].cx; cam.y = stations[start].cy; cam.zoom = fitZoom(stations[start]);
  render();
  maskToStation(stations[start]);
  setHud(start);
  if (MOBILE_CULL) updateCulling(); else loadFrames(document);   // desktop: load all iframes now
  initSiteFrames();   // size the full-screen showcase iframes once their pages load
  // first intro after a beat so the bone canvas registers before type rises in
  setTimeout(() => {
    const st = stations[start];
    const scene = Deck.sceneFor(st.el);
    if (scene) scene.run(st.el); else playIntro(st, true);
    if (st.el.querySelector('.cd-scroll')) runCdScroll(st.el);
  }, 240);
  // if we deep-link straight onto a full-screen site station, run its scroll too (rehearsal)
  if (stations[start].el.dataset.scroll) setTimeout(() => { if (cur === start && !overview) runSiteScroll(stations[start]); }, 900);
})();
