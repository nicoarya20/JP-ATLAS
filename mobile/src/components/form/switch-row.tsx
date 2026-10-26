// On/off row (prototype kit Switch next to its label): Needs review, notifications, Show me as online.
import { HStack } from '@/components/ui/hstack';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

type SwitchRowProps = {
  label: string;
  /** Muted line under the label. */
  sub?: string;
  value: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
};

/** Label (and sub line) on the left, switch on the right; the label is the switch's accessible name. */
export function SwitchRow({ label, sub, value, onChange, disabled }: SwitchRowProps) {
  return (
    <HStack className="min-h-11 items-center gap-3">
      <VStack className="min-w-0 flex-1 gap-1">
        <Text className="text-body">{label}</Text>
        {sub && <Text className="text-footnote text-muted-foreground">{sub}</Text>}
      </VStack>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        isDisabled={disabled}
      />
    </HStack>
  );
}
