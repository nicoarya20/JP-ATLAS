# 0001 — Status akun di tabel `user`, undangan diklaim di `before` hook

Dicatat 16 Oktober 2026 (S0A-15, gerbang akhir S0.a). Mengikat bagi S0.b dan seterusnya. Sumber keputusan: `tahapan-proyek/05-implementasi/KEPUTUSAN-MVP-INTI.md` (Q2, Q3, Q4, Q9 dan baris "Layar ③"), rencana `rencana/P1-s0a-akun-akses.md` §2 dan §8, serta kode di `server/account/*`, `server/guard.ts`, `server/auth.ts`, `server/api/auth-gate.ts`, `server/api-keys/scopes.ts`. Dokumen ini menjelaskan **kenapa**; apa yang dilakukan kode ada di kodenya.

## Konteks

Simple PM dipakai tim kecil dan keluarga. Siapa pun boleh mencoba masuk lewat Google, tetapi baru boleh memakai app setelah Admin menyetujui atau setelah diundang lebih dulu (Q2). Akun baru karena itu punya siklus hidup: `pending` → `approved` atau `rejected`, di samping suspend (`banned`) yang sudah ada. Pertanyaan yang harus dijawab: di mana status itu disimpan, kapan undangan dipakai, dan bagaimana semua pintu (halaman, API, API key) menahan akun yang belum disetujui tanpa bergantung pada ingatan penulis fitur berikutnya.

## 1. Status akun disimpan sebagai kolom di tabel `user`

Kolom `approval_status` (`pending|approved|rejected`) plus `approval_decided_by`, `approval_decided_at`, `approval_reason`, dideklarasikan sebagai `user.additionalFields` Better Auth (`input: false`), ditambahkan oleh migrasi `0014_account_lifecycle`.

**Kenapa:**
- Nilainya ikut di `session.user`, jadi guard membaca status dari sesi tanpa query tambahan. Aplikasi tidak memakai `cookieCache`, sehingga setiap request membaca nilai segar: persetujuan atau penolakan Admin berlaku seketika, termasuk untuk sesi yang sudah terbuka.
- Hook `create.before` menggabungkan nilainya ke `INSERT` yang sama dengan baris user. Status ditulis atomik bersama akunnya; tidak ada jendela "user ada, status belum".
- `input: false` membuat `POST /api/auth/update-user {approvalStatus: 'approved'}` ditolak `400 FIELD_NOT_ALLOWED`, jadi pengguna tidak bisa menyetujui dirinya sendiri tanpa kode penjaga tambahan. Ini diuji, bukan diasumsikan.

**Ditolak:**
- Tabel 1:1 `account_status`: +1 query per request, tidak ikut di `session.user`, dan isinya baru ditulis di `create.after` yang diantre sampai transaksi selesai, sehingga ada jendela tanpa status (fail-open atau fail-closed).
- Status sebagai nilai `role` (`pending`): mencampur dua sumbu, dan kunci `roles` Better Auth wajib subset `adminRoles`.
- `pending` = `banned`: `banned` berarti suspend; alasannya, durasinya, dan tombolnya berbeda (lihat §4).

**Konsekuensi untuk migrasi:** SQL bawaan drizzle-kit menulis `DEFAULT 'pending' NOT NULL`, yang akan menandai SEMUA akun lama `pending` dan mengunci semua orang. `0014` karena itu disunting tangan: backfill `approved` lebih dulu, default `pending` dipasang sesudahnya (akun demo anonim menjadi `rejected`, Q4). Semua guard idempoten supaya aman dijalankan ulang.

## 2. Undangan diklaim di `databaseHooks.user.create.before`

Undangan awal (`user_invitation`) dikonsumsi lewat satu `UPDATE … RETURNING` di hook `create.before` (`server/account/signup-hooks.ts`, keputusan murni di `signup-gate.ts`), dan hanya bila email sudah terverifikasi.

