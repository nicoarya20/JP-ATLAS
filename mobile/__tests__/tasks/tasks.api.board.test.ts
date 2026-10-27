/**
 * Which columns a card may be moved to, and what moving a group of them really sends.
 *
 * The gating is the point: the board shows statuses but the server takes steps, and only twelve
 * transitions exist. A side is offered when that card's own `can{}` carries the key for the step —
 * so a side can be open on one card and shut on the next, nothing here asks who is signed in, and
 * nothing is "tried to see if it works".
 */
import { setAuthHeaders } from '@/api/client';
import type { MovableCard } from '@/data/tasks.api.board';
import { isMovable, movableTo, movableToAll, moveTasksOnBoard } from '@/data/tasks.api.board';

import { serveAuth } from '../helpers/auth-server';

const card = (over: Partial<MovableCard> = {}): MovableCard => ({
  no: 12,
  status: 'To do',
  can: { update: true, start: true, complete: true },
  ...over,
});

describe('which columns a card may be moved to', () => {
  it('offers the steps the server allows from this status, and nothing else', () => {
    expect(movableTo(card())).toEqual(['In progress', 'Done']);
    expect(
      movableTo(card({ status: 'In progress', can: { unstart: true, complete: true } })),
    ).toEqual(['To do', 'Done']);
    expect(movableTo(card({ status: 'Done', can: { reopen: true } }))).toEqual(['In progress']);
  });

  it('shuts a side whose capability the server refuses or left out', () => {
    // A deny code means "shown but disabled" for a button; for a side of the move menu there is
    // nothing to disable halfway, so it is simply not a move that may be made.
    expect(movableTo(card({ can: { start: 'LOCKED_BY_STATUS', complete: true } }))).toEqual([
      'Done',
    ]);
    expect(movableTo(card({ can: { update: true } }))).toEqual([]);
    expect(isMovable(card({ can: { update: true } }))).toBe(false);
  });

  it('shuts a side the status has no transition for, however can{} answers', () => {
    // `requestReview` exists as a capability but In review is reached from In progress, never from
    // To do: there is no such transition, so no amount of permission opens that side.
    expect(movableTo(card({ can: { start: true, requestReview: true } }))).toEqual(['In progress']);
  });

  it('a group offers only the sides every one of its cards may take', () => {
    const todo = card({ no: 1 });
    const started = card({ no: 2, status: 'In progress', can: { unstart: true, complete: true } });
    expect(movableToAll([todo, started])).toEqual(['Done']);
    expect(movableToAll([todo, todo])).toEqual(['In progress', 'Done']);
    // Nothing held is nothing to move, rather than "every side is fine".
    expect(movableToAll([])).toEqual([]);
  });
});

describe('moving a group', () => {
  let server: ReturnType<typeof serveAuth> | null = null;

  beforeEach(() => {
    setAuthHeaders(null);
  });
  afterEach(() => {
    server?.restore();
    server = null;
  });

  it('sends one request per task, to the step each card’s status needs', async () => {
    server = serveAuth({ '/api/app/tasks/': { body: { task: {}, can: {} } } });
    const started = card({ no: 2, status: 'In progress', can: { unstart: true, complete: true } });
    const out = await moveTasksOnBoard([card({ no: 1 }), started], [1, 2], 'Done');
    expect(out).toMatchObject({ moved: 2, skipped: 0, failure: null });
    expect(server.calls.filter((u) => u.includes('/tasks/'))).toEqual([
      expect.stringContaining('/api/app/tasks/1/complete'),
      expect.stringContaining('/api/app/tasks/2/complete'),
    ]);
  });

  it('sends nothing for a card the move is not offered for, and does not count it as moved', async () => {
    server = serveAuth({ '/api/app/tasks/': { body: { task: {}, can: {} } } });
    const locked = card({ no: 2, can: { update: true } });
    const out = await moveTasksOnBoard([card({ no: 1 }), locked], [1, 2], 'Done');
    expect(out).toMatchObject({ moved: 1, skipped: 1 });
    expect(server.calls.filter((u) => u.includes('/tasks/'))).toHaveLength(1);
  });

  it('hands back the server’s refusal instead of swallowing it, and counts what did move', async () => {
    const refusal = {
      status: 409,
      body: {
        error: 'Status tugas sudah berubah. Muat ulang halaman.',
        code: 'WRONG_STATE',
        status: 409,
        requestId: 'r',
      },
    };
    server = serveAuth({
      '/api/app/tasks/1/': { body: { task: {}, can: {} } },
      '/api/app/tasks/': refusal,
    });
    const out = await moveTasksOnBoard([card({ no: 1 }), card({ no: 2 })], [1, 2], 'Done');
    expect(out.moved).toBe(1);
    expect(out.failure).toMatchObject({
      code: 'WRONG_STATE',
      message: 'Status tugas sudah berubah. Muat ulang halaman.',
    });
  });

  it('a card that is not on the board is skipped, not guessed at', async () => {
    server = serveAuth({ '/api/app/tasks/': { body: { task: {}, can: {} } } });
    const out = await moveTasksOnBoard([card({ no: 1 })], [1, 99], 'Done');
    expect(out).toMatchObject({ moved: 1, skipped: 1 });
  });
});
