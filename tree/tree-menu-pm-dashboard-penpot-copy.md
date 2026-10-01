# Tree Menu PM Dashboard di Penpot

**Tanggal:** 1 Oktober 2026
**Target:** https://pm-dashboard.wibudev.com/ (aplikasi "Manajer Proyek")
**Output Penpot:** DRAFTS → TREE-MENU-PM → Page 1 (grup "Tree Menu - PM Dashboard (Detail)")

## 1. Konteks & Tujuan

User minta analisis menyeluruh seluruh menu, konten, dan fungsi tombol di dashboard PM, lalu divisualisasikan sebagai tree percabangan (struktur menu & sub-menu) — pertama sebagai rencana teks, lalu dibangun ulang sebagai diagram visual di Penpot.

## 2. Tahap 1 — Reconnaissance dengan `ego-browser`

Browser automation dipakai untuk menjelajah seluruh sidebar menu (Ringkasan, Proyek, Task, Tiket, Pengembangan, Tim, Events) dan mencatat isi tiap tab/detail.

**Isu yang ditemukan saat recon:**
- Locator `text=Tim` sempat ambiguous (4 elemen match) → diperbaiki pakai exact match `text="Tim"`.
- Navigasi langsung ke `?tab=development` menghasilkan **500 error** server-side (`Cannot read properties of undefined (reading 'label')`). Rute yang benar via klik sidebar "Pengembangan" ternyata mengarah ke `?tab=ideas`. Ini kemungkinan bug di aplikasi, perlu dilaporkan ke tim dev.

Hasil recon ini menjadi basis tree pertama (versi sederhana: 7 menu utama + sub-tab).

## 3. Tahap 2 — Setup Koneksi Penpot MCP

- `.mcp.json` sudah mendefinisikan server `penpot` (HTTP, pakai `${PENPOT_TOKEN}` dari `.env`).
- Sempat terkendala: server `penpot` belum ter-connect di sesi awal (hanya `context-mode` yang terdaftar). User mengaktifkan ulang koneksi MCP, baru tool `mcp__penpot__*` bisa dipakai.
- Wajib baca `high_level_overview` Penpot API sebelum eksekusi kode apa pun (aturan dari tool itu sendiri).

## 4. Tahap 3 — Versi Pertama: Tree Sederhana (DIBATALKAN/DIBONGKAR)

Dibangun dengan `mcp__penpot__execute_code`, algoritma layout custom (hitung lebar subtree bottom-up, assign posisi x/y top-down):

- 22 node, 21 connector.
- Struktur: `MANAJER PROYEK` → 7 menu utama → sub-tab Proyek (Overview/Tasks/Team/Milestones/Phases/Lainnya→Extensions/Retro/Settings) & sub-tab Task (Checklist/Komentar/Evidence/Deps/Aktivitas).
- Node "Pengembangan" ditandai oranye sebagai flag bug `?tab=development → 500 error`.
- Node pakai ukuran box tetap (200x70), dua baris teks (judul + route tab).

**Masalah:** User merasa hasil ini "aneh" / kurang sesuai — terlalu dangkal dibanding rencana detail yang sebenarnya diinginkan (hanya nama tab, tidak mencakup isi tiap tab seperti KPI card, panel, filter, toolbar, dsb).

## 5. Tahap 4 — Versi Final: Tree Detail Sesuai Spesifikasi User

User memberikan outline ASCII tree yang jauh lebih detail (mencakup isi tiap tab: KPI card, chart, panel, toolbar, filter, dashboard mini, dsb untuk tiap 7 menu, termasuk sub-struktur **PROJECT DETAIL** dan **TASK DETAIL**).

