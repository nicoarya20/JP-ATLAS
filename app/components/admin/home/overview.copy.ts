/**
 * Copy for the Admin Beranda (P11 AD-15). The headline question of each card is its subtitle: an
 * Admin landing here should read six questions and their answers, not a wall of numbers. Kept apart
 * from the widgets so the words can be reviewed without reading JSX.
 */

export const OVERVIEW_COPY = {
  title: 'Dashboard',
  description: 'Yang perlu ditangani hari ini, dalam satu layar.',
  pending: {
    title: 'Antrean persetujuan',
    subtitle: 'Ada yang menunggu dipersilakan masuk?',
    waiting: (n: string) => `${n} menunggu persetujuan`,
    waitingHint: 'Orang yang baru mendaftar belum bisa memakai aplikasi sampai kamu menyetujuinya.',
    empty: 'Tidak ada yang menunggu persetujuan',
    emptyHint: 'Pendaftar baru akan muncul di sini.',
    review: 'Tinjau sekarang',
    open: 'Buka halaman Pengguna',
  },
  members: {
    title: 'Anggota',
    subtitle: 'Siapa saja yang bisa masuk hari ini?',
    link: { to: '/dashboard/users', label: 'Buka Pengguna' },
    activeSuffix: (n: string) => `aktif · ${n} dinonaktifkan`,
    empty: 'Belum ada anggota',
    emptyHint: 'Akun yang disetujui akan terhitung di sini.',
  },
  projects: {
    title: 'Proyek per status',
    subtitle: 'Mana yang jalan, mana yang mandek?',
    link: { to: '/app/projects', label: 'Buka Proyek' },
    empty: 'Belum ada proyek',
    emptyHint: 'Proyek yang dibuat tim akan terhitung di sini.',
  },
  overdue: {
    title: 'Tugas telat',
    subtitle: 'Apa yang lewat tenggat dan siapa pemegangnya?',
    link: { to: '/app/tasks', label: 'Buka Tugas' },
    unit: (n: number) => `${n} hari`,
    noAssignee: 'Belum ada pengerja',
    empty: 'Tidak ada tugas yang lewat tenggat',
    emptyHint: 'Semua tugas yang berjalan masih dalam tenggat.',
    more: (n: number) => `Lihat semua (${n})`,
  },
  agenda: {
    title: 'Agenda terdekat',
    subtitle: 'Apa yang sudah dijadwalkan tim?',
    link: { to: '/app/events', label: 'Buka Agenda' },
    empty: 'Belum ada agenda mendatang',
    emptyHint: 'Acara yang dijadwalkan tim akan muncul di sini.',
    more: (n: number) => `Lihat semua (${n})`,
  },
  roles: {
    title: 'Perubahan peran terakhir',
    subtitle: 'Siapa mengubah hak siapa?',
    link: { to: '/dashboard/users', label: 'Buka Pengguna' },
    by: (name: string) => `oleh ${name}`,
    unknownPerson: 'Akun tak dikenal',
    empty: 'Belum ada perubahan peran',
    emptyHint: 'Perubahan peran akun akan tercatat di sini.',
  },
} as const;
