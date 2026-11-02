/** Copy of "Pakai template" (template-mode): picker, instantiate form and "Simpan sebagai template" on a project. */
export const TEMPLATE_COPY = {
  pickerTitle: 'Pilih template',
  pickerEmpty: 'Belum ada template.',
  pickerEmptyHint:
    'Template dibuat dari proyek yang sudah ada. Buka proyek, lalu pilih "Simpan sebagai template".',
  openProjects: 'Lihat daftar proyek',
  useButton: 'Pakai template',
  deleteButton: 'Hapus template',
  sourceProject: 'Dari proyek',
  sourceStory: 'Dari cerita AI',
  sourceManual: 'Manual',
  phaseCount: (n: number) => `${n} fase`,
  taskCount: (n: number) => `${n} tugas`,
  createdAt: (date: string) => `Dibuat ${date}`,
  deleteConfirmTitle: (name: string) => `Hapus template "${name}"?`,
  deleteConfirmBody: 'Template ini akan dihapus permanen.',
  deleteConfirmLabel: 'Hapus template',
  deleted: (name: string) => `Template "${name}" dihapus.`,
  deleteFailed: 'Gagal menghapus template',
  loadFailed: 'Gagal memuat daftar template',

  saveFromProject: 'Simpan sebagai template',
  saveDialogTitle: 'Simpan sebagai template',
  saveDialogHint:
    'Yang disimpan hanya kerangkanya: tahapan, tugas, dan jarak harinya. Orang, status, dan progres tidak ikut.',
  saveDialogSubmit: 'Simpan template',
  cancel: 'Batal',
  saved: (name: string) => `Template "${name}" disimpan.`,
  savedOmitted: (name: string, phases: number, tasks: number) =>
    `Template "${name}" disimpan, tetapi ${[
      phases > 0 ? `${phases} tahapan` : '',
      tasks > 0 ? `${tasks} tugas` : '',
    ]
      .filter(Boolean)
      .join(' dan ')} tidak ikut karena batas ukuran template.`,
  saveFailed: 'Gagal menyimpan template. Coba lagi.',
  nameLabel: 'Nama template',
  descriptionLabel: 'Deskripsi',

  useFormTitle: (name: string) => `Pakai template "${name}"`,
  startDateLabel: 'Tanggal mulai',
  startDateHint: 'Semua hari ke-N di template dihitung dari tanggal ini.',
  nameOverrideLabel: 'Nama proyek (opsional, isi untuk mengganti)',
  useSubmit: 'Pakai template',
  useFailed: 'Gagal membuat proyek dari template',
  // Not named `useSucceeded`: a "use…" name called as a function reads as a React hook to lint rules.
  applySucceeded: (name: string) => `Proyek "${name}" dibuat dari template.`,
} as const;
