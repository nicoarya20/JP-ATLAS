# QA S2 — bukti mesin, ukuran teks × lebar layar, dan demo SP-G2

Dokumen S2-15 (G20). Sumber: P3 §6.2 (demo S2) dan §6.3 (UP-1), R09 §3.8; bentuk mengikuti `qa-s1.md`.
Cabang `feature/pm-s2-15-smoke-user-test-prep`. Dibuat **tanpa browser** (aturan G20): bagian **Mesin** hanya berisi yang dibuktikan tes otomatis, dijalankan di cabang ini; semua yang butuh mata manusia tertulis **belum diuji — menunggu user (CP)**.

> Hasil uji pengguna dengan penguji dummy **tidak memenuhi gerbang S2** (KEPUTUSAN Q14, §5). UP-1 belum dijalankan; bahannya ada di `putaran-1-skrip.md` dan `putaran-1-lembar-catat.md`.

## 1. Bukti mesin — peta "Selesai bila" §6.2

Setiap baris dijalankan dengan `bun test <berkas>` (lingkungan terisolasi `g20-s2-15`); angka di kolom Hasil adalah keluaran nyata.

| # | "Selesai bila" (P3 §6.2) | Berkas tes | Hasil |
|---|---|---|---|
| M1 | Transisi sah dan ≥ 20 tak sah (409) lulus `test.each` | `tests/access/task-flow.policy.test.ts`, `tests/api/tasks-workflow.test.ts` (9 pasangan sah dari 6 verba, daftar `ILLEGAL` ≥ 20 dicek `toBeGreaterThanOrEqual(20)`, tiap pasangan menjawab 409 dan status tak berubah) | 100 lulus, 0 gagal |
| M2 | UI tidak bercabang role; `primary` dihitung server | `tests/no-role-branching.test.ts`, `tests/ui/task-header.test.tsx`, `tests/task/task-detail.query.test.ts` | 60 lulus, 0 gagal |
| M3 | Tugas saya ≤ 6 kueri dan konstan terhadap n; median pada 1.000 tugas dilaporkan (M23) | `tests/perf/pm-load.tasks.test.ts` (`PM_PERF=1`: `scope=mine` dan `scope=all`) | 7 lulus, 0 gagal; median 3,0 ms dan 3,0 ms pada 1.000 tugas (batas 200 ms) — laporan, bukan gerbang CI |
| M4 | Matriks IDOR 8 persona | `tests/api/tasks-security.test.ts`, `tests/api/tasks-security.input.test.ts` | 141 lulus, 0 gagal |
| M5 | `<img onerror>` ter-escape | `tests/ui/task-timeline.test.tsx` (tampil `&lt;img …&gt;`), `tests/api/task-checklist-comments.test.ts` (disimpan apa adanya), `tests/ui/task-checklist.test.tsx` | 34 lulus, 0 gagal |
| M6 | Tidak ada rute `approve` / `return` / `request-review` | `tests/api/tasks-workflow.test.ts` (`it.each(['approve','request-review','return'])`) | termasuk di M1 |
| M7 | Proyek Selesai tetap menerima tugas (Q12) | `tests/access/task.policy.test.ts`, `tests/ui/project-header.test.tsx` | 92 lulus, 0 gagal |
| M8 | Penjaga halaman, `meta()`, urutan rute | `tests/app-routes.test.ts`, `tests/app-contracts.test.ts`, `tests/app-route-precedence.test.ts` | 56 lulus, 0 gagal |
| M9 | Tidak ada tombol Hapus tugas, saklar Perlu diperiksa, Tag, Bukti, Papan | `tests/ui/task-header.test.tsx` (Bukti, Tertahan, Perlu diperiksa, Tag, Hapus), `tests/ui/tasks-page.test.tsx` (Papan, CSV, Tag), `tests/ui/project-tasks-tab.test.tsx` | 40 lulus, 0 gagal |
| M10 | Pemetaan scope rute `/api/app` baru | `tests/api-keys/scopes.test.ts`, `tests/api-keys/scopes.pm.test.ts` | 139 lulus, 0 gagal |
| M11 | Smoke: rute tugas anonim → 302 `/login`; `/api/app/tasks` → 401 `UNAUTHORIZED` + `x-request-id` | `tests/smoke-server.test.ts`, `scripts/smoke-server.checks.ts`; `smoke:prod`, `smoke:binary` (Bun 1.4.2), `smoke:coldboot` | tes 19 lulus (bersama M12); ketiga smoke **39/39** (38 pemeriksaan terdaftar + satu aset klien) |
| M12 | Pemindaian skala (tanpa piksel tetap, tabel via `ResponsiveTable`, `wrap`) kini mencakup `app/components/tasks/**` dan `app/routes/app/task*.tsx` | `tests/ui/app-scale-safety.test.ts` | 13 lulus, 0 gagal (lihat F1) |
| M13 | Golden Atlas 17 % dan seed penguji | `tests/atlas.golden.test.ts`, `tests/seed-guard.test.ts`, `tests/seed-uji.test.ts` | 46 lulus, 0 gagal |
| M14 | Waktu `bun run typecheck` ≤ 9 dtk (RS-2) | tiga kali ukur berurutan | 3,85 dtk · 3,39 dtk · 3,56 dtk — di bawah batas, tidak perlu eskalasi |
| M15 | `bun run typecheck` nol kesalahan | `bun run typecheck 2>&1 \| grep -c "error TS"` | 0 |

