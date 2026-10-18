import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ContinueDraftDialog } from './continue-draft-dialog';

function renderDialog(props: Partial<Parameters<typeof ContinueDraftDialog>[0]> = {}) {
  const handlers = { onContinue: vi.fn(), onOpenChange: vi.fn(), onStartAnother: vi.fn() };
  const result = render(
    <ContinueDraftDialog open title="Lisbon food crawl" {...handlers} {...props} />
  );
  return { handlers, result };
}

test('names the existing draft', async () => {
  await renderDialog().result;
  await expect.element(page.getByRole('dialog')).toBeVisible();
  await expect.element(page.getByText('You already have a draft')).toBeVisible();
  await expect
    .element(page.getByText('You already have a draft on this trip: Lisbon food crawl'))
    .toBeVisible();
});

test.each([
  ['Continue draft', 'onContinue'],
  ['Start another idea', 'onStartAnother']
] as const)('"%s" calls %s only', async (name, handler) => {
  const { handlers, result } = renderDialog();
  await result;
  await page.getByRole('button', { name }).click();
  expect(handlers[handler]).toHaveBeenCalledTimes(1);
  const others = Object.entries(handlers).filter(
    ([key]) => key !== handler && key !== 'onOpenChange'
  );
  for (const [, fn] of others) expect(fn).not.toHaveBeenCalled();
});

test('renders nothing while closed', async () => {
  await renderDialog({ open: false }).result;
  await expect.element(page.getByRole('dialog')).not.toBeInTheDocument();
});

test('reports closing through onOpenChange', async () => {
  const { handlers, result } = renderDialog();
  await result;
  await page.getByRole('button', { name: 'Close' }).click();
  expect(handlers.onOpenChange).toHaveBeenCalledWith(false);
});
