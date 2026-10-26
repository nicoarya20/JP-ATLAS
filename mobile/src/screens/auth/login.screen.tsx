// Auth ① Login (prototype auth.login.jsx): illustration, brand, then the way in. Phase 2 signs in
// with Better Auth's email + password; the prototype's Google button is kept, switched off, with
// the reason it cannot work in Expo Go.
import { BRAND } from './auth.strings';
import { AuthFooter, AuthPage, Brand, GoogleUnavailable, Media } from './auth-parts';
import { SignInForm } from './sign-in-form';

/** The sign-in screen. Nothing navigates from here: the session gate follows the session store. */
export function LoginScreen() {
  return (
    <AuthPage testID="screen-login">
      <Media label={BRAND.media} />
      <Brand />
      <SignInForm />
      <GoogleUnavailable />
      <AuthFooter />
    </AuthPage>
  );
}
