/* ============================================================
   SCENE KIT — shared motion constants, animation helpers, and the
   scene registry. Defines the global `Deck` namespace.

   Load order contract (see ARCHITECTURE.md):
     anime.umd.min.js → scene-kit.js → js/scenes/*.js → engine.js

   A scene is a controller for one station's bespoke animation:
     Deck.registerScene('name', {
       run(stationEl) {},        // start (also owns the station's intro)
       stop() {},                // cancel everything; called on EVERY navigation
       handleKey(dir) {},        // optional: return true to consume an arrow key
     })
   Hook it to a station with data-scene="name" — the engine dispatches
   automatically; no engine edits needed.
   ============================================================ */
window.Deck = (function () {
  'use strict';
  const { animate, utils } = anime;

  // ---- motion constants ----
  const EASE = anime.cubicBezier ? anime.cubicBezier(.82, 0, .18, 1) : 'inOutQuart';
  // The deck's motion IS the content — always animate. Reduced-motion (e.g. Windows
  // "animations off", which Chrome reports as prefers-reduced-motion: reduce) only gets
  // a calmer/faster scale — never a dead cut, or the presentation loses its whole feel.
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOTION = reduceMotion ? 0.6 : 1;
  const DS = 0.55;   // kit-timed scenes run 45% faster (a presenter-pace directive)

  // ---- scene primitives ----
  // A scene state object: xStop() must set cancelled, clear timers, null the ref.
  // Async runners check `if (scene.cancelled) return;` after every await.
  function newScene(extra) { return Object.assign({ cancelled: false, timers: [], anims: [] }, extra); }
  function dsWait(scene, ms) { return new Promise(res => { scene.timers.push(setTimeout(res, ms * DS)); }); }
  function dsLen(p) { try { return p.getTotalLength(); } catch (e) { return 0; } }
  // tween wrapper: scales duration + numeric delay by DS (NOT stagger-object delays)
  function dsA(scene, t, p) {
    const q = Object.assign({}, p);
    if (typeof q.duration === 'number') q.duration *= DS;
    if (typeof q.delay === 'number') q.delay *= DS;
    const a = animate(t, q); scene.anims.push(a); return a;
  }
  // SVG stroke-draw via dashoffset. Animate a PROXY and write strokeDashoffset in
  // onUpdate — do NOT rely on anime tweening the CSS property directly.
  function dsDraw(scene, paths, dur, baseDelay, step) {
    paths.forEach((p, i) => {
      const L = dsLen(p), o = { v: L };
      p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
      dsA(scene, o, { v: [L, 0], duration: dur, delay: (baseDelay || 0) + i * (step || 0), ease: 'inOutQuad', onUpdate: () => { p.style.strokeDashoffset = o.v; } });
    });
  }
  function dsHide(paths) { paths.forEach(p => { const L = dsLen(p); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; }); }
  // "data flowing along a wire": move a dot along a path via getPointAtLength
  function florPulse(scene, circle, path, dur, delay) {
    const L = path.getTotalLength();
    scene.timers.push(setTimeout(() => {
      if (scene.cancelled) return;
      utils.set(circle, { opacity: 1 });
      const prog = { t: 0 };
      dsA(scene, prog, { t: [0, 1], duration: dur, ease: 'inOutQuad',
        onUpdate: () => { const pt = path.getPointAtLength(L * prog.t); circle.setAttribute('cx', pt.x); circle.setAttribute('cy', pt.y); },
        onComplete: () => { circle.style.opacity = 0; } });
    }, delay));
  }

  // ---- type-reveal helpers (shared by engine intros and scenes) ----
  // Split a heading into LINES only (at explicit <br>). Reveals rise whole lines —
  // NEVER individual characters (per-char inline-blocks let lines break mid-word).
  function splitLines(el) {
    if (el.dataset.done) return;
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i)
      .map(html => `<span class="clip"><span class="lineInner">${html}</span></span>`)
      .join('');
    el.dataset.done = '1';
  }
  // Keep each intended (<br>-delimited) line on ONE visual line: shrink the heading until
  // no line wraps. "Fit big type to the frame" — robust to any column width, no mid-word cuts.
  function fitHeading(el) {
    if (el.dataset.fit) return; el.dataset.fit = '1';
    const lines = [...el.querySelectorAll('.lineInner')];
    if (!lines.length) return;
    const wraps = l => { const lh = parseFloat(getComputedStyle(l).lineHeight) || parseFloat(getComputedStyle(l).fontSize) * 1.2; return l.offsetHeight > lh * 1.3; };
    let guard = 0;
    while (lines.some(wraps) && guard++ < 26) {
      const cur = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = (cur * 0.94).toFixed(1) + 'px';
    }
  }
  // The .clip mask is only needed WHILE a line rises. Once landed, release it so
  // descenders (g, y, p) are never clipped at rest.
  function releaseClips(el) { el.querySelectorAll('.clip').forEach(c => { c.style.overflow = 'visible'; }); }

  // ---- scene registry ----
  const scenes = {};
  function registerScene(name, scene) { scenes[name] = scene; }
  function sceneFor(el) { return scenes[el.dataset.scene] || null; }
  function stopScenes() { Object.values(scenes).forEach(s => s.stop()); }
  // Ask scenes to consume an arrow key (e.g. the s5 reel stepper). True = consumed.
  function handleSceneKey(dir) { return Object.values(scenes).some(s => s.handleKey && s.handleKey(dir)); }

  return {
    EASE, MOTION, DS, reduceMotion,
    newScene, dsA, dsWait, dsDraw, dsHide, dsLen, florPulse,
    splitLines, fitHeading, releaseClips,
    registerScene, sceneFor, stopScenes, handleSceneKey,
    nav: null,   // { next, prev } — installed by engine.js at load
  };
})();
