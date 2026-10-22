# Audit menu TUGAS — HASIL SEMENTARA (dihentikan koordinator)

Cabang `nicoarya20/audit-pm-tugas` (kepala `161def2`). Tidak ada kode produk diubah, tidak ada commit, tidak ada worker_done. Probe sementara ada di `/tmp/audit/evidence-TUGAS/` (sudah dihapus dari repo; worktree bersih).

**Dasar yang sehat:** `tests` menu tugas 361 + 829 lulus (0 gagal), `bun run typecheck` nol error, `biome check` bersih, perf 1000 tugas median 3,5 ms. Matriks filter server: 3612 kombinasi (scope mine/all × proyek × tenggat × urutan, keyset limit 4) = oracle memori, **0 selisih**, hitungan `counts` = isi daftar per kelompok. Perbaikan filter Proyek (`adbe0c9`) terverifikasi di semua kombinasi.

Belum diaudit (waktu habis): dimensi 8 secara menyeluruh, pencocokan menyeluruh `TaskDraft*`/`useTaskWrite`, uji visual apa pun (butuh browser).

## Temuan

Tingkat: K=Kritis, T=Tinggi, S=Sedang, R=Rendah. TK=terkonfirmasi (kode/tes), D=dugaan (butuh browser).

| ID | Tk | TK/D | Berkas:baris | Bukti singkat | Saran |
|---|---|---|---|---|---|
| T-01 | K | TK | `app/lib/eden.ts:13` (`treaty<Api>(baseUrl())` tanpa `parseDate:false`); dampak di `app/components/ui/DateText.tsx` (`describeDue` → `ISO_DATE_RE.test(Date)`), `TaskRow.tsx:87-88`, `TaskHeader.tsx:102-103`, `TaskTable.tsx:52-57`, `TaskGroupList.tsx:25-27`, `app/lib/tasks-highlights.ts` | Eden menjadikan string `YYYY-MM-DD` (dan ISO instan) objek `Date`. Probe `eden1/eden2`: baris tugas hasil fetch klien mencetak tenggat **"—"** (string: "5 Okt 2026 · terlambat 2 hari"); header detail sama setelah refetch. `GroupSection` selalu fetch klien tanpa seed, jadi **semua baris "Tugas saya"**, hasil ganti saringan/urutan, "Tampilkan lebih banyak", kartu sorotan proyek, dan header detail setelah aksi pertama (semua aksi meng-invalidate `taskKeys.all`, staleTime 30 dtk) kehilangan tenggat dan warna "terlambat". Tes UI tidak menangkap karena memakai string, tidak melewati Eden. Ini dampak nyata **H-C15/H-G8** (hutang sudah dicatat, dampaknya belum diketahui) | Satu baris: `treaty<Api>(url, { parseDate: false })` (DTO sudah bertipe `string`); audit pembaca `Date` lain (H-C15); tambah tes kontrak lewat Eden asli. Ukuran S |
| T-02 | T | TK | `app/components/tasks/task-timeline.ts:41-49,20-38`, `TimelineText.tsx` | Akibat T-01 pada riwayat: payload `due_date_changed` `{from,to}` jadi `Date` → `str()` null → teks **"mengubah tenggat (dikosongkan)"** padahal tenggat diubah (probe eden3). Komentar yang isinya hanya tanggal (mis. `05/10/2026`, `2026-10-05`) menjadi `Date` → `splitLinks` melempar `text.matchAll is not a function` → timeline detail crash untuk semua yang membuka tugas itu. Judul/langkah yang persis berupa tanggal berisiko sama (React child object) | Selesai oleh perbaikan T-01; tambah tes judul/komentar/langkah berbentuk tanggal |
| T-03 | S | TK | `app/components/tasks/CreateTaskButton.tsx:28-35`, `app/routes/app/tasks.tsx:66`; spek wireframe ④ (Pemantau tidak melihat tombol) | Pemantau yang sudah ada di proyek tetap melihat tombol "Tugas baru" **mati** dengan alasan "Anda belum masuk proyek apa pun" — salah untuk Pemantau/PM bukan anggota. `task-new.tsx:36-51` sudah membedakan "hanya melihat" vs "tanpa proyek", daftar belum | Bedakan alasan (atau sembunyikan tombol) memakai pembeda yang sama dengan loader `task-new` |
| T-04 | S | TK | `NextStepBar.tsx` (tak ada tombol), `app/lib/tasks-api.ts:182` (`unstartTask` tak dipakai), `useTaskActions.tsx` | **"Batal mulai"** (in_progress → todo) ada di API, di `ENABLED_TASK_ACTIONS`, di diagram status 03-tugas §2 dan `can.unstart`, tetapi tidak ada tombol di UI. Tugas yang terlanjur "Mulai kerjakan" tidak bisa dikembalikan lewat UI | Tambah aksi sekunder "Batal mulai" di `NextStepBar` memakai `can.unstart`, atau putuskan membuangnya dan catat di HUTANG |
| T-05 | S | D | `app/routes/app/task-edit.tsx:86-88`, `task-new.tsx:75-78`, `app/components/ui/BackLink.tsx:24-28` | Simpan → `navigate(detail)` tanpa `replace`; `BackLink` memakai `navigate(-1)`. Daftar → detail → ubah → detail: "Kembali" membawa ke **form ubah**, bukan daftar (buat tugas: kembali ke form kosong). Param `dari` (`task-back.ts` `BACK_PARAM`) tak dipakai tautan mana pun | `navigate(detail, { replace: true })` setelah simpan; pakai `?dari=` dari baris daftar atau hapus parameter mati. Cek di browser |
| T-06 | S | TK | `app/routes/app/tasks.tsx:52,68-72`, `server/team/picker.query.ts:20,70-72` | Filter Orang diisi `pickPeople(limit 50)`: hanya 50 akun pertama (A–Z) dan hanya untuk yang boleh membuat proyek; Member mendapat daftar kosong (hanya "Saya"). Tim >50 orang: orang ke-51+ tak bisa dipilih; `?orang=<id>` di luar daftar menyaring tanpa isian terlihat. Daftar Proyek dipotong 100 (`tasks.tsx:27`), form tugas juga 100 (`task-form.query.ts` `TASK_FORM_PROJECT_LIMIT`) | Isi Orang dari anggota proyek yang terlihat (bukan picker global), pencarian server, atau tampilkan nilai tak dikenal sebagai chip |
| T-07 | S | TK | `app/components/tasks/TimelineItem.tsx:126`, `server/task/task-comment.service.ts:130-132` | Server mengizinkan Pengelola/Admin menghapus komentar siapa pun (D6), tetapi menu hapus hanya muncul untuk penulis (`own`). Moderasi tak mungkin lewat UI | Tampilkan "Hapus komentar" bila viewer Pengelola/Admin (butuh cap `can.moderateComment` dari server, bukan `role ===`) |
| T-08 | S | TK | `app/components/ui/notify.ts` (tombol `Urungkan` `size: 'xs'`), `BackLink.tsx` (`size="sm"` 36 px), `TaskChecklist.tsx:77-85` (Checkbox `lg` = 28 px), `PageHeader.tsx` (tautan kembali teks) | Target sentuh di bawah 44 px pada kontrol penting: tombol **Urungkan** (aksi T1 utama, ±10 dtk), Kembali, centang langkah ("centang besar"). Hutang H-C16 hanya mencatat EmptyState/Chip | `Urungkan` `size="lg"`; BackLink tanpa `size`; centang `xl` + area klik baris. Ukur di browser (D untuk Checkbox) |
| T-09 | S | TK | `app/components/tasks/useTaskBodyActions.ts:19,48`, `useTaskActions.tsx:35` | Tiap centang langkah/komentar → `invalidateQueries(taskKeys.all)`: detail, timeline (semua halaman infinite), daftar, hitungan ikut refetch; checkbox `disabled` selama itu dan baru berubah setelah refetch (tanpa pembaruan optimistik; respons server berisi `checklist` lengkap tetapi tak dipakai `setQueryData`) | `setQueryData` dari respons; invalidate hanya kunci yang berubah |
| T-10 | S | D | `app/components/tasks/TaskRow.tsx:101-111` | Di 375 px skala 1 baris "Tugas saya": kolom kiri `flex:1; minWidth:0` bersaing dengan grup kanan `nowrap` (tombol "Mulai kerjakan" lg + ikon 44 px ≈ 240 px) dari lebar isi ≈ 320 px → judul `truncate` tinggal ±70 px. Skala 1,25/1,5 membungkus | Letakkan tombol di baris sendiri di bawah `sm` (seperti `TaskCard`). Cek di browser |
| T-11 | S | TK | `task-draft.copy.ts` (`noAiNote`, `projectHint`), `server/ai/task-draft.prompt.ts`, `task-draft.service.ts:65-69` | Teks cerita (bebas, bisa memuat data pribadi) + nama tampilan anggota + nama jenis dikirim ke penyedia luar (Anthropic). UI hanya berkata "AI tidak menyimpan apa pun sebelum Simpan diklik" — tak ada keterangan teks dikirim ke pihak ketiga; tidak ada saklar tingkat tim (hanya `ANTHROPIC_API_KEY`). Id/email/proyek lain tidak dikirim (baik). Terkait **H-G3/H-G7/H-C14** | Satu kalimat keterangan di kotak tulis; putuskan saklar `ai_enabled` sebelum dipamerkan |
| T-12 | R | TK | `server/task/task.sql.ts:165-172`, `task.query.ts:122`, `tests/task/task.query.test.ts:232` | Kursor tak terikat urutan/saringan: kursor `updated` diterima di urutan `created` (sama-sama teks waktu), kursor dari saringan lain juga diterima (probe matrix). Komentar kode mengklaim "belongs to another sort → BAD_CURSOR". Klien aman (kunci cache memuat query), hanya klien lain/API key terdampak | Sisipkan nama urutan di kursor; tes untuk updated↔created |
| T-13 | R | TK | `server/task/task.query.ts:197-209`, `app-tasks.ts:60` | `byStatus` dihitung tiap `/tasks/counts` tetapi tak dipakai UI (chip status tanpa hitungan) | Buang, atau tampilkan hitungan di chip |
| T-14 | R | TK | `app/components/ui/ReasonModal.tsx` (label Textarea memakai `requireNote` global) | Modal Batalkan: label tetap "Catatan (boleh dikosongkan)" saat "Lainnya" dipilih padahal wajib; galat baru muncul saat kirim. Galat Batalkan/Buka lagi tampil ganda (toast + alert dalam dialog: `task-reason.ts` `settle` melempar ulang) | Label mengikuti `chosen.requireNote`; satu kanal galat |
| T-15 | R | TK | `app/components/tasks/tasks.copy.ts:94-95`, `server/access/decision.ts:23-60` | Register bahasa campur: UI tugas "Anda", pesan `DENY_UI` "kamu"; kosakata "yang mengerjakan" vs "pengerja" vs "penanggung jawab" (`task-body.copy.ts` `assignee_changed`); pesan `NOT_OWNER` menyebut "yang mengerjakan" padahal batalkan/hapus hanya pembuat/Pengelola; riwayat "mengganti penanggung jawab" tanpa siapa ke siapa | Satukan sapaan dan istilah (glosarium R11 §3.4) |
| T-16 | R | TK | `app/components/tasks/TaskHeader.tsx:24-38,81-108` | Header detail tak menampilkan Tahapan (wireframe ⑧ menyebut tahapan); DTO sudah memuat `phase` (sisa H-B5). Daftar juga belum (H-C12) | Tambah `Fact` Tahapan |
| T-17 | R | TK | `TaskFormProject` label di `TaskForm.tsx:150-156` | Dropdown Proyek di form menampilkan proyek Selesai/Dibatalkan/Ditunda tanpa keterangan status (Q12 memang membolehkan) | Tambah status di label proyek tertutup |
| T-18 | R | TK | `server/access/trash.policy.ts:99-100` | `canRestoreTask`: `mine` (penghapus) lolos walau sudah dikeluarkan/diturunkan jadi Pemantau; tak ada pengecekan level. Pemulihan masuk ke proyek yang tak ia ikuti lagi | Tinjau: wajibkan level ≥ member atau Pengelola/Admin |
| T-19 | R | TK | `TaskChecklist.tsx:160,165`, `NextStepButton.tsx:34-44` | A11y: `aria-label` pada `<p>` progres "2/3" tak andal dibaca; ratusan tombol "Mulai kerjakan" bernama sama tanpa judul tugas (`aria-label="Mulai kerjakan: <judul>"`); centang read-only `disabled` tanpa alasan; judul halaman `h3`, grup jadwal `h2`, detail `h2` (urutan heading terbalik, tak ada `h1`); "✦" di label tombol terbaca "bintang"; ikon `FiCheck` `TaskChecklist.tsx:64` tanpa `aria-hidden` | Perbaiki per butir |
| T-20 | R | TK | `TaskGroupList.tsx:25-27`, `app/routes/app/tasks.tsx:42` | "Tugas saya": SSR hanya menanam hitungan; baris tiap kelompok (≤6 permintaan) baru diambil klien setelah hidrasi → kerangka dulu, lalu baris; timeline detail juga hanya klien | Tanam kelompok pertama di loader (seed) |
| T-21 | R | TK | `app/routes/app/task-detail.tsx:55-60` | Tugas dipindah ke Sampah oleh orang lain: refetch 404 tetapi data lama tetap tampil tanpa pesan | Tampilkan keadaan "tugas sudah tidak ada" saat refetch 404 |
| T-22 | R | TK | Kode mati: `tasks-api.ts:182` `unstartTask`, `:198` tipe `TaskComment`, `tasks-filters.ts` `taskFiltersToParams` (hanya tes), `use-url-filters.ts` `countActiveParams` (hanya tes), `task.limits.ts` `S4_ACTIONS` (hanya tes), `ai/task-draft.types.ts` `TaskDraftRequest`, `ai/task-draft.limits.ts` `TASK_DRAFT_NOTE_MAX`, `task-body.copy.ts` `COMMENT_COPY.closed`, `TIMELINE_COPY.by`, `BACK_PARAM`; duplikasi: `oneOf` di `app-common.ts` dan `app-tasks.schema.ts`; `type Actor`+`authorOf` di 3 berkas `app-tasks.*`; `refresh/onError` di `useTaskActions` dan `useTaskBodyActions`; komentar usang hapus-tugas (H-C17) | Hapus/gabung |
| T-23 | R | TK | `task.sql.ts` urutan `due` untuk chip Selesai/Dibatalkan | Daftar "Selesai" default diurut tenggat naik (tertua dulu), bukan yang terbaru selesai | Urutan bawaan per chip (terbaru) |

