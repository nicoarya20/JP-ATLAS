import { describe, expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  DESTRUCTIVE_MARKER,
  DESTRUCTIVE_REASON_MIN_LENGTH,
  DOWN_REQUIRED_FROM,
  GUARDED_FROM,
  isDropStatement,
  splitStatements,
  WHY_MIN_LENGTH,
} from '../../scripts/db-generate.rewrite';

// Shape guard for migrations (R14 §3.1, X1 D6): no DB needed. Pairs with migrations-idempotent.test.ts,
// which proves the same files really re-run cleanly. 0000-0003 are exempt by the named constants above.
const DB_DIR = path.join(import.meta.dir, '../../server/db');
const MIGRATIONS_DIR = path.join(DB_DIR, 'migrations');
const ROLLBACK_DIR = path.join(DB_DIR, 'rollback');
const FIRST_SNAPSHOT_PREV_ID = '00000000-0000-0000-0000-000000000000';
const NO_DOWN_MARKER = '-- no-down:';

interface Entry {
  idx: number;
  when: number;
  tag: string;
}
interface Snapshot {
  id: string;
  prevId: string;
}

const ident = (s: string) => s.replace(/"/g, '').replace(/^public\./i, '');
const TABLE_REF = String.raw`((?:"?public"?\.)?"?\w+"?)`;

/** Reason text after `marker:` on its own line, or undefined when the marker is absent. */
function markerReason(sql: string, marker: string): string | undefined {
  const line = sql.split('\n').find((l) => l.trimStart().startsWith(marker));
  return line?.trimStart().slice(marker.length).trim();
}

/** Every way a migration file can break the guard rules; empty = clean. */
function shapeProblems(sql: string): string[] {
  const problems: string[] = [];
  const first = sql.split('\n')[0]?.trim() ?? '';
  if (!first.startsWith('--') || first.replace(/^--\s*/, '').length < WHY_MIN_LENGTH) {
    problems.push(`baris pertama harus komentar "kenapa" (≥${WHY_MIN_LENGTH} karakter)`);
  }
  const updated = new Set<string>();
  const withDefault = new Set<string>();
  let hasDrop = false;
  for (const stmt of splitStatements(sql)) {
    const head = stmt.slice(0, 70).replace(/\s+/g, ' ');
    const upd = new RegExp(String.raw`^UPDATE\s+${TABLE_REF}`, 'i').exec(stmt);
    if (upd) updated.add(ident(upd[1]));
    if (/^CREATE\s+TABLE\b(?!\s+IF\s+NOT\s+EXISTS\b)/i.test(stmt))
      problems.push(`CREATE TABLE tanpa IF NOT EXISTS: ${head}`);
    if (
      /^CREATE\s+(?:UNIQUE\s+)?INDEX\b(?!\s+(?:CONCURRENTLY\s+)?IF\s+NOT\s+EXISTS\b)/i.test(stmt)
    ) {
      problems.push(`CREATE INDEX tanpa IF NOT EXISTS: ${head}`);
    }
    if (/^ALTER\s+TABLE\b/i.test(stmt)) {
      if (/\bADD\s+COLUMN\b(?!\s+IF\s+NOT\s+EXISTS\b)/i.test(stmt))
        problems.push(`ADD COLUMN tanpa IF NOT EXISTS: ${head}`);
      const table = new RegExp(String.raw`^ALTER\s+TABLE\s+(?:ONLY\s+)?${TABLE_REF}`, 'i').exec(
        stmt,
      )?.[1];
      const added = /\bADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?([^;]*)/i.exec(stmt);
      if (table && added && /\bDEFAULT\b/i.test(added[2]))
        withDefault.add(`${ident(table)}.${added[1]}`);
      const notNull = /\bALTER\s+COLUMN\s+"?(\w+)"?\s+SET\s+NOT\s+NULL\b/i.exec(stmt);
      if (
        table &&
        notNull &&
        !updated.has(ident(table)) &&
        !withDefault.has(`${ident(table)}.${notNull[1]}`)
      ) {
        problems.push(`SET NOT NULL tanpa UPDATE sebelumnya atau kolom ber-DEFAULT: ${head}`);
      }
    }
    if (
      /\bADD\s+CONSTRAINT\b/i.test(stmt) &&
      !/^DO\s+\$\$[\s\S]*EXCEPTION\s+WHEN\s+duplicate_object\b/i.test(stmt)
    ) {
      problems.push(
        `ADD CONSTRAINT tanpa pembungkus DO … EXCEPTION WHEN duplicate_object: ${head}`,
      );
    }
    if (isDropStatement(stmt)) {
      hasDrop = true;
      if (!/\bIF\s+EXISTS\b/i.test(stmt)) problems.push(`DROP tanpa IF EXISTS: ${head}`);
    }
  }
  const reason = markerReason(sql, DESTRUCTIVE_MARKER);
  if (hasDrop && (reason?.length ?? 0) < DESTRUCTIVE_REASON_MIN_LENGTH) {
    problems.push(
      `DROP tanpa "${DESTRUCTIVE_MARKER} <alasan ≥${DESTRUCTIVE_REASON_MIN_LENGTH} karakter>"`,
    );
  }
  return problems;
}

interface JournalFs {
  hasSql: (tag: string) => boolean;
  snapshot: (prefix: string) => Snapshot | undefined;
}

/** Journal integrity: contiguous idx, strictly rising `when`, files present, snapshot chain intact. */
function journalProblems(entries: Entry[], fsView: JournalFs): string[] {
  const problems: string[] = [];
  let prev: Snapshot | undefined;
  const seen = new Set<string>();
  entries.forEach((e, i) => {
    const prefix = String(e.idx).padStart(4, '0');
    if (e.idx !== i) problems.push(`idx ${e.idx} di posisi ${i}: harus berurutan tanpa celah`);
    if (!e.tag.startsWith(`${prefix}_`))
      problems.push(`tag "${e.tag}" tidak berawalan "${prefix}_"`);
    if (i > 0 && e.when <= entries[i - 1].when) {
      problems.push(
        `${e.tag}: when ${e.when} tidak lebih besar dari sebelumnya (${entries[i - 1].when}); migrator akan melewatinya diam-diam`,
      );
    }
    if (!fsView.hasSql(e.tag)) problems.push(`${e.tag}: berkas .sql tidak ada`);
    const snap = fsView.snapshot(prefix);
    if (!snap) {
      problems.push(`${e.tag}: ${prefix}_snapshot.json tidak ada`);
      prev = undefined;
      return;
    }
    const expectedPrev = i === 0 ? FIRST_SNAPSHOT_PREV_ID : prev?.id;
    if (expectedPrev !== undefined && snap.prevId !== expectedPrev) {
      problems.push(`${e.tag}: prevId ${snap.prevId} ≠ id snapshot sebelumnya ${expectedPrev}`);
    }
    if (seen.has(snap.id)) problems.push(`${e.tag}: id snapshot ${snap.id} dipakai dua kali`);
    seen.add(snap.id);
    prev = snap;
  });
  return problems;
}

/** idx ≥ DOWN_REQUIRED_FROM needs a rollback script or an explicit `-- no-down:` reason (R14 §3.2, L3). */
function downProblems(
  entries: Entry[],
  sqlOf: (tag: string) => string,
  hasDown: (tag: string) => boolean,
): string[] {
  return entries
    .filter((e) => e.idx >= DOWN_REQUIRED_FROM)
    .filter(
      (e) =>
        !hasDown(e.tag) &&
        (markerReason(sqlOf(e.tag), NO_DOWN_MARKER)?.length ?? 0) < DESTRUCTIVE_REASON_MIN_LENGTH,
    )
    .map(
      (e) =>
        `${e.tag}: tidak ada server/db/rollback/${e.tag}.down.sql dan tidak ada "${NO_DOWN_MARKER} <alasan>"`,
    );
}

const entries: Entry[] = JSON.parse(
  readFileSync(path.join(MIGRATIONS_DIR, 'meta/_journal.json'), 'utf8'),
).entries;
const readSql = (tag: string) => readFileSync(path.join(MIGRATIONS_DIR, `${tag}.sql`), 'utf8');
const realFs: JournalFs = {
  hasSql: (tag) => existsSync(path.join(MIGRATIONS_DIR, `${tag}.sql`)),
  snapshot: (prefix) => {
    const file = path.join(MIGRATIONS_DIR, `meta/${prefix}_snapshot.json`);
    return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Snapshot) : undefined;
  },
};

