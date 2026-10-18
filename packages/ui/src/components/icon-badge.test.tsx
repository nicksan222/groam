import { render } from '@groam/vitest-config/react';
import { Sparkles } from 'lucide-react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IconBadge } from './icon-badge';

test('renders an outline badge with an icon and label', async () => {
  const { container } = await render(<IconBadge icon={Sparkles}>Lisbon week</IconBadge>);

  await expect.element(page.getByText('Lisbon week')).toBeInTheDocument();
  expect(container.querySelector('svg')).toBeTruthy();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('icon-badge');
});
