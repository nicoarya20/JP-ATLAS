/**
 * `GET /api/app/whoami`: who is calling and what the app as a whole lets them do (`server/api/app-whoami.ts`).
 *
 * `caps` are app-wide (may this person start a project at all), so they are asked once and kept for the
 * session; per-record permissions stay in each record's `can{}`. Until the answer is in, a control that
 * depends on it stays hidden: `appCaps()` is null, never a guessed `false` or `true`.
 */
import { apiGet } from '@/api/client';

import { resource } from './resource';

export type AppCapsWire = {
  createProject: boolean;
  createEvent: boolean;
  dashboard: boolean;
  dev: boolean;
};

export type WhoamiWire = { userId: string; name: string; role: string; caps: AppCapsWire };

export const whoamiResource = resource<WhoamiWire>('whoami', () =>
  apiGet<WhoamiWire>('/api/app/whoami'),
);

/** The caller's app capabilities, or null while they are not in. */
export const appCaps = (): AppCapsWire | null => whoamiResource.current()?.caps ?? null;

/** Same, in a component. */
export const useAppCaps = (): AppCapsWire | null => whoamiResource.use().data?.caps ?? null;
