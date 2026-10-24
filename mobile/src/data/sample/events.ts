// Sample events from the prototype, in its order (Home's next meeting is the first match); dates as ISO dates.

export type EventStatus = 'Upcoming' | 'Done';

export type SampleEvent = {
  id: string;
  title: string;
  date: string;
  /** Start time label, as the prototype shows it in the time tile. */
  time: string;
  range: string;
  place: string;
  mode: 'In person' | 'Online';
  type: 'Meeting' | 'Review' | 'Important' | 'Team event';
  status: EventStatus;
  canceled?: boolean;
  attendees: string[];
};

export const EVENTS: SampleEvent[] = [
  {
    id: 'kickoff',
    title: 'Atlas kickoff',
    date: '2026-10-01',
    time: '10:00',
    range: '10:00–11:00 AM',
    place: 'Meeting Room 1',
    mode: 'In person',
    type: 'Meeting',
    status: 'Done',
    attendees: ['Nico', 'Rina', 'Dodi', 'Sri'],
  },
  {
    id: 'review',
    title: 'Onboarding design review',
    date: '2026-10-07',
    time: '2:00',
    range: '2:00–3:00 PM',
    place: 'Meeting Room 2',
    mode: 'In person',
    type: 'Review',
    status: 'Upcoming',
    attendees: ['Rina', 'Nico', 'Dodi'],
  },
  {
    id: 'daily',
    title: 'Atlas daily stand-up',
    date: '2026-10-07',
    time: '9:00',
    range: '9:00–9:15 AM',
    place: 'Online',
    mode: 'Online',
    type: 'Meeting',
    status: 'Done',
    attendees: ['Nico', 'Rina', 'Dodi'],
  },
  {
    id: 'sinar',
    title: 'Progress presentation to PT Sinar',
    date: '2026-10-08',
    time: '10:00',
    range: '10:00–11:00 AM',
    place: 'Online',
    mode: 'Online',
    type: 'Important',
    status: 'Upcoming',
    attendees: ['Nico', 'Rina'],
  },
  {
    id: 'sprint',
    title: 'Atlas sprint review',
    date: '2026-10-09',
    time: '1:00',
    range: '1:00–2:00 PM',
    place: 'Meeting Room 1',
    mode: 'In person',
    type: 'Review',
    status: 'Upcoming',
    attendees: ['Nico', 'Rina', 'Dodi', 'Sri'],
  },
  {
    id: 'rehearsal',
    title: 'Presentation rehearsal',
    date: '2026-10-13',
    time: '3:00',
    range: '3:00–4:00 PM',
    place: 'Meeting Room 3',
    mode: 'In person',
    type: 'Meeting',
    status: 'Upcoming',
    attendees: ['Nico', 'Rina'],
  },
  {
    id: 'party',
    title: 'Office anniversary party',
    date: '2026-10-15',
    time: '4:00',
    range: '4:00–5:00 PM',
    place: 'Pantry, 3rd floor',
    mode: 'In person',
    type: 'Team event',
    status: 'Upcoming',
    attendees: ['Ayu', 'Nico', 'Rina', 'Dodi', 'Sri'],
  },
];
