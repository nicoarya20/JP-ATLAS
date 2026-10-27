/* Every word the Projects screens show, in English like the prototype (riset-keano/prototype-react/src/screens/projects). */

export const LIST = {
  title: 'Projects',
  // The server matches the name only (GAP A-6), so the placeholder promises only that.
  search: 'Search project name…',
  lead: (name: string) => `Lead: ${name}`,
  due: (date: string) => `Due ${date}`,
  progress: (name: string) => `Progress of ${name}`,
  empty: "You're not in any project yet.",
  noMatch: 'No projects match these filters.',
} as const;

export const FILTER = { status: 'Status', attention: 'Attention', sort: 'Sort by' } as const;

export const DETAIL = {
  actions: 'Project actions',
  edit: 'Edit project',
  settings: 'Project settings',
  archive: 'Move to Archive',
  inArchive: 'This project is in Archive.',
  why: (why: string) => `Why: ${why}`,
  leadDue: (lead: string, due: string) => `Lead: ${lead} · Due: ${due}`,
  extend: 'Extend deadline',
  tabs: ['Overview', 'Tasks', 'Phases', 'Members'],
  missingTitle: 'Project not found',
  missingText: 'It may have been moved to Archive or deleted.',
} as const;

export const OVERVIEW = {
  progress: 'Progress',
  tasksDone: 'Tasks done',
  elapsed: 'Time elapsed',
  phases: 'Phases & next milestone',
  allPhases: 'See all phases →',
  attention: 'Tasks needing attention',
  activity: 'Recent activity',
  noPhases: 'No phases yet.',
  noAttention: 'No tasks need attention.',
  noActivity: 'No activity yet.',
  percent: (n: number) => `${n}%`,
} as const;

export const TASKS_TAB = {
  views: ['List', 'Kanban'],
  newTask: '+ New task',
  noMatch: 'No tasks match these filters.',
} as const;

export const PHASES = {
  addPhase: '+ Phase',
  addPhaseNotice: 'Add phase',
  milestone: 'Milestone',
  addMilestone: '+ Milestone',
  addMilestoneNotice: 'Add milestone',
  noProgress: 'No progress yet',
  history: 'Deadline history',
  none: 'No phases yet.',
} as const;

export const MEMBERS = {
  add: '+ Member',
  addNotice: 'Pick a member',
  you: '(You)',
  lead: 'Lead',
  role: (name: string) => `Project role of ${name}`,
  remove: 'Remove',
  removeLabel: (name: string) => `Remove ${name}`,
  onlyManager: (lead: string) =>
    `${lead} is the only Manager, so they can't be removed. Add a second Manager so their tasks can be reviewed by someone else.`,
  rolesTitle: 'What roles mean',
  roles: [
    ['Manager', 'edit the project, phases, members, deadline, and review tasks'],
    ['Member', 'create and work on tasks'],
    ['Viewer', 'view and comment'],
  ],
  removeTitle: (name: string) => `Remove ${name} from the project?`,
  removeMessage: (name: string, project: string) =>
    `${name} loses access to “${project}”. Their tasks stay in the project. Their tasks stay assigned to them.`,
  removeConfirm: 'Remove member',
  removed: 'Member removed',
  roleTitle: (name: string) => `Change ${name}'s role?`,
  roleMessage: (name: string, role: string, project: string) =>
    `${name} becomes ${role} in “${project}”.`,
  roleConfirm: 'Change role',
  roleChanged: 'Role changed',
} as const;

export const EXTEND = {
  title: 'Extend deadline',
  current: 'Current deadline',
  next: 'New deadline',
  after: (date: string) => `New deadline must be after ${date}.`,
  why: 'Why extend?',
  reasons: [
    'Scope increased',
    'Waiting on third party',
    'Estimate was off',
    'Short-staffed',
    'Other',
  ],
  reason: 'Reason',
  impact: 'Impact of change',
  recorded: 'Recorded in Deadline history and Project activity.',
  cancel: 'Cancel',
  save: 'Save',
  saved: 'Deadline extended',
} as const;

