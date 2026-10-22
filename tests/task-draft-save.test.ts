/** Batch save of "Tulis saja ✦" (U1): only the picked drafts, one failure never stops the others, retry skips saved. */
import { describe, expect, it } from 'bun:test';
import { saveDrafts } from '../app/components/tasks/task-draft.save';
import {
  type DraftItem,
  initialWriteState,
  isPending,
  type WriteAction,
  writeReducer,
} from '../app/components/tasks/task-draft.state';
import { ApiError } from '../app/lib/http';
import type { TaskCreateInput } from '../app/lib/tasks-api';
import { composed, run } from './support/task-draft-fixtures';

/** A page in miniature: state plus the dispatch the save writes to. */
function page(extra: WriteAction[] = []) {
  const box = { state: run([composed(), ...extra], initialWriteState) };
  const dispatch = (a: WriteAction) => {
    box.state = writeReducer(box.state, a);
  };
  return { box, dispatch };
}

/** A create call that records its inputs; titles in `failing` are refused with a server sentence. */
function fakeCreate(failing: string[] = []) {
  const sent: TaskCreateInput[] = [];
  const create = async (input: TaskCreateInput) => {
    sent.push(input);
    if (failing.includes(input.title)) {
      throw new ApiError({ status: 422, code: 'VALIDATION', message: 'Judul tidak valid.' });
    }
    return { id: `id-${sent.length}`, number: sent.length, title: input.title };
  };
  return { create, sent };
}

describe('saveDrafts', () => {
  it('creates exactly the picked drafts with the form body', async () => {
    const { box, dispatch } = page([{ type: 'toggle', id: 'draft-2' }]);
    const { create, sent } = fakeCreate();
    const res = await saveDrafts(box.state.items, create, dispatch);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      projectId: 'p-1',
      title: 'Perbaiki halaman login',
      assigneeId: 'u-rina',
      dueDate: '2026-10-08',
      priority: 'high',
      kindId: 'k-bug',
    });
    expect(res).toEqual({
      saved: [{ id: 'id-1', number: 1, title: 'Perbaiki halaman login' }],
      failed: 0,
    });
    expect(box.state.items.map((i) => i.status)).toEqual(['saved', 'idle']);
    expect(box.state.batch).toBeNull();
  });

  it('keeps going when one draft fails, and shows the reason on that draft', async () => {
    const { box, dispatch } = page();
    const { create, sent } = fakeCreate(['Perbaiki halaman login']);
    const res = await saveDrafts(box.state.items, create, dispatch);
    expect(sent.map((s) => s.title)).toEqual(['Perbaiki halaman login', 'Siapkan data uji']);
    expect(res.failed).toBe(1);
    expect(res.saved.map((t) => t.title)).toEqual(['Siapkan data uji']);
    expect(box.state.items.map((i) => i.status)).toEqual(['failed', 'saved']);
    expect(box.state.items[0]?.error).toContain('Judul tidak valid.');
  });

  it('retries only the failed draft and never creates a saved one twice', async () => {
    const { box, dispatch } = page();
    await saveDrafts(box.state.items, fakeCreate(['Perbaiki halaman login']).create, dispatch);
    const retry = fakeCreate();
    const res = await saveDrafts(box.state.items, retry.create, dispatch);
    expect(retry.sent.map((s) => s.title)).toEqual(['Perbaiki halaman login']);
    expect(res.failed).toBe(0);
    expect(box.state.items.every((i) => i.status === 'saved')).toBe(true);
    const again = fakeCreate();
    await saveDrafts(box.state.items, again.create, dispatch);
    expect(again.sent).toEqual([]);
  });

  it('skips a draft that was saved elsewhere (the Ubah form)', async () => {
    const { box, dispatch } = page([
      { type: 'saved', id: 'draft-1', task: { id: 't9', number: 9, title: 'x' } },
    ]);
    const { create, sent } = fakeCreate();
    await saveDrafts(box.state.items, create, dispatch);
    expect(sent.map((s) => s.title)).toEqual(['Siapkan data uji']);
  });

  it('reports progress: the batch size is announced first and every draft passes through saving', async () => {
    const { box, dispatch } = page();
    const seen: string[] = [];
    const spy = (a: WriteAction) => {
      seen.push(a.type === 'batchStarted' ? `batch:${a.total}` : a.type);
      dispatch(a);
    };
    await saveDrafts(box.state.items, fakeCreate().create, spy);
    expect(seen).toEqual(['batch:2', 'saving', 'saved', 'saving', 'saved', 'batchEnded']);
  });

  it('does nothing when no draft is picked', async () => {
    const { box, dispatch } = page([
      { type: 'toggle', id: 'draft-1' },
      { type: 'toggle', id: 'draft-2' },
    ]);
    const { create, sent } = fakeCreate();
    const res = await saveDrafts(box.state.items, create, dispatch);
    expect(sent).toEqual([]);
    expect(res).toEqual({ saved: [], failed: 0 });
    expect(box.state.items.filter((i: DraftItem) => isPending(i))).toEqual([]);
  });
});
