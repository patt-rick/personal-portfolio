# Story-site redesign (inspired by antwi.dev)

Date: 2026-11-11
Status: draft, awaiting owner review

## Goal

Replace the current wide "poster" homepage with a quiet, narrow, story-first site in the spirit of
https://antwi.dev, with its own signature (drifting Adinkra symbols instead of flowers), and give
every project its own case-study page.

Not a copy: no flowers, no Jermaine's copy, layout or assets. We borrow the *ideas* — single narrow
column, handwritten name, typed-out story bio with inline logo chips, colour-backed project cards,
per-project pages, minimal footer.

## Decisions (owner-approved or defaulted — overrule here)

| Decision | Choice |
|---|---|
| Scope | Full rebuild of the homepage; `/odyssey/` and the door easter egg kept |
| Signature effect | Adinkra symbols drifting on a canvas, gathering at the footer |
| Bio source | Owner's beats: debugged software since a kid, started coding at uni, new recruit → team lead in under a year |
| Projects | The current five only: Terminal Workspace, Class Tablr, Store Room, Quick Chat, Expense Tracker |
| Project page content | Sourced from the GitHub repos (patt-rick/*). No invented facts or numbers. |
| Portrait | **Default: dropped** (matches the restraint of the reference) |
| Experience | **Default: kept** as a short 3-row list below projects |
| Stack | Stay static HTML/CSS/vanilla JS, no build step. GSAP, Lenis and `plate-gl.js` removed. |

## Site map

```
/                                 home
/projects/terminal-workspace/     case study
/projects/class-tablr/
/projects/store-room/
/projects/quick-chat/
/projects/expense-tracker/
/odyssey/                         unchanged
```

No `/projects/` index page — five cards fit on the home page.

## Files

```
index.html                 home (rewritten)
projects/<slug>/index.html one per project, same skeleton
css/site.css               rewritten: tokens, column, nav, chips, cards, footer, egg
js/adinkra.js              the background canvas (shared, takes a density option)
js/glyphs.js               Adinkra SVG path data (shared)
js/story.js                home only: name draw-on + typed bio + fast-forward/skip
js/site.js                 shared: theme toggle, nav blur on scroll, copy-email
js/easter.js               kept; loaded on home only; watch-hotspot code stays guarded
img/                       existing screenshots reused; new ones from repos where useful
```

Removed: `js/main.js`, `js/plate-gl.js`, `me.png`, `img/me-*.webp` (kept in git history).
Each project page is a hand-written copy of one skeleton; shared look lives in `site.css`.

## Home page, top to bottom

Column: max-width 520px, centred, 16px side gutter on phones. Background near-black `#1a1918`
with an SVG-noise grain overlay; light theme cream `#f4efe6` with ink-brown text.

1. **Nav** — sticky. Left: a small mark (an Adinkra glyph, Nyame Dua or Sankofa, monochrome).
   Right: Projects, Experience, GitHub, theme toggle (moon/sun icon, `aria-pressed`). Gains a
   blurred backdrop once scrolled.
2. **Name** — "patrick ackom" in a Google script font (pick between *Mrs Saint Delafield* and
   *Homemade Apple* during build; must read clearly at ~44px). Draw-on reveal via an animated
   clip/mask left→right (~1.4s). Under it: "akwaaba 👋" in muted text. The `<h1>` holds the real
   text for screen readers.
3. **Story bio** — Inter 15px / 1.65, muted body colour, key nouns brighter. Four short paragraphs,
   working draft:

   > I've been the one fixing everyone's broken software for as long as I can remember — the
   > family computer, a friend's phone, whatever had stopped working. Writing code only came later,
   > at uni, and it turned out to be the same itch from the other side.
   >
   > My first job was at [Detosphere], where I cut page load times by 60%. At [Asqii] I built
   > products from scratch for education and finance clients. Then I joined [SpringKnights] and went
   > *from new recruit to team lead in under a year*.
   >
   > These days it's web, mobile and AI work for clients — [React], [TypeScript], [React Native],
   > the [Claude] and [OpenAI] APIs. On the side I'm writing a terminal in [Rust], and I built an
   > [expense app] that reads MoMo alerts so you know where every cedi goes.
   >
   > Here's some of what I've made.

   `[X]` = inline chip: 16px logo/emoji + label, subtle underline, links where meaningful
   (companies → their sites if the owner wants, tech → nothing or docs, expense app → its page).
   The italic phrase uses Caveat in the accent colour. One phrase ("60%") gets a highlighter mark
   (a skewed gold background that sweeps in).

   **Typing behaviour:** on first visit, paragraphs reveal word-by-word (~28ms/word), chips pop in
   as whole units. A pill at the bottom of the viewport offers "Fast forward" (×4 speed) and "Skip".
   Everything below the bio is blurred and non-interactive (`inert`) until the story finishes or is
   skipped. Rules:
   - The full text is in the HTML from the start; JS hides then reveals it. No JS → full page.
   - `prefers-reduced-motion` → no typing, no blur, everything shown immediately.
   - Played-once flag in `sessionStorage` (wrapped in try/catch) → return visits within the session
     skip straight to the finished state.
   - Any scroll, keypress (Esc/Enter/Space) or the Skip button finishes it instantly.
   - Safety net: if the story hasn't started 3s after load, show the page as is.
4. **Projects** — heading "Projects". Five cards, full column width, `border-radius: 10px`, each a
   link to its project page. Card = coloured backdrop with the screenshot inset (rounded, slight
   shadow), then below it name + one-line description + stack in muted text. Hover: screenshot
   lifts 4px, backdrop saturates slightly. Card colours:
   - Terminal Workspace `#1f6f4a` (deep green)
   - Class Tablr `#4f46e5` (indigo)
   - Store Room `#d97706` (amber)
   - Quick Chat `#0f766e` (teal)
   - Expense Tracker `#c2410c` (terracotta)
   Final hexes tuned during build for contrast with each screenshot.
5. **Experience** — heading "Experience". Three rows: years (muted, tabular) | role, company. One
   line of description each, from the current site.
6. **Footer** — hairline rule, the name in the script font (small, muted), email
   (patrickackom003@gmail.com) with "Copy" button and live status, GitHub + LinkedIn links, and the
   door (see Easter egg).

## Project page template

Same nav, same column, same background (glyph density ~40% of home). No typing intro.

1. Top tint: a 420px-tall radial gradient in the project's card colour fading into the background.
2. Header row: project name (Inter 28px, 600) + date line (e.g. "2025 – now", from first/last
   commit) on the left; on the right a "Visit ↗" pill (live URL / Play Store) and a GitHub icon
   button.
3. Hero: the colour card with the screenshot, same as the home card.
4. Body: 3–4 paragraphs, written from the repo research —
   what it is and who it's for → what I built → the hard part / interesting decision → where it
   stands. Inline chips allowed. Optional second image with caption if the repo has a good one.
5. A small "Stack" line (chips).
6. Prev / next project links, then the shared footer (without the door).

Each page: own `<title>`, meta description, canonical, OG tags; added to `sitemap.xml`.

**Content rule:** every factual claim must trace to the repo, the live app, the current site, or
the owner. Where the repo can't answer something worth saying, leave it out rather than guess.
Store Room's stack is stated as the code shows (the repo is Vue, not React as the current site
claims) unless the owner says otherwise.

## Adinkra signature (`adinkra.js` + `glyphs.js`)

- **Glyphs:** ~10 simplified, single-colour SVG paths drawn for this site: Adinkrahene, Dwennimmen,
  Nyame Dua, Mate Masie, Nkyinkyim, Fawohodie, Sankofa (heart form), Gye Nyame (simplified),
  Akoma, Funtunfunefu. Converted to `Path2D` once.
- **Canvas:** one fixed full-viewport `<canvas aria-hidden="true">` behind the content, DPR-aware
  (capped at 2).
- **Motion:** glyphs fall slowly with sinusoidal sway and gentle rotation. Three depth layers:
  far (small, dim, blurred), mid, near (larger, crisp). Blur is pre-rendered per glyph per layer
  into offscreen sprites (no per-frame `ctx.filter`).
- **Light:** a warm diagonal light shaft (static gradient) plus a faint vignette.
- **Cursor:** glyphs in the near layer drift away from the pointer within ~120px.
- **Gathering:** as the page nears its bottom, glyphs that reach the footer zone settle into a
  low heap (stop and stack loosely along the bottom edge, capped count, oldest fade out).
- **Palette:** dark theme gold `#d4a24c`, terracotta `#c8643b`, cream `#efe3c8` at 0.35–0.9
  alpha; light theme ink-brown/terracotta at lower alpha. Re-read from CSS variables on theme change.
- **Budget:** ~45 glyphs desktop, ~20 under 640px; project pages × 0.4.
- **Pause:** stops on `visibilitychange` hidden and when the canvas is off-screen (it never is,
  but stop RAF when the tab is hidden).
- **Reduced motion:** draws one static scatter, no animation loop.
- **Failure:** if canvas is unsupported or throws, the page is unaffected.

## Easter egg

`easter.js` stays as is functionally (hold the square, type "odyssey", or the Konami code →
`/odyssey/`). Changes:
- The square in the footer is restyled to fit the new palette (gold outline in dark, ink in light)
  and its hint text kept.
- The portrait watch hotspot no longer exists; the code is already guarded by `if (watch ...)`.
- The console message says "blue square" — update to match the new colour.
- Loaded on the home page only (its `DEST` is a relative path).

## Accessibility

- Skip link kept. Real text in the DOM for name and bio; animation is presentation only.
- Chips are plain inline text + decorative `alt=""` icons.
- Colour contrast ≥ 4.5:1 for body text in both themes (muted text checked too).
- Focus rings visible on nav, chips, cards, buttons. Theme toggle has `aria-pressed`.
- Typing pill buttons are real `<button>`s, reachable by keyboard; Esc skips.

## Performance

- Fonts: Inter, Caveat and the script font from Google Fonts, `display=swap`, only needed weights.
- Screenshots: existing webp, `loading="lazy"` below the fold, explicit width/height.
- No third-party JS. Total JS target < 20 KB unminified excluding glyph data.

## Verification

- Load home and all five project pages in Chrome: no console errors, all links resolve.
- Widths 375 / 768 / 1440: no horizontal scroll, column and cards correct.
- Typing intro: plays, fast-forward, skip, Esc, scroll-to-skip, reduced-motion, return-visit skip.
- Canvas: smooth (DevTools perf ~60fps on desktop), pauses when tab hidden, both themes.
- Easter egg: hold-square, typed "odyssey", Konami all reach `/odyssey/`.
- Keyboard-only pass through the home page and a project page.
- Opus subagent adversarial review of the plan before building and of the result before handoff.

## Out of scope

Writing/blog section, research page, agent/markdown mode, `/projects` index, CMS or build tooling,
new projects beyond the current five.
