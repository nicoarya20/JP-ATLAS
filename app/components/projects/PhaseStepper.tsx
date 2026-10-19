import { Divider, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { Fragment } from 'react';
import { FiCheck } from 'react-icons/fi';
import type { Phase } from './projects.detail.dummy';

/** The phases of a project as numbered steps on a line: done ones ticked, the current one filled. */
export function PhaseStepper({ phases }: { phases: readonly Phase[] }) {
  return (
    // Scrolls sideways instead of squeezing the labels on a narrow screen (CLAUDE.md mobile).
    <Group gap={0} align="flex-start" wrap="nowrap" style={{ overflowX: 'auto' }} role="list">
      {phases.map((p, i) => (
        <Fragment key={p.name}>
          <Stack
            gap={4}
            align="center"
            style={{ minWidth: '5rem', flex: '1 0 auto' }}
            role="listitem"
          >
            <ThemeIcon
              radius="xl"
              color={p.state === 'done' ? 'ok' : 'dark'}
              variant={p.state === 'upcoming' ? 'default' : 'filled'}
              aria-label={p.state === 'done' ? `${p.name}: selesai` : undefined}
            >
              {p.state === 'done' ? (
                <FiCheck size="1.25em" aria-hidden />
              ) : (
                <Text size="xs">{i + 1}</Text>
              )}
            </ThemeIcon>
            <Text size="xs" ta="center" fw={p.state === 'current' ? 700 : 400}>
              {p.name}
            </Text>
          </Stack>
          {i < phases.length - 1 && (
            <Divider style={{ flex: 1, minWidth: '1rem', marginTop: '1rem' }} />
          )}
        </Fragment>
      ))}
    </Group>
  );
}
