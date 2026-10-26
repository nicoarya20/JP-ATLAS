# P13 — Rencana eksekusi: Admin dari pratinjau ke data nyata

> 22 Okt 2026 · tahap 2 · lanjutan langsung `P11-area-admin.md`. Mengikat: `../KEPUTUSAN-MVP-INTI.md` > `../JADWAL-S3-S8.md` > `P11-area-admin.md` > dokumen ini. Lahir dari diskusi user 22 Okt 2026 ("menu admin yang datanya masih dummy, aku mau pakai data real dari backend"). Fondasi kode menang atas desain; kutipan `path:baris` adalah yang dibaca di `main` @ `dedb775` pada tanggal itu. Tanda **ASUMSI** = belum diverifikasi.
>
> **Dikoreksi 23 Okt 2026 oleh `P14-cuti-status-admin.md`:** RD-07 (tab Kebijakan kerja) **dicoret** — lihat §3 D7 dan §4 K6. Akibatnya migrasi turun dari enam kolom ke **lima**, tab Pengaturan tinggal **lima**, dan pengingat acara bawaan berpindah ke RD-08. Anggaran turun ≈2 (21 → 19).
>
> **P14 mendarat 26 Okt 2026** (CU-01..CU-08): tab Kebijakan kerja dan `leaveRequiresApproval` sudah hilang dari kode, migrasi `0022_admin_policy.sql` memang lima kolom, dan `0023_leave_period.sql` sudah mendarat di belakangnya. Hari kerja dan hari libur ada di `HUTANG.md` **H-E15**, bukan menggantung di rencana ini.

## 1. Ringkasan

- **Yang tersisa dummy persis 8 berkas**, tidak lebih dan tidak kurang — daftarnya dikunci oleh `PREVIEW_FILES` di `tests/admin-pratinjau.test.ts:28-37`. Enam tab Pengaturan + dua berkas Beranda. (**Dikoreksi 23 Okt 2026, P14 CU-07:** **7 berkas** — `kebijakan-kerja.tsx` dihapus tanpa pengganti, jadi lima tab Pengaturan + dua berkas Beranda.) Sisa menu Admin (Pengguna, Peran & izin, Ekspor data, kartu Antrean) sudah memakai data nyata.
- **12 tugas aktif, RD-01..RD-13 dikurangi RD-10 yang dicoret**, ≈ **21 hari-orang AI**, tiga tahap yang bisa dirilis sendiri-sendiri. (**Dikoreksi 23 Okt 2026, P14:** **11 tugas aktif**, ≈ **19** — RD-07 ikut dicoret.) Ini **lebih besar** dari sisa anggaran P11 untuk tugas yang sama (≈13) — sebabnya ada di §4, akibat keputusan user 22 Okt; dua keputusan 23 Okt (§3 D5, D6) memotongnya kembali.
- **Satu migrasi `0022`** memuat **tiga** kelompok kolom sekaligus (pengumuman, kebijakan akses, pemberitahuan bawaan), bukan dua seperti rencana P11. Satu baton, satu kali antre. **Lima** kolom — `allowed_email_domains` dicabut (§3 D6) dan `working_days` menyusul (§3 D7). **Nomor final, dieksekusi 23 Okt 2026: `0022_admin_policy.sql`** — lajur P14 belum mendarat, jadi aturan "siapa mendarat duluan menang" berlaku dan `0022_leave_period.sql` yang bergeser ke `0023` (§4 K6).
- **Temuan keras: repo ini tidak punya pengirim email sama sekali.** Tidak ada `nodemailer`, tidak ada SMTP, tidak ada satu pun pemanggilan kirim surel di `server/`. Kolom "Email" di pratinjau Pemberitahuan tidak bisa dibuat nyata di run ini — keluar dari lingkup, dicatat ke `HUTANG.md`.
- **Aturan yang berlaku di tiap tugas:** berkas pratinjaunya dihapus, barisnya di `settings.previews.tsx` dihapus, barisnya di `tests/admin-pratinjau.test.ts` dihapus — **dalam commit yang sama**. Tes merah bila salah satu tertinggal (P11 AD-P).

## 2. Inventaris dummy (dibaca di kode)

