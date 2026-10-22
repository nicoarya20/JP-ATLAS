/** Test clock (S0B-21): a fixed "now" and a freeze that is always undone after the test. */
import { afterEach, setSystemTime } from 'bun:test';

/** Wednesday 2026-10-07 10:00 WIB, the "today" of the Atlas scenario (zone Asia/Jakarta is an assumption, R09). */
export const ATLAS_NOW = new Date('2026-10-07T03:00:00Z');

/**
 * Freezes `Date`/`Date.now()` at `d` and restores the real clock in `afterEach`.
 * Call it inside a test or `beforeEach`; a freeze made in `beforeAll` is lifted after the first test.
 */
export function freezeAt(d: Date): void {
  setSystemTime(d);
  // Idempotent, so registering once per call is safe and keeps working across files that share this module.
  afterEach(() => setSystemTime());
}
