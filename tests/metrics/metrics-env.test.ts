import { afterAll, afterEach, beforeAll, describe, expect, it, spyOn } from 'bun:test';
import { logger } from '../../server/logger';
import { METRICS } from '../../server/metrics/config';
import { getMetrics, resolveMetrics } from '../../server/pm/metrics-env';

const spyWarn = () => spyOn(logger, 'warn').mockImplementation(() => {});
let warn: ReturnType<typeof spyWarn>;
// Installed and restored around this file: a spy created at import time silences logger.warn for every later file.
beforeAll(() => {
  warn = spyWarn();
});
afterEach(() => warn.mockClear());
afterAll(() => warn.mockRestore());

describe('METRICS defaults', () => {
  it('match the specification exactly', () => {
    expect({ ...METRICS }).toEqual({
      AT_RISK_OVERDUE_RATIO: 0.2,
      AT_RISK_PRIORITIES: ['high', 'critical'],
      TASK_STALE_DAYS: 3,
      TRASH_RETENTION_DAYS: 30,
      TASK_KINDS_MAX_ACTIVE: 6,
      TIME_ZONE: 'Asia/Jakarta',
      UNDO_WINDOW_SECONDS: 10,
      PROGRESS_DISPLAY_CAP_UNLESS_ALL_DONE: 99,
    });
  });

  it('is frozen', () => {
    expect(Object.isFrozen(METRICS)).toBe(true);
    expect(Object.isFrozen(METRICS.AT_RISK_PRIORITIES)).toBe(true);
  });
});

describe('resolveMetrics', () => {
  it('returns the defaults, silently, when nothing is set', () => {
    expect(resolveMetrics({})).toEqual(METRICS);
    expect(warn).not.toHaveBeenCalled();
  });

  it('treats empty and blank values as unset without a warning', () => {
    expect(resolveMetrics({ TASK_STALE_DAYS: '', APP_TIME_ZONE: '  ' })).toEqual(METRICS);
    expect(warn).not.toHaveBeenCalled();
  });

  it('applies valid overrides', () => {
    const m = resolveMetrics({
      APP_TIME_ZONE: 'Asia/Makassar',
      PROJECT_AT_RISK_OVERDUE_RATIO: '0.35',
      TASK_STALE_DAYS: '5',
      TRASH_RETENTION_DAYS: '14',
    });
    expect(m.TIME_ZONE).toBe('Asia/Makassar');
    expect(m.AT_RISK_OVERDUE_RATIO).toBe(0.35);
    expect(m.TASK_STALE_DAYS).toBe(5);
    expect(m.TRASH_RETENTION_DAYS).toBe(14);
    expect(m.UNDO_WINDOW_SECONDS).toBe(METRICS.UNDO_WINDOW_SECONDS); // not overridable
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([
    ['PROJECT_AT_RISK_OVERDUE_RATIO', 'abc', 'AT_RISK_OVERDUE_RATIO'],
    ['PROJECT_AT_RISK_OVERDUE_RATIO', '0.2x', 'AT_RISK_OVERDUE_RATIO'],
    ['PROJECT_AT_RISK_OVERDUE_RATIO', '1.5', 'AT_RISK_OVERDUE_RATIO'],
    ['PROJECT_AT_RISK_OVERDUE_RATIO', '-0.1', 'AT_RISK_OVERDUE_RATIO'],
    ['TASK_STALE_DAYS', 'tiga', 'TASK_STALE_DAYS'],
    ['TASK_STALE_DAYS', '2.5', 'TASK_STALE_DAYS'],
    ['TASK_STALE_DAYS', '0', 'TASK_STALE_DAYS'],
    ['TASK_STALE_DAYS', '1e2', 'TASK_STALE_DAYS'],
    ['TASK_STALE_DAYS', 'Infinity', 'TASK_STALE_DAYS'],
    ['TRASH_RETENTION_DAYS', 'NaN', 'TRASH_RETENTION_DAYS'],
    ['TRASH_RETENTION_DAYS', '99999', 'TRASH_RETENTION_DAYS'],
    ['APP_TIME_ZONE', 'Mars/Base', 'TIME_ZONE'],
  ] as const)('rejects %s=%p: keeps the default and warns', (name, raw, key) => {
    const m = resolveMetrics({ [name]: raw });
    expect(m[key]).toBe(METRICS[key]);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('never writes the raw value to the log', () => {
    resolveMetrics({ TASK_STALE_DAYS: 'hunter2-secret' });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('hunter2');
    expect(JSON.stringify(warn.mock.calls)).toContain('TASK_STALE_DAYS');
  });

  it('keeps valid overrides when a sibling is invalid', () => {
    const m = resolveMetrics({ TASK_STALE_DAYS: 'x', TRASH_RETENTION_DAYS: '7' });
    expect(m.TASK_STALE_DAYS).toBe(3);
    expect(m.TRASH_RETENTION_DAYS).toBe(7);
  });

  it('returns a frozen object and leaves METRICS untouched', () => {
    const m = resolveMetrics({ TASK_STALE_DAYS: '9' });
    expect(Object.isFrozen(m)).toBe(true);
    expect(METRICS.TASK_STALE_DAYS).toBe(3);
  });
});

describe('getMetrics', () => {
  it('resolves once and returns the same object afterwards', () => {
    expect(getMetrics()).toBe(getMetrics());
  });
});
