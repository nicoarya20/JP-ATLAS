import { Button, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { TEXT_SIZES, type TextSize } from '@server/pm/enums';
import { textSizeCookie } from '@server/text-size';
import { useRevalidator, useRouteLoaderData } from 'react-router';
import { notify } from '~/components/ui/notify';

const OPTIONS: Record<TextSize, { label: string; fontSize: string }> = {
  normal: { label: 'Normal', fontSize: '1rem' },
  besar: { label: 'Besar', fontSize: '1.15rem' },
  sangat_besar: { label: 'Sangat besar', fontSize: '1.3rem' },
};

/** "Ukuran teks": three big choices; the choice is stored in the same cookie the root loader reads. */
export function TextSizeCard() {
  const current = useRouteLoaderData<{ textSize?: TextSize }>('root')?.textSize ?? 'normal';
  const { revalidate, state } = useRevalidator();

  const choose = async (size: TextSize) => {
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is not in every supported browser; same cookie the root loader reads.
    document.cookie = textSizeCookie(size);
    await revalidate();
    notify.success(`Ukuran teks diubah ke ${OPTIONS[size].label.toLowerCase()}.`);
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <div>
          <Text fw={700}>Ukuran teks</Text>
          <Text size="sm" c="dimmed">
            Pilih ukuran yang paling nyaman dibaca. Berlaku di semua layar.
          </Text>
        </div>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          {TEXT_SIZES.map((s) => (
            <Button
              key={s}
              h="auto"
              py="md"
              variant={current === s ? 'filled' : 'default'}
              aria-pressed={current === s}
              loading={state === 'loading'}
              onClick={() => choose(s)}
              styles={{ label: { fontSize: OPTIONS[s].fontSize } }}
            >
              {`Aa ${OPTIONS[s].label}`}
            </Button>
          ))}
        </SimpleGrid>
        <Paper bg="var(--mantine-color-default-hover)" p="sm" radius="sm">
          <Text>Contoh: Rapat harian Atlas pukul 09.00</Text>
        </Paper>
      </Stack>
    </Paper>
  );
}
