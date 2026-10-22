# P12 — Analisa: Area Super-admin (`/dev`)

> 22 Okt 2026 · tahap 2 · **Analisa, belum rencana eksekusi.** Lahir dari pertanyaan user 22 Okt 2026: "menu super admin itu apa saja isinya, apakah nyangkut ke project yang sedang dibuat, dan apa kata kompetitor PM 2026". Mengikat: [`../KEPUTUSAN-MVP-INTI.md`](../KEPUTUSAN-MVP-INTI.md) > [`P11-area-admin.md`](P11-area-admin.md) > dokumen ini. Fondasi kode menang atas desain; kutipan `path:baris` adalah yang dibaca di `chore/analisa-menu-superadmin` @ `ee4693e` pada tanggal itu. Tanda **ASUMSI** = belum diverifikasi.
>
> Pemecahan tugas (`SA-01..`) **belum** ditulis — menunggu jawaban §7.

## 1. Ringkasan

- Area `/dev` sekarang **15 menu** dalam 5 grup. Hasil pemeriksaan: **11 menu memang milik area ini**, **1 harus dibuang** (Posts — sisa template, tidak dipakai produk), **2 tab Settings harus pindah ke `/dashboard`** (sudah diputuskan P11, belum dieksekusi), dan **1 menu bukan alat operator melainkan alat pembangun** (File Health).
- **Garis batas yang sudah disepakati (P11, 21 Okt 2026):** super-admin = **teknis/infrastruktur**, dikerjakan saat ada yang rusak; Admin = **kebijakan kantor**. Analisa ini memakai batas itu sebagai alat uji, bukan mengulang perdebatannya.
- **Temuan kompetitor yang paling menentukan:** di pasar 2026 ada **dua** jenis "super admin" yang sering dicampur — (A) *admin console* milik pelanggan SaaS (Asana, monday, ClickUp, Linear, Jira) dan (B) *instance admin* milik operator self-hosted (Plane God mode, OpenProject, Redmine). Tidak satu pun dari keduanya memperlihatkan server log, skema DB, atau kesehatan berkas ke pelanggan; itu tinggal di back-office vendor. Jira Cloud bahkan **tidak punya** tingkat System Administration untuk pelanggan — hanya Atlassian support yang punya. Jadi `/dev` Simple PM adalah **B + sepotong back-office vendor**, dan itu sah karena operator dan vendor di sini orang yang sama.
- **Tiga lubang yang terbukti dari kode, bukan dari selera:** (1) **lima timer latar** berjalan tanpa satu pun layar status (`settings-retention.ts:116`, `api-keys/rollup.ts:105`, `notification/notification.scheduler.ts:86`, `trash/trash.scheduler.ts:29`, `rate-limit.ts:189`); (2) **tidak ada indikator disk** padahal Postgres + RustFS lokal menumpang disk yang sama; (3) **sesi `/dev` sama panjang dengan sesi biasa** — Plane memberi panel admin kedaluwarsa sendiri (1 jam absolut) terpisah dari sesi app (7 hari).
- **Satu lubang yang bukan lubang:** tidak ada menu SMTP/Email karena memang **belum ada pengiriman email sama sekali** di `server/` (nol rujukan SMTP/nodemailer/resend). Setiap kompetitor self-hosted punya tab ini. Masuk daftar tunggu, bukan daftar kerja — lihat §6 T-07.
- **Biaya yang harus disadari:** Plane God mode cukup **6 bagian**, karena tool modern 2026 sengaja menipiskan admin in-app dan melempar log/metrik ke ops stack (Docker, Sentry, SIEM). Simple PM memilih sebaliknya — semuanya di dalam app dan terbaca MCP — supaya satu dev + agen AI bisa mengoperasikannya tanpa stack kedua. Itu keputusan, bukan kecelakaan, tapi harganya 15 menu yang harus dirawat. §6 D-01 mencatatnya.

