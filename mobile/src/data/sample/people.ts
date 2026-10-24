// Sample people from the prototype (riset-keano/prototype-react/src/data/sample.js), fictional names only.

/** The three prototype roles: Member, Project Manager, Admin. */
export type Role = 'member' | 'pm' | 'admin';

export type Person = { name: string; full: string; title: string; division: string };

export const PEOPLE = {
  nico: { name: 'Nico', full: 'Nico Pratama', title: 'Project Manager', division: 'Product' },
  rina: { name: 'Rina', full: 'Rina Wulandari', title: 'UI Designer', division: 'Product' },
  dodi: { name: 'Dodi', full: 'Dodi Hartono', title: 'Backend Developer', division: 'Engineering' },
  sri: { name: 'Sri', full: 'Sri Rahayu', title: 'QA Analyst', division: 'Product' },
  ayu: { name: 'Ayu', full: 'Ayu Lestari', title: 'Operations Lead', division: 'Operations' },
  lea: { name: 'Lea', full: 'Lea Santoso', title: 'Account Manager', division: 'Sales' },
} as const satisfies Record<string, Person>;

/** Who is signed in for each role. */
export const ME_BY_ROLE: Record<Role, keyof typeof PEOPLE> = {
  member: 'dodi',
  pm: 'nico',
  admin: 'ayu',
};
