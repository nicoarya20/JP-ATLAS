// Dropdown pill (prototype kit Select with options): gluestack Select, which opens its options in an Actionsheet.
import { ChevronDown } from 'lucide-react-native';

import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from '@/components/ui/select';

export type SelectOption<V extends string = string> = { value: V; label: string };

type SelectFieldProps<V extends string> = {
  /** Accessible name of the picker ("Project"); a visible label sits above it when needed (SectionLabel). */
  label: string;
  options: readonly SelectOption<V>[];
  value: V;
  onChange: (value: V) => void;
  disabled?: boolean;
  testID?: string;
};

/**
 * Picker showing the picked option's label. The options open in a native modal (useRNModal) so they also show above a
 * formSheet or modal route, where the root portal host would sit underneath.
 */
export function SelectField<V extends string>(p: SelectFieldProps<V>) {
  const picked = p.options.find((o) => o.value === p.value);
  return (
    <Select
      // A new value from outside (Reset) must redraw the label, which Select keeps in its own state.
      key={p.value}
      selectedValue={p.value}
      selectedLabel={picked?.label}
      onValueChange={(v) => p.onChange(v as V)}
      isDisabled={p.disabled}
    >
      <SelectTrigger
        testID={p.testID}
        // The input showing the label is hidden from screen readers (gluestack), so the trigger carries the value
        accessibilityLabel={p.label}
        accessibilityValue={{ text: picked?.label ?? '' }}
        size="lg"
        className="min-h-11 rounded-control border-input bg-card pr-3"
      >
        <SelectInput editable={false} value={picked?.label} className="flex-1 text-body" />
        <SelectIcon as={ChevronDown} className="text-muted-foreground" />
      </SelectTrigger>
      <SelectPortal useRNModal>
        <SelectBackdrop />
        <SelectContent>
          <SelectDragIndicatorWrapper>
            <SelectDragIndicator />
          </SelectDragIndicatorWrapper>
          {p.options.map((o) => (
            <SelectItem key={o.value} label={o.label} value={o.value} />
          ))}
        </SelectContent>
      </SelectPortal>
    </Select>
  );
}
