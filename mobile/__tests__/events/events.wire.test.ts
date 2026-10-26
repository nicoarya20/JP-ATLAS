// The hand-kept copy of the server's event contract, checked against the server's own files.
//
// Mobile cannot import `server/`, so `src/data/events.wire.ts` repeats its enum values and its
// limits. Read as text here: a limit raised on the server and not here means the form would accept
// what the API refuses, and an enum value added there and not here means an event arrives with a
// `kind` nothing maps.
import {
  EVENT_AGENDA_MAX,
  EVENT_CANCEL_REASON_MAX,
  EVENT_CAP_KEYS,
  EVENT_KINDS,
  EVENT_LOCATION_TEXT_MAX,
  EVENT_LOCATION_TYPES,
  EVENT_MEETING_URL_MAX,
  EVENT_NOTE_STATUSES,
  EVENT_PARTICIPANTS_MAX,
  EVENT_RANGE_DAYS_MAX,
  EVENT_REMINDER_OFFSETS_MIN,
  EVENT_TITLE_MAX,
} from '@/data/events.wire';

import { readServerFile as read } from '../helpers/read-server-file';

/** `export const NAME = 1_234;` → 1234, underscores and all. */
function numberOf(source: string, name: string): number {
  const found = new RegExp(`export const ${name} = ([0-9_]+)`).exec(source);
  if (!found?.[1]) throw new Error(`${name} is not an exported number on the server any more`);
  return Number(found[1].replace(/_/g, ''));
}

/** `export const NAME = ['a', 'b'] as const;` → ['a','b']. */
function listOf(source: string, name: string): string[] {
  const found = new RegExp(`export const ${name} = \\[([^\\]]*)\\]`, 's').exec(source);
  if (!found?.[1]) throw new Error(`${name} is not an exported list on the server any more`);
  return [...found[1].matchAll(/'([^']+)'/g)].map((m) => m[1] as string);
}

describe('the event enums', () => {
  const enums = read('pm', 'enums.ts');

  test('kinds, location types and note statuses match', () => {
    expect([...EVENT_KINDS]).toEqual(listOf(enums, 'EVENT_KINDS'));
    expect([...EVENT_LOCATION_TYPES]).toEqual(listOf(enums, 'EVENT_LOCATION_TYPES'));
    expect([...EVENT_NOTE_STATUSES]).toEqual(listOf(enums, 'EVENT_NOTE_STATUSES'));
  });

  test('the default reminder offsets match', () => {
    const offsets = /EVENT_REMINDER_OFFSETS_MIN = \[([^\]]*)\]/.exec(enums)?.[1] ?? '';
    expect([...EVENT_REMINDER_OFFSETS_MIN]).toEqual(
      [...offsets.matchAll(/\d+/g)].map((m) => Number(m[0])),
    );
  });
});

describe('the write limits', () => {
  const dto = read('event', 'events.dto.ts');

  test("every length and count the form checks is the server's own", () => {
    expect(EVENT_TITLE_MAX).toBe(numberOf(dto, 'EVENT_TITLE_MAX'));
    expect(EVENT_LOCATION_TEXT_MAX).toBe(numberOf(dto, 'EVENT_LOCATION_TEXT_MAX'));
    expect(EVENT_MEETING_URL_MAX).toBe(numberOf(dto, 'EVENT_MEETING_URL_MAX'));
    expect(EVENT_AGENDA_MAX).toBe(numberOf(dto, 'EVENT_AGENDA_MAX'));
    expect(EVENT_CANCEL_REASON_MAX).toBe(numberOf(dto, 'EVENT_CANCEL_REASON_MAX'));
    expect(EVENT_PARTICIPANTS_MAX).toBe(numberOf(dto, 'EVENT_PARTICIPANTS_MAX'));
  });

  test('the widest calendar window matches', () => {
    expect(EVENT_RANGE_DAYS_MAX).toBe(
      numberOf(read('event', 'events.range.ts'), 'EVENT_RANGE_DAYS_MAX'),
    );
  });
});

describe('the capability keys', () => {
  test('match EVENT_CAP_KEYS, so no control is bound to a key the server never sends', () => {
    expect([...EVENT_CAP_KEYS]).toEqual(
      listOf(read('access', 'capabilities.ts'), 'EVENT_CAP_KEYS'),
    );
  });
});
