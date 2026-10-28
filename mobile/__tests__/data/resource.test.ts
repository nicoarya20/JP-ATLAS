/**
 * The fetch-store-invalidate rules every module that reads the API follows (mobile/docs/phase2-pola-data.md).
 *
 * The one worth reading twice is invalidation. Screens here never unmount, so after a successful
 * write nothing refetches by itself: whatever store the write touched keeps showing the old value
 * on every screen still alive. That is the risk the user took in exchange for synchronous reads,
 * and these tests are the price being paid.
 */
import { ApiError } from '@/api/errors';
import { forgetAllResources, resource, write } from '@/data/resource';
import { clearSession, sessionStore } from '@/session/session.state';

import { APPROVED_USER, resetSessionForTest, seedSession } from '../helpers/session-fixtures';

const apiError = (init: { status: number; code: string }) =>
  new ApiError({ message: 'nope', code: init.code, status: init.status });

/** A resource whose answers the test controls, counting how often it was really asked. */
function counted<T>(answers: () => Promise<T>) {
  let calls = 0;
  const r = resource<T>('test', () => {
    calls += 1;
    return answers();
  });
  return { r, calls: () => calls };
}

beforeEach(() => {
  forgetAllResources();
  resetSessionForTest();
  seedSession();
});

describe('ensure', () => {
  it('fetches once, however many screens ask: a mount effect runs per screen instance', async () => {
    const { r, calls } = counted(async () => 'data');

    await r.ensure();
    await r.ensure();
    await r.ensure();

    expect(calls()).toBe(1);
    expect(r.current()).toBe('data');
    expect(r.peek().phase).toBe('ready');
  });

  it('joins a request already in flight instead of starting a second', async () => {
    let release: (v: string) => void = () => {};
    const { r, calls } = counted(() => new Promise<string>((res) => (release = res)));

    const first = r.ensure();
    const second = r.ensure();
    expect(r.peek().phase).toBe('loading');
    release('data');
    await Promise.all([first, second]);

    expect(calls()).toBe(1);
  });

  it('tries again after a failure, since there is nothing fresh to keep', async () => {
    let fail = true;
    const { r, calls } = counted(async () => {
      if (fail) throw apiError({ status: 500, code: 'BOOM' });
      return 'data';
    });

    await r.ensure();
    expect(r.peek().phase).toBe('failed');
    fail = false;
    await r.ensure();

    expect(calls()).toBe(2);
    expect(r.current()).toBe('data');
  });
});

describe('reload', () => {
  it('fetches even when the data on hand is fresh', async () => {
    const { r, calls } = counted(async () => 'data');

    await r.ensure();
    await r.reload();

    expect(calls()).toBe(2);
  });

  it('keeps showing what it has while the new answer is on its way', async () => {
    let release: (v: string) => void = () => {};
    let answer = 'first';
    const { r } = counted(() =>
      answer === 'first' ? Promise.resolve('first') : new Promise<string>((res) => (release = res)),
    );

    await r.ensure();
    answer = 'second';
    const pending = r.reload();

    expect(r.peek().phase).toBe('loading');
    expect(r.current()).toBe('first'); // no blank frame
    release('second');
    await pending;
    expect(r.current()).toBe('second');
  });
});

describe('invalidate', () => {
  it('refetches what a screen is showing, because no screen will unmount and do it', async () => {
    let answer = 'first';
    const { r, calls } = counted(async () => answer);

    await r.ensure();
    answer = 'second';
    r.invalidate();
    await r.ensure();

    expect(calls()).toBe(2);
    expect(r.current()).toBe('second');
  });

  it('leaves a resource nobody has loaded alone: the first ensure() will fetch it anyway', async () => {
    const { r, calls } = counted(async () => 'data');

    r.invalidate();

    expect(calls()).toBe(0);
    expect(r.peek().phase).toBe('empty');
  });
});