**Langkah teknis:**
1. Hapus total seluruh shape di Page 1 (bongkar versi pertama).
2. Transkrip ulang seluruh outline user ke struktur data JS (object tree bersarang hingga 4 level).
3. Lebar node dibuat berbeda per depth: `[300, 300, 460, 460]` px (depth 2-3 lebih lebar karena isi teks panjang).
4. **Auto-sizing node**: tiap node adalah `Board` dengan Flex Layout (`dir: column`, `horizontalSizing: fix`, `verticalSizing: auto`) berisi satu `Text` dengan `growType: auto-height` + `layoutChild.horizontalSizing: fill`. Ini membuat tinggi box otomatis menyesuaikan panjang teks tanpa perlu hitung manual.
5. Posisi awal diberi offset besar per depth agar tidak overlap, lalu di-reflow: baca tinggi aktual tiap node (setelah `await sleep(300ms)` supaya auto-layout Penpot selesai render), hitung tinggi maksimum per baris (depth), baru reposisikan y final secara kumulatif per baris.
6. Connector digambar sebagai `Path` siku (elbow line: turun-horizontal-turun) dari bottom-center parent ke top-center child, dikirim ke `sendToBack()`.
7. Semua shape (124 total: 62 board + 62 text tergabung + 61 connector + title) dikelompokkan jadi 1 grup "Tree Menu - PM Dashboard (Detail)".

**Hasil akhir:**
- 62 node (board), 61 connector.
- 4 level: Root → 7 Menu Utama → Bullet Detail per Menu → Sub-bullet PROJECT DETAIL / TASK DETAIL.
- Lebar kanvas total ±25.960px (karena sangat detail) — perlu "zoom to fit" di Penpot untuk lihat keseluruhan.
- Verifikasi visual: export grup penuh (untuk cek struktur keseluruhan) + export cabang "Proyek" saja (untuk cek detail PROJECT DETAIL) + export 1 node teks terpanjang ("Tab Tasks...") untuk pastikan word-wrap rapi, tidak terpotong/overflow.

## 6. Struktur Tree Final (ringkas)

```
MANAJER PROYEK
├── 1. Ringkasan (tab=overview) — 4 bullet (KPI card, chart, panel "Perlu Perhatian", panel "Snapshot Minggu Ini")
├── 2. Proyek (tab=projects) — 5 bullet (Header, Quick filter, Toolbar, List proyek, PROJECT DETAIL)
│   └── PROJECT DETAIL — 8 bullet (Tab Overview/Tasks/Team/Milestones/Phases, Tombol Back, Tombol refresh, Menu Lainnya)
├── 3. Task (tab=tasks) — 9 bullet (Deskripsi, Toolbar, Dashboard ringkas, Filter panel, Quick filter, View mode, Mode Select, List task, TASK DETAIL)
│   └── TASK DETAIL — 9 bullet (Header, Deskripsi, Tab, Panel kanan, Pengaturan, People, Planning, Tags, Stat)
├── 4. Tiket (tab=tickets) — 5 bullet
├── 5. Pengembangan (tab=ideas) — 5 bullet
├── 6. Tim (tab=team) — 5 bullet
└── 7. Events (tab=events) — 4 bullet
```

## 7. Detail Flow CRUD — Proyek & Task

Bagian ini melengkapi ringkasan di Section 6 (yang hanya mencatat jumlah bullet per tab) dengan detail field-level hasil investigasi langsung via `ego-browser` di live app, fokus pada 4 flow: **Create, Edit, Detail, Delete** untuk Proyek dan Task.

### 7.1 Proyek

**Create — dialog "Proyek Baru"**
Dipicu tombol "New Project" di toolbar list Proyek. 3 section:
- **INFO DASAR**: Nama proyek\* (text, wajib) · Deskripsi (textarea, opsional, counter karakter 0/280)
- **KLASIFIKASI**: Status — button group pick-one: Draft / Active / On hold / Completed / Cancelled · Prioritas — button group pick-one: Low / Medium / High / Critical
- **TIMELINE**: Mulai (date, opsional) · Selesai (date, opsional) · shortcut cepat: 1 minggu / 2 minggu / 1 bulan / 3 bulan (auto-isi Selesai relatif ke Mulai)
- Footer: shortcut keyboard `⌘+Enter` untuk simpan, tombol Batal, tombol Buat Proyek.

**Edit — tab Settings di Project Detail**
Diakses via: (a) ikon pensil di kartu proyek pada list (deep link langsung `?detailTab=settings`), atau (b) menu "Lainnya" (...) di Project Detail → item Settings. Menu Lainnya sendiri hanya berisi 3 item: **Extensions, Retro, Settings** — tidak ada opsi hapus di sini.