## 2. Keadaan sekarang (dibaca di kode)

15 rute di `app/routes.ts:51-65`, label dan deskripsi di `NAV` `app/routes/super/layout.tsx:40-142`, guard area `requireRole(request, ROLES.SUPER_ADMIN)` di `app/routes/super/layout.tsx:155`.

| Grup | Menu | Isi nyata | Path |
|---|---|---|---|
| — | **Overview** | Kartu statistik + aktivitas terbaru + 7 peringatan terhitung (rate limit mati, tidak ada cara masuk, maintenance aktif, retensi belum diatur, user diblokir, API key mau habis, file berisiko) | `super/overview.tsx:16-126` |
| Kelola | **Users** | Peran, blokir, persetujuan, provider tertaut, impersonasi; super-admin diatur lewat env | `super/users.tsx:18-47` |
| Kelola | **Sessions** | Perangkat yang sedang masuk, cabut sesi | `super/sessions.tsx` |
| Kelola | **Posts** | CRUD + moderasi "konten contoh" bawaan template | `super/posts.tsx`, `server/db/schema.app.ts:28` |
| Kelola | **API Keys** | Scope, rotasi, pemakaian 24 jam, peringatan kedaluwarsa | `super/api-keys.tsx`, `sidebar-badges.ts:186-196` |
| Kelola | **DB Schema** | Diagram relasi dari definisi Drizzle + jumlah baris + ukuran nyata tabel | `super/db-schema.tsx:52-55` |
| Log | **Visitor Logs** | Kunjungan halaman, lokasi, perangkat | `super/visits.tsx` |
| Log | **Login Logs** | Siapa masuk, lewat metode apa, dari mana; termasuk hitungan `impersonation` | `super/login-logs.tsx`, `analytics-logins.stats.query.ts:32` |
| Log | **Rate Limits** | Request yang ditolak limiter | `super/rate-limit-logs.tsx` |
| Log | **Server Logs** | Error dan warning proses server | `super/server-logs.tsx` |
| Log | **Audit Log** | 30+ aksi berhak istimewa: peran, blokir, settings, purge | `super/audit.tsx`, `server/audit.ts:11-41` |
| Log | **File Health** | Ukuran berkas vs limit per peran + berkas yang berbahaya bagi konteks agen AI | `super/file-health.tsx:67-69` |
| Tools | **Tools & MCP** | Status proses, ringkasan API, katalog tool MCP untuk agen, reset state untuk debug | `super/tools.tsx:19-44`, `server/mcp/tool-catalog.ts:12-32` |
| Tools | **Changelog** | Riwayat perubahan per versi, di-parse dari `CHANGELOG.md` | `super/changelog.tsx`, `server/changelog.ts` |
| Konfigurasi | **Settings** | 7 tab: Autentikasi, Rate limit, Retensi log, Maintenance, Feature flags, Branding, Runtime | `super/settings.tsx:33-40` |

## 3. Alat uji: tiga pertanyaan

Dipakai untuk setiap menu di §4. Sebuah menu milik `/dev` bila jawabannya **ya, tidak, ya**.

1. **Dikerjakan saat ada yang rusak?** (bukan saat kebijakan kantor berubah → itu `/dashboard`)
2. **Mengubah tampilan atau perilaku untuk semua role?** Bila ya → milik Admin, bukan super-admin (P11 §1).
3. **Butuh orang yang bisa memperbaikinya?** Bila tidak, pengguna biasa cukup diberi tombolnya di tempat lain.

## 4. Nyangkut ke Simple PM? — verdict per menu

