import { render } from '@groam/vitest-config/react';
import { Inbox } from 'lucide-react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { CountHeading } from './count-heading';

test('renders the title, icon, and count badge', async () => {
  const { container } = await render(
    <CountHeading count={3} icon={Inbox} title="Waiting on you" />
  );

  await expect.element(page.getByRole('heading', { name: 'Waiting on you' })).toBeInTheDocument();
  await expect.element(page.getByText('3')).toBeInTheDocument();
  expect(container.querySelector('svg')).toBeTruthy();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('count-heading');
});