**Kenapa:**
- Klaim atomik: `UPDATE … WHERE accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()` menjamin satu undangan hanya terpakai sekali. `UNIQUE(user.email)` menyerialkan dua pendaftar dengan email sama.
- Hasil klaim (role undangan, `approved`, siapa yang mengundang) digabung ke `INSERT` user yang sama (alasan sama dengan §1). Akun tidak pernah ada sebagai `pending` lalu dinaikkan belakangan, jadi tidak ada jendela di mana orang yang diundang terlihat belum disetujui.
- `emailVerified` wajib: email yang belum terverifikasi tidak pernah menyetujui otomatis, sehingga orang asing tidak bisa mengambil undangan milik email yang bukan miliknya.
- Gagal-tertutup: bila klaim atau hook gagal, akun menjadi `pending` (Admin masih bisa menyetujui), tidak pernah `approved` karena galat. Log hanya memuat nama/kode galat, bukan email, karena galat driver bisa memantulkan parameter query.
- `accountLinking.disableImplicitLinking: true`: akun Google dengan email yang sama dengan akun lain tidak digabung diam-diam, yang akan menyerahkan persetujuan akun itu kepada pihak ketiga.

**Efek samping yang diterima:** `create.before` tidak bisa mengembalikan id undangan ke Better Auth, jadi id itu diparkir sementara di memori (per email, kedaluwarsa 5 menit) untuk `create.after` yang mengisi `accepted_user_id` dan audit. Bila INSERT gagal setelah klaim, undangan tertinggal "terpakai tanpa akun"; hal ini terlihat di daftar undangan dan diselesaikan Admin dengan menyetujui manual. Ini dipilih daripada transaksi lintas hook yang tidak didukung Better Auth.

## 3. Di dev, sign-up email ditandai `emailVerified: true`

Di non-produksi, akun yang dibuat lewat email+kata sandi ditandai `emailVerified: true` oleh keputusan sign-up.

**Kenapa:** super-admin dari `SUPER_ADMIN_EMAILS` hanya diakui bila email terverifikasi (`reconcileRole`), karena email tak terverifikasi bisa diklaim siapa saja. Di dev lokal tidak ada pengirim email (Q3: email+kata sandi hanya untuk dev lokal), jadi tanpa penanda ini super-admin dev kehilangan `/dev`. Produksi tidak pernah sampai ke cabang ini karena sign-up email ditolak di sana (§5). Rencana mencatatnya sebagai kontradiksi K-2; pilihan konservatif yang tidak menutup jalan: bila nanti dev ingin selalu lewat Google, cukup hapus cabang ini.

## 4. `/waiting` terpisah dari `/banned`

Akun yang menunggu atau ditolak melihat `/waiting` (satu rute, dua keadaan); akun yang disuspend melihat `/banned`. Keduanya memakai kerangka visual bersama (`HoldShell`).

**Kenapa:** isi dan tindakannya berbeda. `/banned` menjelaskan alasan, durasi dan hitung mundur suspend, sedangkan `/waiting` menjelaskan bahwa Admin belum memutuskan ("Cek lagi"), atau menampilkan alasan penolakan. Menyatukannya membuat satu halaman penuh percabangan dan mencampur arti "ditangguhkan" dengan "belum diterima". Pilihan user (15 Okt 2026, wireframe ③ opsi A): `/waiting` tanpa form profil; profil diisi setelah disetujui.

**Mekanisme yang membuatnya aman:**
- `resolveActor` mengembalikan `null` untuk akun tertahan, baik lewat sesi maupun API key, dan menyimpan alasannya di `WeakMap` per request (`getHeldAccount`). Guard mana pun yang dipanggil tidak bisa meloloskan akun tertahan karena lupa memeriksa status. Suspend aktif didahulukan dari status persetujuan; nilai status apa pun selain `approved`/`rejected` dianggap `pending`.
- Loader `/waiting` dan `/banned` membaca sesi sendiri, tidak lewat guard, dan berada di luar layout terjaga. Itulah yang mencegah loop pengalihan; matriks status × rute diuji dengan loader sungguhan.
- API menjawab `403 ACCOUNT_PENDING|ACCOUNT_REJECTED|ACCOUNT_SUSPENDED`, bukan `401`: orangnya sudah masuk, hanya belum boleh.

