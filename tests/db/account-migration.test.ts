import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { db, schema } from '../../server/db';
import { testUser } from '../support/accounts';

// Proves migration 0014 (R14 §3.1, P1 §2.4/§7): replays it on a hand-built pre-0014 state inside a
// transaction that is always rolled back, so the shared test DB is never changed. The danger it guards
// is drizzle-kit's default (ADD COLUMN ... DEFAULT 'pending'), which would lock every existing account.
const MIGRATION = path.join(
  import.meta.dir,
  '../../server/db/migrations/0014_account_lifecycle.sql',
);
const STATEMENTS = readFileSync(MIGRATION, 'utf8')
  .split('--> statement-breakpoint')
  .filter((chunk) => chunk.replace(/^\s*--.*$/gm, '').trim().length > 0);

const PG_CHECK_VIOLATION = '23514';
const PG_UNIQUE_VIOLATION = '23505';
const FAR_FUTURE = "now() + interval '14 days'";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
class Rollback extends Error {}

const exec = (tx: Tx, text: string) => tx.execute(sql.raw(text));

/** Rows of a raw query, typed by the caller. */
async function rows<T>(tx: Tx, text: string): Promise<T[]> {
  return [...(await exec(tx, text))] as T[];
}

/** SQLSTATE of a failed query; drizzle wraps the driver error in `cause`. */
function sqlState(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err.cause?.code ?? err.code;
}

/** Runs `text` in a savepoint and returns its SQLSTATE, so the outer transaction survives the failure. */
async function failureCode(tx: Tx, text: string): Promise<string | undefined> {
  try {
    await tx.transaction(async (sp) => {
      await exec(sp, text);
    });
  } catch (e) {
    return sqlState(e);
  }
  return undefined;
}

/** Back to the state before 0014: new columns, constraints, index and tables removed. */
async function resetToPre0014(tx: Tx): Promise<void> {
  await exec(tx, 'DROP TABLE IF EXISTS "user_invitation"');
  await exec(tx, 'DROP TABLE IF EXISTS "profile"');
  await exec(tx, 'DROP INDEX IF EXISTS "user_approval_status_idx"');
  await exec(tx, 'ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_approval_status_check"');
  await exec(
    tx,
    'ALTER TABLE "user" DROP CONSTRAINT IF EXISTS "user_approval_decided_by_user_id_fk"',
  );
  for (const col of [
    'approval_status',
    'approval_decided_by',
    'approval_decided_at',
    'approval_reason',
  ]) {
    await exec(tx, `ALTER TABLE "user" DROP COLUMN IF EXISTS "${col}"`);
  }
}

const LEGACY = {
  roleUser: `legacy-role-user-${crypto.randomUUID()}`,
  roleNull: `legacy-role-null-${crypto.randomUUID()}`,
  admin: `legacy-admin-${crypto.randomUUID()}`,
  anon: `legacy-anon-${crypto.randomUUID()}`,
};

/** Inserts users as the pre-0014 schema knew them (raw SQL: the new columns do not exist yet). */
async function seedLegacyUsers(tx: Tx): Promise<void> {
  const insert = (id: string, role: string | null, anon: boolean) =>
    exec(
      tx,
      `INSERT INTO "user" ("id","name","email","email_verified","created_at","updated_at","role","is_anonymous")
       VALUES ('${id}','Legacy','${id}@example.test',true,now(),now(),${role ? `'${role}'` : 'NULL'},${anon})`,
    );
  await insert(LEGACY.roleUser, 'user', false);
  await insert(LEGACY.roleNull, null, false);
  await insert(LEGACY.admin, 'admin', false);
  await insert(LEGACY.anon, null, true);
}

