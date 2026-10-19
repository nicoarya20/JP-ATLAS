import { Anchor, Stack, Text } from '@mantine/core';
import { Link } from 'react-router';
import { SectionCard } from '~/components/ui/SectionCard';
import { PRIORITY_LABELS } from '~/lib/pm-labels';
import { KIND_LABELS, TASKS } from '../tasks/tasks.dummy';
import { DETAIL_COPY as C } from './project-detail.copy';
import { attentionTasks, dueText } from './projects.read';

/** Up to three tasks of this project that are late, waiting for review or due soonest. */
export function ProjectAttentionCard({ projectName }: { projectName: string }) {
  const rows = attentionTasks(TASKS, projectName);
  return (
    <SectionCard title={C.attention}>
      {rows.length === 0 ? (
        <Text size="sm" c="dimmed">
          {C.attentionEmpty}
        </Text>
      ) : (
        <Stack gap="sm">
          {rows.map((t) => (
            <div key={t.number}>
              <Anchor component={Link} to={`/app/tasks/${t.number}`} fw={700} c="inherit">
                {`#${t.number} ${t.title}`}
              </Anchor>
              <Text size="xs" c="dimmed">
                {[
                  t.note ?? dueText(t.due),
                  KIND_LABELS[t.kind],
                  PRIORITY_LABELS[t.priority].label,
                  t.assignee,
                ].join(' · ')}
              </Text>
            </div>
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
