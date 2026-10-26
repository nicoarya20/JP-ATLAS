/**
 * "Buat password" in /app/settings (SET): the form rules and copy, the client call, and the wiring
 * the static render cannot show (the button's pending state, and the refetch that swaps the card for
 * the change form without a reload). The rendered markup is covered by `security-cards.test.tsx`.
 */
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import {
  canSubmitCreatePassword,
  createPasswordErrors,
  createPasswordSuccessMessage,
} from '../../app/lib/password-form';
import { createMyPassword } from '../../app/lib/profile-api';

const GOOD = 'rahasia-panjang-2026'; // test-only
const read = (f: string) => readFileSync(f, 'utf8');

describe('createPasswordErrors / canSubmitCreatePassword', () => {
  test('an untouched form is not red and not submittable', () => {
    expect(createPasswordErrors('', '')).toEqual({ next: null, confirm: null });
    expect(canSubmitCreatePassword('', '')).toBe(false);
  });

  test('flags a short password and a mismatched confirmation, each under its own field', () => {
    expect(createPasswordErrors('pendek1', 'pendek1').next).toBe('Minimal 8 karakter');
    expect(createPasswordErrors(GOOD, `${GOOD}x`)).toEqual({
      next: null,
      confirm: 'Konfirmasi tidak sama',
    });
    expect(canSubmitCreatePassword('pendek1', 'pendek1')).toBe(false);
    expect(canSubmitCreatePassword(GOOD, `${GOOD}x`)).toBe(false);
  });

  test('is submittable once both fields match at the minimum length', () => {
    expect(createPasswordErrors(GOOD, GOOD)).toEqual({ next: null, confirm: null });
    expect(canSubmitCreatePassword(GOOD, GOOD)).toBe(true);
    expect(canSubmitCreatePassword('12345678', '12345678')).toBe(true); // test-only
  });

  test('never asks for a password different from the current one (there is none)', () => {
    expect(JSON.stringify(createPasswordErrors(GOOD, GOOD))).not.toContain('berbeda');
  });
});

describe('createPasswordSuccessMessage', () => {
  test('says the other devices were signed out and this one was not', () => {
    const msg = createPasswordSuccessMessage(true);
    expect(msg).toContain('Perangkat lain telah dikeluarkan');
    expect(msg).toContain('perangkat ini tetap masuk');
  });

  test('admits it when the revoke failed, instead of claiming it happened', () => {
    const msg = createPasswordSuccessMessage(false);
    expect(msg).toContain('belum bisa dikeluarkan');
    expect(msg).toContain('Perangkat');
    expect(msg).not.toContain('telah dikeluarkan');
  });
});

describe('createMyPassword', () => {
  const fetchSpy = spyOn(globalThis, 'fetch');
  afterEach(() => fetchSpy.mockReset());

  test('POSTs the password as JSON to the own-profile route', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, otherSessionsRevoked: true }), { status: 200 }),
    );
    expect(await createMyPassword(GOOD)).toEqual({ ok: true, otherSessionsRevoked: true });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/app/profile/password');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ newPassword: GOOD }));
  });

  test('surfaces the server sentence, so a refusal is never a silent failure', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: 'Akun ini sudah punya password.' }), { status: 409 }),
    );
    await expect(createMyPassword(GOOD)).rejects.toThrow('Akun ini sudah punya password.');
  });

  test('falls back to an actionable Indonesian message when the body is not JSON', async () => {
    fetchSpy.mockResolvedValue(new Response('boom', { status: 502 }));
    await expect(createMyPassword(GOOD)).rejects.toThrow(
      'Gagal membuat password (502). Coba lagi.',
    );
  });
});

// The static renderer cannot press a button, so these two assertions guard the wiring instead of
// the pixels: without them a regression would leave the owner with no feedback and a stale card.
describe('wiring the static render cannot show', () => {
  test('the submit button follows the mutation, so it spins for the whole request', () => {
    const src = read('app/components/profile/CreatePasswordCard.tsx');
    expect(src).toContain('loading={create.isPending}');
    expect(src).toContain('disabled={!canSubmitCreatePassword(next, confirm)}');
  });

  test('success refetches the linked accounts, so the card becomes the change form at once', () => {
    const src = read('app/components/account/AdvancedSettings.tsx');
    expect(src).toMatch(/onChanged=\{\(\) => \{[\s\S]*accounts\.refetch\(\)[\s\S]*\}\}/);
    expect(src).toMatch(/onChanged=\{\(\) => \{[\s\S]*sessions\.refetch\(\)[\s\S]*\}\}/);
    // `hasPassword` comes from those accounts, which is what makes the swap happen.
    expect(src).toContain('hasPasswordAccount(accounts.data ?? [])');
  });
});
