/** POST /app/projects/draft ("Ceritakan proyeknya"): sign-in, input checks, role gate, provider fallbacks. */
import { describe, expect, it } from 'bun:test';
import { PROJECT_DRAFT_TEXT_MAX } from '../../server/ai/project-draft.limits';
import { call, expectApiError } from '../support/api';
import {
  installProjectDraftHarness,
  modelAnswer,
  URL_PATH,
} from '../support/project-draft-harness';

const { auth, provider, f, draft, answerWith } = installProjectDraftHarness('pjdgate');

describe('gate and input', () => {
  it('answers 401 to an anonymous caller', async () => {
    expectApiError(await draft(), 401, 'UNAUTHORIZED');
  });

  it.each(['', '   \n '])(
    'answers 400 TEXT_EMPTY for %j without calling the provider',
    async (text) => {
      auth.as(await f.user({ role: 'project_manager' }));
      expectApiError(await draft(text), 400, 'TEXT_EMPTY');
      expect(provider.calls).toHaveLength(0);
    },
  );

  it('answers 400 TEXT_TOO_LONG above the limit and accepts exactly the limit', async () => {
    auth.as(await f.user({ role: 'project_manager' }));
    expectApiError(await draft('a'.repeat(PROJECT_DRAFT_TEXT_MAX + 1)), 400, 'TEXT_TOO_LONG');
    expect(provider.calls).toHaveLength(0);
    answerWith(modelAnswer());
    expect((await draft('a'.repeat(PROJECT_DRAFT_TEXT_MAX))).status).toBe(200);
  });

  it('answers 422 to a body of the wrong shape', async () => {
    auth.as(await f.user({ role: 'project_manager' }));
    expectApiError(await call('POST', URL_PATH, { projectId: 'x' }), 422, 'VALIDATION');
    expectApiError(await call('POST', URL_PATH, {}), 422, 'VALIDATION');
  });
});

describe('permission follows project creation', () => {
  it('refuses a Member with 403 before any provider call', async () => {
    auth.as(await f.user());
    expectApiError(await draft(), 403, 'NOT_APP_ROLE');
    expect(provider.calls).toHaveLength(0);
  });

  it('lets a Project Manager, an Admin and a super-admin draft', async () => {
    answerWith(modelAnswer());
    for (const role of ['project_manager', 'admin', 'super-admin'] as const) {
      auth.as(await f.user({ role }));
      expect((await draft()).status).toBe(200);
    }
  });
});

describe('provider fallbacks', () => {
  it('answers 503 AI_DISABLED without a key and never calls the provider', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    auth.as(await f.user({ role: 'project_manager' }));
    const res = await draft();
    expectApiError(res, 503, 'AI_DISABLED');
    expect(res.body.error).toContain('Isi form saja');
    expect(provider.calls).toHaveLength(0);
    process.env.ANTHROPIC_API_KEY = '   '; // blank counts as unset
    expectApiError(await draft(), 503, 'AI_DISABLED');
  });

  it('answers 502 AI_UNAVAILABLE when the provider fails, times out or is rate limited', async () => {
    auth.as(await f.user({ role: 'project_manager' }));
    for (const code of [400, 401, 429, 500, 529]) {
      provider.http(code);
      const res = await draft();
      expectApiError(res, 502, 'AI_UNAVAILABLE');
      expect(res.body.error).toBe(
        'Ceritakan proyeknya belum bisa dipakai sekarang. Isi form saja.',
      );
    }
    provider.on(() => {
      throw new DOMException('timed out', 'TimeoutError');
    });
    expectApiError(await draft(), 502, 'AI_UNAVAILABLE');
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
        content: [{ type: 'tool_use', name: 'susun_draf_proyek', input: { ...modelAnswer() } }],
      },
    ],
    [
      'tool input of the wrong shape',
      {
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', name: 'susun_draf_proyek', input: 'oops' }],
      },
    ],
  ])('answers 502 for %s', async (_label, body) => {
    auth.as(await f.user({ role: 'project_manager' }));
    provider.on(() => Response.json(body));
    expectApiError(await draft(), 502, 'AI_UNAVAILABLE');
  });

  it.each([
    [
      'too many phases',
      modelAnswer({ phases: Array.from({ length: 7 }, () => ({ name: 'P', tasks: [] })) }),
    ],
    ['a blank name and no question', modelAnswer({ name: '' })],
  ])('answers 502 for %s', async (_label, answer) => {
    auth.as(await f.user({ role: 'project_manager' }));
    answerWith(answer);
    expectApiError(await draft(), 502, 'AI_UNAVAILABLE');
  });

  it('answers a non-JSON provider body with 502, not a crash', async () => {
    auth.as(await f.user({ role: 'project_manager' }));
    provider.on(() => new Response('<html>bad gateway</html>', { status: 200 }));
    expectApiError(await draft(), 502, 'AI_UNAVAILABLE');
  });

  it('a question with no draft still answers 200: the client falls back to the form itself', async () => {
    auth.as(await f.user({ role: 'project_manager' }));
    answerWith(modelAnswer({ name: null, question: 'Proyek apa maksudnya?' }));
    const res = await draft();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ draft: null, question: 'Proyek apa maksudnya?' });
  });
});
