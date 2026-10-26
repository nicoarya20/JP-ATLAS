/**
 * The leave block of Pengaturan: Ketersediaan, read-only for everyone. Nothing is decided here any
 * more — Admin records leave from /dashboard/users (P14 D3) — so there is no role flag to read.
 */
import { SettingsSection } from '~/components/account/SettingsSection';
import type { LeavePageData } from '~/lib/leave-api';
import { LeaveCard } from './LeaveCard';
import { LEAVE_COPY } from './leave.copy';

export function LeaveSections({ leave }: { leave: LeavePageData }) {
  return (
    <SettingsSection title={LEAVE_COPY.availabilityTitle}>
      <LeaveCard onLeaveUntil={leave.onLeaveUntil} />
    </SettingsSection>
  );
}
