/** Column helpers shared by the PM tables (id, timestamps, soft delete, enum CHECK). */
import { getTableName, type SQL, sql } from 'drizzle-orm';
import { type AnyPgColumn, check, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './schema.auth';

/** Text primary key with a client-generated UUID, so FKs to `user.id` (text) share one type. */
export const pk = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// New PM tables use timestamptz; legacy columns stay plain `timestamp` and the DB session runs in UTC.
const tz = (name: string) => timestamp(name, { withTimezone: true });

/** `created_at timestamptz NOT NULL DEFAULT now()`. */
export const createdAt = () => tz('created_at').defaultNow().notNull();

/** `updated_at timestamptz NOT NULL`, refreshed by Drizzle on every UPDATE it issues. */
export const updatedAt = () =>
  tz('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date());

/** `deleted_at` / `deleted_by` pair for trashable rows; the actor FK is nulled if the user is removed. */
export const softDelete = () => ({
  deletedAt: tz('deleted_at'),
  deletedBy: text('deleted_by').references(() => user.id, { onDelete: 'set null' }),
});

function literal(value: string): SQL {
  // Raw, escaped literal: drizzle-kit renders CHECK bodies without bind parameters.
  return sql.raw(`'${value.replaceAll("'", "''")}'`);
}

/** CHECK constraint restricting `col` to the values of an enum tuple (from `server/pm/enums.ts`). */
export function oneOf(col: AnyPgColumn, values: readonly string[]) {
  const name = `${getTableName(col.table)}_${col.name}_check`;
  return check(name, sql`${col} in (${sql.join(values.map(literal), sql`, `)})`);
}
