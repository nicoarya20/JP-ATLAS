// Events module registration (owner: pm-dashboard-f9). Order follows the old prototype files.
import { screen, sheet } from '../../core/registry';
import './events.css';
import EventsCalendar from './events.calendar';
import DetailConfirmed from './events.confirmed';
import { DetailRecurring, DetailUpcoming } from './events.detail';
import { EventsEmpty, EventsList } from './events.list';
import { NewEvent, NewEventDetails } from './events.new';
import { Step1, Step2, Step3 } from './events.outcomes';
import { RecordReady, Recording } from './events.record';
import { ArchiveRecurringSheet, ArchiveSheet, CancelRecurringSheet, CancelSheet, FilterSheet } from './events.sheets';

const G = 'Events';

screen('events.list', { title: '① Events · List', group: G, Component: EventsList });
sheet('events.filter', { title: '①b Sheet · Filter', group: G, Component: FilterSheet });
screen('events.calendar', { title: '② Events · Calendar (Month)', group: G, Component: EventsCalendar });
screen('events.new', { title: '③a New event · Short', group: G, Component: NewEvent });
screen('events.new-details', { title: '③b New event · More details', group: G, Component: NewEventDetails });
screen('events.empty', { title: '⑨ Events · Empty', group: G, roles: ['member'], Component: EventsEmpty });
screen('events.detail-upcoming', { title: '④ Detail · Upcoming', group: G, Component: DetailUpcoming });
screen('events.detail-recurring', { title: '④b Detail · Recurring', group: G, Component: DetailRecurring });
screen('events.record-ready', { title: '⑤ Recording mode · Ready', group: G, Component: RecordReady });
screen('events.recording', { title: '⑥ Recording', group: G, Component: Recording });
screen('events.step1', { title: '⑦a Outcomes · Step 1 Recording', group: G, Component: Step1 });
screen('events.step2', { title: '⑦b Outcomes · Step 2 Text', group: G, Component: Step2 });
screen('events.step3', { title: '⑦c Outcomes · Step 3 Tasks', group: G, Component: Step3 });
screen('events.detail-confirmed', { title: '⑨ Detail · Results confirmed', group: G, Component: DetailConfirmed });
sheet('events.cancel', { title: '⑩ Sheet · Cancel event', group: G, Component: CancelSheet });
sheet('events.archive', { title: '⑪ Sheet · Archive event', group: G, Component: ArchiveSheet });
sheet('events.cancel-recurring', { title: '⑩b Sheet · Cancel recurring event', group: G, Component: CancelRecurringSheet });
sheet('events.archive-recurring', { title: '⑪b Sheet · Archive recurring event', group: G, Component: ArchiveRecurringSheet });
