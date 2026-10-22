/** Indonesian copy for the project "Tahapan" tab (phases and milestones, S5a); plain words, no jargon. */
import type { PhaseStatus } from '@server/pm/enums';

export const PLAN_COPY = {
  title: 'Tahapan proyek',
  description:
    'Bagi proyek menjadi tahapan yang berurutan, lalu catat tanggal penting di antaranya.',
  loadFailed: 'Rencana proyek gagal dimuat. Muat ulang halaman, lalu coba lagi.',
  phasesTitle: 'Tahapan',
  phasesLabel: 'Daftar tahapan proyek',
  addPhase: 'Tambah tahapan',
  phasesEmptyTitle: 'Belum ada tahapan.',
  phasesEmptyBody: 'Tambahkan tahapan pertama, misalnya Perencanaan, Pengembangan, Pengujian.',
  phasesEmptyReader: 'Pengelola proyek belum menambahkan tahapan.',
  phaseLimit: (max: number) => `Maksimal ${max} tahapan per proyek.`,
  noDates: 'Tanggal belum diisi',
  dateRange: (start: string, end: string) => `${start} – ${end}`,
  startsOn: (start: string) => `Mulai ${start}`,
  endsOn: (end: string) => `Selesai ${end}`,
  moveUp: 'Naik',
  moveDown: 'Turun',
  moveUpOf: (name: string) => `Naikkan tahapan ${name}`,
  moveDownOf: (name: string) => `Turunkan tahapan ${name}`,
  atTop: 'sudah paling atas',
  atBottom: 'sudah paling bawah',
  edit: 'Ubah',
  editOf: (name: string) => `Ubah tahapan ${name}`,
  remove: 'Hapus',
  removeOf: (name: string) => `Hapus tahapan ${name}`,
  position: (n: number, total: number) => `Tahap ${n} dari ${total}`,

  milestonesTitle: 'Milestone',
  milestonesHint: 'Tanggal penting yang ingin dicapai, misalnya serah terima atau peluncuran.',
  milestonesLabel: 'Daftar milestone proyek',
  addMilestone: 'Tambah milestone',
  milestonesEmptyTitle: 'Belum ada milestone.',
  milestonesEmptyBody: 'Tambahkan tanggal penting pertama, misalnya serah terima atau peluncuran.',
  milestonesEmptyReader: 'Pengelola proyek belum menambahkan milestone.',
  milestoneLimit: (max: number) => `Maksimal ${max} milestone per proyek.`,
  noPhase: 'Tanpa tahapan',
  inPhase: (name: string) => `Tahapan: ${name}`,
  due: (date: string) => `Tanggal: ${date}`,
  reached: (date: string) => `Tercapai ${date}`,
  notReached: 'Belum tercapai',
  overdue: 'Lewat tanggal',
  markReached: 'Tandai tercapai',
  markReachedOf: (title: string) => `Tandai milestone ${title} tercapai`,
  unmarkReached: 'Batalkan tercapai',
  unmarkReachedOf: (title: string) => `Batalkan tanda tercapai milestone ${title}`,
  editMilestoneOf: (title: string) => `Ubah milestone ${title}`,
  removeMilestoneOf: (title: string) => `Hapus milestone ${title}`,
} as const;

/** Text beside the icon of a phase status; the icon alone never carries the meaning. */
export const PHASE_STATUS_LABELS: Record<PhaseStatus, string> = {
  not_started: 'Belum mulai',
  in_progress: 'Berjalan',
  done: 'Selesai',
};

export const PHASE_FORM_COPY = {
  createTitle: 'Tambah tahapan',
  editTitle: 'Ubah tahapan',
  name: 'Nama tahapan',
  namePlaceholder: 'Misalnya Perencanaan',
  nameRequired: 'Nama tahapan wajib diisi. Tulis namanya, lalu simpan lagi.',
  nameTooLong: (max: number) =>
    `Nama terlalu panjang (paling banyak ${max} huruf). Persingkat dulu.`,
  description: 'Keterangan',
  descriptionTooLong: (max: number) =>
    `Keterangan terlalu panjang (paling banyak ${max} huruf). Persingkat dulu.`,
  startDate: 'Tanggal mulai',
  endDate: 'Tanggal selesai',
  datePlaceholder: 'Pilih tanggal',
  endBeforeStart: 'Tanggal selesai tidak boleh sebelum tanggal mulai. Ubah salah satunya.',
  status: 'Status',
  createSubmit: 'Simpan tahapan',
  editSubmit: 'Simpan perubahan',
  cancel: 'Batal',
} as const;