| Layar | Berkas pratinjau | Backend yang **sudah** ada | Yang **belum** ada |
|---|---|---|---|
| Identitas | `settings/identitas.tsx` | `server/settings-branding.ts`; `PUT /api/settings/branding` (`api/settings.ts:38`) | — hanya guard (RD-02) |
| Pengumuman | `settings/pengumuman.tsx` | pola banner `frameInfo()` + `settings-maintenance.ts` | kolom, service, API, banner, status tutup per orang |
| Akses masuk | `settings/akses-masuk.tsx` | `signupEnabled`, `emailAuthEnabled` (`schema.app.ts`); `PUT /api/settings` | 3 isian: wajib persetujuan, peran bawaan, masa undangan. Domain yang diizinkan **dicabut dari layar** (§3 D6) |
| ~~Kebijakan kerja~~ | ~~`settings/kebijakan-kerja.tsx`~~ | **DICORET 23 Okt 2026 (§3 D7).** Berkas pratinjaunya dihapus tanpa pengganti oleh P14 CU-07; `leaveRequiresApproval` hilang bersama alur persetujuan cuti | — |
| Pemberitahuan | `settings/pemberitahuan.tsx` | `notification_pref` per **kategori** + `NOTIFICATION_KINDS` (`notification.catalog.ts:41`) | bawaan organisasi, aturan gabung; **Email tidak mungkin** |
| Fitur | `settings/fitur.tsx` | `featureFlags` jsonb, `isFeatureEnabled()` (`settings-features.ts:52`) | katalog terkurasi **baca-saja** (§3 D5). Gating sungguhan tidak dikerjakan di run ini — belum satu fitur pun membaca flag |
| Beranda (angka) | `home/beranda.content.ts` | sumber data tiap kartu ada, tersebar | `GET /api/admin/overview` |
| Beranda (kartu) | `home/beranda.widgets.tsx` | pola `Widget { ok }` di `server/home/*` | penyambungan ke overview |

Nilai yang hari ini hidup di luar basis data dan harus pindah (RD-04): `INVITATION_TTL_DAYS = 14` (`server/account/limits.ts:7`), peran bawaan pendaftar (ditetapkan di `server/account/signup-gate.ts`), serta status tunggu yang sekarang **selalu** `pending` (`server/db/schema.auth.ts:31-33`). `ALLOWED_EMAIL_DOMAINS` (`server/env.ts:31,67`) **tidak** ikut pindah: tetap env-only (§3 D6), `invitation.query.ts:38` dibiarkan apa adanya.

## 3. Keputusan user 22–23 Okt 2026

| # | Pertanyaan | Jawaban | Konsekuensi |
|---|---|---|---|
| D1 | Akses masuk: 3 isian tanpa tempat di DB | **Pindahkan ke DB, Admin yang atur** | 4 kolom baru; `signup-gate` dan `invitation.query` membaca setelan, env/konstanta jadi *fallback* saat NULL |
| D2 ~~*(22 Okt)*~~ · **dikoreksi oleh D5** | Fitur: saklar sungguhan atau daftar saja | ~~**Saklar sungguhan — fitur benar-benar mati**~~ | Menu disembunyikan **dan** endpoint menolak `403 FEATURE_DISABLED`; pekerjaan lintas modul, dipecah jadi RD-09 + RD-10 |
| D3 | Pemberitahuan milik P9 G-02 | **Ditarik ke run ini** | P9 G-02 dicoret dari P9, pemiliknya jadi RD-08. Kolom Email tetap di luar lingkup (§1) |
| D4 | Urutan rilis | **Pengaturan dulu, Beranda terakhir** | Tahap A → B → C di §6; Beranda (RD-11/12) tidak memblokir rilis Pengaturan |
| D5 *(23 Okt)* | Siapa pemilik saklar fitur — Admin atau Super-admin? | **Super-admin. Tab Fitur di /dashboard jadi baca-saja** | Membatalkan sebagian D2: RD-10 dicoret (−2,5), RD-09 jadi katalog + layar baca-saja, `PUT /api/settings/features` **tetap** super-admin. Alasan: mematikan `trash` mencabut jaring pengaman seluruh aksi destruktif (T1/T2/T3 `CLAUDE.md`), fitur "uji coba" bisa pecah dan hanya terbaca dari `/dev/server-logs`, dan dua pintu ke satu baris `app_setting` memecah jejak audit |
| D6 *(23 Okt)* | Isian "domain email yang diizinkan" di tab Akses masuk | **Dicabut dari layar, tetap env-only** | Kolom `allowed_email_domains` keluar dari migrasi setelan (§5). `ALLOWED_EMAIL_DOMAINS` + `invitation.query.ts:38` tidak disentuh. Alasan user: konsepnya belum dipahami, jadi jangan dulu diberi UI |
| D7 *(23 Okt)* | Tab Kebijakan kerja: masih perlu? | **Dihapus seluruhnya** | RD-07 dicoret (−2), kolom `working_days` keluar dari migrasi, tab Pengaturan 6 → 5. Alasan: pemindaian 23 Okt menemukan **nol** konsumen hari kerja di `server/` dan `app/lib/`, dan RD-07 sendiri berjanji "fase 1 hanya simpan + tampilkan" — artinya setelan yang disimpan tapi tidak dibaca siapa pun. Saklar cuti di dalamnya hilang bersama alur persetujuan (P14); pengingat acara bawaan pindah ke RD-08; hari kerja + hari libur turun ke `HUTANG.md` dan dibangun bersama kalkulator tenggatnya. Rinciannya di `P14-cuti-status-admin.md` |

