/** Team list filters: URL parsing, defaults left out of the address, query for the API. */
import { describe, expect, it } from 'bun:test';
import {
  allowSort,
  clearTeamFiltersHref,
  DEFAULT_TEAM_FILTERS,
  hasTeamFilters,
  parseTeamFilters,
  TEAM_PAGE_SIZE,
  TEAM_SEARCH_MAX,
  teamFiltersToParams,
  toTeamQuery,
} from '../app/lib/team-filters';

const parse = (qs: string) => parseTeamFilters(new URLSearchParams(qs));

describe('parseTeamFilters', () => {
  it('gives the defaults for a clean address', () => {
    expect(parse('')).toEqual(DEFAULT_TEAM_FILTERS);
  });

  it('reads project, search and sort', () => {
    expect(parse('proyek=p1&q=%20budi%20&urut=aktif')).toEqual({
      proyek: 'p1',
      q: 'budi',
      urut: 'aktif',
    });
  });

  it('falls back to name order for an unknown sort and cuts a too-long search', () => {
    expect(parse('urut=terlambat').urut).toBe('nama');
    expect(parse('urut=overdue').urut).toBe('nama');
    expect(parse(`q=${'a'.repeat(TEAM_SEARCH_MAX + 20)}`).q).toHaveLength(TEAM_SEARCH_MAX);
  });
});

describe('teamFiltersToParams', () => {
  it('leaves defaults out of the address', () => {
    expect(teamFiltersToParams(DEFAULT_TEAM_FILTERS).toString()).toBe('');
    expect(teamFiltersToParams({ proyek: 'p1', q: ' ', urut: 'nama' }).toString()).toBe(
      'proyek=p1',
    );
  });

  it('round-trips a full filter set', () => {
    const f = { proyek: 'p1', q: 'sari', urut: 'aktif' } as const;
    expect(parseTeamFilters(teamFiltersToParams(f))).toEqual(f);
  });
});

describe('toTeamQuery', () => {
  it('maps the Indonesian sort words to the API sort and omits empty fields', () => {
    expect(toTeamQuery(DEFAULT_TEAM_FILTERS)).toEqual({ sort: 'name', limit: TEAM_PAGE_SIZE });
    expect(toTeamQuery({ proyek: 'p1', q: ' sari ', urut: 'aktif' })).toEqual({
      projectId: 'p1',
      q: 'sari',
      sort: 'active',
      limit: TEAM_PAGE_SIZE,
    });
  });
});

describe('stale sort and clearing', () => {
  it('drops urut=aktif for someone who may not sort by load, and keeps it for others', () => {
    const f = { proyek: 'p1', q: '', urut: 'aktif' } as const;
    expect(allowSort(f, false).urut).toBe('nama');
    expect(allowSort(f, true)).toBe(f);
    expect(allowSort(DEFAULT_TEAM_FILTERS, false)).toBe(DEFAULT_TEAM_FILTERS);
  });

  it('knows when a project or search narrows the list', () => {
    expect(hasTeamFilters(DEFAULT_TEAM_FILTERS)).toBe(false);
    expect(hasTeamFilters({ ...DEFAULT_TEAM_FILTERS, proyek: 'p1' })).toBe(true);
    expect(hasTeamFilters({ ...DEFAULT_TEAM_FILTERS, q: 'x' })).toBe(true);
  });

  it('clears project and search but keeps the sort', () => {
    expect(clearTeamFiltersHref({ proyek: 'p1', q: 'x', urut: 'nama' })).toBe('/app/team');
    expect(clearTeamFiltersHref({ proyek: 'p1', q: 'x', urut: 'aktif' })).toBe(
      '/app/team?urut=aktif',
    );
  });
});
