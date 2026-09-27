import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { AssistantChoiceReceipt } from './assistant-choice-receipt';

const choice = {
  options: [
    'Yes — add stays and day-trip timings',
    'No — keep the itinerary unchanged',
    'Not yet — show recommended hotels first'
  ],
  question: 'Should I apply the reworked Lisbon itinerary?'
};

test('keeps the complete choice form visible with the submitted choice selected', () => {
  render(
    <AssistantChoiceReceipt
      choice={choice}
      disabled={false}
      onChoose={vi.fn().mockResolvedValue(true)}
      selectedChoice="Yes — add stays and day-trip timings"
    />
  );

  expect(screen.getByText(choice.question)).toBeDefined();
  for (const option of choice.options)
    expect(screen.getByRole('button', { name: option })).toBeDefined();
  expect(screen.getByRole('button', { name: choice.options[0] }).getAttribute('aria-pressed')).toBe(
    'true'
  );
  expect(screen.getByRole('textbox', { name: 'Custom answer' })).toBeDefined();
});
