import { ActionIcon, Box, CopyButton, Group, Stack, Text, Tooltip } from '@mantine/core';
import { FiCheck, FiCopy } from 'react-icons/fi';
import { TruncatedText } from './TruncatedText';

/** Label column width in px, so every row in a drawer breaks at the same place. */
const LABEL_WIDTH = 110;

/** Label/value row used inside detail drawers. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
      <Text size="sm" c="dimmed" flex="0 0 auto" w={LABEL_WIDTH}>
        {label}
      </Text>
      <Box miw={0} flex={1} ta="right">
        {children}
      </Box>
    </Group>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap="xs">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={0.3}>
        {title}
      </Text>
      {children}
    </Stack>
  );
}

/** Monospace value with a copy-to-clipboard button. */
export function Copyable({ value }: { value: string }) {
  return (
    <Group gap={4} wrap="nowrap" justify="flex-end">
      <TruncatedText ff="monospace" size="sm" miw={0}>
        {value}
      </TruncatedText>
      <CopyButton value={value} timeout={1500}>
        {({ copied, copy }) => (
          <Tooltip label={copied ? 'Tersalin' : 'Salin'} withArrow>
            <ActionIcon
              variant="subtle"
              color={copied ? 'teal' : 'gray'}
              size="sm"
              onClick={copy}
              aria-label="Salin"
            >
              {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}
