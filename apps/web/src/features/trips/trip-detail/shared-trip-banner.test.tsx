import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { SharedTripBanner } from './shared-trip-banner';

afterEach(cleanup);

test('explains that the shared trip is read-only and offers New idea', () => {
  const onStartIdea = vi.fn();
  render(<SharedTripBanner onStartIdea={onStartIdea} />);

  expect(screen.getByTestId('shared-trip-banner')).toBeTruthy();
  expect(screen.getByText('Shared trip — read-only')).toBeTruthy();
  expect(screen.getByText(/Changes are made in ideas/u)).toBeTruthy();
  fireEvent.click(screen.getByTestId('shared-trip-new-idea'));
  expect(onStartIdea).toHaveBeenCalledOnce();
});

test('offers continue draft when the viewer already has one', () => {
  const onContinueDraft = vi.fn();
  render(
    <SharedTripBanner
      continueDraftTitle="Add a stop"
      onContinueDraft={onContinueDraft}
      onStartIdea={vi.fn()}
    />
  );

  fireEvent.click(screen.getByTestId('shared-trip-continue-draft'));
  expect(onContinueDraft).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Continue your draft: Add a stop' })).toBeTruthy();
});
