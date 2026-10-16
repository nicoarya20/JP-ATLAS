/** `migrate`: status/apply against real databases, plus argument and connection failures. */
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from 'bun:test';
import { main } from '../../server/cli';
import { run } from '../../server/cli/migrate';
import journal from '../../server/db/migrations/meta/_journal.json' with { type: 'json' };
import { pgClient } from '../../server/local-pg/client';

const TOTAL = journal.entries.length;
const savedUrl = process.env.DATABASE_URL;
const testUrl = process.env.DATABASE_URL_TEST ?? '';
let scratchDb = '';

/** Same server as the test database, different database name (keeps the `?host=` socket query of local mode). */
function urlFor(db: string): string {
  const u = new URL(testUrl);
  u.pathname = `/${db}`;
  return u.href;
}

async function admin<T>(fn: (sql: ReturnType<typeof pgClient>) => Promise<T>): Promise<T> {
  const sql = pgClient(urlFor('postgres'), { max: 1, onnotice: () => {} });
  try {
    return await fn(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

/** Run the command with a captured console; returns exit code plus stdout/stderr text. */
async function exec(args: string[], url: string | undefined) {
  if (url === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = url;
  const log = spyOn(console, 'log').mockImplementation(() => {});
  const err = spyOn(console, 'error').mockImplementation(() => {});
  const code = await run(args);
  return { code, out: log.mock.calls.flat().join('\n'), err: err.mock.calls.flat().join('\n') };
}

beforeAll(() => {
  expect(testUrl).not.toBe('');
});
// A fresh empty database per test: the apply test migrates it, which the "pending" test must not see.
beforeEach(async () => {
  scratchDb = `migrate_cli_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await admin((sql) => sql`create database ${sql(scratchDb)}`);
});
afterEach(async () => {
  for (const m of ['log', 'error'] as const)
    (console[m] as unknown as { mockRestore?: () => void }).mockRestore?.();
  await admin((sql) => sql`drop database if exists ${sql(scratchDb)} with (force)`);
});
afterAll(() => {
  if (savedUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = savedUrl;
});

describe('migrate --status', () => {
  test('prints 0 pending and exits 0 on the migrated test database', async () => {
    const r = await exec(['--status'], testUrl);
    expect(r.code).toBe(0);
    expect(r.out).toContain('0 migrasi pending');
  });

  test('lists every migration as pending on an empty database without applying any', async () => {
    const r = await exec(['--status'], urlFor(scratchDb));
    expect(r.code).toBe(0);
    expect(r.out).toContain(`${TOTAL} migrasi pending`);
    expect(r.out).toContain(journal.entries[0].tag);
    const again = await exec(['--status'], urlFor(scratchDb));
    expect(again.out).toContain(`${TOTAL} migrasi pending`);
  });
});

describe('migrate', () => {
  test('applies pending migrations, then reports nothing left', async () => {
    const applied = await exec([], urlFor(scratchDb));
    expect(applied.err).toBe('');
    expect(applied.code).toBe(0);
    expect(applied.out).toContain(`${TOTAL} migrasi diterapkan`);
    const status = await exec(['--status'], urlFor(scratchDb));
    expect(status.out).toContain('0 migrasi pending');
    const rerun = await exec([], urlFor(scratchDb));
    expect(rerun.code).toBe(0);
    expect(rerun.out).toContain('Tidak ada migrasi pending');
  });

  test('wrong connection URL exits 1 with context and never prints the password', async () => {
    const r = await exec([], 'postgres://tester:s3cret-pass@127.0.0.1:1/nodb'); // test-only
    expect(r.code).toBe(1);
    expect(r.err).toContain('Gagal menjalankan migrasi di 127.0.0.1:1/nodb');
    expect(r.err + r.out).not.toContain('s3cret-pass');
  });

  test('unparsable DATABASE_URL exits 1 without echoing it', async () => {
    const r = await exec(['--status'], 'bukan-url:rahasia'); // test-only
    expect(r.code).toBe(1);
    expect(r.err).toContain('DATABASE_URL tidak valid');
    expect(r.err).not.toContain('rahasia');
  });

  test('empty DATABASE_URL exits 1 and points to local mode', async () => {
    const r = await exec([], '');
    expect(r.code).toBe(1);
    expect(r.err).toContain('DATABASE_URL kosong');
  });

  test('unknown option or positional exits 2 before touching the database', async () => {
    const opt = await exec(['--nope'], undefined);
    expect(opt.code).toBe(2);
    expect(opt.err).toContain('Pemakaian:');
    const pos = await exec(['apply'], undefined);
    expect(pos.code).toBe(2);
  });
});

describe('migrate registration', () => {
  test('help lists the migrate command', async () => {
    const log = spyOn(console, 'log').mockImplementation(() => {});
    expect(await main(['help'])).toBe(0);
    expect(log.mock.calls.flat().join('\n')).toMatch(/^\s+migrate\s+/m);
  });

  test('main dispatches migrate and propagates its exit code', async () => {
    spyOn(console, 'error').mockImplementation(() => {});
    expect(await main(['migrate', '--bogus'])).toBe(2);
  });
});
