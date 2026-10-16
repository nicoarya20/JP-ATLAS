import { SimpleGrid, Stack } from '@mantine/core';
import { requireUser } from '@server/guard';
import { HomeAgenda } from '~/components/home/HomeAgenda';
import { HomeAskData } from '~/components/home/HomeAskData';
import { HomeBriefing } from '~/components/home/HomeBriefing';
import { HomeCounters } from '~/components/home/HomeCounters';
import { HomeFocus } from '~/components/home/HomeFocus';
import { HomeRecent } from '~/components/home/HomeRecent';
import { TODAY_LABEL } from '~/components/home/home.dummy';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { useApp } from '~/lib/app-context';
import type { Route } from './+types/home';

export function meta() {
  return [{ title: 'Beranda — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Beranda with hardcoded dummy data (see home.dummy.ts) until S3 wires the real queries. */
export default function AppHome() {
  const { user } = useApp();

  return (
    <PageContainer>
      <PageHeader
        title="Beranda"
        description={`${TODAY_LABEL} · Selamat pagi, ${user.name || 'pengguna'}`}
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
