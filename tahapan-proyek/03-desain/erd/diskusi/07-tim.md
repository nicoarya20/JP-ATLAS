# Diskusi & Rencana Kerja: Wireframe 07 · Tim (per role)

> Tanggal: 12 Oktober 2026. Status: **wireframe PM, Admin, dan Member selesai** (① Daftar dan ② Detail untuk ketiganya, ③ Kosong khusus Member). Semua keputusan di bawah adalah **usulan Claude** yang belum dikonfirmasi user, kecuali disebut lain.
> Lokasi wireframe: Penpot, file **PM-New**, halaman **WIREFRAME NICO**, bagian **`<Role> · Tim`** (8080 × 1620) di dalam grup `A · Member`, `B · Project Manager`, `C · Admin`, pada y relatif 20800, di bawah bagian Inbox.
> Sumber: `note.md` › Menu Tim, `tahapan-proyek/02-analisis/hasil-orchestrasi/analysis/A1-dashboard-tim-events.md` §2.2 dan §4.2, `orchestration/DECISIONS.md` D10 (visibilitas beban kerja), `deliverables/workflow.md` (matriks izin menu Tim), `tahapan-proyek/03-desain/erd/user-profile.md`, `tahapan-proyek/03-desain/erd/project.md`, `tahapan-proyek/03-desain/erd/diskusi/05-events.md`, `tahapan-proyek/03-desain/erd/diskusi/06-inbox.md`. Kalau bertentangan, dokumen ini yang berlaku.
> Menu Tim hanya **membaca** data yang sudah ada (`users`, `profiles`, `project_members`, `tasks`, `events`). Tidak ada tabel baru; status Cuti dihitung dari `leave_requests` (lihat `09-pengaturan.md`).

## 1. Keputusan (usulan)

| # | Keputusan | Asal |
|---|---|---|
| 1 | Nama menu tetap **Tim** (bukan "Tim & Kapasitas" seperti di orkestrasi), karena kapasitas tertimbang ditunda | Claude |
| 2 | **"Online sekarang" dihapus**, diganti **Ketersediaan**: Tersedia · Sedang rapat · Cuti. Alasan: status online tidak bisa ditindaklanjuti dan terasa seperti pengawasan (A1 T2) | A1 + Claude |
| 3 | **"Aktivitas tim" dihapus dari menu Tim.** Isinya sudah ada di **Inbox › Kabar terbaru** (A1 T4 MERGE, selaras keputusan Inbox "satu tempat") | A1 + Claude |
| 4 | **Beban kerja = jumlah tugas aktif dan tugas terlambat per orang** (hitungan deterministik, P0a). Kapasitas tertimbang, heatmap 4 minggu, peringatan overload, dan saran rebalancing ditunda ke P1 | workflow + Claude |
| 5 | **Visibilitas beban (D10) mengikuti peran di proyek, bukan peran akun.** Angka beban (tugas aktif dan terlambat) terlihat oleh Admin (semua orang) dan oleh **Pengelola proyek** untuk anggota proyek yang ia kelola, **hanya tugas di proyek itu**. Di proyek yang ia ikuti tapi bukan Pengelola, ia diperlakukan seperti Member: angka orang lain disembunyikan, hanya ketersediaan, peran, dan proyek bersama. Orang yang tidak berbagi proyek tidak tampil. Kalau orang itu juga mengerjakan proyek lain, cukup tanda "juga di proyek lain" tanpa rincian | User (setuju 12 Okt) + Claude |
| 6 | Daftar Tim = **orang yang berbagi proyek dengan user** (Member dan PM, sesuai note.md "proyek yang kamu ikuti") dan **semua pengguna yang sudah disetujui** (Admin, termasuk yang belum ikut proyek). Semua orang di proyek yang tidak diikuti PM **tidak tampil** | note.md + User + Claude |
| 7 | Layar Tim **hanya baca.** Peran di proyek diubah di Proyek › Anggota, peran akun di menu Pengguna (Admin) | Claude |
| 8 | Kontrol di daftar dibuat minimal: **Semua proyek ▾**, **Cari nama**, dan **Urutkan** (hanya PM dan Admin, karena Member tidak melihat angka beban orang lain). Tidak ada filter lain | Claude |
| 9 | Kartu orang: inisial, nama, "peran · proyek", ketersediaan, beban (bila boleh dilihat), tombol **Lihat** | Claude |
| 10 | Detail orang: jabatan, divisi, email, peran akun, proyek bersama + peran, dan (untuk yang boleh) tugas aktif. Bagi Member: pesan "Daftar tugas orang lain hanya terlihat oleh Pengelola proyek dan Admin" | Claude |

## 2. Matriks tampilan

