// Round avatar with a person's initials (prototype kit Avatar), in the four prototype sizes.
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';

const SIZE = {
  sm: { box: 'h-8 w-8', text: 'text-footnote' },
  md: { box: 'h-10 w-10', text: 'text-subhead' },
  lg: { box: 'h-14 w-14', text: 'text-headline' },
  xl: { box: 'h-20 w-20', text: 'text-page' },
} as const;

type PersonAvatarProps = {
  /** Full or first name; the initials come from it. */
  name: string;
  size?: keyof typeof SIZE;
};

/** Decorative: the name next to it is what screen readers read. */
export function PersonAvatar({ name, size = 'md' }: PersonAvatarProps) {
  const s = SIZE[size];
  return (
    <Avatar
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`${s.box} shrink-0 bg-accent`}
    >
      <AvatarFallbackText className={`${s.text} font-semibold text-accent-foreground`}>
        {name}
      </AvatarFallbackText>
    </Avatar>
  );
}
