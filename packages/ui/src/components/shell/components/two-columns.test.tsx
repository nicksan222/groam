import { cleanup, render, screen } from '@testing-library/react';
import { Fragment } from 'react';
import { afterEach, expect, test } from 'vitest';
import Shell from '#tsx/components/shell/client';
import { Skeleton } from '#tsx/components/skeleton';

afterEach(cleanup);

test('composes semantic columns and forwards page attributes without a Shell provider', () => {
  render(
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
  expect(screen.getByRole('article', { name: 'Run overview' })).toBeTruthy();
  const left = screen.getByRole('region', { name: 'Results' });
  const right = screen.getByRole('complementary', { name: 'Run metadata' });
  expect(left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Review result' })).toBeTruthy();
  expect(screen.getByTestId('columns').className).toContain('xl:grid-cols-[minmax(0,1fr)_20rem]');
});

test('supports a desktop-only right column at the shared breakpoint', () => {
  render(
    <Shell.TwoColumns>
      <Shell.LeftColumn>Main itinerary</Shell.LeftColumn>
      <Shell.DesktopRightColumn aria-label="Route overview">Route map</Shell.DesktopRightColumn>
    </Shell.TwoColumns>
  );
  const right = screen.getByRole('complementary', { name: 'Route overview' });
  expect(right.className).toContain('hidden');
  expect(right.className).toContain('xl:block');
  expect(right.className).toContain('xl:sticky');
});

test('supplies spacing and responsive sticky behavior without configuration', () => {
  render(
    <Shell.TwoColumns>
      <Shell.LeftColumn>Main</Shell.LeftColumn>
      <Shell.RightColumn aria-label="Details">Details</Shell.RightColumn>
    </Shell.TwoColumns>
  );
  const right = screen.getByRole('complementary', { name: 'Details' });
  expect(right.className).toContain('xl:sticky');
  expect(right.className).toContain('xl:top-6');
  expect(right.className).toContain('space-y-5');
  expect(right.className).not.toContain('order-first');
  expect(screen.getByText('Main').className).toContain('space-y-5');
});

test('nested layouts use the same design defaults as their parent', () => {
  render(
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
  expect(screen.getByRole('complementary', { name: 'Inner' }).className).toContain('xl:sticky');
  expect(screen.getByRole('complementary', { name: 'Outer' }).className).toContain('xl:sticky');
  expect(screen.getByText('Inner main').parentElement?.className).toContain(
    'xl:grid-cols-[minmax(0,1fr)_20rem]'
  );
});

test('keeps the same column geometry when skeleton children are replaced with content', () => {
  const view = render(
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
  const grid = screen.getByTestId('columns');
  const layoutClasses = grid.className;
  expect(screen.getByRole('status', { name: 'Loading details' })).toBeTruthy();
  view.rerender(
    <Shell.TwoColumns data-testid="columns">
      <Shell.LeftColumn>Loaded report</Shell.LeftColumn>
      <Shell.RightColumn>Loaded details</Shell.RightColumn>
    </Shell.TwoColumns>
  );
  expect(screen.getByTestId('columns')).toBe(grid);
  expect(grid.className).toBe(layoutClasses);
  expect(grid.hasAttribute('aria-busy')).toBe(false);
  expect(grid.querySelector('[data-slot="skeleton"]')).toBeNull();
});

test('accepts conditional fragments containing the two named slots', () => {
  render(
    <Shell.TwoColumns>
      <Fragment key="loaded">
        <Shell.LeftColumn>Results</Shell.LeftColumn>
        <Shell.RightColumn>Details</Shell.RightColumn>
      </Fragment>
    </Shell.TwoColumns>
  );
  expect(screen.getByText('Results')).toBeTruthy();
});

test('rejects missing, duplicate, reversed and wrapped columns with an actionable error', () => {
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
    expect(() => render(<Shell.TwoColumns>{children}</Shell.TwoColumns>)).toThrow(
      'requires one Shell.LeftColumn followed by one Shell.RightColumn'
    );
  }
});

test('rejects standalone column slots instead of silently using the wrong breakpoint', () => {
  expect(() => render(<Shell.LeftColumn>Orphan</Shell.LeftColumn>)).toThrow(
    'must be inside Shell.TwoColumns'
  );
  expect(() => render(<Shell.RightColumn>Orphan</Shell.RightColumn>)).toThrow(
    'must be inside Shell.TwoColumns'
  );
  expect(() => render(<Shell.DesktopRightColumn>Orphan</Shell.DesktopRightColumn>)).toThrow(
    'must be inside Shell.TwoColumns'
  );
});
