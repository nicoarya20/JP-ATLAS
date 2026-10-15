// Inbox ① Needs your response and ③ All caught up. Member and PM get three cards from their own items;
// Admin swaps slot [1] for the user-approval card and is the reviewer because the project has only one Manager.
import { Check, Sparkles } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatars, Btn, Empty } from '../../kit';
import { Card, InboxScreen, Who } from './inbox.parts';
import { items, link } from './inbox.shared';

/** Slot [0]: a task to review (PM/Admin) or a newly assigned task (Member). */
function Review({ why }) {
  const { is } = useApp();
  const rv = items(is).respond[0];
  return (
    <Card action={<Btn kind="primary" sm {...link(rv.meta)}>{rv.action}</Btn>}>
      <Who text={rv.title} meta={rv.meta} />
      <div className="stack xs">
        <p className="bold">{rv.sub}</p>
        {why && <p className="t-footnote muted">{why}</p>}
      </div>
    </Card>
  );
}

/** Slot [1]: the PM confirms the stand-up outcomes; the Member's is an event invite. */
function Second() {
  const { is } = useApp();
  const it = items(is).respond[1];
  if (is('member')) {
    return (
      <Card action={<Btn kind="primary" sm {...link(it.sub)}>{it.action}</Btn>}>
        <Who text={it.title} meta={it.meta} />
        <p className="bold">{it.sub}</p>
      </Card>
    );
  }
  return (
    <Card action={<Btn kind="primary" sm go="events.step3">{it.action}</Btn>}>
      <Who text={it.title} meta={it.meta} lead={<span className="ib-ai" aria-label="AI-assisted"><Sparkles size={18} /></span>} />
      <p className="t-footnote muted">{it.sub}</p>
    </Card>
  );
}

/** Slot [2]: a mention; the quote addresses whoever is signed in (PM items are written to @Nico). */
function Mention() {
  const { is } = useApp();
  const mn = items(is).respond[2];
  return (
    <Card action={<Btn sm {...link(mn.title)}>{mn.action}</Btn>}>
      <Who text={mn.title} meta={mn.meta} />
      <p className="ib-quote t-subhead">{mn.sub.replace('@Nico', `@${D.me().name}`)}</p>
    </Card>
  );
}

/** Admin only: new users awaiting approval. */
function Approvals() {
  const names = D.users.pending.map(u => u.full);
  return (
    <Card action={<Btn kind="primary" sm go="users.approve">Open Users</Btn>}>
      <Who text={`${D.users.counts.pending} new users awaiting approval`} meta={names.join(', ')} lead={<Avatars names={names} />} />
      <p className="t-footnote muted">Approval cards are for Admins only. Once one Admin decides, the card disappears for all Admins.</p>
    </Card>
  );
}

/** Inbox ①: things that need the signed-in person's response. */
export function InboxRespond() {
  const { is } = useApp();
  return (
    <InboxScreen on={0}>
      {is('admin')
        ? <><Approvals /><Review why="You're the task reviewer because the project has only one Manager" /><Mention /></>
        : <><Review /><Second /><Mention /></>}
    </InboxScreen>
  );
}

/** Inbox ③: nothing needs a response. */
export function InboxEmpty() {
  return (
    <InboxScreen on={0} count={0}>
      <Empty icon={<Check size={28} />} title="All caught up" text="Nothing needs your response right now."
        action={<Btn go="inbox.updates">View latest updates</Btn>} />
    </InboxScreen>
  );
}
