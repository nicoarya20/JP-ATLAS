import { router } from 'expo-router';
import { View } from 'react-native';

import { Row, Rows } from '@/components/list/rows';
import { SheetFrame } from '@/components/sheet/sheet-frame';
import { Icon } from '@/components/ui/icon';
import type { Role } from '@/data/sample/people';
import { SESSION_ROLE } from '@/data/session';
import { createHref } from '@/navigation/create-href';

import { CREATE_SHEET, type CreateOption, type CreateTone, createOptions } from './create.options';

/** Soft tile, strong icon: the JP Atlas status pairs (prototype tiles were solid with a white icon). */
const TONE: Record<CreateTone, { tile: string; icon: string }> = {
  blue: { tile: 'bg-info-soft', icon: 'text-info' },
  green: { tile: 'bg-success-soft', icon: 'text-success' },
  orange: { tile: 'bg-warning-soft', icon: 'text-warning' },
  gray: { tile: 'bg-muted', icon: 'text-muted-foreground' },
};

function Tile({ option }: { option: CreateOption }) {
  const tone = TONE[option.tone];
  return (
    <View className={`h-[30px] w-[30px] items-center justify-center rounded-[7px] ${tone.tile}`}>
      {/* 18 px like the prototype's ICON (the gluestack Icon types no numeric size) */}
      <Icon as={option.Icon} className={`h-[18px] w-[18px] ${tone.icon}`} />
    </View>
  );
}

type CreateScreenProps = { role?: Role };

/**
 * The Create sheet (prototype screens/home/home.create.jsx): the "+" on Home and More opens it to pick what to add.
 * Picking a row swaps the sheet for that screen, so closing the screen lands where the "+" was pressed.
 */
export function CreateScreen({ role = SESSION_ROLE }: CreateScreenProps) {
  return (
    <SheetFrame testID="screen-create" title={CREATE_SHEET.title} sub={CREATE_SHEET.sub}>
      <Rows>
        {createOptions(role).map((option) => (
          <Row
            key={option.go}
            title={option.title}
            sub={option.sub}
            lead={<Tile option={option} />}
            onPress={() => router.replace(createHref(option.go))}
          />
        ))}
      </Rows>
    </SheetFrame>
  );
}
