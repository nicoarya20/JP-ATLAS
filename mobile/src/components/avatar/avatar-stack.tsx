// Overlapping avatars for a list of people (prototype kit Avatars), with "+n" when more than `max` are listed.
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';

type AvatarStackProps = {
  /** Full or first names; the initials come from these. */
  names: readonly string[];
  /** Avatars drawn before the rest fold into "+n". */
  max?: number;
  /** Screen reader name for the group; defaults to the names. */
  label?: string;
};

/** Small round avatars, each overlapping the one before; the overflow shows as "+n". */
export function AvatarStack({ names, max = 4, label }: AvatarStackProps) {
  const shown = names.slice(0, max);
  const more = names.length - shown.length;
  return (
    <HStack accessible accessibilityLabel={label ?? names.join(', ')} className="items-center">
      {shown.map((name, i) => (
        <Avatar
          key={name}
          className={`h-7 w-7 border-2 border-card bg-accent ${i > 0 ? '-ml-2' : ''}`}
        >
          <AvatarFallbackText className="text-footnote font-semibold text-accent-foreground">
            {name}
          </AvatarFallbackText>
        </Avatar>
      ))}
      {more > 0 && (
        <Text testID="avatar-more" className="ml-1 text-footnote text-muted-foreground">
          +{more}
        </Text>
      )}
    </HStack>
  );
}
