// Email + password sign-in, the only way in that works today (Google needs a built app, §6c).
// Messages the server sent are shown as they came, in Indonesian (K5); everything this file writes
// is English, like the rest of the mobile copy.
import { Field } from '@/components/form/field';
import { FormError } from '@/components/form/form-error';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

import { SIGN_IN, SIGN_IN_FORM } from './auth.strings';
import { useSignIn } from './use-sign-in';

/** The form: two fields, the button with its spinner, and the last failure under it. */
export function SignInForm() {
  const f = useSignIn();
  // A failure that never reached the server is worth another go; a refused password is not.
  const retryable = f.failure?.isTransport === true;
  return (
    <VStack className="gap-4" testID="sign-in-form">
      <Text accessibilityRole="header" className="text-section font-semibold">
        {SIGN_IN.title}
      </Text>
      <Field
        label={SIGN_IN_FORM.email}
        value={f.email}
        onChangeText={f.setEmail}
        error={f.fields.email}
        hint={SIGN_IN_FORM.emailHint}
        inputMode="email"
        autoCapitalize="none"
        autoComplete="email"
        testID="sign-in-email"
      />
      <Field
        label={SIGN_IN_FORM.password}
        value={f.password}
        onChangeText={f.setPassword}
        error={f.fields.password}
        autoCapitalize="none"
        autoComplete="password"
        secureTextEntry
        testID="sign-in-password"
      />
      {f.failure && <FormError testID="sign-in-error">{f.failure.message}</FormError>}
      <Button
        size="lg"
        onPress={() => void f.submit()}
        isDisabled={f.busy}
        accessibilityState={{ busy: f.busy, disabled: f.busy }}
        testID="sign-in-submit"
      >
        {f.busy && <ButtonSpinner />}
        <ButtonText>{retryable ? SIGN_IN_FORM.retry : SIGN_IN_FORM.submit}</ButtonText>
      </Button>
    </VStack>
  );
}
