import { renderHook } from '@testing-library/react-native';
import * as safeArea from 'react-native-safe-area-context';

import { TAB_BAR_SPACE, useTabBarInset } from '../../src/navigation/use-tab-bar-inset';

describe('useTabBarInset', () => {
  it('leaves the bar space above the bottom safe area', async () => {
    const home = { top: 59, right: 0, bottom: 34, left: 0 }; // test-only: an iPhone with a home indicator
    jest.spyOn(safeArea, 'useSafeAreaInsets').mockReturnValue(home);

    const { result } = await renderHook(() => useTabBarInset());

    expect(TAB_BAR_SPACE).toBe(76);
    expect(result.current).toBe(76 + 34);
  });
});
