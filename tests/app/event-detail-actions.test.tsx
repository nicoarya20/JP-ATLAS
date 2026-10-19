/** Event actions (S7 E-11): Batalkan (T2) with a required reason, Hapus (T1) + Urungkan, and the write calls. */
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { notifications } from '@mantine/notifications';
import { CancelEventForm, cancelReasonProblem } from '../../app/components/events/CancelEventModal';
import { eventMenuItems } from '../../app/components/events/EventDetailMenu';
import { ACTION_COPY } from '../../app/components/events/event-detail.copy';
import {
  cancelOptions,
  deleteOptions,
  type EventFlow,
  restoreOptions,
} from '../../app/components/events/useEventActions';
import { notify, UNDO_LABEL } from '../../app/components/ui/notify';
import { cancelEvent, fetchEvent, restoreEvent, trashEvent } from '../../app/lib/events-api';
import { runMutation } from '../../app/lib/use-api-mutation';
import { detail, render, view } from './event-detail.fixtures';

describe('Batalkan acara (T2)', () => {
  const flow = (over: Partial<EventFlow> = {}) => {
    const calls: string[] = [];
    const f: EventFlow = {
      cancel: async (id, reason) => {
        calls.push(`cancel:${id}:${reason}`);
        return detail({ canceledAt: '2026-10-20T03:00:00.000Z', cancelReason: reason });
      },
      trash: async (id) => {
        calls.push(`trash:${id}`);
        return { kind: 'event', id, label: 'Rapat mingguan Atlas' };
      },
      restore: async (id) => {
        calls.push(`restore:${id}`);
        return { id };
      },
      refresh: async () => void calls.push('refresh'),
      undo: (message) => void calls.push(`undo:${message}`),
      ...over,
    };
    return { f, calls };
  };
  afterEach(() => spyOn(notifications, 'show').mockRestore());

  it('refuses an empty or blank reason before any call is made', () => {
    expect(cancelReasonProblem('')).toBe(ACTION_COPY.reasonRequired);
    expect(cancelReasonProblem('   \n')).toBe(ACTION_COPY.reasonRequired);
    expect(cancelReasonProblem('Narasumber sakit')).toBeNull();
  });

  it('asks for the reason, names the impact and has an imperative confirm button', async () => {
    const html = await render(<CancelEventForm onSubmit={async () => {}} onClose={() => {}} />);
    expect(html).toContain(ACTION_COPY.reasonLabel);
    expect(html).toContain('Semua peserta akan diberi tahu');
    expect(html).toContain(ACTION_COPY.cancelConfirm);
    expect(html).toContain('maxLength="500"');
  });

  it('sends the reason, spins the button around the call, toasts and reloads the event', async () => {
    const show = spyOn(notifications, 'show').mockImplementation(() => 'id');
    const { f, calls } = flow();
    const states: boolean[] = [];
    const res = await runMutation(
      cancelOptions(f),
      { id: 'ev-1', reason: 'Narasumber sakit' },
      (v) => states.push(v),
    );
    expect(res.ok).toBe(true);
    expect(states).toEqual([true, false]);
    expect(calls).toEqual(['cancel:ev-1:Narasumber sakit', 'refresh']);
    expect(show.mock.calls[0]?.[0]).toMatchObject({ message: ACTION_COPY.canceled });
    // The refreshed detail is what the page then renders: Dibatalkan and no Batalkan item.
    if (res.ok) {
      expect(await view(res.data)).toContain('Dibatalkan');
      expect(eventMenuItems(res.data.can, 'canceled')).not.toContain('cancel');
    }
  });

  it('says what failed, reloads, and returns the error so the dialog stays open', async () => {
    const err = spyOn(notify, 'error').mockImplementation(() => {});
    const { f, calls } = flow({ cancel: async () => Promise.reject(new Error('putus')) });
    const res = await runMutation(cancelOptions(f), { id: 'ev-1', reason: 'x' }, () => {});
    expect(res.ok).toBe(false);
    expect(err).toHaveBeenCalledWith(ACTION_COPY.cancelFailed, expect.any(String));
    expect(calls).toContain('refresh');
    err.mockRestore();
  });
});

