import { afterAll, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { parseGenerateArgs } from '../../scripts/db-generate';
import {
  BREAKPOINT,
  MigrationRewriteError,
  rewriteMigrationSql,
  splitStatements,
} from '../../scripts/db-generate.rewrite';
import { db } from '../../server/db';

const ROOT = path.join(import.meta.dir, '../..');
/** drizzle-kit startup is slow on a cold machine; the default 5 s test timeout is too tight. */
const E2E_TIMEOUT_MS = 60_000;
const WHY = 'fixture: explain why the schema changes';

const rewrite = (s: string, extra: { destructiveOk?: string } = {}) =>
  rewriteMigrationSql(s, { why: WHY, ...extra });

describe('rewriteMigrationSql', () => {
  test('guards CREATE TABLE, CREATE [UNIQUE] INDEX and ADD COLUMN', () => {
    const out = rewrite(
      [
        'CREATE TABLE "a" (\n\t"id" text PRIMARY KEY NOT NULL\n);',
        'CREATE INDEX "a_i" ON "a" USING btree ("id");',
        'CREATE UNIQUE INDEX "a_u" ON "a" USING btree ("id");',
        'ALTER TABLE "a" ADD COLUMN "c" text;',
      ].join(BREAKPOINT),
    );
    expect(out).toContain('CREATE TABLE IF NOT EXISTS "a" (');
    expect(out).toContain('CREATE INDEX IF NOT EXISTS "a_i"');
    expect(out).toContain('CREATE UNIQUE INDEX IF NOT EXISTS "a_u"');
    expect(out).toContain('ADD COLUMN IF NOT EXISTS "c" text;');
  });

  test('wraps every kind of ADD CONSTRAINT (FK, CHECK, UNIQUE, PK) in a duplicate_object handler', () => {
    const kinds = [
      'FOREIGN KEY ("p") REFERENCES "public"."b"("id") ON DELETE cascade ON UPDATE no action',
      'CHECK ("a"."n" > 0)',
      'UNIQUE("n")',
      'PRIMARY KEY("n","m")',
    ];
    for (const kind of kinds) {
      const out = rewrite(`ALTER TABLE "a" ADD CONSTRAINT "k" ${kind};`);
      expect(out).toContain(
        `DO $$ BEGIN\n\tALTER TABLE "a" ADD CONSTRAINT "k" ${kind};\nEXCEPTION WHEN duplicate_object`,
      );
      expect(out.trimEnd().endsWith('END $$;')).toBe(true);
    }
  });

  test('keeps breakpoints and statement order', () => {
    const input = ['CREATE TABLE "a" ("id" text);', 'CREATE INDEX "i" ON "a" ("id");'].join(
      `\n${BREAKPOINT}\n`,
    );
    const out = rewrite(input);
    expect(out.split(BREAKPOINT)).toHaveLength(2);
    expect(splitStatements(out).map((s) => s.split(' ')[0])).toEqual(['CREATE', 'CREATE']);
  });

  test('puts the why on the first line', () => {
    expect(rewrite('CREATE TABLE "a" ("id" text);').split('\n')[0]).toBe(`-- Why: ${WHY}`);
  });

  test('is idempotent: rewriting its own output changes nothing', () => {
    const once = rewrite(
      `CREATE TABLE "a" ("id" text);${BREAKPOINT}\nALTER TABLE "a" ADD CONSTRAINT "k" UNIQUE("id");`,
    );
    expect(rewrite(once)).toBe(once);
  });

  test('leaves hand-written DO blocks alone', () => {
    const doBlock =
      'DO $$ BEGIN\n\tALTER TABLE "a" ADD CONSTRAINT "k" UNIQUE("id");\nEXCEPTION WHEN duplicate_object THEN NULL; END $$;';
    expect(rewrite(doBlock)).toContain(doBlock);
  });

  test('does not alter already-guarded real migrations (0004-0013 are fixpoints)', () => {
    const dir = path.join(ROOT, 'server/db/migrations');
    const files = readdirSync(dir).filter((f) => /^00(0[4-9]|1\d)_.*\.sql$/.test(f));
    expect(files.length).toBe(10);
    for (const f of files) {
      const original = readFileSync(path.join(dir, f), 'utf8');
      expect(rewrite(original).replace(/^-- Why:.*\n/, '')).toBe(original);
    }
  });

  describe('DROP', () => {
    const drops = [
      ['DROP TABLE', 'DROP TABLE "a" CASCADE;', 'DROP TABLE IF EXISTS "a" CASCADE;'],
      ['DROP INDEX', 'DROP INDEX "a_i";', 'DROP INDEX IF EXISTS "a_i";'],
      [
        'DROP COLUMN',
        'ALTER TABLE "a" DROP COLUMN "c";',
        'ALTER TABLE "a" DROP COLUMN IF EXISTS "c";',
      ],
      [
        'DROP CONSTRAINT',
        'ALTER TABLE "a" DROP CONSTRAINT "k";',
        'ALTER TABLE "a" DROP CONSTRAINT IF EXISTS "k";',
      ],
    ];
    for (const [name, input, expected] of drops) {
      test(`${name} gets IF EXISTS and requires destructive-ok`, () => {
        expect(() => rewrite(input)).toThrow(MigrationRewriteError);
        const out = rewrite(input, { destructiveOk: 'column was never populated' });
        expect(out).toContain(expected);
        expect(out.split('\n')[1]).toBe('-- destructive-ok: column was never populated');
      });
    }

    test('a too-short destructive-ok reason is refused', () => {
      expect(() => rewrite('DROP TABLE "a";', { destructiveOk: 'x' })).toThrow(/destructive-ok/);
    });

    test('ALTER COLUMN DROP NOT NULL is not treated as destructive', () => {
      expect(() => rewrite('ALTER TABLE "a" ALTER COLUMN "c" DROP NOT NULL;')).not.toThrow();
    });
  });

  test('refuses a why that is too short or spans several lines', () => {
    const sqlText = 'CREATE TABLE "a" ("id" text);';
    expect(() => rewriteMigrationSql(sqlText, { why: 'too short' })).toThrow(/minimal 20/);
    expect(() => rewriteMigrationSql(sqlText, { why: `${WHY}\nsecond line` })).toThrow(
      MigrationRewriteError,
    );
  });
});

describe('parseGenerateArgs', () => {
  const ok = ['--name=account_lifecycle', `--why=${WHY}`];

  test('accepts name + why and resolves the default config', () => {
    const args = parseGenerateArgs(ok);
    expect('error' in args).toBe(false);
    if ('error' in args) return;
    expect(args.name).toBe('account_lifecycle');
    expect(args.custom).toBe(false);
    expect(args.config.endsWith('drizzle.config.ts')).toBe(true);
  });

  test('passes --custom and --destructive-ok through', () => {
    const args = parseGenerateArgs([...ok, '--custom', '--destructive-ok=old column unused']);
    expect(args).toMatchObject({ custom: true, destructiveOk: 'old column unused' });
  });

  const rejected: [string, string[], RegExp][] = [
    ['no arguments', [], /--name/],
    ['missing why', ['--name=x_y'], /--why/],
    ['missing name', [`--why=${WHY}`], /--name/],
    ['uppercase slug', ['--name=Bad-Name', `--why=${WHY}`], /tidak valid/],
    ['short why', ['--name=x_y', '--why=short'], /terlalu pendek/],
    ['unknown option', [...ok, '--force'], /tidak dikenal/],
  ];
  for (const [name, argv, message] of rejected) {
    test(`rejects ${name}`, () => {
      const args = parseGenerateArgs(argv);
      expect('error' in args && args.error).toMatch(message);
    });
  }
});

describe('db:generate without arguments', () => {
  test('exits non-zero with a message that says what to pass', async () => {
    const proc = Bun.spawn([process.execPath, 'scripts/db-generate.ts'], {
      cwd: ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [err, code] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);
    expect(code).not.toBe(0);
    expect(err).toContain('--name=<slug>');
    expect(err).toContain('--why=');
  });
});

// End-to-end: real drizzle-kit on a throwaway schema, then the produced SQL re-run on the test DB.
describe('wrapper end-to-end on a throwaway schema', () => {
  // Inside node_modules so the schema can resolve drizzle-orm; drizzle-kit wants paths relative to the cwd (ROOT).
  const CACHE = path.join(ROOT, 'node_modules/.cache');
  mkdirSync(CACHE, { recursive: true });
  const dir = mkdtempSync(path.join(CACHE, 'db-generate-test-'));
  const rel = (p: string) => path.relative(ROOT, path.join(dir, p));
  const outDir = path.join(dir, 'out');
  mkdirSync(outDir);
  writeFileSync(
    path.join(dir, 'drizzle.config.ts'),
    `export default { dialect: 'postgresql', schema: '${rel('schema.ts')}', out: '${rel('out')}' };\n`,
  );
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  // Variant 1: base tables. 2: + column, UNIQUE and CHECK. 3: the same minus the column (a DROP).
  const UNIQUE_AND_CHECK = [
    "unique('gen_probe_child_n_uq').on(t.n),",
    'check(\'gen_probe_child_n_ck\', sql`"n" > 0`),',
  ].join('\n  ');
  const schema = (variant: 1 | 2 | 3) =>
    [
      "import { sql } from 'drizzle-orm';",
      "import { check, index, integer, pgTable, text, unique } from 'drizzle-orm/pg-core';",
      "export const parent = pgTable('gen_probe_parent', {",
      "  id: text('id').primaryKey(),",
      variant === 2 ? "  label: text('label').default('x').notNull()," : '',
      '});',
      "export const child = pgTable('gen_probe_child', {",
      "  id: text('id').primaryKey(),",
      "  parentId: text('parent_id').references(() => parent.id, { onDelete: 'cascade' }),",
      "  n: integer('n'),",
      '}, (t) => [',
      "  index('gen_probe_child_parent_idx').on(t.parentId),",
      variant > 1 ? `  ${UNIQUE_AND_CHECK}` : '',
      ']);',
      '',
    ].join('\n');

  async function generate(name: string, extra: string[] = []) {
    const proc = Bun.spawn(
      [
        process.execPath,
        'scripts/db-generate.ts',
        `--config=${rel('drizzle.config.ts')}`,
        `--name=${name}`,
        `--why=${WHY}`,
        ...extra,
      ],
      { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' },
    );
    const [out, err, code] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    return { out, err, code };
  }
  const read = (name: string) => readFileSync(path.join(outDir, name), 'utf8');
  const journal = () => readFileSync(path.join(outDir, 'meta/_journal.json'), 'utf8');

  test(
    'round 1 creates tables, FK and index with guards',
    async () => {
      writeFileSync(path.join(dir, 'schema.ts'), schema(1));
      expect((await generate('probe_one')).code).toBe(0);
      const out = read('0000_probe_one.sql');
      expect(out.split('\n')[0]).toBe(`-- Why: ${WHY}`);
      expect(out).toContain('CREATE TABLE IF NOT EXISTS "gen_probe_parent"');
      expect(out).toContain('CREATE INDEX IF NOT EXISTS "gen_probe_child_parent_idx"');
      expect(out).toContain('EXCEPTION WHEN duplicate_object');
      expect(out).not.toMatch(/CREATE TABLE "/);
    },
    E2E_TIMEOUT_MS,
  );

  test(
    'round 2 wraps ADD CONSTRAINT UNIQUE/CHECK and guards ADD COLUMN',
    async () => {
      writeFileSync(path.join(dir, 'schema.ts'), schema(2));
      expect((await generate('probe_two')).code).toBe(0);
      const out = read('0001_probe_two.sql');
      expect(out).toContain('ADD COLUMN IF NOT EXISTS "label"');
      expect(out).toMatch(
        /DO \$\$ BEGIN\n\tALTER TABLE "gen_probe_child" ADD CONSTRAINT "gen_probe_child_n_uq" UNIQUE/,
      );
      expect(out).toMatch(
        /DO \$\$ BEGIN\n\tALTER TABLE "gen_probe_child" ADD CONSTRAINT "gen_probe_child_n_ck" CHECK/,
      );
    },
    E2E_TIMEOUT_MS,
  );

  test(
    'round 3: a DROP without --destructive-ok is refused and leaves no files behind',
    async () => {
      writeFileSync(path.join(dir, 'schema.ts'), schema(3));
      const before = journal();
      const r = await generate('probe_three');
      expect(r.code).toBe(1);
      expect(r.err).toContain('--destructive-ok');
      expect(readdirSync(outDir).filter((f) => f.startsWith('0002'))).toEqual([]);
      expect(readdirSync(path.join(outDir, 'meta')).filter((f) => f.startsWith('0002'))).toEqual(
        [],
      );
      expect(journal()).toBe(before);
    },
    E2E_TIMEOUT_MS,
  );

  test(
    'round 3: with --destructive-ok the DROP gets IF EXISTS and the marker',
    async () => {
      const r = await generate('probe_three', ['--destructive-ok=probe column never populated']);
      expect(r.code).toBe(0);
      const out = read('0002_probe_three.sql');
      expect(out).toContain('DROP COLUMN IF EXISTS "label"');
      expect(out).toContain('-- destructive-ok: probe column never populated');
    },
    E2E_TIMEOUT_MS,
  );

  test(
    'the produced migrations run twice in a row on Postgres (then roll back)',
    async () => {
      const statements = ['0000_probe_one', '0001_probe_two', '0002_probe_three'].flatMap((t) =>
        read(`${t}.sql`).split(BREAKPOINT),
      );
      class Rollback extends Error {}
      try {
        await db.transaction(async (tx) => {
          await tx.execute(sql.raw('SET LOCAL client_min_messages = warning'));
          for (let pass = 0; pass < 2; pass++)
            for (const stmt of statements) await tx.execute(sql.raw(stmt));
          throw new Rollback();
        });
      } catch (e) {
        if (!(e instanceof Rollback)) throw e;
      }
      const rows = await db.execute(sql`SELECT to_regclass('public.gen_probe_child') AS t`);
      expect(rows[0]?.t).toBeNull();
    },
    E2E_TIMEOUT_MS,
  );
});
