// "Add more details" of the event form (prototype events.new.jsx Details): type, project, agenda (one item per line)
// and the reminder. The project is picked on a new event only: an event cannot move between projects (E-8). The
// reminder is shown, not picked: the server sets it (gap doc). Repeat waits for the server's series (E-2).
import { useEffect } from 'react';

import { Chips } from '@/components/form/chips';
import { Field } from '@/components/form/field';
import { SelectField } from '@/components/form/select-field';
import { PERSONAL } from '@/data/events.detail';
import { TYPES } from '@/data/events.shared';
import { EVENT_AGENDA_MAX } from '@/data/events.wire';
import { filterProjectsResource } from '@/data/tasks.api';

import { FORM } from '../events.strings';
import { EvField } from '../parts/event-field';
import { Note } from '../parts/event-parts';
import type { FormProps } from './event-basics';

const NO_PROJECT = '';

/** The project pick of a new event: "Personal event", then each project the viewer can see. */
function ProjectPick({ f, set }: FormProps) {
  const state = filterProjectsResource.use();
  useEffect(() => {
    void filterProjectsResource.ensure();
  }, []);
  const options = [
    { value: NO_PROJECT, label: PERSONAL },
    ...(state.data?.items ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];
  return (
    <SelectField
      label={FORM.project}
      options={options}
      value={f.projectId ?? NO_PROJECT}
      onChange={(id) => set({ projectId: id || null })}
      testID="event-project"
    />
  );
}

type EventDetailsProps = FormProps & {
  /** The project's name on an edit (it is shown, not picked); undefined on a new event. */
  lockedProject?: string;
  reminder: string;
};

/** The details block. */
export function EventDetails({ f, set, lockedProject, reminder }: EventDetailsProps) {
  return (
    <>
      <EvField label={FORM.type} named>
        <Chips
          label={FORM.type}
          items={TYPES}
          value={TYPES.indexOf(f.type)}
          onChange={(i) => set({ type: TYPES[i] ?? TYPES[0] })}
        />
      </EvField>
      {lockedProject === undefined ? (
        <EvField label={FORM.project} hint={FORM.projectHint} named>
          <ProjectPick f={f} set={set} />
        </EvField>
      ) : (
        <Field
          label={FORM.project}
          value={lockedProject}
          readOnly
          hint={FORM.projectLocked}
          testID="event-project-locked"
        />
      )}
      <Field
        label={FORM.agenda}
        multiline
        value={f.agenda}
        onChangeText={(agenda) => set({ agenda: agenda.slice(0, EVENT_AGENDA_MAX) })}
        testID="event-agenda"
      />
      <Field label={FORM.reminder} value={reminder} readOnly testID="event-reminder" />
      <Note>{FORM.minutesNote}</Note>
    </>
  );
}