## 4. Koreksi terhadap rencana P11

| # | P11 menulis | Yang sebenarnya | Akibat |
|---|---|---|---|
| K1 | AD-06 `M (1,5)`, "pakai ulang `AuthSettingsCard`, buang bagian teknis" | Tiga dari lima isian di layar belum ada di DB, dan dua di antaranya mengubah **jalur pendaftaran** (`signup-gate.ts`), bukan sekadar form | Dipecah: RD-04 (service+API, `L 2`) + RD-05 (layar, `M 1,5`). Tes negatif pendaftaran wajib |
| K2 | AD-08 `M (1,5)`, "daftar flag yang dikenal + deskripsi Indonesia" | Tidak ada satu pun fitur produk yang hari ini mati bila flag-nya dimatikan — `isFeatureEnabled()` ada tapi tak dipanggil fitur mana pun. D2 membuat tab ini jadi enam saklar mati-hidup lintas modul | Dipecah: RD-09 (katalog+layar, `M 1,5`) + RD-10 (gating, `L 2,5`). **Diperbaiki 23 Okt (§3 D5):** D2 dibatalkan sebagian, RD-10 dicoret, RD-09 jadi baca-saja |
| K3 | Tab Pemberitahuan "menunggu P9 G-02" | Pratinjau menampilkan **7 jenis × 2 kanal**. Tabel `notification_pref` menyimpan per **kategori** (3: `action`, `news`, `event_reminder`), kanal hanya `in_app` (`schema.notification.ts`), dan `action` memang tidak boleh dimatikan (`notification.catalog.ts:20-22`) | RD-08 memakai **kategori** sebagai sumber kebenaran dan mengelompokkan 7 jenis di bawahnya di layar. Kolom Email dihapus dari layar |
| K4 | Migrasi `0022` = 2 kolom (pengumuman + hari kerja) | D1 dan D3 menambah dua kelompok kolom lagi | Satu migrasi `0022` untuk keempatnya (§5). Baton dipegang RD-01 saja, bukan tersebar di AD-05/AD-06/AD-07. **Dikoreksi 23 Okt (K6):** tiga kelompok, lima kolom, nomor `0022` |
| K5 | Katalog fitur memuat `export` dan `api-keys` | Keduanya adalah alat **Admin** (`/dashboard/export`) dan **Super-admin** (`/dev/api-keys`), bukan fitur `/app`. Saklarnya bisa mengunci Admin dari alatnya sendiri | Usul RD-09: `export` dan `api-keys` **keluar** dari katalog; saklar hanya untuk fitur `/app` (`leave`, `events`, `trash`, `ask-data`). **Disetujui user 23 Okt 2026** (§11 T1) |
| K6 *(23 Okt, lajur P14)* | P11 **dan** rencana ini sama-sama mengklaim nomor migrasi `0022`, dan keduanya memuat `working_days` | `working_days` tidak punya pembaca sama sekali (§3 D7), jadi migrasi ini turun ke **lima** kolom. Soal nomornya: P14 berencana mengambil `0022` untuk `0022_leave_period.sql`, tapi **pemeriksaan ulang `server/db/migrations/` pada 23 Okt 2026 menemukan berkas itu belum ada** — migrasi terakhir di repo masih `0021_leave_request.sql` | RD-01 mendarat duluan sebagai **`0022_admin_policy.sql`**, sesuai aturan tie-break (P11 §8 R1: siapa pun yang mendarat duluan menang). **Lajur P14 wajib menggeser `leave_period` ke `0023`** — P11 §5 dan §8 R1 sudah disunting di commit yang sama; `P14-cuti-status-admin.md` dipegang worker lain dan perlu koreksi yang sama. RD-07 dicoret |

## 5. Migrasi `0022_admin_policy.sql`