| Menu | Nyangkut? | Alasan |
|---|---|---|
| **Overview** | **Ya, inti** | Ini padanan *Administration → Information* OpenProject dan *General* Plane: satu layar yang menjawab "instansi ini sehat tidak". Tujuh peringatannya terhitung dari kondisi nyata, bukan hiasan — "tidak ada cara masuk" dan "retensi belum diatur" adalah dua cara app ini mati tanpa suara. |
| **Users** | **Ya, inti** | Satu-satunya tempat peran dinaikkan dan akun diblokir. Sebagian tumpang tindih dengan `/dashboard/users`, tapi batasnya jelas: Admin menyetujui dan mengundang, super-admin **mengubah peran ke atas dan membuka impersonasi**. Impersonasi wajib di sini: tiap laporan "tugas saya hilang" dari Member hanya bisa dibuktikan dengan melihat layar orang itu. |
| **Sessions** | **Ya, inti** | Laptop kantor hilang = cabut sesi, sekarang, tanpa menunggu sesi kedaluwarsa. Semua kompetitor punya padanannya (durasi sesi + pencabutan); yang membedakan kita cuma per-perangkat. |
| **Posts** | **Tidak — buang** | Sisa template `makuro`. Nol rujukan dari kode produk: pencarian "posts" di luar `/dev` hanya menemukan daftar rute, katalog MCP, pemetaan scope, dan skema. Simple PM tidak punya konsep "post"; yang ada Proyek, Tugas, Event, Komentar. Menu ini mengajari super-admin bahwa area ini berisi contoh, bukan alat. Pembuangan bukan sekadar hapus berkas — ikut `scopes.ts`, `mcp/tool-catalog.ts` (`get_recent_posts`), `middleware/visitor.ts`, `sidebar-badges.ts`, dan tabel `post` (hapus tabel = migrasi; biarkan tabel tanpa menu = hutang yang tercatat). Lihat §6 B-01. |
| **API Keys** | **Ya, inti** | Kunci inilah yang dipakai agen AI dan integrasi; tanpa layar rotasi, kunci yang bocor tidak bisa dimatikan. Linear menaruh *API → OAuth Applications, Webhooks & Member API keys* persis setingkat ini, dan daftar hardening-nya menyebut review kunci sebagai butir wajib. Badge "berakhir dalam N hari" lebih maju dari kebanyakan kompetitor. |
| **DB Schema** | **Ya, tapi khas kita** | Tidak ada kompetitor yang membuka skema ke pelanggan — karena pelanggan mereka tidak boleh tahu. Di sini pembacanya adalah dev dan agen AI yang akan menulis migrasi berikutnya, dan angka "jumlah baris + ukuran nyata" adalah cara tercepat melihat tabel log meledak. Padanan terdekat: *Information* Redmine dan *Storage information* OpenProject. Pertahankan, tapi sadari ini alat pembangun yang menumpang area operator. |
| **Visitor Logs** | **Ya, lemah** | Nilainya satu: menjawab "ada yang memakai app ini tidak". monday menyebutnya *usage stats*, Asana *Insights* — keduanya ada di admin console. Bedanya mereka meringkas, kita mencatat mentah per kunjungan. Prioritas rendah; §6 G-02 mengusulkan menggabungnya dengan Login Logs jadi satu halaman "Akses & pemakaian" alih-alih dua menu. |
| **Login Logs** | **Ya, inti** | Jejak "siapa masuk, dari mana, lewat apa" adalah bahan pertama tiap insiden akun. Sudah memisahkan metode `impersonation` — itu yang membuat impersonasi di Users bisa dipertanggungjawabkan. |
| **Rate Limits** | **Ya, inti** | Limiter yang salah setel memutus integrasi tanpa pesan; log penolakan adalah satu-satunya cara tahu. Kompetitor **tidak** memberi layar ini (Atlassian dan monday hanya menerbitkan angka limitnya — monday audit API 50 req/menit), karena limitnya milik vendor. Di self-hosted, limitnya milik kita, jadi layarnya wajib. |
| **Server Logs** | **Ya, khas self-hosted** | Padanannya di SaaS adalah SIEM/Datadog, bukan menu. Di Plane padanannya `docker logs`. Kita menaruhnya in-app karena operatornya satu orang + agen AI yang tidak punya akses shell saat insiden. Ini konsekuensi langsung D-01. |
| **Audit Log** | **Ya, inti, dan tidak boleh dikompromikan** | Ini butir yang paling konsisten di seluruh pasar 2026: Linear (Settings → Administration → Audit Log, 90 hari, bisa di-stream), monday (Security → Audit, Enterprise, ada Audit Log API), ClickUp (Enterprise, retensi 60 hari), Asana (Audit Log API + SIEM + eDiscovery). Dua pelajaran yang bisa dipakai: **retensi harus eksplisit** (kita punya tab Retensi log — sambungkan angkanya ke halaman ini) dan **log harus bisa keluar** (kita punya API key ber-scope; §6 T-05). Catatan: `/dashboard` akan punya menu Aktivitas (P11 ⑤) — itu audit yang **disaring dan dibahasa-manusiakan** untuk Admin, bukan duplikat. |
| **File Health** | **Ya, tapi salah kamar** | Isinya tentang **repo**, bukan tentang **instansi**: ukuran berkas sumber vs limit `CLAUDE.md` §8 dan risiko konteks agen. Tidak ada kompetitor yang punya padanannya karena tidak ada kompetitor yang dioperasikan oleh agen AI. Berguna — tapi bila Simple PM dipasang di instansi orang lain, menu ini tidak punya arti. §6 G-01. |
| **Tools & MCP** | **Ya, khas kita** | Katalog tool MCP + status proses + reset state. Inilah yang membuat agen AI bisa jadi operator kelas dua. Padanan di pasar: *Apps admin* monday dan *Integrations & applications* Linear mengatur aplikasi pihak ketiga — jenis yang sama (pintu masuk mesin), isi yang berbeda. Badge `/dev/tools` sudah memperingatkan `MCP_ADMIN_TOKEN` bersama yang masih aktif (`sidebar-badges.ts:181`); itu pola yang benar. |
| **Changelog** | **Ya, lemah tapi murah** | Pekerjaan operator yang nyata: "versi mana yang membawa perubahan ini". OpenProject menjawab kebutuhan yang sama dengan *Security badge* — mencocokkan versi terpasang dengan basis data rilis resmi dan memperingatkan bila ada update/kerentanan, hanya terlihat oleh admin. Itu lompatan yang pantas untuk menu ini; §6 T-04. |
| **Settings** | **Ya, 5 dari 7 tab** | Autentikasi, Rate limit, Retensi log, Maintenance, Runtime → teknis, tetap. **Feature flags** dan **Branding** → mengubah tampilan/perilaku semua role, jadi milik Admin per P11 §1. Pemindahannya sudah jadi lingkup P11 ④, belum dieksekusi. Guard `/dashboard` sudah meloloskan super-admin (`routes/admin/layout.tsx:33`), jadi pemindahan tidak menghilangkan hak siapa pun. |

