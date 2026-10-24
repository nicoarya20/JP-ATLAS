/* Every word the Events screens show, in English like the prototype (riset-keano/prototype-react/src/screens/events). */

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;

export const LIST = {
  title: 'Events',
  search: 'Search title or location…',
  views: ['List', 'Calendar'],
  viewResults: 'View results',
  checkResults: 'Check results',
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
  repeats: 'Repeats',
  time: 'Time',
  location: 'Location',
  project: 'Project',
  repeat: 'Repeat',
  reminder: 'Reminder',
  reminderValue: '1 day & 30 min before',
  attendees: (n: number) => `Attendees (${n})`,
  creator: 'Creator',
  noteTaker: 'Note-taker',
  agenda: 'Agenda',
  noAgenda: 'No agenda yet',
  minutes: 'Minutes',
  noneYet: 'None yet',
  minutesLead: (start: string) =>
    `Type and Photo work anytime. Voice is active from the start time (${start}) until the meeting ends.`,
  type: 'Type',
  photo: 'Photo',
  photoNotice: 'Take a photo of the whiteboard or notes',
  voice: (start: string) => `Voice · from ${start}`,
  aiNote: ' = AI-assisted. The result is a text draft you can edit first.',
  canceledBy: (by: string) => `Canceled by ${by}`,
  canceledOnce: 'Only this occurrence; the next ones continue.',
  youCreated: 'You created this event',
  asAdmin: 'You can change this event as an Admin',
  memberAccess: (creator: string) =>
    `Only the creator (${creator}), the project manager or an Admin can change this event.`,
  createdBy: (creator: string) => `Created by ${creator}`,
  updated: (date: string) => `Updated ${date}`,
  by: (name: string) => `by ${name}`,
  missingTitle: 'Event not found',
  missingText: 'Go back to Events and pick another one.',
} as const;

export const AI_LABEL = 'AI-assisted';

export const SHEETS = {
  cancelTitle: 'Cancel event?',
  cancelRecurringTitle: 'Cancel recurring event?',
  cancelLead: (attendees: string) =>
    `The event stays visible, marked Canceled. All attendees (${attendees}) are notified.`,
  reason: 'Reason',
  reasonPlaceholder: "Why isn't it happening?",
  reasonNote: "The reason shows in the event detail and in the attendees' notifications.",
  replacement: 'Also create a replacement event',
  back: 'Back',
  cancelEvent: 'Cancel event',
  canceled: 'Event canceled',
  which: 'Which one?',
  cancelWhich: [
    ['Only this one', 'Other occurrences continue'],
    ['All recurring', 'This occurrence and the following ones'],
  ],
  archiveTitle: 'Archive event?',
  archiveRecurringTitle: 'Archive recurring event?',
  archiveLead:
    'The event moves to Archive and can be restored anytime. Minutes and meeting outcomes move with it. Tasks already created from the outcomes are not deleted.',
  archiveHintBefore: 'Meeting not happening? Use ',
  archiveHintLink: 'Cancel',
  archiveHintAfter: ' so attendees know why.',
  archiveWhich: [
    ['Only this one', 'Moves to Archive, other occurrences stay'],
    ['All recurring', 'Whole series moves to Archive as one item'],
  ],
  cancel: 'Cancel',
  moveToArchive: 'Move to Archive',
  archived: 'Event moved to Archive',
  undo: 'Undo',
  restored: 'Event restored',
  goneForever: "This event was deleted forever and can't be restored.",
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
  addPerson: 'Add person',
  type: 'Event type',
  project: 'Project',
  projectHint: 'Meeting outcomes become tasks in this project.',
  agenda: 'Agenda · one item per line',
  repeat: 'Repeat',
  reminder: 'Reminder',
  reminderValue: '1 day & 30 min before',
  reminderNotice: 'Pick reminder times',
  minutesNote:
    'Minutes are written during or after the meeting, from the event detail. Attendees get reminders automatically.',
  autoSet: (repeat: string) =>
    `Set automatically: reminder 1 day & 30 minutes before · ${repeat ? `repeats ${repeat}` : 'does not repeat'}`,
  more: 'Add more details',
  less: 'Hide details',
  cancel: 'Cancel',
  save: 'Save',
  saved: 'Event saved',
  updated: 'Event updated',
} as const;
