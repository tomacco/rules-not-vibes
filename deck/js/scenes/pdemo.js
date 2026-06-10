/* ============================================================
   SCENE "pdemo" — S8f–S8j · PLETOR demo walk-through.
   Caption rises, the screenshot window wipes in (clip-path) then
   drifts on a slow Ken Burns; the DEMO title card pops with a
   blinking caret. One scene serves all five stations.
   Uses raw animate()/wait() scaled by MOTION (not the DS speed-up).
   ============================================================ */
(function () {
  'use strict';
  const { animate, utils } = anime;
  const { EASE, MOTION, splitLines, fitHeading, releaseClips, newScene, registerScene } = Deck;

  let pdScene = null;
  function pdStop() {
    if (!pdScene) return;
    pdScene.cancelled = true; pdScene.timers.forEach(clearTimeout);
    document.querySelectorAll('.pd-img.kb, .pz-img.kb').forEach(i => i.classList.remove('kb'));   // stop off-screen Ken Burns
    pdScene = null;
  }
  function pdRun(el) {
    pdStop();
    const scene = newScene();
    pdScene = scene;
    const one = s => el.querySelector(s), q = s => el.querySelectorAll(s);
    const wait = ms => new Promise(res => scene.timers.push(setTimeout(res, ms * MOTION)));
    const heads = [...q('[data-split="lines"]')];
    heads.forEach(splitLines); heads.forEach(fitHeading);
    const lines = el.querySelectorAll('.lineInner');
    const fades = [...q('[data-fade]')];
    const frame = one('.pd-frame'), img = one('.pd-img'), word = one('.pd-word'), pz = one('.pz-img');
    utils.set(lines, { translateY: '100%' });
    utils.set(fades, { opacity: 0, translateY: 18 });
    if (frame) { utils.set(frame, { opacity: 0, translateY: 34, scale: .96 }); frame.style.clipPath = 'inset(0 100% 0 0)'; }
    if (word) utils.set(word, { opacity: 0, scale: 1.16 });
    if (pz) utils.set(pz, { opacity: 0, scale: 1.16 });
    (async () => {
      if (fades.length) animate(fades, { opacity: [0, 1], translateY: [18, 0], duration: 760 * MOTION, delay: anime.stagger(120 * MOTION), ease: 'out(2)' });
      if (lines.length) animate(lines, { translateY: ['100%', '0%'], duration: 1000 * MOTION, delay: anime.stagger(150 * MOTION), ease: EASE, onComplete: () => releaseClips(el) });
      if (word) {   // DEMO title card — kinetic pop (caret blinks via CSS)
        animate(word, { opacity: [0, 1], scale: [1.16, 1], duration: 900 * MOTION, ease: 'out(4)' });
        return;
      }
      if (pz) {   // full-bleed screenshot: punch in (zoom), then keep drifting
        animate(pz, { opacity: [0, 1], scale: [1.16, 1], duration: 1500 * MOTION, ease: 'out(3)',
          onComplete: () => { if (!scene.cancelled) pz.classList.add('kb'); } });
        return;
      }
      await wait(480); if (scene.cancelled) return;
      if (frame) {
        const w = { v: 100 };
        animate(w, { v: [100, 0], duration: 920 * MOTION, ease: 'inOut(3)', onUpdate: () => { frame.style.clipPath = `inset(0 ${w.v}% 0 0)`; } });
        animate(frame, { opacity: [0, 1], translateY: [34, 0], scale: [.96, 1], duration: 920 * MOTION, ease: 'out(3)',
          onComplete: () => { if (scene.cancelled) return; frame.style.clipPath = 'none'; if (img) img.classList.add('kb'); } });
      }
    })();
  }

  registerScene('pdemo', { run: pdRun, stop: pdStop });
})();
