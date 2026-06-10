/* ============================================================
   SCENE "stamp" — S2r · The reveal.
   Each author toon SLAMS onto its page (drop-in, scale overshoot
   + rotate), dust puff on landing, page dims/desaturates.
   Deliberately slow + weighty: uses its OWN raw animate()/wait()
   scaled by MOTION — NOT the kit's DS speed-up.
   ============================================================ */
(function () {
  'use strict';
  const { animate, utils } = anime;
  const { EASE, MOTION, splitLines, fitHeading, releaseClips, newScene, registerScene } = Deck;

  let stampScene = null;
  function stampStop() { if (!stampScene) return; stampScene.cancelled = true; stampScene.timers.forEach(clearTimeout); stampScene = null; }
  function stampRun(el) {
    stampStop();
    const scene = newScene();
    stampScene = scene;
    const q = s => el.querySelectorAll(s), one = s => el.querySelector(s);
    // local timing (NOT the DS speed-up): this scene is deliberately slow + weighty
    const wait = ms => new Promise(res => scene.timers.push(setTimeout(res, ms * MOTION)));
    const A = (t, p) => animate(t, Object.assign(p, { duration: (p.duration || 600) * MOTION }));
    // heading + caps reveal (the scene owns this station's intro, so playIntro is skipped)
    const h = one('.ab-q'); splitLines(h); fitHeading(h);
    const hlines = h.querySelectorAll('.lineInner');
    const caps = [...q('.cap')];
    utils.set(hlines, { translateY: '100%' });
    utils.set(caps, { opacity: 0, translateY: 14 });
    // each stamp lands at a RANDOM spot inside its page; CSS hides them till the slam
    const frames = [...q('.frame')], puffs = [...q('.puff')];
    const stamps = [
      { el: one('.stamp-a'), frame: frames[0], puff: puffs[0], rot: -(5 + Math.random() * 10) },
      { el: one('.stamp-b'), frame: frames[1], puff: puffs[1], rot:  (5 + Math.random() * 10) },
    ];
    stamps.forEach(s => {
      s.frame.classList.remove('dim');
      s.x = 120 + Math.random() * 320;          // inside the 560×360 screen, clear of edges/tag
      s.y = 100 + Math.random() * 150;
      s.el.style.left = s.x + 'px'; s.el.style.top = s.y + 'px';
      s.puff.style.left = s.x + 'px'; s.puff.style.top = s.y + 'px';   // dust bursts where it lands
      utils.set(s.el, { opacity: 0, scale: 3, rotate: s.rot - 18, translateY: -120 });
      utils.set(s.puff.querySelectorAll('i'), { opacity: 0, scale: .3, translateX: 0, translateY: 0 });
    });

    function burst(puff) {
      const blobs = [...puff.querySelectorAll('i')];
      blobs.forEach((b, i) => {
        const a = (i / blobs.length) * Math.PI * 2 + Math.random() * 0.6, R = 78 + (i % 2) * 32;
        A(b, { translateX: [0, Math.cos(a) * R], translateY: [0, Math.sin(a) * R],
          scale: [.3, 1.8], opacity: [1, 0], duration: 860, ease: 'out(3)' });
      });
    }
    async function slam(s) {
      // drop in from above + scale overshoot (3 → .85 → 1) = a heavy, deliberate stamp
      A(s.el, { translateY: [-120, 0], opacity: [0, 1, 1], scale: [3, .85, 1],
        rotate: [s.rot - 18, s.rot, s.rot], duration: 760, ease: 'out(4)' });
      await wait(620); if (scene.cancelled) return;     // impact: fire dust + dim the page
      burst(s.puff); s.frame.classList.add('dim');
    }
    (async () => {
      A(hlines, { translateY: ['100%', '0%'], duration: 1050, delay: anime.stagger(170), ease: EASE, onComplete: () => releaseClips(h) });
      A(caps, { opacity: [0, 1], translateY: [14, 0], duration: 760, delay: anime.stagger(130, { start: 320 }), ease: 'out(2)' });
      await wait(2000); if (scene.cancelled) return;     // 2s beat after arrival before the first stamp slams
      await slam(stamps[0]); if (scene.cancelled) return;
      await wait(1000); if (scene.cancelled) return;     // ~a second between the two stamps
      await slam(stamps[1]);
    })();
  }

  registerScene('stamp', { run: stampRun, stop: stampStop });
})();
