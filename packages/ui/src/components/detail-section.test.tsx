import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { DetailSection } from './detail-section';

afterEach(cleanup);

test('renders a titled section with optional action and body', () => {
  render(
    <DetailSection action={<button type="button">Edit</button>} title="Assignees">
      <p>Nobody assigned</p>
    </DetailSection>
  );

  expect(screen.getByRole('heading', { name: 'Assignees' })).toBeTruthy();
  expect(screen.getByText('Nobody assigned')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
});
