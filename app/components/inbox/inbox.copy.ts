/** Indonesian copy of the Inbox page, bell and card actions. Card sentences and button labels come from the server catalog. */

export const INBOX_COPY = {
  title: 'Inbox',
  description: 'Semua kabar dan permintaan untuk Anda',
  tabsLabel: 'Isi Inbox',
  tabAction: (count: number) => `Perlu Anda tanggapi (${count})`,
  tabInfo: 'Kabar terbaru',
  loading: 'Memuat Inbox',
  loadFailed: 'Inbox belum bisa dimuat',
  retry: 'Muat ulang',
  loadMore: 'Muat lebih banyak',
  unread: 'Belum dibaca',
  unknownSentence: 'Ada kabar baru untuk Anda',
  emptyActionTitle: 'Semua beres',
  emptyActionBody: 'Tidak ada yang perlu Anda tanggapi saat ini.',
  emptyActionButton: 'Lihat Kabar terbaru',
  emptyInfoTitle: 'Belum ada kabar',
  emptyInfoBody: 'Kabar tentang tugas, acara, dan proyek Anda akan muncul di sini.',
  markAll: 'Tandai semua dibaca',
  markAllNone: 'Semua kabar sudah dibaca',
  markAllDone: 'Semua kabar sudah ditandai dibaca.',
  markAllFailed: 'Gagal menandai dibaca',
  now: 'Baru saja',
  yesterday: 'Kemarin',
} as const;

export const GROUP_HEADINGS = {
  today: 'Hari ini',
  yesterday: 'Kemarin',
  older: 'Lebih lama',
} as const;

/** The leave approval card (two buttons) and the confirm dialog of "Setujui". */
export const INBOX_LEAVE_COPY = {
  approveTitle: (name: string) => `Setujui cuti ${name}?`,
  approveBody: (range: string) =>
    `Cuti ${range} mulai berlaku dan rekan melihat pemohon sebagai Cuti pada tanggal itu. Pemohon dikabari lewat Inbox.`,
  approveConfirm: 'Setujui cuti',
  approved: (name: string) => `Cuti ${name} disetujui.`,
  approveFailed: 'Gagal menyetujui',
} as const;

/** The bell and the menu badge; `n` is the number of open "Perlu Anda tanggapi" cards. */
export const BELL_COPY = {
  label: (n: number) => (n > 0 ? `Inbox, ${n} hal perlu Anda tanggapi` : 'Inbox'),
  badgeTooltip: (n: number) => `${n} hal perlu Anda tanggapi.`,
} as const;
/** Largest number written out on the bell; more reads "99+". */
export const BELL_MAX = 99;
