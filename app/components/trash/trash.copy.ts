/**
 * Indonesian copy for the minimal project Trash (S1-18). Honest wording: nothing is deleted for
 * good or cleaned up automatically yet (both arrive in S6), so no text may promise or warn of that.
 */

export const TRASH_PAGE_COPY = {
  title: 'Sampah',
  description:
    'Proyek yang dihapus disimpan di sini dan bisa dipulihkan bersama tugas-tugasnya sampai tanggal yang tertera.',
  tableLabel: 'Proyek di Sampah',
  loadFailed: 'Gagal memuat Sampah',
  more: 'Tampilkan lebih banyak',
  shown: (shown: number, total: number) => `Menampilkan ${shown} dari ${total} proyek`,
} as const;

export const TRASH_EMPTY_COPY = {
  title: 'Sampah kosong',
  description: 'Proyek yang dihapus akan muncul di sini dan masih bisa dipulihkan.',
} as const;

export const TRASH_COLUMNS = {
  name: 'Proyek',
  deletedBy: 'Dihapus oleh',
  deletedAt: 'Tanggal hapus',
  until: 'Bisa dipulihkan sampai',
  action: 'Aksi',
} as const;

export const TRASH_ROW_COPY = {
  unknownDeleter: 'Akun sudah tidak ada',
  restore: 'Pulihkan',
  restoreProject: (name: string) => `Pulihkan proyek ${name}`,
  until: (date: string) => `Bisa dipulihkan sampai ${date}`,
  deletedBy: (name: string, date: string) => `Dihapus oleh ${name}, ${date}`,
} as const;

/** Toasts for `useTrashActions`. */
export const TRASH_ACTION_COPY = {
  restored: (name: string, tasks: number) => `Proyek "${name}" dipulihkan bersama ${tasks} tugas.`,
  restoreFailed: 'Gagal memulihkan proyek',
  trashed: (name: string) => `Proyek "${name}" dipindah ke Sampah.`,
  trashFailed: 'Gagal menghapus proyek',
} as const;

/** T2 dialog of "Hapus proyek" (CLAUDE.md UX §1): names the project, the tasks that go with it and the restore limit. */
export const TRASH_CONFIRM_COPY = {
  menuItem: 'Hapus proyek',
  title: (name: string) => `Hapus proyek "${name}"?`,
  body: (tasks: number, until: string) =>
    `${tasks > 0 ? `${tasks} tugas di dalamnya ikut dipindah ke Sampah. ` : ''}Proyek ini bisa dipulihkan dari halaman Sampah sampai ${until}.`,
  confirmLabel: 'Hapus proyek',
} as const;
