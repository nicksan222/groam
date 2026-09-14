import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { PanelNotFound } from './panel-not-found';

afterEach(cleanup);

test('renders a missing-panel message and back action', () => {
  const onBack = vi.fn();

  render(
    <PanelNotFound
      backLabel="Back to ideas"
      message="Idea not found in this trip"
      onBack={onBack}
    />
  );

  expect(screen.getByText('Idea not found in this trip')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Back to ideas' }));
  expect(onBack).toHaveBeenCalledTimes(1);
});
