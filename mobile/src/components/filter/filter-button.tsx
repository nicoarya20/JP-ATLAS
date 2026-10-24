// The grey square filter icon next to a list's search field (prototype kit SearchFilter), with a dot while the list's
// query narrows it; plus that search + icon row.
import { SlidersHorizontal } from 'lucide-react-native';
import { View } from 'react-native';

import { SearchField } from '@/components/search/search-field';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

export const FILTER_BUTTON = { label: 'Filter and sort', on: 'Filters on' } as const;

type FilterButtonProps = {
  /** The list's query filters it: a violet dot on the icon, and "Filters on" for screen readers. */
  on: boolean;
  /** Opens the list's filter sheet route. */
  onPress: () => void;
  testID?: string;
};

/** Square icon button that opens Filter & sort. */
export function FilterButton({ on, onPress, testID }: FilterButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={FILTER_BUTTON.label}
      accessibilityValue={on ? { text: FILTER_BUTTON.on } : undefined}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-control bg-muted data-[active=true]:opacity-70"
    >
      <Icon as={SlidersHorizontal} size="lg" className="text-foreground" />
      {on && (
        <View
          testID={testID && `${testID}-dot`}
          className="absolute right-2 top-2 h-2 w-2 rounded-full bg-atlas"
        />
      )}
    </Pressable>
  );
}

type SearchFilterProps = FilterButtonProps & {
  placeholder: string;
  value?: string;
  onChangeText?: (text: string) => void;
};

/** Search field with the filter icon on its right. */
export function SearchFilter({
  placeholder,
  value,
  onChangeText,
  on,
  onPress,
  testID,
}: SearchFilterProps) {
  return (
    <HStack className="items-center gap-2">
      <View className="flex-1">
        <SearchField
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          keep={value !== undefined}
        />
      </View>
      <FilterButton on={on} onPress={onPress} testID={testID} />
    </HStack>
  );
}
