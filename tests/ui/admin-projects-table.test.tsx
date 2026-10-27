/**
 * Admin project table (P11 AD-12): renders every project with its Pengelola, shows the dash when a
 * project has no lead, and tells an empty organization apart from an empty filter result.
 */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type { ProjectListItem } from '@server/project/project.dto';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminProjectsTable } from '../../app/components/admin/projects/AdminProjectsTable';
import { ADMIN_PROJECTS_COPY } from '../../app/components/admin/projects/projects.copy';
import { PROJECT_STATUS_LABELS } from '../../app/lib/pm-labels';

const render = (node: ReactNode): string =>
  renderToStaticMarkup(<MantineProvider>{node}</MantineProvider>);

const item = (over: Partial<ProjectListItem> = {}): ProjectListItem => ({
  id: 'p-1',
  name: 'Renovasi Dapur',
  status: 'active',
  priority: 'medium',
  lead: { id: 'u-1', name: 'Dodi' },
  startDate: '2026-10-01',
  dueDate: '2026-10-31',
  progress: { done: 1, total: 6, percent: 17 },
  condition: { level: 'at_risk', reason: '1 tugas penting terlambat' },
  myRole: null,
  ...over,
});

const table = (items: ProjectListItem[], filtered = false) =>
  render(
    <AdminProjectsTable
      items={items}
      onOpen={() => undefined}
      filtered={filtered}
      onResetFilters={() => undefined}
    />,
  );

describe('AdminProjectsTable', () => {
  it('renders each project with its name, status and Pengelola name', () => {
    const html = table([item(), item({ id: 'p-2', name: 'Migrasi Server', lead: { id: 'u-2', name: 'Rina' } })]);
    expect(html).toContain('Renovasi Dapur');
    expect(html).toContain('Migrasi Server');
    // Lead names (both desktop table and mobile card render them).
    expect(html).toContain('Dodi');
    expect(html).toContain('Rina');
    expect(html).toContain(PROJECT_STATUS_LABELS.active.label);
  });

  it('shows the "no manager" fallback when a project has no lead', () => {
    const html = table([item({ lead: null })]);
    expect(html).toContain(ADMIN_PROJECTS_COPY.noManager);
  });

  it('shows the empty-organization state when there are no projects and no filter', () => {
    const html = table([], false);
    expect(html).toContain(ADMIN_PROJECTS_COPY.emptyTitle);
    expect(html).toContain(ADMIN_PROJECTS_COPY.emptyDescription);
  });

  it('shows the filtered empty state (not the empty-org copy) when a filter hides everything', () => {
    const html = table([], true);
    // EmptyState swaps to the "no match" wording and offers a reset.
    expect(html).toContain('Tidak ada hasil yang cocok');
    expect(html).not.toContain(ADMIN_PROJECTS_COPY.emptyDescription);
  });
});
