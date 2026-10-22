# Brief tahap 2: rencana eksekusi S0-S2

> 15 Okt 2026. Tahap ini MENYUSUN RENCANA yang bisa langsung diserahkan ke agent implementasi. BELUM ada kode yang ditulis. Baca berurutan: (1) `../KEPUTUSAN-MVP-INTI.md` (mengikat), (2) `../riset/_BRIEF.md` (konteks produk + adendum), (3) `../tinjauan/_BRIEF-GELOMBANG2.md` (aturan kerja ketat). Semua aturan di sana berlaku.

## Apa yang kamu hasilkan
Rencana kerja berisi **tugas-tugas implementasi** dalam bentuk "kontrak spesifikasi tugas" yang bisa ditempel apa adanya ke `orca orchestration worker-start --spec`. Tiap tugas:
- **ID** (mis. `S0A-03`), judul, lajur, irisan, ketergantungan (ID lain), ukuran (S/M/L + hari-orang AI).
- **Target**: berkas/komponen yang dibuat atau diubah, dengan **path persis** (cek bahwa path induknya ada; tandai bila berkas baru).
- **Change**: hasil konkret, termasuk tanda tangan fungsi, nama tabel/kolom, rute, kode error; kutip keputusan (`KEPUTUSAN-MVP-INTI §`, `X1 D#`, `X2 §2E`, `R0x §`) alih-alih menulis ulang alasan.
- **Constraints**: invarian, batas ukuran file (aturan global), apa yang TIDAK boleh disentuh (berkas bersama milik pemilik lain).
- **Ownership**: berkas yang boleh diedit tugas ini; berkas bersama yang diedit hanya oleh pemilik tunggal harus dinyatakan.
- **Observable acceptance**: test yang harus ada dan lulus (nama berkas test + kasus utama), `bun run typecheck` nol error, smoke bila menyentuh server/, dokumen yang diperbarui (CHANGELOG `[Unreleased]`, README kontrak).
- **Commit**: pesan commit sesuai aturan global (`<type>(<scope>): <english imperative>`), satu tugas = satu commit/concern.
Urutkan tugas, tandai mana yang bisa PARALEL dan titik sinkron. Cantumkan juga daftar "bukti yang belum diverifikasi" bila rencana bergantung pada klaim runtime.

## Aturan tambahan tahap 2
- Rujuk laporan, jangan menyalin. Kutip hanya potongan kecil yang dibutuhkan agent implementasi (tanda tangan, SQL kunci).
- Tulis kerangka file dulu, simpan per bagian. Maks sekitar 400 baris; lebih baik tabel padat daripada narasi.
- Bila menemukan kontradiksi baru antar laporan, JANGAN memutuskan diam-diam: tulis di bagian "Kontradiksi baru" dan pakai default paling konservatif yang tidak menutup pilihan.
- Hormati: fondasi kode menang atas desain; konvensi skema R02/X1 D6-D7; role/area di `../../03-desain/erd/diskusi/00-role-dan-area.md`.
