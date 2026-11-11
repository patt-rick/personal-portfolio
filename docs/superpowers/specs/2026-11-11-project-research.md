# Project research brief (source for /projects/* pages)

Gathered 2026-11-11 by reading the public repos under github.com/patt-rick (read only, nothing run).
Only facts below may appear on the project pages. Anything not here is left out.

## Terminal Workspace — `terminal-workspace-rust` (+ `terminal-workspace`)

- Origin: `terminal-workspace` is a fork of `ddnazzah/wTerm` (Electron, by Dieu-Donne Nazzah). Patrick's
  contributions there: Windows support fixes (merged upstream as wTerm PR #2), confirm-before-close,
  Claude Code launch options (2026-06-04).
- Rust app: first commit 2026-06-05 "Port Terminal workspace (made by ddnazah) to Rust"; latest
  2026-10-15, v0.6.0; ~252 commits, ~229 by Patrick. README: "a Tauri 2 + Rust rewrite of wTerm".
- Reason for leaving Electron: not stated anywhere. Do not invent one.
- Stack: Tauri 2, Rust (~20k lines in `src-tauri/src`), portable-pty (ConPTY), git2, axum, ring,
  keyring, windows-sys; React 19, Vite, Tailwind v4, xterm.js 6, CodeMirror 6, Zustand.
- What: desktop IDE holding many projects, each with many persistent terminals; built for agent
  CLIs (claude, aider, codex) plus normal shells.
- Features: terminals stay alive when switching; bell/"working" indicators; Claude hooks → phone
  push; browse/resume Claude Code sessions; multiple Claude accounts with a usage/cost page; LLM
  keys in the OS keychain injected as env vars; file tree, Ctrl/Cmd+P quick open, CodeMirror editor,
  git diff viewer; per-repo GitHub push identities via a `gh auth token` credential helper;
  multi-repo detection; 6 themes; phone remote-control PWA; WSL; signed auto-updates.
- Interesting:
  - Windows Job Objects (`pty/job.rs`) so closing a terminal kills its whole process tree.
  - Ships a newer ConPTY (`conpty.dll` + `OpenConsole.exe`) next to the binary (`build.rs`).
  - Remote access (`src-tauri/src/remote/`): embedded axum server over a Cloudflare quick tunnel
    or Tailscale; 6-digit pairing code (5-min expiry, locked after 5 tries) → 256-bit session token,
    memory-only, one device, explicit allowlist; Web Push with hand-rolled VAPID / RFC 8291 on `ring`;
    phone client compiled in with `include_str!`.
  - Running-command state from OSC 133 shell-integration markers.
- Images: none usable from repo (use existing `img/terminal.svg`).

## Class Tablr — `timetable`

- 8 commits, 2026-03-06 → 2026-03-07, all Patrick. Package name `class-tablr`.
- Stack: Next.js 16 (App Router), React 19, TypeScript, next-auth v5 (credentials + bcryptjs),
  Drizzle ORM on Postgres (moved from better-sqlite3; commit says Supabase), Tailwind v4,
  shadcn/Radix, sonner, @react-pdf/renderer.
- What: timetables for schools; every table scoped by `schoolId`.
- Features: classes/subjects/teachers/assignments; drag-and-drop grid (native HTML DnD); saved
  "profiles" (day start/end, period length, breaks); multi-period lessons; free periods; class
  filter; clash toast; PDF export.
- Interesting:
  - Clash check (`lib/timetable/utility.ts` `isConflicting`): for every other class that day, each
    slot the new lesson would cover is checked for the same teacher; multi-period lessons walk back
    to the start of their merged block.
  - Day grid generation: periods interleaved with breaks by period number; a tail shorter than
    10 minutes is dropped, otherwise the last period is shortened.
- Do NOT use the landing page stats/testimonials — placeholder copy.
- Live: https://class-tablr.vercel.app/

## Store Room — `store-room`

- 13 commits, 2022-02-08 → 2022-09-28, Patrick (as "Minnez").
- Stack: Nuxt 2.15, Vue 2.6, SCSS, @nuxtjs/axios, @nuxtjs/pwa. Not React.
- What: inventory/store-management interface; pages Login, Signup, Dashboard, Inventory, Restock,
  History; cards, line chart, tables, modals, add-item form. Chart data file name hints at a
  pharmacy use case.
- State: front-end prototype, no backend wired (add-item logs to console, table uses sample data,
  Restock is a stub).
- Live: https://storeroom-staging.vercel.app/

## Quick Chat — `chatPat`

- 46 commits, 2023-10-21 → 2025-04-01, in two bursts: Nov–Dec 2023 (first release 2023-12-02,
  MUI + styled-components) and 28 Mar – 1 Apr 2025 (moved to Tailwind v4 + shadcn, themes,
  landing page).
- Stack: Vite, React 18, TypeScript, react-router 6, Firebase 9 (Firestore, Auth, Storage),
  Tailwind 4, shadcn/Radix, framer-motion, react-hook-form, zod; Vercel.
- npm package: `@patt-rick/react-quickchat` — first published 2023-11-27, v0.4.9 (2025-03-30).
  Usage: `<Chat primaryColor clientDetails adminDetails={{ adminOrgName, adminOrgId }} />`.
- What: live chat a SaaS owner embeds to talk to their customers — dashboard for the owner,
  drop-in React widget for their app.
- Features: sign-up creates an organisation; client list + per-client threads; image messages;
  widget config page with install snippet; colour + light/dark themes.
- Realtime: Firestore `onSnapshot` listeners (chats by clientId ordered by timestamp; clients by
  org); images via `uploadBytesResumable`; conversations tied to the owner via `adminOrgId`.
- No real usage numbers.
- Live: https://live-quickchat.vercel.app/login (current site link)

## Expense Tracker — `personal-finance-app`

- 254 commits, 2026-01-22 → 2026-10-15 (v1.5.0), all Patrick. Android `com.patrickackom.financetracker`;
  iOS release branch exists.
- Stack: Expo 54, React Native 0.81, React 19, React Navigation, AsyncStorage, expo-secure-store,
  expo-local-authentication, expo-notifications, react-native-android-widget, Jest; custom Kotlin
  (`SmsReceiver.kt`, `NotificationListener.kt`, `AutoLogQueue.kt`) injected by an Expo config plugin.
  No backend; offline, no account.
- Features: multiple cashbooks, cash in/out, categories, budgets, debts, CSV export, reports,
  3 home-screen widgets (Balance, Budget, Quick Add), guided tour; auto-logs bank and mobile money
  SMS/notifications.
- Interesting:
  - Parser (~1,450 lines): provider templates (MTN MoMo, Telecel/Vodafone Cash, AirtelTigo, banks,
    bills) with a generic fallback; weighted confidence score; low-confidence messages go to a
    Review Queue.
  - Dedupe: same payment arrives as SMS and notification → fingerprint (sender, currency, amount +
    transaction ref, else merchant + 2-minute window); per-key promise lock; native queue holds
    events while JS isn't running.
  - Fees and levies split out of the amount into their own field; reports show "Fees & Taxes";
    fees never applied to income.
  - An adversarial parser audit found real misreads (e.g. a cashback line read as the amount) —
    fixed with regression tests; 55 test files, 23 for auto-logging.
- Play title "Expense Tracker: Budget No Ads". No install numbers.
- Link: https://play.google.com/store/apps/details?id=com.patrickackom.financetracker
