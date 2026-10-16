import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ReferenceStatusContext } from '@/features/workspace/hooks/reference-context';
import { ReferenceContent } from './reference-content';

function mount(status: { loading: boolean; missing: boolean }) {
  return render(
    <ReferenceStatusContext value={status}>
      <ReferenceContent>
        <p>Page body</p>
      </ReferenceContent>
    </ReferenceStatusContext>
  );
}

describe('ReferenceContent', () => {
  test('shows a labeled loading state while resolving', async () => {
    await mount({ loading: true, missing: false });
    await expect.element(page.getByRole('status', { name: 'Opening page…' })).toBeVisible();
    await expect.element(page.getByText('Page body')).not.toBeInTheDocument();
  });

  test('shows a not-found message when missing', async () => {
    await mount({ loading: false, missing: true });
    await expect
      .element(page.getByText('This page was not found or is unavailable to you.'))
      .toBeVisible();
    await expect.element(page.getByText('Page body')).not.toBeInTheDocument();
  });

  test('loading wins over missing', async () => {
    await mount({ loading: true, missing: true });
    await expect.element(page.getByRole('status', { name: 'Opening page…' })).toBeVisible();
  });

  test('renders children when resolved', async () => {
    await mount({ loading: false, missing: false });
    await expect.element(page.getByText('Page body')).toBeVisible();
  });
});
