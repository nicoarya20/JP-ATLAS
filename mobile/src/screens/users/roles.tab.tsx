// Users ② Roles (prototype users.roles.jsx): give or remove the Project Manager role, or deactivate a user. My own row
// is read-only. A role change or deactivation asks first (T2).
import { useState } from 'react';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { CountChips } from '@/components/form/chips';
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
import type { AccountRole } from '@/data/people';
import { GRANTABLE_ROLES, getRoles, type RoleRow } from '@/data/users';

import { InfoBox } from './info-box';
import { type UserAsk, useUserConfirm } from './users.confirm';
import { CONFIRM, ROLES, USERS } from './users.strings';

type PersonProps = { row: RoleRow; ask: (a: UserAsk) => void };

/** One account: name and email; others get the role picker and Deactivate. */
function Person({ row, ask }: PersonProps) {
  const notice = useNotice();
  const p = row.person;
  const [role, setRole] = useState<AccountRole>(p.role);
  const options = [...new Set<AccountRole>([...GRANTABLE_ROLES, p.role])].map((r) => ({
    value: r,
    label: r,
  }));
  const change = (to: AccountRole) =>
    ask({
      ...CONFIRM.role(p.full, role, to),
      run: () => {
        setRole(to);
        notice(ROLES.changed(to));
      },
    });
  const deactivate = () =>
    ask({
      ...CONFIRM.deactivate(p.full, role),
      danger: true,
      run: () => notice(ROLES.deactivated),
    });
  return (
    <VStack testID={`role-row-${p.key}`} className="gap-3 px-4 py-3">
      <HStack className="items-center gap-3">
        <PersonAvatar name={p.full} />
        <VStack className="min-w-0 flex-1 gap-1">
          <Text className="text-body">{row.you ? `${p.full} ${ROLES.you}` : p.full}</Text>
          <Text className="text-footnote text-muted-foreground">{p.email}</Text>
        </VStack>
        {row.you && (
          <VStack className="items-end gap-1">
            <StatusPill status={ROLES.active} />
            <Text className="text-footnote font-semibold">{p.role}</Text>
          </VStack>
        )}
      </HStack>
      {!row.you && (
        <HStack className="items-center gap-2">
          <VStack className="flex-1">
            <SelectField
              label={`${ROLES.role}: ${p.full}`}
              options={options}
              value={role}
              onChange={change}
            />
          </VStack>
          <Button
            size="sm"
            variant="outline"
            accessibilityLabel={`${ROLES.deactivate} ${p.full}`}
            onPress={deactivate}
          >
            <ButtonText className="text-destructive">{ROLES.deactivate}</ButtonText>
          </Button>
        </HStack>
      )}
    </VStack>
  );
}

/** The Roles tab. */
export function RolesTab() {
  const d = getRoles();
  const [search, setSearch] = useState('');
  const [dialog, ask] = useUserConfirm();
  const q = search.trim().toLowerCase();
  const people = d.people.filter((r) =>
    `${r.person.full} ${r.person.email}`.toLowerCase().includes(q),
  );
  return (
    <>
      <Text className="text-subhead text-muted-foreground">{ROLES.intro}</Text>
      <VStack className="gap-2">
        <CountChips items={d.chips} />
        <SearchField placeholder={USERS.search} value={search} onChangeText={setSearch} />
      </VStack>
      <VStack className="gap-2">
        <Text className="text-footnote font-semibold">{d.count}</Text>
        {people.length ? (
          <Rows>
            {people.map((r) => (
              <Person key={r.person.key} row={r} ask={ask} />
            ))}
          </Rows>
        ) : (
          <NoMatch title={USERS.noMatch} onReset={() => setSearch('')} />
        )}
      </VStack>
      <InfoBox title={ROLES.infoTitle} items={ROLES.info} />
      {dialog}
    </>
  );
}
