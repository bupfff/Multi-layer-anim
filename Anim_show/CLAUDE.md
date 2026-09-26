# Project context

A local, working copy of the animejs.com homepage, originally captured with a
site-ripper, kept so I can tinker with the code and learn how the hero
animation is built. Study only — not for reuse in my own projects.

Platform: macOS. Run it with `./start.command` (or `python3 serve.py`).
A server is required; `file://` will not work (ES modules + CORS).

## State: working

The page loads with a clean console. All 22 Draco-compressed GLB models
decode and render, fonts are correct, no 404s.

## The bug that actually broke it

The ripper's JS beautifier was too old to understand `??` and `?.`, and split
them into `? ?` and `? .`. That is a syntax error, so the bundle never parsed
and the page was a dead static layout. It was NOT primarily a missing-assets
problem, which is the misleading symptom.

Affected files were `chunk-N6I4AEHZ.js` and `chunk-WXAKRBIO.js`.

**Do not "fix" this with a global find-and-replace.** `home.js` contains 7
legitimate ternaries of the form `u ? .001 : 150` and `O ? .25 : .55` that a
blind `? .` -> `?.` replacement destroys. The originals were re-downloaded and
re-formatted with Prettier 3 instead. Untouched server copies are kept in
`_original-minified/` for diffing.

## Assets the ripper missed (they load at runtime from JS)

Downloaded from `https://animejs.com/assets/`:
- `assets/models/module-*.glb` — 22 models, all Draco-compressed
- `assets/draco/draco_wasm_wrapper.js` + `draco_decoder.wasm` — required,
  not optional, because every model uses `KHR_draco_mesh_compression`
- `assets/json/easings.json`, `assets/images/favicon.png`,
  `assets/images/icons/drop-down.svg`
- `assets/fonts/*.woff2` — the ripped ones were 71-byte text placeholders

`sponsors/*` are static saves of runtime-fetched HTML fragments. GitHub
sponsor avatars remain remote (as on the real site) and need internet;
nothing else does.

## Local customisations (stripped-down view)

The page was trimmed down to "just the animation". Every change is a HIDE or a
disable, never a delete — the original markup is all still in `index.html`.

- `assets/css/custom.css` — new file, linked last in `<head>` so it overrides
  `home.css`. Five clearly-commented blocks: hero title, toolbox title,
  sponsors, end-of-page links + footer, and dead-link cursors. Delete a block
  to bring that piece back.
- Hero and toolbox titles are hidden with `visibility: hidden`, **not** emptied.
  `home.js` splits `#intro h2` / `#intro p` into per-character spans and runs
  the `.animate-anything` scramble loop over them (`sr("#intro h2")`, `Qi()`).
  Emptying those elements throws at load. Edit the text in `index.html` and
  drop the CSS block when you want real titles back.
- The `#sponsors` section stays in the DOM (only its contents are hidden) so
  the scroll timeline and its 3D animation still run.
- The runtime sponsor fetches are gone: the three `<sponsors-list>` tags and
  the one `<funding-level>` tag are commented out in `index.html`, so their
  custom elements never connect and never call `loadSponsors()`. A clean load
  now makes zero requests to `/sponsors/*`. Uncomment to restore.
- `#site-header` is hidden (blocks 6-7 of custom.css): logo, nav, and the
  hamburger. `#site-menu` IS the side menu that button slides out, so hiding
  the header kills both. The hero's "npm i animejs" box and "Learn more"
  button (`.heading-links .ui-group`) are hidden too.
- Internal links: every relative `href` on an `<a>` was renamed to `data-href`
  (43 of them), so they render but do not navigate — those were the ones
  404ing. External links (github, x, codepen, bsky, mailto) and in-page `#`
  anchors still work. To restore: rename `data-href` back to `href`.
- `index.html.orig-backup` is the pre-customisation copy, and
  `index.html.bak-before-link-cleanup` is the copy from just before the dead
  markup below was removed.

### Dead site markup: what was removed, and the one thing that cannot be

Everything below was invisible (`display: none`, zero height), so none of it
changed the page's geometry — `docH`, `homeH` and every `[data-label]` height
were identical before and after. Verified, not assumed.

