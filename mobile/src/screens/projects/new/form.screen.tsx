// Projects ④ Fill in project form (prototype projects.create.jsx ProjectsForm): name, description, Lead, initial
// status, priority, dates with quick picks, members and their roles (the creator stays Manager). Create project is a
// real write now (`POST /api/app/projects`), and the answer carries the new project's id, so the screen opens the
// project it just made instead of the prototype's fixed one.
//
// This is the only one of the three New project ways with a server behind it. The story ⑤–⑥ and the templates ⑦ have
// no endpoint at all and read `projects.sample-form.ts`; see the note there.
//
// The status chips offer `draft` and `active` only, which is what the route accepts as an initial status — the rest are
// reachable from Edit once the project exists, as the hint says.
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Chips } from '@/components/form/chips';
import { DateField } from '@/components/form/date-field';
import { Field } from '@/components/form/field';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { priorityWord, roleWire, statusWord } from '@/data/projects.api.values';
import { type CreateProjectInput, createProject } from '@/data/projects.api.write';
import { QUICK_ENDS } from '@/data/projects.dates';
import {
  ensureProjectForm,
  INITIAL_STATUSES,
  PRIORITIES,
  type ProjectFormView,
  reloadProjectForm,
  useProjectForm,
} from '@/data/projects.forms';
import type { ProjectRole } from '@/data/sample/projects.extra';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { Note } from '../parts/display';
import { Foot, Labelled } from '../parts/form-bits';
import { CREATE, FORM } from '../projects.strings';
import { WHY } from '../projects.strings.added';
import { FormMembers } from './form-members';

/** Prototype defaults: Active, Medium, ends 1 month after it starts. */
const ACTIVE = INITIAL_STATUSES.indexOf('active');
const MEDIUM = PRIORITIES.indexOf('medium');
const ONE_MONTH = 2;

const STATUS_WORDS = INITIAL_STATUSES.map(statusWord);
const PRIORITY_WORDS = PRIORITIES.map(priorityWord);

/** The form itself, mounted once the picker and the server's today have arrived. */
function NewProjectForm({ view }: { view: ProjectFormView }) {
  const notice = useNotice();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState(ACTIVE);
  const [priority, setPriority] = useState(MEDIUM);
  const [start, setStart] = useState(view.today);
  const [quick, setQuick] = useState<number | null>(ONE_MONTH);
  const [end, setEnd] = useState(() => QUICK_ENDS[ONE_MONTH]?.(view.today) ?? view.today);
  const [roles, setRoles] = useState<Readonly<Record<string, ProjectRole>>>({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const why = name.trim() ? undefined : WHY.name;
  const pick = (i: number) => {
    setQuick(i);
    setEnd(QUICK_ENDS[i]?.(start) ?? end);
  };
  const create = async () => {
    const input: CreateProjectInput = {
      name: name.trim(),
      description: desc.trim() || null,
      status: INITIAL_STATUSES[status] === 'draft' ? 'draft' : 'active',
      priority: PRIORITIES[priority],
      startDate: start,
      dueDate: end,
      // Only the people a role was chosen for; the creator is made Manager server-side.
      members: view.people
        .filter((p) => roles[p.value])
        .map((p) => ({ userId: p.value, role: roleWire(roles[p.value] as ProjectRole) })),
    };
    setBusy(true);
    try {
      const made = await createProject(input);
      // Back to the list first, so Back from the new project lands there and not in this modal.
      router.dismissTo('/projects');
      router.push(`/projects/${made.id}`);
      notice(CREATE.created);
    } catch (e) {
      // The server's own sentence, as it came (K5); the form stays up so nothing typed is lost.
      notice(e instanceof Error ? e.message : CREATE.failed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <DetailPage
      testID="project-form"
      title={FORM.title}
      foot={
        <Foot
          label={CREATE.create}
          ok={!why && view.mayCreate}
          why={view.mayCreate ? why : CREATE.mayNot}
          busy={busy}
          onPress={() => void create()}
        />
      }
    >
      <Field
        label={FORM.name}
        required
        value={name}
        placeholder={FORM.namePlaceholder}
        onChangeText={(t) => {
          setTouched(true);
          setName(t);
        }}
        onBlur={() => setTouched(true)}
        error={touched ? why : undefined}
        testID="form-name"
      />
      <Field
        label={FORM.desc}
        multiline
        value={desc}
        placeholder={FORM.descPlaceholder}
        onChangeText={setDesc}
      />
      <Labelled label={FORM.lead}>
        {/* The creator becomes Lead server-side, so the select shows them and stays put. */}
        <SelectField
          label={FORM.lead}
          options={[{ value: view.creator.userId, label: view.creator.full }]}
          value={view.creator.userId}
          disabled
          onChange={() => undefined}
        />
      </Labelled>
      <Labelled label={FORM.status} hint={FORM.statusHint}>
        <Chips label={FORM.status} items={STATUS_WORDS} value={status} onChange={setStatus} />
      </Labelled>
      <Labelled label={FORM.priority}>
        <Chips
          label={FORM.priority}
          items={PRIORITY_WORDS}
          value={priority}
          onChange={setPriority}
        />
      </Labelled>
      <Labelled label={FORM.start}>
        <DateField label={FORM.start} value={start} initial={start} onChange={setStart} />
      </Labelled>
      <Labelled label={FORM.end}>
        <DateField
          label={FORM.end}
          value={end}
          initial={end}
          min={start}
          onChange={(d) => {
            setQuick(null);
            setEnd(d);
          }}
        />
      </Labelled>
      <Labelled label={FORM.quick}>
        <Chips label={FORM.quick} items={FORM.quickPicks} value={quick ?? -1} onChange={pick} />
      </Labelled>
      <FormMembers
        creator={view.creator.full}
        people={view.people}
        roles={roles}
        onRoles={setRoles}
      />
      <Note>{FORM.note}</Note>
    </DetailPage>
  );
}

/** The project form, for a Manager or Admin; a Member goes home. */
export function ProjectFormScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { view, phase, error } = useProjectForm();
  useEffect(() => {
    void ensureProjectForm();
  }, []);
  if (!allowedScreen('projects.form', role)) return <Redirect href="/" />;
  if (!view) {
    return (
      <DetailPage testID="project-form-loading" title={FORM.title}>
        {phase === 'failed' ? (
          <FailedState
            testID="project-form-failed"
            message={error?.message}
            onRetry={() => void reloadProjectForm()}
          />
        ) : (
          <LoadingState testID="project-form-spinner" />
        )}
      </DetailPage>
    );
  }
  return <NewProjectForm view={view} />;
}
