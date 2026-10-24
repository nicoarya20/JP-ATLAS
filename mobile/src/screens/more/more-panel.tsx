import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { type ComponentRef, useEffect, useRef } from 'react';
import { AccessibilityInfo, type HostInstance, View } from 'react-native';

import { PanelRise } from '@/components/tab-bar/panel-rise';
import { PANEL } from '@/components/tab-bar/tab-bar.motion';
import { usePanel } from '@/components/tab-bar/tab-panel';
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { getProfile } from '@/data/profile';
import type { Role } from '@/data/sample';
import { SESSION_ROLE } from '@/data/session';
import { routeHref } from '@/navigation/route-href';

import { type MoreTile, type MoreTone, moreTiles, PROFILE_PATH, tileLabel } from './more.tiles';

/** Soft tile, strong icon: the JP Atlas pairs, as on the Create sheet (prototype tiles were solid with a white icon). */
const TONE: Record<MoreTone, { tile: string; icon: string }> = {
  blue: { tile: 'bg-accent', icon: 'text-accent-foreground' },
  green: { tile: 'bg-success-soft', icon: 'text-success' },
  orange: { tile: 'bg-warning-soft', icon: 'text-warning' },
  teal: { tile: 'bg-info-soft', icon: 'text-info' },
  gray: { tile: 'bg-muted', icon: 'text-muted-foreground' },
};

function Tile({ tile, onOpen }: { tile: MoreTile; onOpen: () => void }) {
  const tone = TONE[tile.tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tileLabel(tile)}
      onPress={onOpen}
      className="items-center gap-1.5 data-[active=true]:scale-90"
    >
      <View className={`h-[58px] w-[58px] items-center justify-center rounded-[18px] ${tone.tile}`}>
        {/* 24 px like the prototype's ICON (the gluestack Icon types no numeric size) */}
        <Icon as={tile.Icon} className={`h-6 w-6 ${tone.icon}`} />
        {tile.badge ? (
          <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-destructive px-[5px]">
            <Text className="text-[11px] font-semibold text-destructive-foreground">
              {tile.badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text className="text-footnote">{tile.label}</Text>
    </Pressable>
  );
}

type MorePanelProps = {
  role?: Role;
  /** Folds the panel; every pick folds it first, so the bar is back to normal on the next screen. */
  close: () => void;
};

/**
 * What the More tab unfolds from the tab bar (prototype screens/home/home.more.jsx): the profile card, then a grid of
 * the secondary destinations. Each child rises in after the one before (PanelRise order).
 */
export function MorePanel({ role = SESSION_ROLE, close }: MorePanelProps) {
  const { me, line } = getProfile(role);
  const card = useRef<ComponentRef<typeof Pressable>>(null);
  const { open: unfolded } = usePanel();
  // A screen reader starts on the profile card once the panel has unfolded under it.
  useEffect(() => {
    if (!unfolded) return;
    const focus = setTimeout(() => {
      // gluestack's Pressable forwards its ref to React Native's Pressable, a host view, but types it as its props.
      const host = card.current as unknown as HostInstance | null;
      if (host) AccessibilityInfo.sendAccessibilityEvent(host, 'focus');
    }, PANEL.openMs);
    return () => clearTimeout(focus);
  }, [unfolded]);
  const open = (path: string) => {
    close();
    router.push(routeHref(path));
  };
  return (
    <View className="gap-3 px-3 pb-2 pt-4">
      <PanelRise i={0}>
        <Pressable
          ref={card}
          accessibilityRole="button"
          accessibilityLabel={`${me.full}, open profile`}
          onPress={() => open(PROFILE_PATH)}
          className="flex-row items-center gap-3 rounded-[18px] bg-muted p-2 data-[active=true]:scale-[0.98]"
        >
          <Avatar className="h-11 w-11 bg-accent">
            <AvatarFallbackText className="text-subhead font-semibold text-accent-foreground">
              {me.name}
            </AvatarFallbackText>
          </Avatar>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-body font-semibold">
              {me.full}
            </Text>
            <Text numberOfLines={1} className="text-footnote text-muted-foreground">
              {line}
            </Text>
          </View>
          <Icon as={ChevronRight} className="h-[18px] w-[18px] text-muted-foreground" />
        </Pressable>
      </PanelRise>
      <View className="flex-row flex-wrap gap-y-3">
        {moreTiles(role).map((tile, i) => (
          <View key={tile.path} className="basis-1/3">
            <PanelRise i={i + 1}>
              <Tile tile={tile} onOpen={() => open(tile.path)} />
            </PanelRise>
          </View>
        ))}
      </View>
    </View>
  );
}
