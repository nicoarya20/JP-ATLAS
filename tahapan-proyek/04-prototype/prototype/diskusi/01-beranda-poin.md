# Poin Diskusi Wireframe Beranda

> `wireframe/01-beranda.html` · 7 Oktober 2026 · Detail: `01-beranda-detail.md`

## Keputusan
- ✅ Jenis "Memblokir orang / menahan pekerjaan Dodi" diganti **"Penting"** (Zona A poin 1, Zona B Urutan dan Per tenggat).
- ✅ Dummy tetap kasus lama (Fix login SSO, Atlas, PT Sinar).

## Zona A: Briefing harian
- Isi briefing diambil dari 3 menu: Task, Rapat, Tim. **Sistem** mendeteksi sinyal, **AI** hanya menuliskan kalimatnya. Dihitung tiap pagi (07.30).
- Urutan poin **belum ada aturan**. Usulan: sudah terjadi > prediksi, lalu dampak, lalu maks. 1 poin per jenis.
- Tujuan klik **belum ditentukan**. Usulan: poin tunggal → halaman detailnya. Poin agregat → daftar terfilter.
- Mode Mingguan: judul dan pertanyaan masih "harian / sejak kemarin". Dummy pemindahan tugas Rina tidak sinkron dengan Harian.
- **Dobel dengan Zona B:** "Fix login SSO" ada di A dan B. Opsi: kecualikan, rujuk saja, atau hapus A untuk anggota biasa.

## Zona B: Fokus saya hari ini
- Label = **aturan tetap, bukan AI**: Telat, Penting, Menunggu saya, Segera jatuh tempo, Mandek.
- Belum diputuskan:
  - Siapa yang boleh menandai "Penting"
  - Ambang "Segera jatuh tempo" dan "Mandek"
  - Urutan label kalau satu tugas memenuhi lebih dari satu label (usulan: Telat > Menunggu saya > Penting > Segera jatuh tempo > Mandek)
- Tombol **Ubah status / Tambah catatan / Minta bantuan** belum punya perilaku. Tombol hanya muncul saat hover, jadi sulit untuk lansia.
- Lingkaran dan kotak kecil di tiap baris belum jelas fungsinya.
- Rumus urutan di `diskusi/fitur-ringkasan.md` §2 masih menyebut "bobot memblokir orang". Perlu diperbarui.

## Inbox
- Pemicu: **Menyebut Anda** (di atas), Komentar baru, Ditugaskan ke Anda, Status berubah.
- Aturan "tugas yang saya ikuti" belum didefinisikan.
- **Dobel:** 3 dari 4 item Inbox sudah ada di daftar Fokus. Opsi: tampilkan penanda komentar di baris tugas.

## Zona C: Tanyakan ke data proyek
- Alur: ketik → klik Tanya → chip "Dipahami sebagai" → hasil. Chip bisa dihapus atau ditambah.
- "Status: Telat" bukan status, tapi kondisi. Nama hasil "Login SSO gagal di Safari" mirip "Fix login SSO".
- Ditandai ⚠️ untuk lansia. Alternatif: pertanyaan siap-klik atau suara.

## Zona D: Agenda & proyek saya
- "Siap / Belum siap" = **label, bukan tombol**, tapi bentuknya terlihat seperti tombol.
- Aturan "Siap" belum ada. Usulan: bahan lengkap + tindak lanjut rapat lalu selesai.
- **Dummy bertentangan:** Sync PT Sinar "Siap", padahal laporan progresnya baru jatuh tempo besok.
- Sumber "bahan" agenda (manual atau otomatis) belum ditentukan.
- Aturan Sehat/Berisiko dan cara hitung progres % belum ada. Atlas "Sehat" padahal ada tugas penting yang telat.

## Benang merah
1. **Duplikasi belum hilang** (A, B, Inbox, C).
2. **Perilaku dan aturan belum ditulis** (urutan A, klik, tombol, ambang label, Siap, Sehat/Berisiko).

## To-do keputusan
- [ ] Siapa yang boleh menandai "Penting"
- [ ] Ambang "Segera jatuh tempo" dan "Mandek"
- [ ] Urutan prioritas antar-label
- [ ] Perilaku 3 tombol aksi, dan cara menampilkannya tanpa hover
- [ ] Arti lingkaran dan kotak kecil
- [ ] Aturan urutan dan tujuan klik Zona A
- [ ] Cara menghilangkan dobel A / B / Inbox
- [ ] "Siap/Belum siap": label atau tombol, beserta aturannya
- [ ] Aturan Sehat/Berisiko dan progres %
- [ ] Perbaiki dummy Sync PT Sinar dan mode Mingguan
- [ ] Perbarui rumus urutan di `fitur-ringkasan.md` §2
