'use client';
import { PrimitiveIcon, UIIcon } from '@gluestack-ui/core/icon/creator';
import type { VariantProps } from '@gluestack-ui/utils/nativewind-utils';
import { tva, useStyleContext, withStyleContext } from '@gluestack-ui/utils/nativewind-utils';
import { withUniwind } from 'uniwind';
import React from 'react';
import { Text, View } from 'react-native';
import { Svg } from 'react-native-svg';

const SCOPE = 'BADGE';

// Atlas status pairs (text colour on its soft background, never colour alone): the tone comes from the status word,
// see src/components/status/status.ts. `default` stays neutral; lime is never a status.
const badgeStyle = tva({
  base: 'flex-row items-center justify-center self-start rounded-full px-3 py-1',
  variants: {
    variant: {
      default: 'bg-muted',
      info: 'bg-info-soft',
      success: 'bg-success-soft',
      warning: 'bg-warning-soft',
      destructive: 'bg-danger-soft',
      outline: 'border border-input bg-transparent',
    },
  },
});

const badgeTextStyle = tva({
  base: 'text-footnote font-semibold',
  parentVariants: {
    variant: {
      default: 'text-muted-foreground',
      info: 'text-info',
      success: 'text-success',
      warning: 'text-warning',
      destructive: 'text-destructive',
      outline: 'text-foreground',
    },
  },
});

const badgeIconStyle = tva({
  base: 'fill-none h-3 w-3 pointer-events-none',
  parentVariants: {
    variant: {
      default: 'text-muted-foreground',
      info: 'text-info',
      success: 'text-success',
      warning: 'text-warning',
      destructive: 'text-destructive',
      outline: 'text-foreground',
    },
  },
});

const ContextView = withStyleContext(View, SCOPE);

type IBadgeProps = React.ComponentPropsWithoutRef<typeof ContextView> &
  VariantProps<typeof badgeStyle>;
function Badge({
  children,
  variant = 'default',
  className,
  ...props
}: { className?: string } & IBadgeProps) {
  return (
    <ContextView
      className={badgeStyle({ variant, class: className })}
      {...props}
      context={{ variant }}
    >
      {children}
    </ContextView>
  );
}

type IBadgeTextProps = React.ComponentPropsWithoutRef<typeof Text> &
  VariantProps<typeof badgeTextStyle>;

const BadgeText = React.forwardRef<
  React.ComponentRef<typeof Text>,
  IBadgeTextProps
>(function BadgeText({ children, className, ...props }, ref) {
  const { variant: parentVariant } = useStyleContext(SCOPE);
  return (
    <Text
      ref={ref}
      className={badgeTextStyle({
        parentVariants: {
          variant: parentVariant,
        },
        class: className,
      })}
      {...props}
    >
      {children}
    </Text>
  );
});

type IBadgeIconProps = React.ComponentPropsWithoutRef<typeof PrimitiveIcon> &
  VariantProps<typeof badgeIconStyle> & {
    size?: number;
};
  
const StyledUIIcon = withUniwind(UIIcon);


const BadgeIcon = React.forwardRef<
  React.ComponentRef<typeof Svg>,
  IBadgeIconProps
>(function BadgeIcon({ className, size, ...props }, ref) {
  const { variant: parentVariant } = useStyleContext(SCOPE);

  if (typeof size === 'number') {
    return (
      <StyledUIIcon
        ref={ref}
        {...props}
        className={badgeIconStyle({ class: className })}
        size={size}
      />
    );
  } else if (
    (props?.height !== undefined || props?.width !== undefined) &&
    size === undefined
  ) {
    return (
      <StyledUIIcon
        ref={ref}
        {...props}
        className={badgeIconStyle({ class: className })}
      />
    );
  }
  return (
    <StyledUIIcon
      className={badgeIconStyle({
        parentVariants: {
          variant: parentVariant,
        },
        class: className,
      })}
      {...props}
      ref={ref}
    />
  );
});

Badge.displayName = 'Badge';
BadgeText.displayName = 'BadgeText';
BadgeIcon.displayName = 'BadgeIcon';

export { Badge, BadgeIcon, BadgeText };
