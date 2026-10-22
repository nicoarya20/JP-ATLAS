/** Indonesian copy of the event detail page and its two actions (S7 E-11). */
export const DETAIL_COPY = {
  back: 'Kembali ke daftar acara',
  fallbackTitle: 'Detail acara',
  notFound: 'Acara tidak ditemukan atau Anda tidak punya akses.',
  when: 'Waktu',
  place: 'Tempat',
  noPlace: 'Belum ditentukan',
  openLink: 'Buka tautan rapat',
  project: 'Proyek',
  noProject: 'Tanpa proyek',
  creator: 'Dibuat oleh',
  noCreator: 'Tidak diketahui',
  creatorMark: 'Pembuat',
  agenda: 'Agenda',
  noAgenda: 'Belum ada agenda.',
  participants: 'Peserta',
  notes: 'Notulensi',
  // Passive on purpose (user decision 20 Okt 2026): no Ketik/Foto/Suara button until the minutes ship.
  notesSoon: 'Notulensi dan rekaman rapat: segera hadir.',
  menuLabel: 'Aksi acara',
  canceledTitle: 'Acara ini dibatalkan',
  canceledReason: (reason: string) => `Alasan: ${reason}`,
  canceledBy: (name: string) => `Dibatalkan oleh ${name}`,
} as const;

/** The cancel dialog, the delete-with-undo flow and their toasts. */
export const ACTION_COPY = {
  cancelItem: 'Batalkan acara',
  cancelHint: 'Semua peserta akan diberi tahu.',
  cancelEnded: 'Acara yang sudah selesai tidak bisa dibatalkan.',
  cancelTitle: 'Batalkan acara ini?',
  cancelDescription:
    'Semua peserta akan diberi tahu dan membaca alasannya. Acara tetap tercatat sebagai Dibatalkan.',
  reasonLabel: 'Alasan pembatalan',
  reasonRequired: 'Tuliskan alasan pembatalan agar peserta paham.',
  cancelConfirm: 'Batalkan acara',
  canceled: 'Acara dibatalkan. Peserta sudah diberi tahu.',
  cancelFailed: 'Gagal membatalkan acara',
  deleteItem: 'Hapus acara',
  deleteHint: 'Dipindah ke Sampah. Bisa dipulihkan dari halaman Sampah.',
  deleted: 'Acara dihapus.',
  deleteFailed: 'Gagal menghapus acara',
  restored: 'Acara dipulihkan.',
  restoreFailed: 'Gagal memulihkan acara',
} as const;
