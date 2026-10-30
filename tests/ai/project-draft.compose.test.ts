/** Composition ("Ceritakan proyeknya"): dates and kind names are resolved by code from a scripted model answer. */
import { describe, expect, it } from 'bun:test';
import { composeProjectDraft } from '../../server/ai/project-draft.compose';
import type {
  ModelOutput,
  RawProjectPhase,
  RawProjectTask,
} from '../../server/ai/project-draft.schema';

const WED = '2026-10-07'; // the fixed "today": the machine clock is never read

const rawTask = (over: Partial<RawProjectTask> = {}): RawProjectTask => ({
  title: 'T',
  description: null,
  priority: null,
  kindName: null,
  due: null,
  ...over,
});
const rawPhase = (over: Partial<RawProjectPhase> = {}): RawProjectPhase => ({
  name: 'P',
  description: null,
  startDate: null,
  endDate: null,
  tasks: [],
  ...over,
});
const out = (over: Partial<ModelOutput> = {}): ModelOutput => ({
  name: 'Renovasi Dapur',
  description: null,
  startDate: null,
  dueDate: null,
  priority: null,
  phases: [],
  looseTasks: [],
  question: null,
  ...over,
});

describe('composeProjectDraft', () => {
  it('resolves project, phase and task dates against "today"', () => {
    const res = composeProjectDraft(
      out({
        startDate: { kind: 'offset', days: 0 },
        dueDate: { kind: 'offset', days: 30 },
        phases: [
          rawPhase({
            name: 'Beli material',
            startDate: { kind: 'offset', days: 0 },
            endDate: { kind: 'offset', days: 7 },
            tasks: [rawTask({ title: 'Beli cat', due: { kind: 'offset', days: 2 } })],
          }),
        ],
        looseTasks: [
          rawTask({
            title: 'Rapat kickoff',
            due: { kind: 'weekday', weekday: 'fri', next: false },
          }),
        ],
      }),
      { today: WED },
    );
    expect(res.question).toBeNull();
    expect(res.draft).toMatchObject({
      name: 'Renovasi Dapur',
      startDate: '2026-10-07',
      dueDate: '2026-11-06',
    });
    expect(res.draft?.phases).toEqual([
      {
        name: 'Beli material',
        description: null,
        startDate: '2026-10-07',
        endDate: '2026-10-14',
        tasks: [
          {
            title: 'Beli cat',
            description: null,
            priority: null,
            kindName: null,
            dueDate: '2026-10-09',
          },
        ],
      },
    ]);
    expect(res.draft?.looseTasks).toEqual([
      {
        title: 'Rapat kickoff',
        description: null,
        priority: null,
        kindName: null,
        dueDate: '2026-10-09',
      },
    ]);
  });

  it('matches a kind name case-insensitively to DEFAULT_TASK_KINDS and returns its canonical name', () => {
    const res = composeProjectDraft(
      out({ looseTasks: [rawTask({ kindName: 'bug' }), rawTask({ kindName: 'Epic' })] }),
      { today: WED },
    );
    expect(res.draft?.looseTasks[0]?.kindName).toBe('Bug');
    expect(res.draft?.looseTasks[1]?.kindName).toBeNull(); // not one of DEFAULT_TASK_KINDS
  });

  it('a name of null yields no draft and passes the question through', () => {
    expect(
      composeProjectDraft(out({ name: null, question: 'Proyek apa?' }), { today: WED }),
    ).toEqual({
      draft: null,
      question: 'Proyek apa?',
    });
  });

  it('a draft never carries a question, even if the model somehow sent one', () => {
    const res = composeProjectDraft(out({ question: 'diabaikan' }), { today: WED });
    expect(res.draft).not.toBeNull();
    expect(res.question).toBeNull();
  });

  it('an out-of-range date becomes null', () => {
    const res = composeProjectDraft(out({ dueDate: { kind: 'date', iso: '2026-02-30' } }), {
      today: WED,
    });
    expect(res.draft?.dueDate).toBeNull();
  });
});
