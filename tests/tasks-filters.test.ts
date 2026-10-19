import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_TASK_FILTERS,
  hasTaskFilters,
  isGroupedView,
  PERSON_ME,
  parseTaskFilters,
  TASK_NARROWING_PARAMS,
  type TaskFilters,
  taskFiltersToParams,
  toTaskQuery,
} from '../app/lib/tasks-filters';
import { mergeFilterParams } from '../app/lib/use-url-filters';
import { TASK_SEARCH_MAX } from '../server/task/task.limits';

const parse = (qs: string) => parseTaskFilters(new URLSearchParams(qs));
const ME = 'user-me'; // test-only
const ctx = { viewerId: ME };

describe('parseTaskFilters', () => {
  it('reads an empty URL as the defaults', () => {
    expect(parse('')).toEqual(DEFAULT_TASK_FILTERS);
  });

  it('reads every Indonesian key and value', () => {
    expect(
      parse(
        'lingkup=semua&proyek=p-1&orang=u-2&prioritas=tinggi,kritis&status=dikerjakan&tenggat=minggu-ini&urut=prioritas&q=Cat',
      ),
    ).toEqual({
      lingkup: 'semua',
      proyek: 'p-1',
      orang: 'u-2',
      prioritas: ['tinggi', 'kritis'],
      status: 'dikerjakan',
      tenggat: 'minggu-ini',
      urut: 'prioritas',
      q: 'Cat',
    });
  });

  it.each([
    ['lingkup=everything', { lingkup: 'saya' }],
    ['lingkup=project', { lingkup: 'saya' }],
    ['status=done', { status: 'aktif' }],
    ['status=SELESAI', { status: 'aktif' }],
    ['tenggat=kemarin', { tenggat: null }],
    ['tenggat=constructor', { tenggat: null }],
    // A finished or canceled task has no schedule group, so the filter would only empty the list.
    ['status=selesai&tenggat=terlambat', { status: 'selesai', tenggat: null }],
    ['status=dibatalkan&tenggat=besok', { status: 'dibatalkan', tenggat: null }],
    ['urut=due', { urut: 'tenggat' }],
    ['prioritas=high', { prioritas: [] }],
    ['prioritas=tinggi,urgent', { prioritas: ['tinggi'] }],
    ['prioritas=constructor', { prioritas: [] }],
    ['proyek=%20', { proyek: null }],
    ['orang=', { orang: null }],
    ['q=%20%20', { q: '' }],
  ])('falls back to the default for the unknown value in %s', (qs, expected) => {
    expect(parse(qs)).toEqual({ ...DEFAULT_TASK_FILTERS, ...expected } as TaskFilters);
  });

  it('cuts a long search to the server limit instead of letting the API reject it', () => {
    expect(parse(`q=${'a'.repeat(TASK_SEARCH_MAX + 50)}`).q).toHaveLength(TASK_SEARCH_MAX);
  });

  it('keeps orang=saya as a word, so a shared link means the reader', () => {
    expect(parse('lingkup=semua&orang=saya').orang).toBe(PERSON_ME);
  });

  it.each(['belum', 'dikerjakan'])('reads the single-status chip status=%s', (slug) => {
    expect(parse(`status=${slug}&tenggat=terlambat`)).toMatchObject({
      status: slug,
      tenggat: 'terlambat',
    });
  });
});

describe('round trip URL ⇄ filters', () => {
  const cases: TaskFilters[] = [
    DEFAULT_TASK_FILTERS,
    { ...DEFAULT_TASK_FILTERS, lingkup: 'semua', status: 'dibatalkan', urut: 'terbaru' },
    {
      lingkup: 'semua',
      proyek: 'p-9',
      orang: PERSON_ME,
      prioritas: ['rendah', 'sedang'],
      status: 'selesai',
      tenggat: null,
      urut: 'dibuat',
      q: 'pasang keramik',
    },
    { ...DEFAULT_TASK_FILTERS, lingkup: 'semua', status: 'belum', tenggat: 'terlambat' },
  ];
  it.each(cases.map((c, i) => [i, c] as const))('case %d survives the URL', (_i, f) => {
    expect(parseTaskFilters(taskFiltersToParams(f))).toEqual(f);
  });

  it('writes nothing for the defaults', () => {
    expect(taskFiltersToParams(DEFAULT_TASK_FILTERS).toString()).toBe('');
  });
});

