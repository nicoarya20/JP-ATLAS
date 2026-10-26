/**
 * "Setel cuti" dialog of `/dashboard/users` (P14 CU-04): the range and the Admin-only note of one
 * person's leave. The range rules come from `cleanLeaveInput`, the very function the endpoint runs,
 * so the sentence under the button is the sentence a 422 would carry — one implementation, nothing
 * to drift. What only the server can know (a clash with another period, 409) arrives as `error` and
 * keeps the dialog open so the dates can be fixed in place.
 */
import { Alert, Button, Group, Loader, Stack, Text, Textarea } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { LEAVE_NOTE_MAX } from '@server/leave/leave.dto';
import { cleanLeaveInput, isLeaveRefusal } from '@server/leave/leave.validate';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FALLBACK_ERROR, notify } from '~/components/ui/notify';
import {
  type AdminLeavePeriod,
  fetchUserLeave,
  type SetLeaveInput,
  setUserLeave,
  userLeaveKey,
  userLeaveKeyPrefix,
} from '~/lib/admin-leave-api';
import type { AdminUser } from '~/lib/admin-users-api';
import { formatLeaveRange } from '~/lib/leave-view';
import { SET_LEAVE_COPY as COPY } from './user-leave.copy';

const DATE_FORMAT = 'D MMMM YYYY';

export type LeaveTarget = Pick<AdminUser, 'id' | 'name'>;

export type SetLeaveValues = { startDate: string | null; endDate: string | null; note: string };

export const EMPTY_SET_LEAVE: SetLeaveValues = { startDate: null, endDate: null, note: '' };

/** Prefills from the period under way, so correcting it is an edit and not a retype. */
export const setLeaveValuesOf = (running: AdminLeavePeriod | null): SetLeaveValues =>
  running === null
    ? EMPTY_SET_LEAVE
    : { startDate: running.startDate, endDate: running.endDate, note: running.note ?? '' };

/** Why the save button is off, or null when the input is ready to send. */
export function setLeaveBlocker(v: SetLeaveValues): string | null {
  if (!v.startDate || !v.endDate) return COPY.missingDates;
  const clean = cleanLeaveInput({ startDate: v.startDate, endDate: v.endDate, note: v.note });
  return isLeaveRefusal(clean) ? (clean.error ?? COPY.missingDates) : null;
}

/** The body to send, or null while the input is unusable. */
export function toSetLeaveInput(v: SetLeaveValues): SetLeaveInput | null {
  if (!v.startDate || !v.endDate) return null;
  return { startDate: v.startDate, endDate: v.endDate, note: v.note.trim() || null };
}

type ViewProps = {
  /** The period being replaced, or null when this is the first one. */
  running: AdminLeavePeriod | null;
  values: SetLeaveValues;
  onChange: (patch: Partial<SetLeaveValues>) => void;
  blocker: string | null;
  /** The last refusal from the server, in its own words (409 `LEAVE_OVERLAP`, 422). */
  error: string | null;
  loading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
};

