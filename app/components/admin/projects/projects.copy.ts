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

export const MANAGER_COPY = {
  changeButton: 'Ganti Pengelola',
  confirmLabel: 'Ganti Pengelola',
  pickerLabel: 'Pengelola baru',
  pickerPlaceholder: 'Pilih anggota-manajer',
  noCandidates: 'Tidak ada anggota-manajer lain untuk dijadikan pengelola.',
  success: (name: string) => `${name} sekarang Pengelola proyek ini.`,
  failed: 'Gagal mengganti Pengelola. Coba lagi.',
} as const;

/**
 * The T2 confirm dialog's title and impact text (R05 §3.4 #4, CLAUDE.md UX §1/§6): it spells out
 * who loses the lead status and how much of the project the new Pengelola takes on. Pure, so a test
 * pins the wording without rendering a modal.
 */
export function managerChangeDialog(
  project: { name: string; lead: { name: string } | null; progress: { total: number } },
  newManagerName: string,
): { title: string; body: string } {
  const scope = `memegang kendali proyek ini beserta ${project.progress.total} tugas di dalamnya`;
  const body = project.lead
    ? `${project.lead.name} tidak lagi menjadi Pengelola utama (tetap jadi anggota pengelola). ` +
      `${newManagerName} akan ${scope}.`
    : `Proyek ini belum punya Pengelola. ${newManagerName} akan ${scope}.`;
  return { title: `Ganti Pengelola proyek "${project.name}"?`, body };
}