describe('toTaskQuery', () => {
  it('maps the defaults to my open tasks by due date', () => {
    expect(toTaskQuery(DEFAULT_TASK_FILTERS, ctx)).toEqual({
      scope: 'mine',
      status: ['todo', 'in_progress', 'in_review'],
      sort: 'due',
      limit: 30,
    });
  });

  it('maps every filter to the API parameter names', () => {
    const f = parse(
      'lingkup=semua&proyek=p-1&orang=u-2&prioritas=kritis&status=selesai&q=%20Cat%20',
    );
    expect(toTaskQuery(f, { ...ctx, limit: 10 })).toEqual({
      scope: 'all',
      projectId: 'p-1',
      assigneeId: 'u-2',
      status: ['done'],
      priority: ['critical'],
      q: 'Cat',
      sort: 'due',
      limit: 10,
    });
  });

  it('turns orang=saya into the viewer id', () => {
    expect(toTaskQuery(parse('lingkup=semua&orang=saya'), ctx).assigneeId).toBe(ME);
  });

  it.each([
    ['belum', ['todo']],
    ['dikerjakan', ['in_progress']],
  ])('maps the status chip %s to exactly that status', (slug, status) => {
    expect(toTaskQuery(parse(`status=${slug}`), ctx).status).toEqual(status as never);
  });

  it.each([
    ['terlambat', 'overdue'],
    ['hari-ini', 'today'],
    ['besok', 'tomorrow'],
    ['minggu-ini', 'week'],
    ['nanti', 'later'],
    ['tanpa-tenggat', 'none'],
  ])('maps tenggat=%s to the schedule group %s', (slug, due) => {
    expect(toTaskQuery(parse(`lingkup=semua&tenggat=${slug}`), ctx).due).toBe(due as never);
  });

  it('sends no due group when there is no tenggat filter', () => {
    expect('due' in toTaskQuery(DEFAULT_TASK_FILTERS, ctx)).toBe(false);
  });

  it('ignores a stale orang in "Tugas saya", where every task is already mine', () => {
    expect(toTaskQuery(parse('orang=u-2'), ctx).assigneeId).toBeUndefined();
    expect(toTaskQuery(parse('orang=u-2'), { ...ctx, lockedProjectId: 'p-1' }).assigneeId).toBe(
      'u-2',
    );
  });

  it('pins a project tab to its project, whatever the URL says', () => {
    const q = toTaskQuery(parse('lingkup=semua&proyek=other'), { ...ctx, lockedProjectId: 'p-7' });
    expect(q.scope).toBe('project');
    expect(q.projectId).toBe('p-7');
  });

  it.each([
    ['terbaru', 'updated'],
    ['dibuat', 'created'],
    ['prioritas', 'priority'],
  ])('sorts urut=%s as %s', (slug, sort) => {
    expect(toTaskQuery(parse(`urut=${slug}`), ctx).sort).toBe(sort as never);
  });
});

describe('hasTaskFilters and grouping', () => {
  it('is false for the defaults and for a sort change', () => {
    expect(hasTaskFilters(DEFAULT_TASK_FILTERS)).toBe(false);
    expect(hasTaskFilters(parse('urut=terbaru&lingkup=semua'))).toBe(false);
  });

  it.each([
    'status=selesai',
    'status=belum',
    'tenggat=terlambat',
    'proyek=p-1',
    'lingkup=semua&orang=saya',
    'prioritas=tinggi',
    'q=x',
  ])(
    'is true for %s',
    (qs) => {
      expect(hasTaskFilters(parse(qs))).toBe(true);
    },
  );

  it('does not count an orang that "Tugas saya" ignores, but does on a project tab', () => {
    expect(hasTaskFilters(parse('orang=u-2'))).toBe(false);
    expect(hasTaskFilters(parse('orang=u-2'), { lockedProjectId: 'p-1' })).toBe(true);
  });

  it('ignores the project param on a project tab, where it is locked', () => {
    expect(hasTaskFilters(parse('proyek=p-1'), { lockedProjectId: 'p-1' })).toBe(false);
  });

  it('clearing the narrowing params leaves no filter but keeps scope and sort', () => {
    const sp = new URLSearchParams(
      'lingkup=semua&urut=terbaru&status=belum&tenggat=besok&orang=saya&q=x',
    );
    const cleared = parseTaskFilters(
      mergeFilterParams(sp, Object.fromEntries(TASK_NARROWING_PARAMS.map((k) => [k, null]))),
    );
    expect(hasTaskFilters(cleared)).toBe(false);
    expect(cleared.lingkup).toBe('semua');
    expect(cleared.urut).toBe('terbaru');
  });

  it('groups only my open tasks outside a project tab', () => {
    expect(isGroupedView(DEFAULT_TASK_FILTERS)).toBe(true);
    expect(isGroupedView(parse('lingkup=semua'))).toBe(false);
    expect(isGroupedView(parse('status=selesai'))).toBe(false);
    expect(isGroupedView(parse('status=belum'))).toBe(false);
    // One due date is one group, shown as a flat list.
    expect(isGroupedView(parse('tenggat=terlambat'))).toBe(false);
    expect(isGroupedView(DEFAULT_TASK_FILTERS, { lockedProjectId: 'p-1' })).toBe(false);
  });
});
