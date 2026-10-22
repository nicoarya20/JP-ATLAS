import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  DENY_CODES,
  isDenyCode,
  PM_API_CODES,
  PM_ERRORS,
  type PmCode,
} from '../../server/pm/errors';
import * as limits from '../../server/pm/limits';
import { denyResponse, fail } from '../../server/pm/respond';

const ALLOWED_HTTP = [403, 404, 409, 410, 422, 429, 503];
const ALL_CODES: PmCode[] = [...PM_API_CODES, ...DENY_CODES];
const SERVER_DIR = path.join(import.meta.dir, '../../server/pm');

describe('PM_ERRORS catalog', () => {
  it('has one entry per declared code and no stray entries', () => {
    expect(Object.keys(PM_ERRORS).sort()).toEqual([...ALL_CODES].sort());
  });

  it('declares each code exactly once across API and policy codes', () => {
    expect(new Set(ALL_CODES).size).toBe(ALL_CODES.length);
  });

  it.each(ALL_CODES)('%s has an allowed http status and a non-empty message', (code) => {
    const { http, message } = PM_ERRORS[code];
    expect(ALLOWED_HTTP).toContain(http);
    expect(message.trim().length).toBeGreaterThan(0);
  });

  it('uses the canonical spellings (M8, M18) and drops the superseded ones', () => {
    for (const code of [
      'LEAD_MUST_BE_MANAGER',
      'ACCOUNT_PENDING',
      'ACCOUNT_REJECTED',
      'IMPERSONATING',
      'ROLE_CANNOT_TRASH',
      'EXPIRED', // R04 spelling, added with the S1 project Trash (S1-05)
    ]) {
      expect(code in PM_ERRORS).toBe(true);
    }
    for (const code of [
      'LEAD_NOT_MANAGER',
      'ACCOUNT_NOT_APPROVED',
      'NOT_VISIBLE',
      'TRASH_EXPIRED',
    ]) {
      expect(code in PM_ERRORS).toBe(false);
    }
  });

  it('EXPIRED is a 410 whose text names no day count (the retention period is configurable)', () => {
    expect(PM_ERRORS.EXPIRED.http).toBe(410);
    expect(PM_ERRORS.EXPIRED.message).not.toMatch(/\d/);
  });

  it('ACCOUNT_PENDING promises no email (N01: the app sends none)', () => {
    expect(PM_ERRORS.ACCOUNT_PENDING.message).not.toMatch(/email|kabar/i);
  });

  it('keeps 5xx messages generic (no internal detail)', () => {
    for (const code of ALL_CODES) {
      if (PM_ERRORS[code].http >= 500)
        expect(PM_ERRORS[code].message).not.toMatch(
          /\b(stack|sql|bun|s3|rustfs|econn\w*)\b|error:/i,
        );
    }
  });

  it('isDenyCode recognises policy codes only', () => {
    expect(isDenyCode('NOT_MANAGER')).toBe(true);
    expect(isDenyCode('VALIDATION')).toBe(false);
    expect(isDenyCode('nope')).toBe(false);
  });
});

describe('fail / denyResponse', () => {
  const record = (http: number, body: unknown) => ({ http, body });

  it('fail passes the catalog status and an { error, code } body to status()', () => {
    const r = fail(record, 'NOT_FOUND');
    expect(r).toEqual({
      http: 404,
      body: { error: PM_ERRORS.NOT_FOUND.message, code: 'NOT_FOUND' },
    });
  });

  it('fail merges extra fields and lets a 4xx refine the message', () => {
    const r = fail(record, 'RATE_LIMITED', {
      retryAfterSeconds: 12,
      error: 'Coba lagi dalam 12 detik.',
    });
    expect(r).toEqual({
      http: 429,
      body: { retryAfterSeconds: 12, error: 'Coba lagi dalam 12 detik.', code: 'RATE_LIMITED' },
    });
  });

  it('fail never lets a caller override the message of a 5xx', () => {
    const r = fail(record, 'STORAGE_DISABLED', { error: 'ECONNREFUSED 10.0.0.5:9000' });
    expect(r.body).toEqual({ error: PM_ERRORS.STORAGE_DISABLED.message, code: 'STORAGE_DISABLED' });
  });

  it('fail cannot be used to forge another code through extra', () => {
    const r = fail(record, 'NOT_FOUND', { code: 'NOT_ADMIN' });
    expect((r.body as { code: string }).code).toBe('NOT_FOUND');
  });

  it('denyResponse maps every deny code to its catalog http and message', () => {
    for (const code of DENY_CODES) {
      expect(denyResponse({ ok: false, code })).toEqual({
        http: PM_ERRORS[code].http,
        body: { error: PM_ERRORS[code].message, code },
      });
    }
  });
});

describe('client-safe modules stay pure', () => {
  it.each(['errors.ts', 'limits.ts'])('%s has no runtime globals or server imports', (file) => {
    const src = readFileSync(path.join(SERVER_DIR, file), 'utf8');
    expect(src).not.toMatch(/\bBun\.|\bprocess\./);
    expect(src).not.toMatch(/from\s+'(node:[^']*|\.\.?\/(env|db|logger)[^']*)'/);
  });
});

describe('limits', () => {
  it('seeds Tugas/task, Bug/issue, Ide/idea in that order', () => {
    expect(limits.DEFAULT_TASK_KINDS).toEqual([
      { name: 'Tugas', baseKind: 'task' },
      { name: 'Bug', baseKind: 'issue' },
      { name: 'Ide', baseKind: 'idea' },
    ]);
  });

  it('has a default page size within the maximum and positive write limits', () => {
    expect(limits.PAGE_LIMIT_DEFAULT).toBeGreaterThan(0);
    expect(limits.PAGE_LIMIT_DEFAULT).toBeLessThanOrEqual(limits.PAGE_LIMIT_MAX);
    expect(limits.WRITE_RATE_MAX).toBeGreaterThan(0);
    expect(limits.WRITE_RATE_WINDOW_SECONDS).toBeGreaterThan(0);
  });

  it('keeps task review hidden (M25) and project delete visible (KEPUTUSAN 15 Okt)', () => {
    expect(limits.TASK_REVIEW_UI_ENABLED).toBe(false);
    expect(limits.PROJECT_DELETE_UI_ENABLED).toBe(true);
  });
});
