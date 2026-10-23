# Brief — Penpot mobile role "C · Admin"

Orchestrator: session `pm-dashboard-13`. Workers: `pm-dashboard-df`, `pm-dashboard-f2`.
Penpot file, page **WIREFRAME MOBILE KEANO** (already the active page). Scope = WIREFRAME ONLY. The ERD ("ERD · Mobile") is done: do not touch it.

## Goal
Turn the board **"C · Admin (Mobile)"** (id `b2d90990-b031-80ca-8008-c810f72ca36a`, at 11600,3000, 5400×22200) into the
mobile Admin role, following Nico's desktop section **"C · Admin — Wireframe"** on page WIREFRAME NICO.
The orchestrator already cloned the 5 modules of "B · Project Manager (Mobile)" into it, so most screens exist:
you only change what differs for Admin, and add the Admin-only screens/modules.

| Module board in C (name) | id | rel x,y |
|---|---|---|
| Admin · Login & Registrasi | b2d90990-b031-80ca-8008-c810fac7b1af | 100,220 |
| Admin · Beranda | b2d90990-b031-80ca-8008-c810ffe2222f | 100,3140 |
| Admin · Proyek | b2d90990-b031-80ca-8008-c811000ff1ec | 100,6440 |
| Admin · Tugas | b2d90990-b031-80ca-8008-c8110298dbe2 | 100,10120 |
| Admin · Events | b2d90990-b031-80ca-8008-c811031a329d | 100,13820 |
| Admin · Inbox (NEW, to create) | — | 100,17620 (w 5000) |
| Admin · Tim (NEW, to create) | — | 100,20020 (w 5000) |

## Nico source (read without switching pages!)
```js
const nico = penpot.currentFile.pages.find(p => p.name === 'WIREFRAME NICO');
const A = nico.root.children.find(c => c.name.startsWith('C · Admin'));      // Admin section
const PM = nico.root.children.find(c => c.name.startsWith('B · Project Manager')); // diff against this
```
Admin boards in A: "Admin · Login & Registrasi", "Beranda · Admin", "① Persetujuan user", "② Kelola peran",
"Admin · Proyek", "Admin · Tugas", "Admin · Events", "Admin · Inbox", "Admin · Tim".
Tip: diff the text of an Admin board vs the matching "Project Manager · …" board to find what changes.

## Assignment
| Who | Modules |
|---|---|
| **pm-dashboard-df** | **02 Home & More**: ① Home → Admin home (Nico "Beranda · Admin"); ② More gets a **Users** item (badge "2"); add **④ Approve users** and **⑤ Manage roles** screens (Nico ① Persetujuan user, ② Kelola peran) with flow arrows Home/More → ④ ↔ ⑤ and a note. Grow the module board if needed.  **03 Projects**: Admin sees and edits ALL projects (no read-only state, Extend deadline / phases / members always visible); empty state note = "Admin always sees all projects…"; update notes and the permission matrix. |
| **pm-dashboard-f2** | **06 Inbox** (NEW: ① Needs your response (default), ② Latest updates, ③ Empty) and **07 Team** (NEW: ① List (default), ② Person detail) — Admin versions from Nico, incl. the "2 new users awaiting approval → Open Users" card. Build with the same mobile chrome as existing screens (clone a screen from C's own modules for status bar, app bar, bottom tab bar with More active), module label/heading/subtitle/notes styled like the other modules. **05 Events**: Admin sees/edits/confirms all events, incl. ones without a project they don't attend; "Delete" → "Discard" where Nico uses "Buang"; update the context line, notes and permission matrix. |
| **pm-dashboard-13** (orchestrator) | 01 Login (Nico → Ayu, PM → Admin home), 04 Tasks, final QA + overview check. |

## Rules
1. **Only edit inside your own module boards** (by id). Never touch board B, the ERD, other modules, or the C board itself
   (exception: f2 creates the two new module boards as children of C). Remove shapes only by id, never by name page-wide.
2. **Never call `penpot.openPage`** — all sessions share the active page; read Nico via `currentFile.pages` as above.
3. Keep `execute_code` calls small (Penpot freezes on big calls). Check visually with `export_shape`.
4. **All canvas text in English**, same terms as board B: Home / Tasks / Projects / Events / More; Manager / Member / Viewer;
   To do / In progress / In review / Done / Canceled. Sample data stays Nico-style, translated (Project Atlas, PT Sinar Client
   Portal…); the logged-in user is **Ayu (Admin)**. Layer names may stay as cloned.
5. **No font-size option anywhere** (user decision 2026-10-13) — no Aa chip, no text-size setting.
6. Screens 375×812 (long scroll screens may be taller), screen x inside a module: 120 / 760 / 1400 / 2040 / 2680 / 3320,
   panels (permission matrix, flow) at x=4000 w900. Number screens ①②③… with an English title label above each screen.
7. No browser, no git commit/push.

## Done = SendMessage to `pm-dashboard-13`
Report: module(s) finished, new screen names, anything from Nico you skipped or could not fit, any open question.
