// Settings ② Edit profile. Role is set by an Admin and email comes from Google; both are read-only.
import { D } from '../../data/sample';
import { Avatar, Btn, Field, Screen } from '../../kit';

export default function SettingsProfile() {
  const me = D.me();
  return (
    <Screen title="Edit profile" back>
      <div className="stack sm center st-photo">
        <Avatar name={me.name} size="xl" />
        <Btn kind="ghost" sm toast="Change photo — not in the prototype yet">Change photo</Btn>
      </div>
      <Field label="Full name" value={me.full} />
      <Field label="Nickname (for greetings)" value={me.name} />
      <Field label="Job title" value={me.title} />
      <Field label="Division" value={me.division} />
      <div className="stack sm">
        <Field label="Role" value={me.role} disabled />
        <p className="t-footnote muted">Your role is set by an Admin.</p>
      </div>
      <div className="stack sm">
        <Field label="Email" value={me.email} disabled />
        <p className="t-footnote muted">Email comes from your Google account and can't be changed.</p>
      </div>
      <div className="st-foot">
        <Btn back>Cancel</Btn>
        <Btn kind="primary" back toast="Profile saved">Save</Btn>
      </div>
    </Screen>
  );
}
