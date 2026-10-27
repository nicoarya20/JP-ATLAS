/**
 * Everything the spec says about one operation: the scope it needs, its
 * parameters, its request body and its responses, plus a curl line.
 *
 * Read-only by design — nothing here fires a request (see the page header
 * comment in app/routes/super/openapi.tsx).
 */
import { Badge, Code, Divider, Group, Stack, Text } from '@mantine/core';
import { curlExample } from '~/lib/openapi-curl';
import type { Components } from '~/lib/openapi-schema';
import { flattenSchema, jsonSchemaOf, mediaTypes, typeLabel } from '~/lib/openapi-schema';
import type { SpecParameter, ViewOperation } from '~/lib/openapi-types';
import { CurlSnippet } from './CurlSnippet';
import { SchemaFields } from './SchemaFields';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap={6}>
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
        {title}
      </Text>
      {children}
    </Stack>
  );
}

function ParamRow({ param, components }: { param: SpecParameter; components: Components }) {
  return (
    <Stack gap={2}>
      <Group gap="xs" wrap="wrap" align="baseline">
        <Code
          style={{
            // Mantine has no `wordBreak` prop; a long identifier breaks instead of widening the row.
            wordBreak: 'break-word',
          }}
        >
          {param.name}
        </Code>
        <Badge size="xs" variant="light" color="gray">
          {param.in}
        </Badge>
        <Text size="xs" c="dimmed" ff="monospace">
          {typeLabel(param.schema, components)}
        </Text>
        {param.required && (
          <Badge size="xs" color="red" variant="light">
            wajib
          </Badge>
        )}
      </Group>
      {(param.description ?? param.schema?.description) && (
        <Text size="xs" c="dimmed">
          {param.description ?? param.schema?.description}
        </Text>
      )}
    </Stack>
  );
}

function ResponseBlock({
  code,
  description,
  content,
  components,
}: {
  code: string;
  description?: string;
  content?: Record<string, { schema?: unknown }>;
  components: Components;
}) {
  const schema = jsonSchemaOf(content as Parameters<typeof jsonSchemaOf>[0]);
  const ok = code.startsWith('2');
  return (
    <Stack gap={4}>
      <Group gap="xs" wrap="wrap" align="baseline">
        <Badge size="sm" color={ok ? 'teal' : 'orange'} variant="light">
          {code}
        </Badge>
        {description && (
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        )}
      </Group>
      {schema && <SchemaFields fields={flattenSchema(schema, components)} />}
    </Stack>
  );
}

export function OperationDetail({
  op,
  components,
  baseUrl,
}: {
  op: ViewOperation;
  components: Components;
  baseUrl: string;
}) {
  const params = op.operation.parameters ?? [];
  const bodySchema = jsonSchemaOf(op.operation.requestBody?.content);
  const bodyTypes = mediaTypes(op.operation.requestBody?.content);
  const responses = Object.entries(op.operation.responses ?? {});

  return (
    <Stack gap="md" miw={0}>
      <Group gap="xs" wrap="wrap">
        {op.isPublic ? (
          <Badge size="sm" color="gray" variant="light">
            Tanpa scope (baca publik)
          </Badge>
        ) : (
          <Badge size="sm" color="grape" variant="light">
            Scope: {op.scope}
          </Badge>
        )}
        {op.operation.operationId && (
          <Text size="xs" c="dimmed" ff="monospace">
            {op.operation.operationId}
          </Text>
        )}
      </Group>

      {op.operation.description && <Text size="sm">{op.operation.description}</Text>}

      {params.length > 0 && (
        <Section title="Parameter">
          <Stack gap="xs">
            {params.map((p) => (
              <ParamRow key={`${p.in}:${p.name}`} param={p} components={components} />
            ))}
          </Stack>
        </Section>
      )}

      {bodySchema && (
        <Section title={`Request body${op.operation.requestBody?.required ? ' (wajib)' : ''}`}>
          <Stack gap={6}>
            {bodyTypes.length > 1 && (
              <Text size="xs" c="dimmed">
                Diterima sebagai: {bodyTypes.join(', ')}
              </Text>
            )}
            <SchemaFields fields={flattenSchema(bodySchema, components)} />
          </Stack>
        </Section>
      )}

      {responses.length > 0 && (
        <Section title="Response">
          <Stack gap="sm">
            {responses.map(([code, res]) => (
              <ResponseBlock
                key={code}
                code={code}
                description={res?.description}
                content={res?.content}
                components={components}
              />
            ))}
          </Stack>
        </Section>
      )}

      <Divider />
      <CurlSnippet command={curlExample(op, baseUrl)} />
    </Stack>
  );
}
