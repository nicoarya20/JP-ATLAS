/** Loader of /app/tasks/new (S2-11): writable projects from the server, `?proyek=` preset, the two 403 reasons. */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { TASK_FORM_COPY } from '../app/components/tasks/task-form.copy';
import { PAGE_COPY } from '../app/components/tasks/tasks.copy';
import { loader } from '../app/routes/app/task-new';
import { installAuthSpies } from './support/auth';
import { createCleaner } from './support/cleanup';
import type { TestProject } from './support/factory.project';
import { createFactory } from './support/factory.task';
import type { TestUser } from './support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tnew' });
afterAll(() => cleaner.flushAll());
const spies = installAuthSpies();

type Loaded = Awaited<ReturnType<typeof loader>>;
type Allowed = Extract<Loaded, { allowed: true }>;

async function load(actor: TestUser, search = '') {
  spies.as(actor);
  const request = new Request(`http://x/app/tasks/new${search}`);
  return loader({ request, params: {}, context: {} } as Parameters<typeof loader>[0]);
}

/** A 403 `data()` result: its status and reason; anything else fails the test. */
function refused(res: unknown): { status: number | undefined; reason: string } {
  const r = res as { data?: { allowed?: boolean; reason?: string }; init?: { status?: number } };
  expect(r.data?.allowed).toBe(false);
  return { status: r.init?.status, reason: r.data?.reason ?? '' };
}

function allowed(res: Loaded): Allowed {
  if (!('allowed' in res) || !res.allowed) throw new Error('expected the form');
  return res;
}

let lead: TestUser;
let worker: TestUser;
let watcher: TestUser;
let loner: TestUser;
let pm: TestUser;
let kitchen: TestProject;
let garden: TestProject;
beforeAll(async () => {
  [lead, worker, watcher, loner, pm] = await Promise.all([
    f.user({ role: 'project_manager' }),
    f.user({ name: 'Dodi' }),
    f.user(),
    f.user(),
    f.user({ role: 'project_manager' }),
  ]);
  [kitchen, garden] = await Promise.all([
    f.project({
      lead,
      name: 'tnew Dapur',
      members: [
        [worker, 'member'],
        [watcher, 'viewer'],
        [pm, 'member'],
      ],
    }),
    f.project({ lead, name: 'tnew Taman' }),
  ]);
});

describe('task-new loader', () => {
  it('opens the only writable project with the viewer as the one who works on it', async () => {
    const res = allowed(await load(worker));
    expect(res.projects.map((p) => p.id)).toEqual([kitchen.id]);
    expect(res.initial.projectId).toBe(kitchen.id);
    expect(res.initial.assigneeId).toBe(worker.id);
    expect(res.initial.kindId).toBe(kitchen.kinds.task);
    expect(res.members?.map((m) => m.userId)).toContain(watcher.id);
    expect(res.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.cancelTo).toBe('/app/tasks');
  });

  it('fills the project from ?proyek= and returns to its Tugas tab', async () => {
    const res = allowed(await load(lead, `?proyek=${garden.id}`));
    expect(res.initial.projectId).toBe(garden.id);
    expect(res.initial.assigneeId).toBe(lead.id);
    expect(res.cancelTo).toBe(`/app/projects/${garden.id}/tasks`);
  });

  it('leaves the project blank when several are writable and none is asked for', async () => {
    const res = allowed(await load(lead));
    expect(res.initial.projectId).toBeNull();
    expect(res.members).toBeUndefined();
  });

  it('answers 403 "only viewing" to a Pemantau, with or without ?proyek=', async () => {
    for (const search of ['', `?proyek=${kitchen.id}`]) {
      expect(refused(await load(watcher, search))).toEqual({
        status: 403,
        reason: TASK_FORM_COPY.viewerOnly,
      });
    }
  });

  it('answers 403 "only viewing" for a visible project the caller cannot write', async () => {
    // A Project Manager reads every project but writes only where they are Pengelola/Anggota.
    expect(refused(await load(pm, `?proyek=${garden.id}`)).reason).toBe(TASK_FORM_COPY.viewerOnly);
  });

  it('ignores a hidden or unknown ?proyek= instead of revealing it', async () => {
    for (const search of ['?proyek=tnew-unknown', `?proyek=${garden.id}`]) {
      expect(allowed(await load(worker, search)).initial.projectId).toBe(kitchen.id);
    }
  });

  it('answers 403 with the Q5 reason to someone outside every project', async () => {
    expect(refused(await load(loner))).toEqual({ status: 403, reason: PAGE_COPY.createBlocked });
  });
});

describe('task-new loader: Tulis saja availability', () => {
  const KEY = 'ANTHROPIC_API_KEY';
  const before = process.env[KEY];
  afterEach(() => {
    if (before === undefined) delete process.env[KEY];
    else process.env[KEY] = before;
  });

  it('says Tulis saja is available only when a provider key is configured', async () => {
    process.env[KEY] = 'sk-test-not-a-real-key'; // test-only
    expect(allowed(await load(worker)).aiEnabled).toBe(true);
    process.env[KEY] = '   '; // an empty value counts as unset
    expect(allowed(await load(worker)).aiEnabled).toBe(false);
    delete process.env[KEY];
    expect(allowed(await load(worker)).aiEnabled).toBe(false);
  });
});
