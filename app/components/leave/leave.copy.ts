/** Indonesian copy for the leave UI: /app/settings (Ketersediaan, Pengaturan tim) and the Inbox rejection dialog. */
import type { LeaveStatus } from '@server/leave/leave.dto';

export const LEAVE_COPY = {
  availabilityTitle: 'Ketersediaan',
  cardTitle: 'Cuti',
  noneText: 'Tidak sedang cuti. Rekan melihat Anda sebagai Tersedia.',
  request: 'Ajukan cuti',
  requestAgain: 'Ajukan lagi',
  cancelRequest: 'Batalkan pengajuan',
  cancelLeave: 'Batalkan cuti',
  historyTitle: 'Riwayat cuti',
  noReason: 'Tanpa alasan tertulis',
  decidedByUnknown: 'penyetuju',
  immediately: 'Cuti langsung berlaku.',
  awaitingNews: 'Anda akan diberi kabar setelah diputuskan.',
} as const;

export const LEAVE_BADGES = {
  pending: 'Menunggu persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
} as const;

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  pending: LEAVE_BADGES.pending,
  approved: LEAVE_BADGES.approved,
  rejected: LEAVE_BADGES.rejected,
  canceled: 'Dibatalkan',
};

/** The line on a waiting card: where the request went. */
export const LEAVE_PENDING_SENT = {
  none: 'Dikirim ke penyetuju.',
  admin: 'Dikirim ke Admin.',
  manager_or_admin: 'Dikirim ke Pengelola proyek Anda atau Admin.',
} as const;

/** Where a request goes, by who asks: the sentence under the date fields and the line on a waiting card. */
export const LEAVE_ROUTE_COPY = {
  none: 'Cuti Anda langsung berlaku tanpa persetujuan.',
  admin: 'Pengajuan dikirim ke Admin.',
  manager_or_admin: 'Pengajuan dikirim ke Pengelola proyek Anda atau Admin.',
} as const;

export const LEAVE_CANCEL_COPY = {
  requestTitle: 'Batalkan pengajuan cuti?',
  requestBody: (range: string) =>
    `Pengajuan cuti ${range} ditarik dan penyetuju tidak perlu memutuskannya lagi. Anda bisa mengajukan lagi kapan saja.`,
  requestConfirm: 'Batalkan pengajuan',
  leaveTitle: 'Batalkan cuti?',
  leaveBody: (range: string) =>
    `Cuti ${range} dibatalkan dan rekan melihat Anda sebagai Tersedia mulai hari ini. Anda perlu mengajukan lagi bila ingin cuti.`,
  leaveConfirm: 'Batalkan cuti',
  keep: 'Tidak jadi',
  done: 'Cuti dibatalkan.',
  failed: 'Gagal membatalkan',
} as const;

export const LEAVE_FORM_COPY = {
  title: 'Ajukan cuti',
  from: 'Dari tanggal',
  to: 'Sampai tanggal',
  datePlaceholder: 'Pilih tanggal',
  note: 'Catatan (boleh kosong)',
  notePlaceholder: 'Mis. cuti keluarga',
  submitRequest: 'Kirim pengajuan',
  submitSave: 'Simpan cuti',
  cancel: 'Batal',
  sent: 'Pengajuan cuti terkirim.',
  saved: 'Cuti disimpan dan langsung berlaku.',
  needFrom: 'Pilih tanggal mulai cuti.',
  needTo: 'Pilih tanggal terakhir cuti.',
  endBeforeStart: 'Tanggal akhir tidak boleh sebelum tanggal mulai.',
  startInPast: 'Tanggal mulai tidak boleh sudah lewat.',
  noteTooLong: (max: number) => `Catatan paling banyak ${max} karakter.`,
} as const;

export const LEAVE_REJECT_COPY = {
  title: (name: string) => `Tolak cuti ${name}?`,
  impact:
    'Pemohon dikabari bahwa pengajuannya ditolak, lengkap dengan alasan bila Anda menulisnya.',
  reason: 'Alasan (boleh kosong)',
  reasonPlaceholder: 'Mis. tenggat proyek jatuh di tanggal itu',
  counter: (used: number, max: number) => `${used}/${max}`,
  tooLong: (max: number) => `Alasan paling banyak ${max} karakter.`,
  submit: 'Tolak pengajuan',
  cancel: 'Batal',
  done: (name: string) => `Cuti ${name} ditolak.`,
} as const;

export const LEAVE_SWITCH_COPY = {
  title: 'Pengaturan tim',
  label: 'Cuti perlu persetujuan',
  hint: 'Bila dimatikan, semua cuti langsung berlaku.',
  on: 'Hidup',
  off: 'Mati',
  savedOn: 'Cuti sekarang perlu persetujuan.',
  savedOff: 'Semua cuti sekarang langsung berlaku.',
  failed: 'Gagal menyimpan pengaturan',
} as const;
