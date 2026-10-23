// Projects ⑥–⑦: review the AI draft (phases, milestones, initial tasks) and create a project from a template.
import { Radio } from '@react-cupertino-ui/radio';
import { Sparkles } from 'lucide-react';
import { Btn, Field, Link, Pill, Section, Select } from '../../kit';
import { D } from '../../data/sample';
import { CancelFoot, Check, Foot, FootScreen, Info, helpers } from './projects.parts';

// Task types per story phase (D.story has titles only): "Fix issues from the trial" is the one Bug.
const DRAFT_TYPES = [['Task', 'Task'], ['Task', 'Task', 'Task'], ['Task', 'Bug'], ['Task']];

function DraftPhase({ phase: [label, milestone, titles], i }) {
  const [name, range] = label.split(' · ');
  return (
    <div className="stack sm">
      <div className="row-flex"><Check aria={name} /><span className="bold">{name}</span><span className="t-subhead muted">{range}</span></div>
      <div className="t-subhead pj-indent">◆ Milestone: {milestone}</div>
      {titles.map((t, j) => (
        <div key={t} className="row-flex pj-indent">
          <Check aria={t} /><span className="grow">{t}</span>
          <Select toast="Task · Bug · Idea">{DRAFT_TYPES[i][j]}</Select>
        </div>
      ))}
    </div>
  );
}

/** ⑥ Review AI draft. */
export function ProjectsDraft() {
  const S = D.story;
  const taskCount = S.phases.reduce((n, p) => n + p[2].length, 0);
  const foot = (
    <Foot>
      <Btn back>Rebuild</Btn>
      <Btn kind="primary" go="projects.overview" toast="Project created">Create project</Btn>
    </Foot>
  );
  return (
    <FootScreen title="Review draft" foot={foot}>
      <Section className="pj-soft">
        <div className="between">
          <span className="t-subhead bold row-flex"><Sparkles size={16} className="tint" /> This is an AI draft. Review it before creating.</span>
          <Pill tone="outline">Not a project yet</Pill>
        </div>
      </Section>
      <Section title="Project info" right={<Link go="projects.form">Edit</Link>}>
        <div className="stack sm">
          <Info label="Project name">{D.project('attendance').name}</Info>
          <Info label="Description">{S.summary}</Info>
          <Info label="Dates">{S.dates}</Info>
          <Info label="Priority · Initial status">Medium · Draft</Info>
          <Info label="Members">{`${D.me().name} (Manager), ${helpers().map(f => f.split(' ')[0]).join(', ')}`}</Info>
        </div>
      </Section>
      <div className="stack xs">
        <h2 className="t-headline">Phases, milestones & initial tasks</h2>
        <p className="t-subhead muted">{S.phases.length} phases · {S.phases.length} milestones · {taskCount} tasks</p>
      </div>
      {S.phases.map((p, i) => <DraftPhase key={p[0]} phase={p} i={i} />)}
      <p className="t-subhead muted">AI picked the type from Task · Bug · Idea, tap to change. Uncheck to discard.</p>
      <Check on={false} label={(
        <span className="stack xs"><span className="bold">Also save as template</span>
          <span className="t-subhead muted">So similar projects don't need the story again.</span></span>
      )} />
    </FootScreen>
  );
}

/** ⑦ Use template. New project from the "Internal app" template (60 days): start Oct 12 → end Dec 11, 2026. */
export function ProjectsTemplate() {
  return (
    <FootScreen title="Use template" foot={<CancelFoot label="Create project" go="projects.overview" toast="Project created" />}>
      <div className="stack sm">
        <h2 className="t-headline">Choose template</h2>
        <div className="stack sm" role="radiogroup" aria-label="Choose template">
          {D.templates.map((t, i) => (
            <Section key={t.name} className="pj-pick">
              <Radio variant="solid" name="pj-template" defaultChecked={i === 0} label={(
                <span className="stack xs"><span className="t-headline">{t.name}</span>
                  <span className="t-subhead">{t.meta}</span><span className="t-subhead muted">{t.from}</span></span>
              )} />
            </Section>
          ))}
        </div>
      </div>
      <hr className="pj-divider" />
      <div className="stack">
        <h2 className="t-headline">Fill in project data</h2>
        <Field label="Project name *" value="Leave Request App" />
        <Field label="Start date *" value="Mon, Oct 12, 2026" />
        <div className="stack sm"><span className="t-subhead muted">Estimated end</span><span className="bold">Fri, Dec 11, 2026 (60 days)</span></div>
      </div>
      <p className="t-subhead muted">Phase and milestone dates are calculated automatically from the start date. The creator automatically becomes Manager and Lead.</p>
    </FootScreen>
  );
}
