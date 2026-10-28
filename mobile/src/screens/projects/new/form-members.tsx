// Members & roles of the project form (prototype projects.create.jsx ProjectsForm): you first (you stay a Manager),
// then the people picked, each with a role and Remove; + Add member opens the people picker. The Lead's row stays
// Manager, since the server makes the Lead one whatever role they were given.
import { useState } from 'react';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { SelectField } from '@/components/form/select-field';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { CREATE_MEMBERS_MAX, ROLE_CHOICES } from '@/data/projects.form';
import type { ProjectRoleWire } from '@/data/projects.wire';

import { Labelled } from '../parts/form-bits';
import { PeoplePicker } from '../parts/people-picker';
import { FORM, MEMBERS } from '../projects.strings';
import { NAMES } from '../projects.strings.added';

export type Picked = { id: string; name: string; role: ProjectRoleWire };

type RowProps = {
  full: string;
  pick: ProjectRoleWire;
  /** Why the role is fixed; the picker is off while it is set. */
  fixed?: string;
  onRole?: (r: ProjectRoleWire) => void;
  onRemove?: () => void;
};

function MemberRow({ full, pick, fixed, onRole, onRemove }: RowProps) {
  return (
    <VStack className="gap-1">
      <HStack className="items-center gap-3">
        <PersonAvatar name={full} size="sm" />
        <Text className="flex-1 text-body">{full}</Text>
        <VStack className="w-36">
          <SelectField
            label={FORM.memberRole(full)}
            options={ROLE_CHOICES}
            value={fixed ? 'manager' : pick}
            disabled={!!fixed}
            hint={fixed}
            onChange={(r) => onRole?.(r)}
          />
        </VStack>
      </HStack>
      {onRemove && (
        <Button
          variant="link"
          className="self-end"
          accessibilityLabel={FORM.removeMember(full)}
          onPress={onRemove}
        >
          <ButtonText className="text-destructive">{MEMBERS.remove}</ButtonText>
        </Button>
      )}
    </VStack>
  );
}

type FormMembersProps = {
  me: { id: string; name: string };
  picked: readonly Picked[];
  onChange: (picked: Picked[]) => void;
  leadId: string;
};

/** The member rows (you first, fixed), and + Add member with its picker. */
export function FormMembers({ me, picked, onChange, leadId }: FormMembersProps) {
  const [open, setOpen] = useState(false);
  const full = picked.length >= CREATE_MEMBERS_MAX;
  return (
    <>
      <Labelled label={FORM.members} hint={FORM.creatorStays}>
        <VStack className="gap-2">
          <MemberRow full={me.name} pick="manager" fixed={FORM.creatorStays} />
          {picked.map((m) => (
            <MemberRow
              key={m.id}
              full={m.name}
              pick={m.role}
              fixed={m.id === leadId ? FORM.leadStays : undefined}
              onRole={(role) => onChange(picked.map((x) => (x.id === m.id ? { ...x, role } : x)))}
              onRemove={() => onChange(picked.filter((x) => x.id !== m.id))}
            />
          ))}
        </VStack>
      </Labelled>
      {!full &&
        (open ? (
          <PeoplePicker
            testID="form-picker"
            exclude={[me.id, ...picked.map((m) => m.id)]}
            onPick={(p) => onChange([...picked, { id: p.id, name: p.name, role: 'member' }])}
          />
        ) : (
          <Button
            variant="link"
            className="self-start"
            accessibilityLabel={NAMES.addMember}
            onPress={() => setOpen(true)}
          >
            <ButtonText>{FORM.addMember}</ButtonText>
          </Button>
        ))}
    </>
  );
}
