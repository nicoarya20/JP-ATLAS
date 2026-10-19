/** Indonesian copy for the project summary additions (S5a UI-06): extend deadline, condition, phases, activity. */
import type { ExtensionReasonCategory, PhaseStatus, ProjectCondition } from '@server/pm/enums';

export const EXTEND_CATEGORY_LABELS: Record<ExtensionReasonCategory, string> = {
  scope_change: 'Perubahan cakupan',
  dependency: 'Menunggu pihak lain',
  resource: 'Kekurangan sumber daya',
  other: 'Lainnya',
};

export const EXTEND_COPY = {
  open: 'Perpanjang tenggat',
  title: 'Perpanjang tenggat',
  current: 'Tenggat sekarang',
  newDate: 'Tenggat baru',
  datePlaceholder: 'Pilih atau ketik tanggal',
  quickLabel: 'Tambah cepat dari tenggat sekarang',
  quick: { w1: '+1 minggu', w2: '+2 minggu', m1: '+1 bulan' },
  category: 'Kenapa diperpanjang?',
  categoryPlaceholder: 'Pilih alasan',
  reason: 'Penjelasan',
  reasonHint: 'Tulis singkat agar tim paham. Alasan ini tersimpan di riwayat.',
  counter: (used: number, max: number) => `${used} dari ${max} huruf`,
  submit: 'Perpanjang tenggat',
  cancel: 'Batal',
  saved: (date: string) => `Tenggat diperpanjang menjadi ${date}.`,
  failed: 'Gagal memperpanjang tenggat',
  needDate: 'Pilih tenggat baru yang lebih lambat dari tenggat sekarang.',
  notLater: 'Tenggat baru harus setelah tenggat sekarang.',
  needCategory: 'Pilih alasan perpanjangan dulu.',
  needReason: 'Tulis penjelasannya dulu agar tim paham.',
  tooLong: (max: number) => `Penjelasan terlalu panjang. Maksimal ${max} huruf.`,
} as const;

export const BADGE_COPY = {
  label: (n: number) => `Diperpanjang ×${n}`,
  title: 'Riwayat perpanjangan tenggat',
  empty: 'Belum ada riwayat perpanjangan.',
  loading: 'Memuat riwayat…',
  failed: 'Riwayat belum bisa dimuat. Coba lagi.',
  retry: 'Coba lagi',
  move: (from: string, to: string) => `${from} → ${to}`,
  by: (name: string | null) => (name ? `oleh ${name}` : 'oleh akun yang sudah dihapus'),
  more: (shown: number, total: number) => `Menampilkan ${shown} dari ${total} perpanjangan.`,
} as const;

export const OVERRIDE_COPY = {
  menuSet: 'Atur kondisi',
  menuClear: 'Hapus penimpaan kondisi',
  title: 'Atur kondisi proyek',
  intro: 'Kondisi ini menggantikan kondisi otomatis sampai kamu menghapusnya.',
  condition: 'Kondisi',
  reason: 'Alasan',
  reasonHint: 'Alasan ini tampil di bawah judul proyek.',
  expires: 'Berlaku sampai (boleh dikosongkan)',
  expiresHint: 'Kosong berarti berlaku sampai dihapus sendiri.',
  submit: 'Pasang kondisi',
  saved: 'Kondisi proyek dipasang.',
  failed: 'Gagal memasang kondisi',
  needReason: 'Tulis alasannya dulu agar tim paham.',
  tooLong: (max: number) => `Alasan terlalu panjang. Maksimal ${max} huruf.`,
  clearTitle: 'Hapus kondisi manual?',
  clearBody: 'Kondisi proyek kembali dihitung otomatis dari tugas dan milestone.',
  clearConfirm: 'Hapus penimpaan',
  cleared: 'Kondisi manual dihapus.',
  clearFailed: 'Gagal menghapus kondisi manual',
  badge: (by: string | null) => (by ? `Kondisi diatur manual oleh ${by}` : 'Kondisi diatur manual'),
} as const;

/** Condition choices in the order a manager thinks of them: fine, watch, late. */
export const OVERRIDE_CONDITIONS: readonly ProjectCondition[] = [
  'on_track',
  'at_risk',
  'off_track',
];

export const REASON_LINE_COPY = { why: 'Kenapa' } as const;

export const PHASE_STATUS_TEXT: Record<PhaseStatus, string> = {
  done: 'Selesai',
  in_progress: 'Sekarang',
  not_started: 'Akan datang',
};

export const NEXT_PHASE_COPY = {
  title: 'Tahapan & milestone berikutnya',
  stepperLabel: 'Urutan tahapan',
  now: (name: string, percent: number | null) =>
    percent === null ? `Sekarang: ${name}` : `Sekarang: ${name} · ${percent}%`,
  noCurrent: 'Belum ada tahapan yang sedang berjalan.',
  milestone: (title: string, date: string, note: string) =>
    `Milestone berikutnya: ${title} — ${date} · ${note}`,
  noMilestone: 'Tidak ada milestone yang menunggu.',
  seeAll: 'Lihat semua tahapan →',
  empty: 'Belum ada tahapan.',
  emptyHint: 'Bagi proyek menjadi tahapan agar kemajuannya mudah dilihat.',
  addPhases: 'Atur tahapan',
  loadFailed: 'Tahapan belum bisa dimuat. Muat ulang halaman ini.',
  daysLeft: (n: number) => `${n} hari lagi`,
  today: 'hari ini',
  daysLate: (n: number) => `terlambat ${n} hari`,
} as const;

export const ACTIVITY_COPY = {
  title: 'Aktivitas terakhir',
  empty: 'Belum ada aktivitas.',
  emptyHint: 'Perubahan pada proyek ini akan tercatat di sini.',
  more: 'Muat lebih banyak',
  failed: 'Aktivitas belum bisa dimuat. Coba lagi.',
  retry: 'Coba lagi',
  unknownActor: 'Seseorang',
} as const;
