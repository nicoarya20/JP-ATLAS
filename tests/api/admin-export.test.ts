/**
 * `GET /api/admin/export/:kind` (P11 AD-10): the CSV contract, the streaming/keyset property that
 * keeps a whole table out of memory (P11 §8 R5), the absence of secrets, the audit entry that
 * records counts rather than content, the per-user cap, and the refusal of API keys.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { api } from '../../server/api';
import { EXPORT_RATE_MAX, exportLimiter } from '../../server/api/admin-export';
import { csvCell, csvLine, csvStream } from '../../server/api/admin-export.csv';
import { EXPORT_KINDS, exportFilename } from '../../server/api/admin-export.kinds';
import { exportSource } from '../../server/api/admin-export.query';
import { AUDIT_ACTIONS } from '../../server/audit';
import { API_KEY_PREFIX } from '../../server/auth';
import { db } from '../../server/db';
import { account, auditLog, project as projectTable } from '../../server/db/schema';
import { call, expectApiError, resetApiLimiters, waitForAudit } from '../support/api';
import { installAuthSpies } from '../support/auth';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { countQueries } from '../support/query-count';

const auth = installAuthSpies();
const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'adexp' });

let admin: Awaited<ReturnType<typeof f.user>>;

beforeEach(async () => {
  resetApiLimiters();
  exportLimiter.reset();
  admin = await f.user({ role: 'admin' });
  auth.as(admin);
});
afterEach(async () => {
  // Audit writes are fire-and-forget, so they are not tracked at creation time.
  await db.delete(auditLog).where(eq(auditLog.actorId, admin.id));
  await cleaner.flushTest();
});
afterAll(() => cleaner.flushAll());

type Csv = { status: number; headers: Headers; text: string; bytes: Uint8Array };
/** What `csvStream` reports when the body ends; collected in an array so one call is also asserted. */
type CsvResult = { rows: number; complete: boolean };

/** Reads the whole streamed body, so the stream reaches its end and the done callback fires. */
async function getCsv(kind: string): Promise<Csv> {
  const res = await api.handle(new Request(`http://localhost/api/admin/export/${kind}`));
  // The bytes, not `res.text()`: the Fetch decoder strips the UTF-8 BOM, which is what we assert.
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { status: res.status, headers: res.headers, text: new TextDecoder().decode(bytes), bytes };
}

/** The three bytes of the UTF-8 BOM, which Excel needs to read the file as UTF-8. */
const UTF8_BOM = [0xef, 0xbb, 0xbf];

/** Data records of a CSV body: BOM and header stripped, the trailing empty line dropped. */
function dataLines(text: string): string[] {
  return text.replace(/^﻿/, '').split('\r\n').slice(1).filter(Boolean);
}

function headerOf(text: string): string[] {
  return text.replace(/^﻿/, '').split('\r\n')[0].split(',');
}

