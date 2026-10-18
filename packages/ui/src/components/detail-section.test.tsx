import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DetailSection } from './detail-section';

test('renders a titled section with optional action and body', async () => {
  await render(
    <DetailSection action={<button type="button">Edit</button>} title="Assignees">
      <p>Nobody assigned</p>
    </DetailSection>
  );

  await expect.element(page.getByRole('heading', { name: 'Assignees' })).toBeInTheDocument();
  await expect.element(page.getByText('Nobody assigned')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
});
