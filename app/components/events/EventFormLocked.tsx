/**
 * The two fields the edit mode shows instead of their inputs: the project the event lives in and
 * the guests it has. `PATCH /events/:id` declares both `t.Never()` — an event cannot be moved
 * between projects (its visibility hangs off the project) and guests are invited from the detail
 * page — so the form reads them out rather than pretending they can be changed here.
 */
import { Input, Stack, Text } from '@mantine/core';
import { EVENT_FORM_COPY as COPY } from '~/lib/event-form.copy';

/** What the edit page knows about the two locked fields; absent on the create form. */
export type EventFormLocked = {
  /** Name of the project the event belongs to, or null for a personal event. */
  projectName: string | null;
  /** Guests by name, the creator among them. */
  participants: readonly string[];
};

/** One read-only line with the same label and description a real input would carry. */
function LockedField({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Input.Wrapper label={label} description={description}>
      <Text mt={4}>{children}</Text>
    </Input.Wrapper>
  );
}

export function LockedProject({ projectName }: { projectName: string | null }) {
  return (
    <LockedField label={COPY.project} description={COPY.projectLocked}>
      {projectName ?? COPY.projectPlaceholder}
    </LockedField>
  );
}

export function LockedParticipants({ participants }: { participants: readonly string[] }) {
  return (
    <Stack gap={0} data-event-field="participants">
      <LockedField label={COPY.participants} description={COPY.participantsLocked}>
        {participants.length > 0 ? participants.join(', ') : COPY.participantsEmpty}
      </LockedField>
    </Stack>
  );
}
