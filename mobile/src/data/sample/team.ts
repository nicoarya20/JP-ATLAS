// Team rows of the prototype (sample.js `team.list`): the role line and extra line per person.

export type TeamEntry = {
  key: 'nico' | 'rina' | 'dodi';
  role: string;
  extra?: string;
};

export const TEAM_LIST: readonly TeamEntry[] = [
  { key: 'nico', role: 'Manager · Atlas Project (Lead)' },
  { key: 'rina', role: 'Member · Atlas Project', extra: 'Also on other projects' },
  { key: 'dodi', role: 'Member · Atlas Project' },
];
