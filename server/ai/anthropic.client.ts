/**
 * Minimal Anthropic Messages API client over `fetch` (no SDK, no new package). It forces one tool
 * call and returns that call's input as untrusted JSON. Every failure is an `AiUnavailableError`
 * whose message carries only a reason and a status number: never the prompt, the answer or the
 * provider's error body, so nothing the user wrote can reach a log through here.
 */
import type { AiConfig } from './ai.config';

const API_VERSION = '2023-06-01';
const MESSAGES_PATH = '/v1/messages';
const HTTP_OK_MAX = 299;
const HTTP_RATE_LIMITED = 429;
const HTTP_SERVER_ERROR_MIN = 500;

export type AiFailure =
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'http_client'
  | 'http_server'
  | 'bad_response'
  | 'truncated';

/** The provider could not give a usable answer; the caller falls back to the form. */
export class AiUnavailableError extends Error {
  constructor(
    readonly reason: AiFailure,
    readonly httpStatus: number | null = null,
  ) {
    super(`AI provider unavailable: ${reason}${httpStatus ? ` (${httpStatus})` : ''}`);
    this.name = 'AiUnavailableError';
  }
}

export type ToolCall = {
  system: string;
  user: string;
  tool: { name: string; description: string; input_schema: unknown };
};

type MessagesResponse = {
  stop_reason?: unknown;
  content?: Array<{ type?: unknown; name?: unknown; input?: unknown }>;
};

function failureOfStatus(code: number): AiFailure {
  if (code === HTTP_RATE_LIMITED) return 'rate_limited';
  return code >= HTTP_SERVER_ERROR_MIN ? 'http_server' : 'http_client';
}

/** Sends one request and returns the `input` of the forced tool call; throws `AiUnavailableError` otherwise. */
export async function callTool(cfg: AiConfig, call: ToolCall): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${cfg.baseUrl}${MESSAGES_PATH}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: cfg.maxTokens,
        system: call.system,
        messages: [{ role: 'user', content: call.user }],
        tools: [call.tool],
        tool_choice: { type: 'tool', name: call.tool.name },
      }),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    throw new AiUnavailableError(timedOut ? 'timeout' : 'network');
  }
  if (res.status > HTTP_OK_MAX)
    throw new AiUnavailableError(failureOfStatus(res.status), res.status);

  let data: MessagesResponse;
  try {
    data = (await res.json()) as MessagesResponse;
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    throw new AiUnavailableError(timedOut ? 'timeout' : 'bad_response');
  }
  // A cut-off tool input is half a JSON object at best; never read it.
  if (data?.stop_reason === 'max_tokens') throw new AiUnavailableError('truncated');
  const block = Array.isArray(data?.content)
    ? data.content.find((b) => b?.type === 'tool_use' && b.name === call.tool.name)
    : undefined;
  if (!block) throw new AiUnavailableError('bad_response');
  return block.input;
}
