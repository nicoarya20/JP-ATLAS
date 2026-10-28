// The server clock a test can start from (K1), and the `GET /api/app/home` answer that carries it.
// session-fixtures.ts seeds TEST_CLOCK for every test through jest.setup-after-env.js; a test about
// the gate fetching it serves homePayload() instead. test-only
import type { HomeResponse } from '@/data/home.api';
import { TODAY } from '@/data/sample/today';
import { type SessionClock, setSessionClock } from '@/session/session.state';

/**
 * The clock the sample rows were written against: the prototype's Wednesday, in the team's zone
 * (`server/metrics/config.ts`). Seeded instead of left to the device, exactly as in the app — the
 * difference is only that here the day is known rather than fetched.
 */
export const TEST_CLOCK: SessionClock = { today: TODAY, timeZone: 'Asia/Jakarta' };

/** Puts the test clock in the session, as `GET /api/app/home` would. */
export function seedClock(clock: SessionClock = TEST_CLOCK): void {
  setSessionClock(clock);
}

/** A home payload carrying `clock`; the sections are failed ones, which the client must accept. */
export const homePayload = (clock: SessionClock = TEST_CLOCK): HomeResponse => ({
  now: {
    ...clock,
    iso: `${clock.today}T00:30:00.000Z`,
    greeting: 'pagi',
    dateLabel: 'Rabu, 7 Oktober 2026',
    timeLabel: '07.30',
  },
  briefing: {
    ok: true,
    data: { lines: ['Satu tugas jatuh tempo hari ini.'], updatedLabel: '07.30' },
  },
  counters: { ok: false },
  focus: { ok: false },
  done: { ok: false },
  projects: { ok: false },
  agenda: { ok: false },
  activity: { ok: false },
  ask: { ok: false },
});
