/** Client helper for PATCH /api/app/profile: request shape and the actionable error message. */
import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { patchMyProfile, putNotificationPrefs } from '../app/lib/profile-api';

const fetchSpy = spyOn(globalThis, 'fetch');
afterEach(() => fetchSpy.mockReset());
const reply = (status: number, body: unknown) =>
  fetchSpy.mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('patchMyProfile', () => {
  test('sends a JSON PATCH with only the given fields and returns the profile', async () => {
    reply(200, { textSize: 'besar' });
    const out = await patchMyProfile({ textSize: 'besar' });
    expect(out).toEqual({ textSize: 'besar' } as never);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/app/profile');
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe('{"textSize":"besar"}');
  });

  test('throws the server message on failure', async () => {
    reply(422, { error: 'Isian belum sesuai.' });
    await expect(patchMyProfile({ phone: 'x' })).rejects.toThrow('Isian belum sesuai.');
  });

  test('falls back to a generic Indonesian message when the body is not JSON', async () => {
    fetchSpy.mockResolvedValue(new Response('boom', { status: 502 }));
    await expect(patchMyProfile({})).rejects.toThrow('Gagal menyimpan profil (502). Coba lagi.');
  });
});

describe('putNotificationPrefs', () => {
  test('sends a JSON PUT with only the flipped switch and returns both switches', async () => {
    reply(200, { eventReminder: true, inboxNews: false });
    const out = await putNotificationPrefs({ inboxNews: false });
    expect(out).toEqual({ eventReminder: true, inboxNews: false });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/app/profile/notifications');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe('{"inboxNews":false}');
  });

  test('throws the server message, or an Indonesian fallback when the body is not JSON', async () => {
    reply(429, { error: 'Terlalu banyak permintaan. Coba lagi sebentar.' });
    await expect(putNotificationPrefs({ eventReminder: false })).rejects.toThrow(
      'Terlalu banyak permintaan. Coba lagi sebentar.',
    );
    fetchSpy.mockResolvedValue(new Response('boom', { status: 502 }));
    await expect(putNotificationPrefs({})).rejects.toThrow(
      'Gagal menyimpan pemberitahuan (502). Coba lagi.',
    );
  });
});
