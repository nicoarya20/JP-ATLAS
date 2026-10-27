/**
 * Builds the copyable curl line shown under each operation.
 *
 * The page has no "Try it out" button (see app/routes/super/openapi.tsx for
 * why), so this snippet is how an operator actually calls an endpoint — in
 * their own terminal, where they can read the command before running it.
 *
 * The key is ALWAYS the `$SP_API_KEY` placeholder, never the key the operator
 * typed into the page. Copying a command puts it on the system clipboard and
 * usually into shell history too; neither is a place for a live credential
 * (CLAUDE.md §7).
 */
import { jsonSchemaOf } from './openapi-schema';
import type { JsonSchema, ViewOperation } from './openapi-types';

/** Env var the snippet reads the key from, so the secret stays out of the command. */
export const KEY_PLACEHOLDER = '$SP_API_KEY';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** A single-quoted shell argument; `'` inside is closed, escaped and reopened. */
function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** Placeholder value for one field, so the example body is valid JSON. */
function sampleValue(schema: JsonSchema | undefined): unknown {
  if (!schema) return null;
  if (schema.enum?.length) return schema.enum[0];
  if (schema.default !== undefined) return schema.default;
  switch (schema.type) {
    case 'string':
      return schema.format ? `<${schema.format}>` : '<string>';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return null;
  }
}

/** Example JSON body: the required fields only, so the line stays short and valid. */
export function sampleBody(op: ViewOperation): string | null {
  const schema = jsonSchemaOf(op.operation.requestBody?.content);
  if (!schema?.properties) return null;
  const required = schema.required ?? [];
  const fields = required.length ? required : Object.keys(schema.properties).slice(0, 3);
  const body: Record<string, unknown> = {};
  for (const name of fields) {
    const prop = schema.properties[name];
    if (prop) body[name] = sampleValue(prop);
  }
  return Object.keys(body).length ? JSON.stringify(body) : null;
}

/** Query string of the required query params, as `name=<name>` placeholders. */
function querySuffix(op: ViewOperation): string {
  const required = (op.operation.parameters ?? []).filter(
    (p) => p.in === 'query' && p.required && p.name,
  );
  if (!required.length) return '';
  return `?${required.map((p) => `${p.name}=<${p.name}>`).join('&')}`;
}

/**
 * A runnable curl line. Path params stay as `{id}` so it is obvious they must
 * be substituted before the command does anything.
 */
export function curlExample(op: ViewOperation, baseUrl: string): string {
  const url = `${baseUrl.replace(/\/$/, '')}${op.path}${querySuffix(op)}`;
  const parts = [`curl -X ${op.method}`, shellQuote(url)];
  // A public read needs no key, but sending one is harmless and keeps the
  // snippet copy-pasteable between operations.
  parts.push(`\\\n  -H ${shellQuote(`X-API-Key: ${KEY_PLACEHOLDER}`)}`);
  if (METHODS_WITH_BODY.has(op.method)) {
    const body = sampleBody(op);
    if (body) {
      parts.push(`\\\n  -H ${shellQuote('Content-Type: application/json')}`);
      parts.push(`\\\n  -d ${shellQuote(body)}`);
    }
  }
  return parts.join(' ');
}
