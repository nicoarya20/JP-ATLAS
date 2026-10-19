/** Gantt view of the project list: bars, markers, today line, unscheduled projects and links. */
import { describe, expect, it } from 'bun:test';
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

  it('renders stages and milestones when given, and nothing extra otherwise', async () => {
    expect(await gantt([BAR])).not.toContain('Tonggak');
    const html = await gantt([BAR], {
      plans: {
        'p-bar': {
          segments: [
            { startDate: '2026-10-01', dueDate: '2026-10-10', label: 'Desain', done: true },
          ],
          milestones: [{ date: '2026-10-20', label: 'Persetujuan', reached: false }],
        },
      },
    });
    expect(html).toContain(GANTT_COPY.stageDone('Desain'));
    expect(html).toContain(GANTT_COPY.milestoneOpen('Persetujuan'));
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
