// T3 safeguard (UX §1): the person types the item's name before the destructive button unlocks.
import { Field } from '@/components/form/field';

export const TYPE_TO_CONFIRM = { label: 'Type the item name to confirm' } as const;

/** True when the typed text is exactly the name (surrounding spaces ignored). */
export const nameMatches = (typed: string, name: string) => typed.trim() === name;

type TypeToConfirmProps = {
  /** The item's name, shown as the placeholder. */
  name: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Locked while the delete runs. Read-only, not disabled: gluestack hides a disabled input from VoiceOver, so focus
   *  would jump away mid-delete. */
  disabled?: boolean;
};

/** Input labelled "Type the item name to confirm". */
export function TypeToConfirm({ name, value, onChangeText, disabled }: TypeToConfirmProps) {
  return (
    <Field
      label={TYPE_TO_CONFIRM.label}
      value={value}
      onChangeText={onChangeText}
      placeholder={name}
      readOnly={disabled}
      testID="type-to-confirm"
    />
  );
}
