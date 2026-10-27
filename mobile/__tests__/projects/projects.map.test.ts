// What the Projects screens are handed, built from one wire body: the list card, the detail header,
// the Members tab, the Phases tab, the Edit form and the Extend sheet.
//
// These are the seams the screen tests cannot see. A screen test asserts "Oct 31 is on screen"; this
// file asserts *which field* it came from, so a mapper that reads `startDate` where it meant
// `dueDate` fails here with the two names in the message rather than as a date that merely looks
// plausible on a card.
//
// Nothing is fetched: the mappers are pure functions of a body, which is the reason they were split
// out of the resources in the first place.
import { cardOf, headerOf, inTrash, leadName } from '@/data/projects.api.map';
import { membersView } from '@/data/projects.api.members';
import { phasesView } from '@/data/projects.api.plan';
import { priorityWord, roleWord, statusWord } from '@/data/projects.api.values';
import { addDays, daysLeftLabel, longDate, rangeLabel, weekdayLongDate } from '@/data/projects.dates';
import { getProjectsList } from '@/data/projects';
import { BASE_QUERY } from '@/data/projects.query';
import { forgetAllResources } from '@/data/resource';

import {
  DEFAULT_MEMBERS,
  DODI,
  ME,
  PROJECT_PHASES,
  wireDetail,
  wireExtensions,
  wireListItem,
  wireMember,
  wireMilestone,
  wirePlan,
} from '../helpers/projects-wire';

beforeEach(() => {
  forgetAllResources();
});

describe('a list row -> a card', () => {
  it('takes the name, status, lead, progress and deadline from their own fields', () => {
    const card = cardOf(
      wireListItem({
        name: 'Atlas Project',
        status: 'on_hold',
        dueDate: '2026-10-31',
        startDate: '2026-01-01',
        progress: { done: 7, total: 10, percent: 70 },
      }),
    );
    expect(card).toMatchObject({
      id: 'atlas',
      name: 'Atlas Project',
      status: 'On hold',
      lead: ME.name,
      progress: 70,
      percent: '70%',
      // The deadline, not the start date: the two are adjacent and both ISO dates.
      due: 'Oct 31',
    });
  });

  it('says there is no lead rather than printing an empty name', () => {
    expect(cardOf(wireListItem({ lead: null })).lead).toBe('No lead yet');
    expect(leadName({ lead: null })).toBe('No lead yet');
  });

  it('says there is no deadline rather than showing a date for null', () => {
    expect(cardOf(wireListItem({ dueDate: null })).due).toBe('No deadline');
  });

  it('carries the server condition reason into the health line, as it came (K5)', () => {
    const card = cardOf(
      wireListItem({ condition: { level: 'at_risk', reason: '1 tugas penting terlambat' } }),
    );
    // The Indonesian sentence is the server's and is shown, never rebuilt from parts.
    expect(card.health).toContain('1 tugas penting terlambat');
  });

  it('shows a project with no tasks as having no percent, not as 0% done', () => {
    const card = cardOf(wireListItem({ progress: { done: 0, total: 0, percent: null } }));
    expect(card.percent).not.toBe('0%');
  });
});

describe('a detail -> the header every tab sits under', () => {
  it('reads the deadline long, the live task count and the extension pill', () => {
    const h = headerOf(wireDetail({ dueDate: '2026-10-31', extensionCount: 2 }));
    expect(h.dueLong).toBe('Oct 31, 2026');
    expect(h.liveTasks).toBe(5);
    expect(h.extended).toBe('Extended ×2');
  });

  it('leaves the extension pill empty for a project never extended', () => {
    expect(headerOf(wireDetail({ extensionCount: 0 })).extended).toBe('');
  });

  it('knows a project is in the Trash from the deny code, since no field says so (A-15)', () => {
    expect(inTrash({ update: 'PROJECT_IN_TRASH' })).toBe(true);
    expect(inTrash({ update: true })).toBe(false);
    // A key the server left out means hidden, which is not the same as in the Trash.
    expect(inTrash({})).toBe(false);
    expect(headerOf(wireDetail({ can: { update: 'PROJECT_IN_TRASH' } })).archived).toBe(true);
  });
});

