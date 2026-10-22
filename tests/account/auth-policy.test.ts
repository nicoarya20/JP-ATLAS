import { describe, expect, test } from 'bun:test';
import { emailPasswordEnabled, isEmailSignUpPath } from '../../server/account/auth-policy';

describe('emailPasswordEnabled', () => {
  test('is on outside production', () => {
    expect(emailPasswordEnabled(false)).toBe(true);
  });

  test('is off in production', () => {
    expect(emailPasswordEnabled(true)).toBe(false);
  });
});

describe('isEmailSignUpPath', () => {
  test.each([
    '/sign-up/email',
    '/api/auth/sign-up/email',
    '/api/auth/sign-up/email/',
    '/api/auth/sign-up/email?callbackURL=/go',
    '/API/Auth/Sign-Up/Email',
    '/api/auth/sign-up/email#frag',
  ])('matches %s', (path) => {
    expect(isEmailSignUpPath(path)).toBe(true);
  });

  test.each([
    '/sign-in/email',
    '/api/auth/sign-in/email',
    '/sign-in/social',
    '/callback/google',
    '/api/auth/sign-up/email-verified',
    '/api/auth/update-user',
    '/api/auth/sign-up',
    '',
  ])('does not match %s', (path) => {
    expect(isEmailSignUpPath(path)).toBe(false);
  });

  test('treats missing paths as non-matching', () => {
    expect(isEmailSignUpPath(undefined)).toBe(false);
    expect(isEmailSignUpPath(null)).toBe(false);
  });
});
