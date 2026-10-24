import { render } from '@groam/vitest-config/react';
import { Fragment } from 'react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import Shell from '#tsx/components/shell/client';
import { Skeleton } from '#tsx/components/skeleton';

test('composes semantic columns and forwards page attributes without a Shell provider', async () => {
  await render(
    <Shell.TwoColumns as="article" aria-label="Run overview" data-testid="columns">
      <Shell.LeftColumn as="section" aria-label="Results">
        <button type="button">Review result</button>
        <p>Report</p>
      </Shell.LeftColumn>
      <Shell.RightColumn aria-label="Run metadata">
        <p>Called by Lea</p>
      </Shell.RightColumn>
    </Shell.TwoColumns>
  );
  await expect.element(page.getByRole('article', { name: 'Run overview' })).toBeInTheDocument();
  const left = page.getByRole('region', { name: 'Results' }).element();
  const right = page.getByRole('complementary', { name: 'Run metadata' }).element();
  expect(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await expect.element(page.getByRole('button', { name: 'Review result' })).toBeInTheDocument();
  expect(page.getByTestId('columns').element().className).toContain(
    'xl:grid-cols-[minmax(0,1fr)_20rem]'
  );
});

test('supports a desktop-only right column at the shared breakpoint', async () => {
  await render(
    <Shell.TwoColumns>
      <Shell.LeftColumn>Main itinerary</Shell.LeftColumn>
      <Shell.DesktopRightColumn aria-label="Route overview">Route map</Shell.DesktopRightColumn>
    </Shell.TwoColumns>
  );
  const right = page.getByRole('complementary', { name: 'Route overview' }).element();
  expect(right.className).toContain('hidden');
  expect(right.className).toContain('xl:block');
  expect(right.className).toContain('xl:sticky');
});

test('supplies spacing and responsive sticky behavior without configuration', async () => {
  await render(
    <Shell.TwoColumns>
      <Shell.LeftColumn>Main</Shell.LeftColumn>
      <Shell.RightColumn aria-label="Details">Details</Shell.RightColumn>
    </Shell.TwoColumns>
  );
  const right = page.getByRole('complementary', { name: 'Details' }).element();
  expect(right.className).toContain('xl:sticky');
  expect(right.className).toContain('xl:top-6');
  expect(right.className).toContain('space-y-6');
  expect(right.className).not.toContain('order-first');
  await expect.element(page.getByText('Main')).toHaveClass('space-y-6');
});

test('nested layouts use the same design defaults as their parent', async () => {
  await render(
    <Shell.TwoColumns>
      <Shell.LeftColumn>
        <Shell.TwoColumns>
          <Shell.LeftColumn>Inner main</Shell.LeftColumn>
          <Shell.RightColumn aria-label="Inner">Inner details</Shell.RightColumn>
        </Shell.TwoColumns>
      </Shell.LeftColumn>
      <Shell.RightColumn aria-label="Outer">Outer details</Shell.RightColumn>
    </Shell.TwoColumns>
  );
  await expect.element(page.getByRole('complementary', { name: 'Inner' })).toHaveClass('xl:sticky');
  await expect.element(page.getByRole('complementary', { name: 'Outer' })).toHaveClass('xl:sticky');
  expect(page.getByText('Inner main').element().parentElement?.className).toContain(
    'xl:grid-cols-[minmax(0,1fr)_20rem]'
  );
});

test('keeps the same column geometry when skeleton children are replaced with content', async () => {
  const view = await render(
    <Shell.TwoColumns
      aria-busy="true"
      aria-label="Loading details"
      data-testid="columns"
      role="status"
    >
      <Shell.LeftColumn>
        <Skeleton className="h-24 w-full" />
      </Shell.LeftColumn>
      <Shell.RightColumn>
        <Skeleton className="h-40 w-full" />
      </Shell.RightColumn>
    </Shell.TwoColumns>
  );
  const grid = page.getByTestId('columns').element();
  const layoutClasses = grid.className;
  await expect.element(page.getByRole('status', { name: 'Loading details' })).toBeInTheDocument();
  await view.rerender(
    <Shell.TwoColumns data-testid="columns">
      <Shell.LeftColumn>Loaded report</Shell.LeftColumn>
      <Shell.RightColumn>Loaded details</Shell.RightColumn>
    </Shell.TwoColumns>
  );
  expect(page.getByTestId('columns').element()).toBe(grid);
  expect(grid.className).toBe(layoutClasses);
  expect(grid.hasAttribute('aria-busy')).toBe(false);
  expect(grid.querySelector('[data-slot="skeleton"]')).toBeNull();
});

test('accepts conditional fragments containing the two named slots', async () => {
  await render(
    <Shell.TwoColumns>
      <Fragment key="loaded">
        <Shell.LeftColumn>Results</Shell.LeftColumn>
        <Shell.RightColumn>Details</Shell.RightColumn>
      </Fragment>
    </Shell.TwoColumns>
  );
  await expect.element(page.getByText('Results')).toBeInTheDocument();
});

test('rejects missing, duplicate, reversed and wrapped columns with an actionable error', async () => {
  for (const children of [
    <Shell.LeftColumn key="missing">Alone</Shell.LeftColumn>,
    <>
      <Shell.LeftColumn>A</Shell.LeftColumn>
      <Shell.LeftColumn>B</Shell.LeftColumn>
    </>,
    <>
      <Shell.RightColumn>A</Shell.RightColumn>
      <Shell.LeftColumn>B</Shell.LeftColumn>
    </>,
    <div key="wrapped">
      <Shell.LeftColumn>A</Shell.LeftColumn>
      <Shell.RightColumn>B</Shell.RightColumn>
    </div>
  ]) {
    await expect(render(<Shell.TwoColumns>{children}</Shell.TwoColumns>)).rejects.toThrow(
      'requires one Shell.LeftColumn followed by one Shell.RightColumn'
    );
  }
});

test('rejects standalone column slots instead of silently using the wrong breakpoint', async () => {
  await expect(render(<Shell.LeftColumn>Orphan</Shell.LeftColumn>)).rejects.toThrow(
    'must be inside Shell.TwoColumns'
  );
  await expect(render(<Shell.RightColumn>Orphan</Shell.RightColumn>)).rejects.toThrow(
    'must be inside Shell.TwoColumns'
  );
  await expect(render(<Shell.DesktopRightColumn>Orphan</Shell.DesktopRightColumn>)).rejects.toThrow(
    'must be inside Shell.TwoColumns'
  );
});
