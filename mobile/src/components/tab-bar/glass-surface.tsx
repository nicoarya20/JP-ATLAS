import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { StyleSheet, useColorScheme, View, type ViewProps } from 'react-native';

import { useReduceTransparency } from './use-reduce-transparency';

/**
 * Liquid Glass draws on iOS 26+ only, and some iOS 26 betas lack its API (expo#40911), so both are checked (each
 * caches its native answer).
 */
const liquidGlass = () => isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/**
 * The tint over the material (prototype --glass-bar / --glass-bar-open). Liquid Glass brings its own frost, so only the
 * open state tints it; elsewhere a semi-opaque surface stands in (no blur: expo-blur is costly on Android).
 */
const TINT = {
  glass: { rest: '', open: 'bg-card/88' },
  plain: { rest: 'bg-card/60', open: 'bg-card/88' },
  solid: { rest: 'bg-card', open: 'bg-card' },
} as const;

export type GlassSurfaceProps = ViewProps & {
  /** Corner radius, shared by the clip and the glass shape. */
  radius: number;
  /** The More panel is open over the dim: nearly solid. */
  open?: boolean;
  /** Folding away under an opacity < 1, which GlassView must not sit under: its glass goes first. */
  hidden?: boolean;
};

/**
 * The tab bar's surface (pill, panel, "+"; docs/phase1-navigation.md §4.3): Liquid Glass where iOS has it, a
 * semi-opaque token surface elsewhere, solid when the system asks to reduce transparency.
 */
export function GlassSurface({
  radius,
  open = false,
  hidden = false,
  className = '',
  style,
  children,
  ...rest
}: GlassSurfaceProps) {
  const solid = useReduceTransparency();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const glass = liquidGlass() && !solid;
  const tint = TINT[solid ? 'solid' : glass ? 'glass' : 'plain'][open ? 'open' : 'rest'];

  return (
    <View
      {...rest}
      style={[{ borderRadius: radius }, style]}
      className={`overflow-hidden border border-border ${className}`}
    >
      {glass ? (
        <GlassView
          testID="glass-view"
          glassEffectStyle={{ style: hidden ? 'none' : 'regular', animate: true }}
          colorScheme={scheme}
          style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        />
      ) : null}
      {tint ? <View testID="glass-tint" style={StyleSheet.absoluteFill} className={tint} /> : null}
      {children}
    </View>
  );
}
