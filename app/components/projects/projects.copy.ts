/** Indonesian copy for the project screens (lane L1b); enum labels stay in `~/lib/pm-labels`. */
import type { ProjectMemberRole } from '@server/pm/enums';
import type { PmCode } from '@server/pm/errors';

/** "Lead" in the wireframe; KB-8 approved this wording on 16 Oct 2026. Change this line only if renamed. */
export const LABEL_LEAD = 'Pengelola utama';

/** Role inside one project (glossary); not in pm-labels, which covers status/priority/condition only. */
export const MEMBER_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  manager: 'Pengelola',
  member: 'Anggota',
  viewer: 'Pemantau',
};

export const PROJECT_TABS = {
  summary: 'Ringkasan',
  tasks: 'Tugas',
  members: 'Anggota',
} as const;

export const HEADER_COPY = {
  menuLabel: 'Menu proyek',
  edit: 'Ubah proyek',
  due: 'Tenggat',
  noDue: 'Belum ada tenggat',
  noLead: 'Belum ditunjuk',
  status: 'Status',
  condition: 'Kondisi',
} as const;

/** Q12: closed projects still accept tasks; D10: PM/watchers who only read. */
export const BANNER_COPY = {
  closed: (statusLabel: string) =>
    `Proyek ini sudah ${statusLabel.toLowerCase()}. Tugas baru tetap boleh ditambahkan.`,
  readOnly: 'Anda hanya bisa melihat proyek ini.',
} as const;

export const SUMMARY_COPY = {
  progressTitle: 'Progres tugas',
  progressHint: 'Tugas yang selesai dibanding semua tugas aktif.',
  timeTitle: 'Waktu berjalan',
  timeHint: 'Bagian waktu proyek yang sudah terpakai, dari tanggal mulai sampai tenggat.',
  timeUnknown: '—',
  timeUnknownHint: 'Isi tanggal mulai dan tenggat agar waktu berjalan bisa dihitung.',
  timeOverrun: 'Tenggat sudah lewat',
  timeUsed: (percent: number) => `${percent}% waktu terpakai`,
  overdueTitle: 'Tugas terlambat',
  overdueNone: 'Tidak ada tugas yang terlambat.',
  overdueSome: (n: number) => `${n} tugas melewati tenggat.`,
  highlightsTitle: 'Tugas terlambat dan penting',
  highlightsEmpty: 'Belum ada tugas yang perlu disorot.',
  highlightsEmptyHint: 'Tugas yang terlambat atau berprioritas tinggi akan muncul di sini.',
} as const;

export const NOT_FOUND_TEXT = 'Proyek tidak ditemukan atau Anda tidak punya akses.';

/** Toast texts for `useProjectActions`. */
export const ACTION_COPY = {
  created: (name: string) => `Proyek "${name}" dibuat.`,
  updated: 'Perubahan proyek disimpan.',
  statusChanged: (statusLabel: string) => `Status proyek diubah menjadi ${statusLabel}.`,
  memberAdded: (name: string) => `${name} ditambahkan ke proyek.`,
  roleChanged: (name: string) => `Peran ${name} diubah.`,
  memberRemoved: (name: string) => `${name} dikeluarkan dari proyek.`,
  createFailed: 'Gagal membuat proyek',
  updateFailed: 'Gagal menyimpan proyek',
  statusFailed: 'Gagal mengubah status proyek',
  addMemberFailed: 'Gagal menambahkan anggota',
  changeRoleFailed: 'Gagal mengubah peran',
  removeMemberFailed: 'Gagal mengeluarkan anggota',
} as const;

/** T2 dialogs (CLAUDE.md UX §1) for the member actions that need one. */
export const CONFIRM_COPY = {
  removeTitle: (name: string) => `Keluarkan ${name}?`,
  removeBody: 'Ia tidak bisa lagi melihat proyek ini.',
  removeLabel: 'Keluarkan dari proyek',
  roleTitle: (name: string) => `Ubah peran ${name}?`,
  roleBody: (roleLabel: string) =>
    `Peran barunya: ${roleLabel}. Hak aksesnya di proyek ikut berubah.`,
  roleLabel: 'Ubah peran',
} as const;

/**
 * Project-specific wording for API error codes; wins over the server text so the UI says
 * "Pengelola utama" consistently. Codes not listed fall back to the server's own message.
 */
export const PROJECT_ERROR_MESSAGES: Partial<Record<PmCode, string>> = {
  NOT_FOUND: NOT_FOUND_TEXT,
  NOT_MANAGER: 'Hanya pengelola proyek ini yang boleh mengubahnya.',
  NOT_APP_ROLE: 'Hanya Admin dan Project Manager yang bisa membuat proyek.',
  LEAD_MUST_BE_MANAGER: `${LABEL_LEAD} harus berperan Pengelola di proyek ini.`,
  LAST_MANAGER: 'Proyek harus punya minimal satu pengelola. Tunjuk pengelola lain dulu.',
  IS_LEAD: `Orang ini masih ${LABEL_LEAD}. Jadikan orang lain ${LABEL_LEAD} dulu.`,
  PROJECT_IN_TRASH: 'Proyek ini ada di Sampah. Pulihkan proyeknya dulu.',
  IMPERSONATING: 'Saat menyamar sebagai pengguna lain, aksi ini dinonaktifkan.',
  ROLE_CANNOT_TRASH: 'Hanya Admin atau Project Manager yang boleh menghapus proyek.',
};