Rekap: **11 tetap**, **1 buang** (Posts), **1 pindah sebagian** (Settings: 2 tab), **1 gabung-kandidat** (Visitor+Login), **1 pisahkan sebagai alat pembangun** (File Health).

## 5. Referensi kompetitor 2026

### 5.1 Dua jenis "super admin", jangan dicampur

| | **(A) Admin console SaaS** | **(B) Instance admin self-hosted** |
|---|---|---|
| Contoh | Asana *Admin Console*, monday *Administration*, ClickUp *Security & Permissions*, Linear *Settings → Administration*, Jira org/site/product admin | Plane *God mode* (`/god-mode`), OpenProject *Administration*, Redmine *Administration*, Taiga Django `/admin` |
| Pemiliknya | Pelanggan (kepala IT kantor) | Operator server |
| Isinya | Seat & user, tim, peran/izin, keamanan (SSO, SCIM, 2FA, durasi sesi, IP allowlist), audit log, apps & token, tagihan, statistik pemakaian, ekspor/hapus data | Semua di (A) **minus tagihan**, **plus** SMTP, penyedia auth, ID instansi & telemetri, kedaluwarsa sesi admin terpisah, pembatasan pembuatan workspace, *System information* (cek konfigurasi, versi, disk), plugin |
| Yang **tidak pernah** ada | Server log, skema DB, kesehatan berkas, reset state | Sama — kecuali lewat shell/Docker, di luar app |
| Berapa besar | monday ±8 bagian; Linear ±3 kelompok | Plane **6**; OpenProject ±14; Redmine 13 |

