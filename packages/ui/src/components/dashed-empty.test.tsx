import { render } from '@groam/vitest-config/react';
import { FileDiff } from 'lucide-react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DashedEmpty } from './dashed-empty';

test('renders a dashed empty state with icon, title, copy, and action', async () => {
  await render(
    <DashedEmpty
      action={<button type="button">Start an idea</button>}
      icon={FileDiff}
      title="Start a private draft"
    >
      Starting an idea creates a private working copy.
    </DashedEmpty>
  );

  await expect.element(page.getByText('Start a private draft')).toBeInTheDocument();
  await expect
    .element(page.getByText('Starting an idea creates a private working copy.'))
    .toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Start an idea' })).toBeInTheDocument();
});