describe('migrations on disk', () => {
  test('exemption constants are pinned (0000-0003 exempt from guards, rollback required from 0014)', () => {
    expect(GUARDED_FROM).toBe(4);
    expect(DOWN_REQUIRED_FROM).toBe(14);
  });

  for (const e of entries.filter((x) => x.idx >= GUARDED_FROM)) {
    test(`${e.tag} is guarded, explained and non-destructive-by-accident`, () => {
      expect(shapeProblems(readSql(e.tag))).toEqual([]);
    });
  }

  test('journal is contiguous, strictly increasing, complete and snapshot-chained', () => {
    expect(journalProblems(entries, realFs)).toEqual([]);
  });

  test('no .sql file in the migrations folder is missing from the journal', () => {
    const tags = new Set(entries.map((e) => e.tag));
    const orphans = readdirSync(MIGRATIONS_DIR).filter(
      (f) => f.endsWith('.sql') && !tags.has(f.slice(0, -4)),
    );
    expect(orphans).toEqual([]);
  });

  test(`migrations from idx ${DOWN_REQUIRED_FROM} have a rollback script or a no-down reason`, () => {
    const hasDown = (tag: string) => existsSync(path.join(ROLLBACK_DIR, `${tag}.down.sql`));
    expect(downProblems(entries, readSql, hasDown)).toEqual([]);
  });

  test('every rollback script belongs to a journal entry', () => {
    if (!existsSync(ROLLBACK_DIR)) return;
    const tags = new Set(entries.map((e) => e.tag));
    const orphans = readdirSync(ROLLBACK_DIR).filter(
      (f) => f.endsWith('.down.sql') && !tags.has(f.slice(0, -9)),
    );
    expect(orphans).toEqual([]);
  });
});

