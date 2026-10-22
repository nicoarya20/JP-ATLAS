/** The briefing is rules over numbers: each sentence appears for its own condition and calm days say so once. */
import { describe, expect, it } from 'bun:test';
import { type BriefingInput, composeBriefing } from '../../server/home/home.summary';

const CALM: BriefingInput = {
  overdueTotal: 0,
  oldestOverdue: null,
  awaitingReviewTotal: 0,
  todayTasks: 0,
  todayEvents: 0,
  attention: null,
};
const with_ = (over: Partial<BriefingInput>): BriefingInput => ({ ...CALM, ...over });

describe('composeBriefing', () => {
  it('says nothing is urgent when every number is zero', () => {
    expect(composeBriefing(CALM)).toEqual(['Tidak ada yang mendesak hari ini.']);
  });

  it('names the one overdue task and how long it is late', () => {
    const lines = composeBriefing(
      with_({ overdueTotal: 1, oldestOverdue: { title: 'Bayar DP', days: 2 } }),
    );
    expect(lines).toEqual(['Ada 1 tugas yang terlambat: "Bayar DP" sudah lewat 2 hari.']);
  });

  it('counts several overdue tasks and names the oldest', () => {
    const lines = composeBriefing(
      with_({ overdueTotal: 3, oldestOverdue: { title: 'Bayar DP', days: 5 } }),
    );
    expect(lines).toEqual(['Ada 3 tugas yang terlambat, paling lama "Bayar DP" (lewat 5 hari).']);
  });

  it.each([
    [2, 1, 'Hari ini ada 2 tugas dan 1 acara.'],
    [2, 0, 'Hari ini ada 2 tugas.'],
    [0, 3, 'Hari ini ada 3 acara.'],
  ])('writes the day as %i tasks and %i events', (todayTasks, todayEvents, line) => {
    expect(composeBriefing(with_({ todayTasks, todayEvents }))).toEqual([line]);
  });

  it('mentions tasks waiting for my review', () => {
    expect(composeBriefing(with_({ awaitingReviewTotal: 2 }))).toEqual([
      '2 tugas menunggu pemeriksaan Anda.',
    ]);
  });

  it('flags a project at risk with its reason, and a late one as late', () => {
    expect(
      composeBriefing(
        with_({
          attention: { name: 'Hajatan', condition: 'at_risk', reason: '1 tugas penting terlambat' },
        }),
      ),
    ).toEqual(['Proyek "Hajatan" perlu perhatian: 1 tugas penting terlambat.']);
    expect(
      composeBriefing(
        with_({ attention: { name: 'Dapur', condition: 'off_track', reason: null } }),
      ),
    ).toEqual(['Proyek "Dapur" terlambat.']);
  });

  it('orders overdue, review, the day, then the project, and drops the calm sentence', () => {
    const lines = composeBriefing({
      overdueTotal: 1,
      oldestOverdue: { title: 'A', days: 1 },
      awaitingReviewTotal: 1,
      todayTasks: 1,
      todayEvents: 1,
      attention: { name: 'P', condition: 'at_risk', reason: null },
    });
    expect(lines).toHaveLength(4);
    expect(lines[0]).toStartWith('Ada 1 tugas yang terlambat');
    expect(lines[1]).toStartWith('1 tugas menunggu');
    expect(lines[2]).toStartWith('Hari ini ada');
    expect(lines[3]).toStartWith('Proyek "P"');
    expect(lines).not.toContain('Tidak ada yang mendesak hari ini.');
  });
});
