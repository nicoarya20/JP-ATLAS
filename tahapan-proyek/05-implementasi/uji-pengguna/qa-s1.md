# QA S1 — ukuran teks, lebar layar, dan demo SP-G1

Dokumen S1-16 (G19). Sumber checklist: R09 §3.8; skenario demo: P3 §6.1.
Cabang `feature/pm-s1-16-smoke-qa`. Dibuat tanpa browser (aturan G19): kolom **Mesin** hanya berisi yang dibuktikan tes otomatis; semua yang butuh mata manusia tertulis **belum diuji — menunggu user (CP)**.

## 1. Bukti mesin

| # | Aturan | Pembuktian | Hasil |
|---|--------|-----------|-------|
| M1 | Tema memakai satu `theme.scale` (1 / 1,25 / 1,5) dan breakpoint ikut diskala | `tests/ui/app-scale-safety.test.ts` (`buildTheme` ×3 skala), `tests/theme-scale.test.ts`, `tests/text-size.test.ts` | lulus |
| M2 | HTML SSR memuat skala dari cookie `mk-text-size` | `tests/text-size-ssr.test.ts`; smoke "ukuran teks dari cookie" (`--mantine-scale: 1.25`) | lulus |
| M3 | Tidak ada `font-size` piksel di berkas `/app` S1 (input tetap ≥ 16 px dan mengikuti skala) | `app-scale-safety`: "no pixel font-size" | lulus |
| M4 | Tidak ada ikon `size={angka}` | `app-scale-safety`: "no numeric icon size" | lulus setelah perbaikan F1 |
| M5 | Tidak ada `@media`, `min-width:`, `matchMedia`, `innerWidth`, `useMediaQuery('(…')` buatan | `app-scale-safety` | lulus |
| M6 | Tidak ada lebar piksel tetap (`w/miw/mw={≥100}`, `minWidth: n`, `style width: n`); hanya `maw` + `w="100%"` | `app-scale-safety` | lulus |
| M7 | Tabel hanya lewat `ResponsiveTable` (tabel dari `sm`, kartu di bawahnya, `overflowX: auto`); Daftar proyek, Anggota, dan Sampah memakainya | `app-scale-safety` (tidak ada `<Table>` di luar `ResponsiveTable`; kartu lewat `renderCard`) | lulus |
| M8 | `PageHeader` memakai `wrap="wrap"`; setiap `wrap="nowrap"` bisa menyusut (`minWidth: 0`) atau dikomentari, sisanya dipatok 5 | `app-scale-safety` | lulus |
| M9 | Tidak ada `<input>` native / `type="date"` | `app-scale-safety` | lulus |
| M10 | Ukuran sentuh: Button/input `lg`, ActionIcon `xl` dari `defaultProps` tema | `app-scale-safety`: "touch-sized defaults" | lulus (nilai tema; ukuran nyata di layar → bagian 2) |
| M11 | Penjaga halaman, `meta()`, tanpa percabangan role di UI | `tests/app-routes.test.ts`, `tests/app-contracts.test.ts`, `tests/access/no-role-branching.test.ts` | lulus |
| M12 | Penanda teks, bukan warna saja, pada tombol ukuran teks aktif | `tests/ui/text-size-picker.test.tsx` | lulus |
| M13 | Rute S1 anonim → 302 `/login`; API anonim → 401 `UNAUTHORIZED` + `x-request-id` | `scripts/smoke-server.checks.ts` (34 pemeriksaan) | `smoke:prod`, `smoke:binary`, `smoke:coldboot` 34/34 |

## 2. Matriks ukuran teks × lebar layar

Isi per sel: tidak ada teks terpotong/menimpa, tombol tidak keluar layar, tabel tetap bisa digulir/jadi kartu, tidak ada gulir horizontal halaman.
Mesin sudah menjaga penyebab umumnya (M3–M8). Memastikan hasilnya terlihat benar tetap butuh mata manusia.

