/** Plan API helpers (S5a-02): the plan router mounted alone under the real error plugin, plus row seeding. */
import { Elysia } from 'elysia';
import { projectPlanApi } from '../../server/api/app-projects.plan';
import { apiErrorPlugin } from '../../server/api-error';
import { db } from '../../server/db';
import { projectMilestone, projectPhase } from '../../server/db/schema';
import type { ApiResult } from './api';

// Not mounted in `/api/app` yet (S5a-04 wires it), so the tests send to the router directly.
const app = new Elysia({ prefix: '/api/app' }).use(apiErrorPlugin()).use(projectPlanApi);

/** Sends one request to the plan router; `path` starts after `/api/app`, like `call()`. */
export async function send(method: string, path: string, body?: unknown): Promise<ApiResult> {
  const res = await app.handle(
    new Request(`http://localhost/api/app${path}`, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}

/** Inserts `n` phases named "Tahap 1..n" straight into the table (rows go away with the project). */
export async function seedPhases(projectId: string, n: number) {
  return db
    .insert(projectPhase)
    .values(
      Array.from({ length: n }, (_, i) => ({ projectId, name: `Tahap ${i + 1}`, position: i })),
    ) // test-only
    .returning();
}

/** Inserts `n` milestones due on consecutive days of January 2030. */
export async function seedMilestones(projectId: string, n: number) {
  return db
    .insert(projectMilestone)
    .values(
      Array.from({ length: n }, (_, i) => ({
        projectId,
        title: `Milestone ${i + 1}`, // test-only
        dueDate: `2030-01-${String((i % 28) + 1).padStart(2, '0')}`, // test-only
      })),
    )
    .returning();
}
