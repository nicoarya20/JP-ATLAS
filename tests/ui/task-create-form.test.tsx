/**
 * "Isi form" of Tugas baru as a component (H-B5, F1): it opens with the values it is given, so the
 * plain page and a later AI draft share one form, and its Tahapan picker explains an empty choice.
 */
import { describe, expect, it } from 'bun:test';
import { TaskCreateForm } from '../../app/components/tasks/TaskCreateForm';
import {
  hasFoldedValues,
  newTaskValues,
  type TaskFormValues,
} from '../../app/components/tasks/task-form';
import { TASK_FORM_COPY } from '../../app/components/tasks/task-form.copy';
import type { IsoDate } from '../../server/metrics/types';
import type { TaskFormProject } from '../../server/task/task-form.query';
import { renderUi } from '../support/render-ui';

const TODAY = '2026-10-30' as IsoDate; // test-only
const VIEWER = { id: 'u-me', name: 'Dodi' }; // test-only
const KINDS = [{ id: 'k-task', name: 'Tugas', baseKind: 'task' as const }]; // test-only
const PROJECTS: TaskFormProject[] = [
  {
    id: 'p-1',
    name: 'Renovasi Dapur',
    kinds: KINDS,
    phases: [
      { id: 'ph-1', name: 'Desain' },
      { id: 'ph-2', name: 'Bangun' },
    ],
  },
  { id: 'p-2', name: 'Pindah Kantor', kinds: KINDS, phases: [] },
]; // test-only

// The folded fields render only when unfolded; a description in the values unfolds them.
const unfolded = (projectId: string | null): TaskFormValues => ({
  ...newTaskValues(projectId, null),
  description: 'Catatan',
});

const open = (initialValues: TaskFormValues) =>
  renderUi(
    <TaskCreateForm
      projects={PROJECTS}
      initialValues={initialValues}
      viewer={VIEWER}
      today={TODAY}
      cancelTo="/app/tasks"
      onSubmitted={() => undefined}
    />,
  );

/** The `<label>` that holds `text`, plus whatever follows it up to the next label. */
function fieldBlock(html: string, text: string): string {
  const at = html.indexOf(`${text}<`);
  expect(at).toBeGreaterThan(-1);
  const start = html.lastIndexOf('<label', at);
  const next = html.indexOf('<label', at);
  return html.slice(start, next === -1 ? undefined : next);
}

describe('TaskCreateForm initialValues', () => {
  it('opens blank when given blank values', async () => {
    const html = await open(newTaskValues(null, null));
    expect(html).toContain(TASK_FORM_COPY.submit);
    expect(html).not.toContain('value="Pasang keramik"');
  });

  it('opens filled with a draft: title, project, description and phase', async () => {
    const html = await open({
      ...newTaskValues('p-1', null),
      title: 'Pasang keramik',
      description: 'Pakai nat abu',
      kindId: 'k-task',
      phaseId: 'ph-2',
      dueDate: '2026-11-02',
    });
    expect(html).toContain('value="Pasang keramik"');
    expect(html).toContain('Pakai nat abu');
    expect(fieldBlock(html, TASK_FORM_COPY.project)).toContain('value="Renovasi Dapur"');
    expect(fieldBlock(html, TASK_FORM_COPY.phase)).toContain('value="Bangun"');
  });
});

describe('folded fields', () => {
  it('stay folded for a blank form and open for values that fill them', async () => {
    expect(hasFoldedValues(newTaskValues('p-1', null))).toBe(false);
    for (const over of [{ description: 'x' }, { phaseId: 'ph-1' }, { startDate: '2026-11-01' }]) {
      expect(hasFoldedValues({ ...newTaskValues('p-1', null), ...over })).toBe(true);
    }
    expect(hasFoldedValues({ ...newTaskValues('p-1', null), steps: ['', ' '] })).toBe(false);
    expect(await open(newTaskValues('p-1', null))).toMatch(/aria-expanded="false"/);
    expect(await open(unfolded('p-1'))).toMatch(/aria-expanded="true"/);
  });
});

describe('Tahapan picker', () => {
  it('asks for a project first and stays disabled while none is chosen', async () => {
    const block = fieldBlock(await open(unfolded(null)), TASK_FORM_COPY.phase);
    expect(block).toContain(TASK_FORM_COPY.phaseNeedsProject);
    expect(block).toContain('disabled');
  });

  it('explains a project without phases instead of showing an empty list', async () => {
    const block = fieldBlock(await open(unfolded('p-2')), TASK_FORM_COPY.phase);
    expect(block).toContain(TASK_FORM_COPY.phaseNone);
    expect(block).toContain('disabled');
  });

  it('is enabled and described for a project that has phases', async () => {
    const block = fieldBlock(await open(unfolded('p-1')), TASK_FORM_COPY.phase);
    expect(block).toContain(TASK_FORM_COPY.phaseHint);
    expect(block).not.toContain('disabled');
  });
});

describe('Batal', () => {
  const cancelMarkup = (html: string) =>
    new RegExp(`<(a|button)\\b[^>]*>(?:<[^>]*>)*${TASK_FORM_COPY.cancel}`).exec(html);

  it('is a link back to cancelTo by default', async () => {
    const found = cancelMarkup(await open(newTaskValues(null, null)));
    expect(found?.[1]).toBe('a');
    expect(found?.[0]).toContain('href="/app/tasks"');
  });

  it('is a plain button when onCancel is given, so a form in a dialog stays on the page', async () => {
    const html = await renderUi(
      <TaskCreateForm
        projects={PROJECTS}
        initialValues={newTaskValues(null, null)}
        viewer={VIEWER}
        today={TODAY}
        cancelTo="/app/tasks"
        onCancel={() => undefined}
        onSubmitted={() => undefined}
      />,
    );
    const found = cancelMarkup(html);
    expect(found?.[1]).toBe('button');
    expect(found?.[0]).not.toContain('href=');
  });
});
