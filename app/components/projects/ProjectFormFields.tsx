import {
  Button,
  Group,
  Input,
  MultiSelect,
  SegmentedControl,
  Select,
  Stack,
  Textarea,
  TextInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { PROJECT_PRIORITIES } from '@server/pm/enums';
import { PRIORITY_LABELS } from '~/lib/pm-labels';
import { FORM_COPY } from './project-form.copy';
import { type FormErrors, NAME_MAX, QUICK_DUE } from './project-form.logic';
import { addDays } from './projects.gantt';
import type { ProjectInput } from './projects.logic';

type Props = {
  values: ProjectInput;
  errors: FormErrors;
  people: string[];
  onChange: (patch: Partial<ProjectInput>) => void;
};

/** The fields of the project form (flow ③): name, description, status, priority, people and dates. */
export function ProjectFormFields({ values, errors, people, onChange }: Props) {
  return (
    <Stack gap="md">
      <TextInput
        label={FORM_COPY.name}
        placeholder={FORM_COPY.namePlaceholder}
        value={values.name}
        maxLength={NAME_MAX + 20}
        error={errors.name}
        required
        onChange={(e) => onChange({ name: e.currentTarget.value })}
      />
      <Textarea
        label={FORM_COPY.descriptionLabel}
        description={FORM_COPY.descriptionHint}
        autosize
        minRows={2}
        value={values.description}
        onChange={(e) => onChange({ description: e.currentTarget.value })}
      />
      <Group align="flex-start" grow wrap="wrap">
        <Input.Wrapper label={FORM_COPY.status}>
          <SegmentedControl
            fullWidth
            value={values.status}
            data={[
              { value: 'draft', label: FORM_COPY.statusDraft },
              { value: 'active', label: FORM_COPY.statusActive },
            ]}
            onChange={(v) => onChange({ status: v as ProjectInput['status'] })}
          />
        </Input.Wrapper>
        <Input.Wrapper label={FORM_COPY.priority}>
          <SegmentedControl
            fullWidth
            value={values.priority}
            data={PROJECT_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p].label }))}
            onChange={(v) => onChange({ priority: v as ProjectInput['priority'] })}
          />
        </Input.Wrapper>
      </Group>
      <Select
        label={FORM_COPY.lead}
        data={people}
        value={values.lead}
        allowDeselect={false}
        onChange={(v) => v && onChange({ lead: v })}
      />
      <MultiSelect
        label={FORM_COPY.members}
        placeholder={FORM_COPY.membersPlaceholder}
        data={people.filter((p) => p !== values.lead)}
        value={values.members}
        searchable
        onChange={(members) => onChange({ members })}
      />
      <Group align="flex-start" grow wrap="wrap">
        <DateInput
          label={FORM_COPY.start}
          valueFormat="D MMMM YYYY"
          value={values.start}
          onChange={(v) => v && onChange({ start: v })}
        />
        <DateInput
          label={FORM_COPY.due}
          valueFormat="D MMMM YYYY"
          value={values.due}
          error={errors.due}
          onChange={(v) => v && onChange({ due: v })}
        />
      </Group>
      <Group gap="xs" wrap="wrap" aria-label={FORM_COPY.quickDue}>
        {QUICK_DUE.map((q) => (
          <Button
            key={q.days}
            variant="default"
            onClick={() => onChange({ due: addDays(values.start, q.days) })}
          >
            {q.label}
          </Button>
        ))}
      </Group>
    </Stack>
  );
}
