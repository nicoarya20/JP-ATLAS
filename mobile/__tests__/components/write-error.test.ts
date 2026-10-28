// The sentence a failed write shows (src/components/state/write-error.ts): the app's English for a known code, the
// server's own sentence otherwise, and "Try again" when the failure is not a server answer.
import { ApiError } from '../../src/api/errors';
import { CONFIRM_ACTION } from '../../src/components/confirm/use-confirm-action';
import { writeError } from '../../src/components/state/write-error';
import { capMessage } from '../../src/data/caps.messages';

const answer = (code: string, message: string) => new ApiError({ message, code, status: 409 });

test('a code the app knows is said in its own words', () => {
  expect(writeError(answer('IMPERSONATING', 'Sedang menyamar.'))).toBe(capMessage('IMPERSONATING'));
});

test("an unknown code shows the server's sentence; an empty one falls back to Try again", () => {
  expect(writeError(answer('SOMETHING_NEW', 'Proyek sudah ditutup.'))).toBe(
    'Proyek sudah ditutup.',
  );
  expect(writeError(answer('SOMETHING_NEW', ''))).toBe(CONFIRM_ACTION.failed);
});

test('a failure that is not a server answer says Try again', () => {
  expect(writeError(new TypeError('boom'))).toBe(CONFIRM_ACTION.failed);
  expect(writeError('nope')).toBe(CONFIRM_ACTION.failed);
});
