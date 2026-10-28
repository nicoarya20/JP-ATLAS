# Analisis Menu `/dev` (Dev Console — Super-admin)

> Dokumen diskusi, 28 Oktober 2026. Menjelaskan tiap menu di area `/dev` dengan **bahasa awam**,
> lalu menilai relevansinya terhadap produk Project Management. Ini analisis, bukan rencana
> eksekusi — keputusan hapus/sembunyikan/pertahankan ada di tangan user.

---

## 0. Super-admin itu siapa — dan kenapa menu-menu ini terasa "teknis"

Secara **konsep**, super-admin = tingkat kekuasaan tertinggi di aplikasi (bisa apa saja). Itu peran,
bukan profesi.

Tapi di **Simple PM**, super-admin praktis = **developer / operator teknis**. Tiga bukti:
1. Isi `/dev` memang alat teknis (diagram database, log server, kesehatan file).
2. Namanya saja **"Dev Console"** di sidebar.
3. Dikunci lewat env (`SUPER_ADMIN_EMAILS`), bukan tombol di dalam aplikasi — jadi hanya yang
   punya akses server (developer) yang bisa menentukan siapa super-admin.

Pembagian peran (`homeFor` di kode):

| Peran | "Pulang" ke | Untuk siapa sebenarnya |
|---|---|---|
| `member` | `/app` | karyawan biasa |
| `project_manager` | `/app` | pemimpin proyek |
| `admin` | `/dashboard` | **operator bisnis** (kelola akun, tim, pengaturan) |
| `super-admin` | `/dev` | **developer / operator teknis** |

**Kesimpulan penting:** kalau PM ini dipakai klien sungguhan → **klien jadi Admin, bukan super-admin.**
Admin sudah cukup untuk mengelola tim, akun, dan pengaturan bisnis (di `/dashboard`), tanpa pernah
melihat "ruang mesin" di `/dev`. Super-admin disimpan untuk kamu dan rekan teknis.

Label relevansi yang dipakai di bawah:
- 🟢 **Infrastruktur nyata** — dibutuhkan aplikasi sungguhan apa pun.
- 🟡 **Alat developer** — berguna saat membangun, bukan untuk operator bisnis.
- 🔴 **Demo template** — tidak nyambung ke PM; kandidat dihapus/diganti.

---

## 1. Penjelasan per menu (bahasa awam)

### 1) Overview — 🟢
Ringkasan kondisi aplikasi; pintu masuk `/dev`. **Benar.**

### 2) Users — 🟢
Menampilkan seluruh akun: peran, status, aktivitas, waktu bergabung. **Benar.**

### 3) Sessions — 🟢
Catatan semua perangkat yang sedang login: user, perangkat, status, aktif terakhir, waktu masuk.
**Benar.** Tambahan: di sini juga bisa **mencabut sesi** (paksa logout perangkat tertentu).

### 4) Posts — 🔴
Bayangkan template ini seperti **rumah contoh** developer perumahan. Ada satu kamar berisi perabot
pajangan — bukan untuk dipakai, tapi untuk menunjukkan "beginilah cara menata kamar". **Posts itu
kamar pajangan itu**: contoh cara membuat fitur (buat data, edit, hapus, moderasi). Untuk PM, menu
ini **tidak perlu ada** — harusnya dihapus setelah polanya dipahami.

### 5) API Keys — 🟢 (opsional)
Ini seperti **kartu akses karyawan**. Aplikasi normalnya diakses manusia lewat login. Tapi kadang
kamu mau **program lain** (bukan manusia) ikut mengakses — misal aplikasi akuntansi menarik data
proyek otomatis tiap malam. Program tak bisa "login email+sandi", jadi diberi **kartu akses khusus**
(API key): bisa dibatasi ("cuma boleh baca"), bisa dicabut kapan saja, tiap pemakaiannya tercatat.
Kalau PM tidak disambung ke sistem lain, menu ini boleh diabaikan dulu.

