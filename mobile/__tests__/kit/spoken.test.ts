// spoken(): the parts of a card read as one name, empty parts skipped.
import { spoken } from '../../src/components/a11y/spoken';

describe('spoken', () => {
  it('joins the parts with commas and skips the empty ones', () => {
    expect(spoken('#12 Fix login', null, 'High', false, undefined, '', 'Due Oct 5')).toBe(
      '#12 Fix login, High, Due Oct 5',
    );
  });

  it('is empty when every part is', () => {
    expect(spoken(null, false)).toBe('');
  });
});
