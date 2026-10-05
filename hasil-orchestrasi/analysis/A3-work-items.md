# A3 — Work Items: Menu Tasks, Ticket, Pengembangan + Detail (Analisis 2026)

> Analis Produk #3 · Run orkestrasi Orca · Oktober 2026
> Scope: Menu Tasks, Menu Ticket, Menu Pengembangan, tab Tasks di Detail Proyek (khusus bagian list/form/detail task),
> Detail Task/Ticket/Pengembangan (checklist, komentar, evidence, deps, aktivitas, status, kind, priority, planning, tags), bulk CSV, trash.
> Di luar scope (cukup disinggung): dashboard Ringkasan dan ghost reminder (A1), dashboard tab Tasks proyek, milestone, dan phase (A2).

Legenda label: **[KEEP]** pertahankan · **[MODIFY]** ubah · **[MERGE]** gabung · **[REMOVE]** hapus · **[ADD-AI]** fitur baru berbasis AI · **[ADD]** fitur baru non-AI.
Prioritas: **P0** wajib di rilis pertama, **P1** rilis berikutnya, **P2** nice-to-have. Effort kasar: **S** (≤1 minggu), **M** (2–4 minggu), **L** (>1 bulan).

---

## 1. Ringkasan eksekutif

1. **Tiga menu itu sebenarnya satu entitas.** Menu Tasks, Menu Ticket, Menu Pengembangan, dan tab Tasks di proyek memakai form, header CSV, dan halaman detail yang sama persis. Yang berbeda hanya filter default (`kind=ticket` / `kind=idea`) dan beberapa kartu ringkasan. Hasilnya ada 4 implementasi list, 4 form, 4 importer CSV, dan 3 halaman detail yang sudah mulai *drift* (daftar kind/status berbeda-beda, lihat §3).
2. **Model data terpadu `WorkItem`** dengan `kind ∈ {task, bug, idea}`. "Ticket" bukan jenis pekerjaan, tapi **jalur masuk (intake) yang perlu di-triage**. "QC" juga bukan jenis, tapi **tahap workflow** (`in_review`). Status disatukan dalam satu state machine dengan kategori (triage → open → in_progress → in_review → done/canceled). `reopened` dan `overdue` tidak lagi jadi status. Keduanya jadi flag/turunan.
3. **UX 2026: satu Inbox Work Item + Saved Views.** Menu Ticket dan Menu Pengembangan **digabung** jadi saved view bawaan ("Triage Tiket" dan "Ide & Pengembangan") yang tetap bisa di-pin di sidebar, jadi user lama tidak kehilangan pintu masuknya.
4. **Lapisan AI** (mengikuti tren Linear Triage Intelligence, Rovo di Jira, Asana AI Teammates): AI triage (kind, priority, assignee, duplikat) dengan *suggest → accept*, AI agent sebagai **delegate** (manusia tetap owner), quick-capture dari teks/screenshot/voice, sub-task generator, ringkasan thread, AI check atas evidence QC, smart CSV import, dan scoring ide (impact/effort).
5. **Prinsip penjaga:** AI hanya **menyarankan**. Tidak ada transisi ke `done` tanpa manusia, semua aksi AI tercatat di aktivitas dengan aktor `agent`, dan konten tiket dari luar diperlakukan sebagai data tak tepercaya (risiko prompt injection ke agent).

**Paket P0 (fondasi):** model data terpadu + migrasi, state machine baru, satu komponen list/detail/composer, saved views bawaan, bulk actions, global trash, dan AI triage dasar (saran kind/priority + deteksi duplikat).

---

## 2. Temuan duplikasi besar

| Area | Menu Tasks | Tab Tasks Proyek | Menu Ticket | Menu Pengembangan | Kesimpulan |
|---|---|---|---|---|---|
| Form single | project, title, desc, kind, priority, assignee, start/due, estimate | sama | sama (+default kind=ticket, priority=medium) | **tanpa** assignee/tanggal/estimate (default kind=idea) | 1 composer, field progresif per kind |
| Bulk CSV | upload saja | upload + sample + paste | upload + sample + paste + import | upload + sample + paste + import | 1 import wizard |
| Header CSV | `title,description,kind,priority,startsAt,dueAt,estimateHours,assigneeEmail,tagNames` di **keempatnya** | | | | skema sudah satu, jadi importer cukup satu |
| Kartu ringkasan | – | dashboard (A2) | open, overdue, unassigned, blocked, stale>7d | open, unassigned, stale>7d | chip hitungan di atas list |
| Attention filter | – | – | all/overdue/unassigned/blocked/stale | all/unassigned/stale | chip yang sama untuk semua view |
| View | kanban/table/gantt | kanban/table/gantt | table | table | semua layout untuk semua view |
| Detail | 5 tab + status + pengaturan + planning + tags | sama | sama (teks "ticket") | sama (teks "pengembangan") | **1 halaman detail**, panel kontekstual per kind |
| Trash | – | ada (30 hari) | – | – | global trash |

Kesimpulan: perbedaan antar menu cuma **filter default + label + subset kolom**. Semua itu bisa diwakili `SavedView`. Tidak ada alasan produk untuk tiga entitas atau tiga halaman.

---

## 3. Inkonsistensi & typo di note.md (bagian work item)

> Catatan: BRIEF melarang mengubah `note.md`, jadi inkonsistensi dicatat di dokumen ini, bukan di note.md.

