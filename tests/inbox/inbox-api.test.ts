/** Inbox client: request shapes, error mapping, the polling contract of the bell and the card actions. */
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { markCardRead } from '../../app/components/inbox/useInboxActions';
import { leaveTargetOf } from '../../app/components/inbox/useInboxLeave';
import { ApiError, describeApiError } from '../../app/lib/http';
import {
  fetchInbox,
  fetchInboxCounts,
  inboxKeys,
  laneFromTab,
  markAllInboxRead,
  markInboxRead,
  uniqueInboxItems,
} from '../../app/lib/inbox-api';
import { approveLeave } from '../../app/lib/leave-api';
import {
  INBOX_COUNT_POLL_MS,
  INBOX_LIST_POLL_MS,
  inboxCountOptions,
} from '../../app/lib/use-inbox';
import { leaveRequestCard, NOW, taskCard } from './inbox-fixtures';

const fetchSpy = spyOn(globalThis, 'fetch');
afterEach(() => fetchSpy.mockReset());
// A fresh Response per call: a body can be read once, and the tests send more than one request.
const reply = (status: number, body: unknown) =>
  fetchSpy.mockImplementation(
    (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch,
  );
const lastCall = () => fetchSpy.mock.calls.at(-1) as [string, RequestInit];

describe('reads', () => {
  it('asks for one lane, and passes the cursor only when there is one', async () => {
    reply(200, { items: [], nextCursor: null });
    await fetchInbox('info');
    expect(lastCall()[0]).toBe('/api/app/inbox?lane=info');
    await fetchInbox('action', 'abc def');
    expect(lastCall()[0]).toBe('/api/app/inbox?lane=action&cursor=abc+def');
  });

  it('reads the bell numbers', async () => {
    reply(200, { action: 4, infoUnread: 2 });
    expect(await fetchInboxCounts()).toEqual({ action: 4, infoUnread: 2 });
    expect(lastCall()[0]).toBe('/api/app/inbox/count');
  });

  it('turns a broken cursor into the sentence the page shows, with the code to branch on', async () => {
    reply(400, {
      error: 'Halaman Inbox tidak dikenali. Muat ulang Inbox dari awal.',
      code: 'BAD_CURSOR',
    });
    const err = await fetchInbox('action', 'x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('BAD_CURSOR');
    expect(describeApiError(err)).toBe('Halaman Inbox tidak dikenali. Muat ulang Inbox dari awal.');
  });

  it('keeps ISO timestamps as strings (Eden would turn them into Date objects)', async () => {
    reply(200, { items: [taskCard()], nextCursor: null });
    const page = await fetchInbox('action');
    expect(typeof page.items[0]?.createdAt).toBe('string');
  });
});

describe('writes', () => {
  it('marks one card read with an escaped id and a POST', async () => {
    reply(200, { ok: true });
    await markInboxRead('a/b c');
    const [url, init] = lastCall();
    expect(url).toBe('/api/app/inbox/a%2Fb%20c/read');
    expect(init.method).toBe('POST');
  });

  it('marks all news read', async () => {
    reply(200, { updated: 3 });
    expect(await markAllInboxRead()).toEqual({ updated: 3 });
    expect(lastCall()[0]).toBe('/api/app/inbox/read-all');
    expect(lastCall()[1].method).toBe('POST');
  });

  it('approves the request the leave card stands for through the leave route', async () => {
    reply(200, { request: {} });
    await approveLeave(leaveTargetOf(leaveRequestCard()).id);
    expect(lastCall()[0]).toBe('/api/app/leave/l-9/approve');
    expect(lastCall()[1].method).toBe('POST');
  });
});

describe('markCardRead (opening a card)', () => {
  it('marks an unread card read, then refreshes', async () => {
    reply(200, { ok: true });
    let refreshed = 0;
    markCardRead(taskCard({ id: 'n-7' }), () => refreshed++);
    await Bun.sleep(10);
    expect(lastCall()[0]).toBe('/api/app/inbox/n-7/read');
    expect(refreshed).toBe(1);
  });

  it('sends nothing for a card that is already read', async () => {
    reply(200, { ok: true });
    markCardRead(taskCard({ read: true }), () => {});
    await Bun.sleep(10);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('still refreshes when the write fails, so the dot shows the truth', async () => {
    reply(500, { error: 'x' });
    let refreshed = 0;
    markCardRead(taskCard(), () => refreshed++);
    await Bun.sleep(10);
    expect(refreshed).toBe(1);
  });
});

describe('leaveTargetOf', () => {
  it('takes the request id from the card ref and the names and dates from its snapshot', () => {
    expect(leaveTargetOf(leaveRequestCard())).toEqual({
      id: 'l-9',
      name: 'Dodi',
      startDate: '2026-10-14',
      endDate: '2026-10-16',
    });
  });

  it('survives a payload without them', () => {
    expect(leaveTargetOf(leaveRequestCard({ payload: {} }))).toEqual({
      id: 'l-9',
      name: '',
      startDate: '',
      endDate: '',
    });
  });
});

describe('keys, tabs and paging helpers', () => {
  it('the bell and both lists live under one prefix, so one invalidation refreshes them all', () => {
    expect(inboxKeys.count.slice(0, 1)).toEqual([...inboxKeys.all]);
    expect(inboxKeys.list('info').slice(0, 1)).toEqual([...inboxKeys.all]);
    expect(inboxKeys.list('info')).not.toEqual(inboxKeys.list('action'));
  });

  it('reads ?tab= leniently: only "info" leaves the work queue', () => {
    expect(laneFromTab('info')).toBe('info');
    expect(laneFromTab(null)).toBe('action');
    expect(laneFromTab('apa-saja')).toBe('action');
  });

  it('joins pages without repeating a card that moved while paging', () => {
    const a = taskCard({ id: 'a' });
    const b = taskCard({ id: 'b' });
    const merged = uniqueInboxItems([
      { items: [a, b], nextCursor: 'c' },
      { items: [b, taskCard({ id: 'c' })], nextCursor: null },
    ]);
    expect(merged.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('the bell polling contract', () => {
  const options = inboxCountOptions({ counts: { action: 4, infoUnread: 1 }, loadedAt: NOW });

  it('polls every 60 s, only while the tab is visible, and again on focus', () => {
    expect(INBOX_COUNT_POLL_MS).toBe(60_000);
    expect(INBOX_LIST_POLL_MS).toBe(30_000);
    expect(options.refetchIntervalInBackground).toBe(false);
    expect(options.refetchOnWindowFocus).toBe(true);
    const interval = options.refetchInterval;
    expect(interval({ state: { error: null } })).toBe(60_000);
  });

  it('stops polling once the session is gone (401), and does not retry it', () => {
    const gone = new ApiError({ status: 401 });
    expect(options.refetchInterval({ state: { error: gone } })).toBe(false);
    expect(options.retry(0, gone)).toBe(false);
  });

  it('retries a network failure once, then gives up until the next tick', () => {
    expect(options.retry(0, new TypeError('offline'))).toBe(true);
    expect(options.retry(1, new TypeError('offline'))).toBe(false);
  });

  it('starts from the loader numbers, so the first render needs no request', () => {
    expect(options.initialData).toEqual({ action: 4, infoUnread: 1 });
    expect(options.initialDataUpdatedAt).toBe(NOW);
    expect(options.queryKey).toEqual(inboxKeys.count);
  });
});
