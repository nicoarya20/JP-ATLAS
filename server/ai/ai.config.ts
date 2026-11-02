/**
 * Provider settings for the AI features, read from `process.env` when called (like `storageEnabled()`)
 * so the app boots and works without a key. Not part of `server/env.ts` on purpose.
 */

const DEFAULT_BASE_URL = 'https://api.anthropic.com'; // overridable with SIMPLE_PM_AI_BASE_URL (proxy, test double)
const DEFAULT_MODEL = 'claude-haiku-5-5';
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_TOKENS = 4_000; // room for a full project draft (6 phases, 20 tasks); a ceiling, not a spend
const MAX_TIMEOUT_MS = 60_000;
const MAX_MAX_TOKENS = 8_000;

export type AiConfig = {
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

/** True when a provider key is set; an empty value counts as unset, like `server/env.ts`. */
export function aiEnabled(env: Env = process.env): boolean {
  return Boolean(env.SIMPLE_PM_AI?.trim());
}

/** The provider settings, or null when no key is configured. */
export function aiConfig(env: Env = process.env): AiConfig | null {
  const apiKey = env.SIMPLE_PM_AI?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (env.SIMPLE_PM_AI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    model: env.SIMPLE_PM_AI_MODEL?.trim() || DEFAULT_MODEL,
    timeoutMs: intFrom(env.SIMPLE_PM_AI_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS),
    maxTokens: intFrom(env.SIMPLE_PM_AI_MAX_TOKENS, DEFAULT_MAX_TOKENS, MAX_MAX_TOKENS),
  };
}
