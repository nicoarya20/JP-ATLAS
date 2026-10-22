import { describe, expect, it } from 'bun:test';
import {
  canCancelEvent,
  canCreateEvent,
  canManageEvent,
  canManageParticipants,
  canRestoreEvent,
  canTrashEvent,
  canViewEvent,
  canWriteNote,
} from '../../server/access/event.policy';
import { ROLES } from '../../server/permissions';
import {
  APP_ROLES,
  eventRow,
  membership,
  NOW,
  principal,
  projectRow,
  verdict,
} from './event.policy.support';
import { persona } from './fixtures';

describe('canCreateEvent', () => {
  // The case P6 §6 E-02 names as mandatory.
  it('Pemantau tidak bisa membuat acara di proyeknya', () => {
    const sri = persona('PT'); // Member account, viewer in the project
    expect(sri.membership?.role).toBe('viewer');
    const d = canCreateEvent(sri.principal, projectRow(), sri.membership);
    expect(d).toEqual({ ok: false, code: 'NOT_MEMBER' });
  });

  it.each([
    ['manager', 'ok'],
    ['member', 'ok'],
    ['viewer', 'NOT_MEMBER'],
    ['none', 'NOT_VISIBLE'],
  ] as const)('a Member account who is %s in the project: %s', (state, expected) => {
    const d = canCreateEvent(principal(ROLES.MEMBER), projectRow(), membership(state));
    expect(verdict(d)).toBe(expected);
  });

  it('a non-member Project Manager may read the project but not add an event to it', () => {
    const d = canCreateEvent(principal(ROLES.PROJECT_MANAGER), projectRow(), null);
    expect(verdict(d)).toBe('NOT_MEMBER');
  });

  it.each([ROLES.ADMIN, ROLES.SUPER_ADMIN])('%s may add an event to any project', (role) => {
    expect(canCreateEvent(principal(role), projectRow(), null).ok).toBe(true);
  });

  it('every account role may create a personal event with no project', () => {
    for (const role of APP_ROLES) {
      expect(canCreateEvent(principal(role), null, null).ok).toBe(true);
    }
  });

  it('a project in the Trash must be restored first, even for Admin', () => {
    const trashed = projectRow({ deletedAt: new Date('2026-10-30T00:00:00Z') });
    expect(verdict(canCreateEvent(principal(ROLES.ADMIN), trashed, null))).toBe('PROJECT_IN_TRASH');
    expect(verdict(canCreateEvent(principal(ROLES.MEMBER), trashed, membership('manager')))).toBe(
      'PROJECT_IN_TRASH',
    );
  });

  it('a finished project still accepts events (Q12)', () => {
    for (const status of ['completed', 'canceled', 'on_hold'] as const) {
      const d = canCreateEvent(
        principal(ROLES.MEMBER),
        projectRow({ status }),
        membership('member'),
      );
      expect(d.ok).toBe(true);
    }
  });
});

describe('canViewEvent', () => {
  it.each([
    ['manager', 'ok'],
    ['member', 'ok'],
    ['viewer', 'ok'],
    ['none', 'NOT_VISIBLE'],
  ] as const)('a Member account who is %s in the project: %s', (state, expected) => {
    expect(verdict(canViewEvent(principal(ROLES.MEMBER), eventRow(), membership(state)))).toBe(
      expected,
    );
  });

  it('a Pemantau may read a project event even though they cannot create one', () => {
    const sri = persona('PT');
    expect(canViewEvent(sri.principal, eventRow(), sri.membership).ok).toBe(true);
  });

  it('a non-member Project Manager reads every project event (P-A1 / Q7)', () => {
    expect(canViewEvent(principal(ROLES.PROJECT_MANAGER), eventRow(), null).ok).toBe(true);
  });

  it('but a personal event of someone else stays hidden from a Project Manager', () => {
    const personal = eventRow({ projectId: null });
    expect(verdict(canViewEvent(principal(ROLES.PROJECT_MANAGER), personal, null))).toBe(
      'NOT_VISIBLE',
    );
  });

  it('the creator and the guests see their own event with no project at all', () => {
    const personal = eventRow({ projectId: null });
    const mine = { ...personal, createdBy: 'U-actor' };
    expect(canViewEvent(principal(ROLES.MEMBER), mine, null).ok).toBe(true);
    const invited = { ...personal, isParticipant: true };
    expect(canViewEvent(principal(ROLES.MEMBER), invited, null).ok).toBe(true);
  });

  it('an outsider with no path gets 404, never 403', () => {
    const d = canViewEvent(principal(ROLES.MEMBER), eventRow({ projectId: null }), null);
    expect(d).toEqual({ ok: false, code: 'NOT_VISIBLE' });
  });

  it('a trashed event is still viewable, so the Trash page can open what it lists', () => {
    const trashed = eventRow({ deletedAt: NOW, createdBy: 'U-actor' });
    expect(canViewEvent(principal(ROLES.MEMBER), trashed, null).ok).toBe(true);
  });

  it.each([ROLES.ADMIN, ROLES.SUPER_ADMIN])('%s sees any event, personal ones included', (role) => {
    expect(canViewEvent(principal(role), eventRow({ projectId: null }), null).ok).toBe(true);
  });
});

