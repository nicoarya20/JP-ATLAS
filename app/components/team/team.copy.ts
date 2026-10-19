/** Indonesian copy for the Team list (S6 ①); project roles come from `projects.copy`, errors from the API codes. */
import type { PmCode } from '@server/pm/errors';

export const TEAM_COPY = {
  title: 'Tim',
  description: 'Siapa saja di tim Anda dan sedang mengerjakan apa',
  projectLabel: 'Pilih proyek',
  allProjects: 'Semua proyek',
  unknownProject: 'Proyek terpilih',
  searchLabel: 'Cari nama orang',
  searchPlaceholder: 'Cari nama…',
  sortPrefix: 'Urutkan:',
  sortName: 'Nama',
  sortActive: 'Tugas aktif terbanyak',
  listLabel: 'Daftar orang di tim',
  you: '(Anda)',
  view: 'Lihat',
  viewLabel: (name: string) => `Lihat ${name}`,
  noProjects: 'Belum ada proyek bersama',
  moreProjects: (n: number) => `dan ${n} proyek lain`,
  people: (n: number) => `${n} orang`,
  active: (n: number) => `${n} tugas aktif`,
  overdue: (n: number) => `${n} terlambat`,
  noOverdue: 'tidak ada yang terlambat',
  elsewhere: '· juga di proyek lain',
  partial: (n: number) => `dari ${n} orang yang tampil`,
  shown: (shown: number, total: number) => `Menampilkan ${shown} dari ${total} orang`,
  more: 'Tampilkan lebih banyak',
  loading: 'Memuat daftar tim',
  loadFailed: 'Gagal memuat daftar tim',
  retry: 'Coba lagi',
  emptyTitle: 'Belum ada orang di tim ini',
  emptyBody: 'Orang akan muncul di sini setelah Anda bergabung di sebuah proyek.',
  filteredTitle: 'Tidak ada orang yang cocok',
  filteredBody: 'Coba ubah nama yang dicari atau pilih proyek lain.',
  clear: 'Hapus saringan',
} as const;

/** Replaces the message of a known code; anything else keeps the generic wording. */
export const TEAM_ERROR_MESSAGES: Partial<Record<PmCode, string>> = {
  NOT_FOUND: 'Proyek ini tidak ditemukan atau Anda tidak punya akses. Pilih "Semua proyek".',
  SORT_NOT_ALLOWED: 'Urutan ini hanya untuk Pengelola dan Admin. Pilih urutan Nama.',
};
