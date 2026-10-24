// People of the sample data: profile (sample/people.ts) joined with email and account role (sample/people.extra.ts).
// One lookup for Tasks, Team, Users, Settings and Profile; Phase 2 reads these from the API.
import { ME_BY_ROLE, PEOPLE, type Person, type Role } from './sample/people';
import { type AccountRole, PEOPLE_ACCOUNT } from './sample/people.extra';

export type { AccountRole } from './sample/people.extra';
export type PersonKey = keyof typeof PEOPLE;
export type PersonInfo = Person & { key: PersonKey; email: string; role: AccountRole };

/** Short tag after a reviewer's name ("Nico (Manager)"); Members are never reviewers, so they have none. */
export const ROLE_TAG: Partial<Record<AccountRole, string>> = {
  'Project Manager': 'Manager',
  Admin: 'Admin',
};

/** Account role label of each app role. */
export const ROLE_LABEL: Record<Role, AccountRole> = {
  member: 'Member',
  pm: 'Project Manager',
  admin: 'Admin',
};

const KEYS = Object.keys(PEOPLE) as PersonKey[];
const isKey = (k: string): k is PersonKey => k in PEOPLE;
const info = (key: PersonKey): PersonInfo => ({ key, ...PEOPLE[key], ...PEOPLE_ACCOUNT[key] });

/** Everyone, in the sample's order (Nico, Rina, Dodi, Sri, Ayu, Lea). */
export const listPeople = (): PersonInfo[] => KEYS.map(info);

/** Person by key ("rina") or first name ("Rina"); undefined when nobody matches. */
export function person(keyOrName: string): PersonInfo | undefined {
  if (isKey(keyOrName)) return info(keyOrName);
  const key = KEYS.find((k) => PEOPLE[k].name === keyOrName);
  return key && info(key);
}

/** Who is signed in for `role` (Member = Dodi, Project Manager = Nico, Admin = Ayu). */
export const me = (role: Role): PersonInfo => info(ME_BY_ROLE[role]);
