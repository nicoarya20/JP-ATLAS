/** Provider failure logging: a rejected key is an operator-facing `error` with a hint, the rest `warn`. */
import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { AI_KEY_REJECTED_HINT, logProviderFailure } from '../../server/ai/ai.failure-log';
import { AiUnavailableError } from '../../server/ai/anthropic.client';
import { logger } from '../../server/logger';

const CFG = { provider: 'openrouter', keyRecognized: true, model: 'm' } as const;
const errorSpy = spyOn(logger, 'error').mockImplementation(() => undefined);
const warnSpy = spyOn(logger, 'warn').mockImplementation(() => undefined);
afterEach(() => {
  errorSpy.mockClear();
  warnSpy.mockClear();
});

describe('logProviderFailure', () => {
  it.each([401, 403])('logs HTTP %i as error with the SIMPLE_PM_AI hint', (code) => {
    logProviderFailure({ userId: 'u1' }, new AiUnavailableError('http_client', code), CFG, 'x');
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [fields, msg] = errorSpy.mock.calls[0] as unknown as [Record<string, unknown>, string];
    expect(msg).toBe(AI_KEY_REJECTED_HINT);
    expect(msg).toContain('SIMPLE_PM_AI');
    expect(fields).toMatchObject({
      userId: 'u1',
      providerStatus: code,
      provider: 'openrouter',
      keyRecognized: true,
    });
  });

  it.each([
    ['rate_limited', 429],
    ['http_server', 500],
    ['timeout', null],
  ] as const)('keeps %s as a warn with the caller label', (reason, code) => {
    logProviderFailure(
      {},
      new AiUnavailableError(reason, code),
      CFG,
      'project draft provider unavailable',
    );
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[1]).toBe('project draft provider unavailable');
  });

  it('never puts the key in the log line, even when handed a full config', () => {
    const full = { ...CFG, apiKey: 'sk-or-v1-SECRET-not-real' }; // test-only
    logProviderFailure({}, new AiUnavailableError('http_client', 401), full, 'x');
    expect(JSON.stringify(errorSpy.mock.calls[0])).not.toContain('SECRET');
  });
});
