# Prototype Project Manager (klik-klik)

Prototype HTML statis untuk role **Project Manager**, dari Login sampai semua menu. Tidak butuh build atau server: buka `index.html` di browser.

Sumber desainnya halaman **WIREFRAME NICO**, grup `B · Project Manager`, di file Penpot **PM-New**. Nama dan angka (Nico, Rina, Dodi, Atlas) adalah data contoh, dan "hari ini" dikunci ke Kamis, 8 Oktober 2026 seperti di wireframe.

## Cara pakai
- Mulai dari **Login** → "Masuk dengan Google" → pilih akun **Nico** → Beranda. Akun **Nico (kantor)** mensimulasikan akun baru yang menunggu persetujuan admin.
- Menu kiri: Beranda, Inbox, Proyek, Tugas, Events, Tim, Sampah, Pengaturan. Di ponsel menu pindah ke bawah.
- Bar hitam di atas punya **Lompat ke layar** (semua layar wireframe PM, termasuk modal dan keadaan kosong) dan **Ulang dari Login** (mengembalikan semua data contoh).
- Perubahan hanya hidup di memori halaman. Muat ulang browser mengembalikan data awal.

## Yang bisa dicoba
- **Proyek**: cari, filter, List/Grid, buat lewat form, ceritakan ke AI, atau template; detail dengan tab Ringkasan, Tugas, Tahapan, Anggota; perpanjang tenggat; keluarkan anggota; hapus proyek ke Sampah (bisa diurungkan); pengaturan proyek.
- **Tugas**: Tugas saya, Semua tugas, Papan; mulai, minta diperiksa (wajib bukti), setujui, kembalikan, batalkan; Tulis saja ✦, form, impor CSV.
- **Events**: daftar, filter, kalender bulan, buat dan ubah, batalkan atau hapus (termasuk event berulang), catat rapat lewat suara (Langkah 1–3 sampai tugas dibuat).
- **Inbox**, **Tim**, **Sampah** (pulihkan), **Pengaturan** (profil, ukuran teks, cuti, keluar).

## Asumsi yang perlu dicocokkan dengan wireframe
Isi teks lengkap hanya terbaca dari layar Login, Pilih akun, Menunggu persetujuan, Beranda, dan Daftar proyek. Layar lain dibangun dari nama layar plus label tombol dan tab di Penpot, jadi isi barisnya mengikuti data contoh dan bisa berbeda dari wireframe. Keputusan yang saya ambil sendiri:
- Kartu "Disarankan" di Proyek baru dipasang di cara AI (tengah).
- PM yang bukan pengelola (Lead) proyek melihat tombol ubah dinonaktifkan; hapus proyek hanya untuk Lead (aturan di `CLAUDE.md` proyek).
- "Periksa hasil" di Events membuka Langkah 3 rekaman; "Pengaturan proyek" dibuka dari menu ⋯ di detail proyek.

## Struktur
`pm.data.js` (data dan state), `pm.core.js` (router, shell, modal, toast), satu `pm.<modul>.js` per menu, `pm.boot.js` (event global), `pm.css`. Tes otomatisnya ada di `tests/prototype-pm.test.ts` (`bun test tests/prototype-pm.test.ts`).
