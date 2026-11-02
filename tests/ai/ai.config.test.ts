import { describe, expect, it } from 'bun:test';
import { aiConfig, aiEnabled } from '../../server/ai/ai.config';

describe('aiConfig', () => {
  it('is off without SIMPLE_PM_AI, and a blank value counts as unset', () => {
    expect(aiEnabled({})).toBe(false);
    expect(aiConfig({})).toBeNull();
    expect(aiEnabled({ SIMPLE_PM_AI: '   ' })).toBe(false);
    expect(aiConfig({ SIMPLE_PM_AI: '' })).toBeNull();
  });

  it('ignores the old ANTHROPIC_API_KEY name', () => {
    expect(aiEnabled({ ANTHROPIC_API_KEY: 'old-name-key' })).toBe(false); // test-only
    expect(aiConfig({ ANTHROPIC_API_KEY: 'old-name-key' })).toBeNull(); // test-only
  });

  it('reads the key and trims it', () => {
    expect(aiEnabled({ SIMPLE_PM_AI: ' k ' })).toBe(true);
    expect(aiConfig({ SIMPLE_PM_AI: ' k ' })?.apiKey).toBe('k');
  });

  it('defaults the token cap to 4000 so a full project draft fits', () => {
    expect(aiConfig({ SIMPLE_PM_AI: 'k' })?.maxTokens).toBe(4000);
  });

  it('reads the SIMPLE_PM_AI_* overrides and caps the token budget at 8000', () => {
    const cfg = aiConfig({
      SIMPLE_PM_AI: 'k',
      SIMPLE_PM_AI_MODEL: 'some-model',
      SIMPLE_PM_AI_TIMEOUT_MS: '2000',
      SIMPLE_PM_AI_MAX_TOKENS: '99999',
      SIMPLE_PM_AI_BASE_URL: 'http://proxy.invalid///', // test-only
    });
    expect(cfg).toMatchObject({
      model: 'some-model',
      timeoutMs: 2000,
      maxTokens: 8000,
      baseUrl: 'http://proxy.invalid',
    });
  });

  it('does not read the old TASK_AI_* names', () => {
    const cfg = aiConfig({ SIMPLE_PM_AI: 'k', TASK_AI_MAX_TOKENS: '7000', TASK_AI_MODEL: 'old' });
    expect(cfg?.maxTokens).toBe(4000);
    expect(cfg?.model).not.toBe('old');
  });
});
