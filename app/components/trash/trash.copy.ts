/**
 * Indonesian copy of the Trash page (wireframe "Sampah") and of "Hapus proyek". The retention
 * length is never typed here: it is `METRICS.TRASH_RETENTION_DAYS`, the number the purge uses.
 */
import { METRICS } from '@server/metrics/config';
import type { TrashTab } from '~/lib/trash-api';

const DAYS = METRICS.TRASH_RETENTION_DAYS;

export const TRASH_PAGE_COPY = {
  title: 'Sampah',
  description: `Yang dihapus disimpan ${DAYS} hari, lalu hilang selamanya`,
  tabsLabel: 'Jenis item di Sampah',
  summary: (items: number) => `${items} item · dihapus otomatis setelah ${DAYS} hari`,
  loadFailed: 'Gagal memuat Sampah',
  more: 'Tampilkan lebih banyak',
} as const;

/** Empty state per tab; an empty "Semua" says what the Trash is for. */
export const TRASH_EMPTY_COPY: Record<TrashTab, { title: string; description: string }> = {
  all: {
    title: 'Sampah kosong',
    description: `Proyek, tugas, dan event yang dihapus muncul di sini dan masih bisa dipulihkan selama ${DAYS} hari.`,
  },
  project: {
    title: 'Tidak ada proyek di Sampah',
    description: 'Proyek yang dihapus muncul di sini.',
  },
  task: {
    title: 'Tidak ada tugas di Sampah',
    description: 'Tugas yang dihapus muncul di sini dan masih bisa dipulihkan.',
  },
  event: {
    title: 'Tidak ada event di Sampah',
    description: 'Event yang dihapus muncul di sini dan masih bisa dipulihkan.',
  },
};

/** A task or event whose project is in the Trash waits for it. */
export const TRASH_BLOCKED_COPY = {
  restoreFirst: 'Pulihkan proyeknya dulu.',
  viewProject: 'Lihat proyeknya',
  askManager: 'Proyeknya ada di Sampah. Minta pengelola proyek memulihkannya dulu.',
} as const;

export const TRASH_ROW_COPY = {
  restore: 'Pulihkan',
} as const;

/** Toasts of "Pulihkan" and "Hapus proyek" (`useTrashActions`, `useTrashRestore`). */
export const TRASH_ACTION_COPY = {
  restored: (name: string, tasks: number) => `Proyek "${name}" dipulihkan bersama ${tasks} tugas.`,
  restoreFailed: 'Gagal memulihkan proyek',
  eventRestored: (title: string) => `Event "${title}" dipulihkan.`,
  eventRestoreFailed: 'Gagal memulihkan event',
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
