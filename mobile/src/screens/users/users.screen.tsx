// Users (Admin; prototype UsersScreen): back, "Users", the Approval / Roles tabs (route param `tab`). Another role
// opening it lands on Home (roles.gating).
import { Redirect, router, useLocalSearchParams } from 'expo-router';

import { Seg } from '@/components/form/seg';
import { DetailPage } from '@/components/screen/detail-page';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import type { UsersTab } from '@/data/users';
import { allowedScreen } from '@/navigation/screen-roles';

import { ApprovalTab } from './approval.tab';
import { RolesTab } from './roles.tab';
import { USERS } from './users.strings';

const TABS: readonly UsersTab[] = ['approval', 'roles'];

/** The Users screen. role: who is signed in (K12). */
export function UsersScreen({ role = SESSION_ROLE }: { role?: Role }) {
  const params = useLocalSearchParams<{ tab?: string }>();
  if (!allowedScreen('users.approve', role)) return <Redirect href="/" />;
  const tab: UsersTab = params.tab === 'roles' ? 'roles' : 'approval';
  return (
    <DetailPage testID="screen-users" title={USERS.title} tabBar>
      <Seg
        items={USERS.tabs}
        value={TABS.indexOf(tab)}
        onChange={(i) => router.setParams({ tab: TABS[i] ?? 'approval' })}
      />
      {tab === 'approval' ? <ApprovalTab /> : <RolesTab />}
    </DetailPage>
  );
}
