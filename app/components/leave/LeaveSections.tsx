/**
 * The leave blocks of Pengaturan: Ketersediaan (everyone) and Pengaturan tim (Admin). Approvers decide
 * requests from the Inbox card, not here. Which blocks show is decided by the loader flags, never by a role here.
 */
import { useState } from 'react';
import { useRevalidator } from 'react-router';
import { SettingsSection } from '~/components/account/SettingsSection';
import type { LeavePageData } from '~/lib/leave-api';
import { LeaveCard } from './LeaveCard';
import { LeaveRequestModal } from './LeaveRequestModal';
import { LeaveTeamSwitch } from './LeaveTeamSwitch';
import { LEAVE_COPY, LEAVE_SWITCH_COPY } from './leave.copy';
import { useLeaveActions } from './useLeaveActions';

export function LeaveSections({ leave }: { leave: LeavePageData }) {
  const { me, today, flags } = leave;
  const { revalidate } = useRevalidator();
  const actions = useLeaveActions();
  const [requesting, setRequesting] = useState(false);
  const refresh = () => void revalidate();

  return (
    <>
      <SettingsSection title={LEAVE_COPY.availabilityTitle}>
        <LeaveCard
          me={me}
          approvers={flags.approvers}
          today={today}
          busy={actions.cancelling}
          onRequest={() => setRequesting(true)}
          onCancel={() => me.request && actions.askCancel(me.request)}
        />
        <LeaveRequestModal
          opened={requesting}
          today={today}
          approvers={flags.approvers}
          autoApproves={flags.autoApproves}
          onClose={() => setRequesting(false)}
          onSaved={refresh}
        />
      </SettingsSection>
      {flags.canManageSwitch && (
        <SettingsSection title={LEAVE_SWITCH_COPY.title}>
          <LeaveTeamSwitch initial={me.requiresApproval} />
        </SettingsSection>
      )}
    </>
  );
}
