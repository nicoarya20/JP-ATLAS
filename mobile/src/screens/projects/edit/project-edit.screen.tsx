// Projects ⑬ Edit project (prototype projects.edit.jsx ProjectsEdit), from the detail ⋯: every field the creation form
// had except members (Members tab) and the deadline reason (Extend deadline). Save changes writes the server and goes
// back to the project; a refusal keeps the form up and shows the sentence the server sent (K5).
//
// One button, up to three requests: the server keeps the status and the Lead on routes of their own, so `saveProject`
// sends only the fields that actually changed and stops at the first refusal.
//
// The prototype's "another project already has this name" check is gone. `project.name` has no unique constraint
// (server/db/schema.project.ts) and tasks point at a projectId, so two projects may share a name — the rule would
// refuse a name the server accepts. Listed in docs/phase2-gap-disembunyikan.md.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Chips } from '@/components/form/chips';
import { DateField } from '@/components/form/date-field';
import { Field } from '@/components/form/field';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { DetailPage } from '@/components/screen/detail-page';
import { FailedState, LoadingState } from '@/components/state/section-state';
import { priorityWire, statusWire } from '@/data/projects.api.values';
import { type ProjectEditInput, saveProject } from '@/data/projects.api.write';
import {
  ensureProjectEdit,
  type ProjectEditFields,
  type ProjectEditView,
  reloadProjectEdit,
  useProjectEdit,
} from '@/data/projects.forms';
import type { ProjectPriorityWord } from '@/data/projects.api.values';
import type { ProjectStatus } from '@/data/sample/projects';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { allowedScreen } from '@/navigation/screen-roles';

import { Note } from '../parts/display';
import { Foot, Labelled } from '../parts/form-bits';
import { EDIT } from '../projects.strings';
import { WHY } from '../projects.strings.added';

/** Only what changed, so an untouched field is never sent (and never refused on its own account). */
function changesOf(was: ProjectEditFields, now: ProjectEditFields): ProjectEditInput {
  const input: ProjectEditInput = {};
  if (now.name !== was.name) input.name = now.name.trim();
  if (now.desc !== was.desc) input.description = now.desc.trim() || null;
  if (now.priority !== was.priority) input.priority = priorityWire(now.priority);
  if (now.startDate !== was.startDate) input.startDate = now.startDate;
  if (now.dueDate !== was.dueDate) input.dueDate = now.dueDate;
  if (now.status !== was.status) input.status = statusWire(now.status);
  if (now.leadId !== was.leadId && now.leadId) input.leadId = now.leadId;
  return input;
}

/**
 * The form itself, mounted only once its project has arrived.
 *
 * Kept apart so `useState` seeds from real values: seeding from a project that is still loading and
 * then writing over it in an effect is how a field the user already typed into gets reset.
 */
function EditForm({ id, view }: { id: string; view: ProjectEditView }) {
  const notice = useNotice();
  const was = view.fields;
  const [f, setF] = useState<ProjectEditFields>(was);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<ProjectEditFields>) => setF((s) => ({ ...s, ...patch }));
  const input = changesOf(was, f);
  const nothing = Object.keys(input).length === 0;
  const why = !f.name.trim() ? WHY.name : nothing ? WHY.unchanged : undefined;
  const save = async () => {
    setBusy(true);
    try {
      await saveProject(id, input);
      router.back();
      notice(EDIT.saved);
    } catch (e) {
      // The server's own sentence, as it came (K5); the form stays up so the work is not lost.
      notice(e instanceof Error ? e.message : EDIT.failed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <DetailPage
      testID="project-edit"
      title={EDIT.title}
      foot={
        <Foot
          cancel={EDIT.cancel}
          label={EDIT.save}
          ok={!why && view.mayEdit === 'on'}
          why={view.mayEdit === 'on' ? why : EDIT.mayNot}
          busy={busy}
          onPress={() => void save()}
        />
      }
    >
      <Field
        label={EDIT.name}
        required
        value={f.name}
        onChangeText={(name) => {
          setTouched(true);
          set({ name });
        }}
        onBlur={() => setTouched(true)}
        error={touched && !f.name.trim() ? WHY.name : undefined}
        testID="edit-name"
      />
      <Field
        label={EDIT.desc}
        multiline
        value={f.desc}
        placeholder={EDIT.descPlaceholder}
        onChangeText={(desc) => set({ desc })}
      />
      <Labelled label={EDIT.lead} hint={EDIT.leadHint}>
        <SelectField
          label={EDIT.lead}
          options={view.leads}
          value={f.leadId}
          onChange={(leadId) => set({ leadId })}
        />
      </Labelled>
      <Labelled label={EDIT.status} hint={EDIT.statusHint}>
        <Chips
          label={EDIT.status}
          items={EDIT.statuses}
          value={EDIT.statuses.indexOf(f.status)}
          onChange={(i) => set({ status: (EDIT.statuses[i] as ProjectStatus) ?? f.status })}
        />
      </Labelled>
      <Labelled label={EDIT.priority}>
        <Chips
          label={EDIT.priority}
          items={EDIT.priorities}
          value={EDIT.priorities.indexOf(f.priority)}
          onChange={(i) =>
            set({ priority: (EDIT.priorities[i] as ProjectPriorityWord) ?? f.priority })
          }
        />
      </Labelled>
      {/* Both dates are nullable on the server (GAP A-15), so neither field is assumed to be there. */}
      {f.startDate && (
        <Labelled label={EDIT.start}>
          <DateField
            testID="edit-start"
            label={EDIT.start}
            value={f.startDate}
            initial={f.startDate}
            onChange={(startDate) => set({ startDate })}
          />
        </Labelled>
      )}
      {f.dueDate && (
        <Labelled label={EDIT.deadline}>
          <DateField
            testID="edit-due"
            label={EDIT.deadline}
            value={f.dueDate}
            initial={f.dueDate}
            min={f.startDate ?? undefined}
            onChange={(dueDate) => set({ dueDate })}
          />
        </Labelled>
      )}
      <Note>{EDIT.extendNote}</Note>
    </DetailPage>
  );
}

/** Edit form of the project in the route param `id`; a Member, or a project out of reach, goes home. */
export function ProjectEditScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { view, phase, error, notFound } = useProjectEdit(id);
  useEffect(() => {
    void ensureProjectEdit(id);
  }, [id]);
  if (!allowedScreen('projects.edit', role)) return <Redirect href="/" />;
  // A project that is gone, in the Trash out of reach, or not ours answers one 404 by design.
  if (notFound || view?.mayEdit === 'hidden') return <Redirect href="/" />;
  if (!view) {
    return (
      <DetailPage testID="project-edit-loading" title={EDIT.title}>
        {phase === 'failed' ? (
          <FailedState
            testID="project-edit-failed"
            message={error?.message}
            onRetry={() => void reloadProjectEdit(id)}
          />
        ) : (
          <LoadingState testID="project-edit-spinner" />
        )}
      </DetailPage>
    );
  }
  // Keyed by the project so the form's own state restarts when the route moves to another one.
  return <EditForm key={view.id} id={id} view={view} />;
}
