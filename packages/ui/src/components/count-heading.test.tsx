import { cleanup, render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { afterEach, expect, test } from 'vitest';
import { CountHeading } from './count-heading';

afterEach(cleanup);

test('renders the title, icon, and count badge', () => {
  const { container } = render(<CountHeading count={3} icon={Inbox} title="Waiting on you" />);

  expect(screen.getByRole('heading', { name: 'Waiting on you' })).toBeTruthy();
  expect(screen.getByText('3')).toBeTruthy();
  expect(container.querySelector('svg')).toBeTruthy();
  expect(container.firstElementChild?.getAttribute('data-slot')).toBe('count-heading');
});
