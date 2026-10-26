import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** The system's Reduce Transparency setting (iOS; always off on Android), followed while the app runs. */
export function useReduceTransparency(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (live) setOn(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setOn);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return on;
}
