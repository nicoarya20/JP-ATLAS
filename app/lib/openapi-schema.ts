/**
 * Reads a JSON Schema out of the spec and flattens it into the indented field
 * rows the viewer draws. Pure, and deliberately defensive: the document is JSON
 * from the network, so a `$ref` may dangle and a schema may be self-referential.
 */
import type { JsonSchema, MediaType } from './openapi-types';

const REF_PREFIX = '#/components/schemas/';
/** Deep enough for the request/response bodies this API has, shallow enough to stay readable. */
export const MAX_SCHEMA_DEPTH = 4;

export type Components = Record<string, JsonSchema> | undefined;

/** Follows `$ref` into components; returns null for a ref that does not resolve. */
export function resolveSchema(
  schema: JsonSchema | undefined,
  components: Components,
): JsonSchema | null {
  if (!schema) return null;
  if (!schema.$ref) return schema;
  if (!schema.$ref.startsWith(REF_PREFIX)) return null;
  const target = components?.[schema.$ref.slice(REF_PREFIX.length)];
  // One hop only: a ref pointing at another ref is not something this spec emits,
  // and refusing to chase it keeps a ref cycle from hanging the render.
  return target && !target.$ref ? target : null;
}

/** Short name of the component a `$ref` points at, for display when it cannot be resolved. */
export function refName(ref: string): string {
  return ref.startsWith(REF_PREFIX) ? ref.slice(REF_PREFIX.length) : ref;
}

/** Human type label: `string`, `string[]`, `object`, `number | string`, `enum`. */
export function typeLabel(schema: JsonSchema | undefined, components: Components): string {
  if (!schema) return 'any';
  if (schema.$ref)
    return resolveSchema(schema, components) ? refName(schema.$ref) : refName(schema.$ref);
  const union = schema.anyOf ?? schema.oneOf;
  if (union?.length) {
    const parts = [...new Set(union.map((s) => typeLabel(s, components)))];
    return parts.join(' | ');
  }
  if (schema.allOf?.length) return schema.allOf.map((s) => typeLabel(s, components)).join(' & ');
  if (schema.enum?.length) return 'enum';
  if (schema.type === 'array') return `${typeLabel(schema.items, components)}[]`;
  if (schema.format && schema.type === 'string') return `string(${schema.format})`;
  return schema.type ?? 'any';
}

/** The validation facts worth showing beside a field, already formatted. */
export function constraintsOf(schema: JsonSchema | undefined): string[] {
  if (!schema) return [];
  const out: string[] = [];
  if (schema.minLength !== undefined) out.push(`min ${schema.minLength} karakter`);
  if (schema.maxLength !== undefined) out.push(`maks ${schema.maxLength} karakter`);
  if (schema.minimum !== undefined) out.push(`≥ ${schema.minimum}`);
  if (schema.maximum !== undefined) out.push(`≤ ${schema.maximum}`);
  if (schema.pattern) out.push(`pola ${schema.pattern}`);
  if (schema.default !== undefined) out.push(`default ${JSON.stringify(schema.default)}`);
  return out;
}

/** Allowed values of an enum (or a const), as display strings. */
export function enumValues(schema: JsonSchema | undefined): string[] {
  if (!schema) return [];
  if (schema.const !== undefined) return [String(schema.const)];
  return (schema.enum ?? []).map((v) => String(v));
}

export type SchemaField = {
  /** Unique within one flattened schema: the dotted path, e.g. `filters.status`. */
  key: string;
  name: string;
  depth: number;
  type: string;
  required: boolean;
  description: string | null;
  enums: string[];
  constraints: string[];
};

/** The object a schema really describes: unwraps an array and follows one `$ref`. */
function objectOf(schema: JsonSchema | null, components: Components): JsonSchema | null {
  const resolved = resolveSchema(schema ?? undefined, components);
  if (!resolved) return null;
  if (resolved.type === 'array') return objectOf(resolved.items ?? null, components);
  return resolved.properties ? resolved : null;
}

function walk(
  schema: JsonSchema | null,
  components: Components,
  depth: number,
  prefix: string,
  out: SchemaField[],
): void {
  const obj = objectOf(schema, components);
  if (!obj?.properties) return;
  const required = new Set(obj.required ?? []);
  for (const [name, raw] of Object.entries(obj.properties)) {
    const key = prefix ? `${prefix}.${name}` : name;
    const resolved = resolveSchema(raw, components) ?? raw;
    out.push({
      key,
      name,
      depth,
      type: typeLabel(raw, components),
      required: required.has(name),
      description: resolved.description?.trim() || null,
      enums: enumValues(resolved),
      constraints: constraintsOf(resolved),
    });
    // Stop one level before the limit so the last row drawn is still a complete field.
    if (depth + 1 < MAX_SCHEMA_DEPTH) walk(raw, components, depth + 1, key, out);
  }
}

/** Flattened field rows for an object (or array-of-object) schema; empty for a scalar. */
export function flattenSchema(
  schema: JsonSchema | undefined,
  components: Components,
): SchemaField[] {
  const out: SchemaField[] = [];
  walk(schema ?? null, components, 0, '', out);
  return out;
}

/**
 * The JSON schema of a request or response body. Elysia emits the same schema
 * under three content types (json, urlencoded, multipart); JSON is the one the
 * API documents, so the other two are not shown as if they were alternatives.
 */
export function jsonSchemaOf(content: Record<string, MediaType> | undefined): JsonSchema | null {
  if (!content) return null;
  const json = content['application/json']?.schema;
  if (json) return json;
  const first = Object.values(content)[0]?.schema;
  return first ?? null;
}

/** Media types a body accepts, so the page can say so without listing three copies. */
export function mediaTypes(content: Record<string, MediaType> | undefined): string[] {
  return Object.keys(content ?? {});
}
