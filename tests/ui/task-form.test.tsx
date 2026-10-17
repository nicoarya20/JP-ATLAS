/**
 * Task form (S2-11, P3 §2 Tugas ⑥): the S2 fields only (no Tag, Perlu diperiksa, Estimasi, Tahapan),
 * a required title with an example, quick due buttons from the server's today, the 403 page for a
 * Pemantau and for someone outside every project (Q5), and the `edit` mode the task detail reuses.
 */
import { describe, expect, it } from 'bun:test';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStaticHandler, createStaticRouter, StaticRouterProvider } from 'react-router';
import { defaultKindId, TaskForm, workersOf } from '../../app/components/tasks/TaskForm';
import { TaskFormMore } from '../../app/components/tasks/TaskFormMore';
import {
  newTaskValues,
  QUICK_DUE_LABELS,
  QUICK_DUES,
  quickDue,
  type TaskFormValues,
  toCreateTaskInput,
  toTaskPatch,
} from '../../app/components/tasks/task-form';
import { TASK_FORM_COPY } from '../../app/components/tasks/task-form.copy';
import { PAGE_COPY } from '../../app/components/tasks/tasks.copy';
import type { ProjectMemberItem } from '../../app/lib/projects-api';
import TaskNewPage from '../../app/routes/app/task-new';
import type { IsoDate } from '../../server/metrics/types';
import type { TaskFormProject } from '../../server/task/task-form.query';

const TODAY = '2026-10-30' as IsoDate; // test-only
const VIEWER = { id: 'u-me', name: 'Dodi' }; // test-only
const KINDS = [
  { id: 'k-task', name: 'Tugas', baseKind: 'task' as const },
  { id: 'k-bug', name: 'Bug', baseKind: 'issue' as const },
]; // test-only
const PROJECTS: TaskFormProject[] = [{ id: 'p-1', name: 'Renovasi Dapur', kinds: KINDS }]; // test-only

const member = (userId: string, name: string, role: ProjectMemberItem['role']) =>
  ({ userId, name, role, image: null, jobTitle: null, isLead: false, joinedAt: '' }) as const;
const MEMBERS: ProjectMemberItem[] = [
  member('u-me', 'Dodi', 'member'),
  member('u-rina', 'Rina', 'manager'),
  member('u-sri', 'Sri', 'viewer'),
]; // test-only

