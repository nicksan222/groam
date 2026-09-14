import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { SectionCard } from './section-card';

afterEach(cleanup);

test('renders a titled card with optional action and body content', () => {
  render(
    <SectionCard action={<button type="button">Invite</button>} title="Group members">
      <p>Ada Lovelace</p>
    </SectionCard>
  );

  expect(screen.getByText('Group members')).toBeTruthy();
  expect(screen.getByText('Ada Lovelace')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Invite' })).toBeTruthy();
  const card = document.querySelector('[data-slot="section-card"]');
  expect(card).toBeTruthy();
  expect(card?.className).toContain('gap-0');
  expect(card?.className).toContain('md:gap-0');
  expect(card?.className).not.toContain('md:gap-6');
});
