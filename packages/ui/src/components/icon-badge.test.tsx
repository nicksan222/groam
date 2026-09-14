import { cleanup, render, screen } from '@testing-library/react';
import { Sparkles } from 'lucide-react';
import { afterEach, expect, test } from 'vitest';
import { IconBadge } from './icon-badge';

afterEach(cleanup);

test('renders an outline badge with an icon and label', () => {
  const { container } = render(<IconBadge icon={Sparkles}>Lisbon week</IconBadge>);

  expect(screen.getByText('Lisbon week')).toBeTruthy();
  expect(container.querySelector('svg')).toBeTruthy();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('icon-badge');
});
