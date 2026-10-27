/** Indonesian copy for the Admin project console (P11 AD-12/AD-13). */

export const ADMIN_PROJECTS_COPY = {
  title: 'Proyek',
  description: 'Semua proyek di organisasi dan siapa pengelolanya.',
  searchPlaceholder: 'Cari nama proyek…',
  statusAll: 'Semua status',
  sortLabel: 'Urutkan',
  // Column headers (desktop table).
  colName: 'Proyek',
  colStatus: 'Status',
  colManager: 'Pengelola',
  colCondition: 'Kondisi',
  colProgress: 'Progres',
  colDue: 'Tenggat',
  // Values shown when a field is empty.
  noManager: 'Belum ditunjuk',
  noDue: 'Belum ada tenggat',
  noCondition: '—',
  // Empty states.
  emptyTitle: 'Belum ada proyek',
  emptyDescription: 'Proyek yang dibuat di area produk akan muncul di sini.',
  // Pagination.
  prev: 'Sebelumnya',
  next: 'Berikutnya',
  pageInfo: (page: number, pages: number) => `Halaman ${page} dari ${pages}`,
  totalInfo: (total: number) => `${total} proyek`,
  loadFailed: 'Gagal memuat daftar proyek. Coba lagi.',
  // Drawer.
  drawerTitle: 'Detail proyek',
  detailStatus: 'Status',
  detailCondition: 'Kondisi',
  detailPriority: 'Prioritas',
  detailManager: 'Pengelola utama',
  detailProgress: 'Progres',
  detailDue: 'Tenggat',
  detailStart: 'Mulai',
} as const;

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Terbaru diperbarui' },
  { value: 'due', label: 'Tenggat terdekat' },
  { value: 'name', label: 'Nama (A–Z)' },
] as const;
