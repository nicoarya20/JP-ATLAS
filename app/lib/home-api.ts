/**
 * Client for `GET /api/app/home` through Eden: the one call behind the Beranda, its react-query key
 * and the hook that seeds from the SSR loader. The loader and the API share `getHome`, so the data
 * has one shape; `loadedAt` lets a later visit replace an older cache instead of showing it.
 */
import type { HomeData } from '@server/home/home.dto';
import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { client } from './eden';
import { unwrap } from './projects-api';

export type { HomeData };

/** React-query key; invalidate it after a write that changes what the Beranda counts. */
export const homeKeys = { all: ['home'] as const };

/** What the loader hands the page: the data and the moment it was read. */
export type HomeSeed = { data: HomeData; loadedAt: number };

export async function fetchHome(): Promise<HomeData> {
  return unwrap(await client.api.app.home.get()) as HomeData;
}

/** Puts the loader's copy in the cache unless the cache already holds something newer. */
export function seedHome(queryClient: QueryClient, seed: HomeSeed): void {
  const cached = queryClient.getQueryState(homeKeys.all)?.dataUpdatedAt ?? 0;
  if (cached < seed.loadedAt) {
    queryClient.setQueryData(homeKeys.all, seed.data, { updatedAt: seed.loadedAt });
  }
}

/**
 * The Beranda data. It starts from the loader's copy, and every later visit re-seeds from the newer
 * loader result, so coming back from another page never shows what was read before. Focus, a mutation or
 * the "Coba lagi" button refetch through the same key.
 */
export function useHome(seed: HomeSeed) {
  const queryClient = useQueryClient();
  useEffect(() => seedHome(queryClient, seed), [queryClient, seed]);
  return useQuery({
    queryKey: homeKeys.all,
    queryFn: fetchHome,
    initialData: seed.data,
    initialDataUpdatedAt: seed.loadedAt,
    refetchOnWindowFocus: true,
  });
}
