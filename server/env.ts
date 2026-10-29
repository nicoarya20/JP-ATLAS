import { z } from 'zod';
import { parseEmailDomains } from './account/signup-gate';
import { assertSecretStrength } from './env-secret';
import { invalidProxyEntries, splitProxyList } from './middleware/trusted-proxy';
import { buildMobileTrustedOrigins, invalidOriginEntries, splitOriginList } from './mobile-origins';
import { buildWebAllowedHosts } from './web-origins';

/** Extra origins the mobile app reaches the server as (LAN IP, tunnel, staging). Empty = none. */
export const MobileTrustedOriginsSchema = z
  .string()
  .default('')
  .transform(splitOriginList)
  .superRefine((entries, ctx) => {
    for (const bad of invalidOriginEntries(entries)) {
      ctx.addIssue({ code: 'custom', message: `Bukan origin yang valid: "${bad}"` });
    }
  });

/** Reverse proxies whose X-Forwarded-For is honoured (IPs/CIDRs). Empty = trust none. */
export const TrustedProxiesSchema = z
  .string()
  .default('')
  .transform(splitProxyList)
  .superRefine((entries, ctx) => {
    for (const bad of invalidProxyEntries(entries)) {
      ctx.addIssue({ code: 'custom', message: `Bukan IP/CIDR yang valid: "${bad}"` });
    }
  });

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().url(),
  DATABASE_URL_TEST: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
  // Google OAuth (optional — social login is enabled only when both are set).
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Comma-separated emails granted super-admin (env is the source of truth).
  SUPER_ADMIN_EMAILS: z.string().optional(),
  // Comma-separated email domains allowed to sign in (e.g. kantor.id). Empty = every domain (KEPUTUSAN Q2).
  ALLOWED_EMAIL_DOMAINS: z.string().optional(),
  // MCP debug server — if not set, /api/mcp returns 503.
  // Generate: openssl rand -hex 32
  MCP_ADMIN_TOKEN: z.string().min(32).optional(),
  // API rate limit per client IP (sliding window). Auth + MCP routes are excluded.
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  TRUSTED_PROXIES: TrustedProxiesSchema,
  MOBILE_TRUSTED_ORIGINS: MobileTrustedOriginsSchema,
});

// `KEY=` in .env arrives as "", which `.optional()` would reject — treat it as unset.
const parsed = EnvSchema.safeParse(
  Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== '')),
);

if (!parsed.success) {
  console.error('\u274c Invalid environment variables:');
  console.error(z.treeifyError(parsed.error));
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
// Fail at boot rather than sign sessions with a guessable secret.
assertSecretStrength(env.BETTER_AUTH_SECRET, isProd);
export const hasGoogleAuth = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

/** Normalized set of super-admin emails (lowercased, de-duped, blanks dropped). */
export const superAdminEmails: ReadonlySet<string> = new Set(
  (env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

/** Lower-cased set of email domains allowed to sign up; empty means any domain. */
export const allowedEmailDomains: ReadonlySet<string> = parseEmailDomains(
  env.ALLOWED_EMAIL_DOMAINS,
);

/** Origins Better Auth trusts for the mobile app: its deep-link scheme plus MOBILE_TRUSTED_ORIGINS. */
export const mobileTrustedOrigins: readonly string[] = buildMobileTrustedOrigins(
  env.MOBILE_TRUSTED_ORIGINS,
);

/**
 * Hosts Better Auth accepts as the web request origin (its dynamic `baseURL.allowedHosts`):
 * loopback on any port plus the canonical public host from APP_URL / BETTER_AUTH_URL. Lets login
 * work from localhost:3005, :4007 and the deployed domain without editing .env per switch.
 */
export const webAllowedHosts: readonly string[] = buildWebAllowedHosts([
  env.APP_URL,
  env.BETTER_AUTH_URL,
]);
