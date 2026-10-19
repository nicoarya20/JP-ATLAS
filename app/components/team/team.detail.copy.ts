/** Indonesian copy for the person detail page (`/app/team/:userId`, S6 layar ②). */

/** Same wording as the project and task 404: a hidden person and a missing one look the same (D8). */
export const NOT_FOUND_TEXT = 'Orang ini tidak ditemukan atau Anda tidak punya akses.';

/** The Tim list; also where "Kembali ke Tim" goes when the page was opened directly. */
export const TEAM_LIST_PATH = '/app/team';

export const DETAIL_COPY = {
  back: 'Kembali ke Tim',
  fallbackTitle: 'Tim',
  noProjects: 'Belum ada proyek bersama.',
  reloadFailed: 'Gagal memuat ulang data orang ini. Coba lagi.',
  reload: 'Muat ulang',
} as const;

export const PROFILE_COPY = {
  title: 'Profil',
  jobTitle: 'Jabatan',
  department: 'Divisi',
  email: 'Email',
  phone: 'Nomor HP',
  accountRole: 'Peran akun',
  empty: 'Belum diisi',
} as const;

export const PROJECTS_COPY = { title: 'Proyek bersama' } as const;

export const TASKS_COPY = {
  title: 'Tugas aktif',
  hidden: 'Jumlah tugas hanya terlihat oleh orang itu sendiri, Pengelola proyek, dan Admin.',
  empty: 'Tidak ada tugas aktif.',
  noDue: 'Belum ada tenggat',
  due: 'Tenggat',
  otherProject: 'Proyek lain',
  taskList: 'Daftar tugas aktif',
} as const;

/** "3 tugas aktif · 1 terlambat" shown at the right of the Tugas aktif heading. */
export const loadSummary = (active: number, overdue: number) =>
  `${active} tugas aktif · ${overdue} terlambat`;

/** Shown when the list is cut at the API's maximum, so a short list is never mistaken for the whole. */
export const tasksCapped = (shown: number, active: number) =>
  `Menampilkan ${shown} tugas yang paling terlambat dari ${active} tugas aktif.`;

export const alsoElsewhereNote = (name: string) =>
  `${name} juga mengerjakan proyek lain. Rinciannya hanya terlihat oleh Pengelola proyek itu dan Admin.`;

/** Under the name: the role when the two share exactly one project, otherwise how many they share. */
export const subtitleOf = (projects: readonly { name: string; role: string }[]) => {
  if (projects.length === 0) return DETAIL_COPY.noProjects;
  const [only] = projects;
  return projects.length === 1 && only
    ? `${only.role} · ${only.name}`
    : `${projects.length} proyek bersama`;
};
