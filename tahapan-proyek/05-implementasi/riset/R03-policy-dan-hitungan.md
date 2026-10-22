# R03 · Modul murni izin (`server/access`) dan hitungan (`server/metrics`)

> Tanggal: 15 Oktober 2026. Riset/perencanaan saja, tidak ada kode yang diubah. Branch `feature/project-management`.
> Dasar: `03-desain/erd/{project,task}.md`, diskusi 00, 02, 03, 05, 06, 07, 08, 09, dan gaya `server/permissions.ts`. Konvensi: ASUMSI = tidak diverifikasi / keputusan baru dari saya.

## 1. Ringkasan eksekutif

- **Dua paket murni** tanpa DB/env/logger: `server/access/` (siapa boleh: fungsi `canX(principal, subjek, keanggotaan, rules?) → Decision`) dan `server/metrics/` (berapa: progres, kondisi, terlambat, mandek, umur, beban). Dipakai bersama API (403/409/404) dan UI (`can` per aksi dari server).
- **Kunci penyederhanaan:** semua izin proyek dihitung dari satu `Level` = Admin ∨ peran proyek. Peran akun PM hanya memberi 3 hal: buat proyek, lihat semua proyek (baca saja jika bukan anggota), simpan template. Untuk aksi proyek, delapan kolom jatuh ke enam `Level` (SA≡AD, PM-K≡M-K) dan itu dites sebagai invarian.
- Matriks terkonsolidasi: **±70 ID aksi × 8 kolom** (§2.2). Ditemukan **23 kontradiksi/ketidakjelasan** antar dokumen (§2.3); yang paling berdampak: dokumen 05/07/08/09 memakai kolom "PM/Member" padahal aturannya peran proyek (K1), pemeriksa boleh menyetujui tugasnya sendiri (K2), Lead bisa diturunkan tanpa pengganti (K4).
- Fondasi menang: `Actor` di `server/guard.ts:61` sudah ada → tipe baru bernama `Principal`; error 403 memakai bentuk `{ error, code }` (`admin.ts:41` saat ini belum). Usul: rank role diekspor dari `permissions.ts` (duplikat klien di `ScopePicker.tsx:4`).
- Semua ambang/asumsi (A1–A5 proyek, A1–A10 tugas) jadi konstanta bernama (`ACCESS_RULES`, `METRICS`) dengan sumbernya; "hari ini" butuh zona waktu tim (belum ada di server) → `TIME_ZONE` (ASUMSI Asia/Jakarta).
- Test table-driven (`test.each`, tersedia di bun 1.3.14): matriks eksaustif + **66 kasus konkret** (§3.8, termasuk angka emas dari wireframe). Estimasi **L, 10–15 hari-orang AI + 2–3 hari reviewer manusia**.

## 2. Temuan

### 2.1 Fakta fondasi (dibaca langsung)

