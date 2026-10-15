# R3 — Verifikasi Ulang atas Revisi Deliverables (pasca-R2 & Addendum F)

Tanggal: 5 Oktober 2026 · Run `run_16f58567a2c7` · Task `task_b8c19765b4cc`
Peran: reviewer verifikasi ulang (read-only). Tidak ada deliverable yang diedit.
Dasar: `orchestration/DECISIONS.md` (termasuk Addendum F1–F20), `reviews/R2-review-deliverables.md` (§5 temuan, §6 syarat SIAP, Lampiran metode).
Target: `deliverables/workflow.md` + `workflow.html`, `deliverables/wireframes/01-beranda-proyek.html`, `deliverables/wireframes/02-pekerjaan-rapat-tim.html`.

Konvensi bukti: `md:L123` = baris di `workflow.md`. `01 S8` / `02 P12` = id layar (`section.screen`) di wireframe. Kutipan diambil apa adanya dari teks yang dirender.

---

## Ringkasan eksekutif

- **12/12 Major (M1–M12) TERTUTUP.** Setiap Major punya bukti di ketiga file yang relevan, dan workflow kini menjadi acuan tunggal sesuai Addendum F.
- **Minor R2: 19/20 TERTUTUP, 1 SEBAGIAN.** m14 baru diperbaiki di wireframe; workflow belum menyebut beban tim P0.
- **Addendum F:** 15 dari 20 keputusan konsisten di ketiga file. 5 lainnya (F3, F9, F13, F16, F18) konsisten pada inti keputusannya, tetapi masih punya sisa kecil (lihat §2).
- **Validitas teknis lolos semua:** 0 tag tak seimbang (mode longgar dan ketat), 0 id ganda, 36/36 anchor `.wf-index` valid (termasuk P17–P19 dan tautan silang 01↔02), Mermaid 21/21 lolos parse dengan `mermaid@11.17.2`, `workflow.html` setara dengan `.md`, dan tidak ada istilah terlarang yang dipakai sebagai label UI.
- **Regresi baru: 6 Minor, 0 Major** (R3-1…R3-6), ditambah 5 nit. Semuanya berupa ketidakselarasan data contoh, izin, atau label, bukan cacat struktural.
- **Verdict: SIAP DENGAN PERBAIKAN MINOR.** Syarat formal R2 §6 untuk SIAP terpenuhi. Tetap disarankan menutup **7 Minor terbuka** (m14 + R3-1…R3-6, ±2–3 jam) sebelum handoff, karena R3-2 dan R3-5 bisa membuat dua engineer mengimplementasikan izin dan konfirmasi rapat secara berbeda.

| Kelompok | Total | Tertutup | Sebagian | Terbuka |
|---|---|---|---|---|
| Major R2 (M1–M12) | 12 | 12 | 0 | 0 |
| Minor R2 (m1–m20) | 20 | 19 | 1 (m14) | 0 |
| Regresi baru R3 | 6 Minor + 5 nit | — | — | 6 Minor + 5 nit |
| **Masih terbuka** | | | | **Major 0 · Minor 7** (+5 nit) |

---

## 1. Status per temuan R2

### 1.1 Major (M1–M12)

