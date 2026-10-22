/** The task form and the write routes judge text by the same numbers from `server/task/task.limits.ts`. */
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { newTaskValues, validateTask } from '../app/components/tasks/task-form';
import { CreateBody, UpdateBody } from '../server/api/app-tasks.schema';
import {
  TASK_CHECKLIST_INITIAL_MAX,
  TASK_CHECKLIST_TEXT_MAX,
  TASK_DESCRIPTION_MAX,
  TASK_TITLE_MAX,
  TASK_WRITE_MESSAGES,
} from '../server/task/task.limits';

const ROOT = path.join(import.meta.dir, '..');
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8');
const FORM_FILES = [
  'app/components/tasks/TaskForm.tsx',
  'app/components/tasks/TaskFormMore.tsx',
  'app/components/tasks/task-form.ts',
];

const base = () => ({ ...newTaskValues('p-1', null), title: 'Beli keramik' });

describe('task form limits', () => {
  it('reads the same maxima as the route schemas', () => {
    expect(CreateBody.properties.title.maxLength).toBe(TASK_TITLE_MAX);
    expect(UpdateBody.properties.title.anyOf ?? UpdateBody.properties.title).toBeDefined();
    const steps = CreateBody.properties.checklist;
    expect(steps.maxItems).toBe(TASK_CHECKLIST_INITIAL_MAX);
    expect(steps.items.maxLength).toBe(TASK_CHECKLIST_TEXT_MAX);
    expect(JSON.stringify(CreateBody.properties.description)).toContain(
      `"maxLength":${TASK_DESCRIPTION_MAX}`,
    );
  });

  it('accepts text exactly at each limit and refuses one character more', () => {
    const at = {
      ...base(),
      title: 'a'.repeat(TASK_TITLE_MAX),
      description: 'd'.repeat(TASK_DESCRIPTION_MAX),
      steps: ['s'.repeat(TASK_CHECKLIST_TEXT_MAX)],
    };
    expect(validateTask(at)).toEqual({});
    const over = validateTask({
      ...at,
      title: `${at.title}a`,
      description: `${at.description}d`,
      steps: [`${at.steps[0]}s`],
    });
    expect(Object.keys(over).sort()).toEqual(['description', 'steps.0', 'title']);
    expect(over['steps.0']).toBe(TASK_WRITE_MESSAGES.stepTooLong);
  });

  it('refuses more initial steps than the route takes', () => {
    const steps = Array.from({ length: TASK_CHECKLIST_INITIAL_MAX + 1 }, (_, i) => `L${i}`);
    expect(validateTask({ ...base(), steps }).steps).toBeDefined();
    expect(validateTask({ ...base(), steps: steps.slice(1) }).steps).toBeUndefined();
  });

  it('shows the server sentence for an empty title and a missing project', () => {
    const errors = validateTask({ ...base(), projectId: null, title: '   ' });
    expect(errors.title).toBe(TASK_WRITE_MESSAGES.emptyTitle);
    expect(errors.projectId).toBeDefined();
  });

  it('imports the limits instead of repeating the numbers', () => {
    for (const file of FORM_FILES) {
      const src = read(file);
      expect(src).toContain("from '@server/task/task.limits'");
      for (const n of [TASK_TITLE_MAX, TASK_DESCRIPTION_MAX, TASK_CHECKLIST_TEXT_MAX]) {
        expect(src).not.toMatch(new RegExp(`\\b${n}\\b`));
      }
    }
  });
});
