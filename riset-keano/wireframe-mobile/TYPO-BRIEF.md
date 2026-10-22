# Typography brief — tidy type & spacing, remove emoji

Orchestrator: session `pm-dashboard-ad`. Folder: /Users/keano/Documents/Project/PM_Dashboard/riset-keano/wireframe-mobile
User complaint: "typography hancur — ada yang kemepetan, ada yang kejauhan" + "emoji hapus aja".
Goal: every screen uses ONE type scale and ONE spacing scale, with consistent rhythm. No emoji. Don't change layout
order, copy meaning, data, screen ids, or colors (THEME-BRIEF.md still applies).

## Contract — `mobile.base.css` + `ui.kit.js` (orchestrator-owned; read both first)
**Type scale** (`font-size: var(--fs-…)` only — never px):
| token | px | use |
|---|---|---|
| `--fs-caption` | 11 | uppercase group label (`.label`), tab bar, badge |
| `--fs-xs` | 12 | pill, timestamp (`.xs`) |
| `--fs-sm` | 13 | meta / secondary text (`.small`), chip, small button, link (`.link`), field label |
| `--fs` | 15 | body (default) |
| `--fs-h3` | 16 | row & card titles (`.h3`) |
| `--fs-h2` | 18 | section / sheet / app-bar titles (`.h2`) |
| `--fs-title` | 26 | page title (`.title`) — all page titles the same, no 22/24 overrides |
| `--fs-num` | 28 | stat numbers (`.num`) |
| `--fs-icon` | 32 | empty-state glyph (`.icon-xl`) |
| `--fs-display` | 40 | timer (`.display`) |
**Line height**: `--lh-tight` 1.2 titles/numbers · `--lh-snug` 1.35 default/meta · `--lh-body` 1.5 paragraphs (`<p>` gets it automatically).
**Spacing** (4px grid): `--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 20 · `--sp-6` 24.

### Rhythm rules (the actual fix for "kemepetan / kejauhan")
1. **Proximity:** space inside a group < space between groups. Title→its meta 2–4px · label→its control 6–8px ·
   items in a list 12px · card header→card body 12px · card→card / block→block 16px · major sections 24px.
2. A heading sits **closer to what it introduces** than to what precedes it (`.label` = 16 above, 4 below — built in).
3. A progress bar sits right under its own label (`.stack.xs` / 4–6px), with more space before the next label.
4. Multi-line text must breathe: paragraphs are `<p>` (lh 1.5); don't put long text in `<b>`/`<span>` with snug lh.
5. Same role → same style on every screen (e.g. every "See all →" is `UI.link`, every card title is `UI.head` or `.h3`).

### Classes & helpers to use (new)
- `.stack.xs` 4 · `.stack.sm` 8 · `.stack` 12 · `.content.stack` 16 · `.stack.lg` 20
- `.mt-0 .mt-1 .mt-2 .mt-3 .mt-4 .mt-6` — instead of `style="margin…"`
- `UI.head(title, sub)` → `.sec-head` (title + one-line question; 12px to the card body; inside a `.stack` the gap rules)
- `UI.link('See all →', {go})` → `.link` (13px, bold, `--accent-ink`)
- `.small` (13) `.xs` (12) `.h3` `.h2` `.title` `.icon-xl` `.display` `.muted`
- `<p>`, `h1–h4` have margin 0 in the phone — delete `style="margin:0"`.
- `.item` padding is 12px, title→sub 2px, last `.item` in a card has no bottom border (in `.list` it keeps it).
- `UI.sheet({sub})` now renders `<p class="sub">` (no inline style).
Need another shared class? **Message the orchestrator** — don't edit shared files.

## Lint — `node --test typography.test.js` (must pass for your files)
- `font-size` only `var(--fs…)`; `line-height` only `var(--lh-…)` or `1`.
- `margin / padding / gap` (module `<style>` CSS and anywhere else) only `var(--sp-N)`, `0`, `1px`, `2px`, `6px`, `auto`
  (or `calc()` with `--sp`). Widths/heights/radii are not linted.
- `style="…"` must not carry typography or spacing (font-*, line-height, letter-spacing, margin, padding, gap).
  Custom props (`--w`, `--p`, `--s`), width/height/flex/color tokens are still OK inline — but prefer classes.
- **No emoji**: nothing matching `\p{Extended_Pictographic}` or `◷` in modules/data/index.

## Emoji removal (user decision)
Remove ⏰ ⚠ 🎤 📷 ▶ ⬆ ☑ ⛔ 🔒 👥 🗑 ◷ … Keep functional text glyphs: ✓ ✕ ← → › ▾ ▴ ⋯ ✎ ↻ ● ○ • ◆ (milestone) ✦ (AI).
- Emoji before text → just delete it (`'⏰ 2 days overdue'` → `'2 days overdue'`). Keep the meaning with text/weight.
- Emoji that is the **only** content of a control or slot (mic in an input, ▶ play, empty-state 🗑/👥, attention
  markers) → `UI.icon(size, round)` neutral placeholder (+ `aria-label`) — this is a wireframe, icons are boxes.
- `data.sample.js` is already emoji-free (orchestrator). Code that matched emoji strings (e.g. `.replace(/^⏰ /,'')`,
  `GROUPS` labels compared to data) must be updated so nothing breaks.

## Ownership
| Owner | Files |
|---|---|
| pm-dashboard-ad (orchestrator) | mobile.base.css, ui.kit.js, theme.*, data.sample*.js, index.html, app.router.js, briefs, typography.test.js, **screens.home.js, screens.auth.js** |
| pm-dashboard-c3 | screens.projects.js, screens.projects.detail.js, screens.tasks.js, screens.tasks.detail.js |
| pm-dashboard-28 | screens.events.js, screens.events.detail.js, screens.events.outcomes.js |
| subagent "typo-modules-c" | screens.inbox.js, screens.settings.js, screens.team.js, screens.users.js, screens.trash.js |

## Done =
1. `node --test typography.test.js` has **no hits in your files** (other owners' hits are not yours).
2. `node --test theme.test.js` still 14/14 and smoke OK: `node /tmp/wfm-smoke/smoke.js "$PWD"`; `node --check` your files.
3. You walked every screen you own (read the render output) and applied the rhythm rules, not just the lint.
4. No browser (user rule). Files ≤ 500 lines. Don't commit. Report: files, what changed per screen, anything you
   needed from shared files.
