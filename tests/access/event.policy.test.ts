import { describe, expect, it } from 'bun:test';
import { appCaps, EVENT_CAP_KEYS, eventCaps } from '../../server/access/capabilities';
import {
  canCancelEvent,
  canCreateEvent,
  canManageEvent,
  canManageParticipants,
  canRestoreEvent,
  canTrashEvent,
  canViewEvent,
  canWriteNote,
  eventLevel,
  canRestoreEvent as restore,
} from '../../server/access/event.policy';
import type {
  EventSubject,
  Membership,
  Principal,
  ProjectRole,
  ProjectSubject,
} from '../../server/access/types';
import { METRICS } from '../../server/metrics/config';
import { ROLES } from '../../server/permissions';
import { persona } from './fixtures';

// Matrix of P6 §6 E-02: four account roles x four membership states x every event action, read off
// the pure policy (no DB). The key case the plan names explicitly is "Pemantau tidak bisa membuat
// acara di proyeknya" and it gets its own test below. All ids and dates here are test-only.
const PROJECT_ID = 'P-atlas';
const OTHER_ID = 'U-someone-else';
const NOW = new Date('2026-11-02T02:00:00.000Z');

type MembershipState = 'manager' | 'member' | 'viewer' | 'none';
const MEMBERSHIP_STATES: readonly MembershipState[] = ['manager', 'member', 'viewer', 'none'];
const APP_ROLES = [ROLES.MEMBER, ROLES.PROJECT_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN] as const;

const principal = (appRole: (typeof APP_ROLES)[number], overrides: Partial<Principal> = {}) => ({
  id: 'U-actor',
  appRole,
  impersonating: false,
  ...overrides,
});

function membership(state: MembershipState): Membership {
  if (state === 'none') return null;
  return { role: state as ProjectRole, joinedAt: new Date('2026-09-01T00:00:00Z') };
}

function eventRow(overrides: Partial<EventSubject> = {}): EventSubject {
  return {
    id: 'E-rapat',
    projectId: PROJECT_ID,
    createdBy: OTHER_ID,
    canceledAt: null,
    deletedAt: null,
    deletedBy: null,
    projectDeletedAt: null,
    isParticipant: false,
    ...overrides,
  };
}

