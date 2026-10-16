import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TransferFeedback } from './transfer-feedback';

describe('TransferFeedback', () => {
  test('renders nothing without status', async () => {
    await render(<TransferFeedback status={null} />);
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
    await expect.element(page.getByRole('status')).not.toBeInTheDocument();
  });

  test('shows errors as alerts', async () => {
    await render(<TransferFeedback status={{ kind: 'error', message: 'Could not save' }} />);
    await expect.element(page.getByRole('alert')).toHaveTextContent('Could not save');
  });

  test('shows warnings as status', async () => {
    await render(<TransferFeedback status={{ kind: 'warning', message: 'Remove a file' }} />);
    await expect.element(page.getByRole('status')).toHaveTextContent('Remove a file');
  });
});
