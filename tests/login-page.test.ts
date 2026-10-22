import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { initialMode, loginAuthMode, modeCopy } from '../app/lib/login-mode';

const q = (s: string) => new URLSearchParams(s);

describe('initialMode', () => {
  test('defaults to signin', () => {
    expect(initialMode(q(''), true)).toBe('signin');
  });

  test('?mode=signup opens signup when allowed', () => {
    expect(initialMode(q('mode=signup'), true)).toBe('signup');
  });

  test('?mode=signup ignored when signup is disabled', () => {
    expect(initialMode(q('mode=signup'), false)).toBe('signin');
  });

  test('unknown mode values fall back to signin', () => {
    expect(initialMode(q('mode=admin'), true)).toBe('signin');
  });
});

describe('modeCopy', () => {
  test('signin copy points to signup', () => {
    const c = modeCopy('signin', 'Acme');
    expect(c.title).toBe('Masuk ke akunmu');
    expect(c.submit).toBe('Masuk');
    expect(c.switchPrompt).toBe('Belum punya akun?');
    expect(c.switchAction).toBe('Daftar');
    expect(c.subtitle).toContain('Acme');
  });

  test('signup copy points back to signin', () => {
    const c = modeCopy('signup', 'Acme');
    expect(c.title).toBe('Buat akun');
    expect(c.submit).toBe('Buat akun');
    expect(c.switchPrompt).toBe('Sudah punya akun?');
    expect(c.switchAction).toBe('Masuk');
    expect(c.subtitle).toContain('Acme');
  });
});

describe('loginAuthMode', () => {
  const settings = [
    { emailAuthEnabled: true, signupEnabled: true },
    { emailAuthEnabled: true, signupEnabled: false },
    { emailAuthEnabled: false, signupEnabled: true },
    { emailAuthEnabled: false, signupEnabled: false },
  ];

  test('production is Google-only whatever the saved settings say', () => {
    for (const s of settings) {
      expect(loginAuthMode(true, s)).toEqual({ emailAuthEnabled: false, signupEnabled: false });
    }
  });

  test('outside production the email setting decides', () => {
    expect(loginAuthMode(false, { emailAuthEnabled: true, signupEnabled: false })).toEqual({
      emailAuthEnabled: true,
      signupEnabled: false,
    });
    expect(loginAuthMode(false, { emailAuthEnabled: true, signupEnabled: true })).toEqual({
      emailAuthEnabled: true,
      signupEnabled: true,
    });
  });

  test('outside production sign-up needs email sign-in, so email off hides both', () => {
    expect(loginAuthMode(false, { emailAuthEnabled: false, signupEnabled: true })).toEqual({
      emailAuthEnabled: false,
      signupEnabled: false,
    });
  });

  test('?mode=signup cannot open sign-up in production', () => {
    const mode = loginAuthMode(true, { emailAuthEnabled: true, signupEnabled: true });
    expect(initialMode(q('mode=signup'), mode.signupEnabled)).toBe('signin');
  });
});

describe('modeCopy googleOnly', () => {
  test('keeps the title but points the subtitle at the Google button', () => {
    const c = modeCopy('signin', 'Acme', true);
    expect(c.title).toBe('Masuk ke akunmu');
    expect(c.subtitle).toBe('Masuk dengan akun Google Anda untuk memakai Acme.');
  });

  test('defaults to the form copy', () => {
    expect(modeCopy('signin', 'Acme').subtitle).toBe(modeCopy('signin', 'Acme', false).subtitle);
    expect(modeCopy('signin', 'Acme').subtitle).toContain('Selamat datang kembali');
  });
});

describe('Google button wording (N13, GLO-14)', () => {
  test('says "Masuk dengan Google", as the glossary and wireframe do', () => {
    const src = readFileSync(
      path.join(import.meta.dir, '../app/components/login/LoginForm.tsx'),
      'utf8',
    );
    expect(src).toContain('Masuk dengan Google');
    expect(src).not.toContain('Lanjutkan dengan Google');
  });
});
