import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { PanelNotFound } from './panel-not-found';

test('renders a missing-panel message and back action', async () => {
  const onBack = vi.fn();

  await render(
    <PanelNotFound
      backLabel="Back to ideas"
      message="Idea not found in this trip"
      onBack={onBack}
    />
  );

  await expect.element(page.getByText('Idea not found in this trip')).toBeInTheDocument();
  await page.getByRole('button', { name: 'Back to ideas' }).click();
  expect(onBack).toHaveBeenCalledTimes(1);
});
