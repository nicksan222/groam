import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AssistantChoiceReceipt } from './assistant-choice-receipt';

const choice = {
  options: [
    'Yes — add stays and day-trip timings',
    'No — keep the itinerary unchanged',
    'Not yet — show recommended hotels first'
  ],
  question: 'Should I apply the reworked Lisbon itinerary?'
};

test('keeps the complete choice form visible with the submitted choice selected', async () => {
  await render(
    <AssistantChoiceReceipt
      choice={choice}
      disabled={false}
      onChoose={vi.fn().mockResolvedValue(true)}
      selectedChoice="Yes — add stays and day-trip timings"
    />
  );

  await expect.element(page.getByText(choice.question)).toBeInTheDocument();
  for (const option of choice.options)
    await expect.element(page.getByRole('button', { name: option })).toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: choice.options[0] }))
    .toHaveAttribute('aria-pressed', 'true');
  await expect.element(page.getByRole('textbox', { name: 'Custom answer' })).toBeInTheDocument();
});
