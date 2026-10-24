import type { WEIGHT_FONTS } from './type-scale';

/** Font files for expo-font's useFonts, keyed by the family names global.css uses (file name without `.ttf`). */
export const FONT_FILES: Record<(typeof WEIGHT_FONTS)[keyof typeof WEIGHT_FONTS], number> = {
  'Manrope-Regular': require('../../assets/fonts/Manrope-Regular.ttf'),
  'Manrope-Medium': require('../../assets/fonts/Manrope-Medium.ttf'),
  'Manrope-SemiBold': require('../../assets/fonts/Manrope-SemiBold.ttf'),
  'Manrope-Bold': require('../../assets/fonts/Manrope-Bold.ttf'),
};
