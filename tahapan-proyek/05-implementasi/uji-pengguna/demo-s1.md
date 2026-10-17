# Gerbang demo S1 (SP-G1)

Dokumen S1-17 (G20). Sumber kriteria: P3 §6.1 ("Selesai bila"); skenario demo: P3 §6.1 dan `qa-s1.md` §4.
Cabang `feature/pm-s1-17-demo-gate`, basis `b350d2d`. Dibuat tanpa browser: kolom **Hasil** hanya berisi yang dijalankan di tugas ini;
yang butuh mata manusia tertulis **menunggu user (CP3)**. Tidak ada kode aplikasi (`app/**`, `server/**`) yang diubah.

## 1. Koreksi atas P3 §6.1

Butir "**tidak ada** jalur UI menuju hapus proyek (KB-1)" **sudah digantikan** keputusan user 15 Okt 2026 (pilihan B, S1-18). Kriteria barunya:

1. Tombol **Hapus proyek** hanya tampil bila `can.trash` benar; Member-Pengelola (`ROLE_CANNOT_TRASH`) tidak melihat tombolnya.
2. Dialog T2 menyebut dampak (nama proyek, jumlah tugas yang ikut, batas pemulihan).
3. Setelah dihapus ada tombol **Urungkan** dan proyeknya bisa dipulihkan dari `/app/trash`.

Pembuktian mesin ada di butir 11 (tabel §2). Butir "ada tombol **Urungkan**" **tidak ada bukti mesin** (hanya kode di `app/components/trash/useTrashActions.ts`); lihat §3.

## 2. Peta "Selesai bila" → tes → hasil

Semua tes dijalankan di worktree ini dengan lingkungan terisolasi (`LOCAL_PG_*`, `LOCAL_S3_*` khusus tugas, tanpa port 5432/54329/54330/9000/9001).
Hasil = keluaran `bun test` yang saya lihat sendiri.

