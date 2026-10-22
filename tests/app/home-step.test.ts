/** The Selesai / Mulai button of a focus row: spinner around the call, toast, reload, and the stale-task path. */
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { notifications } from '@mantine/notifications';
import { QueryClient } from '@tanstack/react-query';
import { HOME_COPY } from '../../app/components/home/home.copy';
import { type StepFlow, stepOptions } from '../../app/components/home/useHomeStep';
import { type HomeSeed, homeKeys, seedHome } from '../../app/lib/home-api';
import { ApiError } from '../../app/lib/http';
import { runMutation } from '../../app/lib/use-api-mutation';
import { BUSY } from './home.fixtures';

const TASK = { id: 't1', title: 'Bayar DP tukang' };

function flow(over: Partial<StepFlow> = {}) {
  const calls: string[] = [];
  const f: StepFlow = {
    run: async (step, ref) => void calls.push(`${step}:${ref}`),
    refresh: async () => void calls.push('refresh'),
    ...over,
  };
  return { f, calls };
}

afterEach(() => spyOn(notifications, 'show').mockRestore());

describe('stepOptions', () => {
  it('finishes the task, spins the button around the call, toasts and reloads', async () => {
    const show = spyOn(notifications, 'show').mockImplementation(() => 'id');
    const { f, calls } = flow();
    const states: boolean[] = [];
    const res = await runMutation(stepOptions(TASK, f), 'complete', (v) => states.push(v));
    expect(res.ok).toBe(true);
    expect(states).toEqual([true, false]);
    expect(calls).toEqual(['complete:t1', 'refresh']);
    expect(show.mock.calls[0]?.[0]).toMatchObject({
      message: HOME_COPY.focus.completed(TASK.title),
    });
  });

  it('starts a task with its own sentence', async () => {
    const show = spyOn(notifications, 'show').mockImplementation(() => 'id');
    const { f, calls } = flow();
    await runMutation(stepOptions(TASK, f), 'start', () => {});
    expect(calls[0]).toBe('start:t1');
    expect(show.mock.calls[0]?.[0]).toMatchObject({ message: HOME_COPY.focus.started(TASK.title) });
  });

  it('says it failed, does not reload, and lets the button work again', async () => {
    const show = spyOn(notifications, 'show').mockImplementation(() => 'id');
    const { f, calls } = flow({
      run: async () => {
        throw new ApiError({ status: 500, message: 'x' });
      },
    });
    const states: boolean[] = [];
    const res = await runMutation(stepOptions(TASK, f), 'complete', (v) => states.push(v));
    expect(res.ok).toBe(false);
    expect(states).toEqual([true, false]);
    expect(calls).toEqual([]);
    expect(show.mock.calls[0]?.[0]).toMatchObject({
      title: HOME_COPY.focus.failed,
      color: 'danger',
    });
  });

  it('reloads the Beranda when someone else changed the task first', async () => {
    spyOn(notifications, 'show').mockImplementation(() => 'id');
    const { f, calls } = flow({
      run: async () => {
        throw new ApiError({ status: 409, code: 'STATE_CONFLICT', message: 'x' });
      },
    });
    const res = await runMutation(stepOptions(TASK, f), 'complete', () => {});
    expect(res.ok).toBe(false);
    expect(calls).toEqual(['refresh']);
  });
});

describe('seedHome', () => {
  const seed = (loadedAt: number): HomeSeed => ({ data: BUSY, loadedAt });

  it('fills an empty cache with the loader copy', () => {
    const qc = new QueryClient();
    seedHome(qc, seed(1_000));
    expect(qc.getQueryState(homeKeys.all)?.data).toEqual(BUSY);
  });

  it('replaces an older cache, so coming back to the page never shows the earlier read', () => {
    const qc = new QueryClient();
    qc.setQueryData(homeKeys.all, { old: true }, { updatedAt: 500 });
    seedHome(qc, seed(1_000));
    expect(qc.getQueryState(homeKeys.all)?.data).toEqual(BUSY);
  });

  it('keeps a cache that is newer than the loader copy', () => {
    const qc = new QueryClient();
    qc.setQueryData(homeKeys.all, { newer: true }, { updatedAt: 2_000 });
    seedHome(qc, seed(1_000));
    expect(qc.getQueryState(homeKeys.all)?.data).toEqual({ newer: true });
  });
});
