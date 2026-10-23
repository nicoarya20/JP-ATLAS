# P14 — Rencana eksekusi: Cuti jadi status yang disetel Admin

> 23 Okt 2026 · tahap 2 · lanjutan langsung `P13-admin-data-nyata.md`. Mengikat: `../KEPUTUSAN-MVP-INTI.md` > `../JADWAL-S3-S8.md` > `P11-area-admin.md` > `P13-admin-data-nyata.md` > dokumen ini. Lahir dari diskusi user 23 Okt 2026 (berangkat dari "tab Kebijakan kerja ini dihapus saja?", berakhir di "cuti tidak bisa diajukan di aplikasi — admin saja yang mengganti statusnya"). Fondasi kode menang atas desain; kutipan `path:baris` adalah yang dibaca di `feature/project-management` @ `a1b8078` pada tanggal itu.

## 1. Ringkasan

- Fitur Cuti berpindah bentuk: dari **pengajuan + persetujuan di dalam aplikasi** menjadi **pencatatan status oleh Admin**. Pengajuan cuti terjadi di luar aplikasi (HRD atau atasan, lewat WhatsApp); aplikasi hanya mencatat hasilnya supaya rekan satu tim tahu siapa yang sedang tidak ada.
- **Ini bukan hapus-lalu-bangun-ulang.** Tabel yang ada sudah dirancang "rentang tanggal → status dihitung per tanggal, cuti berakhir sendiri" (`server/db/schema.leave.ts`). Yang dicabut adalah **alur pengajuan dan persetujuan**, bukan pencatatannya. Badge `Cuti sampai 16 Okt` di Tim tetap hidup apa adanya.
- **8 tugas, CU-01..CU-08**, ≈ **12,5 hari-orang AI**. Sebagian besarnya penghapusan, jadi angka ini didominasi tes yang ditulis ulang, bukan fitur baru.
- **Satu migrasi `0022`** — bentrok nomor dengan P13 RD-01, diselesaikan di §4 K3.
- **Tab "Kebijakan kerja" dihapus** dari Pengaturan admin (6 tab → 5). Saklar "Cuti perlu persetujuan" adalah satu-satunya isi tab itu yang punya backend nyata; begitu persetujuan tidak ada lagi, tab itu tinggal pratinjau tanpa tujuan.
- **Akibat berantai ke P13:** migrasi `0022` miliknya turun dari enam kolom jadi lima (`working_days` dicabut), dan RD-07 dicoret.

## 2. Keadaan sekarang (dibaca di kode)

| Hal | Fakta | Path:baris |
|---|---|---|
| Tabel | `leave_request`: `userId`, `startDate`, `endDate`, `note`, `status`, `decidedBy`, `decidedAt`, `rejectReason` | `server/db/schema.leave.ts` |
| Status | `pending`, `approved`, `rejected`, `canceled`; dua status aktif (`pending`, `approved`) tidak boleh tumpang tindih | `server/db/schema.leave.ts:13,17-20` |
| **Desain yang bisa dipertahankan** | "Team status is computed from these rows by date, so a leave ends by itself; nothing is stored per day" | `server/db/schema.leave.ts` (docstring) |
| Saklar workspace | `leaveRequiresApproval` boolean, default `true` | `server/db/schema.app.ts:70`; `server/settings-leave.ts` |
| Modul server | 9 berkas di `server/leave/`: `approvers.query`, `dto`, `mapper`, `pending.query`, `policy`, `query`, `service`, `status.query`, `validate` | `server/leave/` |
| Endpoint | 4 berkas: `app-leave.ts`, `app-leave.decide.ts`, `app-leave.me.ts`, `app-leave.settings.ts` | `server/api/` |
| Pembaca status Tim | `leaveStatusFor(userIds, viewer, today, exec)` — satu kueri untuk banyak orang, `today` disuntik, tidak membaca jam | `server/leave/leave.status.query.ts` |
| Notifikasi | 2 jenis: `leave_requested` (kartu 2 tombol), `leave_decided` | `server/notification/notification.types.ts:84-85`; `server/notification/emit.leave.ts` |
| Kartu Inbox 2 tombol | Satu-satunya kind yang punya tombol kedua; semua kind lain satu tombol | `app/lib/inbox-view.ts:127-129` |
| Audit | `LEAVE_APPROVE`, `LEAVE_REJECT`, `LEAVE_CANCEL`, `SETTINGS_LEAVE_UPDATE` | `server/audit.ts:55-58`; `app/lib/audit-api.ts:128-131` |
| Tolak kunci API | 3 entri cuti sudah di `PM_KEY_DENY` | `server/api-keys/scopes.pm.ts:76-81,103-105` |
| UI | 7 berkas di `app/components/leave/`; dirender dari Pengaturan akun | `app/routes/app/settings.tsx:24,91` |
| Tempat kontrol baru | `/dashboard/users` sudah punya menu aksi per baris + drawer detail; loader `requireAnyRole([ADMIN, SUPER_ADMIN])` | `app/components/users/UserActionsMenu.tsx`; `app/routes/admin/users.tsx:33` |
| Kind tak dikenal | Inbox sudah gagal-lunak: "a kind this build does not know still reads as news, not as a blank" | `app/lib/inbox-view.ts:67` |
| Tes terdampak | ~25 berkas menyebut domain cuti, termasuk 5 di `tests/leave/`, 4 di `tests/inbox/`, 4 di `tests/ui/` | hasil pindaian 23 Okt |
| README | Kontrak Cuti ditulis panjang: §"Kontrak API Cuti" (12 baris) + daftar halaman + daftar pengecualian kunci API | `README.md:342,425,440,442,446,487-500` |

