/** Pengaturan › Akun saya: name, job title · division, phone and email, and the link to Ubah profil. */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { AccountSummaryCard } from '../../app/components/account/AccountSummaryCard';
import { ACCOUNT_COPY } from '../../app/components/account/account.copy';
import type { MyProfile } from '../../app/lib/profile-api';

const PROFILE: MyProfile = {
  userId: 'u1',
  name: 'Nico Bip', // test-only
  email: 'nico@example.test', // test-only
  displayName: null,
  nickname: null,
  phone: '0812-3456-7890', // test-only
  jobTitle: 'Manajer Proyek',
  department: 'Produk',
  textSize: 'normal',
};

async function render(profile: MyProfile) {
  const handler = createStaticHandler([
    {
      id: 'root',
      path: '/',
      Component: () => <AccountSummaryCard profile={profile} image={null} />,
    },
  ]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  return renderToString(
    <MantineProvider>
      <StaticRouterProvider
        router={createStaticRouter(handler.dataRoutes, context)}
        context={context}
        hydrate={false}
      />
    </MantineProvider>,
  );
}

describe('AccountSummaryCard', () => {
  it('shows the account name, job title · division and phone with email, and links to Ubah profil', async () => {
    const html = await render(PROFILE);
    expect(html).toContain('Nico Bip');
    expect(html).toContain('Manajer Proyek · Produk');
    expect(html).toContain('HP 0812-3456-7890 · nico@example.test');
    expect(html).toContain('href="/app/settings/profile"');
    expect(html).toContain(ACCOUNT_COPY.edit);
  });

  it('prefers the display name, and says what is missing instead of leaving a blank', async () => {
    const html = await render({
      ...PROFILE,
      displayName: 'Nico Pratama', // test-only
      jobTitle: null,
      department: null,
      phone: null,
    });
    expect(html).toContain('Nico Pratama');
    expect(html).toContain(ACCOUNT_COPY.noJobTitle);
    expect(html).not.toContain('HP ');
  });
});
