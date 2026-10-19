/** Copy of the "how do you want to start?" screen that comes before the project form (flow ②). */
export const CHOOSER_COPY = {
  title: 'Buat proyek baru',
  description: 'Pilih cara memulai. Semua isian bisa diubah nanti.',
  back: 'Kembali ke daftar proyek',
  backToChooser: 'Kembali ke pilihan cara',
  forbidden: 'Hanya Admin dan Project Manager yang bisa membuat proyek.',
  recommended: 'Disarankan',
  choose: 'Pilih',
  /** What the buttons of the ways that are not built yet say; they are disabled, never a dead link. */
  comingSoon: 'Coming soon',
  form: {
    title: 'Isi form sendiri',
    body: 'Isi data proyek langsung lewat formulir. Hanya nama yang wajib.',
    note: 'Cocok bila Anda sudah tahu apa yang dibutuhkan.',
  },
  story: {
    title: 'Ceritakan proyeknya',
    body: 'Ceritakan proyek seperti bercerita ke teman. AI menyusun draf tahapan dan tugasnya.',
    note: 'Anda tetap memeriksa draf sebelum proyek dibuat.',
  },
  template: {
    title: 'Pakai template',
    body: 'Mulai dari struktur proyek yang pernah dibuat.',
    note: 'Cocok untuk proyek yang mirip dengan sebelumnya.',
  },
} as const;