## 3. Keputusan user 23 Okt 2026

| # | Pertanyaan | Jawaban | Konsekuensi |
|---|---|---|---|
| D1 | Tab "Kebijakan kerja" dihapus saja? | **Ya** — tapi alasannya digeser: bukan "PM tidak butuh", melainkan **belum ada yang membacanya**. Tidak satu pun tempat di kode menghitung hari kerja (nol hit `isWorkday`/`getDay()`/weekend di `server/` dan `app/lib/`), dan P13 RD-07 sendiri menulis "fase 1 hanya simpan + tampilkan" | Tab dihapus (CU-07). Hari kerja + hari libur turun ke `HUTANG.md`, dibangun **bersama** kalkulator tenggat, bukan sebelumnya |
| D2 | Bentuk status cuti | **Rentang tanggal** (mulai, selesai, catatan) — bukan saklar on/off | Status kedaluwarsa sendiri; tidak ada yang perlu diingat admin. Sama persis dengan perilaku tabel sekarang, jadi `leaveStatusFor` dipertahankan |
| D3 | Siapa yang boleh menyetel | **Admin + Super-admin saja.** PM dan Member baca saja | Kontrol dipasang di `/dashboard/users`, bukan di `/app/team`. PM yang butuh mencatat cuti anggotanya harus minta admin — diterima user, lihat §8 R5 |
| D4 | Jenis ketidakhadiran | **Satu jenis, "Cuti".** Alasan spesifik masuk kolom catatan teks bebas | Tidak ada enum jenis. Badge Tim satu bentuk: `Cuti sampai <tgl>` |
| D5 | Member dikabari saat statusnya disetel? | **Ya** (usul agent, disetujui user) | Satu jenis notifikasi baru `leave_recorded`. Tanpa ini status seseorang berubah diam-diam dan rekan melihatnya "Cuti" tanpa dia tahu |
| D6 | Catatan cuti terlihat siapa? | **Admin saja**, di `/dashboard/users` (usul agent, disetujui user) | Catatan **tidak** masuk DTO Tim. "Umroh", "sakit", "urusan keluarga" adalah data pribadi; kartu Tim cukup `Cuti sampai 31 Okt` |

## 4. Kontradiksi dengan P11 dan P13

