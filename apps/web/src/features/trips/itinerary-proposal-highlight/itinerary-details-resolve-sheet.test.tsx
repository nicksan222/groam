import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { stubMatchMedia } from '@/testing/stub-match-media';
import { ItineraryDetailsResolveSheet } from './itinerary-details-resolve-sheet';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/compare">{children}</a>
}));

afterEach(cleanup);

test('locks the entire resolution dialog while choices are applying', () => {
  stubMatchMedia();
  render(
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

  expect(screen.getByRole('dialog').getAttribute('aria-busy')).toBe('true');
  expect(screen.getByText('Applying your choices…')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Cancel' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'Use all shared' }).hasAttribute('disabled')).toBe(
    true
  );
  expect(
    screen.getByRole('button', { name: 'Keep shared trip for Trip name' }).hasAttribute('disabled')
  ).toBe(true);
});

test('keeps the shared branch and idea branch distinct through result preview', () => {
  stubMatchMedia();
  render(
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

  const comparedBranches = screen.getByLabelText('Compared sides');
  expect(comparedBranches.textContent).toContain('Summer group trip');
  expect(comparedBranches.textContent).toContain('Lisbon alternatives');
  const sharedBranch = screen.getByRole('region', { name: 'Shared trip branch for Trip name' });
  const ideaBranch = screen.getByRole('region', { name: 'This idea branch for Trip name' });
  expect(sharedBranch.textContent).toContain('Shared trip name');
  expect(sharedBranch.textContent).not.toContain('Idea trip name');
  expect(ideaBranch.textContent).toContain('Idea trip name');
  expect(ideaBranch.textContent).not.toContain('Shared trip name');

  fireEvent.click(within(ideaBranch).getByRole('button', { name: 'Keep my idea for Trip name' }));
  fireEvent.click(screen.getByRole('button', { name: 'Review result' }));
  const preview = screen.getByRole('region', { name: 'Result preview' });
  expect(preview.textContent).toContain('From your idea · Lisbon alternatives');
  expect(preview.textContent).toContain('Idea trip name');
});
