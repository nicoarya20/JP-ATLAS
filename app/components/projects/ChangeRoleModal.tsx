/** Picks a member's new role; "Lanjutkan" hands it to the T2 confirm dialog of `useProjectActions`. */
import { Button, Group, Modal, Radio, Stack } from '@mantine/core';
import { PROJECT_MEMBER_ROLES, type ProjectMemberRole } from '@server/pm/enums';
import type { ProjectMemberItem } from '@server/project/project.dto';
import { useEffect, useState } from 'react';
import { MEMBER_ROLE_HINTS, ROLE_MODAL_COPY } from './members.copy';
import { MEMBER_ROLE_LABELS } from './projects.copy';

type Props = {
  /** The member whose role changes; null keeps the modal closed. */
  member: ProjectMemberItem | null;
  onClose: () => void;
  onSubmit: (member: ProjectMemberItem, role: ProjectMemberRole) => void;
};

export function ChangeRoleModal({ member, onClose, onSubmit }: Props) {
  const current = member?.role ?? null;
  const [picked, setPicked] = useState<ProjectMemberRole | null>(current);
  useEffect(() => setPicked(current), [current]);

  return (
    <Modal
      opened={member !== null}
      onClose={onClose}
      title={member ? ROLE_MODAL_COPY.title(member.name) : ''}
    >
      <Stack gap="md">
        <Radio.Group
          label={ROLE_MODAL_COPY.label}
          value={picked}
          onChange={(v) => setPicked(v as ProjectMemberRole)}
        >
          <Stack gap="sm" mt="xs">
            {PROJECT_MEMBER_ROLES.map((r) => (
              <Radio
                key={r}
                value={r}
                label={MEMBER_ROLE_LABELS[r]}
                description={MEMBER_ROLE_HINTS[r]}
              />
            ))}
          </Stack>
        </Radio.Group>
        <Group justify="flex-end" gap="xs" wrap="wrap">
          <Button variant="default" onClick={onClose}>
            {ROLE_MODAL_COPY.cancel}
          </Button>
          <Button
            // Saving the role the member already has would only open a pointless dialog.
            disabled={!member || !picked || picked === current}
            onClick={() => member && picked && onSubmit(member, picked)}
          >
            {ROLE_MODAL_COPY.submit}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
