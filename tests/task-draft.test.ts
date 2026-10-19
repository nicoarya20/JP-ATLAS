/** Pure side of "Tulis saja ✦" (U1): checks before Susun, draft → form values, the fallback title, long dates. */
import { describe, expect, it } from 'bun:test';
import {
  composeBlock,
  draftToValues,
  longDate,
  storyLength,
  storyToValues,
} from '../app/components/tasks/task-draft';
import { WRITE_COPY } from '../app/components/tasks/task-draft.copy';
import { newTaskValues } from '../app/components/tasks/task-form';
import { TASK_DRAFT_TEXT_MAX } from '../server/ai/task-draft.limits';
import type { TaskDraft } from '../server/ai/task-draft.types';
import { TASK_DESCRIPTION_MAX, TASK_TITLE_MAX } from '../server/task/task.limits';

const draft = (over: Partial<TaskDraft> = {}): TaskDraft => ({
  title: 'Perbaiki halaman login',
  assigneeId: 'u-rina',
  assigneeNote: null,
  dueDate: '2026-10-08',
  priority: 'high',
  kindId: 'k-bug',
  description: null,
  ...over,
}); // test-only

describe('composeBlock', () => {
  it('asks for the project first, then for text', () => {
    expect(composeBlock('Rina perbaiki login', null)).toBe(WRITE_COPY.needProject);
    expect(composeBlock('   ', 'p-1')).toBe(WRITE_COPY.needText);
  });

  it('counts after trimming and stops above the server limit', () => {
    const edge = `  ${'a'.repeat(TASK_DRAFT_TEXT_MAX)}  `;
    expect(storyLength(edge)).toBe(TASK_DRAFT_TEXT_MAX);
    expect(composeBlock(edge, 'p-1')).toBeNull();
    expect(composeBlock('a'.repeat(TASK_DRAFT_TEXT_MAX + 1), 'p-1')).toBe(
      WRITE_COPY.tooLong(TASK_DRAFT_TEXT_MAX),
    );
  });
});

describe('draftToValues', () => {
  it('fills the form from the draft', () => {
    const v = draftToValues(draft(), 'p-1', 'k-task');
    expect(v).toMatchObject({
      projectId: 'p-1',
      title: 'Perbaiki halaman login',
      assigneeId: 'u-rina',
      dueDate: '2026-10-08',
      priority: 'high',
      kindId: 'k-bug',
      description: '',
      steps: [],
    });
  });

  it('leaves blanks to the form defaults: Sedang and the project kind', () => {
    const v = draftToValues(
      draft({ priority: null, kindId: null, assigneeId: null, dueDate: null }),
      'p-1',
      'k-task',
    );
    expect(v).toMatchObject({
      priority: 'medium',
      kindId: 'k-task',
      assigneeId: null,
      dueDate: null,
    });
  });
});

describe('storyToValues (AI unavailable)', () => {
  const base = newTaskValues('p-1', 'u-me');

  it('puts a short story in Judul and keeps the other defaults', () => {
    const v = storyToValues('  Beli keramik dapur  ', 'p-1', base);
    expect(v.title).toBe('Beli keramik dapur');
    expect(v.description).toBe('');
    expect(v.assigneeId).toBe('u-me');
  });

  it('cuts at the title limit and keeps the whole text in Deskripsi', () => {
    const story = 'k'.repeat(TASK_TITLE_MAX + 50);
    const v = storyToValues(story, 'p-1', base);
    expect(v.title).toHaveLength(TASK_TITLE_MAX);
    expect(v.description).toBe(story);
  });

  it('flattens line breaks in Judul but keeps them in Deskripsi', () => {
    const v = storyToValues('Rina login besok.\nDodi data uji.', 'p-1', base);
    expect(v.title).toBe('Rina login besok. Dodi data uji.');
    expect(v.description).toBe('Rina login besok.\nDodi data uji.');
  });

  it('never exceeds the description limit', () => {
    const v = storyToValues('x'.repeat(TASK_DESCRIPTION_MAX + 10), null, base);
    expect(v.description.length).toBeLessThanOrEqual(TASK_DESCRIPTION_MAX);
    expect(v.projectId).toBeNull();
  });
});

describe('longDate', () => {
  it('writes D MMMM YYYY in Indonesian', () => {
    expect(longDate('2026-10-08')).toBe('8 Oktober 2026');
    expect(longDate('2026-01-31')).toBe('31 Januari 2026');
  });
});
