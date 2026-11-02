/**
 * Provider settings for the AI features, read from `process.env` when called (like `storageEnabled()`)
 * so the app boots and works without a key. Not part of `server/env.ts` on purpose.
 *
 * One key, `SIMPLE_PM_AI`, picks the provider by its prefix: `sk-or-` is OpenRouter, anything else
 * (normally `sk-ant-`) is Anthropic. Both speak the Anthropic Messages API, so only the base URL,
 * the default model and the auth header differ.
 */

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_TOKENS = 4_000; // room for a full project draft (6 phases, 20 tasks); a ceiling, not a spend
const MAX_TIMEOUT_MS = 60_000;
const MAX_MAX_TOKENS = 8_000;

export type AiProvider = 'anthropic' | 'openrouter';
/** `x-api-key` is Anthropic's header; OpenRouter's Messages endpoint wants `Authorization: Bearer`. */
export type AiAuthHeader = 'x-api-key' | 'bearer';

const OPENROUTER_KEY_PREFIX = 'sk-or-';
const ANTHROPIC_KEY_PREFIX = 'sk-ant-';

/** Base URL and default model per provider; `SIMPLE_PM_AI_BASE_URL`/`_MODEL` override either. */
export const AI_PROVIDERS: Record<
  AiProvider,
  { baseUrl: string; model: string; auth: AiAuthHeader; keyPrefix: string }
> = {
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-haiku-5-5',
    auth: 'x-api-key',
    keyPrefix: ANTHROPIC_KEY_PREFIX,
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api',
    model: 'anthropic/claude-haiku-5.5',
    auth: 'bearer',
    keyPrefix: OPENROUTER_KEY_PREFIX,
  },
};

export type AiConfig = {
  provider: AiProvider;
  /** False when the key has neither known prefix: it still goes to Anthropic (proxy, test double). */
  keyRecognized: boolean;
  auth: AiAuthHeader;
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxTokens: number;
};

type Env = Record<string, string | undefined>;

/** A positive whole number from the environment, else `fallback`; capped at `max`. */
function intFrom(raw: string | undefined, fallback: number, max: number): number {
  const n = Number(raw?.trim());
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
}

/** The provider a key belongs to, by its prefix; an unknown prefix counts as Anthropic. */
export function providerOfKey(apiKey: string): AiProvider {
  return apiKey.startsWith(OPENROUTER_KEY_PREFIX) ? 'openrouter' : 'anthropic';
}

/** True when a provider key is set; an empty value counts as unset, like `server/env.ts`. */
export function aiEnabled(env: Env = process.env): boolean {
  return Boolean(env.SIMPLE_PM_AI?.trim());
}

/** The provider settings, or null when no key is configured. */
export function aiConfig(env: Env = process.env): AiConfig | null {
  const apiKey = env.SIMPLE_PM_AI?.trim();
  if (!apiKey) return null;
  const provider = providerOfKey(apiKey);
  const preset = AI_PROVIDERS[provider];
  return {
    provider,
    keyRecognized: apiKey.startsWith(preset.keyPrefix),
    auth: preset.auth,
    apiKey,
    baseUrl: (env.SIMPLE_PM_AI_BASE_URL?.trim() || preset.baseUrl).replace(/\/+$/, ''),
    model: env.SIMPLE_PM_AI_MODEL?.trim() || preset.model,
    timeoutMs: intFrom(env.SIMPLE_PM_AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS),
    maxTokens: intFrom(env.SIMPLE_PM_AI_MAX_TOKENS, DEFAULT_MAX_TOKENS, MAX_MAX_TOKENS),
  };
}
