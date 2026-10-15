/** Server-only: applies validated env overrides on top of the pure `METRICS` defaults (R03 §3.5). */

import { logger } from '../logger';
import { METRICS } from '../metrics/config';
import { isoDateIn } from '../metrics/dates';
import type { MetricsConfig } from '../metrics/types';

// Upper bound for day-count overrides: a typo like 3000000 must not silently disable a rule.
const MAX_DAYS = 3650;

const knownZone = (v: string) => {
  try {
    isoDateIn(new Date(0), v);
    return true;
  } catch {
    // An unknown IANA zone makes Intl throw; that is the "invalid" answer, reported by the caller.
    return false;
  }
};
const ratio = (v: string) => /^\d*\.?\d+$/.test(v) && Number(v) <= 1;
const days = (v: string) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= MAX_DAYS;

const RULES: ReadonlyArray<[env: string, key: keyof MetricsConfig, ok: (v: string) => boolean]> = [
  ['APP_TIME_ZONE', 'TIME_ZONE', knownZone],
  ['PROJECT_AT_RISK_OVERDUE_RATIO', 'AT_RISK_OVERDUE_RATIO', ratio],
  ['TASK_STALE_DAYS', 'TASK_STALE_DAYS', days],
  ['TRASH_RETENTION_DAYS', 'TRASH_RETENTION_DAYS', days],
];

/** `METRICS` with env overrides applied; an invalid value falls back to the default and warns by name only. */
export function resolveMetrics(
  source: Record<string, string | undefined> = process.env,
): MetricsConfig {
  const out: Record<string, unknown> = { ...METRICS };
  for (const [name, key, ok] of RULES) {
    const raw = source[name]?.trim();
    if (!raw) continue; // empty means unset, like server/env.ts
    if (!ok(raw)) {
      // The raw value is left out of the log on purpose: it may be a mistyped secret.
      logger.warn({ variable: name }, 'invalid metrics override ignored; using default');
      continue;
    }
    out[key] = key === 'TIME_ZONE' ? raw : Number(raw);
  }
  return Object.freeze(out) as unknown as MetricsConfig;
}

let cached: MetricsConfig | undefined;

/** Process-wide metrics config, resolved from the environment on first use. */
export function getMetrics(): MetricsConfig {
  cached ??= resolveMetrics();
  return cached;
}