/** Renders under a data router (the unsaved-changes guard needs one) and a query client (members). */
async function render(node: ReactNode): Promise<string> {
  const handler = createStaticHandler([{ id: 'root', path: '/', Component: () => node }]);
  const context = await handler.query(new Request('http://x/'));
  if (context instanceof Response) throw new Error(`Unexpected redirect ${context.status}`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToStaticMarkup(
    <MantineProvider>
      <DatesProvider settings={{ locale: 'id' }}>
        <QueryClientProvider client={new QueryClient()}>
          <StaticRouterProvider router={router} context={context} hydrate={false} />
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>,
  );
}

const createForm = () =>
  render(
    <TaskForm
      mode="create"
      projects={PROJECTS}
      initial={{ ...newTaskValues('p-1', VIEWER.id), kindId: 'k-task' }}
      initialMembers={MEMBERS}
      viewer={VIEWER}
      today={TODAY}
      submitting={false}
      cancelTo="/app/tasks"
      onSubmit={async () => null}
    />,
  );

/** The folded part on its own, with one initial step, as it renders once unfolded. */
function MoreHarness({ withSteps }: { withSteps: boolean }) {
  const form = useForm<TaskFormValues>({
    initialValues: { ...newTaskValues('p-1', null), kindId: 'k-task', steps: ['Ukur lantai'] },
  });
  return <TaskFormMore form={form} kinds={KINDS} withSteps={withSteps} />;
}

const values = (over: Partial<TaskFormValues> = {}): TaskFormValues => ({
  ...newTaskValues('p-1', VIEWER.id),
  title: 'Beli keramik',
  ...over,
});

/** The `<label>` that holds `text`, plus whatever follows it up to the next label. */
function fieldBlock(html: string, text: string): string {
  const at = html.indexOf(`${text}<`);
  expect(at).toBeGreaterThan(-1);
  const start = html.lastIndexOf('<label', at);
  const next = html.indexOf('<label', at);
  return html.slice(start, next === -1 ? undefined : next);
}

describe('TaskForm create', () => {
  it('shows the S2 fields and none of the later ones', async () => {
    const html = await createForm();
    for (const label of [
      TASK_FORM_COPY.project,
      TASK_FORM_COPY.name,
      TASK_FORM_COPY.assignee,
      TASK_FORM_COPY.priority,
      TASK_FORM_COPY.dueDate,
      TASK_FORM_COPY.more,
    ]) {
      expect(html).toContain(label);
    }
    for (const later of ['Tag', 'Perlu diperiksa', 'Pemeriksa', 'Estimasi', 'Tahapan']) {
      expect(html).not.toContain(later);
    }
    // Visible text only: attribute names such as `name="assigneeId"` are not words the user reads.
    expect(html.replace(/<[^>]*>/g, ' ')).not.toMatch(/assignee|deadline|backlog/i);
    expect(html).toContain(TASK_FORM_COPY.submit);
  });

  it('marks the project and the title required and gives the title an example', async () => {
    const html = await createForm();
    expect(fieldBlock(html, TASK_FORM_COPY.project)).toContain('required');
    const title = fieldBlock(html, TASK_FORM_COPY.name);
    expect(title).toContain('required');
    expect(html).toContain(TASK_FORM_COPY.nameHint);
    expect(TASK_FORM_COPY.nameHint).toStartWith('Contoh:');
  });

  it('offers the three quick due buttons', async () => {
    const html = await createForm();
    expect(html).toContain(TASK_FORM_COPY.quickLabel);
    for (const q of QUICK_DUES) expect(html).toContain(`${QUICK_DUE_LABELS[q]}<`);
  });

  it('keeps the folded fields and the initial steps behind "Tampilkan lebih banyak"', async () => {
    const html = await createForm();
    expect(html).toMatch(/aria-expanded="false" aria-controls="task-form-more"/);
    const folded = await render(<MoreHarness withSteps />);
    for (const label of [
      TASK_FORM_COPY.descriptionLabel,
      TASK_FORM_COPY.kind,
      TASK_FORM_COPY.startDate,
      TASK_FORM_COPY.steps,
      TASK_FORM_COPY.addStep,
    ]) {
      expect(folded).toContain(label);
    }
    expect(folded).toContain(TASK_FORM_COPY.descriptionHint);
    for (const later of ['Tag', 'Perlu diperiksa', 'Estimasi', 'Tahapan']) {
      expect(folded).not.toContain(later);
    }
  });

  it('names the viewer "(saya)" as the default assignee', async () => {
    const html = await createForm();
    expect(fieldBlock(html, TASK_FORM_COPY.assignee)).toContain(TASK_FORM_COPY.me('Dodi'));
  });
});

describe('TaskForm edit', () => {
  it('fills the initial values, fixes the project and leaves the steps out', async () => {
    const initial = values({
      title: 'Pasang keramik',
      description: 'Pakai nat abu',
      dueDate: '2026-11-02',
      kindId: 'k-bug',
    });
    const html = await render(
      <TaskForm
        mode="edit"
        project={{ id: 'p-1', name: 'Renovasi Dapur' }}
        kinds={KINDS}
        initial={initial}
        initialMembers={MEMBERS}
        viewer={VIEWER}
        today={TODAY}
        submitting={false}
        cancelTo="/app/tasks/7"
        onSubmit={async () => null}
      />,
    );
    expect(html).toContain('value="Pasang keramik"');
    expect(html).toContain('Pakai nat abu');
    expect(html).toContain('value="Renovasi Dapur"');
    expect(html).toContain('readOnly=""');
    expect(html).toContain(TASK_FORM_COPY.projectFixed);
    expect(html).toContain(TASK_FORM_COPY.editSubmit);
    expect(html).not.toContain(TASK_FORM_COPY.steps);
    expect(html).toContain('aria-expanded="true"');
  });

  it('sends only what changed, never the project', () => {
    const initial = values({ description: 'Lama', dueDate: '2026-11-02' });
    expect(toTaskPatch(initial, initial)).toEqual({});
    const patch = toTaskPatch(initial, {
      ...initial,
      projectId: 'p-other',
      title: '  Beli keramik putih ',
      description: ' ',
      assigneeId: null,
      dueDate: null,
    });
    expect(patch).toEqual({
      title: 'Beli keramik putih',
      description: null,
      assigneeId: null,
      dueDate: null,
    });
  });
});

describe('task form helpers', () => {
  it('counts quick due dates from the server today, across a month end', () => {
    expect(quickDue(TODAY, 'today')).toBe('2026-10-30');
    expect(quickDue(TODAY, 'tomorrow')).toBe('2026-10-31');
    expect(quickDue(TODAY, 'nextWeek')).toBe('2026-11-06');
    expect(quickDue('2026-12-31' as IsoDate, 'tomorrow')).toBe('2027-01-01');
  });

  it('never offers a Pemantau as the one who works on the task', () => {
    expect(workersOf(MEMBERS).map((m) => m.userId)).toEqual(['u-me', 'u-rina']);
  });

  it('defaults the kind to the "Tugas" kind', () => {
    expect(defaultKindId([...KINDS].reverse())).toBe('k-task');
    expect(defaultKindId([])).toBeNull();
  });

  it('leaves blanks and empty steps out of the create body', () => {
    expect(toCreateTaskInput(values({ steps: [' Ukur ', ''], description: '  ' }))).toEqual({
      projectId: 'p-1',
      title: 'Beli keramik',
      priority: 'medium',
      assigneeId: VIEWER.id,
      checklist: ['Ukur'],
    });
  });
});

type PageData = { allowed: false; reason: string } | { allowed: true; [k: string]: unknown };
const renderPage = (loaderData: PageData) => {
  const Page = TaskNewPage as unknown as (props: { loaderData: PageData }) => ReactNode;
  return render(<Page loaderData={loaderData} />);
};

describe('Tugas baru page', () => {
  it('shows the 403 reason to a Pemantau instead of the form', async () => {
    const html = await renderPage({ allowed: false, reason: TASK_FORM_COPY.viewerOnly });
    expect(html).toContain('Anda hanya bisa melihat proyek ini.');
    expect(html).not.toContain(TASK_FORM_COPY.submit);
  });

  it('explains Q5 to someone outside every project', async () => {
    const html = await renderPage({ allowed: false, reason: PAGE_COPY.createBlocked });
    expect(html).toContain('Minta Pengelola proyek menambahkan Anda.');
    expect(html).not.toContain(TASK_FORM_COPY.submit);
  });

  it('renders the form with the loader data', async () => {
    const html = await renderPage({
      allowed: true,
      projects: PROJECTS,
      initial: { ...newTaskValues('p-1', VIEWER.id), kindId: 'k-task' },
      members: MEMBERS,
      viewer: VIEWER,
      today: TODAY,
      cancelTo: '/app/projects/p-1/tasks',
    });
    expect(html).toContain(TASK_FORM_COPY.title);
    expect(html).toContain(TASK_FORM_COPY.submit);
    expect(html).toContain('href="/app/projects/p-1/tasks"');
  });
});
