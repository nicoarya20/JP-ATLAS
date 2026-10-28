// What Just write ✦ shows after Compose: each draft as a card the person can fix (title, assignee, priority, due) or
// drop (untick Keep), with the server's assignee note as it came (K5), and the server's one question, whose member
// options set the assignee of the drafts it is about.
import { Check, Sparkles } from 'lucide-react-native';

import { Chips } from '@/components/form/chips';
import { Field } from '@/components/form/field';
import { Checkbox, CheckboxIcon, CheckboxIndicator, CheckboxLabel } from '@/components/ui/checkbox';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { DraftRow, TaskDraftQuestionWire } from '@/data/tasks.draft';
import { type Option, TITLE_MAX } from '@/data/tasks.form';

import { Soft } from '../parts/task-parts';
import { F } from '../tasks.strings';
import { MISSING } from '../tasks.strings.added';
import { W } from '../tasks.strings.more';
import { AssigneeEdit, DateEdit, PriorityEdit } from './form-choices';

/** ✦ headline of an AI part. */
export const AiHead = ({ children }: { children: string }) => (
  <HStack className="min-w-0 flex-1 items-center gap-1">
    <Icon as={Sparkles} size="sm" className="text-atlas" />
    <Text className="text-footnote font-bold text-foreground">{children}</Text>
  </HStack>
);

type CardProps = {
  d: DraftRow;
  /** 1-based, as the card names it. */
  n: number;
  people: { people: readonly Option[]; hint?: string };
  /** The project's kind of the draft, when it names one. */
  kind?: string;
  onChange: (change: Partial<DraftRow>) => void;
};

/** One draft: Keep, then its fields while kept. */
export function DraftCard({ d, n, people, kind, onChange }: CardProps) {
  return (
    <VStack className="gap-3 rounded-card bg-card p-4" testID="write-draft">
      <Checkbox
        value={d.key}
        aria-label={W.keep(n)}
        isChecked={d.keep}
        onChange={(keep) => onChange({ keep })}
        className="min-h-11 gap-3"
        testID="draft-keep"
      >
        <CheckboxIndicator>
          <CheckboxIcon as={Check} />
        </CheckboxIndicator>
        <CheckboxLabel className="text-subhead font-semibold">{W.draft(n)}</CheckboxLabel>
      </Checkbox>
      {d.keep ? (
        <>
          <Field
            required
            label={F.title}
            value={d.title}
            onChangeText={(title) => onChange({ title: title.slice(0, TITLE_MAX) })}
            error={d.title.trim() ? undefined : MISSING.title}
            testID="draft-title"
          />
          <AssigneeEdit
            people={people.people}
            value={d.assigneeId}
            onChange={(assigneeId) => onChange({ assigneeId })}
            hint={people.hint}
          />
          {d.assigneeNote && !d.assigneeId && (
            <Text className="text-footnote text-muted-foreground" testID="draft-note">
              {d.assigneeNote}
            </Text>
          )}
          <PriorityEdit
            value={d.priority ?? 'medium'}
            onChange={(priority) => onChange({ priority })}
          />
          <DateEdit label={F.due} value={d.dueDate} onChange={(dueDate) => onChange({ dueDate })} />
          {kind && <Text className="text-footnote text-muted-foreground">{W.type(kind)}</Text>}
          {d.description && (
            <Text numberOfLines={3} className="text-footnote text-muted-foreground">
              {d.description}
            </Text>
          )}
        </>
      ) : (
        <Text className="text-footnote text-muted-foreground">
          {d.title} · {W.dropped}
        </Text>
      )}
    </VStack>
  );
}

/** The server's question; a "which member?" one offers its members as chips. */
export function DraftQuestion({
  q,
  answer,
  onAnswer,
}: {
  q: TaskDraftQuestionWire;
  answer: string | null;
  onAnswer: (memberId: string) => void;
}) {
  const options = q.options ?? [];
  return (
    <Soft testID="write-question">
      <AiHead>{q.text}</AiHead>
      {options.length > 0 && (
        <Chips
          label={q.text}
          items={options.map((o) => o.label)}
          value={options.findIndex((o) => o.id === answer)}
          onChange={(i) => {
            const o = options[i];
            if (o) onAnswer(o.id);
          }}
        />
      )}
    </Soft>
  );
}
