/** Request schemas shared by the /api/app modules, so every list and detail route validates alike. */
import { type TSchema, t } from 'elysia';
import { PAGE_LIMIT_DEFAULT, PAGE_LIMIT_MAX } from '../pm/limits';

const limit = () =>
  t.Optional(t.Numeric({ minimum: 1, maximum: PAGE_LIMIT_MAX, default: PAGE_LIMIT_DEFAULT }));

/** Row id in the path (`crypto.randomUUID()` text, never numeric). */
export const IdParam = t.Object({ id: t.String({ minLength: 1 }) });

/** Offset paging for small bounded lists that need a total (team); big lists use CursorQuery. */
export const PageQuery = t.Object({ page: t.Optional(t.Numeric({ minimum: 1 })), limit: limit() });

/** Keyset paging for lists that keep growing; the cursor is opaque (see pm/keyset.ts). */
export const CursorQuery = t.Object({
  cursor: t.Optional(t.String({ minLength: 1 })),
  limit: limit(),
});

/**
 * Exactly one of `values`. Not `t.UnionEnum`: it silently defaults to its first value, which would
 * turn "no filter" into a filter. The cast restores the literal type a mapped `t.Union` loses (Eden
 * would otherwise type the field as `string | Date` and accept any text); runtime is unchanged.
 */
export const oneOf = <const T extends string>(values: readonly T[]) =>
  t.Union(values.map((v) => t.Literal(v))) as unknown as TSchema & { static: T };
