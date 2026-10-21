/**
 * Copy of the Ekspor data page (P11 AD-10). Kept apart from the component so the wording and the
 * list of downloads can be asserted without rendering, and so the component stays a layout file.
 * The kinds come from `@server/api/admin-export.kinds` — a pure module — so the three cards can
 * never drift from the three the endpoint serves.
 */
import { EXPORT_KINDS, EXPORT_META, type ExportKind } from '@server/api/admin-export.kinds';

export const EXPORT_PANEL_COPY = {
  intro:
    'Unduh data organisasi sebagai berkas CSV. Berkasnya bisa dibuka di Excel, Google Sheets, atau LibreOffice.',
  /** Said plainly, because the reader is about to take people's data out of the app. */
  auditNote:
    'Setiap unduhan dicatat di Aktivitas beserta jenis dan jumlah barisnya — isi berkasnya tidak ikut dicatat. Berkas ini memuat nama dan email anggota, jadi simpan di tempat yang aman.',
  failTitle: 'Gagal mengunduh',
} as const;

export type ExportItem = {
  kind: ExportKind;
  label: string;
  /** What the reader gets in the file, in one sentence. */
  description: string;
  /** Button label: imperative and specific, never "Unduh" on its own. */
  action: string;
};

export const EXPORT_ITEMS: readonly ExportItem[] = [
  {
    kind: 'members',
    label: EXPORT_META.members.label,
    description: 'Semua akun: nama, email, peran, status persetujuan, dan tanggal bergabung.',
    action: 'Unduh CSV anggota',
  },
  {
    kind: 'projects',
    label: EXPORT_META.projects.label,
    description:
      'Proyek yang masih ada: nama, status, prioritas, pengelola, tanggal mulai dan tenggat.',
    action: 'Unduh CSV proyek',
  },
  {
    kind: 'tasks',
    label: EXPORT_META.tasks.label,
    description:
      'Tugas yang masih ada: nomor, proyek, judul, status, prioritas, dan penanggung jawab.',
    action: 'Unduh CSV tugas',
  },
];

/** Guards the list against a kind added to the endpoint but never given a card. */
export function missingExportCards(): ExportKind[] {
  const shown = new Set(EXPORT_ITEMS.map((i) => i.kind));
  return EXPORT_KINDS.filter((k) => !shown.has(k));
}
