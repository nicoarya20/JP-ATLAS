// Users ② Roles (prototype users.roles.jsx): every approved account (`/api/admin/users?approval=approved`, by name).
// Give or remove the Project Manager role, deactivate or reactivate a user; each asks first (T2). A row the server
// would refuse (yourself, a Super-admin, an Admin unless you are a Super-admin) is read-only.
import { PersonAvatar } from '@/components/avatar/person-avatar';
import { SelectField } from '@/components/form/select-field';
import { Rows } from '@/components/list/rows';
import { useNotice } from '@/components/notice/use-notice';
import { SearchField } from '@/components/search/search-field';
import { NoMatch } from '@/components/state/no-match';
import { StatusPill } from '@/components/status/status-pill';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { AccountRoleWire } from '@/data/team.api';
import { ACCOUNT_ROLE } from '@/data/team.person';
import { type AccountRow, accountRow } from '@/data/users.admin.view';
import { deactivateUser, reactivateUser, setUserRole } from '@/data/users.admin.write';
import { whoamiResource } from '@/data/whoami.api';

import { InfoBox } from './info-box';
import { type UserAsk, useUserConfirm } from './users.confirm';
import { ListState, LoadMore, useUsersList } from './users.list';
import { CONFIRM, ROLES, USERS } from './users.strings';

/** Deactivate or Reactivate, by what the account is now. */
function Switcher({ row, ask }: { row: AccountRow; ask: (a: UserAsk) => void }) {
  const notice = useNotice();
  const reactivate = () =>
    ask({
      ...CONFIRM.reactivate(row.full),
      run: async () => {
        await reactivateUser(row.id);
        notice(ROLES.reactivated);
      },
    });
  const deactivate = () =>
    ask({
      ...CONFIRM.deactivate(row.full, row.roleLabel),
      danger: true,
      run: async () => {
        await deactivateUser(row.id);
        notice(ROLES.deactivated);
      },
    });
  const off = row.deactivated;
  return (
    <Button
      size="sm"
      variant="outline"
      accessibilityLabel={`${off ? ROLES.reactivate : ROLES.deactivate} ${row.full}`}
      onPress={off ? reactivate : deactivate}
    >
      <ButtonText className={off ? undefined : 'text-destructive'}>
        {off ? ROLES.reactivate : ROLES.deactivate}
      </ButtonText>
    </Button>
  );
}

/** One account: name and email; one that may be changed gets the role picker and Deactivate / Reactivate. */
function Person({ row, ask }: { row: AccountRow; ask: (a: UserAsk) => void }) {
  const notice = useNotice();
  const change = (to: AccountRoleWire) => {
    if (to === row.role) return;
    ask({
      ...CONFIRM.role(row.full, row.roleLabel, ACCOUNT_ROLE[to]),
      run: async () => {
        await setUserRole(row.id, to);
        notice(ROLES.changed(ACCOUNT_ROLE[to]));
      },
    });
  };
  return (
    <VStack testID={`role-row-${row.id}`} className="gap-3 px-4 py-3">
      <HStack className="items-center gap-3">
        <PersonAvatar name={row.full} />
        <VStack className="min-w-0 flex-1 gap-1">
          <Text className="text-body">{row.you ? `${row.full} ${ROLES.you}` : row.full}</Text>
          <Text className="text-footnote text-muted-foreground">{row.email}</Text>
        </VStack>
        {(!row.editable || row.deactivated) && (
          <VStack className="items-end gap-1">
            <StatusPill status={row.deactivated ? ROLES.inactive : ROLES.active} />
            <Text className="text-footnote font-semibold">{row.roleLabel}</Text>
          </VStack>
        )}
      </HStack>
      {row.editable && (
        <HStack className="items-center gap-2">
          {!row.deactivated && (
            <VStack className="flex-1">
              <SelectField
                label={`${ROLES.role}: ${row.full}`}
                options={row.options}
                value={row.role}
                onChange={change}
              />
            </VStack>
          )}
          <Switcher row={row} ask={ask} />
        </HStack>
      )}
    </VStack>
  );
}

/** The Roles tab. */
export function RolesTab() {
  const { state, search, setSearch } = useUsersList('roles');
  const me = whoamiResource.use().data;
  const [dialog, ask] = useUserConfirm();
  const data = state.data;
  const rows = data?.users.map((u) => accountRow(u, me)) ?? [];
  return (
    <>
      <Text className="text-subhead text-muted-foreground">{ROLES.intro}</Text>
      <SearchField placeholder={USERS.search} value={search} onChangeText={setSearch} />
      <ListState tab="roles" state={state} />
      {data && (
        <VStack className="gap-2">
          <Text className="text-footnote font-semibold">{ROLES.count(data.total)}</Text>
          {rows.length ? (
            <Rows>
              {rows.map((r) => (
                <Person key={r.id} row={r} ask={ask} />
              ))}
            </Rows>
          ) : (
            <NoMatch title={USERS.noMatch} onReset={() => setSearch('')} />
          )}
          <LoadMore tab="roles" data={data} />
        </VStack>
      )}
      <InfoBox title={ROLES.infoTitle} items={ROLES.info} />
      {dialog}
    </>
  );
}