describe('shapeProblems catches violations (fixtures)', () => {
  const WHY = '-- Why: fixture that explains the reason for the change\n';

  test('accepts the guarded patterns used by 0008/0010/0011', () => {
    const sql = `${WHY}CREATE TABLE IF NOT EXISTS "t" ("id" text);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "i" ON "t" ("id");--> statement-breakpoint
ALTER TABLE "t" ADD COLUMN IF NOT EXISTS "c" text;--> statement-breakpoint
UPDATE "t" SET "c" = 'x' WHERE "c" IS NULL;--> statement-breakpoint
ALTER TABLE "t" ALTER COLUMN "c" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
\tALTER TABLE "t" ADD CONSTRAINT "k" CHECK ("c" <> '');
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;`;
    expect(shapeProblems(sql)).toEqual([]);
  });

  const bad: [string, string, string][] = [
    ['CREATE TABLE', 'CREATE TABLE "t" ("id" text);', 'CREATE TABLE tanpa IF NOT EXISTS'],
    ['CREATE INDEX', 'CREATE INDEX "i" ON "t" ("id");', 'CREATE INDEX tanpa IF NOT EXISTS'],
    ['ADD COLUMN', 'ALTER TABLE "t" ADD COLUMN "c" text;', 'ADD COLUMN tanpa IF NOT EXISTS'],
    [
      'bare ADD CONSTRAINT',
      'ALTER TABLE "t" ADD CONSTRAINT "k" UNIQUE ("c");',
      'ADD CONSTRAINT tanpa pembungkus',
    ],
    ['DROP without IF EXISTS', 'ALTER TABLE "t" DROP COLUMN "c";', 'DROP tanpa IF EXISTS'],
    [
      'SET NOT NULL without backfill',
      'ALTER TABLE "t" ALTER COLUMN "c" SET NOT NULL;',
      'SET NOT NULL tanpa UPDATE',
    ],
  ];
  for (const [name, stmt, expected] of bad) {
    test(`flags ${name}`, () => {
      expect(shapeProblems(WHY + stmt).join('\n')).toContain(expected);
    });
  }

  test('flags a DROP IF EXISTS that lacks destructive-ok, accepts it with a reason', () => {
    const drop = 'ALTER TABLE "t" DROP COLUMN IF EXISTS "c";';
    expect(shapeProblems(WHY + drop).join('\n')).toContain('destructive-ok');
    expect(
      shapeProblems(`${WHY}-- destructive-ok: column never populated in prod\n${drop}`),
    ).toEqual([]);
  });

  test('flags a missing or too-short header comment', () => {
    expect(shapeProblems('ALTER TABLE "t" ADD COLUMN IF NOT EXISTS "c" text;')).toHaveLength(1);
    expect(
      shapeProblems('-- short\nALTER TABLE "t" ADD COLUMN IF NOT EXISTS "c" text;'),
    ).toHaveLength(1);
  });

  test('accepts SET NOT NULL on a column added with DEFAULT in the same file', () => {
    const sql = `${WHY}ALTER TABLE "t" ADD COLUMN IF NOT EXISTS "c" text DEFAULT 'a';--> statement-breakpoint\nALTER TABLE "t" ALTER COLUMN "c" SET NOT NULL;`;
    expect(shapeProblems(sql)).toEqual([]);
  });
});

