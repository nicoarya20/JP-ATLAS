// A sheet's route is removed only once its panel has slid away (src/components/sheet/use-own-sheet.ts), a beat after
// the press that closed it.
import { screen, waitFor } from '@testing-library/react-native';

/** Waits until the sheet `testID` (the filter sheet by default) has left. test-only */
export const sheetGone = (testID = 'filter-sheet') =>
  waitFor(() =>
    expect(screen.queryByTestId(testID, { includeHiddenElements: true })).not.toBeOnTheScreen(),
  );
