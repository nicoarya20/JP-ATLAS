import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { PROJECT_STATUSES, type ProjectStatus } from '@server/pm/enums';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { ProgressVsTime } from '../../app/components/projects/ProgressVsTime';
import {
  isReadOnly,
  ProjectHeader,
  type ProjectHeaderData,
} from '../../app/components/projects/ProjectHeader';
import { ProjectSummary } from '../../app/components/projects/ProjectSummary';
import {
  BANNER_COPY,
  HEADER_COPY,
  LABEL_LEAD,
  SUMMARY_COPY,
} from '../../app/components/projects/projects.copy';
import { CONDITION_LABELS, PROJECT_STATUS_LABELS } from '../../app/lib/pm-labels';
import { taskKeys } from '../../app/lib/tasks-api';

const TODAY = '2026-10-07'; // test-only
const CLOCK = { now: Date.parse('2026-10-07T03:00:00.000Z'), timeZone: 'UTC' }; // test-only

/** Renders under a data router whose root loader supplies the clock, like the real app (DateText needs it). */
async function render(node: ReactNode): Promise<string> {
  const handler = createStaticHandler([
    { id: 'root', path: '/', loader: () => ({ clock: CLOCK }), Component: () => node },
  ]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  // The highlights card (S2-14) reads the task API; seed it empty (no `:projectId` at this path).
  const client = new QueryClient();
  client.setQueryData(taskKeys.highlights(''), []);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MantineProvider>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

const project = (over: Partial<ProjectHeaderData> = {}): ProjectHeaderData => ({
  id: 'p-1',
  name: 'Renovasi Dapur',
  status: 'active',
  condition: { level: 'at_risk', reason: '1 tugas penting terlambat' },
  lead: { id: 'u-1', name: 'Dodi' },
  dueDate: '2026-10-31',
  can: { update: true, createTask: true },
  taskCounts: { active: 5, overdue: 0, live: 6 },
  ...over,
});
const header = (over: Partial<ProjectHeaderData> = {}) =>
  render(<ProjectHeader project={project(over)} today={TODAY} />);

describe('ProjectHeader', () => {
  it('shows name, status, lead under LABEL_LEAD and the due date', async () => {
    const html = await header();
    expect(html).toContain('Renovasi Dapur');
    expect(html).toContain(PROJECT_STATUS_LABELS.active.label);
    expect(html).toContain(`${LABEL_LEAD}:`);
    expect(html).toContain('Dodi');
    expect(html).toContain('31 Okt 2026');
  });

  it.each([...PROJECT_STATUSES])(
    'has no Tahapan, Diperpanjang or Perpanjang (status %s)',
    async (s) => {
      const html = await header({ status: s });
      for (const cut of ['Tahapan', 'Diperpanjang', 'Perpanjang']) expect(html).not.toContain(cut);
    },
  );

  it('shows the condition and its reason while the project runs', async () => {
    const html = await header();
    expect(html).toContain(CONDITION_LABELS.at_risk.label);
    expect(html).toContain('1 tugas penting terlambat');
  });

  it.each(PROJECT_STATUSES.filter((s) => s !== 'active'))(
    'hides the condition when the status is %s',
    async (status) => {
      const html = await header({ status });
      expect(html).not.toContain(CONDITION_LABELS.at_risk.label);
      expect(html).not.toContain('1 tugas penting terlambat');
    },
  );

  it('links back to the project list, for everyone who can open the project', async () => {
    for (const can of [
      { update: true, createTask: true },
      { update: 'NOT_MANAGER', createTask: true },
      { createTask: true },
    ] as const) {
      const html = await header({ can });
      expect(html).toContain(HEADER_COPY.back);
      expect(html).toMatch(/<a [^>]*href="\/app\/projects"[^>]*>/);
    }
  });

  it('puts the way back before the title, so it is the first thing a reader reaches', async () => {
    const html = await header();
    expect(html.indexOf(HEADER_COPY.back)).toBeGreaterThan(-1);
    expect(html.indexOf(HEADER_COPY.back)).toBeLessThan(html.indexOf('Renovasi Dapur'));
  });

  it('offers the ⋯ menu only when the server allows editing', async () => {
    expect(await header()).toContain(`aria-label="${HEADER_COPY.menuLabel}"`);
    expect(await header({ can: { update: 'NOT_MANAGER', createTask: true } })).not.toContain(
      HEADER_COPY.menuLabel,
    );
    expect(await header({ can: { createTask: true } })).not.toContain(HEADER_COPY.menuLabel);
  });

  it('opens the ⋯ menu for Hapus proyek only when can.trash is true (not a Member-manager)', async () => {
    const pm = await header({ can: { update: 'NOT_MANAGER', trash: true, createTask: true } });
    expect(pm).toContain(`aria-label="${HEADER_COPY.menuLabel}"`);
    const memberManager = await header({
      can: { update: 'NOT_MANAGER', trash: 'ROLE_CANNOT_TRASH', createTask: true },
    });
    expect(memberManager).not.toContain(HEADER_COPY.menuLabel);
  });

  it('says when there is no lead or no due date', async () => {
    const html = await header({ lead: null, dueDate: null });
    expect(html).toContain(HEADER_COPY.noLead);
    expect(html).toContain(HEADER_COPY.noDue);
  });

  it.each(['completed', 'canceled', 'on_hold'] as ProjectStatus[])(
    'shows the Q12 note for a %s project',
    async (status) => {
      const note = BANNER_COPY.closed(PROJECT_STATUS_LABELS[status].label);
      expect(note).toMatch(/^Proyek ini sudah [a-z]+\. Tugas baru tetap boleh ditambahkan\.$/);
      expect(await header({ status })).toContain(note);
    },
  );

  it.each(['draft', 'active'] as ProjectStatus[])(
    'has no Q12 note for a %s project',
    async (status) => {
      expect(await header({ status })).not.toContain('Tugas baru tetap boleh ditambahkan');
    },
  );

  it('tells watchers and non-member PMs they can only look', async () => {
    const watcher = { can: { update: 'NOT_MANAGER', createTask: 'NOT_MEMBER' } } as const;
    expect(isReadOnly(watcher)).toBe(true);
    expect(await header(watcher)).toContain(BANNER_COPY.readOnly);
    expect(isReadOnly({ can: {} })).toBe(true);
    expect(await header()).not.toContain(BANNER_COPY.readOnly);
    expect(isReadOnly({ can: { createTask: true } })).toBe(false);
  });
});

describe('ProgressVsTime', () => {
  it('shows — for time when the project has no start or due date', async () => {
    const html = await render(<ProgressVsTime progress={{ done: 1, total: 6 }} elapsed={null} />);
    expect(html).toContain(SUMMARY_COPY.timeUnknown);
    expect(html).toContain(SUMMARY_COPY.timeUnknownHint);
    expect(html).toContain('1 dari 6 tugas selesai');
  });

  it('shows the elapsed share, and "lewat tenggat" once overrun', async () => {
    const running = await render(
      <ProgressVsTime progress={{ done: 0, total: 0 }} elapsed={{ percent: 40, overrun: false }} />,
    );
    expect(running).toContain(SUMMARY_COPY.timeUsed(40));
    expect(running).toContain('Belum ada tugas');
    const late = await render(
      <ProgressVsTime progress={{ done: 2, total: 4 }} elapsed={{ percent: 100, overrun: true }} />,
    );
    expect(late).toContain(SUMMARY_COPY.timeOverrun);
  });
});

describe('ProjectSummary', () => {
  const summary = (overdue: number) =>
    render(
      <ProjectSummary
        project={{
          progress: { done: 1, total: 6, percent: 17 },
          taskCounts: { active: 5, overdue, live: 6 },
        }}
        elapsed={null}
      />,
    );

  it('counts overdue tasks and keeps the highlights card as an empty state', async () => {
    const html = await summary(2);
    expect(html).toContain(`${SUMMARY_COPY.overdueTitle}: 2`);
    expect(html).toContain(SUMMARY_COPY.overdueSome(2));
    expect(html).toContain(SUMMARY_COPY.highlightsEmpty);
    expect(html).toContain('17%');
  });

  it('says plainly when nothing is overdue', async () => {
    expect(await summary(0)).toContain(SUMMARY_COPY.overdueNone);
  });
});
