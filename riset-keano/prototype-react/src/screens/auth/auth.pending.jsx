// Auth ③ Profile while awaiting admin approval: status card + profile form. No other menus until approved.
import { Btn, Field, Media, Pill, Screen, Section } from '../../kit';

function AuthPending() {
  return (
    <Screen title="[App Name]" right={<Btn sm go="auth.login" replace>Sign out</Btn>}>
      <Section>
        <div className="between"><span className="bold">Your account is awaiting admin approval</span><Pill tone="warning">Pending</Pill></div>
        <p className="t-subhead">You can open Home once an admin approves you. Meanwhile, complete your profile below.</p>
      </Section>
      <h2 className="t-title3">My Profile</h2>
      <div className="row-flex">
        <span className="au-photo"><Media label="Photo" size="sm" /></span>
        <div className="stack sm">
          <span className="t-footnote muted">Photo from Google account</span>
          <Btn sm toast="Pick a photo">Change photo</Btn>
        </div>
      </div>
      <Field label="Full name *" value="Budi Santoso" />
      <Field label="Email (from Google, cannot be changed)" value="budi@kantor.id" disabled />
      <Field label="Nickname" value="Budi" />
      <Field label="Phone number" placeholder="08xx xxxx xxxx" />
      <Field label="Job title" placeholder="e.g. Finance Staff" />
      <Field label="Division" placeholder="e.g. Finance" />
      <Btn kind="primary" block toast="Profile saved">Save profile</Btn>
      <Btn block go="home.main" replace>Check status</Btn>
      <p className="t-footnote muted">No other menus until an admin approves your account.</p>
    </Screen>
  );
}

export default AuthPending;
