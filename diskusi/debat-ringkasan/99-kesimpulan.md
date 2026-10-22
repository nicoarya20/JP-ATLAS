# Kesimpulan Debat: Perombakan Menu Ringkasan

> Debat 3 ronde, PRO (mendukung perombakan) vs KONTRA (mempertahankan 14 card dan menyerang argumen PRO). Dijalankan lewat Orca orchestration (run_5d9477569565) pada 5 Oktober 2026. File giliran: `pro-1..3.md`, `kontra-1..3.md`. Aturan debat: `00-brief.md`.

## 1. Hasil singkat
**Mosi "4 zona + KPI strip PM" gugur.** PRO sendiri melepas bentuk utuhnya di Ronde 3. Yang bertahan adalah **prinsip** perombakan, dan kedua pihak akhirnya **sepakat menguji dua prototipe ke lansia** daripada memutuskan lewat debat. Kedua desain sudah bertemu di tengah: versi ringan PRO sekarang mirip "14 card ramping", sedangkan versi perbaikan KONTRA sudah punya "Kerjakan ini dulu".

## 2. Jalannya debat
| Ronde | PRO | KONTRA |
|---|---|---|
| 1 | Duplikasi terbukti (10/14 card dari Task), Bu Sri bingung, Zona B tanpa AI, angka tidak konsisten, KPI disembunyikan dari member | A1 dirancang untuk tim engineer 5–50 orang, bukan lansia. Zona B tetap model "tarik". Angka tidak konsisten = salah definisi, bukan salah layout. KPI strip sudah ditandai ❌. Cukup perbaikan kecil (effort S) |
| 2 | Mengakui banyak hal, revisi jadi rombak **bertahap**: Tahap 1 = layar "Hari ini" (1–3 task, tombol besar). Zona C, KPI, dan Briefing ditunda | "Mosi sudah kosong". Serangan terkuat: Tahap 1 **membuang sinyal unik** (task mandek tanpa tenggat, mention). Alternatif tajam: 5 perbaikan atas 14 card |
| 3 | Menambal sinyal yang hilang dengan baris pengingat. Usulan final: perbaikan bersama → prototipe A vs B → uji 5–8 lansia | Menerima uji dan menerima hasilnya **dengan 5 syarat**. Menemukan kontradiksi baru dan celah "kriteria lulus belum ada" |

## 3. Yang disepakati kedua pihak
1. **Duplikasi itu nyata**: R8 dan R10 ⊂ R7, Snapshot ≈ gabungan angka lain.
2. **Perbaikan langsung (Langkah 0)**, tanpa menunggu uji:
   - Ganti nama ke bahasa polos: Ghost reminder → "Lama tidak disentuh", Snapshot → "Minggu ini", Menunggu QC → "Menunggu diperiksa"; tulis "Sudah lewat 1 hari", bukan "1h".
   - Satu definisi "aktif" (termasuk menunggu QC), satu ambang mandek, satu jendela waktu.
   - Angka "Ditutup 14 hari" diberi pembanding minggu lalu.
3. **Tanpa AI, Zona C, KPI strip, dan peran PM** di layar utama versi awal. Briefing AI bukan fitur inti.
4. **Sinyal unik wajib tetap ada**: task mandek dan mention ("ada yang menunggu balasan Anda").
5. **Beban bukti ada pada perubahan.** Kalau hasil uji seri atau ambigu, versi A yang dipakai.
6. Pesan harian WhatsApp **tidak** menuntut perombakan layar (cukup kueri).

## 4. Yang belum selesai (perlu keputusan)
1. **Kriteria lulus uji** belum ditulis. Ini celah terbesar menurut KONTRA, dan harus disepakati *sebelum* uji.
2. **Kontradiksi peran:** PRO ingin angka tim tidak tampil di layar anggota, tapi juga melepas peran PM. Tanpa peran, sistem tidak tahu siapa yang boleh melihat angka itu.
3. **Urutan uji:** KONTRA mengutip `gabungan-core…` §9 no. 5 ("putuskan kanal utama sebelum desain layar"), jadi uji WhatsApp manual dijalankan dulu. PRO menaruhnya di Langkah 3. Kalau lansia jarang membuka aplikasi, perombakan layar turun prioritas.
4. Dengan teks besar, apakah 14 card yang sudah diurutkan ulang masih terlalu panjang digulir? Hanya bisa dijawab lewat uji.

## 5. Rencana yang muncul dari debat
| Langkah | Isi |
|---|---|
| 0 | Jalankan perbaikan yang disepakati (§3 no. 2) |
| 1 | Uji kabar harian lewat WhatsApp manual selama seminggu (syarat KONTRA no. 1) |
| 2 | Tulis kriteria lulus dan aturan keputusan |
| 3 | Buat prototipe kertas/klik: **A** = 14 card + 5 perbaikan; **B** = layar "Hari ini" + baris pengingat + Proyek saya. Label, ukuran teks, dan data sama, isinya tugas sehari-hari lansia |
| 4 | Uji 5–8 lansia + pendamping, A/B diselang-seling. Tugas: kerjakan dulu, tandai selesai, siapa menunggu balasan, tugas lama tak disentuh, kapan tenggat X, rapat apa besok |
| 5 | Pilih A atau B. Zona C/KPI hanya dibangun kalau benar-benar diminta |

## 6. Penilaian moderator
- **KONTRA menang secara argumen** atas *mosi* (4 zona + KPI strip). Serangannya berbasis bukti dari bahan kita sendiri: A1 berasumsi pengguna engineer, KPI sudah ditandai ❌, AI turun prioritas di riset segmen, dan Tahap 1 kehilangan sinyal.
- **PRO menang atas *diagnosis***: KONTRA mengakui duplikasi, nama berbau engineer, dan bahwa tidak ada card yang menjawab "kerjakan apa dulu".
- Hasil paling berguna dari debat ini adalah **Langkah 0** (bisa dikerjakan sekarang, disetujui dua pihak) dan **syarat uji** yang membuat keputusan A vs B adil.
- Catatan: board Penpot "Perbandingan Menu Ringkasan" masih menggambarkan mosi lama (4 zona + KPI strip) dan perlu diperbarui supaya sesuai hasil ini.
