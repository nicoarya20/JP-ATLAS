import { Box, Paper, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';

/**
 * Role palettes an accent border may use. Typed rather than a free string so a colour that is not
 * part of the design system fails typecheck instead of silently rendering no border.
 */
export type AccentColor = 'ok' | 'warn' | 'danger' | 'atlas';

/** Accent border in px: thicker than the 1 px default so a highlighted card reads as highlighted. */
const ACCENT_BORDER_WIDTH = 2;

type Props = {
  title: string;
  /** One line under the title saying what question the card answers. */
  subtitle?: string;
  children: ReactNode;
  /** Role colour of a highlighted card's border, e.g. the briefing card on Beranda. */
  accent?: AccentColor;
};

/** Bordered card with a title and optional subtitle, shared by Beranda and Pengaturan. */
export function SectionCard({ title, subtitle, children, accent }: Props) {
  return (
    <Paper
      withBorder
      p="md"
      // `bd` keeps the accent on the palette token; radius comes from the Paper theme default (14 px).
      bd={accent ? `${ACCENT_BORDER_WIDTH}px solid var(--mantine-color-${accent}-5)` : undefined}
    >
      <Stack gap="sm">
        <Box>
          <Title order={5}>{title}</Title>
          {subtitle && (
            <Text size="sm" c="dimmed">
              {subtitle}
            </Text>
          )}
        </Box>
        {children}
      </Stack>
    </Paper>
  );
}