describe('journalProblems / downProblems catch violations (fixtures)', () => {
  const e = (idx: number, when: number): Entry => ({
    idx,
    when,
    tag: `${String(idx).padStart(4, '0')}_x`,
  });
  const chain = (ids: [string, string][]): JournalFs => ({
    hasSql: () => true,
    snapshot: (p) => {
      const pair = ids[Number(p)];
      return pair ? { id: pair[0], prevId: pair[1] } : undefined;
    },
  });
  const good = chain([
    ['a', FIRST_SNAPSHOT_PREV_ID],
    ['b', 'a'],
    ['c', 'b'],
  ]);

  test('accepts a clean journal', () => {
    expect(journalProblems([e(0, 1), e(1, 2), e(2, 3)], good)).toEqual([]);
  });
  test('flags an idx gap', () => {
    expect(journalProblems([e(0, 1), e(2, 2)], good).join('\n')).toContain('berurutan tanpa celah');
  });
  test('flags equal and decreasing when', () => {
    expect(journalProblems([e(0, 5), e(1, 5), e(2, 4)], good).join('\n')).toContain(
      'tidak lebih besar',
    );
  });
  test('flags a missing .sql and a missing snapshot', () => {
    const noSql: JournalFs = { ...good, hasSql: () => false };
    expect(journalProblems([e(0, 1)], noSql).join('\n')).toContain('.sql tidak ada');
    expect(journalProblems([e(0, 1), e(1, 2), e(2, 3), e(3, 4)], good).join('\n')).toContain(
      '0003_snapshot.json tidak ada',
    );
  });
  test('flags a broken prevId chain', () => {
    const broken = chain([
      ['a', FIRST_SNAPSHOT_PREV_ID],
      ['b', 'zzz'],
    ]);
    expect(journalProblems([e(0, 1), e(1, 2)], broken).join('\n')).toContain('prevId zzz');
  });

  test('downProblems requires a down script or reason only from DOWN_REQUIRED_FROM', () => {
    const list = [
      e(DOWN_REQUIRED_FROM - 1, 1),
      e(DOWN_REQUIRED_FROM, 2),
      e(DOWN_REQUIRED_FROM + 1, 3),
    ];
    const withReason = list[2].tag;
    const sqlOf = (tag: string) =>
      tag === withReason ? '-- no-down: additive only, nothing to undo\nSELECT 1;' : 'SELECT 1;';
    const problems = downProblems(list, sqlOf, () => false);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(String(DOWN_REQUIRED_FROM));
    expect(downProblems(list, sqlOf, () => true)).toEqual([]);
  });
});
