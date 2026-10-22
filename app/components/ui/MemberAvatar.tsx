import { Avatar, Group, Text, Tooltip } from '@mantine/core';
import type { ComponentProps } from 'react';
import { FiUsers } from 'react-icons/fi';

export type AvatarMember = { id: string; name: string; image?: string | null };

/** Avatars shown before the rest collapse into "+N". */
export const MAX_VISIBLE_AVATARS = 3;

type AvatarSize = 'sm' | 'md' | 'lg';
// Extra props (including `ref` in React 19) pass through so a Tooltip can wrap the avatar.
type AvatarProps = { name: string; image?: string | null; size?: AvatarSize } & Omit<
  ComponentProps<typeof Avatar>,
  'name' | 'src' | 'alt' | 'size'
>;

/** Round avatar with the photo, or coloured initials from the name when there is none. */
export function MemberAvatar({ name, image, size = 'sm', ...rest }: AvatarProps) {
  return (
    <Avatar
      src={image ?? null}
      alt={name}
      name={name}
      color="initials"
      radius="xl"
      size={size}
      // Avatar hosts can be any origin; skip the referrer like the other avatars in the app.
      imageProps={{ referrerPolicy: 'no-referrer' }}
      {...rest}
    />
  );
}

/** Overlapping avatars of project or task members with a "+N" counter; names sit in tooltips. */
export function AvatarStack({
  members,
  max = MAX_VISIBLE_AVATARS,
  size = 'sm',
}: {
  members: readonly AvatarMember[];
  max?: number;
  size?: AvatarSize;
}) {
  if (members.length === 0) {
    return (
      <Group gap={4} wrap="nowrap" c="dimmed">
        <FiUsers size="1.25em" aria-hidden />
        <Text size="xs">Belum ada anggota</Text>
      </Group>
    );
  }
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <Avatar.Group>
      {shown.map((m) => (
        <Tooltip key={m.id} label={m.name} withArrow>
          <MemberAvatar name={m.name} image={m.image} size={size} />
        </Tooltip>
      ))}
      {rest > 0 && (
        <Tooltip
          label={members
            .slice(max)
            .map((m) => m.name)
            .join(', ')}
          withArrow
        >
          <Avatar radius="xl" size={size} aria-label={`${rest} anggota lainnya`}>
            {`+${rest}`}
          </Avatar>
        </Tooltip>
      )}
    </Avatar.Group>
  );
}
