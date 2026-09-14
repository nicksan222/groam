import { cleanup, render, screen } from '@testing-library/react';
import { Route } from 'lucide-react';
import { afterEach, expect, test } from 'vitest';
import { SectionHeader, TripSectionHeader } from './section-header';

afterEach(cleanup);

test('SectionHeader renders title, description, and optional action', () => {
  render(
    <SectionHeader
      action={<button type="button">Add</button>}
      description="Manage workspace settings."
      title="Settings"
    />
  );

  expect(screen.getByRole('heading', { name: 'Settings' })).toBeDefined();
  expect(screen.getByText('Manage workspace settings.')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Add' })).toBeDefined();
});

test('TripSectionHeader renders badge, description, and trailing content', () => {
  render(
    <TripSectionHeader
      badge="2 stops"
      description="Plan the route in itinerary order."
      icon={Route}
      title="Trip route"
      trailing={<span>Live</span>}
    />
  );

  expect(screen.getByRole('heading', { name: 'Trip route' })).toBeDefined();
  expect(screen.getByText('2 stops')).toBeDefined();
  expect(screen.getByText('Plan the route in itinerary order.')).toBeDefined();
  expect(screen.getByText('Live')).toBeDefined();
});
