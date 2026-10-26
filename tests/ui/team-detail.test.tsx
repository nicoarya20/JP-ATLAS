/**
 * Person detail (`/app/team/:userId`): the account-role card appears only when the server sent
 * `accountRole`, the leave status shows only when the server sent one, and the work card says
 * plainly why a list is missing. Dates are plain `YYYY-MM-DD` text, as the API sends them.
 */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { MEMBER_ROLE_LABELS } from '../../app/components/projects/projects.copy';
import { TeamDetailView } from '../../app/components/team/TeamDetailView';
import { alsoElsewhereNote, TASKS_COPY } from '../../app/components/team/team.detail.copy';
import { TASK_LABEL_LABELS, TASK_STATUS_LABELS } from '../../app/lib/pm-labels';
import type { PersonDetail } from '../../app/lib/team-person-api';

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
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <StaticRouterProvider router={router} context={context} hydrate={false} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

const detail = (over: Partial<PersonDetail> = {}): PersonDetail => ({
  person: {
    id: 'u-rina',
    name: 'Rina',
    jobTitle: 'Desainer UI',
    department: 'Produk',
    email: 'rina@kantor.id',
  },
  projects: [{ id: 'p-atlas', name: 'Proyek Atlas', role: 'member' }],
  tasksVisible: true,
  availability: null,
  tasks: [
    {
      number: 18,
      title: 'Periksa desain onboarding',
      status: 'in_progress',
      dueDate: TODAY,
      projectId: 'p-atlas',
    },
    {
      number: 11,
      title: 'Revisi ikon profil',
      status: 'todo',
      dueDate: '2026-10-05',
      projectId: 'p-atlas',
    },
    {
      number: 16,
      title: 'Siapkan data uji',
      status: 'todo',
      dueDate: '2026-10-16',
      projectId: 'p-atlas',
    },
  ],
  load: { active: 3, overdue: 1 },
  ...over,
});

const view = (d: PersonDetail) =>
  render(<TeamDetailView userId={d.person.id} initial={d} loadedAt={CLOCK.now} today={TODAY} />);

describe('person detail: profile', () => {
  it('shows name as the page heading, job, division and a mailto email', async () => {
    const html = await view(detail());
    expect(html).toMatch(/<h1[^>]*>Rina<\/h1>/);
    expect(html).toContain('Desainer UI');
    expect(html).toContain('Produk');
    expect(html).toContain('href="mailto:rina@kantor.id"');
    expect(html).toContain('Anggota · Proyek Atlas');
  });

  it('draws the account-role card only when the server sent accountRole', async () => {
    const without = await view(detail());
    expect(without).not.toContain('Peran akun');
    const withRole = await view(detail({ accountRole: 'project_manager' }));
    expect(withRole).toContain('Peran akun');
    expect(withRole).toContain('Project Manager');
  });

  it('shows the phone only when it came with the profile', async () => {
    expect(await view(detail())).not.toContain('Nomor HP');
    const html = await view(detail({ person: { ...detail().person, phone: '0812-0000' } }));
    expect(html).toContain('Nomor HP');
    expect(html).toContain('href="tel:0812-0000"');
  });

  it('says a missing job or division is not filled in', async () => {
    const html = await view(
      detail({ person: { ...detail().person, jobTitle: null, department: null } }),
    );
    expect(html.match(/Belum diisi/g)).toHaveLength(2);
  });

  it('draws nothing about availability or leave when there is none', async () => {
    const html = await view(detail({ accountRole: 'admin' }));
    for (const word of ['Tersedia', 'Cuti', 'Ketersediaan']) expect(html).not.toContain(word);
  });

  it('says "Cuti sampai 16 Okt" under the name for a leave under way', async () => {
    const html = await view(detail({ availability: { kind: 'on_leave', until: '2026-10-16' } }));
    expect(html).toContain('Cuti sampai 16 Okt');
  });

  it('says nothing, not "Tersedia", when there is no leave to show', async () => {
    const html = await view(detail({ availability: null }));
    expect(html).not.toContain('Cuti sampai');
    expect(html).not.toContain('Tersedia');
  });
});

