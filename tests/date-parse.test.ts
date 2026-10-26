import { describe, expect, test } from 'bun:test';
import { parseDateInput } from '../app/lib/date-parse';
import { themeComponents } from '../app/lib/theme-components';

describe('parseDateInput — accepted formats', () => {
  test('reads the Indonesian display format, any casing, extra spaces tolerated', () => {
    expect(parseDateInput('25 Oktober 2026')).toBe('2026-10-25');
    expect(parseDateInput('25 oktober 2026')).toBe('2026-10-25');
    expect(parseDateInput('25 OKTOBER 2026')).toBe('2026-10-25');
    expect(parseDateInput('  25  Oktober   2026 ')).toBe('2026-10-25');
    expect(parseDateInput('05 Oktober 2026')).toBe('2026-10-05');
  });

  test('reads the short Indonesian month names', () => {
    expect(parseDateInput('25 Okt 2026')).toBe('2026-10-25');
    expect(parseDateInput('25 okt 2026')).toBe('2026-10-25');
    expect(parseDateInput('10 Agt 2026')).toBe('2026-08-10');
  });

  test('reads ISO', () => {
    expect(parseDateInput('2026-10-25')).toBe('2026-10-25');
    expect(parseDateInput('2026-01-01')).toBe('2026-01-01');
  });

  test('reads numeric day-first forms, padded or not', () => {
    expect(parseDateInput('25/10/2026')).toBe('2026-10-25');
    expect(parseDateInput('25-10-2026')).toBe('2026-10-25');
    expect(parseDateInput('5/10/2026')).toBe('2026-10-05');
    expect(parseDateInput('05/10/2026')).toBe('2026-10-05');
    expect(parseDateInput('05-10-2026')).toBe('2026-10-05');
  });

  test('day comes before month, never the American order', () => {
    // 10 March, not 3 October: a form that would be valid either way resolves day-first.
    expect(parseDateInput('10/3/2026')).toBe('2026-03-10');
  });
});

describe('parseDateInput — rejected input', () => {
  test('half-typed values stay null so the input keeps the typed text', () => {
    // The old `new Date(value)` fallback turned "2" into 2001-02-01 and locked it in on blur.
    expect(parseDateInput('2')).toBeNull();
    expect(parseDateInput('25')).toBeNull();
    expect(parseDateInput('25 Okt')).toBeNull();
    expect(parseDateInput('25 Oktober')).toBeNull();
    expect(parseDateInput('25/10')).toBeNull();
  });

  test('dates that do not exist are refused (strict parsing)', () => {
    expect(parseDateInput('31 Februari 2026')).toBeNull();
    expect(parseDateInput('29 Februari 2026')).toBeNull();
    expect(parseDateInput('32/10/2026')).toBeNull();
    expect(parseDateInput('2026-10-32')).toBeNull();
    expect(parseDateInput('0 Oktober 2026')).toBeNull();
    // A real leap day still passes, so strictness is not just a blanket February refusal.
    expect(parseDateInput('29 Februari 2024')).toBe('2024-02-29');
  });

  test('a 2-digit year is ambiguous and refused', () => {
    expect(parseDateInput('25 Oktober 26')).toBeNull();
    expect(parseDateInput('25 Okt 26')).toBeNull();
    expect(parseDateInput('25/10/26')).toBeNull();
    expect(parseDateInput('25-10-26')).toBeNull();
  });

  test('empty, blank and junk input are null', () => {
    expect(parseDateInput('')).toBeNull();
    expect(parseDateInput('   ')).toBeNull();
    expect(parseDateInput('abc')).toBeNull();
    expect(parseDateInput('25 Oktober 2026 besok')).toBeNull();
    expect(parseDateInput('2026/10/25')).toBeNull();
  });
});

describe('theme default', () => {
  test('DateInput ships the strict parser, so no screen falls back to new Date()', () => {
    const defaults = themeComponents.DateInput?.defaultProps as
      | { dateParser?: (value: string) => unknown }
      | undefined;
    expect(typeof defaults?.dateParser).toBe('function');
    expect(defaults?.dateParser?.('25 Oktober 2026')).toBe('2026-10-25');
    expect(defaults?.dateParser?.('2')).toBeNull();
  });
});