**Nomor final 23 Okt 2026 (§4 K6):** `0022`. Rencana ini sempat menggesernya ke `0023` dengan asumsi `0022_leave_period.sql` milik P14 sudah mendarat; pemeriksaan ulang `server/db/migrations/` saat RD-01 dikerjakan menemukan migrasi terakhir masih `0021_leave_request.sql`, jadi RD-01 mendarat duluan dan mengambil `0022`. **Lajur P14 menggeser `leave_period` ke `0023`.** Semua kolom **nullable tanpa backfill**, guard idempoten `IF NOT EXISTS`, satu tabel `app_setting` — tidak ada tabel baru. **Lima** kolom: `allowed_email_domains` dicabut 23 Okt (§3 D6, tetap env-only) dan `working_days` menyusul (§3 D7).

| Kolom | Tipe | Untuk | NULL berarti |
|---|---|---|---|
| `announcement` | jsonb | `{ text, level, active, dismissibleUntil }` | tidak ada pengumuman |
| ~~`working_days`~~ | ~~jsonb~~ | **DICABUT 23 Okt 2026 (§3 D7).** `days[]` dan `holidays[]` menunggu kalkulator tenggat; `defaultEventReminderMinutes` pindah ke `notification_defaults` di baris bawah | — |
| `signup_requires_approval` | boolean | saklar "akun baru wajib disetujui" | perilaku sekarang (wajib) |
| `default_signup_role` | text | peran bawaan pendaftar | `member` |
| `invitation_ttl_days` | integer | masa berlaku undangan | `INVITATION_TTL_DAYS` (14) |
| `notification_defaults` | jsonb | `{ news: bool, eventReminder: bool, defaultEventReminderMinutes: int }` bawaan organisasi — **`defaultEventReminderMinutes` ditambahkan 23 Okt 2026 (§3 D7)**, pindah dari `working_days` yang dicabut | kedua kategori menyala, pengingat 30 menit |

Pola NULL-sebagai-bawaan mengikuti kolom `rate_limit_*` dan `retention_*` yang sudah ada, sehingga layar bisa membedakan "bawaan" dari "ditimpa Admin" dan menyediakan tombol kembalikan ke bawaan.

## 6. Endpoint

| Metode | Path | Guard | Catatan |
|---|---|---|---|
| `PUT` | `/api/settings/branding` | super-admin → **admin + super-admin** | RD-02, sudah ada |
| `PUT` | `/api/settings/features` | **tetap** super-admin | §3 D5 — Admin membacanya lewat `GET`, tidak menulis |
| `PUT` | `/api/settings/access-policy` | admin + super-admin *(baru)* | RD-04; menggantikan bagian kebijakan di `PUT /api/settings` |
| `PUT` | `/api/settings/announcement` | admin + super-admin *(baru)* | RD-06 |
| ~~`PUT`~~ | ~~`/api/settings/working-days`~~ | — | **DICABUT 23 Okt 2026 (§3 D7)** bersama RD-07 |
| `PUT` | `/api/settings/notification-defaults` | admin + super-admin *(baru)* | RD-08 |
| `GET` | `/api/admin/overview` | admin + super-admin *(baru)* | RD-11 |

Rate limit, retensi, maintenance, demo **tetap** `requireRole(SUPER_ADMIN)` dan tidak disentuh (`api/settings.ts:93`, `api/settings-ops.ts:23,47,62,103`, `api/settings-access.ts:18`).

**Audit** — aksi baru: `SETTINGS_ANNOUNCEMENT_UPDATE`, ~~`SETTINGS_WORKING_DAYS_UPDATE`~~ (**dicabut 23 Okt 2026, §3 D7**), `SETTINGS_ACCESS_POLICY_UPDATE`, `SETTINGS_NOTIFICATION_DEFAULTS_UPDATE`. Semua wajib masuk `AUDIT_ACTIONS` (`server/audit.ts`) **dan** `ACTION_META` (`app/lib/audit-api.ts`).

**Scope kunci API** — tiap rute baru dipetakan di `server/api-keys/scopes.ts` + assertion di `tests/api-keys/scopes.test.ts`. `PUT /settings/access-policy` masuk daftar tolak kunci API: mengubah peran bawaan pendaftar adalah eskalasi hak.

## 7. DAFTAR TUGAS

Ukuran: `S (1)` · `M (1,5)` · `L (2)` · `L (2,5)` hari-orang AI.

### Tahap A — fondasi (≈3) · memblokir semua tugas lain