describe('person detail: shared projects', () => {
  it('links each project and names the role in plain words', async () => {
    const html = await view(
      detail({
        projects: [
          { id: 'p-atlas', name: 'Proyek Atlas', role: 'manager' },
          { id: 'p-b', name: 'Proyek Bima', role: 'viewer' },
        ],
      }),
    );
    expect(html).toContain('href="/app/projects/p-atlas"');
    expect(html).toContain('href="/app/projects/p-b"');
    expect(html).toContain(MEMBER_ROLE_LABELS.manager);
    expect(html).toContain(MEMBER_ROLE_LABELS.viewer);
    expect(html).toContain('2 proyek bersama');
  });

  it('says so when there is no shared project', async () => {
    expect(await view(detail({ projects: [] }))).toContain('Belum ada proyek bersama.');
  });
});

describe('person detail: open work', () => {
  it('shows the summary and a linked row per task', async () => {
    const html = await view(detail());
    expect(html).toContain('3 tugas aktif · 1 terlambat');
    expect(html).toContain('href="/app/tasks/18"');
    expect(html).toContain('#18 Periksa desain onboarding');
    expect(html).toContain('href="/app/tasks/11"');
  });

  it('gives each row a status chip with an icon and words, late tasks reading Terlambat', async () => {
    const html = await view(detail());
    expect(html).toContain(TASK_STATUS_LABELS.in_progress.label);
    expect(html).toContain(TASK_STATUS_LABELS.todo.label);
    expect(html).toContain(TASK_LABEL_LABELS.overdue.label);
    // 3 rows: every chip carries an svg beside its words (colour is never the only cue)
    expect(html.match(/mantine-Badge-root/g)?.length).toBe(3);
    expect(html.match(/<svg/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('writes the due note from the server day', async () => {
    const html = await view(detail());
    expect(html).toContain('hari ini');
    expect(html).toContain('terlambat 2 hari');
    expect(html).toContain('9 hari lagi');
  });

  it('notes the work done in other projects when alsoElsewhere is set', async () => {
    const html = await view(
      detail({ alsoElsewhere: true, load: { active: 3, overdue: 1, alsoElsewhere: true } }),
    );
    expect(html).toContain(alsoElsewhereNote('Rina'));
    expect(await view(detail())).not.toContain('juga mengerjakan proyek lain');
  });

  it('explains the missing list instead of showing an empty one when tasksVisible is false', async () => {
    const html = await view(detail({ tasksVisible: false, tasks: undefined, load: undefined }));
    expect(html).toContain(TASKS_COPY.hidden);
    expect(html).not.toContain(TASKS_COPY.empty);
    expect(html).not.toContain('tugas aktif ·');
  });

  it('says there are no open tasks when visible but empty', async () => {
    const html = await view(detail({ tasks: [], load: { active: 0, overdue: 0 } }));
    expect(html).toContain(TASKS_COPY.empty);
    expect(html).toContain('0 tugas aktif · 0 terlambat');
  });

  it('says the list is cut when the person has more open tasks than shown', async () => {
    const html = await view(detail({ load: { active: 25, overdue: 4 } }));
    expect(html).toContain('Menampilkan 3 tugas yang paling terlambat dari 25 tugas aktif.');
  });

  it('shows a task with no due date without a date', async () => {
    const html = await view(
      detail({
        tasks: [
          {
            number: 5,
            title: 'Tanpa tenggat',
            status: 'todo',
            dueDate: null,
            projectId: 'p-atlas',
          },
        ],
      }),
    );
    expect(html).toContain(TASKS_COPY.noDue);
  });
});

describe('person detail: navigation', () => {
  it('offers a back link named after the Tim page', async () => {
    const html = await view(detail());
    expect(html).toContain('Kembali ke Tim');
    expect(html).toContain('href="/app/team"');
  });
});