describe('CSV writing', () => {
  it('quotes only the cells that need it and doubles inner quotes (RFC 4180)', () => {
    expect(csvCell('Budi')).toBe('Budi');
    expect(csvCell('')).toBe('');
    expect(csvCell('Budi, Santoso')).toBe('"Budi, Santoso"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('dua\nbaris')).toBe('"dua\nbaris"');
    expect(csvCell('cr\rlf')).toBe('"cr\rlf"');
  });

  it('ends every record with CRLF', () => {
    expect(csvLine(['a', 'b'])).toBe('a,b\r\n');
  });
});

describe('the stream reads pages, not rows', () => {
  /** A source of `total` numbered rows that records every page it is asked for. */
  function fakeSource(total: number) {
    const calls: Array<{ cursor: string | null; limit: number }> = [];
    return {
      calls,
      header: ['id'],
      readPage: async (cursor: string | null, limit: number) => {
        calls.push({ cursor, limit });
        const from = cursor === null ? 0 : Number(cursor) + 1;
        const rows = Array.from({ length: Math.min(limit, Math.max(0, total - from)) }, (_, i) => [
          String(from + i),
        ]);
        return { rows, cursor: rows.length === limit ? (rows.at(-1)?.[0] ?? null) : null };
      },
    };
  }

  const drain = (stream: ReadableStream<Uint8Array>) => new Response(stream).text();

  it('streams every row of a dataset far larger than one page', async () => {
    const source = fakeSource(25);
    const done: CsvResult[] = [];
    const text = await drain(csvStream(source, 4, (r) => done.push(r)));
    const lines = dataLines(text);
    expect(lines).toHaveLength(25);
    expect(lines[0]).toBe('0');
    expect(lines.at(-1)).toBe('24');
    expect(done).toEqual([{ rows: 25, complete: true }]);
  });

  it('asks for one page per page, never one read per row', async () => {
    const source = fakeSource(25);
    await drain(csvStream(source, 4, () => {}));
    // 25 rows at 4 per page: six full pages, then one short page that ends the stream.
    expect(source.calls).toHaveLength(7);
    expect(source.calls.length).toBeLessThan(25);
    expect(source.calls.every((c) => c.limit === 4)).toBe(true);
    // Every page but the first carries the cursor the previous one handed over.
    expect(source.calls.map((c) => c.cursor)).toEqual([null, '3', '7', '11', '15', '19', '23']);
  });

  it('reports a partial count when the reader goes away', async () => {
    const done: CsvResult[] = [];
    const stream = csvStream(fakeSource(100), 5, (r) => done.push(r));
    const reader = stream.getReader();
    await reader.read(); // header
    await reader.read(); // first page
    await reader.cancel();
    expect(done).toEqual([{ rows: 5, complete: false }]);
  });

  it('writes the header even for an empty table', async () => {
    const text = await drain(csvStream(fakeSource(0), 10, () => {}));
    expect(headerOf(text)).toEqual(['id']);
    expect(dataLines(text)).toEqual([]);
  });
});

describe('keyset paging against the real tables', () => {
  it('walks tasks page by page without repeating or skipping a row', async () => {
    const lead = await f.user({ role: 'project_manager' });
    const project = await f.project({ lead });
    const made = await f.tasks(project, 5);
    const mine = new Set(made.map((t) => t.id));

    const source = exportSource('tasks');
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    const MAX_PAGES = 1_000;
    do {
      const page = await source.readPage(cursor, 2);
      pages++;
      for (const row of page.rows) if (mine.has(row[0])) seen.push(row[0]);
      cursor = page.cursor;
    } while (cursor !== null && pages < MAX_PAGES);

    expect(pages).toBeGreaterThan(1); // the dataset really did span several pages
    expect(seen).toHaveLength(5); // nothing came back twice
    expect(new Set(seen).size).toBe(5); // and nothing was skipped
  });

  it('fills the relation columns from a join, with one statement per page', async () => {
    const lead = await f.user({ role: 'project_manager', name: 'Pengelola Satu' });
    const worker = await f.user({ name: 'Pekerja Dua' });
    const project = await f.project({ lead, members: [[worker, 'member']] });
    await f.tasks(project, 6, () => ({ assignee: worker }));

    // Starting at the file's own tag puts this file's rows first, whatever else the test DB holds.
    const counter = countQueries();
    const page = await exportSource('tasks', counter.exec).readPage(f.tag, 500);
    expect(counter.queries).toHaveLength(1);

    const rows = page.rows.filter((r) => r[2] === project.name);
    expect(rows).toHaveLength(6);
    // Project name and assignee name came with the row, so neither needed a lookup per row.
    expect(rows.every((r) => r[6] === worker.name)).toBe(true);

    const projects = countQueries();
    const projectPage = await exportSource('projects', projects.exec).readPage(f.tag, 500);
    expect(projects.queries).toHaveLength(1);
    expect(projectPage.rows.find((r) => r[0] === project.id)?.[4]).toBe(lead.name);
  });
});

describe('GET /api/admin/export/:kind', () => {
  it('refuses an unknown kind with the catalog 422', async () => {
    const res = await call('GET', '/admin/export/salaries');
    expectApiError(res, 422, 'VALIDATION');
    expect(res.body.error).toContain('members');
  });

  it('serves a dated CSV attachment for every kind', async () => {
    const stamp = exportFilename('members', new Date()).replace('anggota-', '');
    for (const kind of EXPORT_KINDS) {
      const res = await getCsv(kind);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('text/csv; charset=utf-8');
      const disposition = res.headers.get('content-disposition') ?? '';
      expect(disposition).toStartWith('attachment; filename="');
      expect(disposition).toEndWith(`-${stamp}"`);
      expect([...res.bytes.slice(0, UTF8_BOM.length)]).toEqual(UTF8_BOM);
    }
  });

  it('exports members with a header, and escapes a name holding a comma and a quote', async () => {
    const tricky = await f.user({ name: 'Santoso, "Budi"' });
    const res = await getCsv('members');
    expect(headerOf(res.text)).toEqual([
      'id',
      'nama',
      'email',
      'peran',
      'status_persetujuan',
      'diblokir',
      'dibuat_pada',
    ]);
    const line = dataLines(res.text).find((l) => l.startsWith(tricky.id));
    expect(line).toBeDefined();
    expect(line).toContain('"Santoso, ""Budi"""');
    expect(line).toContain(tricky.email);
    expect(line).toContain('member');
    // The last two cells hold no commas, so a naive split still reads them: diblokir, dibuat_pada.
    expect(line?.split(',').at(-2)).toBe('tidak');
  });

  it('exports a live project with its lead and leaves a trashed one out', async () => {
    const lead = await f.user({ role: 'project_manager', name: 'Pengelola Tiga' });
    const live = await f.project({ lead, dueDate: '2026-12-31' });
    const gone = await f.project({ lead });
    await db
      .update(projectTable)
      .set({ deletedAt: new Date() })
      .where(eq(projectTable.id, gone.id));

    const lines = dataLines((await getCsv('projects')).text);
    const line = lines.find((l) => l.startsWith(live.id));
    expect(line).toContain(lead.name);
    expect(line).toContain('2026-12-31');
    expect(lines.some((l) => l.startsWith(gone.id))).toBe(false);
  });

  it('never exports a password hash, token, session or key column', async () => {
    const secret = 'hash-rahasia-jangan-diekspor'; // test-only
    const owner = await f.user();
    const now = new Date();
    const accountId = `${owner.id}-acc`;
    await db.insert(account).values({
      id: accountId,
      accountId: owner.email,
      providerId: 'credential',
      userId: owner.id,
      password: secret,
      createdAt: now,
      updatedAt: now,
    });
    try {
      for (const kind of EXPORT_KINDS) {
        const res = await getCsv(kind);
        for (const column of headerOf(res.text)) {
          expect(column).not.toMatch(/sandi|password|hash|token|secret|session|api.?key/i);
        }
        expect(res.text).not.toContain(secret);
      }
    } finally {
      await db.delete(account).where(eq(account.id, accountId));
    }
  });

  it('audits the export with its kind and row count, and with no exported value', async () => {
    const tricky = await f.user({ name: 'Rahasia Nama Anggota' });
    const rows = dataLines((await getCsv('members')).text).length;
    expect(rows).toBeGreaterThan(0);

    const [entry] = await waitForAudit(
      eq(auditLog.action, AUDIT_ACTIONS.DATA_EXPORT),
      eq(auditLog.actorId, admin.id),
      eq(auditLog.targetId, 'members'),
    );
    expect(entry).toBeDefined();
    expect(entry.targetType).toBe('settings');
    expect(entry.summary).toBe(`Ekspor Anggota ke CSV: ${rows} baris`);
    expect(entry.meta).toEqual({ kind: 'members', rows, complete: true });
    // The trail says how much left, never what: no exported name or email is readable from it.
    const written = JSON.stringify(entry);
    expect(written).not.toContain(tricky.name);
    expect(written).not.toContain(tricky.email);
  });

  it('caps exports per user and answers the uniform 429', async () => {
    for (let i = 0; i < EXPORT_RATE_MAX; i++) {
      expect((await getCsv('members')).status).toBe(200);
    }
    const res = await call('GET', '/admin/export/members');
    expectApiError(res, 429, 'RATE_LIMITED');
    expect(res.body.retryAfterSeconds).toBeGreaterThan(0);
    expect(res.headers.get('retry-after')).toBeTruthy();
  });

  it('refuses an API key caller, whatever its scope', async () => {
    for (const kind of EXPORT_KINDS) {
      const res = await call('GET', `/admin/export/${kind}`, undefined, {
        'x-api-key': `${API_KEY_PREFIX}whatever`, // test-only
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('API key');
    }
  });

  it('turns away a member and an anonymous caller', async () => {
    auth.as(await f.user({ role: 'member' }));
    expectApiError(await call('GET', '/admin/export/members'), 403, 'NOT_ADMIN');
    auth.as(null);
    expectApiError(await call('GET', '/admin/export/members'), 401, 'UNAUTHORIZED');
  });
});
