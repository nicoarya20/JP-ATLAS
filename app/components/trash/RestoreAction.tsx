/** The "Pulihkan" button of a Trash row (projects and tasks): `loading` while it runs, greyed out with the reason when refused, absent when hidden. */
import { Button, Tooltip } from '@mantine/core';
import type { CapValue } from '@server/access/capabilities';
import { DENY_UI } from '@server/access/decision';
import { FiRotateCcw } from 'react-icons/fi';
import { TRASH_ROW_COPY } from './trash.copy';

/** Why "Pulihkan" is off (expired, impersonating, project in the Trash), or null when it is on or hidden. */
export function restoreBlockedReason(cap: CapValue | undefined): string | null {
  if (cap === undefined || cap === true) return null;
  return cap in DENY_UI ? DENY_UI[cap as keyof typeof DENY_UI].message : null;
}

type Props = {
  cap: CapValue | undefined;
  /** Screen-reader name that says which row the button restores. */
  ariaLabel: string;
  /** This row's restore is running. */
  loading: boolean;
  /** Another row's restore is running; one at a time. */
  busyElsewhere: boolean;
  onRestore: () => void;
};

export function RestoreAction({ cap, ariaLabel, loading, busyElsewhere, onRestore }: Props) {
  if (cap === undefined) return null;
  const reason = restoreBlockedReason(cap);
  const button = (
    <Button
      variant="light"
      leftSection={<FiRotateCcw size="1.25em" aria-hidden />}
      aria-label={ariaLabel}
      loading={loading}
      disabled={reason !== null || busyElsewhere}
      onClick={onRestore}
    >
      {TRASH_ROW_COPY.restore}
    </Button>
  );
  if (!reason) return button;
  return (
    <Tooltip label={reason} multiline maw={280}>
      {/* A disabled button fires no pointer events; the span carries the tooltip. */}
      <span>{button}</span>
    </Tooltip>
  );
}
