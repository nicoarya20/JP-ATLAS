# Rangkuman Kompetitor: Linear

**Tanggal riset:** 2026-09-27  
**Metode:** Eksplorasi langsung via ego-browser ke linear.app (akun aktif, workspace "nico-project")  
**URL:** https://linear.app

---

## Gambaran Umum

Linear adalah platform manajemen isu dan proyek yang dirancang khusus untuk tim software development. Linear memposisikan diri sebagai "the issue tracker built for high-performance teams" — bukan project manager generik, melainkan tool yang speed-first, keyboard-centric, dan sangat terintegrasi dengan workflow developer (GitHub, branch, PR). Didirikan 2019, kini menjadi salah satu PM tool favorit startup teknologi di dunia.

---

## Struktur Navigasi Utama

Linear menggunakan **sidebar kiri** dengan dua lapisan: navigasi Personal di atas dan navigasi per-Tim di bawah. Semua halaman bertitik tolak dari URL `https://linear.app/{workspace}/`.

### 1. PERSONAL (selalu tampil, untuk semua pengguna)

| Menu | Route | Fungsi |
|------|-------|--------|
| **Inbox** | `/inbox` | Semua notifikasi masuk: mentions, balasan komentar, issue yang ditugaskan, update dari issue yang di-follow. Ada badge angka merah untuk yang belum dibaca. |
| **My Issues** | `/my-issues/assigned` | Tampilan personal semua issue yang berhubungan dengan pengguna saat ini. |
| └ Assigned | `/my-issues/assigned` | Issue yang ditugaskan ke pengguna ini |
| └ Created | `/my-issues/created` | Issue yang dibuat oleh pengguna ini |
| └ Subscribed | `/my-issues/subscribed` | Issue yang di-follow (subscribe) pengguna ini |
| └ Activity | `/my-issues/activity` | Riwayat seluruh aktivitas pengguna di workspace |
| **Agent** | `/agent` | Asisten AI bawaan Linear. Bisa membuat issue, menanyakan status project, meminta ringkasan pekerjaan via natural language chat. Dilengkapi riwayat percakapan. |

### 2. WORKSPACE (lintas semua tim dalam satu organisasi)

| Menu | Route | Fungsi |
|------|-------|--------|
| **Projects** | `/projects/all` | Semua project di seluruh workspace, bisa melibatkan lebih dari satu tim. Tiap project punya status, target tanggal, dan kumpulan issues. |
| **Views** | `/views/issues` | Custom views — filter issue yang sudah disimpan. Bisa share ke tim. |
| └ Issues view | `/views/issues` | Custom view untuk issues |
| └ Projects view | `/views/projects` | Custom view untuk projects |
| **Members** | `/members` | Daftar semua anggota workspace: nama, role (Admin/Member), tim yang diikuti, waktu terakhir aktif. Fitur invite anggota baru. |
| **Teams** | `/teams` | Daftar semua tim di workspace: ringkasan anggota, jumlah project aktif, opsi bergabung atau buat tim baru. |

> **Catatan:** Menu Members dan Teams tersembunyi di balik tombol **"More"** di sidebar — tidak langsung terlihat saat pertama buka app.

### 3. TEAM (per-tim, kode tim bervariasi tiap workspace)

Setiap tim memiliki sub-menu sendiri yang dapat diakses dari bagian "Your teams" di sidebar.

| Menu | Route | Fungsi |
|------|-------|--------|
| **Home / Overview** | `/team/{ID}/overview` | Halaman utama tim: nama, deskripsi, anggota, resources (dokumen & link penting), shortcut ke sub-halaman lain. |
| └ Documents | `/team/{ID}/documents` | Dokumen internal tim |
| └ Members | `/team/{ID}/members` | Daftar anggota tim |
| **Issues** | `/team/{ID}/active` | Daftar semua issue tim. Inti dari Linear. Ada tiga sub-tab: |
| └ Active | `/team/{ID}/active` | Issue yang sedang dalam pengerjaan |
| └ Backlog | `/team/{ID}/backlog` | Issue yang belum dimulai, antrean pekerjaan |
| └ All issues | `/team/{ID}/all` | Seluruh issue termasuk yang sudah selesai |
| **Projects** | `/team/{ID}/projects/all` | Projects khusus untuk tim ini (berbeda dengan Projects workspace yang lintas tim) |
| **Views** | `/team/{ID}/views/issues` | Custom views khusus tim ini |

### 4. HALAMAN DETAIL ISSUE

**Route:** `/issue/{ISSUE_ID}/{slug}`  
**Contoh:** `/issue/NIC-1/get-familiar-with-linear`

