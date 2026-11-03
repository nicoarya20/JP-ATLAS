// Pull to refresh on a stacked tab screen (StackedScreen): jest's ScrollView keeps `refreshControl` as a prop instead of
// rendering it, so the pull is its onRefresh called by hand.
import { act, screen } from '@testing-library/react-native';

const control = () => screen.getByTestId('stacked-scroll').props.refreshControl;

/** Pulls the sheet down. */
export const pullToRefresh = () => act(() => control().props.onRefresh());

/** The spinner is showing. */
export const refreshing = (): boolean => control().props.refreshing;
