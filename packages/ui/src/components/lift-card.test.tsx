import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { LiftCard } from './lift-card';

test('renders hover-lift card chrome around its children', async () => {
  const { container } = await render(
    <LiftCard>
      <p>Profile photo</p>
    </LiftCard>
  );

  await expect.element(page.getByText('Profile photo')).toBeInTheDocument();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('lift-card');
  expect(container.firstElementChild?.className).toContain('dashboard-lift-card');
});

test('merges onto a child element when asChild is set', async () => {
  await render(
    <LiftCard asChild>
      <button type="button">Profile</button>
    </LiftCard>
  );

  const button = page.getByRole('button', { name: 'Profile' }).element();
  expect(button.className).toContain('dashboard-lift-card');
  expect(button.getAttribute('data-slot')).toBe('lift-card');
});
