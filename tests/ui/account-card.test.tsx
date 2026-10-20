/** Pengaturan › Profil: saved values fill the fields, the email is read-only, a bad legacy phone is flagged. */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { AccountCard } from '../../app/components/account/AccountCard';
import type { MyProfile } from '../../app/lib/profile-api';
import { PHONE_FORMAT_ERROR } from '../../server/profile/profile.rules';

const PROFILE: MyProfile = {
  userId: 'u1',
  name: 'Budi Google', // test-only
  email: 'budi@example.test', // test-only
  displayName: 'Budi Santoso', // test-only
  phone: '0812', // test-only
  jobTitle: 'Bendahara',
  department: 'Keuangan',
  textSize: 'normal',
};

const render = (profile: MyProfile) =>
  renderToString(
    <MantineProvider>
      <QueryClientProvider client={new QueryClient()}>
        <AccountCard profile={profile} image={null} onSaved={() => undefined} />
      </QueryClientProvider>
    </MantineProvider>,
  );

describe('AccountCard', () => {
  it('fills the fields from the saved profile and keeps the email read-only', () => {
    const html = render(PROFILE);
    for (const value of ['Budi Santoso', '0812', 'Bendahara', 'Keuangan', 'budi@example.test']) {
      expect(html).toContain(`value="${value}"`);
    }
    const email = html.match(/<input[^>]*value="budi@example.test"[^>]*>/)?.[0] ?? '';
    expect(email).toContain('readOnly');
    expect(html).not.toContain(PHONE_FORMAT_ERROR);
  });

  it('keeps "Simpan profil" disabled until something changes', () => {
    expect(render(PROFILE)).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Simpan profil/);
  });

  it('flags a phone number saved before the format rule and blocks saving it as is', () => {
    const html = render({ ...PROFILE, phone: 'nanti saya isi' });
    expect(html).toContain(PHONE_FORMAT_ERROR);
  });
});
