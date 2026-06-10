# Deck architecture — READ BEFORE EDITING

> Spatial talk deck, no build step. Plain files served as-is (python http.server locally,
> GitHub Pages in prod). If your change needs a bundler, transpiler, or npm install, it
> does not belong here.

## File map — edit the smallest file that owns your change

```
deck/
├── index.html        Station MARKUP only (+ <link>/<script> wiring). No CSS, no JS.
├── css/
│   ├── base.css      Design tokens, .station frame, shared type, HUD/rail, dark/center variants
│   ├── stations.css  Per-station layout for stations WITHOUT data-scene (one banner per station, DOM order)
│   └── scenes.css    Per-station CSS for stations WITH data-scene (one banner per station, DOM order)
├── js/
│   ├── scene-kit.js  Global `Deck` namespace: motion constants, animation helpers, scene registry
│   ├── engine.js     Camera, goto()/navigation, HUD, generic intros, site auto-scroll, input, boot
│   └── scenes/       One file per bespoke scene: stamp, reel(ds), orch, flora, pdemo, jobs
└── ARCHITECTURE.md   This file
```

**Placement rule:** does the station have a `data-scene` attribute? → its CSS goes in
`scenes.css`, its behavior in `js/scenes/<name>.js`. No `data-scene`? → CSS in
`stations.css`, behavior is the engine's generic intro (`data-split` / `data-fade` markers).

**Load order contract (do not reorder script tags):**
`anime.umd.min.js → scene-kit.js → js/scenes/*.js → engine.js`.
Scene files register themselves at load; the engine boots last and dispatches the first
station. anime.js v4 UMD: named exports live on the global — `anime.animate`,
`anime.stagger`, `anime.utils`.

## Invariants — violating any of these has already caused real bugs

1. **[NON-NEGOTIABLE] Monotone staircase.** Every "next" transition moves pure RIGHT
   (`dx>0, dy=0`) or pure DOWN (`dy>0, dx=0`). Grid units: R = +2300, D = +1450.
   Inserting/deleting a station means recomputing `data-x`/`data-y` for EVERY station
   after it. Always verify after touching coordinates:
   ```
   node -e 'const h=require("fs").readFileSync("deck/index.html","utf8");const re=/<section class="station[^"]*" id="(s[0-9a-z]+)" data-name="([^"]*)" data-x="(-?\d+)" data-y="(-?\d+)"/g;let m,s=[];while((m=re.exec(h)))s.push({id:m[1],x:+m[3],y:+m[4]});let ok=1;for(let i=1;i<s.length;i++){const dx=s[i].x-s[i-1].x,dy=s[i].y-s[i-1].y;if(!((dx>0&&dy===0)||(dy>0&&dx===0))){ok=0;console.log("BAD",s[i-1].id,s[i].id,dx,dy)}}console.log(s.length,ok?"OK":"FAIL")'
   ```
2. **[NON-NEGOTIABLE] Never override a station's `position`.** `.station` is
   `position:absolute` — the engine places it AND it is the containing block for
   absolutely-positioned children. A per-station class with `position:relative` renders
   content off-screen.
3. **reset()/play() split.** Set an animated unit's initial state BEFORE its container is
   visible; fire tweens after the reveal beat. Otherwise the final state flashes on reveal.
4. **Headings split into LINES, never characters.** Per-char inline-blocks let the browser
   break words mid-word ("sys/tem"). Use `Deck.splitLines` + `Deck.fitHeading`.
5. **Motion is content — never gate it on `prefers-reduced-motion`.** Reduced-motion gets
   a calmer scale (`Deck.MOTION`), never a dead cut. Headless Chrome reports
   reduced-motion by default; the verification harness must emulate `no-preference`.
6. **Every station gets an arrival transition,** even subtle. Generic stations get it free
   via `data-split="lines"` / `data-fade` markers; scenes own their station's entire intro.
7. **CSS cascade discipline.** Files load base → stations → scenes. Never override a
   same-specificity selector from a *different* file — keep the override next to the
   original rule. No dead selectors: delete CSS when you delete markup.

