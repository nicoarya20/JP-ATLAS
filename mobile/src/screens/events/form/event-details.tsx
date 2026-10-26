// "Add more details" of the event form (prototype events.new.jsx Details): type, project and
// agenda.
//
// Two of the prototype's rows are gone. Repeat: recurrence is refused by the API (GAP-A4). Reminder:
// `remindersMinutes` is real, but picking offsets needs a picker this form does not have, so the
// server's default is used and shown on the detail instead of promised here (B7).
//
// Project cannot be changed while editing: the server refuses `projectId` on a `PATCH`, because an
// event's visibility hangs off the project it was created in.
import { Chips } from '@/components/form/chips';
import { Field } from '@/components/form/field';
import { SelectField } from '@/components/form/select-field';
import { projectOptions } from '@/data/events.query';
import { TYPES } from '@/data/events.shared';

import { FORM } from '../events.strings';
import { EvField } from '../parts/event-field';
import { Note } from '../parts/event-parts';
import type { FormProps } from './event-basics';

/** Project picks, with "no project" first: an event without one is personal (B4). */
const projectPicks = () => [{ value: '', label: FORM.noProject }, ...projectOptions().slice(1)];

/** The details block. */
export function EventDetails({ f, set, editing }: FormProps & { editing: boolean }) {
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
      {!editing && (
        <EvField label={FORM.project} hint={FORM.projectHint} named>
          <SelectField
            label={FORM.project}
            options={projectPicks()}
            value={f.project ?? ''}
            onChange={(project) => set({ project: project || null })}
          />
        </EvField>
      )}
      <Field
        label={FORM.agenda}
        multiline
        value={f.agenda}
        onChangeText={(agenda) => set({ agenda })}
      />
      <Note>{FORM.minutesNote}</Note>
    </>
  );
}
