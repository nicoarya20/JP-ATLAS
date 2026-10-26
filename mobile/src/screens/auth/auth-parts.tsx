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

import { APP_NAME, BRAND, SIGN_IN } from './auth.strings';

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

/** "Sign in to your account" with the Google button and the approval note. */
export function SignIn({ onGoogle }: { onGoogle: () => void }) {
  return (
    <VStack className="gap-4">
      <Text accessibilityRole="header" className="text-section font-semibold">
        {SIGN_IN.title}
      </Text>
      <Button size="lg" variant="outline" onPress={onGoogle} className="gap-3">
        <GoogleMark />
        <ButtonText>{SIGN_IN.google}</ButtonText>
      </Button>
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
