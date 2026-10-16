import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import {
  NOT_FOUND_TEXT,
  STATE_CONFLICT_TEXT,
  TASK_ERROR_MESSAGES,
} from '../app/components/tasks/tasks.copy';
import { ApiError } from '../app/lib/http';
import {
  cancelTask,
  fetchTasks,
  isNextStep,
  isStaleTaskError,
  reopenTask,
  startTask,
  taskErrorMessage,
  taskKeys,
  unwrapTask,
  withTaskMessage,
} from '../app/lib/tasks-api';
import { DEFAULT_TASK_FILTERS, toTaskQuery } from '../app/lib/tasks-filters';

const apiError = (status: number, code: string, message = 'Pesan server.') =>
  new ApiError({ status, code, message, requestId: 'req-1' });

let restoreFetch: (() => void) | null = null;
function stubFetch(res: Response) {
  const spy = spyOn(globalThis, 'fetch').mockImplementation(
    (async () => res) as unknown as typeof fetch,
  );
  restoreFetch = () => spy.mockRestore();
  return spy;
}
afterEach(() => {
  restoreFetch?.();
  restoreFetch = null;
});

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('task error code → Indonesian message', () => {
  it.each(Object.entries(TASK_ERROR_MESSAGES))('%s uses the task wording', (code, text) => {
    expect(taskErrorMessage(apiError(409, code))).toBe(text as string);
  });

  it('says a conflicting change in one plain sentence', () => {
    expect(taskErrorMessage(apiError(409, 'STATE_CONFLICT', 'Muat ulang halaman.'))).toBe(
      STATE_CONFLICT_TEXT,
    );
  });

  it('keeps the server text for codes without a task wording', () => {
    expect(taskErrorMessage(apiError(403, 'NOT_MANAGER', 'Hanya pengelola.'))).toBe(
      'Hanya pengelola.',
    );
  });

  it('shows the first field issue for a 422 validation error', () => {
    const err = new ApiError({
      status: 422,
      code: 'VALIDATION',
      message: 'Isian belum sesuai.',
      issues: [{ path: 'title', message: 'Judul tugas belum diisi.' }],
    });
    expect(taskErrorMessage(err)).toBe('Periksa isian: Judul tugas belum diisi.');
  });

  it('never leaks a server error detail on 5xx', () => {
    const msg = taskErrorMessage(apiError(500, 'INTERNAL', 'stack trace'));
    expect(msg).toContain('req-1');
    expect(msg).not.toContain('stack');
  });

  it('leaves non-API errors untouched', () => {
    const err = new Error('x');
    expect(withTaskMessage(err)).toBe(err);
  });
});

describe('isStaleTaskError (reload instead of asking the user)', () => {
  it.each([
    ['STATE_CONFLICT', true],
    ['WRONG_STATE', true],
    ['NOT_OWNER', false],
    ['RATE_LIMITED', false],
  ])('%s → %s', (code, stale) => {
    expect(isStaleTaskError(apiError(409, code))).toBe(stale);
  });

  it('is false for network failures', () => {
    expect(isStaleTaskError(new TypeError('Failed to fetch'))).toBe(false);
  });
});

describe('isNextStep', () => {
  it.each([
    ['start', true],
    ['complete', true],
    ['requestReview', false],
    ['approve', false],
    ['reopen', false],
    ['uncancel', false],
    [null, false],
  ] as const)('%s → %s', (action, shown) => {
    expect(isNextStep(action)).toBe(shown);
  });
});

describe('unwrapTask (Eden result)', () => {
  it('returns the data of a successful call', () => {
    expect(unwrapTask({ data: { id: 't1' }, error: null })).toEqual({ id: 't1' });
  });

  it('throws an ApiError with the task wording for a 404', () => {
    const call = () =>
      unwrapTask({
        data: null,
        error: { status: 404, value: { error: 'Data tidak ada.', code: 'NOT_FOUND' } },
      });
    expect(call).toThrow(NOT_FOUND_TEXT);
  });

  it('maps BAD_CURSOR (400) to an ApiError that keeps the server text', () => {
    const msg = 'Halaman daftar tidak dikenali. Muat ulang daftar dari awal.';
    const call = () =>
      unwrapTask({ data: null, error: { status: 400, value: { error: msg, code: 'BAD_CURSOR' } } });
    expect(call).toThrow(msg);
  });

  it('sends a 401 to the login handler', () => {
    let left = false;
    expect(() =>
      unwrapTask({ data: null, error: { status: 401, value: {} } }, () => {
        left = true;
      }),
    ).toThrow(ApiError);
    expect(left).toBe(true);
  });
});

describe('fetchTasks (Eden)', () => {
  it('sends the query and the cursor of the next page', async () => {
    const spy = stubFetch(json(200, { items: [], nextCursor: null, caps: {} }));
    const query = toTaskQuery(DEFAULT_TASK_FILTERS, { viewerId: 'u-1' });
    expect(await fetchTasks(query, 'cur-2')).toEqual({ items: [], nextCursor: null, caps: {} });
    const input = spy.mock.calls[0]?.[0];
    const url = new URL(input instanceof Request ? input.url : String(input));
    expect(url.pathname).toBe('/api/app/tasks');
    expect(url.searchParams.get('scope')).toBe('mine');
    expect(url.searchParams.get('cursor')).toBe('cur-2');
    expect(url.searchParams.getAll('status')).toEqual(['todo', 'in_progress', 'in_review']);
  });
});

describe('workflow wrappers (S2-05 contract)', () => {
  it('POSTs a step to /tasks/:ref/<step> with an escaped ref', async () => {
    const spy = stubFetch(json(200, { task: { id: 't1', number: 7, status: 'in_progress' } }));
    expect((await startTask('7')).task.status).toBe('in_progress');
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/app/tasks/7/start');
    expect(init.method).toBe('POST');
  });

  it('sends the reason of reopen and the category of cancel', async () => {
    const spy = stubFetch(json(200, { task: { id: 't1', number: 7, status: 'todo' } }));
    await reopenTask('a/b', { reason: 'Masih bocor' });
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/app/tasks/a%2Fb/reopen');
    expect(JSON.parse(String(init.body))).toEqual({
      reason: 'Masih bocor',
    });
  });

  it('maps a 409 STATE_CONFLICT to the task wording and keeps it detectable', async () => {
    stubFetch(json(409, { error: 'x', code: 'STATE_CONFLICT', status: 409, requestId: 'r' }));
    const err = await cancelTask('7', { category: 'other', note: 'dobel' }).catch(
      (e: unknown) => e,
    );
    expect((err as ApiError).message).toBe(STATE_CONFLICT_TEXT);
    expect(isStaleTaskError(err)).toBe(true);
  });
});

describe('taskKeys', () => {
  it('nests lists, counts and detail under one prefix so one invalidation refreshes all', () => {
    const q = toTaskQuery(DEFAULT_TASK_FILTERS, { viewerId: 'u-1' });
    for (const key of [taskKeys.list(q), taskKeys.counts(), taskKeys.detail('7')]) {
      expect(key.slice(0, 1)).toEqual([...taskKeys.all]);
    }
  });
});