### 3.1 Daftar *kind* tidak konsisten
| Lokasi di note.md | Nilai kind |
|---|---|
| Form "new task" (Tab Tasks proyek & Menu Tasks) | bug, qc, ticket, idea (**tanpa `task`**, padahal ini form "task") |
| Filter "all kinds" | task, bug, qc, ticket, idea |
| Pengaturan detail Task & Ticket | task, bug, qc, ticket (**tanpa `idea`**: ide yang di-edit tidak bisa kembali jadi idea) |
| Pengaturan detail Pengembangan | task, bug, qc, **pengembangan** (kind fiktif, mestinya `idea`; `ticket` hilang) |
| Ringkasan "bug terbuka" | "kind **bugs**" (plural, beda dengan `bug`) |
| Form Ticket / Ide | default `ticket` / `idea` |

### 3.2 Daftar *status* tidak konsisten (termasuk "ready for qc")
| Lokasi | Nilai status | Masalah |
|---|---|---|
| Ringkasan "task terbuka" | open, inprogress, reopened | `ready for qc` tidak disebut: dihitung terbuka atau tidak? |
| Ringkasan "status task saya" | open, inprogress, **ready for qc**, reopened | ada ready for qc |
| Filter "all statues" (Menu Tasks/Tab Tasks) | open, in progress, **ready for qc**, closed | **tanpa `reopened`** |
| Detail → "ubah status" (ketiga detail) | open, inprogress, reopened, closed | **tanpa `ready for qc`**, jadi tidak ada cara UI untuk masuk ke status itu |
| Dashboard tab Tasks, donut breakdown | closed, open, inprogress, reopened | tanpa ready for qc |
| Dashboard tab Tasks, card "total status overdue" | overdue | **overdue bukan status**, melainkan turunan dari `due_at` |
| Ticket/Ide "all statuses" | tidak didefinisikan | – |
| Penulisan | `inprogress` vs `in progress`, `closed` vs "close" | ejaan enum tidak seragam |

Selain itu ada duplikasi konsep **QC**: `qc` sebagai *kind* dan `ready for qc` sebagai *status*. Tidak jelas apakah "task QC" adalah pekerjaan testing atau tahap review.

### 3.3 Inkonsistensi field & perilaku
1. **Assignee vs author tercampur:** "assignee: ubah **author** atau orang yang mengerjakan". Pelapor (reporter) dan pengerja adalah dua peran berbeda.
2. **Copy-paste konteks proyek:** di Menu Tasks (global), form dan filter scope tertulis "project: auto memilih project yang dibuka". Di menu global tidak ada proyek yang sedang dibuka.
3. **Form Ide tanpa assignee/due/estimate**, tetapi ada kartu "unassigned", kolom tabel "due", dan header CSV memuat `assigneeEmail, dueAt, estimateHours`.
4. **Bulk CSV Menu Tasks** tidak punya "download sample", "paste", maupun "import"; versi lain punya.
5. **Search** hanya ada di Ticket dan Ide. Menu Tasks dan Tab Tasks tidak punya search.
6. **Trash** hanya di Tab Tasks proyek. Item yang dihapus dari Menu Ticket/Ide tidak jelas larinya ke mana.
7. **Kolom tabel bernama "task"** di Menu Ticket dan Menu Ide (mestinya "judul").
8. **Definisi "tidak disentuh" tidak seragam:** ghost reminder = in progress & tidak disentuh 3 hari (A1), stale ticket/ide = >7 hari, age ide "kuning jika sudah lama" tanpa ambang. "Disentuh" tidak didefinisikan (update field? komentar? checklist?).
9. **Ide "dinaikkan jadi task"** tapi tidak ada aksi *promote*; satu-satunya cara adalah mengganti kind, padahal di detail Pengembangan `task` tersedia tapi `idea` tidak.
10. **Checklist "subticket/subpengembangan"**: checklist dipakai sebagai sub-task, padahal tidak punya assignee/due/status.
11. **Evidence** punya dua fungsi yang tercampur: bukti selesai vs catatan "perlu diperbaiki" (penolakan QC).
12. **Deps** hanya "membuat task agar terblok", tanpa jenis relasi (blocks, relates, duplicate).
13. **Aktivitas** hanya "logs status", padahal Menu Tim (A1) menampilkan log status + komentar.
14. **"Tombol select"** tanpa aksi massal yang didefinisikan.
15. **Kanban "tampilan grid"**: kanban mestinya dikelompokkan per status, bukan sekadar grid.

### 3.4 Typo
`assigny`→assignee, `Cartical`→Critical (prioritas proyek), `deskirpsi`→deskripsi, `mengomnetari`→mengomentari, `all statues`→all statuses, `gant`→Gantt, `menselecet`→men-select, `unassigneed`→unassigned, `penyelesain`→penyelesaian, `chekcpoint`→checkpoint, `millestone`→milestone, `fease`→fase, `assingment`→assignment, `snapshoot`→snapshot, `&gt;7d` (entity HTML yang bocor, mestinya `>7d`).

---

## 4. Model data terpadu

### 4.1 Prinsip
- **Satu entitas `WorkItem`.** Kind menjelaskan *sifat* pekerjaan, status menjelaskan *posisi di alur*, dan `source` menjelaskan *dari mana datangnya*. Ketiganya ortogonal.
- **Kind final: `task`, `bug`, `idea`.**
  - `ticket` → **[REMOVE] sebagai kind.** Tiket = item yang masuk lewat jalur intake (`source` = form/email/chat/meeting) dan berada di status `triage`. Sifatnya tetap task atau bug.
  - `qc` → **[REMOVE] sebagai kind.** QC = status `in_review` + field `reviewer_id` + evidence. Kebutuhan "pekerjaan testing" cukup memakai kind `task` dengan tag `qa`.
  - `pengembangan` → typo, digabung ke `idea`.