/** Runs `fn` in a transaction that is always rolled back, so the shared test DB never changes. */
async function inRolledBackTx(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Guarded statements raise "already exists, skipping" NOTICEs on a re-run; that is the expected outcome.
      await exec(tx, 'SET LOCAL client_min_messages = warning');
      await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

/** Applies every 0014 statement once. */
async function runMigration(tx: Tx): Promise<void> {
  for (const stmt of STATEMENTS) await exec(tx, stmt);
}

/** Pre-0014 state + legacy users + 0014 run `runs` times, then `check`; always rolled back. */
const withMigrated = (runs: number, check: (tx: Tx) => Promise<void>) =>
  inRolledBackTx(async (tx) => {
    await resetToPre0014(tx);
    await seedLegacyUsers(tx);
    for (let i = 0; i < runs; i++) await runMigration(tx);
    await check(tx);
  });

interface UserState {
  id: string;
  role: string | null;
  approval_status: string;
  approval_reason: string | null;
  decided: boolean;
}
const userStates = (tx: Tx) =>
  rows<UserState>(
    tx,
    `SELECT "id","role","approval_status","approval_reason","approval_decided_at" IS NOT NULL AS decided
     FROM "user" ORDER BY "id"`,
  );
const stateOf = (all: UserState[], id: string) => all.find((u) => u.id === id);

describe('migration 0014 account_lifecycle', () => {
  test('canary: the pre-0014 state really lacks the new columns and tables', async () => {
    await inRolledBackTx(async (tx) => {
      await resetToPre0014(tx);
      const cols = await rows<{ n: number }>(
        tx,
        `SELECT count(*)::int AS n FROM information_schema.columns
         WHERE table_name = 'user' AND column_name LIKE 'approval_%'`,
      );
      const tables = await rows<{ n: number }>(
        tx,
        `SELECT count(*)::int AS n FROM information_schema.tables
         WHERE table_name IN ('profile','user_invitation')`,
      );
      expect(cols[0].n).toBe(0);
      expect(tables[0].n).toBe(0);
    });
  });

  test('never adds approval_status with DEFAULT pending (the drizzle-kit trap) and flips the default last', () => {
    const addColumn = STATEMENTS.findIndex((s) =>
      /ADD COLUMN IF NOT EXISTS "approval_status"/.test(s),
    );
    const setPending = STATEMENTS.findIndex((s) => /SET DEFAULT 'pending'/.test(s));
    const rejectDemo = STATEMENTS.findIndex((s) => /SET "approval_status" = 'rejected'/.test(s));
    expect(STATEMENTS[addColumn]).toContain("DEFAULT 'approved'");
    expect(addColumn).toBeGreaterThanOrEqual(0);
    expect(rejectDemo).toBeGreaterThan(addColumn);
    expect(setPending).toBeGreaterThan(rejectDemo);
  });

  test('backfills legacy accounts: roles become member, ordinary users approved, demo users rejected', async () => {
    await withMigrated(1, async (tx) => {
      const all = await userStates(tx);
      expect(stateOf(all, LEGACY.roleUser)).toMatchObject({
        role: 'member',
        approval_status: 'approved',
        decided: false,
      });
      expect(stateOf(all, LEGACY.roleNull)).toMatchObject({
        role: 'member',
        approval_status: 'approved',
      });
      // Roles that are already current are left alone.
      expect(stateOf(all, LEGACY.admin)).toMatchObject({
        role: 'admin',
        approval_status: 'approved',
      });
      expect(stateOf(all, LEGACY.anon)).toMatchObject({
        approval_status: 'rejected',
        approval_reason: 'Demo dimatikan',
        decided: true,
      });
      expect(all.some((u) => u.role === 'user' || u.role === null)).toBe(false);
    });
  });

  test('creates one profile per non-anonymous user and none for anonymous ones', async () => {
    await withMigrated(1, async (tx) => {
      const [{ profiles }] = await rows<{ profiles: number }>(
        tx,
        'SELECT count(*)::int AS profiles FROM "profile"',
      );
      const [{ people }] = await rows<{ people: number }>(
        tx,
        'SELECT count(*)::int AS people FROM "user" WHERE "is_anonymous" IS NOT TRUE',
      );
      expect(profiles).toBe(people);
      const anon = await rows(tx, `SELECT 1 FROM "profile" WHERE "user_id" = '${LEGACY.anon}'`);
      expect(anon).toHaveLength(0);
      const [{ text_size }] = await rows<{ text_size: string }>(
        tx,
        `SELECT "text_size" FROM "profile" WHERE "user_id" = '${LEGACY.roleUser}'`,
      );
      expect(text_size).toBe('normal');
    });
  });

  test('running the statements twice changes nothing (idempotent), including accounts created in between', async () => {
    await withMigrated(1, async (tx) => {
      // A sign-up after the first run: pending by default, must stay pending after a re-run.
      // It carries a role: a NULL role is (harmlessly) normalized to 'member' by the first statement.
      await exec(
        tx,
        `INSERT INTO "user" ("id","name","email","email_verified","created_at","updated_at","role")
         VALUES ('late-signup','Late','late-signup@example.test',true,now(),now(),'member')`,
      );
      const usersBefore = await userStates(tx);
      const profilesBefore = await rows<{ user_id: string }>(
        tx,
        'SELECT * FROM "profile" ORDER BY "user_id"',
      );
      expect(usersBefore.length).toBeGreaterThan(0);

      await runMigration(tx);

      expect(await userStates(tx)).toEqual(usersBefore);
      // Existing profiles are untouched (same ids); the re-run only backfills the account that had none.
      const profilesAfter = await rows<{ user_id: string }>(
        tx,
        'SELECT * FROM "profile" ORDER BY "user_id"',
      );
      expect(
        profilesAfter.filter((p) => profilesBefore.some((b) => b.user_id === p.user_id)),
      ).toEqual(profilesBefore);
      expect(new Set(profilesAfter.map((p) => p.user_id)).size).toBe(profilesAfter.length);
      expect(stateOf(usersBefore, 'late-signup')?.approval_status).toBe('pending');
    });
  });

  test('a new row without a status is pending; CHECK rejects unknown statuses', async () => {
    await withMigrated(2, async (tx) => {
      await exec(
        tx,
        `INSERT INTO "user" ("id","name","email","email_verified","created_at","updated_at")
         VALUES ('fresh-signup','Fresh','fresh-signup@example.test',false,now(),now())`,
      );
      expect(stateOf(await userStates(tx), 'fresh-signup')?.approval_status).toBe('pending');
      expect(
        await failureCode(
          tx,
          `UPDATE "user" SET "approval_status" = 'x' WHERE "id" = 'fresh-signup'`,
        ),
      ).toBe(PG_CHECK_VIOLATION);
    });
  });

  test('deleting the deciding admin keeps the decided account (self FK is SET NULL)', async () => {
    await withMigrated(1, async (tx) => {
      const decider = testUser();
      const decided = testUser({ approvalDecidedBy: decider.id, approvalStatus: 'approved' });
      await tx.insert(schema.user).values([decider, decided]);
      await exec(tx, `DELETE FROM "user" WHERE "id" = '${decider.id}'`);
      const [row] = await rows<{ approval_decided_by: string | null }>(
        tx,
        `SELECT "approval_decided_by" FROM "user" WHERE "id" = '${decided.id}'`,
      );
      expect(row.approval_decided_by).toBeNull();
    });
  });

  test('profile is removed with its user and rejects unknown text sizes', async () => {
    await withMigrated(1, async (tx) => {
      expect(
        await failureCode(
          tx,
          `UPDATE "profile" SET "text_size" = 'x' WHERE "user_id" = '${LEGACY.roleUser}'`,
        ),
      ).toBe(PG_CHECK_VIOLATION);
      await exec(tx, `DELETE FROM "user" WHERE "id" = '${LEGACY.roleUser}'`);
      expect(
        await rows(tx, `SELECT 1 FROM "profile" WHERE "user_id" = '${LEGACY.roleUser}'`),
      ).toHaveLength(0);
    });
  });

  describe('user_invitation', () => {
    const invite = (email: string, role = 'member') =>
      `INSERT INTO "user_invitation" ("id","email","role","expires_at")
       VALUES ('${crypto.randomUUID()}','${email}','${role}',${FAR_FUTURE})`;

    test('the partial unique index rejects a second active invitation but allows one after revoke or accept', async () => {
      await withMigrated(1, async (tx) => {
        await exec(tx, invite('dup@example.test'));
        expect(await failureCode(tx, invite('dup@example.test'))).toBe(PG_UNIQUE_VIOLATION);
        expect(await failureCode(tx, invite('other@example.test'))).toBeUndefined();

        await exec(
          tx,
          `UPDATE "user_invitation" SET "revoked_at" = now() WHERE "email" = 'dup@example.test'`,
        );
        expect(await failureCode(tx, invite('dup@example.test'))).toBeUndefined();

        await exec(
          tx,
          `UPDATE "user_invitation" SET "accepted_at" = now() WHERE "email" = 'other@example.test'`,
        );
        expect(await failureCode(tx, invite('other@example.test'))).toBeUndefined();
      });
    });

    test('CHECK constraints reject unnormalized emails and roles outside member/project_manager/admin', async () => {
      await withMigrated(1, async (tx) => {
        expect(await failureCode(tx, invite(' Mixed@Example.test '))).toBe(PG_CHECK_VIOLATION);
        expect(await failureCode(tx, invite('role@example.test', 'super-admin'))).toBe(
          PG_CHECK_VIOLATION,
        );
        expect(await failureCode(tx, invite('ok@example.test', 'project_manager'))).toBeUndefined();
      });
    });
  });
});

describe('testUser helper', () => {
  test('returns approved rows with unique ids and emails, and honours overrides', () => {
    const a = testUser();
    const b = testUser({ role: 'admin', name: 'Override' }); // test-only
    expect(a.approvalStatus).toBe('approved');
    expect(a.id).not.toBe(b.id);
    expect(a.email).not.toBe(b.email);
    expect(b).toMatchObject({ role: 'admin', name: 'Override', approvalStatus: 'approved' });
    expect(testUser({ approvalStatus: 'pending' }).approvalStatus).toBe('pending');
  });
});
