// My own profile as `GET /api/app/profile` sends it (`server/profile/profile.dto.ts`): Nico, the seeded session user,
// shown by the display name "Nico". test-only
import type { ProfileWire } from '@/data/profile.api';

import type { AuthRoutes } from './auth-server';

export const profileWire = (over: Partial<ProfileWire> = {}): ProfileWire => ({
  userId: 'u-nico',
  name: 'Nico Arya',
  email: 'nico@kantor.id',
  displayName: 'Nico',
  nickname: null,
  phone: null,
  jobTitle: 'Designer',
  department: 'Product',
  textSize: 'normal',
  ...over,
});

/** A serveAuth route answering the profile, to spread into a test's routes. */
export const profileRoute = (over: Partial<ProfileWire> = {}): AuthRoutes => ({
  '/api/app/profile': { body: profileWire(over) },
});
