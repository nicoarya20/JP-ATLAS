import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { db, schema } from '../../server/db';
import { EVENT_REMINDER_OFFSETS_MIN } from '../../server/pm/enums';
import { testUser } from '../support/accounts';

// Proves migration 0018 (S7 E-01): the four Event tables, their CHECKs and indexes, the FK behaviour the
// product relies on (a deleted project leaves its events behind, a deleted account stops being invited),
// the `reminders_minutes` DEFAULT and the reminder claim that makes a repeated tick harmless. Every test
// runs in a transaction that is rolled back, so the shared test DB is unchanged.
const TAG = '0018_event_core';
const MIGRATIONS_DIR = path.join(import.meta.dir, '../../server/db/migrations');

const STATEMENTS = readFileSync(path.join(MIGRATIONS_DIR, `${TAG}.sql`), 'utf8')
  .split('--> statement-breakpoint')
  .filter((chunk) => chunk.replace(/^\s*--.*$/gm, '').trim().length > 0);

const TABLES = ['event', 'event_participant', 'event_note', 'event_reminder'];
const UNIQUE_INDEX = 'event_note_event_id_uidx';
// The non-unique indexes and the predicate each one narrows to (undefined = full table).
const READ_PATHS: Record<string, { columns: string[]; where?: string }> = {
  event_starts_at_idx: {
    columns: ['starts_at'],
    where: 'deleted_at IS NULL AND canceled_at IS NULL',
  },
  event_project_id_starts_at_idx: {
    columns: ['project_id', 'starts_at'],
    where: 'deleted_at IS NULL',
  },
  event_created_by_idx: { columns: ['created_by'] },
  event_deleted_at_idx: { columns: ['deleted_at'], where: 'deleted_at IS NOT NULL' },
  event_deleted_with_project_id_idx: {
    columns: ['deleted_with_project_id'],
    where: 'deleted_with_project_id IS NOT NULL',
  },
  event_participant_user_id_event_id_idx: { columns: ['user_id', 'event_id'] },
};
const CHECKS = [
  'event_kind_check',
  'event_location_type_check',
  'event_ends_after_starts_check',
  'event_note_status_check',
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

const STARTS_AT = new Date('2026-11-02T02:00:00.000Z'); // test-only
const ENDS_AT = new Date('2026-11-02T03:00:00.000Z'); // test-only

/** Seeds an organiser, a guest, a project and one live event in that project with both as participants. */
async function seedEvent(tx: Tx) {
  const organiser = testUser();
  const guest = testUser();
  await tx.insert(schema.user).values([organiser, guest]);
  const [project] = await tx
    .insert(schema.project)
    .values({ name: 'Proyek uji', createdBy: organiser.id }) // test-only
    .returning();
  const [event] = await tx
    .insert(schema.event)
    .values({
      projectId: project.id,
      title: 'Rapat mingguan', // test-only
      kind: 'meeting',
      startsAt: STARTS_AT,
      endsAt: ENDS_AT,
      createdBy: organiser.id,
    })
    .returning();
  await tx.insert(schema.eventParticipant).values([
    { eventId: event.id, userId: organiser.id, addedBy: organiser.id },
    { eventId: event.id, userId: guest.id, addedBy: organiser.id },
  ]);
  return { organiser, guest, project, event };
}

const count = async (tx: Tx, table: string, where: string) =>
  Number(
    (await rows<{ n: string }>(tx, `SELECT count(*) AS n FROM "${table}" WHERE ${where}`))[0].n,
  );

describe('migration 0018 event_core', () => {
  test('creates the four tables, the note unique key, the read-path indexes and the CHECK constraints', async () => {
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
          const predicate = definition.slice(definition.indexOf(' WHERE ') + 7);
          expect(normalizePredicate(predicate)).toBe(normalizePredicate(expected.where));
        }
      }
    });
  });

  test('re-running every statement on a migrated DB raises no error and changes nothing', async () => {
    await inRolledBackTx(async (tx) => {
      const before = await count(tx, 'event', 'true');
      // Twice on purpose: the first pass proves the guards, the second that they stay guarded.
      for (const statement of STATEMENTS) await exec(tx, statement);
      for (const statement of STATEMENTS) await exec(tx, statement);
      const indexes = await rows<{ name: string }>(
        tx,
        `SELECT indexname AS name FROM pg_indexes
         WHERE schemaname = 'public' AND tablename IN (${inList(TABLES)})`,
      );
      expect(indexes.map((r) => r.name)).toContain(UNIQUE_INDEX);
      expect(await count(tx, 'event', 'true')).toBe(before);
    });
  });
});

