import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_PROJECT_FILTERS,
  hasProjectFilters,
  PROJECT_PAGE_SIZE,
  PROJECT_SEARCH_MAX,
  type ProjectFilters,
  parseProjectFilters,
  projectFiltersToParams,
  toProjectQuery,
} from '../app/lib/projects-filters';
import { PAGE_LIMIT_MAX } from '../server/pm/limits';

const parse = (qs: string) => parseProjectFilters(new URLSearchParams(qs));

describe('parseProjectFilters', () => {
  it('reads an empty URL as the defaults', () => {
    expect(parse('')).toEqual(DEFAULT_PROJECT_FILTERS);
  });

  it('reads every Indonesian key and value', () => {
    expect(parse('lingkup=semua&status=berjalan&urut=nama&q=Dapur&hal=3')).toEqual({
      lingkup: 'semua',
      status: 'berjalan',
      urut: 'nama',
      q: 'Dapur',
      tampilan: 'list',
      perhatian: false,
      hal: 3,
    });
  });

  it.each([
    ['tampilan=grid', 'grid'],
    ['tampilan=gantt', 'gantt'],
    ['tampilan=list', 'list'],
    ['tampilan=kalender', 'list'],
    ['tampilan=GRID', 'list'],
    ['tampilan=', 'list'],
    ['', 'list'],
  ])('reads the view from "%s" as %s (unknown values fall back to list)', (qs, view) => {
    expect(parse(qs).tampilan).toBe(view as ProjectFilters['tampilan']);
  });

  it.each([
    ['lingkup=everything', { lingkup: 'saya' }],
    ['status=active', { status: null }],
    ['status=DRAF', { status: null }],
    ['urut=due', { urut: 'tenggat' }],
    ['hal=abc', { hal: 1 }],
    ['hal=0', { hal: 1 }],
    ['hal=-4', { hal: 1 }],
    ['q=%20%20', { q: '' }],
  ])('falls back to the default for the unknown value in %s', (qs, expected) => {
    expect(parse(qs)).toEqual({ ...DEFAULT_PROJECT_FILTERS, ...expected } as ProjectFilters);
  });

  it('keeps lingkup=semua for anyone; the server clamps a Member to "mine"', () => {
    expect(parse('lingkup=semua').lingkup).toBe('semua');
    expect(toProjectQuery(parse('lingkup=semua')).scope).toBe('all');
  });

  it('cuts a search longer than the server limit instead of sending it', () => {
    expect(parse(`q=${'a'.repeat(PROJECT_SEARCH_MAX + 20)}`).q).toHaveLength(PROJECT_SEARCH_MAX);
  });
});

describe('perhatian (Perlu perhatian)', () => {
  it('reads ?perhatian=1 as on and anything else as off', () => {
    expect(parse('perhatian=1').perhatian).toBe(true);
    expect(parse('').perhatian).toBe(false);
    for (const qs of [
      'perhatian=0',
      'perhatian=true',
      'perhatian=',
      'perhatian=ya',
      'perhatian=11',
    ]) {
      expect(parse(qs).perhatian).toBe(false);
    }
  });

  it('drops a status that comes with it, since attention already means running', () => {
    expect(parse('perhatian=1&status=selesai').status).toBeNull();
    expect(parse('perhatian=0&status=selesai').status).toBe('selesai');
    const both = { ...DEFAULT_PROJECT_FILTERS, perhatian: true, status: 'selesai' } as const;
    expect(projectFiltersToParams(both).toString()).toBe('perhatian=1');
  });

  it('writes nothing for the default and keeps the other filters', () => {
    expect(
      projectFiltersToParams({ ...DEFAULT_PROJECT_FILTERS, perhatian: false }).has('perhatian'),
    ).toBe(false);
    expect(projectFiltersToParams(parse('perhatian=1&lingkup=semua')).toString()).toBe(
      'lingkup=semua&perhatian=1',
    );
  });

  it('puts the flag in the API query, without a status', () => {
    expect(toProjectQuery(parse('perhatian=1'), 20)).toEqual({
      scope: 'mine',
      sort: 'due',
      perhatian: '1',
      page: 1,
      limit: 20,
    });
    expect(toProjectQuery(parse('perhatian=1&status=draf')).status).toBeUndefined();
    expect('perhatian' in toProjectQuery(parse(''))).toBe(false);
  });

  it('counts as an active filter, so an empty result offers to clear it', () => {
    expect(hasProjectFilters(parse('perhatian=1'))).toBe(true);
    expect(hasProjectFilters(parse('perhatian=0'))).toBe(false);
  });

  it('gives each combination its own cache key', () => {
    const key = (qs: string) => JSON.stringify(toProjectQuery(parse(qs)));
    expect(key('perhatian=1')).not.toBe(key(''));
    expect(key('perhatian=1&tampilan=gantt')).not.toBe(key('perhatian=1'));
  });
});

