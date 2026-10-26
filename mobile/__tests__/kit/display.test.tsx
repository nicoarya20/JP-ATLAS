import { fireEvent, render, screen } from '@testing-library/react-native';
import { ListChecks } from 'lucide-react-native';

import { AvatarStack } from '../../src/components/avatar/avatar-stack';
import { Facts } from '../../src/components/list/facts';
import { Row, Rows } from '../../src/components/list/rows';
import { EmptyState } from '../../src/components/state/empty-state';
import { NoMatch } from '../../src/components/state/no-match';
import { Button, ButtonText } from '../../src/components/ui/button';
import { GluestackUIProvider } from '../../src/components/ui/gluestack-ui-provider';
import { Text } from '../../src/components/ui/text';

const show = (ui: React.ReactElement) => render(ui, { wrapper: GluestackUIProvider });

describe('EmptyState and NoMatch', () => {
  test('an empty state names its icon, title, text and action', async () => {
    await show(
      <EmptyState
        icon={ListChecks}
        iconLabel="No tasks"
        title="No tasks for you yet."
        text="Tasks assigned to you will show up here."
        action={
          <Button>
            <ButtonText>New task</ButtonText>
          </Button>
        }
      />,
    );
    expect(screen.getByRole('image', { name: 'No tasks' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'No tasks for you yet.' })).toBeOnTheScreen();
    expect(screen.getByText('Tasks assigned to you will show up here.')).toBeOnTheScreen();
    expect(screen.getByText('New task')).toBeOnTheScreen();
  });

  test('No match offers Reset filters', async () => {
    const onReset = jest.fn();
    await show(<NoMatch title="No tasks match these filters." onReset={onReset} />);
    expect(screen.getByRole('image', { name: 'No matches' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Reset filters'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe('Rows and Facts', () => {
  test('a row with onPress is a button with a chevron; a plain row is not', async () => {
    const onPress = jest.fn();
    await show(
      <Rows testID="rows">
        <Row key="a" title="Team" sub="6 people" onPress={onPress} />
        <Row key="b" title="Version" right={<Text>1.0</Text>} />
      </Rows>,
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Team' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('6 people')).toBeOnTheScreen();
    expect(screen.getByText('Version')).toBeOnTheScreen();
  });

  test('facts skip empty values', async () => {
    await show(
      <Facts
        facts={[
          ['Project', 'Atlas'],
          ['Due', ''],
          ['Owner', null],
        ]}
      />,
    );
    expect(screen.getByText('Project')).toBeOnTheScreen();
    expect(screen.getByText('Atlas')).toBeOnTheScreen();
    expect(screen.queryByText('Due')).not.toBeOnTheScreen();
    expect(screen.queryByText('Owner')).not.toBeOnTheScreen();
  });
});

describe('AvatarStack', () => {
  test('folds the people past max into +n and reads every name', async () => {
    await show(<AvatarStack names={['Nico', 'Rina', 'Dodi', 'Sri', 'Ayu', 'Lea']} max={4} />);
    expect(screen.getByTestId('avatar-more')).toHaveTextContent('+2');
    expect(screen.getByLabelText('Nico, Rina, Dodi, Sri, Ayu, Lea')).toBeOnTheScreen();
  });

  test('no +n when everyone fits', async () => {
    await show(<AvatarStack names={['Nico', 'Rina']} label="2 people" />);
    expect(screen.queryByTestId('avatar-more')).not.toBeOnTheScreen();
    expect(screen.getByLabelText('2 people')).toBeOnTheScreen();
  });
});
