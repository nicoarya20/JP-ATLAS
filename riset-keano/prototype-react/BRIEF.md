# Worker brief: React + Cupertino prototype

Orchestrator: session `pm-dashboard-7b`. Report to it with SendMessage when you are done or blocked.

## Goal
Port your modules from the vanilla prototype (`riset-keano/wireframe-mobile/screens.<module>*.js`) to React 18 + react-cupertino-ui in this folder.
Use the same screen ids, titles, index groups, roles, flows and sample data. Do not invent features.
The iOS Cupertino look (components, card and field shapes, spacing, radii) comes from the library and the kit. Only the
colours and the typography (Manrope, type scale, weights) come from the JP Atlas design system (`src/styles/atlas.css`,
copied from `JP-Atlas-Design-System-2026-10-21/`), because the PM Dashboard joins the JP Atlas ERP as one product.
The ClickUp theme is gone.

## Ownership
| Owner | Files |
|---|---|
| orchestrator | `src/core/`, `src/kit/`, `src/styles/`, `src/data/`, `src/index/`, `src/screens/index.js`, `src/test/`, `package.json`, `vite.config.js`, html files |
| pm-dashboard-65 | `src/screens/projects/`, `src/screens/tasks/` |
| pm-dashboard-f9 | `src/screens/events/`, `src/screens/inbox/` |

- Only edit files inside your own module folders.
- If you need a kit part, a sample-data field or a core change, ask the orchestrator. Do not edit shared files.
- Data used by only one module may live in your module folder (`<module>.data.js`).
- Module CSS goes in `<module>.css`, imported from your `index.js`. Prefix every class with the module (`pj-`, `tk-`, `ev-`, `ib-`).

## API
Registration happens in your module `index.js`, following `src/screens/home/index.js`:

```js
import { panel, screen, sheet } from '../../core/registry';
screen('tasks.my', { title: '① My tasks', group: 'Tasks', Component: TasksMy });
screen('users.roles', { ..., roles: ['admin'] });  // omit roles = every role
screen('tasks.write', { ..., modal: true });  // modal = a create/edit flow: slides up over the screen it opened from, a down chevron instead of the left one
sheet('tasks.return', { title: '…', group: 'Tasks', snap: 0.5, Component: ReturnSheet }); // snap = share of phone height, default 0.6
sheet('profile.me', { title: '…', group: 'Profile', full: true, Component: ProfileMain }); // full = full-height overlay (kit FullSheet)
panel('more', { Component: MoreMenu });  // what a tab unfolds from the tab bar instead of a screen; gets {close}
```

- Component props: `{ params }`.
  - `params.task` is the `D.tasks` number passed by a `task` nav prop.
  - Use the old file's default when `params.task` is missing.
- `useApp()` (from `core/app.context`) returns `{ role, is('pm', 'admin'), params, go(id, {replace, params}), back(), openSheet(id, params), closeSheet(), toast(msg) }`.
- Data: `import { D } from '../../data/sample'`. `D.me()` is the signed-in person for the current role.

