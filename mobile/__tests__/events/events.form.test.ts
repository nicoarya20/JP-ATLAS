import {
  agendaLines,
  dates,
  dueDates,
  MODES,
  savedFields,
  TIMES,
  validateEvent,
} from '../../src/data/events.form';
import type { EventFields } from '../../src/data/events.store';
import { seedClock, TEST_CLOCK } from '../helpers/clock-fixtures';

// The prototype's New event form (events.new.jsx) on Wed, Oct 7, 2026.

const FORM: EventFields = {
  title: '  Retro ',
  date: '2026-10-09',
  start: '11:00 AM',
  end: '12:00 PM',
  mode: 'In person',
  place: ' Room 3 ',
  attendees: ['Nico'],
  type: 'Meeting',
  project: 'atlas',
  agenda: [],
  repeat: '',
};

describe('events form', () => {
  test('times run 7:00 AM to 9:00 PM every 15 minutes', () => {
    expect(TIMES).toHaveLength(57);
    expect(TIMES.slice(0, 3)).toEqual(['7:00 AM', '7:15 AM', '7:30 AM']);
    expect(TIMES).toContain('12:00 PM');
    expect(TIMES).toContain('12:45 PM');
    expect(TIMES[TIMES.length - 1]).toBe('9:00 PM');
  });

  test('dates run from today to the end of October', () => {
    const options = dates();
    expect(options).toHaveLength(25);
    expect(options[0]).toEqual({ value: '2026-10-07', label: 'Wed, Oct 7' });
    expect(options[1]).toEqual({ value: '2026-10-08', label: 'Thu, Oct 8' });
    expect(options[24]).toEqual({ value: '2026-10-31', label: 'Sat, Oct 31' });
    expect(dueDates()[2]).toEqual({ value: '2026-10-09', label: 'Oct 9' });
    expect(MODES).toEqual(['In person', 'Online']);
  });

  test("dates start from the server's today, read when asked, not when the app loaded", () => {
    seedClock({ ...TEST_CLOCK, today: '2026-10-29' });

    expect(dates().map((d) => d.value)).toEqual(['2026-10-29', '2026-10-30', '2026-10-31']);
    expect(dueDates()[0]).toEqual({ value: '2026-10-29', label: 'Oct 29' });
  });

  test('needs a title and an end after the start', () => {
    expect(validateEvent(FORM)).toEqual({ ok: true, timeOk: true });
    expect(validateEvent({ ...FORM, title: '   ' })).toEqual({ ok: false, timeOk: true });
    expect(validateEvent({ ...FORM, end: '11:00 AM' })).toEqual({ ok: false, timeOk: false });
    expect(validateEvent({ ...FORM, start: '2:00 PM', end: '1:45 PM' }).timeOk).toBe(false);
  });

  test('Save trims the fields and splits the agenda, one item per line', () => {
    expect(agendaLines('1. Wins\n\n2.  Fixes \n  Next sprint')).toEqual([
      'Wins',
      'Fixes',
      'Next sprint',
    ]);
    expect(savedFields(FORM)).toMatchObject({ title: 'Retro', place: 'Room 3' });
    expect(savedFields({ ...FORM, mode: 'Online', place: 'meet.example/abc' }).place).toBe(
      'Online',
    );
  });
});
