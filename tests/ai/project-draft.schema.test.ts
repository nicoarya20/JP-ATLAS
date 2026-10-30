/** Model output validation ("Ceritakan proyeknya"): the answer is untrusted, shape errors reject it. */
import { describe, expect, it } from 'bun:test';
import { parseModelOutput } from '../../server/ai/project-draft.schema';
import { PHASE_NAME_MAX, PROJECT_NAME_MAX } from '../../server/project/project.limits';
import { TASK_TITLE_MAX } from '../../server/task/task.limits';

const task = (over: Record<string, unknown> = {}) => ({
  title: 'Beli material',
  description: null,
  priority: null,
  kindName: null,
  due: null,
  ...over,
});
const phase = (over: Record<string, unknown> = {}) => ({
  name: 'Persiapan',
  description: null,
  startDate: null,
  endDate: null,
  tasks: [],
  ...over,
});
const answer = (over: Record<string, unknown> = {}) => ({
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

describe('parseModelOutput', () => {
  it('accepts a well-formed answer with a phase and a loose task', () => {
    const out = parseModelOutput(
      answer({
        priority: 'high',
        phases: [phase({ tasks: [task()] })],
        looseTasks: [task({ title: 'Pasang listrik' })],
      }),
    );
    expect(out).toEqual({
      name: 'Renovasi Dapur',
      description: null,
      startDate: null,
      dueDate: null,
      priority: 'high',
      phases: [
        {
          name: 'Persiapan',
          description: null,
          startDate: null,
          endDate: null,
          tasks: [
            {
              title: 'Beli material',
              description: null,
              priority: null,
              kindName: null,
              due: null,
            },
          ],
        },
      ],
      looseTasks: [
        { title: 'Pasang listrik', description: null, priority: null, kindName: null, due: null },
      ],
      question: null,
    });
  });

  it('drops unknown fields at every level', () => {
    const out = parseModelOutput({
      ...answer(),
      id: 'x',
      phases: [{ ...phase(), evil: 1, tasks: [{ ...task(), status: 'done' }] }],
    });
    expect(out).not.toBeNull();
    expect(Object.keys(out ?? {}).sort()).toEqual(
      [
        'name',
        'description',
        'startDate',
        'dueDate',
        'priority',
        'phases',
        'looseTasks',
        'question',
      ].sort(),
    );
    expect(Object.keys(out?.phases[0] ?? {}).sort()).toEqual(
      ['name', 'description', 'startDate', 'endDate', 'tasks'].sort(),
    );
    expect(Object.keys(out?.phases[0]?.tasks[0] ?? {}).sort()).toEqual(
      ['title', 'description', 'priority', 'kindName', 'due'].sort(),
    );
  });

  it.each([
    ['null', null],
    ['a string', 'hello'],
    ['an array', []],
    ['no phases key', { ...answer(), phases: undefined }],
    ['phases not an array', { ...answer(), phases: 'x' }],
    ['looseTasks not an array', { ...answer(), looseTasks: 'x' }],
    ['a phase that is not an object', { ...answer(), phases: ['x'] }],
    ['an untitled phase', { ...answer(), phases: [phase({ name: '   ' })] }],
    ['an untitled task', { ...answer(), looseTasks: [task({ title: '  ' })] }],
    ['neither a name nor a question', { ...answer(), name: null, question: null }],
    ['more phases than allowed', { ...answer(), phases: Array.from({ length: 7 }, () => phase()) }],
  ])('rejects %s', (_label, raw) => {
    expect(parseModelOutput(raw)).toBeNull();
  });

  it('accepts exactly the maximum number of phases', () => {
    const raw = answer({ phases: Array.from({ length: 6 }, () => phase()) });
    expect(parseModelOutput(raw)?.phases).toHaveLength(6);
  });

  it('rejects when the total task count (phases + loose) exceeds the limit, not either list alone', () => {
    const over = answer({
      phases: [phase({ tasks: Array.from({ length: 15 }, () => task()) })],
      looseTasks: Array.from({ length: 6 }, () => task()),
    });
    expect(parseModelOutput(over)).toBeNull();
    const exact = answer({
      phases: [phase({ tasks: Array.from({ length: 15 }, () => task()) })],
      looseTasks: Array.from({ length: 5 }, () => task()),
    });
    const out = parseModelOutput(exact);
    expect(out?.phases[0]?.tasks).toHaveLength(15);
    expect(out?.looseTasks).toHaveLength(5);
  });

  it('allows a null name together with a question (nothing to draft)', () => {
    expect(parseModelOutput(answer({ name: null, question: 'Proyek apa maksudnya?' }))).toEqual({
      name: null,
      description: null,
      startDate: null,
      dueDate: null,
      priority: null,
      phases: [],
      looseTasks: [],
      question: 'Proyek apa maksudnya?',
    });
  });

  it('turns values outside the app vocabulary into null', () => {
    const out = parseModelOutput(
      answer({
        priority: 'urgent!!',
        startDate: { kind: 'tomorrow' },
        phases: [phase({ tasks: [task({ priority: 'urgent!!', kindName: 123 })] })],
      }),
    );
    expect(out).toMatchObject({ priority: null, startDate: null });
    expect(out?.phases[0]?.tasks[0]).toMatchObject({ priority: null, kindName: null });
  });

  it('cuts long text to the project/phase/task limits', () => {
    const out = parseModelOutput(
      answer({
        name: 'a'.repeat(PROJECT_NAME_MAX + 50),
        phases: [
          phase({
            name: 'b'.repeat(PHASE_NAME_MAX + 50),
            tasks: [task({ title: 'c'.repeat(TASK_TITLE_MAX + 50) })],
          }),
        ],
      }),
    );
    expect(out?.name).toHaveLength(PROJECT_NAME_MAX);
    expect(out?.phases[0]?.name).toHaveLength(PHASE_NAME_MAX);
    expect(out?.phases[0]?.tasks[0]?.title).toHaveLength(TASK_TITLE_MAX);
  });

  it('collapses line breaks in names and titles into one line', () => {
    const out = parseModelOutput(answer({ name: 'Renovasi\n\n  Dapur' }));
    expect(out?.name).toBe('Renovasi Dapur');
  });
});
