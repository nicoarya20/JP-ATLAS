// Search field (prototype kit Search): magnifier, the text, a clear button while there is text. Leaving the field
// empties it, unless `keep` (a screen whose results come from the text keeps its query).
import { Search, X } from 'lucide-react-native';
import { useState } from 'react';

import { Icon } from '@/components/ui/icon';
import { Input, InputField, InputSlot } from '@/components/ui/input';

export const SEARCH_FIELD = { clear: 'Clear search' } as const;

type SearchFieldProps = {
  placeholder: string;
  /** Controlled text; without it the field keeps its own (the prototype lists do not filter yet). */
  value?: string;
  onChangeText?: (text: string) => void;
  /** Keep the text when the field loses focus. */
  keep?: boolean;
  autoFocus?: boolean;
  testID?: string;
};

/** Search input, named by its placeholder for screen readers. */
export function SearchField({
  placeholder,
  value,
  onChangeText,
  keep = false,
  autoFocus,
  testID,
}: SearchFieldProps) {
  const [own, setOwn] = useState('');
  const text = value ?? own;
  const setText = onChangeText ?? setOwn;
  return (
    <Input className="min-h-11 rounded-control border-0 bg-muted">
      <InputSlot className="pl-3">
        <Icon as={Search} size="lg" className="text-muted-foreground" />
      </InputSlot>
      <InputField
        testID={testID}
        accessibilityRole="search"
        // aria-label: gluestack names every input "Input Field" unless aria-label is given
        aria-label={placeholder}
        value={text}
        onChangeText={setText}
        onBlur={() => {
          if (!keep) setText('');
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
        returnKeyType="search"
        className="text-body"
      />
      {text !== '' && (
        // The slot is the button: gluestack hides a slot's children from screen readers.
        <InputSlot
          accessibilityElementsHidden={false}
          accessibilityRole="button"
          accessibilityLabel={SEARCH_FIELD.clear}
          onPress={() => setText('')}
          className="h-11 w-11 items-center justify-center"
        >
          <Icon as={X} size="md" className="text-muted-foreground" />
        </InputSlot>
      )}
    </Input>
  );
}