| # | Rencana lama menulis | Yang berubah | Akibat |
|---|---|---|---|
| K1 | **P11 AD-07** dan **P13 RD-07** · "Tab Kebijakan kerja · L (2)" — hari kerja, hari libur, pengingat acara bawaan, saklar cuti wajib disetujui | Saklar cuti dihapus bersama persetujuan; hari kerja & libur ditunda sampai ada konsumennya | **AD-07 dan RD-07 dicoret.** Anggaran P13 turun ≈2 |
| K2 | **P13 §5** migrasi `0022` = **enam** kolom, termasuk `working_days` jsonb | Tidak ada lagi layar yang menulis `working_days` | Migrasi P13 jadi **lima** kolom. Kolomnya tidak dibuat sekarang — dibuat nanti bersama kalkulator tenggat, bukan dibiarkan kosong menunggu |
| K3 | **P11 R1** dan **P13 RD-01** sama-sama mengklaim nomor **`0022`** | Dua lajur mengincar nomor yang sama | **P14 CU-01 memegang `0022`** karena lajur ini yang aktif; **P13 RD-01 geser ke `0023`**. Aturan P11 R1 tetap berlaku: periksa ulang `server/db/migrations/` sebelum `db:generate`, siapa pun yang mendarat duluan menang dan yang lain menyesuaikan |
| K4 | **P11 §9 kontradiksi 3** · "Pengingat acara bawaan bertindih P7 M09. Usul: pindah ke tab Kebijakan kerja" | Rumah yang diusulkan itu hilang | Pengingat acara bawaan pindah ke **tab Pemberitahuan (P13 RD-08)** — memang default notifikasi, bukan kebijakan kerja. M09 tetap dicoret |
| K5 | **P13 RD-09** · katalog fitur memuat `leave` sebagai salah satu dari empat flag `/app` | `leave` bukan lagi modul dengan alur pengajuan | `leave` **tetap** di katalog (mematikannya menyembunyikan badge Ketersediaan dan menu setel cuti), tetapi kalimat "bila dimatikan" wajib ditulis ulang. Bukan lagi "anggota tidak bisa mengajukan cuti" |
| K6 | **P11 §4** tabel Tab Pengaturan = **6 tab** | Satu tab hilang | **5 tab**: Identitas, Pengumuman, Akses masuk, Pemberitahuan, Fitur. `tests/admin-settings-tabs.test.ts` ikut disesuaikan |
| K7 | **`HUTANG.md` H-D4** · "Ketersediaan/cuti dan urutan ketersediaan: menunggu cuti (fase 5) dan Events" | Cuti tidak lagi menunggu fase 5 | H-D4 disunting: ketersediaan tersedia begitu P14 mendarat; yang tersisa menunggu hanyalah **urutan** berdasarkan ketersediaan |

## 5. Migrasi `0022_leave_period.sql`

Satu berkas, satu transaksi, guard idempoten. Urutannya penting: **salin dulu, hapus terakhir.**

| Langkah | Isi |
|---|---|
| 1 | `CREATE TABLE IF NOT EXISTS leave_period` — `id`, `user_id` (FK `user`, `ON DELETE CASCADE`), `start_date` date, `end_date` date, `note` text NULL, `created_by` (FK `user`, `ON DELETE SET NULL`), `created_at`, `updated_at` timestamptz |
| 2 | `CHECK (end_date >= start_date)` + indeks `(user_id)` dan `(start_date, end_date)` |
| 3 | `INSERT INTO leave_period (...) SELECT ... FROM leave_request WHERE status = 'approved'` — riwayat cuti yang sudah disetujui ikut pindah, `created_by` diisi `decided_by` |
| 4 | `DROP TABLE IF EXISTS leave_request` |
| 5 | `ALTER TABLE app_setting DROP COLUMN IF EXISTS leave_requires_approval` |

**Tidak ada kolom `status`.** Satu baris = satu periode yang benar-benar berlaku; tidak ada keadaan menunggu atau ditolak untuk disimpan. Baris `pending`, `rejected`, dan `canceled` memang sengaja tidak ikut pindah — tidak ada artinya di model baru.

Kolom `created_by` disimpan meski belum ada layar yang menampilkannya: tanpa itu tidak ada jejak siapa admin yang mencatat, dan audit saja tidak cukup kalau barisnya disunting berkali-kali.

## 6. Endpoint

**Dihapus seluruhnya** — keempat berkas `/api/app/leave/*`:

| Metode | Path | Kenapa hilang |
|---|---|---|
| `GET` | `/leave/me` | Keadaan sendiri dibaca loader `/app/settings` langsung lewat `leaveStatusFor`, mengikuti pola `settings.leave.server.ts` yang sudah ada |
| `POST` | `/leave` | Tidak ada lagi pengajuan |
| `DELETE` | `/leave/:id` | Tidak ada lagi pembatalan oleh pemohon |
| `GET` | `/leave/pending` | Tidak ada lagi antrean persetujuan |
| `POST` | `/leave/:id/approve\|reject` | Tidak ada lagi keputusan |
| `GET`/`PUT` | `/leave/settings` | Saklar dihapus bersama kolomnya |

