/* ============================================================
   showcase.js — the title and eight acts that play before the
   finale.

   How it works
   ------------
   There is ONE pinned stage. A single pool of 169 points (13x13 —
   the finale's own grid size, home.js: `var Ce = [13, 13]`) is
   re-arranged into a different layout for each act. Scrolling
   interpolates every point's position, size, colour and alpha from
   one layout to the next, so shapes genuinely re-form into each
   other instead of cross-fading.

   Points are not always drawn as dots. Each act picks a RENDER
   MODE, so anything that wants clean geometry gets it:

     dots    filled circles          (stagger, grids)
     ticks   radial marks on a ring  (timer)
     stroke  a smooth polyline       (easings, spring, svg)
     bars    thick round-capped runs (timeline, modules)

   During a morph both modes are drawn over the SAME interpolated
   points, one fading out as the other fades in — so a ring of
   ticks really does unwind into a drawn curve.

   Independent of home.js — it imports its own readable copy of
   anime.js 4.5.0 from ./vendor/, the same version the finale
   bundles. Delete this file and the #showcase markup and the
   original page is back exactly as it was.
   ============================================================ */

import { eases, spring } from "./vendor/anime.esm.js";

const N = 169; // 13 x 13
const GRID = 13;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

/* --- palette ------------------------------------------------ */
const rootStyle = getComputedStyle(document.documentElement);
function hueRGB(name) {
  const hex = rootStyle.getPropertyValue(`--hex-${name}-1`).trim() || "#f6f4f2";
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}
const rgbCSS = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/* --- easing, straight from anime ----------------------------
   Resolved the way anime resolves an `ease:` string, so a curve
   drawn on screen is produced by the SAME function that moves the
   marker along it. Hand-rolling these is what made the elastic
   curve and its dot disagree: anime's Elastic is an
   amplitude/period formula, not the usual Penner one. */
function easeFn(name) {
  const f = eases[name];
  if (!f) return (t) => t;
  return name.includes("Back") || name.includes("Elastic") ? f() : f;
}

/* ============================================================
   Layouts. Each returns per-point arrays plus `groups`, which is
   what the stroke and bars renderers follow.
   ============================================================ */

function blank() {
  return { x: [], y: [], r: [], c: [], a: [], groups: [] };
}

/** Points evenly around a circle, as one closed group. */
function ringLayout(col, radius, dotR, alpha = 0.6) {
  const L = blank();
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
    L.x.push(0.5 + Math.cos(ang) * radius);
    L.y.push(0.5 + Math.sin(ang) * radius);
    L.r.push(dotR);
    L.c.push(col);
    L.a.push(alpha);
  }
  L.groups.push({ i0: 0, n: N, closed: true, col });
  return L;
}

/** 13 x 13 grid. */
function gridLayout(col, dotR) {
  const L = blank();
  const step = 0.76 / (GRID - 1);
  for (let i = 0; i < N; i++) {
    L.x.push(0.12 + (i % GRID) * step);
    L.y.push(0.12 + Math.floor(i / GRID) * step);
    L.r.push(dotR);
    L.c.push(col);
    L.a.push(0.45);
  }
  return L;
}

/** Four easing curves, 42 points each, laid out 2 x 2. */
function easingsLayout(col) {
  const names = ["linear", "inOutQuad", "outElastic", "inOutExpo"];
  const fns = names.map(easeFn);
  const L = blank();
  const PER = 42;
  for (let i = 0; i < N; i++) {
    const k = Math.floor(i / PER);
    if (k > 3) {
      L.x.push(0.5); L.y.push(0.5); L.r.push(0); L.c.push(col); L.a.push(0);
      continue;
    }
    const j = i - k * PER;
    const cx = k % 2 === 0 ? 0.09 : 0.55;
    const cy = k < 2 ? 0.16 : 0.58;
    const w = 0.36, h = 0.24;
    const u = j / (PER - 1);
    const v = clamp(fns[k](u), -0.4, 1.4);
    L.x.push(cx + u * w);
    L.y.push(cy + h - v * h);
    L.r.push(0);
    L.c.push(col);
    L.a.push(0.75);
  }
  for (let k = 0; k < 4; k++) L.groups.push({ i0: k * PER, n: PER, closed: false, col });
  L.PER = PER;
  L.names = names;
  return L;
}

/** One long spring curve — anime's own solver, so it is the real shape. */
function springLayout(col) {
  // `spring()`, not the deprecated createSpring()
  const s = spring({ bounce: 0.62, duration: 900 });
  const L = blank();
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const v = clamp(s.ease(u), -0.4, 1.5);
    L.x.push(0.08 + u * 0.84);
    L.y.push(0.74 - v * 0.46);
    L.r.push(0);
    L.c.push(col);
    L.a.push(0.8);
  }
  L.groups.push({ i0: 0, n: N, closed: false, col });
  return L;
}

/** Five timeline tracks, each starting and ending at a different time. */
function timelineLayout(col) {
  const tracks = [
    [0.0, 0.45], [0.12, 0.62], [0.3, 0.88], [0.22, 0.55], [0.5, 1.0],
  ];
  const L = blank();
  const per = Math.floor(N / tracks.length);
  let i = 0;
  tracks.forEach(([t0, t1], k) => {
    const n = k === tracks.length - 1 ? N - i : per;
    const y = 0.22 + (k / (tracks.length - 1)) * 0.56;
    for (let j = 0; j < n; j++, i++) {
      const u = n === 1 ? 0 : j / (n - 1);
      L.x.push(0.1 + (t0 + (t1 - t0) * u) * 0.8);
      L.y.push(y);
      L.r.push(0.009);
      L.c.push(col);
      L.a.push(0.55);
    }
    L.groups.push({ i0: i - n, n, closed: false, col });
  });
  L.tracks = tracks;
  return L;
}

/** The rainbow ring, as seven separate arcs so each strokes its own colour. */
function arcLayout() {
  const hues = ["red", "orange", "yellow", "green", "turquoise", "sega", "purple"];
  const cols = hues.map(hueRGB);
  const L = blank();
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
    L.x.push(0.5 + Math.cos(ang) * 0.42);
    L.y.push(0.5 + Math.sin(ang) * 0.42);
    L.r.push(0);
    L.c.push(cols[Math.floor((i / N) * hues.length) % hues.length]);
    L.a.push(0.9);
  }
  const per = Math.floor(N / hues.length);
  for (let k = 0; k < hues.length; k++) {
    const i0 = k * per;
    const n = k === hues.length - 1 ? N - i0 : per + 1; // +1 so arcs meet
    L.groups.push({ i0, n: Math.min(n, N - i0), closed: false, col: cols[k] });
  }
  return L;
}

