# Fase 2 — Pola data mobile: `fetch → store → invalidate`

Dokumen ini adalah **aturan**, bukan saran. Ditulis di W2 (papan `mobile/reacttransition.md` §6c)
karena W3 mengganti data contoh per modul — kemungkinan oleh beberapa sesi paralel yang tidak bisa
saling bertanya. Kalau modulmu menyimpang
dari sini, yang rusak bukan modulmu — yang rusak adalah modul orang lain yang membaca store yang
sama.

Sumbernya: `mobile/src/data/resource.ts` (pola), `mobile/src/data/clock.ts` (jam),
`mobile/src/data/instant.ts` (instan), `mobile/src/session` (identitas),
`mobile/src/data/home.api.ts` (contoh lengkap). Diturunkan dari fondasi Fase 2 lama
(`2a985b7^`, dibatalkan di `2a985b7`) dan ditulis ulang untuk mobile sekarang.

---

## 0. Keputusan yang mendasari semuanya

**`get<Module>()` tetap SINKRON** (keputusan user, 26 Okt 2026). Satu lapisan fetch mengisi store;
`get<Module>()` tetap membaca store seperti di Fase 1. Akibatnya seluruh pekerjaan sambung-API jatuh
di `src/data/`, dan `src/screens/` nyaris tidak tersentuh — itulah yang membuat W3 bisa
paralel tanpa enam dialek loading dalam satu aplikasi.

Harga yang user terima **sadar**: invalidate harus eksplisit. Aturan 2 di bawah adalah harga itu.

---

## 1. Aturan: `ensure()` hanya mengambil yang belum segar

`useEffect(…, [])` sebuah layar jalan **sekali per instance layar**, dan mendorong rute yang sama
dua kali membuat dua instance — jadi dua kali fetch. Diukur dengan probe pada router sungguhan;
assertion-nya ada di `mobile/__tests__/data/router-store-contract.test.tsx`.

Karena itu permintaan data harus **idempoten**:

```ts
// Benar: dipanggil dari effect mana pun, sebanyak apa pun.
useEffect(() => { void tasksResource.ensure(); }, []);
```

- `ensure()` — ambil **kecuali** data segar sudah ada. Pemanggil kedua ikut permintaan yang sedang
  jalan, bukan memulai permintaan baru.
- `reload()` — ambil sekarang apa pun isinya (pull-to-refresh, tombol "Try again"). Data lama tetap
  tampil selama permintaan berjalan, jadi tidak ada frame kosong.

**Jangan** memanggil `load`-mu langsung dari layar, dan jangan menulis penjaga "sudah pernah
fetch?" sendiri — itu sudah ada di `ensure()`.

---

## 2. Aturan: setelah tulis berhasil, sebut semua store yang mungkin berubah

**Tidak ada layar yang unmount saat kamu berpindah.** Layar yang kamu tinggalkan tetap terpasang
dan tetap berlangganan store-nya; satu tulisan ke store langsung menggambar ulang **semua** layar
yang masih hidup. Diukur dengan probe yang sama.

Akibatnya: store yang tidak di-invalidate akan terus menampilkan **data lama di semua layar yang
masih hidup**, bukan cuma di layar yang di depan. Tidak ada error, tidak ada log — layarnya cuma
salah. **Ini risiko yang user terima sadar** sebagai ganti pembacaan sinkron; bukan kelalaian, dan
bukan sesuatu yang boleh kamu perbaiki sendiri dengan pola lain.

```ts
// Benar: simpan tugas, lalu sebut siapa saja yang ikut berubah.
await write(() => apiPatch(`/api/app/tasks/${ref}`, fields), [tasksResource, homeResource]);
```

- `write(run, invalidates)` — jalankan tulisan; **hanya kalau berhasil**, tandai daftarnya basi.
  Tulisan yang gagal tidak mengubah apa pun di server, jadi tidak ada yang basi.
- `invalidate()` — tandai basi **dan** ambil ulang di belakang (data lama tetap tampil sampai yang
  baru datang). Mengambil ulang adalah bagian wajibnya: tanpa itu tidak ada yang akan mengambilnya,
  karena tidak ada layar yang akan unmount dan memanggil `ensure()` lagi.

**Cara memilih daftarnya:** tanya "kalau tulisan ini berhasil, layar mana yang jadi salah?" Simpan
tugas → daftar tugas **dan** Beranda (chip, Focus, agenda). Hapus proyek → daftar proyek, Beranda,
dan Sampah. Ragu → masukkan. Satu permintaan berlebih jauh lebih murah daripada angka yang salah.

Dari aturan yang sama: **sign out wajib mengosongkan semua store.** Dipasang dua kali: lewat
`forgetAllResources()` di `signOutEverywhere`, dan di `resource.ts` setiap kali sesi jatuh ke
`signed-out` (401 dari permintaan mana pun, akun di-ban). Jawaban yang tiba setelah itu milik akun
sebelumnya dan dibuang — tidak mengisi store lagi, dan 401-nya tidak mengakhiri sesi akun berikutnya.
Jangan dibongkar; resource baru otomatis ikut.

---

## 3. Aturan: kegagalan `/api/app/*` disalurkan ke `applyApiError`

Sudah dikerjakan `resource.ts` untuk setiap `load`. Yang perlu kamu tahu:

- `401` / `403 ACCOUNT_PENDING` / `403 ACCOUNT_REJECTED` → sesi dikoreksi, gerbang memindahkan
  layar. Persetujuan yang dicabut (atau diberikan) di tengah sesi mendarat di permintaan berikutnya,
  bukan setelah aplikasi dibuka ulang.