Isi tab Settings:
- **Project details**: Name\* (text) · Description (textarea) · Status (dropdown, 5 opsi sama seperti Create) · Priority (dropdown, 4 opsi sama seperti Create) · Visibility (dropdown, mis. "Internal — semua user bisa lihat", dengan helper text "Semua user bisa melihat; hanya anggota yang bisa mengubah task.") · Start date & End date (date picker dengan ikon kalender) · baris info read-only "Original deadline: ..." (tanggal deadline awal/baseline, tidak diubah dari form ini) · tombol **Save changes** (eksplisit, bukan autosave).
- **GitHub integration**: input "GitHub repo" (terima URL penuh atau format `owner/repo`) + tombol "Link repo" — menautkan commit/PR/review sebagai activity project.
- **Access Tokens**: tombol "Buat Token" + tabel token per-project (Nama, Prefix, Scope WRITE/READ, Status, Dipakai terakhir, Kedaluwarsa, aksi revoke) — dipakai agent coding (mis. Claude Code) untuk baca/update task-bug-tiket project ini.

**Detail — Project Detail (tab Overview)**
- Header: judul proyek + badge (Status / Prioritas / Role / Health, mis. `ACTIVE · MEDIUM · PM · EXTENDED`)
- Tab bar: Overview / Tasks (jumlah) / Team (jumlah) / Milestones (jumlah) / Phases (jumlah) + menu "Lainnya" (...) + akses langsung ke Settings
- Overview: stat card **MEMBERS / TASKS / MILESTONES / TIMELINE**, card **Dates** (rentang tanggal mulai–selesai), card **Task progress** (progress bar + persentase), list **Team member** (nama + role)

**Delete — tidak ditemukan di UI**
Sudah dicek menyeluruh: tab Settings, menu Lainnya (Extensions/Retro/Settings), dan tabel Proyek di Admin — **tidak ada opsi hapus proyek di manapun di UI**. Kemungkinan: hapus proyek hanya lewat API/DB langsung, dibatasi ke role yang belum dicek, atau memang belum diimplementasi. Perlu dikonfirmasi ke tim dev jika fitur ini memang dibutuhkan.

### 7.2 Task

**Create — dialog "New Task"**
Dipicu tombol "New Task" di toolbar list Task. Field utama: Kind/Tipe (dropdown 5 opsi — TASK, BUG, QC, TICKET, IDEA), Judul, **Deskripsi (wajib diisi** — beda dari Proyek yang opsional), Prioritas, Assignee, tanggal due, dll (sudah didokumentasikan di sesi sebelumnya).

**Edit — inline langsung di dialog Task Detail (tidak ada form edit terpisah)**
Task tidak punya mode "Edit" tersendiri seperti Proyek (tab Settings) — semua field diedit **inline** di dialog yang sama dengan tampilan Detail:
- Judul → ikon pensil di sebelah judul → rename inline
- Deskripsi → ikon pensil di section "DESKRIPSI" → edit inline
- **UBAH STATUS**: toggle button OPEN / CLOSED, berubah langsung saat diklik
- **PENGATURAN**: dropdown Tipe (kind), dropdown Prioritas, dropdown Assignee (dengan avatar, bisa dikosongkan lewat tombol "×")
- **PLANNING**: date picker Mulai, date picker Tenggat (due date), input Estimate (hours), field Actual (wall clock) — semua opsional
- Tidak ada tombol "Save" eksplisit untuk field-field ini — perubahan tersimpan per-field begitu value diubah (pola inline-edit/autosave), berbeda dari Proyek yang pakai tombol "Save changes" eksplisit.

