/** Loader of /app/tasks/:number/edit (S2-12, H-B5): form data with phases, the 403 reason, and the same 404 for a hidden task. */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { TASK_FORM_COPY } from '../app/components/tasks/task-form.copy';
import { loader } from '../app/routes/app/task-edit';
import { db } from '../server/db';
import { projectPhase, task } from '../server/db/schema';
import { installAuthSpies } from './support/auth';
import { createCleaner } from './support/cleanup';
import type { TestTask } from './support/factory.task';
import { createFactory } from './support/factory.task';
import type { TestUser } from './support/factory.user';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'tedit' });
afterAll(() => cleaner.flushAll());
const spies = installAuthSpies();

type Loaded = Awaited<ReturnType<typeof loader>>;

async function load(actor: TestUser, number: number | string) {
  spies.as(actor);
  const request = new Request(`http://x/app/tasks/${number}/edit`);
  return loader({
    request,
    params: { number: String(number) },
    context: {},
  } as Parameters<typeof loader>[0]);
}

function editable(res: Loaded): Extract<Loaded, { allowed: true }> {
  if (!('allowed' in res) || !res.allowed) throw new Error('expected the edit form');
  return res;
}

/** A 403 `data()` result: its status and reason; anything else fails the test. */
function refused(res: unknown): { status: number | undefined; reason: string } {
  const r = res as { data?: { allowed?: boolean; reason?: string }; init?: { status?: number } };
  expect(r.data?.allowed).toBe(false);
  return { status: r.init?.status, reason: r.data?.reason ?? '' };
}

let lead: TestUser;
let owner: TestUser;
let other: TestUser;
let watcher: TestUser;
let outsider: TestUser;
let own: TestTask;
let others: TestTask;
let phaseId: string;
beforeAll(async () => {
  [lead, owner, other, watcher, outsider] = await Promise.all([
    f.user({ role: 'project_manager' }),
    f.user(),
    f.user(),
    f.user(),
    f.user(),
  ]);
  const prj = await f.project({
    lead,
    members: [
      [owner, 'member'],
      [other, 'member'],
      [watcher, 'viewer'],
    ],
  });
  [own, others] = await Promise.all([
    f.task({ project: prj, creator: owner, assignee: owner }),
    f.task({ project: prj, creator: lead, assignee: lead }),
  ]);
  const [phase] = await db
    .insert(projectPhase)
    .values({ projectId: prj.id, name: 'Bangun', position: 0 })
    .returning({ id: projectPhase.id }); // test-only
  phaseId = phase?.id ?? '';
  await db.update(task).set({ phaseId }).where(eq(task.id, own.id));
});

describe('task-edit loader', () => {
  it('opens the form with the project phases and the phase the task is in', async () => {
    const res = editable(await load(owner, own.number));
    expect(res.phases).toEqual([{ id: phaseId, name: 'Bangun' }]);
    expect(res.initial.phaseId).toBe(phaseId);
    expect(res.number).toBe(own.number);
  });

  it('opens it for the Pengelola on any task, with no phase when the task has none', async () => {
    expect(editable(await load(lead, others.number)).initial.phaseId).toBeNull();
  });

  it('answers 403 with the reason to a Pemantau and to an Anggota on someone else’s task', async () => {
    for (const [who, t] of [
      [watcher, own],
      [other, own],
    ] as const) {
      expect(refused(await load(who, t.number))).toEqual({
        status: 403,
        reason: TASK_FORM_COPY.editForbidden,
      });
    }
  });

  it('answers the same 404 for a task outside the viewer’s projects and for a bad number', async () => {
    for (const number of [own.number, 'abc']) {
      const err = await load(outsider, number).catch((e: unknown) => e);
      expect((err as { init?: { status?: number } }).init?.status).toBe(404);
    }
  });
});
