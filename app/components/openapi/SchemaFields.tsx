/**
 * A flattened JSON Schema as indented rows. Rows rather than a table on
 * purpose: a four-column table of name/type/required/description does not fit
 * 375 px, and this page has no second "mobile card" layout to fall back to
 * (CLAUDE.md mobile rules).
 */
import { Badge, Box, Code, Group, Stack, Text } from '@mantine/core';
import type { SchemaField } from '~/lib/openapi-schema';

/** One indent step, in px, applied per nesting level. */
const INDENT = 14;

function FieldRow({ field }: { field: SchemaField }) {
  return (
    <Box pl={field.depth * INDENT} miw={0}>
      <Group gap="xs" wrap="wrap" align="baseline">
        <Code style={{ wordBreak: 'break-word' }}>{field.name}</Code>
        <Text size="xs" c="dimmed" ff="monospace">
          {field.type}
        </Text>
        {field.required ? (
          <Badge size="xs" color="red" variant="light">
            wajib
          </Badge>
        ) : (
          <Badge size="xs" color="gray" variant="light">
            opsional
          </Badge>
        )}
      </Group>
      {field.description && (
        <Text size="xs" c="dimmed">
          {field.description}
        </Text>
      )}
      {field.enums.length > 0 && (
        <Text size="xs" c="dimmed">
          Nilai: {field.enums.join(' · ')}
        </Text>
      )}
      {field.constraints.length > 0 && (
        <Text size="xs" c="dimmed">
          {field.constraints.join(' · ')}
        </Text>
      )}
    </Box>
  );
}

export function SchemaFields({ fields }: { fields: SchemaField[] }) {
  if (fields.length === 0)
    return (
      <Text size="sm" c="dimmed">
        Tidak ada field yang dirinci di spec.
      </Text>
    );
  return (
    <Stack gap={6}>
      {fields.map((f) => (
        <FieldRow key={f.key} field={f} />
      ))}
    </Stack>
  );
}
