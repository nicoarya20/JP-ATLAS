// Users module shared parts: screen frame with the Approval/Roles tabs, info box, person header.
import { Avatar, Screen, Section, Tabs } from '../../kit';

/** Users screen frame: nav bar, Approval/Roles tabs, intro line. on = active tab index. */
export function UsersScreen({ on, intro, children }) {
  return (
    <Screen title="Users" back tab="more">
      <Tabs items={['Approval', 'Roles']} on={on} gos={['users.approve', 'users.roles']} />
      <p className="t-subhead muted">{intro}</p>
      {children}
    </Screen>
  );
}

/** Grey info card with a bold title and a bullet list. */
export function InfoBox({ title, items }) {
  return (
    <Section className="us-box">
      <p className="t-footnote bold">{title}</p>
      <ul className="us-bul t-footnote">{items.map(i => <li key={i}>{i}</li>)}</ul>
    </Section>
  );
}

/** Pending sign-up header: avatar, name, request time, email, then extra lines. */
export function Who({ u, children }) {
  return (
    <div className="row-flex us-who">
      <Avatar name={u.full} />
      <div className="grow stack xs">
        <div className="between"><span className="bold">{u.full}</span><span className="t-footnote muted">{u.day} · {u.time}</span></div>
        <span className="t-footnote">{u.email}</span>
        {children}
      </div>
    </div>
  );
}
