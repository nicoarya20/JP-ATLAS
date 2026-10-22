/**
 * Pure SQL rewriter for drizzle-kit output (R14 §3.1, X1 D6).
 *
 * drizzle-kit 0.31 emits unguarded DDL, but prod re-runs migrations (rule §4: idempotent), so every
 * generated statement is rewritten with the matching guard. Kept free of I/O so tests can feed it
 * fixtures; the wrapper in `db-generate.ts` owns the file handling.
 */

/** drizzle-kit separator between statements; the migrator splits on it and runs each chunk alone. */
export const BREAKPOINT = '--> statement-breakpoint';
/** Minimum length of the `--why` text: a real reason, not a placeholder (global rule §4). */
export const WHY_MIN_LENGTH = 20;
/** Minimum length of a `destructive-ok` reason, so "-- destructive-ok: x" cannot slip through. */
export const DESTRUCTIVE_REASON_MIN_LENGTH = 10;
export const DESTRUCTIVE_MARKER = '-- destructive-ok:';

/** First migration index held to the guard rules; 0000-0003 predate them (26 unguarded statements, R14 §2.1). */
export const GUARDED_FROM = 4;
/** First migration index that must ship a rollback script or a `-- no-down:` reason (R14 §3.2, L3). */
export const DOWN_REQUIRED_FROM = 14;

export class MigrationRewriteError extends Error {}

export interface RewriteOptions {
  /** One-line reason for the migration; becomes the first comment line of the file. */
  why: string;
  /** Required when the SQL contains a DROP; written as `-- destructive-ok: <reason>`. */
  destructiveOk?: string;
}

/** Splits a chunk into its leading comment/blank lines and the statement that follows. */
function splitLeading(chunk: string): { lead: string; body: string } {
  const lead = /^(?:[ \t]*(?:--[^\n]*)?\n)*/.exec(chunk)?.[0] ?? '';
  return { lead, body: chunk.slice(lead.length) };
}

/** Statements of a migration with comments stripped, one entry per breakpoint chunk (empty chunks dropped). */
export function splitStatements(sql: string): string[] {
  return sql
    .split(BREAKPOINT)
    .map((chunk) => splitLeading(chunk).body.trim())
    .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));
}

const DROP_OBJECT = /^DROP\s+(?:TABLE|INDEX|TYPE|SEQUENCE|SCHEMA|VIEW|MATERIALIZED\s+VIEW)\b/i;
const ALTER_DROP = /^ALTER\s+TABLE\b[\s\S]*?\bDROP\s+(?:COLUMN|CONSTRAINT)\b/i;

/** True for statements that remove schema objects (the ones that need `destructive-ok`). */
export function isDropStatement(stmt: string): boolean {
  const s = stmt.trimStart();
  return DROP_OBJECT.test(s) || ALTER_DROP.test(s);
}

/**
 * Wraps one statement in the handler used by hand-edited migrations (0008:16-18). `duplicate_table` is added
 * because re-adding a UNIQUE constraint raises 42P07 ("relation already exists", the backing index), not
 * 42710 duplicate_object — verified on PG 18; FK and CHECK raise duplicate_object.
 */
function wrapDuplicateObject(body: string): string {
  const stmt = body.trim().replace(/;?$/, ';');
  const tail = body.slice(body.trimEnd().length);
  return `DO $$ BEGIN\n\t${stmt}\nEXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;${tail}`;
}

/** Rewrites one statement; DO blocks are left alone so the rewrite is idempotent. */
function rewriteBody(body: string): string {
  const s = body.trimStart();
  if (/^DO\s+\$\$/i.test(s)) return body;
  if (/^ALTER\s+TABLE\b[\s\S]*?\bADD\s+CONSTRAINT\b/i.test(s)) return wrapDuplicateObject(body);
  if (isDropStatement(s)) {
    return body
      .replace(
        /^(\s*DROP\s+(?:TABLE|INDEX|TYPE|SEQUENCE|SCHEMA|VIEW|MATERIALIZED\s+VIEW)\s+)(?!IF\s+EXISTS\b)/i,
        '$1IF EXISTS ',
      )
      .replace(/(\bDROP\s+(?:COLUMN|CONSTRAINT)\s+)(?!IF\s+EXISTS\b)/gi, '$1IF EXISTS ');
  }
  // CONCURRENTLY is excluded: `INDEX IF NOT EXISTS CONCURRENTLY` is invalid, and the guard test flags such files.
  if (/^CREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(s)) {
    return body.replace(
      /^(\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+)(?!IF\s+NOT\s+EXISTS\b|CONCURRENTLY\b)/i,
      '$1IF NOT EXISTS ',
    );
  }
  if (/^CREATE\s+TABLE\b/i.test(s)) {
    return body.replace(/^(\s*CREATE\s+TABLE\s+)(?!IF\s+NOT\s+EXISTS\b)/i, '$1IF NOT EXISTS ');
  }
  if (/^ALTER\s+TABLE\b/i.test(s)) {
    return body.replace(/(\bADD\s+COLUMN\s+)(?!IF\s+NOT\s+EXISTS\b)/gi, '$1IF NOT EXISTS ');
  }
  return body;
}

/** Header comments: line 1 is the "why" (rule §4), followed by the destructive marker when needed. */
export function buildHeader(opts: RewriteOptions, destructive: boolean): string {
  const why = opts.why.trim();
  if (why.length < WHY_MIN_LENGTH || /[\r\n]/.test(why)) {
    throw new MigrationRewriteError(
      `Alasan (--why) harus satu baris dan minimal ${WHY_MIN_LENGTH} karakter — jelaskan KENAPA skema berubah, bukan apa.`,
    );
  }
  const lines = [`-- Why: ${why}`];
  if (destructive) {
    const reason = opts.destructiveOk?.trim() ?? '';
    if (reason.length < DESTRUCTIVE_REASON_MIN_LENGTH || /[\r\n]/.test(reason)) {
      throw new MigrationRewriteError(
        `Migrasi ini berisi DROP. Tambahkan --destructive-ok="<alasan aman, minimal ${DESTRUCTIVE_REASON_MIN_LENGTH} karakter>" (data sudah tidak dipakai / sudah dibackup).`,
      );
    }
    lines.push(`${DESTRUCTIVE_MARKER} ${reason}`);
  }
  return `${lines.join('\n')}\n`;
}

/** Adds idempotency guards to drizzle-kit SQL and prepends the why/destructive header. Safe to apply twice. */
export function rewriteMigrationSql(sql: string, opts: RewriteOptions): string {
  const parts = sql.split(BREAKPOINT);
  let destructive = false;
  const rewritten = parts.map((chunk) => {
    const { lead, body } = splitLeading(chunk);
    if (isDropStatement(body)) destructive = true;
    return lead + rewriteBody(body);
  });
  const text = rewritten.join(BREAKPOINT);
  if (/^-- Why:/.test(text)) return text;
  return buildHeader(opts, destructive) + text;
}
