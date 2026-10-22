# Riset Project Manager — Keano

**Status:** berjalan (dimulai 2 Oktober 2026)
**Tujuan:** riset independen tentang fitur project manager. Hasilnya nanti **dibandingkan lalu digabung** dengan riset rekan (`tahapan-proyek/01-riset/core-menu-kompetitor/` dan `tahapan-proyek/01-riset/rangkuman-kompetitor/`).

Riset rekan **tidak diubah** dari folder ini. Semua temuan, termasuk yang bertentangan dengan riset rekan, dicatat di sini dan dibahas saat penggabungan.

---

## Struktur Folder

| Folder | Isi |
|---|---|
| `kompetitor/` | Satu file per kompetitor, nama `rangkuman-<nama>.md` |
| `sumber/` | Bahan mentah: PDF, screenshot, catatan eksplorasi |

## Format File Kompetitor

Mengikuti format `tahapan-proyek/01-riset/rangkuman-kompetitor/rangkuman-*.md` milik rekan agar bisa disandingkan per bagian:

1. Header: tanggal riset, **metode**, sumber, URL
2. Gambaran Umum
3. Struktur Navigasi / Fitur
4. Keunggulan dan Kelemahan (umum, awam, lansia)
5. Skor Kemudahan Penggunaan (hanya bila dieksplorasi langsung)
6. Paket Harga
7. Perbandingan / relevansi terhadap riset rekan
8. Yang perlu diverifikasi
9. Kesimpulan

Selalu tulis **metode** di header. Riset rekan memakai eksplorasi langsung (akun trial), sedangkan sebagian riset di sini memakai sumber publik (OSINT). Bobot temuannya berbeda saat digabung.

## Daftar Kompetitor

| Kompetitor | Asal | Metode | Status | File |
|---|---|---|:-:|---|
| Kanna (Aldagram Inc.) | Jepang | OSINT | ✅ | `kompetitor/rangkuman-kanna.md` |

## Sintesis

| Dokumen | Isi | Metode | File |
|---|---|---|---|
| Penyederhanaan fitur ClickUp | Peta fitur ClickUp ke versi yang mudah dipakai tanpa memangkas fitur, lengkap dengan lapisan tampil, alur sebelum/sesudah, dan urutan pengerjaan | Workspace ClickUp (MCP) + riset rekan | `penyederhanaan-fitur-clickup.md` |
| Pemetaan ulang dengan data nyata | Proyek riset ini dimasukkan ke ClickUp (39 tugas, 20 urutan), lalu dibaca lagi untuk menguji peta fitur: 10 temuan menguatkan, 4 mengubah | ClickUp MCP (data dan struktur, bukan layar) | `pemetaan-ulang-data-nyata.md` |
| Deck worktree fitur | Versi presentasi dokumen di atas: 13 slide, 65 fitur dalam 4 tahap pengerjaan beserta penjelasannya. Buka `index.html` di browser | Turunan dokumen di atas | `deck-worktree/` |
| Alur kerja per menu | 10 flowchart: struktur data, masuk pertama kali, isi menu Proyek, membuat tugas, siklus status, menu Hari Ini, Tugas, Orang, Pengaturan, aturan otomatis. Buka `workflow.html` (perlu internet untuk Mermaid) | Turunan dokumen di atas | `deck-worktree/workflow.html` |
| Wireframe aplikasi | Kerangka hitam-putih **mentah (tanpa data)**: topbar, menu samping berbentuk rail ikon (nama menu kecil di bawah ikon), **menu Home berisi dashboard**, dan **menu Projects punya sidebar kedua** berisi daftar project + list-nya (label UI berbahasa Inggris). Susunan default dashboard meniru template Simple Dashboard ClickUp (10 kartu), bisa diedit: tambah/hapus/seret kartu, ubah lebar, ganti judul dan data. Isi kartu hanya placeholder (garis abu-abu, angka `00`, grafik generik, "Project Name"/"List Name"); klik angka membuka panel daftar tugas berisi placeholder. **Menu Inbox** bekerja seperti email: isinya kejadian dari orang lain yang menyangkut user (di-assign, di-mention, dibalas, undangan kolaborasi dengan Accept/Decline, permintaan approval) plus pengingat tenggat. Tab: Needs action / Updates / Later / Done, ada Filter per jenis kejadian dan Clear all. Notifikasi AI dan perubahan yang dibuat user sendiri tidak masuk Inbox. **Menu Projects** punya tab Channel (grup chat ala Discord: daftar channel, pesan, thread, anggota), Overview (angka, ringkasan AI, Team + undangan, daftar list dengan progress, beban per status, aktivitas, file), List, Kanban (kartu bisa diseret antar status), Calendar (batang task bisa digeser, panel Unscheduled/Overdue) dan Gantt (pohon project → list → task + garis waktu). Tidak ada tab Team; anggota ada di Overview. Level list dan All Tasks hanya punya tab List/Kanban/Calendar/Gantt. Keempat tab task memakai daftar task placeholder yang sama. Klik task (dari tab mana pun, Inbox, atau task di Channel) membuka **detail task sebagai overlay**: kiri berisi Status/Dates/Assignees/Priority/Time estimate/Tags, deskripsi, dan lampiran bukti (evidence) lewat drop/browse; kanan berisi Activity dan kolom komentar. Blok Blocking/Dependencies sengaja tidak ada. Buka `wireframe-keano/index.html` | Screenshot dashboard ClickUp (susunan kartu), screenshot tampilan project ClickUp (Overview, List, Board, Calendar, Gantt), screenshot modal detail task ClickUp | `wireframe-keano/` |

## Catatan untuk Penggabungan

- Kanna **tidak ada** di 10 kompetitor riset rekan. Kanna menyasar pekerja senior yang tidak melek teknologi dan sudah tersedia dalam Bahasa Indonesia, sehingga klaim "10/10 kompetitor tidak ramah lansia" di `tahapan-proyek/01-riset/rangkuman-kompetitor/rangkuman-gabungan-usp.md` perlu ditinjau ulang. Detail: `kompetitor/rangkuman-kanna.md` bagian "Relevansi terhadap Riset Rekan".
