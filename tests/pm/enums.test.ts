import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getTableName } from 'drizzle-orm';
import { getTableConfig, PgDialect, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, oneOf, pk, softDelete, updatedAt } from '../../server/db/schema.columns';
import * as enums from '../../server/pm/enums';
import { isLive } from '../../server/pm/soft-delete';

// test-only: expected values copied from R02 §3.2 (the contract these tuples freeze), plus the
// Event tuples added by S7 E-01 (P6 §5). EVENT_REMINDER_OFFSETS_MIN holds numbers, not enum values:
// it is the DEFAULT of event.reminders_minutes, so the map is widened rather than split in two.
const EXPECTED: Record<string, readonly (string | number)[]> = {
  PROJECT_STATUSES: ['draft', 'active', 'on_hold', 'completed', 'canceled'],
  PROJECT_PRIORITIES: ['low', 'medium', 'high', 'critical'],
  PROJECT_MEMBER_ROLES: ['manager', 'member', 'viewer'],
  PROJECT_CONDITIONS: ['on_track', 'at_risk', 'off_track'],
  TASK_BASE_KINDS: ['task', 'issue', 'idea'],
  TASK_STATUSES: ['todo', 'in_progress', 'in_review', 'done', 'canceled'],
  TASK_CANCEL_CATEGORIES: [
    'duplicate',
    'not_needed',
    'out_of_scope',
    'created_by_mistake',
    'other',
  ],
  TEXT_SIZES: ['normal', 'besar', 'sangat_besar'],
  APPROVAL_STATUSES: ['pending', 'approved', 'rejected'],
  EVENT_KINDS: ['meeting', 'review', 'important', 'team', 'other'],
  EVENT_LOCATION_TYPES: ['offline', 'online'],
  EVENT_NOTE_STATUSES: ['draft', 'confirmed'],
  EVENT_REMINDER_OFFSETS_MIN: [1440, 30],
};

describe('shared enum tuples', () => {
  it('exports exactly the S0-S2 and S7 Event tuples (no other stage tuples)', () => {
    expect(Object.keys(enums).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  for (const [name, expected] of Object.entries(EXPECTED)) {
    it(`${name} is non-empty, unique and matches R02`, () => {
      const actual = (enums as unknown as Record<string, readonly (string | number)[]>)[name];
      expect(actual.length).toBeGreaterThan(0);
      expect(new Set(actual).size).toBe(actual.length);
      expect([...actual]).toEqual([...expected]);
    });
  }

  it('TEXT_SIZES has exactly the three M12 values', () => {
    expect([...enums.TEXT_SIZES]).toEqual(['normal', 'besar', 'sangat_besar']);
  });

  it('enums.ts stays pure: no imports, Bun or process (it ships to the browser)', () => {
    const src = readFileSync(path.join(import.meta.dir, '../../server/pm/enums.ts'), 'utf8');
    expect(src).not.toMatch(/^\s*import\s/m);
    expect(src).not.toMatch(/\bBun\.|\bprocess\./);
  });
});

describe('oneOf', () => {
  const dialect = new PgDialect();
  const demo = pgTable('demo', { id: pk(), status: text('status').notNull() }, (t) => [
    oneOf(t.status, enums.PROJECT_STATUSES),
  ]);

  it('builds a named CHECK listing every tuple value, with no bind parameters', () => {
    const [chk] = getTableConfig(demo).checks;
    expect(chk.name).toBe('demo_status_check');
    const { sql: text_, params } = dialect.sqlToQuery(chk.value);
    expect(text_).toBe(
      `"demo"."status" in ('draft', 'active', 'on_hold', 'completed', 'canceled')`,
    );
    expect(params).toEqual([]);
  });

  it('escapes single quotes in values', () => {
    const t = pgTable('quoted', { v: text('v') }, (c) => [oneOf(c.v, ["it's"])]);
    const { sql: out } = dialect.sqlToQuery(getTableConfig(t).checks[0].value);
    expect(out).toContain(`('it''s')`);
  });
});

describe('column helpers', () => {
  const t = pgTable('colhelp', {
    id: pk(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ...softDelete(),
  });
  const cols = Object.fromEntries(getTableConfig(t).columns.map((c) => [c.name, c]));

  it('pk is a text primary key that generates a UUID', () => {
    expect(cols.id.primary).toBe(true);
    expect(cols.id.getSQLType()).toBe('text');
    expect(cols.id.defaultFn?.()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('timestamps are timestamptz NOT NULL with a now() default; updated_at refreshes on update', () => {
    for (const name of ['created_at', 'updated_at']) {
      expect(cols[name].getSQLType()).toBe('timestamp with time zone');
      expect(cols[name].notNull).toBe(true);
      expect(cols[name].hasDefault).toBe(true);
    }
    expect(cols.updated_at.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(cols.created_at.onUpdateFn).toBeUndefined();
  });

  it('softDelete adds nullable deleted_at (timestamptz) and deleted_by (FK set null)', () => {
    expect(cols.deleted_at.notNull).toBe(false);
    expect(cols.deleted_at.getSQLType()).toBe('timestamp with time zone');
    expect(cols.deleted_by.notNull).toBe(false);
    const fk = getTableConfig(t).foreignKeys.find(
      (f) => f.reference().columns[0].name === 'deleted_by',
    );
    expect(fk?.onDelete).toBe('set null');
  });
});

describe('isLive', () => {
  it('renders deleted_at IS NULL, the predicate partial indexes must share', () => {
    const t = pgTable('livetbl', { id: pk(), ...softDelete() });
    expect(getTableName(t)).toBe('livetbl');
    const { sql: out, params } = new PgDialect().sqlToQuery(isLive(t));
    expect(out).toBe('"livetbl"."deleted_at" is null');
    expect(params).toEqual([]);
  });
});
