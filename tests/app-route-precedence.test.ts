/**
 * Route precedence for the /app product area, proven against the real `app/routes.ts` with
 * React Router's own matcher: a static segment (`new`) must win over a dynamic one
 * (`:projectId`, `:number`), so it is never read as an id.
 */
import { describe, expect, test } from 'bun:test';
import { matchRoutes, type RouteObject } from 'react-router';
import routes from '../app/routes';

type Entry = { file: string; path?: string; index?: boolean; children?: Entry[] };

/** Converts config entries to matcher objects, using the route file as id. */
function toRouteObjects(entries: Entry[]): RouteObject[] {
  return entries.map((e) => {
    const base = { id: e.file, path: e.path };
    return e.index
      ? ({ ...base, index: true } as RouteObject)
      : { ...base, children: e.children ? toRouteObjects(e.children) : undefined };
  });
}

const OBJECTS = toRouteObjects(routes as Entry[]);

/** Route files matched for a URL, outermost first (empty when nothing matches). */
function matchedFiles(url: string): string[] {
  return (matchRoutes(OBJECTS, url) ?? []).map((m) => m.route.id as string);
}

function paramsOf(url: string): Record<string, string | undefined> {
  const matches = matchRoutes(OBJECTS, url) ?? [];
  return matches[matches.length - 1]?.params ?? {};
}

const APP_LAYOUT = 'routes/app/layout.tsx';

describe('/app route precedence', () => {
  test('/app/projects/new resolves to project-new, not the :projectId layout', () => {
    expect(matchedFiles('/app/projects/new')).toEqual([APP_LAYOUT, 'routes/app/project-new.tsx']);
  });

  test('/app/projects/abc resolves to the project layout with the summary index', () => {
    const files = matchedFiles('/app/projects/abc');
    expect(files).toEqual([
      APP_LAYOUT,
      'routes/app/project/layout.tsx',
      'routes/app/project/summary.tsx',
    ]);
    expect(paramsOf('/app/projects/abc').projectId).toBe('abc');
  });

  test('/app/projects/abc/tasks stays inside the project layout', () => {
    expect(matchedFiles('/app/projects/abc/tasks')).toEqual([
      APP_LAYOUT,
      'routes/app/project/layout.tsx',
      'routes/app/project/tasks.tsx',
    ]);
  });

  test('/app/tasks/new resolves to task-new, not task-detail', () => {
    expect(matchedFiles('/app/tasks/new')).toEqual([APP_LAYOUT, 'routes/app/task-new.tsx']);
  });

  test('/app/tasks/12 resolves to task-detail with the number param', () => {
    expect(matchedFiles('/app/tasks/12')).toEqual([APP_LAYOUT, 'routes/app/task-detail.tsx']);
    expect(paramsOf('/app/tasks/12').number).toBe('12');
  });

  test('a path with no route matches nothing', () => {
    expect(matchedFiles('/app/tasks/12/unknown')).toEqual([]);
  });
});
