import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { CreateResearchDialog } from './create-research-dialog';

const submitButton = () => page.getByTestId(`${testIds.createResearchDialog}-submit`);

test('disables submit until the subject has text', async () => {
  await render(<CreateResearchDialog onClose={vi.fn()} onSubmit={vi.fn()} open />);
  await expect.element(submitButton()).toBeDisabled();
  await page.getByTestId(testIds.createResearchSubject).fill('   ');
  await expect.element(submitButton()).toBeDisabled();
  await page.getByTestId(testIds.createResearchSubject).fill('Hotels');
  await expect.element(submitButton()).toBeEnabled();
});

test('submits the trimmed subject and brief', async () => {
  const onSubmit = vi.fn();
  await render(<CreateResearchDialog onClose={vi.fn()} onSubmit={onSubmit} open />);
  await page.getByTestId(testIds.createResearchSubject).fill('  Hotels  ');
  await page.getByTestId(testIds.createResearchBrief).fill(' near the Duomo ');
  await submitButton().click();
  expect(onSubmit).toHaveBeenCalledWith({ brief: 'near the Duomo', subject: 'Hotels' });
});

test('omits an empty brief and limits the subject length', async () => {
  const onSubmit = vi.fn();
  await render(<CreateResearchDialog onClose={vi.fn()} onSubmit={onSubmit} open />);
  await page.getByTestId(testIds.createResearchSubject).fill('x'.repeat(130));
  await expect
    .element(page.getByTestId(testIds.createResearchSubject))
    .toHaveValue('x'.repeat(120));
  await submitButton().click();
  expect(onSubmit).toHaveBeenCalledWith({ brief: undefined, subject: 'x'.repeat(120) });
});

test('cancel closes the dialog', async () => {
  const onClose = vi.fn();
  await render(<CreateResearchDialog onClose={onClose} onSubmit={vi.fn()} open />);
  await page.getByRole('button', { name: 'Cancel' }).click();
  expect(onClose).toHaveBeenCalled();
});
