import { Anchor, Box, Group, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router';

type Props = {
  title: string;
  description?: string;
  /** Buttons on the right; they wrap under the title on narrow screens. */
  actions?: ReactNode;
  back?: { to: string; label: string };
};

/** Page title with optional description, back link and action buttons (R05 §3.4 #2). */
export function PageHeader({ title, description, actions, back }: Props) {
  return (
    <Box>
      {back && (
        <Anchor component={Link} to={back.to} size="sm" mb="xs" display="inline-block">
          {/* A Group carries the icon/label gap, so it comes off the spacing scale instead of a style. */}
          <Group component="span" gap="xs">
            <FiArrowLeft size="1.25em" aria-hidden />
            {back.label}
          </Group>
        </Anchor>
      )}
      {/* Wrapping lets buttons drop below the title instead of overflowing 375px (CLAUDE.md mobile §3). */}
      <Group justify="space-between" align="flex-start" wrap="wrap">
        {/* `miw={0}` lets a long title shrink and ellipsise rather than widen the row. */}
        <Box miw={0}>
          <Title order={1}>{title}</Title>
          {description && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
        </Box>
        {actions && (
          <Group gap="xs" wrap="wrap" justify="flex-end">
            {actions}
          </Group>
        )}
      </Group>
    </Box>
  );
}
