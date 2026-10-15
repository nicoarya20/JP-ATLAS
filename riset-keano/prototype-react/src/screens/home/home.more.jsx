// Home ② More: profile card, secondary destinations (Inbox, Team, Users for Admin, Trash, Settings), sign out.
import { Inbox, Settings, Trash2, UserCog, Users } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar, Btn, Pill, Row, Rows, Screen } from '../../kit';

const ICON = 18;
const tile = (icon, tone) => <span className={`hm-tile ${tone}`}>{icon}</span>;

function HomeMore() {
  const { is } = useApp();
  const me = D.me();
  return (
    <Screen title="More" right={<Avatar name={me.name} size="sm" />} tab="more">
      <Rows>
        <Row lead={<Avatar name={me.name} size="lg" />} title={me.full}
          sub={`${me.title} · ${me.division}${is('admin') ? ' · Admin' : ''}`} go="auth.pending" />
      </Rows>
      <Rows>
        <Row lead={tile(<Inbox size={ICON} />, 'blue')} title="Inbox" sub="Notifications & mentions" go="inbox.respond"
          right={<Pill tone="danger">{D.inbox.respond.length}</Pill>} />
        <Row lead={tile(<Users size={ICON} />, 'green')} title="Team" sub="Team members" go="team.list" />
        {is('admin') && (
          <Row lead={tile(<UserCog size={ICON} />, 'orange')} title="Users" sub="Approve new users & manage roles" go="users.approve"
            right={<Pill tone="danger">{D.users.counts.pending}</Pill>} />
        )}
        <Row lead={tile(<Trash2 size={ICON} />, 'gray')} title="Trash" sub="Deleted projects, tasks & events" go="trash.list" />
        <Row lead={tile(<Settings size={ICON} />, 'gray')} title="Settings" sub="Account, notifications, leave" go="settings.main" />
      </Rows>
      <Btn block kind="danger" go="auth.login" replace>Sign out</Btn>
      <p className="t-footnote muted center">Help · Privacy Policy · Version 1.0</p>
    </Screen>
  );
}

export default HomeMore;
