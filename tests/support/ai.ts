/** AI provider stub (A1): replaces `globalThis.fetch` with scripted replies so no test touches the network. */
import { afterEach, beforeEach, spyOn } from 'bun:test';

export type ProviderCall = {
  url: string;
  init: RequestInit;
  // biome-ignore lint/suspicious/noExplicitAny: the request body is asserted field by field by each caller
  body: any;
};
type Script = (call: ProviderCall) => Promise<Response> | Response;

export const TOOL_NAME = 'susun_draf_tugas';

/** A provider answer that calls the forced tool with `input`. */
export const toolUse = (input: unknown) => ({
  stop_reason: 'tool_use',
  content: [{ type: 'tool_use', name: TOOL_NAME, input }],
});

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/**
 * Installs the stub for the enclosing file or describe. By default any call throws, so a test that
 * did not script a reply fails loudly instead of reaching the network.
 */
export function installProviderStub() {
  const calls: ProviderCall[] = [];
  let script: Script = () => {
    throw new Error('provider called without a scripted reply');
  };
  let spy: { mockRestore(): void } | null = null;

  beforeEach(() => {
    calls.length = 0;
    script = () => {
      throw new Error('provider called without a scripted reply');
    };
    spy = spyOn(globalThis, 'fetch').mockImplementation((async (
      input: string | URL | Request,
      init?: RequestInit,
    ) => {
      const call: ProviderCall = {
        url: String(input),
        init: init ?? {},
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
      };
      calls.push(call);
      return script(call);
    }) as unknown as typeof fetch);
  });
  afterEach(() => spy?.mockRestore());

  return {
    calls,
    /** Runs `fn` for every provider call. */
    on(fn: Script) {
      script = fn;
    },
    /** Answers every call with the forced tool call carrying `input`. */
    answer(input: unknown) {
      script = () => jsonResponse(toolUse(input));
    },
    /** Answers every call with this HTTP status and body. */
    http(status: number, body: unknown = { error: 'x' }) {
      script = () => jsonResponse(body, status);
    },
  };
}
