/**
 * N06: the /dev/settings sign-up switch only hides the sign-up form on /login. It never closes
 * sign-up on the server, so its label must say exactly that (T-S1, "label jujur").
 */
import { afterAll, describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { loginAuthMode } from '../../app/lib/login-mode';
import { api } from '../../server/api';
import { db } from '../../server/db';
import { appSetting, user } from '../../server/db/schema';
import { upsertSettings } from '../../server/settings';

const CARD = path.join(import.meta.dir, '../../app/components/settings/AuthSettingsCard.tsx');
const email = `signup-switch-${crypto.randomUUID().slice(0, 8)}@example.test`;

afterAll(async () => {
  await db.delete(user).where(eq(user.email, email));
  await db.delete(appSetting).where(eq(appSetting.id, 'singleton'));
});

describe('sign-up switch (N06)', () => {
  test('switched off, the login screen hides the sign-up form', () => {
    expect(
      loginAuthMode(false, { emailAuthEnabled: true, signupEnabled: false }).signupEnabled,
    ).toBe(false);
  });

  test('switched off, the server still creates the account (held as pending)', async () => {
    await upsertSettings({ emailAuthEnabled: true, signupEnabled: false });
    const res = await api.handle(
      new Request('http://localhost/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: `pw-${crypto.randomUUID()}`, name: 'Switch' }), // test-only
      }),
    );
    expect(res.status).toBe(200);
    const [row] = await db.select().from(user).where(eq(user.email, email));
    expect(row.approvalStatus).toBe('pending');
  });

  test('the card says what the switch really does', () => {
    const src = readFileSync(CARD, 'utf8');
    expect(src).not.toContain('menutup app dari pendaftaran');
    expect(src).not.toContain('label="Pendaftaran publik"');
    expect(src).toContain('Tidak menutup pendaftaran di server');
  });
});