/** Ten module bars, point count proportional to each module's size. */
function modulesLayout() {
  const mods = [
    ["waapi", 3.5, "purple"], ["timeline", 0.55, "orange"], ["stagger", 0.48, "yellow"],
    ["svg", 0.35, "sega"], ["spring", 0.52, "citrus"], ["timer", 5.6, "red"],
    ["scroll", 4.3, "turquoise"], ["animation", 5.2, "pink"], ["draggable", 6.41, "green"],
    ["scope", 0.22, "lavender"],
  ];
  const total = mods.reduce((s, m) => s + m[1], 0);
  const max = Math.max(...mods.map((m) => m[1]));
  const L = blank();
  L.row = [];
  let i = 0;
  mods.forEach(([, kb, hue], m) => {
    const col = hueRGB(hue);
    const count = Math.max(2, Math.round((kb / total) * N));
    const y = 0.16 + (m / (mods.length - 1)) * 0.68;
    const len = (kb / max) * 0.72;
    const start = i;
    for (let j = 0; j < count && i < N; j++, i++) {
      L.x.push(0.14 + (count === 1 ? 0 : (j / (count - 1)) * len));
      L.y.push(y);
      L.r.push(0.009);
      L.c.push(col);
      L.a.push(0.85);
      L.row.push(m);
    }
    L.groups.push({ i0: start, n: i - start, closed: false, col });
  });
  while (i < N) {
    L.x.push(0.14); L.y.push(0.84); L.r.push(0); L.c.push([255, 255, 255]); L.a.push(0);
    L.row.push(mods.length - 1); i++;
  }
  L.mods = mods;
  return L;
}

/* --- 13x13 bitmaps for the grids act ------------------------ */
function shapeFrom(inside) {
  const SS = 6;
  const out = [];
  for (let rr = 0; rr < GRID; rr++) {
    for (let cc = 0; cc < GRID; cc++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = ((cc + (sx + 0.5) / SS) / GRID) * 2 - 1;
          const py = ((rr + (sy + 0.5) / SS) / GRID) * 2 - 1;
          if (inside(px, py)) hits++;
        }
      }
      out.push(Math.round((hits / (SS * SS)) * 10) / 10);
    }
  }
  return out;
}

const SHAPES = [
  ["ring", shapeFrom((x, y) => { const d = Math.hypot(x, y); return d > 0.46 && d < 0.92; })],
  ["heart", [
    0, 0, 0.1, 0.1, 0.1, 0, 0, 0, 0.1, 0.1, 0.1, 0, 0, 0, 0.1, 0.5, 0.6, 0.5, 0.2, 0.1, 0.2, 0.5,
    0.6, 0.5, 0.1, 0, 0.1, 0.6, 0.8, 0.9, 0.9, 0.7, 0.5, 0.7, 0.9, 0.9, 0.8, 0.6, 0.1, 0.5, 0.9, 1,
    1, 1, 0.9, 0.8, 0.9, 1, 1, 1, 0.9, 0.5, 0.8, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9, 0.8, 0.8, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0.6, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.9, 0.6, 0.4, 0.8, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 0.8, 0.4, 0.2, 0.6, 0.9, 1, 1, 1, 1, 1, 1, 1, 0.9, 0.6, 0.2, 0.1, 0.3,
    0.6, 0.8, 1, 1, 1, 1, 1, 0.8, 0.6, 0.3, 0.1, 0, 0.1, 0.3, 0.5, 0.8, 1, 1, 1, 0.8, 0.5, 0.3, 0.1,
    0, 0, 0, 0, 0.2, 0.4, 0.7, 0.9, 0.7, 0.4, 0.2, 0, 0, 0, 0, 0, 0, 0, 0.1, 0.2, 0.4, 0.2, 0.1, 0,
    0, 0, 0,
  ]],
  ["diamond", shapeFrom((x, y) => Math.abs(x) + Math.abs(y) <= 0.92)],
  ["cross", shapeFrom((x, y) => Math.min(Math.abs(x), Math.abs(y)) < 0.2 && Math.hypot(x, y) < 0.95)],
];

/* ============================================================
   Acts
   ============================================================ */

const ACTS = [
  {
    num: "", title: "Eight ideas,\none sequence.", hue: "white", caption: "scroll",
    body: "The animation at the end of this page is built from a handful of simple ideas layered together. Here is each one on its own first.",
    mode: "dots",
    build: (col) => ringLayout(col, 0.1, 0.005, 0.35),
    live: titleLive,
  },
  {
    num: "01", title: "Timer", hue: "red", caption: "one clock · 169 readers",
    body: "Every frame of the finale is driven by one clock. A value advances; everything else reads from it.",
    mode: "ticks",
    build: (col) => ringLayout(col, 0.4, 0.05, 0.3),
    live: timerLive,
  },
  {
    num: "02", title: "Easings", hue: "orange", caption: "same duration · different curve",
    body: "Nothing moves linearly. An easing curve decides how a value travels from A to B.",
    mode: "stroke",
    build: (col) => easingsLayout(col),
    live: easingsLive,
  },
  {
    num: "03", title: "Spring", hue: "citrus", caption: "bounce 0.62 · solved, not faked",
    body: "A spring is not a curve you pick. It is mass, stiffness and damping, solved until it comes to rest.",
    mode: "stroke",
    build: (col) => springLayout(col),
    live: springLive,
  },
  {
    num: "04", title: "Stagger", hue: "yellow", caption: "one wave · 169 delays",
    body: "One instruction, many targets, offset in time. Move where the wave starts and the whole feel changes.",
    mode: "dots",
    build: (col) => gridLayout(col, 0.017),
    live: staggerLive,
  },
  {
    num: "05", title: "Grids", hue: "turquoise", caption: "169 values",
    body: "Give each dot a value between 0 and 1 and the grid stops being a grid and becomes a picture.",
    mode: "dots",
    build: (col) => gridLayout(col, 0.02),
    live: gridsLive,
  },
  {
    num: "06", title: "Timeline", hue: "pink", caption: "five tracks · one playhead",
    body: "Animations do not have to start together. A timeline places each one at its own moment.",
    mode: "bars",
    build: (col) => timelineLayout(col),
    live: timelineLive,
  },
  {
    num: "07", title: "Modules", hue: "purple", caption: "24.5 KB all together",
    body: "The library ships as separate parts. The finale reaches for nearly all of them at once.",
    mode: "bars",
    build: () => modulesLayout(),
    live: modulesLive,
  },
  {
    num: "08", title: "SVG", hue: "sega", caption: "drawn 0 → 100%",
    body: "The coloured ring is a stroked path, revealed by animating how much of it is drawn. You are about to meet it again.",
    mode: "stroke",
    build: () => arcLayout(),
    live: svgLive,
  },
];

ACTS.forEach((a) => {
  a.col = hueRGB(a.hue);
  a.layout = a.build(a.col);
});

/* --- live modulation ---------------------------------------- */

function titleLive(buf, t, w) {
  const pulse = 1 + Math.sin(t * 1.4) * 0.18;
  for (let i = 0; i < N; i++) {
    buf.r[i] *= lerp(1, pulse, w);
    buf.a[i] = lerp(buf.a[i], 0.22 + 0.16 * Math.sin(t * 1.4 + i * 0.05), w);
  }
}

