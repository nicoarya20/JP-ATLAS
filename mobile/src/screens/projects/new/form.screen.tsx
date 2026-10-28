// Projects ④ Fill in project form (prototype projects.create.jsx ProjectsForm), for whoever the server lets create
// projects (`whoami` caps): name, description, Lead (you or someone you add), initial status, priority, dates with
// quick picks, and members with their roles. Create project sends it and opens the new project.
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Chips } from '@/components/form/chips';
import { DateField } from '@/components/form/date-field';
import { Field } from '@/components/form/field';
import { FormError } from '@/components/form/form-error';
import { SelectField } from '@/components/form/select-field';
import { DetailPage } from '@/components/screen/detail-page';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { ButtonSpinner, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { today } from '@/data/clock';
import { QUICK_ENDS } from '@/data/projects.dates';
import { CREATE_STATUS_CHOICES, PRIORITY_CHOICES } from '@/data/projects.form';
import { whoamiResource } from '@/data/whoami.api';

import { Note } from '../parts/display';
import { Foot, Labelled } from '../parts/form-bits';
import { CREATE, FORM } from '../projects.strings';
import { WHY } from '../projects.strings.added';
import { FormMembers, type Picked } from './form-members';
import { createBody, useCreateProject } from './form-submit';

/** Prototype defaults: Active, Medium, ends 1 month after it starts. */
const ACTIVE = 1;
const MEDIUM = 1;
const ONE_MONTH = 2;
const STATUS_LABELS = CREATE_STATUS_CHOICES.map((c) => c.label);
const PRIORITY_LABELS = PRIORITY_CHOICES.map((c) => c.label);

function ProjectForm({ me }: { me: { id: string; name: string } }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState(ACTIVE);
  const [priority, setPriority] = useState(MEDIUM);
  const [start, setStart] = useState(today);
  const [quick, setQuick] = useState<number | null>(ONE_MONTH);
  const [end, setEnd] = useState(() => QUICK_ENDS[ONE_MONTH]?.(start) ?? start);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [leadId, setLeadId] = useState(me.id);
  const [touched, setTouched] = useState(false);
  const { busy, error, submit } = useCreateProject();
  const why = name.trim() ? undefined : WHY.name;
  const pick = (i: number) => {
    setQuick(i);
    setEnd(QUICK_ENDS[i]?.(start) ?? end);
  };
  const leads = [
    { value: me.id, label: me.name },
    ...picked.map((m) => ({ value: m.id, label: m.name })),
  ];
  const changeMembers = (next: Picked[]) => {
    setPicked(next);
    if (!next.some((m) => m.id === leadId)) setLeadId(me.id);
  };
  const create = () =>
    void submit(
      createBody(me.id, {
        name,
        description: desc,
        status: CREATE_STATUS_CHOICES[status]?.value ?? 'active',
        priority: PRIORITY_CHOICES[priority]?.value ?? 'medium',
        leadId,
        startDate: start,
        dueDate: end,
        picked,
      }),
    );
  return (
    <DetailPage
      testID="project-form"
      title={FORM.title}
      foot={
        <Foot label={CREATE.create} ok={!why && !busy} why={why} onPress={create}>
          {busy && <ButtonSpinner />}
          <ButtonText>{CREATE.create}</ButtonText>
        </Foot>
      }
    >
      {error && <FormError testID="form-error">{error}</FormError>}
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
      <Labelled label={FORM.lead} hint={FORM.leadHint}>
        <SelectField
          label={FORM.lead}
          testID="form-lead"
          options={leads}
          value={leadId}
          onChange={setLeadId}
        />
      </Labelled>
      <Labelled label={FORM.status} hint={FORM.statusHint}>
        <Chips label={FORM.status} items={STATUS_LABELS} value={status} onChange={setStatus} />
      </Labelled>
      <Labelled label={FORM.priority}>
        <Chips
          label={FORM.priority}
          items={PRIORITY_LABELS}
          value={priority}
          onChange={setPriority}
        />
      </Labelled>
      <HStack className="gap-3">
        <VStack className="flex-1">
          <Labelled label={FORM.start}>
            <DateField label={FORM.start} value={start} initial={start} onChange={setStart} />
          </Labelled>
        </VStack>
        <VStack className="flex-1">
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
        </VStack>
      </HStack>
      <Labelled label={FORM.quick}>
        <Chips label={FORM.quick} items={FORM.quickPicks} value={quick ?? -1} onChange={pick} />
      </Labelled>
      <FormMembers me={me} picked={picked} onChange={changeMembers} leadId={leadId} />
      <Note>{FORM.note}</Note>
    </DetailPage>
  );
}

/** The project form once `whoami` says the caller may create projects; anyone else goes home. */
export function ProjectFormScreen() {
  const who = whoamiResource.use();
  useEffect(() => {
    void whoamiResource.ensure();
  }, []);
  const w = who.data;
  if (w)
    return w.caps.createProject ? (
      <ProjectForm me={{ id: w.userId, name: w.name }} />
    ) : (
      <Redirect href="/" />
    );
  return (
    <View className="flex-1 bg-background px-4 pt-4">
      {who.phase === 'failed' ? (
        <FailedState
          testID="form-failed"
          message={who.error?.message}
          onRetry={() => void whoamiResource.reload()}
        />
      ) : (
        <LoadingState testID="form-loading" />
      )}
    </View>
  );
}

/**
 * `/projects/new`: straight to the form. The way chooser (`new.screen.tsx`) and its story, AI draft and template
 * ways stay hidden until the server can draft or copy a project (GAP A-16).
 */
export const NewProjectIndex = () => <Redirect href="/projects/new/form" />;
