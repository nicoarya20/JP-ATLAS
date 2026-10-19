/** Anthropic client (A1): request shape, and every failure becomes AiUnavailableError without leaking content. */
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { aiConfig } from '../../server/ai/ai.config';
import { AiUnavailableError, callTool } from '../../server/ai/anthropic.client';

const CFG = aiConfig({ ANTHROPIC_API_KEY: 'test-key-not-real', TASK_AI_TIMEOUT_MS: '500' }); // test-only
if (!CFG) throw new Error('test config must have a key');
const CALL = {
  system: 'SYS',
  user: 'secret story text',
  tool: { name: 'susun', description: 'd', input_schema: { type: 'object' } },
};

let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>;
const reply = (body: unknown, status = 200) =>
  fetchSpy.mockImplementation(async () => new Response(JSON.stringify(body), { status }));
const toolUse = (input: unknown) => ({
  stop_reason: 'tool_use',
  content: [{ type: 'tool_use', name: 'susun', input }],
});

beforeEach(() => {
  fetchSpy = spyOn(globalThis, 'fetch');
});
afterEach(() => fetchSpy.mockRestore());

async function reasonOf(p: Promise<unknown>): Promise<AiUnavailableError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AiUnavailableError);
    return e as AiUnavailableError;
  }
  throw new Error('expected AiUnavailableError');
}

describe('callTool', () => {
  it('posts the story and forces the tool, returning the tool input', async () => {
    reply(toolUse({ drafts: [] }));
    const out = await callTool(CFG, CALL);
    expect(out).toEqual({ drafts: [] });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${CFG.baseUrl}/v1/messages`);
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe(CFG.apiKey);
    expect(headers['anthropic-version']).toBe('2023-06-01');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({
      model: CFG.model,
      max_tokens: CFG.maxTokens,
      system: 'SYS',
      tool_choice: { type: 'tool', name: 'susun' },
    });
    expect(body.messages).toEqual([{ role: 'user', content: 'secret story text' }]);
  });

  it.each([
    [429, 'rate_limited'],
    [500, 'http_server'],
    [529, 'http_server'],
    [401, 'http_client'],
  ])('maps HTTP %i to %s', async (code, reason) => {
    reply({ error: { message: 'secret story text echoed' } }, code);
    const e = await reasonOf(callTool(CFG, CALL));
    expect(e.reason).toBe(reason);
    expect(e.httpStatus).toBe(code);
    expect(e.message).not.toContain('secret story text');
  });

  it('maps a network error to network and never echoes its message', async () => {
    fetchSpy.mockImplementation(async () => {
      throw new Error('connect ECONNREFUSED secret story text');
    });
    const e = await reasonOf(callTool(CFG, CALL));
    expect(e.reason).toBe('network');
    expect(e.message).not.toContain('secret');
  });

  it('maps a timeout to timeout', async () => {
    fetchSpy.mockImplementation(async () => {
      throw new DOMException('timed out', 'TimeoutError');
    });
    expect((await reasonOf(callTool(CFG, CALL))).reason).toBe('timeout');
  });

  it('aborts a request that outlives the configured timeout', async () => {
    fetchSpy.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );
    const slow = aiConfig({ ANTHROPIC_API_KEY: 'k', TASK_AI_TIMEOUT_MS: '30' }); // test-only
    if (!slow) throw new Error('config');
    expect((await reasonOf(callTool(slow, CALL))).reason).toBe('timeout');
  });

  it('refuses a non-JSON body, a missing tool call and a cut-off answer', async () => {
    fetchSpy.mockImplementation(async () => new Response('<html>gateway</html>', { status: 200 }));
    expect((await reasonOf(callTool(CFG, CALL))).reason).toBe('bad_response');
    reply({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'hi' }] });
    expect((await reasonOf(callTool(CFG, CALL))).reason).toBe('bad_response');
    reply({ ...toolUse({ drafts: [] }), stop_reason: 'max_tokens' });
    expect((await reasonOf(callTool(CFG, CALL))).reason).toBe('truncated');
    reply(null);
    expect((await reasonOf(callTool(CFG, CALL))).reason).toBe('bad_response');
  });
});
