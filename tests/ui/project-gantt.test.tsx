/** Gantt view of the project list: bars, markers, today line, unscheduled projects and links. */
import { describe, expect, it } from 'bun:test';
import type { ProjectListItem } from '@server/project/project.dto';
import type { ProjectListMilestone, ProjectListPhase } from '@server/project/project-plan.dto';
import { GANTT_PLAN_COPY } from '../../app/components/projects/gantt-plan.copy';
import { ProjectGantt } from '../../app/components/projects/ProjectGantt';
import { ProjectResults } from '../../app/components/projects/ProjectResults';
import { GANTT_COPY, LIST_COPY } from '../../app/components/projects/projects.copy';
import { anchors, item, render, TODAY } from './project-fixtures';

type GanttProps = Parameters<typeof ProjectGantt>[0];
const gantt = (items: GanttProps['items'], over: Partial<GanttProps> = {}) =>
  render(
    <ProjectGantt
      items={items}
      total={items.length}
      today={TODAY}
      empty={<p>kosong</p>}
      hasMore={false}
      loadingMore={false}
      onMore={() => undefined}
      {...over}
    />,
  );

const BAR = item({ id: 'p-bar', name: 'Renovasi Dapur' });
const DUE = item({ id: 'p-due', name: 'Audit Gudang', startDate: null, dueDate: '2026-11-12' });
const NONE = item({
  id: 'p-none',
  name: 'Ide Baru',
  startDate: null,
  dueDate: null,
  status: 'draft',
  condition: null,
});

describe('ProjectGantt', () => {
  it('draws a bar with dates in its label, and links both bar and name to the project', async () => {
    const html = await gantt([BAR]);
    const links = anchors(html).filter((a) => a.href === '/app/projects/p-bar');
    expect(
      links.some((a) => a.text === 'Renovasi Dapur' && a.className.includes('mk-row-link')),
    ).toBe(true);
    // The bar is a real link too and says its dates without relying on colour.
    expect(html).toMatch(
      /aria-label="Renovasi Dapur: 1 Okt 2026 sampai 31 Okt 2026\. Status Berjalan\./,
    );
    expect(html).toContain('1 Okt 2026 – 31 Okt 2026');
  });

  it('shows the month header, the condition with icon and word, and the progress', async () => {
    const html = await gantt([BAR]);
    expect(html).toContain('Okt 2026');
    expect(html).toContain('Perlu perhatian');
    expect(html).toContain('17% selesai');
    expect(html).toContain('Berjalan');
  });

  it('draws the today line from the server date, with a "Hari ini" tag', async () => {
    const html = await gantt([BAR]);
    expect(html).toContain(GANTT_COPY.today);
    expect(html).toContain('dashed');
    expect(html).toContain(GANTT_COPY.todayIn('7 Okt 2026'));
  });

  it('leaves the today line out and says so when today is outside the range', async () => {
    const html = await gantt([item({ startDate: '2027-01-05', dueDate: '2027-01-20' })]);
    expect(html).not.toContain('dashed');
    expect(html).toContain(GANTT_COPY.todayOut('7 Okt 2026'));
  });

  it('marks a project with only a due date by a diamond link labelled with the date', async () => {
    const html = await gantt([DUE]);
    expect(html).toMatch(/aria-label="Audit Gudang: tenggat 12 Nov 2026\. Status Berjalan\."/);
    expect(html).toContain('rotate(45deg)');
    expect(html).toContain(GANTT_COPY.dueOnly('12 Nov 2026'));
    expect(html).not.toContain(GANTT_COPY.unscheduledTitle);
  });

  it('lists projects without dates under "Belum ada tanggal" with a link, and draws no bar for them', async () => {
    const html = await gantt([BAR, NONE]);
    expect(html).toContain(GANTT_COPY.unscheduledTitle);
    const link = anchors(html).find((a) => a.href === '/app/projects/p-none');
    expect(link?.text).toBe('Ide Baru');
    expect(html).not.toContain('Ide Baru:');
  });

  it('says nothing can be drawn when no project has a date, and still lists them', async () => {
    const html = await gantt([NONE]);
    expect(html).toContain(GANTT_COPY.nothingToDraw);
    expect(html).toContain(GANTT_COPY.unscheduledTitle);
    expect(anchors(html).some((a) => a.href === '/app/projects/p-none')).toBe(true);
  });

  it('notes a start date that has no due date yet', async () => {
    const html = await gantt([item({ id: 'p-s', name: 'Baru Mulai', dueDate: null })]);
    expect(html).toContain(GANTT_COPY.onlyStart('1 Okt 2026'));
  });

  it('puts the timeline in a keyboard-reachable horizontal scroller with a sticky label column', async () => {
    const html = await gantt([BAR]);
    expect(html).toMatch(/role="region"[^>]*aria-label="Jadwal proyek"/);
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('overflow-x:auto');
    expect(html).toContain('mk-gantt-label');
  });

  it('sizes with rem/em and the text scale, never fixed pixels', async () => {
    const html = await gantt([BAR]);
    expect(html).toContain('var(--mantine-scale)');
    expect(html).not.toMatch(/(?:width|height|min-width)\s*:\s*\d+px/);
  });

  it('draws no stage, milestone or plan legend when the list carries no plan', async () => {
    const html = await gantt([BAR]);
    expect(html).not.toContain('Tahap ');
    expect(html).not.toContain('Tonggak');
    expect(html).not.toContain(GANTT_PLAN_COPY.legendTitle);
  });

  it('shows the empty node when the page has no projects', async () => {
    const html = await gantt([], { total: 0 });
    expect(html).toContain('kosong');
    expect(html).not.toContain('mk-gantt-label');
  });

  it('keeps "Tampilkan lebih banyak" and the shown count', async () => {
    const html = await gantt([BAR], { hasMore: true, total: 120 });
    expect(html).toContain(LIST_COPY.more);
    expect(html).toContain(LIST_COPY.shown(1, 120));
  });

  it('is what ProjectResults draws for view=gantt', async () => {
    const html = await render(
      <ProjectResults
        view="gantt"
        items={[BAR]}
        total={1}
        today={TODAY}
        empty={null}
        hasMore={false}
        loadingMore={false}
        onMore={() => undefined}
      />,
    );
    expect(html).toContain('mk-gantt-label');
    expect(html).not.toContain('<table');
  });
});

