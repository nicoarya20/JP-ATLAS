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

import { fieldName } from './field-name';

export type SelectOption<V extends string = string> = { value: V; label: string };

type SelectFieldProps<V extends string> = {
  /** Accessible name of the picker ("Project"); a visible label sits above it when needed (SectionLabel). */
  label: string;
  options: readonly SelectOption<V>[];
  value: V;
  onChange: (value: V) => void;
  disabled?: boolean;
  /** Names it "<label>, required" (the visible star belongs to the label above it). */
  required?: boolean;
  /** Marks it invalid: red border, and the message read as its hint (the form shows the message itself). */
  error?: string;
  /** Read after the error, also while disabled: why it can't change ("The Lead stays Manager…"). */
  hint?: string;
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
      isInvalid={!!p.error}
    >
      <SelectTrigger
        testID={p.testID}
        // The input showing the label is hidden from screen readers (gluestack), so the trigger carries the value
        accessibilityLabel={fieldName(p.label, p.required)}
        accessibilityValue={{ text: picked?.label ?? '' }}
        accessibilityHint={[p.error, p.hint].filter(Boolean).join(' ') || undefined}
        size="lg"
        className={`min-h-11 rounded-control bg-card pr-3 ${p.error ? 'border-destructive' : 'border-input'}`}
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