#### RD-01 · Migrasi `0022` + modul setelan baru · Dep: – · M (1,5) · **baton migrasi** · **SELESAI 23 Okt 2026**
**Lima** kolom §5 sekaligus (bukan enam: `working_days` dicabut, §3 D7). **Tiga** modul pembaca/penulis mengikuti pola `settings-branding.ts`: `server/settings-announcement.ts`, `settings-access-policy.ts`, `settings-notification-defaults.ts` — masing-masing `parse*`/`normalize*`/`upsert*` + konstanta bawaan, tanpa API dan tanpa layar. `settings-working-days.ts` **tidak dibuat**. Jalankan migrasi ke **dua** DB (dev + test) sebelum lapor selesai. Tes unit per modul: NULL → bawaan, nilai tidak wajar → ditolak.

#### RD-02 · Longgarkan guard setelan organisasi ke Admin · Dep: – · M (1,5) · **persetujuan user satu per satu** · PARALEL dgn RD-01
Ini AD-03 milik P11, belum dikerjakan (`api/settings.ts:33,41,61` masih `requireRole(SUPER_ADMIN)`). `requireRole(SUPER_ADMIN)` → `requireAnyRole([ADMIN, SUPER_ADMIN])` **hanya** untuk branding. `PUT /settings/features` **tidak ikut dilonggarkan** (§3 D5); Admin hanya perlu membacanya. Tes negatif wajib: member dan PM tetap 403 di semua endpoint setelan; rate-limit/retensi/maintenance/demo tetap 403 untuk admin. Diff ditinjau manual sebelum merge.

### Tahap B — ~~enam~~ **lima** tab Pengaturan (≈12,5 → **10,5** setelah RD-07 dicoret, §3 D7)

#### RD-03 · Tab Identitas · Dep: RD-02 · S (1)
Backend sudah lengkap, ini murni layar: pakai ulang `app/components/settings/BrandingCard.tsx`. Hapus `settings/identitas.tsx` + barisnya di registry + barisnya di tes, daftarkan panel di `panels.tsx`.

#### RD-04 · Kebijakan akses: service + API · Dep: RD-01, RD-02 · L (2)
`PUT /api/settings/access-policy`. `signup-gate.ts` membaca `defaultRole` dan `requiresApproval` dari setelan (konstanta hanya dipakai saat kolomnya NULL); pemeriksaan domain tetap membaca `ALLOWED_EMAIL_DOMAINS` dari env dan tidak diubah (§3 D6); `invitation.query.ts:138` memakai `invitationTtlDays` dari setelan. **Tes negatif wajib:** domain di luar `ALLOWED_EMAIL_DOMAINS` tetap ditolak seperti sebelumnya, `requiresApproval=false` membuat akun baru langsung `approved`, peran bawaan tidak pernah bisa diset ke `admin`/`super-admin` lewat endpoint ini.

**Akun `pending` yang sudah ada tidak disentuh** (§11 T2, dijawab 23 Okt): mematikan pendaftaran mandiri hanya menutup jalur daftar baru. Antrean persetujuan tetap utuh dan tetap bisa disetujui satu per satu. Tes wajib: matikan pendaftaran saat ada akun `pending`, pastikan jumlah antrean tidak berubah dan persetujuan tetap berhasil.

#### RD-05 · Tab Akses masuk · Dep: RD-04 · M (1,5)
Empat isian pratinjau jadi form sungguhan (domain email dicabut, §3 D6) + ringkasan "yang dilihat pendaftar" yang dihitung ulang dari nilai form. Mematikan pendaftaran mandiri adalah perubahan berdampak luas → dialog T2 dengan dampak nyata.

#### RD-06 · Pengumuman: API + banner semua area · Dep: RD-01, RD-02 · L (2,5) · **menyentuh `AppFrame`**
`PUT /api/settings/announcement`; banner ikut `frameInfo()` seperti maintenance (`server/app-info.ts:18-21`), hanya di area login-an — landing dan halaman masuk tidak dipasangi (P11 Q4). Status tutup per orang disimpan di `localStorage` berkunci `updatedAt` pengumuman, sehingga pengumuman yang disunting muncul lagi; pembacaan dibungkus `try/catch` dan layar tetap benar bila storage diblokir. Gagal baca = banner tidak tampil, bukan layar putih. **Wajib `smoke:prod` + `smoke:binary`.**

#### ~~RD-07 · Tab Kebijakan kerja~~ · **DICORET 23 Okt 2026 (§3 D7)** · L (2)
~~Hari kerja, daftar hari libur (`DateInput`, bukan `<input type="date">`), pengingat acara bawaan, dan saklar cuti wajib disetujui yang sudah ada (`settings-leave.ts`). **Fase 1 hanya menyimpan + menampilkan** (P11 Q5) — perhitungan tenggat S1/S2 tidak disentuh.~~

Empat isinya berpisah jalan: **saklar cuti** hilang bersama alur persetujuan (P14 CU-02); **pengingat acara bawaan** pindah ke RD-08; **hari kerja + hari libur** turun ke `HUTANG.md`.

