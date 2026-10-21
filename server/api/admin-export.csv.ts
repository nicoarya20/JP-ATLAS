/**
 * CSV writing for the data exports (P11 AD-10): RFC 4180 escaping plus a ReadableStream that
 * pulls one page of rows at a time from the reader it is handed. Nothing here ever holds more
 * than a single page, so a table far larger than memory still downloads (P11 §8 R5).
 */
import { logger } from '../logger';

/** RFC 4180 ends every record with CRLF, and Excel only reads UTF-8 when the BOM says so. */
export const CSV_EOL = '\r\n';
export const CSV_BOM = '﻿';

const NEEDS_QUOTES = /[",\r\n]/;

/** Quotes a cell that holds a comma, a quote or a line break; inner quotes are doubled. */
export function csvCell(value: string): string {
  return NEEDS_QUOTES.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** One complete CSV record, terminator included, so pages can be concatenated as they are. */
export function csvLine(cells: readonly string[]): string {
  return cells.map(csvCell).join(',') + CSV_EOL;
}

/** One keyset page: its rows and the cursor of the next page, or null when this was the last. */
export type CsvPage = { rows: ReadonlyArray<readonly string[]>; cursor: string | null };
export type CsvPageReader = (cursor: string | null, limit: number) => Promise<CsvPage>;
export type CsvSource = { header: readonly string[]; readPage: CsvPageReader };

/** Called exactly once per download, whether the body finished or the reader went away. */
export type CsvDone = (result: { rows: number; complete: boolean }) => void;

/**
 * Streams `source` as CSV: the header first, then one chunk per page until the reader runs out.
 * `onDone` reports how many data rows actually left the server — that count, not the data, is
 * what the caller audits.
 */
export function csvStream(
  source: CsvSource,
  pageSize: number,
  onDone: CsvDone,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cursor: string | null = null;
  let rows = 0;
  let wroteHeader = false;
  let settled = false;
  const settle = (complete: boolean) => {
    if (settled) return;
    settled = true;
    onDone({ rows, complete });
  };

  return new ReadableStream({
    async pull(controller) {
      if (!wroteHeader) {
        wroteHeader = true;
        controller.enqueue(encoder.encode(CSV_BOM + csvLine(source.header)));
        return;
      }
      try {
        const page = await source.readPage(cursor, pageSize);
        if (page.rows.length > 0) {
          rows += page.rows.length;
          // One chunk per page rather than per row: the same bytes in far fewer writes.
          controller.enqueue(encoder.encode(page.rows.map(csvLine).join('')));
        }
        cursor = page.cursor;
        if (cursor === null) {
          settle(true);
          controller.close();
        }
      } catch (err) {
        // The 200 and its headers are long gone, so a broken body is the only honest ending;
        // the audit entry then records the partial count instead of claiming a full export.
        logger.error({ err, rows }, 'csv export failed mid-stream');
        settle(false);
        controller.error(err);
      }
    },
    cancel() {
      settle(false);
    },
  });
}
