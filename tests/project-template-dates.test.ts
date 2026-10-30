/**
 * Round-trip of a template's day offsets (plan §5.4): saving a story draft as a template converts
 * its absolute dates to offsets (`templateInputFromDraft`, `diffDays`); using the template again
 * converts them back (`addDays`, `project-template.service.ts`). Both directions must agree.
 */
import { describe, expect, it } from 'bun:test';
import { templateInputFromDraft } from '../app/components/projects/create/template-create.flow';
import type { ProjectDraft } from '../server/ai/project-draft.types';
import { addDays } from '../server/ai/task-draft.dates';

const TODAY = '2026-10-07'; // a fixed "today" for when the draft has no startDate of its own

const draft = (over: Partial<ProjectDraft> = {}): ProjectDraft => ({
  name: 'Renovasi Dapur',
  description: null,
  startDate: '2026-10-10',
  dueDate: '2026-11-10',
  priority: null,
  phases: [],
  looseTasks: [],
  ...over,
});

describe('templateInputFromDraft → offsets → addDays round trip', () => {
  it('a phase and a task round-trip to the same absolute dates when reused with the same start', () => {
    const d = draft({
      phases: [
        {
          name: 'Beli material',
          description: null,
          startDate: '2026-10-10',
          endDate: '2026-10-17',
          tasks: [
            {
              title: 'Beli cat',
              description: null,
              priority: null,
              kindName: null,
              dueDate: '2026-10-14',
            },
          ],
        },
      ],
      looseTasks: [
        {
          title: 'Rapat kickoff',
          description: null,
          priority: null,
          kindName: null,
          dueDate: null,
        },
      ],
    });
    const saved = templateInputFromDraft(d, TODAY);
    const phase = saved.phases?.[0];
    expect(phase?.startOffsetDays).toBe(0); // the project's own day 0
    expect(phase?.endOffsetDays).toBe(7);
    expect(phase?.tasks?.[0]?.dueOffsetDays).toBe(4);
    expect(saved.looseTasks?.[0]?.dueOffsetDays).toBeNull(); // no date to convert

    // Reused with the SAME start date: every offset must produce the exact original date back.
    const startDate = d.startDate as string;
    expect(addDays(startDate, phase?.startOffsetDays ?? 0)).toBe(d.phases[0]?.startDate as string);
    expect(addDays(startDate, phase?.endOffsetDays ?? 0)).toBe(d.phases[0]?.endDate as string);
    expect(addDays(startDate, phase?.tasks?.[0]?.dueOffsetDays ?? 0)).toBe(
      d.phases[0]?.tasks[0]?.dueDate as string,
    );
  });

  it('reused with a DIFFERENT start date, every date shifts by the same number of days', () => {
    const d = draft({
      phases: [
        { name: 'P', description: null, startDate: '2026-10-10', endDate: '2026-10-20', tasks: [] },
      ],
    });
    const saved = templateInputFromDraft(d, TODAY);
    const phase = saved.phases?.[0];
    const newStart = '2027-03-01';
    const shiftedStart = addDays(newStart, phase?.startOffsetDays ?? 0);
    const shiftedEnd = addDays(newStart, phase?.endOffsetDays ?? 0);
    expect(shiftedStart).toBe('2027-03-01');
    expect(shiftedEnd).toBe('2027-03-11'); // same 10-day span as the original phase
  });

  it('falls back to "today" as the baseline when the draft itself has no startDate', () => {
    const d = draft({
      startDate: null,
      looseTasks: [
        { title: 'T', description: null, priority: null, kindName: null, dueDate: '2026-10-10' },
      ],
    });
    const saved = templateInputFromDraft(d, TODAY);
    expect(saved.looseTasks?.[0]?.dueOffsetDays).toBe(3); // 2026-10-07 -> 2026-10-10
  });

  it.each([0, 20] as const)(
    'offset 0 and a large forward offset keep day 0 and the day count exact',
    (days) => {
      const date = addDays(TODAY, days);
      expect(addDays(TODAY, days)).toBe(date);
      const back = templateInputFromDraft(
        draft({
          startDate: TODAY,
          looseTasks: [
            { title: 'T', description: null, priority: null, kindName: null, dueDate: date },
          ],
        }),
        TODAY,
      );
      expect(back.looseTasks?.[0]?.dueOffsetDays).toBe(days);
    },
  );
});
