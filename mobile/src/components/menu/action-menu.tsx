// ⋯ menu of a detail header (prototype kit Menu): the icon button, then a gluestack Menu of actions under it.
import { Ellipsis } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { Menu, MenuItem, MenuItemLabel } from '@/components/ui/menu';
import { Pressable } from '@/components/ui/pressable';

export type MenuAction = {
  label: string;
  onPress: () => void;
  /** Destructive (Move to Archive, Cancel task): drawn in the danger colour. */
  danger?: boolean;
};

type ActionMenuProps = {
  items: readonly MenuAction[];
  /** The button's name: "Task actions", "Project actions", "Event actions". */
  label: string;
  testID?: string;
};

/**
 * ⋯ button that opens the actions; picking one closes the menu and runs it. The menu opens in a native modal
 * (useRNModal) so it also shows above a modal route.
 */
export function ActionMenu({ items, label, testID }: ActionMenuProps) {
  return (
    <Menu
      useRNModal
      placement="bottom right"
      offset={4}
      accessibilityLabel={label}
      trigger={(props) => (
        <Pressable
          {...props}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={label}
          className="h-11 w-11 items-center justify-center rounded-full data-[active=true]:bg-muted"
        >
          <Icon as={Ellipsis} size="xl" className="text-foreground" />
        </Pressable>
      )}
    >
      {items.map((item) => (
        <MenuItem
          key={item.label}
          textValue={item.label}
          accessibilityRole="menuitem"
          accessibilityLabel={item.label}
          onPress={item.onPress}
          className="min-h-11"
        >
          <MenuItemLabel
            className={`text-body ${item.danger ? 'text-destructive' : 'text-foreground'}`}
          >
            {item.label}
          </MenuItemLabel>
        </MenuItem>
      ))}
    </Menu>
  );
}
