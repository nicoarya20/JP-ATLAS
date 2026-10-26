/*
 * "Today" of the sample data: Wednesday, Oct 7, 2026, as in the prototype.
 *
 * test-only. Phase 2 (Gelombang 0) took this out of the production path: every date now comes from
 * the server's clock (`now.today` of GET /api/app/home, K1) through `src/data/clock.ts`. What is
 * left here is the date the sample rows were written against, so the test setup can seed the clock
 * with the day those rows describe (`__tests__/helpers/session-fixtures.ts`).
 *
 * Nothing under `src/` may import it: a second "today" in the app is how the phone and the server
 * end up disagreeing about which day a task is due.
 */
export const TODAY = '2026-10-07';

/** Greeting in the Home header, from the prototype's sample day (morning). */
export const GREETING = 'Good morning';