| # | Bukti | Dampak ke desain |
|---|---|---|
| F1 | `server/permissions.ts:9-13,18,74-84`: `ROLES` = USER/ADMIN/SUPER_ADMIN; `canSetRole` hanya super-admin; semua fungsi menerima `unknown` lalu `normalizeRole`. Gaya: fungsi murni kecil + komentar satu baris | Gaya `access/*` meniru: fungsi murni, tanpa kelas, tanpa DB |
| F2 | `server/guard.ts:61` sudah `export type Actor = { user, role, viaApiKey, isDemo }`; `requireUser` memakai `Object.values(ROLES)` (`:34-36`) | Nama bentrok → `Principal { id, appRole }` + adaptor `toPrincipal(actor)` |
| F3 | `server/api/app.ts:3-4,11-15`: komentar resmi "cek `actor.role` di handler → 403"; `derive` actor + 401 | Handler memanggil `canX` lalu `denyResponse`, bukan cek role manual |
| F4 | `server/api/admin.ts:41,48-49,131-132`: 403 berupa `{ error: 'Forbidden' }`/Inggris tanpa `code`; `:50` sudah menolak ubah role diri sendiri | `Decision` membawa `code` + pesan Indonesia; aturan "bukan diri sendiri" jadi `SELF_TARGET` |
| F5 | `tests/client-server-imports.test.ts:7-10,22-46`: klien hanya boleh mengimpor modul `@server/*` yang murni. Regex hanya melihat `import { … } from '…'` (bukan `import *` / `export … from`), spesifikasi relatif di-resolve ke `<spec>.ts`, dan **teks** `Bun.`/`process.` (juga di komentar) dianggap kode server | Klien harus impor file eksplisit (`@server/access/capabilities`), **bukan** direktori (`@server/access` → mencari `access.ts` → ENOENT); jangan menulis "process." di komentar; `index.ts` hanya untuk server |
| F6 | `tests/preload.ts:8-11` + `bunfig.toml`: setiap `bun test` (juga test murni) memanggil `prepareTestDb()` | Test murni tetap menanggung boot DB; layak dicatat (risiko R9) |
| F7 | `server/permissions.ts:35-37` `canAccessDev` → true untuk admin, hanya dipakai `tests/permissions.test.ts:30-40`; guard nyata `/dev` = `requireRole(…SUPER_ADMIN)` (`app/routes/super/layout.tsx:156`) | Fungsi stale/mati (aturan global #17) dan bertentangan dengan 00-role §2 → hapus di Fase 0 |
| F8 | `app/components/api-keys/ScopePicker.tsx:4,12` menyalin rank role `{user:0,admin:1,'super-admin':2}` di klien; `server/api-keys/scopes.ts:52,100,106,112` memakai `ROLES.USER`; `tests/` punya 14 rujukan `ROLES.USER` | Contoh drift persis yang dicegah: ekspor `ROLE_RANK` dari `permissions.ts` (4 role) saat Fase 0 |
| F9 | `server/env.ts:27`: `SUPER_ADMIN_EMAILS` opsional | Bisa tidak ada Admin/SA sama sekali → fallback pemeriksa "Admin" kosong (K3) |
| F10 | `grep timeZone server/` = 0 hasil; satu-satunya zona ada di klien (`app/lib/time-format.ts:31`, zona browser) | "Hari ini" belum didefinisikan di server; semua rumus tanggal menerima `today: IsoDate` |
| F11 | `node_modules/bun-types/test.d.ts:573` `test.each`; `bun --version` = 1.3.14 | Tabel kasus tanpa dependensi baru |

### 2.2 Matriks izin terkonsolidasi

Kolom: **SA** super-admin · **AD** admin (apa pun peran proyeknya, K6) · **PM-K** PM+Pengelola · **PM-X** PM bukan anggota · **M-K** Member+Pengelola · **AG** Anggota · **PT** Pemantau · **BA** Member bukan anggota. ✅ boleh · ❌ tidak · 👁 baca saja · 🔸x bersyarat (catatan). PM/Member yang menjadi Anggota/Pemantau memakai kolom AG/PT untuk aksi proyek, dan kolom PM untuk baris bertanda `a`. Tanpa hak lihat → HTTP 404 (bukan 403). ⏸ = fase 5, dirancang tapi belum dibangun.

| ID aksi | SA | AD | PM-K | PM-X | M-K | AG | PT | BA |
|---|---|---|---|---|---|---|---|---|
| **PROYEK** `project.view` (daftar+detail) | ✅ | ✅ | ✅ | 👁 | ✅ | ✅ | ✅ | ❌ |
| `project.create` (form, cerita ⏸, template ⏸) | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ `a` |
| `project.update/setStatus/phase.*/milestone.*/extendDeadline/condition.override/settings.update/trash` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `project.member.add/changeRole/remove`, `project.setLead` | ✅ | ✅ | 🔸b | ❌ | 🔸b | ❌ | ❌ | ❌ |
| `project.saveTemplate` ⏸ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ `a` |
| **TUGAS** `task.view` | ✅ | ✅ | ✅ | 👁 | ✅ | ✅ | ✅ | ❌ |
| `task.create` (Tulis saja, form), `task.import/export` ⏸ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `task.update` (isi, tag, checklist, dependency, pengerja), `tag.use` (buat tag saat memberi tag) | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸c | ❌ | ❌ |
| `task.start/unstart/complete/requestReview` | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸d | ❌ | ❌ |
| `task.approve`, `task.return` | 🔸e | 🔸e | 🔸e | ❌ | 🔸e | ❌ | ❌ | ❌ |
| `task.reopen` | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸f | ❌ | ❌ |
| `task.cancel/uncancel/trash` | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸g | ❌ | ❌ |
| `task.untrash` | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸h | ❌ | ❌ |
| `task.needsReview.on` | 🔸i | 🔸i | 🔸i | ❌ | 🔸i | 🔸c,i | ❌ | ❌ |
| `task.needsReview.off` | 🔸i | 🔸i | 🔸i | ❌ | 🔸i | ❌ | ❌ | ❌ |
| `task.reviewer.change` (ke Pengelola/Admin ≠ pengerja) | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸g | ❌ | ❌ |
| `comment.add` | ✅ | ✅ | ✅ | ❌ (K10) | ✅ | ✅ | ✅ | ❌ |
| `comment.delete` (ubah: penulis saja) · `attachment.remove` (ASUMSI) | ✅ | ✅ | ✅ | ❌ | ✅ | 🔸k | 🔸k | ❌ |
| `attachment.add` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `taskKind.manage`, `tag.rename/merge/delete` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **EVENTS** `event.view` | ✅ | ✅ | ✅ | 👁 | ✅ | ✅ | ✅ | 🔸m |
| `event.create` tanpa proyek | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `event.create` dengan proyek (pilihan proyek: Anggota/Pengelola saja) | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `event.update/cancel/trash/untrash` | ✅ | ✅ | 🔸n+ | 🔸n | 🔸n+ | 🔸n | 🔸n | 🔸n |
| `event.notes.write` | ✅ | ✅ | 🔸o | 🔸o | 🔸o | 🔸o | 🔸o | 🔸o |
| `event.outcome.confirm` (butuh event berproyek ∧ boleh `task.create`) | ✅ | ✅ | 🔸n+ | ❌ | 🔸n+ | 🔸n | ❌ | ❌ |
| **TIM** `team.list` (siapa tampil) | semua | semua | 🔸p | 🔸p | 🔸p | 🔸p | 🔸p | 🔸p |
| `team.workload.others`, `team.detail.tasks`, `team.sort` | ✅ lintas proyek | ✅ | 🔸q | ❌ | 🔸q | ❌ | ❌ | ❌ |
| `team.availability`, beban diri sendiri | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SAMPAH** `trash.list` | semua | semua | 🔸r | 🔸s | 🔸r | 🔸s | 🔸s | 🔸s |
| `trash.restore` proyek (tugas = `task.untrash`, event = `event.update`) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `trash.purge` (hapus permanen) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `trash.undo` (Urungkan segera setelah hapus) | 🔸u | 🔸u | 🔸u | 🔸u | 🔸u | 🔸u | 🔸u | 🔸u |
| **PENGGUNA/PENGATURAN** (tingkat akun; kolom PM-*=PM, lainnya=Member) `user.list/view` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `user.approve/reject/suspend/setRole/invite` — target Member/PM | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| idem — target atau role Admin | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| idem — target super-admin / role super-admin (`t`) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `user.delete`, `user.impersonate` (`permissions.ts:87-89`, `admin.ts:131`) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `settings.team.update`, `settings.roleTable.view` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `settings.own` (profil, ukuran teks, pemberitahuan), `inbox.own` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `leave.request/approve` ⏸ (aturan penyetuju: 09 #9, juga berbasis peran proyek) | ⏸ | ⏸ | ⏸ | ⏸ | ⏸ | ⏸ | ⏸ | ⏸ |
| `dev.*` (konsol ops, `super/layout.tsx:156`) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Catatan syarat.** `a` aplikasi-level: ikut peran akun (PM/Admin/SA). `b` Pengelola terakhir tak boleh keluar/turun (`LAST_MANAGER`, berlaku juga untuk Admin); Lead tak boleh keluar/turun (`IS_LEAD`); Lead baru wajib Pengelola. `c` pembuat atau yang mengerjakan (P/T-A2). `d` yang mengerjakan; tugas tanpa pengerja boleh "diambil" siapa pun yang boleh `task.create` (efek `BECOMES_ASSIGNEE`); `complete` hanya bila `needsReview=false` (Admin pun); dari `todo` langsung `done` (T-A4); `requestReview` hanya `in_progress` ∧ `needsReview=true`. `e` status `in_review` ∧ aktor **bukan yang mengerjakan** (`SELF_REVIEW`, K2); Kembalikan wajib catatan. `f` status `done`, alasan wajib; pembuat atau pengerja. `g` pembuat. `h` yang menghapus; proyek induk tidak di Sampah; < 30 hari. `i` terkunci bila `in_review/done/canceled`. `k` penulis/pengunggah sendiri. `m` peserta atau pembuat. `n` pembuat; `n+` pembuat **atau Pengelola proyek event**. `o` pembuat ∨ peserta ∨ Pengelola proyek event. `p` berbagi ≥1 proyek (keanggotaan, bukan hak lihat). `q` anggota proyek yang ia kelola, hanya tugas proyek itu; kapabilitas = gabungan semua proyek yang ia kelola. `r` dihapus sendiri ∪ item proyek yang ia kelola. `s` dihapus sendiri. `t` super-admin hanya lewat env, tak seorang pun lewat UI. `u` pelaku yang baru menghapus, dalam `UNDO_WINDOW_SECONDS`, dan masih berhak atas aksinya. Proyek/tugas di Sampah: semua aksi ❌ kecuali pemulihan.

### 2.3 Kontradiksi dan ketidakjelasan antar dokumen

| # | Sumber yang bentrok | Masalah | Penyelesaian yang dipakai di kode |
|---|---|---|---|
| K1 | 05 §2, 07 §2, 08 §2, 09 §2 (kolom Admin/PM/Member) vs 07 #5, 08 #7, 05 ④, 02 #5 (peran proyek) | Member yang jadi Pengelola (M-K) tak punya kolom; "Urutkan hanya PM dan Admin" salah untuk M-K | `Level` = Admin ∨ peran proyek; PM hanya 3 hak (a). Sidebar/tombol diturunkan dari kapabilitas, bukan peran akun |
| K2 | 03 #8 ("semua Pengelola boleh periksa") vs #7 ("Pemeriksa ≠ pengerja") vs dummy #12 (Nico Pengelola tunggal → Admin) | CHECK DB hanya melarang `reviewer_id = assignee_id`; `decided_by` bebas → Pengelola/Admin bisa menyetujui kerjanya sendiri | `SELF_REVIEW`: pengerja tak boleh Setujui/Kembalikan (juga Admin/SA). Dijaga di policy |
| K3 | 03 #7 (jatuh ke Admin) vs `env.ts:27` | Tanpa Admin/SA, atau Admin tunggal = pengerja, tugas `in_review` tak bisa diputuskan siapa pun | `requestReview` ditolak `NO_ELIGIBLE_REVIEWER` bila (Pengelola ∪ Admin ∪ SA aktif) \ pengerja kosong; `doctor` memperingatkan jika `SUPER_ADMIN_EMAILS` kosong |
| K4 | project.md ("Lead wajib manager", "pengelola terakhir") | Lead diturunkan/dikeluarkan saat ada Pengelola lain → `lead_id NOT NULL` menggantung | Tolak `IS_LEAD`; UI menawarkan "Jadikan Lead: …" di modal yang sama |
| K5 | project.md (pengelola terakhir "di service") | Suspend/hapus **akun** Pengelola tunggal tak tercakup | Tidak diblok; modal konfirmasi menampilkan `orphanedProjects`; pemeriksa jatuh ke Admin; notifikasi Admin |
| K6 | project.md/task.md (Admin ✅ semua) + Inbox/Tim (Ayu = Admin sekaligus Pemantau) vs `workflow.md:1417` (Admin "selebihnya mengikuti role proyeknya") | Admin yang tercatat Pemantau: penuh atau terbatas? | 03-desain menang: Admin penuh. Peran proyek Admin hanya memengaruhi kandidat pengerja |
| K7 | task.md "Buka lagi: pembuat atau pengerja" vs 03-tugas matriks "pembuat, pengerja, atau pemeriksa" | Beda kata, efek sama (pemeriksa selalu Pengelola/Admin yang sudah ✅) | Pakai task.md; hapus kata "pemeriksa" di 03-tugas |
| K8 | task.md matriks vs alur status | Tanpa baris izin: Batal mulai, Pulihkan dari Dibatalkan, tambah/hapus dependency, ganti pemeriksa (hanya di teks), hapus komentar/bukti, keluar sendiri dari proyek | ASUMSI: Batal mulai = Mulai; Pulihkan-Dibatalkan = Batalkan; dependency = Ubah isi; ganti pemeriksa = pembuat ∨ Pengelola/Admin; hapus komentar/bukti = penulis ∨ Pengelola/Admin; keluar sendiri: tidak ada (Q6) |
| K9 | task.md "Mulai kerjakan: siapa pun yang mengklik jadi pengerja" vs A2 (Anggota hanya ubah miliknya) | Celah: Anggota "mengambil" tugas orang lain? | Hanya tugas **tanpa pengerja**; setelah itu ia pengerja dan boleh ubah. Tugas berpengerja tak bisa diambil Anggota |
| K10 | A1 proyek (PM-X baca saja "termasuk tugasnya") vs Komentar (Pemantau ✅) | PM-X lebih terbatas daripada Pemantau | Ikuti A1 literal (`NOT_MEMBER`, petunjuk "Anda bukan anggota proyek ini"); pertanyaan Q2 |
| K11 | 05 §2 (Member: hanya event buatannya) vs 05 ④ ("pembuat, pengelola proyek, atau Admin") | Dokumen yang sama bertentangan | Pengelola proyek event boleh (n+). Konfirmasi hasil rapat juga butuh `task.create` di proyek itu (Pemantau tak boleh) |
| K12 | 08 §2/#6 (Member lihat yang ia hapus) vs #7 (Pengelola memulihkan) vs "Pulihkan ✅ yang terlihat" vs "Pemantau tidak" | Pengelola bertipe Member tak melihat item proyeknya; pemulih yang sudah dikeluarkan dari proyek | Daftar = dihapus sendiri ∪ item proyek yang ia kelola. Pulihkan butuh hak **saat ini** (keanggotaan sekarang), bukan sekadar pernah menghapus |
| K13 | 07 #8 (Urutkan: PM, Admin) vs #5 | Lihat K1 | Tombol Urutkan = `team.workload.others` ada (kapabilitas) |
| K14 | `permissions.ts:78-84`: `canActOnTarget(SUPER_ADMIN, apa pun)=true` vs 00 §1 (SA dari env, tak bisa diubah via UI) | SA bisa memperlakukan sesama SA/diri sendiri | `TARGET_PROTECTED` untuk SA; `SELF_TARGET` untuk semua aksi akun atas diri sendiri (`admin.ts:50` sudah begitu untuk role) |
| K15 | 00 §4 ("Admin mengisi email dan role") vs §3 (Admin tak boleh beri Admin) | Undangan role Admin oleh Admin? | Undangan role Admin hanya SA |
| K16 | 00 §1 (peran akun ⟂ peran proyek) | Turun PM→Member: peran Pengelola di proyek tetap? | Tetap; modal konfirmasi menyebut "masih Pengelola di N proyek" |
| K17 | 08 #4/#14 | Tugas anak proyek terhapus tak bisa dipulihkan sendiri, bahkan Admin | `PROJECT_IN_TRASH` untuk semua peran |
| K18 | 03-tugas §4.3 (Tertahan: status ∉ {done, canceled}) vs task.md (pemblokir "masih aktif", `deleted_at` kosong) | Pemblokir di Sampah menahan? | task.md: pemblokir terhapus tidak menahan |
| K19 | task.md Mandek "lebih lama dari 3 hari" (>) vs note.md ghost reminder "3 hari terakhir" (≥) | Batas 72 jam | `>` 72 jam (task.md) |
| K20 | project.md progres vs 02-proyek §3.3 | Penyebut 0 karena semua tugas dibatalkan; pembulatan 99,6% → "100%" | Penyebut 0 → `null` ("Belum ada tugas"); pembulatan **ke bawah**, 100 hanya jika semua selesai (ASUMSI) |
| K21 | project.md kondisi + override | `due_date` boleh null; `due=start`; override lama muncul lagi setelah yang baru dihapus ("terbaru yang belum cleared") | Tanpa tenggat → tak bisa Terlambat; elapsed `null`; service menutup (`cleared_at`) override sebelumnya saat membuat baru |
| K22 | semua rumus "hari ini" | Tak ada zona waktu (F10) | `METRICS.TIME_ZONE` (ASUMSI Asia/Jakarta), `today` dihitung sekali per request |
| K23 | project.md "Belum diputuskan" A1–A5, task.md A1–A10 | A1 dipakai dua arti (PM baca saja / notifikasi pembuat); A6 hilang; 00 §8 menyebut "A1–A3 di task.md dan project.md" | Konstanta berprefiks `P_A1`, `T_A1`…; A6 = keputusan #7 (tak jadi flag); T-A1 = notifikasi (bukan izin) |

## 3. Rekomendasi

### 3.1 Keputusan arsitektur

| # | Keputusan | Alternatif ditolak | Alasan |
|---|---|---|---|
| D1 | Dua paket murni: `server/access` (siapa boleh) dan `server/metrics` (berapa) | Semua di `access`; atau logika di service | Satu tanggung jawab per file (aturan global #8); alasan berubahnya beda; service butuh DB untuk dites |
| D2 | Hasil `Decision` (`ok` atau `code`), bukan boolean | `boolean` | UI perlu "tombol mati + alasan" (CLAUDE.md UX #5); API perlu bedakan 403/404/409 |
| D3 | Satu fungsi `levelOf(principal, membership)` → `admin·manager·member·viewer·reader·none`; semua `canX` berupa tabel di atas `Level` + guard keadaan | `if (appRole === …)` di tiap fungsi | Sumber K1; matriks jadi data yang bisa dites eksaustif |
| D4 | Tulis sendiri (± 1.000 baris total) | Pustaka ABAC (mis. CASL): dependensi baru (aturan #10) dan harus dikirim ke klien; plugin organisasi Better Auth: tidak terpasang, ubah skema auth (ASUMSI tak diverifikasi); Postgres RLS: tak terlihat UI, perlu session var, ubah pola `db`/test | Kondisi per-baris + keadaan (pembuat/pengerja/status) kecil dan kita sudah punya gaya `permissions.ts`. `ac`/`roles` Better Auth tetap untuk aksi akun saja (`permissions.ts:95-109`) |
| D5 | Server mengirim `can` per aksi (§3.7) | Klien menghitung dari role (drift seperti F8); klien mengimpor policy (boleh menurut F5, tetapi subjek harus dikirim lengkap dan data basi) | Satu titik evaluasi dengan keanggotaan segar dari DB |
| D6 | Daftar/aggregate: *scope descriptor* (`ProjectListScope`, `TrashScope`, `WorkloadScope`) diterjemahkan repository ke SQL; konstanta (`ACTIVE_STATUSES`, ambang) dipakai bersama; **tes paritas** pure vs SQL | Filter in-memory (N+1, tanpa paginasi — aturan #13); SQL tanpa pure (tak teruji, drift) | Daftar wajib paginated; rumus tetap punya satu definisi |
| D7 | Angka di `METRICS` (override lewat env, dibaca di `server/projects/metrics-config.ts`); flag asumsi di `ACCESS_RULES`; keduanya diinjeksi sebagai argumen terakhir dengan default | Hardcode (aturan #15); tabel `workspace_settings` dulu (09 §4 belum punya kolomnya, butuh UI) | Mudah diubah/dites; DB-editable ditunda sampai ada kebutuhan |
| D8 | Tak terlihat → 404; terlihat tapi dilarang → 403; keadaan salah/terkunci/aturan integritas → 409 | 403 untuk semua | Tidak membocorkan keberadaan proyek; frontend bisa bedakan "tidak boleh" vs "belum waktunya" |
| D9 | `today: IsoDate` dan `now: Date` selalu parameter | `new Date()` di dalam fungsi | Deterministik, batas hari bisa dites (K22) |

### 3.2 Tata letak berkas (batas baris mengikuti aturan global)

| Berkas | Isi | Maks |
|---|---|---|
| `server/access/types.ts` | `Principal`, `Membership`, `*Subject`, `ProjectRole` | 120 |
| `server/access/decision.ts` | `Decision`, `DenyCode`, `DENY_UI` (http · hide/disable · pesan Indonesia), `allow/deny` | 150 |
| `server/access/level.ts` | `levelOf` (inti K1/K6) | 60 |
| `server/access/rules.ts` | `ACCESS_RULES` (flag asumsi, §3.5) | 80 |
| `project.policy.ts` · `members.policy.ts` | proyek; pengelola terakhir, Lead, validasi perpanjangan | 150 · 150 |
| `task.policy.ts` · `task-flow.policy.ts` · `review.policy.ts` | CRUD+komentar+tag+jenis; transisi, `primaryAction`, Perlu diperiksa; `pickReviewer`, setujui/kembalikan | 250 · 250 · 200 |
| `event.policy.ts` · `trash.policy.ts` · `team.policy.ts` · `user.policy.ts` · `settings.policy.ts` | sesuai nama | ≤150 masing-masing |
| `server/access/capabilities.ts` | `buildCaps`, `projectCaps/taskCaps/eventCaps/appCaps` | 200 |
| `server/access/index.ts` | re-export saja, **hanya dipakai server** | 50 |
| `server/metrics/{dates,config,task.metrics,project.metrics,condition,workload,trash.metrics}.ts` | §3.6 | ≤200 masing-masing |
| `server/projects/access-context.ts` (tidak murni) | `loadMembership(userId, projectIds[])`, `toPrincipal(actor)`, `denyResponse` | 150 |

Aturan impor: file `access/*` dan `metrics/*` hanya mengimpor satu sama lain, `../permissions` (tipe `Role`, `isAdminRole`), dan tanpa `Bun.`/`process.`/`node:`/`env`/`db`/`logger` (F5). Impor bernama, tanpa ekstensi, file eksplisit.

### 3.3 Tipe dan tanda tangan (c)

```ts
// types.ts
export type ProjectRole = 'manager' | 'member' | 'viewer';
export type Principal = { id: string; appRole: Role };                 // Role = 4 nilai (Fase 0); BUKAN guard.Actor
export type Membership = { role: ProjectRole; joinedAt: Date } | null; // baris project_members aktor utk proyek subjek
export type ProjectSubject = { id: string; status: ProjectStatus; leadId: string; deletedAt: Date | null; deletedBy: string | null };
export type TaskSubject = { id: string; projectId: string; status: TaskStatus; createdBy: string; assigneeId: string | null;
  reviewerId: string | null; needsReview: boolean; deletedAt: Date | null; deletedBy: string | null; projectDeletedAt: Date | null };
export type EventSubject = { id: string; projectId: string | null; createdBy: string; participantIds: readonly string[];
  deletedAt: Date | null; deletedBy: string | null; projectDeletedAt: Date | null };
// level.ts
export type Level = 'admin' | 'manager' | 'member' | 'viewer' | 'reader' | 'none';
export function levelOf(p: Principal, m: Membership, rules = ACCESS_RULES): Level {
  if (isAdminRole(p.appRole)) return 'admin';                                  // K6: Admin menang atas peran proyek
  if (m) return m.role === 'manager' ? 'manager' : m.role === 'member' ? 'member' : 'viewer';
  return p.appRole === 'project_manager' && rules.P_A1_PM_NON_MEMBER_READS ? 'reader' : 'none';
}
// decision.ts
export type DenyCode = 'NOT_VISIBLE' | 'NOT_MANAGER' | 'NOT_MEMBER' | 'NOT_OWNER' | 'NOT_ADMIN' | 'NOT_APP_ROLE' | 'SELF_REVIEW'
  | 'SELF_TARGET' | 'TARGET_PROTECTED' | 'WRONG_STATE' | 'LOCKED_BY_STATUS' | 'REVIEW_REQUIRED' | 'LAST_MANAGER' | 'IS_LEAD'
  | 'LEAD_NOT_MANAGER' | 'PROJECT_IN_TRASH' | 'TRASH_EXPIRED' | 'NO_ELIGIBLE_REVIEWER' | 'NO_PROJECT';
export type Decision = { ok: true; effects?: readonly 'BECOMES_ASSIGNEE'[] } | { ok: false; code: DenyCode };
export const DENY_UI: Record<DenyCode, { http: 403 | 404 | 409; ui: 'hide' | 'disable'; message: string }>; // message: Indonesia, actionable
```

Fungsi (urutan argumen: pelaku, subjek, keanggotaan, lalu masukan khusus, `rules` terakhir; semua mengembalikan `Decision` kecuali bila ditulis lain):

```ts
// project.policy.ts / members.policy.ts
canViewProject(p, project, m) · canCreateProject(p) · canManageProject(p, project, m)   // update, status, tahapan, milestone, perpanjang, override, setelan, Sampah
canSaveTemplate(p, project, m) · canChangeManagerSet(i: { targetId; targetRole; nextRole: ProjectRole | null; leadId; managerIds: readonly string[] })
canSetLead(p, project, m, nextLeadId: string, managerIds: readonly string[]) · validateExtension(i: { currentDue; newDue; category | null; reason: string }, rules): Decision
// task.policy.ts / task-flow.policy.ts / review.policy.ts
canViewTask(p, task, m) · canCreateTask(p, project, m) · canEditTask(p, task, m, rules?) · canComment(p, task, m) · canAttach(p, task, m)
canStartTask · canUnstartTask · canCompleteTask · canRequestReview(p, task, m, reviewers: ReviewerPool) · canApproveTask(p, task, m) · canReturnTask(p, task, m, note: string)
canReopenTask(p, task, m, reason: string) · canCancelTask(p, task, m, i: { category; note }) · canTrashTask · canUntrashTask(p, task, m, now: Date, cfg?) · canManageKinds(p, project, m) · canManageTags(p, project, m)
canToggleNeedsReview(p, task, m, next: boolean, rules?) · canChangeReviewer(p, task, m, nextReviewerId: string, pool: ReviewerPool)
resolveNeedsReviewOnCreate(i: { projectDefault: boolean; requested?: boolean; level: Level }): { value: boolean; ignored: boolean }
primaryAction(p, task, m, pool: ReviewerPool): 'start' | 'complete' | 'requestReview' | 'approve' | 'reopen' | 'uncancel' | 'untrash' | null
nextStatuses(task): readonly TaskTransition[]            // TASK_TRANSITIONS sebagai data, dipakai service + test
// event/trash/team/user/settings
canViewEvent(p, e, m) · canCreateEvent(p, projectId: string | null, m) · canEditEvent(p, e, m) · canWriteNotes(p, e, m) · canConfirmOutcome(p, e, m)
projectListScope(p): { kind: 'all' } | { kind: 'memberOf'; userId: string }
trashScope(p, managedProjectIds: readonly string[]): { all: true } | { deletedBy: string; projectIds: readonly string[] }
canPurge(p) · canRestoreProject(p, project, m, now) · teamScope(p, managedProjectIds): { people: 'all' | 'sharedProjects'; workload: 'all' | { projectIds: ReadonlySet<string> } | 'self' }
canActOnUser(p, target: { id: string; appRole: Role }) · canSetUserRole(p, target, next: Role) · canInviteWithRole(p, role: Role) · canChangeTeamSettings(p)
matchesProjectScope(scope, projectId, memberProjectIds): boolean   // oracle untuk tes paritas SQL
```
`ReviewerPool = { managers: readonly ManagerInfo[]; adminIds: readonly string[] }` dimuat service dengan satu query (Pengelola aktif proyek + Admin/SA yang `approved` dan tidak `banned`).

### 3.4 Pemeriksa, pengelola terakhir, Perlu diperiksa (d)

```ts
// review.policy.ts
export type ManagerInfo = { userId: string; joinedAt: Date; active: boolean };      // active = approved ∧ tidak banned
export type ReviewerPick = { kind: 'user'; userId: string; via: 'creator' | 'lead' | 'manager' }
  | { kind: 'admin-pool'; suggestSecondManager: true };                              // reviewer_id = NULL; UI "Pemeriksa: Admin"
export function pickReviewer(i: { creatorId: string; assigneeId: string | null; leadId: string; managers: readonly ManagerInfo[] }): ReviewerPick {
  const pool = i.managers.filter((x) => x.active && x.userId !== i.assigneeId);     // Pengelola aktif, melewati pengerja
  const has = (id: string) => pool.some((x) => x.userId === id);
  if (has(i.creatorId)) return { kind: 'user', userId: i.creatorId, via: 'creator' };      // 1. pembuat, jika Pengelola
  if (has(i.leadId)) return { kind: 'user', userId: i.leadId, via: 'lead' };               // 2. Lead
  const next = [...pool].sort((a, b) => +a.joinedAt - +b.joinedAt || (a.userId < b.userId ? -1 : 1))[0]; // 3. paling lama; seri → id terkecil
  return next ? { kind: 'user', userId: next.userId, via: 'manager' } : { kind: 'admin-pool', suggestSecondManager: true }; // 4. Admin
}
// members.policy.ts — aturan pengelola terakhir + Lead (urutan cek penting: pesan "tambah pengelola" lebih berguna daripada "pindahkan Lead")
export function canChangeManagerSet(i: ChangeInput /* bentuk: lihat §3.3 */): Decision {
  if (!(i.targetRole === 'manager' && i.nextRole !== 'manager')) return allow();        // tak mengurangi jumlah Pengelola
  if (!i.managerIds.some((id) => id !== i.targetId)) return deny('LAST_MANAGER');       // berlaku juga untuk Admin/SA
  return i.targetId === i.leadId ? deny('IS_LEAD') : allow();
}
```
- **Kapan pemeriksa dihitung ulang** (`needsReviewerRecompute(ev)`): (1) `needs_review` dinyalakan; (2) pengerja diganti menjadi `reviewerId`; (3) `reviewerId` bukan lagi Pengelola aktif (dikeluarkan/diturunkan/suspend). Pilihan manual tetap bertahan di luar tiga pemicu itu. `validateReviewerChoice` menolak pilihan di luar Pengelola ∪ Admin ∪ SA atau sama dengan pengerja (cermin CHECK DB, K2).
- **Yang boleh Setujui/Kembalikan** = (Pengelola ∪ Admin ∪ SA) \ {pengerja}, bukan hanya `reviewerId`. Antrean "Menunggu diperiksa saya" = `reviewerId = saya` ∨ (saya Pengelola ∧ bukan pengerja) ∨ (saya Admin/SA ∧ `reviewerId` kosong).
- **`requestReview`** ditolak `NO_ELIGIBLE_REVIEWER` jika himpunan di atas kosong (K3). Admin/SA yang jatuh sebagai pemeriksa mendapat notifikasi "Pemeriksa jatuh ke Admin" (penerima: semua Admin **dan** SA, sejalan dengan 06 dan 00 §3).
- **Perlu diperiksa** (`canToggleNeedsReview`): `next=true` → `canEditTask` bentuk `c` (Admin, Pengelola, atau Anggota pembuat/pengerja bila `T_A5`); `next=false` → hanya `manager`/`admin`; kedua arah ditolak `LOCKED_BY_STATUS` bila status ∈ {`in_review`,`done`,`canceled`}; cek kunci mendahului cek nilai sama; nilai sama → `allow` tanpa efek. `resolveNeedsReviewOnCreate`: `value = requested ?? projectDefault`, kecuali `level ∈ {member}` dan `projectDefault=true` dan `requested=false` → `value=true, ignored=true` (CSV memberi peringatan, 03 #21).
- **State machine** sebagai data, bukan `if` tersebar:
```ts
export const TASK_TRANSITIONS = [
  { from: ['todo'], to: 'in_progress', action: 'start' }, { from: ['in_progress'], to: 'todo', action: 'unstart' },
  { from: ['todo', 'in_progress'], to: 'done', action: 'complete', when: 'needsReview=false' },        // from todo hanya bila T_A4
  { from: ['in_progress'], to: 'in_review', action: 'requestReview', when: 'needsReview=true' },
  { from: ['in_review'], to: 'done', action: 'approve' }, { from: ['in_review'], to: 'in_progress', action: 'return', needs: 'note' },
  { from: ['done'], to: 'in_progress', action: 'reopen', needs: 'reason' },
  { from: ['todo', 'in_progress', 'in_review'], to: 'canceled', action: 'cancel', needs: 'category' }, { from: ['canceled'], to: 'todo', action: 'uncancel' },
] as const;
```

### 3.5 Konfigurasi dan asumsi A1–A10 sebagai konstanta bernama

| Asumsi | Konstanta | Nilai | Letak |
|---|---|---|---|
| P-A1 PM bukan anggota baca saja | `ACCESS_RULES.P_A1_PM_NON_MEMBER_READS` | `true` (false → `none`) | `rules.ts` |
| P-A2 Sampah 30 hari | `METRICS.TRASH_RETENTION_DAYS` | 30 | `metrics/config.ts` |
| P-A3 perpanjangan harus lebih lambat + alasan wajib | `ACCESS_RULES.P_A3_EXTENSION_REQUIRES_LATER_DATE`, `…_REASON` | `true`, `true` | `rules.ts` |
| P-A4 template relatif, P-A5 AI pilih 3 jenis | — | fase 5 (⏸) | tak ada kode di MVP |
| T-A1 notifikasi pembuat Anggota | — | bukan izin; milik modul Inbox | — |
| T-A2 Anggota ubah milik sendiri | `ACCESS_RULES.T_A2_MEMBER_EDIT_SCOPE` | `'own'` (`'all'` = semua tugas) | `rules.ts` |
| T-A3 Anggota buat tag | `ACCESS_RULES.T_A3_MEMBER_CREATES_TAGS` | `true` | `rules.ts` |
| T-A4 selesai langsung dari Belum dikerjakan | `ACCESS_RULES.T_A4_COMPLETE_FROM_TODO` | `true` | `rules.ts` |
| T-A5 Anggota boleh menyalakan Perlu diperiksa | `ACCESS_RULES.T_A5_MEMBER_ENABLES_REVIEW` | `true` | `rules.ts` |
| T-A7 dependency sesama proyek | `ACCESS_RULES.T_A7_DEPENDENCY_SAME_PROJECT` | `true` | `rules.ts` |
| T-A8 Mandek 3 hari | `METRICS.TASK_STALE_DAYS` | 3 | `metrics/config.ts` |
| T-A9 bukti tak wajib (peringatan saja) | `ACCESS_RULES.T_A9_EVIDENCE_REQUIRED` | `false` | `rules.ts` |
| T-A10 default Perlu diperiksa mati | `PROJECT_REVIEW_DEFAULT` (nilai awal kolom `tasks_need_review_default`) | `false` | skema DB, bukan rules |
| Ambang kondisi (project.md) | `METRICS.AT_RISK_OVERDUE_RATIO`, `AT_RISK_PRIORITIES` | `0.2`, `['high','critical']` | `metrics/config.ts` |
| Jenis tugas aktif maks | `METRICS.TASK_KINDS_MAX_ACTIVE` | 6 | `metrics/config.ts` |
| Baru dari riset ini (ASUMSI) | `METRICS.TIME_ZONE`, `METRICS.UNDO_WINDOW_SECONDS` | `'Asia/Jakarta'`, 10 | `metrics/config.ts` |

Override env hanya untuk angka (`PROJECT_AT_RISK_OVERDUE_RATIO`, `TASK_STALE_DAYS`, `TRASH_RETENTION_DAYS`, `APP_TIME_ZONE`) lewat `EnvSchema` (`server/env.ts:15-35`, `z.coerce.number()` seperti `RATE_LIMIT_MAX`); flag izin tetap kode (ubah = rilis), supaya perilaku izin tidak berubah diam-diam antar lingkungan.

### 3.6 Rumus hitung sebagai fungsi murni (e) — `server/metrics/*`

```ts
// config.ts — satu-satunya tempat angka; tiap konstanta menyebut sumbernya
export const METRICS = {
  AT_RISK_OVERDUE_RATIO: 0.2,              // project.md › Nilai yang dihitung (">20% tugas aktif terlambat", strict >)
  AT_RISK_PRIORITIES: ['high', 'critical'] as const,
  TASK_STALE_DAYS: 3,                      // task A8 (strict >, dalam jam: > 72)
  TRASH_RETENTION_DAYS: 30,                // project A2, 08 #2
  TASK_KINDS_MAX_ACTIVE: 6,                // task.md
  TIME_ZONE: 'Asia/Jakarta',               // ASUMSI baru (K22)
  UNDO_WINDOW_SECONDS: 10,                 // ASUMSI baru: 08 #3/#13 hanya menulis "beberapa detik"
} as const;
// dates.ts — hari kalender di zona tim; selisih via tanggal UTC murni (bebas DST)
export type IsoDate = string;                                            // 'YYYY-MM-DD'
export function isoDateIn(d: Date, tz: string): IsoDate                  // Intl.DateTimeFormat('en-CA', { timeZone: tz })
export function diffDays(from: IsoDate, to: IsoDate): number             // to − from, bilangan bulat
// task.metrics.ts — ACTIVE_STATUSES juga dipakai query Drizzle (inArray) supaya definisinya satu
export const ACTIVE_STATUSES = ['todo', 'in_progress', 'in_review'] as const;
export const isActive = (t: { status: TaskStatus; deletedAt: Date | null }) =>
  !t.deletedAt && (ACTIVE_STATUSES as readonly TaskStatus[]).includes(t.status);
export const isOverdue = (t: TaskRow, today: IsoDate) => isActive(t) && t.dueDate !== null && t.dueDate < today;       // tenggat hari ini BELUM terlambat
export const isStale = (t: TaskRow, now: Date, c = METRICS) =>
  !t.deletedAt && t.status === 'in_progress' && now.getTime() - t.lastActivityAt.getTime() > c.TASK_STALE_DAYS * 86_400_000;
export const isBlocked = (blockers: readonly TaskRow[]) => blockers.some(isActive);                                   // pemblokir selesai/batal/terhapus tidak menahan (K18)
export function ageDays(t: TaskRow, now: Date, tz = METRICS.TIME_ZONE): number   // hari kalender sejak dibuat s.d. selesai/batal/sekarang
export function taskLabels(t: TaskRow, x: { today: IsoDate; now: Date; blocked: boolean; awaitingMe: boolean }): { all: Label[]; primary: Label | null }
// urutan primer: Terlambat > Menunggu diperiksa saya > Tertahan > Mandek (task.md); selalu ikon + teks
// project.metrics.ts
export function progress(tasks: readonly TaskRow[], phaseId?: string): { done: number; total: number; percent: number | null } {
  const pool = tasks.filter((t) => !t.deletedAt && t.status !== 'canceled' && (phaseId === undefined || t.phaseId === phaseId));
  const done = pool.filter((t) => t.status === 'done').length;                 // in_review = belum selesai
  const percent = pool.length === 0 ? null : done === pool.length ? 100 : Math.floor((100 * done) / pool.length);   // floor: 100 hanya jika semua selesai
  return { done, total: pool.length, percent };                                // null → "Belum ada tugas"
}
export function elapsed(start: IsoDate | null, due: IsoDate | null, today: IsoDate): { percent: number; overrun: boolean } | null {
  if (!start || !due || diffDays(start, due) <= 0) return null;               // tanpa tanggal / rentang nol → "—"
  const raw = Math.round((100 * diffDays(start, today)) / diffDays(start, due));
  return { percent: Math.min(100, Math.max(0, raw)), overrun: today > due };
}
export const milestoneState = (m: { dueDate: IsoDate; reachedAt: Date | null }, today: IsoDate) =>
  m.reachedAt ? 'reached' : m.dueDate < today ? 'overdue' : 'waiting';
// condition.ts — hanya status 'active'; override ikut diabaikan di status lain
export function computeCondition(i: ConditionInput, c = METRICS): ConditionResult | null {
  if (i.status !== 'active') return null;
  const active = i.tasks.filter(isActive), late = active.filter((t) => isOverdue(t, i.today));
  const reasons: ConditionReason[] = [];
  const crit = late.filter((t) => (c.AT_RISK_PRIORITIES as readonly string[]).includes(t.priority));
  const ms = i.milestones.filter((m) => milestoneState(m, i.today) === 'overdue');
  if (i.dueDate && i.dueDate < i.today) reasons.push({ code: 'PAST_DUE', days: diffDays(i.dueDate, i.today) });   // → Terlambat
  else {                                                                                                        // → Perlu perhatian (urutan = prioritas alasan tampil)
    if (crit.length) reasons.push({ code: 'IMPORTANT_OVERDUE', count: crit.length });
    if (ms.length) reasons.push({ code: 'MILESTONE_OVERDUE', count: ms.length });
    if (active.length > 0 && late.length / active.length > c.AT_RISK_OVERDUE_RATIO) reasons.push({ code: 'OVERDUE_RATIO', late: late.length, active: active.length });
  }
  const computed = reasons[0]?.code === 'PAST_DUE' ? 'off_track' : reasons.length ? 'at_risk' : 'on_track';
  const ov = activeOverride(i.overrides, i.now);
  return { computed: { condition: computed, reasons }, effective: ov?.condition ?? computed, override: ov };   // computed selalu ikut dikirim
}
export function activeOverride(rows: readonly Override[], now: Date): Override | null  // clearedAt null ∧ (expiresAt null ∨ expiresAt > now), terbaru menurut createdAt
export function formatConditionReason(r: ConditionReason): string                      // "1 tugas penting terlambat" · "tenggat lewat 7 hari" · "2 milestone terlewat" · "3 dari 10 tugas aktif terlambat"
// workload.ts — pasangan SQL: GROUP BY assignee_id, FILTER (WHERE project_id = ANY(:scope))
export type WorkloadScope = 'all' | { projectIds: ReadonlySet<string> };
export function workloadByPerson(tasks: readonly TaskRow[], scope: WorkloadScope, today: IsoDate): Map<string, { active: number; overdue: number; alsoElsewhere: boolean }>
// trash.metrics.ts — hari kalender, cocok dengan angka di 08 ("3 Okt → 26 hari" pada 7 Okt)
export const trashDaysLeft = (deletedAt: Date, now: Date, tz = METRICS.TIME_ZONE, c = METRICS) =>
  Math.max(0, c.TRASH_RETENTION_DAYS - diffDays(isoDateIn(deletedAt, tz), isoDateIn(now, tz)));
export const isRestorable = (deletedAt: Date, now: Date) => trashDaysLeft(deletedAt, now) > 0;                        // hari ke-30 = kedaluwarsa
```
**Aturan baru/ASUMSI yang dikunci kode:** (1) pembulatan progres ke bawah, 100 hanya jika semua selesai (K20); (2) tanpa tenggat → tak bisa Terlambat, waktu berjalan `null` (K21); (3) setiap override baru menutup yang lama di transaksi yang sama (K21); (4) beban Tim menghitung tugas aktif di proyek apa pun yang tidak di Sampah, termasuk proyek `on_hold/completed` (Q10); (5) umur tugas = hari kalender, bukan 24 jam; (6) label Terlambat/Mandek/Tertahan tidak pernah disimpan. Alternatif ditolak: kolom kondisi/progres tersimpan (dilarang project.md "tidak disimpan", basi); rumus hanya di SQL (tak bisa dites unit, ambang terduplikasi).

### 3.7 Pemakaian bersama API (403/409/404) dan UI (menyembunyikan tombol) (f)

1. **Satu pemanggilan, dua keluaran.** Service memuat konteks seminimal mungkin: subjek + satu baris `project_members` (`loadMembership(userId, projectIds[])`, satu query untuk seluruh halaman daftar, bukan per baris). Lalu memanggil fungsi `canX` yang sama:
```ts
// handler (server/api/app/tasks.ts) — pola pengganti cek role manual di app.ts:4
const d = canApproveTask(toPrincipal(actor), ctx.task, ctx.membership);
if (!d.ok) return denyResponse(status, d);      // { error: DENY_UI[code].message, code }, http dari DENY_UI (403/404/409); requestId oleh apiErrorPlugin
```
2. **Bentuk `capabilities` ke klien: peta kecil, bukan objek Decision.** `true` = tampil & aktif; string `DenyCode` = tampil tapi mati (tooltip dari `DENY_UI`); kunci tidak ada = disembunyikan. Hide vs disable dimiliki `DENY_UI.ui`: `LOCKED_BY_STATUS`, `REVIEW_REQUIRED`, `SELF_REVIEW`, `LAST_MANAGER`, `IS_LEAD`, `PROJECT_IN_TRASH`, `NO_ELIGIBLE_REVIEWER` = disable; `NOT_MANAGER`, `NOT_MEMBER`, `NOT_OWNER`, `WRONG_STATE`, `NOT_APP_ROLE` = hide (sesuai wireframe: "Kembalikan tidak tersedia" untuk Anggota = hide, "tombol periksa terkunci" = disable).
```ts
export type CapValue = true | DenyCode;                                   // capabilities.ts
export type TaskCaps = Partial<Record<TaskAction, CapValue>> & { primary: PrimaryAction | null };
export const buildCaps = <K extends string>(r: Record<K, Decision>): Partial<Record<K, CapValue>>;   // ok→true; deny+disable→code; deny+hide→dihapus
// GET /api/app/tasks/12 (Nico; #12 sedang dikerjakan, perlu diperiksa)
// "can": { "update": true, "complete": "REVIEW_REQUIRED", "requestReview": true, "needsReviewOff": true, "cancel": true, "comment": true }, "primary": "requestReview"
```
   Respons daftar membawa `can` ringkas per baris (`primary` + aksi menu baris), dan loader layout membawa `appCaps` (`createProject`, `teamSort`, `trashPurge`, `dashboard`); sidebar/navigasi membaca `appCaps`, bukan `role === …`.
3. **Server tetap penentu.** Mutasi selalu menjalankan ulang `canX`; klien menangani 403/409 dengan `notifications.show` + refetch (kapabilitas bisa basi, mis. dua tab). Tak terlihat → 404.
4. **Anti-duplikasi ditegakkan test, bukan kebiasaan:** (a) `tests/access/route-coverage.test.ts` memindai `server/api/app/*.ts`: setiap `.post/.patch/.put/.delete` wajib memanggil `can*` (pola sama dengan `tests/app-routes.test.ts`); (b) `tests/access/no-role-branching.test.ts` memindai `app/routes/app/**` dan `app/components/**` agar tak ada `appRole ===`/`role === 'manager'` di luar `app/lib/capabilities.ts`; (c) registri `ACTION_IDS` tunggal dipakai policy, `buildCaps`, dan tabel tes: aksi baru tanpa baris matriks menggagalkan test kelengkapan.
5. **API key / MCP** memakai `toPrincipal` yang sama (peran pemilik kunci); scope `app:read/app:write` tetap dicek plugin lebih dulu (`scopes.ts`), policy tidak tahu soal key.
6. **Guard halaman** (`requireUser`, status akun `pending/rejected`) tetap di `guard.ts`; policy tidak mengurus sesi atau status akun.

### 3.8 Strategi test table-driven (g)

- **Lokasi:** `tests/access/*.test.ts` dan `tests/metrics/*.test.ts` (mirror `server/`), fixture di `tests/access/fixtures.ts` (bukan `*.test.ts`). Gaya `describe/test` seperti `tests/permissions.test.ts`, ditambah `test.each` (F11).
- **Lapis 1, matriks eksaustif (data):** `ACCESS_MATRIX: Record<ActionId, Record<Persona, 'allow' | DenyCode>>` memuat tabel §2.2 per keadaan subjek; satu loop menguji ±70 aksi × 8 persona. Test kelengkapan: setiap `ActionId` punya baris. Persona dibangun `persona('PM-K')` → `{ principal, membership }`.
- **Lapis 2, invarian (tanpa library):** SA≡AD dan PM-K≡M-K untuk aksi proyek; monoton `admin ⊇ manager ⊇ member ⊇ viewer`; `none` tak punya izin selain yang tertulis; enumerasi lengkap `status(5) × needsReview(2) × persona(8) × hubungan(pembuat/pengerja/keduanya/bukan)` = 320 kombinasi per aksi tugas (ruang kecil, tak perlu pustaka property-test; aturan #10).
- **Lapis 3, kasus konkret** (di bawah), termasuk angka emas wireframe (Atlas, Migrasi Data Lama, 07 Tim, 08 Sampah; hari ini = **2026-10-07**).
- **Lapis 4, paritas DB** (`tests/db/`, DB test): fixture sama dimasukkan ke tabel; `trashScope`/`projectListScope`/`workloadByPerson` versus query repository harus identik (menjaga D6).
- **Lapis 5, kontrak:** `can` untuk tiap persona×keadaan sama dengan `buildCaps(canX…)`; `DENY_UI` punya entri tiap `DenyCode` (tipe `Record`), pesan tanpa jargon.
- **Waktu:** tak ada `new Date()` di dalam modul; batas wajib diuji: hari = tenggat, rasio tepat 20%, tepat 72 jam, hari ke-30 Sampah, dan `2026-10-06T17:30:00Z` (sudah 7 Okt di WIB).
- **Menjalankan:** `bun test tests/access tests/metrics`; test murni tetap lewat `tests/preload.ts` (boot DB test, F6).

**Fixture:** Boss=SA · Ayu=AD (juga Pemantau di Portal Klien) · Nico=PM-K (Pengelola+Lead Atlas, gabung 1 Sep) · Mira=M-K (Member, Pengelola kedua, gabung 5 Sep) · Rina, Dodi=AG · Sri=PT · Lea=PM-X · Bella=BA (Member). Nama dari wireframe; Mira/Bella contoh baru. Tugas #12: `in_progress`, dibuat Rina, dikerjakan Nico, `needsReview=true`.

| # | Aktor | Subjek / keadaan | Aksi | Hasil yang diharapkan |
|---|---|---|---|---|
| C01 | Dodi | proyek Atlas | `project.view` | allow |
| C02 | Bella | Atlas | `project.view` | deny `NOT_VISIBLE` (HTTP 404) |
| C03 | Lea | Atlas | `project.view` lalu `project.update` | allow; deny `NOT_MANAGER` (hide) |
| C04 | Dodi / Nico / Mira | — | `project.create` | deny `NOT_APP_ROLE` / allow / deny `NOT_APP_ROLE` |
| C05 | Mira | Atlas | `project.update` | allow (K1: Member-Pengelola) |
| C06 | Ayu | Portal Klien (ia Pemantau) | `project.update` | allow (K6) |
| C07 | Sri / Dodi | Atlas | `task.create` | deny `NOT_MEMBER` / allow |
| C08 | Dodi / Rina | #12 (dibuat Rina, dikerjakan Nico) | `task.update` | deny `NOT_OWNER` / allow |
| C09 | Dodi / Dodi | tugas `todo` tanpa pengerja / tugas dikerjakan Rina | `task.start` | allow + efek `BECOMES_ASSIGNEE` / deny `NOT_OWNER` |
| C10 | Nico, Ayu, Boss | #12 (`needsReview=true`, `in_progress`) | `task.complete` | deny `REVIEW_REQUIRED` (disable) untuk ketiganya |
| C11 | Dodi | `todo`, `needsReview=false`, tanpa pengerja | `task.complete` | allow + `BECOMES_ASSIGNEE` (T-A4); dengan `T_A4=false` → deny `WRONG_STATE` |
| C12 | Dodi / Mira / Lea | tugas `in_review`, dikerjakan Dodi | `task.approve` | deny `NOT_MANAGER` / allow / deny `NOT_MANAGER` |
| C13 | Nico / Ayu / Boss | #12 `in_review`, dikerjakan Nico (Pengelola tunggal) | `task.approve` | deny `SELF_REVIEW` / allow / allow |
| C14 | Nico | #12 `in_progress` | `task.approve` | deny `WRONG_STATE` (hide) |
| C15 | Dodi / Nico | tugas `todo`, `needsReview=true` (default proyek) | `needsReview.off` | deny `NOT_MANAGER` / allow |
| C16 | Dodi / Dodi / Sri | tugas `todo` `needsReview=false`: miliknya / milik Rina / milik Dodi | `needsReview.on` | allow (T-A5) / deny `NOT_OWNER` / deny `NOT_MEMBER` |
| C17 | Nico | tugas `in_review`, `done`, `canceled` | `needsReview.on` dan `.off` | deny `LOCKED_BY_STATUS` (disable) untuk keenam kombinasi |
| C18 | Dodi (pengerja, bukan pembuat) / Dodi (bukan keduanya) | tugas `done` | `task.reopen` | allow / deny `NOT_OWNER` |
| C19 | Dodi (pengerja) / Rina (pembuat) | tugas `in_progress` | `task.cancel` | deny `NOT_OWNER` / allow |
| C20 | Rina / Dodi / Nico | tugas dihapus Rina | `task.untrash` | allow / deny `NOT_OWNER` / allow |
| C21 | Boss | tugas di Sampah, proyeknya di Sampah | `task.untrash` | deny `PROJECT_IN_TRASH` (disable) |
| C22 | Sri / Lea / Bella | #12 | `comment.add` | allow / deny `NOT_MEMBER` (K10) / deny `NOT_VISIBLE` |
| C23 | Dodi / Sri | tugas milik Rina | `attachment.add` | allow / deny `NOT_MEMBER` |
| C24 | Mira / Dodi | Atlas | `taskKind.manage` | allow / deny `NOT_MANAGER` |
| C25 | Nico (Pengelola tunggal) | menurunkan dirinya jadi Anggota | `canChangeManagerSet` | deny `LAST_MANAGER` |
| C26 | Nico (Lead), Mira Pengelola kedua | Nico → Anggota / Mira → Anggota | `canChangeManagerSet` | deny `IS_LEAD` / allow |
| C27 | Ayu | mengeluarkan Pengelola tunggal | `canChangeManagerSet` | deny `LAST_MANAGER` (Admin pun) |
| C28 | Nico | `setLead` ke Dodi (Anggota) | `canSetLead` | deny `LEAD_NOT_MANAGER` |
| C29 | Nico | perpanjang tenggat: tanggal baru ≤ lama; alasan kosong | `validateExtension` | deny `DATE_NOT_LATER`; deny `REASON_REQUIRED` (kode validasi, bukan izin) |
| C30 | Mira / Dodi / Lea | event Atlas buatan Rina | `event.update` | allow (K11) / deny `NOT_OWNER` / deny `NOT_OWNER` |
| C31 | Dodi / Dodi | event Nico di Atlas / event tanpa proyek buatannya | `event.outcome.confirm` | deny `NOT_OWNER` / deny `NO_PROJECT` |
| C32 | Sri / Sri | event baru: proyek Atlas / tanpa proyek | `canCreateEvent` | deny `NOT_MEMBER` / allow |
| C33 | Nico / Mira / Dodi / Ayu | — | `trashScope` | `{deletedBy:Nico, projectIds:[Atlas]}` / sama (K12) / `{deletedBy:Dodi, projectIds:[]}` / `{all:true}` |
| C34 | Nico / Ayu / Boss | proyek di Sampah | `canPurge` | deny `NOT_ADMIN` / allow / allow |
| C35 | Nico / Dodi / Lea / Ayu | — | `teamScope.workload` | `{Atlas}` / `'self'` / `'self'` / `'all'` |
| C36 | Ayu / Ayu / Boss | Member→PM / PM→Admin / PM→Admin | `canSetUserRole` | allow / deny `TARGET_PROTECTED` / allow |
| C37 | Ayu / Ayu / Boss / Boss | suspend Admin lain / suspend diri sendiri / suspend Ayu / ubah SA lain | `canActOnUser` | deny `TARGET_PROTECTED` / deny `SELF_TARGET` / allow / deny `TARGET_PROTECTED` |
| C38 | Ayu / Ayu / Nico | undangan role Admin / role PM / pengaturan tim | `canInviteWithRole`, `canChangeTeamSettings` | deny `TARGET_PROTECTED` / allow / deny `NOT_ADMIN` |
| C39 | — | pembuat Mira (Pengelola), pengerja Dodi | `pickReviewer` | `user Mira via creator` |
| C40 | — | pembuat Rina, Lead Nico, pengerja Dodi | `pickReviewer` | `user Nico via lead` |
| C41 | — | pembuat Rina, pengerja Nico (Lead), Pengelola Nico+Mira | `pickReviewer` | `user Mira via manager` |
| C42 | — | #12: pembuat Rina, pengerja Nico, Pengelola hanya Nico | `pickReviewer` | `admin-pool`, `suggestSecondManager=true` |
| C43 | — | dua Pengelola non-Lead gabung bersamaan (id `u2`,`u1`) | `pickReviewer` | `u1` (seri → id terkecil) |
| C44 | Anggota; Pengelola | default proyek `true`, diminta `false` | `resolveNeedsReviewOnCreate` | `{true, ignored:true}`; `{false, ignored:false}` |
| C45 | Nico | `requestReview`, kandidat = {Nico}, tanpa Admin/SA aktif | `canRequestReview` | deny `NO_ELIGIBLE_REVIEWER` |
| C46 | Dodi / Nico / Nico / Dodi / Sri | `todo` / `in_progress` `needsReview=false` / `in_review` (bukan pengerja) / `in_review` (pengerja) / `done` | `primaryAction` | `start` / `complete` / `approve` / `null` / `null` (Sri) |
| F01 | — | 3 selesai, 1 `in_review`, 2 `todo`, 1 `canceled`, 1 selesai-terhapus | `progress` | 3/6 → 50 |
| F02 | — | tanpa tugas; semua `canceled` | `progress` | `percent=null` keduanya |
| F03 | — | 199 dari 200 selesai; 200 dari 200 | `progress` | 99; 100 |
| F04 | — | fase P: 2 selesai dari 3, plus 5 tugas tanpa fase | `progress(…, P)` | 66 (tugas tanpa fase hanya masuk proyek) |
| F05 | — | mulai 10-01, tenggat 10-31, hari ini 10-07 | `elapsed` | `{20, overrun:false}` |
| F06 | — | tenggat 10-31; hari ini 11-05 / 09-28 | `elapsed` | `{100, overrun:true}` / `{0, false}`; mulai=tenggat atau tanpa tanggal → `null` |
| F07 | — | Migrasi Data Lama aktif, tenggat 09-30 | `computeCondition` | `off_track`, `PAST_DUE days=7` |
| F08 | — | Atlas tenggat 10-31, #12 prioritas `high` jatuh tempo 10-05 | `computeCondition` | `at_risk`, `IMPORTANT_OVERDUE count=1` |
| F09 | — | 10 aktif, 2 terlambat (low) / 3 terlambat (low) | `computeCondition` | `on_track` (0,2 tidak > 0,2) / `at_risk` `OVERDUE_RATIO` |
| F10 | — | tenggat = hari ini (10-07); status `on_hold` + terlambat + override sah | `computeCondition` | bukan `off_track`; hasil `null` |
| F11 | — | hitungan `off_track`, override `on_track` berlaku | `computeCondition` | `effective=on_track`, `computed=off_track`; override `expiresAt=now` atau `clearedAt` terisi → diabaikan |
| F12 | — | milestone due 10-06 belum tercapai / due 10-07 | `milestoneState` | `overdue` (→ `at_risk` `MILESTONE_OVERDUE`) / `waiting` |
| F13 | — | todo due 10-06 / due 10-07 / done lampau / tanpa tenggat / `deletedAt` terisi | `isOverdue` | true / false / false / false / false |
| F14 | — | `in_progress` 72 jam tepat / 72 jam + 1 menit / `todo` 10 hari / `in_review` | `isStale` | false / true / false / false |
| F15 | — | dibuat `2026-09-30T17:30Z` (= 10-01 00:30 WIB); selesai 10-04; sekarang 10-07 | `ageDays` | 6 (aktif; hitung UTC akan 7); 3 (selesai) |
| F16 | — | `now=2026-10-06T17:30:00Z`, tugas jatuh tempo 10-06 | `isoDateIn` + `isOverdue` | hari ini `2026-10-07` → terlambat (hitung UTC saja akan salah) |
| F17 | — | dihapus 10-03 / 10-06 / 09-28 / 09-07, sekarang 10-07 | `trashDaysLeft`, `isRestorable` | 26 / 29 / 21 (cocok 08) / 0 dan `false` |
| F18 | — | Rina: Atlas 3 aktif (1 terlambat) + Portal 2 aktif | `workloadByPerson` | scope `all` → 5/1; scope `{Atlas}` → 3/1, `alsoElsewhere=true` (cocok 07) |
| F19 | — | pemblokir `done` / `canceled` / di Sampah / `in_progress` | `isBlocked` | false / false / false / true |
| F20 | — | terlambat ∧ `in_review` (saya pemeriksa) ∧ tertahan | `taskLabels` | `all=[Terlambat, Menunggu diperiksa saya, Tertahan]`, `primary=Terlambat` |

Total **66 baris kasus** (46 izin/aturan + 20 rumus), di luar lapis eksaustif; tiap baris menjadi satu tuple `test.each`.

## 4. Risiko dan mitigasi

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| R1 Policy/rumus TS dan query SQL (daftar, Sampah, Tim, beban) berbeda definisi | Sedang | Tinggi | D6: konstanta bersama (`ACTIVE_STATUSES`, ambang), *scope descriptor*, lapis 4 tes paritas DB |
| R2 Klien menarik kode server (impor direktori `@server/access`, teks "process." di komentar) | Sedang | Sedang | Aturan impor §3.2 (F5); `tests/client-server-imports.test.ts` tetap hijau; `index.ts` hanya server |
| R3 Tafsir K1/K2/K6 (kolom PM/Member, self-review, Admin-Pemantau) tidak sesuai niat user | Sedang | Tinggi | Semua variasi jadi flag `ACCESS_RULES`/kode `DenyCode` kecil; Q1–Q4 dijawab sebelum implementasi; reviewer membaca §2.2 |
| R4 Fase 0 (ganti `user`→`member`, 4 role) merusak scope API key, ScopePicker, 14 rujukan `ROLES.USER` di test | Tinggi | Sedang | Ekspor `ROLE_RANK`/`roleAtLeast` dari `permissions.ts`; policy hanya bergantung `Role` + `isAdminRole`; jalankan seluruh suite di akhir Fase 0 |
| R5 Zona waktu/batas hari salah → label Terlambat/Sampah bergeser sehari | Sedang | Sedang | `today`/`now` parameter; kasus F15–F17; satu sumber `TIME_ZONE` |
| R6 N+1 saat membangun `can` per baris daftar | Sedang | Sedang | `loadMembership(userId, projectIds[])` satu query per halaman; daftar wajib paginated; `can` ringkas per baris |
| R7 Kapabilitas basi di klien (dua tab, peran berubah) → tombol tampil tapi API 403/409 | Tinggi | Rendah | Server penentu; klien menampilkan notifikasi + refetch; tanpa cache lintas navigasi |
| R8 Kebocoran keberadaan proyek lewat 403 | Rendah | Sedang | D8: tak terlihat → 404 (`NOT_VISIBLE`); test C02, C22 |
| R9 Test murni lambat karena preload menyalakan DB test (F6) | Tinggi | Rendah | Diterima; opsi preload kondisional dicatat sebagai usulan terpisah (di luar R03) |
| R10 `task.policy.ts`/`task-flow.policy.ts` melewati batas file | Sedang | Rendah | Tata letak §3.2; periksa saat mencapai 80% batas (aturan #8) |

## 5. Estimasi usaha (ASUMSI; pekerja AI + 1 reviewer manusia; Fase 0 sudah selesai lebih dulu)

| Paket | Ukuran | Hari-orang AI |
|---|---|---|
| `types/decision/level/rules` + `project`/`members` policy + tes bagiannya | M | 3–4 |
| `task`/`task-flow`/`review` policy, state machine, `primaryAction` | M | 3–4 |
| `event`/`trash`/`team`/`user`/`settings` policy, scope descriptor, `capabilities.ts` | M | 2–3 |
| `server/metrics/*` (tanggal, tugas, progres, kondisi, beban, Sampah) | M | 2–3 |
| Tes lapis 2–5, paritas DB, `route-coverage`, `no-role-branching` | M | 2–3 |
| **Total** | **L** | **10–15** (bisa dipotong bila `event/trash/team/user` menunggu modulnya) |
| Reviewer manusia | S | 2–3 hari: membaca §2.2 dan menjawab Q1–Q11 (±1), review PR per paket (±1–2) |

Urutan yang disarankan: Fase 0 → `types/decision/level/rules` → proyek+tugas policy → metrics → capabilities → API → UI; paket event/trash/team mengikuti modulnya.

## 6. Pertanyaan terbuka untuk user

1. **(K2)** Pengerja tidak boleh menyetujui tugasnya sendiri, termasuk Admin/super-admin. Pada tim satu orang, tugas bertanda "Perlu diperiksa" harus ditolak dari Minta diperiksa (`NO_ELIGIBLE_REVIEWER`). Setuju?
2. **(K10)** PM yang bukan anggota proyek (baca saja) boleh berkomentar seperti Pemantau, atau murni baca?
3. **(K1)** Member yang ditunjuk Pengelola mendapat semua hak Pengelola, termasuk melihat beban anggota, item Sampah proyeknya, dan mengubah event proyek. Setuju?
4. **(K6)** Admin yang tercatat Pemantau di sebuah proyek tetap berhak penuh (usulan), atau dibatasi seperti Pemantau?
5. **(K22)** Satu zona waktu untuk seluruh tim (Asia/Jakarta)? Apakah tim lintas zona?
6. Bolehkah Anggota **keluar sendiri** dari proyek? (dokumen tidak menyebut; usulan: tidak, hanya Pengelola/Admin.)
7. Proyek berstatus Selesai/Dibatalkan/Ditunda: apakah tugas masih boleh dibuat/diubah? (usulan: boleh; hanya Sampah yang mengunci.)
8. **(K19)** Mandek dihitung hari kalender (usulan) atau hari kerja?
9. Pengelola/Admin boleh menghapus komentar dan bukti milik orang lain (moderasi)? (usulan: ya.)
10. Beban Tim: tugas di proyek `on_hold/completed/canceled` ikut dihitung? (usulan: ikut, selama tugas aktif dan tidak di Sampah.)
11. **(K4)** Lead diturunkan/dikeluarkan saat ada Pengelola lain: diblokir dengan tombol "Jadikan Lead lain" (usulan) atau dipindah otomatis ke Pengelola terlama?

## 7. Sumber

Dokumen (dibaca penuh kecuali dicatat): `tahapan-proyek/05-implementasi/riset/_BRIEF.md`; `03-desain/erd/project.md`, `task.md`, `user-profile.md` (bagian peran), `gabungan.md`; `03-desain/erd/diskusi/00-role-dan-area.md`, `02-proyek.md` (§1–3, bagian rekonsiliasi dicari lewat grep), `03-tugas.md` (§1–2, sisanya grep), `04-wireframe-per-role.md`, `05-events.md` (§1–3), `06-inbox.md`, `07-tim.md`, `08-sampah.md`, `09-pengaturan.md`; `note.md` (grep Mandek/beban/umur); `02-analisis/hasil-orchestrasi/deliverables/workflow.md:1393-1440` (matriks lama) dan `orchestration/DECISIONS.md` (grep D6/F3).
Kode: `server/permissions.ts`, `server/roles.ts`, `server/guard.ts`, `server/env.ts`, `server/settings.core.ts` (kepala), `server/api/app.ts`, `server/api/admin.ts:36-133`, `server/api-keys/scopes.ts:1-60`, `app/components/api-keys/ScopePicker.tsx:1-14`, `app/lib/app-context.ts`, `app/lib/time-format.ts`, `app/routes/{super,admin}/layout.tsx` (guard), `tests/permissions.test.ts`, `tests/guard.test.ts` (kepala), `tests/client-server-imports.test.ts`, `tests/preload.ts`, `bunfig.toml`, `tsconfig.json:13` (alias `@server/*`), `node_modules/bun-types/test.d.ts:573`. Perintah baca: `grep`, `sed`, `cat`, `bun --version` (1.3.14). Tidak ada kode dijalankan atau diubah; tidak ada angka versi dari luar repo.
