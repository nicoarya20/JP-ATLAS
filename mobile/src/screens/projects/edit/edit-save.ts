// Saving Edit project: what the confirmation must say before it is sent (closing the project, a new Lead), and the
// save itself, busy while it runs; a failure stays on the form in the server's words.
import { router } from 'expo-router';
import { useState } from 'react';

import { isApiError } from '@/api/errors';
import { useNotice } from '@/components/notice/use-notice';
import type { Choice } from '@/data/projects.form';
import { CLOSING, STATUS_LABEL } from '@/data/projects.query';
import { type ProjectChange, saveProject } from '@/data/projects.write';

import { writeError } from '../parts/write-run';
import { EDIT } from '../projects.strings';

/** The sentences of the T2 confirmation; empty when the change needs none. */
export function confirmOf(change: ProjectChange, name: string, leads: readonly Choice<string>[]) {
  const { status, leadId } = change;
  return [
    status && CLOSING.includes(status) ? EDIT.closes(name, STATUS_LABEL[status]) : null,
    leadId ? EDIT.newLead(leads.find((l) => l.value === leadId)?.label ?? '') : null,
  ].filter((x): x is string => !!x);
}

/** `{ busy, error, save, confirmed }`: both send `change`, then go back to the project saying "Project updated". */
export function useEditSave(id: string, change: ProjectChange) {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** For the T2 dialog, which shows its own spinner and error. */
  const confirmed = async () => {
    await saveProject(id, change);
    router.back();
    notice(EDIT.saved);
  };
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await confirmed();
    } catch (e) {
      setError(writeError(e));
      if (!isApiError(e)) throw e;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, save, confirmed };
}