### 6) DB Schema — 🟡
Diagram relasi database proyek. **Benar.** Ini alat developer untuk memahami struktur tabel tanpa
membuka SQL.

### 7) Spec OpenAPI — 🟡
Lanjutan API Keys. Kalau API key itu "kartu akses", **Spec OpenAPI itu buku petunjuknya** — daftar
lengkap "pintu apa saja yang bisa dibuka kartu ini, dan caranya bagaimana". Orang yang mau
menyambungkan program lain tinggal baca daftar ini, tak perlu menebak. **Dokumentasi teknis**, cuma
dipakai developer/integrator. (Versi cantiknya sedang direncanakan: Scalar `/api/docs`.)

### 8) Visitor Logs — 🟢
Catatan setiap kunjungan halaman + lokasi, perangkat, sumber, user login. **Benar.**

### 9) Login Logs — 🟢
Catatan tiap login: waktu, user, metode, IP & lokasi, perangkat. **Benar.**

### 10) Rate Limit Logs — 🟢
Bayangkan **satpam di pintu**. Aturannya: satu orang maksimal 100 kali masuk-keluar per menit. Kalau
ada yang bolak-balik melebihi itu (biasanya bukan manusia — robot/serangan yang mau membanjiri
server), satpam menolaknya sementara. Menu ini **buku catatan satpam**: siapa yang pernah ditolak.
Kosong = aman. Ini pertahanan otomatis; menunya cuma untuk memantau.

### 11) Server Logs — 🟡
Ini **buku harian mesin server**. Aplikasi diam-diam mencatat apa yang ia kerjakan: "server mulai
jam sekian", "ada error di sini", "request gagal". Kalau aplikasi bermasalah, developer buka buku
harian ini untuk cari tahu kenapa. **Beda dengan Audit Log:** Audit Log mencatat **aksi manusia**
(siapa hapus apa), Server Logs mencatat **kondisi mesin** (error teknis, restart). Murni untuk
developer.

### 12) Audit Log — 🟢
**Koreksi:** bukan "pengelompokkan aktivitas". Yang terlihat di atas (aktor paling aktif, aksi,
jenis target) itu cuma **kartu ringkasan**. Inti Audit Log adalah **buku catatan aksi penting yang
tak bisa dihapus** — tiap kali ada yang menghapus, mengubah peran, menyetujui akun, tertulis
permanen. Gunanya saat ada masalah: "siapa yang menghapus proyek ini?" — jawabannya di sini, dan tak
bisa dimanipulasi.

### 13) File Health — 🟡
**Hampir benar.** Ini cek **ukuran file kode** (jumlah baris) vs batas yang ditetapkan, supaya tak
ada file membengkak. Plus menandai file yang terlalu besar untuk dibaca agen AI. Jadi alat
**kualitas kode**, bukan cek isi/logika kodenya.

### 14) Tools & MCP — 🟡
Dua hal dalam satu halaman:
- **Tools (status)** = papan dashboard mobil: "mesin sehat?" — server jalan berapa lama, pakai
  memori berapa, database responsif atau lambat.
- **MCP** = istimewa dan unik di template ini. Ia **pintu khusus untuk asisten AI** (seperti Claude
  Code). Lewat pintu ini, AI bisa membaca log dan struktur database untuk membantu developer.
  Jembatan antara aplikasi dan AI yang membantu membangunnya. Untuk operator bisnis: tak dipakai.

### 15) Changelog — 🟢
Riwayat perubahan proyek per versi. **Benar.**

### 16) Settings — campuran 🟢 + 🟡
Tujuh tab:

- **Autentikasi** 🟢 — cara user masuk.
  - *Login email & password:* kalau dinyalakan, muncul kolom email + sandi di layar masuk. **Benar.**
  - *Form daftar di layar masuk:* **beda tipis tapi penting.** Ini mengatur apakah muncul tombol
    **"Daftar"** untuk orang **baru** bikin akun sendiri. Jadi kamu bisa mengizinkan orang **login**
    tapi tidak mengizinkan orang **mendaftar sendiri** (biar akun baru hanya lewat undangan admin).
    Toggle ini cuma menyembunyikan/menampilkan tombol daftar — tidak benar-benar menutup pendaftaran
    (orang masih bisa daftar lewat Google atau undangan).