describe('event constraints', () => {
  test('an event that ends before or exactly when it starts is rejected', async () => {
    await inRolledBackTx(async (tx) => {
      const { project, organiser } = await seedEvent(tx);
      const insert = (endsAt: string) =>
        `INSERT INTO "event" ("id","project_id","title","starts_at","ends_at","created_by")
         VALUES ('${crypto.randomUUID()}','${project.id}','Rapat salah tulis',
                 '${STARTS_AT.toISOString()}'::timestamptz,'${endsAt}'::timestamptz,'${organiser.id}')`; // test-only
      for (const endsAt of [
        new Date(STARTS_AT.getTime() - 60_000).toISOString(),
        STARTS_AT.toISOString(),
      ]) {
        expect(await violation(tx, insert(endsAt))).toEqual({
          code: PG_CHECK_VIOLATION,
          constraint: 'event_ends_after_starts_check',
        });
      }
    });
  });

  test('an unknown kind is rejected, and so is an unknown location type and note status', async () => {
    await inRolledBackTx(async (tx) => {
      const { project, organiser, event } = await seedEvent(tx);
      const base = `'${crypto.randomUUID()}','${project.id}','Rapat uji',
        '${STARTS_AT.toISOString()}'::timestamptz,'${ENDS_AT.toISOString()}'::timestamptz,'${organiser.id}'`; // test-only
      expect(
        await violation(
          tx,
          `INSERT INTO "event" ("id","project_id","title","starts_at","ends_at","created_by","kind")
           VALUES (${base},'standup')`, // test-only
        ),
      ).toEqual({ code: PG_CHECK_VIOLATION, constraint: 'event_kind_check' });
      expect(
        await violation(
          tx,
          `INSERT INTO "event" ("id","project_id","title","starts_at","ends_at","created_by","location_type")
           VALUES (${base},'hybrid')`, // test-only
        ),
      ).toEqual({ code: PG_CHECK_VIOLATION, constraint: 'event_location_type_check' });
      expect(
        await violation(
          tx,
          `INSERT INTO "event_note" ("id","event_id","status")
           VALUES ('${crypto.randomUUID()}','${event.id}','published')`, // test-only
        ),
      ).toEqual({ code: PG_CHECK_VIOLATION, constraint: 'event_note_status_check' });
    });
  });

  test('reminders_minutes falls back to the DB default when the insert omits it', async () => {
    await inRolledBackTx(async (tx) => {
      const { project, organiser } = await seedEvent(tx);
      // Raw SQL without the column: the default must come from the migration, not from Drizzle.
      const [row] = await rows<{ reminders_minutes: number[] }>(
        tx,
        `INSERT INTO "event" ("id","project_id","title","starts_at","ends_at","created_by")
         VALUES ('${crypto.randomUUID()}','${project.id}','Rapat tanpa pengingat kustom',
                 '${STARTS_AT.toISOString()}'::timestamptz,'${ENDS_AT.toISOString()}'::timestamptz,'${organiser.id}')
         RETURNING "reminders_minutes"`, // test-only
      );
      expect(row.reminders_minutes).toEqual([...EVENT_REMINDER_OFFSETS_MIN]);
    });
  });

  test('an event holds exactly one note document', async () => {
    await inRolledBackTx(async (tx) => {
      const { event, organiser } = await seedEvent(tx);
      await tx
        .insert(schema.eventNote)
        .values({ eventId: event.id, body: 'Keputusan rapat', writtenBy: organiser.id }); // test-only
      expect(
        await violation(
          tx,
          `INSERT INTO "event_note" ("id","event_id","body")
           VALUES ('${crypto.randomUUID()}','${event.id}','Notulensi kedua')`, // test-only
        ),
      ).toEqual({ code: PG_UNIQUE_VIOLATION, constraint: UNIQUE_INDEX });
    });
  });

  test('a reminder slot can be claimed only once, so a repeated tick notifies nobody twice', async () => {
    await inRolledBackTx(async (tx) => {
      const { event } = await seedEvent(tx);
      const claim = `INSERT INTO "event_reminder" ("event_id","offset_minutes") VALUES ('${event.id}',1440)
         ON CONFLICT DO NOTHING RETURNING "event_id"`;
      expect(await rows(tx, claim)).toHaveLength(1); // the winner may notify
      expect(await rows(tx, claim)).toHaveLength(0); // every later tick returns nothing
      expect(await count(tx, 'event_reminder', `event_id = '${event.id}'`)).toBe(1);
    });
  });
});

describe('event foreign keys', () => {
  test('deleting a project keeps its events and only nulls project_id', async () => {
    await inRolledBackTx(async (tx) => {
      const { project, event } = await seedEvent(tx);
      await exec(tx, `DELETE FROM "project" WHERE id = '${project.id}'`);
      const [row] = await rows<{ id: string; project_id: string | null }>(
        tx,
        `SELECT "id","project_id" FROM "event" WHERE id = '${event.id}'`,
      );
      expect(row).toBeDefined();
      expect(row.project_id).toBeNull();
    });
  });

  test('deleting a user removes that user from the guest list but keeps the event', async () => {
    await inRolledBackTx(async (tx) => {
      const { guest, organiser, event } = await seedEvent(tx);
      expect(await count(tx, 'event_participant', `event_id = '${event.id}'`)).toBe(2);
      await exec(tx, `DELETE FROM "user" WHERE id = '${guest.id}'`);
      expect(await count(tx, 'event_participant', `event_id = '${event.id}'`)).toBe(1);
      expect(await count(tx, 'event_participant', `user_id = '${organiser.id}'`)).toBe(1);
      expect(await count(tx, 'event', `id = '${event.id}'`)).toBe(1);
    });
  });

  test('deleting the creator keeps the event and only nulls created_by', async () => {
    await inRolledBackTx(async (tx) => {
      const { organiser, event } = await seedEvent(tx);
      await exec(tx, `DELETE FROM "user" WHERE id = '${organiser.id}'`);
      const [row] = await rows<{ created_by: string | null }>(
        tx,
        `SELECT "created_by" FROM "event" WHERE id = '${event.id}'`,
      );
      expect(row).toBeDefined();
      expect(row.created_by).toBeNull();
    });
  });

  test('deleting an event takes its participants, note and reminder claims with it', async () => {
    await inRolledBackTx(async (tx) => {
      const { event, organiser } = await seedEvent(tx);
      await tx.insert(schema.eventNote).values({ eventId: event.id, writtenBy: organiser.id });
      await tx.insert(schema.eventReminder).values({ eventId: event.id, offsetMinutes: 30 });
      await exec(tx, `DELETE FROM "event" WHERE id = '${event.id}'`);
      for (const table of ['event_participant', 'event_note', 'event_reminder']) {
        expect(await count(tx, table, `event_id = '${event.id}'`)).toBe(0);
      }
    });
  });
});
