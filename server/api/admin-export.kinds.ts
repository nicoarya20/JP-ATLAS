/**
 * The three data exports of Setelan organisasi (P11 AD-10), as plain data: the panel in the
 * browser and the route on the server read this one list, so a kind can never exist on one side
 * only. Pure on purpose — no db, no env, no logger — because the client bundle imports it.
 */

export const EXPORT_KINDS = ['members', 'projects', 'tasks'] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export function isExportKind(value: string): value is ExportKind {
  return (EXPORT_KINDS as readonly string[]).includes(value);
}

/** What the file name, the toast and the audit summary call each export. */
export const EXPORT_META: Record<ExportKind, { label: string; slug: string }> = {
  members: { label: 'Anggota', slug: 'anggota' },
  projects: { label: 'Proyek', slug: 'proyek' },
  tasks: { label: 'Tugas', slug: 'tugas' },
};

/** Length of the `YYYY-MM-DD` head of an ISO timestamp. */
const ISO_DATE_LENGTH = 10;

/** `anggota-2026-10-21.csv`: the kind plus the day it was taken, so yesterday's file is still readable. */
export function exportFilename(kind: ExportKind, taken: Date): string {
  return `${EXPORT_META[kind].slug}-${taken.toISOString().slice(0, ISO_DATE_LENGTH)}.csv`;
}
