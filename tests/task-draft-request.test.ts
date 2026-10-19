/** The Susun call (U1): body sent, and what each refusal means (fallback to the form, wait, or show the server's sentence). */
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { requestDraft, restoreDates } from '../app/components/tasks/useTaskDraft';
import { TASK_DRAFT_CODES, TASK_DRAFT_MESSAGES } from '../server/ai/task-draft.limits';
import { STORY, TWO_DRAFTS } from './support/task-draft-fixtures';

let restore: (() => void) | null = null;
function stubFetch(reply: () => Response | Promise<Response>) {
  const spy = spyOn(globalThis, 'fetch').mockImplementation((async () =>
    reply()) as unknown as typeof fetch);
  restore = () => spy.mockRestore();
  return spy;
}
afterEach(() => {
  restore?.();
  restore = null;
});

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

describe('requestDraft', () => {
  it('posts { projectId, text } to the draft endpoint and returns the drafts', async () => {
    const spy = stubFetch(() => json(200, TWO_DRAFTS));
    const out = await requestDraft('p-1', STORY);
    expect(out).toEqual({ kind: 'ok', body: TWO_DRAFTS });
    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0] as unknown as [string | Request, RequestInit | undefined];
    const target = typeof url === 'string' ? url : url.url;
    expect(target).toEndWith('/api/app/tasks/draft');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ projectId: 'p-1', text: STORY });
  });

  it.each([
    [503, TASK_DRAFT_CODES.disabled, TASK_DRAFT_MESSAGES.disabled],
    [502, TASK_DRAFT_CODES.unavailable, TASK_DRAFT_MESSAGES.unavailable],
  ])('falls back to the form on %i %s', async (status, code, error) => {
    stubFetch(() => json(status, { error, code, status, requestId: 'r1' }));
    expect(await requestDraft('p-1', STORY)).toEqual({ kind: 'fallback' });
  });

  it('falls back when the network fails', async () => {
    stubFetch(() => {
      throw new TypeError('Failed to fetch');
    });
    expect(await requestDraft('p-1', STORY)).toEqual({ kind: 'fallback' });
  });

  it('falls back on a proxy page that is not our error body', async () => {
    stubFetch(() => new Response('<html>Bad gateway</html>', { status: 504 }));
    expect(await requestDraft('p-1', STORY)).toEqual({ kind: 'fallback' });
  });

  it('reads the wait from retry-after on 429', async () => {
    stubFetch(() =>
      json(
        429,
        { error: 'x', code: 'RATE_LIMITED', retryAfterSeconds: 9 },
        { 'retry-after': '42' },
      ),
    );
    expect(await requestDraft('p-1', STORY)).toEqual({ kind: 'rate', seconds: 42 });
  });

  it('falls back to the body seconds when the header is missing', async () => {
    stubFetch(() => json(429, { error: 'x', code: 'RATE_LIMITED', retryAfterSeconds: 9 }));
    expect(await requestDraft('p-1', STORY)).toEqual({ kind: 'rate', seconds: 9 });
  });

  it.each([
    [400, TASK_DRAFT_CODES.textTooLong, TASK_DRAFT_MESSAGES.textTooLong],
    [403, 'NOT_MEMBER', 'Kamu bukan anggota proyek ini.'],
    [409, 'PROJECT_IN_TRASH', 'Proyek ini ada di Sampah.'],
  ])('shows the server sentence as is on %i %s', async (status, code, error) => {
    stubFetch(() => json(status, { error, code, status, requestId: 'r1' }));
    expect(await requestDraft('p-1', STORY)).toEqual({ kind: 'error', message: error });
  });

  it('keeps a real server fault (500 with our body) out of the fallback', async () => {
    stubFetch(() => json(500, { error: 'Terjadi kesalahan.', code: 'INTERNAL', requestId: 'r9' }));
    const out = await requestDraft('p-1', STORY);
    expect(out.kind).toBe('error');
  });
});

describe('restoreDates', () => {
  it('puts the dates Eden parsed back to the strings of the contract', () => {
    const parsed = {
      title: 'Rapat',
      dueDate: new Date('2026-10-08'),
      nested: [{ at: new Date('2026-10-08T03:00:00.000Z') }],
      none: null,
    };
    expect(restoreDates(parsed)).toEqual({
      title: 'Rapat',
      dueDate: '2026-10-08',
      nested: [{ at: '2026-10-08T03:00:00.000Z' }],
      none: null,
    });
  });
});
