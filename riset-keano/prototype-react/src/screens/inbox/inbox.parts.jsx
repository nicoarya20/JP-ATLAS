// Inbox frame and card pieces shared by the three inbox screens.
import { Avatar, Screen, Tabs } from '../../kit';
import { actor } from './inbox.shared';

/** Inbox frame: back + "Inbox", the two tabs (on = active), tab bar on More. count = items needing a response. */
export function InboxScreen({ on, count = 3, children }) {
  return (
    <Screen back title="Inbox" tab="more">
      <Tabs items={[`Needs your response (${count})`, 'Latest updates']} on={on} gos={['inbox.respond', 'inbox.updates']} />
      {children}
    </Screen>
  );
}

/** Card header: avatar (or another lead), a short who/what line, meta below. */
export function Who({ text, meta, lead }) {
  return (
    <div className="ib-who">
      {lead || <Avatar name={actor(text)} />}
      <span className="ib-body">
        <span className="t-subhead">{text}</span>
        <span className="t-footnote muted">{meta}</span>
      </span>
    </div>
  );
}

/** Response card: content, then its one action button at the right. */
export function Card({ action, children }) {
  return (
    <div className="ib-card">
      {children}
      <div className="ib-acts">{action}</div>
    </div>
  );
}
