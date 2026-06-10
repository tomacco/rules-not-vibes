/* ============================================================
   SCENE "flora" — S8e · generic node-canvas graph.
   Constraint nodes appear → wires draw → pulses flow into the
   AI-models node → output node lands, on-brand.
   Kit-timed (dsA/dsWait → DS speed-up applies).
   ============================================================ */
(function () {
  'use strict';
  const { utils } = anime;
  const { dsA, dsWait, dsDraw, dsHide, florPulse, newScene, registerScene } = Deck;

  let florScene = null;
  function florStop() { if (!florScene) return; florScene.cancelled = true; florScene.timers.forEach(clearTimeout); florScene = null; }
  function florRun(el) {
    florStop();
    const scene = newScene();
    florScene = scene;
    const q = s => el.querySelectorAll(s), one = s => el.querySelector(s);
    const wires = [...q('.flora-wires .fw')], pulses = [...q('.flora-wires .fp')];
    const cNodes = [...q('.fn-in')];
    utils.set(one('.flora-eyebrow'), { opacity: 0 });
    utils.set([...cNodes, one('.fn-model'), one('.fn-out')], { opacity: 0, scale: .94 });
    dsHide(wires);
    utils.set(pulses, { opacity: 0 });
    (async () => {
      dsA(scene, one('.flora-eyebrow'), { opacity: [0, 1], duration: 500 });
      await dsWait(scene, 200); if (scene.cancelled) return;
      dsA(scene, cNodes, { opacity: [0, 1], scale: [.94, 1], duration: 520, delay: anime.stagger(150), ease: 'out(3)' });   // create design elements & constraints
      await dsWait(scene, 820); if (scene.cancelled) return;
      wires.slice(0, 3).forEach((w, i) => dsDraw(scene, [w], 620, i * 90, 0));
      await dsWait(scene, 620); if (scene.cancelled) return;
      [0, 1, 2].forEach(i => florPulse(scene, pulses[i], wires[i], 560, i * 90));                                           // info flows in
      await dsWait(scene, 540); if (scene.cancelled) return;
      dsA(scene, one('.fn-model'), { opacity: [0, 1], scale: [.94, 1], duration: 520, ease: 'out(3)' });
      await dsWait(scene, 460); if (scene.cancelled) return;
      dsDraw(scene, [wires[3]], 560, 0, 0);
      await dsWait(scene, 360); if (scene.cancelled) return;
      florPulse(scene, pulses[3], wires[3], 620, 0);
      await dsWait(scene, 520); if (scene.cancelled) return;
      dsA(scene, one('.fn-out'), { opacity: [0, 1], scale: [.94, 1], duration: 660, ease: 'out(3)' });                      // coherent output
    })();
  }

  registerScene('flora', { run: florRun, stop: florStop });
})();
