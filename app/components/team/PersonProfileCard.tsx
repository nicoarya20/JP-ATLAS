import { Anchor, Box, Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { FiShield } from 'react-icons/fi';
import { WRAP_ANYWHERE } from '~/components/pm/text-wrap';
import { SectionCard } from '~/components/ui/SectionCard';
import { ROLE_LABEL } from '~/lib/admin-users-api';
import type { PersonDetail } from '~/lib/team-person-api';
import { PROFILE_COPY } from './team.detail.copy';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box miw={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      {/* A detail page shows contact details in full: an email wraps, it is never cut short. */}
      <Text component="div" style={WRAP_ANYWHERE}>
        {children}
      </Text>
    </Box>
  );
}

const orEmpty = (value: string | null | undefined) =>
  value ? (
    value
  ) : (
    <Text span c="dimmed">
      {PROFILE_COPY.empty}
    </Text>
  );

/** Contact details; the phone only when the server sent it, the account role only for Admin (D10). */
export function PersonProfileCard({ detail }: { detail: PersonDetail }) {
  const { person, accountRole } = detail;
  return (
    <SectionCard title={PROFILE_COPY.title}>
      <Stack gap="sm">
        <Field label={PROFILE_COPY.jobTitle}>{orEmpty(person.jobTitle)}</Field>
        <Field label={PROFILE_COPY.department}>{orEmpty(person.department)}</Field>
        <Field label={PROFILE_COPY.email}>
          <Anchor href={`mailto:${person.email}`}>{person.email}</Anchor>
        </Field>
        {person.phone && (
          <Field label={PROFILE_COPY.phone}>
            <Anchor href={`tel:${person.phone}`}>{person.phone}</Anchor>
          </Field>
        )}
        {accountRole && (
          <Field label={PROFILE_COPY.accountRole}>
            <Group gap="xs" wrap="nowrap" component="span" display="inline-flex">
              <FiShield size="1.25em" aria-hidden />
              {ROLE_LABEL[accountRole] ?? accountRole}
            </Group>
          </Field>
        )}
      </Stack>
    </SectionCard>
  );
}
