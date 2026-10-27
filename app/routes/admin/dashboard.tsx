import { SimpleGrid, Stack } from '@mantine/core';
import type { OverviewData } from '@server/admin/overview/overview.dto';
import { getOverview } from '@server/admin/overview/overview.service';
import { requireAnyRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { AntreanWidget } from '~/components/admin/home/antrean';
import { OVERVIEW_COPY } from '~/components/admin/home/overview.copy';
import {
  AgendaWidget,
  LateTasksWidget,
  MembersWidget,
  ProjectsWidget,
  RoleChangesWidget,
} from '~/components/admin/home/overview.widgets';
import { PageHeader } from '~/components/ui/PageHeader';
import { type OverviewSeed, useOverview } from '~/lib/admin-overview-api';
import { useApp } from '~/lib/app-context';
import { useSession } from '~/lib/auth-client';
import { toJson } from '~/lib/loader-json';
import type { Route } from './+types/dashboard';

export function meta() {
  return [{ title: 'Dashboard — Simple PM' }];
}

/** Guarded here too: layout and page loaders run in parallel, so the layout guard alone would not cover this data. */
export async function loader({ request }: Route.LoaderArgs) {
  await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  const overview = await getOverview();
  const seed: OverviewSeed = { data: toJson<OverviewData>(overview), loadedAt: Date.now() };
  return { seed };
}

/**
 * Admin Beranda (P11 AD-14/AD-15): the whole screen from one soft-failing call, so an Admin lands on
 * six real answers to "ada yang perlu aku tangani hari ini?" — pending approvals, members, projects
 * by status, overdue tasks, the nearest agenda and recent role changes. A section that fails shows
 * its own "Coba lagi" while the rest stay readable; the grid stacks to one column at 375 px.
 */
export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { user: ctxUser } = useApp();
  const { data } = useSession();
  const user = data?.user ?? ctxUser;
  const overview = useOverview(loaderData.seed);
  const d = overview.data;
  const retry = { onRetry: () => void overview.refetch(), retrying: overview.isFetching };

  return (
    <Stack gap="md" p={{ base: 'sm', md: 'md' }}>
      <PageHeader
        title={OVERVIEW_COPY.title}
        description={
          <>
            {OVERVIEW_COPY.description} Masuk sebagai <b>{user.email}</b>.
          </>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        <AntreanWidget widget={d.pending} retry={retry} />
        <MembersWidget widget={d.members} retry={retry} />
        <ProjectsWidget widget={d.projects} retry={retry} />
        <LateTasksWidget widget={d.overdue} retry={retry} />
        <AgendaWidget widget={d.agenda} retry={retry} timeZone={d.now.timeZone} />
        <RoleChangesWidget widget={d.roles} retry={retry} />
      </SimpleGrid>
    </Stack>
  );
}
