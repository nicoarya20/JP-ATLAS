// Tasks ⑤ New task · Just write ✦ (prototype tasks.new.jsx TasksWrite): a story becomes AI-drafted tasks. Phase 1 has
// no LLM, so the drafts are sample data shown from the start and Compose, Speak, Edit text and Save only toast.
import { router } from 'expo-router';
import { Check, Sparkles } from 'lucide-react-native';
import { useState } from 'react';

import { Chips } from '@/components/form/chips';
import { Seg } from '@/components/form/seg';
import { SelectField } from '@/components/form/select-field';
import { useNotice } from '@/components/notice/use-notice';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Checkbox, CheckboxIcon, CheckboxIndicator } from '@/components/ui/checkbox';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { getQuickWrite } from '@/data/tasks';
import { TaskPage } from '../parts/task-page';
import { Act, Foot, Soft } from '../parts/task-parts';
import { F } from '../tasks.strings';
import { W } from '../tasks.strings.more';

type Draft = ReturnType<typeof getQuickWrite>['drafts'][number];

function DraftCard({ d }: { d: Draft }) {
  const [on, setOn] = useState(true);
  const pills = [
    `${W.pill.who}: ${d.who}`,
    `${W.pill.due}: ${d.dueLabel}`,
    `${W.pill.priority}: ${d.priority}`,
    `${W.pill.type}: ${d.type}`,
  ];
  return (
    <HStack className="items-start gap-3 rounded-card bg-card p-4" testID="write-draft">
      <Checkbox
        value={d.title}
        aria-label={W.include}
        isChecked={on}
        onChange={setOn}
        className="min-h-11 min-w-11"
      >
        <CheckboxIndicator>
          <CheckboxIcon as={Check} />
        </CheckboxIndicator>
      </Checkbox>
      <VStack className="min-w-0 flex-1 gap-2">
        <Text className="text-headline font-semibold text-foreground">{d.title}</Text>
        <HStack className="flex-wrap gap-2">
          {pills.map((p) => (
            <Badge key={p} variant="outline">
              <BadgeText>{p}</BadgeText>
            </Badge>
          ))}
        </HStack>
      </VStack>
    </HStack>
  );
}

const AiHead = ({ children }: { children: string }) => (
  <HStack className="min-w-0 flex-1 items-center gap-1">
    <Icon as={Sparkles} size="sm" className="text-atlas" />
    <Text className="text-footnote font-bold text-foreground">{children}</Text>
  </HStack>
);

/** Just write ✦ (the ask can be answered, but the drafts stay sample): nothing is saved before Save, which (Phase 1) only toasts and goes to My tasks. */
export function TaskWriteScreen() {
  const notice = useNotice();
  const [qw] = useState(getQuickWrite);
  const [text, setText] = useState(qw.text);
  const [asked, setAsked] = useState(-1);
  const save = () => {
    notice(W.saved);
    router.dismiss();
    router.navigate({ pathname: '/tasks', params: { scope: 'mine' } });
  };
  const foot = (
    <Foot>
      <Act grow label={W.editText} onPress={() => notice(W.editing)} />
      <Act wide kind="primary" label={qw.saveLabel} onPress={save} testID="write-save" />
    </Foot>
  );
  return (
    <TaskPage modal title={F.newTitle} foot={foot} testID="screen-task-write">
      <Seg
        items={F.modes}
        value={0}
        onChange={(i) => i === 1 && router.replace('/tasks/new/form')}
        testID="new-mode"
      />
      <SelectField
        label={W.project}
        options={[{ value: qw.project, label: qw.project }]}
        value={qw.project}
        onChange={() => undefined}
        disabled
      />
      <Textarea>
        <TextareaInput aria-label={W.textLabel} value={text} onChangeText={setText} />
      </Textarea>
      <HStack className="items-center justify-between gap-3">
        <Text className="text-footnote text-muted-foreground">{W.speak}</Text>
        <Act label={W.compose} onPress={() => notice(W.composed)} testID="write-compose" />
      </HStack>
      <Soft>
        <HStack className="items-center justify-between gap-2">
          <AiHead>{W.draftNote}</AiHead>
          <Text className="text-footnote text-muted-foreground">{W.count(qw.drafts.length)}</Text>
        </HStack>
      </Soft>
      {qw.drafts.map((d) => (
        <DraftCard key={d.title} d={d} />
      ))}
      <Text className="text-footnote text-muted-foreground">{W.askNote}</Text>
      <Soft>
        <AiHead>{qw.askTitle}</AiHead>
        <Chips label={qw.askTitle} items={qw.ask} value={asked} onChange={setAsked} />
      </Soft>
    </TaskPage>
  );
}
