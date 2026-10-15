// Users ② Roles: give or remove the Project Manager role, or deactivate a user. The signed-in Admin sees their own row read-only.
import { D } from '../../data/sample';
import { Avatar, Btn, Chips, Pill, Row, Rows, Search, Select } from '../../kit';
import { InfoBox, UsersScreen } from './users.parts';

const C = D.users.counts;

function Person({ k }) {
  const p = D.person(k), you = k === D.me().key;
  const side = you
    ? <span className="stack xs us-side"><Pill tone="success">Active</Pill><span className="t-footnote bold">{p.role}</span></span>
    : (
      <span className="stack xs us-side">
        <Select toast="Member · Project Manager">{p.role}</Select>
        <Btn kind="ghost" sm toast="User deactivated">Deactivate</Btn>
      </span>
    );
  return <Row lead={<Avatar name={p.name} />} title={you ? `${p.full} (You)` : p.full} sub={p.email} right={side} chev={false} />;
}

function UsersRoles() {
  return (
    <UsersScreen on={1} intro="Give or remove the Project Manager role, or deactivate a user.">
      <div className="stack sm">
        <Chips items={[`Approved ${C.approved}`, `Deactivated ${C.disabled}`]} />
        <Search placeholder="Search name or email…" />
      </div>
      <section className="stack xs">
        <p className="t-footnote bold">{C.approved} users</p>
        <Rows>{D.users.approved.map(k => <Person key={k} k={k} />)}</Rows>
      </section>
      <InfoBox title="Rules" items={[
        'The last Admin can\'t be demoted or deactivated.',
        'Role changes take effect at the next sign-in.',
        'Project Managers see all projects and edit only the projects they manage. A Member appointed as a project\'s Manager can still manage that project.',
      ]} />
    </UsersScreen>
  );
}

export default UsersRoles;
