// Copy of the Team screens, verbatim from the prototype (team.list.jsx, team.person.jsx).

export const TEAM = {
  title: 'Team',
  intro: "Who's on your team and what they're working on",
  project: 'All projects',
  projectNotice: 'Pick a project',
  sort: 'Sort: Name',
  sortNotice: 'Name · Overdue · Active tasks',
  search: 'Search name…',
  noMatch: 'No one matches this search.',
  you: '(You)',
  view: 'View',
  active: (n: number) => `${n} active`,
  overdue: (n: number) => `${n} overdue`,
} as const;

/** A row's name for screen readers: every line it shows, in order ("Rina Wulandari, Designer, Available, 3 active"). */
export const rowLabel = (parts: readonly (string | false | undefined)[]) =>
  parts.filter(Boolean).join(', ');

export const TEAM_EMPTY = {
  icon: 'No team',
  title: 'No team yet',
  text: "You haven't joined any project yet. Your team will show up once a Manager adds you to a project.",
} as const;

export const PERSON = {
  title: 'Team member',
  facts: { job: 'Job title', division: 'Division', email: 'Email', role: 'Account role' },
  noProjects: 'No shared projects.',
  tasks: 'Active tasks',
  load: (active: number, overdue: number) => `${active} active · ${overdue} overdue`,
  noTasks: 'No active tasks.',
  hiddenTasks: "Other people's task lists are visible only to the project Manager and Admin.",
  hiddenProjects: (name: string, projects: readonly string[]) =>
    `${name} also works on ${projects.join(', ')}. Details are visible only to that project's Manager and Admin.`,
  missingTitle: 'Person not found',
  missingText: 'This person is not on the team list.',
} as const;