describe('ProjectGantt stages and milestones', () => {
  const phase = (over: Partial<ProjectListPhase> = {}): ProjectListPhase => ({
    id: 'ph-1',
    name: 'Desain',
    startDate: '2026-10-01',
    endDate: '2026-10-10',
    status: 'done',
    ...over,
  });
  const milestone = (over: Partial<ProjectListMilestone> = {}): ProjectListMilestone => ({
    id: 'm-1',
    title: 'Persetujuan',
    dueDate: '2026-10-16',
    reachedAt: null,
    phaseId: null,
    ...over,
  });
  const planned = (
    phases: ProjectListPhase[],
    milestones: ProjectListMilestone[] = [],
    over: Partial<ProjectListItem> = {},
  ) => item({ id: 'p-bar', plan: { phases, milestones }, ...over });

  /** The opening `<a ...>` tag whose aria-label starts with `start`. */
  const tagOf = (html: string, start: string): string => {
    const m = new RegExp(`<a [^>]*aria-label="${start}[^"]*"[^>]*>`).exec(html);
    if (!m) throw new Error(`No element labelled "${start}"`);
    return m[0];
  };
  const pct = (tag: string, prop: 'left' | 'width') =>
    Number(new RegExp(`${prop}:([\\d.]+)%`).exec(tag)?.[1]);

  it('draws each dated stage inside the bar, sized in percent of the month range', async () => {
    const html = await gantt([planned([phase()])]);
    const tag = tagOf(html, 'Tahap Desain');
    expect(tag).toContain('aria-label="Tahap Desain: 1 Okt 2026 sampai 10 Okt 2026 (selesai)"');
    // October has 31 days and the project fills it: 10 days from the left edge.
    expect(pct(tag, 'left')).toBeCloseTo(0, 6);
    expect(pct(tag, 'width')).toBeCloseTo((10 / 31) * 100, 3);
    expect(tag).toContain('title="Tahap Desain');
  });

  it('shows done, running and not-started stages with different shapes, not just colours', async () => {
    const html = await gantt([
      planned([
        phase({ id: 'a', name: 'Satu', status: 'done' }),
        phase({
          id: 'b',
          name: 'Dua',
          status: 'in_progress',
          startDate: '2026-10-11',
          endDate: '2026-10-20',
        }),
        phase({
          id: 'c',
          name: 'Tiga',
          status: 'not_started',
          startDate: '2026-10-21',
          endDate: '2026-10-31',
        }),
      ]),
    ]);
    const done = tagOf(html, 'Tahap Satu');
    const running = tagOf(html, 'Tahap Dua');
    const waiting = tagOf(html, 'Tahap Tiga');
    expect(done).toContain('(selesai)');
    expect(running).toContain('(sedang berjalan)');
    expect(waiting).toContain('(belum mulai)');
    expect(running).toContain('repeating-linear-gradient');
    expect(done).not.toContain('repeating-linear-gradient');
    expect(done).not.toContain('dashed');
    expect(waiting).toContain('dashed');
    expect(running).not.toContain('dashed');
  });

  it('draws no piece for a stage without both dates', async () => {
    const html = await gantt([
      planned([
        phase({ id: 'a', name: 'Lengkap' }),
        phase({ id: 'b', name: 'Tanpa akhir', endDate: null }),
        phase({ id: 'c', name: 'Tanpa tanggal', startDate: null, endDate: null }),
      ]),
    ]);
    expect(html).toContain('Tahap Lengkap');
    expect(html).not.toContain('Tanpa akhir');
    expect(html).not.toContain('Tanpa tanggal');
  });

  it('makes the bar taller only when it carries stages', async () => {
    const plain = await gantt([BAR]);
    const staged = await gantt([planned([phase()])]);
    expect(tagOf(plain, 'Renovasi Dapur')).toContain('height:1.75em');
    expect(tagOf(staged, 'Renovasi Dapur')).toContain('height:2.75em');
  });

  it('marks a reached milestone with a filled diamond and says "tercapai"', async () => {
    const html = await gantt([planned([], [milestone({ reachedAt: '2026-10-15T02:00:00.000Z' })])]);
    const tag = tagOf(html, 'Tonggak Persetujuan');
    expect(tag).toContain('aria-label="Tonggak Persetujuan: 16 Okt 2026 (tercapai)"');
    expect(tag).toContain('rotate(45deg)');
    expect(tag).toContain('background:var(--mantine-color-text)');
  });

  it('marks an open milestone with a hollow diamond and says "belum tercapai"', async () => {
    const html = await gantt([planned([], [milestone()])]);
    const tag = tagOf(html, 'Tonggak Persetujuan');
    expect(tag).toContain('aria-label="Tonggak Persetujuan: 16 Okt 2026 (belum tercapai)"');
    expect(tag).toContain('background:var(--mantine-color-body)');
    expect(tag).not.toContain('background:var(--mantine-color-text)');
  });

  it('places a milestone on its day at the centre of the column', async () => {
    const html = await gantt([planned([], [milestone()])]);
    expect(pct(tagOf(html, 'Tonggak'), 'left')).toBeCloseTo((15.5 / 31) * 100, 3);
  });

  it('widens the month range for a milestone beyond the project dates', async () => {
    const html = await gantt([planned([], [milestone({ dueDate: '2026-12-05' })])]);
    expect(html).toContain('Des 2026');
    const only = await gantt([BAR]);
    expect(only).not.toContain('Des 2026');
  });

  it('sends a click on a stage or milestone to the project, like the bar', async () => {
    const html = await gantt([planned([phase()], [milestone()])]);
    for (const start of ['Tahap Desain', 'Tonggak Persetujuan', 'Renovasi Dapur']) {
      expect(tagOf(html, start)).toContain('href="/app/projects/p-bar"');
    }
  });

  it('keeps a project without dates under "Belum ada tanggal", even with a plan', async () => {
    const html = await gantt([
      planned([phase()], [milestone()], { startDate: null, dueDate: null }),
    ]);
    expect(html).toContain(GANTT_COPY.unscheduledTitle);
    expect(html).not.toContain('Tahap Desain');
    expect(html).not.toContain('Tonggak Persetujuan');
  });

  it('explains stages and milestones in the legend only when some are drawn', async () => {
    const html = await gantt([planned([phase()], [milestone()])]);
    expect(html).toContain(`aria-label="${GANTT_PLAN_COPY.legendTitle}"`);
    for (const text of [
      ...Object.values(GANTT_PLAN_COPY.legendStage),
      GANTT_PLAN_COPY.legendMilestoneReached,
      GANTT_PLAN_COPY.legendMilestoneOpen,
    ]) {
      expect(html).toContain(text);
    }
    expect(await gantt([planned([])])).not.toContain(GANTT_PLAN_COPY.legendTitle);
  });

  it('gives rows with a plan more height without fixed pixels', async () => {
    const html = await gantt([planned([phase()], [milestone()])]);
    expect(html).toContain('min-height:calc(5.5rem * var(--mantine-scale))');
    expect(html).not.toMatch(/(?:width|height|min-width)\s*:\s*\d+px/);
  });
});
