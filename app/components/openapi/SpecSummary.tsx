/**
 * What the loaded key can actually reach: how many operations, which scopes,
 * and the reminder that this is the filtered view, not the whole API.
 */
import { Badge, Group, Paper, Stack, Text } from '@mantine/core';
import type { OpenApiSpec } from '~/lib/openapi-types';

export function SpecSummary({
  spec,
  operationCount,
  scopes,
  baseUrl,
}: {
  spec: OpenApiSpec;
  operationCount: number;
  scopes: string[];
  baseUrl: string;
}) {
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="xs">
        <Group gap="xs" wrap="wrap" align="baseline">
          <Text fw={600}>{spec.info?.title ?? 'API'}</Text>
          {spec.info?.version && (
            <Badge size="sm" variant="light" color="gray">
              v{spec.info.version}
            </Badge>
          )}
          <Badge size="sm" variant="light" color="grape">
            {operationCount} operasi
          </Badge>
        </Group>
        {baseUrl && (
          <Text
            size="xs"
            c="dimmed"
            ff="monospace"
            style={{
              // Mantine has no `wordBreak` prop, and this value is a path or key with no spaces to break at.
              wordBreak: 'break-all',
            }}
          >
            {baseUrl}
          </Text>
        )}
        <Text size="sm" c="dimmed">
          Ini bukan seluruh permukaan API — hanya endpoint yang boleh dipanggil kunci yang kamu
          muat. Kunci dengan scope lain akan melihat daftar yang berbeda.
        </Text>
        {scopes.length > 0 && (
          <Group gap={6} wrap="wrap">
            {scopes.map((s) => (
              <Badge key={s} size="sm" variant="outline" color="grape">
                {s}
              </Badge>
            ))}
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
