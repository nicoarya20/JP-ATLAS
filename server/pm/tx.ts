/** Transaction helpers: services take an `Executor` and open writes with `inTx`. */
import { db } from '../db';

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Either the shared connection pool or an open transaction; services accept this, not `db`. */
export type Executor = typeof db | Tx;

/**
 * Runs `fn` in one transaction. Inside `fn` use only the `tx` argument: a second
 * connection via `db` can starve the small pool. No storage or network calls in `fn`.
 */
export function inTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}
