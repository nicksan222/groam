import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { NextStepBanner } from './next-step-banner';

afterEach(cleanup);

test('renders the next-step eyebrow, title, and action', () => {
  const onAction = vi.fn();

  render(
    <NextStepBanner
      action="Add first destination"
      onAction={onAction}
      title="Choose where this trip begins"
    />
  );

  expect(screen.getByText('Up next')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Choose where this trip begins' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Add first destination' }));
  expect(onAction).toHaveBeenCalledTimes(1);
});