Yang membunuh tugas ini adalah janjinya sendiri. "Fase 1 hanya menyimpan + menampilkan" berarti admin mencentang Sabtu sebagai hari libur dan tenggat tugas tetap jatuh di Sabtu — saklar yang tidak tersambung ke apa pun. Pemindaian 23 Okt memastikannya: nol hit `isWorkday`/`getDay()`/akhir pekan di `server/` dan `app/lib/`. Hari kerja dibangun **bersama** kalkulator yang membacanya, bukan sebelumnya. Berkas pratinjaunya dihapus tanpa pengganti oleh P14 CU-07.

#### RD-08 · Tab Pemberitahuan: bawaan organisasi · Dep: RD-01, RD-02 · L (2)
Dua saklar bawaan (`news`, `event_reminder`) sesuai kategori yang benar-benar ada; tujuh jenis dari `NOTIFICATION_KINDS` dikelompokkan di bawahnya sebagai daftar baca-saja supaya Admin tahu apa yang ikut mati. Kategori `action` ditampilkan terkunci dengan alasannya. Aturan gabung: **user boleh mematikan untuk dirinya, tidak boleh menyalakan yang dimatikan Admin** — ditegakkan di `notification.recipients.ts`, bukan di layar, dengan tes. Kanal Email tidak dibuat; catat ke `HUTANG.md`.

**Ditambahkan 23 Okt 2026 (§3 D7, P11 §9 kontradiksi 3):** isian **pengingat acara bawaan** (menit, bawaan 30) pindah ke tab ini dari RD-07 yang dicoret — ini memang nilai awal notifikasi, bukan kebijakan kerja. Disimpan di `notification_defaults.defaultEventReminderMinutes` (§5), berlaku untuk acara **baru** saja; acara yang sudah dijadwalkan tidak disentuh (menutup §11 T3).

**Jumlah jenis berubah:** P14 menghapus `leave_requested` dan `leave_decided` lalu menambah `leave_recorded`, jadi `NOTIFICATION_KINDS` berisi **enam** jenis saat RD-08 dikerjakan, bukan tujuh. Baca angkanya dari katalog, jangan ditulis tetap di layar.

#### RD-09 · Tab Fitur: katalog terkurasi + layar **baca-saja** · Dep: – · M (1,5)
Katalog `server/features.catalog.ts`: kunci, nama Indonesia, penjelasan satu baris, kalimat "bila dimatikan", bawaan. Isinya **empat** fitur `/app` (`leave`, `events`, `trash`, `ask-data`) — `export` dan `api-keys` dikeluarkan, **disetujui user 23 Okt 2026** (§4 K5, §11 T1).

**Dikoreksi 23 Okt 2026 (§3 D7):** `leave` **tetap** di katalog, tetapi kalimat "bila dimatikan" wajib ditulis ulang. Setelah P14, mematikannya menyembunyikan badge Ketersediaan di Tim dan menu "Setel cuti" di `/dashboard/users` — bukan lagi "anggota tidak bisa mengajukan cuti", karena mengajukan cuti memang tidak lagi terjadi di aplikasi. **Selesai 26 Okt 2026 (P14 CU-08):** `whenOff` di `server/features.catalog.ts` menyebut ketiga tempatnya, termasuk kontrol di menu Pengguna yang mendarat di CU-04.

Layar Admin **membaca** `GET /api/settings` dan menampilkan status tiap fitur sebagai lencana `Nyala`/`Mati` (teks, bukan warna saja) plus satu kalimat ke mana harus pergi untuk mengubahnya. Tidak ada saklar, tidak ada tombol simpan — karena itu tugas ini **tidak lagi bergantung pada RD-02**. Penyunting key/value di `/dev` tetap satu-satunya penulis; flag di luar katalog tidak ditampilkan di layar Admin dan tidak pernah dihapus olehnya.

**Bonus yang wajib ikut:** `FeatureFlagsCard` di `/dev` mengambil nama Indonesia dari katalog yang sama, supaya satu kunci tidak punya dua nama.

#### ~~RD-10 · Saklar fitur yang benar-benar mematikan~~ · **DICORET 23 Okt (§3 D5)** · L (2,5)
Gating sungguhan tidak dikerjakan di run ini. Akibatnya **harus disadari**: `isFeatureEnabled()` tetap ada tetapi tak satu fitur pun memanggilnya, jadi saklar di `/dev` hari ini mengubah sebuah baris basis data dan tidak lebih. Layar RD-09 karena itu menampilkan status, bukan janji.

