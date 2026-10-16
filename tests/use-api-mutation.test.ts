import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { notify } from '../app/components/ui/notify';
import { ApiError } from '../app/lib/http';
import { runMutation } from '../app/lib/use-api-mutation';

let success: ReturnType<typeof spyOn<typeof notify, 'success'>>;
let failure: ReturnType<typeof spyOn<typeof notify, 'error'>>;

beforeEach(() => {
  success = spyOn(notify, 'success').mockImplementation(() => {});
  failure = spyOn(notify, 'error').mockImplementation(() => {});
});
afterEach(() => {
  success.mockRestore();
  failure.mockRestore();
});

describe('runMutation', () => {
  it('toggles loading around the call and toasts the success message', async () => {
    const states: boolean[] = [];
    const onSuccess: string[] = [];
    const result = await runMutation(
      {
        mutationFn: async (n: number) => n * 2,
        successMessage: (data, vars) => `Hasil ${data} dari ${vars}`,
        errorTitle: 'Gagal menyimpan',
        onSuccess: (data) => {
          onSuccess.push(String(data));
        },
      },
      21,
      (v) => states.push(v),
    );
    expect(result).toEqual({ ok: true, data: 42 });
    expect(states).toEqual([true, false]);
    expect(success).toHaveBeenCalledWith('Hasil 42 dari 21');
    expect(onSuccess).toEqual(['42']);
    expect(failure).not.toHaveBeenCalled();
  });

  it('stays silent on success when no message is given', async () => {
    await runMutation({ mutationFn: async () => 1, errorTitle: 'x' }, undefined, () => {});
    expect(success).not.toHaveBeenCalled();
  });

  it('shows an actionable error toast and never throws', async () => {
    const states: boolean[] = [];
    const seen: unknown[] = [];
    const error = new ApiError({ status: 409, message: 'Tugas sudah diubah orang lain.' });
    const result = await runMutation(
      {
        mutationFn: async () => {
          throw error;
        },
        successMessage: 'Tersimpan',
        errorTitle: 'Gagal menyimpan',
        onError: (e) => seen.push(e),
      },
      undefined,
      (v) => states.push(v),
    );
    expect(result).toEqual({ ok: false, error });
    expect(states).toEqual([true, false]);
    expect(failure).toHaveBeenCalledWith('Gagal menyimpan', 'Tugas sudah diubah orang lain.');
    expect(success).not.toHaveBeenCalled();
    expect(seen).toEqual([error]);
  });

  it('turns a network failure into a connection hint', async () => {
    await runMutation(
      {
        mutationFn: async () => {
          throw new TypeError('Failed to fetch');
        },
        errorTitle: 'Gagal mengirim',
      },
      undefined,
      () => {},
    );
    expect(failure.mock.calls[0]?.[1]).toContain('koneksi internet');
  });

  it('does not flash an error toast for a 401 (the page is already leaving for login)', async () => {
    const result = await runMutation(
      {
        mutationFn: async () => {
          throw new ApiError({ status: 401 });
        },
        errorTitle: 'Gagal',
      },
      undefined,
      () => {},
    );
    expect(result.ok).toBe(false);
    expect(failure).not.toHaveBeenCalled();
  });
});
