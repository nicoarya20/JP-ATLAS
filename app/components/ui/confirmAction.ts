import { Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { createElement, type ReactElement, type ReactNode } from 'react';

// Mantine's polymorphic components reject plain props in a typed `createElement`; this file is .ts, not JSX.
const h = createElement as (
  type: unknown,
  props: Record<string, unknown> | null,
  ...kids: ReactNode[]
) => ReactElement;

export const CANCEL_LABEL = 'Batal';

type ConfirmOptions = {
  /** A question that names the object, e.g. "Hapus tugas 'Desain logo'?". */
  title: string;
  /** One or two sentences on the impact, including whether it can be undone. */
  body: ReactNode;
  /** Verb label for the action button; never "OK". */
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
};

/** Opens the shared confirm dialog on top of `modals.openConfirmModal` (R05 §3.4 #4). */
export function confirmAction({ title, body, confirmLabel, danger, onConfirm }: ConfirmOptions) {
  modals.openConfirmModal({
    title,
    children: typeof body === 'string' ? h(Text, { size: 'sm' }, body) : body,
    labels: { confirm: confirmLabel, cancel: CANCEL_LABEL },
    confirmProps: danger ? { color: 'danger' } : undefined,
    onConfirm,
  });
}
