import { Stack } from '@mantine/core';
import { requireAnyRole } from '@server/guard';
import { ROLES } from '@server/permissions';
import { toPrincipal } from '@server/project/membership.query';
import { listProjects } from '@server/project/project.query';
import { AdminProjectsView } from '~/components/admin/projects/AdminProjectsView';
import { ChangeManagerPanel } from '~/components/admin/projects/ChangeManagerPanel';
import { ADMIN_PROJECTS_COPY } from '~/components/admin/projects/projects.copy';
import { PageHeader } from '~/components/ui/PageHeader';
import { ADMIN_PROJECTS_LIMIT, type AdminProjectsResponse } from '~/lib/admin-projects-api';
import { toJson } from '~/lib/loader-json';
import type { Route } from './+types/projects';

export function meta() {
  return [{ title: 'Proyek — Simple PM' }];
}

/**
 * SSR the first page with the same `listProjects` call the API uses, so the table paints before the
 * client query runs. Guarded here, not only in the layout: React Router runs the two loaders in
 * parallel (tests/admin-routes.test.ts).
 */
export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireAnyRole(request, [ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  const { items, total } = await listProjects(toPrincipal(actor), {
    scope: 'all',
    sort: 'recent',
    limit: ADMIN_PROJECTS_LIMIT,
    offset: 0,
    now: new Date(),
  });
  return {
    first: toJson<AdminProjectsResponse>({ items, total, page: 1, limit: ADMIN_PROJECTS_LIMIT }),
    loadedAt: Date.now(),
  };
}

export default function AdminProjectsPage({ loaderData }: Route.ComponentProps) {
  return (
    <Stack gap="md" p={{ base: 'sm', md: 'md' }}>
      <PageHeader
        title={ADMIN_PROJECTS_COPY.title}
        description={ADMIN_PROJECTS_COPY.description}
      />
      <AdminProjectsView
        first={loaderData.first}
        loadedAt={loaderData.loadedAt}
        renderManagerAction={(item, onDone) => <ChangeManagerPanel project={item} onDone={onDone} />}
      />
    </Stack>
  );
}
