import { Text } from '@mantine/core';
import { requireUser } from '@server/guard';
import { useMemo, useState } from 'react';
import { ProjectsGantt } from '~/components/projects/ProjectsGantt';
import { ProjectsGrid, ProjectsList } from '~/components/projects/ProjectsList';
import { ProjectsToolbar, type ProjectView } from '~/components/projects/ProjectsToolbar';
import {
  PROJECTS,
  type ProjectSort,
  type StatusFilter,
} from '~/components/projects/projects.dummy';
import { filterProjects } from '~/components/projects/projects.filter';
import type { Zoom } from '~/components/projects/projects.gantt';
import { PageContainer } from '~/components/ui/PageContainer';
import { PageHeader } from '~/components/ui/PageHeader';
import type { Route } from './+types/projects';

export function meta() {
  return [{ title: 'Proyek — Simple PM' }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

/** Project list with hardcoded dummy data (projects.dummy.ts) until S1 wires the real query. */
export default function ProjectsPage() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<ProjectSort>('due');
  const [view, setView] = useState<ProjectView>('list');
  const [zoom, setZoom] = useState<Zoom>('week');
  const rows = useMemo(() => filterProjects(PROJECTS, q, status, sort), [q, status, sort]);

  return (
    <PageContainer>
      <PageHeader title="Proyek" />
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
