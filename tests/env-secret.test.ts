import { describe, expect, it } from 'bun:test';
import { assertSecretStrength, MIN_PROD_SECRET_LENGTH } from '../server/env-secret';

const randomSecret = () =>
  Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');

describe('assertSecretStrength', () => {
  it('rejects the change-me placeholder in production', () => {
    expect(() => assertSecretStrength('change-me-x', true)).toThrow('masih nilai contoh');
  });

  it('rejects a placeholder even when it is long enough', () => {
    expect(() => assertSecretStrength(`change-me-${'a'.repeat(40)}`, true)).toThrow('nilai contoh');
  });

  it('rejects secrets shorter than the minimum in production', () => {
    const short = 'a'.repeat(MIN_PROD_SECRET_LENGTH - 1);
    expect(() => assertSecretStrength(short, true)).toThrow('terlalu pendek');
  });

  it('accepts a random 32+ character secret in production', () => {
    expect(() => assertSecretStrength(randomSecret(), true)).not.toThrow();
    expect(() => assertSecretStrength('a'.repeat(MIN_PROD_SECRET_LENGTH), true)).not.toThrow();
  });

  it('accepts a 1-character secret outside production', () => {
    expect(() => assertSecretStrength('x', false)).not.toThrow();
    expect(() => assertSecretStrength('change-me-x', false)).not.toThrow();
  });
});