**Baru** — dua endpoint admin:

| Metode | Path | Guard | Catatan |
|---|---|---|---|
| `PUT` | `/api/admin/users/:id/leave` | `requireAnyRole([ADMIN, SUPER_ADMIN])` | `{ startDate, endDate, note? }` → setel atau ganti periode berjalan. `422 VALIDATION` untuk tanggal tidak sah, `endDate` sebelum `startDate`, atau rentang > 90 hari; `409 LEAVE_OVERLAP` bila beririsan dengan periode lain orang yang sama, dengan rentang yang bentrok disebut di pesannya (§10 T2). **Tanggal lampau diterima tanpa batas mundur** (§10 T3) — tidak ada pemeriksaan "sudah lewat" |
| `DELETE` | `/api/admin/users/:id/leave` | sama | Akhiri cuti yang sedang berjalan |

Keduanya **wajib masuk `PM_KEY_DENY`** (`server/api-keys/scopes.pm.ts`): menyetel ketersediaan orang lain adalah aksi berhak istimewa, sama kelasnya dengan mengubah peran. Pemetaan scope di `server/api-keys/scopes.ts` + assertion di `tests/api-keys/scopes.test.ts` dan `scopes.pm.test.ts`.

**Dibaca di tempat lain, tidak berubah:** `availability` pada `GET /team` tetap satu-satunya cara pihak luar membaca status cuti — bentuknya menyempit karena cabang `pending` hilang (lihat CU-02).

**Audit** — `LEAVE_APPROVE`/`LEAVE_REJECT`/`LEAVE_CANCEL`/`SETTINGS_LEAVE_UPDATE` dihapus, diganti `LEAVE_SET` (`leave.set`) dan `LEAVE_CLEAR` (`leave.clear`). Keduanya wajib masuk `AUDIT_ACTIONS` (`server/audit.ts`) **dan** `ACTION_META` (`app/lib/audit-api.ts`).

## 7. Tugas

### Tahap A — fondasi (≈3,5)

#### CU-01 · Migrasi `0022` + skema ciut · Dep: – · M (1,5) · **baton migrasi**
Berkas migrasi §5 + `server/db/schema.leave.ts` ditulis ulang jadi `leavePeriod` tanpa enum status; `leaveRequiresApproval` dicabut dari `schema.app.ts`. Jalankan ke **dua** DB (dev + test) sebelum lapor selesai. Tes: baris `approved` ikut pindah, baris `pending`/`rejected` tidak, tabel lama hilang.

#### CU-07 · Hapus tab Kebijakan kerja · Dep: – · S (1) · PARALEL
Hapus `settings/kebijakan-kerja.tsx`, barisnya di `settings.tabs.ts` dan `settings.previews.tsx`, barisnya di `tests/admin-pratinjau.test.ts`, dan sesuaikan `tests/admin-settings-tabs.test.ts` ke 5 tab — **dalam commit yang sama** (aturan P13 §1). Subtitle halaman (`SETTINGS_PAGE_COPY.description`) menyebut "kebijakan kerja", ikut disunting. Tidak menyentuh kode cuti sama sekali, jadi bisa jalan sebelum CU-01.

### Tahap B — server (≈3,5)

#### CU-02 · Ciutkan modul cuti, cabut alur pengajuan & persetujuan · Dep: CU-01 · L (2)
Hapus `leave.approvers.query.ts`, `leave.pending.query.ts`, `leave.policy.ts`, `leave.service.ts`, `server/settings-leave.ts`, dan keempat berkas endpoint `app-leave.*`. `leave.status.query.ts` disederhanakan: cabang `pending` dan `canSeePendingLeave` hilang, tinggal satu kueri tanpa parameter `viewer`. `LeaveStatusDto` menyempit jadi `{ kind: 'on_leave', until } | null`. `leave.validate.ts` dipertahankan untuk rentang tanggal dan batas 90 hari.

**Tes negatif wajib:** `note` tidak muncul di DTO Tim mana pun (D6).

