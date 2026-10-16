import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_PROJECT_FILTERS,
  hasProjectFilters,
  PROJECT_SEARCH_MAX,
  type ProjectFilters,
  parseProjectFilters,
  projectFiltersToParams,
  toProjectQuery,
} from '../app/lib/projects-filters';

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
      hal: 3,
    });
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

describe('projectFiltersToParams', () => {
  it.each([
    '',
    'lingkup=semua',
    'status=ditunda',
    'urut=terbaru',
    'q=Renovasi',
    'hal=2',
    'lingkup=semua&status=selesai&urut=nama&q=Atlas&hal=4',
  ])('round-trips "%s"', (qs) => {
    const filters = parse(qs);
    expect(parseProjectFilters(projectFiltersToParams(filters))).toEqual(filters);
    expect(projectFiltersToParams(filters).toString()).toBe(new URLSearchParams(qs).toString());
  });

  it('leaves defaults out of the URL', () => {
    expect(projectFiltersToParams(DEFAULT_PROJECT_FILTERS).toString()).toBe('');
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