- **Turunan, bukan disimpan sebagai status:** `overdue` (due_at < now & belum closed), `blocked` (ada relasi `blocks` dari item yang belum closed), `stale` (`last_activity_at` melewati ambang), dan `reopened` (flag dari `reopen_count > 0`).
- **Manusia selalu owner.** Agent AI hanya `delegate`, mengikuti pola delegasi Linear dan Rovo.

### 4.2 Entitas & field

**`WorkItem`**
| Field | Tipe | Catatan |
|---|---|---|
| `id`, `key` | uuid, string | key terbaca manusia, mis. `PRJ-142` |
| `workspace_id` | fk | |
| `project_id` | fk, **nullable** | boleh null hanya untuk `status=triage` atau `kind=idea` (ide lintas proyek); wajib diisi sebelum keluar dari triage/promote |
| `kind` | enum `task\|bug\|idea` | |
| `title`, `description` | string, rich text | |
| `acceptance_criteria` | rich text / list | **[ADD]** dipakai readiness check, agent, dan AI QC |
| `status_id`, `status_category` | fk, enum | kategori: `triage, unstarted, started, review, completed, canceled` |
| `priority` | enum `none\|low\|medium\|high\|critical` | `none` hanya di triage |
| `reporter_id` | fk user | pembuat/pelapor (pengganti "author" yang tercampur) |
| `assignee_id` | fk user, nullable | **manusia**, penanggung jawab |
| `delegate_agent_id` | fk agent, nullable | AI agent yang mengerjakan atas nama assignee |
| `reviewer_id` | fk user, nullable | QC/reviewer; default dari pengaturan proyek |
| `parent_id` | fk work_item, nullable | sub-item sungguhan (1 level di P0, nested di P2) |
| `starts_at`, `due_at`, `estimate_hours` | datetime, datetime, decimal | |
| `phase_id`, `milestone_id` | fk, nullable | relasi ke area A2 |
| `source` | enum `manual\|csv\|intake_form\|email\|chat\|meeting_note\|voice\|screenshot\|agent\|api_mcp` | |
| `source_ref` | json | id event rapat, id pesan, nama file import, dll. |
| `duplicate_of_id` | fk, nullable | diisi saat ditutup sebagai duplikat |
| `cancel_reason` | enum + text | `duplicate, wont_do, out_of_scope, declined_idea, spam` |
| `reopen_count`, `rework_count` | int | pengganti status `reopened`; rework = ditolak QC |
| `last_activity_at` | datetime | definisi tunggal "disentuh": perubahan field, komentar, checklist, evidence, atau commit tertaut |
| `completed_at`, `canceled_at` | datetime | |
| `idea_scoring` | json, nullable | `{impact, effort, confidence, reach?, score, rationale, scored_by: ai\|user, scored_at}` |
| `promoted_from_id` | fk, nullable | jika ide dipromosikan jadi item baru (opsi B, lihat §5.3) |
| `deleted_at`, `deleted_by` | datetime, fk | soft delete untuk trash 30 hari |
| `created_at`, `updated_at`, `version` | | `version` untuk optimistic locking (penting saat agent & manusia menulis bersamaan) |

**Entitas pendukung**
| Entitas | Field kunci | Catatan |
|---|---|---|
| `ChecklistItem` | work_item_id, text, done, done_by, done_at, order | tetap ringan; aksi "jadikan sub-item" |
| `Comment` | work_item_id, author_type (`user\|agent\|system`), author_id, body, mentions[], parent_comment_id, edited_at | `parent_comment_id` untuk thread |
| `ThreadSummary` | work_item_id, summary, decisions[], open_questions[], covers_until_comment_id, model, generated_at | cache ringkasan AI |
| `Evidence` | work_item_id, type (`image\|file\|url\|log\|pr`), ref, note, **purpose** (`proof_of_done\|qc_rejection\|repro\|reference`), uploaded_by (user/agent), `ai_check` json `{verdict: pass\|needs_attention\|fail, findings[], criteria_coverage, model, checked_at}` | |
| `Relation` | from_id, to_id, type (`blocks\|relates\|duplicates`) | "blocked by" = sisi kebalikan dari `blocks`; boleh lintas proyek |
| `Tag` / `WorkItemTag` | workspace_id, name, color, merged_into_id | governance untuk tag kembar |
| `ActivityEvent` | work_item_id, actor_type, actor_id, action, field, old, new, via (`ui\|csv\|ai_suggestion\|agent\|api`), created_at | **semua** perubahan, bukan hanya status |
| `AISuggestion` | work_item_id, type (`kind\|priority\|assignee\|project\|tags\|duplicate\|estimate\|subtasks`), value, confidence, rationale, state (`pending\|accepted\|rejected\|auto_applied`), decided_by, decided_at | basis untuk mengukur akurasi AI |
| `Agent` | id, name, provider, capabilities[], mcp_endpoint, allowed_projects[], max_budget, requires_approval_for[] | agent terdaftar dan bisa dipilih sebagai delegate |
| `AgentRun` | work_item_id, agent_id, triggered_by, state (`queued\|running\|awaiting_input\|completed\|failed\|canceled`), plan, progress_log[], artifacts[], cost, started_at, ended_at | |
| `SavedView` | owner_id / shared_scope, name, icon, filters json, sort, group_by, layout (`list\|board\|table\|timeline`), columns[], pinned | pengganti menu terpisah |
| `ImportJob` | file_ref / pasted_text, detected_format, column_mapping json, mapping_confidence, dry_run_result, rows_total/ok/error, created_item_ids[], created_by, undone_at | undo satu batch |
| `WorkflowStatus` | workspace_id, key, label, category, order, color | label dapat diganti ("Ready for QC" → "Review"), kategori tetap |

