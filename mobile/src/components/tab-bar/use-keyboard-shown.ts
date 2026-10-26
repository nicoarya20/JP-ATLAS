import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// iOS tells before the keyboard moves, Android only after.
const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/** Whether the software keyboard is up (the tab bar steps aside for it, docs/phase1-navigation.md §4.1). */
export function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener(SHOW, () => setShown(true));
    const hide = Keyboard.addListener(HIDE, () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}
