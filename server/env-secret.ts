/** Placeholder prefix shipped in old `.env.example` copies; never a valid secret in production. */
const PLACEHOLDER_PREFIX = 'change-me';
/** Shortest auth secret accepted in production (`openssl rand -base64 32` yields 44 chars). */
export const MIN_PROD_SECRET_LENGTH = 32;

/** Throws when `secret` is a placeholder or too short in production; other environments accept any non-empty value. */
export function assertSecretStrength(secret: string, isProd: boolean): void {
  if (!isProd) return;
  if (secret.startsWith(PLACEHOLDER_PREFIX)) {
    throw new Error(
      'BETTER_AUTH_SECRET masih nilai contoh. Buat rahasia acak: openssl rand -base64 32',
    );
  }
  if (secret.length < MIN_PROD_SECRET_LENGTH) {
    throw new Error(
      `BETTER_AUTH_SECRET terlalu pendek (${secret.length} karakter, minimal ${MIN_PROD_SECRET_LENGTH}). Buat rahasia acak: openssl rand -base64 32`,
    );
  }
}