### 4.3 Migrasi data lama
| Data lama | Data baru |
|---|---|
| kind `task`/`bug`/`idea` | sama |
| kind `ticket` | kind `task` (atau `bug` jika AI mengklasifikasikan begitu dengan confidence tinggi, lewat konfirmasi batch), `source=intake_form`, tag `legacy-ticket`; jika masih open & unassigned → status `triage` |
| kind `qc` | kind `task` + tag `qa`; jika status ready for qc → `in_review` |
| kind `pengembangan`/`bugs` | `idea` / `bug` |
| status `open` / `inprogress` / `ready for qc` / `closed` | `open` / `in_progress` / `in_review` / `done` |
| status `reopened` | `in_progress` (atau `open` jika belum ada aktivitas setelah reopen) + `reopen_count += 1` |
| "author" di field assignee | `assignee_id`; `reporter_id` diisi dari pembuat di log aktivitas |
| Checklist | tetap checklist (tanpa konversi otomatis) |
| Deps | relasi `blocks` |

---

## 5. State machine status

### 5.1 Status & kategori
| Status (key) | Label default | Kategori | Dihitung "terbuka"? | Keterangan |
|---|---|---|---|---|
| `triage` | Perlu Triage | triage | ya (terpisah) | item masuk yang belum diterima: tiket, hasil AI capture, ekstraksi rapat (A1), import CSV tanpa proyek |
| `open` | Open / To do | unstarted | ya | sudah diterima, belum dikerjakan |
| `in_progress` | In Progress | started | ya | |
| `in_review` | Ready for QC | review | ya | menggantikan "ready for qc", label bisa diubah |
| `done` | Closed / Done | completed | tidak | |
| `canceled` | Dibatalkan | canceled | tidak | duplikat, won't do, ide ditolak |

Untuk `kind=idea`, status yang sama dipakai dengan label kontekstual: `triage` = "Ide baru", `open` = "Dievaluasi", `done` = "Diterima / dipromosikan", `canceled` = "Ditolak". Ide tidak memakai `in_progress`/`in_review`. Saat promote, ide berpindah ke `kind=task, status=open` (lihat §5.3).

Definisi KPI (diserahkan ke A1/A2 supaya seragam): **terbuka** = kategori `triage|unstarted|started|review`. **Selesai** = `completed`. `canceled` tidak dihitung throughput.

### 5.2 Diagram

```mermaid
stateDiagram-v2
    [*] --> triage: intake / AI capture / tiket
    [*] --> open: dibuat anggota proyek (project & priority terisi)
    triage --> open: terima (project + priority wajib)
    triage --> canceled: duplikat / spam / won't do (alasan wajib)
    open --> in_progress: mulai (assignee wajib; auto-assign diri sendiri)
    in_progress --> open: batal mulai
    in_progress --> in_review: kirim ke QC (cek evidence + checklist)
    in_review --> done: QC lulus (reviewer manusia)
    in_review --> in_progress: QC tolak (catatan wajib, rework_count+1)
    done --> in_progress: reopen (alasan wajib, reopen_count+1)
    open --> canceled
    in_progress --> canceled
    in_review --> canceled
    canceled --> open: pulihkan
    done --> [*]
```

### 5.3 Aturan transisi (guard)
| Transisi | Siapa | Guard / efek |
|---|---|---|
| `triage → open` | PM/Member proyek | `project_id` dan `priority ≠ none` wajib. Saran AI ditampilkan; menerimanya mencatat `AISuggestion.accepted` |
| `triage → canceled (duplicate)` | PM/Member | `duplicate_of_id` wajib; komentar & watcher dipindah ke item asli |
| `open → in_progress` | assignee / PM | jika assignee kosong, auto-assign ke pelaku. Jika ada relasi `blocks` yang belum selesai, tampilkan **peringatan** (tidak memblokir) |
| `in_progress → in_review` | assignee / delegate agent | checklist belum lengkap → peringatan. Pengaturan proyek `require_evidence_for_review` (default ON untuk bug) → minimal 1 evidence `proof_of_done`. Memicu AI evidence check (P1) dan notifikasi reviewer |
| `in_review → done` | **reviewer manusia** (tidak boleh agent) | opsi proyek: reviewer ≠ assignee. Hasil AI check hanya informasi, bukan syarat |
| `in_review → in_progress` | reviewer | wajib catatan (comment atau evidence `qc_rejection`); `rework_count+1` |
| `done → in_progress` (reopen) | siapa pun anggota | alasan wajib; `reopen_count+1`; notifikasi assignee & reviewer; badge "Reopened" |
| `* → canceled` | PM / reporter (untuk itemnya sendiri) | `cancel_reason` wajib |
| `canceled → open` | PM | pulihkan |
| Promote ide (`idea: open → done`) | PM | **Opsi A (direkomendasikan):** konversi di tempat (`kind→task`, `status→open`), riwayat, komentar, dan skor tetap. **Opsi B:** buat task baru yang tertaut `promoted_from_id`, ide → `done`. Opsi B dipakai jika satu ide pecah jadi beberapa task |
| Agent | delegate agent | boleh `open→in_progress→in_review`, menambah komentar/evidence/checklist, dan membuat sub-item draft. **Tidak boleh** `→done`, `→canceled`, menghapus, atau mengubah assignee/priority tanpa persetujuan |

---

## 6. Tabel fitur lama → label

