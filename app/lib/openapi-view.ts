/**
 * Turns the key-filtered spec into what /dev/openapi draws: a flat operation
 * list, grouped by tag and searchable. Pure — no fetching and no React — so the
 * grouping and filtering rules can be tested on their own.
 *
 * The viewer never invents operations: everything here reads out of the document
 * the server returned, which already lists only what the calling key may call
 * (specForKey in server/api/openapi.ts). A wider list would leak API surface.
 */
import type { OpenApiSpec, OperationGroup, SpecOperation, ViewOperation } from './openapi-types';

/** Keys of a path item that are operations; anything else there is metadata. */
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;
const METHOD_RANK = new Map<string, number>(HTTP_METHODS.map((m, i) => [m, i]));

/**
 * Method colours in the familiar read/create/update/delete order, written as the
 * project's role-palette aliases rather than raw hex (CLAUDE.md design system).
 */
const METHOD_COLORS: Record<string, string> = {
  GET: 'teal',
  POST: 'blue',
  PUT: 'orange',
  PATCH: 'yellow',
  DELETE: 'red',
  HEAD: 'gray',
  OPTIONS: 'gray',
};

export function methodColor(method: string): string {
  return METHOD_COLORS[method.toUpperCase()] ?? 'gray';
}

/** Operations whose tag is missing fall here, so nothing is silently dropped. */
const UNTAGGED = 'lainnya';

function toViewOperation(path: string, methodKey: string, op: SpecOperation): ViewOperation {
  const scope = op['x-required-scope'] ?? null;
  return {
    id: `${methodKey} ${path}`,
    method: methodKey.toUpperCase(),
    methodKey,
    path,
    tag: op.tags?.[0]?.trim() || UNTAGGED,
    scope,
    // specForKey gives a public read an empty `security`; a scoped one gets the key schemes.
    isPublic: scope === null,
    summary: op.summary?.trim() || null,
    operation: op,
  };
}

/** Every operation in the document, in no particular order. */
export function listOperations(spec: OpenApiSpec | null | undefined): ViewOperation[] {
  const out: ViewOperation[] = [];
  for (const [path, item] of Object.entries(spec?.paths ?? {})) {
    if (!item) continue;
    for (const method of HTTP_METHODS) {
      const op = item[method];
      if (op) out.push(toViewOperation(path, method, op));
    }
  }
  return out;
}

export function operationCount(spec: OpenApiSpec | null | undefined): number {
  return listOperations(spec).length;
}

function compareOperations(a: ViewOperation, b: ViewOperation): number {
  if (a.path !== b.path) return a.path.localeCompare(b.path);
  return (METHOD_RANK.get(a.methodKey) ?? 99) - (METHOD_RANK.get(b.methodKey) ?? 99);
}

/** Tags alphabetically, operations by path then by the usual method order. */
export function groupOperations(operations: ViewOperation[]): OperationGroup[] {
  const byTag = new Map<string, ViewOperation[]>();
  for (const op of operations) {
    const list = byTag.get(op.tag);
    if (list) list.push(op);
    else byTag.set(op.tag, [op]);
  }
  return [...byTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, ops]) => ({ tag, operations: [...ops].sort(compareOperations) }));
}

/** Free-text match over the parts an operator actually searches by. */
export function filterOperations(operations: ViewOperation[], query: string): ViewOperation[] {
  const q = query.trim().toLowerCase();
  if (!q) return operations;
  return operations.filter((op) =>
    [op.path, op.method, op.tag, op.scope ?? 'publik', op.summary ?? '']
      .join(' ')
      .toLowerCase()
      .includes(q),
  );
}

/** Scopes the loaded key can reach, for the summary line above the list. */
export function usedScopes(operations: ViewOperation[]): string[] {
  return [...new Set(operations.map((op) => op.scope).filter((s): s is string => s !== null))].sort(
    (a, b) => a.localeCompare(b),
  );
}

/** Base URL the spec says requests go to; relative paths if the server omitted it. */
export function serverUrl(spec: OpenApiSpec | null | undefined): string {
  return spec?.servers?.[0]?.url?.replace(/\/$/, '') ?? '';
}
