import { Button, Group, Stack } from '@mantine/core';
import { useState } from 'react';
import { Link } from 'react-router';
import { ProjectFormFields } from './ProjectFormFields';
import { FORM_COPY } from './project-form.copy';
import { clean, type FormErrors, validate } from './project-form.logic';
import type { ProjectInput } from './projects.logic';

type Props = {
  initial: ProjectInput;
  /** Everyone who can be lead or member: the dummy people plus the person filling in the form. */
  people: string[];
  submitLabel: string;
  cancelTo: string;
  onSubmit: (values: ProjectInput) => Promise<void>;
};

/** The project form (flow ③); "Buat proyek" and "Ubah proyek" both use it. */
export function ProjectForm({ initial, people, submitLabel, cancelTo, onSubmit }: Props) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  async function submit() {
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setLoading(true);
    try {
      await onSubmit(clean(values));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack gap="lg">
      <ProjectFormFields
        values={values}
        errors={errors}
        people={people}
        onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
      />
      <Group justify="flex-end" wrap="wrap">
        <Button component={Link} to={cancelTo} variant="default" disabled={loading}>
          {FORM_COPY.cancel}
        </Button>
        <Button loading={loading} onClick={() => void submit()}>
          {submitLabel}
        </Button>
      </Group>
    </Stack>
  );
}
