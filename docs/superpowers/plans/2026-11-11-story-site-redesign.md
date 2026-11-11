# Story-site Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild patrickackom.site as a narrow, story-first single column with a drifting-Adinkra canvas and five per-project case-study pages, per `docs/superpowers/specs/2026-11-11-story-site-redesign-design.md`.

**Architecture:** Static HTML/CSS/vanilla JS, no build step, served as-is (Vercel). Shared CSS + three shared scripts (`site.js`, `glyphs.js`, `adinkra.js`); `story.js` and `easter.js` only on the home page. Project pages are hand-written copies of one skeleton.

**Tech Stack:** HTML, CSS (custom properties, `@media (prefers-*)`), Canvas 2D + `Path2D`, Google Fonts (Inter, Caveat, Mrs Saint Delafield). No libraries.

**Testing approach:** No unit-test harness exists and the site has no logic worth unit-testing beyond the canvas; verification is a static link/asset check script plus browser checks (Chrome via claude-in-chrome) at 375/768/1440, both themes, reduced motion. Each task ends with its own check.

---

## File map

| File | Responsibility |
|---|---|
| `index.html` | Home markup (rewritten) |
| `projects/<slug>/index.html` ×5 | Case studies |
| `css/site.css` | All styles (rewritten). Sections: tokens, base, nav, name, story+chips, typing pill, cards, experience, footer, egg, project page, reduced-motion |
| `js/site.js` | Theme toggle (persists `localStorage.theme`, try/catch), nav `.is-scrolled` class, copy-email button |
| `js/glyphs.js` | `window.ADINKRA_GLYPHS = [{name, d, vb}]` — SVG path strings on a 100×100 viewBox |
| `js/adinkra.js` | Canvas background. Reads `data-glyph-density` on `<body>` (default 1) |
| `js/story.js` | Home intro: name draw-on, word-by-word bio, fast-forward/skip, `inert` gating |
| `js/easter.js` | Kept; console copy tweak only |
| `scripts/check-site.mjs` | Node script: every local `href`/`src` in every HTML file resolves to a file; every page has title/description/canonical |
| `sitemap.xml` | Add 5 project URLs |

Delete: `js/main.js`, `js/plate-gl.js`, `me.png`, `img/me-700.webp`, `img/me-1200.webp`.

Theme bootstrap (inline in every `<head>`, before CSS):

```html
<script>
(function(){var t=null;try{t=localStorage.getItem('theme')}catch(e){}
if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
var d=document.documentElement;d.setAttribute('data-theme',t);d.classList.add('js');})();
</script>
```

---

### Task 1: Check script (the "test")

**Files:** Create `scripts/check-site.mjs`

