/**
 * Indonesian copy of the availability controls on `/dashboard/users` (P14 CU-04). Separate from
 * `components/leave/leave.copy.ts`, which words the member's read-only card: the admin wording talks
 * about recording somebody else's leave, and the two must not drift into each other.
 *
 * The refusal messages are not repeated here. `cleanLeaveInput` already words every range rule in
 * Indonesian and the server answers 422/409 with exactly those sentences, so the dialog shows the
 * server's own text rather than a second copy of it.
 */

export const USER_LEAVE_COPY = {
  section: 'Ketersediaan',
  running: 'Sedang cuti',
  here: 'Tidak sedang cuti.',
  /** A recorded period that has not started yet; it shows in no other screen until it does. */
  upcoming: 'Akan datang',
  past: 'Sudah lewat',
  days: (n: number) => `${n} hari`,
  set: 'Setel cuti…',
  change: 'Ubah periode…',
  end: 'Akhiri cuti…',
  noteLabel: 'Catatan',
  noteOnlyHere: 'Catatan hanya terlihat oleh Admin di halaman ini.',
  recordedBy: (name: string) => `Dicatat oleh ${name}`,
  recordedByUnknown: 'Pencatatnya sudah tidak ada',
  historyTitle: 'Riwayat cuti',
  historyEmpty: 'Belum ada catatan cuti',
  historyEmptyHint: 'Periode cuti yang kamu catat akan muncul di sini, termasuk yang sudah lewat.',
  historyFailed: 'Gagal memuat riwayat cuti',
  retry: 'Coba lagi',
  colPeriod: 'Periode',
  colDays: 'Lama',
  colNote: 'Catatan',
  colRecordedBy: 'Dicatat oleh',
  /** Shown instead of the panel while a super-admin is acting as somebody else. */
  impersonating: 'Tidak tersedia saat kamu sedang menyamar sebagai pengguna lain.',
} as const;

export const SET_LEAVE_COPY = {
  title: (name: string) => `Setel cuti ${name}`,
  intro:
    'Catat cuti yang sudah disetujui HRD atau atasan. Rekan satu tim akan melihat orang ini sebagai sedang cuti pada rentang tanggal tersebut.',
  start: 'Mulai',
  end: 'Sampai',
  datePlaceholder: 'Pilih tanggal',
  note: 'Catatan (boleh kosong)',
  notePlaceholder: 'Mis. umroh, sakit, urusan keluarga',
  noteHint: 'Hanya Admin yang bisa membacanya. Rekan satu tim hanya melihat tanggalnya.',
  counter: (used: number, max: number) => `${used}/${max}`,
  /** The period under way is replaced, not added to; saying so beforehand is the point (D6/§10 T2). */
  replaces: (range: string) =>
    `Cuti ${range} yang sedang berjalan akan diganti oleh tanggal baru ini, bukan ditambah.`,
  missingDates: 'Pilih tanggal mulai dan tanggal sampai.',
  submit: 'Simpan cuti',
  cancel: 'Batal',
  failed: 'Gagal mencatat cuti',
  saved: (name: string, range: string, days: number) =>
    `Cuti ${name} dicatat: ${range} (${days} hari).`,
  savedReplacing: (name: string, range: string, previous: string) =>
    `Cuti ${name} diganti menjadi ${range}. Periode sebelumnya, ${previous}, tidak lagi tercatat.`,
} as const;

export const END_LEAVE_COPY = {
  title: (name: string) => `Akhiri cuti ${name}?`,
  /** T2, not T1: the row is deleted and does not go to Sampah, so there is nothing to undo. */
  impact: (range: string) =>
    `Catatan cuti ${range} akan dihapus permanen dan tidak masuk Sampah. Rekan satu tim langsung melihat orang ini sebagai tersedia.`,
  hint: 'Untuk memperpendek cuti, pakai "Ubah periode…" dan ganti tanggal sampai.',
  confirm: 'Akhiri cuti',
  cancel: 'Batal',
  failed: 'Gagal mengakhiri cuti',
  done: (name: string, range: string) => `Cuti ${name} (${range}) diakhiri.`,
} as const;