## How to add a station (no scene)

1. Add the `<section class="station" id="sXX" data-name="..." data-x="..." data-y="...">`
   in `index.html` at its narrative position. Mark headings `data-split="lines"`, other
   reveal elements `data-fade`.
2. Recompute the staircase coords for all later stations; run the verify one-liner.
3. Add a `/* ---------- SXX · NAME ---------- */` banner block in `stations.css`.
4. HUD numbering, rail dots, and intro animation are automatic.

## How to add a scene (bespoke animated station)

1. Create `js/scenes/<name>.js`:
   ```js
   (function () {
     'use strict';
     const { dsA, dsWait, newScene, registerScene } = Deck;
     let scene = null;
     function stop() { if (!scene) return; scene.cancelled = true; scene.timers.forEach(clearTimeout); scene = null; }
     function run(el) {
       stop();
       scene = newScene();
       // reset all animated units FIRST (invariant 3), then an async IIFE that
       // checks `if (scene.cancelled) return;` after every await
     }
     registerScene('<name>', { run, stop });   // + handleKey(dir) if it steps on arrows
   })();
   ```
2. Add `data-scene="<name>"` to the station element.
3. Add ONE `<script src="js/scenes/<name>.js">` tag in `index.html` (before engine.js).
4. CSS goes in `scenes.css` under a station banner. **Do not touch engine.js** — the
   registry dispatches run/stop/boot/deep-link automatically.

Timing: kit helpers `dsA`/`dsWait` scale by `Deck.DS` (0.55 → 45% faster — presenter
pace). Scenes that must feel slow/weighty (stamp, pdemo) use raw `anime.animate` with
durations × `Deck.MOTION` instead. Pick one per scene and say so in its header comment.

## Verification — run this before calling any deck change done

1. Staircase one-liner (above) whenever coordinates changed.
2. Serve: `python -m http.server 8000 --bind 127.0.0.1` from repo root →
   `http://127.0.0.1:8000/deck/index.html#sXX` (deep-link = rehearsal/verify entry).
3. Animated states need CDP, not bare `--screenshot` (which fires too early and gets
   reduced-motion): headless Chrome + `Emulation.setEmulatedMedia` no-preference +
   `Page.reload`, then probe/screenshot. Full recipe in the workbench `CLAUDE.md`
   ("Verification harness"). Scratch scripts live in `_verify/` (gitignored).
4. Zero `Runtime.exceptionThrown` events is part of "passing".

## Porting from the master monolith (until cutover)

While `master` still carries the single-file `deck/index.html`, its diffs port here
mechanically — every hunk lands in exactly one place:

| Hunk in the monolith                          | Lands in                                  |
|-----------------------------------------------|-------------------------------------------|
| `<style>` rules for a no-scene station         | `css/stations.css` (its banner)           |
| `<style>` rules for a `data-scene` station     | `css/scenes.css` (its banner)             |
| tokens / HUD / shared-type rules               | `css/base.css`                            |
| `<section class="station">` markup             | `index.html` (verbatim — markup is shared)|
| scene-function changes (`xRun`/`xStop`/…)      | `js/scenes/<name>.js`                     |
| camera / goto / intro / scroll / boot changes  | `js/engine.js`                            |
| new hard-wired scene branches in `goto()`/boot | DON'T port the branches — register the scene instead |
| new shared helpers                              | `js/scene-kit.js` (+ expose on `Deck`)    |

After porting: run the staircase one-liner, then CDP-compare the same station on both
trees (serve master on one port, this tree on another) — world transforms must match.

## Style

- JS: vanilla IIFEs, `'use strict'`, no frameworks, no modules (file:// tolerance not
  required, but no-build IS). 2-space indent. Comments explain *why* (a constraint or a
  trap), not *what*.
- CSS: one banner comment per station, station order = DOM order. Tokens from `:root`
  only — never hardcode bone/black (`var(--bg)` / `var(--ink)`).
- Design rules (type, color, spacing, motion feel) live in the workbench `CLAUDE.md`
  "Design system" section — that section is the contract; this file is the mechanics.
