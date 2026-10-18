import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { SectionCard } from './section-card';

test('renders a titled card with optional action and body content', async () => {
  await render(
    <SectionCard action={<button type="button">Invite</button>} title="Group members">
      <p>Ada Lovelace</p>
    </SectionCard>
  );

  await expect.element(page.getByText('Group members')).toBeInTheDocument();
  await expect.element(page.getByText('Ada Lovelace')).toBeInTheDocument();
  await expect.element(page.getByRole('button', { name: 'Invite' })).toBeInTheDocument();
  const card = document.querySelector('[data-slot="section-card"]');
  expect(card).toBeTruthy();
  expect(card?.className).toContain('gap-0');
  expect(card?.className).toContain('md:gap-0');
  expect(card?.className).not.toContain('md:gap-6');
});