describe('Hapus acara (T1) and Urungkan', () => {
  const trashed = { kind: 'event' as const, id: 'ev-1', label: 'Rapat mingguan Atlas' };
  const make = (over: Partial<EventFlow> = {}) => {
    const calls: string[] = [];
    const undos: Array<() => void> = [];
    const f: EventFlow = {
      cancel: async () => detail(),
      trash: async (id) => {
        calls.push(`trash:${id}`);
        return trashed;
      },
      restore: async (id) => {
        calls.push(`restore:${id}`);
        return { id };
      },
      refresh: async () => void calls.push('refresh'),
      undo: (message, onUndo) => {
        calls.push(`undo:${message}`);
        undos.push(onUndo);
      },
      ...over,
    };
    return { f, calls, undos };
  };

  it('deletes at once without a dialog, leaves the page, then offers Urungkan', async () => {
    const { f, calls, undos } = make();
    let left = false;
    const res = await runMutation(
      deleteOptions(
        f,
        () => {},
        () => (left = true),
      ),
      { id: 'ev-1' },
      () => {},
    );
    expect(res.ok).toBe(true);
    expect(calls[0]).toBe('trash:ev-1');
    expect(left).toBe(true);
    expect(calls).toContain(`undo:${ACTION_COPY.deleted}`);
    expect(undos).toHaveLength(1);
  });

  it('Urungkan restores by id, reloads caches, then returns to the event', async () => {
    const show = spyOn(notifications, 'show').mockImplementation(() => 'id');
    const { f, calls, undos } = make();
    const back: string[] = [];
    const undo = restoreOptions(f, (id) => back.push(id));
    const del = deleteOptions(f, (id) => void runMutation(undo, { id }, () => {}));
    await runMutation(del, { id: 'ev-1' }, () => {});
    undos[0]?.();
    await Bun.sleep(10);
    expect(calls).toContain('restore:ev-1');
    expect(back).toEqual(['ev-1']);
    expect(calls.indexOf('restore:ev-1')).toBeLessThan(calls.lastIndexOf('refresh'));
    expect(
      show.mock.calls.some((c) => (c[0] as { message?: string }).message === ACTION_COPY.restored),
    ).toBe(true);
    show.mockRestore();
  });

  it('shows a clear error and offers no Urungkan when the delete fails', async () => {
    const err = spyOn(notify, 'error').mockImplementation(() => {});
    const { f, calls } = make({ trash: async () => Promise.reject(new Error('putus')) });
    let left = false;
    const res = await runMutation(
      deleteOptions(
        f,
        () => {},
        () => (left = true),
      ),
      { id: 'ev-1' },
      () => {},
    );
    expect(res.ok).toBe(false);
    expect(left).toBe(false);
    expect(err).toHaveBeenCalledWith(ACTION_COPY.deleteFailed, expect.any(String));
    expect(calls.some((c) => c.startsWith('undo:'))).toBe(false);
    err.mockRestore();
  });

  it('shows a clear error and stays on the list when Urungkan fails', async () => {
    const err = spyOn(notify, 'error').mockImplementation(() => {});
    const { f } = make({ restore: async () => Promise.reject(new Error('putus')) });
    const back: string[] = [];
    const res = await runMutation(
      restoreOptions(f, (id) => back.push(id)),
      { id: 'ev-1' },
      () => {},
    );
    expect(res.ok).toBe(false);
    expect(back).toEqual([]);
    expect(err).toHaveBeenCalledWith(ACTION_COPY.restoreFailed, expect.any(String));
    err.mockRestore();
  });

  it('puts the real Urungkan button in a toast that stays ten seconds', () => {
    const show = spyOn(notifications, 'show').mockImplementation(() => 'id');
    notify.undo(ACTION_COPY.deleted, () => {});
    const arg = show.mock.calls[0]?.[0] as { autoClose: number; message: unknown };
    expect(arg.autoClose).toBe(10_000);
    expect(JSON.stringify(arg.message)).toContain(UNDO_LABEL);
    show.mockRestore();
  });
});

describe('the event write calls', () => {
  let restoreFetch: (() => void) | null = null;
  afterEach(() => {
    restoreFetch?.();
    restoreFetch = null;
  });
  function stub(res: Response) {
    const spy = spyOn(globalThis, 'fetch').mockImplementation(
      (async () => res) as unknown as typeof fetch,
    );
    restoreFetch = () => spy.mockRestore();
    return spy;
  }
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const requestOf = (spy: ReturnType<typeof stub>) => {
    const [input, init] = spy.mock.calls[0] as [string | Request, RequestInit | undefined];
    const url = typeof input === 'string' ? input : input.url;
    const method = (init?.method ?? (input as Request).method ?? 'GET').toUpperCase();
    return { url, method, body: init?.body };
  };

  it('cancel posts the reason to /cancel and returns the event', async () => {
    const spy = stub(json(200, detail({ canceledAt: '2026-10-20T03:00:00.000Z' })));
    const out = await cancelEvent('ev-1', 'Narasumber sakit');
    const req = requestOf(spy);
    expect(req.url).toContain('/api/app/events/ev-1/cancel');
    expect(req.method).toBe('POST');
    expect(String(req.body)).toContain('Narasumber sakit');
    expect(out.canceledAt).not.toBeNull();
  });

  it('trash deletes the event and returns what the Urungkan toast needs', async () => {
    const spy = stub(json(200, { trash: { kind: 'event', id: 'ev-1', label: 'Rapat' } }));
    expect(await trashEvent('ev-1')).toEqual({ kind: 'event', id: 'ev-1', label: 'Rapat' });
    const req = requestOf(spy);
    expect(req.url).toContain('/api/app/events/ev-1');
    expect(req.method).toBe('DELETE');
  });

  it('restore posts to the Trash restore route; ids are escaped', async () => {
    const spy = stub(json(200, { id: 'a/b' }));
    expect(await restoreEvent('a/b')).toEqual({ id: 'a/b' });
    const req = requestOf(spy);
    expect(req.url).toContain('/api/app/trash/event/a%2Fb/restore');
    expect(req.method).toBe('POST');
  });

  it('turns a 404 into an ApiError with the server text', async () => {
    stub(json(404, { error: 'Acara tidak ditemukan.', code: 'NOT_FOUND', status: 404 }));
    await expect(fetchEvent('nope')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});
