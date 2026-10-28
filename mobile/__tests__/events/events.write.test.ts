// Event writes against a stubbed server (map §4): the requests each one makes, in order, and what is read again after
// it. A failed step stops the rest; whatever was saved before it is still read again.
import { eventListTargets, eventResource, eventsListResource } from '../../src/data/events.api';
import {
  cancelEvent,
  createEvent,
  restoreEvent,
  saveEvent,
  trashEvent,
} from '../../src/data/events.write';
import { forgetAllResources } from '../../src/data/resource';
import { serveAuth } from '../helpers/auth-server';
import { homePayload } from '../helpers/clock-fixtures';
import {
  eventsPage,
  recording,
  reviewDetail,
  reviewItem,
  type Sent,
} from '../helpers/events-fixtures';

let server: ReturnType<typeof serveAuth> | null = null;
let log: Sent[] = [];
/** Answer per request: a write gets `write`, a read of the list a page, a read of the event its detail. */
let write: (s: Sent) => { status?: number; body?: unknown } = () => ({ body: reviewDetail() });

beforeEach(() => {
  forgetAllResources();
  log = [];
  write = () => ({ body: reviewDetail() });
  server = serveAuth({
    '/api/app/home': { body: homePayload() },
    ...recording(log, '/api/app/', (s) => {
      if (s.method !== 'GET') return write(s);
      return s.url.startsWith('/api/app/events?')
        ? { body: eventsPage([reviewItem()]) }
        : { body: reviewDetail() };
    }),
  });
});
afterEach(() => {
  server?.restore();
  server = null;
});

const writes = () => log.filter((s) => s.method !== 'GET').map((s) => `${s.method} ${s.url}`);
const reads = (url: string) =>
  log.filter((s) => s.method === 'GET' && s.url.startsWith(url)).length;
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('event writes', () => {
  test('create posts the body and reads every kept list again', async () => {
    await eventsListResource('tab=upcoming').ensure();
    const made = await createEvent({
      title: 'Design sync',
      startsAt: '2026-10-07T02:00:00.000Z',
      endsAt: '2026-10-07T03:00:00.000Z',
      projectId: null,
    });
    await settle();
    expect(made.id).toBe('e-review');
    expect(log.find((s) => s.method === 'POST')).toEqual({
      method: 'POST',
      url: '/api/app/events',
      body: {
        title: 'Design sync',
        startsAt: '2026-10-07T02:00:00.000Z',
        endsAt: '2026-10-07T03:00:00.000Z',
        projectId: null,
      },
    });
    expect(reads('/api/app/events?')).toBe(2);
  });

  test('an edit saves the fields, then the new guests, then each guest who leaves', async () => {
    await saveEvent(
      'e-review',
      { title: 'Review v2' },
      { add: ['u-ayu'], remove: ['u-rina', 'u-dodi'] },
    );
    expect(writes()).toEqual([
      'PATCH /api/app/events/e-review',
      'POST /api/app/events/e-review/participants',
      'DELETE /api/app/events/e-review/participants/u-rina',
      'DELETE /api/app/events/e-review/participants/u-dodi',
    ]);
    expect(
      log
        .filter((s) => s.method !== 'GET')
        .map((s) => s.body)
        .slice(0, 2),
    ).toEqual([{ title: 'Review v2' }, { userIds: ['u-ayu'] }]);
  });

  test('an edit with only guests sends no PATCH; nothing at all sends nothing', async () => {
    await saveEvent('e-review', {}, { add: [], remove: ['u-rina'] });
    expect(writes()).toEqual(['DELETE /api/app/events/e-review/participants/u-rina']);
    log.length = 0;
    await saveEvent('e-review', {}, { add: [], remove: [] });
    expect(log).toEqual([]);
  });

  test('a refused step stops the rest, throws the server answer, and what was saved is read again', async () => {
    const detail = eventResource('e-review');
    await detail.ensure();
    write = (s) =>
      s.url.endsWith('/participants')
        ? { status: 422, body: { error: 'Ada peserta yang tidak ditemukan.', code: 'VALIDATION' } }
        : { body: reviewDetail() };
    await expect(
      saveEvent('e-review', { title: 'Review v2' }, { add: ['u-ghost'], remove: ['u-rina'] }),
    ).rejects.toMatchObject({ status: 422, code: 'VALIDATION' });
    await settle();
    expect(writes()).toEqual([
      'PATCH /api/app/events/e-review',
      'POST /api/app/events/e-review/participants',
    ]);
    expect(reads('/api/app/events/e-review')).toBe(2);
  });

  test('cancel posts the reason', async () => {
    await cancelEvent('e-review', 'Room taken');
    expect(log.find((s) => s.method === 'POST')).toMatchObject({
      url: '/api/app/events/e-review/cancel',
      body: { reason: 'Room taken' },
    });
  });

  test('Move to Trash forgets the event; Undo restores it from the Trash', async () => {
    write = (s) =>
      s.method === 'DELETE'
        ? { body: { trash: { kind: 'event', id: 'e-review', label: 'Onboarding design review' } } }
        : { body: { id: 'e-review' } };
    const detail = eventResource('e-review');
    await detail.ensure();
    const moved = await trashEvent('e-review');
    expect(moved.trash.id).toBe('e-review');
    expect(detail.current()).toBeNull();
    await restoreEvent('e-review');
    expect(writes()).toEqual([
      'DELETE /api/app/events/e-review',
      'POST /api/app/trash/event/e-review/restore',
    ]);
  });

  test('lists and windows kept are what a write reads again', async () => {
    await eventsListResource('tab=past').ensure();
    expect(eventListTargets()).toContain(eventsListResource('tab=past'));
  });
});
