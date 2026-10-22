// Inbox ② Latest updates: Today (unread) and Yesterday, per role. Admin has its own feed.
import { useApp } from '../../core/app.context';
import { Avatar, Btn, Label, Link } from '../../kit';
import { InboxScreen } from './inbox.parts';
import { ADMIN_UPDATES, actor, items, link } from './inbox.shared';
import { markAllRead, useAllRead } from './inbox.store';

/** Update row from {title, meta}; the last meta part ("30 min ago") moves to the right side. */
function Row({ title, meta, unread }) {
  const parts = meta.split(' · ');
  const time = parts.pop().replace('Yesterday ', '');
  return (
    <div className="ib-row">
      <Avatar size="sm" name={actor(title, meta)} />
      <span className="ib-body">
        <span className="t-subhead">{title}</span>
        <span className="t-footnote muted">{parts.join(' · ')}</span>
      </span>
      <span className="ib-side">
        <span className="t-footnote muted nowrap">{time}</span>
        <Btn kind="ghost" sm {...link(`${title} ${meta}`)}>View</Btn>
        {unread && <span className="ib-unread" role="img" aria-label="Unread" />}
      </span>
    </div>
  );
}

/** Rows of one day; Today's are unread until "Mark all as read". */
function Day({ day }) {
  const { is } = useApp();
  const allRead = useAllRead();
  const list = is('admin') ? ADMIN_UPDATES()[day] : items(is).updates.filter(u => u.day === day);
  return list.map(u => <Row key={u.title} {...u} unread={day === 'Today' && !allRead} />);
}

/** Inbox ②: latest updates. */
export default function InboxUpdates() {
  const { toast } = useApp();
  const readAll = () => { markAllRead(); toast('All marked as read'); };
  return (
    <InboxScreen on={1}>
      <section>
        <div className="between">
          <Label>Today</Label>
          <Link onClick={readAll}>Mark all as read</Link>
        </div>
        <Day day="Today" />
      </section>
      <section>
        <Label>Yesterday</Label>
        <Day day="Yesterday" />
      </section>
    </InboxScreen>
  );
}