function timerLive(buf, t, w, ptr) {
  const head = ptr.inside
    ? ((Math.atan2(ptr.y - 0.5, ptr.x - 0.5) / (Math.PI * 2) + 1.25) % 1) * N
    : ((t / 4) % 1) * N;
  for (let i = 0; i < N; i++) {
    let d = head - i;
    if (d < 0) d += N;
    const lit = Math.max(0, 1 - d / 26);
    buf.r[i] *= lerp(1, 1 + lit * 1.1, w);
    buf.a[i] = lerp(buf.a[i], 0.14 + lit * 0.86, w);
  }
}

function easingsLive(buf, t, w, ptr) {
  const L = ACTS[2].layout;
  const u = ptr.inside ? ptr.x : (t / 1.8) % 1;
  for (let i = 0; i < N; i++) {
    const k = Math.floor(i / L.PER);
    if (k > 3) continue;
    const j = i - k * L.PER;
    const at = Math.abs(j / (L.PER - 1) - u);
    const lit = Math.max(0, 1 - at * 14);
    // stroke mode draws a dot only where r is boosted, so this is the marker
    buf.r[i] = lerp(buf.r[i], 0.016 * lit, w);
  }
}

function springLive(buf, t, w, ptr) {
  const u = ptr.inside ? ptr.x : (t / 2.2) % 1;
  for (let i = 0; i < N; i++) {
    const at = Math.abs(i / (N - 1) - u);
    const lit = Math.max(0, 1 - at * 22);
    buf.r[i] = lerp(buf.r[i], 0.018 * lit, w);
  }
}

function staggerLive(buf, t, w, ptr) {
  const ox = ptr.inside ? ptr.x : 0.5;
  const oy = ptr.inside ? ptr.y : 0.5;
  const phase = (t / 1.8) % 1;
  for (let i = 0; i < N; i++) {
    const gx = (i % GRID) / (GRID - 1);
    const gy = Math.floor(i / GRID) / (GRID - 1);
    const d = Math.hypot(gx - ox, gy - oy) / 1.42;
    const band = Math.max(0, 1 - Math.abs(((phase - d * 0.55 + 1) % 1) - 0.12) * 7);
    buf.r[i] *= lerp(1, 1 + band * 1.25, w);
    buf.a[i] = lerp(buf.a[i], 0.2 + band * 0.8, w);
  }
}

function gridsLive(buf, t, w, ptr) {
  const span = 2.8;
  const idx = Math.floor(t / span) % SHAPES.length;
  const nxt = (idx + 1) % SHAPES.length;
  const f = smooth(clamp(((t % span) / span - 0.72) / 0.28, 0, 1));
  const A = SHAPES[idx][1], B = SHAPES[nxt][1];
  for (let i = 0; i < N; i++) {
    const v = lerp(A[i], B[i], f);
    buf.r[i] *= lerp(1, v > 0.1 ? v * 1.35 : 0, w);
    let al = v > 0.1 ? 0.35 + v * 0.65 : 0;
    if (ptr.inside) {
      const gx = (i % GRID) / (GRID - 1);
      const gy = Math.floor(i / GRID) / (GRID - 1);
      const hot = clamp(1 - Math.hypot(gx - ptr.x, gy - ptr.y) * 3.2, 0, 1);
      al = Math.min(1, al + hot * 0.5);
    }
    buf.a[i] = lerp(buf.a[i], al, w);
  }
  gridsLive.label = SHAPES[f > 0.5 ? nxt : idx][0];
}

function timelineLive(buf, t, w, ptr) {
  const L = ACTS[6].layout;
  const play = ptr.inside ? ptr.x : (t / 3.2) % 1;
  let i = 0;
  L.tracks.forEach(([t0, t1], k) => {
    const g = L.groups[k];
    const on = play >= t0 && play <= t1;
    for (let j = 0; j < g.n; j++) {
      const idx = g.i0 + j;
      const u = g.n === 1 ? 0 : j / (g.n - 1);
      const at = t0 + (t1 - t0) * u;
      const near = Math.max(0, 1 - Math.abs(at - play) * 26);
      buf.a[idx] = lerp(buf.a[idx], (on ? 0.62 : 0.2) + near * 0.38, w);
      buf.r[idx] *= lerp(1, 1 + near * 0.9, w);
    }
    i += g.n;
  });
  timelineLive.play = play;
}

function modulesLive(buf, t, w, ptr) {
  const L = ACTS[7].layout;
  const cycle = 4.2;
  const p = clamp(((t % cycle) / cycle) * 1.5, 0, 1);
  const hotRow = ptr.inside ? Math.round(ptr.y * (L.mods.length - 1)) : -1;
  for (let i = 0; i < N; i++) {
    const m = L.row[i];
    const fill = clamp((p - m * 0.045) * 4, 0, 1);
    const on = clamp((0.14 + fill * 0.72 - L.x[i]) * 40, 0, 1);
    let al = 0.12 + on * 0.78;
    if (m === hotRow) al = Math.min(1, al + 0.35);
    buf.a[i] = lerp(buf.a[i], al, w);
  }
}

function svgLive(buf, t, w, ptr) {
  const cycle = 3.4;
  const p = (t % cycle) / cycle;
  const drawn = ptr.inside ? ptr.x : p < 0.62 ? p / 0.62 : 1 - (p - 0.62) / 0.38;
  for (let i = 0; i < N; i++) {
    const on = clamp((drawn - i / N) * 22, 0, 1);
    buf.a[i] = lerp(buf.a[i], 0.04 + on * 0.96, w);
  }
  svgLive.drawn = drawn;
}

/* ============================================================
   Copy
   ============================================================ */

const $num = document.querySelector(".sc-num");
const $titles = document.querySelector(".sc-titles");
const $bodies = document.querySelector(".sc-bodies");
const $caption = document.querySelector(".sc-caption");

/**
 * One span per character, grouped inside per-word wrappers.
 * Without the word wrapper every character is its own inline-block and the
 * browser will happily break a line in the middle of a word ("M ove").
 */
function splitInto(parent, text, cls) {
  const el = document.createElement("p");
  el.className = cls;
  const chars = [];
  for (const line of text.split("\n")) {
    for (const word of line.split(/(\s+)/)) {
      if (!word) continue;
      const w = document.createElement("span");
      w.className = "sc-word";
      for (const ch of word) {
        const s = document.createElement("span");
        s.className = "sc-ch";
        s.textContent = ch;
        w.appendChild(s);
        chars.push(s);
      }
      el.appendChild(w);
    }
    el.appendChild(document.createElement("br"));
  }
  parent.appendChild(el);
  return chars;
}

const titleChars = [];
const bodyChars = [];
if ($titles && $bodies) {
  ACTS.forEach((a) => {
    titleChars.push(splitInto($titles, a.title, "sc-title"));
    bodyChars.push(splitInto($bodies, a.body, "sc-body"));
  });
}