Bukti paling tajam untuk Simple PM: **Jira Cloud tidak menyediakan tingkat System Administration kepada pelanggan — hanya Atlassian support yang memilikinya.** Artinya "godmode" memang ada di tiap produk; yang berbeda cuma siapa yang boleh melihatnya. Simple PM self-hosted dan dioperasikan vendornya sendiri, jadi menyatukan (B) dengan sepotong back-office vendor bukan anomali — itu konsekuensi model penyebarannya.

### 5.2 Fitur per fitur: siapa punya, dan kenapa

| Fitur | Siapa | Kenapa ada | Status di `/dev` |
|---|---|---|---|
| Audit log + retensi eksplisit | Linear (90 hari, bisa di-stream), ClickUp (60 hari, Enterprise), monday (Security→Audit + Audit API), Asana (Audit Log API, SIEM, eDiscovery) | Pertanyaan "siapa menghapus ini" selalu datang **setelah** kejadian | **Ada**; retensi belum ditampilkan di halaman, ekspor belum ada |
| Manajemen sesi & durasi | Asana (session duration), monday (session duration), Plane (sesi app 7 hari inaktif **+ sesi admin 1 jam absolut**), Linear (review personal sessions) | Perangkat hilang dan sesi yang menganggur adalah dua risiko berbeda | **Sebagian** — pencabutan ada, durasi khusus `/dev` tidak |
| Akses elevasi berjangka | Asana *Work Access Mode* (Super Admin, sementara, untuk melihat kerja privat tanpa mengubah setelan privasi); GitHub Enterprise: impersonasi **wajib memilih alasan**, tercatat di audit | Tanpa batas waktu dan alasan, impersonasi jadi pintu belakang permanen | **Ada**, dan secara teknis lebih ketat: `impersonating` membuat setiap kebijakan menolak aksi destruktif (`api/admin-context.ts:9-14`). Belum ada alasan wajib & batas waktu |
| Token API, OAuth app, webhook | Linear (API → OAuth Applications, Webhooks, Member API keys), monday (izin "generate API tokens"), Asana (Service Accounts + scope) | Integrasi hidup lebih lama dari orangnya | **Ada**, dengan scope + rotasi + pemakaian |
| SMTP / pengiriman email | Plane (*Email*, direkomendasikan diisi **paling awal** supaya undangan terkirim), OpenProject (*Emails and notifications*), Redmine (Settings→Email) | Undangan dan notifikasi adalah jalur keluar pertama app | **Tidak ada** — karena fiturnya belum ada (nol rujukan SMTP di `server/`) |
| Penyedia auth & pendaftaran | Plane (*Authentication*: "izinkan siapa pun mendaftar tanpa undangan", batasi metode login), OpenProject (OAuth/OIDC/SAML/LDAP/2FA), ClickUp (default 2FA & SSO tidak diwajibkan) | Pintu masuk adalah setelan paling berbahaya di aplikasi apa pun | **Ada** (tab Autentikasi) |
| Informasi sistem & cek keselamatan | OpenProject *Information* (versi core & produk, cek konfigurasi otomatis, **sisa ruang disk**, **Security badge** yang mencocokkan versi dengan basis data rilis dan memperingatkan kerentanan), Redmine *Information*, Plane *General* (ID instansi, telemetri) | Operator perlu satu halaman yang bisa di-screenshot saat melapor | **Sebagian** — Overview + tab Runtime; tanpa disk dan tanpa cek versi |
| Plugin / proses latar | Redmine *Plugins*; OpenProject sisi admin memuat cek konfigurasi | Pekerjaan yang gagal di latar tidak berteriak | **Tidak ada** — padahal **lima timer** berjalan (§1) |
| Pembatasan ruang kerja | Plane (*Workspaces*: lihat semua, "cegah siapa pun membuat workspace"), Linear (`restrictTeamCreationToAdmins`) | Pertumbuhan liar ruang kerja adalah kebocoran data paling umum | **Tidak relevan** — Simple PM satu organisasi, tanpa konsep workspace |
| Tagihan / seat | Asana, monday, ClickUp, Linear | Model SaaS | **Tidak relevan** — self-hosted satu kantor |
| Ekspor & hapus data organisasi | Asana (domain export/deletion, CSV), monday (ekspor seluruh akun) | Kewajiban GDPR dan jalan keluar | **Milik Admin** — sudah jadi menu *Ekspor data* di P11 |
| Server log, skema DB, reset state, kesehatan berkas | **Tidak ada** | Milik back-office vendor / ops stack | **Ada** — pilihan sadar, lihat D-01 |

