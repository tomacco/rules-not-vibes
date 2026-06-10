/* ============================================================
   SCENE "jobs" — S11b · finale.
   Hold black → kinetic word-by-word rise (technology + liberal
   arts + humanities) → the heart draws in, then beats. The
   speaker says the Jobs line aloud — no quote on screen.
   Kit-timed (dsA/dsWait → DS speed-up applies).
   ============================================================ */
(function () {
  'use strict';
  const { utils } = anime;
  const { EASE, dsA, dsWait, dsDraw, dsHide, newScene, registerScene } = Deck;

  let jobsScene = null;
  function jobsStop() { if (!jobsScene) return; jobsScene.cancelled = true; jobsScene.timers.forEach(clearTimeout); jobsScene = null; }
  function jobsRun(el) {
    jobsStop();
    const scene = newScene();
    jobsScene = scene;
    const q = s => el.querySelectorAll(s), one = s => el.querySelector(s);
    const words = el.querySelectorAll('.jb-w'), wis = [...q('.jb-wi')], heart = one('.jb-heart'), hpath = one('.jb-heart path');
    words.forEach(w => w.style.overflow = 'hidden');
    utils.set(wis, { translateY: '115%' });
    utils.set(heart, { opacity: 0, scale: .85 });
    dsHide([hpath]);
    (async () => {
      await dsWait(scene, 600); if (scene.cancelled) return;                                    // hold black — the end cue
      dsA(scene, wis, { translateY: ['115%', '0%'], duration: 1050, delay: anime.stagger(320), ease: EASE,
        onComplete: () => words.forEach(w => w.style.overflow = 'visible') });                   // weighty word-by-word rise
      await dsWait(scene, 2600); if (scene.cancelled) return;
      utils.set(heart, { opacity: 1 });
      dsDraw(scene, [hpath], 900, 0, 0);                                                          // heart draws
      await dsWait(scene, 920); if (scene.cancelled) return;
      dsA(scene, heart, { keyframes: [{ scale: 1.18 }, { scale: 1 }, { scale: 1.12 }, { scale: 1 }], duration: 1150, ease: 'inOutSine' }); // ...and beats
    })();
  }

  registerScene('jobs', { run: jobsRun, stop: jobsStop });
})();
