// Auth ② Google account picker (prototype AuthAccount): the office account waits for approval, the Gmail one was
// rejected, another account only says what Google would open.
import { router } from 'expo-router';
import { UserPlus } from 'lucide-react-native';

import { PersonAvatar } from '@/components/avatar/person-avatar';
import { Row, Rows } from '@/components/list/rows';
import { useNotice } from '@/components/notice/use-notice';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type AuthAccount, getAuth } from '@/data/auth';
import { ACCOUNT } from './auth.strings';
import { AuthPage, GoogleMark } from './auth-parts';

/** Where an account leads: approval wait replaces the sign-in screens, a rejection is pushed. */
const go = (a: AuthAccount) =>
  a.to === 'pending' ? router.replace('/pending') : router.push('/denied');

/** The account picker. */
export function AccountScreen() {
  const notice = useNotice();
  const { name, accounts } = getAuth();
  return (
    <AuthPage testID="screen-account">
      <HStack className="items-center gap-3">
        <GoogleMark big />
        <Text className="text-headline font-semibold">{ACCOUNT.header}</Text>
      </HStack>
      <VStack className="gap-1">
        <Text accessibilityRole="header" className="text-page font-bold">
          {ACCOUNT.title}
        </Text>
        <Text className="text-body">{ACCOUNT.sub}</Text>
      </VStack>
      <Rows>
        {accounts.map((a) => (
          <Row
            key={a.email}
            title={name}
            sub={a.email}
            accessibilityLabel={`${name}, ${a.email}`}
            lead={<PersonAvatar name={name} />}
            onPress={() => go(a)}
          />
        ))}
        <Row
          title={ACCOUNT.other}
          lead={
            <VStack className="h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Icon as={UserPlus} size="lg" className="text-foreground" />
            </VStack>
          }
          onPress={() => notice(ACCOUNT.otherNotice)}
        />
      </Rows>
      <Text className="text-footnote text-muted-foreground">{ACCOUNT.share}</Text>
      <HStack className="gap-4">
        {ACCOUNT.links.map((l, i) => (
          <Text
            key={l}
            className={`text-footnote text-muted-foreground ${i === 0 ? 'flex-1' : ''}`}
          >
            {l}
          </Text>
        ))}
      </HStack>
    </AuthPage>
  );
}
