/** Whole-row / whole-card click for the project list, plus the three views and their toggle. */
import { describe, expect, it } from 'bun:test';
import { ProjectCard } from '../../app/components/projects/ProjectCard';
import { ProjectList } from '../../app/components/projects/ProjectList';
import { LIST_COPY } from '../../app/components/projects/projects.copy';
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
