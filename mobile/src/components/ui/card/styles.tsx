import { tva } from '@gluestack-ui/utils/nativewind-utils';
import { isWeb } from '@gluestack-ui/utils/nativewind-utils';
const baseStyle = isWeb ? 'flex flex-col relative z-0' : '';

export const cardStyle = tva({
  // Atlas card: surface on the canvas, 14 px radius, no shadow (the prototype's section cards have none).
  base: `${baseStyle} flex-col bg-card rounded-card`,
  variants: {
    size: {
      default: 'p-4 gap-3',
      sm: 'p-3 gap-3',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});
