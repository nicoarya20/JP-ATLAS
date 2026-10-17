/**
 * Dev seed for the Atlas demo scenario (S0B-30). Run it by hand, never from the app:
 *
 *   SEED_ALLOW=1 bun scripts/seed-dev.ts atlas   → seeds Atlas (refreshes dates if already seeded)
 *   SEED_ALLOW=1 bun scripts/seed-dev.ts uji     → seeds "Renovasi Dapur" with 5 dummy testers (UP-1, S2-15)
 *   SEED_ALLOW=1 bun scripts/seed-dev.ts reset   → deletes only rows whose id starts with `seed-` (Atlas and uji)
 *
 * `atlas` refreshes every `seed-` row, including `uji`; `uji` only replaces its own `seed-uji-` rows.
 * Refuses when NODE_ENV=production or SEED_ALLOW is not exactly 1. Accounts get `SEED_PASSWORD`, or a
 * random one printed once. This is not a CLI subcommand on purpose: subcommands ship in the binary,
 * and an operator must not be able to seed a real database from it (X3 M22).
 */
import { insertAtlas, resetSeed, SEED_ID_PREFIX, type SeedDb } from '../server/seed/atlas.insert';
import { insertUji } from '../server/seed/uji.insert';

export const SEED_COMMANDS = ['atlas', 'uji', 'reset'] as const;
export type SeedCommand = (typeof SEED_COMMANDS)[number];

const EXIT_OK = 0;
const EXIT_FAILED = 1;
const EXIT_USAGE = 2;
const GENERATED_PASSWORD_BYTES = 18;
// Better Auth's default minimum for email+password sign-in.
const MIN_PASSWORD_LENGTH = 8;

export type SeedEnv = Readonly<Record<string, string | undefined>>;

/** Why a seed run is refused, in Indonesian for the operator; `null` means it may go ahead. */
export function seedRefusal(env: SeedEnv): string | null {
  if (env.NODE_ENV === 'production') {
    return 'Seed ditolak: NODE_ENV=production. Skrip ini hanya untuk database dev.';
  }
  if (env.SEED_ALLOW !== '1') {
    return 'Seed ditolak: set SEED_ALLOW=1 untuk memastikan database ini memang boleh diisi data contoh.';
  }
  return null;
}

/** `SEED_PASSWORD` when set, else a random one (flagged so the caller prints it once). */
export function resolveSeedPassword(env: SeedEnv): { password: string; generated: boolean } {
  const given = env.SEED_PASSWORD?.trim();
  if (given) return { password: given, generated: false };
  const bytes = crypto.getRandomValues(new Uint8Array(GENERATED_PASSWORD_BYTES));
  return { password: Buffer.from(bytes).toString('base64url'), generated: true };
}

export function isSeedCommand(value: string | undefined): value is SeedCommand {
  return (SEED_COMMANDS as readonly (string | undefined)[]).includes(value);
}

/** Everything the run touches from outside, so the guard can be tested without a database. */
export interface SeedDeps {
  /** Imported lazily, only after the guard passed, so a refused run never opens a connection. */
  loadDb: () => Promise<SeedDb>;
  now: () => Date;
  out: (line: string) => void;
  err: (line: string) => void;
}

const stdout = (line: string) => void process.stdout.write(`${line}\n`);
const stderr = (line: string) => void process.stderr.write(`${line}\n`);

const defaultDeps: SeedDeps = {
  loadDb: async () => (await import('../server/db')).db,
  now: () => new Date(),
  out: stdout,
  err: stderr,
};

/** Runs one seed command and returns the exit code (0 ok, 1 refused or failed, 2 bad usage). */
export async function runSeed(
  argv: readonly string[],
  env: SeedEnv,
  deps: SeedDeps = defaultDeps,
): Promise<number> {
  const [command] = argv;
  if (command === 'load') {
    deps.err('Perintah `load` belum tersedia; data beban (1.000 tugas) ditambahkan di S2.');
    return EXIT_USAGE;
  }
  if (!isSeedCommand(command)) {
    deps.err(`Pemakaian: SEED_ALLOW=1 bun scripts/seed-dev.ts <${SEED_COMMANDS.join('|')}>`);
    return EXIT_USAGE;
  }
  const refusal = seedRefusal(env);
  if (refusal) {
    deps.err(refusal);
    return EXIT_FAILED;
  }

  const password = resolveSeedPassword(env);
  if (command !== 'reset' && password.password.length < MIN_PASSWORD_LENGTH) {
    deps.err(`SEED_PASSWORD minimal ${MIN_PASSWORD_LENGTH} karakter.`);
    return EXIT_USAGE;
  }

  let database: SeedDb;
  try {
    database = await deps.loadDb();
  } catch (cause) {
    const why = cause instanceof Error ? cause.message : String(cause);
    deps.err(`Database belum siap (jalankan \`bun run dev\` atau isi DATABASE_URL): ${why}`);
    return EXIT_FAILED;
  }

  try {
    if (command === 'reset') {
      const r = await database.transaction((tx) => resetSeed(tx));
      deps.out(
        `Seed dihapus: ${r.tasks} tugas, ${r.projects} proyek, ${r.users} akun (id ${SEED_ID_PREFIX}…).`,
      );
      return EXIT_OK;
    }
    const r =
      command === 'uji'
        ? await insertUji(database, {
            now: deps.now(),
            password: password.password,
            timeZone: env.APP_TIME_ZONE?.trim() || undefined,
          })
        : await insertAtlas(database, { now: deps.now(), password: password.password });
    deps.out(
      `${command === 'uji' ? 'Skenario uji' : 'Atlas'} terisi (${r.accounts.length} akun, sebelumnya ${r.reset.users} akun seed dibersihkan).`,
    );
    for (const a of r.accounts) deps.out(`  ${a.email}  [${a.role}]`);
    deps.out(
      password.generated
        ? `Sandi semua akun (dicetak sekali, simpan sekarang): ${password.password}`
        : 'Sandi semua akun: nilai SEED_PASSWORD.',
    );
    return EXIT_OK;
  } catch (cause) {
    const why = cause instanceof Error ? cause.message : String(cause);
    deps.err(`Seed gagal, tidak ada perubahan yang tersisa dari proses ini: ${why}`);
    return EXIT_FAILED;
  }
}

if (import.meta.main) {
  process.exit(await runSeed(process.argv.slice(2), process.env));
}
