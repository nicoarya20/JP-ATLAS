import { SimpleGrid, Stack } from '@mantine/core';
import { requireUser } from '@server/guard';
import { greetingName } from '@server/profile/profile.greeting';
import { getProfile } from '@server/profile/profile.service';
import { HomeAgenda } from '~/components/home/HomeAgenda';
import { HomeAskData } from '~/components/home/HomeAskData';
import { HomeBriefing } from '~/components/home/HomeBriefing';
import { HomeCounters } from '~/components/home/HomeCounters';
import { HomeFocus } from '~/components/home/HomeFocus';
import { HomeRecent } from '~/components/home/HomeRecent';
import { TODAY_LABEL } from '~/components/home/home.dummy';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/home';

export function meta() {
  return [{ title: 'Beranda — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const auth = await requireUser(request);
  const profile = await getProfile(auth.user.id);
  return { greeting: profile ? greetingName(profile) : 'pengguna' };
}

/** Beranda with hardcoded dummy data (see home.dummy.ts) until S3 wires the real queries. */
export default function AppHome({ loaderData }: Route.ComponentProps) {
  return (
    <PageContainer>
      <PageHeader
        title="Beranda"
        description={`${TODAY_LABEL} · Selamat pagi, ${loaderData.greeting}`}
      />
      <HomeBriefing />
      <HomeCounters />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" style={{ alignItems: 'start' }}>
        <Stack gap="md">
          <HomeFocus />
          <HomeRecent />
        </Stack>
        <Stack gap="md">
          <HomeAskData />
          <HomeAgenda />
        </Stack>
      </SimpleGrid>
    </PageContainer>
  );
}
