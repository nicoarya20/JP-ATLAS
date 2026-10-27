import { Button, SimpleGrid, Stack, Text } from '@mantine/core';
import { TEXT_SIZES, type TextSize } from '@server/pm/enums';
import { TEXT_SCALE } from '@server/text-size';
import { FiCheckCircle } from 'react-icons/fi';
import { APPEARANCE_COPY, TEXT_SIZE_LABELS } from './account.copy';

/**
 * Three large buttons, one per text size. The active one says so in words ("Dipakai sekarang"),
 * not only by colour, so it reads the same for colour-blind users and screen readers (aria-pressed).
 */
export function TextSizePicker({
  value,
  pending,
  onPick,
}: {
  value: TextSize;
  /** The size being saved, if any: that button spins and the others wait. */
  pending: TextSize | null;
  onPick: (size: TextSize) => void;
}) {
  return (
    <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
      {TEXT_SIZES.map((size) => {
        const active = size === value;
        return (
          <Button
            key={size}
            variant={active ? 'filled' : 'default'}
            h="auto"
            py="md"
            aria-pressed={active}
            loading={pending === size}
            disabled={pending !== null && pending !== size}
            onClick={() => !active && onPick(size)}
            styles={{ label: { whiteSpace: 'normal', overflow: 'visible' } }}
          >
            <Stack gap={4} align="center">
              {/* Absolute rem, so each button previews its own size whatever the current scale. */}
              <Text component="span" fw={700} lh={1.2} fz={`${TEXT_SCALE[size]}rem`}>
                Aa {TEXT_SIZE_LABELS[size]}
              </Text>
              <Text component="span" size="sm" fw={active ? 600 : 400}>
                {active ? (
                  <>
                    {/* A react-icons SVG takes no Mantine props; `verticalAlign` has none anyway. */}
                    <FiCheckCircle size="1.25em" style={{ verticalAlign: 'middle' }} />{' '}
                    {APPEARANCE_COPY.active}
                  </>
                ) : (
                  APPEARANCE_COPY.choose
                )}
              </Text>
            </Stack>
          </Button>
        );
      })}
    </SimpleGrid>
  );
}
