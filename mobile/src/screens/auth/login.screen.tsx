// Auth ① Login (prototype auth.login.jsx): illustration, brand, Sign in with Google → the account picker.
import { router } from 'expo-router';
import { BRAND } from './auth.strings';
import { AuthFooter, AuthPage, Brand, Media, SignIn } from './auth-parts';

/** The login screen; Phase 1 only walks the sign-in screens (Better Auth arrives in Phase 2). */
export function LoginScreen() {
  return (
    <AuthPage testID="screen-login">
      <Media label={BRAND.media} />
      <Brand />
      <SignIn onGoogle={() => router.push('/account')} />
      <AuthFooter />
    </AuthPage>
  );
}
