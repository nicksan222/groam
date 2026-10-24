import { expectConsole } from '@groam/vitest-config/console';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DashboardErrorBoundary } from './dashboard-error-boundary';

let shouldThrow = true;

function Flaky() {
  if (shouldThrow) throw new Error('boom');
  return <p>Dashboard content</p>;
}

describe('DashboardErrorBoundary', () => {
  test('renders children when nothing fails', async () => {
    shouldThrow = false;
    await render(
      <DashboardErrorBoundary>
        <Flaky />
      </DashboardErrorBoundary>
    );
    await expect.element(page.getByText('Dashboard content')).toBeVisible();
    await expect
      .element(page.getByText('The workspace home could not be loaded.'))
      .not.toBeInTheDocument();
  });

  test('shows the fallback and recovers on Try again', async () => {
    shouldThrow = true;
    expectConsole('error', /boom/u);
    await render(
      <DashboardErrorBoundary>
        <Flaky />
      </DashboardErrorBoundary>
    );
    await expect.element(page.getByText('The workspace home could not be loaded.')).toBeVisible();
    await expect
      .element(page.getByText('Open trips to keep planning, or try again.'))
      .toBeVisible();

    shouldThrow = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect.element(page.getByText('Dashboard content')).toBeVisible();
  });
});
