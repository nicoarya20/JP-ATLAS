# TH2 — Inventaris klien API lama vs `app/lib/http.ts`

Tugas T-H2 (G19). Hanya inventaris; tidak ada migrasi klien. Dasar: `app/lib/*-api.ts` @ cabang `chore/pm-th2-notify-http-cleanup`.

## Klien baku: `app/lib/http.ts`
`apiRequest` / `jsonRequest` / `parseApiError` / `describeApiError` / `redirectToSession`. Galat seragam `ApiError { status, code, requestId, issues? }` mengikuti `server/api-error.ts`; 401 mengalihkan ke `/login?notice=session`. Pemakai saat ini: `projects-api.ts`, `tasks-api.ts`, `trash-api.ts` (lewat `unwrap` milik projects-api, jalur Eden).

## Tabel

| Berkas klien | Baris | Pola galat sekarang | Pemakai (berkas) | Tes | Usulan migrasi | Risiko |
|---|---|---|---|---|---|---|
| `projects-api.ts` | 179 | `ApiError` (http.ts) + Eden `unwrap` | 13 | ada | Sudah baku | — |
| `tasks-api.ts` | 186 | `ApiError` (http.ts) + Eden | 20 | ada | Sudah baku (W2 aktif, jangan disentuh) | — |
| `trash-api.ts` | 34 | `unwrap` dari projects-api | 4 | `tests/ui/trash-list.test.tsx` | Sudah baku | — |
| `avatar-api.ts` | 24 | Eden, `throw new Error(error.value.error ?? fallback)` | 1 (`AvatarField`) | tidak ada | Pakai `unwrap` dengan kata-kata foto | Rendah; **tidak dimigrasi**: ≤40 baris tetapi tanpa tes, dan `unwrap` memakai kata-kata proyek/tugas |
| `admin-users-api.ts` | 178 | `fetch` + `throw new Error(message)` dari body `error` | 22 | tidak langsung | `apiRequest` | Sedang: pemakai terbanyak; pesan galat dibaca UI apa adanya |
| `api-keys-api.ts` | 253 | `fetch` + `throw new Error(message)` | 14 | `tests/api-keys-client.test.ts` | `apiRequest` setelah memecah berkas (melebihi batas 250) | Sedang |
| `api-keys-usage-api.ts` | 73 | `fetch`, `Error('Gagal memuat … (status)')` | 2 | `tests/api-keys-client.test.ts` | `apiRequest` | Rendah; kehilangan teks "(status)" bila tidak dijaga |
| `audit-api.ts` | 133 | `fetch`, `Error('Gagal memuat audit log (status)')` | 9 | tidak | `apiRequest` | Rendah |
| `file-health-api.ts` | 143 | `fetch`, `Error('… (status)')` | 6 | `tests/api-keys-client.test.ts` | `apiRequest` | Rendah |
| `invitations-api.ts` | 83 | pola `request()` sendiri | 4 | `tests/users-view.test.ts` | `apiRequest` | Rendah |
| `login-logs-api.ts` | 132 | `fetch` + `Error` dengan konteks | 15 | tidak | `apiRequest` | Rendah |
| `ops-api.ts` | 68 | `fetch`, `Error('METHOD url gagal (status)')` | 4 | `tests/ops-api.test.ts` | `apiRequest`; tes mengunci teks galat | Sedang: tes harus ikut diubah |
| `posts-api.ts` | 88 | `fetch` + `Error(message)` | 6 | `tests/posts-api.test.ts` | `apiRequest` | Sedang: tes mengunci teks galat |
| `profile-api.ts` | 90 | `fetch`, `Error(body.error ?? 'Gagal … (status)')` | 9 | tidak | `apiRequest` | Rendah |
| `rate-limit-logs-api.ts` | 133 | `fetch` + `Error` | 11 | tidak | `apiRequest` | Rendah |
| `server-logs-api.ts` | 85 | `fetch`, `Error('Gagal memuat log server (status)')` | 6 | `tests/server-logs-merge.test.ts` (hanya gabung) | `apiRequest` | Rendah |
| `sessions-api.ts` | 83 | `fetch`, `Error('METHOD url gagal (status)')` | 5 | `tests/sessions-api.test.ts` | `apiRequest`; tes mengunci teks galat | Sedang |
| `settings-api.ts` | 131 | `fetch` + `Error` | 9 | tidak | `apiRequest` | Rendah |
| `visits-api.ts` | 132 | `fetch` + `Error` | 17 | tidak | `apiRequest` | Rendah |
| `use-api-mutation.ts` | 58 | pembantu mutasi, bukan klien | — | `tests/use-api-mutation.test.ts` | — | — |

## Perbedaan perilaku yang harus diputuskan sebelum migrasi massal
1. **Pesan galat:** klien lama membuang `code`/`requestId` dan kadang membuat pesan sendiri ("… gagal (500)"); `ApiError` memakai teks server. Tampilan bisa berubah di halaman admin.
2. **401:** `apiRequest` mengalihkan ke login; klien lama hanya melempar galat.
3. **Tes yang mengunci teks galat** (`ops-api`, `posts-api`, `sessions-api`, `api-keys-client`) harus diperbarui bersama migrasinya.

## Hasil
Satu-satunya klien ≤40 baris yang belum memakai http.ts adalah `avatar-api.ts` (24 baris), tetapi tanpa tes sehingga **tidak dimigrasi** sesuai batasan tugas. Migrasi sisanya diusulkan sebagai tugas terpisah per kelompok (log read-only dulu, lalu `admin-users`/`api-keys`), tiap kelompok dengan tes galatnya.
