/* Every word the Projects screens show, in English like the prototype (riset-keano/prototype-react/src/screens/projects). */

export const LIST = {
  title: 'Projects',
  search: 'Search project name…',
  lead: (name: string) => `Lead: ${name}`,
  due: (date: string) => `Due ${date}`,
  progress: (name: string) => `Progress of ${name}`,
  empty: "You're not in any project yet.",
  noMatch: 'No projects match these filters.',
  loadMore: 'Load more',
  shown: (n: number, total: number) => `Showing ${n} of ${total}`,
  refreshing: 'Updating the list…',
} as const;

export const FILTER = {
  status: 'Status',
  statusAll: 'All',
  attention: 'Needs attention',
  attentionSub: 'Only active projects that are at risk or off track.',
  sort: 'Sort by',
} as const;

export const DETAIL = {
  actions: 'Project actions',
  edit: 'Edit project',
  settings: 'Project settings',
  trash: 'Move to Trash',
  leadDue: (lead: string, due: string) => `Lead: ${lead} · Due: ${due}`,
  extend: 'Extend deadline',
  tabs: ['Overview', 'Phases', 'Members'],
  missingTitle: 'Project not found',
  missingText: 'It may have been moved to the Trash, or you are not in it.',
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
  milestone: 'Milestones',
  loose: 'Other milestones',
  noProgress: 'No tasks in this phase yet',
  history: 'Deadline history',
  none: 'No phases yet.',
  start: 'Start phase',
  complete: 'Complete phase',
  startLabel: (name: string) => `Start phase ${name}`,
  completeLabel: (name: string) => `Complete phase ${name}`,
  started: 'Phase started',
  completed: 'Phase completed',
} as const;

export const MEMBERS = {
  add: '+ Member',
  addTitle: 'Add a member',
  close: 'Done adding',
  added: (name: string) => `${name} added`,
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
    `${name} loses access to “${project}”. Their tasks stay in the project, still assigned to them.`,
  removeConfirm: 'Remove member',
  selfRemove: "You can't remove yourself. Ask another manager to do it.",
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
  reason: 'Reason',
  reasonHint: (max: number) => `Up to ${max} characters.`,
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
  priority: 'Priority',
  start: 'Start date',
  deadline: 'Deadline',
  extendNote:
    'Need more time and want the reason on record? Use Extend deadline on the project page.',
  cancel: 'Cancel',
  save: 'Save changes',
  saved: 'Project updated',
  noChange: 'Nothing has changed yet.',
  confirmTitle: 'Save these changes?',
  closes: (name: string, status: string) =>
    `“${name}” becomes ${status}: it leaves the active projects and stops counting toward deadlines.`,
  newLead: (lead: string) => `${lead} becomes the Lead and the main manager of the project.`,
} as const;

export const TRASH = {
  title: 'Move project to Trash?',
  lead: (name: string, tasks: number) =>
    tasks === 0
      ? `“${name}” moves to the Trash and leaves every list.`
      : `“${name}” and its ${tasks} ${tasks === 1 ? 'task' : 'tasks'} move to the Trash and leave every list.`,
  box: 'Undo right after, or restore it later from the Trash with all its tasks.',
  cancel: 'Cancel',
  confirm: 'Move to Trash',
  moved: 'Project moved to Trash',
  undo: 'Undo',
  restored: 'Project restored',
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
  statusHint: 'Other statuses can be changed after the project is created.',
  priority: 'Priority',
  start: 'Start date',
  end: 'End date',
  quick: 'Quick pick',
  quickPicks: ['1 wk', '2 wk', '1 mo', '3 mo'],
  members: 'Members & roles',
  memberRole: (name: string) => `Role of ${name}`,
  creatorStays: 'You stay a Manager of the project you create.',
  leadStays: 'The Lead is always a Manager.',
  removeMember: (name: string) => `Remove ${name}`,
  addMember: '+ Add member',
  leadHint: 'The Lead becomes a Manager. Other managers can be added later in the Members tab.',
  note: 'You become a Manager of the project. It starts with the task types Task, Bug and Idea.',
} as const;

/** The people picker of the Members tab and the New project form. */
export const PICKER = {
  search: 'Search people by name…',
  role: 'Joins as',
  none: 'No one to add matches this name.',
  noneYet: 'Everyone is already in the project.',
  add: 'Add',
  addLabel: (name: string) => `Add ${name}`,
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