/** A reveal front runs along the line: a wipe, not a cross-dissolve. */
function paintChars(chars, presence, stagVal, rise) {
  const n = chars.length;
  const front = presence * (1 + stagVal * n);
  for (let i = 0; i < n; i++) {
    const e = smooth(clamp(front - i * stagVal, 0, 1));
    chars[i].style.opacity = e.toFixed(3);
    chars[i].style.transform = `translateY(${((1 - e) * rise).toFixed(2)}px)`;
  }
}

/* ============================================================
   Canvas
   ============================================================ */

const $stage = document.querySelector(".sc-stage");
const $canvas = document.querySelector(".sc-canvas");
const ctx = $canvas ? $canvas.getContext("2d") : null;

let S = 0; // stage size in CSS px
function sizeCanvas() {
  if (!$canvas || !$stage) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const rect = $stage.getBoundingClientRect();
  S = Math.max(1, Math.min(rect.width, rect.height));
  $canvas.width = Math.round(S * dpr);
  $canvas.height = Math.round(S * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const ptr = { x: 0.5, y: 0.5, inside: false };
if ($stage) {
  $stage.addEventListener("pointermove", (e) => {
    const r = $stage.getBoundingClientRect();
    ptr.x = clamp((e.clientX - r.left) / r.width, 0, 1);
    ptr.y = clamp((e.clientY - r.top) / r.height, 0, 1);
    ptr.inside = true;
  });
  $stage.addEventListener("pointerleave", () => (ptr.inside = false));
}

const buf = {
  x: new Float32Array(N), y: new Float32Array(N),
  r: new Float32Array(N), a: new Float32Array(N), c: [],
};
for (let i = 0; i < N; i++) buf.c.push([0, 0, 0]);

/* --- renderers ----------------------------------------------
   All four read the same interpolated buffer; `k` is how much of
   this mode to show, so two modes cross over during a morph. */

function drawDots(k) {
  for (let i = 0; i < N; i++) {
    const rad = buf.r[i] * S;
    const al = buf.a[i] * k;
    if (rad <= 0.15 || al <= 0.01) continue;
    ctx.beginPath();
    ctx.arc(buf.x[i] * S, buf.y[i] * S, rad, 0, Math.PI * 2);
    ctx.fillStyle = rgbCSS(buf.c[i], clamp(al, 0, 1));
    ctx.fill();
  }
}

/** Radial marks pointing out from the stage centre. */
function drawTicks(k) {
  ctx.lineCap = "butt";
  for (let i = 0; i < N; i++) {
    const al = buf.a[i] * k;
    if (al <= 0.01) continue;
    const dx = buf.x[i] - 0.5, dy = buf.y[i] - 0.5;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    const len = clamp(buf.r[i], 0, 0.3);
    ctx.beginPath();
    ctx.moveTo((0.5 + ux * (d - len * 0.5)) * S, (0.5 + uy * (d - len * 0.5)) * S);
    ctx.lineTo((0.5 + ux * (d + len * 0.5)) * S, (0.5 + uy * (d + len * 0.5)) * S);
    ctx.strokeStyle = rgbCSS(buf.c[i], clamp(al, 0, 1));
    ctx.lineWidth = Math.max(1, S * 0.004);
    ctx.stroke();
  }
}

/** Smooth polylines through each group — the clean-line renderer. */
function drawStroke(groups, k, width) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const g of groups) {
    if (g.n < 2) continue;
    let al = 0;
    for (let j = 0; j < g.n; j++) al += buf.a[g.i0 + j];
    al = (al / g.n) * k;
    if (al <= 0.01) continue;
    ctx.beginPath();
    ctx.moveTo(buf.x[g.i0] * S, buf.y[g.i0] * S);
    for (let j = 1; j < g.n; j++) {
      const i = g.i0 + j;
      ctx.lineTo(buf.x[i] * S, buf.y[i] * S);
    }
    if (g.closed) ctx.closePath();
    ctx.strokeStyle = rgbCSS(g.col, clamp(al, 0, 1));
    ctx.lineWidth = Math.max(1, S * width);
    ctx.stroke();
  }
  // markers: live() boosts r on individual points, draw those as dots
  drawDots(k);
}

/** Thick round-capped runs — one per group. */
function drawBars(groups, k) {
  ctx.lineCap = "round";
  for (const g of groups) {
    if (g.n < 2) continue;
    let al = 0;
    for (let j = 0; j < g.n; j++) al += buf.a[g.i0 + j];
    al = (al / g.n) * k;
    if (al <= 0.01) continue;
    const i1 = g.i0, i2 = g.i0 + g.n - 1;
    ctx.beginPath();
    ctx.moveTo(buf.x[i1] * S, buf.y[i1] * S);
    ctx.lineTo(buf.x[i2] * S, buf.y[i2] * S);
    ctx.strokeStyle = rgbCSS(g.col, clamp(al, 0, 1));
    ctx.lineWidth = Math.max(2, S * 0.018);
    ctx.stroke();
  }
}

function render(act, k) {
  if (k <= 0.002) return;
  switch (act.mode) {
    case "ticks": drawTicks(k); break;
    case "stroke": drawStroke(act.layout.groups, k, 0.0075); break;
    case "bars": drawBars(act.layout.groups, k); break;
    default: drawDots(k);
  }
}

/* ============================================================
   Decor — the annotation layer

   The morphing points carry the shape; this draws everything
   *around* it: rulers, guides, axis frames, labels and live
   readouts. Kept separate so it can fade independently and never
   interferes with the point interpolation.
   ============================================================ */

// `Mono` is the family name the site's own @font-face declares — asking for
// "Berkeley Mono" here matched nothing and quietly fell back to the system font.
const MONO = "11px Mono, ui-monospace, SFMono-Regular, Menlo, monospace";
/* What the site itself claims the bundle weighs. Deliberately not the sum of
   the module sizes (27.13) — shared code means the whole is smaller. */
const BUNDLE_KB = 24.5;
const FG = hueRGB("fg");

function txt(str, x, y, col, al, size = 11, align = "left") {
  ctx.font = size === 11 ? MONO : MONO.replace("11px", `${size}px`);
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = rgbCSS(col, al);
  ctx.fillText(str, x * S, y * S);
}

function line(x1, y1, x2, y2, col, al, w = 1, dash = null) {
  ctx.save();
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1 * S, y1 * S);
  ctx.lineTo(x2 * S, y2 * S);
  ctx.strokeStyle = rgbCSS(col, al);
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

function ringPath(cx, cy, rad, col, al, w = 1, dash = null) {
  ctx.save();
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(cx * S, cy * S, rad * S, 0, Math.PI * 2);
  ctx.strokeStyle = rgbCSS(col, al);
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.restore();
}

function frameBox(x, y, w, h, col, al) {
  ctx.save();
  ctx.setLineDash([2, 4]);
  ctx.strokeStyle = rgbCSS(col, al);
  ctx.lineWidth = 1;
  ctx.strokeRect(x * S, y * S, w * S, h * S);
  ctx.restore();
}