### 5.3 Pelajaran yang berlaku untuk kita, dan yang tidak

**Berlaku.** (1) Audit log adalah jantung area ini, dan kelasnya ditentukan oleh retensi + kemampuan ekspor, bukan oleh jumlah aksi yang dicatat. (2) Panel admin pantas punya kedaluwarsa sesi sendiri yang lebih pendek — Plane memisahkannya secara eksplisit, dan sesi admin-nya **absolut**, tidak diperpanjang oleh aktivitas. (3) Elevasi akses harus berjangka, beralasan, dan tercatat (Asana + GitHub). (4) Satu halaman "informasi sistem" yang menyebut versi, cek konfigurasi, dan **sisa disk** adalah standar self-hosted; kita punya dua yang pertama, bukan yang ketiga.

**Tidak berlaku.** Tagihan, seat, multi-workspace/multi-site, SCIM, IP allowlist, DLP/eDiscovery/CASB, custom field & workflow global, plugin marketplace. Semuanya lahir dari multi-tenant atau korporasi besar. Memasukkannya persis yang membuat OpenProject berat — alasan yang sama sudah dipakai menolak daftar serupa di P11 §3 ⑧.

## 6. Rekomendasi

Tanpa nomor tugas; nomor diberikan setelah §7 dijawab. Urutan = urutan usul pengerjaan.