#### CU-03 · API admin + scope + audit · Dep: CU-01, CU-02 · M (1,5)
`server/api/admin-leave.ts` dengan dua endpoint §6, dirakit ke `admin.ts`. Aksi audit baru, pemetaan scope, `PM_KEY_DENY`. **Tes negatif wajib:** member dan PM `403` di kedua endpoint; kunci API ditolak apa pun scope-nya.

### Tahap C — layar (≈4,5)

#### CU-04 · `/dashboard/users`: setel, akhiri, dan riwayat cuti · Dep: CU-03 · L (2,5)
`Menu.Item` "Setel cuti" di `UserActionsMenu.tsx` → modal `DateInput` mulai/selesai + `Textarea` catatan. "Akhiri cuti" pakai `modals.openConfirmModal` (tingkat T2 `CLAUDE.md` — tidak masuk Sampah, jadi bukan T1). Status berjalan tampil di `UserDetailDrawer`, lengkap dengan catatan — satu-satunya tempat catatan terlihat.

**Riwayat (§10 T1):** di bawah status berjalan, daftar ringkas periode yang sudah lewat — rentang, catatan, siapa yang mencatat. Berpaginasi atau dibatasi `LIMIT`, jangan muat semua. Tanpa bagian ini, periode yang seluruhnya lampau tidak terlihat di mana pun, padahal §10 T3 mengizinkan admin mencatatnya. Tombol `loading` selama request, `notifications.show()` sukses/gagal, keadaan kosong bermakna. Tabel desktop + kartu mobile sudah jadi pola di halaman ini, ikuti apa adanya.

#### CU-05 · `/app/settings` › Ketersediaan jadi baca-saja · Dep: CU-02 · S (1)
`LeaveSections` menyusut jadi satu kartu status: "Status kamu: Ada" atau "Cuti sampai 31 Okt", plus **satu kalimat** bahwa pengajuan cuti diurus lewat HRD atau atasan, bukan di aplikasi. Hapus `LeaveRequestModal`, `LeaveRejectModal`, `LeaveTeamSwitch`, `useLeaveActions`. Kalimat penjelas itu bukan hiasan — tanpa itu member hanya melihat tombol yang hilang (§8 R4).

#### CU-06 · Inbox: cabut kartu keputusan, pasang `leave_recorded` · Dep: CU-02, CU-03 · M (1,5)
Hapus kind `leave_requested` dan `leave_decided` dari `notification.types.ts` + katalog, hapus `emit.leave.ts`, hapus jalur tombol kedua di `inbox-view.ts:127-129`. Pasang kind baru `leave_recorded` (satu tombol, menuju `/app/settings`), dipancarkan dari CU-03. **Tes wajib:** baris notifikasi lama yang masih ada di basis data tetap terbaca sebagai kabar biasa, bukan kartu rusak — perilaku itu sudah dijanjikan `inbox-view.ts:67`, buktikan dengan tes alih-alih mengandalkannya.

### Tahap D — gerbang (≈1,5)

#### CU-08 · Dokumen + gerbang · Dep: semua · M (1,5) · **titik sinkron**
`README.md`: tulis ulang §"Kontrak API Cuti" (`487-500`), daftar pengecualian kunci API (`342`), bentuk `availability` di kontrak `/team` (`425`), dan deskripsi halaman `/app/settings`, `/app/team`, `/app/inbox` (`440,442,446`). `CHANGELOG.md` `[Unreleased]` dengan section **Removed** dan **Added** dari sudut pandang user. `HUTANG.md`: H-D4 disunting (K7), hari kerja + hari libur masuk sebagai hutang baru dengan konsumennya disebut. Sunting `P11` dan `P13` (§4). ADR di `docs/decisions/` — kenapa persetujuan cuti keluar dari aplikasi.

**Wajib `smoke:prod` + `smoke:binary`** (menyentuh `server/`), `bun run typecheck` nol error, suite hijau.

## 8. Risiko & mitigasi

