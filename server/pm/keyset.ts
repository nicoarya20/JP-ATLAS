/** Opaque keyset-pagination cursors: base64url JSON `[sortValue, id]`. */

export type CursorSortValue = string | number | null;
export type CursorKey = { sortValue: CursorSortValue; id: string };
export type CursorResult = { ok: true; key: CursorKey } | { ok: false; code: 'VALIDATION' };

const BROKEN: CursorResult = { ok: false, code: 'VALIDATION' };

/** Encodes the last row's sort value and id into an opaque cursor string. */
export function encodeCursor(sortValue: CursorSortValue, id: string): string {
  return Buffer.from(JSON.stringify([sortValue, id]), 'utf8').toString('base64url');
}

/**
 * Decodes a cursor from the client; anything tampered with or malformed is
 * `VALIDATION` rather than a thrown error, since cursors are user input.
 */
export function decodeCursor(cursor: string): CursorResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    // Not base64url JSON: the cursor was not produced by encodeCursor.
    return BROKEN;
  }
  if (!Array.isArray(parsed) || parsed.length !== 2) return BROKEN;
  const [sortValue, id] = parsed;
  const sortOk = sortValue === null || typeof sortValue === 'string' || Number.isFinite(sortValue);
  if (!sortOk || typeof id !== 'string' || id === '') return BROKEN;
  return { ok: true, key: { sortValue, id } };
}