- **Rate limit** 🟢 — batas jumlah request per IP; kalau melebihi, ditolak sementara (jeda). **Benar.**
- **Retensi log** 🟢 — hapus otomatis log lama. **Benar.**
- **Maintenance** 🟢 — mode perbaikan: kalau dinyalakan, user yang mengakses melihat halaman
  "sedang perbaikan". **Benar.**
- **Feature flags** 🟡 — **sakelar lampu untuk fitur.** Kamu bikin fitur baru tapi belum yakin mau
  dibuka ke semua orang. Daripada deploy ulang tiap mau coba, kamu pasang sakelar: fitur ada di kode
  tapi mati. Kapan pun mau, nyalakan tanpa deploy ulang; kalau bermasalah, matikan lagi. Berguna
  untuk uji coba bertahap. Sekarang masih kosong.
- **Branding** 🟢 — ganti nama aplikasi, tagline, URL dukungan. **Benar.**
- **Runtime** 🟡 — halaman **"cuma lihat, tidak bisa diubah".** Menampilkan pengaturan paling dalam
  dari file konfigurasi server (`.env`): mode development/production, alamat aplikasi, status Google
  OAuth. Tak bisa diubah dari sini karena ini setelan berbahaya yang mengubahnya harus lewat file +
  restart server, bukan sekali klik. Jadi cuma **jendela intip**.

---

## 2. Ringkasan keputusan

| Menu | Label | Rekomendasi |
|---|---|---|
| Overview | 🟢 | Pertahankan |
| Users | 🟢 | Pertahankan — alat harian |
| Sessions | 🟢 | Pertahankan — keamanan |
| **Posts** | 🔴 | **Hapus atau ganti entitas nyata** |
| API Keys | 🟢 | Pertahankan jika ada integrasi |
| DB Schema | 🟡 | Pertahankan; sembunyikan dari non-teknis |
| Spec OpenAPI | 🟡 | Pertahankan (dev/integrator) |
| Visitor Logs | 🟢 | Pertahankan |
| Login Logs | 🟢 | Pertahankan |
| Rate Limits | 🟢 | Pertahankan |
| Server Logs | 🟡 | Pertahankan (developer) |
| Audit Log | 🟢 | Pertahankan — penting |
| File Health | 🟡 | Pertahankan (developer) |
| Tools & MCP | 🟡 | Pertahankan (developer/agen) |
| Changelog | 🟢 | Pertahankan |
| Settings | 🟢/🟡 | Pertahankan |

**Kesimpulan:** hanya **Posts** yang benar-benar tidak nyambung dengan Project Management — sisanya
infrastruktur nyata (🟢) atau alat developer (🟡) yang menopang aplikasi sungguhan. Tidak ada yang
membahayakan PM. Keputusan sejati bukan "hapus vs simpan massal", melainkan:

1. **Hapus/ganti Posts** — ia demo template, bukan fitur.
2. **Pisahkan penonton** — klien = Admin (`/dashboard`), kamu = super-admin (`/dev`). Saat ada
   super-admin non-teknis, pertimbangkan menyembunyikan kelompok 🟡 (DB Schema, Server Logs, File
   Health, Tools & MCP, Feature flags, Runtime) dari mereka. Ini keputusan UX/peran, bukan
   penghapusan.
3. **Biarkan 🟢 apa adanya** — fondasi menjalankan SaaS sungguhan.

> Catatan metodologi: isi dokumen ini dari diskusi + membaca `app/routes/super/layout.tsx`, impor
> loader tiap `app/routes/super/*.tsx`, dan modul server terkait (`visitor.ts`, `audit.ts`,
> `rate-limiter.ts`, `roles.ts`). Status "nyata vs demo" diverifikasi dari sumber data loader, bukan
> dari tampilan layar.
