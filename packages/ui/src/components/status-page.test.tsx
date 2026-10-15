import { render } from '@groam/vitest-config/react';
import { AlertTriangle } from 'lucide-react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { StatusPage } from './status-page';

test('renders a full-page status card with icon, title, copy, and actions', async () => {
  await render(
    <StatusPage
      actions={<button type="button">Try again</button>}
      icon={AlertTriangle}
      iconClassName="text-destructive"
      title="Something went wrong"
    >
      Network request failed
    </StatusPage>
  );

  await expect
    .element(page.getByRole('heading', { name: 'Something went wrong' }))
    .toBeInTheDocument();
  await expect.element(page.getByText('Network request failed')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  await expect.element(page.getByRole('main')).toHaveAttribute('data-slot', 'status-page');
});
