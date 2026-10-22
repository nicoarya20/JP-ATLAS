import { Column, getTableName, is, Name, Param, SQL, StringChunk } from 'drizzle-orm';
import { type AnyPgColumn, getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type ColumnMeta = {
  key: string;
  dbName: string;
  type: string;
  pk: boolean;
  notNull: boolean;
  unique: boolean;
  /** 'literal' (constant), 'sql' (e.g. now()), 'fn' (JS $defaultFn), 'identity', or null. */
  defaultKind: 'literal' | 'sql' | 'fn' | 'identity' | null;
  /** Human-readable default when known ("false", "now()", "'singleton'"). */
  defaultText: string | null;
  fkTable?: string;
  fkColumn?: string;
  onDelete?: string;
};

export type IndexMeta = {
  name: string;
  /** Plain column names; expression columns are rendered as SQL text, e.g. "lower(name)". */
  columns: string[];
  unique: boolean;
  /** Predicate of a partial index ("status <> 'archived'"); absent for full indexes. */
  where?: string;
};

export type TableMeta = {
  id: string;
  name: string;
  columns: ColumnMeta[];
  indexes: IndexMeta[];
};

export type FkEdge = {
  id: string;
  source: string;
  sourceColumn: string;
  target: string;
  targetColumn: string;
  onDelete: string;
};

export type SchemaGraph = { tables: TableMeta[]; edges: FkEdge[] };

const PG_TYPE_MAP: Record<string, string> = {
  PgText: 'text',
  PgVarchar: 'varchar',
  PgBoolean: 'boolean',
  PgTimestamp: 'timestamp',
  PgInteger: 'integer',
  PgSerial: 'serial',
  PgBigInt53: 'bigint',
  PgBigInt64: 'bigint',
  PgSmallInt: 'smallint',
  PgNumeric: 'numeric',
  PgNumericNumber: 'numeric',
  PgNumericBigInt: 'numeric',
  PgJsonb: 'jsonb',
  PgJson: 'json',
  PgUUID: 'uuid',
  PgDate: 'date',
  PgDateString: 'date',
  PgTimestampString: 'timestamp',
};

type ColumnInternals = {
  hasDefault?: boolean;
  defaultFn?: unknown;
  default?: unknown;
  isUnique?: boolean;
  generatedIdentity?: { type: 'always' | 'byDefault' };
};

/** Renders a drizzle SQL fragment as readable text (columns by name, params inline). */
function sqlText(q: SQL): string {
  return q.queryChunks
    .map((c) => {
      if (is(c, SQL)) return sqlText(c);
      if (is(c, StringChunk)) return c.value.join('');
      if (is(c, Column)) return c.name;
      if (is(c, Name)) return c.value;
      if (is(c, Param)) return String(c.value);
      return '';
    })
    .join('')
    .trim();
}

/** Best-effort text for a column default (drizzle keeps SQL defaults as chunk lists). */
export function describeDefault(
  col: ColumnInternals,
): Pick<ColumnMeta, 'defaultKind' | 'defaultText'> {
  if (typeof col.defaultFn === 'function')
    return { defaultKind: 'fn', defaultText: 'app-generated' };
  // Checked before hasDefault: drizzle also flags identity columns as hasDefault with no value.
  if (col.generatedIdentity) {
    const mode = col.generatedIdentity.type === 'always' ? 'always' : 'by default';
    return { defaultKind: 'identity', defaultText: `generated ${mode} as identity` };
  }
  if (!col.hasDefault) return { defaultKind: null, defaultText: null };
  const d = col.default;
  if (is(d, SQL)) return { defaultKind: 'sql', defaultText: sqlText(d) || 'sql' };
  if (d === undefined) return { defaultKind: 'sql', defaultText: null };
  return { defaultKind: 'literal', defaultText: typeof d === 'string' ? `'${d}'` : String(d) };
}

/** SQL type name of a column; timezone-aware timestamps are reported as timestamptz. */
function typeName(col: AnyPgColumn): string {
  const base = PG_TYPE_MAP[col.columnType] ?? col.dataType ?? 'unknown';
  const withTimezone = (col as unknown as { withTimezone?: boolean }).withTimezone;
  return base === 'timestamp' && withTimezone ? 'timestamptz' : base;
}

/** Introspects the given Drizzle tables into column/index metadata and FK edges. */
export function introspectTables(pgTables: PgTable[]): SchemaGraph {
  const tables: TableMeta[] = [];
  const edges: FkEdge[] = [];

  for (const value of pgTables) {
    const config = getTableConfig(value);
    const tableName = config.name;
    const pkCols = new Set<string>(
      config.primaryKeys.flatMap((pk) => pk.columns.map((c) => c.name)),
    );

    const fkColMap = new Map<string, { fkTable: string; fkColumn: string; onDelete: string }>();
    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      if (!ref.columns.length || !ref.foreignColumns.length) continue;
      const fromCol = ref.columns[0];
      const toCol = ref.foreignColumns[0];
      // biome-ignore lint/suspicious/noExplicitAny: drizzle internal — table ref not in public types
      const toTableName = getTableName((toCol as any).table);
      const onDelete = fk.onDelete ?? 'no action';
      fkColMap.set(fromCol.name, { fkTable: toTableName, fkColumn: toCol.name, onDelete });
      edges.push({
        id: `${tableName}.${fromCol.name}→${toTableName}.${toCol.name}`,
        source: tableName,
        sourceColumn: fromCol.name,
        target: toTableName,
        targetColumn: toCol.name,
        onDelete,
      });
    }

    const columns: ColumnMeta[] = config.columns.map((col) => {
      const internals = col as unknown as ColumnInternals;
      return {
        key: col.name,
        dbName: col.name,
        type: typeName(col),
        pk: col.primary || pkCols.has(col.name),
        notNull: col.notNull,
        unique: Boolean(internals.isUnique),
        ...describeDefault(internals),
        ...fkColMap.get(col.name),
      };
    });

    const indexes: IndexMeta[] = config.indexes.map((ix) => ({
      name: ix.config.name ?? '',
      // Expression columns (e.g. lower(name)) are SQL objects without a name.
      columns: ix.config.columns.map((c) =>
        is(c, SQL) ? sqlText(c) : String((c as { name?: string }).name),
      ),
      unique: Boolean(ix.config.unique),
      ...(ix.config.where ? { where: sqlText(ix.config.where) } : {}),
    }));

    tables.push({ id: tableName, name: tableName, columns, indexes });
  }

  return { tables, edges };
}

/** Introspects every PgTable exported from the app schema (feeds /dev/db-schema). */
export function introspectDrizzleSchema(): SchemaGraph {
  return introspectTables(Object.values(schema).flatMap((v) => (is(v, PgTable) ? [v] : [])));
}
