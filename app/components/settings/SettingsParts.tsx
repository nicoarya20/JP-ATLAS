import { Badge, Box, Divider, Group, Paper, Stack, Text, Title } from '@mantine/core';

/** Label/description pairs sit 4 px apart — the tight step of the spacing scale, below `xs` (8 px). */
const LABEL_GAP = 4;

/** Card wrapper for one settings group, with a title row that can hold status badges/actions. */
export function SettingsCard({
  title,
  description,
  aside,
  children,
}: {
  title: string;
  description?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // Radius comes from the Paper theme default (14 px); only the padding varies by breakpoint.
    <Paper withBorder p={{ base: 'md', md: 'lg' }}>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="xs">
          <Box>
            <Title order={3}>{title}</Title>
            {description && (
              <Text size="sm" c="dimmed">
                {description}
              </Text>
            )}
          </Box>
          {aside}
        </Group>
        <Divider />
        {children}
      </Stack>
    </Paper>
  );
}

/** Label + description on the left, control on the right; stacks on narrow screens. */
export function SettingRow({
  label,
  description,
  badge,
  control,
}: {
  label: string;
  description: string;
  badge?: React.ReactNode;
  control: React.ReactNode;
}) {
  return (
    <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
      {/* Grows past its 260 px basis but may shrink below it; `miw={0}` lets long text wrap
          instead of pushing the control off a 375 px screen. */}
      <Stack gap={LABEL_GAP} flex="1 1 260px" miw={0}>
        <Group gap="xs" wrap="wrap">
          <Text fw={500}>{label}</Text>
          {badge}
        </Group>
        <Text size="sm" c="dimmed">
          {description}
        </Text>
      </Stack>
      {/* Takes its natural width and never grows, so the label column gets the leftover space. */}
      <Box flex="0 1 auto">{control}</Box>
    </Group>
  );
}

/** "Default" / "Diubah" marker next to a field. */
export function OverrideBadge({ overridden }: { overridden: boolean }) {
  return (
    <Badge size="xs" variant="light" color={overridden ? 'atlas' : 'gray'}>
      {overridden ? 'Diubah' : 'Default'}
    </Badge>
  );
}
