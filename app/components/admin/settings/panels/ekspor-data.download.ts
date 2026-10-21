/**
 * Download side of the Ekspor data panel (P11 AD-10). A plain `<a download>` would be simpler, but
 * it reports neither progress nor failure: the panel needs a `loading` button and an actionable
 * toast, so the CSV is fetched, checked, and only then handed to the browser as a file.
 */
import type { ExportKind } from '@server/api/admin-export.kinds';
import { parseApiError } from '~/lib/http';

const EXPORT_BASE = '/api/admin/export';
const DISPOSITION_HEADER = 'content-disposition';
/** `attachment; filename="anggota-2026-10-21.csv"`, quoted or bare. */
const FILENAME_RE = /filename\*?=(?:"([^"]+)"|([^;]+))/i;

/** The name the server chose for the file, or null when the header is missing or unparseable. */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = FILENAME_RE.exec(header);
  const name = (match?.[1] ?? match?.[2])?.trim();
  // A path separator in a server-chosen name would escape the downloads folder; refuse it.
  return name && !name.includes('/') && !name.includes('\\') ? name : null;
}

/** Asks the browser to save `blob` as `filename`; the object URL is released right after. */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Downloads one export and returns the file name used. Throws `ApiError` on any non-2xx, so the
 * caller can show the server's own Indonesian message (422 unknown kind, 429 too many exports).
 */
export async function downloadExport(kind: ExportKind, fallbackName: string): Promise<string> {
  const res = await fetch(`${EXPORT_BASE}/${kind}`, { credentials: 'same-origin' });
  if (!res.ok) throw await parseApiError(res);
  const blob = await res.blob();
  const filename = filenameFromDisposition(res.headers.get(DISPOSITION_HEADER)) ?? fallbackName;
  saveBlob(blob, filename);
  return filename;
}
