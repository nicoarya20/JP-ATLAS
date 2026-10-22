# Gaya diagram (acuan menggambar di Penpot, halaman `diagram flow`)

> Berlaku untuk semua diagram D01-D15 dan kartu aturan R1-R58 (lihat `04-pencocokan.md`). Tujuan: terbaca dari kursi paling belakang oleh orang yang belum paham proyek.

## Tata letak
- Satu **board induk** bernama `DIAGRAM FLOW v1` di halaman `diagram flow`; semua gambar ada di dalamnya (supaya bisa dihapus sekaligus bila tidak cocok). Halaman lain tidak boleh disentuh.
- Satu **board per diagram**, ukuran **1920 × 1080**, jarak antar board 240 px, disusun mendatar. Nama board: `D01 · Peta besar`, `D07 · Dari klik Masuk sampai mendarat`, dst. Ada board `LEGENDA` dan board `Kartu aturan · tahap N`.
- Tiap diagram: **judul** (48 px, tebal, kiri atas), **pertanyaan yang dijawab** (28 px, satu kalimat, di bawah judul), **legenda mini** (kanan atas), **jalur bawah "Yang dilakukan sistem sendiri"** (pita di bagian bawah), dan **catatan kaki sumber** (16 px, abu-abu: daftar U-ID dan kartu R yang dicakup, agar bisa ditelusuri).
- Maksimal sekitar 12 kotak per diagram. Alur membaca kiri ke kanan, atas ke bawah. Panah tidak boleh bersilangan bila bisa dihindari.

## Tiga penanda jujur (satu-satunya arti warna isi kotak)
| Status | Isi | Garis | Teks | Tambahan |
|---|---|---|---|---|
| **Berjalan** | `#E6F4EA` | `#1E7B3A`, 3 px, tegas | `#14291B` | — |
| **Sedang dibangun** (S1/S2) | `#FFF4D6` | `#B26A00`, 3 px, tegas | `#3A2600` | lencana bulat kecil `S1` atau `S2` di sudut kanan atas |
| **Ditunda / tidak direncanakan** | `#F3F4F6` | `#9AA0A6`, 3 px, **putus-putus** | `#4B5563` | tulisan kecil "belum ada · S3" (irisan tujuan) di dalam kotak |
Warna tidak boleh menjadi satu-satunya pembeda: **garis putus-putus** dan **teks** juga menandai yang ditunda; **lencana S1/S2** menandai yang sedang dibangun.

## Elemen lain
- **Kotak langkah:** persegi panjang membulat (radius 16), lebar 300-380, tinggi 110-150. Baris 1 = judul langkah (28 px, tebal, kalimat sehari-hari); baris 2 = keterangan satu baris (22 px).
- **Keputusan:** belah ketupat, pertanyaan ya/tidak di dalamnya (24 px), cabang diberi label "ya"/"tidak".
- **Panah:** garis 3 px `#374151` dengan kepala panah; label pada panah 22 px bila perlu ("Admin menyetujui").
- **Jalur "Yang dilakukan sistem sendiri":** pita `#E8F0FE`, garis `#1A56DB`, judul pita 24 px; di dalamnya kotak kecil yang sama gayanya tetapi bertanda ikon roda gigi (lingkaran + huruf "S"). Isinya hal yang terjadi tanpa ada yang menekan tombol (menolak, menghitung, menurunkan peran, membersihkan).
- **Tanda aturan:** lingkaran kecil bernomor `R12` (diameter 44, isi `#111827`, teks putih 20 px) di sudut kotak yang terkena aturan; isi aturan ada di kartu bernomor sama.
- **Kartu aturan:** persegi panjang membulat 560 × 160, judul `R12` + satu kalimat awam (24 px), status (berlaku sekarang / disiapkan tapi belum terlihat / ditunda), sumber (ID kecil 16 px).
- **Chip peran:** lonjong kecil di dekat kotak yang khusus peran: Member `#0F766E`, Project Manager `#6D28D9`, Admin `#C2410C`, Super-admin `#B91C1C`, Pemantau `#475569` (teks putih 20 px).
- **Tokoh** (nama pada keterangan, bukan ilustrasi): Nico = Project Manager, Dodi = Member, Sri = Pemantau (peran di proyek, akun Member), Ayu = Admin, Super-admin = "Pemilik sistem".
- Contoh data: hanya satu dunia: **proyek Atlas dan Portal Klien PT Sinar**.

## Bahasa
Kalimat sehari-hari, tanpa jargon (jangan: `soft delete`, `keyset`, `IDOR`, `scope`, `guard`, `pending`, `approved`). Pakai istilah glosarium proyek: Proyek, Tugas, Tenggat, "yang mengerjakan", Pengelola utama, Belum dikerjakan, Sedang dikerjakan, Selesai, Dibatalkan, Menunggu persetujuan, Ditolak, Diblokir. Tombol ditulis seperti di layar: "Masuk dengan Google", "Cek lagi", "Mulai kerjakan", "Tandai selesai". Dilarang: assignee, deadline, backlog, ticket, error, OK/Ya/Tidak sebagai label tombol.

## Ukuran huruf minimum (terbaca dari belakang ruangan)
Judul diagram 48; judul langkah 28; keterangan 22; label panah 22; catatan kaki 16 (satu-satunya yang boleh kecil). Tidak ada teks di bawah 16.

## Pemeriksaan mutlak sebelum satu diagram dianggap selesai
1. Tidak ada teks yang keluar dari kotaknya atau dari board.
2. Tidak ada dua kotak yang saling menimpa.
3. Setiap panah memiliki ujung di kotak (bukan melayang).
4. Setiap kotak punya salah satu dari tiga penanda status.
5. Setiap U-ID yang dijanjikan di `04-pencocokan.md` bagian 4 muncul (sebagai kotak, kotak pudar, atau jalur sistem) atau dicatat mengapa tidak.
6. Ekspor gambar diperiksa dengan mata (sampel) dan dengan skrip pemeriksa batas.
