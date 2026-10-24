import { headingStyle } from '../../src/components/ui/heading/styles';
import { textStyle } from '../../src/components/ui/text/styles';

// tva runs tailwind-merge on every class list; it must keep an Atlas text size next to a colour, and let a weight in
// className replace the base weight (each weight utility is also the font family).
describe('class merging of the Atlas scale', () => {
  test('a text size and a text colour both survive', () => {
    expect(textStyle({ class: 'text-body' }).split(' ')).toEqual(
      expect.arrayContaining(['text-foreground', 'text-body']),
    );
    expect(textStyle({ class: 'text-footnote text-muted-foreground' }).split(' ')).toEqual(
      expect.arrayContaining(['text-footnote', 'text-muted-foreground']),
    );
  });

  test('a later colour or size still replaces an earlier one', () => {
    expect(textStyle({ class: 'text-muted-foreground' })).not.toContain('text-foreground ');
    expect(textStyle({ class: 'text-body text-footnote' }).split(' ')).not.toContain('text-body');
  });

  test('a weight in className replaces the base weight', () => {
    expect(textStyle({}).split(' ')).toContain('font-normal');
    expect(textStyle({ class: 'font-semibold' }).split(' ')).not.toContain('font-normal');
    expect(headingStyle({}).split(' ')).toContain('font-semibold');
    expect(headingStyle({ bold: true }).split(' ')).not.toContain('font-semibold');
  });
});
