/**
 * Client for `GET /api/admin/overview` through Eden: the one call behind the Admin Beranda, its
 * react-query key and the hook that seeds from the SSR loader. The loader and the API share
 * `getOverview`, so the data has one shape; `loadedAt` lets a later visit replace an older cache.
 *
 * Mirrors `app/lib/home-api.ts` (the Beranda produk) — same seed-from-loader, refetch-on-focus,
 * one-key-for-all-widgets contract. The "Coba lagi" button on a failed widget refetches this key.
 */
import type { OverviewData } from '@server/admin/overview/overview.dto';
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { client } from './eden';
import { unwrap } from './projects-api';

export type { OverviewData };

/** React-query key; invalidate it after an admin write that changes what the Beranda counts. */
export const adminOverviewKeys = { all: ['admin-overview'] as const };

/** What the loader hands the page: the data and the moment it was read. */
export type OverviewSeed = { data: OverviewData; loadedAt: number };

export async function fetchOverview(): Promise<OverviewData> {
  return unwrap(await client.api.admin.overview.get()) as OverviewData;
}

/** Puts the loader's copy in the cache unless the cache already holds something newer. */
export function seedOverview(queryClient: QueryClient, seed: OverviewSeed): void {
  const cached = queryClient.getQueryState(adminOverviewKeys.all)?.dataUpdatedAt ?? 0;
  if (cached < seed.loadedAt) {
    queryClient.setQueryData(adminOverviewKeys.all, seed.data, { updatedAt: seed.loadedAt });
  }
}

/**
 * The Admin Beranda data. It starts from the loader's copy and re-seeds from the newer loader result
 * on every visit, so returning from another page never shows a stale screen. Focus or the "Coba lagi"
 * button refetch through the same key.
 */
export function useOverview(seed: OverviewSeed) {
  const queryClient = useQueryClient();
  useEffect(() => seedOverview(queryClient, seed), [queryClient, seed]);
  return useQuery({
    queryKey: adminOverviewKeys.all,
    queryFn: fetchOverview,
    initialData: seed.data,
    initialDataUpdatedAt: seed.loadedAt,
    refetchOnWindowFocus: true,
  });
}