**Detail — dialog Task Detail (modal, bukan halaman penuh)**
Terbuka saat klik judul task di Kanban/List:
- Header: breadcrumb (Tasks > [nama proyek] > [judul task]), ikon copy, ikon refresh, **ikon trash/delete**
- Judul + ikon pensil (edit)
- Badge: Kind (TASK/BUG/QC/TICKET/IDEA) / Status (mis. IN PROGRESS) / Prioritas (mis. MEDIUM)
- Metadata: `#id-task · nama proyek · nama assignee · tanggal due`
- Section **DESKRIPSI** + ikon pensil
- 5 tab: **Checklist** (list item + input "Add item" + tombol Add), **Komentar**, **Evidence**, **Deps** (dependencies), **Aktivitas** (riwayat/log)
- Panel kanan: **UBAH STATUS** (OPEN/CLOSED), **PENGATURAN** (Tipe/Prioritas/Assignee), **PEOPLE** (Reporter, Assignee), **PLANNING** (Mulai, Tenggat, Estimate, Actual)

**Delete — dua lapis**
1. **Hapus per-task**: ikon trash di header dialog Task Detail (sebelah ikon refresh, kanan atas). ⚠️ *Tidak diklik/dieksekusi selama investigasi ini, sesuai instruksi eksplisit user ("jangan hapus lo ya") — keberadaannya hanya dikonfirmasi lewat screenshot, bukan lewat eksekusi nyata.*
2. **Task Trash (arsip hasil hapus)**: ikon "Lihat Trash" di toolbar list Task (sebelah tombol "New Task") membuka list task yang sudah dihapus — menampilkan nama penghapus, tanggal hapus, dan **Alasan (reason)** yang tercatat. Tiap baris punya ikon Restore (diduga, bentuk panah berlawanan jarum jam) dan ikon Permanent delete (diduga, bentuk api/flame); kedua ikon ini **tidak punya `aria-label`/`title`** sehingga maknanya hanya tafsiran visual, belum terkonfirmasi lewat teks aksesibilitas — dan tidak satupun diklik selama investigasi.

> Catatan kehati-hatian: alur pasti "klik ikon trash di Task Detail → (kemungkinan) muncul dialog konfirmasi + input Alasan → task masuk ke Trash" adalah **inferensi dari potongan bukti** (ikon trash ada di header + Trash view mencatat field Alasan), bukan hasil klik langsung — supaya tidak melanggar instruksi user untuk tidak menghapus apa pun.

## 8. Hal yang Perlu Diperhatikan / Tindak Lanjut

- Bug `?tab=development` (500 error) belum dilaporkan ke tim dev aplikasi pm-dashboard — hanya dicatat di versi tree pertama (tidak dibawa ke versi final karena tidak ada di spesifikasi outline user).
- Lebar kanvas sangat besar (~26.000px) — jika ingin diekspor sebagai gambar presentasi, sebaiknya dipecah per cabang (per 1 dari 7 menu) daripada 1 gambar utuh, karena 1 gambar utuh tidak terbaca di skala normal.
- Belum dilakukan: export per-cabang (Ringkasan, Proyek, Task, Tiket, Pengembangan, Tim, Events) sebagai 7 gambar terpisah — ditawarkan ke user tapi belum dikonfirmasi.
- Opsi hapus proyek tidak ditemukan di UI (lihat Section 7.1) — perlu klarifikasi ke tim dev apakah ini memang disengaja atau belum diimplementasi.
- Alur eksekusi hapus task (klik ikon trash di Task Detail) belum pernah benar-benar diklik/diverifikasi end-to-end — hanya diamati keberadaannya, sesuai batasan yang diminta user.

## 9. Tools & Teknik yang Dipakai

- `ego-browser` skill — reconnaissance website & investigasi field-level flow Create/Edit/Detail/Delete.
- Penpot MCP tools: `mcp__penpot__high_level_overview`, `mcp__penpot__execute_code`, `mcp__penpot__export_shape`, `mcp__penpot__penpot_api_info`.
- Penpot Plugin API: `createBoard`, `createText`, `createPath`, `addFlexLayout`, `penpotUtils.findShape(s)`, `penpotUtils.shapeStructure`, `penpot.group`/`ungroup`.
- Algoritma layout tree custom (subtree-width bottom-up + top-down positioning), diimplementasikan langsung sebagai JS yang dieksekusi di dalam konteks plugin Penpot.
