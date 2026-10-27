import { Box, Paper, Stack, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { TextSize } from '@server/pm/enums';
import { textSizeCookie } from '@server/text-size';
import { useMutation } from '@tanstack/react-query';
import { useRevalidator } from 'react-router';
import { notify } from '~/components/ui/notify';
import { patchMyProfile } from '~/lib/profile-api';
import { APPEARANCE_COPY } from './account.copy';
import { TextSizePicker } from './TextSizePicker';

/** Writes the size cookie on this device; the root loader reads it on the next render. */
function writeSizeCookie(size: TextSize) {
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API is missing in Safari < 18.4 and Firefox; this is a plain display preference
  document.cookie = textSizeCookie(size);
}

/**
 * Text size preference. Order matters (R05 §3.7): the cookie is written first so the root loader
 * scales the very next render, the profile keeps it for other devices, then the loaders re-run.
 */
export function AppearanceCard({ textSize }: { textSize: TextSize }) {
  const revalidator = useRevalidator();
  const save = useMutation({
    mutationFn: async (size: TextSize) => {
      writeSizeCookie(size);
      try {
        await patchMyProfile({ textSize: size });
      } catch (err) {
        // Put the cookie back so this device does not drift from the saved profile.
        writeSizeCookie(textSize);
        throw err;
      }
      await revalidator.revalidate();
    },
    onSuccess: () => notifications.show({ color: 'teal', message: APPEARANCE_COPY.saved }),
    onError: (err) => notify.fail(APPEARANCE_COPY.saveFailed, err),
  });

  return (
    <Paper withBorder p={{ base: 'md', md: 'lg' }}>
      <Stack gap="sm">
        <Box>
          <Text fw={700}>{APPEARANCE_COPY.sizeTitle}</Text>
          <Text size="sm" c="dimmed">
            {APPEARANCE_COPY.description}
          </Text>
        </Box>
        <TextSizePicker
          value={textSize}
          pending={save.isPending ? (save.variables ?? null) : null}
          onPick={(size) => save.mutate(size)}
        />
        <Paper withBorder={false} bg="var(--mantine-color-default-hover)" radius="sm" p="sm">
          <Text>{APPEARANCE_COPY.sample}</Text>
        </Paper>
      </Stack>
    </Paper>
  );
}
