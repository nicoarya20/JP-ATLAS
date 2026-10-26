// Auth ⑤ Access denied (prototype AuthDenied): the Admin's reason, then the way out. The account is
// signed in but turned down, so "another account" means ending this session first (T2) — the
// prototype's route back to Google's account picker does not exist while Google is switched off.
//
// The reason is the Admin's own sentence and arrives from the server in Indonesian; it is shown as
// it came (K5), never translated or rewritten here.
import { CircleAlert } from 'lucide-react-native';
import { useState } from 'react';

import { SectionCard } from '@/components/screen/detail-page';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { getAuth } from '@/data/auth';
import { useSession } from '@/session';

import { DENIED } from './auth.strings';
import { AuthFooter, AuthPage, Brand } from './auth-parts';
import { SignOutDialog } from './sign-out';

/** The rejected account's screen. */
export function DeniedScreen() {
  const { user } = useSession();
  const { deniedReason } = getAuth();
  const [signingOut, setSigningOut] = useState(false);
  // While nobody is signed in (a screen test, or a session that just ended) the sample reason keeps
  // the screen readable; a real rejection without a reason says so instead of showing someone else's.
  const reason = user ? (user.approvalReason ?? DENIED.noReason) : deniedReason;
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
          <Text className="text-subhead">{reason}</Text>
        </VStack>
        <Text className="text-footnote text-muted-foreground">{DENIED.note}</Text>
      </SectionCard>
      <Brand />
      <Button size="lg" variant="outline" onPress={() => setSigningOut(true)}>
        <ButtonText>{DENIED.signOut}</ButtonText>
      </Button>
      <AuthFooter />
      <SignOutDialog open={signingOut} onClose={() => setSigningOut(false)} />
    </AuthPage>
  );
}
