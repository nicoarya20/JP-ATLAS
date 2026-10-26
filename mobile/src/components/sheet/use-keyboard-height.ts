import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// iOS tells before the keyboard moves (with its duration), Android only after.
const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/** Height of the software keyboard (0 when down), and how long its move takes in ms (0 when the system gives none). */
export type KeyboardHeight = { height: number; duration: number };

/** The software keyboard's height, so a panel pinned to the bottom of the screen can ride above it. */
export function useKeyboardHeight(): KeyboardHeight {
  const [kb, setKb] = useState<KeyboardHeight>(() => ({
    height: Keyboard.metrics()?.height ?? 0,
    duration: 0,
  }));
  useEffect(() => {
    const show = Keyboard.addListener(SHOW, (e) =>
      setKb({ height: e.endCoordinates.height, duration: e.duration ?? 0 }),
    );
    const hide = Keyboard.addListener(HIDE, (e) => setKb({ height: 0, duration: e.duration ?? 0 }));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return kb;
}
