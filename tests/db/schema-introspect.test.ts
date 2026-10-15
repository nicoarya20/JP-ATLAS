import { describe, expect, test } from 'bun:test';
import { sql } from 'drizzle-orm';
import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { introspectDrizzleSchema, introspectTables } from '../../server/db/schema-introspect';

describe('introspectDrizzleSchema', () => {
  const result = introspectDrizzleSchema();

  test('returns all expected tables', () => {
    const names = result.tables.map((t) => t.name);
    expect(names).toContain('user');
    expect(names).toContain('session');
    expect(names).toContain('account');
    expect(names).toContain('post');
    expect(names).toContain('verification');
    expect(names).toContain('profile');
    expect(names).toContain('user_invitation');
  });

  test('user table has expected columns', () => {
    const user = result.tables.find((t) => t.name === 'user');
    expect(user).toBeDefined();
    const colNames = user?.columns.map((c) => c.dbName);
    expect(colNames).toContain('id');
    expect(colNames).toContain('email');
    expect(colNames).toContain('role');
  });

  test('user.id is primary key', () => {
    const user = result.tables.find((t) => t.name === 'user');
    const idCol = user?.columns.find((c) => c.dbName === 'id');
    expect(idCol?.pk).toBe(true);
  });

  test('post table has author_id FK to user.id', () => {
    const postEdge = result.edges.find((e) => e.source === 'post' && e.target === 'user');
    expect(postEdge).toBeDefined();
    expect(postEdge?.sourceColumn).toBe('author_id');
    expect(postEdge?.targetColumn).toBe('id');
  });

  test('session table has FK to user', () => {
    const sessionEdge = result.edges.find((e) => e.source === 'session' && e.target === 'user');
    expect(sessionEdge).toBeDefined();
  });

  test('account table has FK to user', () => {
    const accountEdge = result.edges.find((e) => e.source === 'account' && e.target === 'user');
    expect(accountEdge).toBeDefined();
  });

  test('edge ids are unique (no duplicates)', () => {
    const ids = result.edges.map((e) => e.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  test('each table has at least one column', () => {
    for (const table of result.tables) {
      expect(table.columns.length).toBeGreaterThan(0);
    }
  });

  test('FK columns reference correct fkTable/fkColumn', () => {
    const post = result.tables.find((t) => t.name === 'post');
    const authorCol = post?.columns.find((c) => c.dbName === 'author_id');
    expect(authorCol?.fkTable).toBe('user');
    expect(authorCol?.fkColumn).toBe('id');
  });
});

describe('introspection enrichment', () => {
  const g = introspectDrizzleSchema();
  const user = g.tables.find((t) => t.id === 'user');
  const visit = g.tables.find((t) => t.id === 'visit_log');
  const post = g.tables.find((t) => t.id === 'post');

  test('exposes unique columns, defaults and their kind', () => {
    const email = user?.columns.find((c) => c.dbName === 'email');
    expect(email?.unique).toBe(true);
    const banned = user?.columns.find((c) => c.dbName === 'banned');
    expect(banned).toMatchObject({ defaultKind: 'literal', defaultText: 'false' });
    const createdAt = user?.columns.find((c) => c.dbName === 'created_at');
    expect(createdAt?.defaultKind).toBe('fn');
    const visitCreated = visit?.columns.find((c) => c.dbName === 'created_at');
    expect(visitCreated?.defaultKind).toBe('sql');
    expect(visitCreated?.defaultText).toContain('now()');
  });

  test('lists indexes with columns and uniqueness', () => {
    expect(visit?.indexes.map((i) => i.name)).toContain('visit_log_country_idx');
    expect(visit?.indexes.find((i) => i.name === 'visit_log_ip_idx')?.columns).toEqual(['ip']);
    expect(visit?.indexes.every((i) => i.unique === false)).toBe(true);
  });

  test('foreign keys carry onDelete on both column and edge', () => {
    const author = post?.columns.find((c) => c.dbName === 'author_id');
    expect(author?.onDelete).toBe('cascade');
    const edge = g.edges.find((e) => e.source === 'post' && e.sourceColumn === 'author_id');
    expect(edge?.onDelete).toBe('cascade');
    const visitUser = g.edges.find((e) => e.source === 'visit_log');
    expect(visitUser?.onDelete).toBe('set null');
  });
});

describe('extended column and index types', () => {
  // Synthetic table: the real task tables live in schema*.ts, which this suite must not touch.
  const synthetic = pgTable(
    'introspect_probe',
    {
      id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
      seq: integer('seq').generatedByDefaultAsIdentity(),
      name: text('name').notNull(),
      status: text('status').notNull().default('active'),
      rank: smallint('rank'),
      big53: bigint('big53', { mode: 'number' }),
      big64: bigint('big64', { mode: 'bigint' }),
      due: date('due', { mode: 'string' }),
      dueDate: date('due_date', { mode: 'date' }),
      budget: numeric('budget', { precision: 12, scale: 2 }),
      budgetNum: numeric('budget_num', { mode: 'number' }),
      plainAt: timestamp('plain_at'),
      zonedAt: timestamp('zoned_at', { withTimezone: true }).defaultNow(),
      zonedStr: timestamp('zoned_str', { withTimezone: true, mode: 'string' }),
      plainStr: timestamp('plain_str', { mode: 'string' }),
    },
    (t) => [
      index('probe_lower_name_idx').on(sql`lower(${t.name})`),
      index('probe_name_status_idx').on(t.name, sql`lower(${t.status})`),
      uniqueIndex('probe_active_name_uq').on(t.name).where(sql`${t.status} <> 'archived'`),
      index('probe_rank_idx').on(t.rank),
    ],
  );
  const meta = introspectTables([synthetic]).tables[0];
  const col = (name: string) => meta.columns.find((c) => c.dbName === name);
  const idx = (name: string) => meta.indexes.find((i) => i.name === name);

  test('maps integer-family and numeric column variants', () => {
    expect(col('rank')?.type).toBe('smallint');
    expect(col('big53')?.type).toBe('bigint');
    expect(col('big64')?.type).toBe('bigint');
    expect(col('budget')?.type).toBe('numeric');
    expect(col('budget_num')?.type).toBe('numeric');
  });

  test('maps date columns in string and date mode to date', () => {
    expect(col('due')?.type).toBe('date');
    expect(col('due_date')?.type).toBe('date');
  });

  test('reports timezone-aware timestamps as timestamptz in both modes', () => {
    expect(col('zoned_at')?.type).toBe('timestamptz');
    expect(col('zoned_str')?.type).toBe('timestamptz');
    expect(col('plain_at')?.type).toBe('timestamp');
    expect(col('plain_str')?.type).toBe('timestamp');
  });

  test('marks identity columns instead of an unnamed sql default', () => {
    expect(col('id')).toMatchObject({
      defaultKind: 'identity',
      defaultText: 'generated always as identity',
      notNull: true,
      pk: true,
    });
    expect(col('seq')).toMatchObject({
      defaultKind: 'identity',
      defaultText: 'generated by default as identity',
    });
  });

  test('keeps literal and sql defaults unchanged', () => {
    expect(col('status')).toMatchObject({ defaultKind: 'literal', defaultText: `'active'` });
    expect(col('zoned_at')).toMatchObject({ defaultKind: 'sql', defaultText: 'now()' });
  });

  test('renders expression index columns as SQL text, never [object Object]', () => {
    expect(idx('probe_lower_name_idx')?.columns).toEqual(['lower(name)']);
    expect(idx('probe_name_status_idx')?.columns).toEqual(['name', 'lower(status)']);
    for (const ix of meta.indexes) {
      expect(ix.columns.join(',')).not.toContain('[object Object]');
    }
  });

  test('partial indexes carry their where predicate, full indexes do not', () => {
    const partial = idx('probe_active_name_uq');
    expect(partial).toMatchObject({ unique: true, columns: ['name'] });
    expect(partial?.where).toBe(`status <> 'archived'`);
    expect(idx('probe_rank_idx')).not.toHaveProperty('where');
    expect(idx('probe_lower_name_idx')).not.toHaveProperty('where');
  });
});

describe('introspectDrizzleSchema output stays stable', () => {
  const g = introspectDrizzleSchema();

  test('no real index renders an object placeholder', () => {
    for (const t of g.tables) {
      for (const ix of t.indexes) {
        expect(ix.columns.join(',')).not.toContain('[object Object]');
      }
    }
  });

  test('every column type and default kind is a known label', () => {
    const kinds = new Set(['literal', 'sql', 'fn', 'identity', null]);
    for (const t of g.tables) {
      for (const c of t.columns) {
        expect(c.type).not.toBe('unknown');
        expect(kinds.has(c.defaultKind)).toBe(true);
      }
    }
  });
});