Yang **tidak** dibuktikan mesin di dokumen ini: pesan lembut saat klik ganda **Mulai kerjakan** (sisi server terbukti: satu dari dua permintaan bersamaan menang, yang lain 409 — `tasks-workflow`: "lets one of two simultaneous starts win"); tidak ada tes UI yang menegaskan teks pesannya (lihat langkah 5 di bagian 4).

## 2. Matriks ukuran teks × lebar layar

Isi per sel: tidak ada teks terpotong/menimpa, tombol tidak keluar layar, tabel tetap bisa digulir atau menjadi kartu, tidak ada gulir horizontal halaman.
Mesin sudah menjaga penyebab umumnya (M12, `ResponsiveTable`, tanpa lebar piksel tetap). Memastikan hasilnya terlihat benar tetap butuh mata manusia.

| Halaman | Skala | 375 px | 768 px | 1024 px | 1280 px |
|---|---|---|---|---|---|
| Tugas `/app/tasks` | 1 | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| | 1,25 | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| | 1,5 | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| Tugas baru `/app/tasks/new` | 1 · 1,25 · 1,5 | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| Detail tugas `/app/tasks/:nomor` (langkah, komentar, riwayat) | 1 · 1,25 · 1,5 | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| Ubah tugas `/app/tasks/:nomor/edit` | 1 · 1,25 · 1,5 | – | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |
| Tab Tugas proyek + sorotan Ringkasan | 1 · 1,25 · 1,5 | – | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) | belum diuji — menunggu user (CP) |

Butir R09 §3.8 lain yang hanya bisa dinilai manusia (semuanya **belum diuji — menunggu user (CP)**): zoom browser 200 %, kontras ≥ 4,5:1 sebenarnya, ukuran ketuk fisik 44 px, filter abu-abu untuk label status (Terlambat, Mandek, Dibuka lagi), sidebar jadi laci ≤ 1152 px pada skala 1,5, urutan Tab dan fokus terlihat, rotasi layar tablet, penguji awam/lansia (UP-1).

## 3. Temuan