| Isi | Admin | Project Manager | Member |
|---|---|---|---|
| Orang di daftar | Semua pengguna disetujui | Orang di proyek yang ia ikuti | Orang di proyek yang sama |
| Ringkasan (orang · tugas aktif · terlambat) | Semua proyek | Proyek yang ia kelola | Satu proyek |
| Tugas aktif dan terlambat per orang | ✅ semua, lintas proyek | ✅ anggota proyek yang ia **kelola**, hanya tugas di proyek itu; selain itu seperti Member | Hanya dirinya |
| Ketersediaan | ✅ | ✅ | ✅ |
| Tombol Urutkan | ✅ | ✅ | tidak ada |
| Detail › daftar tugas aktif | ✅ | ✅ untuk proyek yang ia kelola | tidak (pesan izin) |
| Detail › email | ✅ | ✅ | ✅ (sesama proyek) |
| Layar kosong | tidak ada | tidak ada | ✅ bila belum ikut proyek |

## 3. Layar

Frame 1280×800, gaya lo-fi abu-abu sama dengan grup 01–06. Menu samping: Tim aktif.

| No | Layar | Isi |
|---|---|---|
| ① | Tim · Daftar (default) | Judul Tim, **Semua proyek ▾**, **Cari nama**, **Urutkan: Nama ▾** (PM, Admin), ringkasan satu baris, kartu orang |
| ② | Tim · Detail orang (Rina) | ← Kembali ke Tim, inisial besar, nama, peran · proyek, ketersediaan. Kartu profil dan kartu Proyek bersama. Tugas aktif (PM, Admin) atau pesan izin (Member) |
| ③ | Tim · Kosong (Member saja) | "Belum ada tim" + "Anda belum tergabung di proyek mana pun. Tim akan muncul setelah Pengelola menambahkan Anda ke proyek." |

Panah: ① → ② (klik kartu). Dua catatan di bawah ① dan ②.

### Isi contoh per role (hari ini Rabu 7 Oktober 2026, pukul 10.00)

| Orang | Peran · proyek | Ketersediaan | Tugas aktif / terlambat | Dilihat oleh |
|---|---|---|---|---|
| Nico | Pengelola · Atlas (Lead) | Tersedia | 4 / 1 | Nico sendiri, Admin; Member hanya ketersediaan |
| Rina | Anggota · Atlas, Portal Klien PT Sinar | Tersedia | 5 / 1 (Admin); **3 / 1 di Atlas** (Nico) + "juga di proyek lain" | Admin, Nico (hanya Atlas); Member hanya ketersediaan |
| Dodi | Anggota · Atlas | Tersedia | 3 / 1 | Nico, Admin; Dodi sendiri |
| Lea | Pengelola · Portal Klien PT Sinar | Cuti sampai 9 Okt | 6 / 2 | Admin saja. **Tidak tampil bagi Nico** (tidak berbagi proyek) |
| Ayu | Admin · Pemantau Portal Klien PT Sinar | Tersedia | 2 / 0 | Admin |

Ringkasan: PM "Proyek yang Anda kelola · 3 orang · 10 tugas aktif · 3 terlambat"; Admin "5 orang · 20 tugas aktif · 5 terlambat"; Member "Proyek Atlas · 3 orang · 9 tugas aktif · 2 terlambat". Tugas Rina di detail untuk Nico: #18 Periksa desain onboarding, #11 Revisi ikon profil (terlambat), #16 Siapkan data uji (semua di Atlas); untuk Admin: #22 Susun proposal klien (Portal Klien) menggantikan #16. Data Lea, #11, dan #22 adalah data contoh baru.

## 4. Data yang dipakai (belum ada tabel baru)

| Yang ditampilkan | Sumber |
|---|---|
| Nama, jabatan, divisi, email | `profiles.display_name / full_name`, `job_title`, `department`, `users.email` |
| Peran akun | `users.role` |
| Peran di proyek, proyek bersama | `project_members.role`, `project_members.project_id` |
| Tugas aktif, terlambat | `tasks` (status bukan selesai atau dibatalkan; terlambat = `due_date` lewat) per `assignee_id`, tanpa tugas di Sampah |
| Sedang rapat | `events` + `event_participants` yang sedang berlangsung (`starts_at` ≤ sekarang ≤ `ends_at`, tidak dibatalkan) |
| **Cuti** | Dari tabel **`leave_requests`** (`09-pengaturan.md` §4): pengajuan **disetujui** yang mencakup hari ini tampil sebagai "Cuti sampai ...". Pengajuan yang masih menunggu tampil "Pengajuan cuti ..." hanya untuk PM, Admin, dan pemohon |

## 5. Pertanyaan terbuka untuk user

1. ~~PM melihat beban semua orang?~~ **Selesai (12 Okt):** dibatasi ke anggota proyek yang ia kelola, hanya tugas di proyek itu (§1 #5). Sisa pertanyaan: total lintas proyek tidak ditampilkan; cukup tanda "juga di proyek lain". Kalau kurang, alternatifnya menampilkan total dengan risiko privasi lebih besar.
2. **Email** orang lain tampil ke semua yang berbagi proyek (sesuai note.md). A1 menandainya sebagai risiko privasi. Tetap tampil, atau disembunyikan bagi Member?
3. ~~Cuti diisi siapa~~ **Selesai (14 Okt):** cuti diajukan di Pengaturan dan disetujui Pengelola proyek atau Admin (lihat `09-pengaturan.md` #9).
4. Apakah Admin perlu melihat pengguna yang **ditolak atau dinonaktifkan** di Tim? Usulan: tidak, itu urusan menu Pengguna.