| Halaman | Skala | 375 px | 768 px | 1024 px | 1280 px |
|---|---|---|---|---|---|
| Daftar proyek `/app/projects` | 1 | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| | 1,25 | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| | 1,5 | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| Form proyek baru / Ubah proyek | 1 · 1,25 · 1,5 | – | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| Detail proyek (Ringkasan, Tugas) | 1 · 1,25 · 1,5 | – | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| Tab Anggota | 1 · 1,25 · 1,5 | – | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| Pengaturan `/app/settings` | 1 · 1,25 · 1,5 | – | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| Sampah `/app/trash` | 1 · 1,25 · 1,5 | – | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |

Butir R09 §3.8 lain yang hanya bisa dinilai manusia (semuanya **belum diuji — menunggu user (CP)**): zoom browser 200 %, kontras ≥ 4,5:1 sebenarnya, ukuran ketuk fisik 44 px, filter abu-abu untuk label status, sidebar jadi laci ≤ 1152 px pada skala 1,5, urutan Tab dan fokus terlihat, rotasi layar tablet, penguji awam/lansia.

## 3. Temuan

| # | Temuan | Tindakan |
|---|--------|----------|
| F1 | `HoldShell.tsx` (halaman tunggu, bukan halaman S1): ikon tombol Keluar `size={14}` (piksel, tidak ikut skala) | Diperbaiki: `size="1.25em"` (1 baris) |
| F2 | `HoldShell.tsx`: `ThemeIcon size={56}`. Ini kotak ikon, bukan glif; Mantine mengubahnya ke rem sehingga ikut `theme.scale` | Tidak diubah; perlu dilihat mata pada skala 1,5 (halaman tunggu) |
| F3 | `ProjectList.tsx`: kolom Progres `width: 180` | Tidak diubah: lebar kolom tabel yang tergulir, tersembunyi di bawah `sm` oleh kartu |
| F4 | 5 `wrap="nowrap"` tanpa `minWidth: 0` (`HoldShell`, `ProgressVsTime`, `ProjectSummary`, `MemberPicker:79`, `MemberAvatar`): ikon/avatar + teks, tanpa tombol | Dipatok di tes; periksa pada skala 1,5 di 375 px |
| F5 | `ProjectHeader`: `wrap="nowrap"` sengaja (satu ActionIcon + judul yang boleh turun baris), sudah berkomentar | Tidak diubah |
| F6 | Beranda `/app` masih stub (S3); tes pemindaian ikut menjaganya tetapi QA tampilan menunggu S3 | Dicatat |

## 4. Enam skenario demo SP-G1 (langkah untuk user — bukan hasil)

Persiapan: `bun scripts/seed-dev.ts atlas`; akun Nico (PM), Dodi (Member), Sri (Pemantau), Rina. **Belum dijalankan — menunggu user (CP).**

1. **Daftar proyek.** Nico buka `/app/projects`: proyek Atlas tampil dengan kondisi ikon + teks, tombol **+ Proyek baru** ada. Dodi hanya melihat proyek yang ia ikuti dan tidak punya tombol itu; Member tanpa proyek melihat pesan kosong.
2. **Buat proyek.** Nico buat "Renovasi Dapur": status Berjalan, tenggat lewat tombol cepat 3 bln, Rina Pengelola, Dodi Anggota, Sri Pemantau, kurang dari 60 detik. Detail menampilkan "Belum ada tugas" dan kondisi Lancar.
3. **Anggota.** Tab Anggota: ubah peran; keluarkan dengan dialog; menurunkan pengelola terakhir ditolak dengan alasan tertulis; Pengelola utama tidak bisa dikeluarkan.
4. **Akses.** Dodi membuka URL proyek yang bukan miliknya → "tidak ditemukan". Nico membuka proyek Sinar (ia bukan anggota) → hanya baca, tanpa menu Ubah, ada catatan "Anda hanya bisa melihat proyek ini."
5. **Ukuran teks.** Dodi: Pengaturan → "Sangat besar" → seluruh layar, modal, dan notifikasi membesar, bertahan setelah muat ulang dan login di peramban lain, tanpa kilatan; sidebar menjadi laci di ≤ 1152 px.
6. **`/profile`** mengalihkan ke `/app/settings`.

Angka yang menurut P3 §6.1 diperiksa mesin (progres 17 %, 404 identik, 409 pengelola terakhir) tidak diverifikasi di dokumen ini.
