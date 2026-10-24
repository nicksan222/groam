import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripSectionPanel } from './trip-section-panel';

describe('TripSectionPanel', () => {
  test('labels the section and renders its children', async () => {
    await render(
      <TripSectionPanel title="Route">
        <p>Panel body</p>
      </TripSectionPanel>
    );
    await expect.element(page.getByRole('region', { name: 'Route' })).toBeVisible();
    await expect.element(page.getByText('Panel body')).toBeVisible();
  });

  test('spaces its blocks with the one page rhythm', async () => {
    await render(
      <TripSectionPanel title="Route">
        <p>Body</p>
      </TripSectionPanel>
    );
    await expect
      .element(page.getByRole('region', { name: 'Route' }))
      .toHaveAttribute('data-stack', 'page');
  });

  test('renders a badge and trailing control when given', async () => {
    await render(
      <TripSectionPanel badge="3 stops" title="Route" trailing={<button type="button">Add</button>}>
        <p>x</p>
      </TripSectionPanel>
    );
    await expect.element(page.getByText('3 stops')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Add' })).toBeVisible();
  });
});
