// Profile ①: full-height overlay opened from the More panel's profile card (Discord-style top, ClickUp-style menu).
// Photo with presence dot and a note bubble, Edit profile, shortcuts, general info, Sign out.
import { BellOff, CalendarDays, CircleHelp, Copy, Inbox, ListChecks, Pencil, Settings } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar, Btn, Label, Row, Rows, Switch } from '../../kit';
import ProfileNote from './profile.note';
import { setProfile, useProfile } from './profile.store';

const ICON = 18;
const Tile = ({ icon, tone = 'gray' }) => <span className={`pf-tile ${tone}`} aria-hidden="true">{icon}</span>;

/** Photo, presence dot, note bubble, name and role. data-sheet-drag: the overlay can be swiped down from here. */
function Hero({ me, online, admin }) {
  return (
    <div className="pf-hero" data-sheet-drag="">
      <div className="pf-top">
        <span className="pf-photo">
          <Avatar name={me.name} size="xl" />
          <span className={`pf-dot${online ? ' is-on' : ''}`} aria-hidden="true" />
        </span>
        <ProfileNote />
      </div>
      <div className="stack xs">
        <h2 className="t-title2">{me.full}</h2>
        <p className="muted">{me.title} · {me.division}{admin ? ' · Admin' : ''}</p>
        <p className="t-footnote muted pf-status">{online ? 'Online' : 'Offline'}</p>
      </div>
    </div>
  );
}

export default function ProfileMain() {
  const { is, toast } = useApp();
  const { online, muted } = useProfile();
  const me = D.me();
  const copyEmail = () => {
    if (!navigator.clipboard) return toast('Copy is not available in this browser');
    navigator.clipboard.writeText(me.email).then(
      () => toast('Email copied'),
      err => toast(`Could not copy the email: ${err.message}`),
    );
  };
  return (
    <div className="pf stack">
      <Hero me={me} online={online} admin={is('admin')} />
      <Btn kind="primary" block icon={<Pencil size={16} />} go="settings.profile">Edit profile</Btn>
      <Rows>
        <Row lead={<Tile icon={<ListChecks size={ICON} />} tone="blue" />} title="My tasks" go="tasks.my" />
        <Row lead={<Tile icon={<CalendarDays size={ICON} />} tone="red" />} title="My calendar" go="events.calendar" />
        <Row lead={<Tile icon={<Inbox size={ICON} />} tone="blue" />} title="Inbox" go="inbox.respond"
          right={<span className="pf-count">{D.inbox.respond.length}</span>} />
        <Row lead={<Tile icon={<BellOff size={ICON} />} tone="indigo" />} title="Mute notifications"
          right={<Switch on={muted} label="Mute notifications" onChange={v => setProfile({ muted: v })} />} />
        <Row lead={<Tile icon={<Settings size={ICON} />} />} title="Settings" go="settings.main" />
        <Row lead={<Tile icon={<CircleHelp size={ICON} />} />} title="Help & resources" chev
          toast="Help & resources — not in the prototype yet" />
      </Rows>
      <div className="stack xs">
        <Label>General info</Label>
        <Rows>
          <Row lead={<span className={`pf-dot pf-dot-sm${online ? ' is-on' : ''}`} aria-hidden="true" />} title="Show me as online"
            sub={online ? 'Teammates see you as Online' : 'Teammates see you as Offline'}
            right={<Switch on={online} label="Show me as online" onChange={v => setProfile({ online: v })} />} />
          <Row title={me.email} sub="Email"
            right={<button type="button" className="pf-copy" aria-label="Copy email" onClick={copyEmail}><Copy size={ICON} /></button>} />
        </Rows>
      </div>
      <Btn kind="danger" block go="auth.login" replace>Sign out</Btn>
    </div>
  );
}
