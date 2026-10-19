import { Button, Group } from '@mantine/core';
import { requireUser } from '@server/guard';
import { METRICS } from '@server/metrics/config';
import { isoDateIn } from '@server/metrics/dates';
import { toPrincipal } from '@server/project/membership.query';
import type { ProjectDetail } from '@server/project/project.dto';
import { getProjectDetail } from '@server/project/project.query';
import { data, NavLink, Outlet, useMatch, useResolvedPath } from 'react-router';
import { ProjectHeader } from '~/components/projects/ProjectHeader';
import {
  NOT_FOUND_TEXT,
  PROJECT_TABS,
  PROJECT_TABS_LABEL,
} from '~/components/projects/projects.copy';
import { PageContainer } from '~/components/ui/PageContainer';
import { toJson } from '~/lib/loader-json';
import type { Route } from './+types/layout';

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.project.name ?? 'Proyek'} — Simple PM` }];
}

// Children guard and load themselves too: loaders run in parallel, so this guard alone would not protect them.
export async function loader({ request, params }: Route.LoaderArgs) {
  const actor = await requireUser(request);
  const now = new Date();
  const project = await getProjectDetail(toPrincipal(actor), params.projectId, now);
  // Missing, trashed and hidden projects answer the same 404 (D8), like the API does.
  if (!project) throw data(NOT_FOUND_TEXT, { status: 404 });
  return {
    project: toJson<ProjectDetail>(project),
    // "Today" is decided on the server so the due note matches the server's condition.
    today: isoDateIn(now, METRICS.TIME_ZONE),
  };
}

const TABS = [
  { to: '', label: PROJECT_TABS.summary, end: true },
  { to: 'tasks', label: PROJECT_TABS.tasks, end: false },
  { to: 'phases', label: PROJECT_TABS.phases, end: false },
  { to: 'members', label: PROJECT_TABS.members, end: false },
] as const;

function Tab({ to, label, end }: (typeof TABS)[number]) {
  const path = useResolvedPath(to);
  const active = useMatch({ path: path.pathname, end }) !== null;
  return (
    <Button component={NavLink} to={to} end={end} variant={active ? 'light' : 'subtle'}>
      {label}
    </Button>
  );
}

/** Header plus the Ringkasan · Tugas · Tahapan · Anggota tabs around the active tab's page. */
export default function ProjectLayout({ loaderData }: Route.ComponentProps) {
  const { project, today } = loaderData;
  return (
    <PageContainer>
      <ProjectHeader project={project} today={today} />
      <Group component="nav" aria-label={PROJECT_TABS_LABEL} gap="xs" wrap="wrap">
        {TABS.map((t) => (
          <Tab key={t.label} {...t} />
        ))}
      </Group>
      <Outlet />
    </PageContainer>
  );
}
