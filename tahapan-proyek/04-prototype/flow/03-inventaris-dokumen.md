> **Dokumen turunan** (dibangkitkan agen pembaca, 16 Okt 2026). Inventaris keputusan, cakupan, dan alur dari dokumen `tahapan-proyek`, 16 Okt 2026.
> Jangan disunting tangan; bila kode, keputusan, atau wireframe berubah, bangkitkan ulang (lihat `README.md` folder ini). Dokumen ini dikecualikan dari batas ukuran berkas karena berupa data turunan.

# Inventaris Dokumen `tahapan-proyek` — Keputusan, Cakupan, Alur (Simple PM)

Dibuat dari bacaan HANYA-BACA `/tmp/sp-coord/tahapan-proyek` (+ `/tmp/sp-coord/docs/decisions`). Bahasa: Indonesia. Singkatan sumber: **KEP** = `05-implementasi/KEPUTUSAN-MVP-INTI.md` (mengikat, 15 Okt 2026); **PRG** = `PROGRES.md` (status nyata sampai 16 Okt 2026, G14 diluncurkan); **P1/P2/P3** = `rencana/P*`; **X1/X2/X3** = `tinjauan/*`; **R03/R07/R08/R10/R11/R12** = `riset/*`; **D00..D09** = `03-desain/erd/diskusi/00..09`; **NOTE** = `note.md`; **UAT** = `uat/UAT-S0A.md`; **ADR1/ADR2** = `/tmp/sp-coord/docs/decisions/0001,0002`; **JDW** = `JADWAL-S1-S2.md`; **RNG** = `RANGKUMAN-PRESENTASI.md`.
Prioritas bila bentrok: KEP > PRG > JDW/P1/P2/P3/X1-X3 > R01-R14 > 03-desain/NOTE.
Legenda status MVP Inti: DIBANGUN = sudah di-merge (PRG); SEDANG = diluncurkan/belum di-merge; DITUNDA = sengaja keluar dari S0-S2 tapi ada irisan tujuan; TIDAK DIRENCANAKAN = tak punya irisan (Won't / fase 5 tanpa jadwal).
Kondisi nyata (PRG 16 Okt): 58 dari 93 tugas selesai (S0.0 9/9, S0.a 16/16, S0.b 33/33; S1 0/18 dan S2 0/17 di tabel, tetapi log menulis **G14 diluncurkan**: S1-01'+S1-02, S1-06, S2-01+S2-02, T-H1). Tag `contract-v1` dipasang LOKAL. Gerbang SP-G2 (penguji nyata) BELUM terpenuhi.

---
## 1. Cakupan fitur (`FIT-*`)

| ID | Nama awam | Irisan | Status MVP Inti | Sumber |
|---|---|---|---|---|
| FIT-01 | Masuk dengan Google (satu-satunya cara masuk di produksi) | S0.a | DIBANGUN (S0A-12). UAT login Google asli BELUM dijalankan | KEP Q3; PRG S0.a; UAT §D |
| FIT-02 | Daftar otomatis lewat Google (akun baru berstatus Menunggu) | S0.a | DIBANGUN (S0A-04/05/06) | ADR1; P1 §2.2 |
| FIT-03 | Halaman "Menunggu persetujuan" / "Ditolak + alasan" (`/waiting`, satu rute dua keadaan, tanpa form profil) | S0.a | DIBANGUN (S0A-11) | KEP §6 baris Layar ③; P1 §2.3 |
| FIT-04 | Halaman "Akun dinonaktifkan" (`/banned`) | S0.a (fondasi lama) | DIBANGUN | P1 §2.3; UAT E4 |
| FIT-05 | Persetujuan akun oleh Admin (Setujui + pilih peran / Tolak + alasan 3-200 karakter) | S0.a | DIBANGUN (S0A-10/14) | UAT Skenario 3-4; D00 §3 |
| FIT-06 | Undangan awal (email + peran; login pertama langsung disetujui) | S0.a | DIBANGUN (S0A-04/10/14) | D00 §4; P1 §2.2; UAT Skenario 1 |
| FIT-07 | Kelola pengguna: daftar, ubah peran Member↔PM, nonaktifkan/buka blokir (`/dashboard/users`) | S0.a | DIBANGUN (S0A-14) | D00 §3; UAT Skenario 5 |
| FIT-08 | Empat peran akun (Super-admin, Admin, Project Manager, Member) | S0.a | DIBANGUN (S0A-01) | KEP §4; D00 §1 |
| FIT-09 | Penanda angka antrean persetujuan di menu samping + tautan dari menu super-admin | S0.a (tugas baru 16 Okt) | DIBANGUN (S0A-16) | PRG log 16 Okt; UAT Skenario 7 |
| FIT-10 | Coba Demo / akun anonim | dicabut S0.a | DIBANGUN sebagai PENCABUTAN (S0A-13; akun anonim lama ditandai ditolak lalu dibersihkan) | KEP Q4; D00 §4 |
| FIT-11 | Menyamar sebagai pengguna (super-admin), aksi merusak diblokir | S0.a | DIBANGUN (kebijakan `IMPERSONATING`; `Principal.impersonating` baru tersambung sebagian, P2 K7) | KEP Q9; X2 §2E1; P2 §7 K7 |
| FIT-12 | Gerbang `/api/auth/*` (tutup daftar email & `/admin/*` di produksi) | S0.a | DIBANGUN (S0A-08) | UAT §D; R12 F1-F3 |
| FIT-13 | Kunci API (API key) untuk app; PM tidak boleh hapus proyek/kelola anggota/ubah profil | S0.b | DIBANGUN (`PM_KEY_DENY`, S0B-19) | KEP X1-Q9 |
| FIT-14 | Konsol `/dev` (super-admin, ops) — bukan tempat fitur produk | fondasi | ADA (tak ditambah fitur produk) | CLAUDE.md; D00 §2 |
| FIT-15 | Area `/dashboard` Admin: **Pengguna** (persetujuan, peran, undangan) | S0.a | DIBANGUN | D00 §2 |
| FIT-16 | `/dashboard` **Pengaturan tim** (saklar AI, Cuti perlu persetujuan, lama simpan rekaman, pengingat acara bawaan, tabel Peran & izin baca-saja) | S6 (hanya satu kolom `event_default_reminders`); saklar AI/cuti = W | DITUNDA / TIDAK DIRENCANAKAN | D09 #6; R08 §1; R10 A8-A9 |
| FIT-17 | Hapus akun (pra-cek Pengelola tunggal; konten jadi "Mantan anggota") | S6 | DITUNDA (kartu Hapus akun disembunyikan dari pengguna biasa) | X2 D7; R10 A7 |
| FIT-18 | Beranda (Sapaan, Fokus saya, Proyek saya, Sekilas, Agenda, dst.) | S3 | DITUNDA. `/app` tetap placeholder panduan + 2 tombol besar "Tugas saya" & "Proyek" (S2-17) | KEP §1; P3 §2 baris Beranda |
| FIT-19 | Inbox (tab Perlu Anda tanggapi / Kabar terbaru) + lonceng + badge | S3 | DITUNDA | KEP §1; D06; R10 I1-I2 |
| FIT-20 | Infrastruktur pemberitahuan `notify()` | S3 | DITUNDA | R07 §1; R10 |
| FIT-21 | Daftar proyek (List, cari, saring status, urut, "saya/semua") | S1 | SEDANG (S1-02 di G14; UI belum) | P3 §2; PRG |
| FIT-22 | Daftar proyek tampilan Grid + chip "Perlu perhatian" | S5 | DITUNDA | P3 §2 ⚑; KB-9 |
| FIT-23 | Proyek baru (satu form; langsung tanpa halaman "pilih cara") | S1 | SEDANG | P3 §2 ③④ |
| FIT-24 | Detail proyek: tab Ringkasan · Tugas · Anggota | S1 (Tugas diisi S2-14) | SEDANG | P3 §2 ⑧⑨⑪ |
| FIT-25 | Kondisi proyek dihitung (Lancar / Perlu perhatian / Terlambat + 1 kalimat alasan, hanya proyek Berjalan) | S1 dasar; milestone S5 | DIBANGUN sebagai metrics (S0B-09); UI S1 | R03 §3.6; D02 #9 |
| FIT-26 | Anggota proyek + peran (Pengelola/Anggota/Pemantau), tambah/ubah/keluarkan | S1 | SEDANG | P3 §2 ⑪ |
| FIT-27 | Pengelola utama (Lead) di header proyek | S1 | SEDANG (label "Pengelola utama" belum disetujui, KB-8) | P3 §1, KB-8 |
| FIT-28 | Ubah proyek (info + status manual 5 nilai) | S1 | SEDANG | P3 S1-13; KB-12 |
| FIT-29 | Hapus proyek ke Sampah + halaman Sampah minimal khusus proyek + Pulihkan | S1 (S1-05, S1-18) | SEDANG (keputusan user pilihan B) | KEP §6 |
| FIT-30 | Tahapan (fase) + stepper | S5 | DITUNDA (rute `/tahapan` tidak didaftarkan → 404) | P3 §2 ⑩; D02 #7 |
| FIT-31 | Milestone ("Target penting") | S5 | DITUNDA | R10 P6; R11 glosarium |
| FIT-32 | Perpanjang tenggat + chip "Diperpanjang ×N" + riwayat | S5 | DITUNDA (di S1 tenggat boleh langsung diubah, KB-3) | P3 §2 ⑫; KB-3 |
| FIT-33 | Ganti kondisi manual (override) | S5 (Could) | DITUNDA | R10 P8 |
| FIT-34 | Aktivitas proyek (kartu "Aktivitas terakhir") | S5 (Could) | DITUNDA | R10 P9; P3 §2 |
| FIT-35 | Template proyek / Simpan sebagai template | fase 5 | TIDAK DIRENCANAKAN (tabel tak dibuat) | X2 P-A4; R10 P11 |
| FIT-36 | "Ceritakan proyeknya" (AI) | fase 5 | TIDAK DIRENCANAKAN (D02 #8 menulis "masuk v1" → kalah) | KEP §1; P3 §2 ③; KON-03 |
| FIT-37 | Tugas saya (dikelompokkan Terlambat/Hari ini/Besok/Minggu ini/Nanti/Tanpa tenggat) | S2 | SEDANG (S2-01/02 di G14) | P3 §2; D03 #15 |
| FIT-38 | Semua tugas (tabel ≤5 kolom + kartu di layar kecil) | S2 | SEDANG | P3 §2; R11 K15 |
| FIT-39 | Buat tugas (form: Proyek*, Judul*, Yang mengerjakan, Prioritas, Tenggat; "Tampilkan lebih banyak") | S2 | SEDANG | P3 §2 ⑥ |
| FIT-40 | Satu tombol "langkah berikutnya" per baris (Mulai kerjakan / Tandai selesai) + mesin status | S2 | SEDANG (S2-05) | D03 #16; P3 S2-05 |
| FIT-41 | Detail tugas halaman penuh `/app/tasks/:number` | S2 | SEDANG | KEP Q11; KB-2 |
| FIT-42 | Daftar periksa ("langkah-langkah") | S2 | SEDANG (S2-06) | R10 T5 |
| FIT-43 | Komentar + riwayat satu linimasa ("Obrolan & riwayat") | S2 | SEDANG (S2-06) | P3 §2 ⑧⑨ |
| FIT-44 | Batalkan tugas (5 kategori), Pulihkan, Buka lagi (alasan wajib) | S2 | SEDANG | P3 §2 ⑪; D03 #22 |
| FIT-45 | Cari + saring tugas (Proyek, Orang, Prioritas, status Aktif/Selesai/Dibatalkan, urut) | S2 | SEDANG | P3 §2 ① |
| FIT-46 | Minta diperiksa / Setujui / Kembalikan ("Periksa", bawaan mati) | UI S4; kebijakan di S0.b | DITUNDA (kebijakan ada; tombol & endpoint tidak) | KEP Q6; KB-6; KON-06 |
| FIT-47 | Dependensi, label "Tertahan", notifikasi "Giliran Anda" | S4 | DITUNDA | R10 T8 |
| FIT-48 | Tag per proyek | S4 | DITUNDA | R10 T9; D03 #13 |
| FIT-49 | Papan (Kanban) dengan "Pindahkan ke…" tanpa seret | S4 | DITUNDA | R10 T11; R11 K14 |
| FIT-50 | Mention `@nama` di komentar | S4 (Could) | DITUNDA | R10 T14 |
| FIT-51 | Kartu Inbox "Terlambat" 3 tombol | S4 (Could) | DITUNDA | R10 T16 |
| FIT-52 | Bukti/lampiran (gambar+PDF maks 10 MB) | S5 | DITUNDA | KEP Q15-22; X2 Q20 |
| FIT-53 | Jenis tugas (Tugas/Bug/Ide; kelola maks 6) | UI kelola S5 (Could); 3 jenis dibuat otomatis | DITUNDA (isian "Jenis" hanya di "Tampilkan lebih banyak"; saringan Jenis ditunda ⚑) | D03 #3-4; KB-9 |
| FIT-54 | Hapus tugas ke Sampah (Urungkan ±10 dtk) | S6 | DITUNDA — **S2 tidak memasang tombol Hapus tugas** | KEP X1-Q1; RS-7 |
| FIT-55 | Halaman Sampah penuh (Proyek+Tugas+Event, hapus permanen khusus Admin, purge 30 hari) | S6 | DITUNDA (hanya versi minimal proyek di S1) | D08; R10 Z1-Z2 |
| FIT-56 | Tim: daftar orang + beban aktif/terlambat | S6 | DITUNDA | D07; R10 M1 |
| FIT-57 | Ketersediaan (Tersedia/Sedang rapat) dan Cuti (ajukan/setujui) | W | TIDAK DIRENCANAKAN | R10 G4; D09 #9-12 |
| FIT-58 | Events: daftar, form 2 tahap, detail, pengingat 1 hari & 30 mnt | S7 | DITUNDA | D05; R10 E1-E2 |
| FIT-59 | Notulensi ketik; Tugas dari rapat manual | S7 (E4 Could) | DITUNDA | R10 E3-E4 |
| FIT-60 | Kalender Bulan/Minggu; acara berulang | S7 / S7+ (Could) | DITUNDA | R10 E5-E6 |
| FIT-61 | Notulensi Foto/Suara AI, Google Calendar | fase 5 / W | TIDAK DIRENCANAKAN | R10 E7 |
| FIT-62 | Pengaturan: Profil (foto, nama, jabatan, divisi, HP opsional, email baca-saja) + Ukuran teks + Keluar (konfirmasi) + "Lanjutan" (sesi, riwayat masuk, API key) | S1 (S1-14/15) | SEDANG (API profil S1-06 di G14) | P3 §2 baris Pengaturan |
| FIT-63 | Ukuran teks Normal/Besar/Sangat besar (skala seluruh app, tanpa kedip) | S0.b mekanisme + S1 layar | Mekanisme DIBANGUN (S0B-24/25); layar SEDANG | KEP X1-Q2; R11 D2 |
| FIT-64 | Pengaturan › Notifikasi (2 saklar) | S6 | DITUNDA | R10 G2 |
| FIT-65 | Impor / Unduh CSV tugas, pilih-massal | fase 5 | TIDAK DIRENCANAKAN (D03 #11, D04 #4 menjadikannya fitur Member → kalah) | P3 §2; KON-04 |
| FIT-66 | "Tulis saja ✦" (AI → tugas), Briefing AI, Ask Data | fase 5 | TIDAK DIRENCANAKAN | R10 T15, H5; R13 #1 |
| FIT-67 | Gantt / tampilan jadwal | "fase 2" (D02 #6, D03 #14) / fase 5 (`_BRIEF` §20) | TIDAK DIRENCANAKAN (tanpa irisan) | KON-05 |
| FIT-68 | Tab Retro, kartu commits, status update AI | "fase 2" / fase 5 | TIDAK DIRENCANAKAN | D02 #6; `_BRIEF` |
| FIT-69 | Menu Ticket dan menu Pengembangan (ide) terpisah | ditunda | TIDAK DIRENCANAKAN | D03 #2; `_BRIEF` |
| FIT-70 | Mode Pendamping (versi baca-saja untuk pendamping) | W | TIDAK DIRENCANAKAN (Pemantau jadi pengganti) | D09 #8; R10 F7 |
| FIT-71 | "Online sekarang" dan "Aktivitas tim" di Tim | dihapus | TIDAK DIRENCANAKAN | D07 #2-3 |
| FIT-72 | Push PWA, email, WhatsApp, SSE | W | TIDAK DIRENCANAKAN | R10 I3; D06 #11 |
| FIT-73 | Kebijakan privasi bahasa polos, `redact` log, uji pengguna putaran 2, rilis | S8 | DITUNDA | R10 X4-X6 |
| FIT-74 | Kerangka app: stub rute, NAV 4 item aktif, komponen dasar, tema, factory + data Atlas | S0.b | DIBANGUN (33/33) | PRG; ADR2 |
| FIT-75 | Pemilih orang (hanya nama + jabatan) | S1 (S1-04, `GET /team/picker`) | SEDANG | KB-7; KEP Q8 |
| FIT-76 | Uji pengguna UP-1 dengan 5 orang awam ≥50 th | S2 gerbang | BELUM (penguji masih dummy) | KEP Q14; P3 §6.3 |
| FIT-77 | Audit log aksi berhak istimewa | tiap irisan | DIBANGUN untuk akun (S0.a); sisanya tiap irisan | R10 X1; R12 §1.4 |
| FIT-78 | Antarmuka tampil di HP | di luar fokus | "Polesan mobile dikerjakan rekan"; kerangka responsif dasar tetap | D00 §5; RNG §4 |

Hitungan: 78 fitur (DIBANGUN 17 · SEDANG 18 · DITUNDA 27 · TIDAK DIRENCANAKAN 12 · lainnya 4: ADA/BELUM/rekan/mekanisme).

---
## 2. Keputusan (`DEC-*`)

| ID | Keputusan (kalimat awam) | Sumber | Tanggal |
|---|---|---|---|
| DEC-01 | Versi pertama hanya yang inti: akun & hak akses, proyek, tugas (S0-S2); Inbox, Beranda, Periksa, Papan, Sampah penuh, Tim, Events, AI dan lainnya menyusul | KEP §1 | 15 Okt 2026 |
| DEC-02 | Semua orang memakai jam WIB (satu zona, `APP_TIME_ZONE`) | KEP Q1 | 15 Okt |
| DEC-03 | Siapa saja boleh mencoba masuk lewat Google; tanpa undangan harus disetujui Admin; batas domain email kosong = semua | KEP Q2 | 15 Okt |
| DEC-04 | Wajib akun Google; keluarga/Admin membantu membuatkan; masuk email+kata sandi hanya di komputer pengembang | KEP Q3 | 15 Okt |
| DEC-05 | Akun anonim/demo lama ditandai ditolak ("demo dimatikan") lalu dibersihkan; Coba Demo dicabut | KEP Q4, X1-Q4 | 15 Okt |
| DEC-06 | Tidak ada tugas tanpa proyek; Member baru baru bisa membuat tugas setelah diajak ke proyek | KEP Q5 | 15 Okt |
| DEC-07 | Pengerja (juga Admin) tidak boleh menyetujui hasil kerjanya sendiri; bila tak ada orang lain, "Minta diperiksa" ditolak dengan pesan jelas | KEP Q6 | 15 Okt |
| DEC-08 | PM yang bukan anggota proyek boleh melihat saja, tanpa berkomentar | KEP Q7 | 15 Okt |
| DEC-09 | Email dilihat sesama anggota proyek; HP hanya pemilik dan Admin; pemilih anggota hanya menampilkan nama dan jabatan | KEP Q8 | 15 Okt |
| DEC-10 | Super-admin yang menyamar tidak boleh menghapus atau mengubah peran | KEP Q9 | 15 Okt |
| DEC-11 | Peninjau manusia ≥ 4 hari/minggu; peninjau kedua S0.b/keamanan diterima tetapi namanya placeholder, lalu diputuskan jalan **tanpa peninjau kedua** | KEP Q10; PRG 16 Okt; ADR2 | 15-16 Okt |
| DEC-12 | Detail tugas = halaman penuh, bukan panel samping | KEP Q11 | 15 Okt |
| DEC-13 | Proyek Selesai/Dibatalkan/Ditunda: tugas tetap boleh ditambah/diubah; hanya Sampah yang mengunci; tampil catatan lembut | KEP Q12 | 15 Okt |
| DEC-14 | Ukuran huruf awal akun baru = Normal, dipilih sendiri di Pengaturan/Profil | KEP Q13 | 15 Okt |
| DEC-15 | Gerbang S2: ≥3 dari 5 penguji ≥50 th selesai tanpa bantuan; target rilis S8: ≥4 dari 5 dalam ≤3 menit; **penguji dummy tidak dihitung** | KEP Q14, §5 | 15 Okt |
| DEC-16 | Hapus tugas/event/lampiran ke Sampah TANPA dialog (tombol Urungkan ±10 dtk + Sampah 30 hari); hapus proyek, keluarkan anggota, ubah peran, hapus permanen tetap berdialog; ini mengubah `CLAUDE.md` UX §1 | KEP X1-Q1 | 15 Okt |
| DEC-17 | Skala teks 1 / 1,25 / 1,5 untuk seluruh app (satu provider) | KEP X1-Q2,Q6; R11 D2 | 15 Okt |
| DEC-18 | Mantine dipatok 9.6.3 persis | KEP X1-Q3 | 15 Okt |
| DEC-19 | Migrasi lama belum pernah jalan di produksi; migrasi baru append-only 0014-0016 | KEP X1-Q5 | 15 Okt |
| DEC-20 | Fitur AI bawaan MATI; kuncinya dibuat saat fase 5 | KEP X1-Q7 | 15 Okt |
| DEC-21 | Narasi README diubah di S8 setelah kalimatnya disetujui user | KEP X1-Q8 | 15 Okt |
| DEC-22 | Kunci API dilarang hapus proyek, kelola anggota, ubah profil/foto; boleh membuat/mengubah tugas | KEP X1-Q9 | 15 Okt |
| DEC-23 | **Hapus proyek = pilihan B**: halaman Sampah minimal khusus proyek masuk S1 dan tombol Hapus proyek aktif (tugas S1-18) | KEP §6 | 15 Okt |
| DEC-24 | **Siapa boleh hapus proyek = pilihan 2**: Super-admin, Admin, PM-Pengelola; Member-Pengelola TIDAK boleh (boleh lihat & pulihkan) | KEP §6 | 15 Okt |
| DEC-25 | Buat proyek: Super-admin, Admin, PM. Ubah proyek: Admin semua; PM hanya yang ia kelola; Member hanya bila ditunjuk Pengelola | KEP §6; D02 #2-5 | 15 Okt |
| DEC-26 | Merge per gelombang (bukan per tugas); pengecualian satu per satu: `auth.ts`, `guard.ts`, `permissions.ts`, migrasi | KEP §6 | 15 Okt |
| DEC-27 | Layar ③ (Profil · Menunggu): pilihan A — `/waiting` TANPA form profil; profil diisi setelah disetujui | KEP §6 | 15 Okt |
| DEC-28 | Jadwal S0.a/S0.b: risiko-dulu, 3→4 worker, titik cek setelah G4, satu cabang per tugas | KEP §6 | 15 Okt |
| DEC-29 | Pakai data dummy (`Penguji-1..5`, `Peninjau-2`) dulu; hasil dummy tak memenuhi gerbang S2 | KEP §5 | 15 Okt |
| DEC-30 | Empat peran akun; peran di proyek dipisah: Pengelola/Anggota/Pemantau | D00 §1; D02 #11 | 15 Okt |
| DEC-31 | Admin tidak boleh mengubah/menyetujui Admin atau Super-admin; Admin boleh Member↔PM; "Admin terakhir" dibuang karena super-admin selalu ada | D00 §3; X2 §2E1 | 15 Okt |
| DEC-32 | Login hanya Google; undangan awal = langsung disetujui dengan peran undangan | D00 §4 | 15 Okt |
| DEC-33 | Ukuran teks final: Normal/Besar/Sangat besar, berlaku di semua layar | D00 §5; D09 #2 | 13-15 Okt |
| DEC-34 | Prioritas layar: komputer & tablet; polesan HP oleh rekan | D00 §5 | 15 Okt |
| DEC-35 | Hapus proyek ikut memindahkan tugasnya dan ikut pulih; tugas yang dihapus lebih dulu tidak ikut pulih | D08 #4 | 13 Okt |
| DEC-36 | Hapus permanen sebelum 30 hari hanya Admin, selalu konfirmasi | D08 #5 | 13 Okt |
| DEC-37 | Komentar & bukti tak masuk Sampah (hanya pesan Urungkan) | D08 #13 | 13 Okt |
| DEC-38 | Status proyek dipisah dari kondisi: status = dipilih manusia, kondisi = dihitung | D02 #12; R11 | 7-8 Okt |
| DEC-39 | Detail proyek dirampingkan: 4 tab (Ringkasan, Tugas, Tahapan, Anggota); Retro/commits/Gantt ditunda | D02 #6-7 | 7-8 Okt |
| DEC-40 | Tugas: Papan + List; tombol "langkah berikutnya" satu per baris; default menu = Tugas saya | D03 #14-16 | 8 Okt |
| DEC-41 | "Perlu diperiksa" = tombol on/off per tugas, bawaan mati; nyalakan siapa pun yang boleh ubah; matikan hanya Pengelola/Admin | D03 #23 | 8 Okt |
| DEC-42 | Pemeriksa bukan pengerja; bisa Pengelola/Admin; semua Pengelola boleh memeriksa; Pemantau boleh komentar tapi bukan pemeriksa | D03 #7-10 | 7-8 Okt |
| DEC-43 | Nomor tugas satu urutan global (`#482`), tak dipakai ulang | D03 #19 | 8 Okt |
| DEC-44 | Alasan Batalkan: kategori tetap (Dobel · Tidak jadi · Di luar cakupan · Salah buat · Lainnya, catatan wajib bila Lainnya) | D03 #22 | 8 Okt |
| DEC-45 | Inbox satu-satunya halaman pemberitahuan; nama menu tetap "Inbox"; Events tetap "Events" | D06 #1-2; R11 D8 | 8-14 Okt |
| DEC-46 | Pengajuan cuti = kartu dua tombol (Setujui/Tolak); "Cuti perlu persetujuan" bawaan hidup | D06 #13; D09 #9-10 | 14 Okt |
| DEC-47 | Mode Pendamping ditunda; Tim hanya baca | D09 #8; D07 #7 | 13 Okt |
| DEC-48 | Sudut pandang desain: istilah Indonesia baku; Inbox/Events dipertahankan | R11 D8 | – |
| DEC-49 | Data contoh Atlas mengikuti rumus: progres **17%** (bukan 70%); target 1.000 tugas/tim | X2 §2C, D12 | 15 Okt |
| DEC-50 | Pembulatan progres: `Math.round`, maksimal 99% kecuali semua selesai; penyebut 0 → "Belum ada tugas" | X2 §2C; P2 K4 | 15 Okt |
| DEC-51 | Tanpa tenggat tak bisa Terlambat; Anggota tak bisa keluar sendiri; Lead tak bisa diturunkan/dikeluarkan | X2 D3-D4, K21 | 15 Okt |
| DEC-52 | Admin selalu berhak penuh walau tercatat Pemantau | X2 D2, K6 | 15 Okt |
| DEC-53 | Fitur belum ada **disembunyikan**, bukan tampil mati "segera" (kecuali pesan di tempat wajar dicari) | P3 §2 prinsip | 15 Okt |
| DEC-54 | NAV hanya 4 menu aktif di MVP Inti (Beranda, Proyek, Tugas, Pengaturan); empat menu lain tersimpan sebagai data tapi tak tampil | X3 M15; ADR2 K5 | 15-16 Okt |
| DEC-55 | G13: UAT login Google asli dan peninjau kedua tidak dijalankan; risiko diterima | PRG 16 Okt; ADR2 | 16 Okt |
| DEC-56 | Jadwal S1+S2 (G14-G21) diusulkan; G14 diluncurkan atas perintah user | JDW; PRG 16 Okt | 16 Okt |

---
## 3. Alur yang dijelaskan dokumen (`FLW-*`)

| ID | Alur | Langkah (pelaku) | Sumber |
|---|---|---|---|
| FLW-01 | **Masuk pertama kali tanpa undangan** | (1) Orang buka `/login`, tekan "Lanjutkan/Masuk dengan Google" → (2) akun dibuat berstatus Menunggu → (3) dibawa ke `/waiting` ("Akun Anda menunggu persetujuan Admin"; tombol Cek lagi, Keluar) → (4) Admin melihat angka oranye di menu Pengguna, buka tab Persetujuan, tekan Setujui + pilih peran (dialog konfirmasi) → (5) orang tekan "Cek lagi" → masuk `/app` | D01 §3; UAT Skenario 2-3; P1 §2.3 |
| FLW-02 | **Masuk dengan undangan** | (1) Admin di `/dashboard/users` tab Undangan isi email + peran, Buat undangan → (2) orang login Google (email harus terverifikasi) → (3) langsung Disetujui dengan peran undangan → `/app` (atau `/dashboard` bila Admin). Undangan dicabut/kedaluwarsa/terpakai → orang jatuh ke Menunggu | D00 §4; UAT Skenario 1, E3; P1 §2.2 |
| FLW-03 | **Penolakan akun** | Admin tekan Tolak + isi alasan (3-200 karakter) → orang melihat "Pendaftaran Anda ditolak" + kotak "Alasan dari Admin" di `/waiting`; `/app` tetap tertutup; Admin boleh menyetujui kemudian lewat filter ditolak | UAT Skenario 4 |
| FLW-04 | **Sesi masih berlaku** | Buka aplikasi → langsung ke home per peran (Member/PM `/app`, Admin `/dashboard`, Super-admin `/dev`) lewat `/go` | D01 §3; P1 §2.3 |
| FLW-05 | **Akun dinonaktifkan** | Admin blokir → orang yang membuka `/app` dialihkan ke `/banned` (bukan `/waiting`) | UAT E4 |
| FLW-06 | **Pengalihan halaman tahan (anti-loop)** | tanpa sesi → `/login`; banned aktif → `/banned`; pending/rejected → `/waiting`; approved → `/go`; maks 3 lompatan, diuji tabel | P1 §2.3 |
| FLW-07 | **Batas wewenang Admin/Member** | Admin tak bisa blokir Admin lain, diri sendiri, atau Super-admin (alasan tertulis); Member membuka `/dashboard`, `/dev` → dialihkan ke `/app` | UAT Skenario 5-6 |
| FLW-08 | **Antrean untuk Super-admin** | Tautan "Antrean persetujuan" di menu "Area lain" + penanda oranye di `/dev/users` | UAT Skenario 7; PRG S0A-16 |
| FLW-09 | **Kartu "pengguna baru menunggu"** | Dikirim ke semua Admin dan Super-admin; hilang bagi semua begitu satu memutuskan (Inbox, S3) | D00 §3 |
| FLW-10 | **Buat proyek** | PM/Admin tekan "+ Proyek baru" → form (Nama*, deskripsi, status Draf/Berjalan, prioritas, Pengelola utama bawaan pembuat, anggota+peran, tanggal mulai-selesai + tombol cepat 1 mgg/2 mgg/1 bln/3 bln) → < 60 detik → detail "Belum ada tugas", kondisi Lancar. Member tak punya tombol; membuka URL → halaman 403 | P3 §2, §6.1 |
| FLW-11 | **Kelola anggota proyek** | Tab Anggota: tambah, ubah peran, keluarkan (dialog); menurunkan/mengeluarkan Pengelola terakhir ditolak ("Proyek harus punya minimal satu pengelola. Tunjuk pengelola lain dulu."); Pengelola utama tak bisa dikeluarkan (dialog menawarkan jadikan Pengelola utama lain) | P3 §2 ⑪, §6.1; X2 D4 |
| FLW-12 | **Hapus proyek lalu pulihkan (MVP Inti)** | Pengelola (PM)/Admin tekan "Hapus proyek" → dialog dampak (nama, jumlah tugas ikut, "bisa dipulihkan sampai {tanggal}") → proyek ke Sampah → buka `/app/trash` → "Pulihkan" (oleh Pengelola proyek itu atau Admin; Member-Pengelola boleh pulihkan, tak boleh hapus) → proyek kembali. Hapus permanen & pembersihan 30 hari BELUM ada (S6) | KEP §6; P3 S1-18 |
| FLW-13 | **Hapus umum + Urungkan (S6)** | Hapus tugas/event/lampiran TANPA dialog → toast "… dipindah ke Sampah · Urungkan" ±10 dtk → bisa dari Sampah 30 hari → Pulihkan; Hapus permanen hanya Admin dengan konfirmasi | KEP X1-Q1; D08 #3-5; R11 K10 |
| FLW-14 | **Pulihkan berantai (S6)** | Hapus proyek ikut memindahkan tugas/event dan ikut pulih; tugas yang proyeknya masih di Sampah → tombol Pulihkan mati + "Pulihkan proyeknya dulu" + tautan Lihat proyeknya | D08 #4, #14 |
| FLW-15 | **Status tugas (MVP, enam kata kerja)** | Belum dikerjakan —Mulai kerjakan→ Sedang dikerjakan —Tandai selesai→ Selesai. Pintasan: Tandai selesai langsung dari Belum dikerjakan. Batal mulai: kembali ke Belum dikerjakan. Batalkan tugas (dari Belum/Sedang/Menunggu diperiksa; pilih 1 dari 5 kategori) → Dibatalkan —Pulihkan→ Belum dikerjakan. Buka lagi (Selesai → Sedang dikerjakan, alasan wajib; penanda "Dibuka lagi ×N"). Tombol utama dihitung server | P3 §2 ⑧-⑪, §6.2; R03 §3.4 `TASK_TRANSITIONS` |
| FLW-16 | **Klik ganda / dua tab** | `UPDATE … WHERE status=:dari` → 409 `STATE_CONFLICT`, pesan lembut + muat ulang; tidak ada status ganda | P3 §6.2 #5; RS-10 |
| FLW-17 | **Alur Periksa (S4; kebijakan sudah ada, tombol belum)** | Perlu diperiksa dinyalakan → Sedang dikerjakan → Minta diperiksa → Menunggu diperiksa → Setujui (→ Selesai) atau Kembalikan (alasan wajib → Sedang dikerjakan, putaran baru "Dikembalikan ×N"). Pemeriksa bawaan: pembuat (jika Pengelola) → Lead → Pengelola tertua → Admin ("Pemeriksa: Admin" + saran Tambahkan pengelola kedua). Pengerja tak boleh menyetujui sendiri | D03 #5-9, #20, #23; R03 §3.4; X2 K2-K3 |
| FLW-18 | **Perpanjang tenggat (S5)** | Pengelola/Admin → tenggat baru wajib lebih lambat + kategori + alasan → chip "Diperpanjang ×N" + riwayat (lama → baru, oleh siapa). Di S1: tenggat boleh langsung diubah (KB-3), riwayat `original_due_date` kosong sampai S5 | D02 aturan A3; X2 P-A3; P3 KB-3, RS-9 |
| FLW-19 | **Ukuran teks** | Pengaturan → pilih 1 dari 3 tombol besar (Normal/Besar/Sangat besar) + contoh → tulis cookie `mk-text-size` + simpan profil + muat ulang → seluruh layar/jendela/notifikasi membesar, bertahan setelah muat ulang dan di peramban lain tanpa kilatan | P3 S1-14, §6.1 #5 |
| FLW-20 | **Member baru tanpa proyek** | Melihat "Anda belum masuk proyek apa pun… Minta admin atau project manager menambahkan Anda"; tombol Tugas baru mati + alasan | P3 §2 ②, Tugas ① ; RS-8 |
| FLW-21 | **Demo S1 (SP-G1), 6 langkah** | Nico (PM) lihat Atlas & tombol +Proyek; Dodi (Member) hanya proyek diikuti; Nico buat "Renovasi Dapur"; ubah/keluarkan anggota; Dodi buka proyek non-miliknya → "tidak ditemukan"; Nico di proyek Sinar → hanya baca; Dodi ubah ukuran teks; `/profile` → `/app/settings` | P3 §6.1 |
| FLW-22 | **Demo S2 (SP-G2), 6 langkah** | Dodi: Tugas saya → Mulai kerjakan; detail: centang 2 dari 3 langkah, komentar, Tandai selesai → progres proyek naik; Nico buat tugas utk Dodi, Batalkan lalu Pulihkan; Sri (Pemantau) baca+komentar tanpa tombol; klik ganda; tidak ada tombol Hapus tugas/Periksa/Tag/Bukti/Papan | P3 §6.2 |
| FLW-23 | **Uji pengguna UP-1** | 5 penguji awam (≥3 berusia ≥50), 45 mnt, tablet 1024×768/laptop, akun sudah disetujui & anggota "Renovasi Dapur"; tugas T0-T7 (atur teks; cari tugas hari ini; mulai+centang langkah; tulis catatan; tambah "Beli cat dapur" tenggat besok; tandai selesai; batalkan + alasan; lihat progres); fasilitator hanya boleh mengulang kalimat tugas; LULUS bila ≥3 penguji ≥50 th menyelesaikan T1,T2,T4,T5 tanpa bantuan | P3 §6.3; KEP Q14 |
| FLW-24 | **UAT S0.a (manusia, Google sungguhan)** | 7 skenario: undang Bu Ani; orang asing menunggu; setujui + Cek lagi; tolak + alasan; Admin tak bisa blokir Admin; Member buka `/dashboard`; antrean super-admin; + pemeriksaan produksi (`curl` sign-up email → 404) | UAT §C-§E |
| FLW-25 | **Menyamar (super-admin)** | Masuk sebagai orang lain untuk membantu; hapus/ubah peran/setujui/hapus proyek diblokir (`IMPERSONATING`) | KEP Q9; X2 §2E1 |
| FLW-26 | **Hapus akun (S6)** | Hanya Super-admin; konten kerja tetap atas nama "Mantan anggota"; dialog menampilkan proyek yang jadi yatim | X2 D7; R12 R13 |
| FLW-27 | **Cuti (ditunda)** | Member/PM Ajukan cuti (dari-sampai) → kartu di Inbox penyetuju (Pengelola/Admin) dengan Setujui/Tolak + jumlah tugas jatuh tempo → hasil dikabari; pemohon boleh batalkan selagi menunggu | D09 #9-12; D06 #13 |
| FLW-28 | **Events/notulensi (S7; AI fase 5)** | Form dua tahap (Judul, Tanggal+jam, Lokasi, Peserta → Tambah detail); notulensi diketik; rekam suara hanya selama rapat berlangsung dan wajib centang izin (fase 5); hasil rapat dikonfirmasi satu-satu sebelum jadi tugas | D05 #13, #16-18 |
| FLW-29 | **Proses kerja pembangunan** | Batch 2-4 worker AI → verifikasi koordinator → uji gabungan di worktree sementara → persetujuan user (per gelombang; `auth/guard/permissions/migrasi` satu-satu) → merge → push (atas perintah) → tutup worktree | KEP §6; README §3 |
| FLW-30 | **Tag kontrak `contract-v1`** | S0B-33 lulus + persetujuan user → tag lokal (tidak di-push) → S1/S2 boleh jalan | PRG 16 Okt; ADR2 |

---
## 4. Aturan bisnis (`RUL-*`)

| ID | Aturan (ringkas / kutipan) | Sumber |
|---|---|---|
| RUL-01 | Progres proyek = tugas selesai ÷ tugas tak batal & tak terhapus; "Menunggu diperiksa" dihitung belum selesai; penyebut 0 → "Belum ada tugas" (bukan 0%) | R03 §3.6; X2 K20 |
| RUL-02 | Pembulatan progres `Math.round`, maks 99% kecuali semua selesai (Atlas = 17%) | X2 §2C; P2 K4 |
| RUL-03 | Tugas **Terlambat** = aktif (Belum/Sedang/Menunggu diperiksa) dan tenggat < hari ini; tenggat hari ini BELUM terlambat; tanpa tenggat tak bisa terlambat | R03 §3.6; X2 K21 |
| RUL-04 | **Mandek** = Sedang dikerjakan dan > 72 jam tanpa aktivitas (`TASK_STALE_DAYS=3`, hari kalender, `>`) | X2 T-A8, K19 |
| RUL-05 | Kondisi proyek hanya untuk proyek **Berjalan**; Terlambat = tenggat proyek lewat | R03 §3.6; D02 #9 |
| RUL-06 | **Perlu perhatian** = ada tugas Tinggi/Kritis terlambat, ATAU target penting terlewat (S5), ATAU > 20% (ketat) tugas aktif terlambat; selalu disertai 1 kalimat alasan | R03 §3.6; X2 §2D |
| RUL-07 | Waktu berjalan = hari berlalu ÷ (tenggat − mulai), 0-100%; tanpa tanggal/rentang nol → "—" | R03 §3.6 |
| RUL-08 | Angka emas Atlas: progres 17%, waktu berjalan 60%, 5 tugas aktif, 1 terlambat (#12), kondisi Perlu perhatian; tahapan Perencanaan 100%, Pengembangan 0%, Pengujian 0%, Rilis "Belum ada tugas" | X2 §2C |
| RUL-09 | Zona waktu tunggal Asia/Jakarta (WIB); "Hari ini" dihitung sekali per permintaan; "Minggu ini" = sampai Minggu WIB (ASUMSI B-7) | KEP Q1; P3 §7.3 |
| RUL-10 | Sampah 30 hari (`TRASH_RETENTION_DAYS`); hari ke-30 kedaluwarsa; Urungkan 10 detik (`UNDO_WINDOW_SECONDS`) | R03 §3.6; X2 P-A2 |
| RUL-11 | Tugas boleh langsung Selesai dari Belum dikerjakan; Selesai hanya bila "Perlu diperiksa" mati (`T_A4=true`) | X2 T-A4 |
| RUL-12 | Anggota hanya mengubah tugas yang ia buat/kerjakan (`T_A2='own'`); boleh mengambil tugas tanpa pengerja | X2 T-A2, K9 |
| RUL-13 | Batalkan: pembuat/Pengelola/Admin; wajib 1 dari 5 kategori, catatan wajib bila "Lainnya"; Pulihkan = hak Batalkan; Buka lagi: pembuat/pengerja (+Pengelola/Admin), alasan wajib | D03 #22; X2 K7-K8 |
| RUL-14 | Buat tugas: Admin, Pengelola, Anggota — bukan Pemantau, bukan PM yang bukan anggota; di proyek Sampah tidak; di proyek Selesai/Ditunda/Dibatalkan boleh | X2 §2E3; KEP Q12 |
| RUL-15 | Komentar: Admin, Pengelola, Anggota, **Pemantau**; PM bukan anggota TIDAK; hapus komentar: penulis atau Pengelola/Admin (moderasi) | X2 §2E3, D6 |
| RUL-16 | Buat proyek: Super-admin, Admin, PM (bukan Member). Ubah/status/anggota: Admin semua; PM-Pengelola; Member hanya bila Pengelola | KEP §6; X2 §2E2 |
| RUL-17 | Hapus proyek: Super-admin, Admin, PM-Pengelola; Member-Pengelola tidak (`MEMBER_MANAGER_CAN_TRASH_PROJECT=false`, kode `ROLE_CANNOT_TRASH`) | KEP §6 |
| RUL-18 | Pengelola terakhir tak bisa keluar/diturunkan (`LAST_MANAGER`, berlaku juga untuk Admin); Lead tak bisa diturunkan/dikeluarkan (`IS_LEAD`); Lead baru wajib Pengelola | R03 §3.4; X2 D4 |
| RUL-19 | Pembuat proyek otomatis masuk sebagai Pengelola dan Lead | D02 aturan turunan |
| RUL-20 | Member melihat hanya proyek yang diikuti ("Semua proyek" dijepit ke "saya"); PM/Admin semua; tanpa hak lihat → 404 (identik dengan id acak), bukan 403 | P3 §2, §6.1; X2 §2E |
| RUL-21 | PM yang bukan anggota: baca saja, tanpa komentar, tanpa menu Ubah; pesan "Anda hanya bisa melihat proyek ini." | KEP Q7; P3 §2 |
| RUL-22 | Anggota tak bisa keluar sendiri (`MEMBER_CAN_LEAVE_PROJECT=false`); hanya Pengelola/Admin mengeluarkan | X2 D3 |
| RUL-23 | Admin selalu berhak penuh di proyek mana pun walau tercatat Pemantau; Member-Pengelola = hak Pengelola | X2 D1-D2, K6 |
| RUL-24 | Peran akun: Admin hanya boleh Member↔PM; PM→Admin, Admin→apa pun, aksi atas Admin/Super-admin hanya Super-admin; Super-admin tak bisa diubah via UI; tak ada aksi akun atas diri sendiri | D00 §3; X2 §2E1, K14-K15 |
| RUL-25 | Undangan: email dinormalisasi, 1 undangan aktif per email, kedaluwarsa 14 hari (`INVITATION_TTL_DAYS`), maks 100 aktif; peran Admin hanya oleh Super-admin; hanya berlaku bila email Google terverifikasi | P1 §2.2, §2.10; X2 K15 |
| RUL-26 | Alasan penolakan 3-200 karakter | UAT 4.3 |
| RUL-27 | Super-admin = email di `SUPER_ADMIN_EMAILS` **dan** terverifikasi; tanpa itu diturunkan; super-admin selalu `approved` | R12 R2; P1 §2.2 |
| RUL-28 | Produksi: `/api/auth/sign-up/email`, `/sign-in/email`, `/api/auth/admin/*` → 404 (kecuali menyamar) | UAT §D; R12 R3 |
| RUL-29 | Akun Menunggu/Ditolak/Diblokir tak punya akses API apa pun (403 `ACCOUNT_PENDING/REJECTED/SUSPENDED`), termasuk lewat API key | P1 §2.3; R12 R5 |
| RUL-30 | Kunci API: tak boleh hapus proyek, kelola anggota, ubah profil/foto; default usulan: tak boleh setujui/tolak/ubah peran/undangan (belum disetujui user, K-7) | KEP X1-Q9; P1 K-7 |
| RUL-31 | Domain email: `ALLOWED_EMAIL_DOMAINS` kosong = semua; bila diisi, domain lain ditolak ("Email ini tidak diizinkan masuk. Hubungi Admin.") | KEP Q2; UAT E1 |
| RUL-32 | Profil: hanya nama wajib (dari Google); HP/jabatan/divisi opsional; email baca-saja; ukuran teks bawaan Normal | X2 D9, Q13 |
| RUL-33 | Skala teks 1 / 1,25 / 1,5 (isi 16/20/24 px); sidebar jadi laci di ≤768/960/1152 px; target sentuh ≥44 px; tak ada teks < 14 px | R11 §3.2.1, D9 |
| RUL-34 | Sukses toast 7 detik; galat tak menutup sendiri; Urungkan 10 detik; maks 2 toast; posisi bawah-tengah | R11 K10-K11 |
| RUL-35 | Satu tombol utama per layar; label kata kerja + objek ≤ 3 kata; dilarang "OK/Ya/Tidak/Submit" | R11 K1-K2 |
| RUL-36 | Form: ≤ 5 kolom wajib di layar pertama, label selalu terlihat, tanggal bisa diketik + tombol cepat; isian pengguna tak boleh terhapus saat galat | R11 K4-K5 |
| RUL-37 | Tabel tampak ≤ 5 kolom (Tugas · Status+langkah · Mengerjakan · Tenggat · Prioritas); di layar kecil jadi kartu | R11 K15; P3 §2 |
| RUL-38 | Konfirmasi 3 tingkat: T1 Urungkan tanpa dialog; T2 dialog ringan (hapus proyek, keluarkan anggota, ubah peran, Keluar); T3 dialog berat (ketik nama) | R11 K6; KEP X1-Q1 |
| RUL-39 | Tak ada info/aksi yang hanya muncul saat hover; status/kondisi/prioritas = ikon + teks (+ warna) | R11 K12, D6 |
| RUL-40 | Fitur yang tak ada disembunyikan; tombol mati wajib ada alasan tertulis | P3 §2; R11 K3 |
| RUL-41 | Komentar/catatan dirender teks polos (tanpa Markdown/HTML); tautan hanya http(s) | R12 R8 |
| RUL-42 | Unggahan (S5): tipe dari magic bytes, tanpa SVG/HTML, gambar+PDF maks 10 MB, maks 10 berkas/tugas (ASUMSI) | X2 Q20; R12 R7 |
| RUL-43 | Setiap loader `/app/**` memanggil `requireUser` sebagai pernyataan pertama; UI tak bercabang `role ===`, izin dari `can{}` server | P3 UI-DoD; ADR2 |
| RUL-44 | Rate limit 100 permintaan/60 dtk per IP (ada); batas tulis per pengguna 60/mnt (usulan R12) | R07 §1; R12 R6 |
| RUL-45 | Jenis tugas: 3 bawaan (Tugas, Bug→"Masalah" dasar, Ide); maks 6 aktif; jenis terpakai hanya diarsipkan; estimasi jam disimpan tapi disembunyikan | D03 #3-4; X2 D11 |
| RUL-46 | Nomor tugas global `#N`, tak dipakai ulang; alamat `/app/tasks/:number` | D03 #19; KB-2 |
| RUL-47 | Daftar tugas pakai keyset; daftar proyek pakai offset+total (≤200 proyek); Tugas saya ≤ 6 query konstan | P3 KB-11, §6.2 |
| RUL-48 | Perpanjangan tenggat (S5): tenggat baru harus lebih lambat; kategori + alasan wajib | X2 P-A3 |
| RUL-49 | Beban Tim terlihat Admin (semua) dan Pengelola (hanya proyek yang ia kelola); Member tidak (S6) | D07 #5 |
| RUL-50 | Inbox: kartu "Perlu Anda tanggapi" tak dibundel, tak bisa dimatikan, hilang otomatis; selesai disimpan 30 hari, mention 14 hari (S3) | D06 #6; D09 #4; X2 Q16 |
| RUL-51 | Retensi log usulan: kunjungan 90, masuk 180, batas laju 30, API 90, audit 730 hari (ASUMSI; S8, butuh tinjauan hukum) | X2 Q19 |
| RUL-52 | Pengingat acara 1 hari & 30 menit sebelum; hapus acara berulang = "Hanya yang ini / Semua yang berulang" (S7) | D05 #12, #19 |
| RUL-53 | Rekam suara hanya selama rapat, wajib centang "Peserta sudah diberi tahu" (fase 5) | D05 #7, #16 |
| RUL-54 | Gerbang S2 butuh penguji nyata; gagal → perbaikan ≤ 3 hari lalu ulang ≥ 2 penguji baru (ASUMSI); S3 tak dimulai | P3 §6.3 |
| RUL-55 | Dilarang tanpa izin user: push, tag, deploy, Playwright, menyentuh `.env*`/`.mcp.json` | README §3; CLAUDE.md |
| RUL-56 | Tugas di proyek yang berada di Sampah: semua aksi ditolak (`PROJECT_IN_TRASH`) kecuali pulihkan | X2 §2E |

---
## 5. Peran, istilah, tokoh (`GLO-*`)

### 5a. Istilah resmi dan padanan DILARANG (P3 §1 glosarium; R11 §3.4)
| ID | Pakai | Dilarang |
|---|---|---|
| GLO-01 | Proyek · Tugas · Tahapan | project, task/ticket/card, phase/fase/stage |
| GLO-02 | Tenggat | deadline, due date, batas akhir |
| GLO-03 | Yang mengerjakan · Pembuat · Pemeriksa | assignee/PIC, reporter, reviewer |
| GLO-04 | Pengelola · Anggota · Pemantau (peran di proyek) | manager, member, viewer, guest, read-only |
| GLO-05 | Pengelola utama (usul R11, **belum disetujui**, `LABEL_LEAD`) | Lead, owner |
| GLO-06 | Target penting (usul) | Milestone, tonggak |
| GLO-07 | Daftar periksa / "langkah" · Komentar · Bukti · Berkas | checklist, comment, evidence, file/attachment |
| GLO-08 | Status tugas: Belum dikerjakan · Sedang dikerjakan · Menunggu diperiksa · Selesai · Dibatalkan | To do, Doing, In review, Blocked |
| GLO-09 | Status proyek: Draf · Berjalan · Ditunda · Selesai · Dibatalkan | Aktif, On hold, Closed, Done |
| GLO-10 | Prioritas: Rendah · Sedang · Tinggi · Kritis | Low/High, Urgent, P1, ASAP |
| GLO-11 | Kondisi (dihitung): Lancar · Perlu perhatian · Terlambat | Sehat/Berisiko, On track, At risk, Overdue |
| GLO-12 | Akun: Menunggu · Disetujui · Ditolak · Dinonaktifkan | Pending, Approved, Banned, Suspended |
| GLO-13 | Tombol: Mulai kerjakan · Tandai selesai · Batalkan tugas · Buka lagi · Pulihkan · Minta diperiksa · Setujui · Kembalikan | Approve/Return/Assign/Review/Undo/Delete/Edit/Add |
| GLO-14 | Masuk · Keluar · Masuk dengan Google | Login, Logout, Sign in |
| GLO-15 | Sampah · Pulihkan · Hapus permanen · Urungkan | trash, restore, purge, undo, archive |
| GLO-16 | Pemberitahuan (satu kata) | notifikasi, notification, alert |
| GLO-17 | Daftar · Papan · Saring · Cari · Muat ulang | List, Kanban, Filter, Search, Refresh |
| GLO-18 | **Inbox** dan **Events** (dipertahankan atas keputusan user, diberi keterangan Indonesia) | Kotak masuk, Acara |
| GLO-19 | Kata sandi · Email · Foto profil · Jendela · Saklar | Password, Surel, Avatar, Modal/popup, Toggle |
| GLO-20 | Dilarang di `/app` | backlog, sprint, stakeholder, deliverable, blocker, scope, roadmap, epic/story, kickoff/standup, retro, burndown/Gantt, workflow, dashboard/widget, mention, reminder/follow-up, sync, error/oops, "OK/Ya/Tidak" sebagai tombol, N/A/TBD, slug/ID/token/API key (hanya `/dev`) |
| GLO-21 | Dibiarkan Inggris: jenis bawaan "Bug" (dasar "Masalah"), "Inbox", "Events", "Project Manager"/"Member" pada label peran lama (R11 mengusulkan "Manajer Proyek/Anggota tim", belum disetujui) | R11 §3.4A |

### 5b. Peran
| ID | Peran | Isi |
|---|---|---|
| GLO-30 | Super-admin (`super-admin`) | dari env `SUPER_ADMIN_EMAILS`; superset Admin; home `/dev`; tak bisa diubah via UI (D00 §1) |
| GLO-31 | Admin (`admin`) | diberi Super-admin; home `/dashboard`; setujui/tolak/nonaktifkan Member & PM; boleh buka `/app` |
| GLO-32 | Project Manager (`project_manager`) | diberi Admin; home `/app`; boleh buat proyek |
| GLO-33 | Member (`member`) | bawaan pengguna baru; home `/app`; tak bisa buat proyek |
| GLO-34 | Pengelola (`manager`) | peran di proyek; Member bisa jadi Pengelola |
| GLO-35 | Anggota (`member`) | peran di proyek: mengerjakan tugas |
| GLO-36 | Pemantau (`viewer`) | peran di proyek: lihat + komentar, tak ubah tugas |
| GLO-37 | Pengelola utama (Lead) | satu Pengelola yang tampil di header |

### 5c. Tokoh contoh wireframe/seed
| ID | Tokoh | Peran | Sumber |
|---|---|---|---|
| GLO-40 | Nico | PM, Lead proyek Atlas, pengguna contoh grup B | D04; P3 §6.1 |
| GLO-41 | Dodi | Member (grup A) | D04 |
| GLO-42 | Ayu | Admin (grup C); perannya sebagai Pemantau di Inbox ambigu (R09, X2 K6) | D04; D06 |
| GLO-43 | Rina | Pengelola proyek contoh (Sinar, Renovasi Dapur) | P3 §6.1 |
| GLO-44 | Sri | Pemantau di Atlas; peran akun tak disebut (ASUMSI Member) | P3 §6.1; R09 |
| GLO-45 | Bu Ani | orang yang diundang dalam UAT | UAT Skenario 1 |
| GLO-46 | Sari Wulandari, Budi Santoso | pengguna menunggu persetujuan di wireframe Admin | D06 |
| GLO-47 | Penguji-1..5 (dummy), Peninjau-2 (dummy) | placeholder; tak boleh ada nama orang sungguhan di repo | KEP §5 |
| GLO-48 | Proyek contoh: Atlas, Portal Klien PT Sinar, Website Company Profile, Renovasi Dapur | data seed | D02; P3 |

---
## 6. Hal yang ditunda (`TND-*`) — dipotong dari MVP Inti

| ID | Ditunda | Irisan tujuan | Alasan | Sumber |
|---|---|---|---|---|
| TND-01 | Inbox, lonceng, `notify()` | S3 | di luar Inti B | KEP §1 |
| TND-02 | Beranda produk (7 widget) | S3 | idem; `/app` placeholder + 2 tombol | P3 §2 |
| TND-03 | Minta diperiksa/Setujui/Kembalikan + bagian "Menunggu diperiksa saya" + saklar Perlu diperiksa + Pemeriksa | S4 | bawaan mati; kebijakan sudah ada | P3 §2; KB-6 |
| TND-04 | Dependensi/"Menunggu tugas lain", Tertahan, Giliran Anda | S4 | bukan inti harian | P3 §2 |
| TND-05 | Tag (kelola, saringan) | S4 | tambahan pencarian | P3 §2 |
| TND-06 | Papan (Kanban) | S4 | List cukup | P3 §2 |
| TND-07 | Tahapan (tab, stepper), Target penting, kartu "Tahapan dan milestone berikutnya" | S5 | gambaran besar, bukan inti | P3 §2 |
| TND-08 | Perpanjang tenggat + chip Diperpanjang ×N | S5 | jarang dipakai awam | P3 §2 ⑫ |
| TND-09 | Kartu "Aktivitas terakhir"; ganti kondisi manual | S5 (Could) | riwayat tenggat cukup | P3 §2; R10 |
| TND-10 | Bukti/lampiran | S5 | butuh storage + keamanan unggah | P3 §2; R10 T12 |
| TND-11 | Grid proyek + chip "Perlu perhatian" | S5 | List cukup; kondisi dihitung sebelum paginasi | P3 ⚑ KB-9 |
| TND-12 | Saringan Jenis, kolom #/jenis/tag | S5 / tak ditampilkan | jenis tak berarti bagi awam (F3) | P3 ⚑ |
| TND-13 | Hapus tugas, Hapus permanen, Sampah penuh, purge 30 hari, entri tugas/event di Sampah | S6 | Sampah baru S6 | KEP X1-Q1 |
| TND-14 | Tim (beban), Pengaturan Notifikasi, Pengaturan tim, Hapus akun | S6 | nilai kecil untuk tim ≤10 | R10 F4 |
| TND-15 | Events, pengingat, notulensi ketik, Kalender, berulang, tugas dari rapat | S7 | modul terbesar | R10 F6 |
| TND-16 | Pengerasan, kebijakan privasi, uji pengguna putaran 2, rilis 0.3.0 | S8 | penutup | R10 §3.3 |
| TND-17 | Impor/Unduh CSV, pilih-massal | fase 5 | fase 5 | P3 §2; `_BRIEF` |
| TND-18 | "Tulis saja", "Ceritakan proyeknya", Briefing AI, Ask Data, notulensi foto/suara | fase 5 | AI ditunda; AI mati bawaan | KEP X1-Q7; R13 |
| TND-19 | Template proyek | fase 5 | tabel tak dibuat | X2 P-A4 |
| TND-20 | Cuti, Ketersediaan | W (tak ada irisan) | induknya ditunda | R10 G4 |
| TND-21 | Mode Pendamping | W | ditunda user | D09 #8 |
| TND-22 | Gantt, Retro, commits, menu Ticket/Pengembangan | tak ada irisan | "fase 2"/"fase 5" | D02 #6; D03 #2 |
| TND-23 | Push/PWA, email, WhatsApp, SSE | W | polesan | R10 I3 |
| TND-24 | Tampilan HP disempurnakan | rekan | di luar fokus | D00 §5 |
| TND-25 | Daftar proyek "Grid" dan "Comfy/dense/refresh/timeline" | dibuang/S5 | dibuang desain | D02 #13 |
| TND-26 | Form profil di halaman Menunggu persetujuan | S1 (`/app/settings`) | pilihan A | KEP §6 |

---
## 7. Pertentangan dan hal belum diputuskan (`KON-*`)

| ID | Pertentangan / belum diputuskan | Pemenang & alasan |
|---|---|---|
| KON-01 | Hapus proyek: P3 KB-1/P2 K3/§6.1 "tidak ada jalur UI hapus proyek" vs KEP §6 opsi B | **KEP** (user, lebih baru). P3 §6.1 butir terakhir dan R03 baris 177 & 356 belum disunting |
| KON-02 | Janji "bisa dipulihkan sampai {tanggal}" (S1-18) vs R10 Z2 "janji 30 hari hanya bila purge aktif" (purge baru S6) | **BELUM DIPUTUSKAN**; di MVP Inti proyek di Sampah tak pernah dihapus otomatis |
| KON-03 | "Ceritakan proyeknya" (AI) masuk v1 (D02 #8) dan saklar AI bawaan hidup (D09 #6) vs AI fase 5 / bawaan mati | **KEP + X1-Q7**; kedua dokumen desain belum disunting |
| KON-04 | CSV fitur Member (D03 #11, D04 #4, wireframe) vs fase 5 | **P3/KEP** (CSV ditunda); wireframe masih memuatnya |
| KON-05 | Gantt/Retro: "fase 2" (D02/D03) vs "fase 5" (`_BRIEF`) vs tak ada irisan | Tak ada irisan nyata; tulis "belum dijadwalkan" |
| KON-06 | Mesin periksa: R10 T7 = S4; X2 N3 = mesin 12 transisi + endpoint di S2; KB-6 = enam kata kerja, endpoint S4; P2 K2 = kebijakan saja | **P3/P2 (PRG)**: kebijakan lengkap ada, endpoint & UI Periksa S4, `needs_review` tak bisa true (422) |
| KON-07 | Pembulatan progres: R03 `floor` (Atlas 16%) vs X2 `round` cap 99 (17%) | **X2/P2 K4/KEP D12** → 17% |
| KON-08 | Atlas 70% (wireframe/prototipe) vs 17% (rumus) | **Rumus 17%**; wireframe Penpot ⑨ perlu disesuaikan pemiliknya (X2 C5) |
| KON-09 | Skala teks R08 1/1,125/1,25 vs R11 1/1,25/1,5; cookie `pm-text-size` vs `mk-text-size` | **X1/KEP**: 1/1,25/1,5, `mk-text-size` |
| KON-10 | Rute detail tugas `:id` (KEP Q11, brief) vs `:number` | **`:number`** (P3 KB-2; API terima digit atau id) |
| KON-11 | Menu 8 (wireframe, D00 §2, R05) vs 4 aktif (Beranda, Proyek, Tugas, Pengaturan) | **X3 M15/ADR2**: 4 aktif; 4 lain tersembunyi |
| KON-12 | Hapus tugas ada di desain (D03 #18, wireframe) vs S2 tak memasang | **KEP X1-Q1**; Sampah baru S6 |
| KON-13 | Beranda penuh (S3) vs agen lain sedang membangun beranda berdata contoh di cabang prototipe | **BELUM DIPUTUSKAN** (JDW §3 #6; default: S2-17 hanya tambah 2 tombol) |
| KON-14 | Label "Lead" vs "Pengelola utama" (usul R11, KB-8) | **BELUM DISETUJUI**; default Pengelola utama |
| KON-15 | Label peran akun: "Project Manager/Member" (D00) vs "Manajer Proyek/Anggota tim" (R11) | **BELUM DISETUJUI**; "Anggota" ganda dua tingkat |
| KON-16 | Tenggat proyek bebas diubah di S1 (KB-3) dan status proyek bebas 5 nilai (KB-12) | **BELUM DISETUJUI** user; default Ya (JDW §3 #1,#3) |
| KON-17 | Arti gerbang S2: Q14 vs R10 vs koordinator (KB-4); penguji belum ada nama | Hitung hanya penguji ≥50 th; **BELUM ada penguji nyata** (batas H12) |
| KON-18 | Admin "terakhir tak boleh diturunkan" (D04) vs dibuang (D00 §3) | **D00** |
| KON-19 | "Ayu = Admin sekaligus Pemantau" (D06/D07) vs Admin selalu penuh (X2 K6) | **X2 K6** |
| KON-20 | Layar ③ wireframe (form profil, Cek status) vs `/waiting` tanpa form | **KEP §6 pilihan A**; wireframe = selisih sengaja; kartu "profil diisi" di layar Persetujuan tak berlaku |
| KON-21 | RNG ("9 dari 92 tugas", 795 tes) vs PRG (58 dari 93, 2.887 tes) | **PRG** (RNG basi, 15 Okt) |
| KON-22 | Tabel PRG S1/S2 "belum" vs log "G14 diluncurkan" | PRG log lebih baru; tabel belum diperbarui |
| KON-23 | Kunci API boleh setujui akun/ubah peran? (P1 K-7 default tolak) | **BELUM DISETUJUI** user |
| KON-24 | `seed:atlas` skrip, UAT login Google asli, kriteria #13 (batas karakter) dan #2 (lint penuh), peninjau kedua keamanan | **TERBUKA/risiko diterima** (PRG 16 Okt; ADR2) |
| KON-25 | Mandek "≥ 3 hari" (NOTE) vs "> 72 jam" | **X2 K19** |
| KON-26 | Pemeriksa: D02 "Setujui: Pengelola" vs "pemeriksa ≠ pengerja" | **X2 K2** (pengerja tak boleh, termasuk Admin) |
| KON-27 | Nama kode galat (`IMPERSONATION_RESTRICTED` vs `IMPERSONATING`; `ACCOUNT_NOT_APPROVED` vs `PENDING/REJECTED`) | X2 / X3 M18 (teknis; tak tampil ke awam) |
| KON-28 | R01 §3-7 dan 3 bagian X3 kosong ("TODO") | Diganti P1 (KEP §5.4) |
| KON-29 | Cuti & Ketersediaan ada di desain (D07, D09, D06 #13) tetapi R10 Won't | Tak dibangun; desain belum disunting |
| KON-30 | Estimasi: R10 71-101/128 hari; S0.a P1 ±21 vs R10 11-16 | **P1/P2/PRG** (angka rencana) |

---
## 8. Risiko alur yang berpotensi membingungkan awam

| ID | Titik rawan | Pengakuan dokumen | Mitigasi tertulis |
|---|---|---|---|
| RIS-01 | Mencari tombol **Hapus tugas** yang tidak ada | RS-7 (P3 §7.1) | Menu ⋯ memuat "Batalkan tugas — tugas tidak dihapus…"; catat sebagai temuan UP-1 |
| RIS-02 | **Member baru tanpa proyek** tak bisa membuat tugas (jalan buntu) | RS-8; KEP Q5 | Empty state + siapa penolong; tombol mati + alasan |
| RIS-03 | Hapus proyek ada, Hapus tugas tidak; pemulihan hanya lewat halaman Sampah proyek | KEP §6; P3 | Dialog dampak; banner pemulihan |
| RIS-04 | Menu yang ada di wireframe (Inbox, Events, Tim, Sampah) tidak tampil; Beranda hanya panduan | X3 M15; P3 §2 | Disembunyikan, bukan "segera"; 2 tombol besar di Beranda |
| RIS-05 | Member-Pengelola boleh ubah proyek tapi **tidak** boleh hapus (tombol tak tampil) | KEP §6 | Tombol hanya bila `can.project.trash`; tak ada penjelasan tertulis di dokumen |
| RIS-06 | PM yang bukan anggota hanya baca, tanpa komentar; Member non-anggota "tidak ditemukan" (404) | KEP Q7; P3 §6.1 | Catatan "Anda hanya bisa melihat proyek ini." |
| RIS-07 | Dua tombol berbeda menyelesaikan tugas (Mulai kerjakan atau Tandai selesai langsung) | P3 §2 ⑧ | Tombol utama satu per layar; sekunder lebih kecil |
| RIS-08 | Proyek **Selesai** masih menerima tugas → progres bisa turun lagi | X2 Q12 | Banner lembut "Proyek ini sudah {status}. Tugas baru tetap boleh ditambahkan." |
| RIS-09 | Akun baru tanpa undangan menunggu tanpa kabar otomatis (harus tekan "Cek lagi") | UAT Skenario 2-3 | Penjelasan di `/waiting`; kabar otomatis = Inbox S3 |
| RIS-10 | Wajib akun Google; orang tanpa Google (lansia) tak bisa masuk | KEP Q3 ("temuan uji pengguna") | Keluarga/Admin membantu membuatkan |
| RIS-11 | "Anggota" dipakai dua tingkat (peran akun vs peran di proyek) | R11 §3.4A | Selalu tulis "peran akun" vs "peran di proyek" |
| RIS-12 | Kondisi proyek hanya untuk proyek Berjalan (Draf/Ditunda tak punya kondisi) | D02 #9 | – (tak ada mitigasi tertulis) |
| RIS-13 | Tenggat proyek diubah bebas lalu diperketat di S5 (riwayat tak lengkap) | RS-9 | Dicatat; tak ada data hilang |
| RIS-14 | Skala teks 1,5 bisa merusak tata letak | RS-6 | QA 3 skala × 3 lebar |
| RIS-15 | Wireframe Penpot dianggap target tampilan (kolom lebar, Atlas 70%) | RS-12 | P3 §2 jadi acuan layar |
| RIS-16 | Pemantau & Admin/Ayu ambigu; label Lead belum disetujui | KB-8; X2 K6 | konstanta satu baris |

---
## 9. Hal yang tidak bisa saya pastikan

1. **Status terkini S1/S2**: tabel PRG menulis "belum" tetapi log menulis G14 diluncurkan; tidak diketahui apakah G14 sudah di-merge. Tidak membaca kode.
2. Apakah wireframe Penpot layar ③ (form profil) dan layar lain **sudah diubah** mengikuti keputusan di KEP §6 (dokumen hanya menyebut "dicatat sebagai selisih sengaja").
3. Daftar **11 URL `/app/*`** `contract-v1` tidak ditemukan satu tempat; saya hanya menyimpulkan dari P3 (Beranda, projects, projects/new, projects/:projectId + anak, tasks, tasks/new, tasks/:number, settings); S1-18 menambah `/app/trash` (jadi 12).
4. Teks pesan akhir UI: dokumen memberi contoh, bukan teks final.
5. Apakah user sudah menjawab KB-3/KB-8/KB-12/KB-4/`seed:atlas`/UAT Google sesudah 16 Okt: tidak tertulis.
6. Peran akun **Sri** tidak disebut (ASUMSI Member); peran akun **Rina** tidak disebut.
7. Tidak dibaca/hanya sebagian: `01-riset/**` (hanya dicek keberadaan), `02-analisis/**` (hanya `DECISIONS.md` via grep), R02, R04, R05, R06, R09 (hanya grep), R13/R14 (ringkasan saja), X1 (lewat KEP §4), X3 (hanya M14/M15/M28/M30), P1 dan P2 (bagian keputusan/kontradiksi saja, bukan 90+ tugas), `03-desain/erd/{project,task,user-profile,gabungan}.md`, `04-prototype/**`, `uat/REVIEW-KEAMANAN-S0A.md`, `05-implementasi/rencana/_BRIEF-TAHAP2.md`, R07 detail (hanya ringkasan).
8. Aturan rinci Inbox/Beranda (R07) dan Events (D05 selain kutipan) dicatat hanya sebagai S3/S7 ditunda.
