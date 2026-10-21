// PRATINJAU(AD-14): sample figures for the Beranda widgets; no query runs behind them.
/**
 * Sample content for the Admin Beranda preview (P11 AD-14/AD-15). Kept apart from the components
 * so the real work is a swap, not a rewrite: AD-14 builds `GET /api/admin/overview` returning one
 * `Widget { ok }` per section the way `server/home/*` already does, AD-15 points the same cards at
 * it, and this file is deleted.
 *
 * The figures are a believable mid-size office — about thirty people, a handful of projects —
 * because a Beranda full of zeroes teaches an Admin nothing about what the screen is for.
 */

export type RoleCount = { label: string; count: number };
export type StatusCount = { label: string; count: number; color: string };
export type LateTask = { title: string; project: string; assignee: string; days: number };
export type AgendaItem = { title: string; when: string; project: string; attendees: number };
export type RoleChange = { who: string; from: string; to: string; by: string; when: string };

/** Headline question of each card, used as the card subtitle. */
export const BERANDA_COPY = {
  title: 'Dashboard',
  description: 'Yang perlu ditangani hari ini, dalam satu layar.',
  members: { title: 'Anggota', subtitle: 'Siapa saja yang bisa masuk hari ini?' },
  projects: { title: 'Proyek per status', subtitle: 'Mana yang jalan, mana yang mandek?' },
  late: { title: 'Tugas telat', subtitle: 'Apa yang lewat tenggat dan siapa pemegangnya?' },
  agenda: { title: 'Agenda pekan ini', subtitle: 'Apa yang sudah dijadwalkan tim?' },
  roles: { title: 'Perubahan peran terakhir', subtitle: 'Siapa mengubah hak siapa?' },
  empty: 'Belum ada data',
  seeAll: 'Lihat semua',
} as const;

export const SAMPLE_MEMBERS = {
  total: 31,
  inactive: 3,
  roles: [
    { label: 'Member', count: 22 },
    { label: 'Project manager', count: 6 },
    { label: 'Admin', count: 2 },
    { label: 'Super-admin', count: 1 },
  ] satisfies RoleCount[],
};

export const SAMPLE_PROJECTS: StatusCount[] = [
  { label: 'Berjalan', count: 7, color: 'ok' },
  { label: 'Belum mulai', count: 3, color: 'gray' },
  { label: 'Tertunda', count: 2, color: 'yellow' },
  { label: 'Selesai', count: 11, color: 'blue' },
];

export const SAMPLE_LATE_TASKS: LateTask[] = [
  { title: 'Finalisasi kontrak vendor', project: 'Renovasi Kantor', assignee: 'Rina', days: 6 },
  { title: 'Uji beban API laporan', project: 'Portal Pelanggan', assignee: 'Dimas', days: 3 },
  { title: 'Kirim draf materi training', project: 'Onboarding 2027', assignee: 'Yoga', days: 1 },
];

export const SAMPLE_AGENDA: AgendaItem[] = [
  {
    title: 'Rapat mingguan proyek',
    when: 'Senin, 09.00',
    project: 'Portal Pelanggan',
    attendees: 8,
  },
  {
    title: 'Demo sprint ke klien',
    when: 'Rabu, 14.00',
    project: 'Portal Pelanggan',
    attendees: 12,
  },
  { title: 'Serah terima tahap 1', when: 'Jumat, 10.30', project: 'Renovasi Kantor', attendees: 5 },
];

export const SAMPLE_ROLE_CHANGES: RoleChange[] = [
  {
    who: 'r••••@contoh.co.id',
    from: 'Member',
    to: 'Project manager',
    by: 'Nico',
    when: '2 jam lalu',
  },
  { who: 'd••••@contoh.co.id', from: 'Project manager', to: 'Member', by: 'Nico', when: 'kemarin' },
  { who: 'y••••@contoh.co.id', from: '—', to: 'Member', by: 'Sari', when: '3 hari lalu' },
];