| ID | Status | Bukti (file · layar/alur · kutipan) |
|---|---|---|
| **M1** | **TERTUTUP** | `md:L270–271` Diagram 1 W-1: `s_triage/s_open --> s_done: T13 Promote ide - khusus kind idea, PM atau Admin manusia`. `md:L336` baris tabel **T13** `triage \| open → done` (khusus `kind = idea`), aktor "PM proyek tujuan atau Admin, manusia", efek `promoted_to_ids` / `project_id` + `completed_at`. `md:L309` Langkah 1: "…atau dibuat dari Hasil Rapat dengan proyek + PIC (prioritas default Sedang…)". `md:L630` W-3 step 15: "Prioritas default Sedang bila tidak disebut… sehingga item Terbuka selalu punya prioritas (F1)". W-6 step 8–9 (`md:L955–956`) memakai T13. `02 P12`: field "Prioritas: Sedang (default) ▾ [→ Terbuka]". `02 P5` catatan: "menutup ide → Selesai lewat transisi T13 khusus Ide (F1)". `01 S4` catatan: "(prioritas default Sedang [F1])". |
| **M2** | **TERTUTUP** | `md:L94`: "**Tolak saran** = membuang saran AI… **Tolak tiket** = keputusan triage → Dibatalkan". `md:L453–454` W-2 step 7–8: "Terima · Tolak tiket… · ⋯ (Gabung duplikat · Minta info · Teruskan ke PM…)". Diagram W-2: cabang "Minta info → …label Menunggu pelapor" dan "Teruskan ke PM". `02 P4`: sel Saran AI "✓ Terima saran · Ubah · Tolak saran", kolom Aksi "Terima · Tolak tiket… · ⋯", menu ⋯ "Gabung duplikat… · Minta info ke pelapor… [⏳ Menunggu pelapor] · Teruskan ke PM…". `01 S4`: "Tolak saran [F2]" dan "Tolak tiket… [F2]". "Tutup tiket" tidak muncul sebagai label di wireframe (0×). Sisa label "Tandai duplikat" → R3-6. |
| **M3** | **TERTUTUP** | (a) `01 S11` catatan: "Guest: default Viewer, maksimal Member [F3]"; `01 Asumsi` sama; `md:L1413` "role proyek Guest default Viewer, maksimal Member". (b) `md:L1438` Komentar: Viewer "✅ (Diputuskan: F3, A-28)"; `md:L1557` A-28 "Viewer boleh membaca dan berkomentar". (c) `md:L326` T3 "PM; pelapor untuk itemnya sendiri (F3)"; `02 P4` catatan: "Tolak tiket… hanya bisa dilakukan PM proyek, atau pelapor untuk item laporannya sendiri (F3, Matriks B)". (d) `02 P6` menu ⋯: "Hapus → Sampah (konfirmasi; PM atau pembuat item · F3)"; `md:L1436`. (e) `02 P5`: "PM proyek tujuan, atau Admin (lintas proyek) · F3". Baris baru "Komentar Guest vs Viewer — cakupan item (perbedaan disengaja, F3)" ada di `md:L1439`. Sisa konflik izin baru → R3-2. |
| **M4** | **TERTUTUP** | `md:L244` (W-0 edge case) dan `md:L1534` (A-05): "**Beranda · Pekerjaan · ＋ · Rapat · Inbox**… 'Lainnya' lewat menu avatar". `01 S1`: frame mobile "⌂ Beranda ☑ Pekerjaan ＋ ◷ Rapat ✉ Inbox 5" + "Menu avatar (Lainnya) [F4]". `02 P16`: bottom bar "Beranda Pekerjaan ＋ Rapat Inbox·5" (3 frame); label "Fokus" tidak lagi ada di bottom bar. |
| **M5** | **TERTUTUP** | (a) `02 P1/P2` tombol "⤓ Export CSV" tanpa chip P1, catatan "Export CSV = P0 (KEEP, effort S, F5)"; `md:L1441` "Export CSV (P0a, KEEP, F5)"; Roadmap W-1 P0a memuat Export CSV. (b) `01 S4` "Kanal intake: [Laporkan tiket (in-app)] [＋ Buat cepat] [Form portal P1] [Email P1]"; `02 P4` "Form intake ↗ [P1]", baris kanal "Email [P1]" dan "Form portal [P1]"; `md:L404` "Portal/form publik dan email ke tiket = P1". (c) `02 P12` "⇄ Gabung dengan item yang ada (cari manual) · P0b", sedangkan "✦ saran mirip PAY-142 · P1"; `md:L625`. (d) `02 P15` "AI-5 · L1 Suggest (draf baca-edit) … konfirmasi formal di AI-6 · F5"; `md:L1357` "AI-5 · L1". |
| **M6** | **TERTUTUP** | `md:L198` (W-0 PM step 1), `md:L1056` (W-7 step 8), `md:L1554` (A-25), Roadmap W-7: P0a "Item menunggu Triage" → P0b "Proyek Berisiko/Keluar jalur" → P1 "Kapasitas tim %". `01 S3`: kartu ke-4 "Item menunggu Triage [P0a][F6]" + "Kartu ke-4 setelah P0b: Proyek Berisiko / Keluar jalur [P0b] … Kapasitas tim % [P1]"; `01 Asumsi`: "KPI ke-4 … (keputusan final, bukan asumsi lagi) [F6]". |
| **M7** | **TERTUTUP** | `md:L865–869` W-5 step 7–11: tombol "Ubah deadline", judul "Ubah deadline · {proyek}", "alasan wajib minimal 20 karakter", "Geser fase terakhir & milestone-nya ke deadline baru (default ON)… Geser proporsional = P1", "Simpan perubahan"; Diagram 2 (`md:L821–830`) sama. `01 S10`: "☑ Geser fase terakhir & milestone-nya ke deadline baru [default ON][F7]" · "☐ … proporsional [P1]" · "104 karakter · minimal 20" · tombol "Simpan perubahan". Header S8, S9, S11, S12, S13 memakai "(btn: Ubah deadline)". `02 P3 #4` memakai dialog dan opsi yang sama. "Perpanjang deadline/tenggat" 0× di ketiga file. |
| **M8** | **TERTUTUP** | `01 S12 #4` "Kontribusi tim · agregat [F8]: 23 selesai · 19 review · 1 bantu buka blokir oleh 5 anggota" + "P0 hanya menampilkan agregat tim: tanpa nama, tanpa angka per orang, tanpa peringkat" + rincian per orang berlabel **P1** "Hanya terlihat oleh yang bersangkutan + PM/Lead (D10)". `md:L1252` "tidak ada metrik individu di retro". |
| **M9** | **TERTUTUP** (definisi) | `md:L877`: "Penyebut 'pekerjaan aktif' (F9) = … status ∉ {Selesai, Dibatalkan} dan tidak termasuk Triage… Penyebut bukan total item proyek". `01 S13`: "5 dari 27 pekerjaan aktif = 19% [F9] → Tidak" + "Penyebut … = Terbuka 14 + Dikerjakan 9 + Siap QC 4 = 27 (sama dengan Insights S8). Bukan total 52 item." `01 S8`: "⚠ 5 item Telat (19% dari 27 aktif)" dan chip "Aktif 27 = Terbuka 14 · Dikerjakan 9 · Siap QC 4". `01 S11` total "27 aktif · 5 Telat". Contoh angka di workflow tidak sama dengan wireframe → regresi **R3-1**. |
| **M10** | **TERTUTUP** | `02 P7` frame C "Laporkan tiket": "Judul * · Deskripsi * · Proyek (opsional) · ＋ Lampiran" → "status Triage · sumber Tiket (intake) … Tidak ada field Prioritas/Assignee/Tenggat". `02 P4` catatan: "＋ Tiket membuka composer mode Laporkan tiket (P7 frame C, F10)". `01 S1 #3` chip "Laporkan tiket [F10]". Layar baru **`02 P17` Tampilan Guest**: view "Dilaporkan oleh saya", detail item + "Minta buka ulang…", notulensi terkonfirmasi, sidebar terbatas. `md:L214–221` perjalanan Guest menautkan ke P17. |
| **M11** | **TERTUTUP** | **`02 P18` Sampah** ("disimpan 30 hari", Pulihkan, filter Proyek/Dihapus oleh/Jenis, "Tampilan Member … Hanya item yang ia hapus"). **`02 P19`** frame A "Pengaturan › Notifikasi" (tabel jenis × In-app/Push PWA/Email instan) + frame B "Pengaturan › Peran & izin [Read-only]". **`02 P4` frame B** sub-tab Berjalan (kolom Proyek · Prioritas · Assignee · Status · Umur · Tenggat). **`01 S12 #7`** "Catatan retro [P0][F11]: Berjalan baik · Meleset & kenapa · Yang kita ubah", terpisah dari blok Retro AI P1. |
| **M12** | **TERTUTUP** | `02 P1` chip "Aktif 11" + catatan "(F12; di sini 6 + 3 + 2 = 11). Label 'Terbuka' hanya dipakai untuk status open". `02 P2` "Aktif 12 = Terbuka 6 + Dikerjakan 4 + Siap QC 2 (F12)" (sesuai jumlah kolom Board). `md:L80` glosarium "Agregat status (turunan, F12) · **Aktif** = Terbuka + Dikerjakan + Siap QC". `01 S3` "Aktif (proyek saya) [F12]". `02 P5` "Terbuka 17" dipertahankan dengan alasan eksplisit (ide tidak memakai Dikerjakan/Siap QC). "Terbuka 11/18" 0×. |

