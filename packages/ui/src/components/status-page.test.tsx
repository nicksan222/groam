import { cleanup, render, screen } from '@testing-library/react';
import { AlertTriangle } from 'lucide-react';
import { afterEach, expect, test } from 'vitest';
import { StatusPage } from './status-page';

afterEach(cleanup);

test('renders a full-page status card with icon, title, copy, and actions', () => {
  render(
    <StatusPage
      actions={<button type="button">Try again</button>}
      icon={AlertTriangle}
      iconClassName="text-destructive"
      title="Something went wrong"
    >
      Network request failed
    </StatusPage>
  );

  expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeTruthy();
  expect(screen.getByText('Network request failed')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  expect(screen.getByRole('main').getAttribute('data-slot')).toBe('status-page');
});
