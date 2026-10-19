/**
 * Client for the deadline, manual-condition and activity routes of a project (`/api/app/projects/:id/...`,
 * S5a-03), through Eden. Failures come back as `ApiError` with plain Indonesian wording per code.
 */
import type { ExtensionReasonCategory, ProjectCondition } from '@server/pm/enums';
import type { ActivityItemDto } from '@server/project/project-activity.dto';
import type { ConditionOverrideDto, DeadlineExtensionDto } from '@server/project/project-plan.dto';
import { client } from './eden';
import { ApiError } from './http';
import { unwrap } from './projects-api';

export type { ActivityItemDto, ConditionOverrideDto, DeadlineExtensionDto };

/** React-query keys; the project keys (`projectKeys.all`) stay the place to refresh the detail. */
export const deadlineKeys = {
  extensions: (id: string) => ['projects', 'detail', id, 'extensions'] as const,
  activity: (id: string) => ['projects', 'detail', id, 'activity'] as const,
};

/** Plain wording per refusal code of these routes; the server texts are longer and mention other screens. */
export const DEADLINE_ERROR_MESSAGES: Record<string, string> = {
  NOT_LATER: 'Tenggat baru harus lebih lambat dari tenggat sekarang.',
  NO_DEADLINE: 'Proyek ini belum punya tenggat. Isi tenggatnya lewat "Ubah proyek" dulu.',
  PROJECT_CLOSED: 'Proyek yang sudah selesai atau dibatalkan tidak bisa diperpanjang.',
  NOT_ACTIVE: 'Kondisi manual hanya bisa dipasang pada proyek yang sedang berjalan.',
  REASON_REQUIRED: 'Tuliskan alasannya agar tim paham.',
};
/** Anyone who is not a manager of the project gets 403, whatever code the policy used. */
export const NOT_ALLOWED_MESSAGE = 'Hanya pengelola proyek ini yang boleh melakukan ini.';
const HTTP_FORBIDDEN = 403;

/** Replaces the message of a known code; anything else passes through untouched. */
export function withDeadlineMessage(err: unknown): unknown {
  if (!(err instanceof ApiError)) return err;
  const message =
    err.status === HTTP_FORBIDDEN ? NOT_ALLOWED_MESSAGE : DEADLINE_ERROR_MESSAGES[err.code];
  if (!message) return err;
  return new ApiError({
    message,
    status: err.status,
    code: err.code,
    requestId: err.requestId,
    issues: err.issues,
  });
}

async function call<T>(request: Promise<Parameters<typeof unwrap<T>>[0]>): Promise<T> {
  try {
    return unwrap(await request);
  } catch (error) {
    throw withDeadlineMessage(error);
  }
}

const pathId = (id: string) => encodeURIComponent(id);
const project = (id: string) => client.api.app.projects({ id: pathId(id) });

export type ExtendDeadlineInput = {
  newDueDate: string; // YYYY-MM-DD
  reasonCategory: ExtensionReasonCategory;
  reason: string;
};

export function extendProjectDeadline(id: string, input: ExtendDeadlineInput) {
  return call(project(id)['extend-deadline'].post(input));
}

export type ExtensionList = {
  items: DeadlineExtensionDto[];
  /** Every extension ever made, which can exceed `items`. */
  count: number;
};

export async function fetchExtensions(id: string): Promise<ExtensionList> {
  const { items, count } = await call(project(id).extensions.get({ query: {} }));
  return { items, count };
}

export type ConditionOverrideInput = {
  condition: ProjectCondition;
  reason: string;
  /** ISO instant in the future; omitted = until cleared by hand. */
  expiresAt?: string | null;
};

export function setConditionOverride(id: string, input: ConditionOverrideInput) {
  return call(project(id)['condition-override'].post(input));
}

export function clearConditionOverride(id: string) {
  return call(project(id)['condition-override'].delete());
}

export type ActivityPage = { items: ActivityItemDto[]; nextCursor: string | null };

/** One page of the activity feed, newest first; pass the previous `nextCursor` for the next page. */
export async function fetchActivity(
  id: string,
  page: { cursor?: string | null; limit: number },
): Promise<ActivityPage> {
  const { cursor, limit } = page;
  return call(project(id).activity.get({ query: cursor ? { cursor, limit } : { limit } }));
}
