// The red new-item count and the More tiles' colours (device QA 2026-10-27: Archive read as Inbox, the count as violet).
import { render, screen } from '@testing-library/react-native';

import { CountBadge } from '../../src/components/badge/count-badge';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { moreTiles } from '../../src/screens/more/more.tiles';
import { CAPS } from '../helpers/whoami-fixtures';

describe('CountBadge', () => {
  test('draws the count in white on the iOS alert red and stays out of the screen reader', async () => {
    await render(<CountBadge count={3} />, { wrapper: GluestackUIProvider });
    const figure = screen.getByText('3', { includeHiddenElements: true });
    expect(figure.props.className).toContain('text-alert-foreground');
    expect(screen.queryByText('3')).not.toBeOnTheScreen();
  });
});

describe('More tiles', () => {
  test('every tile an Admin sees has its own colour, and Trash is not Inbox’s', () => {
    const tiles = moreTiles(CAPS.admin, { inbox: null, pending: null });
    const tones = tiles.map((t) => t.tone);
    expect(new Set(tones).size).toBe(tones.length);
    const tone = (label: string) => tiles.find((t) => t.label === label)?.tone;
    expect(tone('Trash')).not.toBe(tone('Inbox'));
  });
});