export const EDIT = {
  title: 'Edit project',
  name: 'Project name',
  desc: 'Description',
  descPlaceholder: "Briefly describe the project's goal",
  lead: 'Lead (main manager)',
  leadHint: "Only this project's Managers can be Lead. Add a Manager in the Members tab.",
  status: 'Status',
  statusHint: 'Status can move to any other, even from Done back to Active.',
  statuses: ['Draft', 'Active', 'On hold', 'Done', 'Canceled'],
  priority: 'Priority',
  priorities: ['Low', 'Medium', 'High', 'Critical'],
  start: 'Start date',
  deadline: 'Deadline',
  extendNote:
    'Need more time and want the reason on record? Use Extend deadline on the project page.',
  cancel: 'Cancel',
  save: 'Save changes',
  saved: 'Project updated',
} as const;

export const ARCHIVE = {
  title: 'Move project to Archive?',
  lead: (name: string, tasks: string) =>
    `“${name}” and its ${tasks} leave every list and wait in Archive.`,
  box: 'Restore brings the project back with all its tasks. Only an Admin can delete it forever.',
  cancel: 'Cancel',
  confirm: 'Move to Archive',
  moved: 'Project moved to Archive',
  undo: 'Undo',
  restored: 'Project restored',
  goneForever: "This project was deleted forever and can't be restored.",
} as const;

export const CREATE = {
  title: 'New project',
  heading: 'Create a new project',
  lead: 'Choose the easiest way for you.',
  choose: 'Choose',
  recommended: 'Recommended',
  ways: {
    story: {
      title: 'Tell us about the project',
      desc: 'Describe the project like telling a friend. AI drafts the phases and tasks.',
      hint: 'You still review the draft before the project is created.',
    },
    form: {
      title: 'Fill in the form yourself',
      desc: 'Enter the project name, dates, and members one by one.',
      hint: 'Good if you already know the project details.',
    },
    template: {
      title: 'Use a template',
      desc: 'Start from a project structure you made before.',
      hint: 'Good for projects similar to a previous one.',
    },
  },
  cancel: 'Cancel',
  create: 'Create project',
  created: 'Project created',
  ai: 'AI-assisted',
} as const;

export const FORM = {
  title: 'Fill in project form',
  name: 'Project name',
  namePlaceholder: 'e.g. Attendance App',
  desc: 'Description',
  descPlaceholder: "Briefly describe the project's goal",
  lead: 'Lead (main manager)',
  status: 'Initial status',
  statuses: ['Draft', 'Active'],
  statusHint: 'Other statuses can be changed after the project is created.',
  priority: 'Priority',
  start: 'Start date',
  end: 'End date',
  quick: 'Quick pick',
  quickPicks: ['1 wk', '2 wk', '1 mo', '3 mo'],
  members: 'Members & roles',
  memberRole: (name: string) => `Role of ${name}`,
  creatorStays: 'Creator stays Manager',
  addMember: '+ Add member',
  addNotice: 'Pick a member',
  note: 'The creator automatically becomes Manager and Lead. Default task types created: Task, Bug, Idea (can be changed in Project settings).',
} as const;

export const STORY = {
  title: 'Tell us about the project ✦',
  lead: 'Write it like telling a friend. AI will draft the project for you to review.',
  label: 'Your story',
  count: (n: number, max: number) => `${n} / ${max} characters`,
  speak: 'Speak',
  soon: 'Not active yet · coming soon',
  mention: 'To get a good draft, mention:',
  mentions: ["The project's goal", 'When it must be done', 'Who is involved'],
  build: 'Build draft',
} as const;

export const DRAFT = {
  title: 'Review draft',
  banner: 'This is an AI draft. Review it before creating.',
  notYet: 'Not a project yet',
  info: 'Project info',
  edit: 'Edit',
  name: 'Project name',
  desc: 'Description',
  dates: 'Dates',
  priority: 'Priority · Initial status',
  priorityValue: 'Medium · Draft',
  members: 'Members',
  phases: 'Phases, milestones & initial tasks',
  phase: (n: number, name: string) => `${n}. ${name}`,
  milestone: (name: string) => `◆ Milestone: ${name}`,
  type: (title: string) => `Task type of ${title}`,
  types: ['Task', 'Bug', 'Idea'],
  typesNote: 'AI picked the type from Task · Bug · Idea, tap to change. Uncheck to discard.',
  saveTemplate: 'Also save as template',
  saveTemplateSub: "So similar projects don't need the story again.",
  rebuild: 'Rebuild',
} as const;

export const TEMPLATE = {
  title: 'Use template',
  choose: 'Choose template',
  fill: 'Fill in project data',
  name: 'Project name',
  start: 'Start date',
  end: 'Estimated end',
  note: 'Phase and milestone dates are calculated automatically from the start date. The creator automatically becomes Manager and Lead.',
} as const;