| # | Temuan | Tindakan |
|---|--------|----------|
| F1 | Pemindaian skala yang diperluas ke berkas tugas menemukan 3 `wrap="nowrap"` baru tanpa penanda: `TaskChecklist` (centang + teks `flex: 1; minWidth: 0` + dua ikon), `TaskFormMore` (kolom langkah menyusut + satu ikon), `TimelineItem` (byline yang membungkus sendiri + satu ikon) | Ketiganya aman (isi menyusut, tanpa deretan tombol teks). Diberi komentar `nowrap is safe: …` satu baris, tanpa mengubah tampilan, sehingga batas tes tetap 5 |
| F2 | Hitungan pemeriksaan smoke: tes lama mengunci 33 entri terdaftar (34 pemeriksaan di jalan karena satu aset klien dinamis); kini 38 terdaftar, **39** di jalan | Tes `smoke-server` diperbarui ke 38. Angka "34" di brief G20 sudah usang |
| F3 | Hitungan transisi: API mengenal **9** pasangan (verba, status asal) yang sah (`LEGAL` di `tasks-workflow.test.ts`) sesuai P3 §6.2; tabel kebijakan `TASK_TRANSITIONS` memuat **12** pasangan status karena 3 di antaranya langkah pemeriksaan yang belum punya rute di S2 | Tidak ada tindakan; hanya mencegah salah baca |
| F4 | Seed `atlas` memakai `reset` atas seluruh awalan `seed-`, sehingga menjalankan `atlas` juga mengganti ulang data `uji` | Dicatat di kepala `scripts/seed-dev.ts` dan CHANGELOG; tidak diubah (di luar izin) |
| F5 | `smoke:prod` tanpa `DATABASE_URL` gagal (`Invalid environment variables`); perlu database test terisolasi, lalu `smoke:binary` dan `smoke:coldboot` memakai PG lokal sendiri | Prosedur di bagian 5 |
| F6 | Tidak ada tes UI untuk pesan lembut klik ganda (demo S2 langkah 5) | Diperiksa manusia di demo; usulan tes di S2-17 bila perlu |

## 4. Enam langkah demo SP-G2 (untuk user — bukan hasil)

Persiapan: `SEED_ALLOW=1 bun scripts/seed-dev.ts atlas`; akun Nico (PM), Dodi (Member), Sri (Pemantau), Rina. Untuk UP-1: `SEED_ALLOW=1 bun scripts/seed-dev.ts uji`. **Belum dijalankan — menunggu user (CP).**

1. **Tugas saya.** Dodi membuka **Tugas saya**: kelompok Terlambat (1), Hari ini, Besok, Minggu ini dengan hitungan; menekan **Mulai kerjakan** pada satu baris → tombol berganti **Tandai selesai** tanpa pindah halaman.
2. **Detail tugas.** Dodi mencentang 2 dari 3 langkah (2/3), menulis komentar, menekan **Tandai selesai** → tugas pindah ke chip Selesai; di Ringkasan proyek progres naik dan kondisi dihitung ulang.
3. **Buat, batalkan, pulihkan.** Nico membuat tugas lewat form (judul, tenggat besok, yang mengerjakan Dodi) → muncul di Tugas saya Dodi dan di tab Tugas proyek; **Batalkan tugas** dengan kategori → Dibatalkan, lalu **Pulihkan**.
4. **Pemantau dan non-anggota.** Sri (Pemantau) membaca dan berkomentar tanpa tombol langkah/buat; Nico di proyek yang bukan miliknya membaca tanpa kotak komentar (Q7).
5. **Klik ganda.** Klik ganda **Mulai kerjakan** tidak menghasilkan status ganda; pesan lembut muncul.
6. **Yang tidak boleh ada.** Tidak ada tombol Hapus tugas, saklar Perlu diperiksa, Tag, Bukti, Papan.

Angka yang menurut P3 §6.2 diperiksa mesin ada di bagian 1; hasil langkah 1–6 di atas tidak diklaim di dokumen ini.

## 5. Cara bukti dijalankan ulang

```sh
export LOCAL_PG_DIR=/tmp/sp-env/g20-s2-15/pg LOCAL_PG_PORT=54421 LOCAL_S3_DIR=/tmp/sp-env/g20-s2-15/s3 LOCAL_S3_PORT=54422
bun test <berkas>                         # bagian 1; PM_PERF=1 untuk median M3
bun run typecheck                          # M14, M15
BETTER_AUTH_SECRET=$(openssl rand -hex 32) DATABASE_URL=<DB test> bun run smoke:prod
PATH=/tmp/bun-1.4.2/bun-darwin-aarch64:$PATH BETTER_AUTH_SECRET=$(openssl rand -hex 32) bun run smoke:binary
PATH=/tmp/bun-1.4.2/bun-darwin-aarch64:$PATH BETTER_AUTH_SECRET=$(openssl rand -hex 32) bun run smoke:coldboot
```
