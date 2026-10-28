// + Member of the Members tab (managers, Admin): the role new members join as, then the people picker; Add puts the
// person in the project at once (adding takes nothing away, so there is no confirmation) and says so.
import { useState } from 'react';

import { Chips } from '@/components/form/chips';
import { Button, ButtonText } from '@/components/ui/button';
import { ROLE_CHOICES } from '@/data/projects.form';
import type { ProjectRoleWire } from '@/data/projects.wire';
import { addMember } from '@/data/projects.write';

import { Sec } from '../parts/display';
import { Labelled } from '../parts/form-bits';
import { PeoplePicker } from '../parts/people-picker';
import { useBusyWrite } from '../parts/write-run';
import { MEMBERS, PICKER } from '../projects.strings';
import { NAMES } from '../projects.strings.added';

const ROLE_LABELS = ROLE_CHOICES.map((c) => c.label);
const MEMBER = 1;

/** The + Member button, and once pressed the picker until Done adding. */
export function MemberAdd({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(MEMBER);
  const [refresh, setRefresh] = useState(0);
  const w = useBusyWrite();
  if (!open) {
    return (
      <Button
        variant="outline"
        className="self-start"
        accessibilityLabel={NAMES.addMember}
        onPress={() => setOpen(true)}
      >
        <ButtonText>{MEMBERS.add}</ButtonText>
      </Button>
    );
  }
  const joinAs: ProjectRoleWire = ROLE_CHOICES[role]?.value ?? 'member';
  return (
    <Sec testID="member-add" title={MEMBERS.addTitle}>
      <Labelled label={PICKER.role}>
        <Chips label={PICKER.role} items={ROLE_LABELS} value={role} onChange={setRole} />
      </Labelled>
      <PeoplePicker
        projectId={id}
        refresh={refresh}
        busyId={w.busy}
        onPick={(p) =>
          void w
            .run(p.id, () => addMember(id, p.id, joinAs), MEMBERS.added(p.name))
            .then(() => setRefresh((n) => n + 1))
        }
      />
      <Button variant="outline" onPress={() => setOpen(false)}>
        <ButtonText>{MEMBERS.close}</ButtonText>
      </Button>
    </Sec>
  );
}
