# R11 — Pedoman UX terukur untuk pengguna awam dan lansia (Mantine v9)

> Status: lengkap. Tanggal 15 Oktober 2026. Bahasa: Indonesia. Hanya file ini yang dibuat; tidak ada kode atau dokumen lain yang diubah.

## 1. Ringkasan eksekutif

1. Tema Mantine masih kosong (`app/lib/theme.ts:8`), sehingga bawaan Mantine berlaku: tombol/input 36 px, **Badge 9-13 px**, `dimmed` 3,32:1, tombol merah/teal/biru terisi 3,28/2,55/3,56:1. Semuanya di bawah target lansia atau gagal kontras AA; aturan CLAUDE.md "`size=sm` = 44 px" juga keliru (sebenarnya 36 px).
2. Rekomendasi inti: **WCAG 2.2 AA + target 44 px (2.5.5)**; skala teks **1,0 / 1,25 / 1,5** (body 16/20/24 px) lewat `theme.scale` (menggantikan 1,0/1,125/1,25 di R08, tandai ASUMSI sampai diuji 2-3 lansia); `primaryShade` 8 + palet `ok/warn/danger` dengan pasangan warna utamanya dihitung (§3.2.3); ukuran bawaan komponen diganti sekali di tema.
3. Temuan paling berisiko: kueri media Mantine tidak ikut skala, jadi pada "Sangat besar" tablet 768 px menampilkan sidebar 372 px dan konten hanya setara 232 px. Solusi: titik pindah sidebar→drawer dikali skala (768/992/1200 px) dan kartu menggantikan tabel (§3.7).
4. Disediakan: 16 aturan komponen (satu tombol utama, ≤ 5 opsi, konfirmasi 3 tingkat, toast, kosong, memuat, Urungkan), glosarium 40+ istilah plus daftar dilarang, 12 pola salinan, dan 31 butir checklist reviewer.
5. **Dua bentrokan butuh keputusan user**: (Q1) CLAUDE.md mewajibkan konfirmasi untuk semua penghapusan, sedangkan desain (`08-sampah.md` #3) memakai Urungkan; (Q2) skala R08 vs R11. "Inbox", "Events", dan jenis "Bug" dipertahankan sesuai keputusan user, dengan keterangan Indonesia.
6. Usaha: sekitar **8,5-14 hari-orang AI + 2,5-3,5 hari reviewer manusia** (L), sebagian besar fondasi yang dipakai semua layar; harus selesai sebelum layar produk pertama.

## 2. Temuan (dengan bukti)

Semua angka kontras dihitung dengan rumus WCAG 1.4.3 `(L1+0,05)/(L2+0,05)` (skrip Node sekali pakai, tidak disimpan di repo). Ukuran Mantine dibaca dari `node_modules/@mantine/core/styles.css` (terpasang 9.6.0, `package.json` `^9.6.0`).

### 2.1 Kode yang sudah berjalan

| # | Temuan | Bukti | Akibat untuk awam/lansia |
|---|---|---|---|
| T1 | Tema kosong: semua komponen memakai default Mantine | `app/lib/theme.ts:8` `createTheme({})` | Default Button/Input = `sm`: tinggi 36 px, teks 14 px |
| T2 | **Aturan CLAUDE.md keliru**: "tombol utama minimum `size=sm` (44px touch area)". Tinggi Button/Input sebenarnya `xs` 30, `sm` 36, `md` 42, `lg` 50, `xl` 60 px; ActionIcon `xs` 18, `sm` 22, `md` 28, `lg` 34, `xl` 44 px | `styles.css`: `--button-height-*`, `--input-height-*`, `--ai-size-*`; CLAUDE.md bagian Mobile-Friendly §5 | Tombol "besar" sebenarnya di bawah 44 px; ActionIcon `xs` (18 px) bahkan di bawah 24 px (gagal WCAG 2.5.8 bila berdempetan) |
| T3 | **Badge default sangat kecil**: teks `xs` 9 px, `sm` 10, `md` 11, `lg` 13 px; tinggi 16/18/20/26 px | `styles.css`: `--badge-fz-*`, `--badge-height-*` | Status/peran/kondisi (informasi inti produk) tidak terbaca. Dipakai `size="xs"` di `ProfileHeader.tsx:34,45` dan `AppFrame.tsx:227` |
| T4 | **Warna default Mantine gagal kontras**: teks `dimmed` (gray-6 `#868e96`) 3,32:1; placeholder (gray-5) 2,07:1; tombol terisi shade 6 + teks putih: merah 3,28, teal 2,55, biru 3,56. Badge/Alert `light` memakai shade 9 di atas shade 1: kuning 2,69, jingga 3,62, hijau 3,81, teal 4,33 (hanya biru 4,93, merah 4,51, abu 13,87 lolos) | `default-colors.mjs`; `get-css-color-variables.mjs` (`-light-color` = shade 9, `-light` = shade 1, `-filled` = `primaryShade`); `default-css-variables-resolver.mjs:49,55` | `c="dimmed"` dan Badge `color="yellow"/"teal"` (`ProfileHeader.tsx:29,36,47,61`) gagal SC 1.4.3 |
| T5 | `<html lang="en">` padahal seluruh teks Indonesia | `app/root.tsx:46` | Pembaca layar salah mengucap; gagal SC 3.1.1 (Level A) |
| T6 | Toast: `top-right`, `autoClose` default 4000 ms, hanya berhenti saat hover/fokus (di tablet sentuh tidak ada hover). Pesan galat memakai `error.message` mentah | `root.tsx:103`; `notifications/esm/Notifications.mjs:20`, `NotificationContainer.mjs:94`; `ProfileForm.tsx:44`, `DangerZoneCard.tsx:32` | Lansia belum selesai membaca saat toast hilang; teks galat bisa berbahasa Inggris/teknis |
| T7 | Kontrol inti masih kecil: Burger `size="sm"` (18 px + 10 = 28 px), ActionIcon `lg` 34 px, Button `xs` 30 px, tombol profil `sm` 36 px | `AppFrame.tsx:134,174,186`; `Burger.css:11`; `ProfileForm.tsx:69,74`; `DangerZoneCard.tsx:94` | Di bawah 44 px (SC 2.5.5 AAA) walau lolos 24 px (SC 2.5.8 AA) |
| T8 | Navbar 248/72 px dan breakpoint `sm` (768 px, satuan `em`) | `AppFrame.tsx:40-41,121-125` | Media query TIDAK ikut `--mantine-scale`; pada skala 1,5 sidebar jadi 372 px di layar 768 px. Lihat §3.7 |
| T9 | Istilah Inggris di UI hari ini: `Profile`, `Dashboard`; `label="Password"`; "Berhenti impersonasi" | `app/routes/app/layout.tsx:20,24,27`; `DangerZoneCard.tsx:53`; `AppFrame.tsx:170` | Pelanggaran bahasa polos (lihat §3.4) |
| T10 | Info penting hanya lewat Tooltip: "Email belum diverifikasi…" | `ProfileHeader.tsx:43` | Tooltip butuh hover; bertentangan dengan prinsip desain "tanpa aksi yang bergantung hover" (`diskusi/02-proyek.md:15`, `03-tugas.md:15`) |
| T11 | **Pola baik yang sudah ada** (pertahankan): AppShell + header mobile + Burger (`AppFrame.tsx:119-151`); konfirmasi destruktif `modals` "Hapus akun permanen?" (`DangerZoneCard.tsx:75`); badge verifikasi = ikon + teks (`ProfileHeader.tsx:34-48`); `loading`/`disabled` pada tombol (`DangerZoneCard.tsx:63`); judul toast galat spesifik "Gagal menghapus akun" (`:30`) | file yang sama | Dasar yang bisa dilanjutkan, bukan ditulis ulang |

### 2.2 Dokumen desain, riset lain, dan prototype

- **Sasaran sudah final, angkanya belum ada**: `diskusi/00-role-dan-area.md:57` ("ukuran teks Normal/Besar/Sangat besar `profiles.text_size` final, lewat skala font Mantine"). R08 baris 243 mengasumsikan `TEXT_SIZE_SCALE = {normal:1, large:1.125, xlarge:1.25}` ("perlu uji ke 2–3 pengguna") dan cookie `pm-text-size`; R05 baris 12 menambah jebakan ikon `size={14}` px dan `maw` numerik. **R11 membantah langkah skala R08** (terlalu kecil; lihat §3.2) dan menerima mekanisme (cookie + `theme.scale`) tanpa mengulanginya.
- **Pola desain yang sudah searah** dan dijadikan aturan: satu tombol langkah berikutnya yang selalu terlihat (`03-tugas.md` #16); pesan "Urungkan" setelah hapus (`08-sampah.md` #3); form event dua tahap (`05-events.md` #13); kondisi proyek ikon + teks + satu kalimat alasan (`02-proyek.md` #9).
- **Istilah yang dipakai dokumen desain** (sumber glosarium §3.4): status tugas `Belum dikerjakan · Sedang dikerjakan · Menunggu diperiksa · Selesai · Dibatalkan` (`03-tugas.md:138`); status proyek `Draf · Berjalan · Ditunda · Selesai · Dibatalkan`, prioritas `Rendah · Sedang · Tinggi · Kritis`, kondisi `Lancar · Perlu perhatian · Terlambat` (`02-proyek.md:91-94`); peran `Pengelola · Anggota · Pemantau` (`02-proyek.md:35`).
- **Jargon Inggris yang masih ada** (hitungan `grep -w -i` di `diskusi/*.md`, termasuk nama kolom, jadi indikatif): Event/Events 117, Login 65, Role 67 (vs Peran 53), Bug 31, Tag 27, Template 26, Lead 19, Filter 16, Badge 14, Milestone 12, Draft 7 (vs Draf 28), Checklist 6, Timeline 5. **Inbox (36×) dan Events dipertahankan user** (`06-inbox.md` #2 "tetap Inbox"; `05-events.md` #1; R10 baris 35 menyerahkan penanganannya ke R11).
- **Dua kata "sedang berjalan"**: tugas `Sedang dikerjakan`, proyek/tahapan `Berjalan` (`02-proyek.md:91,96`). Bukan kontradiksi, tetapi harus dikunci di glosarium agar tidak bercampur.
- **Prototype tidak boleh jadi sumber ukuran**: `04-prototype/prototype/wf.css` memakai tombol 28 px / teks 12 px (`:53`), kolom cari 36 px (`:21`), label menu 11 px (`:37`), badge 11 px (`:51`), `--dim:#999` 2,85:1 (`:3`). `--mute:#666` 5,74:1 lolos. Wireframe abu-abu, bukan spesifikasi.

## 3. Rekomendasi

Format sumber: `[W x.y.z]` = halaman "Understanding" WCAG 2.2 untuk SC itu (URL di §7); `[S#]` = sumber lain di §7. Aturan bertanda **(R11)** adalah batas rancangan hasil penalaran, bukan temuan riset; semuanya harus diuji pada skenario awam R09 (`R09-tes-qa.md:211-213`).

### 3.0 Keputusan inti

| # | Keputusan | Alternatif ditolak | Alasan |
|---|---|---|---|
| D1 | Standar: **WCAG 2.2 AA penuh + SC 2.5.5 (target 44 px, AAA)** | AA saja (target 24 px); AAA penuh | 24 px terlalu kecil untuk penurunan motorik lansia [S2]; AAA penuh (7:1 di semua teks, 2.4.13) tidak realistis untuk tim kecil |
| D2 | Skala teks **Normal 1,0 · Besar 1,25 · Sangat besar 1,5** (body 16/20/24 px) | R08: 1,0/1,125/1,25 | Selisih 2 px (Besar R08) nyaris tak terasa; 24 px = batas "large text" WCAG (18 pt) [W 1.4.3]. **Bertentangan dengan R08:243**; nilai tetap ASUMSI sampai diuji 2-3 lansia |
| D3 | Mekanisme tetap `theme.scale` + cookie `pm-text-size` (R05:12, R08:243); tidak diulang di sini | `html{font-size}`, CSS `zoom`, override `--mantine-scale` di `div` | Hanya `theme.scale` ikut portal/modal/toast (R08:243) |
| D4 | Ukuran bawaan komponen diganti **sekali di tema** (`components.*.defaultProps`) | Menulis `size="lg"` manual di tiap pemakaian | Aturan manual sudah salah satu kali (T2) dan mudah terlupa |
| D5 | `primaryShade` 8 + palet kustom `ok`/`warn`/`danger`; `dimmed`, placeholder, garis input dikoreksi | Warna default Mantine; hijau/teal/kuning bawaan | Hanya biru dan merah bawaan yang lolos pada shade 8; hijau maks 4,37, kuning 3,00 (hasil hitung §2.1 T4) |
| D6 | Status/kondisi/prioritas = **ikon + teks + warna**, teks ≥ 16 px | Warna saja; Badge bawaan 9-13 px | WCAG 1.4.1 [W 1.4.1]; kondisi proyek sudah dirancang ikon + teks (`02-proyek.md` #9) |
| D7 | Konfirmasi **3 tingkat** (§3.3); hapus-ke-Sampah memakai Urungkan | Konfirmasi untuk semua penghapusan (CLAUDE.md saat ini) | NN/g: jangan konfirmasi aksi rutin, sediakan undo [S9]; user sudah memutuskan Urungkan (`08-sampah.md` #3). **Bentrok dengan CLAUDE.md, butuh keputusan user (Q1)** |
| D8 | Glosarium baku 40+ istilah (§3.4); **Inbox & Events dipertahankan** dengan keterangan Indonesia | Mengganti jadi "Kotak masuk"/"Acara" | Sudah diputuskan user (`06-inbox.md` #2, `05-events.md` #1); mitigasi cukup murah |
| D9 | Titik pindah sidebar → drawer **dikali skala** (768 → 960 → 1152 px) | Breakpoint tetap `sm` | Media query `em` tidak ikut skala (T8; §3.7) |
| D10 | `<html lang="id">`, toast sukses 7 dtk, galat tidak menutup sendiri, info penting tidak pernah hanya di Tooltip | Pengaturan bawaan | T5, T6, T10; SC 3.1.1, 2.2.1 |

### 3.1 (a) Kriteria WCAG 2.2 yang relevan dan standar untuk lansia

| SC | Level | Isi | Penerapan di Simple PM |
|---|---|---|---|
| 1.4.3 Kontras (Minimum) | AA | Teks ≥ 4,5:1; teks besar (≥ 18 pt = 24 px, atau 14 pt tebal) ≥ 3:1 [W 1.4.3] | Token §3.2.3; Badge/Alert `light` wajib dihitung (T4) |
| 1.4.11 Kontras Non-teks | AA | Batas input, ikon bermakna, status fokus ≥ 3:1 [W 1.4.11] | Garis input gray-6 3,32:1 (bawaan gray-4 = 1,49:1 gagal); ring fokus 5,02:1 |
| 1.4.1 Penggunaan Warna | A | Warna bukan satu-satunya pembawa informasi [W 1.4.1] | Status = ikon + teks + warna (§3.2.5) |
| 1.4.4 Ubah Ukuran Teks | AA | Teks bisa diperbesar sampai 200% tanpa kehilangan isi/fungsi [W 1.4.4] | Berlaku pada skala 1,5 **dan** zoom browser; uji §3.6 |
| 1.4.10 Reflow | AA | Tanpa gulir 2 arah pada lebar 320 px (setara zoom 400% di 1280 px) [W 1.4.10] | Pengecualian tabel data; di bawah ambang pakai kartu |
| 1.4.12 Spasi Teks | AA | Layout tidak rusak bila line-height 1,5, spasi paragraf 2×, huruf 0,12×, kata 0,16× [W 1.4.12] | Jangan beri tinggi tetap pada teks; wadah `min-height` |
| 2.4.7 / 2.4.11 | AA | Fokus terlihat; fokus tidak tertutup elemen melayang [W 2.4.11] | Ring §3.2.4; `scroll-padding` bila ada header sticky |
| 2.5.8 Ukuran Target (Min) | AA | Target ≥ 24×24 px atau jarak ke target lain cukup [W 2.5.8] | Lantai mutlak; ActionIcon `xs/sm` dilarang |
| 2.5.5 Ukuran Target (Enhanced) | AAA | ≥ 44×44 px (kecuali teks inline) [W 2.5.5] | **Target proyek** (D1): semua kontrol ≥ 44 px pada skala 1,0 |
| 2.5.7 Gerakan Menyeret | AA | Semua fungsi seret punya alternatif satu-pointer [W 2.5.7] | Kanban/urut ulang wajib tombol "Pindahkan ke…" |
| 3.2.3 / 3.2.4 | AA | Navigasi dan nama komponen konsisten antar halaman [S1] | Urutan 8 menu tetap; satu istilah satu makna (glosarium) |
| 3.2.6 Bantuan Konsisten | A | Bila ada bantuan, letaknya sama di tiap halaman [W 3.2.6] | Tautan "Butuh bantuan?" tetap di dasar sidebar (belum ada hari ini) |
| 3.3.1 / 3.3.3 | A / AA | Galat teridentifikasi dalam teks; beri saran perbaikan bila diketahui [W 3.3.3] | Pola pesan §3.5 (#2, #3) |
| 3.3.4 Pencegahan Galat | AA | Data pengguna yang diubah/dihapus: dapat dibalik, dicek, atau dikonfirmasi [W 3.3.4] | Tiga tingkat §3.3: Urungkan **atau** konfirmasi |
| 3.3.7 Entri Berulang | A | Jangan minta data yang sama dua kali dalam satu proses [W 3.3.7] | Form event dua tahap; wizard proyek mengisi ulang otomatis |
| 3.3.8 Autentikasi (Min) | AA | Login tanpa tes kognitif (ingat/ketik ulang) kecuali ada alternatif; boleh tempel & pengelola sandi [W 3.3.8] | Login Google saja memenuhinya; di form dev email/sandi jangan blokir tempel (tidak ada `onPaste` di `app/`, diperiksa dengan grep) |
| 3.1.1 Bahasa Halaman | A | Bahasa halaman terdeteksi mesin [S1] | `lang="id"` (T5) |
| 4.1.3 Pesan Status | AA | Pesan status terbaca pembaca layar tanpa fokus [W 4.1.3] | Mantine Notification bawaan `role="alert"` (`Notification.mjs:41`) |
| 2.2.1 Waktu Dapat Diatur | A | Batas waktu bisa dimatikan/diperpanjang/ditambah ≥ 10× [W 2.2.1] | Toast menutup sendiri = batas waktu: sukses 7 dtk, galat manual (D10) |
| 1.3.5 / 3.1.5 | AA / AAA | Tujuan input dapat diidentifikasi (`autoComplete`); tingkat baca setara SMP [S1] | `autoComplete`/`inputMode` di form; 3.1.5 jadi pedoman salinan §3.5, bukan syarat uji |

**Standar lain untuk lansia.** W3C WAI menyebut empat penurunan: penglihatan (kontras, teks), kemampuan fisik (mouse, target kecil), pendengaran, kognitif (memori jangka pendek, mudah terganggu) [S3]. Nielsen Norman Group (NN/g) menemukan teks kecil, kontras rendah, target kecil, lebih banyak salah ketik, dan pesan galat yang tidak terbaca sebagai hambatan utama lansia [S4]. Laporan NN/g penuh (87 pedoman) berbayar dan **tidak dibaca**; hanya artikel ringkasnya. Tidak ada regulasi Indonesia yang saya verifikasi (pencarian web gagal di sesi ini) ⇒ **ASUMSI: tidak dijadikan syarat** (Q5).

### 3.2 (b) Token desain untuk tema Mantine

Semua ukuran Mantine berbentuk `calc(N rem × var(--mantine-scale))` (`styles.css`; `rem()` membungkusnya, [S6]); satu nilai `scale` menggeser teks, jarak, radius, tinggi kontrol, modal, dan navbar bersamaan. Kolom px di bawah dihitung dari token itu.

#### 3.2.1 Skala teks (D2)

| Ukuran | `scale` | Teks xs / sm / md / lg / xl (px) | h1 / h2 / h3 | Button & Input `lg` | ActionIcon `xl` | Checkbox `lg` | Jarak `md` | Modal `md` | Navbar penuh / ciut |
|---|---|---|---|---|---|---|---|---|---|
| Normal | 1,0 | 12 / 14 / **16** / 18 / 20 | 34 / 26 / 22 | 50 | 44 | 30 | 16 | 440 | 248 / 72 |
| Besar | 1,25 | 15 / 17,5 / **20** / 22,5 / 25 | 42,5 / 32,5 / 27,5 | 62,5 | 55 | 37,5 | 20 | 550 | 310 / 90 |
| Sangat besar | 1,5 | 18 / 21 / **24** / 27 / 30 | 51 / 39 / 33 | 75 | 66 | 45 | 24 | 660 | 372 / 108 |
| *(R08, ditolak)* | 1,125 / 1,25 | md 18 / 20 | h1 38 / 42,5 | 56 / 62,5 | 50 / 55 | | | | |

Aturan teks **(R11)**: tidak ada teks di bawah `sm` (14 px pada Normal) di mana pun, `xs` (12 px) dilarang untuk isi; yang menentukan keputusan (judul, label, nilai, status, tombol) ≥ `md` (16 px); `sm` hanya metadata sekunder (waktu, ID). Bobot judul 700, teks isi 400, tanpa huruf kapital semua, tanpa miring untuk kalimat. Tinggi baris bawaan 1,55 (`--mantine-line-height-md`) dipertahankan (≥ 1,5, selaras SC 1.4.12). Lebar paragraf ≤ 70 karakter (`maw="70ch"`, satuan `ch` tidak ikut `scale`).

#### 3.2.2 Kontrol, jarak, radius

| Token | Nilai (Normal) | Props Mantine | Dasar |
|---|---|---|---|
| Tinggi kontrol minimum | **44 px**; utama 50 px | Button/Input/Select `size="lg"` (50); ActionIcon `size="xl"` (44) | SC 2.5.5 [W 2.5.5]; lantai 24 px [W 2.5.8] |
| Ikon di dalam kontrol | 24 px (`1.5em`) | `react-icons` pakai `size="1.5em"` (jebakan px: R05:12) | Ikut skala |
| Checkbox / Radio / Switch | indikator 30 px, **seluruh baris** dapat diklik, tinggi baris ≥ 44 | `size="lg"` + `label` | Dexterity [S3] |
| Baris daftar tugas/proyek | min-height 56 px, padding `sm` (12) | `mih={56}` | Beri ruang ketuk; **(R11)** |
| Jarak antar target | ≥ 12 px (`gap="sm"`); aksi destruktif dipisah ≥ 32 px atau di menu "Lainnya" | `gap="sm"` / `"xl"` | Hindari salah ketuk [W 2.5.8] |
| Radius | `md` 8 px kontrol dan kartu; `lg` 16 px modal; tanpa pill pada tombol | `defaultRadius: 'md'` (tetap bawaan) | Tidak ada syarat WCAG; konsistensi **(R11)** |
| Padding halaman | `p="md"` (16) minimum, bukan `sm` | AppShell `padding="md"` (sudah, `AppFrame.tsx:126`) | |
| Badge status | teks 16 px, tinggi 32 px, ikon 18 px | `Badge` `vars` (`--badge-fz`, `--badge-height`, `--badge-padding-x` ada di `Badge.mjs:21-23`) | T3 |

#### 3.2.3 Palet dan kontras (dihitung; AA teks = 4,5; non-teks = 3)

| Peran | Nilai (terang) | Pasangan | Rasio | Hasil |
|---|---|---|---|---|
| Teks isi | gray-9 `#212529` | `#fff` / `#f8f9fa` | 15,43 / 14,63 | AAA |
| Teks sekunder (menimpa `dimmed`; bawaan `#868e96` = 3,32 ✗) | gray-7 `#495057` | `#fff` / `#f1f3f5` | 8,18 / 7,35 | AAA |
| Placeholder (bawaan gray-5 = 2,07 ✗) | `#6b7280` | `#fff` | 4,83 | AA; **bukan pengganti label** |
| Garis input & tombol `default` (bawaan gray-4 = 1,49 ✗) | gray-6 `#868e96` | `#fff` / `#f8f9fa` | 3,32 / 3,15 | 3:1 |
| Primer terisi / hover | blue-8 `#1971c2` / blue-9 `#1864ab` | teks `#fff` | 5,02 / 6,09 | AA |
| Tautan & teks aksen | `#1971c2` | `#fff` / `#f8f9fa` | 5,02 / 4,76 | AA |
| Info (light) | `#1864ab` di `#d0ebff` | | 4,93 | AA |
| Bahaya terisi / hover | `danger[8]` `#c92a2a` / `[9]` `#a61e1e` | teks `#fff` | 5,46 / 7,43 | AA / AAA |
| Teks galat | `#c92a2a` | `#fff` / `#f8f9fa` | 5,46 / 5,18 | AA |
| Bahaya (light) | `#a61e1e` di `#ffe3e3` | | 6,14 | AA |
| Ok terisi / hover | `ok[8]` `#1b6e2f` / `[9]` `#14532d` | teks `#fff` | 6,33 / 9,11 | AA / AAA |
| Ok (light) | `#14532d` di `#d3f9d8` | | 7,94 | AAA |
| Waspada terisi | `warn[8]` `#8a4b00` | teks `#fff` | 6,80 | AA |
| Waspada (light) | `#6b3a00` di `#fff3bf` | | 8,44 | AAA |
| Netral (light) | `#343a40` di `#e9ecef` | | 9,70 | AAA |
| Ring fokus | blue-8 `#1971c2` | di atas `#fff` / `#f8f9fa` | 5,02 / 4,76 | 3:1 ✓ |

Mengapa `primaryShade: {light: 8, dark: 8}`: Mantine memakai satu shade untuk *semua* warna terisi (`get-css-color-variables.mjs`: `-filled` = `primaryShade`); pada shade 8 hanya biru (5,02) dan merah (4,51, pas-pasan) lolos, jadi hijau/kuning/jingga diganti palet `ok`/`warn`/`danger` yang saya susun (tuple 10 warna; shade 1 = latar light, 8 = terisi, 9 = teks light/hover; sisa shade mengikuti palet Mantine terdekat). *Mode gelap* (`defaultColorScheme="auto"`, `root.tsx:62,101`): teks `#C9C9C9` di `#242424` 9,37; tetapi `dimmed` bawaan gelap `#828282` 4,04 ✗ → timpa ke `dark-1` `#b8b8b8` 7,83; galat gelap bawaan red-8 3,44 ✗ → `red-4` 6,70; ring fokus gelap pakai blue-4 `#4dabf7` 6,27 (blue-8 hanya 3,09). Disabled dikecualikan dari SC 1.4.3 [W 1.4.3] tetapi harus tetap terbaca (gray-6 di `#f1f3f5` = 2,99).

#### 3.2.4 Fokus
Ring **3 px solid blue-8, offset 2 px**, hanya `:focus-visible`; tidak pernah `outline:none`. Mantine bawaan 2 px (`global.css:16-18`, `focusRing: "auto"`); lebarkan lewat CSS global untuk `.mantine-focus-auto:focus-visible` dan elemen non-Mantine (tautan). Bila ada header sticky, `scroll-padding-top` ≥ tinggi header agar fokus tidak tertutup [W 2.4.11]. Gerak: `respectReducedMotion: true`.

#### 3.2.5 Warna status bukan satu-satunya sinyal (ikon `react-icons/fi`, sudah dipakai di `AppFrame.tsx`)

| Konsep | Label (dari desain) | Ikon | Token |
|---|---|---|---|
| Kondisi proyek | Lancar · Perlu perhatian · Terlambat (+ satu kalimat alasan) | `FiCheckCircle` · `FiAlertTriangle` · `FiClock` | ok · warn · danger |
| Status tugas | Belum dikerjakan · Sedang dikerjakan · Menunggu diperiksa · Selesai · Dibatalkan | `FiCircle` · `FiPlayCircle` · `FiEye` · `FiCheckCircle` · `FiXCircle` | netral · biru · warn · ok · netral |
| Prioritas | Rendah · Sedang · Tinggi · Kritis | `FiArrowDown` · `FiMinus` · `FiArrowUp` · `FiAlertOctagon` | netral · biru · warn · danger |
| Verifikasi email | Terverifikasi · Belum diverifikasi | `FiCheckCircle` · `FiAlertTriangle` (sudah, `ProfileHeader.tsx:34-48`) | ok · warn |

Teks selalu tampil di samping ikon (bukan Tooltip); dua status berbeda tidak boleh sama ikon dan sama bentuk walau beda warna.

#### 3.2.6 Bentuk implementasi (pecah agar tiap file ≤ 100 baris, aturan Config)
`app/lib/theme.ts` (fungsi `buildTheme(scale)`), `theme-palette.ts` (tuple `ok/warn/danger`), `theme-components.ts` (defaultProps), `theme-vars.ts` (`cssVariablesResolver`), `theme.css` (ring, `--input-bd`). Cuplikan inti:

```ts
export const TEXT_SCALE = { normal: 1, large: 1.25, xlarge: 1.5 } as const; // ASUMSI: uji 2-3 lansia
export const buildTheme = (scale: number) => createTheme({
  scale, primaryColor: 'blue', primaryShade: { light: 8, dark: 8 },
  colors: { ok, warn, danger }, respectReducedMotion: true,
  components: {
    Button: { defaultProps: { size: 'lg' } }, ActionIcon: { defaultProps: { size: 'xl' } },
    TextInput: { defaultProps: { size: 'lg' } }, /* idem PasswordInput, Select, Textarea, NumberInput */
    Checkbox: { defaultProps: { size: 'lg' } }, /* idem Radio, Switch */
    Badge: { defaultProps: { size: 'lg' },
      vars: () => ({ root: { '--badge-fz': rem(16), '--badge-height': rem(32), '--badge-padding-x': rem(12) } }) },
  },
});
export const cssVariablesResolver: CSSVariablesResolver = () => ({ variables: {}, dark: { '--mantine-color-dimmed': 'var(--mantine-color-dark-1)', '--mantine-color-error': 'var(--mantine-color-red-4)' },
  light: { '--mantine-color-dimmed': 'var(--mantine-color-gray-7)', '--mantine-color-placeholder': '#6b7280' } });
```
Tuple palet kustom (indeks 0-9; Mantine memakai 0/1 sebagai latar, 4 sebagai teks mode gelap, 8 terisi, 9 teks light/hover; `blue` bawaan dipakai apa adanya):
```ts
const ok:     MantineColorsTuple = ['#ebfbee','#d3f9d8','#b2f2bb','#8ce99a','#69db7c','#51cf66','#2f9e44','#237a38','#1b6e2f','#14532d'];
const warn:   MantineColorsTuple = ['#fff9db','#fff3bf','#ffec99','#ffe066','#ffd43b','#fcc419','#f59f00','#b36200','#8a4b00','#6b3a00'];
const danger: MantineColorsTuple = ['#fff5f5','#ffe3e3','#ffc9c9','#ffa8a8','#ff8787','#ff6b6b','#e03131','#d12c2c','#c92a2a','#a61e1e'];
```
Shade 8/9/1/0 sudah dihitung pada tabel di atas; shade lain hanya pengisi dan belum dihitung (pasangan mode gelap perlu dihitung penuh bila mode gelap diaktifkan, Q6).

**Belum terverifikasi (spike 0,5 hari):** (1) `--input-bd` diatur di `Input.css:103` (gray-4, tidak lewat `--mantine-color-default-border`), jadi garis input harus ditimpa lewat CSS global yang tidak mematikan state galat/fokus; (2) gaya fokus `Input` (hanya warna garis?) cukup terlihat; (3) `cssVariablesResolver` memengaruhi variabel turunan; (4) `Badge` `vars` memakai `rem()` di dalam `scale`.

### 3.3 (c) Aturan komponen

| # | Situasi | Aturan (angka bila ada) | Dasar |
|---|---|---|---|
| K1 | Tombol utama | **Satu** tombol `filled` `lg` per layar atau dialog; sekunder `default`; tersier `subtle`; aksi bahaya `color="danger"` dan tidak pernah jadi tombol utama bawaan. Kekecualian: tombol "langkah berikutnya" per baris daftar (`03-tugas.md` #16) memakai `light`, bukan `filled` | **(R11)**, selaras NN/g pilihan jelas [S9] |
| K2 | Label tombol | Kata kerja + objek, ≤ 3 kata: "Simpan tugas", "Hapus permanen". Dilarang "OK", "Ya/Tidak", "Submit", "Kirim" saja | NN/g: pilihan respons merangkum akibat [S9]; CLAUDE.md "Konsistensi Bahasa UI" |
| K3 | Jumlah pilihan | Per layar: 1 primer + ≤ 2 sekunder terlihat, sisanya menu "Lainnya" (tanpa Tooltip di `Menu.Target`, CLAUDE.md). Satu keputusan: ≤ 5 opsi → Radio/`SegmentedControl`; 6-7 → `Select`; > 7 → `Select` `searchable`. Chip saring ≤ 5. Sidebar tetap 8 menu, tidak ditambah | **(R11)**; alasan: memori jangka pendek dan mudah teralih [S3] |
| K4 | Form | Label selalu terlihat di atas kolom (bukan placeholder/floating); contoh format di `description` ("Contoh: 31 Okt 2026"); ≤ 5 kolom wajib di layar pertama, sisanya "Tambah detail lain" (pola `05-events.md` #13); `autoComplete` dan `inputMode` terisi; tanggal boleh diketik **dan** ada tombol cepat | SC 3.3.2, 1.3.5, 3.3.7; NN/g (lansia ingin mengetik tanggal) [S4] |
| K5 | Validasi & galat | Saat kirim atau `blur`, bukan tiap ketikan; pesan di bawah kolom dengan ikon `FiAlertCircle` + warna; > 1 galat → `Alert` ringkasan di atas form dan fokus pindah ke sana ("Perbaiki 2 isian di bawah"); **isian pengguna tidak boleh terhapus** | SC 3.3.1, 3.3.3 [W 3.3.3]; NN/g [S5] |
| K6 | Konfirmasi (3 tingkat) | **T1 Urungkan, tanpa dialog**: hapus tugas/event/lampiran ke Sampah, arsipkan. **T2 dialog ringan**: hapus proyek (sebut "Termasuk N tugas dan M event", `08-sampah.md` #9), keluarkan anggota, ubah peran akun/proyek, Batalkan/Kembalikan (sudah modal alasan). **T3 dialog berat** (ketik nama/email): hapus permanen, hapus akun (sudah ada, `DangerZoneCard.tsx`), nonaktifkan pengguna. Isi dialog: judul = pertanyaan menyebut nama objek; 1-2 kalimat dampak + "bisa/tidak bisa dikembalikan"; dua tombol berlabel kata kerja (kanan aksi, kiri "Jangan hapus"/"Batal"); fokus awal pada tombol aman; Escape dan klik luar = batal (kecuali T3) | NN/g: jangan konfirmasi aksi rutin, spesifik, sediakan undo [S9]; SC 3.3.4. **Bentrok CLAUDE.md "UX §1" untuk T1 (Q1)** |
| K7 | Pesan galat | Tiga tingkat: dalam kolom; dalam bagian halaman (`Alert` + tombol "Coba lagi"); sistem (toast manual). Format: apa yang gagal + penyebab bila diketahui + langkah. Dilarang menampilkan `error.message` mentah atau kode; pemetaan `code` API (`{error, code, status, requestId}`, CLAUDE.md) → teks Indonesia; `requestId` hanya di bagian "Detail untuk bantuan" yang dilipat | NN/g: bahasa manusia, kode hanya untuk diagnosis [S5]; T6 |
| K8 | Keadaan kosong | Ikon 48 px + judul ≤ 6 kata + 1 kalimat + **satu** tombol (atau siapa yang bisa menambah, bila peran tak berhak). Bedakan *kosong awal* dari *hasil saring kosong* ("Tidak ada tugas yang cocok. [Hapus saringan]") | NN/g: status sistem, petunjuk belajar, jalur langsung [S10]; CLAUDE.md UX §4 |
| K9 | Memuat | < 0,1 dtk tanpa indikator; > 1 dtk tombol `loading` + `Skeleton`; > 10 dtk tambahkan teks "Masih memuat…" dan tombol "Coba lagi"; tombol nonaktif selama simpan; jangan mengosongkan layar | NN/g tiga batas waktu 0,1/1/10 dtk [S11] |
| K10 | Urungkan | Toast "… dipindah ke Sampah · **Urungkan**" `autoClose: 10000`; tombol ≥ 44 px terlihat tanpa hover; setelah toast hilang tetap bisa dari Sampah 30 hari | `08-sampah.md` #3; NN/g [S8]; D10 |
| K11 | Toast | Sukses `autoClose: 7000`; galat dan peringatan penting `autoClose: false` + tombol tutup; maksimal 2 tampil (`limit={2}`); ≤ 2 baris; Mantine menjeda saat hover/fokus saja (`NotificationContainer.mjs:94`). Posisi `bottom-center` **(R11)**, karena `top-right` jauh dari tombol yang baru diketuk di tablet | SC 2.2.1 [W 2.2.1], 4.1.3 |
| K12 | Hover | Tidak ada informasi atau aksi yang *hanya* muncul saat hover; Tooltip hanya pelengkap ikon (T10); ikon tanpa teks dilarang untuk aksi utama | `02-proyek.md:15` |
| K13 | Navigasi | 8 menu tetap, ikon + teks ≥ 16 px, urutan tidak berubah antar role (menu role lain disembunyikan, bukan dipindah); item aktif = warna + garis tepi + `aria-current="page"`; satu `h1` per halaman; tombol "Kembali" eksplisit di detail; tautan "Butuh bantuan?" posisi tetap | SC 3.2.3, 3.2.6 [W 3.2.6] |
| K14 | Seret & lepas | Kanban/urut ulang wajib alternatif tombol "Pindahkan ke…" | SC 2.5.7 [W 2.5.7] |
| K15 | Tabel | Tampak ≤ 5 kolom: Tugas · Status + langkah berikutnya · Mengerjakan · Tenggat · Prioritas; kolom lain (Jenis, Tag, Tahapan, Pemeriksa) masuk detail. Desain Tugas punya 10 kolom (`03-tugas.md:207`) ⇒ **pangkas**. Seluruh baris dapat diketuk; < ambang §3.7 → kartu | `05-events.md` #14 (daftar ringkas), CLAUDE.md Mobile §2 |
| K16 | Tanggal | "31 Okt 2026" + keterangan relatif ("hari ini", "besok", "terlambat 2 hari") seperti contoh desain; zona waktu pengguna (`rememberTimeZone`, `root.tsx:98`) | `03-tugas.md:209` |

### 3.4 (d) Glosarium istilah Indonesia baku untuk seluruh aplikasi

Prinsip: satu konsep = satu kata di semua layar (SC 3.2.4); kata Inggris hanya bila sudah diputuskan user atau tidak ada padanan yang dikenal awam. Sumber kebakuan: KBBI (daring, cermin `kbbi.web.id`; hanya **tenggat** "batas waktu" dan **pratinjau** "tinjauan pendahuluan" yang sempat saya verifikasi, [S12]); kata lain bertanda **(usul)** = pilihan R11 yang belum diverifikasi ke KBBI/Badan Bahasa dan butuh persetujuan (Q3). Sapaan: **Anda** (sudah dipakai desain, `02-proyek.md` ②).

**A. Objek dan peran**

| Pakai | Jangan pakai | Catatan |
|---|---|---|
| Proyek · Tugas · Tahapan | project, task/ticket/card, phase/fase/stage | `02-proyek.md` #7; "Tahapan" menggabung fase+milestone |
| Tenggat | deadline, due date, batas akhir | KBBI [S12] |
| Target penting **(usul)** | Milestone, tonggak | Desain: "Milestone" (12×). Alternatif "Tonggak" kurang dikenal awam |
| Pengelola utama **(usul)** | Lead, owner | Desain: "Lead" (19×) = satu Pengelola yang tampil di header |
| Yang mengerjakan · Pembuat · Pemeriksa | assignee/PIC, reporter, reviewer | Kolom desain "Mengerjakan" |
| Jenis · Penanda **(usul)** | type; Tag, label | "Tag" (27×) diputuskan *dipakai* (`03-tugas.md` #13), kata bebas |
| Daftar periksa · Komentar · Bukti · Berkas | checklist, comment, evidence, file/attachment | |
| Pemberitahuan | notifikasi, notification, alert | Desain memakai keduanya; pilih satu |
| Sampah · Pulihkan · Hapus permanen | trash/recycle bin/archive, restore, purge | `08-sampah.md` |
| Tim · Pengaturan · Beranda · Profil | team/org, settings, home/dashboard, profile | `app/routes/app/layout.tsx:20,24,27` memakai Profile/Dashboard |
| **Inbox** · **Events** (dipertahankan user) | Kotak masuk, Acara | Pakai keterangan di judul halaman: "Inbox — kabar untuk Anda"; "Events — rapat dan acara tim" (subjudul sudah ada, `05-events.md` #1) |
| Jenis default "Bug" (dipertahankan, R10:35) | — | Kategori dasar tetap "Masalah"; bantuan teks: "Bug = ada yang rusak atau tidak berjalan" |
| **Peran akun**: Admin · Manajer Proyek · Anggota tim | Project Manager/PM, Member, Role | `00-role-dan-area.md:12-15` memakai label Inggris; "Super-admin" hanya tampil di `/dev` |
| **Peran di proyek**: Pengelola · Anggota · Pemantau | manager, member, viewer, guest, read-only | `02-proyek.md` #11. "Anggota" muncul di dua tingkat ⇒ selalu tulis "peran akun" vs "peran di proyek" |

**B. Status, prioritas, kondisi (nilai dikunci dari desain; jangan diubah per layar)**

| Konsep | Nilai | Hindari |
|---|---|---|
| Status proyek | Draf · Berjalan · Ditunda · Selesai · Dibatalkan | Aktif, On hold, Closed, Done |
| Status tahapan | Belum mulai · Berjalan · Selesai | In progress |
| Status tugas | Belum dikerjakan · Sedang dikerjakan · Menunggu diperiksa · Selesai · Dibatalkan | To do, Doing, In review, Blocked |
| Prioritas | Rendah · Sedang · Tinggi · Kritis | Low/High, Urgent, P1, ASAP |
| Kondisi (dihitung sistem) | Lancar · Perlu perhatian · Terlambat | Sehat/Berisiko, On track, At risk, Overdue |
| Target penting | Tercapai · Terlewat · Menunggu | |
| Akun | Menunggu · Disetujui · Ditolak · Dinonaktifkan | Pending, Approved, Banned, Suspended |

Aturan: **Status** = dipilih manusia, **Kondisi** = dihitung sistem (`02-proyek.md` #12). "Berjalan" hanya untuk proyek/tahapan, "Sedang dikerjakan" hanya untuk tugas. "Terlambat" selalu berarti "lewat tenggat" (kondisi proyek dan penanda tugas).

**C. Aksi dan kata umum**

| Pakai | Jangan pakai |
|---|---|
| Masuk · Keluar · Masuk dengan Google | Login, Logout, Sign in |
| Simpan · Batal · Hapus · Urungkan · Pulihkan · Ubah · Tambah/Buat | Submit, Cancel, Delete, Undo, Edit, Add |
| Unggah · Unduh · Pratinjau (KBBI [S12]) · Draf · Templat **(usul)** | Upload, Download, Preview, Draft, Template |
| Saring **(usul)** · Cari · Muat ulang · Atur ulang | Filter, Search, Refresh, Reset |
| Daftar · Papan | List, Kanban |
| Setujui · Tolak · Kembalikan · Minta diperiksa · Tandai selesai · Mulai kerjakan · Tugaskan ke | Approve, Reject, Return, Assign, Review |
| Kata sandi | Password (`DangerZoneCard.tsx:53`) |
| Email **(keputusan Q3)** | Surel (baku, tetapi jarang dikenal; pakai "Email" demi lansia) |
| Jendela · Kotak isian · Saklar · Foto profil | Modal/popup, Input/field, Toggle, Avatar |

**D. DILARANG di layar `/app` dan padanannya**

| Dilarang | Ganti | Dilarang | Ganti |
|---|---|---|---|
| backlog | Daftar tugas menunggu | sprint | Periode kerja (contoh event "Sprint review" ⇒ "Evaluasi periode kerja") |
| assignee, PIC | yang mengerjakan, penanggung jawab | stakeholder | pihak terkait |
| deliverable | hasil kerja | blocker | penghambat |
| scope | cakupan (sudah dipakai desain) | roadmap | rencana besar |
| epic, story | kelompok tugas | kickoff / standup | rapat pembuka / rapat singkat |
| retro(spective) | evaluasi | burndown / Gantt | grafik sisa pekerjaan / bagan jadwal |
| workflow | alur kerja | dashboard, widget | beranda atau ringkasan, kotak info |
| mention | menyebut | reminder / follow-up | pengingat / tindak lanjut |
| ticket, issue | tugas, masalah | sync | samakan data |
| error, oops, "terjadi kesalahan" | gagal + sebab | OK / Ya / Tidak sebagai tombol | kata kerja (K2) |
| N/A, TBD | Tidak ada, Belum ditentukan | slug, ID, token, API key | tidak pernah tampil di `/app` (hanya `/dev`) |

**Tata kelola.** (1) Satu berkas label `app/lib/labels.ts` (≤ 200 baris; peta enum → label, selaras `server/pm/enums.ts` di R02:134) sehingga label tidak di-hardcode (aturan global 15). (2) Tes `tests/copy-glossary.test.ts` memindai `app/routes/app/**` dan `app/components/**` untuk kata di tabel D (pola `readme-endpoint.test.ts`). (3) "Berhenti impersonasi" (`AppFrame.tsx:170`) ada di area admin ⇒ "Berhenti masuk sebagai pengguna ini".

### 3.5 (e) Pola salinan (microcopy) untuk 12 situasi

Suara: "Anda", kalimat aktif, ≤ 20 kata, satu gagasan per kalimat, tanpa "!" dan "Oops", tidak menyalahkan pengguna. Tombol = kata kerja + objek.

| # | Situasi | Rumus | Contoh |
|---|---|---|---|
| 1 | Sukses simpan | [Objek] + [sudah disimpan]. | "Profil disimpan." (sudah, `ProfileForm.tsx:40`); bukan "Berhasil!" |
| 2 | Galat jaringan/server | Apa gagal. Sebab bila tahu. Langkah. + [Coba lagi] | "Tugas belum tersimpan. Koneksi internet terputus. Isian Anda masih ada; tekan Coba lagi." |
| 3 | Validasi kolom | [Kolom] + [aturan] + contoh | "Judul tugas wajib diisi." · "Tenggat baru harus setelah 31 Okt 2026." |
| 4 | Hapus ke Sampah (T1) | "[Nama]" dipindah ke Sampah. [Urungkan] | "Tugas "Fix login SSO" dipindah ke Sampah. Urungkan" |
| 5 | Hapus permanen (T3) | Judul: Hapus permanen "[nama]"? Isi: dampak. Tombol: [Hapus permanen] / [Jangan hapus] | "Hapus permanen proyek "Atlas"? Termasuk 12 tugas dan 3 event. Ini tidak bisa dikembalikan." |
| 6 | Perubahan belum disimpan | Fakta + 3 pilihan berlabel | "Perubahan belum disimpan." [Simpan dan keluar] [Buang perubahan] [Lanjut mengedit] |
| 7 | Kosong awal | Belum ada [X]. Manfaat. [Tombol] | "Belum ada tugas. Tambahkan tugas pertama agar tim tahu apa yang dikerjakan." [Tambah tugas] |
| 8 | Kosong karena saringan | Tidak ada [X] yang cocok. [Hapus saringan] | "Tidak ada tugas yang cocok dengan saringan ini." |
| 9 | Memuat lambat (> 10 dtk) | Status + sebab + opsi | "Masih memuat tugas. Koneksi sedang lambat." [Coba lagi] |
| 10 | Tidak berwenang | Anda belum bisa [aksi]. Siapa yang bisa. | "Hanya Pengelola proyek yang bisa mengubah tenggat. Hubungi Pengelola utama: Nico." (tombol tetap terlihat, nonaktif, alasan tertulis di bawahnya) |
| 11 | Halaman tidak ditemukan | Halaman tidak ditemukan. Sebab. [Ke Beranda] | "Halaman ini tidak ditemukan. Mungkin sudah dipindah atau dihapus." |
| 12 | Akun menunggu persetujuan | Status + langkah berikut | "Akun Anda menunggu persetujuan Admin. Anda bisa masuk setelah disetujui." (halaman tahan, selaras `/banned`) |

### 3.6 (f) Checklist per layar untuk reviewer

Jalankan di **setiap layar baru atau yang diubah**, pada 3 ukuran teks (Normal/Besar/Sangat besar). Cara cek memakai DevTools biasa; angka ukuran pada skala Normal. Lulus = semua baris terisi.

| ID | Periksa | Cara cek | Dasar |
|---|---|---|---|
| C01 | Tidak ada teks < 14 px; isi keputusan ≥ 16 px | Computed `font-size` | §3.2.1 |
| C02 | Semua kontrol interaktif ≥ 44×44 px (lantai mutlak 24) | Ukur kotak elemen | [W 2.5.5], [W 2.5.8] |
| C03 | Jarak antar target ≥ 12 px; aksi bahaya terpisah dari aksi utama | Visual + ukur | §3.2.2 |
| C04 | Besar & Sangat besar: tidak ada teks terpotong/bertumpuk, tombol tidak keluar layar, tidak ada tinggi tetap | Ganti ukuran teks, gulir | [W 1.4.4], [W 1.4.12] |
| C05 | Zoom browser 200% pada Normal tanpa kehilangan fungsi | Ctrl +, lebar 1280 | [W 1.4.4] |
| C06 | Lebar 768 dan 1024 (tegak/mendatar) × 3 ukuran teks: sidebar/drawer sesuai §3.7, tanpa gulir horizontal halaman | Mode responsif | §3.7, [W 1.4.10] |
| C07 | Kontras teks ≥ 4,5:1 (≥ 3:1 untuk ≥ 24 px) | Pemilih warna DevTools | [W 1.4.3] |
| C08 | Garis input, ikon bermakna, ring fokus ≥ 3:1 | Pemilih warna | [W 1.4.11] |
| C09 | Setiap status/kondisi/prioritas punya ikon + teks; tetap terbaca dalam skala abu-abu | DevTools: emulasi achromatopsia | [W 1.4.1] |
| C10 | Tidak ada `c="dimmed"`/Badge kuning/hijau/teal bawaan di luar token §3.2.3 | `grep` di `app/` | T4 |
| C11 | Mode gelap (bila `auto` dipertahankan): pasangan gelap §3.2.3 lulus | Emulasi `prefers-color-scheme` | §3.2.3 |
| C12 | Tab berurutan sesuai tampilan; ring fokus 3 px terlihat, tidak tertutup header/toast | Keyboard | [W 2.4.11] |
| C13 | Semua fungsi jalan tanpa hover dan tanpa seret | Lepas mouse; cari "Pindahkan ke…" | [W 2.5.7], K12 |
| C14 | Dialog: fokus masuk, Escape menutup (kecuali T3), fokus kembali ke pemicu | Keyboard | K6 |
| C15 | Tes `copy-glossary` hijau; tidak ada kata dari tabel D | `bun run test` | §3.4 |
| C16 | Status/peran/prioritas memakai kata persis glosarium | Baca layar | §3.4 B |
| C17 | Kalimat ≤ 20 kata, "Anda", tombol kata kerja + objek, tanpa OK/Ya/Tidak | Baca layar | K2, §3.5 |
| C18 | `lang="id"`, `<title>` "Halaman — Simple PM", satu `h1` | Inspeksi | SC 3.1.1 [S1] |
| C19 | Tepat satu tombol utama (`filled` `lg`) | Hitung | K1 |
| C20 | ≤ 1 primer + ≤ 2 sekunder terlihat; chip saring ≤ 5; satu keputusan ≤ 5 opsi | Hitung | K3 |
| C21 | Aksi async: tombol `loading` dan nonaktif; sukses/gagal terlihat | Perlambat jaringan | CLAUDE.md UX §2-3 |
| C22 | Hapus mengikuti T1/T2/T3; Urungkan 10 dtk bekerja; item muncul di Sampah | Coba hapus | K6, K10 |
| C23 | Toast: sukses 7 dtk, galat tetap sampai ditutup, ≤ 2 baris, ≤ 2 tampil | Picu keduanya | K11 |
| C24 | Galat form di bawah kolom; ringkasan bila > 1; isian tidak hilang | Kirim form salah | K5 |
| C25 | Kosong awal dan kosong-saringan punya pesan + arah | Kosongkan data | K8 |
| C26 | Skeleton setelah 1 dtk; pesan "Masih memuat" setelah 10 dtk | Throttle jaringan | K9 |
| C27 | Tombol nonaktif punya alasan tertulis (bukan hanya Tooltip) | Masuk sebagai Member | K12, CLAUDE.md UX §5 |
| C28 | Tabel ≤ 5 kolom; kartu di bawah ambang; baris dapat diketuk penuh | Ubah lebar | K15 |
| C29 | Menu dan urutannya sama di tiap halaman; "Butuh bantuan?" di tempat tetap | Bandingkan 2 halaman | [W 3.2.6] |
| C30 | Form: label di atas, contoh format, `autoComplete`/`inputMode`, ≤ 5 wajib di layar awal | Inspeksi | K4 |
| C31 | Skenario awam R09 (< 2 menit) berhasil oleh ≥ 1 orang lanjut usia pada ukuran teks pilihannya; catat salah ketuk | Uji manusia | `R09-tes-qa.md:211` |

### 3.7 (g) Dampak ukuran "Sangat besar" pada tablet 768-1024 px

**Masalah inti.** Kueri media Mantine memakai `em` terhadap ukuran font awal browser, bukan `--mantine-scale` (perilaku CSS standar; ASUMSI, belum diuji di browser). Maka pada skala 1,5 layar 768 px *masih dianggap* "≥ sm" dan menampilkan sidebar 372 px (`AppFrame.tsx:40,121-125`), konten tinggal 348 px (= 232 px dalam ukuran Normal, lebih sempit dari ponsel). Zoom browser sendiri tidak bermasalah karena ikut mengecilkan viewport CSS.

Lebar konten (px; dalam kurung = setara Normal, yaitu ÷ skala). Rumus: sidebar = `lebar − 248×s − 2×16×s`; drawer = `lebar − 2×16×s`.

| Lebar layar | Normal | Besar kini | **Besar usulan** (pindah di `md` 992) | Sangat besar kini | **Sangat besar usulan** (pindah di `lg` 1200) |
|---|---|---|---|---|---|
| 768 | sidebar 488 | sidebar 418 (334) | drawer 728 (582) | sidebar 348 (232) | drawer 720 (480) |
| 834 | sidebar 554 | sidebar 484 (387) | drawer 794 (635) | sidebar 414 (276) | drawer 786 (524) |
| 1024 | sidebar 744 | sidebar 674 (539) | sidebar 674 (539) | sidebar 604 (403) | drawer 976 (651) |
| 1194 | sidebar 914 | sidebar 844 (675) | sidebar 844 (675) | sidebar 774 (516) | drawer 1146 (764) |

**Rancangan agar tidak rusak** (semua **(R11)**; ambang dalam px setara Normal, ASUMSI sampai diuji):
1. **Breakpoint dinamis**: `useTextSize()` memberi `scale` dan `bp = 'sm' | 'md' | 'lg'` (untuk 1,0 / 1,25 / 1,5). Pakai `bp` pada `AppShell navbar.breakpoint` dan `visibleFrom`/`hiddenFrom`. Grid responsif Mantine (`cols={{ base:1, sm:2 }}`) juga memakai `em` ⇒ pakai `bp` atau `useEffectiveWidth(ref)` = `lebar ÷ scale`. Kueri CSS tidak bisa membaca `var()`, jadi ini harus lewat JS.
2. **Sidebar penuh hanya bila konten ≥ 480** (nilai Normal pada 768). Di bawahnya drawer dengan header Burger (pola `AppFrame.tsx:119-151`, dipertahankan); Burger diperbesar agar area ketuk 44 px.
3. **Daftar tugas** ≤ 5 kolom bila lebar efektif ≥ 640, kartu bila kurang (K15). Tabel Admin ≥ 4 kolom ikut CLAUDE.md Mobile §2.
4. **Kalender bulan** (Events) butuh ≥ 640; di bawahnya otomatis "Pekan"/"Daftar". **Papan Kanban** butuh ≥ 900 (3 kolom × 280); di bawahnya tombol Papan nonaktif dengan alasan tertulis ("Papan tersedia di layar lebih lebar"); Daftar tetap ada.
5. **Tanpa tinggi/lebar tetap**: `mih`, bukan `h`, pada kartu/baris/Badge; `maw` numerik ikut diskala (R05:12), jangan dihitung dua kali. Badge status boleh dua baris ("Menunggu diperiksa" ± 290 px pada 1,5).
6. **Judul tugas tidak dipotong elipsis** pada Besar+; boleh membungkus sampai 2 baris (`lineClamp={2}`) dengan teks lengkap di detail; elipsis hanya untuk metadata (`TruncatedText`). Tidak boleh ada isi yang hilang [W 1.4.4].
7. **Modal** ukuran `md`; bila lebar efektif < 480 ⇒ `fullScreen`, isi dapat digulir, tombol utama menempel di bawah (sticky) dengan `scroll-padding-bottom` agar fokus tidak tertutup [W 2.4.11]. Modal `lg` (620 → 930 px pada 1,5) melebihi layar 768 ⇒ jangan dipakai.
8. **Toolbar halaman**: judul + tombol selalu `wrap="wrap"` (CLAUDE.md Mobile §3), maksimal 1 primer + 2 sekunder (K3).
9. **Tinggi layar**: pada 1,5 satu layar memuat jauh lebih sedikit; aksi utama form ≤ 5 kolom tidak boleh di bawah lipatan.
10. **Ikon** `size="1.5em"` (jebakan `size={14}` px, R05:12) dan tombol ikon `xl`.

**Alternatif ditolak**: (a) Sangat besar hanya di layar ≥ 1200 (opsi tak berguna di tablet, target utama); (b) mengunci sidebar ciut 72 → 108 px (label 11 px prototipe tak terbaca, `wf.css:37`); (c) menaikkan `html{font-size}` (tidak mengubah kueri media `em`, dan Mantine hanya menyesuaikan lewat `scale`, [S6]).

**Matriks uji tablet**: {768×1024, 1024×768, 834×1194, 1194×834} × {1,0 · 1,25 · 1,5}; plus zoom browser 200% pada 1280×800 (= 640 CSS px; skala 1,5 ⇒ 427 setara) dan zoom 400% (320 CSS px; 213 setara: wajib kolom tunggal, gulir vertikal saja, [W 1.4.10]). Kombinasi paling berat: skala 1,5 × zoom 200% × halaman Tugas.

## 4. Risiko dan mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Skala 1,5 memecah layout (breakpoint `em`, tabel, modal) | Tinggi | Tinggi | Breakpoint dinamis dan `useEffectiveWidth` (§3.7); matriks uji tablet; spike 0,5 hari sebelum UI dibangun (selaras spike R08) |
| Nilai skala 1/1,25/1,5 terlalu besar atau kecil, dan berbeda dari R08 | Sedang | Sedang | Konstanta bernama `TEXT_SCALE` (satu baris diubah); uji 2-3 lansia sebelum rilis; Q2 |
| Override garis input/warna merusak state galat, fokus, atau komponen Mantine lain | Sedang | Sedang | Spike §3.2.6 (4 butir); snapshot UI di `tests/ui` (R09 E6); override lewat `cssVariablesResolver`, bukan CSS acak |
| Aturan konfirmasi bentrok antara CLAUDE.md dan desain, agen/developer terblokir atau tidak konsisten | Tinggi | Sedang | Q1; ubah CLAUDE.md "UX §1" di commit yang sama dengan keputusan; tes menjaga T3 selalu ber-dialog |
| Istilah baru ("Target penting", "Penanda", "Pengelola utama", "Saring") tidak dikenal awam atau tidak baku | Sedang | Sedang | Hanya sebagai usul; semua di `labels.ts` (satu tempat); uji pemahaman 5 orang; Q3 |
| Kontrol 50 px dan Badge 32 px membuat layar padat/boros ruang, kurang efisien bagi pengguna desktop mahir | Sedang | Sedang | Tema besar hanya di `/app` dan halaman tahan/login (Q4); `/dev` boleh kompak lewat `MantineThemeProvider` bersarang (ASUMSI, belum diuji) |
| Kontras dihitung manual (rumus WCAG), tidak diuji di browser nyata (alpha, hover, mode gelap) | Sedang | Sedang | Audit axe/Lighthouse oleh reviewer pada checklist C07-C11; tidak mengklaim kepatuhan penuh |
| Perilaku `em` pada kueri media dan `Badge.vars` dianggap benar tetapi belum diuji | Sedang | Sedang | Ditandai ASUMSI; spike §3.2.6 dan §3.7 membuktikan di browser |
| Zoom browser × skala teks menggandakan pembesaran | Rendah | Sedang | Dokumentasikan; jangan menambah kontrol zoom sendiri; uji kombinasi terberat (§3.7) |
| Toast `bottom-center` menimpa bilah aksi sticky atau tombol Urungkan | Sedang | Rendah | Offset toast di atas bilah sticky; uji pada C23 |
| Tes `copy-glossary` memunculkan positif palsu (kata dalam komentar/kode) | Sedang | Rendah | Pindai hanya literal string JSX dan nilai `label`/`title`/`message` |
| Kewajiban regulasi aksesibilitas Indonesia tidak diketahui | Rendah | Sedang | Q5; pedoman ini sudah sejajar WCAG 2.2 AA |

## 5. Estimasi usaha

Satuan hari-orang untuk pekerja AI; reviewer manusia 1 orang. Pekerjaan ini fondasi lintas layar (R10:68 menaruh "ukuran teks" di gelombang G1).

| Paket | Isi | Ukuran | AI | Reviewer |
|---|---|---|---|---|
| E1 Tema dan token | `theme*.ts` terpecah, palet, `defaultProps`, resolver, CSS ring, `lang="id"`, default Notifications; termasuk spike 0,5 hari | M | 2-3 | 0,5 |
| E2 Skala teks dan breakpoint | `TextSizeContext`, `useTextSize`/`useEffectiveWidth`, penyesuaian `AppFrame` (bergantung pada mekanisme cookie R05/R08) | S-M | 1-1,5 | 0,25 |
| E3 Perbaikan komponen yang ada | Burger/ActionIcon/Badge/Button di `AppFrame`, `ProfileHeader`, `ProfileForm`, `DangerZoneCard`; pemetaan teks galat | S | 1-1,5 | 0,25 |
| E4 Label dan glosarium | `labels.ts`, ganti istilah, tes `copy-glossary` | S-M | 1-2 | 0,5 |
| E5 Komponen UX bersama | `StatusBadge`, `EmptyState`, helper konfirmasi T1-T3, `UndoToast`, `FormErrorSummary` | M | 2-3 | 0,5 |
| E6 Dokumentasi | Koreksi CLAUDE.md (touch target, konfirmasi bertingkat) dan rujukan ke pedoman ini | S | 0,5 | 0,25 |
| E7 Uji | Matriks tablet, checklist C01-C31, uji 2-3 lansia (rekrut pengguna di luar estimasi) | M | 1-2 | 1-1,5 |
| **Total** | | **L** | **8,5-14** | **2,5-3,5** |

## 6. Pertanyaan terbuka untuk user

1. **Q1 Konfirmasi hapus.** Setuju hapus-ke-Sampah (tugas, event, lampiran) tanpa dialog, cukup Urungkan 10 dtk + Sampah 30 hari, sementara hapus proyek, keluarkan anggota, ubah peran, dan hapus permanen tetap berdialog? Ini mengubah CLAUDE.md "UX §1". Default saya: ya.
2. **Q2 Skala teks.** Pakai 1,0/1,25/1,5 (usul R11) atau 1,0/1,125/1,25 (asumsi R08)? Dan akun baru default Normal atau Besar (R08 Q8)? Default saya: 1,0/1,25/1,5, bawaan Normal, diuji dulu pada 2-3 lansia.
3. **Q3 Istilah.** Setujui usul "Target penting" (ganti Milestone), "Pengelola utama" (ganti Lead), "Penanda" (ganti Tag), "Saring" (ganti Filter), "Templat", tetap "Email" (bukan "Surel"), peran akun "Manajer Proyek"/"Anggota tim"? Dan tetap mempertahankan Inbox, Events, jenis "Bug" dengan keterangan Indonesia?
4. **Q4 Cakupan tema besar.** Hanya `/app` + login + halaman tahan, atau juga `/dashboard` Admin? `/dev` (super-admin) tetap kompak? Default saya: `/app`, login, halaman tahan, dan `/dashboard`.
5. **Q5 Regulasi.** Adakah kewajiban aksesibilitas (instansi/kontrak) yang harus dirujuk? Saya tidak dapat memverifikasi regulasi Indonesia di sesi ini.
6. **Q6 Mode gelap.** Pertahankan `defaultColorScheme="auto"` (`root.tsx:62,101`) atau paksa terang selama MVP agar lansia tidak tiba-tiba melihat tema gelap? Default saya: paksa terang; token gelap sudah dihitung bila diaktifkan nanti.
7. **Q7 Posisi toast.** `bottom-center` (usul) atau tetap `top-right`?
8. **Q8 Penguji.** Siapa 2-3 lansia untuk uji skala dan skenario R09, dan kapan?

## 7. Sumber

**Sumber primer web** (diambil dan dibaca di sesi ini; pencarian web gagal dengan galat API, jadi semua URL berasal dari pengetahuan sendiri lalu diambil langsung):
- S1 WCAG 2.2: https://www.w3.org/TR/WCAG22/
- S2 Understanding SC 2.5.8: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- S3 W3C WAI, Older Users: https://www.w3.org/WAI/older-users/ dan https://www.w3.org/WAI/older-users/developing/
- S4 NN/g, Usability for Older Adults: https://www.nngroup.com/articles/usability-for-senior-citizens/
- S5 NN/g, Error-Message Guidelines: https://www.nngroup.com/articles/error-message-guidelines/
- S6 Mantine: https://mantine.dev/styles/rem/ (`scale`), https://mantine.dev/theming/theme-object/, https://mantine.dev/core/app-shell/, https://mantine.dev/x/notifications/ (`autoClose` 4000, jeda saat hover)
- S7 Kode Mantine 9.6.0 terpasang (`node_modules/@mantine/core/styles.css`, `esm/core/MantineProvider/default-theme.mjs`, `default-colors.mjs`, `MantineCssVariables/get-css-color-variables.mjs`, `default-css-variables-resolver.mjs`, `styles/global.css`, `styles/Input.css`, `esm/components/Badge/Badge.mjs`, `esm/components/Notification/Notification.mjs`; `@mantine/notifications/esm/Notifications.mjs`, `NotificationContainer.mjs`)
- S8 NN/g, 10 Usability Heuristics (#3 kontrol pengguna, #9 galat): https://www.nngroup.com/articles/ten-usability-heuristics/
- S9 NN/g, Confirmation Dialogs: https://www.nngroup.com/articles/confirmation-dialog/
- S10 NN/g, Empty States: https://www.nngroup.com/articles/empty-state-interface-design/
- S11 NN/g, Response Times (0,1/1/10 dtk): https://www.nngroup.com/articles/response-times-3-important-limits/
- S12 KBBI daring (cermin pihak ketiga; kbbi.kemdikbud.go.id tidak terjangkau dari sandbox): https://kbbi.web.id/tenggat, https://kbbi.web.id/pratinjau

**`[W x.y.z]`** = `https://www.w3.org/WAI/WCAG22/Understanding/<slug>.html`, slug: 1.4.1 `use-of-color` · 1.4.3 `contrast-minimum` · 1.4.4 `resize-text` · 1.4.10 `reflow` · 1.4.11 `non-text-contrast` · 1.4.12 `text-spacing` · 2.2.1 `timing-adjustable` · 2.4.11 `focus-not-obscured-minimum` · 2.5.5 `target-size-enhanced` · 2.5.7 `dragging-movements` · 2.5.8 `target-size-minimum` · 3.2.6 `consistent-help` · 3.3.3 `error-suggestion` · 3.3.4 `error-prevention-legal-financial-data` · 3.3.7 `redundant-entry` · 3.3.8 `accessible-authentication-minimum` · 4.1.3 `status-messages`.

**Dibaca di repo**: `CLAUDE.md` (UX, Mobile); `app/root.tsx`; `app/lib/theme.ts`; `app/components/AppFrame.tsx`; `app/components/profile/{ProfileHeader,ProfileForm,DangerZoneCard}.tsx`; `app/routes/app/layout.tsx` (baris 20-27); `tahapan-proyek/03-desain/erd/diskusi/{00,02,03,05,06,08}-*.md` (sebagian dengan `grep`/`sed`); `tahapan-proyek/04-prototype/prototype/wf.css`; laporan R02, R05, R08, R09, R10 (baris yang dirujuk saja). Perhitungan kontras dan lebar layar: skrip Node sekali pakai di sandbox, rumus WCAG 1.4.3.

**Tidak diverifikasi (ASUMSI)**: wireframe Penpot; laporan NN/g 87 pedoman (berbayar); regulasi aksesibilitas Indonesia; kebakuan KBBI selain *tenggat* dan *pratinjau*; kueri media `em` tidak mengikuti `--mantine-scale` (perilaku CSS standar, belum diuji di browser); override `--input-bd` dan `Badge.vars`; ambang lebar efektif 480/640/900 (hasil penalaran); nilai skala 1,25/1,5 (butuh uji pengguna); batas 7 dtk toast dan 10 dtk Urungkan (heuristik, bukan temuan riset); `MantineThemeProvider` bersarang untuk `/dev`.
