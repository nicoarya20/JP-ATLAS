/* Every word the Events screens show, in English like the prototype (riset-keano/prototype-react/src/screens/events). */

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

/** Loading and failure lines, shared by every Events screen (parts/event-state.tsx). */
export const STATE = {
  loading: 'Loading events',
  failedIcon: 'Could not load',
  failedTitle: "Couldn't load events",
  retry: 'Try again',
  goneIcon: 'Event not found',
  goneTitle: 'Event not found',
  goneText: 'It may have been moved to Archive, or you no longer have access to it.',
  loadMore: 'Load more',
  /** The calendar window held more events than one read carries, so the dots undercount. */
  truncated: 'This month has more events than can be shown at once; some days may show fewer dots.',
} as const;

export const LIST = {
  title: 'Events',
  // Title only: the server matches `q` against the title, and filtering locations on the pages
  // already fetched would answer differently from the pages that are not (GAP-A10).
  search: 'Search event title…',
  views: ['List', 'Calendar'],
  noMatch: 'No events match these filters.',
  emptyTitle: 'No events yet',
  emptyText: 'Meetings or events you attend will show up here.',
  newEvent: 'New event',
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
} as const;

export const DETAIL = {
  title: 'Event detail',
  actions: 'Event actions',
  cancel: 'Cancel event',
  archive: 'Move to Archive',
  edit: 'Edit',
  time: 'Time',
  location: 'Location',
  /** Link of an online meeting; shown as its own row so it can be read and copied (B3). */
  link: 'Meeting link',
  project: 'Project',
  personal: 'Personal event',
  reminder: 'Reminder',
  attendees: (n: number) => `Attendees (${n})`,
  creator: 'Creator',
  agenda: 'Agenda',
  noAgenda: 'No agenda yet',
  minutes: 'Minutes',
  noneYet: 'None yet',
  minutesDraft: 'Draft',
  minutesConfirmed: 'Confirmed',
  /** Writing them needs the editor the Outcomes wizard will become; until then they are read-only. */
  minutesReadOnly: 'Minutes can be read here. Writing them is not available in this app yet.',
  canceledBy: (by: string) => (by ? `Canceled by ${by}` : 'Canceled'),
  youCreated: 'You created this event',
  asManager: 'You can change this event',
  guestAccess: (creator: string) =>
    creator
      ? `Only the creator (${creator}), the project manager or an Admin can change this event.`
      : 'Only the creator, the project manager or an Admin can change this event.',
  createdBy: (creator: string) => `Created by ${creator}`,
  updated: (date: string) => `Updated ${date}`,
  by: (name: string) => `by ${name}`,
  missingTitle: 'Event not found',
  missingText: 'Go back to Events and pick another one.',
} as const;

export const AI_LABEL = 'AI-assisted';

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
  canceling: 'Canceling…',
  canceled: 'Event canceled',
  cancelFailed: "Couldn't cancel the event. Try again.",
  archiveTitle: 'Archive event?',
  archiveLead:
    'The event moves to Archive and can be restored anytime. Minutes and meeting outcomes move with it. Tasks already created from the outcomes are not deleted.',
  archiveHintBefore: 'Meeting not happening? Use ',
  archiveHintLink: 'Cancel',
  archiveHintAfter: ' so attendees know why.',
  cancel: 'Cancel',
  moveToArchive: 'Move to Archive',
  archiving: 'Moving…',
  archived: 'Event moved to Archive',
  archiveFailed: "Couldn't move the event to Archive. Try again.",
  undo: 'Undo',
  restored: 'Event restored',
  restoreFailed: "Couldn't restore the event.",
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
  location: 'Location',
  locationHint: 'Online: paste the meeting link (Google Meet / Zoom).',
  link: 'Meeting link',
  place: 'Place',
  attendees: 'Attendees · picked from team members',
  remove: (name: string) => `Remove ${name}`,
  findPerson: 'Find a team member',
  findPersonPlaceholder: 'Type a name…',
  addPerson: 'Add person',
  type: 'Event type',
  project: 'Project',
  noProject: 'No project (personal event)',
  projectHint: 'Meeting outcomes become tasks in this project.',
  agenda: 'Agenda · one item per line',
  minutesNote:
    'Minutes are written during or after the meeting, from the event detail. Attendees get reminders automatically.',
  autoSet: 'Set automatically: reminder 1 day & 30 minutes before',
  more: 'Add more details',
  less: 'Hide details',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving…',
  saved: 'Event saved',
  updated: 'Event updated',
  saveFailed: "Couldn't save the event. Try again.",
} as const;
