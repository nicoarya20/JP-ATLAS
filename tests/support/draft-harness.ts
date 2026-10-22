/** Shared harness of the draft endpoint tests (A1): auth, provider stub, factory, env, fixed clock. */
import { afterAll, afterEach, beforeEach } from 'bun:test';
import { draftLimiter } from '../../server/ai/task-draft.service';
import { installProviderStub } from './ai';
import { call, resetApiLimiters } from './api';
import { installAuthSpies } from './auth';
import { createCleaner } from './cleanup';
import { ATLAS_NOW, freezeAt } from './clock';
import { createFactory } from './factory.task';

export const URL_PATH = '/app/tasks/draft';
export const FAKE_KEY = 'sk-test-not-a-real-key'; // test-only
export const STORY =
  'Rina perbaiki halaman login besok, penting. Dodi siapkan data uji sebelum Jumat.';

/** A draft as the model would write it; override only what a test cares about. */
export const modelDraft = (over: Record<string, unknown> = {}) => ({
  title: 'Tugas',
  description: null,
  assignee: null,
  due: null,
  priority: null,
  kind: null,
  ...over,
});

/**
 * Registers the hooks for the enclosing file: a key and a dead base URL in the environment, empty
 * limiters, and "now" frozen on Wednesday 2026-10-07 in the team zone. Everything is undone after each test.
 */
export function installDraftHarness(tag: string) {
  const auth = installAuthSpies();
  const provider = installProviderStub();
  const cleaner = createCleaner();
  const f = createFactory(cleaner, { tag });
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

  /** Pengelola, two Anggota, a Pemantau in one project, plus an outsider. */
  async function world() {
    const lead = await f.user({ role: 'project_manager', name: 'Nico Pengelola' }); // test-only
    const rina = await f.user({ name: 'Rina Wulandari' }); // test-only
    const dodi = await f.user({ name: 'Dodi Saputra' }); // test-only
    const watcher = await f.user({ name: 'Wawan Pemantau' }); // test-only
    const outsider = await f.user({ name: 'Orang Luar' }); // test-only
    const proj = await f.project({
      lead,
      members: [
        [rina, 'member'],
        [dodi, 'member'],
        [watcher, 'viewer'],
      ],
    });
    return { lead, rina, dodi, watcher, outsider, proj };
  }

  return {
    auth,
    provider,
    f,
    world,
    draft: (projectId: string, text = STORY) => call('POST', URL_PATH, { projectId, text }),
    answerWith: (drafts: unknown[], question: string | null = null) =>
      provider.answer({ drafts, question }),
  };
}
