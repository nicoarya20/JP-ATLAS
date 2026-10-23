/**
 * PRJ-02: the project header is fed by the layout loader, which React Router does not re-run by
 * itself. These tests pin the mechanism (only `revalidate()` re-runs a parent loader), the refresh
 * helper that calls it, and the two action hooks that were still refreshing the cache alone.
 */
import { describe, expect, it } from 'bun:test';
import { createMemoryRouter } from 'react-router';
import { refreshProject } from '../../app/components/projects/summary/useRefreshProject';
import { projectKeys } from '../../app/lib/projects-api';

const source = (path: string) => Bun.file(new URL(path, import.meta.url)).text();

describe('what re-runs a parent (layout) loader', () => {
  it('a child navigation does not, but revalidate() does', async () => {
    let layoutLoads = 0;
    const router = createMemoryRouter(
      [
        {
          path: '/p/:id',
          loader: () => {
            layoutLoads += 1;
            return { name: `nama-${layoutLoads}` };
          },
          children: [
            { index: true, loader: () => ({ tab: 'ringkasan' }) },
            { path: 'phases', loader: () => ({ tab: 'tahapan' }) },
          ],
        },
      ],
      { initialEntries: ['/p/p1'] },
    );
    await router.navigate('/p/p1');
    const afterFirst = layoutLoads;
    expect(afterFirst).toBeGreaterThan(0);

    // Moving between tabs keeps the stale header: this is the bug, and it must stay reproducible.
    await router.navigate('/p/p1/phases');
    expect(layoutLoads).toBe(afterFirst);

    await router.revalidate();
    expect(layoutLoads).toBe(afterFirst + 1);
  });
});

describe('refreshProject', () => {
  it('invalidates every project key and revalidates the loaders, and waits for both', async () => {
    const seen: unknown[] = [];
    let revalidated = 0;
    let resolveRevalidate = () => {};
    const queryClient = {
      invalidateQueries: async (filters: unknown) => {
        seen.push(filters);
      },
    };
    const done = refreshProject(queryClient as never, () => {
      revalidated += 1;
      return new Promise<void>((resolve) => {
        resolveRevalidate = resolve;
      });
    });
    expect(seen).toEqual([{ queryKey: projectKeys.all }]);
    expect(revalidated).toBe(1);

    let settled = false;
    void done.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false); // still waiting on the loaders
    resolveRevalidate();
    await done;
    expect(settled).toBe(true);
  });
});

describe('the action hooks refresh the header too', () => {
  it.each([
    ['useProjectActions', '../../app/components/projects/useProjectActions.tsx'],
    ['usePlanActions', '../../app/components/projects/plan/usePlanActions.tsx'],
  ])('%s takes its refresh from useRefreshProject', async (_name, path) => {
    const code = await source(path);
    expect(code).toContain('useRefreshProject');
    // The old refresh only touched the cache, so the header stayed on the pre-write version.
    expect(code).not.toContain('invalidateQueries');
  });
});