| Kode | Usul | Alasan | Perkiraan |
|---|---|---|---|
| **D-01** | Catat keputusan "admin in-app gemuk" di `docs/decisions/` | Server log + skema DB + reset state di dalam app adalah penyimpangan dari praktik 2026 (Plane cukup 6 bagian). Penyimpangan yang sadar perlu tertulis, kalau tidak agen berikutnya akan "merapikannya" | 0,5 hari |
| **B-01** | Buang Posts: menu, rute, komponen, `lib/posts-api`, tool MCP `get_recent_posts`, entri `scopes.ts`, pengecualian `visitor.ts`, badge | Satu-satunya menu yang tidak punya pembaca | 1 hari + keputusan §7 Q1 soal tabel `post` |
| **T-01** | Halaman/kartu **Proses latar**: nama timer, interval, jalan terakhir, hasil terakhir, galat terakhir | Lima timer tanpa jendela; retensi yang diam-diam mati = tabel log tumbuh sampai disk penuh, dan peringatan Overview "retensi belum diatur" tidak menangkap kasus "diatur tapi ticknya mati" | 2-3 hari |
| **T-02** | Tambahkan **sisa disk** + ukuran direktori PG lokal & RustFS ke Overview | Padanan *Storage information* OpenProject. Dua layanan menumpang satu disk; kehabisan disk mematikan keduanya sekaligus | 1 hari |
| **T-03** | **Kedaluwarsa sesi `/dev` sendiri** (absolut, pendek) + re-auth sebelum aksi destruktif | Pola Plane. Sekarang tab `/dev` yang tertinggal terbuka sama amannya dengan tab `/app` | 2 hari, menyentuh `server/auth.ts` → persetujuan satu per satu (README §3) |
| **T-04** | **Cek versi** di Overview/Changelog: versi terpasang vs rilis terbaru | Pola *Security badge* OpenProject. Perlu keputusan §7 Q2: panggil keluar (butuh jaringan + telemetri minimal) atau cukup bandingkan dengan `CHANGELOG.md` yang ter-embed | 1-2 hari |
| **T-05** | **Ekspor Audit Log** lewat API key ber-scope + tampilkan angka retensi di halaman Audit | Linear bisa stream, monday dan Asana punya Audit API, ClickUp menyebut retensinya terang-terangan. Kita sudah punya scope dan tab Retensi — tinggal disambung | 2 hari |
| **T-06** | Impersonasi: **alasan wajib** + batas waktu + spanduk tetap | Pola GitHub Enterprise + Asana Work Access Mode. Penolakan aksi destruktif sudah ada; yang hilang jejak "kenapa" dan "sampai kapan" | 2 hari |
| **T-07** | Tab **Email/SMTP** — **ditahan** sampai pengiriman email benar-benar ada | Menambah tab untuk fitur yang belum ada = tombol yang menipu. Dicatat di `HUTANG.md` sebagai prasyarat fitur notifikasi email | — |
| **G-01** | Pisahkan **File Health** sebagai alat pembangun: tetap di `/dev` saat dev, sembunyikan di instansi orang lain (flag/env), atau beri label eksplisit "alat pembangun" | Isinya tentang repo, bukan instansi. Butuh keputusan §7 Q3 | 0,5-1 hari |
| **G-02** | Gabung **Visitor Logs + Login Logs** → satu halaman "Akses & pemakaian" dua tab | 15 menu untuk satu operator terlalu banyak; dua menu ini menjawab satu pertanyaan | 1-2 hari, prioritas rendah |
| **P11-④** | Pindahkan tab **Feature flags** dan **Branding** ke `/dashboard/settings` | Sudah diputuskan 21 Okt 2026; analisa ini hanya menegaskan | sudah di lingkup P11 |

Setelah B-01 + P11-④ + G-02: **13 menu**, Settings 5 tab. Setelah T-01: 14 menu, dan setiap menu punya pembaca yang jelas.

## 7. Pertanyaan untuk user

| # | Pertanyaan | Kenapa perlu dijawab |
|---|---|---|
| **Q1** | Posts dibuang — tabel `post` **dihapus lewat migrasi** atau dibiarkan tanpa menu? | Hapus = migrasi (butuh baton, antre setelah migrasi P11); biarkan = hutang tercatat + tabel mati di DB Schema |
| **Q2** | Cek versi (T-04): boleh memanggil keluar (butuh telemetri minimal seperti OpenProject/Plane) atau offline saja? | Menentukan apakah T-04 2 hari atau 1 hari, dan apakah instansi self-hosted mengirim apa pun ke luar |
| **Q3** | File Health: tetap terlihat di semua instansi, atau hanya saat mode dev? | Menentukan G-01, dan menyentuh anggapan "Simple PM akan dipasang orang lain" — yang belum pernah diputuskan |
| **Q4** | T-01/T-02/T-03 masuk lajur mana? `/dev` hampir tidak bertabrakan dengan `/app` dan `/dashboard`, jadi bisa paralel seperti P11 — tapi tetap kena batas 2-3 worker per batch | Menentukan apakah ini lajur ketiga atau menunggu gerbang S2 |
| **Q5** | Prioritas: T-01 (proses latar) atau T-03 (sesi `/dev`) lebih dulu? | T-01 mencegah kerusakan diam-diam; T-03 menutup risiko keamanan. Keduanya tidak bisa jalan bersamaan oleh satu worker |