export const MILESTONE_FORM_COPY = {
  createTitle: 'Tambah milestone',
  editTitle: 'Ubah milestone',
  titleLabel: 'Judul milestone',
  titlePlaceholder: 'Misalnya Serah terima ke klien',
  titleRequired: 'Judul milestone wajib diisi. Tulis judulnya, lalu simpan lagi.',
  titleTooLong: (max: number) =>
    `Judul terlalu panjang (paling banyak ${max} huruf). Persingkat dulu.`,
  dueDate: 'Tanggal',
  dueDateRequired: 'Tanggal milestone wajib diisi. Pilih tanggal dari kalender.',
  datePlaceholder: 'Pilih tanggal',
  phase: 'Tahapan (boleh dikosongkan)',
  phasePlaceholder: 'Tanpa tahapan',
  createSubmit: 'Simpan milestone',
  editSubmit: 'Simpan perubahan',
  cancel: 'Batal',
} as const;

/** Toasts of the plan actions; every failure names the action and the next step comes from the server. */
export const PLAN_ACTION_COPY = {
  phaseCreated: (name: string) => `Tahapan "${name}" ditambahkan.`,
  phaseCreateFailed: 'Gagal menambah tahapan',
  phaseUpdated: (name: string) => `Tahapan "${name}" disimpan.`,
  phaseUpdateFailed: 'Gagal menyimpan tahapan',
  phaseMoved: (name: string) => `Urutan tahapan "${name}" diubah.`,
  phaseMoveFailed: 'Gagal mengubah urutan tahapan',
  phaseRemoved: (name: string, tasks: number) =>
    tasks > 0
      ? `Tahapan "${name}" dihapus. ${tasks} tugas dilepas dari tahapan ini.`
      : `Tahapan "${name}" dihapus.`,
  phaseRemoveFailed: 'Gagal menghapus tahapan',
  milestoneCreated: (title: string) => `Milestone "${title}" ditambahkan.`,
  milestoneCreateFailed: 'Gagal menambah milestone',
  milestoneUpdated: (title: string) => `Milestone "${title}" disimpan.`,
  milestoneUpdateFailed: 'Gagal menyimpan milestone',
  milestoneReached: (title: string) => `Milestone "${title}" ditandai tercapai.`,
  milestoneUnreached: (title: string) => `Tanda tercapai milestone "${title}" dibatalkan.`,
  milestoneReachFailed: 'Gagal mengubah tanda tercapai',
  milestoneRemoved: (title: string) => `Milestone "${title}" dihapus.`,
  milestoneRemoveFailed: 'Gagal menghapus milestone',
} as const;

/** Confirm dialogs (T2): both deletes are permanent, and the phase one says what happens to its tasks. */
export const PLAN_CONFIRM_COPY = {
  removePhaseTitle: (name: string) => `Hapus tahapan "${name}"?`,
  removePhaseBody: (tasks: number) =>
    tasks > 0
      ? `${tasks} tugas akan dilepas dari tahapan ini; tugasnya tetap ada. Tahapan ini dihapus permanen dan tidak bisa dikembalikan.`
      : 'Tahapan ini dihapus permanen dan tidak bisa dikembalikan. Tidak ada tugas yang terpengaruh.',
  removePhaseLabel: 'Hapus tahapan',
  removeMilestoneTitle: (title: string) => `Hapus milestone "${title}"?`,
  removeMilestoneBody: 'Milestone ini akan dihapus permanen dan tidak bisa dikembalikan.',
  removeMilestoneLabel: 'Hapus milestone',
} as const;

/** Messages the API client puts in place of the generic ones for the plan routes. */
export const PLAN_ERROR_COPY = {
  phaseLimit: (max: number) =>
    `Satu proyek paling banyak punya ${max} tahapan. Hapus tahapan yang tidak dipakai, lalu coba lagi.`,
  milestoneLimit: (max: number) =>
    `Satu proyek paling banyak punya ${max} milestone. Hapus milestone yang tidak dipakai, lalu coba lagi.`,
  notFound:
    'Tahapan atau milestone ini tidak ditemukan. Mungkin sudah dihapus; muat ulang halaman, lalu coba lagi.',
  notAllowed: 'Hanya pengelola proyek ini yang boleh mengubah tahapan dan milestone.',
  inTrash: 'Proyek ini ada di Sampah. Pulihkan proyeknya dulu.',
  invalid: 'Isian belum sesuai. Periksa nama, tanggal, dan tahapan, lalu simpan lagi.',
} as const;