| # | Butir "Selesai bila" | Berkas tes yang membuktikan | Hasil |
|---|---|---|---|
| 1 | Member membuka proyek non-anggota → 404 **identik** dengan id acak (IDOR) | `tests/api/projects.test.ts` ("answers a non-member and a random id with the same 404 body", detail, anggota, `PUT /lead`); `tests/project/project.query.test.ts` (null sama untuk id acak dan proyek yang tak diikuti); `tests/api/projects.trash.test.ts` (non-anggota 404 seperti id acak saat hapus) | 60 lulus / 0 gagal (tiga berkas API: `projects`, `projects.trash`, `trash`) |
| 2 | PM bukan anggota tidak bisa ubah (403) | `tests/project/project.service.test.ts` ("refuses a Member, a viewer and a non-member Project Manager" → `NOT_MANAGER`; juga status dan Lead); `tests/api/project-members.test.ts` ("refuses a Member, a Viewer and a non-member Project Manager with 403") | 47 lulus / 0 gagal (dua berkas) |
| 3 | Pengelola terakhir → 409 (tes **paralel**) | `tests/project/member.service.test.ts` ("lets exactly one of two concurrent removals of the last two managers succeed", `Promise.all`); `tests/api/project-members.test.ts` ("keeps the last manager … 409 LAST_MANAGER", `IS_LEAD`) | 40 lulus / 0 gagal (dua berkas) |
| 4 | Kondisi dasar ≥ 8 kasus tabel (PAST_DUE, tugas penting terlambat, rasio > 20% tegas, tanpa tenggat, bukan Berjalan → `null`) + golden Atlas | `tests/metrics/condition.test.ts` (16 tes: PAST_DUE F07, IMPORTANT_OVERDUE F08, rasio F09 tepat 20% bukan di atas dan 3 dari 10 lolos, tanpa tenggat tak pernah PAST_DUE, F10/F11/F12); `tests/metrics/project.metrics.test.ts` (Atlas 1 dari 6 → 17); `tests/atlas.golden.test.ts` (progres 17 bukan 70, at_risk karena 1 tugas penting terlambat); `tests/project/project.query.test.ts` ("gives a project that is not active no condition at all", "Atlas at 17%") | 68 lulus / 0 gagal (empat berkas) |
| 5 | `tests/app-routes.test.ts` hijau untuk semua rute baru | `tests/app-routes.test.ts`, `tests/app-contracts.test.ts`, `tests/app-route-precedence.test.ts`, `tests/app-gate.test.ts`, `tests/contract-v1.test.ts` | 204 lulus / 0 gagal (lima berkas) |
| 6 | Ukuran teks lewat `theme.scale` dari cookie `mk-text-size`; HTML SSR memuat skala | `tests/text-size-ssr.test.ts` (`--mantine-scale: 1.5` / `1.25`, bawaan tanpa cookie), `tests/theme-scale.test.ts`, `tests/text-size.test.ts`, `tests/ui/app-scale-safety.test.ts`, `tests/ui/text-size-picker.test.tsx`, `tests/ui/icon-scale.test.ts` | 79 lulus / 0 gagal (enam berkas) |
| 7 | Tombol/tabel **tidak terpotong** pada 768 dan 1280 px di 3 skala | Mesin hanya menjaga penyebab umumnya (`app-scale-safety`: tanpa lebar piksel tetap, `ResponsiveTable`, `PageHeader` `wrap`). Tampilan nyata: matriks `qa-s1.md` §2 | **Tidak ada bukti mesin** untuk "tidak terpotong"; **menunggu user (CP3)** |
| 8 | Semua aksi async punya `loading` dan umpan balik | `tests/use-api-mutation.test.ts` (loading + notifikasi sukses/gagal), `tests/ui/notify.test.ts`, `tests/ui/trash-list.test.tsx` (baris berjalan `data-loading`), `tests/ui/project-form.test.tsx`, `tests/ui/member-table.test.tsx`, `tests/ui/settings-page.test.tsx`, `tests/ui/project-header.test.tsx`, `tests/ui/project-list.test.tsx` | 93 lulus / 0 gagal (delapan berkas). **Sebagian saja:** tidak ada pemindai yang memastikan *setiap* tombol async memakai `loading`; hanya hook bersama dan komponen yang diuji. Cakupan menyeluruh **tidak ada bukti mesin** |
| 9 | Nol `window.confirm/alert` | `tests/app-contracts.test.ts` ("no native window.confirm/alert/prompt in app/"), `tests/ui/app-scale-safety.test.ts` (tanpa `<input>` native) | Lulus (termasuk dalam butir 5) |
| 10 | `typecheck` nol | `bun run typecheck 2>&1 \| grep -c "error TS"` | **0** |
| 11 | Pengganti KB-1 (S1-18): Hapus proyek hanya bila `can.trash`; dialog menyebut dampak; ada Urungkan; Member-Pengelola tidak melihat tombol | `tests/ui/project-header.test.tsx` ("opens the ⋯ menu for Hapus proyek only when can.trash is true (not a Member-manager)"); `tests/ui/trash-list.test.tsx` ("is offered only when can.trash is true, hidden for ROLE_CANNOT_TRASH", "names the project, the tasks that move and the restore limit"); `tests/api/trash.test.ts` ("refuses a Member-manager delete with 403 ROLE_CANNOT_TRASH yet lets them restore", 410 `EXPIRED`); `tests/project/project-trash.service.test.ts`; `tests/app-nav.test.ts` (menu **Sampah** → `/app/trash`) | 73 lulus / 0 gagal (lima berkas). Tombol **Urungkan**: **tidak ada bukti mesin** (tidak ada tes yang menyebut Urungkan) |
| 12 | Pemetaan scope rute baru, kontrak README, smoke anonim | `tests/api-keys/scopes.test.ts`, `tests/api-keys/scopes.pm.test.ts`, `tests/smoke-server.test.ts`, `tests/readme-endpoint.test.ts` | 149 lulus / 0 gagal (empat berkas) |
| 13 | Tiga smoke hijau | `bun run smoke:binary` (Bun 1.4.2) | **34/34 lulus** (saya jalankan). `smoke:coldboot`: **34/34 lulus** (saya jalankan, lihat catatan di bawah). `smoke:prod`: **tidak dijalankan** di tugas ini (butuh instansi Postgres sendiri); angka 34/34 untuk ketiganya di `qa-s1.md` M13 adalah klaim S1-16, bukan hasil saya |

Gerbang keseluruhan (tugas ini):

| Pemeriksaan | Hasil |
|---|---|
| `bun run test` (penuh) | **4096 lulus / 18 dilewati / 0 gagal** |
| `bun run typecheck \| grep -c "error TS"` | **0** |
| `bun run lint` | 164 error / 33 warning / 4 info (sama dengan baseline `b350d2d`) |
| `bun test tests/readme-endpoint.test.ts` | 5 lulus / 0 gagal |
| Rute di README ↔ kode | Dicocokkan dengan `server/api/app-projects*.ts`, `app-team.picker.ts`, `app-profile.ts`, `app-trash.ts` (metode, jalur, isian, dan batas `PM_KEY_DENY`) |

