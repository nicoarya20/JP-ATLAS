import { Button, Group, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { METRICS } from '@server/metrics/config';
import { createElement, type ReactElement, type ReactNode } from 'react';

// Mantine's polymorphic components reject plain props in a typed `createElement`; this file is .ts, not JSX.
const h = createElement as (
  type: unknown,
  props: Record<string, unknown> | null,
  ...kids: ReactNode[]
) => ReactElement;

export const SUCCESS_SECONDS = 5;
export const ERROR_SECONDS = 8;
export const UNDO_LABEL = 'Urungkan';
export const FALLBACK_ERROR = 'Terjadi kesalahan. Coba lagi.';

const ms = (seconds: number) => seconds * 1000;
// A counter instead of crypto.randomUUID(): that API is missing on plain-http origins.
let undoSeq = 0;

/** Toast helpers with fixed durations: success 5 s, error 8 s, undo for the metrics undo window. */
export const notify = {
  /** Short confirmation that an action went through. */
  success(message: string) {
    notifications.show({ color: 'ok', message, autoClose: ms(SUCCESS_SECONDS) });
  },
  /** Stays longer than success so the reader can act on the message. */
  error(title: string, message: string) {
    notifications.show({ color: 'danger', title, message, autoClose: ms(ERROR_SECONDS) });
  },
  /** Error toast for a caught failure: the Error's message when there is one, else a generic retry hint. */
  fail(title: string, err: unknown) {
    notify.error(title, err instanceof Error ? err.message : FALLBACK_ERROR);
  },
  /** Confirmation with an "Urungkan" button, available for `UNDO_WINDOW_SECONDS` (T1 undo, no dialog). */
  undo(message: string, onUndo: () => void) {
    const id = `undo-${++undoSeq}`;
    notifications.show({
      id,
      color: 'ok',
      autoClose: ms(METRICS.UNDO_WINDOW_SECONDS),
      message: h(
        Group,
        { justify: 'space-between', gap: 'xs' },
        h(Text, { size: 'sm' }, message),
        h(
          Button,
          {
            size: 'xs',
            variant: 'light',
            onClick: () => {
              notifications.hide(id);
              onUndo();
            },
          },
          UNDO_LABEL,
        ),
      ),
    });
  },
};
