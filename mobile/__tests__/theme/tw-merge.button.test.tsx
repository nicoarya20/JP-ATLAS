import { render, screen } from '@testing-library/react-native';

import { Button, ButtonText } from '../../src/components/ui/button';

// A Button on its own, with no Text or Heading anywhere in this file: nothing here imports src/theme/tw-merge, so the
// Atlas merge config must already be on before the button's tva is defined (jest.setup.js, like app/_layout.tsx).
test('a button label keeps its colour next to the Atlas text size', async () => {
  await render(
    <Button>
      <ButtonText>Save</ButtonText>
    </Button>,
  );

  // Without the config, tailwind-merge reads `text-body` as a colour and drops `text-primary-foreground`.
  const classes = String(screen.getByText('Save').props.className).split(' ');
  expect(classes).toEqual(expect.arrayContaining(['text-primary-foreground', 'text-body']));
});
