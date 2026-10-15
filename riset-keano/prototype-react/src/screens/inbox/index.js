// Inbox module registration (owner: pm-dashboard-f9). All roles; content differs per role.
import { screen } from '../../core/registry';
import './inbox.css';
import { InboxEmpty, InboxRespond } from './inbox.respond';
import InboxUpdates from './inbox.updates';

const G = 'Inbox';

screen('inbox.respond', { title: '① Inbox · Needs your response', group: G, Component: InboxRespond });
screen('inbox.updates', { title: '② Inbox · Latest updates', group: G, Component: InboxUpdates });
screen('inbox.empty', { title: '③ Inbox · All caught up', group: G, Component: InboxEmpty });
