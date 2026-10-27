// The red new-item count and the More tiles' colours (device QA 2026-10-27: Archive read as Inbox, the count as violet).
import { render, screen } from '@testing-library/react-native';

import { CountBadge } from '../../src/components/badge/count-badge';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import type { Role } from '../../src/data/sample';
import { moreTiles } from '../../src/screens/more/more.tiles';

// The signed-in role, as a variable: biome reads a literal `role` prop as an ARIA role.
const ADMIN: Role = 'admin';

describe('CountBadge', () => {
  test('draws the count in white on the danger red and stays out of the screen reader', async () => {
    await render(<CountBadge count={3} />, { wrapper: GluestackUIProvider });
    const figure = screen.getByText('3', { includeHiddenElements: true });
    expect(figure.props.className).toContain('text-destructive-foreground');
    expect(screen.queryByText('3')).not.toBeOnTheScreen();
  });
});

describe('More tiles', () => {
  test('every tile an Admin sees has its own colour, and Archive is not Inbox’s', () => {
    const tones = moreTiles(ADMIN).map((t) => t.tone);
    expect(new Set(tones).size).toBe(tones.length);
    const tone = (label: string) => moreTiles(ADMIN).find((t) => t.label === label)?.tone;
    expect(tone('Archive')).not.toBe(tone('Inbox'));
  });
});