| # | Risiko | Mitigasi |
|---|---|---|
| R1 | **Baton migrasi** `0022` bentrok dengan P13 RD-01 | §4 K3: P14 memegang `0022`, P13 geser `0023`. Jangan luncurkan dua tugas bermigrasi bersamaan |
| R2 | `DROP TABLE leave_request` menghapus riwayat cuti yang nyata | Migrasi menyalin baris `approved` **sebelum** drop, satu transaksi (§5). Verifikasi jumlah baris sebelum/sesudah di DB dev |
| R3 | Baris notifikasi lama (`leave_requested`) tertinggal di DB dan merusak Inbox | Inbox sudah gagal-lunak untuk kind tak dikenal (`inbox-view.ts:67`) — CU-06 membuktikannya dengan tes, bukan mengandalkan janji docstring |
| R4 | Member kehilangan cara mengajukan tanpa penjelasan, lalu mengira aplikasinya rusak | CU-05 wajib memasang kalimat penjelas. Bagian yang hilang begitu saja = cacat UX, bukan penyederhanaan |
| R5 | Admin jadi satu-satunya penyetel; di tim besar ini jadi beban dan statusnya telat terus | Diterima user 23 Okt (D3). Bila terbukti berat setelah dipakai, PM-Pengelola menyusul sebagai rencana terpisah — jangan diselundupkan ke run ini |
| R6 | Catatan cuti ("sakit", "umroh") bocor ke seluruh workspace | D6: catatan tidak pernah masuk DTO Tim. Tes negatif di CU-02 menjaganya |
| R7 | ~25 berkas tes disentuh sekaligus; suite merah berkepanjangan menyamarkan regresi nyata | Hapus tes bersama kode yang diujinya di commit yang sama, bukan menumpuk di akhir. Jangan jalankan dua suite penuh paralel (lihat memori "Parallel test runs flaky") |

## 9. Dokumen yang harus disunting

`README.md` · `CHANGELOG.md` · `HUTANG.md` (H-D4 + hutang hari kerja) · `P11-area-admin.md` (AD-07, §4, §9 kontradiksi 3, R1) · `P13-admin-data-nyata.md` (RD-07, §5, §2, RD-09) · `docs/decisions/` (ADR baru) · `PROGRES-S3-S8.md` · `server/api-keys/scopes.ts` + tesnya.

`CLAUDE.md` root **tidak** perlu disunting: definisi `/dashboard` di sana ("manajemen akun dan tim") justru makin tepat setelah menyetel ketersediaan masuk ke sana.

## 10. Pertanyaan terbuka — **semua dijawab 23 Okt 2026**

| # | Pertanyaan | Jawaban user |
|---|---|---|
| ~~T1~~ | ~~Admin perlu melihat **riwayat** periode cuti seseorang, atau cukup yang sedang berjalan?~~ | **DIJAWAB: ya, daftar ringkas di `UserDetailDrawer`.** CU-04 naik `L (2)` → `L (2,5)`. Alasannya muncul dari T3: periode yang seluruhnya sudah lewat tidak pernah tampil di kartu Tim (status dihitung dari hari ini), jadi tanpa layar riwayat catatan itu jadi data tulis-saja yang tak pernah terbaca siapa pun |
| ~~T2~~ | ~~Dua periode cuti yang tumpang tindih: tolak `409`, atau gabung otomatis?~~ | **DIJAWAB: tolak `409 LEAVE_OVERLAP`.** Pesannya menyebut periode yang bentrok supaya admin bisa langsung memperbaikinya. Dua keputusan HRD yang berbeda tetap jadi dua baris yang bisa ditelusuri; menggabung akan melebur keduanya dan menyisakan pertanyaan catatan mana yang dipakai |
| ~~T3~~ | ~~Admin boleh mencatat cuti yang tanggalnya **sudah lewat**?~~ | **DIJAWAB: boleh, tanpa batas mundur.** Alur ini pencatatan, bukan pengajuan — kasus paling sering justru cuti yang sudah berjalan dan baru sempat dicatat. Penjaganya audit (`leave.set` merekam siapa dan kapan), bukan larangan tanggal. Batas 90 hari per periode tetap berlaku |

## 11. Sumber

Diskusi user 23 Okt 2026 (tiga keputusan lewat pertanyaan terstruktur: bentuk status, hak akses, jenis ketidakhadiran; dua usul agent disetujui: notifikasi, keterlihatan catatan) · pemindaian kode `feature/project-management` @ `a1b8078` · `P11-area-admin.md` · `P13-admin-data-nyata.md` · riset kompetitor `tahapan-proyek/01-riset/rangkuman-kompetitor/` (nol sebutan hari kerja/hari libur — dasar D1).
