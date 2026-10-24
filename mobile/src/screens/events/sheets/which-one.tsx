// "Which one?" of a recurring event's cancel and archive sheets (prototype events.sheets.jsx Which): a radio per choice
// with its hint under the label. The kit RadioList has no hint line, so the gluestack radio parts are used directly.
import { Circle } from 'lucide-react-native';

import { SectionLabel } from '@/components/form/section-label';
import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '@/components/ui/radio';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { SHEETS } from '../events.strings';

type WhichOneProps = {
  /** [label, hint] per choice. */
  options: readonly (readonly [string, string])[];
  /** Index of the picked choice. */
  value: number;
  onChange: (index: number) => void;
};

/** Single choice between this occurrence and the whole series. */
export function WhichOne({ options, value, onChange }: WhichOneProps) {
  const labels = options.map(([label]) => label);
  return (
    <VStack className="gap-2">
      <SectionLabel>{SHEETS.which}</SectionLabel>
      <RadioGroup
        accessibilityRole="radiogroup"
        // aria-label: gluestack names the group "RadioGroup" unless aria-label is given
        aria-label={SHEETS.which}
        value={labels[value] ?? ''}
        onChange={(label: string) => onChange(labels.indexOf(label))}
      >
        <VStack className="gap-2">
          {options.map(([label, hint]) => (
            <Radio
              key={label}
              value={label}
              accessibilityLabel={label}
              accessibilityHint={hint}
              className="min-h-11 items-start gap-3"
            >
              <RadioIndicator className="mt-1">
                <RadioIcon as={Circle} />
              </RadioIndicator>
              <VStack className="flex-1">
                <RadioLabel className="text-body">{label}</RadioLabel>
                <Text className="text-footnote text-muted-foreground">{hint}</Text>
              </VStack>
            </Radio>
          ))}
        </VStack>
      </RadioGroup>
    </VStack>
  );
}
