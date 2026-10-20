import { Stack, Title } from '@mantine/core';
import type { ReactNode } from 'react';

/** One block of the Pengaturan page: a bold heading above its card, as the wireframe stacks them. */
export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="xs" component="section" aria-label={title}>
      <Title order={4}>{title}</Title>
      {children}
    </Stack>
  );
}