/* --- 01 timer ------------------------------------------------ */
function decorTimer(a, t, ptr) {
  const col = ACTS[1].col;
  const head = ptr.inside
    ? (Math.atan2(ptr.y - 0.5, ptr.x - 0.5) / (Math.PI * 2) + 1.25) % 1
    : (t / 4) % 1;
  ringPath(0.5, 0.5, 0.47, FG, a * 0.1);
  ringPath(0.5, 0.5, 0.3, FG, a * 0.07, 1, [2, 5]);
  // quarter marks
  for (let q = 0; q < 4; q++) {
    const ang = (q / 4) * Math.PI * 2 - Math.PI / 2;
    const lx = 0.5 + Math.cos(ang) * 0.53, ly = 0.5 + Math.sin(ang) * 0.53;
    txt(`${q * 25}`, lx, ly, FG, a * 0.4, 10, "center");
  }
  // the hand
  const ha = head * Math.PI * 2 - Math.PI / 2;
  line(0.5, 0.5, 0.5 + Math.cos(ha) * 0.34, 0.5 + Math.sin(ha) * 0.34, col, a * 0.8, 1.5);
  ctx.beginPath();
  ctx.arc(0.5 * S, 0.5 * S, 0.012 * S, 0, Math.PI * 2);
  ctx.fillStyle = rgbCSS(col, a * 0.9);
  ctx.fill();
  txt((head * 4).toFixed(2) + "s", 0.5, 0.62, col, a * 0.95, 20, "center");
  txt(ptr.inside ? "POINTER" : "LOOPING", 0.5, 0.68, FG, a * 0.35, 9, "center");
}

/* --- 02 easings ---------------------------------------------- */
function decorEasings(a, t, ptr) {
  const L = ACTS[2].layout;
  const u = ptr.inside ? ptr.x : (t / 1.8) % 1;
  for (let k = 0; k < 4; k++) {
    const cx = k % 2 === 0 ? 0.09 : 0.55, cy = k < 2 ? 0.16 : 0.58;
    const w = 0.36, h = 0.24;
    frameBox(cx, cy, w, h, FG, a * 0.12);
    line(cx, cy + h, cx + w, cy + h, FG, a * 0.18);
    txt(L.names[k], cx, cy + h + 0.06, FG, a * 0.5, 10);
    // progress tick along the bottom axis
    line(cx + u * w, cy + h - 0.012, cx + u * w, cy + h + 0.012, ACTS[2].col, a * 0.5, 1);
  }
  txt(`t = ${u.toFixed(2)}`, 0.5, 0.95, ACTS[2].col, a * 0.7, 11, "center");
}

/* --- 03 spring ------------------------------------------------ */
function decorSpring(a, t, ptr) {
  const col = ACTS[3].col;
  const u = ptr.inside ? ptr.x : (t / 2.2) % 1;
  // rest line and the two extremes it settles between
  line(0.06, 0.28, 0.96, 0.28, FG, a * 0.18, 1, [3, 5]);
  txt("target", 0.965, 0.28, FG, a * 0.4, 9);
  line(0.06, 0.74, 0.96, 0.74, FG, a * 0.12, 1, [3, 5]);
  txt("start", 0.965, 0.74, FG, a * 0.35, 9);
  frameBox(0.06, 0.16, 0.9, 0.62, FG, a * 0.08);
  const idx = Math.round(u * (N - 1));
  line(0.08 + u * 0.84, 0.16, 0.08 + u * 0.84, 0.78, col, a * 0.3, 1);
  txt("bounce 0.62", 0.06, 0.88, FG, a * 0.45, 10);
  txt("duration 900ms", 0.06, 0.93, FG, a * 0.45, 10);
  txt(`t = ${u.toFixed(2)}`, 0.96, 0.9, col, a * 0.7, 11, "right");
  return idx;
}

/* --- 04 stagger ----------------------------------------------- */
function decorStagger(a, t, ptr) {
  const col = ACTS[4].col;
  const ox = ptr.inside ? ptr.x : 0.5, oy = ptr.inside ? ptr.y : 0.5;
  const px = 0.12 + ox * 0.76, py = 0.12 + oy * 0.76;
  frameBox(0.1, 0.1, 0.8, 0.8, FG, a * 0.1);
  // crosshair on the wave origin
  line(px - 0.05, py, px + 0.05, py, col, a * 0.55, 1);
  line(px, py - 0.05, px, py + 0.05, col, a * 0.55, 1);
  ringPath(px, py, 0.035, col, a * 0.45);
  const gi = Math.round(oy * (GRID - 1)) * GRID + Math.round(ox * (GRID - 1));
  txt(`from: ${ptr.inside ? gi : "'center'"}`, 0.5, 0.955, col, a * 0.75, 11, "center");
  txt("grid: [13, 13]", 0.02, 0.05, FG, a * 0.4, 10);
  txt("169 targets", 0.98, 0.05, FG, a * 0.4, 10, "right");
}

/* --- 05 grids -------------------------------------------------- */
function decorGrids(a, t, ptr) {
  const col = ACTS[5].col;
  // faint lattice behind the picture
  const step = 0.76 / (GRID - 1);
  for (let k = 0; k < GRID; k++) {
    const v = 0.12 + k * step;
    line(0.12, v, 0.88, v, FG, a * 0.045);
    line(v, 0.12, v, 0.88, FG, a * 0.045);
  }
  frameBox(0.1, 0.1, 0.8, 0.8, FG, a * 0.1);
  txt((gridsLive.label || "").toUpperCase(), 0.5, 0.955, col, a * 0.75, 12, "center");
  txt("scale = v > 0.1 ? v : 0", 0.02, 0.05, FG, a * 0.4, 10);
}

/* --- 06 timeline ----------------------------------------------- */
function decorTimeline(a, t, ptr) {
  const col = ACTS[6].col;
  const L = ACTS[6].layout;
  const play = timelineLive.play ?? 0;
  // ruler
  line(0.1, 0.88, 0.9, 0.88, FG, a * 0.25);
  for (let k = 0; k <= 10; k++) {
    const x = 0.1 + (k / 10) * 0.8;
    const major = k % 5 === 0;
    line(x, 0.88, x, 0.88 + (major ? 0.025 : 0.014), FG, a * (major ? 0.35 : 0.2));
    if (major) txt(`${k * 10}%`, x, 0.935, FG, a * 0.4, 9, "center");
  }
  // track labels and their time ranges
  L.tracks.forEach(([t0, t1], k) => {
    const y = 0.22 + (k / (L.tracks.length - 1)) * 0.56;
    txt(`0${k + 1}`, 0.045, y, FG, a * 0.45, 10);
    txt(`${Math.round(t0 * 100)}–${Math.round(t1 * 100)}`, 0.955, y, FG, a * 0.3, 9, "right");
  });
  // playhead
  const px = 0.1 + play * 0.8;
  line(px, 0.14, px, 0.88, col, a * 0.55, 1.5);
  ctx.beginPath();
  ctx.moveTo(px * S, 0.125 * S);
  ctx.lineTo((px - 0.014) * S, 0.1 * S);
  ctx.lineTo((px + 0.014) * S, 0.1 * S);
  ctx.closePath();
  ctx.fillStyle = rgbCSS(col, a * 0.8);
  ctx.fill();
  txt(`${Math.round(play * 100)}%`, 0.5, 0.045, col, a * 0.7, 11, "center");
}