describe('projectFiltersToParams', () => {
  it.each([
    '',
    'lingkup=semua',
    'status=ditunda',
    'urut=terbaru',
    'q=Renovasi',
    'hal=2',
    'lingkup=semua&status=selesai&urut=nama&q=Atlas&hal=4',
    'status=berjalan&tampilan=gantt',
    'perhatian=1',
    'lingkup=semua&urut=nama&q=Atlas&tampilan=gantt&perhatian=1',
  ])('round-trips "%s"', (qs) => {
    const filters = parse(qs);
    expect(parseProjectFilters(projectFiltersToParams(filters))).toEqual(filters);
    expect(projectFiltersToParams(filters).toString()).toBe(new URLSearchParams(qs).toString());
  });

  it('leaves defaults out of the URL', () => {
    expect(projectFiltersToParams(DEFAULT_PROJECT_FILTERS).toString()).toBe('');
    expect(
      projectFiltersToParams({ ...DEFAULT_PROJECT_FILTERS, tampilan: 'list' }).toString(),
    ).toBe('');
  });

  it('keeps the view when only the view differs from the defaults', () => {
    expect(projectFiltersToParams(parse('tampilan=grid')).toString()).toBe('tampilan=grid');
  });
});

describe('toProjectQuery', () => {
  it('maps the defaults to the API query', () => {
    expect(toProjectQuery(DEFAULT_PROJECT_FILTERS, 20)).toEqual({
      scope: 'mine',
      sort: 'due',
      page: 1,
      limit: 20,
    });
  });

  it.each([
    ['draf', 'draft'],
    ['berjalan', 'active'],
    ['ditunda', 'on_hold'],
    ['selesai', 'completed'],
    ['dibatalkan', 'canceled'],
  ] as const)('maps status=%s to %s', (slug, status) => {
    expect(toProjectQuery(parse(`status=${slug}`)).status).toBe(status);
  });

  it('asks for the biggest server page in the timeline and the normal page elsewhere', () => {
    expect(toProjectQuery(parse('')).limit).toBe(PROJECT_PAGE_SIZE);
    expect(toProjectQuery(parse('tampilan=grid')).limit).toBe(PROJECT_PAGE_SIZE);
    expect(toProjectQuery(parse('tampilan=gantt')).limit).toBe(PAGE_LIMIT_MAX);
    // An explicit limit still wins (the cache seed compares the very same query).
    expect(toProjectQuery(parse('tampilan=gantt'), 10).limit).toBe(10);
  });

  it('does not put the view itself in the API query; only the timeline asks for the plan', () => {
    expect(Object.keys(toProjectQuery(parse('tampilan=grid'))).sort()).toEqual([
      'limit',
      'page',
      'scope',
      'sort',
    ]);
    expect(Object.keys(toProjectQuery(parse('tampilan=gantt'))).sort()).toEqual([
      'limit',
      'page',
      'rencana',
      'scope',
      'sort',
    ]);
    expect(toProjectQuery(parse('tampilan=gantt')).rencana).toBe('1');
    expect(toProjectQuery(parse('')).rencana).toBeUndefined();
  });

  it('maps sort, search and page', () => {
    expect(toProjectQuery(parse('urut=terbaru&q=%20Atlas%20&hal=2'), 10)).toEqual({
      scope: 'mine',
      sort: 'recent',
      q: 'Atlas',
      page: 2,
      limit: 10,
    });
  });
});

describe('hasProjectFilters', () => {
  it('is true only when status or search narrows the list', () => {
    expect(hasProjectFilters(DEFAULT_PROJECT_FILTERS)).toBe(false);
    expect(hasProjectFilters(parse('lingkup=semua&urut=nama'))).toBe(false);
    expect(hasProjectFilters(parse('status=draf'))).toBe(true);
    expect(hasProjectFilters(parse('q=atlas'))).toBe(true);
  });
});
