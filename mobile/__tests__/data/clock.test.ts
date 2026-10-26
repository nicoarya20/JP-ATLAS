/**
 * The clock the server decided (K1), and the state the whole decision turns on: what happens
 * before it has arrived. Nothing may quietly answer "today" from the device.
 */
import { clockLoaded, peekClock, requireClock, teamTimeZone, today } from '@/data/clock';
import { sessionStore, setSessionClock } from '@/session/session.state';

import { resetSessionForTest, seedSession, TEST_CLOCK } from '../helpers/session-fixtures';

describe('before the clock has loaded', () => {
  beforeEach(() => resetSessionForTest());

  it('says so instead of guessing', () => {
    expect(peekClock()).toBeNull();
    expect(clockLoaded()).toBe(false);
  });

  it.each([
    ['requireClock', requireClock],
    ['today', today],
    ['teamTimeZone', teamTimeZone],
  ])('%s throws, naming what is missing and where it comes from', (_name, call) => {
    expect(call).toThrow(/GET \/api\/app\/home/);
    // The failure has to rule out the two wrong answers by name, because both look like working
    // code: a device date, and the sample's own dead date.
    expect(call).toThrow(/never fall back to the device's own clock/);
  });

  it('does not fall back to the device clock, which would be the silent bug', () => {
    const deviceToday = new Date().toISOString().slice(0, 10);
    expect(() => today()).toThrow();
    expect(peekClock()?.today).not.toBe(deviceToday);
  });
});

describe('once the clock is in', () => {
  beforeEach(() => {
    resetSessionForTest();
    seedSession();
  });

  it('reads today and the team zone from the session, not from a second store', () => {
    expect(clockLoaded()).toBe(true);
    expect(today()).toBe(TEST_CLOCK.today);
    expect(teamTimeZone()).toBe(TEST_CLOCK.timeZone);
    expect(requireClock()).toEqual(sessionStore.get().clock);
  });

  it('follows the session store when the server sends a new day', () => {
    setSessionClock({ today: '2026-12-31', timeZone: 'Asia/Jakarta' });

    expect(today()).toBe('2026-12-31');
    // One source of truth: the session's copy is the only copy.
    expect(sessionStore.get().clock?.today).toBe('2026-12-31');
  });

  it('is cleared with the session, so the next account cannot inherit a date', () => {
    resetSessionForTest();

    expect(clockLoaded()).toBe(false);
  });
});
