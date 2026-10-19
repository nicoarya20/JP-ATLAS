# Brief — Penpot mobile role "A · Member"

Orchestrator: session `pm-dashboard-13`. Workers: `pm-dashboard-df`, `pm-dashboard-f2`.
Penpot file, page **WIREFRAME MOBILE KEANO** (already the active page). Scope = WIREFRAME ONLY. The ERD ("ERD · Mobile") is done: do not touch it.

## Goal
Turn the board **"A · Member (Mobile)"** (id `b2d90990-b031-80ca-8008-c82e3fd05654`, at 0,3000, 5400×22200) into the
mobile Member role, following Nico's desktop section **"A · Member — Wireframe"** on page WIREFRAME NICO.
The orchestrator cloned the 5 modules of "B · Project Manager (Mobile)" into it; Inbox and Team are cloned later from the
finished PM versions. You only change what differs for Member.

| Module board in A (name) | id | rel x,y |
|---|---|---|
| Member · Login & Registrasi | b2d90990-b031-80ca-8008-c82e3fd05657 | 100,220 |
| Member · Beranda | b2d90990-b031-80ca-8008-c82e3fd05658 | 100,3140 |
| Member · Proyek | b2d90990-b031-80ca-8008-c82e3fd05659 | 100,6440 |
| Member · Tugas | b2d90990-b031-80ca-8008-c82e3fd0565a | 100,10120 |
| Member · Events | b2d90990-b031-80ca-8008-c82e3fd0565b | 100,13820 |
| Member · Inbox (cloned later from PM) | — | 100,17620 |
| Member · Tim (cloned later from PM) | — | 100,20020 |

## Nico source (read without switching pages!)
```js
const nico = penpot.currentFile.pages.find(p => p.name === 'WIREFRAME NICO');
const M  = nico.root.children.find(c => c.name.startsWith('A · Member'));          // Member section
const PM = nico.root.children.find(c => c.name.startsWith('B · Project Manager')); // diff against this
```
Member boards: "Member · Login & Registrasi", "Beranda · Member", "Member · Proyek", "Member · Tugas", "Member · Events",
"Member · Inbox", "Member · Tim". Diff each screen's text vs the PM board with the same number prefix (①, ②…).

## What differs for Member (summary from Nico; Nico wins if unsure)
- Logged-in user = **Dodi (Member)**, Member of Project Atlas. Nico is the Manager/Lead who reviews Dodi's work.
- **Projects:** sees only projects they joined ("1–3 of 3 projects · only projects you joined"); **no "+ New project"**.
  ② Empty state is real for Member ("You haven't joined any project yet. Ask an admin or project manager to add you." — no + New project).
  ③–⑦ (new project flow) and ⑫ (Extend deadline) = "Not available for Member" placeholder screens (keep number+title, gray
  dashed card with the reason, like Nico). ⑧–⑪ detail read-only for project management: no Extend deadline, no + Phase /
  + Milestone / Start/Complete phase, no + Member / Remove / role ▾. ⑨ task rows: only Dodi's tasks have actions, others "View".
  Update notes and permission matrix (Member column).
- **Tasks:** see Nico (orchestrator does this module).
- **Events:** can create events only in projects where they are Member/Manager; edit/cancel/delete only own events;
  confirm meeting results only for own events ("View results" instead of "Review results"); ④ detail has no Edit/⋯ for
  someone else's event + note "Only the creator (Rina), the project manager, or an Admin can edit this event."; ⑥ read-only
  ("Waiting for Nico to confirm" · "You can only read these meeting results."); ⑧ Cancel/Delete modal → not available for
  this event (or drop it like Nico); **⑨ Empty state (no events yet)** is new. Update matrix + notes.
- **Inbox / Team:** follow Nico's Member boards (Team has a new ③ Empty state "No team yet").
- More screen: Dodi, dodi@email.com · Member; Inbox, Team, Trash, Settings (no Users).

## Assignment
| Who | Modules |
|---|---|
| **pm-dashboard-df** | **02 Home & More** (Nico "Beranda · Member") and **03 Projects**. Later: **06 Inbox**. |
| **pm-dashboard-f2** | **05 Events**. Later: **07 Team** (incl. new ③ Empty state). |
| **pm-dashboard-13** (orchestrator) | 01 Login (→ Dodi, Member home), 04 Tasks, cloning Inbox/Team from PM, final QA. |

## Rules
1. **Only edit inside your own module boards** (by id). Never touch boards B/C, the ERD, other modules, or the A board itself.
   Remove shapes only by id, never by name page-wide.
2. **Never call `penpot.openPage`** — all sessions share the active page; read Nico via `currentFile.pages` as above.
3. Keep `execute_code` calls small (Penpot freezes on big calls). Check visually with `export_shape`.
4. **All canvas text in English**, same terms as board B: Home / Tasks / Projects / Events / More; Manager / Member / Viewer;
   To do / In progress / In review / Done / Canceled. Sample data stays Nico-style, translated. Layer names may stay as cloned.
5. **No font-size option anywhere.** No bell icon: the Inbox count is a badge on More › Inbox.
6. Screens 375×812 (long scroll screens may be taller), screen x inside a module: 120 / 760 / 1400 / 2040 / 2680 / 3320,
   panels (permission matrix, flow) at x=4000 w900. Number screens ①②③… with an English title label above each screen.
7. No browser, no git commit/push.

## Done = SendMessage to `pm-dashboard-13`
Report: module(s) finished, new/changed screens, anything from Nico you skipped or could not fit, any open question.

## Update — Inbox & Team cloned into A (2026-10-13)
| Module board in A | id | rel x,y | Owner |
|---|---|---|---|
| Member · Inbox (clone of finished PM Inbox) | b2d90990-b031-80ca-8008-c8310662a3df | 100,17620 | pm-dashboard-df (after Home & Projects) |
| Member · Tim (clone of finished PM Team) | b2d90990-b031-80ca-8008-c8311ad98e27 | 100,20020 | pm-dashboard-f2 (after Events) |
Nico source: Member section boards "Member · Inbox" / "Member · Tim" (diff vs the PM versions). Team gets a new ③ Empty ("No team yet").
