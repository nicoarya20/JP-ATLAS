import { Alert, Button, SimpleGrid, Stack } from '@mantine/core';
import { requireUser } from '@server/guard';
import { getHome } from '@server/home/home.service';
import { greetingName } from '@server/profile/profile.greeting';
import { getProfile } from '@server/profile/profile.service';
import { toPrincipal } from '@server/project/membership.query';
import { FiRefreshCw } from 'react-icons/fi';
import { HomeActivity } from '~/components/home/HomeActivity';
import { HomeAgenda } from '~/components/home/HomeAgenda';
import { HomeAskData } from '~/components/home/HomeAskData';
import { HomeBriefing } from '~/components/home/HomeBriefing';
import { HomeCounters } from '~/components/home/HomeCounters';
import { HomeDone } from '~/components/home/HomeDone';
import { HomeFocus } from '~/components/home/HomeFocus';
import { HOME_COPY } from '~/components/home/home.copy';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import { type HomeData, type HomeSeed, useHome } from '~/lib/home-api';
import { toJson } from '~/lib/loader-json';
import type { Route } from './+types/home';

export function meta() {
  return [{ title: 'Beranda — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const [profile, home] = await Promise.all([
    getProfile(actor.user.id),
    getHome(toPrincipal(actor)),
  ]);
  const seed: HomeSeed = { data: toJson<HomeData>(home), loadedAt: Date.now() };
  return { seed, name: profile ? greetingName(profile) : 'pengguna' };
}

/** Beranda: greeting, briefing, counters, focus, Ask Data, agenda, projects and activity, all from `GET /api/app/home`. */
export default function AppHome({ loaderData }: Route.ComponentProps) {
  const home = useHome(loaderData.seed);
  const data = home.data;
  const retry = { onRetry: () => void home.refetch(), retrying: home.isFetching };
  return (
    <PageContainer>
      <PageHeader
        title={HOME_COPY.title}
        description={`${data.now.dateLabel} · Selamat ${data.now.greeting}, ${loaderData.name}`}
      />
      {home.isError && (
        <Alert color="warn" role="alert" title={HOME_COPY.staleTitle}>
          <Button
            variant="light"
            leftSection={<FiRefreshCw size="1.25em" aria-hidden />}
            loading={home.isFetching}
            onClick={retry.onRetry}
          >
            {HOME_COPY.retry}
          </Button>
        </Alert>
      )}
      <HomeBriefing widget={data.briefing} retry={retry} />
      <HomeCounters widget={data.counters} retry={retry} />
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" style={{ alignItems: 'start' }}>
        <Stack gap="md">
          <HomeFocus
            widget={data.focus}
            counters={data.counters}
            today={data.now.today}
            retry={retry}
          />
          <HomeDone widget={data.done} retry={retry} />
        </Stack>
        <Stack gap="md">
          <HomeAskData widget={data.ask} retry={retry} />
          <HomeAgenda
            agenda={data.agenda}
            projects={data.projects}
            timeZone={data.now.timeZone}
            retry={retry}
          />
          <HomeActivity widget={data.activity} retry={retry} />
        </Stack>
      </SimpleGrid>
    </PageContainer>
  );
}
