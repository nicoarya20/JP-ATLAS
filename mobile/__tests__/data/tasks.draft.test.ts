// Just write ✦'s data (tasks.draft.ts): the drafts as the screen keeps them, an answered "which member?", what keeps
// Save off, the POST /tasks body of a kept draft, and which refusals fall back to Fill form.
import { ApiError } from '../../src/api/errors';
import {
  answerQuestion,
  draftBody,
  draftRows,
  draftsProblem,
  fallsBackToForm,
  type TaskDraftResponseWire,
  titleFromStory,
} from '../../src/data/tasks.draft';

const bare = {
  assigneeId: null,
  assigneeNote: null,
  dueDate: null,
  priority: null,
  kindId: null,
  description: null,
};
const ANSWER: TaskDraftResponseWire = {
  drafts: [
    {
      ...bare,
      title: 'Fix the login page',
      assigneeId: 'u-dodi',
      priority: 'high',
      kindId: 'k-bug',
    },
    {
      ...bare,
      title: 'Write release notes',
      assigneeNote: 'Ada lebih dari satu anggota yang cocok dengan "Ni".',
    },
  ],
  question: {
    text: 'Ni yang mana?',
    options: [{ id: 'u-nico', label: 'Nico Arya' }],
    draftIndexes: [1],
  },
};

const refusal = (status: number, code: string) => new ApiError({ message: 'x', code, status });

test('every draft starts kept, keyed by its Compose', () => {
  expect(draftRows(ANSWER, 2).map((r) => [r.key, r.index, r.keep])).toEqual([
    ['2-0', 0, true],
    ['2-1', 1, true],
  ]);
});

test('an answer sets the assignee of the drafts the question is about, by their place in the answer', () => {
  const rows = draftRows(ANSWER, 1);
  const q = ANSWER.question;
  if (!q) throw new Error('test-only: the answer has a question');
  // The first draft was already saved and dropped: the second still gets the answer.
  expect(answerQuestion(rows.slice(1), q, 'u-nico').map((r) => r.assigneeId)).toEqual(['u-nico']);
  expect(answerQuestion(rows, q, 'u-nico').map((r) => r.assigneeId)).toEqual(['u-dodi', 'u-nico']);
});

test('Save needs a kept draft, and every kept one titled', () => {
  const rows = draftRows(ANSWER, 1);
  expect(draftsProblem(rows)).toBeNull();
  expect(draftsProblem(rows.map((r) => ({ ...r, keep: false })))).toBe('none');
  expect(draftsProblem([{ ...rows[0], title: '  ' }, rows[1]])).toBe('title');
  expect(draftsProblem([{ ...rows[0], title: '  ', keep: false }, rows[1]])).toBeNull();
});

test('a kept draft sends what it has, Medium when it names no priority', () => {
  const [a, b] = draftRows(ANSWER, 1);
  expect(draftBody('p-atlas', { ...a, title: ' Fix the login page ', description: '  ' })).toEqual({
    projectId: 'p-atlas',
    title: 'Fix the login page',
    priority: 'high',
    assigneeId: 'u-dodi',
    kindId: 'k-bug',
  });
  expect(draftBody('p-atlas', { ...b, dueDate: '2026-10-09' })).toEqual({
    projectId: 'p-atlas',
    title: 'Write release notes',
    priority: 'medium',
    dueDate: '2026-10-09',
  });
});

test('only a missing or failing AI falls back to Fill form, with the story cut to a title', () => {
  expect(fallsBackToForm(refusal(503, 'AI_DISABLED'))).toBe(true);
  expect(fallsBackToForm(refusal(502, 'AI_UNAVAILABLE'))).toBe(true);
  expect(fallsBackToForm(refusal(429, 'RATE_LIMITED'))).toBe(false);
  expect(fallsBackToForm(new Error('AI_DISABLED'))).toBe(false);
  expect(titleFromStory(`  ${'a'.repeat(250)} `)).toHaveLength(200);
});
