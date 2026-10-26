// Edit task's list editors (prototype tasks.edit.lists.jsx StepsEdit, EvidenceEdit), each controlled by the form:
// steps to tick, rename and remove (+ Add step appends an empty one), and evidence whose captions can be edited or
// removed (+ Attach evidence stands in for picking a photo).
import { Check, Image, X } from 'lucide-react-native';
import { View } from 'react-native';

import { Checkbox, CheckboxIcon, CheckboxIndicator } from '@/components/ui/checkbox';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import type { TaskProof, TaskStep } from '@/data/tasks.shared';

import { Act, Sec } from '../parts/task-parts';
import { F, S } from '../tasks.strings';
import { SPOKEN } from '../tasks.strings.added';

const without = <T,>(list: readonly T[], i: number) => list.filter((_, j) => j !== i);
const swap = <T,>(list: readonly T[], i: number, item: T) =>
  list.map((x, j) => (j === i ? item : x));

function Remove({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center"
    >
      <Icon as={X} size="md" className="text-muted-foreground" />
    </Pressable>
  );
}

function Box({
  label,
  value,
  hint,
  onChange,
}: {
  label: string;
  value: string;
  hint: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input className="min-h-11 min-w-0 flex-1 rounded-control border-0 bg-muted">
      <InputField aria-label={label} placeholder={hint} value={value} onChangeText={onChange} />
    </Input>
  );
}

/** Step checklist editor. */
export function StepsEdit({
  steps,
  onChange,
}: {
  steps: TaskStep[];
  onChange: (steps: TaskStep[]) => void;
}) {
  return (
    <Sec title={F.steps.title}>
      {steps.map((s, i) => (
        // Steps have no id and may share text (two empty ones), so the place is the key, as in the prototype.
        // biome-ignore lint/suspicious/noArrayIndexKey: see above
        <HStack key={i} className="items-center gap-2">
          <Checkbox
            value={`step-${i}`}
            aria-label={F.steps.done(i + 1)}
            isChecked={s.done}
            onChange={(done) => onChange(swap(steps, i, { ...s, done }))}
            className="min-h-11 min-w-11 justify-center"
          >
            <CheckboxIndicator>
              <CheckboxIcon as={Check} />
            </CheckboxIndicator>
          </Checkbox>
          <Box
            label={F.steps.step(i + 1)}
            hint={F.steps.hint}
            value={s.text}
            onChange={(text) => onChange(swap(steps, i, { ...s, text }))}
          />
          <Remove label={F.steps.remove(i + 1)} onPress={() => onChange(without(steps, i))} />
        </HStack>
      ))}
      <Act
        kind="link"
        label={F.steps.add}
        name={SPOKEN.addStep}
        onPress={() => onChange([...steps, { text: '', done: false }])}
      />
    </Sec>
  );
}

/** Evidence editor; a new photo is "photo-<n>.jpg", n not yet taken. */
export function EvidenceEdit({
  proof,
  onChange,
}: {
  proof: TaskProof[];
  onChange: (proof: TaskProof[]) => void;
}) {
  const attach = () => {
    let n = proof.length + 1;
    while (proof.some((p) => p.file === `photo-${n}.jpg`)) n += 1;
    onChange([...proof, { file: `photo-${n}.jpg`, caption: '' }]);
  };
  return (
    <Sec title={F.evidence.title}>
      {proof.map((p, i) => (
        <HStack key={p.file} className="items-center gap-2">
          <View
            accessible
            accessibilityRole="image"
            accessibilityLabel={S.detail.photo}
            className="h-12 w-12 items-center justify-center rounded-control bg-muted"
          >
            <Icon as={Image} size="lg" className="text-muted-foreground" />
          </View>
          <VStack className="min-w-0 flex-1 gap-1">
            <Text className="text-footnote font-semibold text-foreground">{p.file}</Text>
            <Box
              label={F.evidence.caption(p.file)}
              hint={F.evidence.hint}
              value={p.caption}
              onChange={(caption) => onChange(swap(proof, i, { ...p, caption }))}
            />
          </VStack>
          <Remove label={F.evidence.remove(p.file)} onPress={() => onChange(without(proof, i))} />
        </HStack>
      ))}
      <Act kind="link" label={F.evidence.attach} name={SPOKEN.attach} onPress={attach} />
    </Sec>
  );
}
