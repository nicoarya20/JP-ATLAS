# Tahapan proyek: PM untuk awam dan lansia

Semua bahan proyek dikelompokkan menurut tahap pembuatan website. Urutannya dari atas ke bawah. Spesifikasi awal ada di `../note.md`, dan catatan diskusi riset di `../diskusi/`.

| Tahap | Folder | Isi | Status |
|---|---|---|---|
| 1. Riset | `01-riset/research-pm-dashboard-kantor` | Dashboard PM kantor sebagai referensi awal (screenshot dan catatan) | Selesai |
| | `01-riset/ss-kompetitor` | Screenshot kompetitor (ClickUp, Asana, Wrike, dan lain-lain) | Selesai |
| | `01-riset/core-menu-kompetitor` | Riset menu inti per kompetitor | Selesai |
| | `01-riset/rangkuman-kompetitor` | Rangkuman per kompetitor, gabungan USP, dan arah segmen awam/lansia | Selesai |
| 2. Analisis dan spesifikasi | `02-analisis/hasil-orchestrasi` | Analisis fitur (A1–A4), alur kerja (workflow), keputusan (DECISIONS), review | Selesai (versi besar; MVP kita lebih ramping) |
| 3. Desain | `03-desain/erd` | ERD per modul (`user-profile`, `project`, `task`, `gabungan`) | Modul 01–03 selesai; Events, Inbox, Tim, Sampah, Pengaturan baru usulan |
| | `03-desain/erd/diskusi` | Keputusan dan rencana per layar, `01` sampai `09` | Berjalan |
| | (di luar repo) Penpot | File **PM-New**, halaman **WIREFRAME NICO**, grup `A · Member`, `B · Project Manager`, `C · Admin` | Wireframe 01–09 selesai untuk tiga role |
| 4. Prototype | `04-prototype/prototype` | Prototype HTML (Beranda, Events, Tim) dengan `wf.css` dan `wf.js` | Sebagian |
| | `04-prototype/prototype-pm` | Prototype klik-klik role Project Manager, Login sampai semua menu (buka `index.html`) | Selesai (isi beberapa layar perlu dicocokkan dengan wireframe) |
| 5. Implementasi | `05-implementasi` | Kode aplikasi (kosong, belum dimulai) | Berikutnya |

## Catatan
- Keputusan tertulis ada di `03-desain/erd/diskusi/0X-*.md`. Kalau berbeda dengan analisis di `02-analisis`, dokumen diskusi yang berlaku.
- Wireframe tidak disimpan di repo. Acuannya adalah halaman Penpot di atas dan dokumen diskusi per layar.
- Nama dan data pada wireframe (Nico, Rina, Dodi, Ayu, Atlas) adalah data contoh.
