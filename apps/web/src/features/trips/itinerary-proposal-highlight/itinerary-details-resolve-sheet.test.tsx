import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ItineraryDetailsResolveSheet } from './itinerary-details-resolve-sheet';

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: ({ children }: { children: React.ReactNode }) => <a href="/compare">{children}</a>
}));

test('locks the entire resolution dialog while choices are applying', async () => {
  await render(
    <ItineraryDetailsResolveSheet
      applyChoices={vi.fn()}
      canResolve
      dataReady
      fieldKeys={['name']}
      ideaBranchName="Lisbon alternatives"
      onOpenChange={vi.fn()}
      open
      otherConflicts={0}
      pending
      resolveRows={[
        {
          key: 'name',
          label: 'Trip name',
          media: false,
          mine: 'My plan',
          mineMedia: [],
          shared: 'Shared plan',
          sharedMedia: []
        }
      ]}
      revision="1:1"
      sharedBranchName="Summer trip"
      sourceTripId={'trip' as never}
    />
  );

  await expect.element(page.getByRole('dialog')).toHaveAttribute('aria-busy', 'true');
  await expect.element(page.getByText('Applying your choices…')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  await expect.element(page.getByRole('button', { name: 'Use all shared' })).toBeDisabled();
  await expect
    .element(page.getByRole('button', { name: 'Keep shared trip for Trip name' }))
    .toBeDisabled();
});

test('keeps the shared branch and idea branch distinct through result preview', async () => {
  await render(
    <ItineraryDetailsResolveSheet
      applyChoices={vi.fn()}
      canResolve
      dataReady
      fieldKeys={['name']}
      ideaBranchName="Lisbon alternatives"
      onOpenChange={vi.fn()}
      open
      otherConflicts={0}
      pending={false}
      resolveRows={[
        {
          key: 'name',
          label: 'Trip name',
          media: false,
          mine: 'Idea trip name',
          mineMedia: [],
          shared: 'Shared trip name',
          sharedMedia: []
        }
      ]}
      revision="1:1"
      sharedBranchName="Summer group trip"
      sourceTripId={'trip' as never}
    />
  );

  const comparedBranches = page.getByLabelText('Compared sides').element();
  expect(comparedBranches.textContent).toContain('Summer group trip');
  expect(comparedBranches.textContent).toContain('Lisbon alternatives');
  const sharedBranch = page.getByRole('region', { name: 'Shared trip branch for Trip name' });
  const ideaBranch = page.getByRole('region', { name: 'This idea branch for Trip name' });
  expect(sharedBranch.element().textContent).toContain('Shared trip name');
  expect(sharedBranch.element().textContent).not.toContain('Idea trip name');
  expect(ideaBranch.element().textContent).toContain('Idea trip name');
  expect(ideaBranch.element().textContent).not.toContain('Shared trip name');

  await ideaBranch.getByRole('button', { name: 'Keep my idea for Trip name' }).click();
  await page.getByRole('button', { name: 'Review result' }).click();
  const preview = page.getByRole('region', { name: 'Result preview' }).element();
  expect(preview.textContent).toContain('From your idea · Lisbon alternatives');
  expect(preview.textContent).toContain('Idea trip name');
});
