import { useCallback } from 'react';

import { createStore, useStore } from './store';
import { baseQuery, type TaskQuery, type TaskScope } from './tasks.query';

/*
 * The Filter & sort query of each task list, kept per scope instead of in route params (phase1-screens.md K4): the
 * filter sheet writes it on Apply and the list reads it. A scope that was never set reads its default. A project that
 * went to the Trash simply lists nothing; the filter then shows "No tasks match these filters" with Reset.
 */

const queries = createStore<Readonly<Partial<Record<TaskScope, TaskQuery>>>>({});

/** Default query of a scope (Reset in the filter sheet). */
export const defaultQuery = (scope: TaskScope): TaskQuery => baseQuery(scope);

/** Query of a scope, its default when none was applied. */
export const getQuery = (scope: TaskScope): TaskQuery => queries.get()[scope] ?? baseQuery(scope);

/** Read the query of a scope in a component. */
export function useQuery(scope: TaskScope): TaskQuery {
  const select = useCallback(
    (s: Readonly<Partial<Record<TaskScope, TaskQuery>>>) => s[scope] ?? baseQuery(scope),
    [scope],
  );
  return useStore(queries, select);
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
