/** Indonesian copy for the project "Anggota" tab (⑪, P3 §2); role labels stay in `projects.copy`. */
import type { ProjectMemberRole } from '@server/pm/enums';
import { LABEL_LEAD } from './projects.copy';

export const MEMBERS_COPY = {
  title: 'Anggota proyek',
  description: 'Siapa saja yang ikut dalam proyek ini dan apa perannya.',
  tableLabel: 'Daftar anggota proyek',
  colName: 'Nama',
  colRole: 'Peran',
  colActions: 'Aksi',
  leadBadge: LABEL_LEAD,
  you: '(Anda)',
  viewerHint: 'Hanya melihat dan berkomentar',
  add: 'Tambah anggota',
  changeRole: 'Ubah peran',
  remove: 'Keluarkan',
  changeRoleOf: (name: string) => `Ubah peran ${name}`,
  removeOf: (name: string) => `Keluarkan ${name}`,
  emptyTitle: 'Belum ada anggota.',
  emptyBody: 'Tambahkan orang yang ikut mengerjakan proyek ini.',
  loadFailed: 'Daftar anggota gagal dimuat. Muat ulang halaman, lalu coba lagi.',
} as const;

/** Plain-language note under a role, when it needs one (R10 F7). */
export const MEMBER_ROLE_HINTS: Record<ProjectMemberRole, string | null> = {
  manager: null,
  member: null,
  viewer: MEMBERS_COPY.viewerHint,
};

/** Written reasons beside a disabled action (UX §5); the server answers the same cases with 409/422. */
export const MEMBER_BLOCK_COPY = {
  lastManager: 'Proyek harus punya minimal satu pengelola. Tunjuk pengelola lain dulu.',
  isLead: `Orang ini masih ${LABEL_LEAD}. Ganti ${LABEL_LEAD} di halaman Ubah proyek dulu.`,
  self: 'Anda tidak bisa mengeluarkan diri sendiri. Minta pengelola lain melakukannya.',
} as const;

export const ROLE_MODAL_COPY = {
  title: (name: string) => `Ubah peran ${name}`,
  label: 'Peran baru',
  submit: 'Lanjutkan',
  cancel: 'Batal',
} as const;

export const ADD_MODAL_COPY = {
  title: 'Tambah anggota',
  person: 'Orang',
  personPlaceholder: 'Ketik nama',
  personRequired: 'Pilih orang yang akan ditambahkan.',
  nothingFound: 'Tidak ada orang dengan nama itu.',
  searchFailed: 'Daftar orang gagal dimuat. Coba lagi sebentar lagi.',
  role: 'Peran',
  submit: 'Tambahkan ke proyek',
  cancel: 'Batal',
} as const;