/* --- 07 modules ------------------------------------------------ */
function decorModules(a, t, ptr) {
  const L = ACTS[7].layout;
  let total = 0;
  L.mods.forEach(([name, kb, hue], m) => {
    const y = 0.16 + (m / (L.mods.length - 1)) * 0.68;
    total += kb;
    const hot = ptr.inside && Math.round(ptr.y * (L.mods.length - 1)) === m;
    txt(name, 0.125, y - 0.035, hueRGB(hue), a * (hot ? 0.95 : 0.55), 10);
    txt(kb.toFixed(2), 0.97, y - 0.035, FG, a * (hot ? 0.8 : 0.35), 10, "right");
  });
  line(0.12, 0.92, 0.97, 0.92, FG, a * 0.15);
  // The parts sum to MORE than the shipped bundle (27.13 vs 24.50) because the
  // modules share code, so label it as the sum rather than calling it a total.
  txt("SUM OF PARTS", 0.125, 0.955, FG, a * 0.4, 9);
  txt(`${total.toFixed(2)} KB`, 0.97, 0.955, FG, a * 0.45, 9, "right");
  txt("BUNDLED", 0.125, 0.995, FG, a * 0.5, 9);
  txt(`${BUNDLE_KB.toFixed(2)} KB`, 0.97, 0.995, ACTS[7].col, a * 0.85, 11, "right");
}

/* --- 08 svg ---------------------------------------------------- */
function decorSvg(a, t, ptr) {
  const col = ACTS[8].col;
  const drawn = svgLive.drawn ?? 0;
  ringPath(0.5, 0.5, 0.42, FG, a * 0.09, 1, [2, 4]);
  ringPath(0.5, 0.5, 0.5, FG, a * 0.06);
  // leading endpoint
  const ang = drawn * Math.PI * 2 - Math.PI / 2;
  if (drawn > 0.002 && drawn < 0.999) {
    ctx.beginPath();
    ctx.arc((0.5 + Math.cos(ang) * 0.42) * S, (0.5 + Math.sin(ang) * 0.42) * S, 0.014 * S, 0, Math.PI * 2);
    ctx.fillStyle = rgbCSS(FG, a * 0.85);
    ctx.fill();
  }
  txt(`${Math.round(drawn * 100)}%`, 0.5, 0.5, col, a * 0.9, 22, "center");
  txt("draw", 0.5, 0.56, FG, a * 0.4, 10, "center");
  txt("7 paths · 1 ring", 0.5, 0.96, FG, a * 0.4, 10, "center");
}

const DECOR = {
  Timer: decorTimer, Easings: decorEasings, Spring: decorSpring,
  Stagger: decorStagger, Grids: decorGrids, Timeline: decorTimeline,
  Modules: decorModules, SVG: decorSvg,
};

function drawDecor(act, k, t, ptr) {
  if (k <= 0.004) return;
  const fn = DECOR[act.title];
  if (!fn) return;
  ctx.save();
  fn(k, t, ptr);
  ctx.restore();
}

/* Pacing and shape of a single act -> act transition.
     MORPH_START   fraction of the act's scroll spent holding still before the
                   morph begins, so 0.45 gives the morph the last 55%
     MORPH_SPREAD  how far the morph is spread across the point pool — 0 moves
                   every point together, higher values re-form it as a sweep
     MORPH_BLOOM   how far points swing out from the centre at the midpoint of
                   a morph. Without it the transition is technically correct
                   but too subtle to read; the outward swell is what makes the
                   shape visibly come apart and re-gather. */
const MORPH_START = 0.45;
const MORPH_SPREAD = 0.9;
const MORPH_BLOOM = 0.13;

/* ============================================================
   Scroll → morph
   ============================================================ */

const $showcase = document.querySelector("#showcase");
const $pin = document.querySelector(".sc-pin");
const $handoff = document.querySelector(".sc-handoff");
const $engine = document.querySelector("#engine");
const $finale = document.querySelector("#home");

// Height is derived from the act count so the two can never drift apart:
// one screen of travel each, plus one for the pin itself.
if ($showcase) $showcase.style.height = `${(ACTS.length + 1) * 100}lvh`;

if ($engine) {
  $engine.style.opacity = "0";
  $engine.style.transformOrigin = "50% 60%";
  $engine.style.willChange = "transform, opacity";
}

const TILT_IN = 70;

function actProgress() {
  if (!$showcase) return 0;
  const r = $showcase.getBoundingClientRect();
  const travel = $showcase.offsetHeight - window.innerHeight;
  if (travel <= 0) return 0;
  return clamp(-r.top / travel, 0, 1) * ACTS.length;
}

function updateEngine() {
  if (!$engine || !$handoff || !$finale) return;
  const vh = window.innerHeight;

  // Fade LATE. The showcase block ends exactly where the handoff begins, so
  // starting before handoff.top reaches 0 puts the finale on screen while the
  // last act is still leaving — it reads as arriving too early and being
  // covered by the section in front of it.
  const h = $handoff.getBoundingClientRect();
  $engine.style.opacity = clamp(-h.top / (vh * 0.35), 0, 1).toFixed(3);

  // Reaches level exactly as #home's top meets the viewport top, which is
  // when the master timeline starts scrubbing. Mirrors, in reverse, the move
  // the sequence makes at its END (home.js "scene rotate x 2", rotateX: 100
  // at GET_STARTED). Applied to #engine rather than the 3D scene group
  // because HEADING already animates that group's rotateX to 90.
  const f = $finale.getBoundingClientRect();
  const approach = clamp(1 - f.top / vh, 0, 1);
  const deg = -TILT_IN * Math.pow(1 - approach, 1.4);
  $engine.style.transform = deg < -0.05 ? `perspective(1500px) rotateX(${deg.toFixed(2)}deg)` : "";
}

