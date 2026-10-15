/** Shared toast helpers for async admin actions. */
import { notifications } from '@mantine/notifications';

/** Red toast for a failed action; shows the server's Indonesian message when there is one. */
export function notifyError(title: string, err: unknown) {
  notifications.show({
    color: 'red',
    title,
    message: err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.',
  });
}
