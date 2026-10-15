// Settings ①: account, notifications, leave, and Admin-only team settings. Reached from More.
import { ChevronRight } from 'lucide-react';
import { useApp } from '../../core/app.context';
import { D } from '../../data/sample';
import { Avatar, Btn, Label, Link, Screen, Section, Select, Switch } from '../../kit';

/** Setting row: bold title, muted hint, control on the right. */
function Setting({ title, hint, children }) {
  return (
    <div className="st-row">
      <span className="grow stack st-text"><span className="bold">{title}</span><span className="t-footnote muted">{hint}</span></span>
      {children}
    </div>
  );
}

/** Labelled group of setting rows with an optional footnote. */
function Group({ label, note, children }) {
  return (
    <div className="stack xs">
      <Label>{label}</Label>
      <Section className="st-card">{children}</Section>
      {note && <p className="t-footnote muted">{note}</p>}
    </div>
  );
}

function Account() {
  const me = D.me();
  return (
    <div className="stack xs">
      <Label>My account</Label>
      <Section>
        <div className="row-flex">
          <Avatar name={me.name} size="lg" />
          <div className="grow stack xs">
            <span className="t-headline">{me.full}</span>
            <span className="t-footnote muted">{me.title} · {me.division} division</span>
            <span className="t-footnote muted">{me.phone} · {me.email}</span>
          </div>
        </div>
        <Btn block sm go="settings.profile">Edit profile</Btn>
      </Section>
    </div>
  );
}

function TeamSettings() {
  return (
    <Group label="Team settings (Admin only)">
      <Setting title="AI features" hint="Voice recording, note photos, and picking meeting outcomes"><Switch on label="AI features" /></Setting>
      <Setting title="Recording retention" hint="Raw recordings are deleted automatically after meeting outcomes are confirmed">
        <Select toast="7 days · 30 days · 90 days">30 days</Select>
      </Setting>
      <Setting title="Default event reminder" hint="Used for new events unless the creator changes it">
        <Select toast="30 min · 1 day · 1 day & 30 min">1 day & 30 min</Select>
      </Setting>
      <Setting title="Leave needs approval" hint="Leave requests must be approved by the project Manager or Admin first. If off, leave applies immediately.">
        <Switch on label="Leave needs approval" />
      </Setting>
      <Setting title="Roles and permissions" hint="See who can do what (read-only)">
        <Link toast="Roles and permissions — not in the prototype yet">View <ChevronRight size={14} aria-hidden /></Link>
      </Setting>
    </Group>
  );
}

export default function SettingsMain() {
  const { is } = useApp();
  const admin = is('admin');
  return (
    <Screen title="Settings" sub={admin ? 'Manage your account, notifications and team' : 'Manage your account and notifications'} back>
      <Account />
      <Group label="Notifications" note="Requests that need your response always appear in Inbox and can't be turned off.">
        <Setting title="Event reminders" hint="1 day and 30 minutes before the event starts"><Switch on label="Event reminders" /></Setting>
        <Setting title="Inbox updates" hint="Comments, task changes, and event invites"><Switch on label="Inbox updates" /></Setting>
      </Group>
      <Group label="Availability">
        <Setting title="Leave" hint="Not on leave. Teammates see you as Available.">
          <Btn sm sheet="settings.leave">{admin ? 'Set leave' : 'Request leave'}</Btn>
        </Setting>
      </Group>
      {admin && <TeamSettings />}
      <Btn block go="auth.login" replace>Sign out</Btn>
      <p className="t-footnote muted center">Project settings live inside each project.{admin && ' Account roles are managed in Users (Admin).'}</p>
    </Screen>
  );
}
