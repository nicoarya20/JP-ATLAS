/** `canSaveProjectAsTemplate` and the `saveAsTemplate` capability: see it, be PM+, and not in the Trash. */
import { describe, expect, it } from 'bun:test';
import { projectCaps } from '../server/access/capabilities';
import { canSaveProjectAsTemplate } from '../server/access/project-template.policy';
import type { Membership, Principal, ProjectSubject } from '../server/access/types';

const principal = (appRole: Principal['appRole']): Principal => ({
  id: 'u1',
  appRole,
  impersonating: false,
});
const subject = (over: Partial<ProjectSubject> = {}): ProjectSubject => ({
  id: 'p1',
  status: 'active',
  leadId: 'other',
  deletedAt: null,
  deletedBy: null,
  ...over,
});
const reader: Membership = { role: 'viewer', joinedAt: new Date('2030-01-01T00:00:00Z') };

describe('canSaveProjectAsTemplate', () => {
  it('allows a Project Manager who is a member', () => {
    expect(canSaveProjectAsTemplate(principal('project_manager'), subject(), reader).ok).toBe(true);
  });

  it('allows a Project Manager or Admin who is not a member (they read every project)', () => {
    expect(canSaveProjectAsTemplate(principal('project_manager'), subject(), null).ok).toBe(true);
    expect(canSaveProjectAsTemplate(principal('admin'), subject(), null).ok).toBe(true);
  });

  it('answers NOT_VISIBLE (404) to a Member who is not on the project, before looking at the role', () => {
    expect(canSaveProjectAsTemplate(principal('member'), subject(), null)).toMatchObject({
      ok: false,
      code: 'NOT_VISIBLE',
    });
  });

  it('refuses a Member who can see it, with the role code', () => {
    expect(canSaveProjectAsTemplate(principal('member'), subject(), reader)).toMatchObject({
      ok: false,
      code: 'NOT_APP_ROLE',
    });
  });

  it('treats a trashed project as missing', () => {
    const trashed = subject({ deletedAt: new Date('2030-01-02T00:00:00Z'), deletedBy: 'x' });
    expect(canSaveProjectAsTemplate(principal('admin'), trashed, null)).toMatchObject({
      ok: false,
      code: 'NOT_VISIBLE',
    });
  });
});

describe('projectCaps.saveAsTemplate', () => {
  it('is true for a Project Manager and absent for a Member who cannot see the project', () => {
    expect(projectCaps(principal('project_manager'), subject(), reader).saveAsTemplate).toBe(true);
    expect(projectCaps(principal('member'), subject(), null).saveAsTemplate).toBeUndefined();
  });
});