### 1.2 Minor (m1–m20)

| ID | Status | Bukti |
|---|---|---|
| m1 | **TERTUTUP** | Intro `01`: "Persona tunggal [F13]: Rina Wijaya (Member), Sari Wulandari (PM, Lead Atlas), Andi Nugroho (Admin workspace). Proyek Atlas … dan Payment Gateway v2 … berada di workspace yang sama". Intro `02` sama ("workspace … Nusantara Digital"). "Saputra" 0×, "Sari Lestari" 0×. Sisa: data kerja persona belum selaras → R3-4. |
| m2 | **TERTUTUP** | `01 S2`: `ul.brief-d` berisi tepat 5 `<li>`; 3 poin mingguan ada di `ul.brief-w` yang ber-atribut `hidden` dan muncul lewat toggle JS. Ada juga frame kecil "mode Mingguan [R2 m2]". Catatan: "Mode Harian = 5 poin (batas 3–5)". |
| m3 | **TERTUTUP** | `md:L86–87` glosarium: "Status milestone (F14) · Menunggu · Tercapai · Meleset" dan "Kartu retro (F14) · Selesai · Meleset · Masih terblokir · Item baru · Perpanjangan". Diagram 1 W-5 memakai `state "Menunggu"`. "Pending/Slipped/Shipped" 0× sebagai label (lihat §3). |
| m4 | **TERTUTUP** | `md:L1535` A-06 dan `md:L1560` A-31: "batch import = 7 hari (dipicu manusia), aksi AI L3 = 24 jam". `02 P8 #5`: "Jendela undo 7 hari (F15)", tombol "Undo batch IMP-1005 (s/d 12 Okt)". `02 Asumsi` sama. |
| m5 | **TERTUTUP** | `02 P1/P2/P4`: "Rab, 7 Okt · Segera", "Telat 3 hr". `02 P4` umur "⚠ 6 hr". `02 P9` "👥 eksternal · rekaman off" + legenda kalender. `01 S5` timeline "label di ujung bar = health (✓ / ⚠ / ✕)". `01 S9` "◆✓ Tercapai · ◆✕ Meleset · ◆ Menunggu". Ambang "Segera ≤ 2 hari kerja" di `01 S2`, legenda `02`, dan `md:L1037`. Pemindaian kelas warna (`due-warn`, `due-bad`, `ev k`, `tb`, `ms`): semua berteks/ikon. |
| m6 | **TERTUTUP** | `01 <style>`: `.tw{overflow-x:auto;max-width:100%}` dan `.tw>table{min-width:640px}`. Parser: 6/6 tabel di 01 dibungkus `.tw`, termasuk tabel Milestone S9. `01 Asumsi` diperbarui. |
| m7 | **TERTUTUP** | `01 nav.wf-index[aria-label="Navigasi layar"]` berakhir dengan "02 →". `02 nav.wf-index` diawali "← 01". Kedua tautan valid (§3). |
| m8 | **TERTUTUP** | `md:L1280` (W-10 Aktor) dan W-10 step 2: "header Detail Proyek ⋯ › Pengaturan proyek › AI, F17". Matriks B `md:L1455`. `02 P15 #7` + catatan "Lokasi override AI per proyek (F17)… drawer". |
| m9 | **TERTUTUP** | Diagram 2 W-8: "else Ubah → API->>AS: status edited + nilai koreksi". `md:L1183`: "pending → accepted · edited · rejected · expired… Metrik akurasi AI menghitung edited terpisah dari rejected". `md:L88` glosarium. |
| m10 | **TERTUTUP** | `02 P2` chip "✦ Tinggi · conf. Sedang ↗" + catatan "saat diklik membuka panel saran di Detail item (P6)… Jika AI mati, chip tidak ditampilkan". `02 P16`: Briefing "Terima · Ubah · Tolak" (sama dengan S2); kartu saran triage "Terima saran · Ubah · Tolak saran" + "AI mati → kartu menjadi 'Tiket menunggu triage · PRT-311'". |
| m11 | **TERTUTUP** | `02 P12`: setiap item, termasuk Informasi, punya "Terima · Ubah · Ubah kategori ▾ · Tolak". Tombol "Konfirmasi & buat 3 item"; ringkasan "…· 1 belum ditinjau (confidence Rendah, tidak ikut dibuat)". Keputusan milestone memakai "Buka Rencana untuk menggeser milestone". Sisa ketidakselarasan label/semantik dengan W-3 → R3-5. |
| m12 | **TERTUTUP** | `02 P4` filter "Prioritas ▾ Assignee ▾" (Triage) dan "Status · Prioritas · Assignee" (Berjalan). `02 P5` "Status ▾ Prioritas ▾ Assignee ▾". `md:L400` dan `md:L1537` A-08: "kecuali `kind = idea`… (F19)". `02 P4`/`P5` menyatakan hal yang sama. |
| m13 | **TERTUTUP** | `01 S9` "9b · Mini-frame: drawer detail fase & edit/hapus milestone [R2 m13]" (Edit · Mulai fase · Selesaikan fase · Hapus fase… → "pindah ke 'Tanpa fase'"). `02 P1` "Pilih semua (11) · memilih semua item hasil filter". `02 P9` frame C modal "Buat event" (peserta + email tamu → 👥 eksternal, Proyek, Kerahasiaan Normal/Rahasia, Notulis). |
| m14 | **SEBAGIAN** | Wireframe sudah: `01 S11` "Item aktif · Telat per orang [P0 · deterministik][R2 m14]" dengan sortir Beban/Telat/Nama dan tampilan agregat untuk Member; `02 P13` "Beban tim · Item aktif · Telat per orang [P0]". **Workflow belum:** frasa "Telat per orang"/"beban tim" 0× di `workflow.md`. Roadmap (`md:L1459–1475`) tidak memiliki baris Tim & Kapasitas, sementara perbaikan R2 meminta "Catat di roadmap W-0/Tim". **Perbaikan:** tambahkan ke Roadmap W-0 P0a: "Tim & Kapasitas: Item aktif · Telat per orang (deterministik, visibilitas D10); kapasitas tertimbang = P1", dan tambahkan rujukan S11/P13 di Peta alur → layar. |
| m15 | **TERTUTUP** | `md:L514` node b2: "Audio tidak direkam… Foto whiteboard, Tempel, Ketik tetap boleh - F20". `md:L611`, `md:L667`. `02 P10` varian eksternal: "📷 Foto whiteboard · ✍ Ketik notulensi · 📋 Tempel transkrip". `02 P16` varian eksternal sama. |
| m16 | **TERTUTUP** | `01 S7`: "Item (17): 9 diterima · 2 diubah · 1 dibuang · 5 belum direview" (9+2+1+5 = 17), tombol "Buat proyek (11 item)" (9 + 2). `md:L745` W-4 step 8: "mengonfirmasi semua item berstatus Diterima/Diubah… item Belum direview atau Dibuang tidak dibuat (m16)". |
| m17 | **TERTUTUP** | `md:L880` W-5 step 18: "Setiap override dikirim sebagai Untuk diketahui 'Health di-override'… (P0b, m17)". `md:L1162` baris jenis notifikasi. `01 S13`: "🔔 Setelah simpan, otomatis dikirim ke anggota proyek… [R2 m17]". |
| m18 | **TERTUTUP** | `md:L1557` A-28 "Diputuskan: F3 (diubah)". `md:L1578` Pertanyaan #12 dicoret "~~…~~ Diputuskan: F3". Matriks B baris Komentar dan baris "Komentar Guest vs Viewer". |
| m19 | **TERTUTUP** | `01 S4` catatan: "Pratinjau triage di Inbox [R2 m19…]: tombol Terima / Tolak tiket… memanggil aksi Tool API yang sama dengan Tiket › Triage… Aksi Gabung duplikat · Minta info · Teruskan ke PM… hanya ada di Tiket › Triage". `md:L1174` W-8 step 8 menyatakan hal yang sama. |
| m20 | **TERTUTUP** | `02 P8` langkah 1: "Sumber item: Import (default) · Tiket (intake)" + catatan "batch tetap tercatat di source_ref.import_batch". `md:L404` dan `md:L1537`. |

