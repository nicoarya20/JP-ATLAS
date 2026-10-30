# Rencana: Buat Proyek dari Cerita (story) & Template

Status: **rencana, belum diimplementasi**. Dokumen ini melengkapi `ProjectCreateChooser`
(`app/components/projects/ProjectCreateChooser.tsx`) yang sudah menyediakan tiga kartu cara
membuat proyek di `/app/projects/new` — mode `form` sudah jalan, mode `story` ('Ceritakan
proyeknya') dan `template` ('Pakai template') masih "Coming soon". Semua keputusan arsitektur di
bawah sudah didiskusikan dan dikonfirmasi coordinator (lihat §1); sisanya ada di §12 sebagai
pertanyaan terbuka yang memang diminta tidak diasumsikan.

Riset sumber: `app/lib/project-create-mode.ts`, `app/components/projects/project-chooser.copy.ts`,
`server/ai/task-draft.*` (pola AI "Tulis saja ✦"), `server/db/schema.project.ts`,
`server/db/schema.project-plan.ts`, `server/db/schema.task.ts`, `server/access/project.policy.ts`,
`server/project/project.service.ts`, `server/project/project.limits.ts`, `server/api/app-projects*.ts`,
`server/api-keys/scopes.ts`, `server/api-keys/scopes.pm.ts`, `server/pm/limits.ts`, `server/pm/enums.ts`.

---

## 1. Keputusan dari diskusi dengan coordinator

Ditanyakan lewat `ask` sebelum dokumen ini ditulis; jawaban coordinator mengikat rencana di bawah:

1. **Model AI** — *tidak diputuskan di sini sebagai env var baru.* Coordinator: jalankan
   `envman run claude:nico-opus` di sesi implementasi untuk mengatur model yang dipakai. Jangan
   menebak detail teknis profil `envman` itu. Rencana ini tetap mendesain modul AI baru di atas
   `aiConfig()`/`ai.config.ts` yang **sudah ada** (sama seperti task draft, dibaca dari
   `ANTHROPIC_API_KEY` + `TASK_AI_MODEL` dkk.) — **tanpa** menambah env var model baru — dan
   mencatat di §11 bahwa agen implementasi wajib menjalankan `envman run claude:nico-opus` sebelum
   mulai coding, serta mengonfirmasi ulang ke coordinator apakah itu berarti perlu env var/model
   terpisah atau cukup pakai yang sudah ada.
2. **Limit/budget provider** — coordinator putuskan sendiri: **reuse pola `task-draft.service.ts`
   apa adanya.** Rate limiter per user **tidak boleh dibuat baru** — modul baru mengimpor
   `draftLimiter` yang sudah diekspor dari `server/ai/task-draft.service.ts` (kuota 10
   panggilan/menit/user dipakai bersama antara "Tulis saja" dan "Ceritakan proyeknya"). Budget
   token ikut `aiConfig().maxTokens` (env `TASK_AI_MAX_TOKENS`, default 1500, maks 8000) — **tidak**
   ada env token budget terpisah. Lihat §12 untuk open question soal cukup/tidaknya cap 8000.
3. **Feature flag** — coordinator putuskan sendiri: **tidak ada toggle terpisah.** Mengikuti
   konvensi `aiEnabled()`/`storageEnabled()`: mode story otomatis tidak bisa dipakai selama
   `ANTHROPIC_API_KEY` kosong (sama seperti fitur AI lain, jatuh ke pesan "belum bisa dipakai, isi
   form saja"). Mode template tidak bergantung AI sama sekali, jadi tidak digate apa pun.
4. **Urutan prioritas** — user: **dikerjakan bersamaan**, satu slice pekerjaan yang mencakup
   story-mode dan template-mode sekaligus (bukan dua slice berurutan). Rencana di bawah disusun
   sebagai satu alur implementasi gabungan (§13).
5. **Visibilitas template** — user: **privat**, hanya pembuatnya yang bisa melihat/memakai
   template yang disimpan. Tidak ada sharing ke Pengelola lain di versi ini (app ini single-
   workspace, tidak ada konsep organisasi). Skema dan query di §3/§7 memakai `created_by` sebagai
   filter kepemilikan.

---

## 2. Alur pengguna end-to-end (gambaran)

```
/app/projects/new
  └─ (bare URL) ProjectCreateChooser — 3 kartu: form | story | template
       ├─ ?cara=form      → ProjectForm (sudah ada)
       ├─ ?cara=cerita     → StoryForm → (AI) → StoryDraftReview → [Simpan] → project baru
       │                                                        └→ [Simpan sebagai template] (opsional)
       └─ ?cara=template  → TemplatePicker (daftar template milik sendiri)
               ├─ pilih salah satu     → TemplateUseForm (tanggal mulai dsb) → [Pakai] → project baru
               └─ [+ Bikin template baru] → TemplateForm (manual) → [Simpan] → template baru (lalu
                                                                                balik ke TemplatePicker)
```

Catatan nilai `cara`: komentar yang sudah ada di `project-create-mode.ts` menyebut nilai yang
dicadangkan untuk mode belum jadi adalah **`cerita`** dan **`template`** (bukan `story`). Rencana
ini memakai nilai itu agar konsisten dengan kontrak URL yang sudah disiapkan; `CreateMode` diubah
jadi `'choose' | 'form' | 'cerita' | 'template'` dan `createModeOf` menambah dua cabang itu.

Baik story maupun template berakhir di **satu** pemanggilan `POST /api/app/projects` (diperluas,
§4.9) yang membuat project + members + task kinds default + phases + tasks dalam **satu transaksi**
— konsisten dengan filosofi `createProject` yang sudah ada ("a bad member leaves no project row
behind"). Tidak ada pembuatan project parsial lalu ditambal belakangan.

---

## 3. Skema data baru

Belum ada tabel/kolom apa pun untuk template (dikonfirmasi di `schema.project.ts`). Tiga tabel baru,
berdiri sendiri (tidak mereferensikan `project`/`project_phase`/`task` — template bukan proyek,
baru menjadi proyek nyata setelah "dipakai"). Konvensi kolom ikut `schema.columns.ts`
(`pk()`, `createdAt()`, `updatedAt()`, `oneOf()`), gaya `schema.project-plan.ts`.

### 3.1 `project_template`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `pk()` | |
| `name` | `text not null` | nama template, maks `PROJECT_TEMPLATE_NAME_MAX` (diusulkan 120, sama dengan `PROJECT_NAME_MAX`) |
| `description` | `text` nullable | maks `PROJECT_TEMPLATE_DESCRIPTION_MAX` (diusulkan 5000, sama dengan `PROJECT_DESCRIPTION_MAX`) |
| `source` | `text` enum `['story','manual']` not null | menandai asal: hasil AI story-mode yang disimpan, atau diisi manual lewat form |
| `created_by` | `text` nullable, FK `user.id` `ON DELETE SET NULL` | pemilik; privat (§1.5) — filter query selalu `created_by = principal.id`. Nullable + SET NULL mengikuti pola `project.created_by`/`project.lead_id`: akun dihapus tidak pernah menghapus data, tapi template yang `created_by`-nya jadi `null` otomatis tidak muncul lagi di daftar siapa pun (tidak ada yang bisa memfilternya) — expected, dicatat sebagai utang kecil di §11, bukan bug |
| `created_at`, `updated_at` | `createdAt()`/`updatedAt()` | |

Index: `project_template_created_by_idx` pada `created_by` (daftar "template saya" selalu filter
by owner). `check` `oneOf(source, ['story','manual'])`.

### 3.2 `project_template_phase`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `pk()` | |
| `template_id` | `text not null`, FK `project_template.id` `ON DELETE CASCADE` | hapus template = hapus fase bawaannya |
| `name` | `text not null`, maks `PHASE_NAME_MAX` (dipakai ulang dari `project.limits.ts`) | |
| `description` | `text` nullable, maks `PHASE_DESCRIPTION_MAX` | |
| `position` | `smallint not null` | urutan tampil, sama pola dengan `project_phase.position` |
| `start_offset_days` | `integer` nullable | hari relatif dari tanggal mulai proyek yang **akan** dibuat (hari ke-0); `null` = tidak diisi |
| `end_offset_days` | `integer` nullable | idem; `check` `end_offset_days >= start_offset_days` ala `project_phase_end_after_start_check` |
| `created_at`, `updated_at` | | |

Index: `project_template_phase_template_id_position_idx` pada `(template_id, position)`.

### 3.3 `project_template_task`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `pk()` | |
| `template_id` | `text not null`, FK `project_template.id` `ON DELETE CASCADE` | |
| `template_phase_id` | `text` nullable, FK `project_template_phase.id` `ON DELETE SET NULL` | tugas boleh tanpa fase, sama seperti `task.phase_id` |
| `title` | `text not null`, maks `TASK_TITLE_MAX` (dipakai ulang dari `task.limits.ts`) | |
| `description` | `text` nullable, maks `TASK_DESCRIPTION_MAX` | |
| `priority` | `text` nullable, enum `PROJECT_PRIORITIES` | `null` = ikut default proyek saat dipakai |
| `kind_name` | `text` nullable | nama jenis tugas (`Tugas`/`Bug`/`Ide` dari `DEFAULT_TASK_KINDS`, atau nama custom yang tetap disimpan sebagai teks); **bukan** `kind_id` — proyek dari template belum punya baris `task_kind` sampai dipakai, jadi resolusi id terjadi saat instantiate (§5.3), sama filosofi dengan `kind` di hasil "Tulis saja" (`task-draft.types.ts`, dicocokkan by name) |
| `due_offset_days` | `integer` nullable | hari relatif ke hari ke-0 |
| `position` | `smallint not null` | urutan tampil dalam template (lintas fase, bukan per-fase, biar sederhana) |
| `created_at`, `updated_at` | | |

**Sengaja tidak ada kolom assignee.** Template dibuat untuk dipakai ulang lintas waktu/tim; nama
orang di proyek sebelumnya kemungkinan besar tidak relevan di proyek baru. Ini asumsi desain, bukan
salah satu dari 5 keputusan wajib tanya — ditulis eksplisit di sini supaya coordinator bisa koreksi
kalau tidak setuju, tapi tidak memblokir penulisan rencana.

### 3.4 Migration

File baru `server/db/migrations/0024_project_template.sql` (migrasi terakhir saat ini adalah
`0023_leave_period.sql`). Tabel baru murni (tidak ada `ALTER TABLE` pada tabel berisi data), jadi
tidak ada isu backfill/`NOT NULL` tanpa default — tapi tetap memakai guard idempoten
(`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) sesuai aturan project, dan komentar SQL
menjelaskan *kenapa* tiga tabel terpisah (bukan JSON blob di satu kolom): fase dan tugas template
perlu diurutkan, divalidasi panjangnya, dan direferensikan satu-satu saat instantiate — pola yang
sama dipakai `project_phase`/`task` untuk proyek sungguhan, jadi template meniru bentuknya alih-alih
menyimpan JSON bebas bentuk.

Setelah file migration dibuat, jalankan ke **dua** DB sebelum test (aturan project):
`bun run db:migrate` (dev) lalu `DATABASE_URL=$DATABASE_URL_TEST bun run db:migrate` (test).

### 3.5 Mengapa bukan JSON di satu kolom `project_template.content`

Dipertimbangkan sebagai alternatif lebih sederhana (satu kolom `jsonb`, dipakai di beberapa tabel
lain seperti `schema.project-history.ts`/`schema.task-detail.ts`). Ditolak karena: (a) validasi
panjang nama/deskripsi per item tidak bisa dijaga lewat `check` SQL seperti kolom teks biasa, (b)
tidak bisa index per-field kalau nanti perlu cari "template yang punya tugas bernama X", (c) bentuk
query untuk instantiate (baca semua fase+tugas terurut) sama persis dengan query `getProjectPlan`
yang sudah ada untuk `project_phase`/`project_milestone` — tiga tabel normal lebih konsisten dengan
pola project ini. Trade-off: tiga tabel = tiga file schema kecil + migration sedikit lebih besar,
dianggap wajar untuk fitur yang akan dipakai berulang.

---

## 4. Alur 'Ceritakan proyeknya' (story)

### 4.1 Modul AI baru — `server/ai/project-draft.*`

Meniru struktur modul `task-draft.*` persis (satu tanggung jawab per file, pola yang sudah terbukti
dipakai dan diuji):

| File | Isi |
|---|---|
| `project-draft.limits.ts` | `PROJECT_DRAFT_TEXT_MAX`, `PROJECT_DRAFT_PHASES_MAX`, `PROJECT_DRAFT_TASKS_MAX`, `PROJECT_DRAFT_CODES` (`disabled`/`unavailable`/`textEmpty`/`textTooLong`, sama bentuk dengan `TASK_DRAFT_CODES`), `PROJECT_DRAFT_MESSAGES` (bahasa Indonesia, actionable) |
| `project-draft.prompt.ts` | `DRAFT_TOOL` (JSON Schema tool call) + `buildPrompt()`; cerita tetap dikirim di blok `<tulisan>` yang di-*defang* (`<` → `‹`) seperti `task-draft.prompt.ts`, supaya cerita tidak bisa menyamar jadi instruksi |
| `project-draft.schema.ts` | `parseModelOutput()` — validasi ketat jawaban model (string dibersihkan+dipotong ke limit, enum yang tidak cocok jadi `null`, array lebih dari `PROJECT_DRAFT_PHASES_MAX`/`PROJECT_DRAFT_TASKS_MAX` menolak seluruh jawaban) |
| `project-draft.compose.ts` | `composeProjectDraft()` — token tanggal (`offset`/`weekday`/`monthday`/`date`) → tanggal ISO lewat `resolveDue()` yang **dipakai ulang** dari `task-draft.dates.ts` (jangan tulis ulang logika tanggal); nama jenis tugas dicocokkan ke `DEFAULT_TASK_KINDS` |
| `project-draft.types.ts` | Kontrak `POST /api/app/projects/draft`: `ProjectDraftRequest = { text: string }`, `ProjectDraftResponse` (lihat §4.2) |
| `project-draft.service.ts` | `draftProject(principal, { text }, clock)` — orkestrasi: cek `canCreateProject`, cek panjang teks, `aiConfig()`, **`draftLimiter` yang diimpor dari `task-draft.service.ts`** (§1.2, tidak membuat limiter baru), panggil `callTool()` dari `anthropic.client.ts` (dipakai ulang, tidak ada client baru), parse, compose, log hanya metadata (lihat §4.7) |

Tidak ada `project-draft.query.ts`: berbeda dengan task draft (yang butuh anggota & jenis tugas
*proyek yang sudah ada*), story-mode proyek baru tidak punya proyek untuk dibaca — `canCreateProject(principal)`
murni cek role (`isPmOrAbove`), tidak perlu query DB sama sekali. Ini membuat `draftProject` lebih
sederhana dari `draftTasks`.

### 4.2 Bentuk output (`ProjectDraftResponse`)

```ts
type ProjectDraft = {
  name: string;               // 1..PROJECT_NAME_MAX
  description: string | null;
  startDate: string | null;   // YYYY-MM-DD, dihitung server dari token tanggal, bukan oleh model
  dueDate: string | null;
  priority: ProjectPriority | null;
  phases: Array<{
    name: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    tasks: Array<{
      title: string;
      description: string | null;
      priority: ProjectPriority | null;
      kindName: string | null;   // dicocokkan ke DEFAULT_TASK_KINDS, null = pakai default "Tugas" nanti
      dueDate: string | null;
    }>;
  }>;
  /** Tugas yang cerita sebut tapi tidak jelas masuk fase mana. */
  looseTasks: Array<ProjectDraft['phases'][number]['tasks'][number]>;
};
type ProjectDraftResponse = { draft: ProjectDraft | null; question: string | null };
```

`question` dipakai sama seperti `TaskDraftQuestion` versi sederhana (tanpa `options`/`draftIndexes`
member-matching — tidak ada member untuk dicocokkan di sini): sekadar pertanyaan terbuka saat cerita
terlalu ambigu untuk dibuatkan draf apa pun (`draft: null` + `question` terisi).

### 4.3 Tool & prompt (contoh)

System prompt mengikuti nada `task-draft.prompt.ts`: cerita di `<tulisan>` adalah **data**, bukan
instruksi; model wajib memanggil satu tool `susun_draf_proyek` persis sekali; aturan tanggal/enum
sama format token (`offset`/`weekday`/`monthday`/`date`) supaya kode (bukan model) yang menghitung
tanggal — konsisten dengan komentar kunci di `task-draft.prompt.ts`: *"never work out a calendar
date yourself, only describe what the story says"*. Field yang diminta: `name`, `description`,
`startDate`/`dueDate` (token tanggal, nullable), `priority` (opsional, enum), `phases[]` (maks
`PROJECT_DRAFT_PHASES_MAX`, masing-masing punya `tasks[]` maks total `PROJECT_DRAFT_TASKS_MAX`
lintas semua fase), `looseTasks[]`, `question`. `kindName` dibatasi ke daftar `DEFAULT_TASK_KINDS`
yang dikirim di `<konteks>` (tidak perlu query DB karena ini daftar statis).

### 4.4 Resolusi tanggal & kind

- Tanggal: `resolveDue(token, today)` dari `task-draft.dates.ts`, dipakai untuk `startDate`/`dueDate`
  proyek dan tiap `startDate`/`endDate` fase serta `dueDate` tugas. `today` dari `requestClock()`
  (pola yang sama dipakai `app-tasks.draft.ts`).
- Jenis tugas: `kindName` dicocokkan case-insensitive ke `DEFAULT_TASK_KINDS` (`Tugas`/`Bug`/`Ide`);
  tidak cocok → `null` (nanti fallback ke "Tugas" saat instantiate, §4.9).

### 4.5 Rate limit & token budget

Lihat §1.2: `draftLimiter` yang sama (10/menit/user, dibagi dengan "Tulis saja"), `maxTokens` dari
`aiConfig()` yang sama (default 1500, bisa dinaikkan lewat `TASK_AI_MAX_TOKENS` sampai 8000). Untuk
menjaga output tetap masuk akal di bawah cap: `PROJECT_DRAFT_PHASES_MAX` diusulkan **6** dan
`PROJECT_DRAFT_TASKS_MAX` diusulkan **20** (lintas semua fase) — jauh di bawah ceiling asli
(`PHASES_PER_PROJECT = 20`), supaya draf awal tetap ringkas dan nyaman direview, bukan mencoba
menghasilkan rencana proyek lengkap sekali jalan. **Open question soal cap 8000 tetap ada di §12**
sesuai instruksi coordinator — angka di atas adalah mitigasi yang diusulkan, bukan jawaban akhir.

Jika model memotong jawaban (`stop_reason === 'max_tokens'`), `anthropic.client.ts` sudah melempar
`AiUnavailableError('truncated')` — ditangani sama seperti kegagalan lain (§4.6), jatuh ke form
manual. Ini jaring pengaman yang sudah ada, tidak perlu kode baru.

### 4.6 Error states

Sama pemetaan HTTP dengan `app-tasks.draft.ts`, endpoint baru `server/api/app-projects.draft.ts`:

| Kondisi | HTTP | `code` |
|---|---|---|
| Teks kosong | 400 | `TEXT_EMPTY` |
| Teks > `PROJECT_DRAFT_TEXT_MAX` | 400 | `TEXT_TOO_LONG` |
| `canCreateProject` menolak (role bukan PM/Admin/super-admin) | 403 | `NOT_APP_ROLE` |
| `aiConfig()` null (tidak ada API key) | 503 | `AI_DISABLED` |
| Provider gagal/timeout/truncated/jawaban rusak | 502 | `AI_UNAVAILABLE` |
| Rate limit | 429 | `RATE_LIMITED` + header `retry-after` |

Klien (`useProjectDraft` hook, mirip `useTaskDraft.ts`) memetakan 503/502/fetch-gagal ke fallback:
tutup layar story, buka `ProjectForm` kosong (sama seperti task draft jatuh ke form kosong dengan
teks pengguna taruh di field judul — di sini, taruh cerita pengguna di field `description` form
biasa supaya tidak hilang sia-sia).

### 4.7 Privacy & logging

Ikuti larangan di `task-draft.service.ts`: log hanya `{ userId, latencyMs, outcome, phases, tasks }`
(angka, bukan isi) — **tidak pernah** log cerita mentah atau draf proyek yang dihasilkan. Prompt ke
provider tidak mengirim email/id, hanya cerita pengguna + daftar nama jenis tugas statis (tidak ada
data pengguna lain yang bisa bocor, karena belum ada proyek/anggota).

### 4.8 Review UI sebelum simpan

Komponen baru di `app/components/projects/create/` (folder baru, konsisten pola `plan/` yang sudah
ada untuk fase/milestone):

- `StoryForm.tsx` — satu `Textarea` (maks `PROJECT_DRAFT_TEXT_MAX`, counter karakter), tombol "Susun
  draf" dengan `loading` prop selama `useProjectDraft().loading` true (standar UX async wajib).
- `StoryDraftReview.tsx` — form terisi-awal dari `draft` (nama/deskripsi/tanggal/prioritas, reuse
  field `ProjectForm` lewat prop `initialValues` baru — lihat catatan implementasi di §11) + daftar
  fase & tugas hasil draf (`DraftPhaseList.tsx`/`DraftTaskList.tsx`, meniru tampilan kartu
  `TaskDraftCard.tsx`/`TaskDraftList.tsx` dari modul tugas, tapi dikelompokkan per fase). Setiap
  item fase/tugas bisa diedit inline atau dihapus dari daftar sebelum disimpan (**AI hanya
  mengusulkan; pengguna memeriksa draf sebelum proyek dibuat**, syarat eksplisit di brief).
- Jika `question` terisi (`draft: null`) → tampilkan `Alert` dengan pertanyaannya + tombol "Isi form
  saja" (fallback, bukan dead-end).
- Checkbox "Simpan juga sebagai template" di bagian bawah review (lihat §4.10).

### 4.9 Penyimpanan akhir — perluasan `POST /api/app/projects`

**Tidak ada endpoint simpan baru.** `POST /api/app/projects` (`app-projects.write.ts`,
`createProject()` di `project.service.ts`) tetap menjadi satu-satunya jalan membuat proyek —
mengikuti prinsip yang sudah tertulis di `task-draft.types.ts` ("the client... creates each
accepted one with `POST /api/app/tasks` (source of truth for what a task takes)"). Perluasan:

- `CreateBody` (Elysia schema) bertambah dua field **opsional**, tidak breaking:
  ```ts
  phases: t.Optional(t.Array(t.Object({
    name, description, startDate: date, endDate: date,
    tasks: t.Optional(t.Array(t.Object({ title, description, priority: t.Optional(oneOf(PROJECT_PRIORITIES)), kindName: t.Optional(t.String()), dueDate: date }, strict)), { maxItems: PROJECT_DRAFT_TASKS_MAX }),
  }, strict)), { maxItems: PROJECT_DRAFT_PHASES_MAX }),
  looseTasks: t.Optional(t.Array(/* bentuk tugas yang sama tanpa fase */, strict)),
  ```
- `createProject()` di `project.service.ts`, dalam `inTx` yang sama yang sudah ada:
  1. Insert `project` (seperti sekarang).
  2. Insert `projectMember` (seperti sekarang).
  3. Insert `taskKind` dari `DEFAULT_TASK_KINDS`, **tambahkan `.returning({ id, name })`** (saat ini
     tidak ada `.returning()` di baris ini — lihat `project.service.ts` baris ~168-170) supaya ada
     map nama→id untuk dipakai langkah 5.
  4. Jika `input.phases` ada: insert `projectPhase` per fase dengan `.returning({ id })` agar tugas
     di fase itu bisa mereferensikan `phaseId`-nya.
  5. Jika ada `tasks`/`looseTasks`: insert `task` dengan `kindId` dari map langkah 3 (fallback ke
     kind "Tugas" bila `kindName` tidak cocok/`null`), `phaseId` dari map langkah 4 bila ada.
  6. `projectActivity` tetap satu baris `created` (tidak perlu baris aktivitas per fase/tugas — itu
     akan terekam natural lewat baris task/phase itu sendiri; cek konvensi `project_activity` yang
     ada sebelum menambah payload besar ke satu baris).
- **Backward compatible**: form biasa (tanpa `phases`/`tasks` di body) berlaku sama seperti sekarang.
- Respons tetap `getProjectDetail(...)` (201) — endpoint tidak perlu tahu apakah proyek ini berasal
  dari form/story/template.

### 4.10 "Simpan sebagai template" dari hasil story

Bukan endpoint terpisah. Tombol di `StoryDraftReview` memanggil `POST /api/app/projects/templates`
(§5, §6) dengan `source: 'story'` dan `phases`/`tasks` yang **sama** dengan yang sedang direview
(sudah diedit pengguna), tapi tanggalnya dikonversi dari absolut → offset: `diffDays(draft.startDate
?? today, date)` memakai `diffDays` dari `metrics/dates.ts` (sudah ada, dipakai ulang — jangan tulis
fungsi tanggal baru). `draft.startDate` jadi hari ke-0 kalau terisi, kalau tidak dipakai `today`.
Tombol ini independen dari tombol "Buat proyek" — pengguna bisa melakukan salah satu, keduanya, atau
tidak sama sekali (baru simpan sebagai template tanpa langsung membuat proyek dari draf itu).

---

## 5. Alur 'Pakai template'

### 5.1 Pilih template yang sudah ada

`TemplatePicker.tsx` — daftar `project_template` milik `principal.id` saja (privat, §1.5), dari
`GET /api/app/projects/templates` (§6). Kartu/list sederhana: nama, badge `source` ("Dari cerita
AI" / "Manual"), jumlah fase & tugas, tanggal dibuat. **Empty state wajib**: belum ada template →
pesan "Belum ada template. Buat dari cerita AI atau isi manual." + tombol langsung ke
`StoryForm`/`TemplateForm` (standar UX production-ready §4 di `CLAUDE.md` project).

Pilih satu → `TemplateUseForm.tsx`: minta `startDate` (tanggal mulai nyata — basis konversi
offset→tanggal, pakai `DateInput`, **bukan** `<input type=date>`), opsional override `name`,
`leadId`, `priority`, `members` (reuse `MemberPicker` yang sudah ada). Tombol "Pakai template" →
`POST /api/app/projects/templates/:id/use`.

### 5.2 Form manual bikin template baru

`TemplateForm.tsx` — nama, deskripsi, daftar fase (nama + offset mulai/selesai dalam hari, input
angka sederhana atau dua `NumberInput`), daftar tugas per fase (judul, deskripsi, prioritas, jenis
dari `Select` berisi `DEFAULT_TASK_KINDS`, offset due). Reuse pola tambah/hapus baris dari
`PhaseForm.tsx`/`PhaseList.tsx` (`app/components/projects/plan/`) untuk konsistensi interaksi
("+ Tambah fase", drag-less reorder cukup pindah posisi dengan tombol naik/turun, sama kompleksitas
dengan `reorderPhases` yang sudah ada untuk fase proyek sungguhan). Simpan →
`POST /api/app/projects/templates` dengan `source: 'manual'`.

### 5.3 Instantiate — `POST /api/app/projects/templates/:id/use`

Service baru `useTemplate()` di `server/project/project-template.service.ts`:
1. Load template (fase+tugas) milik `principal.id`; bukan milik sendiri atau tidak ada → `NOT_FOUND`
   (disamakan hilang/bukan milik, pola D8 yang sama dipakai `canViewProject`).
2. Konversi offset → tanggal absolut: `addDays(startDate, offsetDays)` dari `task-draft.dates.ts`
   (sudah ada, dipakai ulang) untuk tiap fase (`startOffsetDays`/`endOffsetDays`) dan tugas
   (`dueOffsetDays`); `startOffsetDays` dianggap 0 kalau `null`.
3. Panggil `createProject()` (fungsi yang sama yang diperluas di §4.9) dengan `phases`/`tasks` hasil
   konversi + field dari `TemplateUseForm` (`name`/`leadId`/`priority`/`members`). Satu transaksi
   yang sama, tidak ada service baru untuk "insert project dari template" — template hanya
   menyiapkan input untuk `createProject()` yang sudah ada.
4. Respons 201 + project detail, sama bentuk dengan `POST /api/app/projects` biasa.

### 5.4 Ringkasan konversi tanggal

| Arah | Fungsi | Dipakai di |
|---|---|---|
| Absolut → offset (simpan sebagai template) | `diffDays(baseline, date)` (`metrics/dates.ts`, sudah ada) | §4.10 |
| Offset → absolut (pakai template) | `addDays(startDate, offsetDays)` (`task-draft.dates.ts`, sudah ada) | §5.3 |

Tidak ada fungsi tanggal baru yang perlu ditulis — keduanya sudah ada dan murni (tidak bergantung
DB/jam dinding), tinggal diimpor.

---

## 6. Kontrak API baru

Semua di bawah prefix yang sudah ada `/api/app/projects` (lihat alasan penamaan di §8 — ini bukan
kebetulan, supaya proteksi `PM_KEY_DENY` yang sudah ada otomatis berlaku).

| Method | Path | Guard | Body (ringkas) | Respons |
|---|---|---|---|---|
| `POST` | `/api/app/projects/draft` | `canCreateProject` | `{ text }` | 200 `ProjectDraftResponse`; 400/403/429/502/503 (§4.6) |
| `GET` | `/api/app/projects/templates` | login saja (filter by `created_by`) | query `q?`, `page?`, `limit?` | `{ items, total, page, limit }` |
| `GET` | `/api/app/projects/templates/:id` | `canUseTemplate` (pemilik) | — | detail + `phases[]`/`tasks[]`; 404 kalau bukan milik sendiri |
| `POST` | `/api/app/projects/templates` | `canCreateTemplate` (= `canCreateProject`) | `{ name, description?, source, phases?, tasks? }` | 201 detail |
| `PATCH` | `/api/app/projects/templates/:id` | `canUseTemplate` (pemilik) | field sama, replace-all untuk `phases`/`tasks` (bukan patch per-item, demi kesederhanaan MVP) | detail |
| `DELETE` | `/api/app/projects/templates/:id` | `canUseTemplate` (pemilik) | — | 204; **otomatis ditolak untuk API key** (§8) |
| `POST` | `/api/app/projects/templates/:id/use` | `canUseTemplate` (pemilik) + `canCreateProject` | `{ name?, startDate, leadId?, priority?, members? }` | 201 project detail (bentuk sama `POST /api/app/projects`) |
| `POST` | `/api/app/projects` (**diperluas**) | `canCreateProject` (sudah ada) | **+** `phases?`, `+ looseTasks?` opsional | 201 project detail (tidak berubah bentuknya) |

File implementasi yang disarankan: `server/api/app-projects.draft.ts` (mirip
`app-tasks.draft.ts`) dan `server/api/app-projects.templates.ts`, keduanya di-`.use()` dari
`app-projects.ts` **sebelum atau sejajar** dengan `.get('/:id', ...)` — pola yang sama yang sudah
membuktikan `tasks/draft` tidak bentrok dengan `tasks/:id` di modul tugas; cukup ikuti urutan yang
sama, tidak perlu riset routing baru.

Error 404 vs 403 untuk template: dipilih **404** (bukan 403) ketika bukan pemilik, konsisten dengan
D8 ("hidden project looks the same as a missing one") — kepemilikan privat seharusnya tidak
mengonfirmasi ke pemanggil bahwa ID itu *ada* tapi bukan miliknya.

---

## 7. Role/guard & kepemilikan

File baru `server/access/project-template.policy.ts` (bukan menambah ke `project.policy.ts` yang
sudah fokus ke proyek — satu tanggung jawab per file):

```ts
/** Siapa yang boleh membuat template: sama syarat dengan membuat proyek (PM/Admin/super-admin). */
export function canCreateTemplate(p: Principal): Decision {
  return canCreateProject(p); // reuse langsung, tidak duplikasi aturan role
}

/** Siapa yang boleh melihat/mengubah/memakai satu template: hanya pembuatnya (privat, §1.5). */
export function canUseTemplate(p: Principal, template: { createdBy: string | null }): ProjectDecision {
  return template.createdBy === p.id ? allow() : NOT_VISIBLE; // 404, bukan 403 — lihat §6
}
```

Guard halaman (`app/routes/app/project-new.tsx`, diperluas untuk mode `cerita`/`template`): loader
tetap panggil `requireUser(request)` lalu `canCreateProject(toPrincipal(actor))` — **sama** check
yang sudah dipakai mode `form`, tidak perlu role baru.

---

## 8. Pemetaan scope API key & `PM_KEY_DENY`

Temuan dari baca `server/api-keys/scopes.ts` baris ~204: aturan generik
`if (p.startsWith('/api/app/') || p === '/api/app') return read ? 'app:read' : 'app:write';` sudah
mencakup **semua** route baru di atas secara otomatis (semuanya di bawah `/api/app/projects/...`):

- `GET` → `app:read`. `POST`/`PATCH`/`DELETE` → `app:write`.
- `POST /api/app/projects/draft` jatuh ke `app:write` meski tidak menyimpan apa pun — **persis**
  komentar yang sudah ada di `scopes.ts` untuk `tasks/draft` ("it saves nothing but spends the
  provider quota, so a read-only key must not reach it"); tidak perlu baris komentar/kode baru,
  pola yang sudah ada otomatis berlaku lagi karena nama path mengikuti prefix `/api/app/projects`.
- `DELETE /api/app/projects/templates/:id` **otomatis** cocok pola `PM_KEY_DENY` yang sudah ada:
  `{ id: 'DELETE projects/*', method: 'DELETE', path: /^\/api\/app\/projects\/.+/i }` (baris pertama
  `scopes.pm.ts`) — sama seperti bagaimana hapus fase/milestone proyek sungguhan juga sudah tertolak
  lewat pola ini. **Tidak perlu entry `PM_KEY_DENY` baru.**
- Tidak ada route baru di atas yang perlu masuk `PM_KEY_DENY` secara eksplisit: membuat template,
  memakai template, dan story-draft semuanya analog dengan menulis/membuat (bukan menghapus atau
  eskalasi peran), sama kelas risikonya dengan `POST /api/app/projects` biasa yang juga tidak masuk
  deny list.

**Konsekuensi penting untuk implementasi**: meski tidak ada baris kode `scopes.ts`/`scopes.pm.ts`
yang perlu diubah, aturan project (`CLAUDE.md`) tetap mewajibkan **test eksplisit** untuk setiap
rute `/api/app/` baru di `tests/api-keys/scopes.test.ts` dan `tests/api-keys/scopes.pm.test.ts` —
supaya perilaku "otomatis benar" ini terkunci dan tidak diam-diam berubah kalau pola generik nanti
diubah. Lihat §10.

---

## 9. UI: halaman, komponen, state, mobile

### 9.1 Routing

- `app/lib/project-create-mode.ts`: `CreateMode` → `'choose' | 'form' | 'cerita' | 'template'`;
  `createModeOf` menambah dua cabang (`cerita`, `template`), tetap fallback ke `'choose'` untuk nilai
  lain (kontrak "stale link tidak pernah membuka separuh fitur" dipertahankan).
- `app/components/projects/ProjectCreateChooser.tsx`: tambahkan `href` untuk `story`/`template`
  (`PROJECT_STORY_HREF`/`PROJECT_TEMPLATE_HREF` di `project-create-mode.ts`, pola sama dengan
  `PROJECT_FORM_HREF`); hilangkan status "Coming soon" untuk dua kartu itu.
- `app/routes/app/project-new.tsx`: percabangan baru untuk `createModeOf(search)` → render
  `StoryForm`/`StoryDraftReview` atau `TemplatePicker`/`TemplateForm`/`TemplateUseForm` sesuai
  sub-state (lihat §9.2). `meta()` tetap satu judul "Proyek Baru — Simple PM" (satu route, sudah
  sesuai aturan SEO project — tidak perlu `meta()` per sub-mode karena ini bukan route terpisah).

### 9.2 Komponen baru (`app/components/projects/create/`)

| File | Peran |
|---|---|
| `StoryForm.tsx` | Textarea cerita + tombol "Susun draf" (`loading`) |
| `StoryDraftReview.tsx` | Form terisi-awal + daftar fase/tugas yang bisa diedit/dihapus + checkbox simpan sebagai template |
| `DraftPhaseList.tsx`, `DraftTaskList.tsx` | Tampilan & edit inline per item draf (meniru `TaskDraftList.tsx`/`TaskDraftCard.tsx`) |
| `TemplatePicker.tsx` | Daftar template milik sendiri + empty state + tombol buat baru |
| `TemplateForm.tsx` | Form manual bikin/ubah template (fase + tugas) |
| `TemplateUseForm.tsx` | Form instantiate (tanggal mulai, override nama, anggota) |
| `useProjectDraft.ts` | Hook panggil `POST /api/app/projects/draft`, meniru `useTaskDraft.ts` (loading + pemetaan outcome) |
| `useProjectTemplates.ts` | Hook CRUD + instantiate template (list/create/update/delete/use), pola `useProjectActions.tsx` |
| `story-create.copy.ts`, `template-create.copy.ts` | Copy bahasa Indonesia, pola file `*.copy.ts` yang sudah konsisten di folder ini |

### 9.3 Standar UX production-ready yang wajib diterapkan

- **Loading**: setiap tombol yang memicu panggilan (Susun draf, Simpan proyek, Simpan template,
  Pakai template, Hapus template) pakai prop `loading` selama request berjalan.
- **Konfirmasi destruktif**: hapus template **tidak masuk Sampah** (di luar cakupan S6 Trash yang
  sudah ada) → **T2**, `modals.openConfirmModal()`: "Template ini akan dihapus permanen." Membuat
  proyek dari template/story **bukan** aksi destruktif (hasilnya proyek baru, bisa dihapus lewat
  jalur Trash proyek yang sudah ada) → tidak perlu dialog konfirmasi, cukup tombol submit.
- **Feedback**: `notifications.show()` untuk sukses simpan template / gagal menyusun draf / dsb;
  error AI (502/503) tampil sebagai pesan jelas + fallback ke form, **tidak** diam-diam gagal.
- **Empty state**: `TemplatePicker` kosong (§5.1); `StoryDraftReview` saat `draft: null` (hanya
  `question`) juga bukan blank — tampilkan pertanyaannya.
- **Disabled state**: tombol "Susun draf" disabled + tooltip saat teks kosong atau sedang rate-limited
  (hitung mundur dari `retryAfterSeconds`, pola yang sudah ada di modul tugas via `rateTitle`).
- **Mobile**: semua `Group`/`SimpleGrid` baru pakai breakpoint responsif (`cols={{ base: 1, sm: 2 }}`
  dsb), tidak ada lebar piksel tetap; daftar fase/tugas di `StoryDraftReview`/`TemplateForm` dirender
  sebagai `Stack` kartu (bukan tabel lebar) karena datanya hierarkis (fase → tugas), bukan tabel
  datar — jadi aturan "tabel ≥4 kolom wajib card view mobile" otomatis tidak relevan di sini, tapi
  kartu itu sendiri tetap wajib nyaman di 375px (padding `p="sm"`, tombol aksi `flexShrink: 0`).
- **Ikon**: `size="1.25em"`, bukan piksel tetap (standar project).

---

## 10. Test plan

Ikuti pola test yang sudah ada persis (`tests/ai/task-draft.*.test.ts`,
`tests/api/tasks-draft.*.test.ts`, `tests/support/draft-harness.ts`).

### Unit (pure, tanpa DB)

- `tests/ai/project-draft.schema.test.ts` — `parseModelOutput`: jawaban model yang bagus, rusak,
  terlalu banyak fase/tugas, enum tidak valid → `null`.
- `tests/ai/project-draft.compose.test.ts` — token tanggal → tanggal ISO yang benar (termasuk kasus
  tepi `offset: 0`, `monthday` lewat bulan ini), `kindName` dicocokkan ke `DEFAULT_TASK_KINDS` dan
  tidak cocok → `null`.
- `tests/ai/project-draft.prompt.test.ts` — cerita yang mengandung `<` di-defang, tidak bisa menutup
  blok `<tulisan>` sendiri.
- `tests/project-template.dates.test.ts` (atau nama setara) — `diffDays`/`addDays` dipakai benar
  untuk konversi offset↔absolut di dua arah (round-trip: simpan jadi template lalu pakai lagi harus
  menghasilkan tanggal yang sama kalau `startDate` sama).

### Integrasi (DB + harness autentikasi `spyOn`, **bukan** `mock.module` untuk route yang bergantung
`resolveActor`)

- `tests/api/projects-draft.gate.test.ts` — 401 anonim, 400 teks kosong/terlalu panjang tanpa
  memanggil provider, 403 role Member, fallback 503 `AI_DISABLED` tanpa API key, 502
  `AI_UNAVAILABLE` saat provider error/truncated, 429 + header `retry-after` saat limiter penuh
  (**pastikan test ini juga membuktikan kuota dibagi dengan `tasks/draft`** — konsekuensi langsung
  dari keputusan §1.2, harus terlihat di test, bukan cuma di kode).
- `tests/api/projects-draft.privacy.test.ts` — meniru `tasks-draft.privacy.test.ts`: cerita pengguna
  dan hasil draf **tidak pernah** masuk `logger` (spy on logger calls, assert tidak mengandung teks
  cerita), request ke provider tidak membawa email/id pengguna lain (di sini malah lebih sederhana:
  tidak ada entitas lain yang bisa bocor karena belum ada proyek).
- `tests/api/project-templates.test.ts` — CRUD lengkap: buat, daftar (hanya milik sendiri — buat
  dua user, pastikan user B tidak melihat template user A), ubah, hapus; 404 (bukan 403) saat akses
  template orang lain; validasi batas `PROJECT_DRAFT_PHASES_MAX`/`TASKS_MAX` pada `POST`/`PATCH`.
- `tests/api/project-templates.use.test.ts` — instantiate membuat project+phases+tasks yang benar
  (assert jumlah baris & tanggal hasil konversi offset→absolut); satu transaksi (simulasikan tugas
  dengan `kindName` tidak valid dan pastikan tetap sukses dengan fallback kind, bukan gagal
  seluruhnya — atau sebaliknya, tentukan perilaku yang diinginkan sebagai bagian implementasi dan
  kunci lewat test).
- `tests/api-keys/scopes.projects.test.ts` (tambah assertion, bukan file baru jika sudah ada
  `scopes.projects.test.ts` — **cek nama file saat implementasi**, dari `ls tests/api-keys/` repo
  ini sudah ada `scopes.projects.test.ts`) — assert `requiredScope('POST', '/api/app/projects/draft')
  === 'app:write'`, `requiredScope('GET', '/api/app/projects/templates') === 'app:read'`, dst untuk
  setiap rute baru di §6.
- `tests/api-keys/scopes.pm.test.ts` — assert `isPmKeyDenied('DELETE', '/api/app/projects/templates/x')
  === true` (membuktikan klaim §8 bahwa pola lama sudah menolaknya, bukan cuma asumsi membaca regex).

### Komponen/flow (kalau project punya pola test komponen React — **periksa saat implementasi**
apakah ada contoh test UI untuk modul tugas/task-draft, misal `tests/task-draft-flow.test.ts`
tampaknya menguji logika `task-draft.flow.ts` secara terisolasi dari React; ikuti pola yang sama:
`project-draft.flow.ts`/`template-create.flow.ts` sebagai fungsi murni yang ditest tanpa render,
komponen React tipis di atasnya).

**Blocker dari aturan global**: semua test di atas wajib hijau sebelum lapor selesai; tidak boleh
ada `it('should work', () => {})` kosong.

---

## 11. Technical debt eksplisit & catatan implementasi

- **TODO wajib ditulis di kode saat implementasi** (bukan diam-diam): `// TODO(project-draft): model
  AI diatur lewat profil envman (`envman run claude:nico-opus`) saat sesi implementasi dimulai —
  konfirmasi ke coordinator apakah ini perlu env var baru atau cukup pakai ANTHROPIC_API_KEY/
  TASK_AI_MODEL yang sudah ada.` Ditaruh di `server/ai/project-draft.service.ts` dekat pemanggilan
  `aiConfig()`, supaya agen implementasi membaca ulang keputusan ini sebelum menulis kode asli.
- **Sebelum coding dimulai**: jalankan `envman run claude:nico-opus` seperti diminta coordinator
  (§1.1) — langkah ini di luar cakupan dokumen rencana (bukan kode), tapi wajib dicatat sebagai
  langkah pertama implementasi, bukan diasumsikan sudah berjalan.
- **`ProjectForm.tsx` perlu prop `initialValues` opsional** (saat ini tidak menerima nilai awal
  selain `creator`/`today`) agar `StoryDraftReview` bisa mengisi form dari hasil draf. Ini perubahan
  kecil pada komponen yang sudah ada, dicatat di sini supaya tidak terlewat saat breakdown task.
- **`createProject()` saat ini tidak `.returning()` id `taskKind`** (§4.9 langkah 3) — perubahan
  kecil tapi wajib, karena tanpa itu tugas hasil story/template tidak bisa tahu `kindId` yang benar.
- Template yang `created_by`-nya jadi `null` (akun pembuat dihapus) tidak akan pernah terlihat lagi
  oleh siapa pun (privat, tidak ada fallback "lihat semua template"). Dicatat sebagai keterbatasan
  yang diterima untuk versi ini (bukan bug), bisa jadi pembersihan data di masa depan jika volume
  jadi masalah — **tidak** perlu dikerjakan sekarang.

---

## 12. Keputusan terbuka yang masih tersisa

Satu-satunya item dari daftar wajib (§1) yang coordinator eksplisit minta **tidak** diputuskan di
rencana ini dan harus ditanya ulang:

> **Apakah cap token 8000 (`MAX_MAX_TOKENS` di `ai.config.ts`) cukup untuk draf proyek + sampai 6
> fase + 20 tugas sekaligus, atau perlu dinaikkan (mengubah konstanta `MAX_MAX_TOKENS` yang saat ini
> dipakai bersama fitur "Tulis saja")?** Risiko bila tidak cukup: jawaban model terpotong
> (`AiUnavailableError('truncated')`) lebih sering untuk cerita proyek yang detail, jatuh ke
> fallback form lebih sering dari yang diinginkan. Mitigasi yang sudah diusulkan di §4.5
> (`PROJECT_DRAFT_PHASES_MAX = 6`, `PROJECT_DRAFT_TASKS_MAX = 20`) mengurangi risiko ini tapi belum
> diverifikasi dengan panggilan model sungguhan — baru bisa dipastikan saat implementasi (butuh
> `ANTHROPIC_API_KEY` aktif untuk uji coba nyata).

Pertanyaan tambahan (bukan dari daftar wajib, muncul dari detail desain — tidak memblokir, tapi
sebaiknya dikonfirmasi sebelum/awal implementasi):

1. `PROJECT_DRAFT_TEXT_MAX` diusulkan 4000 karakter (dua kali lipat `TASK_DRAFT_TEXT_MAX`, karena
   cerita proyek biasanya lebih panjang dari cerita satu tugas) — apakah angka ini oke, atau ada
   batas yang lebih disukai?
2. Saat instantiate template dan sebuah tugas punya `kindName` yang tidak cocok ke
   `DEFAULT_TASK_KINDS` (misal template lama sebelum daftar kind berubah) — fallback ke kind
   "Tugas", atau gagalkan seluruh instantiate dengan pesan error?
3. `PATCH /api/app/projects/templates/:id` dirancang replace-all untuk `phases`/`tasks` (ganti
   seluruh isi, bukan patch per-item) demi kesederhanaan MVP — cukup untuk kebutuhan sekarang, atau
   perlu edit granular per fase/tugas (seperti `project_phase`/`project_milestone` yang punya route
   sendiri per item)?

---

## 13. Ringkasan urutan kerja (satu slice gabungan, sesuai §1.4)

Sesuai keputusan "dikerjakan bersamaan", breakdown di bawah adalah urutan logis commit **di dalam**
satu slice/PR besar (atau beberapa commit berurutan di satu branch fitur), bukan dua slice terpisah:

1. Migration `0024_project_template.sql` + schema Drizzle (`schema.project-template.ts`) + jalankan
   ke dev & test DB.
2. Modul AI `server/ai/project-draft.*` + unit test (§10, bagian unit) — tidak bergantung UI, bisa
   diverifikasi lebih dulu.
3. Perluasan `createProject()` (§4.9) + migrasi `taskKind` `.returning()` + test integrasi
   `POST /api/app/projects` dengan `phases`/`tasks` (backward-compat lama tetap harus hijau).
4. Endpoint `POST /api/app/projects/draft` (`app-projects.draft.ts`) + test gate/privacy.
5. `server/access/project-template.policy.ts` + `server/project/project-template.{service,query}.ts`
   + endpoint `app-projects.templates.ts` (CRUD + `/use`) + test CRUD/ownership/instantiate.
6. Test pemetaan scope (`scopes.projects.test.ts`/`scopes.pm.test.ts`) untuk semua rute baru (§8/§10).
7. UI: `project-create-mode.ts` (tambah `cerita`/`template`), `ProjectCreateChooser.tsx` (aktifkan
   dua kartu), komponen baru di §9.2, route `project-new.tsx` diperluas.
8. `README.md` / dokumentasi publik — **cek** apakah `/app/projects/new` disebut di README (kalau
   ya, update bagian itu sesuai aturan Documentation Debt; kalau hanya halaman internal `/app` yang
   tidak diindex, mungkin tidak perlu — verifikasi saat implementasi, jangan diasumsikan di sini).
9. `CHANGELOG.md` entry di `## [Unreleased]` (Added): dua cara baru bikin proyek.
10. Smoke test penuh (`bun run test`, `bun run typecheck`) sebelum lapor selesai; `smoke:prod`/
    `smoke:binary` **tidak wajib** untuk slice ini kecuali ada perubahan di `server/entry` atau
    logger (kemungkinan tidak, tapi verifikasi sesuai aturan "menyentuh server/ → smoke wajib").

Urutan 1-6 bisa diverifikasi lewat test tanpa UI; urutan 7 baru menyalakan kartu di chooser setelah
semua jalur server terbukti benar — supaya `ProjectCreateChooser` tidak pernah menampilkan jalur
yang setengah jadi ke pengguna sungguhan.