### 6.1 Level menu / list
| # | Fitur lama | Label | Alasan | Dampak ke user | P | Effort |
|---|---|---|---|---|---|---|
| L1 | Menu Tasks, Menu Ticket, Menu Pengembangan, Tab Tasks proyek (4 list terpisah) | **[MERGE]** | Satu entitas, beda filter default; 4 implementasi sudah drift (§3) | Satu cara kerja; "Ticket" dan "Ide" tetap ada sebagai saved view yang di-pin | P0 | L |
| L2 | Tombol refresh (di semua menu) | **[REMOVE]** | Ganti dengan sinkronisasi real-time (websocket/SSE) + indikator "ada X update baru" | Data tidak basi, satu klik berkurang | P1 | M |
| L3 | Form new task/tiket/ide (4 versi) | **[MERGE]+[MODIFY]** | Satu composer dengan field progresif: kind `idea` menyembunyikan assignee/tanggal/estimate; di view global proyek dipilih manual; ada mode quick-capture | Konsisten, lebih cepat | P0 | M |
| L4 | Bulk CSV (4 versi, fitur berbeda) | **[MERGE]+[MODIFY]** | Satu import wizard: upload/paste → mapping → preview dry-run → import → undo batch | Error import ketahuan sebelum data masuk | P0 | M |
| L5 | Download sample CSV | **[KEEP]** | Tetap berguna; dipindah ke dalam wizard | – | P0 | S |
| L6 | Paste CSV di text input | **[KEEP]→[MODIFY]** | Terima juga paste dari spreadsheet (TSV) atau daftar teks bebas; AI memecah jadi baris | Tidak perlu menyiapkan CSV rapi | P1 | S |
| L7 | Filter scope project/assignee + kind/status/priority | **[KEEP]+[MODIFY]** | Satu filter bar dengan nilai enum terpadu; hapus teks "auto memilih project" di view global | Filter yang sama di semua view | P0 | S |
| L8 | Search (hanya Ticket/Ide) | **[MODIFY]** | Tersedia di semua view, ditambah pencarian semantik (embedding) dan filter bahasa natural (§7 F13) | Menemukan item tanpa ingat judul persis | P0 (keyword) / P1 (semantik) | S/M |
| L9 | Kartu ringkasan (open, overdue, unassigned, blocked, stale) | **[MODIFY]** | Jadi chip hitungan yang bisa diklik di atas list. Angka yang sama tidak diulang di dashboard (koordinasi A1) | Lebih ringkas; satu klik untuk drill-down | P0 | S |
| L10 | Attention quick filter (Ticket/Ide) | **[MERGE]** ke L9 | Chip = filter; satu ambang "stale" yang bisa dikonfigurasi (default 7 hari untuk open/triage, 3 hari untuk in_progress = ghost reminder A1) | Definisi seragam | P0 | S |
| L11 | Urutan (due, priority, title, created, updated, estimate) | **[KEEP]** | Lengkap; tambah "skor AI" untuk view Ide dan "last activity" | – | P0 | S |
| L12 | View kanban/table/gantt (Ticket & Ide hanya table) | **[KEEP]+[MODIFY]** | Semua layout tersedia di semua view; kanban dikelompokkan per status (bisa per assignee/priority); "gantt" diganti nama jadi Timeline dan menampilkan relasi blocks | Ide bisa di-board-kan per status evaluasi | P1 | M |
| L13 | Tombol download CSV | **[KEEP]** | Export mengikuti filter & kolom view aktif | – | P1 | S |
| L14 | Tombol select (tanpa aksi) | **[MODIFY]** | Jadi bulk actions: status, assignee, priority, tags, pindah proyek, delegasi ke agent, hapus | Triage meeting jauh lebih cepat | P0 | S |
| L15 | Tabel tiket/ide (kolom "task", project, status, priority, assignee, due, age) | **[MODIFY]** | Kolom bisa dikonfigurasi per view; ganti kolom "task" → "Judul"; age berwarna dengan ambang yang sama | – | P0 | S |
| L16 | Trash (hanya tab Tasks proyek, 30 hari) | **[MODIFY]** | Global trash untuk semua work item + restore + hapus permanen (PM) + item hasil import bisa di-undo per batch | Tidak ada item "hilang" | P0 | S |
| L17 | Dashboard tab Tasks proyek (card total/open/closed/overdue, throughput, donut, top assignees) | **[MERGE]** → A2 | Di luar scope A3. Catatan: "overdue" bukan status, donut tanpa `in_review`, dan "top assignees open" ambigu ("yang membuat" vs "yang ditugaskan") | – | – | – |

