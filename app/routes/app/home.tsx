import { SimpleGrid } from '@mantine/core';
import { requireUser } from '@server/guard';
import { HomeSide } from '~/components/home/HomeSide';
import { HomeStats } from '~/components/home/HomeStats';
import { HomeTasks } from '~/components/home/HomeTasks';
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
        title={`Halo, ${user.name || 'pengguna'}`}
        description="Ringkasan pekerjaan Anda hari ini. Data di halaman ini masih contoh."
      />
      <HomeStats />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <HomeTasks />
        <HomeSide />
      </SimpleGrid>
    </PageContainer>
  );
}
