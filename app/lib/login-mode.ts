import { emailPasswordEnabled } from '@server/account/auth-policy';

export type LoginMode = 'signin' | 'signup';

export type LoginAuthMode = { emailAuthEnabled: boolean; signupEnabled: boolean };

/**
 * Which email/password options the login screen may show. Production is Google-only whatever the
 * saved settings say (stale rows must not reopen email sign-in/sign-up); outside production the
 * settings decide, and sign-up needs email sign-in since it is the same form.
 */
export function loginAuthMode(isProd: boolean, settings: LoginAuthMode): LoginAuthMode {
  const emailAuthEnabled = emailPasswordEnabled(isProd) && settings.emailAuthEnabled;
  return { emailAuthEnabled, signupEnabled: emailAuthEnabled && settings.signupEnabled };
}

/** Starting mode: `?mode=signup` only when signup is allowed. */
export function initialMode(params: URLSearchParams, signupEnabled: boolean): LoginMode {
  return params.get('mode') === 'signup' && signupEnabled ? 'signup' : 'signin';
}

/**
 * Heading, subtitle, submit label and mode-toggle footer for each mode. `googleOnly` swaps the
 * subtitle for one that points at the Google button, since there is no form to describe.
 */
export function modeCopy(mode: LoginMode, appName: string, googleOnly = false) {
  const copy = modeCopyFor(mode, appName);
  return googleOnly
    ? { ...copy, subtitle: `Masuk dengan akun Google Anda untuk memakai ${appName}.` }
    : copy;
}

function modeCopyFor(mode: LoginMode, appName: string) {
  return mode === 'signup'
    ? {
        title: 'Buat akun',
        subtitle: `Daftar untuk mulai memakai ${appName}.`,
        submit: 'Buat akun',
        switchPrompt: 'Sudah punya akun?',
        switchAction: 'Masuk',
      }
    : {
        title: 'Masuk ke akunmu',
        subtitle: `Selamat datang kembali di ${appName}.`,
        submit: 'Masuk',
        switchPrompt: 'Belum punya akun?',
        switchAction: 'Daftar',
      };
}