/** The dialog body without state, so it renders the same in a test and in the app. */
export function SetLeaveView(p: ViewProps) {
  const { values, running, blocker } = p;
  const used = values.note.trim().length;
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        {COPY.intro}
      </Text>
      {running && (
        <Alert color="warn" variant="light">
          {COPY.replaces(formatLeaveRange(running.startDate, running.endDate))}
        </Alert>
      )}
      <Group grow align="flex-start" wrap="wrap">
        <DateInput
          label={COPY.start}
          placeholder={COPY.datePlaceholder}
          valueFormat={DATE_FORMAT}
          value={values.startDate}
          onChange={(startDate) => p.onChange({ startDate })}
          clearable
        />
        <DateInput
          label={COPY.end}
          placeholder={COPY.datePlaceholder}
          valueFormat={DATE_FORMAT}
          minDate={values.startDate ?? undefined}
          value={values.endDate}
          onChange={(endDate) => p.onChange({ endDate })}
          clearable
        />
      </Group>
      <Textarea
        label={COPY.note}
        description={COPY.noteHint}
        placeholder={COPY.notePlaceholder}
        autosize
        minRows={2}
        value={values.note}
        onChange={(e) => p.onChange({ note: e.currentTarget.value })}
      />
      <Text size="xs" c={used > LEAVE_NOTE_MAX ? 'danger' : 'dimmed'} ta="right">
        {COPY.counter(used, LEAVE_NOTE_MAX)}
      </Text>
      {p.error && (
        <Alert color="danger" role="alert">
          {p.error}
        </Alert>
      )}
      {/* The reason sits next to the off button, so nobody has to guess what is missing. */}
      {blocker && (
        <Text size="sm" c="dimmed" id="set-leave-blocker">
          {blocker}
        </Text>
      )}
      <Group justify="flex-end" gap="xs" wrap="wrap">
        <Button variant="default" onClick={p.onCancel} disabled={p.loading}>
          {COPY.cancel}
        </Button>
        <Button
          loading={p.loading}
          disabled={blocker !== null}
          aria-describedby={blocker ? 'set-leave-blocker' : undefined}
          onClick={p.onSubmit}
        >
          {COPY.submit}
        </Button>
      </Group>
    </Stack>
  );
}

type FormProps = {
  user: LeaveTarget;
  /** The period under way, or null when the person is here; it prefills the fields. */
  running: AdminLeavePeriod | null;
  onClose: () => void;
};

/**
 * The dialog with its own field state and its own write. The mutation lives here, not in the hook
 * that opened the dialog: a modal's children are rendered from the element handed to `modals.open`,
 * so a `loading` prop passed in from outside would never change.
 */
export function SetLeaveForm({ user, running, onClose }: FormProps) {
  const [values, setValues] = useState<SetLeaveValues>(() => setLeaveValuesOf(running));
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (input: SetLeaveInput) => setUserLeave(user.id, input),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: userLeaveKeyPrefix(user.id) });
      const range = formatLeaveRange(res.period.startDate, res.period.endDate);
      // Replacing is never silent: the admin is told which period is gone (handover, D6).
      notify.success(
        res.replaced
          ? COPY.savedReplacing(
              user.name,
              range,
              formatLeaveRange(res.replaced.startDate, res.replaced.endDate),
            )
          : COPY.saved(user.name, range, res.period.days),
      );
      onClose();
    },
    // The dialog stays open on a refusal: a 409 names the period in the way, and the fix is here.
    onError: (e: unknown) => {
      setError(e instanceof Error ? e.message : FALLBACK_ERROR);
      notify.fail(COPY.failed, e);
    },
  });
  const input = toSetLeaveInput(values);
  return (
    <SetLeaveView
      running={running}
      values={values}
      onChange={(patch) => {
        setError(null);
        setValues((v) => ({ ...v, ...patch }));
      }}
      blocker={setLeaveBlocker(values)}
      error={error}
      loading={save.isPending}
      onSubmit={() => input && save.mutate(input)}
      onCancel={onClose}
    />
  );
}

/**
 * What `modals.open` renders. It resolves the period under way first, so the dialog can say the
 * range is being *replaced* before the Admin saves rather than only afterwards. Opened from the row
 * menu that costs one read; opened from the drawer it is already in the query cache. A failed read
 * does not block recording: the fields start empty and the server still refuses a real overlap.
 */
export function SetLeaveModalBody({ user, onClose }: { user: LeaveTarget; onClose: () => void }) {
  const leave = useQuery({
    queryKey: userLeaveKey(user.id),
    queryFn: () => fetchUserLeave(user.id),
  });
  if (leave.isPending) {
    return (
      <Group justify="center" py="lg">
        <Loader size="sm" />
      </Group>
    );
  }
  return <SetLeaveForm user={user} running={leave.data?.running ?? null} onClose={onClose} />;
}
