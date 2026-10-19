import { describe, expect, it } from 'bun:test';
import { ApiError } from '../app/lib/http';
import {
  DEADLINE_ERROR_MESSAGES,
  NOT_ALLOWED_MESSAGE,
  withDeadlineMessage,
} from '../app/lib/project-deadline-api';

const refusal = (code: string, status = 422, message = 'server text') =>
  new ApiError({ message, status, code, requestId: 'req-1' });

describe('withDeadlineMessage', () => {
  it('says plainly that the new due date must be later', () => {
    const out = withDeadlineMessage(refusal('NOT_LATER')) as ApiError;
    expect(out.message).toBe('Tenggat baru harus lebih lambat dari tenggat sekarang.');
  });

  it.each(['NO_DEADLINE', 'PROJECT_CLOSED', 'NOT_ACTIVE', 'REASON_REQUIRED'])(
    'maps %s to its own Indonesian sentence and keeps status, code and request id',
    (code) => {
      const out = withDeadlineMessage(refusal(code)) as ApiError;
      expect(out.message).toBe(DEADLINE_ERROR_MESSAGES[code] as string);
      expect(out.message).not.toBe('server text');
      expect([out.status, out.code, out.requestId]).toEqual([422, code, 'req-1']);
    },
  );

  it('tells a non-manager they are not allowed, whatever the 403 code is', () => {
    for (const code of ['NOT_MANAGER', 'FORBIDDEN', 'UNKNOWN']) {
      const out = withDeadlineMessage(refusal(code, 403)) as ApiError;
      expect(out.message).toBe(NOT_ALLOWED_MESSAGE);
    }
  });

  it('lets unknown codes and non-API errors through untouched', () => {
    const other = refusal('SOMETHING_ELSE', 500);
    expect(withDeadlineMessage(other)).toBe(other);
    const plain = new Error('boom');
    expect(withDeadlineMessage(plain)).toBe(plain);
  });
});
