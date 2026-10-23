/**
 * Shared marks for the Admin preview screens (P11 AD-04..AD-08, AD-14/AD-15, P9 G-02).
 *
 * They exist so the shape of a menu can be read before its task is built: every field sits where
 * it will really sit, filled with sample content, and nothing is saved. The alert and the dead
 * action bar below say so on screen, so a preview is never mistaken for a working form.
 *
 * Filling a preview for real means deleting its file, its line in `settings.previews.tsx`, and
 * its row in `tests/admin-pratinjau.test.ts` — the register can then never drift from the screen.
 */
import { Alert, Badge, Button, Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { FiEye } from 'react-icons/fi';

export const PRATINJAU_COPY = {
  badge: 'Pratinjau',
  title: 'Pratinjau — isinya contoh, belum tersambung',
  /** Said once per screen; `owner` names the task that replaces the preview with the real thing. */
  body: (owner: string) =>
    `Angka dan isian di layar ini adalah contoh untuk membayangkan bentuk akhirnya. Tidak ada yang dibaca dari basis data dan tidak ada yang bisa disimpan. Versi yang berfungsi datang dari tugas ${owner}.`,
  disabledHint: 'Penyimpanan belum ada di pratinjau',
} as const;

/**
 * Yellow strip at the top of every preview screen: sample data, nothing saved, who fills it.
 * `children` replaces the standard sentence where a screen mixes real and sample cards.
 */
export function PratinjauAlert({ owner, children }: { owner: string; children?: ReactNode }) {
  return (
    <Alert
      color="yellow"
      variant="light"
      radius="md"
      icon={<FiEye size="1.25em" aria-hidden />}
      title={PRATINJAU_COPY.title}
    >
      {children ?? PRATINJAU_COPY.body(owner)}
    </Alert>
  );
}

/** Small marker for a single card whose numbers are samples, used on the Beranda widgets. */
export function PratinjauBadge() {
  return (
    <Badge size="sm" variant="light" color="yellow">
      {PRATINJAU_COPY.badge}
    </Badge>
  );
}

/**
 * The save row a real panel would end with. The button is genuinely `disabled` and the reason sits
 * beside it as text rather than in a tooltip, so it is readable by touch and by a screen reader.
 */
export function PratinjauActions({ label }: { label: string }) {
  return (
    <Group justify="flex-end" align="center" wrap="wrap" gap="sm">
      <Text size="sm" c="dimmed">
        {PRATINJAU_COPY.disabledHint}
      </Text>
      <Button disabled>{label}</Button>
    </Group>
  );
}

/**
 * Page frame of a preview panel: the alert, then the cards, then the dead save row.
 * A read-only screen omits `action` and gets no save row — there would be nothing to save.
 */
export function PratinjauPanel({
  owner,
  action,
  children,
}: {
  owner: string;
  /** Label of the save button this screen would really have; omitted on a read-only screen. */
  action?: string;
  children: ReactNode;
}) {
  return (
    <Stack gap="md">
      <PratinjauAlert owner={owner} />
      {children}
      {action ? <PratinjauActions label={action} /> : null}
    </Stack>
  );
}
