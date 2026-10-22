/**
 * `bun run db:generate --name=<slug> --why="<reason>"` — drizzle-kit generate behind a guard (R14 §3.1, X1 D6).
 *
 * drizzle-kit writes unguarded DDL, so this wrapper runs it, then rewrites the new `.sql` with
 * idempotent guards and a "why" header. The snapshot is never touched. If the rewrite is refused
 * (e.g. DROP without --destructive-ok) the generated files are removed again so nothing half-made stays.
 */
import { existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  buildHeader,
  MigrationRewriteError,
  rewriteMigrationSql,
  WHY_MIN_LENGTH,
} from './db-generate.rewrite';

const ROOT = path.join(import.meta.dir, '..');
const DEFAULT_CONFIG = 'drizzle.config.ts';
/** Tags double as file names and Postgres-friendly identifiers, so keep them lowercase snake_case. */
const SLUG_PATTERN = /^[a-z][a-z0-9_]*$/;

const USAGE = `Pemakaian:
  bun run db:generate --name=<slug> --why="<alasan, minimal ${WHY_MIN_LENGTH} karakter>" [--custom] [--destructive-ok="<alasan>"]

  --name            wajib; huruf kecil/angka/underscore, mis. account_lifecycle
  --why             wajib; KENAPA skema berubah (jadi komentar baris pertama)
  --custom          migrasi data (UPDATE/INSERT): file kosong untuk diisi tangan
  --destructive-ok  wajib bila hasilnya berisi DROP
  --config          opsional; berkas konfigurasi drizzle (default ${DEFAULT_CONFIG})

Jangan memanggil \`drizzle-kit generate\` langsung — SQL-nya tanpa guard IF NOT EXISTS.`;

interface Args {
  name: string;
  why: string;
  custom: boolean;
  destructiveOk?: string;
  config: string;
}

/** Validates argv; returns the parsed args or a message in Indonesian explaining what is missing. */
export function parseGenerateArgs(argv: string[]): Args | { error: string } {
  let values: ReturnType<typeof parseArgs>['values'];
  try {
    values = parseArgs({
      args: argv,
      options: {
        name: { type: 'string' },
        why: { type: 'string' },
        custom: { type: 'boolean' },
        'destructive-ok': { type: 'string' },
        config: { type: 'string' },
      },
      strict: true,
    }).values;
  } catch (e) {
    return { error: `Argumen tidak dikenal: ${(e as Error).message}` };
  }
  const name = values.name as string | undefined;
  const why = (values.why as string | undefined)?.trim();
  if (!name) return { error: 'Argumen --name=<slug> wajib diisi.' };
  if (!SLUG_PATTERN.test(name))
    return { error: `--name "${name}" tidak valid: pakai huruf kecil, angka, dan underscore.` };
  if (!why)
    return { error: `Argumen --why="<alasan>" wajib diisi (minimal ${WHY_MIN_LENGTH} karakter).` };
  // Checked here too so a too-short reason fails before drizzle-kit runs, not only when a migration is written.
  if (why.length < WHY_MIN_LENGTH)
    return {
      error: `--why terlalu pendek (${why.length} karakter, minimal ${WHY_MIN_LENGTH}): jelaskan KENAPA skema berubah.`,
    };
  return {
    name,
    why,
    custom: Boolean(values.custom),
    destructiveOk: values['destructive-ok'] as string | undefined,
    config: path.resolve(ROOT, (values.config as string | undefined) ?? DEFAULT_CONFIG),
  };
}

interface JournalEntry {
  tag: string;
}

async function readJournal(outDir: string): Promise<{ raw: string; tags: string[] }> {
  const file = path.join(outDir, 'meta/_journal.json');
  if (!existsSync(file)) return { raw: '', tags: [] };
  const raw = await readFile(file, 'utf8');
  return { raw, tags: (JSON.parse(raw).entries as JournalEntry[]).map((e) => e.tag) };
}

async function resolveOutDir(configPath: string): Promise<string> {
  // Imported lazily: it loads dotenv and the local-pg path helpers, which argument validation must not need.
  const cfg = (await import(configPath)).default as { out?: string };
  if (!cfg.out) throw new Error(`Konfigurasi ${configPath} tidak punya "out".`);
  return path.resolve(ROOT, cfg.out);
}

/** Undo what drizzle-kit just wrote so a refused rewrite leaves the repo exactly as it was. */
async function discard(outDir: string, tag: string, journalRaw: string): Promise<void> {
  const prefix = tag.split('_')[0];
  await rm(path.join(outDir, `${tag}.sql`), { force: true });
  await rm(path.join(outDir, `meta/${prefix}_snapshot.json`), { force: true });
  await writeFile(path.join(outDir, 'meta/_journal.json'), journalRaw);
}

export async function run(argv: string[]): Promise<number> {
  const args = parseGenerateArgs(argv);
  if ('error' in args) {
    console.error(`${args.error}\n\n${USAGE}`);
    return 1;
  }
  const outDir = await resolveOutDir(args.config);
  const before = await readJournal(outDir);

  const drizzleArgs = ['generate', `--config=${args.config}`, `--name=${args.name}`];
  if (args.custom) drizzleArgs.push('--custom');
  const proc = Bun.spawn([process.execPath, 'run', 'drizzle-kit', ...drizzleArgs], {
    cwd: ROOT,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await proc.exited;
  if (code !== 0) return code;

  const after = await readJournal(outDir);
  const added = after.tags.filter((t) => !before.tags.includes(t));
  if (added.length === 0) {
    // stdout stays inherited (rename prompts need a TTY), so we cannot tell "no changes" from a swallowed drizzle-kit error.
    console.log(
      '\nTidak ada migrasi baru yang dibuat. Bila drizzle-kit tidak menulis "No schema changes", periksa galat di atas.',
    );
    return 0;
  }
  if (added.length > 1) {
    console.error(
      `drizzle-kit menambah ${added.length} entri journal; seharusnya satu. Periksa ${outDir}.`,
    );
    return 1;
  }

  const tag = added[0];
  const sqlFile = path.join(outDir, `${tag}.sql`);
  try {
    const opts = { why: args.why, destructiveOk: args.destructiveOk };
    const sql = args.custom
      ? buildHeader(opts, false)
      : rewriteMigrationSql(await readFile(sqlFile, 'utf8'), opts);
    await writeFile(sqlFile, sql);
  } catch (e) {
    await discard(outDir, tag, before.raw);
    if (e instanceof MigrationRewriteError) {
      console.error(
        `\n${e.message}\nMigrasi ${tag} dibatalkan (berkas dihapus); jalankan ulang dengan argumen yang benar.`,
      );
      return 1;
    }
    throw new Error(`Gagal menulis ulang ${tag}.sql: ${(e as Error).message}`);
  }
  console.log(
    `\nMigrasi ${tag}.sql ditulis ulang dengan guard idempoten. Periksa isinya, lalu jalankan db:migrate (dev dan test).`,
  );
  return 0;
}

if (import.meta.main) process.exit(await run(process.argv.slice(2)));
