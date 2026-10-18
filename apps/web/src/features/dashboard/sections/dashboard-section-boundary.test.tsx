import { expectConsole } from '@groam/vitest-config/console';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DashboardSectionBoundary } from './dashboard-section-boundary';

function Broken(): never {
  throw new Error('source failed');
}

describe('DashboardSectionBoundary', () => {
  test('renders children that do not fail', async () => {
    await render(
      <DashboardSectionBoundary>
        <p>fine</p>
      </DashboardSectionBoundary>
    );
    await expect.element(page.getByText('fine')).toBeVisible();
  });

  test('hides a failing section and keeps its siblings', async () => {
    expectConsole('error', /source failed/u);
    await render(
      <>
        <DashboardSectionBoundary>
          <Broken />
        </DashboardSectionBoundary>
        <p>sibling</p>
      </>
    );
    await expect.element(page.getByText('sibling')).toBeVisible();
  });

  test('renders the fallback when given one', async () => {
    expectConsole('error', /source failed/u);
    await render(
      <DashboardSectionBoundary fallback={<p>fallback</p>}>
        <Broken />
      </DashboardSectionBoundary>
    );
    await expect.element(page.getByText('fallback')).toBeVisible();
  });
});
