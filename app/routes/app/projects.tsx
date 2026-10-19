import { Button, Text } from '@mantine/core';
import { requireUser } from '@server/guard';
import { toPrincipal } from '@server/project/membership.query';
import { useMemo, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { Link } from 'react-router';
import { ProjectsGantt } from '~/components/projects/ProjectsGantt';
import { ProjectsGrid, ProjectsList } from '~/components/projects/ProjectsList';
import { ProjectsToolbar, type ProjectView } from '~/components/projects/ProjectsToolbar';
import { FORM_COPY } from '~/components/projects/project-form.copy';
import { dummyProjectAccess } from '~/components/projects/projects.access';
import type { ProjectSort, StatusFilter } from '~/components/projects/projects.dummy';
import { filterProjects } from '~/components/projects/projects.filter';
import type { Zoom } from '~/components/projects/projects.gantt';
import { useProjects } from '~/components/projects/projects.store';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/projects';

export function meta() {
  return [{ title: 'Proyek — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  // The server's own policy decides who sees "Buat proyek"; a Member does not.
  return { access: dummyProjectAccess(toPrincipal(actor)) };
}

/** Project list over the in-memory dummy store (projects.store.ts) until S1 wires the real query. */
export default function ProjectsPage({ loaderData }: Route.ComponentProps) {
  const projects = useProjects();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<ProjectSort>('due');
  const [view, setView] = useState<ProjectView>('list');
  const [zoom, setZoom] = useState<Zoom>('week');
  const rows = useMemo(
    () => filterProjects(projects, q, status, sort),
    [projects, q, status, sort],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Proyek"
        actions={
          loaderData.access.canCreate && (
            <Button
              component={Link}
              to="/app/projects/new"
              leftSection={<FiPlus size="1.25em" aria-hidden />}
            >
              {FORM_COPY.create}
            </Button>
          )
        }
      />
      <ProjectsToolbar
        q={q}
        onQ={setQ}
        status={status}
        onStatus={setStatus}
        sort={sort}
        onSort={setSort}
        view={view}
        onView={setView}
      />
      {view === 'list' && <ProjectsList rows={rows} />}
      {view === 'grid' && <ProjectsGrid rows={rows} />}
      {view === 'gantt' && <ProjectsGantt rows={rows} zoom={zoom} onZoom={setZoom} />}
      <Text size="xs" c="dimmed">
        {`${rows.length === 0 ? 0 : `1–${rows.length}`} dari ${rows.length} proyek · hanya proyek yang Anda ikuti`}
      </Text>
    </PageContainer>
  );
}
