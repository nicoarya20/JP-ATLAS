/**
 * Pure rules for the "Buat password" form in /app/settings: which field is wrong, when the button
 * may be pressed, and what to say afterwards. Separate from the card so the copy and the arithmetic
 * are testable without a DOM (the UI tests render statically).
 */
import { PASSWORD_MIN_LEN } from '@server/account/password-rules';

export type PasswordFieldErrors = { next: string | null; confirm: string | null };

/**
 * Errors shown under the two fields. Each one only appears once that field has been typed in, so an
 * untouched form is never red. There is no "harus berbeda dari password saat ini" rule here: the
 * account has no password yet, which is the whole point of this form.
 */
export function createPasswordErrors(next: string, confirm: string): PasswordFieldErrors {
  return {
    next: next && next.length < PASSWORD_MIN_LEN ? `Minimal ${PASSWORD_MIN_LEN} karakter` : null,
    confirm: confirm && confirm !== next ? 'Konfirmasi tidak sama' : null,
  };
}

export function canSubmitCreatePassword(next: string, confirm: string): boolean {
  const errors = createPasswordErrors(next, confirm);
  return Boolean(next && confirm) && !errors.next && !errors.confirm;
}

/**
 * What the success notification says. The two branches matter: the server always tries to sign the
 * other devices out, and when that part fails the owner has to be told so they can do it by hand
 * instead of believing it already happened.
 */
export function createPasswordSuccessMessage(otherSessionsRevoked: boolean): string {
  return otherSessionsRevoked
    ? 'Password dibuat. Perangkat lain telah dikeluarkan; sesi di perangkat ini tetap masuk.'
    : 'Password dibuat, tapi perangkat lain belum bisa dikeluarkan. Keluarkan sendiri dari daftar Perangkat di bawah.';
}
