# Diskusi & Rencana Kerja: Wireframe 09 · Pengaturan (per role)

> Tanggal: 13 Oktober 2026, diperbarui 14 Oktober 2026 (cuti memakai persetujuan). Status: **wireframe PM, Admin, dan Member selesai** (① Pengaturan, ② Ubah profil, ③ Ajukan cuti, ④ Keadaan cuti untuk ketiganya). Keputusan bertanda "User" sudah dikonfirmasi, sisanya **usulan Claude**.
> Lokasi wireframe: Penpot, file **PM-New**, halaman **WIREFRAME NICO**, bagian **`<Role> · Pengaturan`** di dalam grup `A · Member`, `B · Project Manager`, `C · Admin`, pada y relatif 24400, di bawah bagian Sampah. Layar ① dibuat lebih tinggi dari 800 karena halamannya di-scroll (Member dan PM 1220, Admin 1616).
> Sumber: `tahapan-proyek/03-desain/erd/user-profile.md` (`profiles.text_size`), `06-inbox.md` (Pengaturan › Notifikasi ditunda), `07-tim.md` (Cuti), `tahapan-proyek/02-analisis/hasil-orchestrasi/deliverables/workflow.md` (Pengaturan › AI & Data, Peran & izin). `note.md` tidak memuat isi Pengaturan.

## 1. Keputusan

