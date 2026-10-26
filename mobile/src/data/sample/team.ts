// Team rows of the prototype (sample.js `team.list`): the role line, status and extra line per person.

export type TeamEntry = {
  key: 'nico' | 'rina' | 'dodi';
  role: string;
  /** "Available", or a leave note. */
  status: string;
  extra?: string;
};

export const TEAM_LIST: readonly TeamEntry[] = [
  { key: 'nico', role: 'Manager · Atlas Project (Lead)', status: 'Available' },
  {
    key: 'rina',
    role: 'Member · Atlas Project',
    status: 'Available',
    extra: 'Also on other projects',
  },
  { key: 'dodi', role: 'Member · Atlas Project', status: 'Leave planned Oct 12–14' },
];

/** Status of everyone without a team row. */
export const AVAILABLE = 'Available';
