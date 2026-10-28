// Copy of the Team screens (prototype team.list.jsx, team.person.jsx); every line about a person is built from what the
// server sent.

export const TEAM = {
  title: 'Team',
  intro: "Who's on your team and what they're working on",
  search: 'Search name…',
  sort: 'Sort',
  sorts: { name: 'Name', active: 'Active tasks', overdue: 'Overdue' },
  noMatch: 'No one matches this search.',
  you: '(You)',
  view: 'View',
  loadMore: 'Load more',
  shown: (n: number, total: number) => `Showing ${n} of ${total}`,
  active: (n: number) => `${n} active`,
  overdue: (n: number) => `${n} overdue`,
} as const;

/** A row's name for screen readers: every line it shows, in order ("Rina Wulandari, Designer, 3 active"). */
export const rowLabel = (parts: readonly (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(', ');

export const TEAM_EMPTY = {
  icon: 'No team',
  title: 'No team yet',
  text: "You haven't joined any project yet. Your team will show up once a Manager adds you to a project.",
} as const;

export const PERSON = {
  title: 'Team member',
  noProjects: 'No shared projects.',
  tasks: 'Active tasks',
  load: (active: number, overdue: number) => `${active} active · ${overdue} overdue`,
  noTasks: 'No active tasks.',
  capped: (n: number, total: number) => `Showing the ${n} most urgent of ${total} active tasks.`,
  hiddenTasks: "Other people's task lists are visible only to the project Manager and Admin.",
  // The server does not name the other projects (privacy D10), so neither does this.
  elsewhere: (name: string) =>
    `${name} also works on other projects. Details are visible only to those projects' Manager and Admin.`,
  missingTitle: 'Person not found',
} as const;
