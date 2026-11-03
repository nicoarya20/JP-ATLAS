/**
 * One log line for a failed provider call, shared by the task and project draft services. A rejected
 * key (401/403) is a configuration error the operator must fix, so it logs at `error` with a hint;
 * anything else (timeout, rate limit, 5xx) is transient and stays `warn`. Never logs the key itself.
 */
import { logger } from '../logger';
import type { AiConfig } from './ai.config';
import type { AiUnavailableError } from './anthropic.client';

const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;

export const AI_KEY_REJECTED_HINT =
  'AI key rejected: check SIMPLE_PM_AI (sk-ant-… for Anthropic, sk-or-… for OpenRouter)';

/** True when the provider refused the key rather than the request. */
export function isKeyRejected(e: AiUnavailableError): boolean {
  return e.httpStatus === HTTP_UNAUTHORIZED || e.httpStatus === HTTP_FORBIDDEN;
}

/** Logs `e` with the caller's fields; `label` is the usual "<feature> provider unavailable" message. */
export function logProviderFailure(
  fields: Record<string, unknown>,
  e: AiUnavailableError,
  cfg: Pick<AiConfig, 'provider' | 'keyRecognized' | 'model'>,
  label: string,
): void {
  const line = {
    ...fields,
    outcome: e.reason,
    providerStatus: e.httpStatus,
    provider: cfg.provider,
    model: cfg.model,
    keyRecognized: cfg.keyRecognized,
  };
  if (isKeyRejected(e)) logger.error(line, AI_KEY_REJECTED_HINT);
  else logger.warn(line, label);
}
