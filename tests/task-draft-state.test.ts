/** Reducer of "Tulis saja ✦" (U1): picks, the one question, save status, and the unsaved-work check. */
import { describe, expect, it } from 'bun:test';
import {
  hasUnsavedWork,
  initialWriteState,
  isPending,
  savedItems,
} from '../app/components/tasks/task-draft.state';
import { composed, draftOf, run, STORY, TWO_DRAFTS } from './support/task-draft-fixtures';

describe('composed', () => {
  it('turns each draft into a picked card with the form values, and saves nothing', () => {
    const s = run([{ type: 'text', text: STORY }, composed()]);
    expect(s.stage).toBe('result');
    expect(s.text).toBe(STORY);
    expect(s.items.map((i) => [i.values.title, i.selected, i.status])).toEqual([
      ['Perbaiki halaman login', true, 'idle'],
      ['Siapkan data uji', true, 'idle'],
    ]);
    expect(s.items[0]?.values).toMatchObject({ projectId: 'p-1', assigneeId: 'u-rina' });
    expect(s.items.every((i) => i.saved === null)).toBe(true);
  });

  it('gives a draft without a kind the project default', () => {
    const s = run([composed({ drafts: [draftOf({ title: 'A' })], question: null })]);
    expect(s.items[0]?.values.kindId).toBe('k-task');
  });
});

describe('question', () => {
  const asked = composed({
    drafts: [
      draftOf({ title: 'Perbaiki halaman login', assigneeNote: 'Ada lebih dari satu "Rina".' }),
      draftOf({ title: 'Siapkan data uji', assigneeId: 'u-dodi' }),
    ],
    question: {
      text: 'Rina yang mana?',
      options: [
        { id: 'u-rina-w', label: 'Rina Wulandari' },
        { id: 'u-rina-p', label: 'Rina Pratiwi' },
      ],
      draftIndexes: [0],
    },
  });

  it('choosing an option sets the assignee of the listed drafts only, then clears the question', () => {
    const s = run([asked, { type: 'answer', optionId: 'u-rina-p' }]);
    expect(s.items[0]?.values.assigneeId).toBe('u-rina-p');
    expect(s.items[0]?.note).toBeNull();
    expect(s.items[1]?.values.assigneeId).toBe('u-dodi');
    expect(s.question).toBeNull();
    expect(s.answer).toBe('Rina Pratiwi');
  });

  it('ignores an option that is not offered', () => {
    const before = run([asked]);
    expect(run([{ type: 'answer', optionId: 'u-ghost' }], before)).toBe(before);
  });

  it('keeps the note until someone is chosen', () => {
    expect(run([asked]).items[0]?.note).toBe('Ada lebih dari satu "Rina".');
  });

  it('shows only the question when there are no drafts', () => {
    const s = run([
      composed({ drafts: [], question: { text: 'Untuk proyek apa?', draftIndexes: [] } }),
    ]);
    expect(s.items).toEqual([]);
    expect(s.question?.text).toBe('Untuk proyek apa?');
    expect(s.question?.options).toBeUndefined();
  });
});

describe('picking and saving', () => {
  it('a draft that is unticked is not pending; a failed one is, until it is saved', () => {
    let s = run([composed(), { type: 'toggle', id: 'draft-2' }]);
    expect(s.items.filter(isPending).map((i) => i.id)).toEqual(['draft-1']);
    s = run([{ type: 'saving', id: 'draft-1' }], s);
    expect(s.items.filter(isPending)).toEqual([]);
    s = run([{ type: 'failed', id: 'draft-1', error: 'Gagal.' }], s);
    expect(s.items[0]).toMatchObject({ status: 'failed', error: 'Gagal.' });
    expect(s.items.filter(isPending).map((i) => i.id)).toEqual(['draft-1']);
    s = run([{ type: 'saved', id: 'draft-1', task: { id: 't1', number: 7, title: 'x' } }], s);
    expect(s.items.filter(isPending)).toEqual([]);
    expect(savedItems(s.items).map((i) => i.saved?.number)).toEqual([7]);
    expect(s.items[0]?.error).toBeNull();
  });

  it('counts a batch as drafts finish, saved or failed, and clears it at the end', () => {
    const task = { id: 't', number: 1, title: 'x' };
    let s = run([composed(), { type: 'batchStarted', total: 2 }]);
    expect(s.batch).toEqual({ total: 2, done: 0 });
    s = run([{ type: 'saved', id: 'draft-1', task }], s);
    expect(s.batch).toEqual({ total: 2, done: 1 });
    s = run([{ type: 'failed', id: 'draft-2', error: 'Gagal.' }], s);
    expect(s.batch).toEqual({ total: 2, done: 2 });
    expect(run([{ type: 'batchEnded' }], s).batch).toBeNull();
  });

  it('a save outside a batch (the Ubah form) does not open one', () => {
    const s = run([
      composed(),
      { type: 'saved', id: 'draft-1', task: { id: 't', number: 1, title: 'x' } },
    ]);
    expect(s.batch).toBeNull();
  });
});

describe('hasUnsavedWork', () => {
  it('is false when empty, true with text or an unsaved draft, false once finished', () => {
    expect(hasUnsavedWork(initialWriteState)).toBe(false);
    expect(hasUnsavedWork(run([{ type: 'text', text: '  ' }]))).toBe(false);
    expect(hasUnsavedWork(run([{ type: 'text', text: 'Beli keramik' }]))).toBe(true);
    const s = run([composed()]);
    expect(hasUnsavedWork(s)).toBe(true);
    expect(hasUnsavedWork(run([{ type: 'finished' }], s))).toBe(false);
  });

  it('is false when every draft is saved and the text was cleared', () => {
    const s = run([
      composed({ drafts: [TWO_DRAFTS.drafts[0] as never], question: null }),
      { type: 'saved', id: 'draft-1', task: { id: 't', number: 1, title: 'x' } },
    ]);
    expect(hasUnsavedWork(s)).toBe(false);
  });

  it('going back to the story drops the drafts and keeps the text', () => {
    const s = run([{ type: 'text', text: STORY }, composed(), { type: 'backToText' }]);
    expect(s).toMatchObject({ stage: 'write', text: STORY, items: [], question: null });
  });
});
