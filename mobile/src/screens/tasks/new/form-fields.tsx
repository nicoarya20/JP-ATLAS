// Form parts shared by New task · Fill form and Edit task (prototype tasks.form.fields.jsx): the assignee picker and
// the Needs review block. The tag box is tags-edit.tsx.

import { MultiChips } from '@/components/form/chips';
import { SelectField } from '@/components/form/select-field';
import { HStack } from '@/components/ui/hstack';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import type { Option, TaskForm } from '@/data/tasks.form';

import { Labelled } from '../parts/labelled';
import { Soft } from '../parts/task-parts';
import { F } from '../tasks.strings';

/** Assignee: one or more people, shown by full name. */
export function AssigneeEdit({
  people,
  who,
  onChange,
}: {
  people: readonly Option[];
  who: string[];
  onChange: (who: string[]) => void;
}) {
  return (
    <Labelled label={F.assignee}>
      <MultiChips items={people} value={who} onChange={onChange} label={F.assignee} />
      {!who.length && <Text className="text-footnote text-muted-foreground">{F.pickOne}</Text>}
    </Labelled>
  );
}

type ReviewEditProps = {
  f: Pick<TaskForm, 'review' | 'wasOn'>;
  /** The reviewer the form shows (shownReviewer). */
  reviewer: string;
  options: readonly Option[];
  /** Locked on while the task is in review. */
  locked?: boolean;
  member: boolean;
  onReview: (on: boolean) => void;
  onReviewer: (name: string) => void;
};

/** Needs review and its reviewer; a Member may turn it on but not off, and does not pick the reviewer. */
export function ReviewEdit({
  f,
  reviewer,
  options,
  locked,
  member,
  onReview,
  onReviewer,
}: ReviewEditProps) {
  const fixed = locked || (member && f.wasOn);
  return (
    <Soft testID="review-edit">
      {/* Locked, the row reads "Needs review, Yes"; otherwise the switch alone carries the name. */}
      <HStack
        accessible={fixed}
        accessibilityLabel={fixed ? `${F.review.title}, ${F.review.yes}` : undefined}
        className="min-h-11 items-center justify-between gap-3"
      >
        <Text
          accessibilityElementsHidden={!fixed}
          importantForAccessibility={fixed ? 'auto' : 'no-hide-descendants'}
          className="text-headline font-semibold text-foreground"
        >
          {F.review.title}
        </Text>
        {fixed ? (
          <Text className="text-footnote font-bold text-foreground">{F.review.yes}</Text>
        ) : (
          <Switch accessibilityLabel={F.review.title} value={f.review} onValueChange={onReview} />
        )}
      </HStack>
      {fixed && (
        <Text className="text-footnote text-muted-foreground">
          {locked ? F.review.locked : F.review.managerOnly}
        </Text>
      )}
      {f.review && !member && (
        <SelectField
          label={F.review.reviewer}
          options={options}
          value={reviewer}
          onChange={onReviewer}
        />
      )}
      {f.review && member && (
        <Text className="text-footnote text-muted-foreground">{F.review.memberNote}</Text>
      )}
    </Soft>
  );
}
