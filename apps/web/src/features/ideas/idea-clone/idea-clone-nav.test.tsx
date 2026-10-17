import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IdeaCloneNav } from './idea-clone-nav';

test('keeps edit tabs apart from the review tab', async () => {
  const onOpen = vi.fn();
  await render(<IdeaCloneNav changeCount={3} onOpen={onOpen} stopCount={2} view="itinerary" />);

  await expect.element(page.getByRole('navigation', { name: 'Idea plan' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Packing' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Itinerary (2)' })).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Changes (3)' })).toBeInTheDocument();

  await page.getByRole('button', { name: 'Changes (3)' }).click();
  expect(onOpen).toHaveBeenCalledWith('compare');
});

test.each(['overview', 'itinerary'] as const)('combines the read-only plan at %s', async (view) => {
  await render(
    <IdeaCloneNav changeCount={2} onOpen={vi.fn()} stopCount={3} view={view} viewOnly />
  );
  await expect.element(page.getByTestId('trip-section-overview')).toHaveTextContent('Plan');
  await expect.element(page.getByTestId('trip-section-itinerary')).not.toBeInTheDocument();
  await expect.element(page.getByTestId('idea-section-compare')).toBeInTheDocument();
  await expect.element(page.getByTestId('trip-section-packing')).toBeInTheDocument();
});

test('opens the packing view', async () => {
  const onOpen = vi.fn();
  await render(<IdeaCloneNav changeCount={0} onOpen={onOpen} stopCount={0} view="overview" />);
  await page.getByRole('button', { name: 'Packing' }).click();
  expect(onOpen).toHaveBeenCalledWith('packing');
});
