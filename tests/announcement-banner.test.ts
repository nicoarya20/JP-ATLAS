/**
 * AD-05 banner: the per-reader dismissal is remembered against a signature of the announcement's
 * content, so a reader who closed one notice sees the next one. This proves the signature is stable
 * for the same content and changes whenever the text or the tone changes — the "muncul lagi sampai
 * isinya diubah" rule, enforced without a server-side per-reader record.
 */
import { describe, expect, test } from 'bun:test';
import { announcementSignature } from '../app/components/AppFrame';

describe('announcementSignature', () => {
  test('is stable for the same content', () => {
    const a = { text: 'Kantor libur Jumat.', level: 'warn' as const };
    expect(announcementSignature(a)).toBe(announcementSignature({ ...a }));
  });

  test('changes when the text changes', () => {
    expect(announcementSignature({ text: 'Satu', level: 'info' })).not.toBe(
      announcementSignature({ text: 'Dua', level: 'info' }),
    );
  });

  test('changes when only the tone changes, so a re-toned notice reappears', () => {
    const text = 'Rilis baru.';
    expect(announcementSignature({ text, level: 'info' })).not.toBe(
      announcementSignature({ text, level: 'danger' }),
    );
  });

  test('is a short url-safe token, never the raw text', () => {
    const sig = announcementSignature({ text: 'x'.repeat(500), level: 'warn' });
    expect(sig).toMatch(/^[0-9a-z]+$/);
    expect(sig.length).toBeLessThanOrEqual(8);
  });
});
