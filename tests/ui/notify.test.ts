import { afterEach, describe, expect, it, spyOn } from 'bun:test';
import { notifications } from '@mantine/notifications';
import { ERROR_SECONDS, FALLBACK_ERROR, notify } from '../../app/components/ui/notify';

describe('notify.fail', () => {
  afterEach(() => spyOn(notifications, 'show').mockRestore());

  it('shows the Error message as a danger toast with the error duration', () => {
    const show = spyOn(notifications, 'show').mockImplementation(() => 'id');
    notify.fail('Gagal menyimpan', new Error('Email sudah dipakai.'));
    expect(show).toHaveBeenCalledWith({
      color: 'danger',
      title: 'Gagal menyimpan',
      message: 'Email sudah dipakai.',
      autoClose: ERROR_SECONDS * 1000,
    });
  });

  it('falls back to the generic message when the failure is not an Error', () => {
    const show = spyOn(notifications, 'show').mockImplementation(() => 'id');
    notify.fail('Gagal menyimpan', 'boom');
    notify.fail('Gagal menyimpan', undefined);
    expect(show.mock.calls.map((c) => (c[0] as { message: string }).message)).toEqual([
      FALLBACK_ERROR,
      FALLBACK_ERROR,
    ]);
  });
});
