// Copy that counts (W3c): "1 task" / "N tasks", and only the confirmation when Step 3 creates nothing.
import { OUTCOMES } from '../../src/screens/events/events.strings.outcomes';

describe('events outcomes copy', () => {
  test('AI found counts in the singular and the plural', () => {
    expect(OUTCOMES.found(1)).toBe(
      'AI found 1 task. Nothing is created until you tap the button below.',
    );
    expect(OUTCOMES.found(3)).toMatch(/^AI found 3 tasks\./);
  });

  test('created says only "Outcomes confirmed" after Confirm without tasks', () => {
    expect(OUTCOMES.created(0)).toBe('Outcomes confirmed');
    expect(OUTCOMES.created(1)).toBe('1 task created · outcomes confirmed');
    expect(OUTCOMES.created(2)).toBe('2 tasks created · outcomes confirmed');
  });
});