---

## 2. Konsistensi Addendum F (F1–F20) di ketiga file

Legenda: ✅ konsisten · ⚠️ inti keputusan diikuti, ada sisa kecil · — tidak relevan untuk file itu.

| ID | `workflow.md`/`.html` | `01` | `02` | Hasil |
|---|---|---|---|---|
| F1 | ✅ T13 diagram + tabel (`L270–271`, `L336`), Langkah 1/10, W-3 s15, W-6 s8–9 | ✅ S4 catatan prioritas default Sedang | ✅ P5 (T13), P12 (Prioritas default Sedang) | ✅ |
| F2 | ✅ `L94`, W-2 diagram & s7–8 | ✅ S4 Tolak saran / Tolak tiket… | ✅ P4, P16 | ✅ (nit label "Tandai duplikat" → R3-6) |
| F3 | ✅ Matriks A/B (sumber tunggal), T3/T10/T13, A-03, A-28 | ⚠️ S11/Asumsi benar, tetapi S4 "kartu persetujuan triage hanya muncul untuk PM proyek [F3]" | ⚠️ P4/P5/P6/P17 benar, tetapi P7 + P19 tidak memberi Guest "catat ide" | ⚠️ → R3-2 |
| F4 | ✅ `L244`, A-05, Roadmap W-0 | ✅ S1 | ✅ P16 | ✅ |
| F5 | ✅ `L404`, W-3 s12, AI-5 L1 (`L655`, `L1357`), Export CSV P0a | ✅ S4 kanal | ✅ P1/P2/P4/P12/P15/Asumsi | ✅ |
| F6 | ✅ `L198`, `L1056`, A-25, Roadmap | ✅ S3, Asumsi | — | ✅ |
| F7 | ✅ W-5 s7–11 + Diagram 2 | ✅ S8–S13 header, S10, Asumsi | ✅ P3 #4 | ✅ |
| F8 | ✅ W-9 guard + Roadmap P1 | ✅ S12 #4 | — | ✅ |
| F9 | ⚠️ definisi ✅ (`L877`), tetapi contoh "9 Telat ÷ 27 = 33% → terpicu" | ✅ S8/S11/S13/Asumsi "5 Telat ÷ 27 = 19%" | — | ⚠️ → R3-1 |
| F10 | ✅ W-0 Guest, W-2 s1 + kanal | ✅ S1 #3 | ✅ P4, P7 frame C, P17 | ✅ |
| F11 | ✅ Sampah, W-8 preferensi, Berjalan, W-9 s5 | ✅ S12 Catatan retro, penunjuk ke P18/P19 | ✅ P4-B, P18, P19 | ✅ |
| F12 | ✅ `L80`, T10 | ✅ S3/S8/S11/Asumsi | ✅ P1/P2/P4-B/P13/P17 | ✅ |
| F13 | — (workflow memakai nama role, bukan persona) | ✅ intro, S3/S4/S11 | ✅ intro, Asumsi | ⚠️ nama sudah tunggal, data kerja persona belum → R3-4 |
| F14 | ✅ `L86–87`, Diagram 1 W-5, Diagram W-9 | ✅ S9, S12, Asumsi | — | ✅ |
| F15 | ✅ A-06, A-31, W-10 s11 | — | ✅ P8 #5, P18, Asumsi | ✅ |
| F16 | ⚠️ "Segera ≤ +2 hari kerja" ada (`L1037`), tetapi aturan "setiap sinyal warna wajib teks/ikon" tidak tertulis | ✅ S2, S5, S9 | ✅ legenda, P1, P4, P5, P9, P18 | ⚠️ → N1 |
| F17 | ✅ W-10 Aktor + s2, Matriks B, A-27 | — (header ⋯ di S8 tanpa anotasi isi; tidak disyaratkan) | ✅ P15 #7 + catatan | ✅ |
| F18 | ✅ `L88`, W-2 s9 + edge case, Diagram 2 W-8, `L1183` | — | ⚠️ P15 Action Log memakai status "Dibuang" (AI-4) di luar set label F18 | ⚠️ → N3 |
| F19 | ✅ `L400`, A-08, W-6 s4, Roadmap W-2 | — | ✅ P4 (+ "Saran Ide diterima → item pindah ke Ide & Pengembangan"), P5, P8 | ✅ |
| F20 | ✅ Diagram W-3 b2, s4, s12, edge case `L668` | ✅ S9 catatan milestone | ✅ P9, P10, P12, P16, P17 | ✅ |

