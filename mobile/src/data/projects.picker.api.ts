/**
 * `GET /api/app/team/picker` (`server/api/app-team.picker.ts`): the people a project can take, by name. With a
 * project it leaves out who is already in it (any viewer of that project may ask); without one it is for the New
 * project form, and only someone who may create projects gets an answer.
 *
 * Not a resource: each search is its own short-lived answer, kept by the picker that asked.
 */
import { apiGet } from '@/api/client';
import { isApiError } from '@/api/errors';
import { applyApiError } from '@/session/session.state';

export type PickerPersonWire = {
  id: string;
  name: string;
  jobTitle: string | null;
  image: string | null;
};

/** The server refuses a longer search (`SEARCH_MAX_LENGTH`). */
export const PICKER_SEARCH_MAX = 100;
/** The server's own default; enough to pick from without paging. */
export const PICKER_LIMIT = 20;

/** People matching `q` (blank: the first ones by name), outside project `projectId` when given. */
export async function searchPeople(q: string, projectId?: string): Promise<PickerPersonWire[]> {
  const params = new URLSearchParams({ limit: String(PICKER_LIMIT) });
  const text = q.trim().slice(0, PICKER_SEARCH_MAX);
  if (text) params.set('q', text);
  if (projectId) params.set('projectId', projectId);
  try {
    const answer = await apiGet<{ items: PickerPersonWire[] }>(`/api/app/team/picker?${params}`);
    return answer.items;
  } catch (e) {
    if (isApiError(e)) applyApiError(e);
    throw e;
  }
}