function frame(nowMs) {
  const t = nowMs / 1000;
  autoTick(nowMs);
  updateEngine();

  const box = $showcase ? $showcase.getBoundingClientRect() : null;
  const onScreen = box ? box.bottom > -200 && box.top < window.innerHeight + 200 : false;

  // Fade the pinned stage out as the block leaves, rather than letting the
  // last act's caption drift up the screen on its own after the pin releases.
  if ($pin && box) {
    const exit = clamp((window.innerHeight - box.bottom) / (window.innerHeight * 0.3), 0, 1);
    $pin.style.opacity = (1 - exit).toFixed(3);
  }

  if (onScreen && ctx) {
    const p = actProgress();
    const i = clamp(Math.floor(p), 0, ACTS.length - 1);
    const j = Math.min(i + 1, ACTS.length - 1);
    const local = p - i;
    // Hold steady, then morph across the rest of the segment. The morph used
    // to get only the last 30%, which made it flick past; it now has nearly
    // half the segment so there is time to watch a shape re-form.
    const mRaw = clamp((local - MORPH_START) / (1 - MORPH_START), 0, 1);
    const m = smooth(mRaw); // whole-act value: colours, copy, mode cross-fade

    // Points do NOT all move together. Each one is offset along the morph by
    // its index, so a shape re-forms as a sweep rather than every point
    // arriving at once — the same idea as stagger(), applied to the morph.
    const front = mRaw * (1 + MORPH_SPREAD);

    const A = ACTS[i].layout, B = ACTS[j].layout;
    for (let k = 0; k < N; k++) {
      const mk = smooth(clamp(front - (k / N) * MORPH_SPREAD, 0, 1));
      let px = lerp(A.x[k], B.x[k], mk);
      let py = lerp(A.y[k], B.y[k], mk);
      // Swing out from the centre at the midpoint of this point's own morph,
      // then settle back. Each point blooms on its own schedule, so the shape
      // breathes apart in a wave rather than pulsing as one.
      const bloom = Math.sin(mk * Math.PI) * MORPH_BLOOM;
      if (bloom > 0.0005) {
        px += (px - 0.5) * bloom;
        py += (py - 0.5) * bloom;
      }
      buf.x[k] = px;
      buf.y[k] = py;
      buf.r[k] = lerp(A.r[k], B.r[k], mk) * (1 + bloom * 1.6);
      buf.a[k] = lerp(A.a[k], B.a[k], mk);
      const ca = A.c[k], cb = B.c[k];
      buf.c[k][0] = lerp(ca[0], cb[0], mk);
      buf.c[k][1] = lerp(ca[1], cb[1], mk);
      buf.c[k][2] = lerp(ca[2], cb[2], mk);
    }

    if (m < 1) ACTS[i].live(buf, t, 1 - m, ptr);
    if (m > 0 && j !== i) ACTS[j].live(buf, t, m, ptr);

    ctx.clearRect(0, 0, S, S);
    // Both render modes over the same points, one fading into the other.
    // Eased rather than linear: halfway through a morph the points are in
    // neither formation, and a stroke drawn across them reads as long zigzags.
    // Dimming both through the middle keeps the crossover clean.
    // 1.35, not linear and not steep: steep enough that a stroke is not drawn
    // boldly across points that are between formations, shallow enough that
    // the midpoint of the morph is not a dim patch — which it became once the
    // morph was given more than half of each act's scroll.
    render(ACTS[i], Math.pow(1 - m, 1.35));
    if (j !== i) render(ACTS[j], Math.pow(m, 1.35));

    // per-act annotation: rulers, labels, readouts
    drawDecor(ACTS[i], Math.pow(1 - m, 2.2), t, ptr);
    if (j !== i) drawDecor(ACTS[j], Math.pow(m, 2.2), t, ptr);

    const act = m > 0.5 ? ACTS[j] : ACTS[i];
    if ($num) $num.innerHTML = act.num ? `${act.num} <span>/ 0${ACTS.length - 1}</span>` : "";
    if ($caption) {
      $caption.textContent =
        act === ACTS[5] && gridsLive.label ? `${gridsLive.label} · 169 values` : act.caption;
    }
    const ac = [
      lerp(ACTS[i].col[0], ACTS[j].col[0], m),
      lerp(ACTS[i].col[1], ACTS[j].col[1], m),
      lerp(ACTS[i].col[2], ACTS[j].col[2], m),
    ];
    document.documentElement.style.setProperty("--sc-act", rgbCSS(ac, 1));

    // Sequenced, not cross-faded: the outgoing line is fully gone before the
    // incoming one starts. Overlapping them superimposed two words in one box.
    const last = j === i;
    const outP = last ? 1 : 1 - clamp(m / 0.45, 0, 1);
    const inP = clamp((m - 0.55) / 0.45, 0, 1);
    for (let k = 0; k < ACTS.length; k++) {
      const presence = k === i ? outP : k === j && !last ? inP : 0;
      paintChars(titleChars[k], presence, 0.045, 16);
      paintChars(bodyChars[k], presence, 0.004, 10);
    }
  }

  requestAnimationFrame(frame);
}

sizeCanvas();
addEventListener("resize", () => {
  sizeCanvas();
  updateEngine();
});

// Driven from the scroll event as well as rAF: rAF is paused whenever the tab
// or pane is hidden, and anything depending solely on it can be left holding
// a stale value.
addEventListener("scroll", updateEngine, { passive: true });

updateEngine();
requestAnimationFrame(frame);

/* ============================================================
   Auto tour

   Scrolls the whole page on its own: glides to each act, holds
   long enough for that act's loop to play, then moves on. The
   finale is scrubbed rather than self-animating, so it is not
   held at all — auto mode drifts slowly through it instead, which
   is what actually plays the sequence.

   Toggle with the button or the A key. Any real scroll input
   (wheel, touch, arrows) cancels it immediately, so it can never
   fight you for control.
   ============================================================ */

const AUTO_KEY = "a";

const $auto = document.createElement("button");
$auto.className = "sc-auto";
$auto.type = "button";
$auto.setAttribute("aria-pressed", "false");
$auto.innerHTML = `<span class="sc-auto-dot"></span><span class="sc-auto-label">Auto tour</span><kbd>A</kbd>`;
document.body.appendChild($auto);

const auto = { on: false, phase: "idle", from: 0, to: 0, t0: 0, dur: 0, until: 0, idx: 0, stops: [] };

/* Pacing, in one place.
   Every glide leg is a SPEED in px/sec, not a duration, so a leg of any
   length feels the same. (It used to be a duration scaled by distance, and
   the scale multiplied *up* on long legs — the finale drift ran at 90s.) */
const AUTO = {
  firstHold: 2200,
  actHold: 3400, // long enough to watch an act's loop play through
  actSpeed: 800,
  maxActLeg: 1500,

  approachSpeed: 1250, // last act -> handoff card
  tiltSpeed: 1350, // one unbroken move through the tilt into the finale
  tiltCap: 1250,

  finaleSpeed: 380, // the sequence's general playback rate
  demoSpeed: 280, // slower through the 2D demos on the ring
  tiltOutSpeed: 900, // the scene rotating away at the very end

  minLeg: 420,
  endHold: 1800,
};

/**
 * Scroll position where a given master-timeline label starts.
 *
 * NOT the same as that section's element top. The timeline's total duration is
 * the SUM OF THE [data-label] SECTION HEIGHTS, while the page also contains
 * `.section-spacer` divs that add height but no duration. One of those sits
 * between #features-gallery and #modules, which puts every later label ~1
 * screen ahead of its own element — GET_STARTED fires a full viewport before
 * #get-started's top. Anchoring to the element made the end-of-finale leg
 * start too late: slow through the first half of the tilt, then a jump.
 */
