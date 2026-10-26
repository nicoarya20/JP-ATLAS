// Reading the server's `can{}`: three states and nothing else, and the deny messages kept the same
// as the server's own (map GAP-A12).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  capAllows,
  capReason,
  capState,
  EVENT_DENY_MESSAGES,
  eventCap,
  eventCapAllows,
  eventCapReason,
  eventCapShown,
} from '@/data/events.caps';

describe('one capability value', () => {
  test('absent hides, true enables, a known code disables with its reason', () => {
    expect(capState(undefined)).toBe('hidden');
    expect(capState(true)).toBe('enabled');
    expect(capState('IMPERSONATING')).toBe('disabled');
    expect(capReason('IMPERSONATING')).toMatch(/menyamar/);
    expect(capReason(true)).toBeNull();
    expect(capReason(undefined)).toBeNull();
    expect(capAllows(true)).toBe(true);
    expect(capAllows('IMPERSONATING')).toBe(false);
  });

  test('a code this app does not know hides the control, as the server does', () => {
    // The server turns every `ui: 'hide'` code into an absent key, so a code arriving here that is
    // not in the catalogue is something new: failing closed is the same answer `capOf` gives.
    expect(capState('SOMETHING_NEW')).toBe('hidden');
    expect(capReason('SOMETHING_NEW')).toBeNull();
  });
});

describe("an event's can{}", () => {
  const can = { update: true, cancel: 'IMPERSONATING' } as const;

  test('reads per key, and a key left out is hidden', () => {
    expect(eventCap(can, 'update')).toBe('enabled');
    expect(eventCap(can, 'cancel')).toBe('disabled');
    expect(eventCap(can, 'trash')).toBe('hidden');
    expect(eventCapShown(can, 'cancel')).toBe(true);
    expect(eventCapShown(can, 'trash')).toBe(false);
    expect(eventCapAllows(can, 'cancel')).toBe(false);
    expect(eventCapReason(can, 'cancel')).toMatch(/menyamar/);
    expect(eventCapReason(can, 'update')).toBeNull();
  });
});

describe('the deny messages', () => {
  test("are word for word the server's own", () => {
    // Read as text rather than imported: mobile cannot import `server/`, and a copy that drifts
    // would show one sentence in the app and another in the API answer for the same refusal.
    const source = readFileSync(
      join(__dirname, '..', '..', '..', 'server', 'access', 'decision.ts'),
      'utf8',
    );
    for (const [code, message] of Object.entries(EVENT_DENY_MESSAGES)) {
      const entry = new RegExp(
        `${code}:\\s*\\{[^}]*?message:\\s*(?:'([^']*)'|\\n\\s*'([^']*)')`,
        's',
      );
      const found = entry.exec(source);
      expect(found).not.toBeNull();
      expect((found?.[1] ?? found?.[2] ?? '').trim()).toBe(message);
    }
  });

  test('cover every code an event capability can carry disabled', () => {
    // Only `ui: 'disable'` codes ever reach a client as a value; the event policies can produce
    // IMPERSONATING (cancel, trash) and PROJECT_IN_TRASH (eventOpen).
    expect(Object.keys(EVENT_DENY_MESSAGES).sort()).toEqual(['IMPERSONATING', 'PROJECT_IN_TRASH']);
  });
});
