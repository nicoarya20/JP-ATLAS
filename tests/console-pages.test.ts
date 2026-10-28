import { describe, expect, test } from 'bun:test';
import { CONSOLE_PAGE_COUNT, CONSOLE_PAGES } from '../app/lib/console-pages';
import routes from '../app/routes';

function countDevPages(list: unknown): number {
  let n = 0;
  const walk = (items: unknown[]) => {
    for (const r of items) {
      const route = r as { path?: string; children?: unknown[] };
      if (route.path?.startsWith('dev')) n++;
      if (route.children) walk(route.children);
    }
  };
  walk(list as unknown[]);
  return n;
}

describe('console pages', () => {
  test('count matches the registered /dev routes and the catalog', () => {
    expect(countDevPages(routes)).toBe(CONSOLE_PAGE_COUNT);
    expect(CONSOLE_PAGES.length).toBe(CONSOLE_PAGE_COUNT);
  });
});