describe('canManageEvent', () => {
  it.each([
    ['manager', 'ok'],
    ['member', 'NOT_MANAGER'],
    ['viewer', 'NOT_MANAGER'],
    ['none', 'NOT_VISIBLE'],
  ] as const)('a Member account who is %s in the project: %s', (state, expected) => {
    expect(verdict(canManageEvent(principal(ROLES.MEMBER), eventRow(), membership(state)))).toBe(
      expected,
    );
  });

  it('the creator may change their own event without managing the project', () => {
    const mine = eventRow({ createdBy: 'U-actor' });
    expect(canManageEvent(principal(ROLES.MEMBER), mine, membership('member')).ok).toBe(true);
  });

  it('a guest is not an editor: being invited grants reading, not changing', () => {
    const invited = eventRow({ isParticipant: true });
    expect(verdict(canManageEvent(principal(ROLES.MEMBER), invited, null))).toBe('NOT_MANAGER');
  });

  it.each([ROLES.ADMIN, ROLES.SUPER_ADMIN])('%s may change any event', (role) => {
    expect(canManageEvent(principal(role), eventRow(), null).ok).toBe(true);
  });

  it('the Trash freezes the event, and the project trash wins over the event trash', () => {
    const admin = principal(ROLES.ADMIN);
    expect(verdict(canManageEvent(admin, eventRow({ deletedAt: NOW }), null))).toBe('WRONG_STATE');
    expect(
      verdict(canManageEvent(admin, eventRow({ deletedAt: NOW, projectDeletedAt: NOW }), null)),
    ).toBe('PROJECT_IN_TRASH');
  });

  it('a hidden event reports 404 before any role or state message', () => {
    const hidden = eventRow({ projectId: null, deletedAt: NOW });
    expect(verdict(canManageEvent(principal(ROLES.MEMBER), hidden, null))).toBe('NOT_VISIBLE');
  });
});

describe('destructive actions while impersonating (Q9)', () => {
  const sneaky = principal(ROLES.SUPER_ADMIN, { impersonating: true });

  it.each([
    ['cancel', canCancelEvent],
    ['trash', canTrashEvent],
  ] as const)('%s is refused', (_name, fn) => {
    expect(verdict(fn(sneaky, eventRow(), null))).toBe('IMPERSONATING');
  });

  it('restore is refused too', () => {
    const trashed = eventRow({ deletedAt: new Date('2026-11-01T00:00:00Z') });
    expect(verdict(canRestoreEvent(sneaky, trashed, null, NOW))).toBe('IMPERSONATING');
  });

  it('but editing, inviting and writing minutes stay open: they are not destructive', () => {
    expect(canManageEvent(sneaky, eventRow(), null).ok).toBe(true);
    expect(canManageParticipants(sneaky, eventRow(), null).ok).toBe(true);
    expect(canWriteNote(sneaky, eventRow(), null).ok).toBe(true);
  });
});

describe('canCancelEvent', () => {
  it('an already cancelled event cannot be cancelled again', () => {
    const canceled = eventRow({ canceledAt: NOW });
    expect(verdict(canCancelEvent(principal(ROLES.ADMIN), canceled, null))).toBe('WRONG_STATE');
  });

  it('a Member who merely belongs to the project cannot cancel', () => {
    expect(verdict(canCancelEvent(principal(ROLES.MEMBER), eventRow(), membership('member')))).toBe(
      'NOT_MANAGER',
    );
  });
});
