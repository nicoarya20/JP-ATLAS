import { defaultConfig, tv } from 'tailwind-variants';

import { RADIUS } from './tokens';
import { TEXT_SCALE } from './type-scale';

/*
 * gluestack's tva runs tailwind-merge, which only knows Tailwind's own scale names. It reads `text-subhead` as a text
 * colour, so `text-foreground` in a base style and `text-subhead` in className cancel each other (the text loses its
 * colour, or `text-footnote text-muted-foreground` loses its size). Teaching it the Atlas names keeps both.
 */
// tailwind-merge 1.x shape (pulled in by tailwind-variants 0.1): extra class groups are merged into the defaults.
export const TW_MERGE_CONFIG = {
  classGroups: {
    'font-size': [{ text: Object.keys(TEXT_SCALE) }],
    rounded: [{ rounded: Object.keys(RADIUS) }],
  },
};

// tailwind-variants shares one merger: any tva defined from here on carries this config and switches it on for all.
defaultConfig.twMergeConfig = TW_MERGE_CONFIG;
// tailwind-variants 0.1.20 only rebuilds that shared merger when a tv() is created with a new twMergeConfig. Creating
// one here switches the config on now, so tva styles defined before this module ran (Button, Badge) merge right too.
tv({}, { twMergeConfig: TW_MERGE_CONFIG });
