/** Generic list-filter state kept in the URL; domain parsers (`<domain>-filters.ts`) plug in `parse`. */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/** Query key for the current page; any filter change resets it so results never land on a stale page. */
export const PAGE_PARAM = 'hal';

export type FilterValue = string | number | boolean | readonly string[] | null | undefined;
/** Keys are URL parameter names. null/undefined/''/false/[] remove the key. */
export type FilterPatch = Record<string, FilterValue>;

function serialize(value: FilterValue): string | null {
  if (value === null || value === undefined || value === false) return null;
  if (value === true) return '1';
  if (Array.isArray(value)) return value.length > 0 ? value.join(',') : null;
  const text = String(value).trim();
  return text === '' ? null : text;
}

/** Applies `patch` to a copy of `current`; the page resets unless the patch sets the page itself. */
export function mergeFilterParams(
  current: URLSearchParams,
  patch: FilterPatch,
  pageParam: string = PAGE_PARAM,
): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    const text = serialize(value);
    if (text === null) next.delete(key);
    else next.set(key, text);
  }
  if (!(pageParam in patch)) next.delete(pageParam);
  return next;
}

/** String param, trimmed; `fallback` when absent or blank. */
export function readString(sp: URLSearchParams, key: string, fallback = ''): string {
  const v = sp.get(key)?.trim();
  return v ? v : fallback;
}

/** Param that must be one of `allowed`; anything else (typo, old link) falls back instead of reaching the API. */
export function readEnum<T extends string>(
  sp: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const v = sp.get(key);
  return allowed.find((a) => a === v) ?? fallback;
}

/** Integer param clamped to [min, max]; non-numeric input falls back. */
export function readInt(
  sp: URLSearchParams,
  key: string,
  opts: { fallback: number; min?: number; max?: number },
): number {
  const raw = sp.get(key);
  const n = raw !== null && /^-?\d+$/.test(raw.trim()) ? Number(raw) : Number.NaN;
  if (!Number.isFinite(n)) return opts.fallback;
  return Math.min(
    opts.max ?? Number.POSITIVE_INFINITY,
    Math.max(opts.min ?? Number.NEGATIVE_INFINITY, n),
  );
}

/** Comma-separated param as a list without blanks or duplicates. */
export function readList(sp: URLSearchParams, key: string): string[] {
  const parts = (sp.get(key) ?? '').split(',').map((p) => p.trim());
  return [...new Set(parts.filter(Boolean))];
}

/** How many of `keys` are set in the URL; feeds the "Filter (N)" badge. */
export function countActiveParams(sp: URLSearchParams, keys: readonly string[]): number {
  return keys.filter((k) => serialize(sp.get(k)) !== null).length;
}

/**
 * Reads filters from the URL through `parse` and writes changes back with `replace`, so typing in a
 * search box does not fill the back-button history. Pair it with `shouldRevalidate` on the route.
 */
export function useUrlFilters<T>(parse: (sp: URLSearchParams) => T) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parse(searchParams), [parse, searchParams]);
  const setFilters = useCallback(
    (patch: FilterPatch) =>
      setSearchParams(mergeFilterParams(searchParams, patch), { replace: true }),
    [searchParams, setSearchParams],
  );
  /** Clears `keys` (and the page); other params of the URL stay. */
  const resetFilters = useCallback(
    (keys: readonly string[]) =>
      setFilters(Object.fromEntries(keys.map((k) => [k, null] as const))),
    [setFilters],
  );
  return { filters, searchParams, setFilters, resetFilters };
}
