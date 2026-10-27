/**
 * Availability controls of `/dashboard/users` (P14 CU-04): the "Setel cuti" dialog, the history
 * list, and the row menu's entry. What is pinned: the dialog refuses a bad range with the server's
 * own sentence (one implementation, so a 422 cannot word it differently), it warns before replacing
 * the period under way, the history shows past and future ranges with the Admin-only note and the
 * recorder, the empty state says something, and the mobile card list exists next to the table.
 */
import { describe, expect, it } from 'bun:test';
import { LEAVE_MAX_DAYS, LEAVE_NOTE_MAX } from '@server/leave/leave.dto';
import { LEAVE_MESSAGES } from '@server/leave/leave.validate';
import type { ReactNode } from 'react';
import {
  EMPTY_SET_LEAVE,
  type SetLeaveValues,
  SetLeaveView,
  setLeaveBlocker,
  setLeaveValuesOf,
  toSetLeaveInput,
} from '../../app/components/users/SetLeaveForm';
import { leavePhaseOf, UserLeaveHistory } from '../../app/components/users/UserLeaveHistory';
import { UserLeaveView } from '../../app/components/users/UserLeavePanel';
import { hasAnyAction, userAccess } from '../../app/components/users/user-access';
import { SET_LEAVE_COPY, USER_LEAVE_COPY } from '../../app/components/users/user-leave.copy';
import type {
  AdminLeaveEntry,
  AdminLeavePeriod,
  AdminLeaveRead,
} from '../../app/lib/admin-leave-api';
import type { AdminUser } from '../../app/lib/admin-users-api';
import { renderUi } from '../support/render-ui';

const TODAY = '2026-10-07'; // test-only
const render = (node: ReactNode) => renderUi(node);

const period = (over: Partial<AdminLeavePeriod> = {}): AdminLeavePeriod => ({
  id: 'lp-1',
  startDate: '2026-10-05',
  endDate: '2026-10-09',
  note: null,
  days: 5,
  ...over,
});

const entry = (over: Partial<AdminLeaveEntry> = {}): AdminLeaveEntry => ({
  ...period(),
  recordedAt: '2026-10-01T02:00:00.000Z',
  recordedBy: { id: 'u-admin', name: 'Ayu' },
  ...over,
});

const values = (over: Partial<SetLeaveValues> = {}): SetLeaveValues => ({
  ...EMPTY_SET_LEAVE,
  ...over,
});

const view = (over: Partial<Parameters<typeof SetLeaveView>[0]> = {}) =>
  render(
    <SetLeaveView
      running={null}
      values={values({ startDate: '2026-11-02', endDate: '2026-11-04' })}
      onChange={() => undefined}
      blocker={null}
      error={null}
      loading={false}
      onSubmit={() => undefined}
      onCancel={() => undefined}
      {...over}
    />,
  );

describe('the Setel cuti dialog states its rules in the server’s words', () => {
  it('asks for both dates before anything else', () => {
    expect(setLeaveBlocker(values())).toBe(SET_LEAVE_COPY.missingDates);
    expect(setLeaveBlocker(values({ startDate: '2026-11-02' }))).toBe(SET_LEAVE_COPY.missingDates);
    expect(toSetLeaveInput(values({ startDate: '2026-11-02' }))).toBeNull();
  });

  it('reuses the endpoint’s own refusals for an impossible range', () => {
    expect(setLeaveBlocker(values({ startDate: '2026-11-05', endDate: '2026-11-02' }))).toBe(
      LEAVE_MESSAGES.endBeforeStart,
    );
    expect(setLeaveBlocker(values({ startDate: '2026-01-01', endDate: '2026-12-31' }))).toBe(
      LEAVE_MESSAGES.tooLong,
    );
    expect(
      setLeaveBlocker(
        values({
          startDate: '2026-11-02',
          endDate: '2026-11-02',
          note: 'x'.repeat(LEAVE_NOTE_MAX + 1),
        }),
      ),
    ).toBe(LEAVE_MESSAGES.noteTooLong);
  });

  it('accepts a range already in the past (§10 T3) and a note trimmed to null when blank', () => {
    const past = values({ startDate: '2025-02-01', endDate: '2025-02-03', note: '   ' });
    expect(setLeaveBlocker(past)).toBeNull();
    expect(toSetLeaveInput(past)).toEqual({
      startDate: '2025-02-01',
      endDate: '2025-02-03',
      note: null,
    });
    // The cap is per period, so the longest allowed range is still fine.
    expect(LEAVE_MAX_DAYS).toBe(90);
  });

  it('prefills from the period under way, so a correction is an edit', () => {
    expect(setLeaveValuesOf(period({ note: 'umroh' }))).toEqual({
      startDate: '2026-10-05',
      endDate: '2026-10-09',
      note: 'umroh',
    });
    expect(setLeaveValuesOf(null)).toEqual(EMPTY_SET_LEAVE);
  });

  it('says the running period is being replaced before the Admin saves, never silently', async () => {
    const html = await view({ running: period() });
    expect(html).toContain(SET_LEAVE_COPY.replaces('5–9 Okt 2026'));
    expect(await view()).not.toContain('akan diganti');
  });

  it('shows the server’s refusal as it came and keeps the dialog usable', async () => {
    const overlap = LEAVE_MESSAGES.overlap('1–5 Nov 2026');
    const html = await view({ error: overlap });
    expect(html).toContain(overlap);
    expect(html).toContain('role="alert"');
  });

  it('turns the save button off while the input is unusable, and on while sending', async () => {
    const blocked = await view({ blocker: SET_LEAVE_COPY.missingDates });
    expect(blocked).toContain(SET_LEAVE_COPY.missingDates);
    expect(blocked).toContain('disabled');
    expect(blocked).toContain('aria-describedby="set-leave-blocker"');
    expect(await view({ loading: true })).toContain('data-loading="true"');
  });

  it('warns that the note is Admin-only, right where it is typed (D6)', async () => {
    expect(await view()).toContain(SET_LEAVE_COPY.noteHint);
  });
});

