import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { CreatePollDialog } from './create-poll-dialog';

test('submits a trimmed question with at least two options', async () => {
  const onCreate = vi.fn().mockResolvedValue('p1');
  const onClose = vi.fn();
  await render(<CreatePollDialog onClose={onClose} onCreate={onCreate} open />);
  const submit = page.getByRole('button', { name: 'Create poll' });
  await expect.element(submit).toBeDisabled();
  await userEvent.fill(page.getByLabelText('Question'), '  Where to eat?  ');
  await userEvent.fill(page.getByLabelText('Option 1'), 'Sushi');
  await userEvent.fill(page.getByLabelText('Option 2'), 'Tapas');
  await page.getByTestId(testIds.createPollAddOption).click();
  await userEvent.fill(page.getByLabelText('Option 3'), 'Pizza');
  await page.getByLabelText('Allow several choices').click();
  await submit.click();
  expect(onCreate).toHaveBeenCalledWith({
    multiSelect: true,
    options: ['Sushi', 'Tapas', 'Pizza'],
    question: 'Where to eat?'
  });
  expect(onClose).toHaveBeenCalled();
});

test('a failed create keeps the dialog open; removing an option renumbers the rest', async () => {
  const onCreate = vi.fn().mockResolvedValue(null);
  const onClose = vi.fn();
  await render(<CreatePollDialog onClose={onClose} onCreate={onCreate} open />);
  await userEvent.fill(page.getByLabelText('Question'), 'Where?');
  await userEvent.fill(page.getByLabelText('Option 1'), 'A');
  await page.getByTestId(testIds.createPollAddOption).click();
  await userEvent.fill(page.getByLabelText('Option 2'), 'B');
  await userEvent.fill(page.getByLabelText('Option 3'), 'C');
  await page.getByRole('button', { name: 'Remove option 2' }).click();
  await expect.element(page.getByLabelText('Option 2')).toHaveValue('C');
  await page.getByRole('button', { name: 'Create poll' }).click();
  expect(onCreate).toHaveBeenCalledWith({
    multiSelect: false,
    options: ['A', 'C'],
    question: 'Where?'
  });
  expect(onClose).not.toHaveBeenCalled();
});

test('flags options that differ only by case', async () => {
  await render(<CreatePollDialog onClose={vi.fn()} onCreate={vi.fn()} open />);
  await userEvent.fill(page.getByLabelText('Question'), 'Where?');
  await userEvent.fill(page.getByLabelText('Option 1'), 'Sushi');
  await userEvent.fill(page.getByLabelText('Option 2'), 'sushi');
  await expect.element(page.getByRole('alert')).toHaveTextContent('Options must be different.');
  await expect.element(page.getByRole('button', { name: 'Create poll' })).toBeDisabled();
});

test('caps options at ten', async () => {
  await render(<CreatePollDialog onClose={vi.fn()} onCreate={vi.fn()} open />);
  for (let index = 0; index < 8; index++) {
    await page.getByTestId(testIds.createPollAddOption).click();
  }
  await expect.element(page.getByTestId(testIds.createPollAddOption)).toBeDisabled();
});
