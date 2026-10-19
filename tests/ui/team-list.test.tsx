/** Team list (S6 ①): static render of the cards, the summary line, the empty states and the sort options. */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type { TeamPerson } from '@server/team/team.dto';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { TeamEmpty } from '../../app/components/team/TeamEmpty';
import { sortOptions } from '../../app/components/team/TeamFilters';
import { TeamList } from '../../app/components/team/TeamList';
import { roleLine } from '../../app/components/team/TeamPersonCard';
import { workOf } from '../../app/components/team/TeamResults';
import { TeamSummaryLine } from '../../app/components/team/TeamSummaryLine';
import { teamPersonHref, uniquePeople } from '../../app/lib/team-api';

async function render(node: ReactNode): Promise<string> {
  const handler = createStaticHandler([{ id: 'root', path: '/', Component: () => node }]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(
    <MantineProvider>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </MantineProvider>,
  );
}

// test-only fixtures
const ATLAS = { id: 'p-atlas', name: 'Proyek Atlas', role: 'member' } as const;
const BORNEO = { id: 'p-borneo', name: 'Proyek Borneo', role: 'manager' } as const;
const CITRA = { id: 'p-citra', name: 'Proyek Citra', role: 'viewer' } as const;
const person = (over: Partial<TeamPerson> & Pick<TeamPerson, 'id' | 'name'>): TeamPerson => ({
  jobTitle: null,
  image: null,
  isSelf: false,
  projects: [ATLAS],
  ...over,
});
const LIST_DEFAULTS = { total: 3, hasMore: false, loadingMore: false, onMore: () => {} };

const dina = person({ id: 'u-dina', name: 'Dina', isSelf: true, load: { active: 4, overdue: 0 } });
const budi = person({
  id: 'u-budi',
  name: 'Budi',
  projects: [BORNEO],
  load: { active: 3, overdue: 1, alsoElsewhere: true },
});
const sari = person({ id: 'u-sari', name: 'Sari' });

describe('person cards', () => {
  it('links every card to its detail page, with "(Anda)" for the viewer', async () => {
    const html = await render(
      <TeamList {...LIST_DEFAULTS} people={[dina, budi, sari]} empty={null} />,
    );
    for (const id of ['u-dina', 'u-budi', 'u-sari']) {
      expect(html).toContain(`href="${teamPersonHref(id)}"`);
    }
    expect(teamPersonHref('u-dina')).toBe('/app/team/u-dina');
    expect(html).toContain('Dina (Anda)');
    expect(html).not.toContain('Budi (Anda)');
    expect(html).toContain('Menampilkan 3 dari 3 orang');
  });

  it('shows load only when the server sent it, never a placeholder', async () => {
    const withLoad = await render(<TeamList {...LIST_DEFAULTS} people={[budi]} empty={null} />);
    expect(withLoad).toContain('3 tugas aktif');
    expect(withLoad).toContain('1 terlambat');
    expect(withLoad).toContain('juga di proyek lain');
    const without = await render(<TeamList {...LIST_DEFAULTS} people={[sari]} empty={null} />);
    expect(without).not.toMatch(/tugas aktif|terlambat|proyek lain/);
    expect(without).not.toContain('0 tugas');
  });

  it('never mentions availability or leave', async () => {
    const html = await render(
      <TeamList {...LIST_DEFAULTS} people={[dina, budi, sari]} empty={null} />,
    );
    expect(html).not.toMatch(/Tersedia|Cuti|Sedang cuti/i);
  });
});

describe('roleLine', () => {
  it('names the role in Indonesian with the project', () => {
    expect(roleLine([ATLAS])).toBe('Anggota · Proyek Atlas');
    expect(roleLine([BORNEO])).toBe('Pengelola · Proyek Borneo');
    expect(roleLine([CITRA])).toBe('Pemantau · Proyek Citra');
  });

  it('shows two projects and counts the rest', () => {
    expect(roleLine([ATLAS, BORNEO])).toBe('Anggota · Proyek Atlas; Pengelola · Proyek Borneo');
    expect(roleLine([ATLAS, BORNEO, CITRA])).toBe(
      'Anggota · Proyek Atlas; Pengelola · Proyek Borneo, dan 1 proyek lain',
    );
  });

  it('says so when there is no shared project', () => {
    expect(roleLine([])).toBe('Belum ada proyek bersama');
  });
});

describe('summary line', () => {
  it('carries the sums only when given work', async () => {
    const withWork = await render(
      <TeamSummaryLine scope="Semua proyek" people={3} work={{ active: 7, overdue: 1 }} />,
    );
    expect(withWork).toContain('Semua proyek · 3 orang · 7 tugas aktif · 1 terlambat');
    const bare = await render(<TeamSummaryLine scope="Proyek Atlas" people={2} />);
    expect(bare).toContain('Proyek Atlas · 2 orang');
    expect(bare).not.toMatch(/tugas aktif|terlambat/);
  });

  it('says the sums cover only the people on screen when more remain', async () => {
    const html = await render(
      <TeamSummaryLine
        scope="Semua proyek"
        people={60}
        work={{ active: 1, overdue: 0 }}
        shownOf={24}
      />,
    );
    expect(html).toContain('dari 24 orang yang tampil');
  });

  it('workOf sums loaded people and hides itself without the right', () => {
    expect(workOf([dina, budi, sari], true, true)).toEqual({ active: 7, overdue: 1 });
    expect(workOf([dina, budi], false, true)).toBeNull();
    expect(workOf([dina], true, false)).toBeNull();
  });
});

describe('sort options', () => {
  it('offers "Tugas aktif terbanyak" only to those who may see other people\'s numbers', () => {
    expect(sortOptions(false).map((o) => o.label)).toEqual(['Nama']);
    expect(sortOptions(true).map((o) => o.label)).toEqual(['Nama', 'Tugas aktif terbanyak']);
  });
});

describe('empty states', () => {
  it('invites to clear the filters when a search matched nobody', async () => {
    const html = await render(<TeamEmpty filtered clearTo="/app/team" />);
    expect(html).toContain('Tidak ada orang yang cocok');
    expect(html).toContain('Hapus saringan');
    expect(html).toContain('href="/app/team"');
  });

  it('is informative when the team is empty', async () => {
    const html = await render(<TeamEmpty filtered={false} clearTo="/app/team" />);
    expect(html).toContain('Belum ada orang di tim ini');
    expect(html).not.toContain('Hapus saringan');
  });

  it('renders the empty node instead of cards for an empty list', async () => {
    const html = await render(
      <TeamList {...LIST_DEFAULTS} total={0} people={[]} empty={<p>kosong</p>} />,
    );
    expect(html).toContain('kosong');
    expect(html).not.toContain('Menampilkan');
  });
});

describe('uniquePeople', () => {
  it('lists a person once when two pages both carried them', () => {
    const page = (people: TeamPerson[]) => ({
      summary: { people: 3, projects: 1 },
      people,
      total: 3,
    });
    expect(uniquePeople([page([dina, budi]), page([budi, sari])]).map((p) => p.id)).toEqual([
      'u-dina',
      'u-budi',
      'u-sari',
    ]);
  });
});
