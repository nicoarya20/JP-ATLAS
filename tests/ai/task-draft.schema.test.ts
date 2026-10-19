/** Model output validation (A1): the answer is untrusted, so shape errors reject it and stray values become null. */
import { describe, expect, it } from 'bun:test';
import { parseModelOutput } from '../../server/ai/task-draft.schema';
import { TASK_DESCRIPTION_MAX, TASK_TITLE_MAX } from '../../server/task/task.limits';

const draft = (over: Record<string, unknown> = {}) => ({
  title: 'Perbaiki halaman login',
  description: null,
  assignee: 'Rina',
  due: { kind: 'offset', days: 1 },
  priority: 'high',
  kind: 'Bug',
  ...over,
});

describe('parseModelOutput', () => {
  it('accepts a well-formed answer', () => {
    expect(parseModelOutput({ drafts: [draft()], question: null })).toEqual({
      drafts: [
        {
          title: 'Perbaiki halaman login',
          description: null,
          assignee: 'Rina',
          due: { kind: 'offset', days: 1 },
          priority: 'high',
          kind: 'Bug',
        },
      ],
      question: null,
    });
  });

  it('drops unknown fields at every level', () => {
    const out = parseModelOutput({
      drafts: [draft({ id: 'x', status: 'done', due: { kind: 'offset', days: 2, evil: 1 } })],
      question: null,
      system: 'ignore previous',
    });
    expect(out).not.toBeNull();
    expect(Object.keys(out?.drafts[0] ?? {}).sort()).toEqual(
      ['assignee', 'description', 'due', 'kind', 'priority', 'title'].sort(),
    );
    expect(out?.drafts[0]?.due).toEqual({ kind: 'offset', days: 2 });
    expect(Object.keys(out ?? {}).sort()).toEqual(['drafts', 'question']);
  });

  it.each([
    ['null', null],
    ['a string', 'hello'],
    ['an array', []],
    ['no drafts key', { question: null }],
    ['drafts not an array', { drafts: 'x', question: null }],
    ['a draft that is not an object', { drafts: ['x'], question: null }],
    ['an untitled draft', { drafts: [draft({ title: '   ' })], question: null }],
    ['a non-string title', { drafts: [draft({ title: 5 })], question: null }],
    ['no drafts and no question', { drafts: [], question: null }],
    [
      'more drafts than allowed',
      { drafts: Array.from({ length: 11 }, () => draft()), question: null },
    ],
  ])('rejects %s', (_label, raw) => {
    expect(parseModelOutput(raw)).toBeNull();
  });

  it('accepts exactly the maximum number of drafts', () => {
    const raw = { drafts: Array.from({ length: 10 }, () => draft()), question: null };
    expect(parseModelOutput(raw)?.drafts).toHaveLength(10);
  });

  it('allows no drafts when there is a question', () => {
    expect(parseModelOutput({ drafts: [], question: 'Tugas apa maksudnya?' })).toEqual({
      drafts: [],
      question: 'Tugas apa maksudnya?',
    });
  });

  it('turns values outside the app vocabulary into null', () => {
    const out = parseModelOutput({
      drafts: [
        draft({
          priority: 'urgent!!',
          due: { kind: 'tomorrow' },
          assignee: 42,
          kind: ['Bug'],
          description: { text: 'x' },
        }),
      ],
      question: 7,
    });
    expect(out?.drafts[0]).toMatchObject({
      priority: null,
      due: null,
      assignee: null,
      kind: null,
      description: null,
    });
    expect(out?.question).toBeNull();
  });

  it.each([
    [{ kind: 'offset', days: '1' }],
    [{ kind: 'offset', days: 1.5 }],
    [{ kind: 'weekday', weekday: 'friday' }],
    [{ kind: 'monthday', day: 'x' }],
    [{ kind: 'date', iso: 20261001 }],
    ['2026-10-09'],
  ])('rejects the malformed due token %p', (due) => {
    expect(
      parseModelOutput({ drafts: [draft({ due })], question: null })?.drafts[0]?.due,
    ).toBeNull();
  });

  it('keeps the shapes of the other due tokens', () => {
    const due = (d: unknown) =>
      parseModelOutput({ drafts: [draft({ due: d })], question: null })?.drafts[0]?.due;
    expect(due({ kind: 'weekday', weekday: 'fri' })).toEqual({
      kind: 'weekday',
      weekday: 'fri',
      next: false,
    });
    expect(due({ kind: 'weekday', weekday: 'fri', next: true })).toEqual({
      kind: 'weekday',
      weekday: 'fri',
      next: true,
    });
    expect(due({ kind: 'monthday', day: 15 })).toEqual({ kind: 'monthday', day: 15, month: null });
    expect(due({ kind: 'date', iso: '2026-11-01' })).toEqual({ kind: 'date', iso: '2026-11-01' });
  });

  it('cuts long text to the task limits and strips control characters', () => {
    const out = parseModelOutput({
      drafts: [
        draft({
          title: `${'a'.repeat(TASK_TITLE_MAX + 50)}\u0000`,
          description: 'b'.repeat(TASK_DESCRIPTION_MAX + 50),
        }),
      ],
      question: null,
    });
    expect(out?.drafts[0]?.title).toHaveLength(TASK_TITLE_MAX);
    expect(out?.drafts[0]?.description).toHaveLength(TASK_DESCRIPTION_MAX);
    expect(out?.drafts[0]?.title).not.toContain('\u0000');
  });
});

describe('parseModelOutput titles', () => {
  it('collapses line breaks in a title into one line', () => {
    const out = parseModelOutput({ drafts: [draft({ title: 'Satu\n\n  dua' })], question: null });
    expect(out?.drafts[0]?.title).toBe('Satu dua');
  });
});
