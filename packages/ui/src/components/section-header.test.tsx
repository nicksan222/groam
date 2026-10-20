import { Route } from '@groam/icons';
import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SectionHeader, TripSectionHeader } from './section-header';

test('SectionHeader renders title, description, and optional action', async () => {
  await render(
    <SectionHeader
      action={<button type="button">Add</button>}
      description="Manage workspace settings."
      title="Settings"
    />
  );

  await expect.element(page.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  await expect.element(page.getByText('Manage workspace settings.')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Add' })).toBeInTheDocument();
});

test('TripSectionHeader renders badge, description, and trailing content', async () => {
  await render(
    <TripSectionHeader
      badge="2 stops"
      description="Plan the route in itinerary order."
      icon={Route}
      title="Trip route"
      trailing={<span>Live</span>}
    />
  );

  await expect.element(page.getByRole('heading', { name: 'Trip route' })).toBeInTheDocument();
  await expect.element(page.getByText('2 stops')).toBeInTheDocument();
  await expect.element(page.getByText('Plan the route in itinerary order.')).toBeInTheDocument();
  await expect.element(page.getByText('Live')).toBeInTheDocument();
});