Komponen dalam halaman issue:
- Judul & deskripsi (editor teks kaya, bisa embed video)
- **Properties panel** (sidebar kanan): Status, Prioritas (None/Urgent/High/Medium/Low), Assignee, Label, Project
- Sub-issues (breakdown tugas besar menjadi lebih kecil)
- Tombol copy URL, copy ID, copy branch name, copy as AI prompt
- Section **Activity**: komentar tim + log perubahan otomatis (siapa ubah apa & kapan)
- Navigasi antar issue (panah atas/bawah)

Status default: **Todo → In Progress → Done** (bisa dikustomisasi per tim)

### 5. SETTINGS

**Route dasar:** `/settings/`

#### Personal
| Sub-halaman | Route |
|-------------|-------|
| Preferences (default home, display name, font size) | `/settings/account/preferences` |
| Profile | `/settings/account/profile` |
| Notifications | `/settings/account/notifications` |
| Code & reviews | `/settings/account/code-and-reviews` |
| Security & access | `/settings/account/security` |
| Connected accounts | `/settings/account/connections` |
| Agent personalization | `/settings/account/agents` |

#### Issues & Projects
| Sub-halaman | Route |
|-------------|-------|
| Issue Labels | `/settings/issue-labels` |
| Issue Templates | `/settings/issue-templates` |
| SLAs | `/settings/sla` |
| Project Labels | `/settings/project-labels` |
| Project Templates | `/settings/project-templates` |
| Project Statuses | `/settings/project-statuses` |
| Project Updates | `/settings/project-updates` |

#### Features (Fitur Tambahan — bisa diaktifkan/nonaktifkan)
| Sub-halaman | Route |
|-------------|-------|
| AI & Agents | `/settings/ai` |
| Loops | `/settings/loops` |
| Initiatives | `/settings/initiatives` |
| Documents | `/settings/documents` |
| Customer requests | `/settings/customer-requests` |
| Releases | `/settings/releases` |
| Pulse | `/settings/pulse` |
| Asks | `/settings/asks` |
| Emojis | `/settings/emojis` |
| Integrations | `/settings/integrations` |

#### Administration (Admin only)
| Sub-halaman | Route |
|-------------|-------|
| Workspace | `/settings/workspace` |
| Teams | `/settings/teams` |
| Members | `/settings/members` |
| Security | `/settings/security` |
| API | `/settings/api` |
| Applications | `/settings/applications` |
| Billing | `/settings/billing` |
| Usage & limits | `/settings/usage` |
| Import & export | `/settings/import-export` |

### 6. HELP MENU (tombol `?` pojok kiri bawah)

| Item | Keterangan |
|------|------------|
| Docs | Dokumentasi resmi Linear |
| Contact us | Hubungi support |
| Keyboard shortcuts | Daftar semua shortcut (Cmd+/) |
| Linear status | Status uptime server (linearstatus.com) |
| Download apps | App desktop Mac/Windows |
| Settings | Shortcut ke Settings |
| Slack community | Komunitas pengguna Linear |
| Changelog / What's new | Update fitur terbaru |

---

## Fitur-Fitur Unggulan

### Issue Tracking
- Penomoran otomatis per tim: `NIC-1`, `NIC-2`, dst. — mudah dijadikan referensi di chat/meeting
- Priority levels: No Priority, Urgent, High, Medium, Low
- Labels, Assignee, Due date, Project — semuanya di satu panel kanan
- Sub-issues untuk breakdown tugas besar
- Copy branch name langsung dari issue — integrasi Git sangat mulus

### AI Agent (Linear AI)
- Chat interface di `/agent` — bisa membuat issue, query status, summarize dengan natural language
- "Copy as prompt" di setiap issue — kirim konteks issue ke coding AI tool
- "Choose coding tool" untuk integrasi langsung ke editor
- Skills system untuk memperluas kemampuan Agent

### Views & Filtering
- Custom views dengan filter kombinasi apapun (status, label, assignee, prioritas, dll.)
- Views bisa disimpan, dibagikan ke tim, atau dijadikan favorit
- Display options: list, board, timeline — bisa ganti tampilan di setiap view

### Integrasi
Langsung tersedia di Settings > Integrations:
- **Developer tools:** GitHub, GitLab, Bitbucket, Sentry
- **Komunikasi:** Slack, Discord
- **Design:** Figma
- **Productivity:** Notion, Zendesk, Intercom, PagerDuty, Datadog
- **Auth/SSO:** Google, GitHub OAuth

---

## Keunggulan

