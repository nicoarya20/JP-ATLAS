/** Whole-row / whole-card click for the project list, plus the three views and their toggle. */
import { describe, expect, it } from 'bun:test';
import { ProjectCard } from '../../app/components/projects/ProjectCard';
import { ProjectFilters } from '../../app/components/projects/ProjectFilters';
import { ProjectList } from '../../app/components/projects/ProjectList';
import { ProjectResults } from '../../app/components/projects/ProjectResults';
import { LIST_COPY, VIEW_COPY } from '../../app/components/projects/projects.copy';
import { DEFAULT_PROJECT_FILTERS, type ViewSlug } from '../../app/lib/projects-filters';
import { anchors, item, render, TODAY } from './project-fixtures';

const ITEMS = [item(), item({ id: 'p-2', name: 'Audit Gudang', dueDate: null, startDate: null })];

const list = () =>
  render(
    <ProjectList
      items={ITEMS}
      total={ITEMS.length}
      today={TODAY}
      empty={<p>kosong</p>}
      hasMore={false}
      loadingMore={false}
      onMore={() => undefined}
    />,
  );

describe('clickable list rows', () => {
  it('links every project name to its detail page with a real <a href>', async () => {
    const links = anchors(await list()).filter((a) => a.className.includes('mk-row-link'));
    // Once in the table row and once in the mobile card per project.
    expect(links.map((a) => `${a.text}|${a.href}`).sort()).toEqual([
      'Audit Gudang|/app/projects/p-2',
      'Audit Gudang|/app/projects/p-2',
      'Renovasi Dapur|/app/projects/p-1',
      'Renovasi Dapur|/app/projects/p-1',
    ]);
  });

  it('marks table rows and mobile cards as the click area', async () => {
    const html = await list();
    expect(html.match(/<tr[^>]*class="[^"]*mk-click-row/g)).toHaveLength(2);
    expect(html.match(/class="[^"]*mk-click-card/g)).toHaveLength(2);
  });

  it('puts no onClick-style handler on the row; navigation is the link itself', async () => {
    const html = await list();
    expect(html).not.toMatch(/<tr[^>]*(onclick|role="link"|tabindex)/i);
  });

  it('keeps the explicit open button above the overlay in the card', async () => {
    const html = await render(<ProjectCard project={item()} today={TODAY} />);
    const open = anchors(html).find((a) => a.text === LIST_COPY.open);
    expect(open?.href).toBe('/app/projects/p-1');
    expect(open?.className).toContain('mk-above');
  });
});

const results = (view: ViewSlug, over: Partial<Parameters<typeof ProjectResults>[0]> = {}) =>
  render(
    <ProjectResults
      view={view}
      items={ITEMS}
      total={ITEMS.length}
      today={TODAY}
      empty={<p>kosong</p>}
      hasMore={false}
      loadingMore={false}
      onMore={() => undefined}
      {...over}
    />,
  );

describe('grid view', () => {
  it('draws one clickable card per project instead of a table', async () => {
    const html = await results('grid');
    expect(html).not.toContain('<table');
    expect(html.match(/role="listitem"/g)).toHaveLength(2);
    expect(html.match(/class="[^"]*mk-click-card/g)).toHaveLength(2);
    const links = anchors(html).filter((a) => a.className.includes('mk-row-link'));
    expect(links.map((a) => a.href)).toEqual(['/app/projects/p-1', '/app/projects/p-2']);
    expect(links.map((a) => a.text)).toEqual(['Renovasi Dapur', 'Audit Gudang']);
  });

  it('shows status, condition with its reason, progress, due date and lead on the card', async () => {
    const html = await results('grid', { items: [item()] });
    for (const text of [
      'Berjalan',
      'Perlu perhatian',
      '1 tugas penting terlambat',
      '17%',
      'Dodi',
    ]) {
      expect(html).toContain(text);
    }
    expect(html).toContain('31 Okt 2026');
  });

  it('lays the cards out in 1 / 2 / 3 columns by breakpoint', async () => {
    const html = await results('grid');
    expect(html).toContain('mantine-SimpleGrid-root');
    expect(html).toMatch(/--sg-cols:1/);
  });

  it('keeps "Tampilkan lebih banyak" working', async () => {
    const html = await results('grid', { hasMore: true, total: 30 });
    expect(html).toContain(LIST_COPY.more);
    expect(html).toContain(LIST_COPY.shown(2, 30));
  });

  it('shows the empty node when nothing matches', async () => {
    const html = await results('grid', { items: [], total: 0 });
    expect(html).toContain('kosong');
    expect(html).not.toContain('mantine-SimpleGrid-root');
  });
});

describe('list view', () => {
  it('is the table plus the mobile cards', async () => {
    const html = await results('list');
    expect(html).toContain('<table');
    expect(html).toContain('role="list"');
  });

  it('shows the empty node and no table', async () => {
    const html = await results('list', { items: [], total: 0 });
    expect(html).toContain('kosong');
    expect(html).not.toContain('<table');
  });
});

describe('ProjectFilters layout', () => {
  const filters = (over: Partial<Parameters<typeof ProjectFilters>[0]> = {}) =>
    render(
      <ProjectFilters
        filters={DEFAULT_PROJECT_FILTERS}
        canSeeAll
        onChange={() => undefined}
        {...over}
      />,
    );

  it('offers List, Grid and Gantt with an Indonesian hint each', async () => {
    const html = await filters();
    expect(html).toContain(`aria-label="${VIEW_COPY.label}"`);
    for (const v of ['list', 'grid', 'gantt'] as const) {
      expect(html).toContain(`>${VIEW_COPY[v].label}<`);
      expect(html).toContain(`title="${VIEW_COPY[v].hint}"`);
      expect(html).toContain(`value="${v}"`);
    }
  });

  it('marks the current view as selected', async () => {
    const html = await filters({ filters: { ...DEFAULT_PROJECT_FILTERS, tampilan: 'gantt' } });
    const views = (html.match(/<input[^>]*type="radio"[^>]*>/g) ?? []).filter((i) =>
      /value="(list|grid|gantt)"/.test(i),
    );
    const checked = views.filter((i) => i.includes('checked'));
    expect(views).toHaveLength(3);
    expect(checked).toHaveLength(1);
    expect(checked[0]).toContain('value="gantt"');
  });

  it('orders the chips Semua, Berjalan, Ditunda, Selesai, Draf', async () => {
    const html = await filters();
    const at = ['Semua', 'Berjalan', 'Ditunda', 'Selesai', 'Draf'].map((t) =>
      html.indexOf(`>${t}<`),
    );
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('has the sort select with its "Urutkan:" label and the search box without a description claim', async () => {
    const html = await filters();
    expect(html).toContain(LIST_COPY.sortPrefix);
    expect(html).toContain(`placeholder="${LIST_COPY.searchPlaceholder}"`);
    expect(LIST_COPY.searchPlaceholder).not.toContain('deskripsi');
  });

  it('draws no divider until extra chips are given, then divider and chips', async () => {
    expect(await filters()).not.toContain('mantine-Divider-root');
    const html = await filters({ extraChips: <span data-slot="x">Perlu perhatian</span> });
    expect(html).toContain('mantine-Divider-root');
    expect(html.indexOf('mantine-Divider-root')).toBeLessThan(html.indexOf('data-slot="x"'));
  });

  it('wraps both rows so nothing overflows 375px', async () => {
    const html = await filters();
    expect(html.match(/--group-wrap:wrap/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
