// Confirmation dialog for actions that can't be undone (UX §1): T2 = title, the real impact, Cancel + a specific action
// button; T3 = T2 plus typing the item's name. Built on gluestack AlertDialog in a native modal (useRNModal) so it also
// shows above a modal or formSheet route.
import { useState } from 'react';
import { nameMatches, TypeToConfirm } from '@/components/confirm/type-to-confirm';
import {
  type ConfirmErrorText,
  type ConfirmRun,
  useConfirmAction,
} from '@/components/confirm/use-confirm-action';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

export const CONFIRM_DIALOG = { cancel: 'Cancel' } as const;

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The real impact ("You'll be signed out of this account."). */
  message: string;
  /** Specific verb for the action button ("Sign out", "Approve"), never "OK". */
  confirmLabel: string;
  onConfirm: ConfirmRun;
  /** Destructive: the action button is drawn with the danger fill. */
  danger?: boolean;
  /** T3: the item's name, which must be typed before the action unlocks. */
  typeToConfirm?: string;
  errorText?: ConfirmErrorText;
  testID?: string;
};

/** Modal confirmation; the action button shows a spinner while it runs and the dialog closes once it succeeds. */
export function ConfirmDialog(p: ConfirmDialogProps) {
  const [typed, setTyped] = useState('');
  const close = () => {
    setTyped('');
    clear();
    p.onClose();
  };
  const { busy, error, run, clear } = useConfirmAction(p.onConfirm, close, p.errorText);
  const locked = p.typeToConfirm !== undefined && !nameMatches(typed, p.typeToConfirm);
  return (
    <AlertDialog
      isOpen={p.open}
      onClose={busy ? undefined : close}
      useRNModal
      closeOnOverlayClick={!busy}
    >
      <AlertDialogBackdrop />
      <AlertDialogContent testID={p.testID} className="w-[90%] max-w-[420px] rounded-modal bg-card">
        <AlertDialogHeader>
          <Heading accessibilityRole="header" className="text-section text-foreground">
            {p.title}
          </Heading>
        </AlertDialogHeader>
        <AlertDialogBody className="mt-3">
          <VStack className="gap-3">
            <Text className="text-body text-foreground">{p.message}</Text>
            {p.typeToConfirm !== undefined && (
              <TypeToConfirm
                name={p.typeToConfirm}
                value={typed}
                onChangeText={setTyped}
                disabled={busy}
              />
            )}
            {error && (
              <Text accessibilityLiveRegion="polite" className="text-subhead text-destructive">
                {error}
              </Text>
            )}
          </VStack>
        </AlertDialogBody>
        <AlertDialogFooter className="mt-5">
          <Button variant="outline" onPress={close} isDisabled={busy}>
            <ButtonText>{CONFIRM_DIALOG.cancel}</ButtonText>
          </Button>
          <Button
            testID="confirm-action"
            variant={p.danger ? 'destructive' : 'default'}
            // Not awaited: run handles its own failure, and the press must not wait for the action
            onPress={() => void run()}
            isDisabled={busy || locked}
            accessibilityState={{ busy, disabled: busy || locked }}
          >
            {busy && <ButtonSpinner />}
            <ButtonText>{p.confirmLabel}</ButtonText>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
