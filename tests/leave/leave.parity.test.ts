/**
 * The policy is the rule; two SQL queries repeat it so a list and a fan-out stay one statement each:
 * the approver's pending list (`listPendingFor`) and the Inbox recipients (`approverIdsFor`). This
 * asks all three the same question for every (viewer, applicant) pair and demands one answer.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { db } from '../../server/db';
import { approverIdsFor } from '../../server/leave/leave.approvers.query';
import { listPendingFor } from '../../server/leave/leave.pending.query';
import { canDecideLeave } from '../../server/leave/leave.policy';
import { managesSharedProject } from '../../server/leave/leave.query';
import { normalizeRole } from '../../server/permissions';
import { createCleaner } from '../support/cleanup';
import { createFactory } from '../support/factory.task';
import { asPrincipal, CLOCK, type LeaveWorld, leaveWorld, seedLeave } from './leave.world';

const cleaner = createCleaner();
const f = createFactory(cleaner, { tag: 'leavepar' });
let w: LeaveWorld;

beforeEach(async () => {
  w = await leaveWorld(f);
});
afterEach(() => cleaner.flushTest());
afterAll(() => cleaner.flushAll());

describe('policy, pending list and approver fan-out agree', () => {
  it('for every viewer and every applicant in the workspace', async () => {
    const people = [w.ayu, w.nico, w.lea, w.dodi, w.eka, w.oki];
    const requests = new Map<string, string>();
    for (const p of people) {
      const row = await seedLeave(p, '2026-10-14', '2026-10-16', 'pending');
      requests.set(row.id, p.id);
    }

    const approversOf = new Map<string, Set<string>>();
    for (const applicant of people) {
      const ids = await approverIdsFor(db, {
        id: applicant.id,
        role: normalizeRole(applicant.role),
      });
      approversOf.set(applicant.id, new Set(ids));
    }

    for (const viewer of people) {
      const page = await listPendingFor(asPrincipal(viewer), CLOCK.today, 1, 100);
      // Other test files share the database: only this scenario's requests are compared.
      const listed = new Set(
        page.items
          .filter((i) => people.some((p) => p.id === i.requester.id))
          .map((i) => i.requester.id),
      );
      for (const applicant of people) {
        const rel = { managesSharedProject: await managesSharedProject(viewer.id, applicant.id) };
        const byPolicy = canDecideLeave(
          asPrincipal(viewer),
          { id: applicant.id, appRole: normalizeRole(applicant.role) },
          rel,
        ).ok;
        const label = `${viewer.role}:${viewer.id.slice(-4)} -> ${applicant.role}:${applicant.id.slice(-4)}`;
        expect([label, listed.has(applicant.id)]).toEqual([label, byPolicy]);
        expect([label, approversOf.get(applicant.id)?.has(viewer.id)]).toEqual([label, byPolicy]);
      }
    }
  });
});
