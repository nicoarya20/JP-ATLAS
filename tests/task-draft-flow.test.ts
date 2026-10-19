/**
 * The whole "Tulis saja ✦" session without a browser (U1): Susun with each kind of answer, the AI's
 * question, ticking, the batch save and how the work ends. Calls and notices are fakes, so no AI is reached.
 */
import { describe, expect, it } from 'bun:test';
import { storyToValues } from '../app/components/tasks/task-draft';
import { WRITE_COPY } from '../app/components/tasks/task-draft.copy';
import {
  finishedAfterEdit,
  type Notice,
  runCompose,
  runSave,
} from '../app/components/tasks/task-draft.flow';
import {
  initialWriteState,
  type WriteAction,
  type WriteState,
  writeReducer,
} from '../app/components/tasks/task-draft.state';
import { newTaskValues } from '../app/components/tasks/task-form';
import type { DraftOutcome } from '../app/components/tasks/useTaskDraft';
import { ApiError } from '../app/lib/http';
import type { TaskCreateInput } from '../app/lib/tasks-api';
import type { TaskDraftResponse } from '../server/ai/task-draft.types';
import { draftOf, STORY, TWO_DRAFTS } from './support/task-draft-fixtures';

/** A page in miniature: state, dispatch, notices, and the calls that must not run by themselves. */
function session(request: (projectId: string, text: string) => Promise<DraftOutcome>) {
  const box = { state: { ...initialWriteState, text: STORY } as WriteState };
  const toasts: string[] = [];
  const asked: Array<[string, string]> = [];
  const created: TaskCreateInput[] = [];
  const fell: string[] = [];
  const dispatch = (a: WriteAction) => {
    box.state = writeReducer(box.state, a);
  };
  const notice: Notice = {
    success: (m) => toasts.push(`ok: ${m}`),
    error: (t, m) => toasts.push(`error: ${t} | ${m}`),
  };
  const create = async (input: TaskCreateInput) => {
    created.push(input);
    if (input.title === 'Gagal')
      throw new ApiError({ status: 422, code: 'X', message: 'Ditolak.' });
    return { id: `id-${created.length}`, number: created.length, title: input.title };
  };
  const compose = () =>
    runCompose({
      projectId: 'p-1',
      text: box.state.text,
      defaultKindId: () => 'k-task',
      request: async (p, t) => {
        asked.push([p, t]);
        return request(p, t);
      },
      dispatch,
      notice,
      onFallback: (t) => fell.push(t),
    });
  const save = () =>
    runSave({
      items: box.state.items,
      create,
      dispatch,
      notice,
      onCreated: () => toasts.push('refresh'),
    });
  return { box, toasts, asked, created, fell, dispatch, compose, save };
}

const ok = (body: TaskDraftResponse): DraftOutcome => ({ kind: 'ok', body });

describe('Susun', () => {
  it('asks with the project and the trimmed story, shows two drafts and saves nothing', async () => {
    const s = session(async () => ok(TWO_DRAFTS));
    s.dispatch({ type: 'text', text: `  ${STORY}  ` });
    await s.compose();
    expect(s.asked).toEqual([['p-1', STORY]]);
    expect(s.box.state.stage).toBe('result');
    expect(s.box.state.items).toHaveLength(2);
    expect(s.created).toEqual([]);
    expect(s.toasts).toEqual([]);
  });

  it('does not ask when the story is empty', async () => {
    const s = session(async () => ok(TWO_DRAFTS));
    s.dispatch({ type: 'text', text: '   ' });
    await s.compose();
    expect(s.asked).toEqual([]);
    expect(s.box.state.stage).toBe('write');
  });

  it.each<[string, DraftOutcome]>([
    ['AI off or down (503/502)', { kind: 'fallback' }],
    ['network failure', { kind: 'fallback' }],
  ])('%s: tells the user, hands the text to the form and stays unsaved', async (_name, out) => {
    const s = session(async () => out);
    await s.compose();
    expect(s.toasts).toEqual([`error: ${WRITE_COPY.fallbackTitle} | ${WRITE_COPY.fallbackBody}`]);
    expect(s.fell).toEqual([STORY]);
    expect(s.box.state.text).toBe(STORY);
    expect(s.box.state.stage).toBe('write');
    expect(s.created).toEqual([]);
    // What the page then opens: the text in Judul.
    const form = storyToValues(s.fell[0] ?? '', 'p-1', newTaskValues('p-1', null));
    expect(form.title).toBe(STORY);
  });

  it('429 says how long to wait and keeps the story where it is', async () => {
    const s = session(async () => ({ kind: 'rate', seconds: 42 }));
    await s.compose();
    expect(s.toasts).toEqual([`error: ${WRITE_COPY.rateTitle} | ${WRITE_COPY.rateBody(42)}`]);
    expect(s.fell).toEqual([]);
    expect(s.box.state.stage).toBe('write');
  });

  it('shows another refusal with the server sentence as is', async () => {
    const s = session(async () => ({ kind: 'error', message: 'Kamu bukan anggota proyek ini.' }));
    await s.compose();
    expect(s.toasts).toEqual([
      `error: ${WRITE_COPY.composeErrorTitle} | Kamu bukan anggota proyek ini.`,
    ]);
    expect(s.fell).toEqual([]);
  });
});