**Rekap:** 15 ✅, 5 ⚠️ (F3, F9, F13, F16, F18). Tidak ada keputusan Addendum F yang dilanggar pada intinya. Sisa ⚠️ dicatat sebagai R3-1, R3-2, R3-4, N1, dan N3.

---

## 3. Validitas teknis ulang (metode Lampiran R2)

Semua skrip dijalankan di `/tmp/mmcheck` dan `/tmp/r3check`, di luar folder proyek. Pemeriksaan bersifat statis: browser tidak dibuka (aturan CLAUDE.md global).

| Pemeriksaan | Metode | Hasil |
|---|---|---|
| Tag tak seimbang, mode longgar | `htmlcheck.py` R2 (`html.parser`, tag opsional `p/li/td/tr/…` diabaikan) | **0 error** di `workflow.html`, `01`, `02`; 0 tag terbuka di EOF ✅ |
| Tag tak seimbang, mode ketat | `strict.py` (setiap end-tag harus cocok dengan puncak stack, termasuk tag opsional) | **0 mismatch, 0 tag terbuka** di ketiga file ✅ |
| ID ganda | parser | **0** di ketiga file ✅ |
| `.wf-index` → id | semua `a[href]` di dalam `nav.wf-index` | **01: 15/15 valid** (`#S1`–`#S13`, `#asumsi`, `02-pekerjaan-rapat-tim.html`). **02: 21/21 valid** (`01-beranda-proyek.html`, `#p1`–`#p19`, `#asumsi`), termasuk **P17, P18, P19** ✅. Setiap `section.screen` punya entri indeks (01 14/14, 02 20/20). |
| Anchor di seluruh dokumen | semua `href="#…"` ke `id` | **0 rusak** di `workflow.html` (TOC), `01`, `02` ✅ |
| Tautan silang 01 ↔ 02 | parser | 01 → 02 ada di `.wf-index` (+ intro). 02 → 01 ada di `.wf-index`. Kedua file target ada ✅. `aria-label="Navigasi layar"` ada di kedua `.wf-index` ✅ |
| Overflow tabel | cari pembungkus terdekat tiap `<table>` | 01: 6/6 di `.tw` (kini didefinisikan). 02: 17/17 di `.scroll` ✅ |
| Sintaks Mermaid | `mermaid@11.17.2` + `jsdom` di `/tmp/mmcheck`, `mermaid.parse()` per blok `workflow.md`. Kontrol negatif: `bad.md` (2 blok rusak buatan) → **0/2**, jadi parser memang mendeteksi FAIL | **21/21 lolos** (7 `flowchart TD`, 2 `flowchart LR`, 1 `flowchart TB`, 5 `stateDiagram-v2`, 6 `sequenceDiagram`) ✅ |
| Paritas md ↔ html: diagram | unescape `class="mermaid"` di html lalu bandingkan dengan blok md | **21/21 identik**. `workflow.html` memuat `mermaid@11` (jsdelivr) ✅ |
| Paritas md ↔ html: struktur | heading, tabel, baris tabel, penanda ASUMSI | Heading 100/101 (yang hilang hanya "Daftar isi", digantikan TOC sidebar). Tabel **25/25**. `<tr>` **294** = 319 baris tabel md − 25 pemisah. ASUMSI **34/34** ✅ |
| Paritas md ↔ html: isi | multiset token (≥ 3 karakter) setelah tag/markup dibuang + hitung istilah kunci | Selisih hanya `---` (pemisah tabel/hr md) dan judul di sidebar html. Istilah kunci sama: T13 15/15, F1 50/50, F3 24/24, F20 8/8, P17 8/8, P19 6/6, Aktif 14/14, Tolak tiket 11/11, Tolak saran 7/7 ✅ |
| Istilah terlarang | pindai literal, case-insensitive, di 4 file | **Overdue, On track, Ready for QC, Menunggu QC, Slipped: 0× sebagai label UI.** Kecocokan yang tersisa semuanya sah: enum `overdue`/`OVERDUE` (md `L81`, `L350`, `L1036` + html, `01 S2` "Telat (overdue)"); enum `pending` milik `AISuggestion.status` yang diwajibkan F18 (md `L88`, `L1125`, `L1183`, `L1344` + html); `02 P6` "transaksi tertahan di status *pending*" (isi deskripsi bug Midtrans, bukan label); "Tutup tiket" 1× di md `L94` (+html) dalam kalimat larangan "Istilah 'Tutup tiket' tidak dipakai" → N4. Tambahan: Shipped, At risk, Off track, Perpanjang deadline/tenggat masing-masing 0× ✅ |
| Sinyal tidak hanya warna | pindai kelas `due-warn`, `due-bad`, `ev k`, `tb ok/warn/bad`, `ms ok/bad` beserta teksnya | Semua berteks/ikon. Elemen "tanpa kata kunci" yang terdeteksi hanyalah pesan validasi P8 (teks) dan bar fase S9 yang labelnya ada di `span` sebelahnya ✅ |

