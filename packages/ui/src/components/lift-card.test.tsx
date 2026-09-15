import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { LiftCard } from './lift-card';

afterEach(cleanup);

test('renders hover-lift card chrome around its children', () => {
  const { container } = render(
    <LiftCard>
      <p>Profile photo</p>
    </LiftCard>
  );

  expect(screen.getByText('Profile photo')).toBeTruthy();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('lift-card');
  expect(container.firstElementChild?.className).toContain('dashboard-lift-card');
});

test('merges onto a child element when asChild is set', () => {
  render(
    <LiftCard asChild>
      <button type="button">Profile</button>
    </LiftCard>
  );

  const button = screen.getByRole('button', { name: 'Profile' });
  expect(button.className).toContain('dashboard-lift-card');
  expect(button.getAttribute('data-slot')).toBe('lift-card');
});