1. **Kecepatan luar biasa** — salah satu PM tool paling responsif; navigasi antar halaman hampir instan
2. **Design minimalis & bersih** — tidak ada clutter visual, fokus pada konten
3. **AI Agent bawaan** — bisa berinteraksi dengan workspace via chat tanpa perlu paham semua menu
4. **Integrasi developer sangat dalam** — copy branch name, GitHub PR link di issue, Sentry error tracking
5. **Penomoran issue yang jelas** — `NIC-1`, `NIC-2` memudahkan referensi di lintas platform
6. **Activity log otomatis** — setiap perubahan tercatat: siapa, apa, kapan
7. **Status workflow yang fleksibel** — bisa dikustomisasi per tim
8. **Sub-issues** — breakdown tugas besar dengan mudah
9. **Custom views yang powerful** — filter kombinasi apapun, bisa disimpan dan dibagikan
10. **Keyboard shortcut ekosistem** — sangat efisien untuk power user

---

## Kelemahan

1. **Jargon developer-centric** — "Issues" (bukan Tugas), "Backlog", "Triage", "Cycles", "SLA" — istilah asing untuk non-developer
2. **Tidak ada onboarding terpandu** — pengguna baru langsung dilempar ke app lengkap tanpa wizard
3. **Keyboard shortcut-heavy** — banyak fitur utama hanya mudah diakses via shortcut keyboard; tidak intuitif untuk pemula
4. **Font & ikon terlalu kecil** — default font sangat kecil; banyak ikon tanpa label teks
5. **Hierarki 4 level** — Workspace → Team → Project → Issue; membingungkan pengguna awam
6. **Settings terlalu kompleks** — 20+ sub-halaman; sulit dinavigasi pengguna non-teknis
7. **Fitur tersembunyi** — Members, Teams ada di balik tombol "More"; tidak langsung terlihat
8. **Tidak ada lokalisasi** — seluruh interface dalam Bahasa Inggris
9. **Tidak ada undo yang jelas** — pengguna awam takut salah klik karena tidak ada safety net yang obvious
10. **Mobile bukan prioritas** — ada app mobile, tapi pengalaman optimal hanya di desktop/laptop

---

## Analisis Khusus: Kemudahan untuk Orang Awam & Orang Tua

| Aspek | Skor | Catatan |
|-------|------|---------|
| Kemudahan awal (first impression) | 3/10 | Tidak ada onboarding, langsung antarmuka kompleks |
| Keterbacaan UI | 5/10 | Bersih tapi font kecil, banyak ikon tanpa label |
| Bahasa & istilah | 2/10 | Semua jargon teknis dalam Bahasa Inggris |
| Kecepatan app | 9/10 | Salah satu PM tool tercepat yang ada |
| Fitur AI (membantu pemula) | 8/10 | Agent bisa jadi jembatan pengguna bingung UI |
| Aksesibilitas mobile | 5/10 | Ada app, tapi bukan pengalaman utama |

### Cocok untuk:
- Tim software developer
- Startup yang bergerak cepat dengan banyak issue
- Product Manager yang sudah familiar dengan Agile/Scrum
- Tim yang butuh integrasi GitHub/GitLab dalam

### Kurang cocok untuk:
- Orang tua / lansia (font kecil, ikon tanpa label, semua dalam Inggris)
- Pengguna non-teknis tanpa pendampingan (HR, Marketing, Keuangan)
- Tim yang utamanya bekerja via smartphone
- Pemula tanpa background di software development

### Rekomendasi jika harus menggunakan Linear:
1. **Manfaatkan AI Agent** sebagai pintu masuk utama — ajari pengguna awam untuk mengetikkan permintaan natural ke Agent daripada menjelajahi menu
2. **Besarkan font** via Settings → Preferences → Font size
3. **Bookmark langsung** ke halaman Issues tim yang relevan, jangan mulai dari homepage
4. **Buatkan panduan screenshot** dalam Bahasa Indonesia untuk alur kerja yang paling sering dilakukan

---

## Perbandingan Singkat dengan Kompetitor

| Aspek | Linear | Asana | Notion | ClickUp | Monday |
|-------|--------|-------|--------|---------|--------|
| Target utama | Developer/Tech | Tim umum | Knowledge worker | Semua tim | Tim bisnis |
| Kemudahan awam | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Kecepatan app | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Integrasi dev | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| AI bawaan | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Mobile | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

*Riset dilakukan dengan menjelajahi langsung antarmuka Linear via ego-browser. Workspace yang digunakan: "nico-project" (fresh workspace). Semua path route dicatat dari URL aktual saat navigasi.*