describe('the history is the only place a past or future period can be read (§10 T1)', () => {
  const items = [
    entry({ id: 'a', startDate: '2026-12-20', endDate: '2026-12-24', days: 5 }),
    entry({ id: 'b', note: 'sakit' }),
    entry({
      id: 'c',
      startDate: '2026-08-01',
      endDate: '2026-08-03',
      days: 3,
      note: 'cuti lebaran',
      recordedBy: null,
    }),
  ];

  it('labels each range against the server’s today, not the browser clock', () => {
    expect(leavePhaseOf(items[0] as AdminLeaveEntry, TODAY)).toBe('upcoming');
    expect(leavePhaseOf(items[1] as AdminLeaveEntry, TODAY)).toBe('running');
    expect(leavePhaseOf(items[2] as AdminLeaveEntry, TODAY)).toBe('past');
  });

  it('shows the range, the note and who recorded it', async () => {
    const html = await render(<UserLeaveHistory items={items} today={TODAY} />);
    expect(html).toContain('20–24 Des 2026');
    expect(html).toContain('1–3 Agu 2026');
    expect(html).toContain('cuti lebaran');
    expect(html).toContain(USER_LEAVE_COPY.recordedBy('Ayu'));
    expect(html).toContain(USER_LEAVE_COPY.recordedByUnknown);
    expect(html).toContain(USER_LEAVE_COPY.upcoming);
    expect(html).toContain(USER_LEAVE_COPY.past);
  });

  it('renders a table for wide screens and a card list for narrow ones', async () => {
    const html = await render(<UserLeaveHistory items={items} today={TODAY} />);
    expect(html).toContain('<table');
    // Mantine turns visibleFrom/hiddenFrom into these attributes; both halves must be present.
    expect(html).toContain('mantine-visible-from-sm');
    expect(html).toContain('mantine-hidden-from-sm');
  });
});

describe('the row menu offers availability for every account', () => {
  const user = (over: Partial<AdminUser> = {}): AdminUser =>
    ({
      id: 'u-target',
      name: 'Eka',
      email: 'eka@example.test',
      role: 'member',
      approvalStatus: 'approved',
      banned: false,
      banExpires: null,
      ...over,
    }) as AdminUser;
  const perms = (over: Record<string, unknown> = {}) => ({
    actorRole: 'admin',
    currentUserId: 'u-admin',
    impersonating: false,
    ...over,
  });

  it('is open for a protected target and for the actor themselves, where no account action is', () => {
    const onAdmin = userAccess(user({ role: 'admin' }), perms());
    expect(onAdmin.leave).toBe(true);
    // The reason the account itself cannot be changed must still reach the menu.
    expect(hasAnyAction(onAdmin)).toBe(false);
    expect(onAdmin.blockedReason).not.toBeNull();
    expect(userAccess(user({ id: 'u-admin' }), perms()).leave).toBe(true);
  });

  it('is closed while impersonating, matching the endpoint’s 403', () => {
    expect(userAccess(user(), perms({ impersonating: true })).leave).toBe(false);
  });

  it('is closed for a member and a project manager', () => {
    for (const actorRole of ['member', 'project_manager']) {
      expect(userAccess(user(), perms({ actorRole })).leave).toBe(false);
    }
  });
});

describe('the panel says what the person’s availability is now', () => {
  const read = (over: Partial<AdminLeaveRead> = {}): AdminLeaveRead => ({
    today: TODAY,
    running: null,
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    ...over,
  });
  const panel = (data: AdminLeaveRead, busy = false) =>
    render(
      <UserLeaveView
        data={data}
        busy={busy}
        page={data.page}
        onPage={() => undefined}
        onSet={() => undefined}
        onEnd={() => undefined}
      />,
    );

  it('shows the running range, its note and that the note goes no further (D6)', async () => {
    const running = period({ note: 'kontrol ke dokter' });
    const html = await panel(read({ running, items: [entry({ note: running.note })], total: 1 }));
    expect(html).toContain(USER_LEAVE_COPY.running);
    expect(html).toContain('5–9 Okt 2026');
    expect(html).toContain('kontrol ke dokter');
    expect(html).toContain(USER_LEAVE_COPY.noteOnlyHere);
    expect(html).toContain(USER_LEAVE_COPY.change);
    expect(html).toContain(USER_LEAVE_COPY.end);
  });

  it('offers only "Setel cuti" for somebody who is here: there is nothing to end', async () => {
    const html = await panel(read());
    expect(html).toContain(USER_LEAVE_COPY.here);
    expect(html).toContain(USER_LEAVE_COPY.set);
    expect(html).not.toContain(USER_LEAVE_COPY.end);
  });

  it('says something useful when no period was ever recorded', async () => {
    const html = await panel(read());
    expect(html).toContain(USER_LEAVE_COPY.historyEmpty);
    expect(html).toContain(USER_LEAVE_COPY.historyEmptyHint);
    expect(html).not.toContain('<table');
  });

  it('shows the pager only once the history outgrows one page', async () => {
    const one = await panel(read({ items: [entry()], total: 1 }));
    expect(one).not.toContain('mantine-Pagination-root');
    const many = await panel(read({ items: [entry()], total: 24 }));
    expect(many).toContain('mantine-Pagination-root');
  });

  it('keeps the end button in its loading state while the request is in flight', async () => {
    const html = await panel(read({ running: period() }), true);
    expect(html).toContain('data-loading="true"');
  });
});
