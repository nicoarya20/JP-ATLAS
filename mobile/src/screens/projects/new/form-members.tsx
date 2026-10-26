// Members & roles of the project form (prototype projects.create.jsx ProjectsForm): the creator stays Manager, the
// people the creator works with join as Members and their role can be changed; + Add member is a notice in Phase 1.
import { useState } from 'react';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { PROJECT_ROLES_LIST } from '@/data/projects.detail';
import type { ProjectRole } from '@/data/sample/projects.extra';

import { Labelled } from '../parts/form-bits';
import { FORM } from '../projects.strings';
import { NAMES } from '../projects.strings.added';

const ROLE_OPTIONS = PROJECT_ROLES_LIST.map((r) => ({ value: r, label: r }));

function MemberRow({
  full,
  pick,
  onRole,
}: {
  full: string;
  pick: ProjectRole;
  onRole?: (r: ProjectRole) => void;
}) {
  return (
    <HStack className="items-center gap-3">
      <PersonAvatar name={full} size="sm" />
      <Text className="flex-1 text-body">{full}</Text>
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

/** The member rows (creator first, fixed) and + Add member. */
export function FormMembers({ creator, helpers }: { creator: string; helpers: readonly string[] }) {
  const notice = useNotice();
  const [roles, setRoles] = useState<Record<string, ProjectRole>>({});
  return (
    <>
      <Labelled label={FORM.members} hint={FORM.creatorStays}>
        <VStack className="gap-2">
          <MemberRow full={creator} pick="Manager" />
          {helpers.map((h) => (
            <MemberRow
              key={h}
              full={h}
              pick={roles[h] ?? 'Member'}
              onRole={(r) => setRoles((s) => ({ ...s, [h]: r }))}
            />
          ))}
        </VStack>
      </Labelled>
      <Button
        variant="link"
        className="self-start"
        accessibilityLabel={NAMES.addMember}
        onPress={() => notice(FORM.addNotice)}
      >
        <ButtonText>{FORM.addMember}</ButtonText>
      </Button>
    </>
  );
}