Catatan smoke: `smoke:coldboot` juga saya jalankan (Bun 1.4.2, env terisolasi): **34/34 pemeriksaan lulus**, exit 0 (keluaran juga memuat "doctor: 17/19 ok" dari subperintah `doctor`, bukan bagian 34 pemeriksaan). Maka dua dari tiga smoke terbukti di tugas ini; `smoke:prod` belum.

## 3. Temuan terbuka

Dari `qa-s1.md` §3 (tidak diubah di tugas ini):

| # | Temuan | Status |
|---|---|---|
| F2 | `HoldShell.tsx`: `ThemeIcon size={56}` (kotak ikon; Mantine mengubahnya ke rem sehingga ikut `theme.scale`) | Terbuka: perlu dilihat mata pada skala 1,5 (halaman tunggu) |
| F4 | Lima `wrap="nowrap"` tanpa `minWidth: 0` (`HoldShell`, `ProgressVsTime`, `ProjectSummary`, `MemberPicker:79`, `MemberAvatar`) | Terbuka: dipatok di tes; periksa pada skala 1,5 di 375 px |
| F6 | Beranda `/app` masih stub (S3); QA tampilannya menunggu S3 | Terbuka (dicatat) |

Terbuka dari tugas ini:

- **Tombol Urungkan** setelah Hapus proyek tidak punya tes (butir 11). Celahnya jelas dan kecil, tetapi tidak ditambah di sini; usulan: tes kecil di `useTrashActions` untuk memastikan notifikasi memuat aksi Urungkan.
- **Kelengkapan `loading`** (butir 8) hanya terbukti sebagian; belum ada pemindai.
- Matriks ukuran teks × lebar layar `qa-s1.md` §2 seluruhnya **belum diuji — menunggu user (CP3)**.
- **UAT login Google** masih terbuka (KEPUTUSAN/PROGRES: kriteria #16 gerbang `contract-v1`). Kriteria #16 diterima user tanpa peninjau kedua, tetapi UAT login Google asli belum dijalankan; demo di bawah memakai sesi uji atau akun yang sudah ada, bukan bukti jalur Google.

## 4. Enam langkah demo untuk user (belum dijalankan — menunggu user (CP3))

Persiapan: `bun scripts/seed-dev.ts atlas`; akun contoh Nico (PM), Dodi (Member), Sri (Pemantau), Rina. Tanpa membuka `/dev`. Status setiap langkah: **menunggu user (CP3)**.

1. **Daftar proyek.** Nico buka `/app/projects`: proyek Atlas tampil dengan kondisi ikon + teks (progres 17%), tombol **+ Proyek baru** ada. Dodi hanya melihat proyek yang ia ikuti dan tidak punya tombol itu; Member tanpa proyek melihat pesan kosong.
2. **Buat proyek.** Nico buat "Renovasi Dapur" lewat form: status Berjalan, tenggat lewat tombol cepat 3 bln, Rina Pengelola, Dodi Anggota, Sri Pemantau, kurang dari 60 detik. Detail menampilkan "Belum ada tugas" dan kondisi Lancar.
3. **Anggota.** Tab Anggota: ubah peran; keluarkan dengan dialog; menurunkan pengelola terakhir ditolak dengan alasan tertulis; Pengelola utama tidak bisa dikeluarkan.
4. **Akses.** Dodi membuka URL proyek yang bukan miliknya → "tidak ditemukan". Nico membuka proyek Sinar (ia bukan anggota) → hanya baca, tanpa menu Ubah, ada catatan "Anda hanya bisa melihat proyek ini."
5. **Ukuran teks.** Dodi: Pengaturan → "Sangat besar" → seluruh layar, modal, dan notifikasi membesar, bertahan setelah muat ulang dan login di peramban lain, tanpa kilatan; sidebar menjadi laci di ≤ 1152 px.
6. **`/profile`** mengalihkan ke `/app/settings`. Tambahan setelah S1-18: Nico (pengelola) memilih **Hapus proyek** pada "Renovasi Dapur" → dialog menyebut jumlah tugas → proyek hilang dari daftar dan tombol **Urungkan** muncul; proyek bisa dipulihkan dari **Sampah**. seorang Member yang menjadi Pengelola proyek tidak melihat tombol Hapus proyek (diatur lewat akun uji tambahan).

**Status gerbang SP-G1: menunggu user (CP3).** Bukti mesin di §2 hijau kecuali butir yang tertulis "tidak ada bukti mesin"; keputusan menerima demo adalah milik user.
