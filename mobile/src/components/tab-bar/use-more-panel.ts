import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

/**
 * Open state of the More panel (prototype kit/layout.jsx AppTabBar): any navigation folds it, and so does Android's
 * back button while it is open (instead of leaving the screen).
 */
export function useMorePanel() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const toggle = () => setOpen((o) => !o);

  // A new pathname folds it, adjusted during render (React's pattern for state that follows a changing value).
  const pathname = usePathname();
  const [seen, setSeen] = useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpen(false);
      return true;
    });
    return () => back.remove();
  }, [open]);

  return { open, close, toggle };
}
