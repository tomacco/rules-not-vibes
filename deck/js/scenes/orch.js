/* ============================================================
   SCENE "orch" — S8 · orchestration.
   design-system.md fans out over a bus to every tool; pulses run
   down the drops; each tool ships a DISTINCT on-brand artifact.
   Kit-timed (dsA/dsWait → DS speed-up applies).
   ============================================================ */
(function () {
  'use strict';
  const { animate, utils } = anime;
  const { EASE, dsA, dsWait, splitLines, fitHeading, releaseClips, newScene, registerScene } = Deck;

  let orchScene = null;
  function orchStop() { if (!orchScene) return; orchScene.cancelled = true; orchScene.timers.forEach(clearTimeout); orchScene = null; }
  function orchRun(el) {
    orchStop();
    const scene = newScene();
    orchScene = scene;
    const q = s => el.querySelectorAll(s), one = s => el.querySelector(s);
    const h = one('h2.display'); splitLines(h); fitHeading(h);
    const lines = h.querySelectorAll('.lineInner');
    utils.set(lines, { translateY: '100%' });
    utils.set(one('.eyebrow'), { opacity: 0 });
    utils.set(one('.orch-src'), { opacity: 0, scale: .92 });
    utils.set(one('.orch-stem'), { scaleY: 0 });
    utils.set(one('.orch-bus'), { scaleX: 0 });
    utils.set(q('.orch-drop'), { scaleY: 0 });
    utils.set(q('.orch-pulse'), { opacity: 0, translateY: 0 });
    utils.set(q('.ot-name'), { opacity: 0 });
    utils.set(q('.ot-out'), { opacity: 0, translateY: 22, scale: .94 });
    (async () => {
      dsA(scene, one('.eyebrow'), { opacity: [0, 1], duration: 500 });
      dsA(scene, lines, { translateY: ['100%', '0%'], duration: 1000, delay: anime.stagger(150), ease: EASE, onComplete: () => releaseClips(h) });
      await dsWait(scene, 1150); if (scene.cancelled) return;
      dsA(scene, one('.orch-src'), { opacity: [0, 1], scale: [.92, 1], duration: 520, ease: 'out(3)' });
      await dsWait(scene, 360); if (scene.cancelled) return;
      dsA(scene, one('.orch-stem'), { scaleY: [0, 1], duration: 260, ease: 'out(2)' });
      await dsWait(scene, 220); if (scene.cancelled) return;
      dsA(scene, one('.orch-bus'), { scaleX: [0, 1], duration: 560, ease: 'inOutQuad' });
      await dsWait(scene, 520); if (scene.cancelled) return;
      dsA(scene, q('.orch-drop'), { scaleY: [0, 1], duration: 380, delay: anime.stagger(100), ease: 'out(2)' });
      await dsWait(scene, 440); if (scene.cancelled) return;
      q('.orch-pulse').forEach((pl, i) => { utils.set(pl, { opacity: 1 }); dsA(scene, pl, { translateY: [0, 40], duration: 380, delay: i * 100, ease: 'inOutQuad', onComplete: () => { pl.style.opacity = 0; } }); });
      dsA(scene, q('.ot-name'), { opacity: [0, 1], duration: 480, delay: anime.stagger(100) });
      await dsWait(scene, 600); if (scene.cancelled) return;
      dsA(scene, q('.ot-out'), { opacity: [0, 1], translateY: [22, 0], scale: [.94, 1], duration: 560, delay: anime.stagger(120), ease: 'out(3)' });
    })();
  }

  registerScene('orch', { run: orchRun, stop: orchStop });
})();
