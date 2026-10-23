# Theme brief — ClickUp color palette for the HTML prototype

Orchestrator: session `pm-dashboard-ad`. Folder: /Users/keano/Documents/Project/PM_Dashboard/riset-keano/wireframe-mobile
Goal: the prototype is grayscale. Apply the ClickUp "Customize › Themes" palette: Appearance **Light / Dark / Auto**
and 10 accent themes (**Black, Purple, Blue, Pink, Violet, Indigo, Orange, Teal, Bronze, Mint**). The user will use
it as a reference, so every theme must look right in both light and dark.

## Contract — `theme.tokens.css` (orchestrator-owned, read it first)
`<html data-theme="light|dark" data-accent="purple">`. Tokens:
- Neutrals: `--page --paper --bar --soft --ink --muted --line --line-strong --ph`
- Accent: `--accent` (swatch), `--accent-strong` (pressed/hover fill), `--accent-soft` (selected tint bg),
  `--accent-ink` (accent text on paper/soft), `--on-accent` (text on accent fill)
- Inverse surface (toast/snackbar): `--inverse`, `--on-inverse`; overlay: `--scrim`
- `--dark` is **removed**. Replace: filled emphasis → `var(--accent)`; text on it `#fff` → `var(--on-accent)`.
- **No raw hex / rgb / named colors** (`#fff`, `#9a9a9a`, `white`, `black`) in any module or CSS except `theme.tokens.css`.
  `var(--ink)` backgrounds with white text break in dark mode → use `--inverse` / `--on-inverse` (or accent).

## Where the accent goes (ClickUp feel — not everything)
Accent: primary CTA, active/selected state (chip on, tab underline + label → `--accent-ink`, active bottom-nav item,
checked checkbox/toggle, current day in a calendar, "done" step/number, progress fill, badges/counters, links).
Selected-but-soft (selected list row, selected option card) → `--accent-soft` bg + `--accent` border.
Stay neutral: body text, card borders, placeholders, avatars of people, outline buttons, seg control "on" (paper).
Don't change layout, copy, data, or screen ids.

## Ownership (do not edit files you don't own; ask the orchestrator via SendMessage)
| Owner | Files |
|---|---|
| pm-dashboard-ad (orchestrator) | theme.tokens.css, mobile.base.css, ui.kit.js, app.router.js, index.html, BRIEF.md, THEME-BRIEF.md |
| pm-dashboard-28 | theme.switcher.js, theme.switcher.css, theme.test.js, /tmp/wfm-smoke/smoke.js (stub update) |
| pm-dashboard-c3 | screens.auth.js, screens.home.js, screens.projects.js, screens.projects.detail.js, screens.tasks.js, screens.tasks.detail.js |
| subagent "theme-modules-b" | screens.events.js, screens.events.detail.js, screens.events.outcomes.js, screens.inbox.js, screens.team.js, screens.users.js, screens.trash.js, screens.settings.js |

## Switcher spec (pm-dashboard-28)
- `theme.switcher.js` loads in `<head>` right after the CSS links, **before** ui.kit.js; it must set
  `document.documentElement.dataset.theme/accent` synchronously (no flash). Exposes `window.Theme`:
  `{ ACCENTS: [[key,label],...] (order above), MODES: [['light','Light'],['dark','Dark'],['auto','Auto']], mode, accent, set({mode, accent}) }`.
- Defaults: mode `light`, accent `purple`. State lives in the URL query next to `role`:
  `index.html?role=pm&mode=dark&accent=teal#home.main`. Invalid values fall back to defaults.
  `auto` resolves via `matchMedia('(prefers-color-scheme: dark)')` and follows changes live.
  The router (orchestrator) will preserve unknown query params on every navigation; `set()` must update the URL with
  `history.replaceState` keeping `role` and the hash.
- UI: on DOMContentLoaded render into `<div class="theme-switch"></div>` inside `.index` (orchestrator adds it,
  below `.role-switch`), mirroring ClickUp's modal: "Appearance" with 3 mini preview tiles (Light/Dark/Auto), then
  "Theme" as a 2-column grid of buttons, each a swatch square + name; the current one gets accent border, soft bg and a
  ✓ in the swatch. Swatches use `<i data-accent="pink">` with `background: var(--accent)` (palette single source = CSS).
  Use your own click listener; do not use `data-role`/`data-go` attributes. Styles in `theme.switcher.css`, class prefix `.ts-`.
- Panel is collapsible: header button `.ts-head` (`data-ts-toggle`, "Customize · <Mode> · <Theme>") hides `.ts-body`.
  Open/closed is remembered in localStorage `wfm.themeSwitch.open` (falls back to open if storage is blocked). (2026-10-15)
- Never declare `--accent` in a plain `:root` block — it ties with `[data-accent="x"]` on specificity and wins by order,
  pinning `<html>` to Purple. Fallback lives in `:root:not([data-accent])`. Guarded by a test. (2026-10-15)
- Guard for the node smoke stub: no crash when `matchMedia`/`documentElement` are missing — but also update
  `/tmp/wfm-smoke/smoke.js` stub with `document.documentElement = {dataset:{}}` and `matchMedia`.
- `theme.test.js` (run: `node --test theme.test.js`): real assertions — every `Theme.ACCENTS` key has a
  `[data-accent="key"]` rule with a hex in theme.tokens.css; URL parsing defaults/fallbacks; `set()` writes
  attributes + URL keeping role/hash; auto resolves from matchMedia; and a lint that no `*.js`/`*.css` except
  theme.tokens.css contains raw hex colors or `var(--dark)` (this lint is expected to fail until everyone is done).

## Done
`node --check` each file, `node /tmp/wfm-smoke/smoke.js "$PWD"` → OK. Never open a browser (user rule). No commit/push.
Report to `pm-dashboard-ad` via SendMessage: files touched, which elements got accent, anything you need in the shared kit.
