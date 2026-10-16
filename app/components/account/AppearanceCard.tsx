import { Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { TextSize } from '@server/pm/enums';
import { textSizeCookie } from '@server/text-size';
import { useMutation } from '@tanstack/react-query';
import { useRevalidator } from 'react-router';
import { notifyError } from '~/lib/notify';
import { patchMyProfile } from '~/lib/profile-api';
import { SettingsCard } from '../settings/SettingsParts';
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
    onError: (err) => notifyError(APPEARANCE_COPY.saveFailed, err),
  });

  return (
    <SettingsCard title={APPEARANCE_COPY.title} description={APPEARANCE_COPY.description}>
      <TextSizePicker
        value={textSize}
        pending={save.isPending ? (save.variables ?? null) : null}
        onPick={(size) => save.mutate(size)}
      />
      <Text>{APPEARANCE_COPY.sample}</Text>
    </SettingsCard>
  );
}
