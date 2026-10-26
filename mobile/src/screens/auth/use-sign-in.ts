// Sign-in form state for the login screen: what was typed, what is missing, and what the server
// said. Nothing navigates on success — the session gate (app/_layout.tsx) follows the session
// store, so a signed-in, approved account leaves the (auth) stack on its own.
import { useState } from 'react';

import { type ApiError, isApiError } from '@/api';
import { signInWithEmail, transportApiError } from '@/session';

import { SIGN_IN_FORM } from './auth.strings';

/** Which of the two fields is empty; our own copy, in English, shown under the field. */
export type SignInFieldErrors = { email?: string; password?: string };

/** `{ email, password, fields, failure, busy, submit }` for the sign-in form. */
export function useSignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<SignInFieldErrors>({});
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    const missing: SignInFieldErrors = {};
    if (!email.trim()) missing.email = SIGN_IN_FORM.emailMissing;
    if (!password) missing.password = SIGN_IN_FORM.passwordMissing;
    setFields(missing);
    setFailure(null);
    if (missing.email || missing.password) return;
    setBusy(true);
    try {
      await signInWithEmail(email, password);
    } catch (thrown) {
      // Handled: the message the server sent (or ours, for a request that never arrived) is shown
      // under the button, with a retry when it is worth retrying.
      setFailure(isApiError(thrown) ? thrown : transportApiError(thrown));
    } finally {
      setBusy(false);
    }
  };

  return {
    email,
    setEmail: (value: string) => {
      setEmail(value);
      setFields((prev) => ({ ...prev, email: undefined }));
    },
    password,
    setPassword: (value: string) => {
      setPassword(value);
      setFields((prev) => ({ ...prev, password: undefined }));
    },
    fields,
    failure,
    busy,
    submit,
  };
}
