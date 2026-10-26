/**
 * Shape of the OpenAPI 3 document that `GET /api/openapi.json` returns
 * (server/api/openapi.ts). Only the parts the /dev/openapi viewer reads are
 * described: the document arrives as untrusted JSON, so every field is optional
 * and the helpers treat a missing one as "nothing to show" rather than crashing.
 */

export type JsonSchema = {
  $ref?: string;
  type?: string;
  format?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  const?: unknown;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  allOf?: JsonSchema[];
  additionalProperties?: boolean | JsonSchema;
};

export type SpecParameter = {
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
  schema?: JsonSchema;
};

export type MediaType = { schema?: JsonSchema };
export type SpecBody = {
  required?: boolean;
  description?: string;
  content?: Record<string, MediaType>;
};
export type SpecResponse = { description?: string; content?: Record<string, MediaType> };

export type SpecOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: SpecParameter[];
  requestBody?: SpecBody;
  responses?: Record<string, SpecResponse>;
  /** Empty array means "no key scope needed" — specForKey marks public reads that way. */
  security?: unknown[];
  /** Added by specForKey: the scope a key must hold to call this operation. */
  'x-required-scope'?: string | null;
};

export type OpenApiSpec = {
  openapi?: string;
  info?: { title?: string; version?: string; description?: string };
  servers?: Array<{ url?: string }>;
  components?: { schemas?: Record<string, JsonSchema> };
  paths?: Record<string, Record<string, SpecOperation> | undefined>;
};

/** One operation, flattened out of `paths` with everything the list row needs. */
export type ViewOperation = {
  /** Stable id for accordion state and React keys, e.g. `get /api/posts`. */
  id: string;
  /** Upper-case for display; `pathKey`/`methodKey` keep the raw spec casing. */
  method: string;
  methodKey: string;
  path: string;
  tag: string;
  scope: string | null;
  /** True when the operation needs no scope at all (a public read). */
  isPublic: boolean;
  summary: string | null;
  operation: SpecOperation;
};

export type OperationGroup = { tag: string; operations: ViewOperation[] };