function projectRow(overrides: Partial<ProjectSubject> = {}): ProjectSubject {
  return {
    id: PROJECT_ID,
    status: 'active',
    leadId: null,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

/** `ok` or the deny code, so a matrix row reads as one short string. */
const verdict = (d: { ok: boolean; code?: string }) => (d.ok ? 'ok' : (d.code as string));

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

describe('canWriteNote', () => {
  it.each([
    ['manager', 'ok'],
    ['member', 'NOT_MEMBER'],
    ['viewer', 'NOT_MEMBER'],
    ['none', 'NOT_VISIBLE'],
  ] as const)(
    'a Member account who is %s in the project and not invited: %s',
    (state, expected) => {
      expect(verdict(canWriteNote(principal(ROLES.MEMBER), eventRow(), membership(state)))).toBe(
        expected,
      );
    },
  );

  it('a guest writes the minutes even as a Pemantau: the note-taker is rarely the organiser', () => {
    const sri = persona('PT');
    const invited = eventRow({ isParticipant: true });
    expect(canWriteNote(sri.principal, invited, sri.membership).ok).toBe(true);
  });

  it('the creator writes them too', () => {
    const mine = eventRow({ createdBy: 'U-actor' });
    expect(canWriteNote(principal(ROLES.MEMBER), mine, null).ok).toBe(true);
  });

  it('a trashed event accepts no minutes', () => {
    const invited = eventRow({ isParticipant: true, deletedAt: NOW });
    expect(verdict(canWriteNote(principal(ROLES.MEMBER), invited, null))).toBe('WRONG_STATE');
  });
});

describe('canRestoreEvent', () => {
  const deletedAt = new Date('2026-11-01T00:00:00Z');

  it('a manager of the project restores it inside the retention window', () => {
    const trashed = eventRow({ deletedAt });
    expect(restore(principal(ROLES.MEMBER), trashed, membership('manager'), NOW).ok).toBe(true);
  });

  it('an event that is not in the Trash has nothing to restore', () => {
    expect(verdict(restore(principal(ROLES.ADMIN), eventRow(), null, NOW))).toBe('WRONG_STATE');
  });

  it('past the retention window it is gone for good', () => {
    const old = new Date(NOW);
    old.setUTCDate(old.getUTCDate() - (METRICS.TRASH_RETENTION_DAYS + 1));
    const trashed = eventRow({ deletedAt: old });
    expect(verdict(restore(principal(ROLES.ADMIN), trashed, null, NOW))).toBe('EXPIRED');
  });

  it('an event trashed with its project is restored by restoring the project', () => {
    const trashed = eventRow({ deletedAt, projectDeletedAt: deletedAt });
    expect(verdict(restore(principal(ROLES.ADMIN), trashed, null, NOW))).toBe('PROJECT_IN_TRASH');
  });

  it('a Member who only belongs to the project cannot restore', () => {
    const trashed = eventRow({ deletedAt });
    expect(verdict(restore(principal(ROLES.MEMBER), trashed, membership('member'), NOW))).toBe(
      'NOT_MANAGER',
    );
  });
});

describe('eventLevel', () => {
  it('an Admin outranks any project role, membership or not', () => {
    for (const state of MEMBERSHIP_STATES) {
      expect(eventLevel(principal(ROLES.ADMIN), eventRow(), membership(state))).toBe('admin');
    }
  });

  it('a personal event yields no level, so only creator and guests reach it', () => {
    const personal = eventRow({ projectId: null });
    expect(eventLevel(principal(ROLES.PROJECT_MANAGER), personal, null)).toBe('none');
    expect(eventLevel(principal(ROLES.MEMBER), personal, membership('manager'))).toBe('none');
  });

  it('a project event takes the project level, and a non-member PM reads it', () => {
    expect(eventLevel(principal(ROLES.MEMBER), eventRow(), membership('viewer'))).toBe('viewer');
    expect(eventLevel(principal(ROLES.PROJECT_MANAGER), eventRow(), null)).toBe('reader');
    expect(eventLevel(principal(ROLES.MEMBER), eventRow(), null)).toBe('none');
  });
});

describe('the full role x membership matrix is stable', () => {
  const ACTIONS = {
    view: canViewEvent,
    manage: canManageEvent,
    cancel: canCancelEvent,
    trash: canTrashEvent,
    participants: canManageParticipants,
    note: canWriteNote,
  } as const;

  it('every (account role, membership) pair decides every action without throwing', () => {
    const table: Record<string, string> = {};
    for (const role of APP_ROLES) {
      for (const state of MEMBERSHIP_STATES) {
        for (const [name, fn] of Object.entries(ACTIONS)) {
          table[`${role}/${state}/${name}`] = verdict(
            fn(principal(role), eventRow(), membership(state)),
          );
        }
      }
    }
    expect(Object.keys(table)).toHaveLength(APP_ROLES.length * MEMBERSHIP_STATES.length * 6);
    // A Member outside the project learns nothing at all; a manager may do everything.
    expect(table[`${ROLES.MEMBER}/none/view`]).toBe('NOT_VISIBLE');
    expect(table[`${ROLES.MEMBER}/none/manage`]).toBe('NOT_VISIBLE');
    expect(table[`${ROLES.MEMBER}/manager/trash`]).toBe('ok');
    // A Pemantau may read, and nothing else.
    expect(table[`${ROLES.MEMBER}/viewer/view`]).toBe('ok');
    expect(table[`${ROLES.MEMBER}/viewer/manage`]).toBe('NOT_MANAGER');
    expect(table[`${ROLES.MEMBER}/viewer/note`]).toBe('NOT_MEMBER');
  });
});

describe('eventCaps and appCaps', () => {
  it('a project manager gets every event capability', () => {
    const caps = eventCaps(principal(ROLES.MEMBER), eventRow(), membership('manager'));
    expect(Object.keys(caps).sort()).toEqual([...EVENT_CAP_KEYS].sort());
    for (const key of EVENT_CAP_KEYS) expect(caps[key]).toBe(true);
  });

  it('a Pemantau gets none: every denial of theirs is a hide, not a disable', () => {
    const sri = persona('PT');
    expect(eventCaps(sri.principal, eventRow(), sri.membership)).toEqual({});
  });

  it('a guest gets only writeNote', () => {
    const caps = eventCaps(principal(ROLES.MEMBER), eventRow({ isParticipant: true }), null);
    expect(caps).toEqual({ writeNote: true });
  });

  it('a hidden event yields no capabilities at all', () => {
    const hidden = eventRow({ projectId: null });
    expect(eventCaps(principal(ROLES.MEMBER), hidden, null)).toEqual({});
  });

  it('a trashed event hides its write controls entirely (WRONG_STATE is a hide, not a disable)', () => {
    const caps = eventCaps(principal(ROLES.ADMIN), eventRow({ deletedAt: NOW }), null);
    expect(caps).toEqual({});
  });

  it('an event whose project is trashed disables them instead, with the reason to fix it first', () => {
    const caps = eventCaps(
      principal(ROLES.ADMIN),
      eventRow({ deletedAt: NOW, projectDeletedAt: NOW }),
      null,
    );
    expect(caps.update).toBe('PROJECT_IN_TRASH');
  });

  it('impersonating hides trash and cancel but keeps update', () => {
    const sneaky = principal(ROLES.SUPER_ADMIN, { impersonating: true });
    const caps = eventCaps(sneaky, eventRow(), null);
    expect(caps.update).toBe(true);
    expect(caps.trash).toBe('IMPERSONATING');
    expect(caps.cancel).toBe('IMPERSONATING');
  });

  it('appCaps.createEvent is true for every account role: a personal event needs no project', () => {
    for (const role of APP_ROLES) expect(appCaps(principal(role)).createEvent).toBe(true);
  });
});