## Matriks kesesuaian (ringkas)

| Layar | Status |
|---|---|
| ① Tugas saya | Ada: judul, + Tugas baru, toggle, cari, chip, Proyek/Orang/Prioritas, urut, kelompok jadwal + hitungan, kosong ④, satu tombol langkah. Tidak ada: Jenis (H-B15), Tag, Papan, "Menunggu diperiksa saya" (S4). **Berbeda/rusak:** tenggat baris "—" (T-01) |
| ② Semua tugas | Sebagian: 5 kolom sengaja (K15), kartu mobile; tanpa #, jenis, tag, CSV, checkbox (H-C5/H-C9/H-C12) |
| ⑤ Tulis saja | Ada hampir lengkap (toggle, 🎤 mati "segera", banner, centang, ✏️, pertanyaan, simpan N). Belum diuji ke API sungguhan (H-C14) |
| ⑥ Isi form | Ada sesuai P3 (+Tahapan); tanpa Estimasi/Tag/Perlu diperiksa (S4/S5); lipatan tertutup (wireframe terbuka, P3 menyatakan terlipat) |
| ⑧ Detail | Sebagian: tanpa Tahapan (T-16), tanpa "Batal mulai" (T-04); tenggat hilang setelah aksi (T-01) |
| ⑨⑩ | Tidak ada: Perlu diperiksa, Pemeriksa, Bukti, Menahan, Setujui/Kembalikan (H-C2/C3/C8) |
| ⑪ Modal | Ada; label kategori berbeda dari wireframe ("Tugas dobel" vs "Dobel/sudah ada", dst.) |
| Hapus T1 + Urungkan + Sampah tugas | Ada (tanpa dialog, toast ±10 dtk, pulihkan, tak lewat API key). Hapus permanen/purge 30 hari belum (H-D5) |

