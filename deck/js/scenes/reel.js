/* ============================================================
   SCENE "ds" — S5 · the design-system reel (No vibes. Only rules.)
   Title rises, flies to the top, then 7 concept animations +
   a grid recap. Auto-advances, but the presenter can take over
   with arrow keys (manual mode). At the end auto STOPS on the
   grid — it does NOT loop (user directive); a manual → leaves
   to the next station.
   ============================================================ */
(function () {
  'use strict';
  const { animate, utils } = anime;
  const { EASE, DS, dsA, dsWait, dsDraw, dsHide, splitLines, fitHeading, releaseClips, newScene, registerScene } = Deck;

  // build the spacing-panel dot grid once at load
  (function buildDs() {
    const grid = document.querySelector('#s5 .sp-grid');
    if (!grid) return;
    const cols = 13, rows = 6, gx = 49, gy = 45, ox = 22, oy = 38;
    let s = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += `<circle class="sp-dot" cx="${ox + c * gx}" cy="${oy + r * gy}" r="3"/>`;
    grid.innerHTML = s;
  })();

  let dsScene = null;
  function dsStop() {
    if (!dsScene) return;
    dsScene.cancelled = true;
    dsScene.timers.forEach(clearTimeout);
    dsScene = null;
  }

  // each concept = { reset } (initial state, set BEFORE the panel is visible → no
  // final-state flash) + { play } (the tweens, fired after the reveal beat)
  const dsConcepts = {
    type: {
      reset(p) { utils.set(p.querySelector('.ds-typeword'), { color: 'rgba(239,237,234,0)', scale: 1.16 }); dsHide(p.querySelectorAll('.ds-underline path')); },
      play(scene, p) {
        dsA(scene, p.querySelector('.ds-typeword'), { color: ['rgba(239,237,234,0)', 'rgba(239,237,234,1)'], scale: [1.16, 1], duration: 1100, ease: 'out(3)' });
        dsDraw(scene, p.querySelectorAll('.ds-underline path'), 850, 250, 0);
      }
    },
    color: {
      reset(p) { p.querySelectorAll('.ds-swatch').forEach(sw => { sw.style.background = '#2a2540'; }); },
      play(scene, p) {
        // real, harmonic palettes — the whole row flips together, so every frame is a
        // cohesive set (never flip swatches independently)
        const palettes = [
          ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#bc6c25'],
          ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#48cae4', '#caf0f8'],
          ['#081c15', '#1b4332', '#2d6a4f', '#40916c', '#74c69d', '#b7e4c7'],
          ['#590d22', '#a4133c', '#c9184a', '#ff4d6d', '#ff8fa3', '#ffb3c1'],
          ['#f72585', '#b5179e', '#7209b7', '#560bad', '#3a0ca3', '#4361ee'],
          ['#582f0e', '#7f4f24', '#936639', '#a68a64', '#b6ad90', '#c2c5aa'],
          ['#ff99c8', '#fcf6bd', '#d0f4de', '#a9def9', '#e4c1f9', '#ffc6ff'],
          ['#6a040f', '#9d0208', '#d00000', '#dc2f02', '#e85d04', '#f48c06']
        ];
        const swatches = [...p.querySelectorAll('.ds-swatch')];
        const apply = pal => swatches.forEach((sw, i) => { sw.style.background = pal[i % pal.length]; });
        const order = []; let last = -1;
        for (let k = 0; k < 11; k++) { let r; do { r = (Math.random() * palettes.length) | 0; } while (r === last); last = r; order.push(r); }
        order.push(0);
        let n = 0;
        const tick = () => { if (scene.cancelled) return; apply(palettes[order[n]]); n++; if (n < order.length) { const t = (n >= order.length - 3 ? 120 + (n - (order.length - 3)) * 70 : 80) * DS; scene.timers.push(setTimeout(tick, t)); } };
        tick();
      }
    },
    space: {
      reset(p) {
        utils.set(p.querySelectorAll('.sp-dot'), { opacity: 0 });
        utils.set(p.querySelectorAll('.sp-box'), { opacity: 0, scale: .92 });
        dsHide(p.querySelectorAll('.sp-bracket'));
        utils.set(p.querySelector('.sp-text'), { opacity: 0 });
      },
      play(scene, p) {
        dsA(scene, p.querySelectorAll('.sp-dot'), { opacity: [0, 1], duration: 600, delay: anime.stagger(11, { grid: [13, 6], from: 'center' }) });
        dsA(scene, p.querySelectorAll('.sp-box'), { opacity: [0, 1], scale: [.92, 1], duration: 600, delay: 350, ease: 'out(3)' });
        dsDraw(scene, p.querySelectorAll('.sp-bracket'), 500, 850, 0);
        dsA(scene, p.querySelector('.sp-text'), { opacity: [0, 1], duration: 400, delay: 1050 });
      }
    },
    hier: {
      reset(p) { utils.set(p.querySelectorAll('.ds-h'), { opacity: 0, translateX: -34 }); },
      play(scene, p) { dsA(scene, p.querySelectorAll('.ds-h'), { opacity: [0, 1], translateX: [-34, 0], duration: 600, delay: anime.stagger(170), ease: 'out(3)' }); }
    },
    cont: {
      reset(p) { utils.set(p.querySelector('.ds-card'), { opacity: 0, scale: .9 }); utils.set(p.querySelectorAll('.ds-card > *'), { opacity: 0, translateY: 16 }); },
      play(scene, p) {
        dsA(scene, p.querySelector('.ds-card'), { opacity: [0, 1], scale: [.9, 1], duration: 600, ease: 'out(3)' });
        dsA(scene, p.querySelectorAll('.ds-card > *'), { opacity: [0, 1], translateY: [16, 0], duration: 500, delay: anime.stagger(110, { start: 320 }), ease: 'out(3)' });
      }
    },
    motion: {
      reset(p) { dsHide(p.querySelectorAll('.ds-curve')); const crv = p.querySelector('.ds-curve'), dot = p.querySelector('.ds-dot'), s = crv.getPointAtLength(0); utils.set(dot, { opacity: 0 }); dot.setAttribute('cx', s.x); dot.setAttribute('cy', s.y); },
      play(scene, p) {
        const curve = p.querySelector('.ds-curve'), dot = p.querySelector('.ds-dot'), L = Deck.dsLen(curve);
        dsDraw(scene, [curve], 1000, 0, 0);
        scene.timers.push(setTimeout(() => {
          if (scene.cancelled) return;
          utils.set(dot, { opacity: 1 });
          const prog = { t: 0 };
          dsA(scene, prog, { t: [0, 1], duration: 1500, ease: 'inOutCubic', loop: 1, alternate: true, onUpdate: () => { const pt = curve.getPointAtLength(L * prog.t); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); } });
        }, 1000 * DS));
      }
    },
    icon: {
      reset(p) { dsHide(p.querySelectorAll('.ds-icon-viz svg path')); },
      play(scene, p) { dsDraw(scene, p.querySelectorAll('.ds-icon-viz svg path'), 700, 0, 130); }
    },
    grid: {
      reset(p) {
        utils.set(p.querySelectorAll('.dg-cell'), { opacity: 0, translateY: 20, scale: .96 });
        p.querySelectorAll('.dg-colors .dg-sw').forEach(s => { s.style.background = '#2a2540'; });
        dsHide(p.querySelectorAll('.dg-cell svg path'));
        utils.set(p.querySelectorAll('.dg-dotc'), { opacity: 0 });
      },
      play(scene, p) {
        dsA(scene, p.querySelectorAll('.dg-cell'), { opacity: [0, 1], translateY: [20, 0], scale: [.96, 1], duration: 600, delay: anime.stagger(85), ease: 'out(3)' });
        const pal = ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#bc6c25'];
        p.querySelectorAll('.dg-colors .dg-sw').forEach((s, i) => { s.style.background = pal[i % pal.length]; });
        dsDraw(scene, p.querySelectorAll('.dg-cell svg path'), 650, 700, 55);
        utils.set(p.querySelectorAll('.dg-dotc'), { opacity: 1 });
      }
    }
  };

  // ---- reel stepper: auto-advances, but the presenter can step with arrows ----
  function dsGoConcept(scene, i) {
    if (scene.cancelled) return;
    if (scene.autoTimer) { clearTimeout(scene.autoTimer); scene.autoTimer = null; }
    const prevIdx = scene.idx;
    if (prevIdx >= 0 && prevIdx !== i) {
      const cur = scene.el.querySelector(`.ds-panel[data-c="${scene.seq[prevIdx][0]}"]`);
      dsA(scene, cur, { opacity: [+getComputedStyle(cur).opacity, 0], translateY: [0, -22], duration: 460, ease: 'in(2)' });
    }
    scene.idx = i;
    const [key, hold] = scene.seq[i];
    const panel = scene.el.querySelector(`.ds-panel[data-c="${key}"]`), c = dsConcepts[key];
    c.reset(panel);
    utils.set(panel, { opacity: 0, translateY: 26 });
    dsA(scene, panel, { opacity: [0, 1], translateY: [26, 0], duration: 560, ease: 'out(2)' });
    (async () => {
      await dsWait(scene, 320);
      if (scene.cancelled || scene.idx !== i) return;
      c.play(scene, panel);
      if (!scene.manual) scene.autoTimer = setTimeout(() => { if (!scene.cancelled) dsAdvance(scene, 1, true); }, hold * DS);
    })();
  }
  function dsAdvance(scene, dir, isAuto) {
    if (!scene || scene.cancelled || !scene.titleDone) return;
    if (!isAuto) scene.manual = true;                  // presenter took control → stop auto-advancing
    if (scene.autoTimer) { clearTimeout(scene.autoTimer); scene.autoTimer = null; }
    let ni = scene.idx + dir;
    if (ni >= scene.seq.length) { if (!isAuto) Deck.nav.next(); return; }   // end: auto STOPS on the grid; manual → next station
    else if (ni < 0) { Deck.nav.prev(); return; }                           // before first → prev station
    dsGoConcept(scene, ni);
  }
  async function dsTitleToTop(scene, el) {
    const title = el.querySelector('.ds-title'), h = title.querySelector('.display');
    splitLines(h); fitHeading(h);
    const lines = h.querySelectorAll('.lineInner');
    utils.set(title, { translateY: 0, scale: 1 });
    utils.set(lines, { translateY: '100%' });
    dsA(scene, lines, { translateY: ['100%', '0%'], duration: 1000, delay: anime.stagger(150), ease: EASE, onComplete: () => releaseClips(h) });
    await dsWait(scene, 1550); if (scene.cancelled) return;
    dsA(scene, title, { translateY: [0, -360], scale: [1, .5], duration: 1100, ease: EASE });
    await dsWait(scene, 850);
  }
  function dsRun(el) {
    dsStop();
    const seq = [['type', 2700], ['color', 2500], ['space', 2700], ['hier', 2300], ['cont', 2500], ['motion', 3200], ['icon', 2500], ['grid', 4600]];
    const scene = newScene({ el, seq, idx: -1, titleDone: false, manual: false, autoTimer: null });
    dsScene = scene;
    el.querySelectorAll('.ds-panel').forEach(p => utils.set(p, { opacity: 0 }));
    (async () => {
      await dsTitleToTop(scene, el);
      if (scene.cancelled) return;
      scene.titleDone = true;
      dsGoConcept(scene, 0);
    })();
  }

  registerScene('ds', {
    run: dsRun,
    stop: dsStop,
    // consume arrows while the reel is active; before the title lands the key is
    // swallowed (no station-nav, no step) — matches presenter expectations
    handleKey(dir) {
      if (!dsScene || dsScene.cancelled) return false;
      if (dsScene.titleDone) dsAdvance(dsScene, dir, false);
      return true;
    }
  });
})();