### 6.2 Detail work item
| # | Fitur lama | Label | Alasan | Dampak ke user | P | Effort |
|---|---|---|---|---|---|---|
| D1 | 3 halaman detail (Task/Ticket/Pengembangan) | **[MERGE]** | Satu detail dengan panel kontekstual: panel triage (saran AI) untuk `triage`, panel scoring + "Promosikan" untuk `idea`, panel agent untuk item yang didelegasikan | Satu mental model | P0 | M |
| D2 | Judul & deskripsi | **[KEEP]+[MODIFY]** | Rich text (gambar, code block) + field **acceptance criteria** terpisah + bantuan AI "rapikan deskripsi" | Kriteria selesai jelas untuk manusia, agent, dan QC | P0 | S |
| D3 | Checklist | **[MODIFY]** | Tetap ringan untuk langkah kecil; aksi "jadikan sub-item" untuk langkah yang butuh assignee/due; sub-item sungguhan via `parent_id` | Sub-task bisa di-assign dan dilacak | P1 | M |
| D4 | Komentar | **[KEEP]+[MODIFY]** | Tambah @mention user/agent, thread reply, reaksi, dan ringkasan AI (F6) | Diskusi panjang mudah diikuti | P0 | S |
| D5 | Evidence (file/foto/url + note) | **[MODIFY]** | Tambah `purpose` (bukti selesai / penolakan QC / repro), tautan PR/commit, AI check (F7); dipakai sebagai gate `in_review` | QC lebih cepat & terukur | P0 (purpose) / P1 (AI) | S/M |
| D6 | Deps (membuat task terblok) | **[MODIFY]** | Jenis relasi: blocks/blocked-by, relates, duplicates; lintas proyek; peringatan saat memulai item yang masih terblok; tampil di Timeline | Hambatan terlihat sebelum terlambat | P0 | M |
| D7 | Aktivitas (log status) | **[MODIFY]** | Log semua field + aktor `user/agent/system` + `via` (csv/AI/api); filter "hanya status / hanya AI" | Audit jelas, terutama untuk aksi agent | P0 | S |
| D8 | Ubah status (open/inprogress/reopened/closed) | **[MODIFY]** | State machine §5: `in_review` masuk UI, `reopened` jadi flag, tambah `triage` dan `canceled` | Alur QC benar-benar bisa dipakai | P0 | M |
| D9 | Pengaturan kind (task/bug/qc/ticket/pengembangan) | **[MODIFY]** | Kind = task/bug/idea; ticket & qc dihapus sebagai kind (§4.1) | Klasifikasi tidak ambigu | P0 | S |
| D10 | Prioritas | **[KEEP]** | Tambah `none` khusus triage; saran AI | – | P0 | S |
| D11 | Assignee ("author atau orang yang mengerjakan") | **[MODIFY]** | Pisahkan reporter, assignee (manusia), reviewer (QC), dan delegate (agent) | Akuntabilitas jelas | P0 | S |
| D12 | Planning (mulai, tenggat, estimate) | **[KEEP]+[ADD-AI]** | Saran estimasi dari histori item serupa (F12) | Estimasi lebih realistis | P0 (keep) / P2 (AI) | S |
| D13 | Tags | **[KEEP]+[MODIFY]** | Saran tag oleh AI + merge tag kembar (`merged_into_id`) | Tag tidak berantakan | P1 | S |
| D14 | Ide "dinaikkan jadi task" (implisit lewat ganti kind) | **[MODIFY]** | Tombol eksplisit **Promosikan** (§5.3) + scoring (F10) | Alur review ide jelas | P1 | S |

### 6.3 Ringkasan yang DIHAPUS / DIGABUNG
- **[MERGE]** Menu Ticket & Menu Pengembangan → saved view di Inbox Work Item (nav sidebar tetap ada sebagai shortcut ke view).
- **[MERGE]** 3 halaman detail → 1 detail; 4 form → 1 composer; 4 importer CSV → 1 import wizard; trash per proyek → global trash.
- **[MERGE]** Kartu ringkasan + attention filter → chip hitungan.
- **[REMOVE]** kind `ticket`, `qc`, `pengembangan` (typo); status `reopened`; "overdue" sebagai status; tombol refresh; teks "auto memilih project" di view global.

---

## 7. Fitur baru versi 2026

