# 0003 — PPK: menu Event menambah 3 URL `/app` ke `contract-v1`

Dicatat 18 Oktober 2026 (S7 E-01, pemegang baton migrasi 0018). Ini **Permintaan Perubahan Kontrak (PPK)** menurut protokol `0002-contract-v1.md` §2, baris "Berkas bersama" dan "Versi". Sumber: `tahapan-proyek/05-implementasi/rencana/P6-s7-events.md` §1/§5/§6 E-01, `JADWAL-S3-S8.md` §5 no. 2 (keputusan user), dan kode di `app/routes.ts`, `tests/contract-v1.test.ts`.

**Status: disetujui user.** `JADWAL-S3-S8.md` §5 pertanyaan no. 2 dijawab **Ya**, jadi penambahan ketiga URL tidak perlu ditanyakan lagi. Catatan ini ada supaya keputusan itu punya jejak tertulis dan supaya kewajiban teknisnya (§3 di bawah) tidak hilang diam-diam.

## Konteks

`contract-v1` membekukan permukaan publik `/app` pada **13 URL** (`tests/contract-v1.test.ts`, `APP_URLS` + `expect(appUrls).toHaveLength(13)`). Pembekuan itu bukan daftar keinginan: tes **menurunkan** daftar URL dari `app/routes.ts` lewat `urlsOf(routes)`, lalu membandingkannya dengan literal. Angkanya dengan begitu adalah cermin rute yang benar-benar terdaftar.

Menu Event (S7) adalah menu produk keenam di `/app`. Menu itu butuh tiga halaman, dan ketiganya adalah penambahan — tidak satu pun mengubah atau menghapus URL yang sudah beku.

## Keputusan

Daftar URL `/app` yang beku bertambah **13 → 16** dengan ketiga URL berikut, tepat seperti tertulis:

| URL | Halaman | Tugas yang mendaftarkannya |
|---|---|---|
| `/app/events` | Daftar acara (tab Akan datang / Sudah lewat, cari, saring) | E-09 |
| `/app/events/new` | Form 2 tahap "Acara baru" | E-10 |
| `/app/events/:id` | Detail acara: peserta, notulensi, batalkan, hapus | E-11 |

Penomoran parameter mengikuti pola yang ada: `/app/projects/:projectId` memakai nama entitas, `/app/tasks/:number` memakai nomor publik tugas. Acara tidak punya nomor publik, jadi parameternya adalah `:id` (uuid teks `event.id`), sejalan dengan `event` di `server/db/schema.events.ts`.

**Kenapa ini penambahan kompatibel, bukan `contract-v2`:** tidak ada URL yang hilang atau berubah arti, tidak ada ekspor beku yang berubah tanda tangan, dan menu `/app` hanya kebagian satu item baru. Menurut `0002-contract-v1.md` §2 baris "Versi", penambahan kompatibel berarti tag `contract-v1.N`, bukan mayor baru.

## Kewajiban teknis yang menyertai keputusan ini

**Hitungan `APP_URLS` di `tests/contract-v1.test.ts` naik 13 → 16 pada tugas yang mendaftarkan ketiga rute ini di `app/routes.ts` (E-09..E-11), bukan di E-01.**

Alasannya: karena tes menurunkan daftarnya dari `app/routes.ts`, menaikkan hitungan sebelum rutenya ada memaksa cermin itu berbohong dan membuat `bun run test` merah tanpa ada cacat nyata. Akseptansi E-01 di rencana P6 §6 ("`contract-v1` hijau dengan 16 URL") karena itu salah tempat; E-01 menulis catatan ini, E-09..E-11 yang menaikkan angkanya, dan integrator E-12 merapikannya. Tiga baris yang harus disunting bersama rute barunya:

1. literal `APP_URLS` — tambahkan `/app/events /app/events/new /app/events/:id`;
2. `expect(appUrls).toHaveLength(13)` → `16`, dan judul tesnya ("registers exactly thirteen /app URLs" → "sixteen");
3. daftar `NAV` di tes "keeps exactly five items in the /app menu" → enam item, dengan `/app/events` pada posisi yang dipilih integrator di `app/routes/app/layout.tsx`.

Selama ketiganya belum dikerjakan, hutang ini terbuka dan tercatat di sini.

## Yang ikut tersentuh, tapi tidak perlu PPK

- **Skema DB.** Migrasi 0018 hanya menambah tabel baru (`event`, `event_participant`, `event_note`, `event_reminder`) dan tidak menyentuh tabel beku; itu persis "expand-only" di `0002-contract-v1.md` §2. Snapshot `tests/db/pm-schema-contract.test.ts` diperbarui di commit yang sama bila ia memang memagari tabel baru.
- **`server/pm/enums.ts`.** `EVENT_KINDS`, `EVENT_LOCATION_TYPES`, `EVENT_NOTE_STATUSES` dan `EVENT_REMINDER_OFFSETS_MIN` adalah **tambahan** oleh pemilik irisan, yang §2 izinkan tanpa PPK, asalkan ada tes dan barisnya tampil di snapshot. `EVENT_REMINDER_OFFSETS_MIN` bukan enum: ia nilai DEFAULT `event.reminders_minutes`, jadi ia terdaftar di `TUPLES_WITHOUT_COLUMN` pada `tests/db/pm-enum-check.test.ts` dan dibuktikan oleh `tests/db/events-schema.test.ts`.
- **Endpoint `/api/app/events*`.** Penambahan yang kompatibel mundur, dipetakan otomatis ke scope `app:read`/`app:write` (`server/api-keys/scopes.ts`). Rute destruktifnya (hapus, batalkan) diputuskan masuk `PM_KEY_DENY` di E-06, bukan di sini.
- **`/api/app/trash` memperluas `:kind`** dengan `event` di E-07. Bentuk responsnya tidak berubah, hanya nilai yang diterima bertambah.

## Konsekuensi

- Pekerja E-09..E-11 tahu URL mana yang boleh dipakai tanpa menebak, dan tahu bahwa menaikkan hitungan kontrak adalah bagian dari tugas mereka.
- Peninjau melihat perubahan kontrak sebagai satu baris di diff `tests/contract-v1.test.ts`, bukan sebagai angka yang berubah tanpa catatan.
- Bila S7 dipotong sebelum E-09 mendarat, tidak ada yang perlu dibatalkan: catatan ini jadi keputusan yang belum dipakai, dan hitungan kontrak tetap 13 karena rutenya tidak pernah terdaftar.
