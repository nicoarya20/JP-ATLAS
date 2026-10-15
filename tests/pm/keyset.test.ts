import { describe, expect, it } from 'bun:test';
import { decodeCursor, encodeCursor } from '../../server/pm/keyset';

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v), 'utf8').toString('base64url');

describe('keyset cursor', () => {
  it.each([
    ['ISO date string', '2026-10-16', 'task-1'],
    ['number', 42, 'a1b2'],
    ['null (nullable sort column)', null, 'zzz'],
    ['unicode text', 'Tugas — Ünïcode 日本', 'id/with+odd=chars'],
  ])('round-trips %s', (_label, sortValue, id) => {
    expect(decodeCursor(encodeCursor(sortValue as string | number | null, id))).toEqual({
      ok: true,
      key: { sortValue, id },
    });
  });

  it('produces URL-safe output', () => {
    expect(encodeCursor('a?b>c~', 'id??>>')).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['empty string', ''],
    ['not base64 json', '!!!not-a-cursor!!!'],
    ['plain text base64', Buffer.from('hello').toString('base64url')],
    ['json object', b64({ s: 1 })],
    ['json scalar', b64(7)],
    ['array too short', b64(['2026-10-16'])],
    ['array too long', b64(['x', 'id', 'extra'])],
    ['id is not a string', b64(['x', 5])],
    ['id is empty', b64(['x', ''])],
    ['sort value is an object', b64([{ a: 1 }, 'id'])],
    ['sort value is a boolean', b64([true, 'id'])],
  ])('rejects a broken cursor (%s) as VALIDATION', (_label, raw) => {
    expect(decodeCursor(raw)).toEqual({ ok: false, code: 'VALIDATION' });
  });
});