describe('a member list -> the Members tab', () => {
  it('keeps userId as the identity and the name only as something to read', () => {
    const v = membersView({ items: [...DEFAULT_MEMBERS] }, { update: true });
    expect(v.cards.map((c) => c.userId)).toEqual([ME.id, DODI.id]);
    expect(v.cards.map((c) => c.full)).toEqual([ME.name, DODI.name]);
    expect(v.count).toBe('2 members');
  });

  it('matches the signed-in person by userId, not by first name (K4)', () => {
    const twoBudis = [
      wireMember({ userId: ME.id, name: 'Budi Santoso' }),
      wireMember({ userId: 'u-other', name: 'Budi Santoso', isLead: false, role: 'member' }),
    ];
    const v = membersView({ items: twoBudis }, { update: true });
    // Same display name, and only the one whose id matches is "you".
    expect(v.cards.map((c) => c.you)).toEqual([true, false]);
  });

  it('shows the job title alone as the sub line; there is no department on the wire (A-9)', () => {
    const v = membersView({ items: [wireMember({ jobTitle: 'UI Designer' })] }, { update: true });
    expect(v.cards[0]?.sub).toBe('UI Designer');
    const none = membersView({ items: [wireMember({ jobTitle: null })] }, { update: true });
    expect(none.cards[0]?.sub).toBe('');
  });

  it('names the only Manager when that Manager is also the Lead, and otherwise nobody', () => {
    expect(membersView({ items: [...DEFAULT_MEMBERS] }, { update: true }).onlyManager).toBe(ME.name);
    const twoManagers = [
      wireMember(),
      wireMember({ userId: DODI.id, name: DODI.name, role: 'manager', isLead: false }),
    ];
    expect(membersView({ items: twoManagers }, { update: true }).onlyManager).toBeNull();
  });

  it('reports the manage state from can.update, with a missing key meaning hidden', () => {
    expect(membersView({ items: [] }, { update: true }).manage).toBe('on');
    expect(membersView({ items: [] }, { update: 'DENIED' }).manage).toBe('off');
    expect(membersView({ items: [] }, {}).manage).toBe('hidden');
    expect(membersView({ items: [] }, undefined).manage).toBe('hidden');
  });

  it('says nothing about a count before the list arrives', () => {
    expect(membersView(null, { update: true }).count).toBeNull();
  });
});

describe('a plan -> the Phases tab', () => {
  it('gives each phase its range, state and task line', () => {
    const v = phasesView(wirePlan(), { update: true }, '2026-10-20', wireExtensions());
    expect(v.cards.map((c) => c.name)).toEqual(['Planning', 'Development', 'Testing']);
    expect(v.cards.map((c) => c.state)).toEqual(['Done', 'In progress', 'Not started']);
    expect(v.cards[0]?.range).toBe('Sep 1–24');
  });

  it('shows no bar for a phase with no tasks: 0% would read as "nothing done"', () => {
    const v = phasesView(wirePlan(), { update: true }, null, wireExtensions());
    const testing = v.cards.find((c) => c.name === 'Testing');
    expect(testing?.pct).toBeNull();
  });

  it('puts a milestone under the phase it belongs to, and leaves the others without one', () => {
    const v = phasesView(
      wirePlan({ milestones: [wireMilestone({ phaseId: 'ph-1' })] }),
      { update: true },
      null,
      wireExtensions(),
    );
    expect(v.cards.find((c) => c.name === 'Planning')?.milestones).toHaveLength(1);
    expect(v.cards.find((c) => c.name === 'Testing')?.milestones).toHaveLength(0);
  });

  it('carries the extension note as the manager wrote it', () => {
    const v = phasesView(wirePlan(), { update: true }, '2026-10-20', wireExtensions());
    expect(v.history?.rows[0]?.note).toBe('Client asked for the report screen.');
  });
});

describe('the list view before anything has arrived', () => {
  it('does not call itself empty while the first page is still out', () => {
    // `empty` must stay null until a page has landed: saying "no projects" while the request is
    // still out is a lie the screen then has to take back.
    const v = getProjectsList({ query: BASE_QUERY, search: '' });
    expect(v.empty).toBeNull();
    expect(v.count).toBeNull();
    expect(v.cards).toEqual([]);
  });

  it('offers New project only when whoami said so (A-17)', () => {
    expect(getProjectsList({ query: BASE_QUERY, search: '' }).mayCreate).toBe(false);
  });
});

describe('wire words -> screen words', () => {
  it('maps every status, and keeps "Done" distinct from the wire `completed`', () => {
    expect(statusWord('completed')).toBe('Done');
    expect(statusWord('on_hold')).toBe('On hold');
    expect(statusWord('draft')).toBe('Draft');
  });

  it('maps priorities and project roles', () => {
    expect(priorityWord('critical')).toBe('Critical');
    expect(roleWord('manager')).toBe('Manager');
    expect(roleWord('viewer')).toBe('Viewer');
  });
});

describe('the date labels these screens own', () => {
  it('writes a long date and a weekday date in UTC, whatever the device zone is', () => {
    expect(longDate('2026-10-31')).toBe('Oct 31, 2026');
    expect(weekdayLongDate('2026-10-12')).toBe('Mon, Oct 12, 2026');
  });

  it('adds days across a month end', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('labels a range inside one month and across two', () => {
    expect(rangeLabel('2026-09-01', '2026-09-24')).toBe('Sep 1–24');
    expect(rangeLabel('2026-09-25', '2026-10-20')).toBe('Sep 25–Oct 20');
  });

  it('counts days left, due today and overdue, singular and plural', () => {
    expect(daysLeftLabel('2026-10-07', '2026-10-08')).toBe('1 day left');
    expect(daysLeftLabel('2026-10-07', '2026-10-07')).toBe('Due today');
    expect(daysLeftLabel('2026-10-08', '2026-10-07')).toBe('1 day overdue');
    expect(daysLeftLabel('2026-10-10', '2026-10-07')).toBe('3 days overdue');
  });
});

describe('the phase fixture itself', () => {
  it('covers all three states, which is what the Overview steps are read from', () => {
    expect(PROJECT_PHASES.map((p) => p.status)).toEqual(['done', 'in_progress', 'not_started']);
  });
});
