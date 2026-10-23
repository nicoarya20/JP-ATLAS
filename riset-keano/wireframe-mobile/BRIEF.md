# Brief — HTML prototype of Penpot "WIREFRAME MOBILE KEANO"

Orchestrator: session `pm-dashboard-96`. Folder: `riset-keano/wireframe-mobile/` (absolute: /Users/keano/Documents/Project/PM_Dashboard/riset-keano/wireframe-mobile).

## Goal
Clickable HTML prototype of the Penpot page **WIREFRAME MOBILE KEANO**, board **"B · Project Manager (Mobile)"**
(id 0682eb6c-f52f-8094-8008-c6c48a9668b9), plus the Member and Admin variants. Same layout, components, and flow as the Penpot screens, but:

1. **UI language = English.** Translate every label (headings, buttons, tabs, form labels, hints, notes on screen).
2. **Sample data phase (since 2026-10-14).** Fill every placeholder with the shared dataset in `data.sample.js`
   (`window.D`, Nico's Penpot sample data translated to English). Replace `UI.ph()`, `UI.num()`, blank `UI.avatar()`,
   `UI.progress()` with real values: `UI.avatar(40, 'Rina')` shows an initial, `UI.avatars(['Nico','Rina'])`,
   `UI.field('Name', { text: 'Nico Pratama' })`, `UI.progress(70)`. Never invent values that conflict with `D`; if a
   screen needs something `D` lacks, write it inline consistent with `D` (same people, projects, dates) and mention it
   in your report. Keep `UI.media()` boxes (images). **No font-size / Text size control anywhere** (drop such items).
3. Keep the UI/UX the same: element order, card types, which buttons exist, sheets vs full screens, scroll length.

## Theme (since 2026-10-15)
Colors come only from `theme.tokens.css` (ClickUp palette: Light/Dark/Auto + 10 accents, switched in the index via
`theme.switcher.js`, URL `?role=pm&mode=dark&accent=teal`). No raw hex in modules; `--dark` no longer exists.
Accent only for primary/selected/active/done states — see `THEME-BRIEF.md`.

## Typography & emoji (since 2026-10-15)
One type scale (`--fs-*`), line heights (`--lh-*`) and a 4px spacing scale (`--sp-1..6`) in `mobile.base.css`;
modules use classes (`.stack.xs/sm/lg`, `.mt-*`, `.grow`, `UI.head`, `UI.link`) — no px font-size/spacing, no
typography/spacing in `style=""`. No emoji anywhere (functional glyphs ✓ ✕ ← → › ▾ ⋯ ✦ ◆ … stay). Full contract and
rhythm rules: TYPO-BRIEF.md. Lint: `node --test typography.test.js`.

## Reading Penpot (read-only!)
- Use `mcp__penpot__export_shape` with the screen ids below to see each screen. You may use `execute_code` to read
  text/structure, but **never create, move, or delete shapes**. Keep execute_code calls small.
- Penpot's realistic data is the source of `D`; read `data.sample.js` first, Penpot only for screen-specific copy.

## Contract (do not edit shared files)
Shared files owned by the orchestrator: `index.html`, `theme.tokens.css`, `mobile.base.css`, `ui.kit.js`, `app.router.js`, `data.sample.js`, `data.sample.inbox.js`.
Read `ui.kit.js` and `mobile.base.css` first. If you need a new shared class/helper, message the orchestrator
instead of editing; small module-specific CSS can go in a `<style>` injected by your module file, prefixed
with your module (e.g. `.ev-cal-grid`).

Register screens in your own files:
```js
App.screen('projects.list', { title: '① All projects', group: 'Projects', render: () => `
  ${UI.appbar({ title: 'Projects', right: UI.btn('+ New project', 'primary', { go: 'projects.new', sm: true }) })}
  <div class="content stack">...</div>
  ${UI.tabbar('projects')}` });
App.sheet('projects.extend', { title: '⑫ Extend deadline', group: 'Projects', render: () => UI.sheet({ title: 'Extend deadline', body: '...', actions: UI.btn('Save', 'primary', { block: true, close: true, toast: 'Deadline extended' }) }) });
```
- Every screen render returns: appbar → `<div class="content ...">` (scrolls) → optional `UI.tabbar(tab)`.
- Navigation: `data-go="screen.id"`, `data-back`, `data-sheet="sheet.id"`, `data-close`, `data-toast="msg"`
  (UI helpers accept `{go, replace, sheet, back, close, toast}`; `replace` resets history, use for top-level jumps). Chips/seg/tabs switch automatically (`data-single`).
- Wire every button that leads somewhere in Penpot. Unknown targets just toast "not built yet" — fine.
- Index titles: use the Penpot number + English name, e.g. `'⑧ Detail · Overview'`.

## Roles
The index has a role switcher (Member / PM / Admin). The role lives in the URL: `index.html?role=member#tasks.my`
(default `pm`). In modules: `App.is('member')`, `App.role`; pass `roles: ['pm','admin']` to `App.screen/App.sheet`
to hide a screen from the index and block navigation to it (toast "Not available for <Role>").

## Sample data API (`data.sample.js`, `data.sample.inbox.js`)
"Today" = Wednesday, Oct 7, 2026. Signed in: Member = Dodi, PM = Nico, Admin = Ayu (`D.me()` → `{key, name, full, title, division, email, phone, role}`).
`D.people` (nico, rina, dodi, sri, ayu, lea) · `D.person(keyOrName)` · `D.projects` / `D.project(id)` · `D.atlas` (phases, milestone, activity, deadline history, extend)
· `D.story`, `D.templates` · `D.tasks` / `D.task(no)` · `D.taskDetail[no]` (12, 14, 17) · `D.quickWrite` · `D.csv`
· `D.events` / `D.event(id)` (incl. Done `kickoff`, Oct 1) · `D.kickoff` (confirmed outcomes) · `D.standup` (recording → transcript → tasks)
· `D.inbox` (PM view) + `D.inbox.member` (Dodi) · `D.team` · `D.trash` · `D.users` · `D.home` · `D.today`.
Priorities are Low / Medium / High / Critical.
Link to one specific task: pass `task: <no>` to `UI.btn`/`UI.card`/`UI.item` (→ `data-task`); the tasks module shows that task on its detail screen. Only use numbers that exist in `D.tasks`.

## Screen ids (use exactly these, also for cross-module links)
| Module (owner) | ids |
|---|---|
| Auth (orchestrator) | auth.login, auth.account, auth.pending, auth.denied |
| Home (orchestrator) | home.main, home.more, home.search |
| Projects (pm-dashboard-d2) | projects.list, projects.new, projects.form, projects.story, projects.draft, projects.template, projects.overview, projects.tasks, projects.phases, projects.members, projects.extend (sheet or screen, match Penpot) |
| Tasks (pm-dashboard-d2) | tasks.my, tasks.all, tasks.board, tasks.empty, tasks.write, tasks.form, tasks.csv, tasks.detail-todo, tasks.detail-progress, tasks.detail-review, sheet tasks.return, sheet tasks.cancel, tasks.settings |
| Events (pm-dashboard-0c) | events.list, sheet events.filter, events.calendar, events.new, events.new-details, events.empty (Member), events.detail-upcoming, events.record-ready, events.recording, events.step1, events.step2, events.step3, events.detail-confirmed, events.detail-recurring, sheet events.cancel, sheet events.delete, sheet events.cancel-recurring, sheet events.delete-recurring |
| Inbox (pm-dashboard-0c) | inbox.respond, inbox.updates, inbox.empty |
| Team (orchestrator) | team.list, team.person, team.empty (Member) |
| Users (Admin only, orchestrator) | users.approve, users.roles |
| Trash (orchestrator) | trash.list, trash.empty, trash.undo, sheet trash.delete (Admin) |
| Settings (orchestrator; from Nico's "Pengaturan", no Text size) | settings.main, settings.profile, sheet settings.leave |

Projects ② "kosong (hanya Member)" is an empty dashed placeholder in Penpot → skip it.

## Files per owner (max 500 lines / 20k chars each; split further if needed)
- Projects: `screens.projects.js` (list, new, form, story, draft, template) + `screens.projects.detail.js` (overview/tasks/phases/members/extend)
- Tasks: `screens.tasks.js` (my/all/board/empty/write/form/csv) + `screens.tasks.detail.js` (details, sheets, settings)
- Events: `screens.events.js` (list/calendar/new/empty) + `screens.events.detail.js` (details, recording, sheets) + `screens.events.outcomes.js` (step1–3)
- Inbox / Team / Users / Trash / Settings: `screens.inbox.js`, `screens.team.js`, `screens.users.js`, `screens.trash.js`, `screens.settings.js`

## Done = report back to the orchestrator (SendMessage to `pm-dashboard-96`)
Open index.html#your.screen in your head only — do NOT open a browser (user rule). Instead check syntax with
`node --check <file>` and run `node -e` smoke tests if helpful. Also run the smoke test: `node /tmp/wfm-smoke/smoke.js "$PWD"` (must print OK).
Report: files, screen ids registered, any
Penpot ambiguity, data you added inline, or shared-kit need. Do not commit or push.
