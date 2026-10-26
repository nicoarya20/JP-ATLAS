// Projects ④ Fill in project form (prototype projects.create.jsx ProjectsForm): name, description, Lead, initial
// status, priority, dates with quick picks, members and their roles (the creator stays Manager). Create project saves
// nothing in Phase 1, like the prototype: it opens the Atlas overview with "Project created".
import { Redirect } from 'expo-router';
import { useState } from 'react';

import { Chips } from '@/components/form/chips';
import { DateField } from '@/components/form/date-field';
import { Field } from '@/components/form/field';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { getProjectCreate } from '@/data/projects';
import { QUICK_ENDS } from '@/data/projects.dates';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { Note } from '../parts/display';
import { Foot, Labelled } from '../parts/form-bits';
import { CREATE, EDIT, FORM } from '../projects.strings';
import { WHY } from '../projects.strings.added';
import { createProject } from './create-done';
import { FormMembers } from './form-members';

/** Prototype defaults: Active, Medium, ends 1 month after it starts. */
const ACTIVE = 1;
const MEDIUM = 1;
const ONE_MONTH = 2;

/** The project form, for a Manager or Admin; a Member goes home. */
export function ProjectFormScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const notice = useNotice();
  const [c] = useState(() => getProjectCreate(role));
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState(ACTIVE);
  const [priority, setPriority] = useState(MEDIUM);
  const [start, setStart] = useState(c.today);
  const [quick, setQuick] = useState<number | null>(ONE_MONTH);
  const [end, setEnd] = useState(() => QUICK_ENDS[ONE_MONTH]?.(c.today) ?? c.today);
  const [touched, setTouched] = useState(false);
  if (!allowedScreen('projects.form', role)) return <Redirect href="/" />;
  const why = name.trim() ? undefined : WHY.name;
  const pick = (i: number) => {
    setQuick(i);
    setEnd(QUICK_ENDS[i]?.(start) ?? end);
  };
  return (
    <DetailPage
      testID="project-form"
      title={FORM.title}
      foot={
        <Foot label={CREATE.create} ok={!why} why={why} onPress={() => createProject(notice)} />
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
        <SelectField
          label={FORM.lead}
          options={[{ value: c.creator.name, label: c.creator.full }]}
          value={c.creator.name}
          disabled
          onChange={() => undefined}
        />
      </Labelled>
      <Labelled label={FORM.status} hint={FORM.statusHint}>
        <Chips label={FORM.status} items={FORM.statuses} value={status} onChange={setStatus} />
      </Labelled>
      <Labelled label={FORM.priority}>
        <Chips
          label={FORM.priority}
          items={EDIT.priorities}
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
      <FormMembers creator={c.creator.full} helpers={c.helpers} />
      <Note>{FORM.note}</Note>
    </DetailPage>
  );
}
