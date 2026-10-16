import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import {
  LABEL_LEAD,
  NOT_FOUND_TEXT,
  PROJECT_ERROR_MESSAGES,
} from '../app/components/projects/projects.copy';
import { ApiError } from '../app/lib/http';
import {
  createProject,
  projectErrorMessage,
  projectKeys,
  removeProjectMember,
  unwrap,
  withProjectMessage,
} from '../app/lib/projects-api';

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

describe('project error code → Indonesian message', () => {
  it.each(Object.entries(PROJECT_ERROR_MESSAGES))('%s uses the project wording', (code, text) => {
    expect(projectErrorMessage(apiError(409, code))).toBe(text as string);
  });

  it('names the lead with LABEL_LEAD, never the old "Penanggung jawab"', () => {
    for (const code of ['LEAD_MUST_BE_MANAGER', 'IS_LEAD']) {
      const msg = projectErrorMessage(apiError(409, code));
      expect(msg).toContain(LABEL_LEAD);
      expect(msg).not.toContain('Penanggung jawab');
    }
  });

  it('keeps the server text for codes without a project wording', () => {
    expect(projectErrorMessage(apiError(409, 'STATE_CONFLICT', 'Sudah diubah.'))).toBe(
      'Sudah diubah.',
    );
  });

  it('shows the first field issue for a 422 validation error', () => {
    const err = new ApiError({
      status: 422,
      code: 'VALIDATION',
      message: 'Isian belum sesuai.',
      issues: [{ path: 'name', message: 'Nama proyek wajib diisi.' }],
    });
    expect(projectErrorMessage(err)).toBe('Periksa isian: Nama proyek wajib diisi.');
  });

  it('never leaks a server error detail on 5xx', () => {
    expect(projectErrorMessage(apiError(500, 'INTERNAL', 'stack trace'))).toContain('req-1');
    expect(projectErrorMessage(apiError(500, 'INTERNAL', 'stack trace'))).not.toContain('stack');
  });

  it('leaves non-API errors untouched', () => {
    const err = new Error('x');
    expect(withProjectMessage(err)).toBe(err);
  });
});

describe('unwrap (Eden result)', () => {
  it('returns the data of a successful call', () => {
    expect(unwrap({ data: { id: 'p1' }, error: null })).toEqual({ id: 'p1' });
  });

  it('throws an ApiError with the project wording for a 404', () => {
    const call = () =>
      unwrap({
        data: null,
        error: { status: 404, value: { error: 'Data tidak ada.', code: 'NOT_FOUND' } },
      });
    expect(call).toThrow(NOT_FOUND_TEXT);
    try {
      call();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
      expect((err as ApiError).code).toBe('NOT_FOUND');
    }
  });

  it('sends a 401 to the login handler', () => {
    let left = false;
    expect(() =>
      unwrap({ data: null, error: { status: 401, value: {} } }, () => {
        left = true;
      }),
    ).toThrow(ApiError);
    expect(left).toBe(true);
  });
});

describe('write wrappers (S1-03/S1-04 contract)', () => {
  it('POSTs the create body and accepts `{ project }` or the bare project', async () => {
    const spy = stubFetch(json(201, { project: { id: 'p9', name: 'Atlas' } }));
    expect(await createProject({ name: 'Atlas', members: [] })).toEqual({
      id: 'p9',
      name: 'Atlas',
    });
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/app/projects');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ name: 'Atlas', members: [] });
  });

  it('maps LAST_MANAGER on member removal to the project wording', async () => {
    stubFetch(json(409, { error: 'x', code: 'LAST_MANAGER', status: 409, requestId: 'r' }));
    const err = await removeProjectMember('p 1', 'u/1').catch((e: unknown) => e);
    expect((err as ApiError).message).toBe(PROJECT_ERROR_MESSAGES.LAST_MANAGER as string);
  });

  it('escapes ids in member URLs', async () => {
    const spy = stubFetch(new Response(null, { status: 204 }));
    await removeProjectMember('p 1', 'u/1');
    expect(spy.mock.calls[0]?.[0]).toBe('/api/app/projects/p%201/members/u%2F1');
  });
});

describe('projectKeys', () => {
  it('nests detail and members under one prefix so one invalidation refreshes all', () => {
    expect(projectKeys.detail('p1').slice(0, 1)).toEqual([...projectKeys.all]);
    expect(projectKeys.members('p1').slice(0, 3)).toEqual([...projectKeys.detail('p1')]);
  });
});
