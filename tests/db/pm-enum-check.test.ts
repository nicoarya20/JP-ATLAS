import { afterAll, describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { db } from '../../server/db';
import * as enums from '../../server/pm/enums';

// Every enum tuple of server/pm/enums.ts is the single source of a DB CHECK (`<table>_<column>_check`). For each
// column it backs this proves, against the migrated test DB: (1) the CHECK lists exactly the tuple's values,
// (2) each value can be INSERTed, (3) a wild value is rejected with that very constraint. Every statement runs in
// a transaction that is rolled back; ids carry TAG so any leak is identifiable and asserted to be absent.
const TAG = 'pm_enum_check';
const PG_CHECK_VIOLATION = '23514';
// Name -> values of every tuple enums.ts exports (the type-only exports are not arrays, so they drop out).
const ALL_TUPLES = Object.fromEntries(
  Object.entries(enums).filter(([, value]) => Array.isArray(value)),
) as Record<string, readonly string[]>;
const WILD_VALUE = 'wild_value'; // test-only

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
class Rollback extends Error {}
const newId = () => `${TAG}-${crypto.randomUUID()}`;
const lit = (value: string) => `'${value.replaceAll("'", "''")}'`;

/** Statements that insert one row carrying `value` in the column under test (`setup` creates its parents). */
type Plan = { setup: string[]; statement: string };
type Target = {
  tuple: string;
  table: string;
  column: string;
  plan: (value: string, parents: Parents) => Plan;
};
type Parents = { userId: string; projectId: string; kindId: string };

const userInsert = (id: string, extra = '') =>
  `INSERT INTO "user" ("id","name","email","email_verified","created_at","updated_at"${extra ? ',"approval_status"' : ''})
   VALUES (${lit(id)},'Test User',${lit(`${id}@example.test`)},true,now(),now()${extra ? `,${lit(extra)}` : ''})`; // test-only
const taskInsert = (p: Parents, set: Record<string, string>) => {
  const cols = {
    id: newId(),
    project_id: p.projectId,
    kind_id: p.kindId,
    title: 'Tugas uji',
    ...set,
  }; // test-only
  const names = Object.keys(cols)
    .map((c) => `"${c}"`)
    .join(',');
  return `INSERT INTO "task" (${names}) VALUES (${Object.values(cols).map(lit).join(',')})`;
};
const eventInsert = (p: Parents, set: Record<string, string>) => {
  const cols = {
    id: newId(),
    project_id: p.projectId,
    title: 'Rapat uji',
    starts_at: '2026-11-02T02:00:00.000Z',
    ends_at: '2026-11-02T03:00:00.000Z',
    ...set,
  }; // test-only
  const names = Object.keys(cols)
    .map((c) => `"${c}"`)
    .join(',');
  return `INSERT INTO "event" (${names}) VALUES (${Object.values(cols).map(lit).join(',')})`;
};
const projectInsert = (set: Record<string, string>) => {
  const cols = { id: newId(), name: 'Proyek uji', ...set }; // test-only
  const names = Object.keys(cols)
    .map((c) => `"${c}"`)
    .join(',');
  return `INSERT INTO "project" (${names}) VALUES (${Object.values(cols).map(lit).join(',')})`;
};

const TARGETS: Target[] = [
  {
    tuple: 'PROJECT_STATUSES',
    table: 'project',
    column: 'status',
    plan: (v) => ({ setup: [], statement: projectInsert({ status: v }) }),
  },
  {
    tuple: 'PROJECT_PRIORITIES',
    table: 'project',
    column: 'priority',
    plan: (v) => ({ setup: [], statement: projectInsert({ priority: v }) }),
  },
  {
    tuple: 'PROJECT_MEMBER_ROLES',
    table: 'project_member',
    column: 'role',
    plan: (v, p) => {
      const memberId = newId(); // composite PK (project_id, user_id): one fresh user per value
      return {
        setup: [userInsert(memberId)],
        statement: `INSERT INTO "project_member" ("project_id","user_id","role") VALUES (${lit(p.projectId)},${lit(memberId)},${lit(v)})`,
      };
    },
  },
  {
    tuple: 'TASK_BASE_KINDS',
    table: 'task_kind',
    column: 'base_kind',
    plan: (v, p) => ({
      setup: [],
      statement: `INSERT INTO "task_kind" ("id","project_id","name","base_kind","position")
        VALUES (${lit(newId())},${lit(p.projectId)},${lit(`Jenis ${newId()}`)},${lit(v)},1)`,
    }),
  },
  {
    tuple: 'TASK_STATUSES',
    table: 'task',
    column: 'status',
    // task_canceled_needs_category_check: a canceled task must name a category, which is not what is under test.
    plan: (v, p) => ({
      setup: [],
      statement: taskInsert(p, {
        status: v,
        ...(v === 'canceled' ? { cancel_category: 'duplicate' } : {}),
      }),
    }),
  },
  {
    tuple: 'PROJECT_PRIORITIES',
    table: 'task',
    column: 'priority',
    plan: (v, p) => ({ setup: [], statement: taskInsert(p, { priority: v }) }),
  },
  {
    tuple: 'TASK_CANCEL_CATEGORIES',
    table: 'task',
    column: 'cancel_category',
    // task_other_needs_note_check: category 'other' needs a note; giving one to every value keeps the builder uniform.
    plan: (v, p) => ({
      setup: [],
      statement: taskInsert(p, { cancel_category: v, cancel_note: 'alasan' }),
    }), // test-only
  },
  {
    tuple: 'TEXT_SIZES',
    table: 'profile',
    column: 'text_size',
    plan: (v) => {
      const ownerId = newId();
      return {
        setup: [userInsert(ownerId)],
        statement: `INSERT INTO "profile" ("id","user_id","text_size") VALUES (${lit(newId())},${lit(ownerId)},${lit(v)})`,
      };
    },
  },
  {
    tuple: 'APPROVAL_STATUSES',
    table: 'user',
    column: 'approval_status',
    plan: (v) => ({ setup: [], statement: userInsert(newId(), v) }),
  },
  {
    tuple: 'EVENT_KINDS',
    table: 'event',
    column: 'kind',
    plan: (v, p) => ({ setup: [], statement: eventInsert(p, { kind: v }) }),
  },
  {
    tuple: 'EVENT_LOCATION_TYPES',
    table: 'event',
    column: 'location_type',
    plan: (v, p) => ({ setup: [], statement: eventInsert(p, { location_type: v }) }),
  },
  {
    tuple: 'EVENT_NOTE_STATUSES',
    table: 'event_note',
    column: 'status',
    plan: (v, p) => {
      const eventId = newId(); // event_note_event_id_uidx: one note per event, so one fresh event per value
      return {
        setup: [eventInsert(p, { id: eventId })],
        statement: `INSERT INTO "event_note" ("id","event_id","status") VALUES (${lit(newId())},${lit(eventId)},${lit(v)})`,
      };
    },
  },
  {
    tuple: 'PHASE_STATUSES',
    table: 'project_phase',
    column: 'status',
    plan: (v, p) => ({
      setup: [],
      statement: `INSERT INTO "project_phase" ("id","project_id","name","position","status")
        VALUES (${lit(newId())},${lit(p.projectId)},'Tahap',0,${lit(v)})`, // test-only
    }),
  },
  {
    tuple: 'EXTENSION_REASON_CATEGORIES',
    table: 'project_deadline_extension',
    column: 'reason_category',
    plan: (v, p) => ({
      setup: [],
      statement: `INSERT INTO "project_deadline_extension"
        ("id","project_id","old_due_date","new_due_date","reason_category","reason")
        VALUES (${lit(newId())},${lit(p.projectId)},'2026-12-01','2026-12-31',${lit(v)},'alasan')`, // test-only
    }),
  },
  {
    tuple: 'PROJECT_CONDITIONS',
    table: 'project_condition_override',
    column: 'condition',
    plan: (v, p) => ({
      setup: [],
      statement: `INSERT INTO "project_condition_override" ("id","project_id","condition","reason")
        VALUES (${lit(newId())},${lit(p.projectId)},${lit(v)},'alasan')`, // test-only
    }),
  },
  {
    tuple: 'PROJECT_TEMPLATE_SOURCES',
    table: 'project_template',
    column: 'source',
    // No project/user parent: a template never references project/task at all (plan §3).
    plan: (v) => ({
      setup: [],
      statement: `INSERT INTO "project_template" ("id","name","source")
        VALUES (${lit(newId())},'Template uji',${lit(v)})`, // test-only
    }),
  },
];

// Tuples with no column:
// EVENT_REMINDER_OFFSETS_MIN is not an enum at all — it is the DEFAULT of event.reminders_minutes (int[]),
// proven by tests/db/events-schema.test.ts, and a per-event list may legitimately hold other offsets.
// The coverage test below forces a new entry here or in TARGETS whenever enums.ts gains a tuple.
const TUPLES_WITHOUT_COLUMN = ['EVENT_REMINDER_OFFSETS_MIN'];

const tupleValues = (name: string) => [...ALL_TUPLES[name]];

/** Runs `fn` in a transaction that is always rolled back, with one project, kind and user ready as parents. */
async function inRolledBackTx(fn: (tx: Tx, parents: Parents) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const parents: Parents = { userId: newId(), projectId: newId(), kindId: newId() };
      await tx.execute(sql.raw(userInsert(parents.userId)));
      await tx.execute(sql.raw(projectInsert({ id: parents.projectId })));
      await tx.execute(
        sql.raw(`INSERT INTO "task_kind" ("id","project_id","name","base_kind","position")
          VALUES (${lit(parents.kindId)},${lit(parents.projectId)},'Tugas','task',0)`), // test-only
      );
      await fn(tx, parents);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

/** Runs one statement in a savepoint and returns the Postgres error code + constraint it raised. */
async function violation(tx: Tx, text: string) {
  try {
    await tx.transaction((sp) => sp.execute(sql.raw(text)));
  } catch (e) {
    const cause = ((e as { cause?: unknown }).cause ?? e) as {
      code?: string;
      constraint_name?: string;
    };
    return { code: cause.code, constraint: cause.constraint_name };
  }
  throw new Error(`statement was accepted but should have been rejected: ${text}`);
}

describe('enums.ts tuples <-> DB CHECK constraints', () => {
  afterAll(async () => {
    // Everything ran in rolled-back transactions; this proves no TAG row survived in any table the tests touch.
    const leaked = await db.execute<{ n: string }>(sql`
      SELECT (SELECT count(*) FROM "user" WHERE id LIKE ${`${TAG}-%`})
           + (SELECT count(*) FROM project WHERE id LIKE ${`${TAG}-%`})
           + (SELECT count(*) FROM profile WHERE id LIKE ${`${TAG}-%`}) AS n`);
    expect(Number([...leaked][0].n)).toBe(0);
  });

  it('every tuple exported by enums.ts is covered by a target or listed as having no column yet', () => {
    const exported = Object.keys(ALL_TUPLES);
    const covered = new Set([...TARGETS.map((t) => t.tuple), ...TUPLES_WITHOUT_COLUMN]);
    expect(exported.sort()).toEqual([...covered].sort());
  });

  it.each(TARGETS.map((t) => [`${t.table}.${t.column}`, t] as const))(
    '%s: the CHECK lists exactly the tuple values',
    async (_label, target) => {
      const name = `${target.table}_${target.column}_check`;
      const [row] = await db.execute<{ definition: string }>(sql`
        SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint
        WHERE contype = 'c' AND conname = ${name} AND conrelid = ${`public.${target.table}`}::regclass`);
      expect(row).toBeDefined();
      const listed = [...row.definition.matchAll(/'([^']*)'/g)].map((m) => m[1]);
      expect(listed.sort()).toEqual(tupleValues(target.tuple).sort());
    },
  );

  for (const target of TARGETS) {
    const label = `${target.table}.${target.column}`;

    it(`${label}: every valid value can be inserted`, async () => {
      await inRolledBackTx(async (tx, parents) => {
        for (const value of tupleValues(target.tuple)) {
          const { setup, statement } = target.plan(value, parents);
          for (const text of setup) await tx.execute(sql.raw(text));
          await tx.execute(sql.raw(statement));
        }
      });
    });

    it(`${label}: a wild value is rejected by ${target.table}_${target.column}_check`, async () => {
      await inRolledBackTx(async (tx, parents) => {
        const { setup, statement } = target.plan(WILD_VALUE, parents);
        for (const text of setup) await tx.execute(sql.raw(text));
        expect(await violation(tx, statement)).toEqual({
          code: PG_CHECK_VIOLATION,
          constraint: `${target.table}_${target.column}_check`,
        });
      });
    });
  }
});