| # | Fitur | Label | Deskripsi singkat | Alasan | Dampak ke user | P | Effort |
|---|---|---|---|---|---|---|---|
| F1 | **Inbox Work Item + Saved Views** | [ADD] | Satu list universal; view bawaan: *Semua*, *Tugas saya*, **Triage Tiket** (status=triage, lintas proyek, chip overdue/unassigned/blocked/stale), **Ide & Pengembangan** (kind=idea, urut skor AI), *Menunggu QC saya*, *Didelegasikan ke agent*, *Bug terbuka*. User bisa membuat/berbagi view sendiri | Menggantikan 3 menu; pola ini dipakai Linear/Jira/Plane | Satu tempat kerja, view sesuai peran | P0 | L |
| F2 | **AI Triage** | [ADD-AI] | Untuk setiap item di `triage`: saran kind, priority, project, assignee (dari histori & beban kerja tim), tags, dengan confidence + alasan. Accept/decline per saran; auto-apply per properti bisa dikonfigurasi per proyek (default OFF) | Triage meeting jadi cepat; mengikuti pola Linear Triage Intelligence | Waktu triage turun, assignment lebih merata | P0 (kind/priority) / P1 (assignee) | M |
| F3 | **Deteksi duplikat** | [ADD-AI] | Similarity embedding saat mengetik di composer ("mungkin sama dengan PRJ-88") dan saat triage; aksi "tandai duplikat" → canceled + `duplicate_of_id` | Tiket dari banyak sumber sering kembar | Lebih sedikit kerja ganda | P0 | M |
| F4 | **Quick capture: teks bebas / screenshot / voice** | [ADD-AI] | Bar "Ketik, tempel screenshot, atau rekam suara". Contoh: "bug login google error 500 di staging, urgent, assign Budi" → draft item terisi. Screenshot → bug dengan langkah repro + environment terdeteksi. Voice → transkrip → 1..n draft item. Selalu draft untuk dikonfirmasi; masuk `triage` jika proyek tidak pasti. Pipeline ekstraksi dipakai bersama notulensi rapat A1 | Multimodal LLM sudah murah; Rovo "Work create" menangkap work dari chat, email, IDE, dan gambar | Membuat item < 10 detik, termasuk dari HP | P1 | M |
| F5 | **Sub-task generator** | [ADD-AI] | Tombol "Pecah jadi sub-task" di detail: AI usulkan checklist atau sub-item (judul, estimasi, saran assignee) dari deskripsi + acceptance criteria; user centang yang diambil | Pola "Work breakdown" (Rovo), "task breakdown" (Asana) | Perencanaan lebih cepat dan lengkap | P1 | S |
| F6 | **Ringkasan thread komentar** | [ADD-AI] | "Catch me up": TL;DR, keputusan, pertanyaan terbuka, siapa menunggu siapa. Otomatis ditawarkan jika komentar > 10 atau user baru di-assign. Di-cache di `ThreadSummary` dan diperbarui inkremental | Pola "Instant context" (Rovo) | Onboarding ke item lama dalam hitungan detik | P1 | S |
| F7 | **AI check pada evidence QC** | [ADD-AI] | Saat masuk `in_review`: AI mencocokkan evidence (screenshot, log, PR diff, URL preview) dengan acceptance criteria & checklist → verdict `pass / needs_attention / fail` + temuan ("kriteria #3 tidak terlihat di screenshot"). **Hanya informasi**; keputusan done tetap di reviewer | QC manual lambat dan tidak konsisten | Reviewer fokus pada temuan; rework berkurang | P1 | M |
| F8 | **AI agent sebagai delegate** | [ADD-AI] | Item bisa didelegasikan ke agent terdaftar (coding agent via integrasi Git/MCP, research agent, writer). Agent: memposting rencana → progress di komentar → melampirkan evidence (PR, dokumen) → memindahkan ke `in_review`. Panel "Agent run" menampilkan status, log, biaya, dan tombol stop. Manusia tetap assignee & reviewer. Guardrail: allowlist proyek, budget, approval untuk aksi berisiko | Linear, Jira/Rovo, dan Asana sudah menjadikan agent setara rekan kerja yang bisa diberi tugas | Pekerjaan rutin (bug kecil, dokumentasi, riset) jalan tanpa menunggu orang | P1 | L |
| F9 | **Smart CSV import** | [ADD-AI] | Mapping kolom otomatis dari header apa pun (export Jira/Trello/Asana/Sheets), normalisasi nilai ("urgent"→critical, "selesai"→done, nama → user via fuzzy match email), deteksi duplikat dengan item yang ada, preview dry-run dengan error per baris, simpan mapping sebagai preset, undo per batch | Header kaku `title,description,...` merepotkan; migrasi dari tool lain jadi mudah | Import tanpa edit CSV manual | P1 | M |
| F10 | **Ide → task dengan AI scoring** | [ADD-AI] | Untuk kind=idea: AI memberi skor impact/effort/confidence (dan reach jika ada data) + alasan, mengelompokkan ide yang mirip, dan menyarankan "quick win" (impact tinggi, effort rendah). Skor bisa di-override manusia; promote memakai F5 untuk memecah jadi task | Review ide berkala butuh dasar keputusan | Backlog ide terprioritaskan, bukan sekadar daftar | P2 | M |
| F11 | **Readiness check** | [ADD-AI] | Sebelum `triage→open` / delegasi ke agent: AI menandai deskripsi kabur, acceptance criteria kosong, atau info repro bug yang kurang, lalu menyarankan pertanyaan ke reporter | Pola "Work Readiness Checker" di Jira; agent butuh spesifikasi jelas | Lebih sedikit bolak-balik | P2 | S |
| F12 | **Saran estimasi** | [ADD-AI] | Estimasi jam dari item serupa yang sudah selesai (actual vs estimate) | Estimasi manual sering meleset | Planning lebih realistis | P2 | S |
| F13 | **Filter bahasa natural** | [ADD-AI] | "bug critical belum di-assign di proyek Payment minggu ini" → filter terstruktur yang bisa disimpan sebagai view. (NL Q&A atas data proyek ada di A1) | Filter bertingkat sulit dirakit | Membuat view tanpa belajar UI filter | P1 | S |
| F14 | **Intake channel untuk tiket** | [ADD] | Form intake publik/internal, email-to-ticket, perintah chat (Slack/Teams), dan dari ekstraksi rapat (A1). Semua masuk `triage` dengan `source` | note.md tidak menjelaskan dari mana tiket "masuk" | Stakeholder non-tim bisa melapor | P1 | M |
| F15 | **MCP server & API work item** | [ADD] | Tool MCP: search/get/create/update/comment/attach evidence dengan scope permission per token. Dipakai agent eksternal (Claude Code, Cursor, dll.) dan F8 | MCP jadi standar integrasi agent 2025–2026; Linear sudah punya MCP server | Developer update task langsung dari IDE/agent | P1 | M |
| F16 | **Bulk actions + command palette** | [ADD] | Multi-select + aksi massal (lihat L14), ⌘K untuk semua aksi, shortcut keyboard | Kecepatan triage | – | P0 (bulk) / P2 (palette) | S |
| F17 | **Nudge stale otomatis** | [ADD-AI] | Item stale → AI menulis follow-up singkat ke assignee ("masih jalan? perlu bantuan?") atau menyarankan cancel/merge. Harus selaras dengan ghost reminder A1 (satu mesin, beda kanal) | Item zombie mengotori backlog | Backlog bersih | P2 | S |

---

