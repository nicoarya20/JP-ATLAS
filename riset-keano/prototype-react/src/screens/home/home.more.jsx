// Home More menu: the panel the More tab unfolds from the tab bar. Profile, then a grid of the secondary
// destinations (Inbox, Team, Users for Admin, Archive, Settings) and Sign out.
import { Archive, ChevronRight, Inbox, LogOut, Settings, UserCog, Users } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar } from '../../kit';

const ICON = 24;

/** Grid tiles: {go, label, icon, tone, badge?, replace?}. Users is for Admin only. */
const tiles = is => [
  { go: 'inbox.respond', label: 'Inbox', icon: <Inbox size={ICON} />, tone: 'blue', badge: D.inbox.respond.length },
  { go: 'team.list', label: 'Team', icon: <Users size={ICON} />, tone: 'green' },
  is('admin') && { go: 'users.approve', label: 'Users', icon: <UserCog size={ICON} />, tone: 'orange', badge: D.users.counts.pending },
  { go: 'trash.list', label: 'Archive', icon: <Archive size={ICON} />, tone: 'gray' },
  { go: 'settings.main', label: 'Settings', icon: <Settings size={ICON} />, tone: 'gray' },
  { go: 'auth.login', label: 'Sign out', icon: <LogOut size={ICON} />, tone: 'red', replace: true },
].filter(Boolean);

/** close() folds the panel; every pick closes it first so the bar is back to normal on the next screen. */
export default function MoreMenu({ close }) {
  const { go, is } = useApp();
  const me = D.me();
  const open = (id, replace = false) => { close(); go(id, { replace }); };
  return (
    <div className="mm">
      {/* tb-rise + --i: the kit tab bar staggers these in as the panel unfolds */}
      <button type="button" className="mm-me tb-rise" style={{ '--i': 0 }} aria-label={`${me.full}, edit profile`} onClick={() => open('settings.profile')}>
        <Avatar name={me.name} />
        <span className="mm-who">
          <span className="mm-name">{me.full}</span>
          <span className="t-footnote muted">{me.title} · {me.division}{is('admin') ? ' · Admin' : ''}</span>
        </span>
        <ChevronRight size={18} className="muted" aria-hidden="true" />
      </button>
      <div className="mm-grid">
        {tiles(is).map((t, i) => (
          <button key={t.go} type="button" className="mm-item tb-rise" style={{ '--i': i + 1 }}
            aria-label={t.badge ? `${t.label}, ${t.badge} new` : t.label} onClick={() => open(t.go, t.replace)}>
            <span className={`mm-tile ${t.tone}`}>
              {t.icon}
              {t.badge ? <span className="mm-badge">{t.badge}</span> : null}
            </span>
            <span className="mm-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
