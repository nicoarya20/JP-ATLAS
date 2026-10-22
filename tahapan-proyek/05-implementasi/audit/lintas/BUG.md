# BUG — Lintas menu Proyek dan Tugas

> Audit 19 Oktober 2026 pada `feature/project-management` @ `161def2`, paket `lintas-kualitas` (mobile, aksesibilitas, kualitas kode, untuk kedua menu). **Hanya yang berperilaku salah.** Sisanya ada di [`PEMERIKSAAN.md`](PEMERIKSAAN.md). Bug khusus menu: [`../proyek/BUG.md`](../proyek/BUG.md) dan [`../tugas/BUG.md`](../tugas/BUG.md).

| Tingkat | Jumlah |
|---|---|
| Sedang | 1 |
| Rendah | 1 (dugaan) |
| **Total** | **2** |

### LK-02 — Tidak ada satu pun halaman Proyek/Tugas yang punya `<h1>`
**Tingkat:** Sedang · **Bukti:** Terkonfirmasi · **Status:** terbuka · **Ukuran:** S

- **Gejala:** pembaca layar tidak bisa melompat ke judul halaman. Judul daftar mulai dari `h3` (loncat), judul detail dari `h2`, dan kerangka `/app` juga tanpa `h1`.
- **Bukti:** `grep -rnE "order=\{1\}|<h1" app` hanya cocok di `landing/Hero.tsx` dan `errors/ErrorPanel.tsx`. Tingkat judul yang dipakai: `PageHeader.tsx:34` (`order={3}`), `ProjectHeader.tsx:81` dan `TaskHeader.tsx:66` (`order={2}`), `ProjectCreateChooser.tsx` (`4`), `ProjectGantt.tsx`/`ui/SectionCard.tsx` (`5`).
- **Perbaikan:** `PageHeader`, `ProjectHeader`, `TaskHeader`: `<Title order={1} size="h3">` (tampilan tetap sama); bagian di bawahnya `h2`/`h3` berurutan.

### LK-04 — Baris pemilih peran anggota mungkin meluber di 375 px skala 150%
**Tingkat:** Rendah · **Bukti:** **Dugaan** · **Status:** terbuka · **Ukuran:** S

- **Gejala:** di Tambah proyek → bagian anggota, baris "pemilih peran + ✕" bisa melebihi lebar layar pada skala teks besar.
- **Penyebab:** grup `wrap="nowrap"` berisi `Select w="10rem"` (160 px, diduga ikut `theme.scale` lewat `rem()` Mantine) + `ActionIcon` 44 px di dalam `Paper p="sm"`. Skala 1: ±215 px, muat di 375. Skala 1,5: ±320 px + gap, melebihi lebar isi (±300 px).
- **Berkas:** `app/components/projects/MemberPicker.tsx:79-95`.
- **Perbaikan:** hapus `nowrap`, atau beri `w={{ base: '100%', sm: '10rem' }}` dan `style={{ minWidth: 0 }}`; uji 375 px skala 1,5.

> **Catatan:** dua dugaan layout lain terkait ada di menu masing-masing: [`PRJ-24`](../proyek/BUG.md) (ProgressBar, header, Gantt) dan [`T-10`](../tugas/BUG.md) (baris "Tugas saya").
