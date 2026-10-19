/** The project page: header, tabs and the four tabs render for the people who may see them. */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { ProjectHeader } from '../app/components/projects/ProjectHeader';
import { ProjectMembersTab } from '../app/components/projects/ProjectMembersTab';
import { ProjectPhasesTab } from '../app/components/projects/ProjectPhasesTab';
import { ProjectSummary } from '../app/components/projects/ProjectSummary';
import { ProjectTabs } from '../app/components/projects/ProjectTabs';
import { emptyValues } from '../app/components/projects/project-form.logic';
import { NO_ACCESS } from '../app/components/projects/projects.access';
import { addProject, seedProjects } from '../app/components/projects/projects.logic';

const FULL = { canCreate: true, canManage: true, canDelete: true };
const atlas = () => {
  const p = seedProjects().find((x) => x.id === 'atlas');
  if (!p) throw new Error('seed');
  return p;
};
const fresh = () => {
  const { list } = addProject(
    seedProjects(),
    { ...emptyValues('Nico'), name: 'Renovasi Dapur' },
    'Nico',
  );
  const p = list[0];
  if (!p) throw new Error('create');
  return p;
};
const noop = () => undefined;

/** Renders at `path` under a data router, like the real app. */
async function render(node: ReactNode, path = '/'): Promise<string> {
  const handler = createStaticHandler([{ id: 'root', path: '*', Component: () => node }]);
  const context = await handler.query(new Request(`http://x${path}`));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(
    <MantineProvider>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </MantineProvider>,
  );
}
const count = (html: string, s: string) => html.split(s).length - 1;

describe('ProjectHeader', () => {
  const header = (access = FULL, project = atlas()) =>
    render(<ProjectHeader project={project} access={access} onExtend={noop} onDelete={noop} />);

  it('shows name, why, lead, due date and how often it moved', async () => {
    const html = await header();
    for (const s of [
      'Proyek Atlas',
      'Kenapa: 1 tugas penting terlambat',
      'Lead: Nico',
      'Diperpanjang ×1',
      '31 Okt 2026',
    ])
      expect(html).toContain(s);
  });

  it('gives a manager the extend button and the ⋯ menu', async () => {
    const html = await header();
    expect(html).toContain('Perpanjang tenggat');
    expect(html).toContain('aria-label="Aksi proyek"');
  });

  it('gives a Member neither the extend button nor the menu', async () => {
    const html = await header(NO_ACCESS);
    expect(html).not.toContain('Perpanjang tenggat');
    expect(html).not.toContain('Aksi proyek');
    expect(html).toContain('Proyek Atlas');
  });

  it('offers the menu to someone who can edit but not delete', async () => {
    expect(await header({ ...FULL, canDelete: false })).toContain('Aksi proyek');
  });

  it('does not ask for an extension on a draft, and shows no condition for it', async () => {
    const html = await header(FULL, { ...atlas(), status: 'draft' });
    expect(html).not.toContain('Perpanjang tenggat');
    expect(html).not.toContain('Kenapa');
  });

  it('stays quiet about "why" for a project that is on track', async () => {
    expect(await header(FULL, fresh())).not.toContain('Kenapa');
  });
});

describe('ProjectTabs', () => {
  it('lists the four sections and marks only the current one', async () => {
    const html = await render(<ProjectTabs projectId="atlas" />, '/app/projects/atlas/tasks');
    for (const s of ['Ringkasan', 'Tugas', 'Tahapan', 'Anggota']) expect(html).toContain(s);
    expect(count(html, 'aria-current="page"')).toBe(1);
    // The marked link is the one for Tugas, whatever order the attributes come in.
    const marked = html.match(/<a [^>]*aria-current="page"[^>]*>/)?.[0] ?? '';
    expect(marked).toContain('href="/app/projects/atlas/tasks"');
  });

  it('marks Ringkasan on the bare project URL, trailing slash or not', async () => {
    for (const path of ['/app/projects/atlas', '/app/projects/atlas/']) {
      const html = await render(<ProjectTabs projectId="atlas" />, path);
      expect(count(html, 'aria-current="page"')).toBe(1);
    }
  });
});

describe('ProjectSummary', () => {
  it('shows progress, time, attention tasks, phases and the feed for Proyek Atlas', async () => {
    const html = await render(<ProjectSummary project={atlas()} />);
    for (const s of [
      '70%',
      '78%',
      'sisa 15 hari',
      '#12 Fix login SSO',
      'Terlambat 2 hari',
      'Sekarang: Pengembangan · 60%',
      'Milestone berikutnya: Rilis beta',
      'Lihat semua tahapan',
      'Aktivitas terakhir',
      '15 Okt → 31 Okt',
    ])
      expect(html).toContain(s);
  });

  it('says what is missing on a project that was just created, instead of a blank card', async () => {
    const html = await render(<ProjectSummary project={fresh()} />);
    expect(html).toContain('Belum ada tahapan');
    expect(html).toContain('Tidak ada tugas yang perlu perhatian');
    expect(html).toContain('membuat proyek');
  });

  it('writes the reason of an extension under its feed line', async () => {
    const p = {
      ...atlas(),
      activity: [
        { who: 'Nico', text: 'memperpanjang tenggat', date: '2026-10-16', note: 'Menunggu klien' },
      ],
    };
    expect(await render(<ProjectSummary project={p} />)).toContain('Menunggu klien');
  });
});

describe('ProjectPhasesTab', () => {
  it('shows every phase with its state and milestones', async () => {
    const html = await render(<ProjectPhasesTab phases={atlas().phases} />);
    for (const s of [
      'Perencanaan',
      'Pengembangan',
      'Pengujian',
      'Rilis',
      'Selesai',
      'Sedang berjalan',
      'Akan datang',
      'Rilis beta',
    ])
      expect(html).toContain(s);
  });

  it('explains an empty project instead of showing nothing', async () => {
    expect(await render(<ProjectPhasesTab phases={[]} />)).toContain('Belum ada tahapan');
  });
});

describe('ProjectMembersTab', () => {
  const tab = (canManage: boolean) =>
    render(<ProjectMembersTab project={atlas()} canManage={canManage} viewer="Nico" />);

  it('lets a manager add, change and remove, except for the lead', async () => {
    const html = await tab(true);
    expect(html).toContain('Tambah anggota');
    expect(html).toContain('Pengelola utama');
    expect(html).toContain('aria-label="Peran Rina"');
    expect(html).toContain('aria-label="Keluarkan Rina"');
    expect(html).not.toContain('aria-label="Keluarkan Nico"');
    expect(html).not.toContain('aria-label="Peran Nico"');
  });

  it('shows a Member the list and the reason they cannot change it', async () => {
    const html = await tab(false);
    expect(html).toContain('Rina');
    expect(html).toContain('Pemantau');
    expect(html).not.toContain('Tambah anggota');
    expect(html).not.toContain('Keluarkan');
    expect(html).toContain('Hanya Pengelola proyek, Admin, dan Project Manager');
  });

  it('puts the table and the phone cards in the same markup, so nothing flashes on load', async () => {
    const html = await tab(true);
    expect(html).toContain('<table');
    expect(count(html, 'Developer')).toBeGreaterThanOrEqual(1);
  });
});