## Cakupan tes (celah)

Tidak ada tes yang melewati klien Eden asli (sebab T-01/T-02); tidak ada tes sudut gabungan "judul/komentar berbentuk tanggal"; kursor lintas urutan `updated`↔`created`; daftar Orang >50 orang; navigasi Kembali setelah ubah/buat; hapus komentar oleh Pengelola dari UI; Batal mulai di UI; a11y (axe) dan tata letak mobile (tidak bisa diuji tanpa browser); API Anthropic sungguhan (H-C14).

## Perlu dicek manual di browser

1. Buka `/app/tasks` (akun dengan tugas): apakah tiap baris menampilkan tenggat atau "—" (T-01). Klik "Mulai kerjakan" di detail, lihat header Tenggat.
2. Tulis komentar `05/10/2026` pada sebuah tugas, muat ulang: apakah bagian "Obrolan & riwayat" error (T-02).
3. Daftar → buka tugas → Ubah → Simpan → "Kembali": ke mana? (T-05)
4. 375 px: baris "Tugas saya" dengan judul panjang (T-10); skala teks 1/1,25/1,5.
5. Akun Pemantau: tombol "Tugas baru" dan alasannya (T-03).
6. Hapus tugas dari baris: toast "Urungkan" mudah ditekan di HP? (T-08)

