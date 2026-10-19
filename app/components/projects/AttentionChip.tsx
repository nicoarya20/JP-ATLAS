/** "Perlu perhatian" toggle next to the status chips: icon and words, never colour alone. */
import { Chip, Group } from '@mantine/core';
import { CONDITION_LABELS } from '~/lib/pm-labels';
import { ATTENTION_COPY } from './attention.copy';

type Props = {
  /** True while the list is limited to running projects that are at risk or late. */
  active: boolean;
  onChange: (active: boolean) => void;
};

const { icon: AttentionIcon, color } = CONDITION_LABELS.at_risk;

export function AttentionChip({ active, onChange }: Props) {
  return (
    <Chip
      checked={active}
      onChange={onChange}
      color={color}
      variant="light"
      title={ATTENTION_COPY.hint}
      aria-pressed={active}
    >
      <Group gap={6} wrap="nowrap" component="span">
        <AttentionIcon size="1.25em" aria-hidden />
        {ATTENTION_COPY.chip}
      </Group>
    </Chip>
  );
}
