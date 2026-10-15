// Projects ③–⑤: choose how to create a project, fill in the form, tell the story to the AI.
import { Sparkles } from 'lucide-react';
import { Avatar, Btn, Chips, Field, Link, Pill, Section, Select } from '../../kit';
import { D } from '../../data/sample';
import { CancelFoot, FootScreen, helpers } from './projects.parts';

function Way({ title, desc, hint, go, primary }) {
  return (
    <Section className={primary ? 'pj-strong' : ''}>
      <div className="stack sm">
        <div className="between"><span className="t-headline">{title}</span>{primary && <Pill tone="accent">Recommended</Pill>}</div>
        <p className="t-subhead">{desc}</p>
        <div className="between pj-end">
          <p className="t-subhead muted pj-hint">{hint}</p>
          <Btn kind={primary ? 'primary' : 'outline'} sm go={go}>Choose</Btn>
        </div>
      </div>
    </Section>
  );
}

/** ③ New project · choose method. */
export function ProjectsNew() {
  return (
    <FootScreen title="New project">
      <div className="stack xs"><h2 className="t-title2">Create a new project</h2><p className="t-subhead">Choose the easiest way for you.</p></div>
      <Way primary title={<span className="row-flex">Tell us about the project <Sparkles size={16} className="tint" /></span>}
        desc="Describe the project like telling a friend. AI drafts the phases and tasks."
        hint="You still review the draft before the project is created." go="projects.story" />
      <Way title="Fill in the form yourself" desc="Enter the project name, dates, and members one by one."
        hint="Good if you already know the project details." go="projects.form" />
      <Way title="Use a template" desc="Start from a project structure you made before."
        hint="Good for projects similar to a previous one." go="projects.template" />
      <div className="mt-2"><Btn block back>Cancel</Btn></div>
    </FootScreen>
  );
}

/** Labelled group that is not a text input (chips, selects, member list). */
function Group({ label, children }) {
  return <div className="field"><span className="t-footnote muted">{label}</span>{children}</div>;
}

function MemberRow({ full, role, fixed }) {
  return (
    <div className="row-flex">
      <Avatar name={full} size="sm" /><span className="grow">{full}</span>
      <Select toast={fixed ? 'Creator stays Manager' : 'Pick a role'}>{role}</Select>
    </div>
  );
}

/** ④ Project form, shown half filled in: the signed-in creator plus the two helpers from the attendance story. */
export function ProjectsForm() {
  const me = D.me();
  return (
    <FootScreen title="Fill in project form" foot={<CancelFoot label="Create project" go="projects.overview" toast="Project created" />}>
      <Field label="Project name *" placeholder="e.g. Attendance App" />
      <Field label="Description" placeholder="Briefly describe the project's goal" area />
      <Group label="Lead (main manager)"><Select block>{me.full}</Select></Group>
      <Group label="Initial status">
        <Chips items={['Draft', 'Active']} on={1} />
        <span className="t-footnote muted">Other statuses can be changed after the project is created.</span>
      </Group>
      <Group label="Priority"><Chips items={['Low', 'Medium', 'High', 'Critical']} on={1} /></Group>
      <div className="pj-grid2"><Field label="Start date" value="Oct 7, 2026" /><Field label="End date" value="Nov 7, 2026" /></div>
      <div className="row-flex"><span className="t-subhead muted nowrap">Quick pick</span><Chips items={['1 wk', '2 wk', '1 mo', '3 mo']} on={2} /></div>
      <Group label="Members & roles">
        <div className="stack sm">
          <MemberRow full={me.full} role="Manager" fixed />
          {helpers().map(f => <MemberRow key={f} full={f} role="Member" />)}
        </div>
      </Group>
      <div><Link toast="Pick a member">+ Add member</Link></div>
      <p className="t-subhead muted">The creator automatically becomes Manager and Lead. Default task types created: Task, Bug, Idea (can be changed in Project settings).</p>
    </FootScreen>
  );
}

/** ⑤ Tell us about the project (AI). */
export function ProjectsStory() {
  const text = D.story.text;
  const build = <span className="row-flex">Build draft <Sparkles size={16} /></span>;
  return (
    <FootScreen title="Tell us about the project ✦" foot={<CancelFoot label={build} go="projects.draft" />}>
      <p className="t-subhead">Write it like telling a friend. AI will draft the project for you to review.</p>
      <div className="stack sm">
        <Field label="Your story" value={text} area />
        <span className="t-footnote muted pj-right">{text.length} / 2000 characters</span>
      </div>
      <Section className="pj-soft"><div className="between"><span className="bold muted">Speak</span><Pill tone="outline">Not active yet · coming soon</Pill></div></Section>
      <div>
        <span className="t-subhead bold">To get a good draft, mention:</span>
        <ul className="pj-bullets t-subhead"><li>The project's goal</li><li>When it must be done</li><li>Who is involved</li></ul>
      </div>
    </FootScreen>
  );
}
