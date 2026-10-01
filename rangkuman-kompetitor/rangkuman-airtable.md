# Rangkuman Kompetitor: Airtable

**Tanggal riset:** 2026-09-27  
**Metode:** Eksplorasi langsung via ego-browser ke airtable.com (akun aktif, Free Plan) + [www.airtable.com](http://www.airtable.com) (marketing site)  
**URL:** [https://airtable.com](https://airtable.com) | [https://www.airtable.com](https://www.airtable.com)

---

## Gambaran Umum

Airtable adalah platform **"connected apps platform"** yang memposisikan diri sebagai persilangan antara spreadsheet dan relational database — bukan task manager murni, bukan spreadsheet biasa, tapi keduanya sekaligus. Target utama: tim marketing, product, dan operasional di perusahaan menengah-besar yang butuh fleksibilitas tinggi tanpa harus menulis kode.

Sejak 2024–2026, Airtable semakin agresif mendorong fitur **AI (Airtable AI / Omni)** sebagai keunggulan kompetitif — AI bisa dipakai untuk setup base dari deskripsi bahasa biasa, generate field, dan otomasi workflow. Airtable juga baru merilis **AI Agents** dan **HyperDB** (dataset hingga 100 juta record) sebagai produk enterprise.

---

## Arsitektur / Hierarki Konten

```
Workspace
  └── Base / App (app[Id])
        ├── Table 1
        │    ├── View 1 (Grid, Kanban, Calendar, dsb)
        │    └── View 2
        └── Table 2

Base memiliki 4 bagian:
  ├── Data          → tabel + view
  ├── Automations   → workflow trigger-action
  ├── Interfaces    → custom UI / mini-app
  └── Forms         → form pengumpulan data
```

---

## Struktur Navigasi — Dashboard App (airtable.com)

### Sidebar Kiri


| Menu                     | Path / URL     | Fungsi                                                       |
| ------------------------ | -------------- | ------------------------------------------------------------ |
| **Home**                 | `/`            | Halaman utama — base &amp; workspace yang baru dibuka        |
| **Starred**              | `/starred`     | Base, interface, workspace yang di-favorit untuk akses cepat |
| **Shared**               | `/shared`      | Konten yang dibagikan orang lain ke akun ini                 |
| **Workspaces**           | `/workspaces`  | Daftar semua workspace — wadah pengelompokan base            |
| **Templates &amp; Apps** | modal          | Buka modal pemilihan template — ratusan kategori             |
| **Marketplace**          | `/marketplace` | Ekstensi &amp; plugin (By Airtable + third-party)            |
| **Import**               | modal          | Upload Excel, CSV, Google Sheets, atau paste data            |
| **Create**               | modal          | Buat base baru: AI (Omni), template, upload, blank           |


---

### Top Bar (Header Atas)

#### Search Global

- Shortcut: **⌘K** — command palette universal
- Fungsi: cari base, tabel, record, atau perintah

#### Help Menu (Dropdown)


| Item                | Fungsi                                    |
| ------------------- | ----------------------------------------- |
| Help Center         | Dokumentasi resmi di support.airtable.com |
| Ask Community       | Forum komunitas pengguna                  |
| Message Support     | Hubungi tim support langsung              |
| Contact Sales       | Diskusi paket Enterprise                  |
| Keyboard Shortcuts  | Panduan shortcut keyboard lengkap         |
| Webinars            | Sesi training online dari Airtable        |
| What's New          | Update produk &amp; fitur terbaru         |
| API Documentation   | REST API docs untuk developer             |
| Plans &amp; Pricing | Perbandingan semua plan                   |


#### Account Menu (Dropdown)


| Item               | Path       | Fungsi                                          |
| ------------------ | ---------- | ----------------------------------------------- |
| Account            | `/account` | Profil, API key, Google Drive, privacy settings |
| Manage Groups      | —          | Kelola grup kolaborator (Business+)             |
| Notification Prefs | —          | Atur notifikasi email &amp; in-app              |
| Language Prefs     | —          | Bahasa tampilan antarmuka                       |
| Appearance (Beta)  | —          | Light / dark mode                               |
| Integrations       | —          | Koneksi tools eksternal                         |
| Builder Hub        | `/create`  | Hub untuk developer / pembuat ekstensi kustom   |
| Trash              | —          | Base &amp; item yang dihapus — bisa di-restore  |
| Log Out            | —          | Keluar dari akun                                |


---

### Halaman Account Settings


| Halaman            | Path                         | Konten                                                                   |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------ |
| Overview           | `/account`                   | Profil, foto, email, password, API key, Google Drive, cookie preferences |
| Referral Credits   | `/account/credits`           | Program referral — kredit $10 per undangan teman                         |
| Recent Activity    | `/account/activity`          | Log aktivitas akun                                                       |
| Workspace Settings | `/wsp[Id]/workspace/billing` | Billing &amp; settings per workspace                                     |


---

## Di Dalam Base (airtable.com/app[BaseId])

### Top Navigation Bar


| Tab             | Path                   | Fungsi                                                  |
| --------------- | ---------------------- | ------------------------------------------------------- |
| **Data**        | `/app[Id]`             | Tabel-tabel dan semua view data — area kerja utama      |
| **Automations** | `/app[Id]/automations` | Workflow otomatis — trigger + action tanpa koding       |
| **Interfaces**  | `/app[Id]/interfaces`  | Designer untuk custom tampilan dari data (mini-app)     |
| **Forms**       | `/app[Id]/forms`       | Form pengumpulan data yang bisa dibagikan ke orang luar |


**Tombol aksi di header:**

- **Base History** — riwayat perubahan + rollback (Team+)
- **Launch** — publish interface sebagai app tanpa login Airtable
- **Share** — bagikan base ke collaborator dengan atur permission

---

### Tipe View


| View         | Plan  | Deskripsi                                                |
| ------------ | ----- | -------------------------------------------------------- |
| **Grid**     | Free  | Spreadsheet — baris &amp; kolom seperti Excel            |
| **Calendar** | Free  | Tampilan kalender berdasarkan field tanggal              |
| **Gallery**  | Free  | Kartu visual — bagus untuk konten dengan gambar          |
| **Kanban**   | Free  | Board per status — seperti Trello, drag &amp; drop       |
| **List**     | Free  | Daftar record vertikal yang simpel                       |
| **Form**     | Free  | Form pengisian — bisa dibagikan ke non-pengguna Airtable |
| **Timeline** | Team+ | Timeline horizontal dengan start &amp; end date          |
| **Gantt**    | Team+ | Diagram Gantt dengan dependency antar task               |
| **Section**  | Team+ | View dengan pengelompokan section                        |


---

### Toolbar View Configuration


| Kontrol          | Fungsi                                                    |
| ---------------- | --------------------------------------------------------- |
| Hide Fields      | Sembunyikan/tampilkan kolom di view ini                   |
| Filter           | Tampilkan hanya record yang memenuhi kondisi              |
| Group            | Kelompokkan record berdasarkan field tertentu             |
| Sort             | Urutkan record asc/desc berdasarkan field                 |
| Color            | Warnai baris/kartu berdasarkan kondisi                    |
| Row Height       | Atur tinggi baris (Short / Medium / Tall / Extra Tall)    |
| Share &amp; Sync | Bagikan view via link publik atau sinkronkan ke base lain |


---

### Automations — Tipe Trigger


| Trigger                   | Deskripsi                                           |
| ------------------------- | --------------------------------------------------- |
| Record Matches Conditions | Saat record memenuhi kondisi tertentu               |
| Form Submitted            | Saat ada pengisian form baru masuk                  |
| Record Created            | Saat baris baru ditambahkan ke tabel                |
| Record Updated            | Saat record yang ada diubah                         |
| Scheduled Time            | Jalankan pada waktu/interval tertentu               |
| Record Enters View        | Saat record masuk ke sebuah view (filter terpenuhi) |


---

### Marketplace — Kategori


| Kategori       | Path                                | Contoh Konten                                       |
| -------------- | ----------------------------------- | --------------------------------------------------- |
| Featured       | `/marketplace`                      | Ekstensi unggulan dan populer                       |
| By Airtable    | `/marketplace/category/by-airtable` | Chart, Pivot Table, Org Chart, CSV Import, SendGrid |
| All Extensions | `/marketplace/category/all-apps`    | Miro, Typeform, Formstack, Pexels, Data Fetcher     |
| Scripts        | `/marketplace/category/scripts`     | Find &amp; Replace, Randomize Values, Convert URLs  |


---

## Marketing Site ([www.airtable.com](http://www.airtable.com))

### Top Navigation

#### Platform Dropdown (→ /platform)


| Item                      | Path                           | Deskripsi                                    |
| ------------------------- | ------------------------------ | -------------------------------------------- |
| AI App Building           | `/platform/app-building`       | Bangun app bisnis kustom dengan AI           |
| AI Agents                 | `/platform/ai-agents`          | Deploy ribuan AI agent dalam app             |
| Portals                   | `/platform/portals`            | Kolaborasi dengan guest user luar organisasi |
| Scale (HyperDB)           | `/platform/hyperdb`            | Dataset hingga 100 juta record               |
| Automations               | `/platform/automations`        | Workflow otomasi                             |
| Databases                 | `/platform/connected-data`     | Relational database yang terhubung antar app |
| Interfaces                | `/platform/interface-designer` | Antarmuka kustom dari data                   |
| Reporting                 | `/platform/reporting`          | Analisis &amp; insights                      |
| Governance &amp; Security | `/platform/governance`         | Permission terpusat, keamanan data           |
| Airtable AI               | `/platform/ai`                 | AI tertanam di seluruh workflow              |
| What's New                | `/whatsnew`                    | Update produk terbaru                        |
| Integrasi                 | `/integrations/[name]`         | Slack, Google Drive, Jira, Zendesk           |


#### Solutions Dropdown


| Item             | Deskripsi                                   |
| ---------------- | ------------------------------------------- |
| Enterprise       | SSO, compliance, security untuk skala besar |
| Marketing Teams  | Template &amp; solusi untuk tim marketing   |
| Product Teams    | Solusi tim product &amp; engineering        |
| Operations Teams | Solusi tim operasional                      |


#### Resources Dropdown


| Item                   | Deskripsi                               |
| ---------------------- | --------------------------------------- |
| Reports &amp; eBooks   | Whitepaper &amp; laporan riset industri |
| Webinars &amp; Videos  | Training dan demo video                 |
| Blog &amp; Quick Reads | Artikel, tips, best practices           |
| Customer Stories       | Case study pelanggan                    |
| Airtable Academy       | Kursus &amp; sertifikasi resmi          |
| AI Plays               | Panduan penggunaan fitur AI             |
| Events                 | Event dan konferensi komunitas          |


---

## Plan &amp; Harga


| Plan                 | Harga         | Record/Base | Storage | Fitur Utama                                                |
| -------------------- | ------------- | ----------- | ------- | ---------------------------------------------------------- |
| **Free**             | Gratis        | 1.000       | 1 GB    | Grid, Calendar, Gallery, Kanban, List, Form                |
| **Team**             | ~$20/seat/mo  | 50.000      | 20 GB   | + Timeline, Gantt, Section, Airtable AI, Standard sync     |
| **Business**         | Custom        | 125.000     | 100 GB  | + Portals, Advanced permissions, Salesforce/Jira sync, 2FA |
| **Enterprise Scale** | Hubungi Sales | 500.000+    | 1 TB+   | + HyperDB, SSO, Audit logs, SLA                            |


---

## Keunggulan &amp; Kelemahan

### Untuk Pengguna Umum

**Keunggulan:**

1. **Visual &amp; fleksibel** — Switch antara 9 tipe view dalam satu klik pada data yang sama
2. **Template melimpah** — Ratusan template siap pakai untuk berbagai use case (project, CRM, inventory, event, content calendar)
3. **AI-powered (Omni)** — Describe kebutuhan dalam bahasa biasa, AI bantu setup tabel &amp; workflow
4. **Import mudah** — Upload Excel, CSV, Google Sheets langsung tanpa input ulang
5. **Automasi tanpa koding** — Kirim email, notifikasi Slack, update record otomatis
6. **Kolaborasi real-time** — Share dengan tim, permission granular per level (Editor/Commenter/Viewer)
7. **Marketplace extensions** — Ratusan plugin: chart lanjutan, Miro, Typeform, Formstack, dsb
8. **Relational database visual** — Hubungkan data antar tabel dengan linked records

**Kelemahan:**

1. **Terminologi asing** — "Base", "Workspace", "View", "Extension" tidak familiar bagi pengguna Excel/Sheets biasa
2. **Kurva belajar tinggi** — Terlalu banyak konsep baru sebelum bisa produktif
3. **Harga mahal** — Free plan sangat terbatas (1.000 record). Team plan $20/seat/bulan signifikan untuk UKM
4. **Fitur PM terbaik di paywall** — Timeline, Gantt, Section butuh Team plan
5. **Linked records membingungkan** — Konsep relasi antar tabel tidak intuitif bagi pengguna spreadsheet biasa
6. **Tidak ada offline mode** — Butuh koneksi internet aktif
7. **Mobile kurang powerful** — Pengalaman web jauh lebih lengkap dari mobile app

---

### Untuk Orang Tua / Lansia — Analisis Mendalam

> **Catatan:** Airtable didesain untuk pengguna tech-savvy. Untuk orang tua atau pengguna dengan keterbatasan digital literacy, ada hambatan serius.

#### Hambatan Kritis (🔴)


| #   | Hambatan                     | Detail                                                                                                                                                       |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | UI sangat padat dan kompleks | Terlalu banyak elemen sekaligus — sidebar, toolbar, tabs, puluhan buttons, icon kecil. Overwhelm bagi yang tidak familiar software kompleks                  |
| 2   | Terminologi sangat teknikal  | "Base", "Workspace", "View", "Automation", "Extension", "Interface", "Record", "Field" — semua istilah asing tanpa analogi familiar di kehidupan sehari-hari |
| 3   | Menu berlapis-lapis          | Klik → dropdown → panel samping → dialog lagi. Navigasi berlapis mudah membuat pengguna tersesat                                                             |
| 4   | Tidak ada "mode sederhana"   | Semua menu dan opsi selalu terlihat — tidak ada progressive disclosure untuk menyembunyikan fitur lanjutan                                                   |


#### Hambatan Sedang (🟡)


| #   | Hambatan                                | Detail                                                                                             |
| --- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 5   | Font &amp; icon terlalu kecil           | Ukuran teks ~12–13px di sidebar &amp; toolbar. Tidak ada opsi perbesar teks global dalam app       |
| 6   | AI/Omni bisa menakutkan                 | Panel AI aktif otomatis — menambah kebingungan dan kekhawatiran privasi                            |
| 7   | Terlalu banyak cara untuk hal yang sama | Tambah data bisa via toolbar, shortcut, button bawah, form, atau paste → bingung mana yang "benar" |
| 8   | Konsep database berbeda dari Excel      | Mental model perlu direset ulang — relational database vs spreadsheet biasa                        |
| 9   | Sharing &amp; permission sistem rumit   | Permission di 3 level: workspace, base, view — bisa tumpang tindih dan membingungkan               |
| 10  | Error messages tidak helpful            | Pesan kesalahan teknikal tanpa panduan jelas apa yang harus dilakukan                              |


#### Yang Relatif Mudah untuk Orang Tua (🟢)

- **Grid view** — mirip Excel, familiar bagi yang pernah pakai spreadsheet
- **Mengisi form yang sudah dibagikan** — jika ada orang lain yang setup, mengisi form via link cukup intuitif
- **Calendar view** — visual dan familiar setelah beberapa kali latihan

---

## Scorecard Ringkas


| Dimensi              | Pengguna Umum | Orang Tua/Lansia |
| -------------------- | :-------------: | :----------------: |
| Kemudahan Onboarding | 5.5/10        | 2/10             |
| Kejelasan UI         | 6/10          | 2.5/10           |
| Kekayaan Fitur       | 9/10          | 9/10             |
| Fleksibilitas View   | 9/10          | 5/10             |
| Value for Money      | 5.5/10        | 3/10             |
| Kolaborasi Tim       | 8.5/10        | 4/10             |
| Kemudahan Harian     | 6.5/10        | 2/10             |


---

## Kesimpulan

### Untuk Pengguna Umum (Tech-Savvy)

Airtable adalah **salah satu PM tool paling powerful** yang tersedia saat ini. Fleksibilitas view, relational database yang visual, automasi tanpa koding, dan marketplace extensions menjadikannya pilihan sangat baik untuk tim yang mau berinvestasi waktu belajar. Namun **harga Team plan perlu dipertimbangkan** — fitur PM terpenting (Timeline, Gantt) ada di sana. **Cocok untuk:** marketing team, product team, startup yang butuh fleksibilitas tinggi dan tidak keberatan learning curve.

### Untuk Orang Tua / Lansia

**Airtable tidak direkomendasikan** untuk orang tua yang baru mengenal teknologi digital. UI padat, terminologi teknikal, menu berlapis, dan tidak adanya "mode sederhana" akan menciptakan frustrasi lebih besar daripada manfaat yang didapat.

**Alternatif yang lebih ramah:**

- **Trello** — hanya Kanban, sangat simpel, visual
- **Notion** — lebih visual &amp; dokumentasi-first, tapi tetap ada learning curve
- **Google Sheets** — familiar, sederhana, gratis

Jika tetap ingin Airtable, pendampingan intensif dari orang yang lebih muda sangat diperlukan di awal dan hari-hari berikutnya.

---

## Referensi Route Penting


| Area             | Base URL                   | Contoh Path                                                          |
| ---------------- | -------------------------- | -------------------------------------------------------------------- |
| Marketing Site   | `www.airtable.com`         | `/platform`, `/solutions/enterprise`, `/pricing`                     |
| App Dashboard    | `airtable.com`             | `/`, `/starred`, `/workspaces`, `/marketplace`                       |
| Di Dalam Base    | `airtable.com/app[Id]`     | `/app[Id]/automations`, `/app[Id]/interfaces`, `/app[Id]/forms`      |
| Account Settings | `airtable.com/account`     | `/account`, `/account/credits`, `/account/activity`                  |
| Marketplace      | `airtable.com/marketplace` | `/marketplace/category/by-airtable`, `/marketplace/category/scripts` |


Kesimpulannya ini mirip dengan PM pada umumnya cuman bedanya ga ada catatan meeting hanya calender biasa:  
- Calendar view di Airtable itu generik — dia menampilkan record dari tabel berdasarkan field tanggal yang kamu pilih, bukan fitur "catatan meeting" yang dedicated (tidak ada template/field khusus seperti "meeting notes", "attendees", "agenda" bawaan).

- Jadi kalau mau dipakai buat catat meeting, user harus bikin tabel sendiri dulu (kolom: judul meeting, tanggal, peserta, dll), baru pasang Calendar view di atasnya.