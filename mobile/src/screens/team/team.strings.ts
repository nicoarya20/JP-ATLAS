// Copy of the Team screens. The prototype's own lines are kept where the server can still back
// them; the lines it cannot (a green "Available", the names of projects you do not share) are gone
// rather than guessed — see mobile/docs/phase2-gap-disembunyikan.md.

export const TEAM = {
  title: 'Team',
  intro: "Who's on your team and what they're working on",
  search: 'Search name…',
  sortLabel: 'Order',
  sorts: ['Name', 'Most active', 'Most overdue'] as const,
  noMatch: 'No one matches this search.',
  you: '(You)',
  view: 'View',
  more: 'Load more',
  moreLabel: (shown: number, total: number) => `Load more, ${shown} of ${total} shown`,
  active: (n: number) => `${n} active`,
  overdue: (n: number) => `${n} overdue`,
} as const;

/** A row's name for screen readers: every line it shows, in order ("Rina Wulandari, Designer, 3 active"). */
export const rowLabel = (parts: readonly (string | false | undefined)[]) =>
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
  capped: (max: number) => `Only the first ${max} are listed.`,
  hiddenTasks: "Other people's task lists are visible only to the project Manager and Admin.",
  missingTitle: 'Person not found',
  missingText: 'This person is not on your team list.',
} as const;
