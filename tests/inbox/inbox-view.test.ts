/** Pure view logic of the Inbox: day sections, relative times and the lines under each kind of card. */
import { describe, expect, it } from 'bun:test';
import {
  contextLine,
  detailLines,
  groupInbox,
  headlineOf,
  isLeaveApproval,
  leaveRangeOf,
  relativeTime,
  sectionsFor,
} from '../../app/lib/inbox-view';
import { CLOCK, eventCard, leaveRequestCard, minutesAgo, taskCard } from './inbox-fixtures';

describe('groupInbox / sectionsFor', () => {
  const items = [
    taskCard({ id: 'a', lane: 'info', group: 'today' }),
    taskCard({ id: 'b', lane: 'info', group: 'older' }),
    taskCard({ id: 'c', lane: 'info', group: 'today' }),
    taskCard({ id: 'd', lane: 'info', group: 'yesterday' }),
  ];

  it('orders the sections today, yesterday, older and keeps the server order inside each', () => {
    const sections = groupInbox(items);
    expect(sections.map((s) => [s.heading, s.items.map((i) => i.id)])).toEqual([
      ['Hari ini', ['a', 'c']],
      ['Kemarin', ['d']],
      ['Lebih lama', ['b']],
    ]);
  });

  it('leaves out an empty day instead of printing a bare heading', () => {
    expect(groupInbox(items.slice(0, 1)).map((s) => s.heading)).toEqual(['Hari ini']);
    expect(groupInbox([])).toEqual([]);
  });

  it('reads the news lane by day and the work queue as one flat list without a heading', () => {
    expect(sectionsFor('info', items).length).toBe(3);
    const flat = sectionsFor('action', items);
    expect(flat).toHaveLength(1);
    expect(flat[0]?.heading).toBeNull();
    expect(flat[0]?.items.map((i) => i.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(sectionsFor('action', [])).toEqual([]);
  });
});

describe('relativeTime', () => {
  it('says "Baru saja" under a minute and minutes under an hour', () => {
    expect(relativeTime(minutesAgo(0), 'today', CLOCK)).toBe('Baru saja');
    expect(relativeTime(minutesAgo(10), 'today', CLOCK)).toBe('10 menit lalu');
    expect(relativeTime(minutesAgo(59), 'today', CLOCK)).toBe('59 menit lalu');
  });

  it('says hours for the rest of today', () => {
    expect(relativeTime(minutesAgo(60), 'today', CLOCK)).toBe('1 jam lalu');
    expect(relativeTime(minutesAgo(3 * 60 + 40), 'today', CLOCK)).toBe('3 jam lalu');
  });

  it('never reads a future time as negative minutes (a clock a little ahead of the server)', () => {
    expect(relativeTime(minutesAgo(-3), 'today', CLOCK)).toBe('Baru saja');
  });

  it('writes the clock time in the team zone for yesterday and a short date for older cards', () => {
    // 09:40 Jakarta on 19 Oct and 14:15 Jakarta on 15 Oct.
    expect(relativeTime('2026-10-19T02:40:00Z', 'yesterday', CLOCK)).toBe('Kemarin 09.40');
    expect(relativeTime('2026-10-15T07:15:00Z', 'older', CLOCK)).toBe('15 Okt 14.15');
  });
});

describe('detailLines and contextLine', () => {
  it('a task card names the task, and quotes a comment excerpt', () => {
    const card = taskCard({
      kind: 'task_commented',
      lane: 'info',
      payload: { title: 'Fix login SSO', number: 12, excerpt: 'Tombol keluar belum jalan' },
    });
    expect(detailLines(card, CLOCK)).toEqual(['#12 Fix login SSO', '"Tombol keluar belum jalan"']);
  });

  it('an event card gives the title and the start in the team zone', () => {
    expect(detailLines(eventCard(), CLOCK)).toEqual(['Latihan presentasi', '27 Okt · 15.00']);
  });

  it('a leave request gives the range with the days, and the due tasks the approver must weigh', () => {
    expect(detailLines(leaveRequestCard(), CLOCK)).toEqual([
      '14–16 Okt 2026 · 3 hari',
      '2 tugas jatuh tempo selama cuti',
    ]);
    const none = leaveRequestCard({
      payload: {
        name: 'Dodi',
        startDate: '2026-10-14',
        endDate: '2026-10-16',
        days: 3,
        dueTasks: 0,
      },
    });
    expect(detailLines(none, CLOCK)).toContain('Tidak ada tugas jatuh tempo');
  });

  it('a leave outcome quotes the reject reason and never asks about due tasks', () => {
    const card = leaveRequestCard({
      kind: 'leave_decided',
      lane: 'info',
      secondaryButton: null,
      payload: {
        name: 'Dodi',
        startDate: '2026-10-14',
        endDate: '2026-10-14',
        days: 1,
        decision: 'rejected',
        excerpt: 'Tenggat proyek',
      },
    });
    expect(detailLines(card, CLOCK)).toEqual(['14 Okt 2026 · 1 hari', '"Tenggat proyek"']);
  });

  it('a card with an empty or odd payload renders no lines instead of failing', () => {
    expect(detailLines(taskCard({ payload: {} }), CLOCK)).toEqual([]);
    expect(detailLines(taskCard({ payload: { title: 5, number: 'x' } }), CLOCK)).toEqual([]);
  });

  it('puts the project before the time, and only the time when there is no project', () => {
    expect(contextLine(taskCard(), CLOCK)).toBe('Proyek Atlas · 20 menit lalu');
    expect(contextLine(leaveRequestCard(), CLOCK)).toBe('20 menit lalu');
  });

  it('the news lane is timed from its bundle time, not from the first event', () => {
    const bundled = taskCard({
      lane: 'info',
      createdAt: minutesAgo(300),
      updatedAt: minutesAgo(5),
    });
    expect(contextLine(bundled, CLOCK)).toBe('Proyek Atlas · 5 menit lalu');
  });
});

describe('headline and leave helpers', () => {
  it('falls back to a plain sentence for a kind this build does not know', () => {
    expect(headlineOf(taskCard({ sentence: null }))).toBe('Ada kabar baru untuk Anda');
    expect(headlineOf(taskCard())).toBe('Nico menunjuk Anda mengerjakan #14');
  });

  it('only the leave request has two buttons', () => {
    expect(isLeaveApproval(leaveRequestCard())).toBe(true);
    expect(isLeaveApproval(taskCard())).toBe(false);
    expect(isLeaveApproval(leaveRequestCard({ kind: 'leave_decided' }))).toBe(false);
  });

  it('reads the range of a leave card for the confirm dialog', () => {
    expect(leaveRangeOf(leaveRequestCard())).toBe('14–16 Okt 2026');
    expect(leaveRangeOf(taskCard())).toBeNull();
  });
});
