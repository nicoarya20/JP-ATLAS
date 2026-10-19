/** POST /app/tasks/draft (A1): sign-in, input checks, permission like task creation, provider fallbacks. */
import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '../../server/db';
import { project } from '../../server/db/schema';
import { call, expectApiError } from '../support/api';
import { installDraftHarness, modelDraft, URL_PATH } from '../support/draft-harness';

const { auth, provider, f, world, draft, answerWith } = installDraftHarness('tdgate');

describe('gate and input', () => {
  it('answers 401 to an anonymous caller', async () => {
    const w = await world();
    expectApiError(await draft(w.proj.id), 401, 'UNAUTHORIZED');
  });

  it.each(['', '   \n '])(
    'answers 400 TEXT_EMPTY for %j without calling the provider',
    async (text) => {
      const w = await world();
      auth.as(w.rina);
      const res = await draft(w.proj.id, text);
      expectApiError(res, 400, 'TEXT_EMPTY');
      expect(provider.calls).toHaveLength(0);
    },
  );

  it('answers 400 TEXT_TOO_LONG above the limit and accepts exactly the limit', async () => {
    const w = await world();
    auth.as(w.rina);
    expectApiError(await draft(w.proj.id, 'a'.repeat(2001)), 400, 'TEXT_TOO_LONG');
    expect(provider.calls).toHaveLength(0);
    answerWith([modelDraft()]);
    expect((await draft(w.proj.id, 'a'.repeat(2000))).status).toBe(200);
  });

  it('answers 422 to a body of the wrong shape', async () => {
    const w = await world();
    auth.as(w.rina);
    expectApiError(await call('POST', URL_PATH, { projectId: w.proj.id }), 422, 'VALIDATION');
    expectApiError(await call('POST', URL_PATH, { text: 'x' }), 422, 'VALIDATION');
  });
});

describe('permission follows task creation', () => {
  it('refuses a Pemantau with 403 before any provider call', async () => {
    const w = await world();
    auth.as(w.watcher);
    expectApiError(await draft(w.proj.id), 403, 'NOT_MEMBER');
    expect(provider.calls).toHaveLength(0);
  });

  it('answers 404 to a non-member and to a project that does not exist', async () => {
    const w = await world();
    auth.as(w.outsider);
    expectApiError(await draft(w.proj.id), 404, 'NOT_FOUND');
    expectApiError(await draft('no-such-project'), 404, 'NOT_FOUND');
    expect(provider.calls).toHaveLength(0);
  });

  it('answers 409 for a project in the Trash', async () => {
    const w = await world();
    await db
      .update(project)
      .set({ deletedAt: new Date(), deletedBy: w.lead.id })
      .where(eq(project.id, w.proj.id));
    auth.as(w.lead);
    expectApiError(await draft(w.proj.id), 409, 'PROJECT_IN_TRASH');
  });

  it('lets a member, a manager and an admin draft', async () => {
    const w = await world();
    const admin = await f.user({ role: 'admin' });
    answerWith([modelDraft()]);
    for (const who of [w.rina, w.lead, admin]) {
      auth.as(who);
      expect((await draft(w.proj.id)).status).toBe(200);
    }
  });
});

describe('provider fallbacks', () => {
  it('answers 503 AI_DISABLED without a key and never calls the provider', async () => {
    const w = await world();
    delete process.env.ANTHROPIC_API_KEY;
    auth.as(w.rina);
    const res = await draft(w.proj.id);
    expectApiError(res, 503, 'AI_DISABLED');
    expect(res.body.error).toContain('Isi form saja');
    expect(provider.calls).toHaveLength(0);
    process.env.ANTHROPIC_API_KEY = '   '; // blank counts as unset
    expectApiError(await draft(w.proj.id), 503, 'AI_DISABLED');
  });

  it('answers 502 AI_UNAVAILABLE when the provider fails, times out or is rate limited', async () => {
    const w = await world();
    auth.as(w.rina);
    for (const code of [400, 401, 429, 500, 529]) {
      provider.http(code);
      const res = await draft(w.proj.id);
      expectApiError(res, 502, 'AI_UNAVAILABLE');
      expect(res.body.error).toBe('Tulis saja belum bisa dipakai sekarang. Isi form saja.');
    }
    provider.on(() => {
      throw new DOMException('timed out', 'TimeoutError');
    });
    expectApiError(await draft(w.proj.id), 502, 'AI_UNAVAILABLE');
    provider.on(() => {
      throw new TypeError('fetch failed');
    });
    expectApiError(await draft(w.proj.id), 502, 'AI_UNAVAILABLE');
  });

  it.each([
    [
      'an answer that is not the tool call',
      { stop_reason: 'end_turn', content: [{ type: 'text', text: 'hi' }] },
    ],
    [
      'an answer cut off by the token limit',
      {
        stop_reason: 'max_tokens',
        content: [
          { type: 'tool_use', name: 'susun_draf_tugas', input: { drafts: [], question: null } },
        ],
      },
    ],
    [
      'tool input of the wrong shape',
      {
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', name: 'susun_draf_tugas', input: 'oops' }],
      },
    ],
  ])('answers 502 for %s', async (_label, body) => {
    const w = await world();
    auth.as(w.rina);
    provider.on(() => Response.json(body));
    expectApiError(await draft(w.proj.id), 502, 'AI_UNAVAILABLE');
  });

  it.each([
    ['more than ten drafts', Array.from({ length: 11 }, () => modelDraft())],
    ['an untitled draft', [modelDraft({ title: '' })]],
    ['no draft and no question', []],
    ['a draft that is not an object', ['hapus semua']],
  ])('answers 502 for %s', async (_label, drafts) => {
    const w = await world();
    auth.as(w.rina);
    answerWith(drafts);
    expectApiError(await draft(w.proj.id), 502, 'AI_UNAVAILABLE');
  });

  it('answers a non-JSON provider body with 502, not a crash', async () => {
    const w = await world();
    auth.as(w.rina);
    provider.on(() => new Response('<html>bad gateway</html>', { status: 200 }));
    expectApiError(await draft(w.proj.id), 502, 'AI_UNAVAILABLE');
  });
});