- [ ] Write a Node ESM script that globs `**/*.html` (excluding `node_modules`, `.git`, `odyssey`), extracts `href|src|srcset` values that are relative or root-relative (skip `http`, `mailto:`, `#`, `data:`), resolves them against the file's directory (root-relative against repo root; a trailing `/` means `index.html`), and reports missing files. Also asserts each page has `<title>`, `meta[name=description]`, `link[rel=canonical]`, exactly one `<h1>`. Exit 1 on any failure.
- [ ] Run `node scripts/check-site.mjs` against the CURRENT site — expect PASS (proves the checker doesn't false-positive). Then expect it to FAIL after Task 2 deletes old files until the new pages exist.
- [ ] Commit `chore: add static site link checker`.

### Task 2: Tokens, base and shared shell CSS + site.js

**Files:** Rewrite `css/site.css`; create `js/site.js`; delete `js/main.js`, `js/plate-gl.js`.

- [ ] Tokens: dark `--bg:#1a1918; --text:#ece8e1; --muted:#9a948a; --faint:#6b665e; --rule:rgba(236,232,225,.12); --accent:#d4a24c; --accent-2:#c8643b; --hl:rgba(212,162,76,.32)`; light `--bg:#f4efe6; --text:#2a2219; --muted:#6b5f50; --faint:#8f8474; --rule:rgba(42,34,25,.14); --accent:#9a6418; --accent-2:#b4532c; --hl:rgba(212,162,76,.4)`. Dark tokens apply under `:root[data-theme=dark]`, plus `@media (prefers-color-scheme: dark){:root:not([data-theme=light]){…}}` for the no-JS case. Check every text/bg pair ≥ 4.5:1 (muted included) with a contrast calculator; adjust hexes, not the rule.
- [ ] Base: column `.col{max-width:520px;margin-inline:auto;padding-inline:16px}`; body Inter 15px/1.65; grain via fixed `body::after` with inline SVG `feTurbulence` data URI at opacity .06 (dark) / .04 (light), `pointer-events:none`; `#bg` canvas `position:fixed;inset:0;z-index:0`; content `position:relative;z-index:1`; skip link; `:focus-visible` 2px accent outline.
- [ ] Nav: sticky top, 64px tall, mark (inline SVG Nyame Dua, 22px, `currentColor`) left, links + theme button right; `.nav.is-scrolled` adds `backdrop-filter:blur(10px)` + translucent bg.
- [ ] Footer + egg styles (port `.egg*` and `.warp` from old CSS, swap `--field` for `--accent`; keep `.warp{background:#2f36e0}` because it hands off to the blue odyssey page).
- [ ] `js/site.js`: theme toggle swaps `data-theme`, saves to localStorage (try/catch), sets `aria-pressed` and an `aria-label` ("Switch to light theme"/"dark"), dispatches `window` event `themechange`; scroll listener (passive) toggles `.is-scrolled` past 8px; copy button: `navigator.clipboard.writeText` → status "Copied" / fallback "Press Ctrl+C" after selecting the email text; clears after 2.5s.
- [ ] Commit `feat: new shell styles and shared site script`.

### Task 3: Adinkra glyphs + canvas

**Files:** Create `js/glyphs.js`, `js/adinkra.js`

- [ ] `glyphs.js`: 10 glyphs, each `{name, d}` on a 100×100 viewBox, filled with `evenodd` rule. Built from simple primitives (circles, rects, arcs) so they're recognisable but stylised: Adinkrahene (3 concentric rings), Dwennimmen (4 interlocking spirals), Nyame Dua (cross-like frame), Mate Masie (4 linked ovals), Nkyinkyim (zig-zag ribbon), Fawohodie (chain), Sankofa heart, Gye Nyame (simplified), Akoma (heart), Funtunfunefu (two interlocked crocodile bodies, simplified as two mirrored S curves). Render each on a test canvas and eyeball before moving on.
- [ ] `adinkra.js` structure:
  - `init()`: bail if `!canvas.getContext` or no glyphs; read density from `document.body.dataset.glyphDensity`; DPR = `min(devicePixelRatio,2)`; size canvas to viewport; build sprites.
  - `buildSprites()`: for each glyph × 3 layers (far blur 4px/alpha .35/size 14–20, mid blur 1.5px/.55/24–34, near 0/.85/36–52) × 3 palette colours, draw `Path2D` scaled into an offscreen canvas with `ctx.filter='blur()'` ONCE (fallback: no blur if `filter` unsupported). Palette read from CSS vars `--glyph-1/2/3` so theme changes rebuild sprites on `themechange`.
  - Particles: count `round((innerWidth<640?20:45)*density)`; each `{x,y,vy,swayAmp,swayFreq,phase,rot,vr,layer,sprite}`; vy by layer (far .15, mid .3, near .5 px/frame at 60fps; scale by `dt/16.67`).
  - Light shaft drawn as a CSS gradient on `body::before` (not canvas) — cheaper.
  - Pointer: near-layer particles within 120px get pushed out (`x += (dx/d)*(120-d)*0.04`).
  - Heap: compute `pileZone = scrollY + innerHeight >= docHeight - footerHeight`. When true, particles reaching `innerHeight - restY` stop (`resting=true`), where `restY` is from a per-column height map (columns 24px wide, each landed glyph raises its column by `size*0.45`, capped at 70px). Max 30 resting; when exceeded or when leaving the pile zone, resting glyphs fade over 1s and respawn at top.
  - Respawn when `y > innerHeight + 60` at random x, `y=-60`.
  - Loop via `requestAnimationFrame`; stop on `document.hidden`, resume on visible; resize debounced 150ms re-sizes canvas and clamps particles.
  - Reduced motion (`matchMedia` + listen for changes): draw one frame scatter, no loop.
  - Whole thing wrapped in try/catch; on error, hide canvas.
- [ ] Verify: open a scratch page with just the canvas; DevTools Performance 5s capture shows ~60fps, no long tasks; toggle theme rebuilds colours; tab switch pauses (log once).
- [ ] Commit `feat: drifting Adinkra canvas`.

### Task 4: Home page markup + story intro

**Files:** Rewrite `index.html`; create `js/story.js`

- [ ] Markup in order: skip link, `<canvas id="bg" aria-hidden="true">`, nav, `<main id="main" class="col">`: `<header class="intro">` with `<h1 class="name"><span class="name-script">patrick ackom</span></h1>` + `<p class="akwaaba">akwaaba 👋</p>`; `<div class="story" id="story">` with the four spec paragraphs (chips as `<span class="chip"><img src="img/logos/x.svg" alt="" width="16" height="16">Label</span>` or emoji spans; company chips link only if owner provided URLs — they didn't, so plain spans); `.hand` span for "from new recruit to team lead in under a year"; `<mark class="hl">60%</mark>`; then `<div id="after-story">` wrapping Projects, Experience; footer outside main with door. Scripts deferred: site.js, glyphs.js, adinkra.js, story.js, easter.js.
- [ ] Logos: small monochrome inline SVG files in `img/logos/` for rust, react, typescript, claude, openai, react-native(=react), and simple lettermark chips for Detosphere/Asqii/SpringKnights (a 16px rounded square with the initial, coloured `--accent`). Expense app chip: 💸 emoji linking to `/projects/expense-tracker/`. Use only logos I draw myself as simple shapes or official marks under permissive brand use for "built with" references (Rust, React, TypeScript, OpenAI, Claude) — keep them small and monochrome.
- [ ] `story.js`:
  - Exit early (leave everything visible) if reduced motion, or `sessionStorage.storyPlayed==='1'` (try/catch).
  - Set `window.__storyStarted=true`; add `html.story-playing`. CSS for `.story-playing #after-story{filter:blur(8px);opacity:.5;pointer-events:none}` and `inert` attribute set by JS.
  - Tokenise each `<p>` of `#story` into units: text words become `<span class="w">word </span>`, existing element children (chips, mark, .hand) become single units. Hide all (`visibility:hidden` via class `.u-hidden`).
  - Name: add `.draw` class → CSS animates `clip-path: inset(0 100% 0 0)` → `inset(0 0 0 0)` over 1.4s with a slight `steps`-free ease.
  - After name (1.2s), reveal units one per tick: 28ms words, 120ms pause after chips, 450ms between paragraphs. Speed multiplier 4 on Fast forward (button toggles to "Normal speed").
  - Finish(): reveal all, remove pill, remove `story-playing`, remove `inert`, set sessionStorage flag, remove scroll/key listeners.
  - Triggers for finish: Skip button, Esc/Enter keydown (not when focus is in a form), `wheel`/`touchmove` with intent (wheel deltaY > 30 cumulative), natural end.
  - Pill: `<div class="story-controls" role="group" aria-label="Intro controls">` with two buttons, fixed bottom centre, injected by JS (so no-JS users never see it).
  - Inline head safety net: `setTimeout(()=>{if(!window.__storyStarted)document.documentElement.classList.remove('story-playing')},3000)` — the class is only added by story.js anyway, so the net is: story.js adds the class only after it has fully tokenised (no half-hidden state if it throws midway; wrap in try/catch → finish()).
- [ ] Projects section: 5 `<a class="card" href="projects/<slug>/" style="--card:#hex">` with `.card-frame` (bg `var(--card)`, padding 28px 28px 0, screenshot img rounded top corners, overflow hidden, aspect-ratio 16/10 with `object-fit:cover; object-position:top`), then `.card-meta` with `<h3>`, one-liner, stack in `--faint`.
- [ ] Experience: `<ol class="jobs">` rows grid `5.5rem 1fr`.
- [ ] Footer: rule, script name small, email link + copy button + status, GitHub/LinkedIn, egg block (same ids as before: `egg`, `egg-square`, `egg-hint`, `egg-status`).
- [ ] Update `easter.js` console copy: "Hold the square in the footer" (drop "blue"), colours `#d4a24c`, font Inter. Update header comment to drop the wristwatch line.
- [ ] Run `node scripts/check-site.mjs` (project links fail until Task 5 — expected).
- [ ] Browser: intro plays; Skip/Fast forward/Esc/scroll work; reload in same tab → no intro; reduced motion (DevTools rendering emulation) → no intro; no console errors.
- [ ] Commit `feat: story-first home page`.

### Task 5: Project pages

**Files:** Create `projects/{terminal-workspace,class-tablr,store-room,quick-chat,expense-tracker}/index.html`

- [ ] Skeleton (root-relative asset paths `/css/site.css`, `/js/…`, `/img/…` so depth doesn't matter): head (theme bootstrap, fonts, own title "Name — Patrick Ackom", description, canonical `https://patrickackom.site/projects/<slug>/`, og tags), `<body data-glyph-density="0.4" style="--card:#hex">`, canvas, nav (links point to `/#projects`, `/#experience`), `<main class="col project">`: `.project-tint` (absolute radial gradient from `var(--card)` at 35% alpha via `color-mix`), header row (h1 + `<p class="when">`; actions: Visit ↗ pill, GitHub icon button with `aria-label`), hero `.card-frame` (eager image), `.prose` paragraphs, `<p class="stack">` chips, `<nav class="pager" aria-label="More projects">` prev/next. Footer without the egg.
- [ ] Content: write each body from the repo research brief (stored in the session; facts only, cite nothing on-page). Order prev/next follows home order and wraps.
- [ ] Root-relative paths mean local preview must serve from repo root: `npx serve .` (or `python -m http.server`) — note in verification.
- [ ] Run `node scripts/check-site.mjs` → PASS.
- [ ] Commit `feat: project case-study pages`.

### Task 6: Sitemap, cleanup

- [ ] Add five `<url>` entries to `sitemap.xml` with lastmod 2026-11-11; bump home lastmod.
- [ ] Delete `me.png`, `img/me-*.webp` after confirming no references (`grep -r "me-1200\|me.png" --include=*.html --include=*.css --include=*.js`; odyssey excluded from that grep must also be checked — if odyssey references them, keep them).
- [ ] `node scripts/check-site.mjs` → PASS. Commit `chore: sitemap and remove unused assets`.

### Task 7: Verification pass

- [ ] Serve locally from repo root. In Chrome: home + 5 project pages at 1440, 768, 375 (resize window); both themes; check no horizontal scroll (`document.documentElement.scrollWidth <= innerWidth` via JS).
- [ ] Easter egg: hold square → /odyssey/; type "odyssey"; Konami.
- [ ] Keyboard pass: Tab through home and one project page; focus visible everywhere; skip link works; Esc ends intro.
- [ ] Perf: 5s Performance capture on home, confirm no sustained frame drops.
- [ ] Opus adversarial review of the finished diff; fold in findings; re-run checks.
- [ ] Final commit(s).

---

## Amendments after Opus review (2026-11-11) — these override the tasks above

1. Keep `img/me-700.webp` (odyssey win screen uses it). Delete only `me.png`, `img/me-1200.webp`. Checker also scans `odyssey/`.
2. Head script adds `html.story-pending` before paint (unless reduced motion, played flag, `location.hash`, or `scrollY>0`); CSS hides bio words / blurs below-bio while pending; 3s net removes it if `window.__storyStarted` is still false.
3. Content source for project pages: `docs/superpowers/specs/2026-11-11-project-research.md`.
4. Intro is skipped when arriving with a hash; finishes on nav clicks, `hashchange`, `scroll`, `focusin` inside the blurred region, Skip, Esc. Enter/Space finish only when target isn't a button/link.
5. Hidden words use `opacity:0` (stay in the a11y tree). No `inert`. Pill is placed right after the h1. Blur covers projects, experience AND footer.
6. Name reveal animates `clip-path` to `inset(-40% -20%)`, then the property is removed.
7. Tokens: drop `--faint` (use `--muted`); light `--accent:#8a5712`, `--accent-2:#9c4422`; dark `--accent-2:#d9774f`; `<mark>` text uses `--text`. Glyph alpha capped at .45 (near) and multiplied by .35 inside the 560px column band.
8. Define `--glyph-1/2/3` per theme.
9. No hardcoded `data-theme` on `<html>`; theme-color `#1a1918`.
10. Canvas resizes only on width change or height change >120px; DPR recomputed on resize; sprites built at max layer size × DPR.
11. Chips: lettermarks for companies, Claude, OpenAI; small monochrome simple-icons (CC0) for Rust, React, TypeScript only.
12. Heap removed: when the footer is in view, glyphs fade out across the bottom 18% of the viewport.
13. Glyphs: five geometric ones only — Adinkrahene, Mate Masie, Nyame Dua, Akoma, Eban. Owner to confirm.
14. Checker parses `srcset`/`imagesrcset`.
15. Facts: SpringKnights row reads "Senior fullstack engineer, team lead"; Store Room card stack "Nuxt, Vue 2, SCSS"; Terminal Workspace credits wTerm by Dieu-Donne Nazzah.
16. Add `vercel.json` `{"trailingSlash": true}`.
17. `main.js`/`plate-gl.js` deleted in Task 4 alongside the new `index.html`.
18. Task 7 also: measure JS size; verify highlighter sweep + reduced motion.
