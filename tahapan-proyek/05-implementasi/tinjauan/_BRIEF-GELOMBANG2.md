# Brief gelombang 2: tinjauan silang (tahap 1)

> Tanggal: 15 Oktober 2026. Agent tahap 1 membaca 14 laporan riset (`../riset/R01..R14`) dan menghasilkan keputusan. Baca dulu `../riset/_BRIEF.md` (konteks produk, keputusan final, aturan). Adendum di sana tetap berlaku.

## Keputusan user terbaru (15 Okt 2026) — mengikat
**Lingkup MVP = pilihan B "Inti": irisan S0 (S0.0 prasyarat ops, S0.a akun dan akses, S0.b kontrak beku), S1 (Proyek + profil), S2 (Tugas inti).** Menurut R10 §5 itu ±71-101 hari-orang AI. S3 (Inbox, Beranda) dan seterusnya DITUNDA; irisan itu boleh disebut hanya untuk memastikan kontrak S0-S2 tidak menutup jalan ke sana. Fokusmu: semua yang dibutuhkan agar S0-S2 bisa dikerjakan tanpa tebak-tebakan.

## Fakta yang sudah pasti (jangan diteliti ulang)
- 13 dari 14 laporan lengkap. **R01 hanya bagian 2 (temuan Better Auth 1.7.3 dan kode fondasi)**; bagian 3-7 masih TODO. Bagian yang hilang itu sebagian besar terjawab oleh R02, R03, R12, R14.
- Fondasi kode menang atas desain bila bentrok. Konvensi skema (R02): id `text`, nama tabel tunggal, `timestamptz`, enum text+CHECK, FK pelaku nullable + SET NULL, soft delete.
- Tiga celah keamanan fondasi (R12) masuk S0.a: sign-up email terbuka di server, `emailVerified` tidak dicek untuk super-admin, `/api/auth/admin/*` melewati matriks izin.
- `bun audit` (R06/R08): 7 temuan, 1 critical (`proxy-addr`), 2 high (MCP SDK, `source-map-js`).

## Aturan kerja (ketat, karena kuota token rapuh)
1. File keluaran ada di folder `tahapan-proyek/05-implementasi/tinjauan/`. Tulis kerangka SEGERA, lalu simpan tiap bagian begitu selesai; jangan menumpuk di akhir.
2. HEMAT TOKEN: laporan R-nn besar (40-60 KB). Baca lewat `grep -n '^## '` lalu `sed -n 'a,bp'` pada bagian yang relevan. Jangan `cat` utuh. Maks 5 pembacaan sebelum menyimpan.
3. Setiap klaim tentang isi laporan menyebut `R-nn §bagian`; tentang kode menyebut path:baris yang benar-benar dibaca. Tandai ASUMSI.
4. READ-ONLY terhadap kode dan dokumen lain. Dilarang git add/commit/push/stash, bun install, menjalankan server/test/migrasi, Penpot/Playwright, membuat agent turunan. Hanya menulis file keluaranmu.
5. Bila melihat `API Error` / kuota habis: simpan yang sudah ada lalu berhenti, jangan diulang-ulang.
6. Bahasa Indonesia. Format laporan: 1 Ringkasan (maks 10 baris) · 2 isi utama (tabel keputusan/temuan) · 3 Risiko dan mitigasi (tabel, minimal 5 baris) · 4 Pertanyaan untuk user (hanya yang benar-benar butuh jawaban manusia, dengan jawaban yang kamu sarankan) · 5 Sumber. Maks sekitar 300 baris.
7. Selesai: kirim worker_done --outcome succeeded dengan --report-path (path lengkap absolut) dan --files-modified hanya file keluaranmu.
