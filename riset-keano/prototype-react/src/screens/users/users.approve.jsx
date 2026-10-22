// Users ① Approval: new Google sign-ins wait for an Admin decision (approve with a starting role, or reject with a reason).
import { D } from '../../data/sample';
import { Btn, Chips, Field, Search, Section, Select } from '../../kit';
import { InfoBox, UsersScreen, Who } from './users.parts';

const [sari, budi] = D.users.pending;
const C = D.users.counts;

function Pending() {
  return (
    <Section>
      <Who u={sari}>
        <span className="t-footnote muted">Position: {sari.job} · Division: {sari.division}</span>
      </Who>
      <div className="between"><span className="t-subhead">Starting role</span><Select toast="Member · Project Manager">Member</Select></div>
      <div className="us-two">
        <Btn toast="Write a reason first">Reject</Btn>
        <Btn kind="primary" toast="User approved as Member">Approve</Btn>
      </div>
    </Section>
  );
}

function Rejecting() {
  return (
    <Section>
      <Who u={budi}><span className="t-footnote muted">Profile not filled in. Only name, email and photo from Google.</span></Who>
      <div className="stack sm">
        <Field area label="Reason for rejecting (required)"
          value="Please sign in with your office email (@kantor.id). This account is not on the employee list yet." />
        <p className="t-footnote muted">The reason is shown to the user when they try to sign in.</p>
      </div>
      <div className="us-two">
        <Btn toast="Rejection canceled">Cancel</Btn>
        <Btn kind="danger" toast="User rejected">Reject user</Btn>
      </div>
    </Section>
  );
}

function UsersApprove() {
  return (
    <UsersScreen on={0} intro="New users sign in with Google and wait for your decision. Only Admins can approve.">
      <div className="stack sm">
        <Chips items={[`Pending ${C.pending}`, `Approved ${C.approved}`, `Rejected ${C.rejected}`, `Deactivated ${C.disabled}`]} />
        <Search placeholder="Search name or email…" />
      </div>
      <section className="stack">
        <p className="t-footnote bold">{C.pending} waiting</p>
        <Pending />
        <Rejecting />
      </section>
      <InfoBox title="After approval" items={[
        'Approved users become Members right away; their next sign-in goes straight to Home.',
        'The Project Manager role is given in the Roles tab.',
      ]} />
    </UsersScreen>
  );
}

export default UsersApprove;
