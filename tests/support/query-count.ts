/** Query counter (S1-02): a Drizzle executor on the shared connection that records every SQL statement it sends. */
import { drizzle } from 'drizzle-orm/postgres-js';
import { db, schema } from '../../server/db';

export type QueryCounter = {
  /** Pass this as the `exec` argument of a query function. */
  exec: typeof db;
  /** SQL text of each statement sent through `exec`, in order. */
  queries: string[];
};

/**
 * Builds a second Drizzle instance on the same pool (so nothing else is counted) whose logger
 * collects statements. Read `queries.length` after the call to prove a query count is constant.
 */
export function countQueries(): QueryCounter {
  const queries: string[] = [];
  const exec = drizzle(db.$client, {
    schema,
    logger: { logQuery: (query) => queries.push(query) },
  });
  return { exec, queries };
}
