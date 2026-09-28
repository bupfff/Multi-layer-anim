LOCAL COPY OF THE ANIMEJS.COM HOMEPAGE  (macOS --> web)
===============================================

HOW TO RUN
  Double-click  start.command
It serves this folder and opens http://localhost:8000 in your browser.
Press Ctrl-C in the Terminal window (or just close it) to stop.

It runs serve.py, which is a plain static server with caching switched OFF.
That matters while tinkering: with normal caching the browser will keep
serving the OLD showcase.js or showcase.css after you edit it, which looks
exactly like your change did nothing. With serve.py, a normal reload is
always enough - no hard-refresh needed.

If macOS blocks it the first time: right-click start.command > Open,
then click Open in the dialog. Or from Terminal, in this folder:
    python3 -m http.server 8000
and open http://localhost:8000 yourself.

You MUST use a server. Opening index.html directly with file:// will
fail: ES modules and the 3D model loading are blocked by CORS on file://.


WHAT WAS WRONG WITH THE ORIGINAL RIP, AND WHAT WAS FIXED
--------------------------------------------------------
1. THE REAL BUG: corrupted JavaScript.
   The ripper ran a "beautifier" over the site's minified JS, and that
   beautifier was too old to understand two modern JS operators. It
   inserted a space into both of them:
       ??   (nullish coalescing)  became  "? ?"
       ?.   (optional chaining)   became  "? ."
   Those are syntax errors, so the whole bundle failed to parse and the
   page rendered as a static, dead layout.
   Affected: chunk-N6I4AEHZ.js and chunk-WXAKRBIO.js.

   NOTE: do NOT fix this with a global find-and-replace of "? ." -> "?."
   home.js legitimately contains 7 ternaries like "u ? .001 : 150" and
   "O ? .25 : .55". Replacing those breaks it.

   The fix used here: re-download the original minified files from
   animejs.com and re-format them with Prettier 3, which handles those
   operators correctly. All 7 JS files now parse clean.

2. Missing runtime assets (loaded by JS, so the ripper never saw them):
   - assets/models/     22 .glb 3D models
   - assets/draco/      draco_wasm_wrapper.js + draco_decoder.wasm
                        All 22 models are Draco-compressed, so the page
                        genuinely cannot show them without this decoder.
   - assets/json/easings.json
   - assets/images/favicon.png, assets/images/icons/drop-down.svg

3. Fonts. The ripped .woff2 files were 71-byte text placeholders, not
   fonts. Replaced with the real ones, so the page now matches the
   original typography.
   (Berkeley Mono is a commercially licensed font. Fine for local study,
   but do not redistribute it or use it in your own projects.)

