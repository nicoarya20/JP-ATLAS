// Auth ⑤ Access denied (prototype AuthDenied): the Admin's reason, then the sign-in block to pick another account.
import { router } from 'expo-router';
import { CircleAlert } from 'lucide-react-native';

import { SectionCard } from '@/components/screen/detail-page';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { getAuth } from '@/data/auth';
import { DENIED } from './auth.strings';
import { AuthFooter, AuthPage, Brand, SignIn } from './auth-parts';

/** Back to the account picker this screen was opened from. */
const backToAccounts = () => (router.canGoBack() ? router.back() : router.replace('/account'));

/** The rejected account's screen. */
export function DeniedScreen() {
  const { deniedReason } = getAuth();
  return (
    <AuthPage testID="screen-denied">
      <SectionCard>
        <HStack className="items-center gap-2">
          <Icon as={CircleAlert} size="xl" className="text-destructive" />
          <Text accessibilityRole="header" className="text-section font-semibold">
            {DENIED.title}
          </Text>
        </HStack>
        <VStack className="gap-1">
          <Text className="text-footnote font-semibold">{DENIED.reasonLabel}</Text>
          <Text className="text-subhead">{deniedReason}</Text>
        </VStack>
        <Text className="text-footnote text-muted-foreground">{DENIED.note}</Text>
      </SectionCard>
      <Brand />
      <SignIn onGoogle={backToAccounts} />
      <AuthFooter />
    </AuthPage>
  );
}
