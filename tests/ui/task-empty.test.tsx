/** Empty task list (S2-09, K8): first use explains where tasks come from; a filter offers "Hapus saringan". */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { TaskEmpty, type TaskEmptyVariant } from '../../app/components/tasks/TaskEmpty';
import { EMPTY_COPY } from '../../app/components/tasks/tasks.copy';

const render = (node: ReactNode) =>
  renderToStaticMarkup(
    <MantineProvider>
      <MemoryRouter>{node}</MemoryRouter>
    </MantineProvider>,
  );

const noop = () => {};
const empty = (variant: TaskEmptyVariant, filtered: boolean, createTo?: string | null) =>
  render(
    <TaskEmpty variant={variant} filtered={filtered} onResetFilters={noop} createTo={createTo} />,
  );

describe('TaskEmpty — first use', () => {
  it.each([
    ['mine', EMPTY_COPY.mineTitle, EMPTY_COPY.mineHint],
    ['all', EMPTY_COPY.allTitle, EMPTY_COPY.allHint],
    ['project', EMPTY_COPY.projectTitle, EMPTY_COPY.projectHint],
  ] as const)('%s says there are no tasks yet', (variant, title, hint) => {
    const html = empty(variant, false);
    expect(html).toContain(title);
    expect(html).toContain(hint);
    expect(html).not.toContain(EMPTY_COPY.filteredTitle);
    expect(html).not.toContain(EMPTY_COPY.resetFilters);
  });

  it('links to the task form only when the server allows creating', () => {
    expect(empty('all', false, '/app/tasks/baru')).toMatch(
      /href="\/app\/tasks\/baru"[^>]*>[\s\S]*?Tugas baru/,
    );
    const hidden = empty('all', false, null);
    expect(hidden).not.toContain(EMPTY_COPY.create);
    expect(hidden).not.toContain('<a');
  });

  it('uses the project wording on a project tab', () => {
    expect(empty('project', false, '/app/projects/p-1/tasks/baru')).toContain(
      EMPTY_COPY.createInProject,
    );
  });
});

describe('TaskEmpty — filtered', () => {
  it.each(['mine', 'all', 'project'] as const)(
    '%s says nothing matches and offers to clear the filters',
    (variant) => {
      const html = empty(variant, true, '/app/tasks/baru');
      expect(html).toContain(EMPTY_COPY.filteredTitle);
      expect(html).toContain(EMPTY_COPY.filteredHint);
      expect(html).toMatch(/<button[\s\S]*?Hapus saringan/);
      // No "create" link: the tasks exist, the filter hides them.
      expect(html).not.toContain(EMPTY_COPY.create);
      expect(html).not.toContain(EMPTY_COPY.mineTitle);
    },
  );
});
