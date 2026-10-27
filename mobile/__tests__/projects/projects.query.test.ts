// Projects Filter & sort, and the date labels of the Projects screens.
//
// Rewritten for Phase 2, because what this module promises changed rather than merely moving.
// Filtering, sorting and searching are the server's now (`GET /api/app/projects`), so the in-memory
// `applyQuery`/`searchProjects` this file used to exercise are gone: narrowing the page the app
// happens to hold is not narrowing the list, and the two only disagree on the second page, where
// nobody would notice. What is left to guarantee is the *translation* — each option index must send
// the parameter the server reads — so that is what is asserted here.
//
// The "people row" block went with the row itself: the list route takes `scope=mine|all` and no
// person, so `projects.people` was deleted along with the My projects / teammate picker (GAP A-2,
// docs/phase2-gap-disembunyikan.md). The dates block is unchanged — those labels are still this
// app's own.
import { sortWire, SORTS, statusFilter, STATUSES } from '../../src/data/projects.api.values';
import { addMonths, daysLeftLabel, rangeLabel } from '../../src/data/projects.dates';
import { ATTENTION, BASE_QUERY, isFiltered, OPTIONS } from '../../src/data/projects.query';

describe('the query the sheet offers', () => {
  it('starts unnarrowed: every status, nothing singled out, nearest deadline first', () => {
    expect(BASE_QUERY).toEqual({ status: 0, attention: 0, sort: 0 });
    expect(STATUSES[BASE_QUERY.status]).toBe('All');
    expect(ATTENTION[BASE_QUERY.attention]).toBe('All');
    expect(SORTS[BASE_QUERY.sort]).toBe('Nearest deadline');
  });

  it('offers the options from one place, so the sheet and the request cannot disagree', () => {
    expect(OPTIONS).toEqual({ statuses: STATUSES, attention: ATTENTION, sorts: SORTS });
  });
});

describe('status filter -> status=', () => {
  it('sends nothing for All, so the server is not asked to filter at all', () => {
    expect(statusFilter(0)).toBeUndefined();
  });

  it('sends the wire status of every other option', () => {
    // Every offered status must map to something; a silent undefined would widen the list.
    const sent = STATUSES.map((_, i) => statusFilter(i));
    // "Done" is `completed` on the wire, not `done` -- the two names do not match on purpose.
    expect(sent).toEqual([undefined, 'active', 'on_hold', 'completed', 'draft', 'canceled']);
  });

  it('falls back to no filter when the index is out of range', () => {
    expect(statusFilter(STATUSES.length)).toBeUndefined();
    expect(statusFilter(-1)).toBeUndefined();
  });
});

describe('sort -> sort=', () => {
  it('sends the wire sort of each option, in the order the sheet shows them', () => {
    expect(SORTS.map((_, i) => sortWire(i))).toEqual(['due', 'name', 'recent']);
  });

  it('falls back to the first sort when the index is out of range, as the list does', () => {
    expect(sortWire(SORTS.length)).toBe('due');
    expect(sortWire(-1)).toBe('due');
  });
});

describe('isFiltered (the dot on the filter icon)', () => {
  it('is on for a status or the attention flag: both narrow what comes back', () => {
    expect(isFiltered({ ...BASE_QUERY, status: 1 })).toBe(true);
    expect(isFiltered({ ...BASE_QUERY, attention: 1 })).toBe(true);
  });

  it('is off for the sort order alone, which reorders the list without narrowing it', () => {
    expect(isFiltered({ ...BASE_QUERY, sort: 1 })).toBe(false);
    expect(isFiltered({ ...BASE_QUERY, sort: 2 })).toBe(false);
  });

  it('is off for the query the list starts with', () => {
    expect(isFiltered(BASE_QUERY)).toBe(false);
  });
});

describe('dates', () => {
  it('adds months, clamped to the month end', () => {
    expect(addMonths('2026-10-07', 1)).toBe('2026-11-07');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('labels ranges and days left', () => {
    expect(rangeLabel('2026-09-01', '2026-09-24')).toBe('Sep 1–24');
    expect(rangeLabel('2026-09-25', '2026-10-20')).toBe('Sep 25–Oct 20');
    expect(daysLeftLabel('2026-10-07', '2026-10-31')).toMatch(/24 days/);
  });
});