function labelStart(id) {
  const homeTop = $finale.getBoundingClientRect().top + scrollY;
  let acc = 0;
  for (const el of $finale.querySelectorAll("[data-label]")) {
    if (el.id === id) return homeTop + acc;
    acc += el.offsetHeight;
  }
  return null;
}

function planStops() {
  const vh = window.innerHeight;
  const top = $showcase.getBoundingClientRect().top + scrollY;
  const travel = $showcase.offsetHeight - vh;
  const at = (el) => el.getBoundingClientRect().top + scrollY;
  const stops = [];

  // one stop per act, parked just past its settle point
  for (let i = 0; i < ACTS.length; i++) {
    stops.push({
      y: top + ((i + 0.34) / ACTS.length) * travel,
      hold: i === 0 ? AUTO.firstHold : AUTO.actHold,
      speed: AUTO.actSpeed,
      cap: AUTO.maxActLeg,
    });
  }

  // Park BEFORE the handoff section reaches the top, so the engine is still
  // fully faded out here. Stopping any later meant holding still halfway
  // through the tilt, with the finale frozen at an angle — which read as an
  // abrupt, awkward pause. From here the tilt runs as one unbroken move.
  stops.push({ y: at($handoff) - vh * 0.28, hold: 900, speed: AUTO.approachSpeed, cap: 1300 });
  stops.push({ y: at($finale), hold: 250, speed: AUTO.tiltSpeed, cap: AUTO.tiltCap });

  // The sequence itself, in three parts: in, the 2D demos on the ring (which
  // deserve longer), and out. Nothing is held — it is scrubbed by scroll, so
  // stopping would simply freeze it.
  const demoIn = labelStart("features-gallery");
  const demoOut = labelStart("modules");
  const tiltOut = labelStart("get-started");
  if (demoIn) stops.push({ y: demoIn, hold: 0, speed: AUTO.finaleSpeed });
  if (demoOut) stops.push({ y: demoOut, hold: 0, speed: AUTO.demoSpeed });
  if (tiltOut) stops.push({ y: tiltOut, hold: 0, speed: AUTO.finaleSpeed });

  stops.push({
    y: document.documentElement.scrollHeight - vh,
    hold: AUTO.endHold,
    speed: AUTO.tiltOutSpeed,
  });
  return stops;
}

function autoGoTo(i) {
  if (i >= auto.stops.length) return autoStop();
  const stop = auto.stops[i];
  auto.idx = i;
  auto.from = scrollY;
  auto.to = stop.y;
  const dist = Math.abs(auto.to - auto.from);
  let dur = (dist / stop.speed) * 1000;
  if (stop.cap) dur = Math.min(dur, stop.cap);
  auto.dur = Math.max(AUTO.minLeg, dur);
  auto.t0 = performance.now();
  auto.phase = "glide";
}

function autoStart() {
  auto.on = true;
  auto.stops = planStops();
  $auto.classList.add("is-on", "is-visible");
  $auto.setAttribute("aria-pressed", "true");
  $auto.querySelector(".sc-auto-label").textContent = "Stop tour";
  // resume from wherever the reader already is
  let i = 0;
  while (i < auto.stops.length - 1 && auto.stops[i].y < scrollY - 40) i++;
  autoGoTo(i);
}

function autoStop() {
  auto.on = false;
  auto.phase = "idle";
  $auto.classList.remove("is-on");
  $auto.setAttribute("aria-pressed", "false");
  $auto.querySelector(".sc-auto-label").textContent = "Auto tour";
}

function autoToggle() {
  auto.on ? autoStop() : autoStart();
}

function autoTick(now) {
  if (!auto.on) return;
  if (auto.phase === "glide") {
    const k = clamp((now - auto.t0) / auto.dur, 0, 1);
    // smoothstep in and out so each move eases rather than jerking
    window.scrollTo(0, Math.round(lerp(auto.from, auto.to, smooth(k))));
    if (k >= 1) {
      auto.phase = "hold";
      auto.until = now + auto.stops[auto.idx].hold;
    }
  } else if (auto.phase === "hold" && now >= auto.until) {
    autoGoTo(auto.idx + 1);
  }
}

$auto.addEventListener("click", autoToggle);

addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target && e.target.tagName) || "";
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  if (e.key.toLowerCase() === AUTO_KEY) {
    e.preventDefault();
    autoToggle();
    revealAuto();
  } else if (auto.on) {
    autoStop(); // any other key is the reader taking over
  }
});

// Real scroll input always wins.
for (const ev of ["wheel", "touchstart", "pointerdown"]) {
  addEventListener(ev, () => auto.on && autoStop(), { passive: true });
}

/* The button introduces itself, then gets out of the way if unused.
   The A key keeps working either way, and it comes back whenever the
   tour is running or the pointer goes looking for it. */
let hideTimer = null;
function revealAuto() {
  $auto.classList.add("is-visible");
  clearTimeout(hideTimer);
  if (!auto.on) hideTimer = setTimeout(() => $auto.classList.remove("is-visible"), 6000);
}
setTimeout(revealAuto, 600);
addEventListener("pointermove", (e) => {
  if (e.clientY < 90 && e.clientX > window.innerWidth - 320) revealAuto();
}, { passive: true });

/* ============================================================
   End card

   The last screen, after the scene has tilted away. Built here
   rather than in the markup so the list of acts and their colours
   come straight from the ACTS array and can never drift out of
   sync with what you just watched.
   ============================================================ */

const $end = document.querySelector(".end-placeholder");
if ($end) {
  // Spelled out rather than a digit, and derived rather than typed: the
  // heading used to say "eight" literally, which would quietly become a lie
  // the moment an act was added or removed.
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven",
    "eight", "nine", "ten", "eleven", "twelve"];
  const count = ACTS.length - 1; // the title act is not one of them
  const countWord = WORDS[count] || String(count);

  const chips = ACTS.slice(1) // skip the title act
    .map(
      (a) =>
        `<li><i style="background: var(--hex-${a.hue}-1)"></i>${a.title.toLowerCase()}</li>`,
    )
    .join("");

  $end.innerHTML = `
    <div class="end-card">
      <p class="end-kicker">That was all ${countWord}</p>
      <ul class="end-acts">${chips}</ul>
      <p class="end-stats">
        ${N} points <span>·</span> ${ACTS.length} layouts <span>·</span>
        1 timeline <span>·</span> ${BUNDLE_KB} KB bundled
      </p>
      <button class="end-replay" type="button">
        <span aria-hidden="true">&#8634;</span> Watch it again
      </button>
      <p class="end-credit"></p>
    </div>`;

  $end.querySelector(".end-replay").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "instant" });
    // let the scroll land before the tour reads positions off the page
    setTimeout(() => {
      revealAuto();
      autoStart();
    }, 80);
  });

  // fade in once it is actually reached, so it does not sit lit under the
  // sequence while the scene is still tilting away
  new IntersectionObserver(
    (entries) => {
      for (const e of entries) $end.classList.toggle("is-in", e.isIntersecting);
    },
    { rootMargin: "-18% 0px -10% 0px" },
  ).observe($end);
}