- Kegagalan transport (`status: 0`) tidak membuktikan apa-apa soal sesi → sesi dibiarkan,
  `state.error.isTransport` true, tawarkan "Try again".
- Galat yang **bukan** `ApiError` (biasanya bug pemetaan DTO → bentuk layar) disimpan sebagai
  `BAD_RESPONSE` dengan galat aslinya di `cause` — tidak ditelan, tidak jadi unhandled rejection.

Kalau kamu menulis panggilan API **di luar** sebuah `resource` (mis. tulisan), salurkan sendiri:

```ts
try { await apiPost(…); } catch (e) { if (isApiError(e)) applyApiError(e); throw e; }
```

---

## 4. Aturan: tanggal dari jam server, instan lewat satu helper

- **Hari ini** = `today()` dari `src/data/clock.ts` (K1). **Jangan** `new Date()`, jangan
  `TODAY` (sudah dicabut; sisanya fixture tes saja).
- **Nilai instan** dari server (`createdAt`, `updatedAt`, `timeline.at`, `startsAt`, `endsAt`,
  `canceledAt`) wajib lewat `src/data/instant.ts` — `instantDate()`, `instantTime()`,
  `instantParts()`. Zonanya otomatis zona tim dari jam server. **Bukan** UTC, **bukan** zona
  perangkat: acara 06.00 WIB jatuh ke tanggal kemarin kalau dibaca UTC.
- Untuk melabeli instan dengan helper tanggal, **ubah dulu jadi tanggal**:
  `monthDay(instantDate(t.createdAt))`.
- **Jangan ubah** hitung tanggal-ke-tanggal di `dates.ts` / `events.dates.ts`. Jangkar UTC-nya
  saling meniadakan dan hasilnya sudah benar (K2).

### Bom waktu yang wajib kamu kenali

Konstanta **tingkat modul** yang dihitung dari jam server akan jalan **saat import** — sebelum jam
tiba — dan `requireClock()` melempar di situ. Akibatnya bukan tanggal salah, tapi **aplikasi gagal
boot**. W2 menyapu modul yang ada saat mencabut `TODAY`; modulmu mungkin punya yang baru.

```ts
const AHEAD = monthOf(today());        // ❌ jalan saat import → melempar
const ahead = () => monthOf(today());  // ✅ jalan saat dipanggil
```

Kalau menemukan bentuk ini, ubah jadi fungsi. Jangan membungkusnya jadi array malas lewat Proxy:
nilai yang tampak konstanta tapi berperilaku fungsi adalah jebakan untuk worker berikutnya.

---

## 5. Aturan: orang dicocokkan lewat `userId`, titik

Identitas orang datang dari sesi (`user.id`), nama hanya untuk ditampilkan (K4).

```ts
const me = sessionStore.get().user?.id;
members.map((x) => ({ ...x, you: x.userId === me }));     // id dari DTO server
events.filter((e) => e.participants.isParticipant);       // atau tanda dari server
```

- **Jangan** membandingkan nama (`t.who === 'Nico'`, `members.includes(name)`). Begitu ada dua
  "Budi", pekerjaan menempel ke orang yang salah — dan itu kerusakan senyap, bukan error.
- Bila server sudah memberi tanda (`isParticipant`, `can{}`), pakai tanda itu, jangan hitung ulang.
- Peran dan izin hanya dari server: `caps` whoami (`src/data/whoami.api.ts`) dan `can{}` per baris.
  `viewer()`/`samePerson()`/`SESSION_ROLE` dari W2 sudah **dihapus** (28 Okt 2026; pulihkan dari
  `09c01dd0`, lihat `phase2-gap-disembunyikan.md` §4.1).

---

## 6. Bentuk sebuah modul (contoh lengkap: `src/data/home.api.ts`)

```ts
// 1. load: permintaan, dan tidak lain.
async function loadTasks(): Promise<TasksResponse> {
  return apiGet<TasksResponse>('/api/app/tasks?scope=mine');
}

// 2. satu resource per hal yang diambil.
export const tasksResource = resource<TasksResponse>('tasks', loadTasks);

// 3. get<Module>() tetap sinkron: baca store, jangan await apa pun.
export function getTasks(role: Role): TasksList {
  const data = tasksResource.current();
  if (!data) return EMPTY_TASKS;          // layar menampilkan keadaan memuat dari `use()`
  return mapToScreenShape(data, viewer(role));
}

// 4. tulisan menyebut yang ikut basi.
export const saveTask = (ref: string, fields: TaskFields) =>
  write(() => apiPatch(`/api/app/tasks/${ref}`, fields), [tasksResource, homeResource]);
```

Layar: `tasksResource.use()` untuk `phase`/`error`, `getTasks(role)` untuk datanya,
`void tasksResource.ensure()` di satu `useEffect`.

---

## 7. Yang W3 boleh berasumsikan (setelah W2 selesai)

1. Jam server **selalu ada** di layar aplikasi mana pun: gerbang menahan splash sampai
   `GET /api/app/home` menjawab, jadi `today()` dan `teamTimeZone()` tidak akan melempar di sana.
   (Di luar gerbang — layar `(auth)` — pakai `useClock()` dan tangani `null`.)
2. `viewer(role).userId` adalah id akun sungguhan dari sesi.
3. Satu permintaan home dipakai bersama jam dan layar Beranda; `homeResource.ensure()` tidak
   menambah permintaan.
4. Sign out — dan setiap jalan lain ke `signed-out` — sudah mengosongkan semua resource; akun
   berikutnya mengambil jam dan datanya sendiri.
5. Kegagalan `/api/app/*` di dalam `resource` sudah disalurkan ke `applyApiError`.
