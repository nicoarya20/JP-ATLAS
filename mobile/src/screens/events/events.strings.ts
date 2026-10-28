/* Every word the Events screens show, in English like the prototype (riset-keano/prototype-react/src/screens/events). */

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

export const LIST = {
  title: 'Events',
  search: 'Search event title…',
  views: ['List', 'Calendar'],
  noMatch: 'No events match these filters.',
  emptyTitle: 'No events yet',
  emptyText: 'Meetings or events you attend will show up here.',
  newEvent: 'New event',
  loadMore: 'Load more',
} as const;

export const CALENDAR = {
  views: ['Month', 'Week'],
  previous: (unit: string) => `Previous ${unit}`,
  next: (unit: string) => `Next ${unit}`,
  agendaHead: (date: string, n: number) => `${date} · ${plural(n, 'event')}`,
  noEvents: 'No events on this day.',
} as const;

export const FILTER = {
  show: 'Show',
  type: 'Event type',
  project: 'Project',
  group: 'Group by',
  allProjects: 'All projects',
  /** A project the filter holds that the viewer's project list does not (yet) name. */
  pickedProject: 'Picked project',
} as const;

export const DETAIL = {
  title: 'Event detail',
  actions: 'Event actions',
  cancel: 'Cancel event',
  trash: 'Move to Trash',
  edit: 'Edit',
  time: 'Time',
  location: 'Location',
  link: 'Meeting link',
  linkFailed: "Couldn't open the meeting link. Copy it from the event instead.",
  project: 'Project',
  reminder: 'Reminder',
  attendees: (n: number) => `Attendees (${n})`,
  creator: 'Creator',
  agenda: 'Agenda',
  noAgenda: 'No agenda yet',
  minutes: 'Minutes',
  noMinutes: 'No minutes yet.',
  canceled: 'Canceled',
  canceledBy: (by: string) => `Canceled by ${by}`,
  missingTitle: 'Event not found',
  missingText: 'Go back to Events and pick another one.',
} as const;

export const SHEETS = {
  cancelTitle: 'Cancel event?',
  cancelLead: (attendees: string) =>
    `The event stays visible, marked Canceled. All attendees (${attendees}) are notified.`,
  reason: 'Reason',
  reasonPlaceholder: "Why isn't it happening?",
  reasonNote: "The reason shows in the event detail and in the attendees' notifications.",
  replacement: 'Also create a replacement event',
  back: 'Back',
  cancelEvent: 'Cancel event',
  canceled: 'Event canceled',
  trashed: 'Event moved to Trash',
  undo: 'Undo',
  restored: 'Event restored',
} as const;

export const FORM = {
  newTitle: 'New event',
  editTitle: 'Edit event',
  title: 'Title',
  titlePlaceholder: 'What is the meeting about?',
  date: 'Date',
  start: 'Start',
  end: 'End',
  timeError: 'The end time must be after the start time.',
  endsOn: (date: string) => `Ends on ${date}.`,
  location: 'Location',
  locationHint: 'Online: paste the meeting link (Google Meet / Zoom).',
  link: 'Meeting link',
  linkError: 'Start the link with http:// or https://.',
  place: 'Place',
  attendees: 'Attendees · picked from team members',
  remove: (name: string) => `Remove ${name}`,
  addPerson: 'Add person',
  findPerson: 'Search by name…',
  add: 'Add',
  addGuest: (name: string) => `Add ${name}`,
  nobodyFound: 'No one found with that name.',
  nobodyLeft: 'Everyone is already invited.',
  removeTitle: (n: number) => (n === 1 ? 'Remove guest?' : `Remove ${n} guests?`),
  removeMessage: (names: string) =>
    `${names} will be taken off the guest list and stop getting its reminders.`,
  removeConfirm: 'Remove and save',
  type: 'Event type',
  project: 'Project',
  projectHint: 'Without a project, only its guests see the event.',
  projectLocked: "An event can't move to another project.",
  agenda: 'Agenda · one item per line',
  reminder: 'Reminder',
  minutesNote: 'Attendees get reminders automatically.',
  autoSet: (reminder: string) => `Set automatically: reminder ${reminder}`,
  more: 'Add more details',
  less: 'Hide details',
  cancel: 'Cancel',
  save: 'Save',
  saved: 'Event saved',
  updated: 'Event updated',
} as const;
