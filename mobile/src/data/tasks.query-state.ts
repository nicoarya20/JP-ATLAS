import { useCallback, useMemo } from 'react';

import { useProjectsState } from './projects.state';
import { createStore, useStore } from './store';
import { baseQuery, type TaskQuery, type TaskScope, withListedProject } from './tasks.query';

/*
 * The Filter & sort query of each task list, kept per scope instead of in route params (phase1-screens.md K4): the
 * filter sheet writes it on Apply and the list reads it. A scope that was never set reads its default. Reads never
 * name a project in Archive (withListedProject); what was applied stays stored, so Undo of the project brings it back.
 */

const queries = createStore<Readonly<Partial<Record<TaskScope, TaskQuery>>>>({});

/** Default query of a scope, on a listed project (Reset in the filter sheet). */
export const defaultQuery = (scope: TaskScope): TaskQuery =>
  withListedProject(baseQuery(scope), scope);

/** Query of a scope, its default when none was applied. */
export const getQuery = (scope: TaskScope): TaskQuery =>
  withListedProject(queries.get()[scope] ?? baseQuery(scope), scope);

/** Read the query of a scope in a component; it follows the project list too (a project moved to Archive). */
export function useQuery(scope: TaskScope): TaskQuery {
  const select = useCallback(
    (s: Readonly<Partial<Record<TaskScope, TaskQuery>>>) => s[scope] ?? baseQuery(scope),
    [scope],
  );
  const stored = useStore(queries, select);
  const { list } = useProjectsState();
  return useMemo(() => withListedProject(stored, scope, list), [stored, scope, list]);
}

/** Apply a query to a scope (Filter & sort › Apply). */
export const setQuery = (scope: TaskScope, q: TaskQuery) =>
  queries.set((s) => ({ ...s, [scope]: q }));

/** Back to the scope's default (Reset filters). */
export const resetQuery = (scope: TaskScope) =>
  queries.set((s) => {
    const { [scope]: _, ...rest } = s;
    return rest;
  });

/** Every scope back to its default. test-only */
export const resetQueries = () => queries.reset();
