/**
 * Who is signed in, and the one comparison that decides whether a row is theirs (K4).
 *
 * The prototype matched on first name. These tests pin down why that had to go: the moment two
 * people share a name, a name comparison attaches work to the wrong person and nothing reports it.
 */
import { me, person } from '@/data/people';
import { identityOf, samePerson, someSamePerson, viewer, viewerOf } from '@/data/viewer';
import { setSessionUser } from '@/session/session.state';

import { APPROVED_USER, resetSessionForTest, seedSession } from '../helpers/session-fixtures';

beforeEach(() => {
  resetSessionForTest();
  seedSession();
});

describe('the signed-in person', () => {
  it('takes its identity from the session, not from the sample row', () => {
    const who = viewer('pm');

    expect(who.userId).toBe(APPROVED_USER.id);
    // The name is still the sample's, because the rows are: it is for display only.
    expect(who.name).toBe(me('pm').name);
    expect(who.sample.key).toBe('nico');
  });

  it('follows the account the session reports', () => {
    setSessionUser({ ...APPROVED_USER, id: 'u-someone-else' });

    expect(viewer('pm').userId).toBe('u-someone-else');
  });

  it('falls back to the sample key only when there is no session at all', () => {
    resetSessionForTest();

    // A test rendering one screen on its own; inside the app the gate guarantees a user.
    expect(viewer('member').userId).toBe('dodi');
  });

  it('is the prototype role until the app has a role of its own', () => {
    // The session payload carries no role and AppCaps is not built yet: see
    // mobile/docs/phase2-gap-disembunyikan.md.
    expect(viewer().role).toBe('pm');
    expect(viewer('admin').role).toBe('admin');
  });
});

describe('samePerson', () => {
  it('matches a server reference by id, with no name involved', () => {
    const who = viewer('pm');

    expect(samePerson(APPROVED_USER.id, who)).toBe(true);
    expect(samePerson('u-another-account', who)).toBe(false);
  });

  it('matches a sample row by the person it names, whether by key or first name', () => {
    const who = viewer('pm');

    expect(samePerson('Nico', who)).toBe(true);
    expect(samePerson('nico', who)).toBe(true);
    expect(samePerson('Dodi', who)).toBe(false);
  });

  it('treats a name nobody has as nobody, instead of a near miss', () => {
    expect(samePerson('Nic', viewer('pm'))).toBe(false);
    expect(samePerson('', viewer('pm'))).toBe(false);
    expect(samePerson(null, viewer('pm'))).toBe(false);
    expect(samePerson(undefined, viewer('pm'))).toBe(false);
  });

  it('keeps two people with the same first name apart, which a name comparison cannot', () => {
    const budiOne = { ...me('member'), key: 'dodi' as const, name: 'Budi' };
    const budiTwo = { ...me('pm'), key: 'nico' as const, name: 'Budi' };
    const first = { userId: 'u-budi-1', sample: budiOne };
    const second = { userId: 'u-budi-2', sample: budiTwo };

    // What the server sends: ids. Each row goes to exactly one of them.
    expect(samePerson('u-budi-1', first)).toBe(true);
    expect(samePerson('u-budi-1', second)).toBe(false);
    // And the name both share tells the two apart no better than a coin toss — which is the bug:
    // it would have answered "yes" for both.
    expect(budiOne.name).toBe(budiTwo.name);
  });

  it('answers for a list of references: a task’s assignees, an event’s attendees', () => {
    const who = viewer('pm');

    expect(someSamePerson(['Rina', 'Nico'], who)).toBe(true);
    expect(someSamePerson(['Rina', 'Dodi'], who)).toBe(false);
    expect(someSamePerson([], who)).toBe(false);
  });
});

describe('the identity of someone else', () => {
  it('is their own, not the signed-in account', () => {
    const rina = person('Rina');
    if (!rina) throw new Error('sample person Rina is missing');
    const theirs = identityOf(rina);

    expect(theirs.userId).toBe('rina');
    expect(samePerson('Rina', theirs)).toBe(true);
    // The session's id belongs to the viewer, so it must not match a teammate.
    expect(samePerson(APPROVED_USER.id, theirs)).toBe(false);
  });

  it('viewerOf gives a sample person the session identity, for a caller that already had one', () => {
    expect(viewerOf(me('pm')).userId).toBe(APPROVED_USER.id);
    expect(viewerOf(me('pm')).sample.key).toBe('nico');
  });
});
