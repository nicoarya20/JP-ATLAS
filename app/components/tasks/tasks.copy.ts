/** Indonesian copy for the task screens (lane L3); enum labels stay in `~/lib/pm-labels`. */
import type { ScheduleGroup } from '@server/metrics/schedule';
import type { PmCode } from '@server/pm/errors';

export const NOT_FOUND_TEXT = 'Tugas tidak ditemukan atau Anda tidak punya akses.';

/** Shown, and followed by an automatic reload, when someone else changed the task first (409). */
export const STATE_CONFLICT_TEXT = 'Tugas ini baru saja diubah orang lain.';

/** Labels of the one next-step button a row shows (glossary R11 §3.4). */
export const NEXT_STEP_LABELS = {
  start: 'Mulai kerjakan',
  complete: 'Tandai selesai',
} as const;

/** "Tugas saya" schedule groups, in display order (P3 §2 Tugas ①). */
export const SCHEDULE_GROUP_LABELS: Record<ScheduleGroup, string> = {
  overdue: 'Terlambat',
  today: 'Hari ini',
  tomorrow: 'Besok',
  week: 'Minggu ini',
  later: 'Nanti',
  none: 'Tanpa tenggat',
};

export const LIST_COPY = {
  tableLabel: 'Daftar tugas',
  colTask: 'Tugas',
  colStatus: 'Status',
  colAssignee: 'Mengerjakan',
  colDue: 'Tenggat',
  colPriority: 'Prioritas',
  noAssignee: 'Belum ada',
  noDue: 'Tanpa tenggat',
  showMore: 'Tampilkan lebih banyak',
  loadFailed: 'Daftar tugas gagal dimuat.',
  retry: 'Coba lagi',
  groupCount: (label: string, n: number | string) => `${label} (${n})`,
} as const;

/** Empty states (K8): first use vs. a filter that matches nothing. */
export const EMPTY_COPY = {
  mineTitle: 'Belum ada tugas untuk Anda.',
  mineHint: 'Tugas yang ditunjuk ke Anda akan muncul di sini.',
  allTitle: 'Belum ada tugas.',
  allHint: 'Tugas dari proyek yang Anda ikuti akan muncul di sini.',
  projectTitle: 'Belum ada tugas di proyek ini.',
  projectHint: 'Tambahkan tugas pertama.',
  filteredTitle: 'Tidak ada tugas yang cocok dengan saringan ini.',
  filteredHint: 'Ubah atau hapus saringan, lalu lihat lagi.',
  resetFilters: 'Hapus saringan',
  create: 'Tugas baru',
  createInProject: 'Tambah tugas',
} as const;

/** Toast texts for `useTaskActions`. */
export const ACTION_COPY = {
  created: (title: string) => `Tugas "${title}" dibuat.`,
  updated: 'Perubahan tugas disimpan.',
  started: 'Tugas mulai dikerjakan.',
  completed: 'Tugas ditandai selesai.',
  canceled: 'Tugas dibatalkan. Tugas tetap tercatat dan bisa dipulihkan.',
  reopened: 'Tugas dibuka lagi.',
  uncanceled: 'Tugas dipulihkan.',
  createFailed: 'Gagal membuat tugas',
  updateFailed: 'Gagal menyimpan tugas',
  stepFailed: 'Gagal mengubah status tugas',
  cancelFailed: 'Gagal membatalkan tugas',
  reopenFailed: 'Gagal membuka lagi tugas',
  uncancelFailed: 'Gagal memulihkan tugas',
} as const;

/**
 * Task-specific wording for API error codes; wins over the server text. Codes not listed fall back
 * to the server's own message (handlers write it for the user).
 */
export const TASK_ERROR_MESSAGES: Partial<Record<PmCode, string>> = {
  NOT_FOUND: NOT_FOUND_TEXT,
  STATE_CONFLICT: STATE_CONFLICT_TEXT,
  WRONG_STATE: 'Langkah ini tidak bisa dilakukan pada status tugas sekarang. Muat ulang halaman.',
  NOT_MEMBER: 'Anda belum menjadi anggota proyek ini, jadi belum bisa mengubah tugasnya.',
  NOT_OWNER:
    'Hanya pembuat tugas, yang mengerjakan, atau pengelola proyek yang boleh melakukan ini.',
  REASON_REQUIRED: 'Tuliskan alasannya agar tim paham.',
  CANCEL_NOTE_REQUIRED: "Memilih 'Lainnya' perlu catatan singkat.",
  PROJECT_IN_TRASH: 'Proyek tugas ini ada di Sampah. Pulihkan proyeknya dulu.',
  IMPERSONATING: 'Saat menyamar sebagai pengguna lain, aksi ini dinonaktifkan.',
};

/** The Tugas page (S2-10, P3 §2 Tugas ①②). */
export const PAGE_COPY = {
  title: 'Tugas',
  description: 'Tugas yang perlu Anda kerjakan dan tugas dari proyek yang Anda ikuti.',
  create: 'Tugas baru',
  // Q5: every task belongs to a project, so someone outside every project cannot create one yet.
  createBlocked:
    'Anda belum masuk proyek apa pun, jadi belum bisa membuat tugas. Minta Pengelola proyek menambahkan Anda.',
} as const;

/** Search, scope toggle, status chips, filters and sort of the task list. */
export const FILTER_COPY = {
  searchLabel: 'Cari tugas',
  searchPlaceholder: 'Ketik judul tugas',
  scopeLabel: 'Tampilan daftar',
  scopeMine: 'Tugas saya',
  scopeAll: 'Semua tugas',
  statusLabel: 'Status tugas',
  statusActive: 'Aktif',
  statusDone: 'Selesai',
  statusCanceled: 'Dibatalkan',
  projectLabel: 'Proyek',
  projectAny: 'Semua proyek',
  personLabel: 'Orang yang mengerjakan',
  personAny: 'Siapa saja',
  personMe: 'Saya',
  priorityLabel: 'Prioritas',
  priorityAny: 'Semua prioritas',
  sortLabel: 'Urutkan',
  sortDue: 'Tenggat terdekat',
  sortPriority: 'Prioritas tertinggi',
  sortUpdated: 'Terakhir diubah',
  sortCreated: 'Terakhir dibuat',
} as const;
