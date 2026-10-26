/** Length rules for a typed-in password, and the gate that decides whether a new one could be used at all. */
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { emailPasswordEnabled } from '../../server/account/auth-policy';
import { emailAuthUsable } from '../../server/account/email-auth';
import {
  PASSWORD_MAX_LEN,
  PASSWORD_MIN_LEN,
  passwordProblem,
  passwordProblemMessage,
} from '../../server/account/password-rules';
import * as settingsMod from '../../server/settings';

const pad = (n: number) => 'x'.repeat(n); // test-only

describe('passwordProblem', () => {
  it('accepts exactly the minimum and exactly the maximum', () => {
    expect(passwordProblem(pad(PASSWORD_MIN_LEN))).toBeNull();
    expect(passwordProblem(pad(PASSWORD_MAX_LEN))).toBeNull();
  });

  it('rejects one character either side of the range', () => {
    expect(passwordProblem(pad(PASSWORD_MIN_LEN - 1))).toBe('too_short');
    expect(passwordProblem(pad(PASSWORD_MAX_LEN + 1))).toBe('too_long');
    expect(passwordProblem('')).toBe('too_short');
  });

  it('rejects anything that is not text, so a JSON number never reaches Better Auth', () => {
    for (const value of [12345678, null, undefined, {}, ['x'.repeat(10)], true])
      expect(passwordProblem(value)).toBe('not_text');
  });

  it('mirrors the floor Better Auth itself enforces (8), so the two can never disagree', () => {
    expect(PASSWORD_MIN_LEN).toBe(8);
    expect(PASSWORD_MAX_LEN).toBe(128);
  });
});

describe('passwordProblemMessage', () => {
  it('names the limit and nothing about the password that was sent', () => {
    expect(passwordProblemMessage('too_short')).toBe('Password minimal 8 karakter.');
    expect(passwordProblemMessage('too_long')).toBe('Password maksimal 128 karakter.');
    expect(passwordProblemMessage('not_text')).toBe('Password harus berupa teks.');
  });

  it('never quotes or measures the value, whatever the problem', () => {
    const secret = 'sandi-rahasia-yang-tidak-boleh-muncul'; // test-only
    for (const value of [secret, 'x', 12345678, pad(PASSWORD_MAX_LEN + 1)]) {
      const problem = passwordProblem(value);
      if (!problem) continue;
      const message = passwordProblemMessage(problem);
      expect(message).not.toContain(secret);
      expect(message).not.toContain(String(value));
    }
  });
});

describe('emailAuthUsable', () => {
  const realGetSettings = settingsMod.getSettings;
  const spy = spyOn(settingsMod, 'getSettings');
  afterEach(() => spy.mockRestore());

  const withSwitch = (emailAuthEnabled: boolean) =>
    spy.mockImplementation(async () => ({ ...(await realGetSettings()), emailAuthEnabled }));

  it('follows the runtime switch an operator flips in Pengaturan', async () => {
    withSwitch(true);
    expect(await emailAuthUsable()).toBe(true);
    withSwitch(false);
    expect(await emailAuthUsable()).toBe(false);
  });

  it('is false in production whatever the switch says, because the build policy wins', () => {
    // The gate asks `emailPasswordEnabled(isProd)` first; this is that half, which tests cannot
    // flip (`isProd` is read at module load). Production is Google-only (R12 F1).
    expect(emailPasswordEnabled(true)).toBe(false);
    expect(emailPasswordEnabled(false)).toBe(true);
  });
});
