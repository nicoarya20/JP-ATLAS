/** "Tulis saja ✦" (Tugas ⑤) below the mode toggle: project, story box, the AI's question and the drafts. */
import { Paper, Select, Stack, Text } from '@mantine/core';
import type { TaskFormProject } from '@server/task/task-form.query';
import { WRAP_ANYWHERE } from '~/components/pm/text-wrap';
import { TaskDraftList } from './TaskDraftList';
import { TaskDraftQuestion } from './TaskDraftQuestion';
import { TaskWriteBox } from './TaskWriteBox';
import { WRITE_COPY as COPY } from './task-draft.copy';
import { TASK_FORM_COPY } from './task-form.copy';
import type { TaskWrite } from './useTaskWrite';

type Props = {
  write: TaskWrite;
  projects: TaskFormProject[];
  projectId: string | null;
  onProject: (id: string | null) => void;
  assigneeName: (id: string | null) => string | null;
  kindName: (id: string | null) => string | null;
  onEdit: (id: string) => void;
};

export function TaskWriteSection({ write, projects, projectId, onProject, ...lookup }: Props) {
  const { state } = write;
  const showResult = state.stage === 'result';
  const locked = write.composing || showResult;
  return (
    <Stack gap="md">
      <Select
        label={COPY.project}
        description={showResult ? COPY.projectLocked : COPY.projectHint}
        placeholder={TASK_FORM_COPY.projectPlaceholder}
        withAsterisk
        searchable
        data={projects.map((p) => ({ value: p.id, label: p.name }))}
        value={projectId}
        onChange={onProject}
        disabled={locked}
      />
      {showResult ? (
        <Stack gap="md">
          <Paper withBorder p="sm">
            <Text size="xs" c="dimmed">
              {COPY.yourText}
            </Text>
            <Text size="sm" lineClamp={3} style={WRAP_ANYWHERE}>
              {state.text.trim()}
            </Text>
          </Paper>
          {state.answer && (
            <Text size="sm" c="dimmed">
              {COPY.answered(state.answer)}
            </Text>
          )}
          {state.question && (
            <TaskDraftQuestion
              question={state.question}
              onAnswer={write.answer}
              onEditText={write.backToText}
            />
          )}
          {(state.items.length > 0 || !state.question) && (
            <TaskDraftList
              items={state.items}
              batch={state.batch}
              assigneeName={lookup.assigneeName}
              kindName={lookup.kindName}
              onToggle={write.toggle}
              onEdit={lookup.onEdit}
              onSave={write.save}
              onBack={write.backToText}
            />
          )}
        </Stack>
      ) : (
        <TaskWriteBox
          text={state.text}
          onText={write.setText}
          blocked={write.blocked}
          loading={write.composing}
          again={state.composedOnce}
          onCompose={write.compose}
        />
      )}
    </Stack>
  );
}