## 8. Risiko & mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| **Salah klasifikasi / salah assign oleh AI triage** | Item ke orang yang salah, prioritas keliru | Default *suggest*, auto-apply opt-in per properti; tampilkan confidence + alasan; ukur acceptance rate di `AISuggestion` dan matikan auto-apply jika akurasi di bawah ambang |
| **False positive duplikat** | Item valid tertutup | Tidak pernah auto-close; "tandai duplikat" butuh klik manusia; canceled bisa dipulihkan |
| **Prompt injection lewat tiket/komentar/screenshot dari luar** | Agent menjalankan instruksi jahat (bocor data, push kode) | Konten intake diberi label *untrusted*; agent tidak bisa memakai instruksi dari body tiket sebagai perintah sistem; scope MCP minimal; aksi berisiko (merge PR, hapus, akses rahasia) wajib approval manusia; audit log |
| **Agent mengerjakan hal yang salah / biaya membengkak** | Waktu reviewer terbuang, tagihan AI | Readiness check sebelum delegasi; agent wajib posting rencana dulu (opsi approval); budget per run/proyek; tombol stop; agent tidak bisa `done` |
| **AI QC check "pass" palsu** | Bug lolos ke produksi | Verdict hanya informasi; keputusan done oleh reviewer manusia; tampilkan kriteria yang *tidak* bisa diverifikasi AI |
| **Privasi screenshot/voice** (PII, data pelanggan di screenshot) | Kebocoran data ke vendor AI | Redaksi PII opsional sebelum kirim ke model; kebijakan retensi audio (simpan transkrip, hapus audio setelah N hari); pilihan model/region; selaras dengan kebijakan rekaman rapat A1 |
| **Import CSV massal yang salah** | Ratusan item sampah | Dry-run wajib, preview error, undo per batch (`ImportJob.created_item_ids`) |
| **Perubahan kebiasaan user** (menu Ticket/Ide hilang) | Resistensi, bingung | Nama & posisi sidebar dipertahankan sebagai saved view; banner migrasi; masa transisi 1 rilis |
| **Migrasi status `reopened`/kind `ticket` & `qc`** | Angka KPI historis berubah | Simpan nilai lama di `legacy_kind`/`legacy_status` (kolom sementara); laporan rekonsiliasi sebelum cut-over; koordinasi definisi KPI dengan A1/A2 |
| **Konflik tulis manusia vs agent** | Perubahan saling menimpa | Optimistic locking (`version`) + aktivitas real-time |

---

## 9. Asumsi

1. Instruksi "catat inkonsistensi di note.md" dibaca sebagai *mencatat inkonsistensi yang ditemukan di note.md*. BRIEF melarang mengubah `note.md`, jadi semua catatan ada di §3 dokumen ini.
2. "Ticket" = permintaan/laporan masuk dari berbagai proyek yang perlu di-triage, bukan jenis pekerjaan yang berbeda secara substansi (sesuai deskripsi "papan tiket masuk… dipakai untuk triage saat meeting").
3. "QC" = tahap review oleh orang lain sebelum closed, bukan tim terpisah dengan backlog sendiri. Jika ada tim QA dengan pekerjaan testing sendiri, cukup kind `task` + tag `qa`.
4. Workflow status v1 **tetap (fixed)** untuk semua proyek; label bisa diganti. Workflow kustom per proyek = P2.
5. Ide boleh lintas proyek (`project_id` null), sesuai "catatan ide & usulan pengembangan lintas proyek".
6. Ukuran tim kecil–menengah (puluhan user, ribuan item per proyek); pencarian semantik & triage bisa memakai embedding per workspace.
7. Agent AI diintegrasikan lewat registry + MCP/integrasi Git; produk tidak membangun coding agent sendiri.
8. Hak akses mengikuti role proyek yang ada (PM, Member, Viewer). Viewer tidak bisa men-delegasikan ke agent.
9. Klaim produk pihak ketiga hanya diambil dari halaman yang dibuka pada riset (lihat Sumber). Detail yang tidak terlihat langsung ditandai "(perlu verifikasi)".

## 10. Pertanyaan terbuka

1. Siapa pengirim tiket: hanya anggota internal, atau juga klien/stakeholder eksternal? Ini menentukan perlu tidaknya F14 (form publik) dan tingkat keamanan injection.
2. Apakah QC wajib dilakukan orang yang berbeda dari assignee (separation of duty)? Default rekomendasi: ya untuk bug, opsional untuk task.
3. Apakah `reopen_count`/`rework_count` dipakai sebagai KPI kualitas per orang? Sensitif; rekomendasi hanya di level tim.
4. Promote ide: konversi di tempat (Opsi A) atau buat task baru tertaut (Opsi B) sebagai default?
5. Agent apa saja yang ditargetkan di rilis pertama (coding agent, research, dokumentasi)? Siapa yang menanggung biaya?
6. Apakah retensi trash 30 hari sudah sesuai kebijakan data, dan apakah item hasil agent butuh retensi audit lebih lama?
7. Apakah label status "Ready for QC" ingin dipertahankan sebagai istilah tim, atau diganti jadi "In Review"?
8. Ambang stale/ghost (3 hari vs 7 hari) cukup satu default per kategori status, atau per proyek?

---

## Sumber (riset web, Oktober 2026)

- Linear Docs — *Triage Intelligence*: saran properti issue (team, project, assignee, label) dan duplikat via model agentic, accept/decline + alasan, bisa auto-apply per properti; paket Business/Enterprise. https://linear.app/docs/triage-intelligence
- Linear Docs — *AI Agents*: agent sebagai "app users" yang bisa di-mention, didelegasikan issue, dan berkomentar; human assignee tetap owner; "agent guidance". https://linear.app/docs/agents-in-linear
- Linear Docs — *Assign and delegate issues*: delegasi ke agent sambil manusia tetap assignee. https://linear.app/docs/assigning-issues (menu docs juga memuat "MCP server").
- Atlassian — *Rovo in Jira: AI features*: assign work ke agent, "Work Readiness Checker Agent", "Work create" (dari Confluence, Slack, email, IDE, gambar), "Work breakdown", "Instant context", Rovo Dev mengubah work item jadi kode. https://www.atlassian.com/software/jira/ai
- Asana — *AI Teammates*: 30+ agent prebuilt dengan shared context Work Graph; "Work Intake Specialist" (klasifikasi & routing intake, skor prioritas & SLA); "Project Manager" (task breakdown, flag blocker). https://asana.com/product/ai/ai-teammates
- ClickUp — *Brain²*: positioning "AI Tasks", multi-model, context engine (halaman marketing; detail fitur triage (perlu verifikasi)). https://clickup.com/ai
- Penggunaan istilah "work item" di Jira terlihat di halaman Rovo; rename resmi "issue → work item" (perlu verifikasi).
