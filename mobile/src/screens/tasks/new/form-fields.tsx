// Form parts shared by New task · Fill form and Edit task (prototype tasks.form.fields.jsx, tasks.edit.lists.jsx
// TagsEdit): a labelled control, the assignee picker, the Needs review block and the tag box.
import { X } from 'lucide-react-native';
import { type ReactNode, useState } from 'react';

import { MultiChips } from '@/components/form/chips';
import { SelectField } from '@/components/form/select-field';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { addTag, type Option, type TaskForm } from '@/data/tasks.form';

import { Soft } from '../parts/task-parts';
import { F } from '../tasks.strings';

/** Muted label over its control. */
export function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <VStack className="min-w-0 flex-1 gap-1">
      <Text className="text-footnote text-muted-foreground">{label}</Text>
      {children}
    </VStack>
  );
}

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
      <HStack className="min-h-11 items-center justify-between gap-3">
        <Text className="text-headline font-semibold text-foreground">{F.review.title}</Text>
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

/** Tags as removable chips; submitting the box adds the typed tag (lowercase, no duplicates). */
export function TagsEdit({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [text, setText] = useState('');
  const add = () => {
    onChange(addTag(tags, text));
    setText('');
  };
  return (
    <Labelled label={F.tags.label}>
      <VStack className="gap-2 rounded-control bg-muted p-2">
        {tags.length > 0 && (
          <HStack className="flex-wrap gap-2">
            {tags.map((t) => (
              <HStack key={t} className="items-center rounded-control border border-border pl-2">
                <Text className="text-footnote text-foreground">{t}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={F.tags.remove(t)}
                  onPress={() => onChange(tags.filter((x) => x !== t))}
                  className="h-11 w-11 items-center justify-center"
                >
                  <Icon as={X} size="sm" className="text-muted-foreground" />
                </Pressable>
              </HStack>
            ))}
          </HStack>
        )}
        <Input className="min-h-11 border-0 bg-card">
          <InputField
            aria-label={F.tags.add}
            placeholder={F.tags.hint}
            value={text}
            onChangeText={setText}
            onSubmitEditing={add}
            submitBehavior="submit"
            returnKeyType="done"
            autoCapitalize="none"
          />
        </Input>
      </VStack>
    </Labelled>
  );
}
