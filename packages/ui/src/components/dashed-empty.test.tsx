import { cleanup, render, screen } from '@testing-library/react';
import { FileDiff } from 'lucide-react';
import { afterEach, expect, test } from 'vitest';
import { DashedEmpty } from './dashed-empty';

afterEach(cleanup);

test('renders a dashed empty state with icon, title, copy, and action', () => {
  render(
    <DashedEmpty
      action={<button type="button">Start an idea</button>}
      icon={FileDiff}
      title="Start a private draft"
    >
      Starting an idea creates a private working copy.
    </DashedEmpty>
  );

  expect(screen.getByText('Start a private draft')).toBeTruthy();
  expect(screen.getByText('Starting an idea creates a private working copy.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Start an idea' })).toBeTruthy();
});
