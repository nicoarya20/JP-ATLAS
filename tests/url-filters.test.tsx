import { describe, expect, it } from 'bun:test';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import {
  countActiveParams,
  mergeFilterParams,
  PAGE_PARAM,
  readEnum,
  readInt,
  readList,
  readString,
  useUrlFilters,
} from '../app/lib/use-url-filters';

const sp = (q: string) => new URLSearchParams(q);

describe('mergeFilterParams', () => {
  it('sets, replaces and removes keys while keeping unrelated params', () => {
    const next = mergeFilterParams(sp('status=aktif&q=logo&tab=ringkasan'), {
      status: 'selesai',
      q: '',
      peran: 'pm',
    });
    expect(next.get('status')).toBe('selesai');
    expect(next.has('q')).toBe(false);
    expect(next.get('peran')).toBe('pm');
    expect(next.get('tab')).toBe('ringkasan');
  });

  it('serialises lists, booleans and numbers; empty values drop the key', () => {
    const next = mergeFilterParams(sp('label=x&terlambat=1'), {
      label: ['a', 'b'],
      terlambat: false,
      hal: 3,
      arsip: true,
      kosong: [],
      nol: null,
      tak: undefined,
    });
    expect(next.get('label')).toBe('a,b');
    expect(next.has('terlambat')).toBe(false);
    expect(next.get('hal')).toBe('3');
    expect(next.get('arsip')).toBe('1');
    expect(next.has('kosong') || next.has('nol') || next.has('tak')).toBe(false);
  });

  it('resets the page on any filter change but honours an explicit page', () => {
    expect(mergeFilterParams(sp('hal=4&status=aktif'), { status: 'selesai' }).has(PAGE_PARAM)).toBe(
      false,
    );
    expect(mergeFilterParams(sp('hal=4'), { [PAGE_PARAM]: 5 }).get(PAGE_PARAM)).toBe('5');
  });

  it('does not mutate the params it was given', () => {
    const current = sp('status=aktif');
    mergeFilterParams(current, { status: 'selesai' });
    expect(current.get('status')).toBe('aktif');
  });
});

describe('readers for domain parsers', () => {
  it('readString trims and falls back on blank', () => {
    expect(readString(sp('q=%20logo%20'), 'q')).toBe('logo');
    expect(readString(sp('q=%20'), 'q', 'semua')).toBe('semua');
    expect(readString(sp(''), 'q')).toBe('');
  });

  it('readEnum accepts only listed values', () => {
    const allowed = ['baru', 'lama'] as const;
    expect(readEnum(sp('urut=lama'), 'urut', allowed, 'baru')).toBe('lama');
    expect(readEnum(sp('urut=asal'), 'urut', allowed, 'baru')).toBe('baru');
    expect(readEnum(sp(''), 'urut', allowed, 'baru')).toBe('baru');
  });

  it('readInt clamps and rejects non-numbers', () => {
    const o = { fallback: 1, min: 1, max: 50 };
    expect(readInt(sp('hal=7'), 'hal', o)).toBe(7);
    expect(readInt(sp('hal=0'), 'hal', o)).toBe(1);
    expect(readInt(sp('hal=999'), 'hal', o)).toBe(50);
    expect(readInt(sp('hal=abc'), 'hal', o)).toBe(1);
    expect(readInt(sp('hal=2.5'), 'hal', o)).toBe(1);
    expect(readInt(sp(''), 'hal', o)).toBe(1);
  });

  it('readList splits on commas without blanks or duplicates', () => {
    expect(readList(sp('label=a,b,,a, c '), 'label')).toEqual(['a', 'b', 'c']);
    expect(readList(sp(''), 'label')).toEqual([]);
  });

  it('countActiveParams counts only keys that carry a value', () => {
    expect(countActiveParams(sp('status=aktif&q=&peran=pm'), ['status', 'q', 'peran', 'x'])).toBe(
      2,
    );
  });
});

describe('useUrlFilters', () => {
  type F = { status: string; page: number };
  const parse = (p: URLSearchParams): F => ({
    status: readString(p, 'status', 'semua'),
    page: readInt(p, PAGE_PARAM, { fallback: 1, min: 1 }),
  });

  function Probe() {
    const { filters } = useUrlFilters(parse);
    return <p>{`${filters.status}|${filters.page}`}</p>;
  }

  it('hands the URL, parsed by the domain function, to the page', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/app/tugas?status=selesai&hal=3']}>
        <Probe />
      </MemoryRouter>,
    );
    expect(html).toContain('selesai|3');
  });

  it('falls back to defaults on a bare URL', () => {
    const html = renderToString(
      <MemoryRouter initialEntries={['/app/tugas']}>
        <Probe />
      </MemoryRouter>,
    );
    expect(html).toContain('semua|1');
  });
});
