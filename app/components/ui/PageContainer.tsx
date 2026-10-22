import { Stack } from '@mantine/core';
import type { ReactNode } from 'react';

/** Max widths in px: reading pages stay narrow, list/table pages get the wide column (R05 §3.4 #1). */
export const PAGE_WIDTHS = { wide: 1320, narrow: 880 } as const;

type Props = { size?: keyof typeof PAGE_WIDTHS; children: ReactNode };

/** Page-level column with the shared padding and max width, so each route stops repeating `Stack p maw`. */
export function PageContainer({ size = 'wide', children }: Props) {
  // `w="100%"` + `maw` (not a fixed width) keeps 375px phones free of horizontal scroll.
  return (
    <Stack gap="md" w="100%" maw={PAGE_WIDTHS[size]} p={{ base: 'sm', md: 'md' }}>
      {children}
    </Stack>
  );
}