Dicatat ke `HUTANG.md` sebagai hutang terbuka dengan isi aslinya: menu hilang dari `NAV` `/app`, rute menolak dengan halaman yang menjelaskan, endpoint `403 FEATURE_DISABLED` dari satu penjaga bersama (bukan `if` yang disalin ke tiap handler), cache `isFeatureEnabled` menumpang cache setelan 5 detik yang sudah ada, tes per fitur "menyala = perilaku lama persis", dan `smoke:prod` karena menyentuh `server/`.

### Tahap C — Beranda (≈4,5)

#### RD-11 · `GET /api/admin/overview` · Dep: RD-01 · L (2) · PARALEL dgn Tahap B
Satu panggilan untuk seluruh layar, tiap bagian `Widget { ok }` gagal-lunak — pola `server/home/*` diikuti persis, satu berkas query per kartu di `server/admin-overview/`. Lima kartu: anggota per peran (`api/admin-users.query.ts`), proyek per status (`project/project-list.query.ts`), tugas telat (`task/task.query.ts`), agenda pekan ini (`event/events.query.ts`), perubahan peran terakhir (tabel audit, aksi `USER_ROLE_SET`). **Hindari N+1 dan jangan muat seluruh tabel** — tiap kartu berbatas (`LIMIT`) dan agregatnya dihitung di SQL.

#### RD-12 · Beranda admin memakai data nyata · Dep: RD-11 · L (2,5)
Lima kartu pratinjau menunjuk ke overview, tombol "Coba lagi" per bagian, keadaan kosong bermakna per kartu. Kartu Antrean yang sudah nyata tidak diubah. Hapus `beranda.content.ts`, `beranda.widgets.tsx` yang bertanda pratinjau, `PratinjauAlert` di `routes/admin/dashboard.tsx`, dan dua barisnya di tes. Email anggota dimask di kartu perubahan peran.

#### RD-13 · Gerbang: pratinjau nol, dokumen, demo · Dep: semua · S (1) · **titik sinkron**
`PREVIEW_FILES` kosong dan `tests/admin-pratinjau.test.ts` ikut dihapus bersama `pratinjau.tsx` (registernya tak lagi menjaga apa pun); `SETTINGS_PANELS` berisi ~~enam~~ **lima** tab (§3 D7); `isPlaceholderTab()` selalu `false`. Sunting `CLAUDE.md` root (definisi `/dashboard`), `README.md` bila kontrak publik berubah, ADR baru di `docs/decisions/` (setelan pindah ke Admin + saklar fitur), `HUTANG.md` (kanal Email, P9 G-02 dicoret), `JADWAL-S3-S8.md`, `PROGRES-S3-S8.md`, `CHANGELOG.md`.

## 8. Gerbang & kriteria demo

| Gerbang | Isi | Lulus bila |
|---|---|---|
| **SP-RD1** | RD-01..RD-03 | Admin mengubah nama aplikasi dan melihatnya berubah di semua area, tanpa super-admin. Member/PM 403 di semua endpoint setelan |
| **SP-RD2** | RD-04..RD-09 (RD-07 dicoret) | **Empat** tab yang bisa ditulis (Identitas, Pengumuman, Akses masuk, Pemberitahuan) menyimpan ke basis data dan nilainya bertahan setelah muat ulang; tab Fitur baca-saja. Pengumuman tampil di tiga area dan bisa ditutup. Tab Fitur membaca status sungguhan dari `app_setting` — Admin tidak punya saklar di sana, dan tidak ada endpoint tulis fitur yang menerima Admin |
| **SP-RD3** | RD-11..RD-13 | Beranda tanpa satu pun angka contoh; matikan satu sumber data, kartunya sendiri yang gagal dengan "Coba lagi", bukan seluruh layar |

Definisi selesai per tugas mengikuti `README.md` §3 tanpa pengecualian: tes hijau, typecheck nol, lint, CHANGELOG, dan untuk tugas yang menyentuh `server/`/`AppFrame` — `smoke:prod` **dan** `smoke:binary`.

## 9. Risiko & mitigasi