4. Sponsor lists. These are fetched at runtime from /sponsors/*. Saved
   as static files in sponsors/ so the console is clean. GitHub sponsor
   avatars still point at avatars.githubusercontent.com, exactly as on
   the real site, so they need internet; nothing else does.

5. Removed the Google Analytics loader and the Carbon Ads script.
   Removed the Windows-only start.bat / get-missing-files.ps1.

The page now loads with a COMPLETELY CLEAN console.


STRIPPED-DOWN VIEW (what was removed, and how to undo it)
---------------------------------------------------------
The page was trimmed to "just the animation". Nothing was deleted - every
change is a hide or a disable, so you can put any piece back.

All the hiding lives in ONE file: assets/css/custom.css
It has five commented blocks. Delete a block, that piece comes back:
  1. Hero title      "All-in-one animation engine." + subtitle
  2. First scroll title  "The complete animator's toolbox" + subtitle
  3. Sponsors        the bottom-right "Funding goal" card (including the row
                     of circular GitHub avatars), the "Our sponsors" section,
                     the "Sponsored by" hero badge, the header SPONSOR button
  4. End of page     the "Start animating" 12-link grid and the whole footer
  5. Dead-link cursors
  6. Site header     the anime.js logo, the nav, and the hamburger button
                     top-right (that button's side menu IS the nav, so both
                     go together)
  7. Hero buttons    the "npm i animejs" box and "Learn more" button

Sponsor network requests are gone too: the <sponsors-list> and <funding-level>
tags are commented out in index.html, so nothing fetches /sponsors/* any more.
Uncomment them to bring the data back.

PAGE STRUCTURE: A TITLE, EIGHT ACTS, THEN THE FINALE
----------------------------------------------------
Scrolling goes: a title, eight acts, a "Now all together" handoff, then the
original sequence as the finale.

These are NOT separate scrolling sections. They are one pinned stage that
stays put in the middle of the screen while the content morphs from one act
to the next as you scroll - in the copy on the left and the shape on the
right. The title is part of that same system, so it holds its place and
morphs into the first act rather than scrolling away.

  --  Title     a small ring that opens into the clock
  01  Timer     a ring of tick marks with a playhead sweeping round
  02  Easings   four curves, with a marker travelling each one
  03  Spring    one damped curve, solved by anime's own spring()
  04  Stagger   a 13x13 grid, with a wave sweeping out from an origin
  05  Grids     the same grid, sized by a 169-value picture
  06  Timeline  five tracks and one playhead
  07  Modules   ten bars, sized by each module's weight
  08  SVG       the rainbow ring, drawing itself on

It ends on the rainbow ring on purpose - that is the same ring the finale
opens with, so the last act leads straight into it.

The morph is real, not a fade. One pool of 169 points is rearranged for each
act, and scrolling interpolates every point's position, size, colour and
opacity between one layout and the next. Points are not always drawn as dots:
each act picks how it should be rendered - dots, radial ticks, smooth
strokes, or thick bars - so anything that wants clean lines gets clean lines.
During a morph both styles are drawn over the same moving points, one fading
into the other.

Points re-form as a SWEEP, not all at once - each one is offset along the
morph by its index, so you can watch the next act's colour wash across the old
shape as it rebuilds itself.

Each act also draws an annotation layer around the shape: guide rings and
rulers, axis frames, track labels, module names and weights, and live readouts
that count along with whatever is moving.

The text morphs to match: each character is its own span, and a reveal front
runs along the line so letters wipe out in order and the next line wipes in.

Every act reacts to the mouse:
  01 aim at the ring and you drive the clock yourself
  02 drag sideways to scrub all four easing markers at once
  03 drag to run the marker along the spring
  04 the stagger wave starts from whichever dot you are nearest
  05 dots under the cursor brighten
  06 drag to scrub the timeline playhead
  07 hover a row to single it out
  08 drag to draw the ring by hand

Coming into the finale, the animation fades in and tilts up, then levels out
to face you exactly as the sequence starts. That is the move the sequence
makes at its very end, played in reverse - see TILT_IN in showcase.js.

New files (all additive - delete them and the #showcase markup in index.html
and the page is exactly as it was):
  assets/js/showcase.js       the acts, the morph and the renderers
  assets/css/showcase.css     layout
  assets/js/vendor/anime.esm.js   anime.js 4.5.0, unminified and readable

That is the SAME version the finale uses, so there is no mismatch. (The
"4.0.0" in the page's version dropdown is only a docs label - the actual
bundled library reports 4.5.0.)

THE END CARD
After the scene tilts away there is a recap: the eight acts with their
colours, the numbers behind the page, a "watch it again" button that returns
you to the top and restarts the tour, and a credit to the original.

It is built by showcase.js, not written into index.html, so the act list
always matches whatever is in the ACTS array. Edit the copy there.

(Two bundle numbers appear on the modules act on purpose: the parts add up to
27.13 KB but the shipped bundle is 24.50 KB, because the modules share code.)


AUTO TOUR
Press A, or use the button that appears in the top right on load (it fades
away if you ignore it - the key still works). It scrolls the whole page for
you, stopping at each act long enough to watch it play, then drifting through
the finale, which is scrubbed by scroll rather than playing on its own.

The finale is paced in parts, because the tilts and the sequence want
opposite speeds: it tilts in quickly and in one unbroken move (~0.9s), plays
the sequence (~59s, with the 2D demos on the ring given the longest stretch),
then tilts away quickly again (~2.2s). The whole tour is about 110 seconds.
Any scroll, tap or other keypress hands control straight back to you.

If you retime it, note that the tour's leg boundaries are worked out from the
animation's own timeline labels, not from where the sections sit on the page -
those two are about a screen apart by the end. See labelStart() in
showcase.js.


TUNING
  showcase.js   the ACTS array is the whole running order - add one and the
                scroll length follows automatically
                MORPH_START sets how long an act holds before it morphs
                (0.45 = morph over the last 55% of its scroll)
                MORPH_SPREAD sets how much the points sweep rather than
                moving together
                MORPH_BLOOM sets how far they swing outward mid-morph - this
                is the knob for "make it more dramatic"
                TILT_IN sets the lean coming into the finale
                AUTO holds the tour's pacing - every glide is a speed in
                px/sec, so legs of any length feel the same

ONE EDIT WAS NEEDED INSIDE home.js
The entire finale is a single timeline with named labels, and it used to be
scrubbed by the whole document's scroll. Adding sections above it stretched
the sequence across them. It now follows only the finale's own container.
Look for the comment starting "CHANGED:" near line 9330 of
assets/js/home.js - the original values are written out there.


END-OF-PAGE SHAPE
The dotted heart at the end is now a ring. It is a 13x13 grid of 0..1 values
in the "za" array in assets/js/home.js (~line 8035); each value scales one
dot. The original heart is kept right above it as a comment, so you can swap
back with one edit, and any 169-value grid gives you a new shape.

Why the titles are hidden instead of blanked: home.js splits that text into
per-character spans and animates them. Emptying the elements throws an error
at load. So the text is still in index.html - edit it there and delete the
CSS block when you want your own title.

Dead links: every internal link had href renamed to data-href (43 of them),
so they still look right but go nowhere. Those were the ones hitting an error
page. External links (GitHub, X, CodePen, Bluesky) and in-page anchors still
work. To restore one, rename data-href back to href.

Kept on purpose: all the feature-section titles, the bundle-size stats card
and the scroll progress bar in the bottom right.

index.html.orig-backup is the copy from before these edits.


DEPLOYING TO VERCEL
This is a purely static site - no build step, no server code. serve.py is only
a local convenience (it exists to defeat browser caching while you tinker).

  1. npm i -g vercel        (once)
  2. cd into this folder
  3. vercel                 (first run: answer the prompts, accept defaults)
  4. vercel --prod          (publishes it)

When it asks for a framework preset choose "Other", leave the build command
empty, and leave the output directory as the project root. There is nothing
to build.

Or: push the folder to GitHub and import the repo at vercel.com - same answers.

Two files support this:
  vercel.json     sets long cache lifetimes for the models, fonts and the
                  Draco decoder (they never change) and short ones for the
                  HTML/CSS/JS you are editing, plus correct content types
                  for .glb and .wasm
  .vercelignore   keeps the local-only stuff out of the deployment:
                  serve.py, start.command, the notes, the backups and
                  _original-minified/. About 2.9 MB actually ships.

BEFORE YOU PUT IT ON A PUBLIC URL
Running this locally to study it is one thing; publishing it is another. What
you would be hosting is a near-complete copy of someone else's site, and one
piece of it is not yours to redistribute:

  assets/fonts/BerkeleyMono-Regular.woff2
  assets/fonts/BerkeleyMono-Italic.woff2

Berkeley Mono is a commercial font with a paid licence. Serving it from your
own domain is redistribution. The other two are fine - DINish is open source
(SIL OFL) and Digital-7 is free for personal use.

Swapping it out is a ONE-LINE change, because every label on the page now
goes through the same variable:

  1. open assets/css/core.css, find the two @font-face blocks whose
     font-family is `Mono`, and delete them (or point their url() at a
     replacement you do have the rights to)
  2. that is it - assets/css/custom.css defines
       --font-mono: Mono, ui-monospace, SFMono-Regular, Menlo, monospace;
     so everything falls back to the system monospace automatically, and the
     canvas labels in showcase.js use the same family name

Good free replacements if you want the same feel: JetBrains Mono, IBM Plex
Mono, Space Mono, or just the system ui-monospace.

The rest - the 3D models, the layout, the sequence - is still Julian Garnier's
work, so if you do publish it, keep the credit line on the end card.


ONE FILE HAD TO BE RENAMED FOR THIS
The DINish font was called "DINish[slnt,wdth,wght].woff2". Square brackets in
a filename are how Vercel declares a dynamic route, and they are also invalid
unencoded inside a CSS url() - it only worked locally because browsers are
forgiving. It is now DINish-variable.woff2, with the reference in
assets/css/core.css updated to match.


DEAD SITE MARKUP
The old footer (socials, signup form), the sponsors copy, and the social-share
meta tags have been deleted - they were invisible and every one of them was a
link back to the real site. index.html now has no external URLs in it at all.

The site HEADER is the exception. It is still there, hidden, because the
original JavaScript looks it up and uses it without checking whether it
exists - delete it and the whole page goes black. Its links have been stripped
out instead, so there are no URLs left in it.


TINKERING
---------
Edit assets/js/home.js, save, hard-refresh (Cmd-Shift-R).

Useful entry points in assets/js/home.js:
  - search "module-animate-01.glb"  -> the 3D scene / model list
  - search "createTimeline("        -> the choreography
  - search "stagger("               -> the offsets between elements
  - search "_initDecoder"           -> Draco worker setup (line ~6925)

assets/js/chunks/ is bundled library code: three.js, GLTFLoader,
DRACOLoader, pmndrs postprocessing, anime.js itself, highlight.js.

_original-minified/ holds the untouched files straight from the server.
If you ever suspect a formatting problem, diff against those.
For readable anime.js source: github.com/juliangarnier/anime

If the page goes blank after an edit, open the console (Cmd-Opt-J).
