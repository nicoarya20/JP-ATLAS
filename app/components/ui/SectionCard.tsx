import { Paper, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  /** One line under the title saying what question the card answers. */
  subtitle?: string;
  children: ReactNode;
  /** Accent border colour token, e.g. for the highlighted briefing card. */
  accent?: string;
};

/** Bordered card with a title and optional subtitle, shared by Beranda and Pengaturan. */
export function SectionCard({ title, subtitle, children, accent }: Props) {
  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      style={
        accent ? { borderColor: `var(--mantine-color-${accent}-5)`, borderWidth: 2 } : undefined
      }
    >
      <Stack gap="sm">
        <div>
          <Title order={5}>{title}</Title>
          {subtitle && (
            <Text size="sm" c="dimmed">
              {subtitle}
            </Text>
          )}
        </div>
        {children}
      </Stack>
    </Paper>
  );
}