| # | Keputusan | Asal |
|---|---|---|
| 1 | **Satu halaman Pengaturan yang di-scroll**, berisi bagian: **Akun saya · Tampilan · Pemberitahuan · Ketersediaan · (Pengaturan tim, khusus Admin) · Keluar**. Tidak memakai banyak tab, supaya mudah untuk awam dan lansia | Claude |
| 2 | **Ukuran teks dipakai** (Normal · Besar · Sangat besar), untuk kenyamanan orang awam dan usia 50 tahun ke atas. Memakai kolom `profiles.text_size` yang sudah ada. Berlaku di semua layar, dengan satu baris contoh tulisan | User (13 Okt) |
| 3 | **Profil dan Cuti diedit di Pengaturan.** Profil lewat layar **Ubah profil** (foto, nama lengkap, nama panggilan untuk sapaan, jabatan, divisi, nomor HP). **Email dari akun Google dan tidak bisa diubah.** Cuti lewat layar **Ajukan cuti** (dari tanggal, sampai tanggal, catatan boleh kosong), lihat #9–#12 | User |
| 4 | **Pemberitahuan:** saklar **Pengingat acara** dan **Kabar terbaru di Inbox**. Kartu **Perlu Anda tanggapi tidak bisa dimatikan**. Kanal hanya di aplikasi (sesuai `06-inbox.md` #11) | Claude |
| 5 | **Ketersediaan:** cuti yang **sudah disetujui** tampil sebagai status "Cuti sampai ..." di menu Tim (lihat #9) | `07-tim.md` + Claude |
| 6 | **Pengaturan tim khusus Admin:** saklar **Fitur AI ✦** (rekam suara, foto catatan, pilah hasil rapat), **Lama simpan rekaman** (bawaan 30 hari), **Pengingat acara bawaan** (bawaan 1 hari dan 30 menit sebelum), dan **Peran dan izin** (tabel hanya baca) | User |
| 7 | **Member dan PM melihat Pengaturan yang sama.** Pengaturan proyek (Periksa, Jenis tugas, Tag) tetap di tiap proyek untuk Pengelola. Persetujuan pengguna dan peran akun tetap di menu **Pengguna** milik Admin, bukan di sini | Claude |
| 8 | **Mode Pendamping ditunda** dan belum masuk Pengaturan | User |
| 9 | **Cuti memakai pengajuan dan persetujuan.** Member atau PM menekan **Ajukan cuti**, mengisi rentang tanggal, lalu mengirim. Pengajuan muncul sebagai kartu di Inbox penyetuju dengan **Setujui** dan **Tolak**; pemohon menerima kabar hasilnya. **Penyetuju:** untuk Member, **Pengelola proyek yang diikutinya atau Admin** (siapa pun yang pertama memutuskan, kartu hilang untuk yang lain); untuk PM, **Admin**; cuti **Admin langsung berlaku** tanpa persetujuan | User (14 Okt) |
| 10 | **Saklar "Cuti perlu persetujuan"** di Pengaturan tim (khusus Admin), bawaan **hidup**. Bila dimatikan, semua cuti langsung berlaku dan tombol di layar ③ berubah menjadi **Simpan cuti** | User |
| 11 | **Isian tanggal: dari dan sampai.** Pengajuan untuk hari ini boleh (cuti mendadak). Selama menunggu, di menu Tim status "Pengajuan cuti ..." terlihat oleh **PM, Admin, dan pemohon**; orang lain baru melihat "Cuti" setelah disetujui | User |
| 12 | Kartu persetujuan menampilkan **jumlah tugas yang jatuh tempo saat cuti**. Pemohon boleh **membatalkan pengajuan yang masih menunggu**. Bila ditolak, alasan (boleh kosong) ditampilkan dan pemohon boleh mengajukan lagi | User + Claude |

## 2. Matriks

| Bagian | Admin | Project Manager | Member |
|---|---|---|---|
| Akun saya (Ubah profil) | ✅ | ✅ | ✅ |
| Tampilan (ukuran teks) | ✅ | ✅ | ✅ |
| Pemberitahuan | ✅ | ✅ | ✅ |
| Ajukan cuti | ✅ (langsung berlaku) | ✅ (disetujui Admin) | ✅ (disetujui Pengelola proyek atau Admin) |
| Menyetujui cuti | ✅ semua pengajuan | ✅ untuk Member di proyek yang ia kelola | ❌ |
| Saklar "Cuti perlu persetujuan" | ✅ | ❌ | ❌ |
| Pengaturan tim | ✅ | ❌ | ❌ |
| Keluar | ✅ | ✅ | ✅ |

## 3. Layar

Frame 1280 lebar, gaya lo-fi abu-abu sama dengan grup 01–08. Menu samping: **Pengaturan** aktif.

| No | Layar | Isi |
|---|---|---|
| ① | Pengaturan (halaman di-scroll) | Kartu **Akun saya** (foto, nama, jabatan · divisi, HP dan email, tombol **Ubah profil**), **Tampilan** (tiga tombol besar ukuran teks dan contoh), **Pemberitahuan** (dua saklar dan catatan), **Ketersediaan** (Cuti dan tombol **Atur cuti**), **Pengaturan tim** (Admin), tombol **Keluar** |
| ② | Ubah profil | Foto dengan **Ganti foto**, enam isian dua kolom (email abu-abu, hanya baca), tombol Batal dan Simpan |
| ③ | Ajukan cuti | Kotak di atas latar gelap: **Dari tanggal** dan **Sampai tanggal**, Catatan, keterangan ke siapa pengajuan dikirim, Batal, **Kirim pengajuan** (Admin atau saklar mati: **Simpan cuti**) |
| ④ | Keadaan cuti | Kartu Ketersediaan dalam empat keadaan: **Tidak sedang cuti**, **Menunggu persetujuan** (Batalkan pengajuan), **Disetujui** (Batalkan cuti), **Ditolak** (alasan, Ajukan lagi). Admin: dua keadaan, tanpa menunggu atau ditolak |

Panah: ① → ② (Ubah profil), ① → ③ (Ajukan cuti). Kartu persetujuan untuk penyetuju ada di Inbox (lihat `06-inbox.md`).

Data contoh: Nico (Manajer Proyek, Divisi Produk), Dodi (Pengembang, Divisi Produk), Ayu (Staf Administrasi, Divisi Umum). Nama lengkap, jabatan, divisi, dan nomor HP adalah contoh baru. Ukuran teks yang terpilih di contoh adalah **Besar**.

## 4. Data yang dipakai

| Yang diatur | Tempat | Status |
|---|---|---|
| Ukuran teks | `profiles.text_size` | Sudah ada di `tahapan-proyek/03-desain/erd/user-profile.md` (usulan menjadi keputusan) |
| Nama, panggilan, jabatan, divisi, HP, foto | `profiles` | Sudah ada |
| **Cuti** | Tabel baru **`leave_requests`**: `id`, `user_id`, `start_date`, `end_date`, `note`, `status` (menunggu · disetujui · ditolak · dibatalkan), `decided_by`, `decided_at`, `reject_reason`, `created_at`. Menggantikan usulan `profiles.away_until` dan `away_note`. Status "Cuti" di Tim **dihitung** dari pengajuan disetujui yang mencakup hari ini | **Baru** (menggantikan usulan di `07-tim.md`) |
| Pengingat acara dan Kabar terbaru | `notification_preferences` (`kind`, `in_app`) dari `06-inbox.md` | Dipakai pertama kali di sini |
| Fitur AI, lama simpan rekaman, pengingat acara bawaan | Tabel kecil **`workspace_settings`** (satu baris): `ai_enabled` boolean bawaan hidup, `raw_audio_retention_days` int bawaan 30, `default_event_reminders` varchar, `leave_requires_approval` boolean bawaan hidup | **Baru** (usulan) |

Peran dan izin tidak punya data sendiri; layar hanya menampilkan matriks izin yang sudah diputuskan.

## 5. Pertanyaan terbuka (di-keep, belum dijawab)

> Ditunda atas permintaan user (14 Oktober 2026). Wireframe memakai usulan bawaan di bawah ini sampai dijawab.

1. **Lama simpan rekaman:** pilihan apa saja yang muncul? (wireframe: 30 hari) Usulan: 7 hari, 30 hari (bawaan), dan Hapus segera setelah hasil rapat dikonfirmasi (sesuai D3 di orkestrasi).
2. **Fitur AI dimatikan:** tombol rekam, Foto, dan "Pilah hasil rapat" hilang, dan yang tersisa hanya Ketik. Setuju?
3. **Ukuran teks** mengubah semua layar. (wireframe: Besar terpilih) Perlu uji ke 2–3 pengguna awam atau lansia untuk memastikan "Besar" cukup, atau "Sangat besar" lebih cocok sebagai bawaan untuk segmen ini?
4. ~~Cuti berakhir otomatis di tanggal yang dipilih~~ **Selesai:** karena memakai rentang dari–sampai, status Cuti dihitung dari tanggal sehingga berakhir sendiri.
5. Apakah **jenis cuti** (tahunan, sakit, lainnya) perlu dibedakan? Usulan: tidak, cukup catatan, supaya tidak masuk wilayah SDM (jatah dan saldo cuti tidak dikelola di sini).
6. Cuti **disetujui lalu dibatalkan setelah mulai**: boleh oleh pemohon sampai hari terakhir? Usulan: boleh, status kembali Tersedia mulai hari itu.