## 5. Login hanya Google di produksi; sign-up email ditutup berlapis

Produksi hanya menerima Google. Email+kata sandi ada di dev/test saja (Q3).

**Kenapa:** tanpa pengirim email tidak ada verifikasi alamat, sedangkan seluruh model undangan dan super-admin bertumpu pada email yang terverifikasi. Ditutup di tiga lapis supaya satu lapis yang bocor tidak membuka pendaftaran: `emailAndPassword.enabled = !isProd`, gerbang HTTP `server/api/auth-gate.ts` (404 seragam untuk `/sign-up/email` dan `/sign-in/email`), dan penolakan di hook `create.before`. Gerbang yang sama menutup seluruh `/api/auth/admin/*` kecuali `impersonate-user` dan `stop-impersonating`; pengelolaan akun hanya lewat `/api/admin/*`, tempat matriks izin (`server/access/user.policy.ts`) berlaku. Path dinormalkan (decode, huruf kecil, `//` dikompres) sebelum dicocokkan supaya `%41dmin` tidak lolos.

**Ditolak:** `validateUserInfo` (gagal-tertutup bila tak ada konteks endpoint, sehingga memutus seed dan skrip, dan tak bisa menetapkan `pending`) serta `disableSignUp` untuk Google (menolak akun baru, padahal kita butuh akun `pending` yang bisa disetujui).

## 6. Kunci API tidak boleh menyetujui atau menaikkan akun

`requiredScope` bernilai `null` (ditolak untuk kunci API) untuk `POST /api/admin/users/:id/approve|reject|role` dan seluruh `/api/admin/invitations*`. Blokir/buka blokir dan hapus tetap `users:write`.

**Kenapa:** izin kunci sama dengan izin pemiliknya. Tanpa pengecualian ini, satu kunci milik Admin yang bocor dapat membuat akun baru yang disetujui, mengangkat role, atau mengundang email apa pun, yaitu mencetak akses. Menahan atau mencabut akses adalah arah aman; memberi akses harus lewat orang yang masuk dengan sesi. Pola pencocokan sengaja longgar pada segmen id supaya garis miring aneh tidak jatuh ke `users:write`. Pembatasan ini dari kontradiksi K-7 di rencana, diputuskan konservatif; bisa dilonggarkan per rute bila ada kebutuhan otomasi nyata. Diuji di `tests/api-keys/scopes.test.ts`.

## 7. Mode demo dicabut

Login anonim, sandbox demo, dan tombol Coba Demo dihapus. Akun anonim lama ditandai `rejected` ("Demo dimatikan") oleh `0014` dan dibersihkan sekali saat server menyala (Q4).

**Kenapa:** akun anonim tidak punya email, sehingga tak bisa diundang, diverifikasi, atau disetujui; ia bertabrakan dengan model "akun Google yang disetujui". Kolom `user.is_anonymous` dan pengaturan `demo_*` sengaja dibiarkan: pola expand/contract, DROP baru di rilis sesudah tag pertama supaya rilis yang berjalan tidak rusak. Berkas pembersih sisa (`server/demo/cleanup.ts`) ditandai untuk dihapus setelah rilis pertama dan satu sapuan melaporkan 0.

## Batas keputusan

- Super-admin tetap hanya dari `SUPER_ADMIN_EMAILS` (bukan nilai yang bisa diberikan lewat UI atau API).
- Pencabutan akses akun yang sudah `approved` memakai suspend, bukan `rejected`; transisi `approved → rejected` tidak ada.
