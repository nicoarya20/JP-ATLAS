# 0004 — PPK: tiga menu `/app` dari prototipe menambah 3 URL ke `contract-v1`

Dicatat 19 Oktober 2026. Ini **Permintaan Perubahan Kontrak (PPK)** menurut protokol `0002-contract-v1.md` §2, baris "Berkas bersama".

**Status: disetujui user.** User memilih opsi A pada 19 Okt 2026: memindahkan UI prototipe ke cabang backend, dimulai dari alur Buat proyek. Menu Inbox dan Tim juga sudah disetujui sebagai menu produk di `JADWAL-S3-S8.md` §5 (no. 9 dan no. 10).

## Konteks

Cabang prototipe (`feature/prototype-pm`) sudah punya tampilan untuk menu Inbox, Events, dan Tim dengan data contoh, tetapi cabang itu terpisah dari cabang backend. Agar satu aplikasi menampilkan Proyek yang sungguh tersambung ke database **dan** menu-menu yang backend-nya sudah ada tetapi UI-nya belum, tiga halaman prototipe dipindahkan ke `feature/project-management` memakai data contoh (`*.dummy.ts`).

## Keputusan

Daftar URL `/app` yang beku bertambah **13 → 16**, dan menu `/app` bertambah **5 → 8 item**:

| URL | Halaman | Sumber data sekarang | Diganti oleh |
|---|---|---|---|
| `/app/inbox` | Inbox (Perlu ditanggapi, Kabar terbaru) | `inbox.dummy.ts` | I09 + I10 (UI Inbox asli di atas API `/api/app/inbox`) |
| `/app/events` | Daftar acara (hanya daftar; kalender bulan ditunda, `HUTANG.md` H-D3c) | ~~`events.dummy.ts`~~ sudah dihapus (20 Okt 2026); kini API `/api/app/events` | E-09 (selesai) |
| `/app/team` | Tim | `team.dummy.ts` | M06 (UI asli di atas API `/api/app/team`) |

Urutan menu: Beranda, Inbox, Proyek, Tugas, Events, Tim, lalu (di bawah pemisah) Sampah dan Pengaturan. Kerangka menu (`AppFrame`) sudah mendukung dua grup, jadi tidak ada perubahan kerangka.

Tidak ada URL yang hilang atau berubah arti, dan tidak ada ekspor beku yang berubah tanda tangan. Ini penambahan kompatibel, bukan `contract-v2`.

## Dampak pada 0003

`0003-contract-v1-event-urls.md` menyebut hitungan naik 13 → 16 saat ketiga URL Event didaftarkan. Hitungan itu **tidak lagi berlaku apa adanya**: `/app/events` kini sudah terdaftar di sini, jadi hanya dua URL Event yang tersisa (`/app/events/new` dan `/app/events/:id`, tugas E-10 dan E-11). Hitungan akhir setelah keduanya menjadi **18**, bukan 16 (dan **20** pada 20 Okt 2026, karena tab Tahapan dan detail orang Tim ikut menambah dua URL). Tugas yang mendaftarkan keduanya yang menaikkan hitungan, dengan pola yang sama seperti di 0003.

## Yang harus diingat

Ketiga halaman memakai **data contoh**, bukan database. Badge Inbox di menu juga dari data contoh. Jangan menganggap menu ini sudah tersambung hanya karena backend-nya ada; penyambungannya adalah tugas I09/I10, E-09, dan M06.

> **Diperbarui 20 Okt 2026:** Events (E-09) dan Tim (M06) sudah tersambung ke database dan data contohnya dihapus; dari ketiga menu itu hanya Inbox yang masih memakai `inbox.dummy.ts`.
