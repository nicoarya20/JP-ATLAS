// Pieces shared by the sign-in screens (prototype auth.login.jsx): media placeholder, brand, the Google sign-in block,
// the footer and the auth page frame.
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { SPACING } from '@/theme/tokens';

import { APP_NAME, BRAND, SIGN_IN, SIGN_IN_FORM } from './auth.strings';

/** Grey box standing in for an image (prototype kit Media). */
export function Media({ label, small }: { label: string; small?: boolean }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      className={`items-center justify-center rounded-card border border-dashed border-input bg-muted ${small ? 'h-16 w-16' : 'h-48 w-full'}`}
    >
      <Text className="text-footnote text-muted-foreground">{label}</Text>
    </View>
  );
}

/** Google mark placeholder (wireframe: a round "G"). */
export function GoogleMark({ big }: { big?: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={`items-center justify-center rounded-full border border-input bg-card ${big ? 'h-10 w-10' : 'h-6 w-6'}`}
    >
      <Text className={`font-bold ${big ? 'text-headline' : 'text-footnote'}`}>G</Text>
    </View>
  );
}

/** Logo box, app name and tagline. */
export function Brand() {
  return (
    <VStack className="gap-3">
      <HStack className="items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-control bg-muted">
          <Text className="text-footnote text-muted-foreground">{BRAND.logo}</Text>
        </View>
        <Text accessibilityRole="header" className="text-page font-bold">
          {APP_NAME}
        </Text>
      </HStack>
      <Text className="text-body">{BRAND.tagline}</Text>
    </VStack>
  );
}

/**
 * The Google button, switched off with the reason next to it, and the approval note.
 *
 * Google sign-in cannot work in Expo Go: the deep-link scheme it would be called back on is not
 * registered there, and Google will not accept an `http` LAN address as a redirect URI
 * (reacttransition.md §6c). It stays visible rather than hidden, so nobody looks for a button that
 * is simply missing, and the reason is a line of text, not a tooltip a phone cannot show.
 */
export function GoogleUnavailable() {
  return (
    <VStack className="gap-4" testID="google-unavailable">
      <Button
        size="lg"
        variant="outline"
        isDisabled
        className="gap-3"
        accessibilityHint={SIGN_IN_FORM.googleUnavailable}
      >
        <GoogleMark />
        <ButtonText>{SIGN_IN.google}</ButtonText>
      </Button>
      <Text className="text-footnote text-muted-foreground">
        {SIGN_IN_FORM.googleUnavailable}
      </Text>
      <Text className="text-footnote text-muted-foreground">{SIGN_IN.note}</Text>
    </VStack>
  );
}

/** "Help · Privacy Policy". */
export function AuthFooter() {
  return <Text className="text-center text-footnote text-muted-foreground">{SIGN_IN.footer}</Text>;
}

/** Full-screen sign-in page: safe-area padding, scrolling content. */
export function AuthPage({ children, testID }: { children: ReactNode; testID?: string }) {
  const { top, bottom } = useSafeAreaInsets();
  return (
    <ScrollView
      testID={testID}
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 px-4"
      contentContainerStyle={{ paddingTop: top + SPACING.lg, paddingBottom: bottom + SPACING.lg }}
    >
      {children}
    </ScrollView>
  );
}