describe('question and save', () => {
  const asking: TaskDraftResponse = {
    drafts: [
      draftOf({ title: 'Perbaiki halaman login', assigneeNote: 'Ada dua "Rina".' }),
      draftOf({ title: 'Siapkan data uji', assigneeId: 'u-dodi' }),
    ],
    question: {
      text: 'Rina yang mana?',
      options: [
        { id: 'u-rw', label: 'Rina Wulandari' },
        { id: 'u-rp', label: 'Rina Pratiwi' },
      ],
      draftIndexes: [0],
    },
  };

  it('an answer sets the assignee that the saved task carries', async () => {
    const s = session(async () => ok(asking));
    await s.compose();
    s.dispatch({ type: 'answer', optionId: 'u-rp' });
    const done = await s.save();
    expect(s.created.map((c) => [c.title, c.assigneeId])).toEqual([
      ['Perbaiki halaman login', 'u-rp'],
      ['Siapkan data uji', 'u-dodi'],
    ]);
    expect(done?.saved.map((t) => t.number)).toEqual([1, 2]);
  });

  it('saves only the ticked drafts, then ends the work with one toast and a refresh', async () => {
    const s = session(async () => ok(TWO_DRAFTS));
    await s.compose();
    s.dispatch({ type: 'toggle', id: 'draft-2' });
    const done = await s.save();
    expect(s.created.map((c) => c.title)).toEqual(['Perbaiki halaman login']);
    expect(done?.saved).toHaveLength(1);
    expect(s.toasts).toEqual(['refresh', `ok: ${WRITE_COPY.savedOne('Perbaiki halaman login')}`]);
  });

  it('keeps the work open when one draft fails, and never sends the saved one again', async () => {
    const s = session(async () =>
      ok({ drafts: [draftOf({ title: 'Gagal' }), draftOf({ title: 'Baik' })], question: null }),
    );
    await s.compose();
    expect(await s.save()).toBeNull();
    expect(s.box.state.items.map((i) => i.status)).toEqual(['failed', 'saved']);
    expect(s.toasts).toContain(`error: ${WRITE_COPY.saveErrorTitle} | ${WRITE_COPY.someFailed(1)}`);
    expect(s.toasts.some((t) => t.startsWith('ok:'))).toBe(false);
    // The user fixes the failed one and saves again: only it is sent, then both count as done.
    s.dispatch({ type: 'saved', id: 'draft-1', task: { id: 'x', number: 9, title: 'Gagal' } });
    const sent = s.created.length;
    const again = await s.save();
    expect(s.created.length).toBe(sent);
    expect(again).toBeNull(); // nothing was left to send
  });

  it('retrying a failed draft saves it once and reports both tasks', async () => {
    let calls = 0;
    const s = session(async () =>
      ok({ drafts: [draftOf({ title: 'A' }), draftOf({ title: 'B' })], question: null }),
    );
    await s.compose();
    // Fail A on the first batch only.
    const flaky = async (input: TaskCreateInput) => {
      calls += 1;
      if (calls === 1) throw new ApiError({ status: 500 });
      return { id: `i${calls}`, number: calls, title: input.title };
    };
    const first = await runSave({
      items: s.box.state.items,
      create: flaky,
      dispatch: s.dispatch,
      notice: { success: () => undefined, error: () => undefined },
      onCreated: () => undefined,
    });
    expect(first).toBeNull();
    const second = await runSave({
      items: s.box.state.items,
      create: flaky,
      dispatch: s.dispatch,
      notice: { success: () => undefined, error: () => undefined },
      onCreated: () => undefined,
    });
    expect(second?.saved.map((t) => t.title)).toEqual(['B', 'A']);
    expect(calls).toBe(3);
  });
});

describe('Ubah form', () => {
  const items = (statuses: Array<'idle' | 'saved'>) =>
    statuses.map((status, n) => ({
      id: `draft-${n + 1}`,
      values: newTaskValues('p-1', null),
      note: null,
      selected: true,
      status,
      error: null,
      saved: status === 'saved' ? { id: `t${n}`, number: n + 1, title: 'x' } : null,
    }));

  it('ends the work only when the draft saved there was the last one', () => {
    const task = { id: 'new', number: 5, title: 'y' };
    expect(finishedAfterEdit(items(['idle', 'idle']), 'draft-1', task)).toBeNull();
    expect(finishedAfterEdit(items(['idle', 'saved']), 'draft-1', task)?.saved).toEqual([
      { id: 't1', number: 2, title: 'x' },
      task,
    ]);
  });
});
