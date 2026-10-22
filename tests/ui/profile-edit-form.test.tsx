/** Pengaturan › Ubah profil: saved values fill the six fields, the email is read-only, Batal and Simpan sit under them. */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { PROFILE_FORM_COPY } from '../../app/components/account/account.copy';
import { ProfileEditForm } from '../../app/components/account/ProfileEditForm';
import type { MyProfile } from '../../app/lib/profile-api';
import { PHONE_FORMAT_ERROR } from '../../server/profile/profile.rules';

const PROFILE: MyProfile = {
  userId: 'u1',
  name: 'Budi Google', // test-only
  email: 'budi@example.test', // test-only
  displayName: 'Budi Santoso', // test-only
  nickname: 'Bud', // test-only
  phone: '0812', // test-only
  jobTitle: 'Bendahara',
  department: 'Keuangan',
  textSize: 'normal',
};

/** The form uses router links and navigate, so it renders inside a static data router. */
async function render(profile: MyProfile) {
  const node = (
    <QueryClientProvider client={new QueryClient()}>
      <ProfileEditForm profile={profile} image={null} onPhotoChanged={() => undefined} />
    </QueryClientProvider>
  );
  const handler = createStaticHandler([{ id: 'root', path: '/', Component: () => node }]);
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

describe('ProfileEditForm', () => {
  it('fills the fields from the saved profile and keeps the email read-only', async () => {
    const html = await render(PROFILE);
    for (const value of [
      'Budi Santoso',
      'Bud',
      '0812',
      'Bendahara',
      'Keuangan',
      'budi@example.test',
    ]) {
      expect(html).toContain(`value="${value}"`);
    }
    const email = html.match(/<input[^>]*value="budi@example.test"[^>]*>/)?.[0] ?? '';
    expect(email).toContain('readOnly');
    expect(html).not.toContain(PHONE_FORMAT_ERROR);
  });

  it('labels every field and offers the way back, Batal and a Simpan that waits for a change', async () => {
    const html = await render(PROFILE);
    for (const label of [
      PROFILE_FORM_COPY.name,
      PROFILE_FORM_COPY.nickname,
      PROFILE_FORM_COPY.jobTitle,
      PROFILE_FORM_COPY.department,
      PROFILE_FORM_COPY.phone,
      PROFILE_FORM_COPY.email,
      PROFILE_FORM_COPY.changePhoto,
      PROFILE_FORM_COPY.back,
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('href="/app/settings"');
    expect(html).toMatch(/<button[^>]*disabled[^>]*>(?:(?!<\/button>).)*Simpan/s);
  });

  it('flags a legacy phone number that holds letters', async () => {
    expect(await render({ ...PROFILE, phone: 'abc' })).toContain(PHONE_FORMAT_ERROR);
  });
});
