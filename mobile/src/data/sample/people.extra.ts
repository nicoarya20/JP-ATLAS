// Email and account role per sample person (prototype sample.js `people[].email/role`), next to PEOPLE in people.ts.
import type { PEOPLE } from './people';

/** Account role an Admin gives a person (Users › Roles). */
export type AccountRole = 'Member' | 'Project Manager' | 'Admin';

export const PEOPLE_ACCOUNT = {
  nico: { email: 'nico@kantor.id', role: 'Project Manager' },
  rina: { email: 'rina@kantor.id', role: 'Member' },
  dodi: { email: 'dodi@kantor.id', role: 'Member' },
  sri: { email: 'sri@email.com', role: 'Member' },
  ayu: { email: 'ayu@email.com', role: 'Admin' },
  lea: { email: 'lea@kantor.id', role: 'Project Manager' },
} as const satisfies Record<keyof typeof PEOPLE, { email: string; role: AccountRole }>;
