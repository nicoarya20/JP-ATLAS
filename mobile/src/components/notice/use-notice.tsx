import { Toast, ToastTitle, useToast } from '@/components/ui/toast';

const NOTICE_MS = 3000;

/** Short feedback after an action ("Task marked done"): a gluestack toast at the top of the screen. */
export function useNotice() {
  const toast = useToast();
  return (message: string) =>
    toast.show({
      placement: 'top',
      duration: NOTICE_MS,
      render: ({ id }) => (
        <Toast nativeID={`notice-${id}`} action="muted" variant="solid">
          <ToastTitle>{message}</ToastTitle>
        </Toast>
      ),
    });
}
