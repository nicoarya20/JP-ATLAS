/**
 * `migrate`: apply (or with `--status`, only list) pending Drizzle migrations on the external Postgres in
 * DATABASE_URL. Deliberately separate from `start`: auto-migrating on every boot races when several
 * instances start together, so deploys run `migrate` once, then `start`.
 * Env-free at the top level (no `server/env`/`server/db`): it must work before `.env` is fully valid.
 */
import { parseArgs } from 'node:util';
import journal from '../db/migrations/meta/_journal.json' with { type: 'json' };
import { pgClient } from '../local-pg/client';
import { PKG_NAME } from '../pkg';

const DB_CONNECT_TIMEOUT_S = 5;
const PG_PROTOCOLS = ['postgres:', 'postgresql:'];
const EXIT_OK = 0;
const EXIT_FAILED = 1;
const EXIT_BAD_ARGS = 2;

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** `host:port/db` of a connection URL, without credentials, safe to print. */
function describeTarget(url: URL): string {
  return `${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`;
}

/** Journal entries newer than the last applied migration — the same rule Drizzle's migrator uses (`created_at < folderMillis`). */
async function pendingTags(url: string): Promise<string[]> {
  const sql = pgClient(url, { max: 1, connect_timeout: DB_CONNECT_TIMEOUT_S, onnotice: () => {} });
  try {
    const [exists] = await sql<
      { found: boolean }[]
    >`select to_regclass('drizzle.__drizzle_migrations') is not null as found`;
    if (!exists?.found) return journal.entries.map((e) => e.tag);
    const [last] = await sql<
      { at: string | null }[]
    >`select max(created_at)::text as at from drizzle.__drizzle_migrations`;
    const lastAt = last?.at == null ? Number.NEGATIVE_INFINITY : Number(last.at);
    return journal.entries.filter((e) => e.when > lastAt).map((e) => e.tag);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function run(argv: string[]): Promise<number> {
  let status: boolean;
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      options: { status: { type: 'boolean' } },
      allowPositionals: true,
    });
    if (positionals.length > 0) throw new Error(`argumen tak dikenal: ${positionals[0]}`);
    status = Boolean(values.status);
  } catch (err) {
    console.error(`Argumen tidak valid: ${errMsg(err)}\nPemakaian: ${PKG_NAME} migrate [--status]`);
    return EXIT_BAD_ARGS;
  }

  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error(
      'DATABASE_URL kosong. `migrate` untuk Postgres eksternal; mode Postgres lokal memigrasi otomatis saat `start`.',
    );
    return EXIT_FAILED;
  }
  let target: URL;
  try {
    target = new URL(raw);
    if (!PG_PROTOCOLS.includes(target.protocol)) throw new Error('unsupported protocol');
  } catch {
    // The URL itself is not echoed: it may embed a password.
    console.error('DATABASE_URL tidak valid. Format: postgres://user:password@host:5432/nama_db');
    return EXIT_FAILED;
  }
  const where = describeTarget(target);

  try {
    const pending = await pendingTags(raw);
    if (status) {
      console.log(
        pending.length
          ? `${pending.length} migrasi pending di ${where}:\n${pending.map((t) => `  ${t}`).join('\n')}`
          : `0 migrasi pending di ${where} (${journal.entries.length} diterapkan)`,
      );
      return EXIT_OK;
    }
    if (pending.length === 0) {
      console.log(`Tidak ada migrasi pending di ${where} (${journal.entries.length} diterapkan)`);
      return EXIT_OK;
    }
    // Dynamic: boot.ts pulls in the local-pg server stack, which `--status` and arg errors never need.
    const { runMigrations } = await import('../local-pg/boot');
    const applied = await runMigrations(raw);
    console.log(`${pending.length} migrasi diterapkan di ${where} (total ${applied})`);
    return EXIT_OK;
  } catch (err) {
    console.error(
      `Gagal ${status ? 'memeriksa' : 'menjalankan'} migrasi di ${where}: ${errMsg(err)}`,
    );
    return EXIT_FAILED;
  }
}
