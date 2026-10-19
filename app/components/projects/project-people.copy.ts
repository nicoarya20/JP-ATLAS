import type { Failure } from './projects.logic';

/** Copy of the Anggota tab (flow ⑩): the table, the role menu and the two dialogs. */
export const PEOPLE_COPY = {
  title: 'Anggota',
  count: (n: number) => `${n} orang`,
  add: 'Tambah anggota',
  tableLabel: 'Anggota proyek',
  person: 'Nama',
  job: 'Jabatan',
  role: 'Peran',
  actions: 'Aksi',
  leadBadge: 'Pengelola utama',
  roleOf: (name: string) => `Peran ${name}`,
  roleChanged: (name: string, role: string) => `${name} sekarang ${role}.`,
  remove: (name: string) => `Keluarkan ${name}`,
  removeTitle: (name: string) => `Keluarkan ${name} dari proyek?`,
  removeBody: 'Tugas yang sudah dikerjakan tetap ada. Orang ini tidak bisa lagi melihat proyek.',
  removeLabel: 'Keluarkan',
  removed: (name: string) => `${name} dikeluarkan dari proyek.`,
  addTitle: 'Tambah anggota',
  pick: 'Pilih orang',
  pickRole: 'Peran',
  pickRequired: 'Pilih orang yang mau ditambahkan.',
  addSubmit: 'Tambahkan',
  added: (name: string) => `${name} ditambahkan ke proyek.`,
  nobody: 'Semua orang di tim sudah ada di proyek ini.',
  cancel: 'Batal',
  noAccess: 'Hanya Pengelola proyek, Admin, dan Project Manager yang bisa mengubah anggota.',
  failed: 'Belum berhasil',
  errors: {
    IS_LEAD:
      'Pengelola utama tidak bisa diubah atau dikeluarkan di sini. Ganti dulu lewat Ubah proyek.',
    ALREADY_MEMBER: 'Orang ini sudah ada di proyek.',
    NOT_FOUND: 'Orang ini sudah tidak ada di proyek. Muat ulang halaman, lalu coba lagi.',
    NOT_LATER: 'Tenggat baru harus setelah tenggat sekarang.',
  } satisfies Record<Failure, string>,
} as const;