## Paket kerja yang disarankan

1. **Eden Date** (S): `app/lib/eden.ts` + tes kontrak baru + audit pembaca Date (T-01, T-02). Prioritas pertama.
2. **Daftar/Orang/kursor** (M): `app/routes/app/tasks.tsx`, `server/team/picker.query.ts` (baca), `server/task/task.sql.ts`, `task.query.ts`, tes (T-06, T-12, T-13, T-20, T-23).
3. **Detail & alur** (M): `NextStepBar.tsx`, `TaskHeader.tsx`, `TimelineItem.tsx`, `task-edit.tsx`, `task-new.tsx`, `BackLink.tsx`, `useTaskBodyActions.ts`, `task-detail.tsx` (T-04, T-05, T-07, T-09, T-16, T-21).
4. **Salinan, sentuh, a11y** (S): `tasks.copy.ts`, `task-body.copy.ts`, `notify.ts`, `ReasonModal.tsx`, `CreateTaskButton.tsx`, `TaskRow.tsx`, `TaskChecklist.tsx` (T-03, T-08, T-10, T-14, T-15, T-19).
5. **AI/privasi + kebijakan** (S): `task-draft.copy.ts`, keputusan H-G3, `trash.policy.ts` (T-11, T-18).
6. **Bersih-bersih** (S): berkas T-22.

Ringkasan jumlah: Kritis 1, Tinggi 1, Sedang 9, Rendah 12 (total 23).
