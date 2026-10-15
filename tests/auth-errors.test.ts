/** Login copy for Better Auth codes and URL notices. */
import { describe, expect, test } from 'bun:test';
import { describeAuthError, loginNotice } from '../app/lib/auth-errors';

describe('describeAuthError', () => {
  test('banned code (any case) → banned notice', () => {
    expect(describeAuthError({ code: 'BANNED_USER', message: 'x' }).kind).toBe('banned');
    expect(describeAuthError('banned_user').kind).toBe('banned');
  });
  test('known codes get Indonesian copy, unknown fall back to the server message', () => {
    expect(describeAuthError({ code: 'INVALID_EMAIL_OR_PASSWORD' }).message).toContain('salah');
    const raw = describeAuthError({ code: 'SOMETHING_NEW', message: 'Server says no' });
    expect(raw.kind).toBe('error');
    expect(raw.message).toBe('Server says no');
    expect(describeAuthError(null).message).toContain('gagal');
  });
  test('OAuth callback codes for blocked and duplicate emails tell the user to contact the Admin', () => {
    const blocked = describeAuthError('unable_to_create_user');
    expect(blocked.kind).toBe('error');
    expect(blocked.message).toBe('Email ini tidak diizinkan masuk. Hubungi Admin.');
    const linked = describeAuthError('account_not_linked');
    expect(linked.kind).toBe('error');
    expect(linked.message).toBe('Email ini sudah punya akun lain. Hubungi Admin.');
  });
  test('the same codes arrive through the ?error= query of the login page', () => {
    expect(loginNotice(new URLSearchParams('error=account_not_linked'))?.message).toBe(
      'Email ini sudah punya akun lain. Hubungi Admin.',
    );
    expect(loginNotice(new URLSearchParams('error=unable_to_create_user'))?.message).toBe(
      'Email ini tidak diizinkan masuk. Hubungi Admin.',
    );
  });
  test('Better Auth 429 (English message, no code) → Indonesian rate-limit notice', () => {
    const n = describeAuthError({
      status: 429,
      message: 'Too many requests. Please try again later.',
    });
    expect(n.kind).toBe('error');
    expect(n.message).toBe('Terlalu banyak percobaan masuk. Tunggu sebentar lalu coba lagi.');
  });
});

describe('loginNotice', () => {
  test('reads ?error (OAuth callback) and ?notice=session (guard)', () => {
    expect(loginNotice(new URLSearchParams('error=BANNED_USER'))?.kind).toBe('banned');
    expect(loginNotice(new URLSearchParams('error=access_denied'))?.message).toContain(
      'membatalkan',
    );
    expect(loginNotice(new URLSearchParams('notice=session'))?.kind).toBe('session');
    expect(loginNotice(new URLSearchParams(''))).toBeNull();
  });
});
