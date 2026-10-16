import { Alert, Button, Group, Radio, Stack, Text, Textarea } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useState } from 'react';
import { describeApiError } from '../../lib/http';
import { CANCEL_LABEL } from './confirmAction';

/** Upper bound for the free-text note; the server stays the authority on the real limit. */
export const REASON_MAX_LENGTH = 500;

export type ReasonCategory = {
  value: string;
  label: string;
  /** This choice (e.g. "Lainnya") cannot be submitted without a written note. */
  requireNote?: boolean;
};

export type ReasonResult = { category?: string; reason: string };

export type ReasonModalOptions = {
  title: string;
  /** Impact in one or two sentences, shown under the title. */
  description?: string;
  /** One-tap phrases that fill the note. */
  quick?: string[];
  /** Fixed reasons to pick from; when present one must be chosen. */
  categories?: ReasonCategory[];
  /** The note is mandatory whatever the category. */
  requireNote?: boolean;
  /** Verb label for the submit button: "Batalkan tugas", never "OK". */
  confirmLabel: string;
  danger?: boolean;
  onSubmit: (result: ReasonResult) => void | Promise<void>;
};

type FormState = { category: string | null; reason: string };

/** Returns the message to show when the form cannot be submitted yet, or null when it can. */
export function validateReason(
  { category, reason }: FormState,
  opts: Pick<ReasonModalOptions, 'categories' | 'requireNote'>,
): string | null {
  const chosen = opts.categories?.find((c) => c.value === category);
  if (opts.categories?.length && !chosen) return 'Pilih salah satu alasan.';
  if (!reason.trim()) {
    if (chosen?.requireNote) return `Tulis catatan untuk "${chosen.label}".`;
    if (opts.requireNote) return 'Tulis alasannya dulu.';
  }
  return null;
}

type FormProps = ReasonModalOptions & { onClose: () => void };

/** Body of the reason dialog: category choice, quick phrases, note, and the submit button with loading. */
export function ReasonForm(props: FormProps) {
  const { description, quick, categories, requireNote, confirmLabel, danger, onSubmit, onClose } =
    props;
  const [state, setState] = useState<FormState>({ category: null, reason: '' });
  const [problem, setProblem] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const invalid = validateReason(state, { categories, requireNote });
    if (invalid) return setProblem(invalid);
    setProblem(null);
    setLoading(true);
    try {
      const reason = state.reason.trim();
      await onSubmit(state.category ? { category: state.category, reason } : { reason });
      onClose();
    } catch (error) {
      // Stay open so the typed note is not lost and the user can retry.
      setProblem(describeApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="sm">
      {description && <Text size="sm">{description}</Text>}
      {categories && categories.length > 0 && (
        <Radio.Group
          label="Alasan"
          value={state.category}
          onChange={(category) => setState((s) => ({ ...s, category }))}
        >
          <Stack gap="xs" mt="xs">
            {categories.map((c) => (
              <Radio key={c.value} value={c.value} label={c.label} />
            ))}
          </Stack>
        </Radio.Group>
      )}
      {quick && quick.length > 0 && (
        <Group gap="xs" wrap="wrap" aria-label="Alasan cepat">
          {quick.map((q) => (
            <Button
              key={q}
              variant="light"
              size="sm"
              onClick={() => setState((s) => ({ ...s, reason: q }))}
            >
              {q}
            </Button>
          ))}
        </Group>
      )}
      <Textarea
        label={requireNote ? 'Catatan' : 'Catatan (boleh dikosongkan)'}
        autosize
        minRows={3}
        maxLength={REASON_MAX_LENGTH}
        value={state.reason}
        onChange={(e) => setState((s) => ({ ...s, reason: e.currentTarget.value }))}
      />
      {problem && (
        <Alert color="danger" role="alert">
          {problem}
        </Alert>
      )}
      <Group justify="flex-end" wrap="wrap" gap="xs">
        <Button variant="default" onClick={onClose} disabled={loading}>
          {CANCEL_LABEL}
        </Button>
        <Button color={danger ? 'danger' : undefined} loading={loading} onClick={submit}>
          {confirmLabel}
        </Button>
      </Group>
    </Stack>
  );
}

/** Opens the shared "why?" dialog for Kembalikan, Batalkan, Buka lagi and Perpanjang tenggat (R05 §3.4 #5). */
export function openReasonModal(options: ReasonModalOptions) {
  const id = modals.open({
    title: options.title,
    children: <ReasonForm {...options} onClose={() => modals.close(id)} />,
  });
  return id;
}
