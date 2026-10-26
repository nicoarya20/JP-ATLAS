/** Wording of the task detail body (S2-13): steps, the comment box and the timeline. */
import { TASK_CHECKLIST_MAX_ITEMS, TASK_COMMENT_MAX } from '@server/task/task.limits';

export const CHECKLIST_COPY = {
  title: 'Langkah-langkah',
  progress: (done: number, total: number) => `${done}/${total}`,
  progressLabel: (done: number, total: number) => `${done} dari ${total} langkah sudah selesai`,
  empty: 'Belum ada langkah. Pecah pekerjaan ini jadi langkah kecil agar mudah dipantau.',
  emptyReadOnly: 'Belum ada langkah untuk tugas ini.',
  inputLabel: 'Langkah baru',
  inputPlaceholder: 'Tulis langkah, mis. "Pesan keramik"',
  add: 'Tambah langkah',
  full: `Satu tugas paling banyak punya ${TASK_CHECKLIST_MAX_ITEMS} langkah.`,
  toggleLabel: (text: string) => `Tandai langkah "${text}"`,
  edit: 'Ubah teks langkah',
  save: 'Simpan teks',
  cancel: 'Batal',
  remove: 'Hapus langkah',
  removeTitle: (text: string) => `Hapus langkah "${text}"?`,
  removeBody: 'Data ini akan dihapus permanen.',
  addFailed: 'Gagal menambah langkah',
  changeFailed: 'Gagal mengubah langkah',
  removeFailed: 'Gagal menghapus langkah',
  removed: 'Langkah dihapus.',
} as const;

export const TIMELINE_COPY = {
  title: 'Obrolan & riwayat',
  loading: 'Memuat obrolan dan riwayat…',
  loadFailed: 'Obrolan dan riwayat belum bisa dimuat. Coba lagi.',
  retry: 'Coba lagi',
  empty: 'Belum ada obrolan. Tulis komentar pertama untuk tim.',
  more: 'Muat lebih lama',
  edited: 'diubah',
  editComment: 'Ubah komentar',
  saveComment: 'Simpan komentar',
  cancel: 'Batal',
  deleteComment: 'Hapus komentar',
  deleteTitle: 'Hapus komentar ini?',
  deleteBody: 'Data ini akan dihapus permanen.',
  deleted: 'Komentar dihapus.',
  editFailed: 'Gagal mengubah komentar',
  deleteFailed: 'Gagal menghapus komentar',
  commentMenu: 'Aksi lain untuk komentar ini',
  by: (name: string) => name,
} as const;

export const COMMENT_COPY = {
  label: 'Komentar',
  placeholder: 'Tulis komentar untuk tim…',
  submit: 'Kirim komentar',
  sent: 'Komentar terkirim.',
  failed: 'Gagal mengirim komentar',
  max: TASK_COMMENT_MAX,
  counter: (n: number) => `${n}/${TASK_COMMENT_MAX}`,
  closed: 'Tugas ini sudah dibatalkan, jadi komentar baru tidak bisa ditambahkan.',
} as const;

/** One sentence per activity; names are not in the log, so the sentences stay impersonal about targets. */
export const ACTIVITY_COPY = {
  created: 'membuat tugas ini',
  assignee_changed: 'mengganti penanggung jawab',
  due_date_changed: (from: string | null, to: string | null) =>
    `mengubah tenggat${from ? ` dari ${from}` : ''}${to ? ` ke ${to}` : ' (dikosongkan)'}`,
  priority_changed: (from: string | null, to: string | null) =>
    `mengubah prioritas${from ? ` dari ${from}` : ''}${to ? ` ke ${to}` : ''}`,
  phase_changed: (from: string | null, to: string | null) =>
    to
      ? `memindahkan tugas ke tahapan ${to}${from ? ` (dari ${from})` : ''}`
      : `mengeluarkan tugas dari tahapan${from ? ` ${from}` : ''}`,
  started: 'mulai mengerjakan tugas ini',
  unstarted: 'mengembalikan tugas ke belum dikerjakan',
  completed: 'menandai tugas selesai',
  reopened: 'membuka lagi tugas ini',
  canceled: 'membatalkan tugas ini',
  uncanceled: 'memulihkan tugas ini',
  'comment.delete': 'menghapus sebuah komentar',
  trashed: 'menghapus tugas ini ke Sampah',
  restored: 'memulihkan tugas ini dari Sampah',
  fallback: 'mengubah tugas ini',
  reason: (text: string) => `Alasan: ${text}`,
} as const;