describe('write', () => {
  it('marks every resource the write could have changed, after it succeeded', async () => {
    let tasks = 'tasks v1';
    let home = 'home v1';
    const tasksRes = counted(async () => tasks);
    const homeRes = counted(async () => home);
    await Promise.all([tasksRes.r.ensure(), homeRes.r.ensure()]);

    tasks = 'tasks v2';
    home = 'home v2';
    await write(async () => 'saved', [tasksRes.r, homeRes.r]);
    await Promise.all([tasksRes.r.ensure(), homeRes.r.ensure()]);

    // Saving a task changes the Home counters too; naming both is the whole point of the rule.
    expect(tasksRes.r.current()).toBe('tasks v2');
    expect(homeRes.r.current()).toBe('home v2');
  });

  it('leaves the stores alone when the write failed: nothing changed, so nothing is stale', async () => {
    const { r, calls } = counted(async () => 'data');
    await r.ensure();

    await expect(
      write(async () => {
        throw apiError({ status: 422, code: 'INVALID' });
      }, [r]),
    ).rejects.toThrow('nope');

    expect(calls()).toBe(1);
    expect(r.peek().stale).toBe(false);
  });
});

describe('a failure from /api/app', () => {
  it('lets the server correct the session: a 401 ends it', async () => {
    const { r } = counted(async () => {
      throw apiError({ status: 401, code: 'UNAUTHORIZED' });
    });

    await r.ensure();

    expect(sessionStore.get().status).toBe('signed-out');
    // Ending the session forgot this resource; the failure must not write itself back in.
    expect(r.peek()).toMatchObject({ phase: 'empty', error: null });
  });

  it('moves a withdrawn approval to the waiting screen', async () => {
    const { r } = counted(async () => {
      throw apiError({ status: 403, code: 'ACCOUNT_PENDING' });
    });

    await r.ensure();

    expect(sessionStore.get().status).toBe('pending');
    expect(sessionStore.get().user?.id).toBe(APPROVED_USER.id);
  });

  it('leaves the session alone for a failure that proves nothing about it', async () => {
    const { r } = counted(async () => {
      throw apiError({ status: 0, code: 'NETWORK' });
    });

    await r.ensure();

    expect(sessionStore.get().status).toBe('signed-in');
    expect(r.peek().error?.code).toBe('NETWORK');
  });

  it('keeps a mapping bug readable instead of swallowing it', async () => {
    const { r } = counted(async () => {
      throw new TypeError('cannot read property name of undefined');
    });

    await r.ensure();

    const { error } = r.peek();
    expect(error?.code).toBe('BAD_RESPONSE');
    expect(error?.cause).toBeInstanceOf(TypeError);
  });
});

describe('sign out', () => {
  it('forgets every resource, since no screen unmounts to clear itself', async () => {
    const a = counted(async () => 'a');
    const b = counted(async () => 'b');
    await Promise.all([a.r.ensure(), b.r.ensure()]);

    forgetAllResources();

    expect(a.r.current()).toBeNull();
    expect(b.r.current()).toBeNull();
    expect(a.r.peek().phase).toBe('empty');
  });

  it('forgets on every path to signed out, not only the Sign out button', async () => {
    const a = counted(async () => 'a');
    await a.r.ensure();

    // A 401 from another request, or a ban seen on a session read, ends the session the same way.
    clearSession();

    expect(a.r.peek().phase).toBe('empty');
  });

  it("drops an answer that arrives after sign out: it was the last account's", async () => {
    let answer = (_value: string) => {};
    const { r } = counted(
      () =>
        new Promise<string>((resolve) => {
          answer = resolve;
        }),
    );
    const pending = r.ensure();

    forgetAllResources();
    answer('old account');
    await pending;

    expect(r.current()).toBeNull();
    expect(r.peek().phase).toBe('empty');
  });

  it("does not let the last account's late 401 end the next account's session", async () => {
    let refuse = (_error: ApiError) => {};
    const { r } = counted(
      () =>
        new Promise<string>((_resolve, reject) => {
          refuse = reject;
        }),
    );
    const pending = r.ensure();

    clearSession();
    seedSession();
    refuse(apiError({ status: 401, code: 'UNAUTHORIZED' }));
    await pending;

    expect(sessionStore.get().status).toBe('signed-in');
    expect(r.peek().phase).toBe('empty');
  });

  it('starts a fresh request after sign out instead of joining the old one', async () => {
    const { r, calls } = counted(() => new Promise<string>(() => {}));
    void r.ensure();

    forgetAllResources();
    void r.ensure();

    expect(calls()).toBe(2);
  });
});
