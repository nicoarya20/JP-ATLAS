// Members & roles of the project form (prototype projects.create.jsx ProjectsForm): the creator stays Manager, the
// people the new project may start with join as Members and their role can be changed.
//
// A row is keyed by `userId`, not by display name. The create route takes `members: [{userId, role}]`, so a name-keyed
// map could not be sent at all — and two people called Budi used to share one row's role silently (K4).
//
// "+ Add member" picks from the same list, so the button is gone: everyone the project may start with is already
// offered here. Choosing people who are *not* in the picker needs a search the route does not have (GAP B-11).
import { PersonAvatar } from '@/components/avatar/person-avatar';
import { SelectField } from '@/components/form/select-field';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { PROJECT_ROLES_LIST } from '@/data/projects.detail';
import type { PickerOption } from '@/data/projects.api.members';
import type { ProjectRole } from '@/data/sample/projects.extra';

import { Labelled } from '../parts/form-bits';
import { FORM } from '../projects.strings';

const ROLE_OPTIONS = PROJECT_ROLES_LIST.map((r) => ({ value: r, label: r }));

function MemberRow({
  full,
  sub,
  pick,
  onRole,
}: {
  full: string;
  sub?: string;
  pick: ProjectRole;
  onRole?: (r: ProjectRole) => void;
}) {
  return (
    <HStack className="items-center gap-3">
      <PersonAvatar name={full} size="sm" />
      <VStack className="flex-1">
        <Text className="text-body">{full}</Text>
        {!!sub && <Text className="text-footnote text-muted-foreground">{sub}</Text>}
      </VStack>
      <VStack className="w-36">
        <SelectField
          label={FORM.memberRole(full)}
          options={ROLE_OPTIONS}
          value={pick}
          disabled={!onRole}
          onChange={(r) => onRole?.(r)}
        />
      </VStack>
    </HStack>
  );
}

type FormMembersProps = {
  /** The signed-in account, fixed as Manager: the server makes the creator one anyway. */
  creator: string;
  /** Everyone the project may start with, from the team picker. */
  people: readonly PickerOption[];
  /** `userId` -> role, for the rows that have one; absent means "not joining". */
  roles: Readonly<Record<string, ProjectRole>>;
  onRoles: (next: Readonly<Record<string, ProjectRole>>) => void;
};

/** The member rows: the creator first and fixed, then everyone the picker offers. */
export function FormMembers({ creator, people, roles, onRoles }: FormMembersProps) {
  return (
    <Labelled label={FORM.members} hint={FORM.creatorStays}>
      <VStack className="gap-2">
        <MemberRow full={creator} pick="Manager" />
        {people.map((p) => (
          <MemberRow
            key={p.value}
            full={p.label}
            sub={p.sub}
            pick={roles[p.value] ?? 'Member'}
            onRole={(r) => onRoles({ ...roles, [p.value]: r })}
          />
        ))}
      </VStack>
    </Labelled>
  );
}
