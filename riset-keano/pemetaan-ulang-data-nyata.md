# Pemetaan Ulang Fitur ClickUp dengan Data Nyata

**Tanggal:** 5 Oktober 2026
**Metode:** Space "Project 1" di ClickUp milik Keano diisi dengan proyek riset ini, lalu dibaca kembali lewat ClickUp MCP (API). Semua isi tugas diambil dari file di repo. Hasilnya dibandingkan dengan peta di `penyederhanaan-fitur-clickup.md`.
**Batas metode:** yang diamati adalah **data dan struktur**, bukan layar. Jumlah klik, tampilan Gantt/Workload, dan notifikasi belum diuji karena butuh membuka ClickUp di browser (lihat bagian 4).
**Status:** draf untuk direview. Perubahan yang dihasilkan sudah diterapkan ke dokumen utama.

---

## 1. Data yang Dipakai

| Hal | Jumlah |
|---|---|
| List | 4: Riset Kompetitor, Sintesis Fitur, planning, Validasi Lapangan |
| Tugas | 39: 29 tugas utama + 10 sub-tugas (satu per kompetitor) |
| Urutan ("waiting on") | 20, termasuk 6 yang melintasi list |
| Penanggung jawab | 14 tugas Keano · 15 tugas rekan (tidak bisa di-assign) · 10 tugas bersama |
| Prioritas (29 tugas utama) | 1 urgent · 11 high · 14 normal · 3 low |
| Status terpakai | 4 dari 8: complete (19), to do (15), planning (4), in progress (1) |
| Tanggal mulai + tenggat | 5 dari 29 tugas utama |
| Perkiraan waktu | 5 dari 29 tugas utama |

Data template (9 tugas), tugas uji coba "halo", dan 2 tugas "tes" sudah dihapus. Lima wadah kosong masih tersisa (space PROJECT2, space Team Space, list Project 2, list Get Started, list backend) karena alat yang tersedia tidak bisa menghapus list atau space. Wadah itu harus dihapus manual dari aplikasi.

---

## 2. Temuan yang Menguatkan Peta

| # | Temuan dari data | Bagian peta yang dikuatkan |
|---|---|---|
| K1 | Setiap list "tanpa folder" ternyata punya **folder tersembunyi bernama "hidden"** sendiri (3 list, 3 folder berbeda). Enam level tetap ada walau tidak terlihat | 2.1: Proyek → Tugas → Langkah, ruang kerja tidak ditampilkan |
| K2 | Status **"complete" bertipe `done`, bukan `closed`**. Tugas yang selesai tidak mendapat tanggal tutup. Tipe `closed` justru dipakai **"cancelled"**, dan warnanya hijau seperti tanda berhasil. Di space template, "complete" yang namanya sama justru bertipe `closed` | 2.4: hanya ada **Selesai**; status tidak disetel per list |
| K3 | Space baru langsung punya **8 status** (to do, planning, in progress, at risk, update required, on hold, complete, cancelled). Proyek nyata hanya memakai 4 | 2.4: tiga status + turunan otomatis |
| K4 | Kata **"planning" dipakai untuk dua hal**: nama list dan nama status | P4/P5: nama mengikuti pertanyaan pengguna, satu istilah satu arti |
| K5 | Prioritas 4 tingkat: "urgent" hanya dipakai sekali, dan beda high/normal hanya soal perasaan | 2.3: saklar **Penting**, "Mendesak" dihitung dari tenggat |
| K6 | Hanya 5 dari 29 tugas yang butuh rentang tanggal. Sisanya cukup satu tenggat | 2.3: satu kolom **Kapan** yang menerima rentang |
| K7 | Ke-10 sub-tugas kompetitor masing-masing butuh tanggal dan status sendiri | 2.1: Langkah yang diberi tanggal atau orang diperlakukan seperti tugas |
| K8 | Rekan **tidak bisa diberi tugas** karena belum punya akun di workspace. Namanya hanya bisa ditulis di deskripsi | 2.10: undang lewat WhatsApp/tautan; tamu tanpa akun |
| K9 | Workspace baru langsung berisi template (2 space, 2 list, 9 tugas). Tugasnya bisa dihapus, tapi wadahnya tertinggal | P3 dan A1: mulai dari "Mau mengurus apa?", tanpa data contoh yang harus dibersihkan |
| K10 | Proyek riset yang kecil saja sudah berisi 39 tugas dan 20 urutan. Semua diisi satu per satu karena tidak ada operasi massal | 2.2: kotak ketik dan "Pecah jadi langkah"; 2.4: edit massal |

---

## 3. Temuan yang Mengubah Peta

| # | Temuan | Perubahan |
|---|---|---|
| U1 | Dua tugas menunggu **tiga tugas sekaligus** ("Gabungkan riset", "Uji WhatsApp manual"). Enam dari 20 urutan **melintasi list** | "Harus setelah…" boleh lebih dari satu dan lintas proyek. Tugas baru aktif setelah **semuanya** selesai. Diterapkan ke 2.3, A4, dan deck |
| U2 | 10 dari 29 tugas utama adalah **pekerjaan bersama** (keputusan dan uji lapangan) tanpa satu penanggung jawab | Bertentangan dengan "satu penanggung jawab utama". Ditambahkan ke bagian 7 dokumen utama sebagai pertanyaan, belum diputuskan |
| U3 | 6 dari 29 tugas adalah **keputusan** ("Putuskan…", "Pilih…", "Tentukan…"). Hasilnya berupa pilihan, bukan hasil kerja. ClickUp tidak punya bentuk khusus untuk ini, jadi status "planning" dipakai | Peta belum punya bentuk untuk keputusan. Ditambahkan ke bagian 7 sebagai pertanyaan |
| U4 | Status yang membatalkan ("cancelled") ada dan bertipe `closed` | Peta hanya punya **Selesai**. Kalau "Batal" nanti diperlukan, warna dan ikonnya harus jelas berbeda dari Selesai (lihat K2) |

---

## 4. Belum Bisa Diuji

| Hal | Kenapa | Kapan / oleh siapa |
|---|---|---|
| Jumlah klik di alur A1–A7 | Butuh layar ClickUp | Tugas "Hitung ulang jumlah langkah" (9 Okt) |
| Tugas terlambat (A5) | Tenggat paling awal baru 9 Okt | Dicek setelah 9 Okt: 5 tugas jatuh tempo hari itu |
| Notifikasi saat tugas sebelumnya selesai (A4) | Butuh dua akun dan layar | Setelah rekan diundang |
| Workload / "Siapa sedang sibuk" | Workspace hanya punya 1 anggota (Keano: 9 tugas belum selesai) | Setelah rekan diundang |
| Kapan Gantt muncul | Butuh layar ClickUp | Tugas "Uji syarat munculnya Jadwal bergaris" |
