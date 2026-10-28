// Create project of the form: the body `POST /api/app/projects` takes, then the new project opened over the Projects
// list (so Back lands on the list) with "Project created"; a refusal stays on the form in the server's words.
import { router } from 'expo-router';
import { useState } from 'react';

import { isApiError } from '@/api/errors';
import { useNotice } from '@/components/notice/use-notice';
import { type CreateProjectBody, createProject } from '@/data/projects.write';

import { writeError } from '../parts/write-run';
import { CREATE } from '../projects.strings';
import type { Picked } from './form-members';

export type FormValues = Omit<CreateProjectBody, 'leadId' | 'members' | 'description'> & {
  description: string;
  leadId: string;
  picked: readonly Picked[];
};

/** The request body: blanks left out, the creator not sent as Lead, and the Lead sent as a Manager. */
export function createBody(meId: string, v: FormValues): CreateProjectBody {
  const description = v.description.trim();
  return {
    name: v.name.trim(),
    ...(description && { description }),
    status: v.status,
    priority: v.priority,
    ...(v.leadId !== meId && { leadId: v.leadId }),
    ...(v.startDate && { startDate: v.startDate }),
    ...(v.dueDate && { dueDate: v.dueDate }),
    ...(v.picked.length > 0 && {
      members: v.picked.map((m) => ({
        userId: m.id,
        role: m.id === v.leadId ? 'manager' : m.role,
      })),
    }),
  };
}

/** `{ busy, error, submit }`. */
export function useCreateProject() {
  const notice = useNotice();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (body: CreateProjectBody) => {
    setBusy(true);
    setError(null);
    try {
      const p = await createProject(body);
      router.dismissTo('/projects');
      router.push(`/projects/${p.id}`);
      notice(CREATE.created);
    } catch (e) {
      setError(writeError(e));
      if (!isApiError(e)) throw e;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, submit };
}
