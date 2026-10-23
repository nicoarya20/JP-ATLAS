# JP Atlas - Design System / Internal Handoff v1.0

21 Oktober 2026. Paket siap dibagikan kepada tim desain, frontend dan komunikasi internal.

## Mulai di sini

1. Buka START-HERE.html untuk katalog offline; PDF untuk review atau dibagikan.
2. Instal Manrope-Variable.ttf pada komputer anggota tim. Lisensi asli OFL.txt disertakan.
3. Buka SVG di 04-Editable-Boards pada editor vektor yang mendukung SVG. Teks dan bentuk tetap objek native; logo merupakan PNG master tertanam, bukan hasil vector tracing.
4. Developer dapat memakai 03-Tokens/tokens.css dan tokens.json sebagai referensi. File CSS adalah ekspor token, bukan pengganti komponen/source aplikasi.

## Logo

Gunakan 01-Logo/JP-Atlas-Logo-Master.png, 1498 x 421 px, transparan. Rasio 3.558194774 : 1. Asli dipertahankan persis. Logo berhuruf putih memakai bidang identitas #0B1522 di tema terang. Subtitle Enterprise Resource Planning satu baris, sama pada ID/EN. Jangan menggambar ulang, recolor, stretch, menambah efek, mengganti huruf atau memotong wordmark. Favicon SVG existing adalah crop kompas berbasis PNG yang sudah tersedia; bukan logo master vektor.

Header 154 px; sidebar 180 px; specimen 230 px. Lebar minimum 120 px dan clear space 16 px adalah target kandidat untuk review, bukan minimum final universal. Logo SVG master resmi belum tersedia pada sumber yang diperiksa. SVG board adalah layout editable dengan gambar raster tertanam.

## Tipografi

Manrope variable 200-800; font asli dan lisensinya dipertahankan. Rekomendasi penggunaan dari pedoman: page 32px desktop/26px mobile weight 600; section 20px600; body 16px line-height 1.5; table 14px; metadata 12px; metric 32px weight 550 dengan tabular numerals. Regular 400, Medium 500, Semibold 600 dan Emphasis 650 membantu hirarki. Fallback Arial/system sans-serif. Pasang font sebelum membuka SVG agar font pengganti tidak mengubah layout. PDF sudah menanamkan font.

## Warna dan komponen

Navy#071321 adalah landasan dark; lime#C8F904 adalah aksi utama. Violet light#5146C9/dark#B6B4FF digunakan untuk interaksi. Background light#F4F6FA. Pakai nama token canvas/surface/text/primary/focus, bukan menyebarkan nilai HEX manual. Lihat pasangan tema penuh dalam JSON/CSV. Label primary memakai#071321; jangan memakai teks putih di lime. Lime bukan teks kecil di putih atau sinonim status sukses.

Pisahkan separator dekoratif dari border kontrol. Status memakai teks dan pasangan foreground/background; tidak hanya warna. Rencana dashed, actual solid dan forecast dotted tetap perlu label/legend. Jangan memakai gradient untuk angka/form/tabel; identitas boleh memakai aksen terkontrol.

Spasi 4/8/12/16/24/32/48/64; radius control 10 / card 14 / modal 16 / identity 20. Target kontrol utama 44 px berasal dari acuan desain. Cek state focus/disabled/loading/error, keyboard, ukuran mobile dan kontras pada implementasi aktual.

## Versi, sumber dan batas

Paket handoff v1.0 mengemas sumber design/system/v0.1 kandidat JPDS-0.1-e58210bb5e95. Logo resmi mengacu D057 dan subtitle terkini Enterprise Resource Planning. Token tetap acuan kandidat; permintaan paket ini tidak mengubah aplikasi atau mengunci keputusan integrasi produk. 40 pasangan warna solid dihitung ulang mengikuti catatan sumber. Ini tidak membuktikan seluruh WCAG, opacity/gradient/disabled, perilaku browser atau perangkat fisik.

Contoh UI dalam board/HTML adalah specimen visual. Logo/font asli disalin identik, tidak ada aplikasi, data bisnis, akun, key, source server atau lisensi aset pihak lain yang dibundel. SOURCE-MANIFEST.json merekam provenance; PACKAGE-MANIFEST.json memeriksa integritas isi paket.
