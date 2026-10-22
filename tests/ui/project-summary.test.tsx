import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type { PhaseDto } from '@server/project/project-plan.dto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { ProgressVsTime } from '../../app/components/projects/ProgressVsTime';
import { ProjectSummary } from '../../app/components/projects/ProjectSummary';
import { SUMMARY_COPY } from '../../app/components/projects/projects.copy';
import { ActivityList, ActivityRow } from '../../app/components/projects/summary/ActivityCard';
import { NextPhaseCard } from '../../app/components/projects/summary/NextPhaseCard';
import { PhaseStepper } from '../../app/components/projects/summary/PhaseStepper';
import { phasePercent } from '../../app/components/projects/summary/phase-view';
import { scheduleLine } from '../../app/components/projects/summary/schedule-line';
import {
  ACTIVITY_COPY,
  NEXT_PHASE_COPY,
  PHASE_STATUS_TEXT,
} from '../../app/components/projects/summary/summary.copy';
import type { ActivityItemDto } from '../../app/lib/project-deadline-api';
import { taskKeys } from '../../app/lib/tasks-api';

const TODAY = '2026-10-07'; // test-only
const CLOCK = { now: Date.parse('2026-10-07T03:00:00.000Z'), timeZone: 'UTC' }; // test-only

/** Renders under a data router with the root clock (DateText needs it) and the highlights seeded empty. */
async function render(node: ReactNode): Promise<string> {
  const handler = createStaticHandler([
    { id: 'root', path: '/', loader: () => ({ clock: CLOCK }), Component: () => node },
  ]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  const client = new QueryClient();
  client.setQueryData(taskKeys.highlights(''), []); // no `:projectId` at this path
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MantineProvider>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

/** Markup escapes `&`, so a title with one is compared in that form. */
const esc = (text: string) => text.replace(/&/g, '&amp;');

const phase = (over: Partial<PhaseDto> = {}): PhaseDto => ({
  id: 'ph-1',
  projectId: 'p-1',
  name: 'Perencanaan',
  description: null,
  position: 0,
  startDate: null,
  endDate: null,
  status: 'not_started',
  startedAt: null,
  finishedAt: null,
  taskCount: 0,
  doneCount: 0,
  ...over,
});
const PHASES = [
  phase({ id: 'a', name: 'Perencanaan', status: 'done', taskCount: 4, doneCount: 4 }),
  phase({ id: 'b', name: 'Pengembangan', status: 'in_progress', taskCount: 5, doneCount: 3 }),
  phase({ id: 'c', name: 'Peluncuran', status: 'not_started' }),
];
const MILESTONE = {
  id: 'm-1',
  projectId: 'p-1',
  phaseId: null,
  title: 'Rilis beta',
  description: null,
  dueDate: '2026-10-20', // test-only
  reachedAt: null,
};
const plan = (over = {}) => ({
  phases: PHASES,
  currentPhase: PHASES[1] ?? null,
  nextMilestone: MILESTONE,
  ...over,
});

const item = (over: Partial<ActivityItemDto> = {}): ActivityItemDto => ({
  id: 'act-1',
  action: 'deadline.extended',
  text: 'Nico memperpanjang tenggat 15 Okt → 31 Okt',
  actorId: 'u-1',
  actorName: 'Nico',
  createdAt: '2026-10-06T03:00:00.000Z', // test-only
  ...over,
});

describe('ProgressVsTime', () => {
  const bars = (over = {}) =>
    render(
      <ProgressVsTime
        progress={{ done: 1, total: 6 }}
        elapsed={null}
        startDate={null}
        dueDate={null}
        today={TODAY}
        {...over}
      />,
    );

  it('shows — for time when the project has no start or due date', async () => {
    const html = await bars();
    expect(html).toContain(SUMMARY_COPY.timeUnknown);
    expect(html).toContain(SUMMARY_COPY.timeUnknownHint);
    expect(html).toContain(SUMMARY_COPY.tasksLabel);
    expect(html).toContain('1 dari 6 tugas selesai');
    expect(html).not.toContain('Mulai ');
  });

  it('labels both bars and shows the running share, and "lewat tenggat" once overrun', async () => {
    const running = await bars({
      progress: { done: 0, total: 0 },
      elapsed: { percent: 60, overrun: false },
    });
    expect(running).toContain(SUMMARY_COPY.timeLabel);
    expect(running).toContain('60%');
    expect(running).toContain('Belum ada tugas');
    const late = await bars({ elapsed: { percent: 100, overrun: true } });
    expect(late).toContain(SUMMARY_COPY.timeOverrun);
  });

  it('adds "Mulai … · tenggat … · sisa N hari" under the bars', async () => {
    const html = await bars({ startDate: '2026-09-01', dueDate: '2026-10-31' });
    expect(html).toContain('Mulai 1 Sep 2026 · tenggat 31 Okt 2026 · sisa 24 hari');
  });
});

describe('scheduleLine', () => {
  it('counts days left, says today, and says how late', () => {
    const span = { startDate: null };
    expect(scheduleLine({ ...span, dueDate: '2026-10-31' }, TODAY)).toBe(
      'tenggat 31 Okt 2026 · sisa 24 hari',
    );
    expect(scheduleLine({ ...span, dueDate: TODAY }, TODAY)).toBe(
      'tenggat 7 Okt 2026 · tenggat hari ini',
    );
    expect(scheduleLine({ ...span, dueDate: '2026-10-05' }, TODAY)).toBe(
      'tenggat 5 Okt 2026 · terlambat 2 hari',
    );
  });

  it('is null without any date', () => {
    expect(scheduleLine({ startDate: null, dueDate: null }, TODAY)).toBeNull();
    expect(scheduleLine({ startDate: '2026-09-01', dueDate: null }, TODAY)).toBe(
      'Mulai 1 Sep 2026',
    );
  });
});

describe('phasePercent', () => {
  it('is null without tasks and never 100% before every task is done', () => {
    expect(phasePercent({ taskCount: 0, doneCount: 0 })).toBeNull();
    expect(phasePercent({ taskCount: 5, doneCount: 3 })).toBe(60);
    expect(phasePercent({ taskCount: 300, doneCount: 299 })).toBe(99);
    expect(phasePercent({ taskCount: 3, doneCount: 3 })).toBe(100);
  });
});

describe('PhaseStepper', () => {
  it('lists the phases in order, each with its name and a status word, not colour alone', async () => {
    const html = await render(<PhaseStepper phases={PHASES} />);
    const at = PHASES.map((p) => html.indexOf(p.name));
    expect(at.every((i) => i > -1)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    for (const word of Object.values(PHASE_STATUS_TEXT)) expect(html).toContain(word);
    expect(html).toContain(`aria-label="${NEXT_PHASE_COPY.stepperLabel}"`);
  });

  it('marks only the running phase as the current step and scrolls sideways inside its card', async () => {
    const html = await render(<PhaseStepper phases={PHASES} />);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html).toContain('overflow-x:auto');
  });
});

describe('NextPhaseCard', () => {
  const card = (props = {}) =>
    render(<NextPhaseCard projectId="p-1" plan={plan()} today={TODAY} canPlan={true} {...props} />);

  it('says which phase runs with its progress, and the next milestone with days left', async () => {
    const html = await card();
    expect(html).toContain(esc(NEXT_PHASE_COPY.title));
    expect(html).toContain('Sekarang: Pengembangan · 60%');
    expect(html).toContain('Milestone berikutnya: Rilis beta');
    expect(html).toContain('20 Okt 2026 · 13 hari lagi');
  });

  it('links to the Tahapan tab', async () => {
    const html = await card();
    expect(html).toMatch(
      /<a [^>]*href="\/app\/projects\/p-1\/phases"[^>]*>Lihat semua tahapan →<\/a>/,
    );
  });

  it('shows a late milestone as late', async () => {
    const late = plan({ nextMilestone: { ...MILESTONE, dueDate: '2026-10-05' } });
    expect(await card({ plan: late })).toContain('terlambat 2 hari');
  });

  it('explains a missing running phase and a missing milestone', async () => {
    const idle = plan({ currentPhase: null, nextMilestone: null });
    const html = await card({ plan: idle });
    expect(html).toContain(NEXT_PHASE_COPY.noCurrent);
    expect(html).toContain(NEXT_PHASE_COPY.noMilestone);
    const done = plan({
      phases: PHASES.map((p) => ({ ...p, status: 'done' as const })),
      currentPhase: null,
    });
    expect(await card({ plan: done })).toContain(NEXT_PHASE_COPY.allDone);
  });

  it('has an informative empty state, with a way to plan only for a manager', async () => {
    const empty = { phases: [], currentPhase: null, nextMilestone: null };
    const manager = await card({ plan: empty });
    expect(manager).toContain(NEXT_PHASE_COPY.empty);
    expect(manager).toContain(NEXT_PHASE_COPY.emptyHint);
    expect(manager).toContain(`href="/app/projects/p-1/phases"`);
    expect(manager).toContain(NEXT_PHASE_COPY.addPhases);
    const member = await card({ plan: empty, canPlan: false });
    expect(member).toContain(NEXT_PHASE_COPY.empty);
    expect(member).not.toContain(NEXT_PHASE_COPY.addPhases);
    expect(member).not.toContain(NEXT_PHASE_COPY.seeAll);
  });
});

describe('ActivityList', () => {
  const list = (over: Partial<Parameters<typeof ActivityList>[0]> = {}) =>
    render(
      <ActivityList
        items={[item()]}
        hasMore={false}
        loadingMore={false}
        failed={false}
        onMore={() => {}}
        {...over}
      />,
    );

  it('shows the sentence, an avatar for the actor and a short date', async () => {
    const html = await render(<ActivityRow item={item()} />);
    expect(html).toContain('Nico memperpanjang tenggat 15 Okt → 31 Okt');
    expect(html).toContain('title="Nico"');
    expect(html).toContain('6 Okt 2026');
  });

  it('falls back to a neutral name when the actor is unknown', async () => {
    const html = await render(<ActivityRow item={item({ actorId: null, actorName: null })} />);
    expect(html).toContain(`title="${ACTIVITY_COPY.unknownActor}"`);
  });

  it('offers "Muat lebih banyak" only when the server has a next page', async () => {
    expect(await list()).not.toContain(ACTIVITY_COPY.more);
    expect(await list({ hasMore: true })).toContain(ACTIVITY_COPY.more);
  });

  it('shows the more-button as loading while the next page loads', async () => {
    const html = await list({ hasMore: true, loadingMore: true });
    expect(html).toMatch(/<button[^>]*data-loading[^>]*>/);
  });

  it('says so and offers a retry when the next page failed', async () => {
    const html = await list({ hasMore: true, failed: true });
    expect(html).toContain(ACTIVITY_COPY.failed);
    expect(html).toContain(ACTIVITY_COPY.retry);
  });

  it('has an informative empty state', async () => {
    const html = await list({ items: [] });
    expect(html).toContain(ACTIVITY_COPY.empty);
    expect(html).toContain(ACTIVITY_COPY.emptyHint);
  });
});

describe('ProjectSummary', () => {
  const summary = (overdue: number, over = {}) =>
    render(
      <ProjectSummary
        project={{
          id: 'p-1',
          progress: { done: 1, total: 6, percent: 17 },
          taskCounts: { active: 5, overdue, live: 6 },
          startDate: '2026-09-01',
          dueDate: '2026-10-31',
          can: { update: true },
        }}
        elapsed={{ percent: 60, overrun: false }}
        today={TODAY}
        plan={plan()}
        activity={{ items: [item()], nextCursor: null }}
        {...over}
      />,
    );

  it('puts the four cards on the page, progress and phases before attention and activity', async () => {
    const html = await summary(2);
    const at = [
      SUMMARY_COPY.progressTitle,
      esc(NEXT_PHASE_COPY.title),
      SUMMARY_COPY.highlightsTitle,
      ACTIVITY_COPY.title,
    ].map((t) => html.indexOf(t));
    expect(at.every((i) => i > -1)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(html).toContain('17%');
    expect(html).toContain('Nico memperpanjang tenggat 15 Okt → 31 Okt');
  });

  it('counts overdue tasks in the attention card and keeps its empty state', async () => {
    const html = await summary(2);
    expect(html).toContain(SUMMARY_COPY.overdueSome(2));
    expect(html).toContain(SUMMARY_COPY.highlightsEmpty);
  });

  it('says plainly when nothing is overdue', async () => {
    expect(await summary(0)).toContain(SUMMARY_COPY.overdueNone);
  });

  it('stays informative when there is no plan and no activity yet', async () => {
    const html = await summary(0, {
      plan: { phases: [], currentPhase: null, nextMilestone: null },
      activity: { items: [], nextCursor: null },
    });
    expect(html).toContain(NEXT_PHASE_COPY.empty);
    expect(html).toContain(ACTIVITY_COPY.empty);
  });

  it('lets each column shrink so a wide stepper never widens the page', async () => {
    expect((await summary(0)).match(/min-width:0/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
