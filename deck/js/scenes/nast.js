/* ============================================================
   SCENE "nast" — S11 · the NAST teaser (product reveal).
   A movie-trailer sting on black. Introduces ONE shock color
   (Rose's pink↔purple — see scenes.css --pink/--purple) to break
   the deck's bone/black. It SHOWS, never explains, in 3 SECTIONS:
     I.  THE TEST — every creative scanned against the rules
         (brandbook + tone of voice) → ON BRAND.
     II. THE METAPRODUCT — one core spawns shareable subtools.
     III.END CARD — the NAST logotype.
   Pacing: each section plays, HOLDS ~10s, then auto-advances to
   the next. The presenter can step sections early with → / ← ;
   on the last section → leaves to the finale. Run at HALF the
   kit pace (local SLOW) for cinema, WITHOUT touching the global DS.
   ============================================================ */
(function () {
  'use strict';
  const { utils } = anime;
  const { EASE, dsDraw, dsHide, florPulse, splitLines, fitHeading, releaseClips, newScene, registerScene } = Deck;

  const HOLD = 10000;   // ms a section stays up before auto-advancing (presenter can skip with arrows)

  let S = null;
  function stop() { if (!S) return; S.cancelled = true; S.timers.forEach(clearTimeout); S = null; }

  function run(el) {
    stop();
    const scene = newScene(); S = scene;

    // Run THIS scene at half the kit's default pace (slower = more cinematic) WITHOUT touching
    // the global DS that every other scene shares. Local dsA/dsWait shadow the kit helpers and
    // stretch every duration/wait by SLOW; dsDraw/florPulse get ×SLOW at their call sites.
    const SLOW = 2;
    const dsA = (sc, t, p) => {
      const o = { ...p };
      if (typeof o.duration === 'number') o.duration *= SLOW;
      if (typeof o.delay === 'number') o.delay *= SLOW;
      return Deck.dsA(sc, t, o);
    };
    const dsWait = (sc, ms) => Deck.dsWait(sc, ms * SLOW);

    const q = s => [...el.querySelectorAll(s)], one = s => el.querySelector(s);

    const acts = q('.nt-act');
    const grid = one('.nt-act-grid'), meta = one('.nt-act-meta'), end = one('.nt-act-end');
    const tiles = q('.nt-tile'), checks = q('.nt-check'), beam = one('.nt-beam'), stamp = one('.nt-stamp'), gridCap = one('.nt-act-grid .nt-cap');
    const core = one('.nt-core'), nodes = q('.nt-node'), links = q('.nt-link'), pulses = q('.nt-linkpulse'), metaCap = one('.nt-act-meta .nt-cap');
    const logo = one('.nt-logo'), rule = one('.nt-rule'), tag = one('.nt-tag'), soon = one('.nt-soon');

    // Build the radial links core-centre → each node-centre, in station-local px (= the SVG
    // viewBox 0 0 1920 1080; offset* is unscaled by the camera).
    const cc = { x: core.offsetLeft + core.offsetWidth / 2, y: core.offsetTop + core.offsetHeight / 2 };
    const nv = nodes.map(n => ({ x: n.offsetLeft + n.offsetWidth / 2, y: n.offsetTop + n.offsetHeight / 2 }));
    links.forEach((p, i) => p.setAttribute('d', `M${cc.x} ${cc.y} L${nv[i].x} ${nv[i].y}`));

    // ---- per-act reset (so a section can be re-entered cleanly when stepping back) ----
    function resetGrid() {
      utils.set(tiles, { opacity: 0, scale: .8, translateY: 18 });
      tiles.forEach(t => t.classList.remove('ok'));
      utils.set(checks, { opacity: 0, scale: 0 });
      utils.set(beam, { opacity: 0, translateY: -40 });
      utils.set(stamp, { opacity: 0, scale: 1.7, rotate: -9 });
      utils.set(gridCap, { opacity: 0, translateY: 16 });
    }
    function resetMeta() {
      utils.set(core, { opacity: 0, scale: .3 });
      nodes.forEach((n, i) => utils.set(n, { opacity: 0, scale: .2, translateX: cc.x - nv[i].x, translateY: cc.y - nv[i].y }));
      dsHide(links);
      utils.set(pulses, { opacity: 0 });
      utils.set(metaCap, { opacity: 0, translateY: 16 });
    }
    function resetEnd() {
      splitLines(logo); fitHeading(logo);
      utils.set(logo.querySelectorAll('.lineInner'), { translateY: '115%' });
      utils.set(rule, { scaleX: 0 });
      utils.set([tag, soon], { opacity: 0, translateY: 14 });
    }
    utils.set(acts, { opacity: 0 });
    resetGrid(); resetMeta(); resetEnd();

    // ---- section stepping ----
    let act = -1, holdTimer = null;
    function clearHold() { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } }
    function scheduleHold(next) {                          // hold the finished section, then auto-advance
      clearHold();
      holdTimer = setTimeout(() => { if (!scene.cancelled) gotoAct(next); }, HOLD);
      scene.timers.push(holdTimer);
    }
    function showOnly(a) { acts.forEach(x => { if (x !== a) utils.set(x, { opacity: 0 }); }); }
    function gotoAct(i) {
      if (scene.cancelled || i < 0 || i > 2 || i === act) return;
      clearHold();
      act = i;
      if (i === 0) playGrid(); else if (i === 1) playMeta(); else playEnd();
    }
    // presenter arrows step sections; returns true to consume, false to let the engine change slide.
    scene.step = dir => {
      if (scene.cancelled) return false;
      if (dir > 0) { if (act < 2) { gotoAct(act + 1); return true; } return false; }   // last → leave to finale
      if (act > 0) { gotoAct(act - 1); return true; }                                  // first ← → leave to prev slide
      return false;
    };

    function validateRow(r) {
      [[0, 1, 2], [3, 4, 5]][r].forEach(idx => {
        tiles[idx].classList.add('ok');
        utils.set(checks[idx], { opacity: 1 });
        dsA(scene, checks[idx], { scale: [0, 1.3, 1], duration: 460, ease: 'out(4)' });
      });
    }

    // ===== ACT I — THE TEST =====
    async function playGrid() {
      const tok = act; showOnly(grid); resetGrid();
      dsA(scene, grid, { opacity: [0, 1], duration: 200 });
      dsA(scene, tiles, { opacity: [0, 1], scale: [.8, 1], translateY: [18, 0], duration: 520, delay: anime.stagger(70), ease: 'out(3)' });
      await dsWait(scene, 760); if (scene.cancelled || act !== tok) return;
      utils.set(beam, { opacity: 1 });
      dsA(scene, beam, { translateY: [-40, 500], duration: 1150, ease: 'inOutSine', onComplete: () => { beam.style.opacity = 0; } });
      await dsWait(scene, 360); if (scene.cancelled || act !== tok) return;
      validateRow(0);
      await dsWait(scene, 470); if (scene.cancelled || act !== tok) return;
      validateRow(1);
      await dsWait(scene, 470); if (scene.cancelled || act !== tok) return;
      utils.set(stamp, { opacity: 1 });
      dsA(scene, stamp, { scale: [1.7, .9, 1], rotate: [-9, -6, -6], duration: 640, ease: 'out(4)' });
      dsA(scene, gridCap, { opacity: [0, 1], translateY: [16, 0], duration: 480, delay: 140 });
      await dsWait(scene, 700); if (scene.cancelled || act !== tok) return;
      scheduleHold(1);
    }

    // ===== ACT II — THE METAPRODUCT =====
    async function playMeta() {
      const tok = act; showOnly(meta); resetMeta();
      dsA(scene, meta, { opacity: [0, 1], duration: 200 });
      dsA(scene, core, { opacity: [0, 1], scale: [.3, 1], duration: 560, ease: 'out(4)' });
      await dsWait(scene, 540); if (scene.cancelled || act !== tok) return;
      dsDraw(scene, links, 560 * SLOW, 0, 70 * SLOW);
      nodes.forEach((n, i) => dsA(scene, n, {
        opacity: [0, 1], scale: [.2, 1], translateX: [cc.x - nv[i].x, 0], translateY: [cc.y - nv[i].y, 0],
        duration: 660, delay: i * 90, ease: 'out(4)'
      }));
      await dsWait(scene, 760); if (scene.cancelled || act !== tok) return;
      links.forEach((p, i) => florPulse(scene, pulses[i], p, 780 * SLOW, i * 70 * SLOW));
      dsA(scene, metaCap, { opacity: [0, 1], translateY: [16, 0], duration: 480 });
      await dsWait(scene, 700); if (scene.cancelled || act !== tok) return;
      scheduleHold(2);
    }

    // ===== ACT III — END CARD (last section: holds; presenter → leaves) =====
    async function playEnd() {
      const tok = act; showOnly(end); resetEnd();
      dsA(scene, end, { opacity: [0, 1], duration: 200 });
      const logoLines = logo.querySelectorAll('.lineInner');
      dsA(scene, logoLines, { translateY: ['115%', '0%'], duration: 900, ease: EASE, onComplete: () => releaseClips(logo) });
      dsA(scene, logo, { scale: [1.08, 1], duration: 900, ease: 'out(3)' });
      await dsWait(scene, 640); if (scene.cancelled || act !== tok) return;
      dsA(scene, rule, { scaleX: [0, 1], duration: 540, ease: 'inOutQuart' });
      await dsWait(scene, 360); if (scene.cancelled || act !== tok) return;
      dsA(scene, tag, { opacity: [0, 1], translateY: [14, 0], duration: 520 });
      await dsWait(scene, 320); if (scene.cancelled || act !== tok) return;
      dsA(scene, soon, { opacity: [0, 1], translateY: [14, 0], duration: 520 });
    }

    gotoAct(0);   // kick off section I
  }

  function handleKey(dir) { return S && S.step ? S.step(dir) : false; }

  registerScene('nast', { run, stop, handleKey });
})();