| # | Risiko | Mitigasi |
|---|---|---|
| R1 | **RD-04 menyentuh jalur pendaftaran** — salah tulis = orang luar bisa mendaftar, atau semua orang terkunci | Env/konstanta tetap jadi *fallback* saat kolom NULL, jadi migrasi saja tidak mengubah perilaku apa pun. Tes negatif pendaftaran sebelum layar dibuat |
| R2 | **RD-02 melonggarkan guard** = eskalasi hak bila salah sasaran | Persetujuan user satu per satu, tes negatif member/PM/admin, diff ditinjau manual. Hanya branding + features |
| R3 | **Tab Fitur baca-saja menipu**: Admin membaca "Nyala" padahal belum ada gating, jadi "Mati" pun fiturnya tetap jalan (RD-10 dicoret) | Kalimat di layar menyebut status flag, bukan janji perilaku; hutangnya tercatat di `HUTANG.md`. Jangan tulis "fitur ini mati" sebelum RD-10 dikerjakan |
| R4 | Saklar `export`/`api-keys` mengunci Admin dari alatnya sendiri | Sebagian besar hilang sendiri karena Admin tidak lagi punya saklar (§3 D5). Tetap diusulkan keluar dari katalog (§4 K5) supaya daftarnya jujur: keduanya bukan fitur `/app` |
| R5 | RD-06 menyentuh `AppFrame` → semua area terpengaruh | Smoke prod + binary; banner gagal-lunak; `localStorage` dibungkus `try/catch` |
| R6 | RD-11 N+1 atau memuat seluruh tabel | Agregat di SQL, `LIMIT` per kartu, ditinjau di review |
| R7 | Baton migrasi bertabrakan dengan lajur produk | **Sudah terjadi sekali** (§4 K6), dan tie-break-nya dipakai: RD-01 mendarat duluan sebagai `0022_admin_policy.sql`, lajur P14 menggeser `leave_period` ke `0023`. RD-01 pemegang tunggal; periksa ulang `server/db/migrations/` sebelum `db:generate`, dan jangan luncurkan dua tugas bermigrasi bersamaan |
| R8 | Dua worker menjalankan suite penuh bersamaan = gagal acak | Serialkan jalannya tes, jangan perlakukan sebagai regresi |

## 10. Dampak ke dokumen lain

`P11-area-admin.md` (AD-03/04/05/06/08/14/15 diserap ke sini; AD-07 **dicoret**, bukan diserap — tulis penunjuknya) · `P14-cuti-status-admin.md` (**wajib menggeser `leave_period` ke `0023`** — `0022` sudah dipakai `0022_admin_policy.sql`; RD-07 dicoret dari sana) · `P9-pengaturan-lanjutan.md` (G-02 dicoret, pemiliknya RD-08) · `CLAUDE.md` root · `README.md` · `docs/decisions/` (ADR baru) · `HUTANG.md` (kanal Email pemberitahuan; **gating fitur — bekas RD-10, §3 D5**) · `JADWAL-S3-S8.md` · `PROGRES-S3-S8.md` · `server/api-keys/scopes.ts` + `tests/api-keys/scopes.test.ts`.

## 11. Pertanyaan terbuka — **semua dijawab 23 Okt 2026**

| # | Pertanyaan | Jawaban user |
|---|---|---|
| ~~T1~~ | ~~`export` dan `api-keys` dikeluarkan dari katalog fitur (§4 K5) — setuju?~~ | **DIJAWAB: ya, keluar.** Katalog RD-09 berisi **empat** fitur `/app`: `leave`, `events`, `trash`, `ask-data`. Daftar yang berjudul "fitur" tidak mencampurkan alat Admin (`/dashboard/export`) dan Super-admin (`/dev/api-keys`) |
| ~~T2~~ | ~~Mematikan "pendaftaran mandiri" saat ada pendaftar yang masih menunggu: antreannya tetap bisa disetujui, atau ikut ditolak?~~ | **DIJAWAB: antrean tetap bisa disetujui.** Mematikan pendaftaran menutup pintu untuk orang baru, bukan membatalkan orang yang sudah mendaftar secara sah. RD-04 **tidak menyentuh** akun berstatus `pending` yang sudah ada |
| ~~T3~~ | ~~Pengingat acara bawaan di Kebijakan kerja — berlaku untuk acara baru saja, atau juga acara yang sudah dijadwalkan?~~ | **DITUTUP 23 Okt 2026 (§3 D7): acara baru saja.** Isiannya pindah ke RD-08 dan hanya jadi nilai awal form acara; acara yang sudah dijadwalkan tidak disentuh. Menulis ulang data acara yang sudah ada mengubah pengingat yang mungkin sengaja disetel pembuatnya |

## 12. Sumber

- Diskusi user 22 Okt 2026 (empat keputusan §3).
- Kode `main` @ `dedb775` — semua `path:baris` di §2 dan §4.
- `P11-area-admin.md` (AD-01..AD-20, keputusan 21 Okt), `P9-pengaturan-lanjutan.md` (G-02), `../HUTANG.md`, `../JADWAL-S3-S8.md`.
