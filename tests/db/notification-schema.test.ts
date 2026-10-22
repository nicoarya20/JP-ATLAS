import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { db, schema } from '../../server/db';
import { testUser } from '../support/accounts';

// Proves migration 0017 (S3 I01): the two Inbox tables, their CHECKs, the unique event key and the four
// read paths (badge, news tab, bulk resolve, retention sweep) each have an index. Every test runs in a
// transaction that is rolled back, so the shared test DB is unchanged.
const TAG = '0017_notification_core';
const MIGRATIONS_DIR = path.join(import.meta.dir, '../../server/db/migrations');
const ROLLBACK = path.join(import.meta.dir, `../../server/db/rollback/${TAG}.down.sql`);

const STATEMENTS = readFileSync(path.join(MIGRATIONS_DIR, `${TAG}.sql`), 'utf8')
  .split('--> statement-breakpoint')
  .filter((chunk) => chunk.replace(/^\s*--.*$/gm, '').trim().length > 0);

const TABLES = ['notification', 'notification_pref'];
const UNIQUE_INDEX = 'notification_recipient_id_dedupe_key_uidx';
// The four non-unique indexes and the predicate each one narrows to (undefined = full table).
const READ_PATHS: Record<string, { columns: string[]; where?: string }> = {
  notification_recipient_id_action_idx: {
    columns: ['recipient_id', 'created_at'],
    where: "lane = 'action' AND resolved_at IS NULL",
  },
  notification_recipient_id_info_idx: {
    columns: ['recipient_id', 'updated_at'],
    where: "lane = 'info'",
  },
  notification_ref_idx: { columns: ['ref_type', 'ref_id'], where: 'resolved_at IS NULL' },
  notification_created_at_idx: { columns: ['created_at'] },
};
const CHECKS = [
  'notification_lane_check',
  'notification_ref_type_check',
  'notification_resolved_reason_check',
  'notification_pref_category_check',
];
/** Postgres re-renders an index predicate with casts, parens and its own quoting (same shape as pm-indexes). */
const normalizePredicate = (text: string) =>
  text.replaceAll('::text', '').replace(/["()]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

const PG_CHECK_VIOLATION = '23514';
const PG_UNIQUE_VIOLATION = '23505';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
class Rollback extends Error {}

const exec = (tx: Tx, text: string) => tx.execute(sql.raw(text));
const inList = (names: string[]) => names.map((n) => `'${n}'`).join(',');

/** Rows of a raw query, typed by the caller. */
async function rows<T>(tx: Tx, text: string): Promise<T[]> {
  return [...(await exec(tx, text))] as T[];
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

/** Runs one statement in a savepoint and returns the Postgres error code + constraint it raised. */
async function violation(tx: Tx, text: string) {
  try {
    await tx.transaction((sp) => exec(sp, text));
  } catch (e) {
    const cause = ((e as { cause?: unknown }).cause ?? e) as {
      code?: string;
      constraint_name?: string;
    };
    return { code: cause.code, constraint: cause.constraint_name };
  }
  throw new Error(`statement was accepted but should have been rejected: ${text}`);
}

const count = async (tx: Tx, table: string, where: string) =>
  Number(
    (await rows<{ n: string }>(tx, `SELECT count(*) AS n FROM "${table}" WHERE ${where}`))[0].n,
  );

/** Seeds an actor, a recipient, a project and one open `action` card plus one `info` card on that project. */
async function seedCards(tx: Tx) {
  const actor = testUser();
  const recipient = testUser();
  await tx.insert(schema.user).values([actor, recipient]);
  const [project] = await tx
    .insert(schema.project)
    .values({ name: 'Proyek uji', createdBy: actor.id }) // test-only
    .returning();
  const taskId = `task-${crypto.randomUUID()}`;
  const [card] = await tx
    .insert(schema.notification)
    .values({
      recipientId: recipient.id,
      actorId: actor.id,
      projectId: project.id,
      lane: 'action',
      kind: 'task_assigned',
      refType: 'task',
      refId: taskId,
      dedupeKey: `task_assigned:task:${taskId}:a1`,
      payload: { title: 'Tugas uji', number: 14 }, // test-only
    })
    .returning();
  const [news] = await tx
    .insert(schema.notification)
    .values({
      recipientId: recipient.id,
      projectId: project.id,
      lane: 'info',
      kind: 'task_commented',
      refType: 'task',
      refId: taskId,
      dedupeKey: `task_commented:task:${taskId}:488965`,
    })
    .returning();
  return { actor, recipient, project, taskId, card, news };
}

describe('migration 0017 notification_core', () => {
  test('creates both tables, the unique event key, the 4 read-path indexes and 4 CHECK constraints', async () => {
    await inRolledBackTx(async (tx) => {
      const tables = await rows<{ name: string }>(
        tx,
        `SELECT table_name AS name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name IN (${inList(TABLES)})`,
      );
      expect(tables.map((r) => r.name).sort()).toEqual([...TABLES].sort());

      const indexes = await rows<{ name: string }>(
        tx,
        `SELECT indexname AS name FROM pg_indexes
         WHERE schemaname = 'public' AND tablename IN (${inList(TABLES)})`,
      );
      const names = indexes.map((r) => r.name);
      expect(names).toContain(UNIQUE_INDEX);
      for (const name of Object.keys(READ_PATHS)) expect(names).toContain(name);

      const checks = await rows<{ name: string }>(
        tx,
        `SELECT conname AS name FROM pg_constraint WHERE contype = 'c' AND conname IN (${inList(CHECKS)})`,
      );
      expect(checks.map((r) => r.name).sort()).toEqual([...CHECKS].sort());
    });
  });

  test('each read-path index covers the documented columns and narrows to its own slice', async () => {
    await inRolledBackTx(async (tx) => {
      const defs = await rows<{ name: string; definition: string }>(
        tx,
        `SELECT indexname AS name, indexdef AS definition FROM pg_indexes
         WHERE schemaname = 'public' AND indexname IN (${inList(Object.keys(READ_PATHS))})`,
      );
      expect(defs).toHaveLength(Object.keys(READ_PATHS).length);
      for (const { name, definition } of defs) {
        const expected = READ_PATHS[name];
        const columns = definition.slice(definition.indexOf('(') + 1, definition.indexOf(')'));
        for (const column of expected.columns) expect(columns).toContain(column);
        if (expected.where === undefined) {
          expect(definition).not.toContain(' WHERE ');
        } else {
          // Postgres re-renders the predicate with its own casts and parens (same normalizer as pm-indexes).
          const predicate = definition.slice(definition.indexOf(' WHERE ') + 7);
          expect(normalizePredicate(predicate)).toBe(normalizePredicate(expected.where));
        }
      }
      // The badge index is the one the open-action count reads, so it must stay descending on created_at.
      expect(
        defs.find((d) => d.name === 'notification_recipient_id_action_idx')?.definition,
      ).toContain('created_at DESC');
    });
  });

  test('re-running every statement on a migrated DB raises no error and changes nothing', async () => {
    await inRolledBackTx(async (tx) => {
      for (const statement of STATEMENTS) await exec(tx, statement);
      for (const statement of STATEMENTS) await exec(tx, statement);
      const indexes = await rows<{ name: string }>(
        tx,
        `SELECT indexname AS name FROM pg_indexes
         WHERE schemaname = 'public' AND tablename IN (${inList(TABLES)})`,
      );
      expect(indexes.map((r) => r.name)).toContain(UNIQUE_INDEX);
    });
  });

  test('the same event cannot be stored twice for one recipient, but may be for another', async () => {
    await inRolledBackTx(async (tx) => {
      const { recipient, card } = await seedCards(tx);
      const insert = (recipientId: string) =>
        `INSERT INTO "notification" ("id","recipient_id","lane","kind","ref_type","ref_id","dedupe_key")
         VALUES ('n-${crypto.randomUUID()}','${recipientId}','action','task_assigned','task','${card.refId}','${card.dedupeKey}')`;

      expect(await violation(tx, insert(recipient.id))).toEqual({
        code: PG_UNIQUE_VIOLATION,
        constraint: UNIQUE_INDEX,
      });

      const other = testUser();
      await tx.insert(schema.user).values(other);
      await exec(tx, insert(other.id));
      expect(await count(tx, 'notification', `"dedupe_key" = '${card.dedupeKey}'`)).toBe(2);
    });
  });

  test('every enum CHECK rejects a wild value and accepts the matching valid one', async () => {
    await inRolledBackTx(async (tx) => {
      const { recipient, card } = await seedCards(tx);
      const update = (set: string) => `UPDATE "notification" SET ${set} WHERE "id" = '${card.id}'`;
      const prefInsert = (category: string) =>
        `INSERT INTO "notification_pref" ("user_id","category","in_app")
         VALUES ('${recipient.id}','${category}',false)`;

      const rejected: [string, string][] = [
        ['notification_lane_check', update(`"lane" = 'urgent'`)],
        ['notification_ref_type_check', update(`"ref_type" = 'invoice'`)],
        ['notification_resolved_reason_check', update(`"resolved_reason" = 'because'`)],
        ['notification_pref_category_check', prefInsert('whatsapp')],
      ];
      for (const [constraint, statement] of rejected) {
        expect(await violation(tx, statement)).toEqual({
          code: PG_CHECK_VIOLATION,
          constraint,
        });
      }

      // The same columns accept their valid values, so a rejection above is the CHECK and not a typo.
      await exec(
        tx,
        update(`"lane" = 'info', "ref_type" = 'comment', "resolved_reason" = 'acted'`),
      );
      await exec(tx, prefInsert('news'));
      await exec(tx, prefInsert('event_reminder'));
    });
  });

  test('a preference row exists once per (user, category) and the pair is its primary key', async () => {
    await inRolledBackTx(async (tx) => {
      const { recipient } = await seedCards(tx);
      await tx
        .insert(schema.notificationPref)
        .values({ userId: recipient.id, category: 'news', inApp: false });
      const dup = await violation(
        tx,
        `INSERT INTO "notification_pref" ("user_id","category") VALUES ('${recipient.id}','news')`,
      );
      expect(dup).toEqual({
        code: PG_UNIQUE_VIOLATION,
        constraint: 'notification_pref_user_id_category_pk',
      });
      // The other category is a different row, not a conflict.
      await tx
        .insert(schema.notificationPref)
        .values({ userId: recipient.id, category: 'event_reminder' });
      expect(await count(tx, 'notification_pref', `"user_id" = '${recipient.id}'`)).toBe(2);
    });
  });

  test('deleting the recipient deletes their cards and preferences', async () => {
    await inRolledBackTx(async (tx) => {
      const { recipient } = await seedCards(tx);
      await tx
        .insert(schema.notificationPref)
        .values({ userId: recipient.id, category: 'news', inApp: false });
      const byRecipient = `"recipient_id" = '${recipient.id}'`;
      expect(await count(tx, 'notification', byRecipient)).toBe(2);

      await exec(tx, `DELETE FROM "user" WHERE "id" = '${recipient.id}'`);

      expect(await count(tx, 'notification', byRecipient)).toBe(0);
      expect(await count(tx, 'notification_pref', `"user_id" = '${recipient.id}'`)).toBe(0);
    });
  });

  test('deleting the actor keeps the card and only nulls actor_id', async () => {
    await inRolledBackTx(async (tx) => {
      const { actor, card } = await seedCards(tx);

      await exec(tx, `DELETE FROM "user" WHERE "id" = '${actor.id}'`);

      const [row] = await rows<{ actor_id: string | null }>(
        tx,
        `SELECT "actor_id" FROM "notification" WHERE "id" = '${card.id}'`,
      );
      expect(row).toEqual({ actor_id: null });
    });
  });

  test('deleting a project deletes its cards and leaves account cards alone', async () => {
    await inRolledBackTx(async (tx) => {
      const { recipient, project } = await seedCards(tx);
      // An account card has no project, so it must survive the project delete.
      const [accountCard] = await tx
        .insert(schema.notification)
        .values({
          recipientId: recipient.id,
          lane: 'action',
          kind: 'user_pending',
          refType: 'user',
          refId: recipient.id,
          dedupeKey: `user_pending:user:${recipient.id}`,
        })
        .returning();

      await exec(tx, `DELETE FROM "project" WHERE "id" = '${project.id}'`);

      expect(await count(tx, 'notification', `"project_id" = '${project.id}'`)).toBe(0);
      expect(await count(tx, 'notification', `"id" = '${accountCard.id}'`)).toBe(1);
    });
  });

  test('the rollback script drops both tables, is re-runnable, and 0017 rebuilds them', async () => {
    await inRolledBackTx(async (tx) => {
      const down = readFileSync(ROLLBACK, 'utf8')
        .split('\n')
        .filter((line) => !line.startsWith('--'))
        .join('\n')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      const present = async () =>
        (
          await rows<{ name: string }>(
            tx,
            `SELECT table_name AS name FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name IN (${inList(TABLES)})`,
          )
        )
          .map((r) => r.name)
          .sort();

      for (const statement of down) await exec(tx, statement);
      for (const statement of down) await exec(tx, statement);
      expect(await present()).toEqual([]);
      // The account tables the cards point at belong to earlier migrations and must survive.
      expect(await count(tx, 'user', 'true')).toBeGreaterThanOrEqual(0);

      for (const statement of STATEMENTS) await exec(tx, statement);
      expect(await present()).toEqual([...TABLES].sort());
    });
  });

  test('column defaults match the contract: bundle_count 1, payload {}, timestamps timestamptz', async () => {
    await inRolledBackTx(async (tx) => {
      const { recipient } = await seedCards(tx);
      await exec(
        tx,
        `INSERT INTO "notification" ("id","recipient_id","lane","kind","ref_type","ref_id","dedupe_key")
         VALUES ('n-defaults','${recipient.id}','info','task_changed','task','t-1','probe:defaults')`,
      );
      const [row] = await rows<{
        bundle_count: number;
        payload: Record<string, unknown>;
        read_at: string | null;
        resolved_at: string | null;
        resolved_reason: string | null;
      }>(
        tx,
        `SELECT "bundle_count","payload","read_at","resolved_at","resolved_reason"
         FROM "notification" WHERE "id" = 'n-defaults'`,
      );
      expect(row).toEqual({
        bundle_count: 1,
        payload: {},
        read_at: null,
        resolved_at: null,
        resolved_reason: null,
      });

      const types = await rows<{ name: string; type: string }>(
        tx,
        `SELECT column_name AS name, data_type AS type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name IN (${inList(TABLES)})
           AND column_name IN ('created_at','updated_at','read_at','resolved_at')`,
      );
      // 4 on `notification` (created/updated/read/resolved) + `notification_pref.updated_at`.
      expect(types).toHaveLength(5);
      for (const column of types) expect(column.type).toBe('timestamp with time zone');
    });
  });
});
