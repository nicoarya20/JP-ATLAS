import { Button, Group } from '@mantine/core';
import { Link, useLocation } from 'react-router';
import { DETAIL_COPY } from './project-detail.copy';

const TABS = [
  { to: '', label: DETAIL_COPY.tabs.summary },
  { to: 'tasks', label: DETAIL_COPY.tabs.tasks },
  { to: 'phases', label: DETAIL_COPY.tabs.phases },
  { to: 'members', label: DETAIL_COPY.tabs.members },
] as const;

/** The four sections of a project (flow ⑦-⑩); the current one is marked for screen readers too. */
export function ProjectTabs({ projectId }: { projectId: string }) {
  const { pathname } = useLocation();
  const base = `/app/projects/${encodeURIComponent(projectId)}`;
  const here = pathname.replace(/\/$/, '');
  return (
    <Group component="nav" aria-label={DETAIL_COPY.tabsLabel} gap="xs" wrap="wrap">
      {TABS.map((t) => {
        const href = t.to ? `${base}/${t.to}` : base;
        const active = here === href;
        return (
          <Button
            key={t.label}
            component={Link}
            to={href}
            variant={active ? 'light' : 'subtle'}
            aria-current={active ? 'page' : undefined}
          >
            {t.label}
          </Button>
        );
      })}
    </Group>
  );
}
