/** Shared harness of "Ceritakan proyeknya" tests: auth, provider stub, factory, env, fixed clock. */
import { afterAll, afterEach, beforeEach } from 'bun:test';
import { DRAFT_TOOL_NAME } from '../../server/ai/project-draft.prompt';
import { draftLimiter } from '../../server/ai/task-draft.service';
import { installProviderStub, jsonResponse } from './ai';
import { call, resetApiLimiters } from './api';
import { installAuthSpies } from './auth';
import { createCleaner } from './cleanup';
import { ATLAS_NOW, freezeAt } from './clock';
import { createUserFactory } from './factory.user';

export const URL_PATH = '/app/projects/draft';
export const FAKE_KEY = 'sk-test-not-a-real-key'; // test-only
export const STORY = 'Mau renovasi dapur. Beli material minggu ini, pasang minggu depan.';

/** A project draft tool answer, override only what a test cares about. */
export const modelAnswer = (over: Record<string, unknown> = {}) => ({
  name: 'Renovasi Dapur',
  description: null,
  startDate: null,
  dueDate: null,
  priority: null,
  phases: [],
  looseTasks: [],
  question: null,
  ...over,
});

/** A provider answer that calls `susun_draf_proyek` (not the task-draft tool name `ai.ts` defaults to). */
const toolUse = (input: unknown) =>
  jsonResponse({
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', name: DRAFT_TOOL_NAME, input }],
  });

/**
 * Registers the hooks for the enclosing file: a key and a dead base URL in the environment, empty
 * limiters, and "now" frozen on Wednesday 2026-10-07 in the team zone. Everything is undone after each test.
 */
export function installProjectDraftHarness(tag: string) {
  const auth = installAuthSpies();
  const provider = installProviderStub();
  const cleaner = createCleaner();
  const f = createUserFactory(cleaner, { tag });
  const saved = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  };

  beforeEach(() => {
    auth.as(null);
    process.env.ANTHROPIC_API_KEY = FAKE_KEY;
    process.env.ANTHROPIC_BASE_URL = 'http://provider.invalid'; // test-only: nothing resolves it
    resetApiLimiters();
    draftLimiter.reset();
    freezeAt(ATLAS_NOW);
  });
  afterEach(async () => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    await cleaner.flushTest();
  });
  afterAll(() => cleaner.flushAll());

  return {
    auth,
    provider,
    f,
    /** Exposed so a test that needs a project too (the shared rate-limit test) tracks it for cleanup. */
    cleaner,
    draft: (text = STORY) => call('POST', URL_PATH, { text }),
    answerWith: (answer: Record<string, unknown>) => provider.on(() => toolUse(answer)),
  };
}