## 8. Sumber

Kode: `app/routes.ts:51-65`, `app/routes/super/layout.tsx:40-155`, `app/routes/super/overview.tsx:16-126`, `app/routes/super/settings.tsx:33-40`, `app/routes/super/users.tsx:18-47`, `server/audit.ts:11-41`, `server/sidebar-badges.ts:181-196`, `server/mcp/tool-catalog.ts:12-32`, `server/api/admin-context.ts:9-14`, `server/settings-retention.ts:116`, `server/api-keys/rollup.ts:105`, `server/notification/notification.scheduler.ts:86`, `server/trash/trash.scheduler.ts:29`, `server/rate-limit.ts:189`.

Kompetitor (dibaca 22 Okt 2026):

- [OpenProject — System admin guide](https://www.openproject.org/docs/system-admin-guide/) dan [System information](https://www.openproject.org/docs/system-admin-guide/information/) · [Users and permissions](https://www.openproject.org/docs/system-admin-guide/users-permissions/)
- [Plane — Instance admin and God mode](https://developers.plane.so/self-hosting/govern/instance-admin) dan [Configure session expiry](https://developers.plane.so/self-hosting/govern/god-mode/session-expiry)
- [Asana — Admin and security features](https://asana.com/features/admin-security) · [Asana Admin Console guide (Cirface)](https://cirface.com/blog/asana-admin-console) · [Work Access Mode admin guide 2026](https://www.gend.co/blog/master-asanas-work-access-mode-productivity)
- [monday.com — The Admin Section](https://support.monday.com/hc/en-us/sections/360000130980-The-Admin-Section) · [Account permissions](https://support.monday.com/hc/en-us/articles/360003457320-Account-permissions) · [The Audit Log](https://support.monday.com/hc/en-us/articles/360001259429-The-Audit-Log) · [Audit Log API](https://support.monday.com/hc/en-us/articles/4406042650002-Audit-Log-API) · [Secure configuration checklist](https://support.monday.com/hc/en-us/articles/34336185460498-monday-com-secure-configuration-checklist)
- [ClickUp — Workspace audit logs](https://help.clickup.com/hc/en-us/articles/21929900448535-Workspace-audit-logs) · [Advanced Workspace security permissions](https://help.clickup.com/hc/en-us/articles/6309213140375-Configure-advanced-Workspace-security-permissions) · [Audit Logs availability and limits](https://help.clickup.com/hc/en-us/articles/25324213764119-Audit-Logs-feature-availability-and-limits)
- [Linear — Audit log](https://linear.app/docs/audit-log) · [Members and roles](https://linear.app/docs/members-roles) · [Linear hardening guide](https://howtoharden.com/guides/linear/)
- [Atlassian — What are the different types of admin roles?](https://support.atlassian.com/user-management/docs/what-are-the-different-types-of-admin-roles/) · [Perbandingan tingkat administrasi Jira (Actonic)](https://actonic.de/en/comparison-of-different-administration-levels-in-jira/)
- [Redmine — Administrator Guide](https://www.redmine.org/projects/redmine/wiki/Administrator_Guide) · [Redmine administration page (RedmineUP)](https://www.redmineup.com/pages/help/redmine/administration-page)
- [GitHub Enterprise Server — Impersonating a user](https://docs.github.com/en/enterprise-server@3.18/admin/managing-accounts-and-repositories/managing-users-in-your-enterprise/impersonating-a-user) (pola alasan wajib + audit)
- [ownCloud Impersonate app](https://github.com/owncloud/impersonate) (pola spanduk + pembatasan grup)
