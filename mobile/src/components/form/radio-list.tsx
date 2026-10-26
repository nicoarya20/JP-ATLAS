// Radio group (prototype Radio rows): Sort by, Cancel reason, "Which one?" for a recurring event.
import { Circle } from 'lucide-react-native';

import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '@/components/ui/radio';
import { VStack } from '@/components/ui/vstack';

type RadioListProps = {
  /** Names the group for screen readers ("Sort by"). */
  label: string;
  items: readonly string[];
  /** Picked label, or null for none yet. */
  value: string | null;
  onChange: (item: string) => void;
};

/** One radio per item, stacked; picking one unpicks the rest. */
export function RadioList({ label, items, value, onChange }: RadioListProps) {
  return (
    <RadioGroup
      accessibilityRole="radiogroup"
      // aria-label: gluestack names the group "RadioGroup" unless aria-label is given
      aria-label={label}
      value={value ?? ''}
      onChange={onChange}
    >
      <VStack className="gap-1">
        {items.map((item) => (
          <Radio
            key={item}
            value={item}
            accessibilityLabel={item}
            className="min-h-11 items-center gap-3"
          >
            <RadioIndicator>
              <RadioIcon as={Circle} />
            </RadioIndicator>
            <RadioLabel className="text-body">{item}</RadioLabel>
          </Radio>
        ))}
      </VStack>
    </RadioGroup>
  );
}
