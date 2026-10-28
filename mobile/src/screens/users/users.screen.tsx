// Users (Admin; prototype UsersScreen): back, "Users", the Approval / Roles tabs (route param `tab`). It is the Admin
// console's (`/api/admin`), so it opens only for someone whoami lets into the dashboard (`caps.dashboard`); anyone
// else lands on Home. Until whoami is in, it waits.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { Seg } from '@/components/form/seg';
import { DetailPage } from '@/components/screen/detail-page';
import { FailedState, LoadingState } from '@/components/state/section-state';
import type { UsersTab } from '@/data/users.admin.api';
import { whoamiResource } from '@/data/whoami.api';

import { ApprovalTab } from './approval.tab';
import { RolesTab } from './roles.tab';
import { USERS } from './users.strings';

const TABS: readonly UsersTab[] = ['approval', 'roles'];

/** The Users screen. */
export function UsersScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const who = whoamiResource.use();
  const caps = who.data?.caps ?? null;
  useEffect(() => {
    void whoamiResource.ensure();
  }, []);
  if (caps && !caps.dashboard) return <Redirect href="/" />;
  const tab: UsersTab = params.tab === 'roles' ? 'roles' : 'approval';
  return (
    <DetailPage testID="screen-users" title={USERS.title} tabBar>
      {caps ? (
        <>
          <Seg
            testID="users-tabs"
            label={USERS.tabsLabel}
            items={USERS.tabs}
            value={TABS.indexOf(tab)}
            onChange={(i) => router.setParams({ tab: TABS[i] ?? 'approval' })}
          />
          {tab === 'approval' ? <ApprovalTab /> : <RolesTab />}
        </>
      ) : who.phase === 'failed' ? (
        <FailedState
          testID="users-failed"
          message={who.error?.message}
          onRetry={() => void whoamiResource.reload()}
        />
      ) : (
        <LoadingState testID="users-loading" />
      )}
    </DetailPage>
  );
}
