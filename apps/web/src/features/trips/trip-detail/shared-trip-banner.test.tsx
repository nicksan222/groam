import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SharedTripBanner } from './shared-trip-banner';

test('explains that the shared trip is read-only and offers New idea', async () => {
  const onStartIdea = vi.fn();
  await render(<SharedTripBanner onStartIdea={onStartIdea} />);

  const banner = page.getByTestId('shared-trip-banner').element();
  expect(banner.className).toContain('bg-muted/30');
  expect(banner.className).toContain('mt-4');
  await expect.element(page.getByText('Shared trip — read-only')).toBeInTheDocument();
  await expect.element(page.getByText(/Changes are made in ideas/u)).toBeInTheDocument();
  await page.getByTestId('shared-trip-new-idea').click();
  expect(onStartIdea).toHaveBeenCalledOnce();
});

test('offers continue draft when the viewer already has one', async () => {
  const onContinueDraft = vi.fn();
  await render(
    <SharedTripBanner
      continueDraftTitle="Add a stop"
      onContinueDraft={onContinueDraft}
      onStartIdea={vi.fn()}
    />
  );

  await page.getByTestId('shared-trip-continue-draft').click();
  expect(onContinueDraft).toHaveBeenCalledOnce();
  await expect
    .element(page.getByRole('button', { name: 'Continue your draft: Add a stop' }))
    .toBeInTheDocument();
});