Kit (`import { ... } from '../../kit'`):
- `Screen`: props `title`, `sub`, `back`, `left`, `right`, `large`, `header`, `tab`. On a screen registered with `modal: true`, `back` shows a down chevron (accessible name "Cancel") instead of the left one, and every `back()` from it (that Cancel, a footer `<Btn back>`, a Save that calls `back()`) slides the screen down before the pop. The screen under it stays drawn, inert and dimmed. Only the first page of a flow is modal; later steps are plain pushed pages with the chevron. `header={false}` hides the nav bar; `header={<el/>}` replaces it. `tab` is one of `home`, `tasks`, `projects`, `events` and shows the bottom tab bar (a floating glass pill whose bubble slides and bounces to a tapped tab and follows a dragging finger, see `kit/tabbar.jsx`; PhoneApp draws this one bar so it stays mounted across screens, plus a round "+" that opens the tab's own "new" screen, or the `home.create` sheet on Home). The More tab is not a screen: it unfolds the pill upward into the More panel (`home/home.more.jsx`) over a dimmed screen; More again, the dim, Escape, another tab or a pick folds it. Its profile card opens the `profile.me` overlay.
- `StackedScreen`: the frame of the four tab roots (Home, Tasks, Projects, Events). Props `title`, `aside`, `find`, `onFind`, `pinned`, `tab`. A header on surface (title left; on the right a search icon, then `aside`), the `find` search block under it, and the content as a rounded canvas sheet. Scrolling the sheet up fades the block into the header icon and snaps a half-folded block open or shut. `onFind` is the icon's action; by default it scrolls back and focuses the block's field (Home opens `home.search` instead). `pinned` is an optional first row that sticks under the header together with the sheet's rounded top edge. Scrolled past the search block, it compacts with the scroll: the row styles its compact form from `--stk-q` (0 = tall, 1 = compact), and every height it changes must move linearly with `--stk-q`. Home's stat chips fold to one line this way. See `kit/stacked.jsx`.
- `Section` is a card. Its props are `title`, `sub`, `right`, plus nav props, which make the whole card tappable.
- `Rows` and `Row` make an iOS grouped list. Row props: `lead`, `title`, `sub`, `right`, `chev`.
- `Btn`: `kind` is `primary`, `outline`, `ghost`, `danger`, `danger-ghost` or `plain`. `danger-ghost` is a destructive text button in a row of equal items (Delete forever, Deactivate). Other props: `block`, `sm`, `icon`.
- `Link` is a "See all" text button.
- `Chips`, `Seg` and `Tabs` take `items`, `on` and `gos`.
- `Field`: props `label`, `value`, `placeholder`, `area`, `disabled`, `icon`.
- Small display parts:
  - `Avatar` (props `name`, `size`) and `Avatars` (prop `names`).
  - `Pill`: `tone` is `neutral`, `accent`, `info`, `success`, `warning`, `danger` or `outline`. For a status word use
    `StatusPill status={x}` instead: its tone comes from the one map in `kit/status.js`, so a status looks the same everywhere.
  - `Progress`: props `value`, `label`, `showValue`.
  - `Media`: props `label`, `size`.
  - `Empty`: props `icon`, `title`, `text`, `action`.
  - `Head`: a section heading.
- `Sheet`: props `title`, `sub`, `actions`. Use it as the root of every sheet component.
- `FullSheet`: the full-height overlay PhoneApp draws for sheets registered with `full: true`; you do not render it yourself.
  Add `fit: true` to size it to its content instead (still capped at full height), as `home.create` does.
  - It slides up below the status bar and closes with the X in its top-left corner, Escape, a tap on the dim, or a swipe down
    (past a quarter of its height, or a quick flick).
  - The swipe starts on the grabber bar and on any element the content marks with `data-sheet-drag`.
  - Escape inside an element marked `data-own-escape` (an inline editor) stays there instead of closing the overlay.
- Form parts:
  - `Select`: a dropdown-looking pill. Props `block` (full width) plus nav props; usually `toast="Option A · Option B"`. Replaces the old `PJ.select` / `▾` labels (drop the `▾`).
  - `Search`: iOS search field, prop `placeholder`. Replaces the old `<label class="input"><input placeholder=…>` search boxes.
  - `Switch`: props `on` (initial state), `label` (accessible name), `onChange(checked)` (optional, for state kept outside the switch).
  - `Label`: small uppercase group label.
  - `Snack`: snackbar above the tab bar. Props `action` (button text) plus nav props for that action.

Nav props work on `Btn`, `Link`, `Section` and `Row`:
- `go="id"`, `sheet="id"`, `back`, `close`, `toast="text"`, `replace`, `task={12}`, `params={{...}}`.
- The old `data-go` attribute becomes `go`, `data-sheet` becomes `sheet`, and `data-task` becomes `task`.
- A button inside a tappable row only fires its own action.

Other react-cupertino-ui components are allowed: `@react-cupertino-ui/<name>`, see `package.json`. Two limits:
- Card subcomponents (`CardHeader` and the rest) use Tailwind, which this project does not have. Use `Section`.
- Icons come from `lucide-react`.

## Style rules (tests enforce the first three)
- English UI text. No emoji anywhere. Circled index numbers like ① are fine.
- No inline `style` for typography or colour. Use the classes in `src/styles/app.css`:
  - `t-title2`, `t-headline`, `t-subhead`, `t-footnote`, `t-caption`, `muted`, `tint`, `danger`, `success`, `bold`.
  - Layout: `stack`, `row-flex`, `between`, `wrap`, `hscroll`.
- Colours come from the app roles in `tokens.css` (`--accent`, `--label`, `--surface`, `--success`/`--success-bg` …) in module CSS.
  No raw hex in JSX. Screens never read `--atlas-*` directly.
  - Lime (`--primary-fill`) is the one main action per view, with `--on-primary` as its label. Never text, never a status.
    A view with several equal actions (a list of cards) has no lime: they are all `outline`. `test/atlas.rules.test.jsx`
    fails when a rendered screen or sheet shows more than one lime button or a status pill outside its pair.
  - Violet (`--accent`) is interaction: links, selected, active, progress.
  - A status is a pair plus its text: `--success` on `--success-bg`, never a tint of the text colour.
  - `--separator` is decorative. Focus rings use `--focus`; `src/styles/focus.css` (loaded last) draws one ring for every control.
  - Destructive buttons and unread counts: `--danger` fill with `--on-accent` as the label. Placeholders: `--label-2`.
  - `Radio` and `Checkbox` always take `variant="solid"`; only that variant is themed. `test/a11y.controls.test.jsx` checks it.
  - `--color-*` (iOS hues) only for category tiles and calendar categories, until Atlas has a category palette.
- Library parts are themed in `src/styles/library.css` (loaded last), so light and dark both work. Restyle a kit part there, mapped to tokens from `tokens.css`; never a raw colour.
- Files stay under 300 lines. Split a module into `<module>.<part>.jsx` files.

## Done means
1. `npm test` and `npm run build` both pass.
   - The smoke test renders every registered screen for every allowed role.
   - Ids must come from `src/test/screens.ids.js`.
2. Every id of your modules is registered, with the same roles as in the old prototype.
3. You report to `pm-dashboard-7b`: files, ids, anything skipped or changed, and kit or data requests.

Do not open a browser or Playwright. Do not commit or push. Do not run `npm install`; ask the orchestrator for new packages.