**Syarat teknis R2 §6** (0 error parser, 21+/21+ Mermaid, semua tautan `.wf-index` valid termasuk layar baru) **terpenuhi**.

---

## 4. Regresi baru akibat revisi

Severity mengikuti R2 §5: **Major** = akan menghasilkan implementasi salah/ganda atau melanggar aturan eksplisit · **Minor** = kualitas, kejelasan, atau data contoh, boleh menyusul · **Nit** = kosmetik, tidak dihitung.

### Minor (6)

| ID | File · layar/alur | Masalah | Perbaikan konkret |
|---|---|---|---|
| **R3-1** | `workflow.md` W-5 step 15 (`L877`) vs `01` S8, S11, S13, Asumsi | Contoh penyebut F9 di workflow memakai set angka yang **identik dengan Atlas** (52 = 25 Selesai + 14 Terbuka + 9 Dikerjakan + 4 Siap QC → Aktif 27), tetapi Telat-nya **9 → 33% → terpicu (Berisiko)**. Wireframe memakai **5 Telat → 19% → Tidak**. F9 meminta "semua contoh angka wajib konsisten". Pembaca yang membandingkan akan mengira salah satu file keliru. | Ubah contoh di `L877` menjadi "5 Telat ÷ 27 = **19% → tidak terpicu**; dengan 6 Telat = 22% → terpicu", atau ganti seluruh set angka dan beri label "contoh hipotetis, bukan Atlas". Sinkronkan `workflow.html`. |
| **R3-2** | `workflow.md` Matriks B `L1425` + A-03 `L1532` + W-6 Aktor `L918` vs `02` P7, P17, P19; `01` S4 | Konflik izin baru. (a) Workflow: Guest "Laporkan tiket / **catat ide** → Triage". `02 P7`: "mode Cepat/Form lengkap tidak tersedia untuk Guest", jadi Guest tidak bisa mencatat ide. `02 P19` (yang mengklaim "menampilkan nilai yang sama" dengan matriks): Guest hanya "⚠️ Laporkan tiket → Triage". Sidebar Guest di P17 juga tanpa "Catat ide". (b) `02 P19` "Lihat proyek…": Guest "item yang ia laporkan/ikuti", padahal workflow `L1418` "…+ Rencana ringkas". (c) `01 S4`: "kartu persetujuan triage hanya muncul untuk PM proyek [F3]", padahal T1 dan Matriks B mengizinkan **Member proyek** melakukan Terima, dan F3 tidak menyebut pembatasan itu. | Workflow tetap sumber tunggal. Pilih satu untuk (a): **hapus "catat ide" dari Guest** di `L1425`, A-03, dan W-6 Aktor (disarankan; selaras dengan A-29 dan P7), **atau** tambahkan "Catat ide" ke P7 (mode Guest), sidebar P17, dan P19. (b) Salin teks sel matriks apa adanya ke P19. (c) Ubah S4 menjadi "kartu bundel triage dikirim ke triager proyek (PM; Member proyek yang berhak triage)", atau tetapkan di W-2 step 6 bahwa bundel Inbox hanya untuk PM dan sebutkan alasannya. |
| **R3-3** | `02` P17 (notulensi), P12, P13 Direktori vs `workflow.md` Matriks B ("Terima/Tolak/Alihkan penugasan dari rapat": Guest ❌) | Layar baru P17 menampilkan "Action item terkait kamu: Kirim sertifikat SSL baru (**PIC: Hendra**)", padahal Hendra adalah Guest dengan role Viewer. P12 menyatakan "PIC harus anggota proyek terhubung" dan menandai "Pak Hendra ✕ **bukan anggota proyek**". Di sisi lain, P13 Direktori mencantumkan Hendra sebagai "Guest · Payment (**Viewer**)". Akibatnya tidak jelas apakah Guest/Viewer bisa menjadi PIC. | P17: ganti dengan "Action item: Minta sertifikat SSL ke bank mitra (PIC: Sari W.) · tenggat 9 Okt · menyebut kamu". P12: ganti label menjadi "Pak Hendra ✕ Guest/Viewer, tidak bisa menjadi PIC → pilih orang". Tambahkan satu kalimat ke W-3 Aturan: "PIC = anggota proyek ber-role PM/Member; Guest/Viewer hanya disebut di teks". |
| **R3-4** | `01` S2, S3, S5 vs `02` P1, P2, P12, P13, P16 (data contoh persona F13) | Nama persona sudah tunggal, tetapi data kerjanya tidak. Pada tanggal yang sama (Sen, 5 Okt 2026): Fokus Saya Rina (S2, "satu daftar semua item aktif saya") hanya berisi ATL/FLR/BRN/CDN dengan "Proyek saya (4)" Atlas · Borneo · Cendana · Dieng, sedangkan Tugas saya Rina (P1) berisi 11 item PAY/KSR/PRT dan Direktori P13 mencatat Rina di Payment · Kasir. Sari di S3 adalah PM Atlas/Cendana/Flores, tetapi di P13 PM Payment/Portal; Daftar Proyek S5 tidak memuat Payment Gateway v2/Portal/Kasir walaupun satu workspace. Di dalam 02 sendiri: PAY-133 ada di Tugas saya Rina (P1), tetapi assignee-nya Dodi P. di tabel P2; P16 (Rina) "PAY-133 menunggu review kamu", padahal reviewer-nya Dewi L.; P16 "Update dokumen scope beta untuk kamu", padahal PIC di P12 adalah Maya. | Cara termurah: tambahkan di kedua intro "Contoh data tiap file adalah irisan: 01 menampilkan proyek Atlas dkk., 02 proyek Payment dkk.; daftar 'saya' di tiap file hanya memuat irisan itu". Lalu perbaiki tiga data internal 02: PAY-133 assignee = Rina di P2 (atau keluarkan dari P1); P16 kartu QC diganti item yang reviewer-nya Rina; P16 "Tugas baru dari rapat" diganti item yang PIC-nya Rina (mis. "Perbaiki retry callback Midtrans"). |
| **R3-5** | `workflow.md` W-3 step 12, 14, 15 (`L625–630`) vs `02` P12 | Label dan semantik konfirmasi Hasil Rapat berbeda. W-3: aksi item "**Konfirmasi · Edit** · Ubah kategori · Tolak", tombol "**Simpan & bentuk item**", "Item yang belum ditinjau tidak ikut dibentuk". P12: "**Terima · Ubah** · Ubah kategori ▾ · Tolak" (sesuai Prinsip 2) dan tombol "**Konfirmasi & buat 3 item**". Angka 3 menghitung 2 item Tinggi/Sedang yang **belum** diklik Terima, dan hanya item Rendah yang disebut "belum ditinjau". Engineer bisa membaca "belum ditinjau" sebagai "belum diklik" (W-3) atau "Rendah yang belum dibuka" (P12), sehingga hasil pembentukan item berbeda. | Samakan W-3 dengan P12: step 12 "Terima · Ubah · Ubah kategori · Tolak · Gabung…", step 14 "Konfirmasi & buat N item". Definisikan di step 15: "**Belum ditinjau** = item confidence Rendah yang belum dibuka; item Tinggi/Sedang yang tidak ditolak ikut dibentuk saat Konfirmasi". Alternatifnya, wajibkan Terima eksplisit dan ubah P12 menjadi "buat 1 item". Sinkronkan `workflow.html`. |
| **R3-6** | `02` P4 (banner AI-3 + catatan #6), P6 vs `workflow.md` W-2 (`L435`, `L457`), T2 | (a) Aksi yang sama punya dua nama: "Gabung duplikat" (W-2, T2, S4, menu ⋯ P4) vs "**Tandai duplikat → PRT-298**" (banner P4) dan "Tandai duplikat" (panel AI P6). (b) Catatan P4 #6 mencantumkan alasan Tolak tiket "spam · tidak dikerjakan · di luar scope · **duplikat**", padahal W-2 membatasi alasan Tolak tiket ke `wont_do`/`out_of_scope`/`spam`, dan duplikat wajib lewat T2 (`duplicate_of_id` wajib). Jalur kedua ini akan membatalkan item sebagai duplikat tanpa tautan ke item asli. | Ganti label banner P4 dan P6 menjadi "Gabung duplikat → PRT-298" / "Gabung duplikat…". Hapus "duplikat" dari daftar alasan Tolak tiket di P4 #6 dan tambahkan "(duplikat → pakai Gabung duplikat)". |

### Nit (5, tidak dihitung)

| ID | Lokasi | Catatan & perbaikan |
|---|---|---|
| N1 | `workflow.md` W-7 / "Cara membaca" | Bagian kedua F16 ("setiap sinyal warna wajib punya teks/ikon pendamping") hanya ada di wireframe. Tambahkan satu baris ke W-7 "Sinyal & chip alasan" atau ke Prinsip produk. |
| N2 | `01` S12 #7 vs `md:L1254`, `L1450` | S12: Catatan retro "Viewer berkomentar". W-9 guard dan Matriks B: Viewer "baca" untuk Retro. Pilih satu (disarankan: Viewer berkomentar, sejalan dengan F3) dan sinkronkan baris Matriks "Buat & simpan Retro". |
| N3 | `02` P15 AI Action Log | Kolom Approval memakai "Dibuang" (AI-4) dan "Menunggu review", di luar set label F18 (Menunggu · Diterima · Diubah · Ditolak · Kedaluwarsa). Petakan "Dibuang" → "Ditolak", atau catat bahwa draf AI-4 bukan `AISuggestion`. |
| N4 | `md:L94` (+html) | "Tutup tiket" muncul sekali dalam kalimat larangan. Ini sah, tetapi akan selalu tertangkap pemindaian istilah. Bisa diganti "istilah lama untuk Tolak tiket tidak dipakai". |
| N5 | `01` S5/S4 vs `02` P5/P9/P13 | Nama pendukung bertabrakan: Maya **Lestari** (01, Lead Cendana) vs Maya **P.** (02) vs Dewi **Lestari**; Fajar **Nugroho** (01) vs Fajar **H.** (02) vs Andi **Nugroho** (Admin). Ini di luar persona inti F13, tetapi membingungkan. Samakan nama belakang atau tambahkan daftar pemeran pendukung di intro. |

---

## 5. Verdict akhir

### **SIAP DENGAN PERBAIKAN MINOR**

**Alasan:**
1. **Semua 12 Major R2 tertutup** dengan bukti di file yang relevan. Workflow menjadi acuan tunggal: T13, prioritas default Sedang, Tolak saran/Tolak tiket, matriks izin, bottom bar, fase rilis, KPI per gelombang, dialog Ubah deadline, retro agregat, penyebut Health, intake Laporkan tiket + Tampilan Guest, layar P0 yang hilang, dan agregat "Aktif".
2. **Syarat formal R2 §6 untuk SIAP terpenuhi:** 0 error parser (longgar dan ketat), Mermaid 21/21, semua tautan `.wf-index` valid termasuk P17–P19 dan 01↔02, paritas md↔html utuh.
3. **Masih terbuka: Major 0 · Minor 7** (m14 sebagian + R3-1…R3-6) **· Nit 5.** Tidak ada yang membatalkan keputusan DECISIONS. Namun R3-2 (izin Guest dan triager) dan R3-5 (semantik "belum ditinjau") menyentuh logika backend, sehingga sebaiknya ditutup sebelum handoff ke engineering, bukan sesudahnya.

**Urutan perbaikan yang disarankan (±2–3 jam, satu putaran):**
1. `workflow.md` (+ regenerasi `workflow.html`): R3-1 (contoh F9), R3-2a/b/c (putuskan Guest "catat ide", jadikan matriks sumber teks P19), R3-5 (label & definisi "belum ditinjau"), m14 (roadmap Tim), N1, N2.
2. `02`: R3-2 (P7/P17/P19 mengikuti matriks), R3-3 (PIC Guest di P17/P12), R3-4 (PAY-133, kartu P16), R3-6 (label Gabung duplikat, alasan Tolak tiket), N3.
3. `01` dan kedua intro: R3-2c (S4), R3-4 (catatan irisan data), N5.
4. Ulangi skrip §3. Hasil yang diharapkan tetap 0/0/21/36.

---

### Lampiran — metode & reproduksi (read-only)

- **Parser HTML:** `/tmp/mmcheck/htmlcheck.py` (skrip R2, mode longgar: id ganda, `.wf-index`, anchor, tautan non-anchor) dan `/tmp/r3check/strict.py` (mode ketat: setiap end-tag harus cocok dengan puncak stack). Pembungkus tabel dicek dengan regex atas `<div class>` terdekat sebelum `<table>`.
- **Mermaid:** `node /tmp/mmcheck/check.mjs deliverables/workflow.md` (`mermaid@11.17.2` + `jsdom`, terinstal di `/tmp/mmcheck`, bukan di proyek). Kontrol negatif `bad.md` → 0/2.
- **Paritas md↔html:** `/tmp/mmcheck/cmp.py` (diagram, heading, `<tr>`) + skrip `/tmp/r3check` untuk tabel/pemisah, penanda ASUMSI, multiset token, dan hitungan istilah kunci.
- **Istilah terlarang:** `/tmp/r3check/terms.py` (case-insensitive, dengan konteks ±70 karakter, untuk 4 file).
- **Isi wireframe:** ekstraksi teks per `section.screen` dengan `/tmp/mmcheck/txt.py` → `/tmp/r3check/01.txt`, `02.txt`. Elemen `hidden` (briefing mingguan S2/S3) diverifikasi langsung di HTML karena ekstraktor juga memuat teks tersembunyi.
- Tidak ada file deliverable, `wf.css`, atau `DECISIONS.md` yang diubah. Satu-satunya file yang ditulis adalah laporan ini.