- **`#site-footer` — DELETED.** Sponsor block, site links, socials, email
  signup. Safe: the signup is a custom element whose `setupFormListener`
  guards every lookup with `t &&`.
- **`#sponsors` inner `.section-content` — DELETED.** The "Our sponsors" copy
  and its "become a sponsor" link. **The `<section id="sponsors">` shell and
  its two `.section-spacer` divs STAY** — it carries `data-label`, so the
  master timeline measures its height. Deleting it would shorten the finale.
- **`og:*` / `twitter:*` meta — DELETED.** Advertised the page as animejs.com
  and pointed at an og-image that was never part of the rip.
- **`#site-header` — KEPT, links stripped.** This one **cannot be deleted.**
  The site's own bootstrap does `document.querySelector("#site-header")`,
  `"#site-menu"`, `"#toggle-site-menu"` and dereferences them with no null
  checks (`chunk-WXAKRBIO.js` ~5976 — it calls `.querySelectorAll("rect")` on
  the toggle and reads `offsetWidth` off the menu), and separately does
  `document.querySelectorAll("#docs-versions option")[0].textContent = ...`
  (~6082). Deleting the header black-screens the entire page with
  `Cannot read properties of null`. I tried it; that is exactly what happened.
  Instead every `href` and `target` was stripped from it and the version
  `<option value>`s were blanked, so the structure the bootstrap needs remains
  but no URLs back to the original site do.

`index.html` now contains **zero** external URLs. The only `href`s at runtime
are 13 in-page `#` anchors that `home.js` generates itself for the progress-bar
scroll buttons.

- End-of-page dot shape: the heart was a 13x13 intensity grid in the `za`
  array in `home.js` (~line 8035) - each value scales one circle
  (`scale = v > 0.1 ? v * 12 : 0`) and the stagger ripples out from index 84,
  the grid centre. It is now a ring. The original heart values are kept
  directly above it as a comment, so swapping back is one edit. Any 169-value
  0..1 grid works as a new shape.

Kept deliberately: all feature-section titles, the bundle-size stats card, and
the scroll progress bar bottom-right.

## Structure: a title, eight acts, then the finale

The page is now a long scroll: a title card and eight "one element at a time"
acts, all on a single pinned stage that morphs between them, then the original
sequence as the finale.

    #showcase    (new)  title + 8 acts, pinned    900lvh
    .sc-handoff  (new)  "Now all together"        100lvh
    main#home    (orig) the full sequence         ~20,600px

### The one change this required inside home.js

The whole finale is ONE anime.js timeline with 20 named labels (`INTRO`,
`HEADING`, `TOOLBOX`, `FEATURES`, `MODULES`, `SPONSORS`, `GET_STARTED`, each
with an `_END`). Sections carrying `data-label` do not own their animations -
they scrub the master timeline between `LABEL` and `LABEL_END`, by an amount
set by their own pixel height.

That master timeline was driven by `target: document.body` (~line 9330), i.e.
the whole document scroll. Adding anything above it stretched the finale
across it. It now targets `#home` with `enter: "top top"` / `leave: "bottom
bottom"`, so the sequence only scrubs while the finale is passing through.
The original values are in a comment right there. This is the single edit in
home.js that the restructure needed - everything else is additive.

`#engine` is `position: fixed` and always present, but at timeline progress 0
everything in it is scaled to ~0, so it is invisible during the acts and
rises into view under the handoff. No hiding needed.

### The showcase itself

One PINNED stage, not a run of scrolling sections. `.sc-pin` sticks to the
viewport for the whole of `#showcase`, so every pixel of scroll advances the
morph and nothing ever holds still for no reason.

- `assets/js/showcase.js` - the title and all eight acts, plain ES module,
  independent of home.js. It imports `eases` and `spring` from the vendored
  anime.js so the curves it draws are the library's real ones.
- `assets/css/showcase.css` - layout only; the motion is all in JS.
- `assets/js/vendor/anime.esm.js` - anime.js **4.5.0**, the exact version the
  finale bundles. Unminified, so it is readable.

### How the morph works

A single pool of 169 points (13x13 - the finale's own grid size, `var Ce`) is
re-arranged into a different layout per act. Each layout supplies, per point,
a position, size, colour and alpha, plus `groups` (which points form one
continuous run). Scrolling interpolates all of it between the current layout
and the next, so shapes genuinely re-form into each other. Colour is
interpolated the same way, which is why the accent slides from white through
red, orange, citrus, yellow, turquoise, pink and purple to blue.

**Points are not always drawn as dots.** Each act picks a render mode, so
anything that wants clean geometry gets it:

    dots    filled circles              stagger, grids
    ticks   radial marks on a ring      timer
    stroke  smooth polyline per group   easings, spring, svg
    bars    thick round-capped runs     timeline, modules

During a morph BOTH modes are drawn over the same interpolated points, one
fading out as the other fades in - so a ring of ticks really does unwind into
a drawn curve. The cross-fade is eased (`^1.8`) rather than linear: halfway
through a morph the points are in neither formation, and a stroke drawn
across them reads as long zigzags, so both modes dim through the middle.

The acts, in order:

    --  title     small ring, morphs straight into the clock
    01  timer     ring of radial ticks, playhead sweeping round
    02  easings   four curves, marker travelling each one
    03  spring    one damped curve, solved by anime's own `spring()`
    04  stagger   13x13 grid, wave sweeping out from an origin
    05  grids     same grid, sizes driven by 169-value bitmaps
    06  timeline  five tracks, one playhead
    07  modules   ten bars, point count proportional to KB
    08  svg       the rainbow ring, drawing itself on

The order ends on the rainbow ring deliberately: it is the same ring the
finale opens with, so the last act reads as a direct lead-in.

The title is act 0 of the pinned system rather than a separate card, so it
holds its position and morphs into Timer like any other transition.

Each act holds steady for the first 45% of its segment (`MORPH_START`), then
morphs over the remaining 55%, `smooth()`-eased. The morph originally got only
the last 30% and flicked past too quickly to appreciate.

Two other knobs shape it. `MORPH_SPREAD` offsets each point along the morph by
its index, so a shape re-forms as a sweep. `MORPH_BLOOM` swings points out
from the centre at the midpoint of their own morph and settles them back —
without it the transition is technically correct but too subtle to read, and
the outward swell is what makes the shape visibly come apart and re-gather.
Both are zero at rest (`sin(0) = sin(pi) = 0`), so a settled act is unaffected.

The mode cross-fade uses `^1.35`: steep enough that a stroke is not drawn
boldly across points that are between formations, shallow enough that the
midpoint is not a dim patch — which it became once the morph was given more
than half of each act's scroll. The points do NOT all move together: each one is
offset along the morph by its index (`MORPH_SPREAD`), so a shape re-forms as a
sweep rather than everything arriving at once. Because colour is interpolated
per point too, you can watch the new act's colour wash across the old shape as
it re-forms — the same idea as `stagger()`, applied to the morph itself. Per-act motion ("live") runs on the already
interpolated buffer, weighted by how present that act is, so effects fade out
during a morph rather than fighting it. In stroke mode, `live` boosts `r` on
individual points and the stroke renderer draws those as markers.

`#showcase`'s height is set from JS as `(ACTS.length + 1) * 100lvh`, so adding
an act to the array is all that is needed - the scroll length follows.

### Decor — the annotation layer

The morphing points carry the shape; a separate `decor` function per act draws
everything *around* it: guide rings, axis frames, rulers, track labels, module
names and KB values, and live readouts. It is kept apart from the point
interpolation so it can fade independently (on a steeper curve, so labels are
gone before the shapes start moving) and can never interfere with the morph.
`DECOR` maps act title -> function, so adding one does not touch the ACTS array.

Canvas, not DOM: all of this is re-evaluated every frame while scrolling.

### Auto tour

A button (created by showcase.js, not in the markup) appears top-right shortly
after load and fades out after a few seconds if unused; the **A** key toggles
it either way, and it returns whenever the tour is running or the pointer goes
looking for it in that corner.

The tour glides to each act, holds long enough for that act's loop to play,
then moves on. The finale is scroll-scrubbed rather than self-animating, so it
is not held at all — the tour drifts through it instead, which is what
actually plays the sequence. `planStops()` builds the itinerary from live
element positions, so it survives resizes and act changes.

Pacing lives in one object, `AUTO`, and every glide leg is a **speed in px/sec**,
not a duration. It used to be a duration scaled by distance, and the scale
multiplied *up* on long legs: the finale's nominal 56s drift actually became
90s. Speeds give the same pacing on any leg length.

The finale is split into legs rather than one drift, because the tilts and the
sequence want opposite pacing, and the 2D demos want longer than the rest:

    -> handoff card            approachSpeed  ~1.1s  + 900ms hold
    -> #home top               tiltSpeed      ~0.9s  the tilt in, unbroken
    -> FEATURES label          finaleSpeed    ~18s
    -> MODULES label           demoSpeed      ~28s   the 2D demos on the ring
    -> GET_STARTED label       finaleSpeed    ~13s
    -> bottom                  tiltOutSpeed   ~2.2s  the tilt away
    Whole tour: about 110s.

**The handoff stop sits BEFORE the handoff section reaches the top**
(`at($handoff) - vh * 0.28`). Parking any later means holding still halfway
through the tilt with the finale frozen at an angle, which reads as an abrupt,
awkward pause. From that earlier point the engine is still fully faded out and
the whole tilt runs as one unbroken move.

**Leg boundaries come from `labelStart()`, not element tops.** See the gotcha
below — this one cost real debugging time.

Any genuine scroll input — wheel, touch, pointer, or any key other than A —
cancels it immediately, so it can never fight the reader for control. It is
driven from the same rAF loop as everything else, which also means it politely
pauses when the tab is hidden.

### Copy

Every character is its own span. A "reveal front" runs along the line, so
characters appear in order as an act arrives and disappear in reverse as it
leaves - a wipe, not a cross-dissolve. The outgoing line is fully gone before
the incoming one starts (`outP` finishes at m=0.45, `inP` starts at 0.55);
overlapping them superimposed two words in one box and read as garbled
letters.

### Pointer

The stage is interactive throughout: aim at the clock to drive it, drag
sideways to scrub the easing markers, move around the grid to set where the
stagger wave starts, brighten dots, draw the ring by hand, highlight a module
row.

### The approach into the finale

- **Fade.** The showcase block ends exactly where the handoff begins, so the
  fade must not start before `handoff.top` reaches 0 - otherwise the finale
  appears while the last act is still scrolling out, which reads as it
  arriving too early and being covered by the section in front of it. It
  ramps to full over 35% of a screen after that.
- **Tilt.** `#engine` gets `perspective(1500px) rotateX(...)`, easing from
  -70deg to 0 and reaching level exactly as `#home`'s top meets the viewport
  top - the moment the master timeline starts scrubbing. This mirrors, in
  reverse, the move the sequence makes at its END (home.js, "scene rotate x
  2", `rotateX: 100` at GET_STARTED). Applied to the #engine element rather
  than the 3D scene group because the HEADING segment already animates that
  group's rotateX to 90 as its opening move.
- Both are driven from the **scroll event as well as** rAF. rAF is paused
  whenever the tab or pane is hidden, and anything depending solely on it can
  be left holding a stale value.

### The end card

The last screen, after the scene has tilted away. Built by showcase.js into
`.end-placeholder` rather than written into the markup, so the list of acts and
their colours come straight from the ACTS array and cannot drift out of sync
with what you just watched. It carries a recap of the eight acts, the numbers
behind the page, a "watch it again" that returns to the top and restarts the
auto tour, and a credit to the original.

Note the two different bundle figures. The individual module sizes sum to
**27.13 KB**, but the site states the bundle as **24.50 KB** — the modules
share code, so the whole is smaller than the sum of its parts. The modules act
now labels them separately ("SUM OF PARTS" and "BUNDLED"); it previously called
the 27.13 figure a total, which was wrong.

### Gotchas hit while building this (don't repeat them)

- The palette vars (`--hex-red-1`) are plain hex colours used directly.
  Wrapping them as `rgb(var(--hex-red-1))` computes to `none`/invalid and the
  element silently disappears. Use `var(--hex-red-1)`, `color-mix()` for alpha.
- Do not hand-roll easing curves to draw alongside an anime animation.
  anime's Elastic is an amplitude/period formula, not the usual Penner one,
  so a hand-written `outElastic` drew a curve its own dot did not follow.
  Resolve the real function out of `eases` (Back and Elastic are factories
  that must be called; the rest are used directly) and use it for both.
- One span per character will let the browser break a line mid-word ("M ove").
  Wrap each word in an inline-block `nowrap` span.
- On a looping Timer, `duration` is Infinity, so `timer.progress` is
  permanently 0. Use `iterationProgress`.
- `createSpring()` is deprecated and warns on every call; use `spring()`.
  (The ripped bundle still calls the old name, so a stray warning from
  chunk-WXAKRBIO is the site's own, not ours.)
- `svg.createDrawable(selector)` returns an ARRAY. Mapping over paths with it
  gives an array of arrays and animates nothing.
- `stagger()` belongs in `delay:`, not a timeline's position argument.
- anime's `onScroll` only fired `onEnter` for the first section; use
  IntersectionObserver for "has this appeared yet".
- A `[data-label]` section's ELEMENT TOP is not where its label fires. The
  master timeline's duration is the sum of the `[data-label]` section heights,
  but the page also contains `.section-spacer` divs that add height and no
  duration. One sits between `#features-gallery` and `#modules`, which puts
  every later label a full viewport ahead of its own element: `GET_STARTED`
  fires at scroll 30525 while `#get-started`'s top is at 31512. Anchoring the
  auto tour's final leg to the element made it start ~1 screen late — slow
  through the first half of the tilt, then a jump. Use `labelStart(id)`, which
  walks the `[data-label]` heights, for anything that needs to line up with
  the timeline.
- The browser will keep serving a cached showcase.js/.css after you edit it,
  which looks exactly like "my change did nothing". `serve.py` sends
  `Cache-Control: no-store` - use it, not `python -m http.server`.

## Deploying

Purely static: no build step, no server code. `serve.py` is a local-only
convenience that defeats browser caching while editing. On Vercel choose the
"Other" preset with an empty build command and the project root as output.

- `vercel.json` — immutable caching for models/fonts/draco, must-revalidate
  for the HTML/CSS/JS, explicit content types for `.glb` and `.wasm`.
- `.vercelignore` — excludes `serve.py`, `start.command`, `.claude/`, the
  notes and the backups, and `_original-minified/`. ~2.9 MB / 53 files ship.

**A font had to be renamed for this.** `DINish[slnt,wdth,wght].woff2` →
`DINish-variable.woff2` (reference updated in `assets/css/core.css`). Square
brackets are Vercel's dynamic-route syntax, and are also invalid unencoded in
a CSS `url()`; it only worked locally because browsers tolerate it. Nothing
else in the project has special characters in a filename, and every asset path
is relative, so the rest ports as-is.

**Note on publishing.** Deploying puts a near-complete copy of someone else's
site on a public URL, including `BerkeleyMono-*.woff2` — a commercial font
whose licence does not cover redistribution. DINish (SIL OFL) and Digital-7
are fine. The README has the swap procedure; it is a one-line change because
`--font-mono` (defined in `custom.css`) is the single point everything routes
through, including the canvas labels in `showcase.js`.

**Related bug, now fixed.** The site's mono `@font-face` declares the family
name `Mono`. My CSS asked for `var(--font-mono, ...)` with `--font-mono` never
defined, and the canvas asked for `"Berkeley Mono"` — a name nothing declares.
Both silently fell back to the system monospace, so every label I added was in
the wrong typeface. `--font-mono` is now defined once in `custom.css` and the
canvas uses `Mono`.

## Code layout

- `assets/js/home.js` — entry point, ES module. Mostly bundled library code;
  the site-specific logic is a small part.
  - `module-animate-01.glb` → the 3D scene and model list
  - `createTimeline(` / `stagger(` / `animate(` → the choreography
  - `_initDecoder` (~line 6925) → Draco worker setup. Note this builds the
    worker from `Ma.toString()`, so reformatting home.js changes the worker
    source text. It was verified to still parse and decode after Prettier.
- `assets/js/chunks/*.js` — three.js, GLTFLoader/DRACOLoader, pmndrs
  postprocessing, anime.js, highlight.js.

## Next steps

Tinker with durations, easings and stagger values in `home.js`, and trace how
the 22 models are choreographed.
